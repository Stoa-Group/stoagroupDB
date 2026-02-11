#!/usr/bin/env node
/**
 * Call POST /api/leasing/sync-from-domo so the API fetches from Domo and fills
 * Leasing, MMRData, UnitMix, Pricing, RecentRents, etc.
 *
 * Usage (from repo root):
 *   node scripts/run-leasing-sync-from-domo.js
 *
 * Env (from .env in repo root or api/):
 *   API_BASE_URL     — default http://localhost:3000
 *   LEASING_SYNC_WEBHOOK_SECRET — if set on API, set here too (or pass LEASING_SYNC_SECRET=xxx)
 *
 * Optional query (via env):
 *   SYNC_DATASET=leasing   — sync only that table (e.g. portfolioUnitDetails, mmrdata, unitmix, pricing, recentrents, units, unitbyunittradeout)
 *   SYNC_FORCE=true        — force sync even if already synced today
 */
const path = require('path');
const fs = require('fs');

for (const p of [
  path.join(__dirname, '..', 'api', '.env'),
  path.join(__dirname, '..', '.env'),
]) {
  if (!fs.existsSync(p)) continue;
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
}

const base = (process.env.API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const secret = process.env.LEASING_SYNC_SECRET || process.env.LEASING_SYNC_WEBHOOK_SECRET || '';
const dataset = process.env.SYNC_DATASET || '';
const force = process.env.SYNC_FORCE === 'true' || process.env.SYNC_FORCE === '1';

const url = new URL(`${base}/api/leasing/sync-from-domo`);
if (dataset) url.searchParams.set('dataset', dataset);
if (force) url.searchParams.set('force', 'true');

const headers = { 'Content-Type': 'application/json' };
if (secret) headers['X-Sync-Secret'] = secret;

console.log('POST', url.toString());
console.log('(timeout 15 min; sync can take a while for large tables)\n');

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 15 * 60 * 1000);

fetch(url.toString(), {
  method: 'POST',
  headers,
  signal: controller.signal,
})
  .then((r) => {
    clearTimeout(timeout);
    return r.json().then((body) => ({ status: r.status, body }));
  })
  .then(({ status, body }) => {
    console.log('Status:', status);
    console.log(JSON.stringify(body, null, 2));
    if (body.errors && body.errors.length) process.exit(1);
  })
  .catch((err) => {
    clearTimeout(timeout);
    console.error(err.message || err);
    process.exit(1);
  });
