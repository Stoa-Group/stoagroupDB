#!/usr/bin/env node
/**
 * Migrate existing reviews (JSON or CSV) into reviews.Review via API POST /api/reviews/bulk.
 * Duplicates are skipped by DB (ReviewDedupeKey). Set API_BASE_URL or pass --api <url>.
 *
 * Usage:
 *   node scripts/migrate-reviews-to-db.js <path-to-reviews.json>
 *   node scripts/migrate-reviews-to-db.js reviews.json --api https://stoagroupdb-ddre.onrender.com
 *
 * JSON format: array of objects with keys like Property, review_text/Review_Text, rating,
 * reviewer_name, review_date, review_date_original, scraped_at, source, extraction_method,
 * property_url, request.ip (-> request_ip), request.timestamp (-> request_timestamp),
 * category, sentiment, common_phrase, review_year, review_month, review_month_name, review_day_of_week.
 */

const fs = require('fs');
const path = require('path');

const API_BASE = process.env.API_BASE_URL || process.env.STOA_DB_API_URL || 'https://stoagroupdb-ddre.onrender.com';

const EPOCH_DATE = '1969-12-31';

/** Return true if date string is invalid or Dec 31, 1969 (epoch 0). */
function isInvalidOrEpoch(isoDate) {
  if (!isoDate) return true;
  if (isoDate === EPOCH_DATE) return true;
  const d = new Date(isoDate);
  return Number.isNaN(d.getTime()) || d.getTime() < 86400000; // before 1970-01-02
}

/** Return ISO date (YYYY-MM-DD) for the 15th of the given year and month (month 1-12). */
function fifteenthOfMonth(year, month) {
  if (year == null || month == null) return null;
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return null;
  const d = new Date(y, m - 1, 15);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Parse "X months ago" / "X weeks ago" / "X days ago" into a real date.
 * For "X months ago" we use the 15th of that month. For weeks/days we use the computed day.
 */
function parseRelativeDate(s) {
  const str = String(s).trim().toLowerCase();
  const monthsMatch = str.match(/^(\d+)\s*months?\s*ago$/);
  if (monthsMatch) {
    const n = parseInt(monthsMatch[1], 10);
    if (!Number.isFinite(n) || n < 0) return null;
    const d = new Date();
    d.setMonth(d.getMonth() - n);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    return fifteenthOfMonth(y, m);
  }
  const weeksMatch = str.match(/^(\d+)\s*weeks?\s*ago$/);
  if (weeksMatch) {
    const n = parseInt(weeksMatch[1], 10);
    if (!Number.isFinite(n) || n < 0) return null;
    const d = new Date();
    d.setDate(d.getDate() - n * 7);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  const daysMatch = str.match(/^(\d+)\s*days?\s*ago$/);
  if (daysMatch) {
    const n = parseInt(daysMatch[1], 10);
    if (!Number.isFinite(n) || n < 0) return null;
    const d = new Date();
    d.setDate(d.getDate() - n);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  return null;
}

/** Return ISO date string or null. Parses "X months ago" as 15th of that month; never returns 1969-12-31. */
function toDateSafe(v) {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    if (s === EPOCH_DATE || isInvalidOrEpoch(s)) return null;
    return s;
  }
  const relative = parseRelativeDate(s);
  if (relative) return relative;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const iso = d.toISOString().slice(0, 10);
  if (iso === EPOCH_DATE || isInvalidOrEpoch(iso)) return null;
  return iso;
}

/** Return ISO datetime string or null for DateTime2. Accepts Unix ms number or date string. */
function toDateTimeSafe(v) {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  const num = Number(s);
  if (!Number.isNaN(num) && num > 0) {
    const d = new Date(num > 1e12 ? num : num * 1000);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString();
  return null;
}

function mapRow(r) {
  const rawDate = r.review_date ?? r.reviewdate ?? null;
  const year = r.review_year ?? r.reviewyear ?? null;
  const month = r.review_month ?? r.reviewmonth ?? null;
  let reviewDate = toDateSafe(rawDate);
  if (reviewDate === EPOCH_DATE || isInvalidOrEpoch(reviewDate)) reviewDate = null;
  if (reviewDate == null && (year != null || month != null))
    reviewDate = fifteenthOfMonth(year, month);
  return {
    Property: r.Property || r.property || '',
    Review_Text: r.Review_Text ?? r.review_text ?? null,
    rating: r.rating != null ? r.rating : null,
    reviewer_name: r.reviewer_name ?? r.reviewername ?? null,
    review_date: reviewDate,
    review_date_original: r.review_date_original ?? r.reviewdateoriginal ?? rawDate ?? null,
    review_year: year,
    review_month: month,
    review_month_name: r.review_month_name ?? r.reviewmonthname ?? null,
    review_day_of_week: r.review_day_of_week ?? r.reviewdayofweek ?? null,
    scraped_at: toDateTimeSafe(r.scraped_at ?? r.scrapedat),
    source: r.source ?? null,
    extraction_method: r.extraction_method ?? r.extractionmethod ?? null,
    property_url: r.property_url ?? r.propertyurl ?? null,
    request_ip: r.request_ip ?? r['request.ip'] ?? null,
    request_timestamp: toDateTimeSafe(r.request_timestamp ?? r['request.timestamp']),
    category: r.category ?? null,
    sentiment: r.sentiment ?? null,
    common_phrase: r.common_phrase ?? r.commonphrase ?? null,
    Location: r.Location ?? null,
    Total_Units: r.Total_Units ?? r['Total Units'] ?? r.TotalUnits ?? null,
    Birth_Order: r.Birth_Order ?? r['Birth Order'] ?? r.BirthOrder ?? null,
    Rank: r.Rank ?? null,
  };
}

async function postBulk(apiBase, batch) {
  const url = `${apiBase.replace(/\/$/, '')}/api/reviews/bulk`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reviews: batch }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`HTTP ${res.status}: ${t}`);
  }
  return res.json();
}

