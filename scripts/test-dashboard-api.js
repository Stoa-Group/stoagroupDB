#!/usr/bin/env node
/**
 * Call GET /api/leasing/dashboard and print diagnostics (rows length, kpis.byProperty, etc.).
 * Use to verify the API returns populated data.
 *
 * Usage (from repo root):
 *   node scripts/test-dashboard-api.js
 *   API_BASE_URL=https://stoagroupdb-ddre.onrender.com node scripts/test-dashboard-api.js
 *
 * Env: API_BASE_URL (default http://localhost:3000)
 */
const base = process.env.API_BASE_URL || 'http://localhost:3000';

async function main() {
  const url = base.replace(/\/$/, '') + '/api/leasing/dashboard';
  console.log('GET', url);
  const t0 = Date.now();
  let res;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
  } catch (e) {
    console.error('Fetch failed:', e.message || e);
    process.exit(1);
  }
  const elapsed = Date.now() - t0;
  console.log('Status:', res.status, 'Time:', elapsed + 'ms');

  let body;
  try {
    body = await res.json();
  } catch (e) {
    console.error('Response not JSON:', e.message);
    process.exit(1);
  }

  if (!res.ok) {
    console.error('Error body:', JSON.stringify(body, null, 2));
    process.exit(1);
  }

  const dashboard = body.dashboard || body;
  const keys = typeof dashboard === 'object' && dashboard !== null ? Object.keys(dashboard) : [];
  console.log('Dashboard keys:', keys.length, keys.slice(0, 15).join(', ') + (keys.length > 15 ? '...' : ''));

  const rows = Array.isArray(dashboard.rows) ? dashboard.rows : [];
  const kpis = dashboard.kpis && typeof dashboard.kpis === 'object' ? dashboard.kpis : {};
  const byProperty = kpis.byProperty && typeof kpis.byProperty === 'object' ? kpis.byProperty : {};
  const byPropKeys = Object.keys(byProperty);

  console.log('');
  console.log('rows.length:', rows.length);
  console.log('kpis.byProperty keys:', byPropKeys.length, byPropKeys.length ? byPropKeys.slice(0, 5).join(', ') + (byPropKeys.length > 5 ? '...' : '') : '(none)');

  if (rows.length === 0 && byPropKeys.length > 0) {
    console.log('');
    console.log('>>> API has kpis.byProperty but empty rows — frontend will treat as "no data" unless backend fills rows from KPIs (or frontend builds synthetic rows).');
    console.log('Sample byProperty entry:', JSON.stringify(byProperty[byPropKeys[0]], null, 2).split('\n').slice(0, 12).join('\n'));
  } else if (rows.length > 0) {
    console.log('');
    console.log('Sample row (first property):', JSON.stringify(rows[0], null, 2).split('\n').slice(0, 15).join('\n'));
  }

  const meta = body._meta || {};
  console.log('');
  console.log('_meta.fromSnapshot:', meta.fromSnapshot);
  console.log('_meta.builtAt:', meta.builtAt);
  console.log('_meta.latestReportDate:', meta.latestReportDate);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
