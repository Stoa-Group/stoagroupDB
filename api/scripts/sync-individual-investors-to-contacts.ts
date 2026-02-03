/**
 * Sync individual investors to contacts: ensure every Individual equity partner
 * has InvestorRepId set to a core.Person so the same person appears once
 * (contacts, investor reps, guarantors) — no duplicates.
 *
 * For each EquityPartner where PartnerType = 'Individual' AND InvestorRepId IS NULL:
 * - Find core.Person with same FullName (case-insensitive), or create one.
 * - Set EquityPartner.InvestorRepId = that PersonId.
 *
 * Usage (dry-run): npm run db:sync-individual-investors-to-contacts
 * Usage (apply):   npm run db:sync-individual-investors-to-contacts -- --apply
 *
 * Run from api/ folder. Requires .env with DB_SERVER, DB_DATABASE, DB_USER, DB_PASSWORD.
 */

import path from 'path';
import dotenv from 'dotenv';

// Load .env so getConnection() sees DB_* (scripts run with cwd=api/ but load order matters)
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

import sql from 'mssql';
import { getConnection } from '../src/config/database';

const APPLY = process.argv.includes('--apply');

async function findOrCreatePersonByName(
  pool: sql.ConnectionPool,
  fullName: string
): Promise<number> {
  const nameTrimmed = (fullName || '').trim();
  if (!nameTrimmed) throw new Error('FullName is required');
  const req = pool.request();
  const existing = await req
    .input('fullName', sql.NVarChar(255), nameTrimmed)
    .query(`
      SELECT PersonId FROM core.Person
      WHERE LOWER(RTRIM(FullName)) = LOWER(@fullName)
    `);
  if (existing.recordset.length > 0) {
    return existing.recordset[0].PersonId;
  }
  const insertResult = await pool.request()
    .input('fullName', sql.NVarChar(255), nameTrimmed)
    .query(`
      INSERT INTO core.Person (FullName) VALUES (@fullName);
      SELECT SCOPE_IDENTITY() AS PersonId;
    `);
  return parseInt(insertResult.recordset[0].PersonId, 10);
}

async function main(): Promise<void> {
  const pool = await getConnection();
  const result = await pool.request().query(`
    SELECT EquityPartnerId, PartnerName, PartnerType, InvestorRepId
    FROM core.EquityPartner
    WHERE PartnerType = N'Individual' AND InvestorRepId IS NULL
    ORDER BY PartnerName
  `);
  const rows = result.recordset;

  if (rows.length === 0) {
    console.log('No Individual equity partners without InvestorRepId. Nothing to sync.');
    return;
  }

  console.log(`Found ${rows.length} Individual partner(s) without a linked contact.`);

  for (const row of rows) {
    const { EquityPartnerId, PartnerName } = row;
    const personId = await findOrCreatePersonByName(pool, PartnerName);
    console.log(`  ${PartnerName} -> PersonId ${personId} (${APPLY ? 'linking' : 'would link'})`);
    if (APPLY) {
      await pool.request()
        .input('partnerId', sql.Int, EquityPartnerId)
        .input('personId', sql.Int, personId)
        .query('UPDATE core.EquityPartner SET InvestorRepId = @personId WHERE EquityPartnerId = @partnerId');
    }
  }

  if (!APPLY) {
    console.log('\nDry-run only. Run with --apply to set InvestorRepId on each partner.');
  } else {
    console.log(`Done. ${rows.length} Individual partner(s) now linked to contacts (core.Person).`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