async function main() {
  const args = process.argv.slice(2);
  let filePath = args.find(a => !a.startsWith('--'));
  const apiArg = args.find(a => a.startsWith('--api='));
  const apiBase = apiArg ? apiArg.split('=')[1] : API_BASE;

  if (!filePath || !fs.existsSync(filePath)) {
    console.error('Usage: node scripts/migrate-reviews-to-db.js <reviews.json> [--api=URL]');
    process.exit(1);
  }

  const ext = path.extname(filePath).toLowerCase();
  let rows = [];
  const raw = fs.readFileSync(filePath, 'utf8');

  if (ext === '.json') {
    const data = JSON.parse(raw);
    rows = Array.isArray(data) ? data : (data.data || data.reviews || []);
  } else if (ext === '.csv') {
    const parseCSV = (text) => {
      const rows = [];
      let i = 0;
      const next = () => text[i++];
      const peek = () => text[i];
      const parseField = () => {
        if (peek() === '"') {
          next();
          let val = '';
          while (i < text.length) {
            if (peek() === '"') {
              next();
              if (peek() === '"') { next(); val += '"'; continue; }
              break;
            }
            val += next();
          }
          return val;
        }
        const start = i;
        while (i < text.length && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') i++;
        return text.slice(start, i).trim();
      };
      const parseRow = () => {
        const fields = [];
        while (i < text.length) {
          fields.push(parseField());
          if (peek() === ',') next();
          else if (peek() === '\n' || peek() === '\r' || !peek()) break;
        }
        if (peek() === '\r') next();
        if (peek() === '\n') next();
        return fields;
      };
      const header = parseRow();
      while (i < text.length && (text[i] === '\n' || text[i] === '\r' || text[i] === ' ' || text[i] === '\t')) {
        if (text[i] === '\n' || text[i] === '\r') { next(); if (peek() === '\n') next(); }
        else next();
      }
      while (i < text.length) {
        const vals = parseRow();
        if (vals.length >= 1 && vals.some(v => v !== '')) {
          const obj = {};
          header.forEach((h, j) => { obj[h.trim()] = vals[j] !== undefined ? vals[j] : ''; });
          rows.push(obj);
        }
        while (i < text.length && (text[i] === '\n' || text[i] === '\r')) next();
      }
      return { header, rows };
    };
    const { rows: csvRows } = parseCSV(raw);
    rows.push(...csvRows);
  } else {
    console.error('Unsupported format. Use .json (array of objects) or .csv.');
    process.exit(1);
  }

  if (rows.length === 0) {
    console.log('No rows to migrate.');
    return;
  }

  const payloads = rows.map(mapRow);
  const batchSize = 25;
  let totalInserted = 0, totalSkipped = 0;

  console.log(`Migrating ${payloads.length} reviews to ${apiBase} in batches of ${batchSize}...`);
  for (let i = 0; i < payloads.length; i += batchSize) {
    const batch = payloads.slice(i, i + batchSize);
    const result = await postBulk(apiBase, batch);
    const d = result.data || result;
    totalInserted += d.inserted || 0;
    totalSkipped += d.skipped || 0;
    console.log(`  Batch ${Math.floor(i / batchSize) + 1}: inserted ${d.inserted}, skipped ${d.skipped}`);
  }
  console.log(`Done. Total inserted: ${totalInserted}, skipped (duplicates): ${totalSkipped}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
