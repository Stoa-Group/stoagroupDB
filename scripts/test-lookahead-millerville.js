#!/usr/bin/env node
/**
 * Fetch dashboard from API and print Millerville (and all props) occupancy for lookahead tuning.
 * Target: Millerville occupancy ~89.0% (lookahead to 3/12), current ~90.2%.
 *
 * Usage:
 *   node scripts/test-lookahead-millerville.js
 *   API_BASE_URL=http://localhost:3000 node scripts/test-lookahead-millerville.js
 *   DEBUG_LOOKAHEAD=1  (when running the API) to see move-ins/move-outs in server console
 *   USE_NOTICE_FIRST_FOR_LOOKAHEAD=1  (when running the API) to try Notice-first move-out rule
 */
const base = process.env.API_BASE_URL || 'http://localhost:3000';

async function main() {
  const rebuild = process.env.REBUILD === '1' || base.includes('localhost');
  const url = base.replace(/\/$/, '') + '/api/leasing/dashboard' + (rebuild ? '?rebuild=1' : '');
  console.log('GET', url, rebuild ? '(force rebuild for local testing)' : '');
  let res;
  try {
    res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
  } catch (e) {
    console.error('Fetch failed:', e.message);
    console.error('Start the API (e.g. cd api && npm run start) and ensure DB has leasing/PUD data.');
    process.exit(1);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok || !body) {
    console.error('Status:', res.status, body ? JSON.stringify(body).slice(0, 200) : '');
    process.exit(1);
  }
  const dashboard = body.dashboard || body;
  const meta = body._meta || {};
  console.log('_meta.fromSnapshot:', meta.fromSnapshot, meta.builtAt ? 'builtAt=' + meta.builtAt : '');
  const kpis = dashboard.kpis && dashboard.kpis.byProperty ? dashboard.kpis.byProperty : {};
  const keys = Object.keys(kpis).filter((k) => !k.startsWith('THE ')); // prefer display names

  const millervilleKey = keys.find((k) => k.toUpperCase().includes('MILLERVILLE'));
  if (millervilleKey) {
    const m = kpis[millervilleKey];
    console.log('\n--- Millerville (target: current 90.2%, lookahead to 3/12 = 89.0%) ---');
    console.log('occupancyPct (displayed):', m.occupancyPct);
    console.log('projectedOccupancy4WeeksPct:', m.projectedOccupancy4WeeksPct);
    console.log('totalUnits:', m.totalUnits, 'occupied:', m.occupied, 'leased:', m.leased, 'available:', m.available);
    console.log('');
  } else {
    console.log('\nNo Millerville in kpis.byProperty. Keys:', keys.join(', '));
  }

  console.log('--- All properties: occupancyPct ---');
  keys.sort((a, b) => a.localeCompare(b));
  for (const k of keys) {
    const pct = kpis[k].occupancyPct;
    const proj = kpis[k].projectedOccupancy4WeeksPct;
    console.log(k + ':', 'occ%=' + pct, proj != null ? 'proj4w%=' + proj : '');
  }
  console.log('\nTo tune: run API with DEBUG_LOOKAHEAD=1 to see move-ins/move-outs for Millerville.');
  console.log('Try USE_NOTICE_FIRST_FOR_LOOKAHEAD=1 if lookahead is far from 89%.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
