#!/usr/bin/env node
/**
 * Compare leasing.MMRData to Domo: list all-NULL DB columns. No fuzzy matching — you provide exact mappings.
 *
 * Usage:
 *   node scripts/compare-mmr-domo-to-db.js              # Report null columns + list Domo headers
 *   node scripts/compare-mmr-domo-to-db.js --sync       # Sync MMR first, then report
 *   node scripts/compare-mmr-domo-to-db.js --fix       # Apply mappings from mmr-null-column-mapping.json, then wipe + sync
 *
 * To fix null columns:
 *   1. Run without --fix to see "DB columns that are entirely NULL" and "Domo MMR headers".
 *   2. Edit scripts/mmr-null-column-mapping.json and set each null column to the exact Domo header string, e.g.:
 *        { "Week4OccPercent": "Week 4 Occ %", "MoveInRent": "Move In Rent" }
 *   3. Run with --fix to add those aliases, wipe MMR, and sync.
 *   If you previously had wrong aliases (e.g. from old fuzzy --fix), clear api/src/config/domo-alias-overrides.json
 *   or remove its MMRData section so only your mapping file is used.
 *
 * Requires: API running, .env with API_BASE_URL, DOMO_* for --sync, LEASING_SYNC_WEBHOOK_SECRET for --fix.
 */

const path = require('path');
const fs = require('fs');

for (const p of [
  path.join(__dirname, '..', '.env'),
  path.join(__dirname, '..', 'api', '.env'),
]) {
  if (fs.existsSync(p)) {
    const content = fs.readFileSync(p, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx <= 0) continue;
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
        val = val.slice(1, -1);
      if (!process.env[key]) process.env[key] = val;
    }
    break;
  }
}

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';
const SECRET = process.env.LEASING_SYNC_WEBHOOK_SECRET || '';
const ALIAS = 'MMRData';
const MAPPING_FILE = path.join(__dirname, 'mmr-null-column-mapping.json');

async function apiGet(pathname) {
  const res = await fetch(`${API_BASE}${pathname}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || res.statusText || res.status);
  return json;
}

async function apiPost(pathname, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (SECRET) headers['X-Sync-Secret'] = SECRET;
  const res = await fetch(`${API_BASE}${pathname}`, {
    method: 'POST',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || res.statusText || res.status);
  return json;
}

async function main() {
  const doSync = process.argv.includes('--sync');
  const doFix = process.argv.includes('--fix');

  console.log('MMRData: compare Domo columns to DB (all-NULL columns)\n');

  if (doSync || doFix) {
    console.log('Syncing MMR from Domo...');
    await apiPost(`/api/leasing/sync-from-domo?dataset=${encodeURIComponent(ALIAS)}`);
    console.log('Sync done.\n');
  }

  const health = await apiGet('/api/leasing/sync-health');
  const nullColumns = health.tables?.[ALIAS] || [];
  const domoRes = await apiGet('/api/leasing/domo-columns');
  const domoHeaders = domoRes.domoColumns?.[ALIAS] || [];

  console.log('Domo MMR headers (' + domoHeaders.length + '):');
  console.log(domoHeaders.join(', '));
  console.log('');

  console.log('DB columns that are entirely NULL (' + nullColumns.length + '):');
  if (nullColumns.length === 0) {
    console.log('None — MMR DB matches Domo.');
    return;
  }
  console.log(nullColumns.join(', '));
  console.log('');

  if (doFix) {
    let mapping = {};
    if (fs.existsSync(MAPPING_FILE)) {
      try {
        mapping = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf8'));
      } catch (e) {
        console.error('Invalid JSON in ' + MAPPING_FILE + ': ' + e.message);
        process.exit(1);
      }
    }
    const toApply = nullColumns.filter((col) => mapping[col] && String(mapping[col]).trim());
    if (toApply.length === 0) {
      console.log('No mappings in ' + MAPPING_FILE + '. Add entries like:');
      const example = {};
      nullColumns.forEach((c) => { example[c] = '<exact Domo header>'; });
      console.log(JSON.stringify(example, null, 2));
      console.log('\nThen re-run with --fix.');
      return;
    }
    console.log('Applying ' + toApply.length + ' mappings from ' + MAPPING_FILE + ':');
    for (const column of toApply) {
      const domoHeader = String(mapping[column]).trim();
      try {
        await apiPost('/api/leasing/sync-add-alias', { table: ALIAS, column, domoHeader });
        console.log('  ' + column + ' <- "' + domoHeader + '"');
      } catch (e) {
        console.warn('  Failed ' + column + ': ' + e.message);
      }
    }
    console.log('Wiping MMR and re-syncing...');
    await apiPost('/api/leasing/wipe?table=' + encodeURIComponent(ALIAS));
    await apiPost('/api/leasing/sync-from-domo?dataset=' + encodeURIComponent(ALIAS));
    const nextHealth = await apiGet('/api/leasing/sync-health');
    const stillNull = nextHealth.tables?.[ALIAS] || [];
    if (stillNull.length > 0) console.log('Still all-NULL: ' + stillNull.join(', '));
    else console.log('MMRData: all columns mapped.');
    return;
  }

  console.log('To fix: add exact Domo header for each null column to');
  console.log('  ' + MAPPING_FILE);
  console.log('Example: { "Week4OccPercent": "Week 4 Occ %", "Week7OccPercent": "Week 7 Occ %" }');
  console.log('Then run: node scripts/compare-mmr-domo-to-db.js --fix');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
