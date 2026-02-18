#!/usr/bin/env ts-node
/**
 * Deduplicate Reviews
 *
 * Finds duplicate reviews by Property + reviewer_name (normalized).
 * Keeps the most recent (by scraped_at, then review_date, then CreatedAt).
 * Deletes older duplicates—including when the same review is scraped multiple
 * times with different "X days/hours ago" dates that resolve to different rows.
 *
 * Usage:
 *   npm run db:deduplicate-reviews           # Run deduplication
 *   npm run db:deduplicate-reviews -- --dry-run   # Preview only, no deletes
 */

import { getPool } from './db-manipulate';

const DRY_RUN = process.argv.includes('--dry-run');

const NORMALIZE_PROPERTY = `LTRIM(RTRIM(LOWER(ISNULL(Property, N''))))`;
const NORMALIZE_REVIEWER = `LTRIM(RTRIM(LOWER(ISNULL(reviewer_name, N''))))`;
const ORDER_BY = `
  COALESCE(scraped_at, CAST('1900-01-01' AS DATETIME2)) DESC,
  COALESCE(CAST(review_date AS DATETIME2), CAST('1900-01-01' AS DATETIME2)) DESC,
  COALESCE(CreatedAt, CAST('1900-01-01' AS DATETIME2)) DESC,
  ReviewId DESC
`;

async function deduplicateReviews() {
  const pool = await getPool();

  try {
    console.log('🔍 Finding duplicate reviews (Property + reviewer)...');
    if (DRY_RUN) {
      console.log('   (dry-run: no rows will be deleted)\n');
    }

    // 1. Count duplicates that would be removed
    const countSql = `
;WITH Ranked AS (
  SELECT
    ReviewId,
    Property,
    reviewer_name,
    rating,
    scraped_at,
    review_date,
    ${NORMALIZE_PROPERTY} AS prop_norm,
    ${NORMALIZE_REVIEWER} AS rev_norm,
    ROW_NUMBER() OVER (
      PARTITION BY ${NORMALIZE_PROPERTY}, ${NORMALIZE_REVIEWER}
      ORDER BY ${ORDER_BY}
    ) AS rn
  FROM reviews.Review
)
SELECT
  COUNT(*) AS toDelete,
  COUNT(DISTINCT CONCAT(prop_norm, N'|', rev_norm)) AS duplicateGroups
FROM Ranked
WHERE rn > 1
`;
    const countResult = await pool.request().query(countSql);
    const toDelete = countResult.recordset[0]?.toDelete ?? 0;
    const groups = countResult.recordset[0]?.duplicateGroups ?? 0;

    if (toDelete === 0) {
      console.log('✅ No duplicate reviews found. Nothing to do.');
      return;
    }

    console.log(`   Found ${toDelete} duplicate row(s) across ${groups} property/reviewer group(s).\n`);

    // 2. Optionally show a sample
    const sampleSql = `
;WITH Ranked AS (
  SELECT
    ReviewId,
    Property,
    reviewer_name,
    rating,
    scraped_at,
    review_date,
    ROW_NUMBER() OVER (
      PARTITION BY ${NORMALIZE_PROPERTY}, ${NORMALIZE_REVIEWER}
      ORDER BY ${ORDER_BY}
    ) AS rn
  FROM reviews.Review
)
SELECT TOP 10
  ReviewId,
  Property,
  reviewer_name,
  rating,
  scraped_at,
  review_date,
  rn
FROM Ranked
WHERE rn > 1
ORDER BY Property, reviewer_name
`;
    const sample = await pool.request().query(sampleSql);
    console.log('   Sample of rows to DELETE (keeping row with rn=1 in each group):');
    console.table(sample.recordset);
    console.log('');

    if (DRY_RUN) {
      console.log(`   [DRY RUN] Would delete ${toDelete} row(s). Run without --dry-run to apply.`);
      return;
    }

    // 3. Delete duplicates
    const deleteSql = `
;WITH Ranked AS (
  SELECT
    ReviewId,
    ROW_NUMBER() OVER (
      PARTITION BY ${NORMALIZE_PROPERTY}, ${NORMALIZE_REVIEWER}
      ORDER BY ${ORDER_BY}
    ) AS rn
  FROM reviews.Review
)
DELETE r
FROM reviews.Review r
INNER JOIN Ranked rk ON r.ReviewId = rk.ReviewId
WHERE rk.rn > 1
`;
    const deleteResult = await pool.request().query(deleteSql);
    const rowsAffected = deleteResult.rowsAffected[0] ?? 0;

    console.log(`✅ Deleted ${rowsAffected} duplicate review row(s).`);
  } finally {
    await pool.close();
  }
}

deduplicateReviews().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
