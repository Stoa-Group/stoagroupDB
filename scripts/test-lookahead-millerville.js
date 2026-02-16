#!/usr/bin/env node
/**
 * Fetch dashboard from API and print Millerville (and all props) occupancy for lookahead tuning.
 * Targets below = Units Occupied / Leased Units from Monthly Leasing Report (Executive KPI). Update when report numbers change.
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

  // Occupied / Leased from Occupancy + Leasing dashboards (Current Occupancy % × Total Units, Current Leased % × Total Units)
  const targets = [
    { name: 'Millerville', occ: 265, leas: 257 },   // The Waters at Millerville — 89.8% occ, 87.1% leased
    { name: 'Picardy', occ: 152, leas: 151 },      // The Heights at Picardy — 65.5% occ, 65.1% leased
    { name: 'Bluebonnet', occ: 293, leas: 291 },   // The Waters at Bluebonnet — 90.4% occ, 89.8% leased
    { name: 'Crestview', occ: 160, leas: 161 },    // The Waters at Crestview — 55.6% occ, 55.9% leased
    { name: 'McGowin', occ: 129, leas: 132 },      // The Waters at McGowin — 51.2% occ, 52.4% leased
    { name: 'Redstone', occ: 204, leas: 197 },     // The Waters at Redstone — 85.0% occ, 82.1% leased
  ];
  console.log('\n--- Target check: occupied / leased ---');
  let allOk = true;
  for (const t of targets) {
    const key = keys.find((k) => k.toUpperCase().includes(t.name.toUpperCase()));
    if (!key) {
      console.log(t.name + ': NOT FOUND');
      allOk = false;
      continue;
    }
    const p = kpis[key];
    const occOk = p.occupied === t.occ;
    const leasOk = p.leased === t.leas;
    const status = (occOk && leasOk) ? 'OK' : (occOk ? 'leased off' : leasOk ? 'occupied off' : 'both off');
    if (!occOk || !leasOk) allOk = false;
    console.log(
      key + ': occupied=' + p.occupied + (occOk ? '' : ' (target ' + t.occ + ')') +
      ', leased=' + p.leased + (leasOk ? '' : ' (target ' + t.leas + ')') +
      ' ' + status
    );
  }
  console.log('');
  if (allOk) console.log('All targets met.');
  else console.log('Some targets not met (see above).');

  console.log('\n--- All properties: occupancyPct ---');
  keys.sort((a, b) => a.localeCompare(b));
  for (const k of keys) {
    const pct = kpis[k].occupancyPct;
    const proj = kpis[k].projectedOccupancy4WeeksPct;
    console.log(k + ':', 'occ%=' + pct, 'occ=' + (kpis[k].occupied ?? '—') + ' leas=' + (kpis[k].leased ?? '—'), proj != null ? 'proj4w%=' + proj : '');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
