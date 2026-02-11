#!/usr/bin/env node
/**
 * Test every leasing API endpoint and verify which ones the Leasing Analytics Hub frontend uses.
 * Snapshot is stored in DB table: leasing.DashboardSnapshot (Id, Payload, BuiltAt).
 *
 * Usage: node scripts/test-leasing-endpoints.js [baseUrl]
 * Default baseUrl: http://localhost:3000
 * Set DASHBOARD_TIMEOUT_MS=5000 for quick run (dashboard may timeout).
 */
const base = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const dashboardTimeout = Number(process.env.DASHBOARD_TIMEOUT_MS) || 125000;

// ---- Frontend usage (from leasing velocity report app.js) ----
const FRONTEND_ENDPOINTS = [
  { method: 'GET', path: '/api/leasing/dashboard', usedBy: 'Primary: app loads data from this. Must return { success, dashboard } with dashboard.rows array.' },
  { method: 'POST', path: '/api/leasing/sync', usedBy: 'Only when NOT using backend dashboard: app pushes Domo data to API (fire-and-forget).' },
];

// ---- All leasing routes (from api/src/routes/leasingRoutes.ts) ----
const LEASING_ENDPOINTS = [
  { method: 'GET', path: '/api/leasing/aggregates/available' },
  { method: 'GET', path: '/api/leasing/aggregates' },
  { method: 'GET', path: '/api/leasing/dashboard' },
  { method: 'POST', path: '/api/leasing/rebuild-snapshot' },
  { method: 'POST', path: '/api/leasing/sync' },
  { method: 'GET', path: '/api/leasing/sync-check' },
  { method: 'GET', path: '/api/leasing/sync-health' },
  { method: 'GET', path: '/api/leasing/domo-columns' },
  { method: 'POST', path: '/api/leasing/sync-add-alias' },
  { method: 'POST', path: '/api/leasing/sync-from-domo' },
  { method: 'POST', path: '/api/leasing/wipe' },
  { method: 'GET', path: '/api/leasing/datasets/leasing' },
  { method: 'GET', path: '/api/leasing/datasets/mmrdata' },
  { method: 'GET', path: '/api/leasing/datasets/leasing/1' },
  { method: 'POST', path: '/api/leasing/datasets/leasing', body: {} },
  { method: 'PUT', path: '/api/leasing/datasets/leasing/1', body: {} },
  { method: 'DELETE', path: '/api/leasing/datasets/leasing/999999' },
];

function fetchOk(url, opts = {}) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), opts.timeout || 15000);
  return fetch(url, { ...opts, signal: ctrl.signal })
    .then((r) => {
      clearTimeout(to);
      return r;
    })
    .catch((e) => {
      clearTimeout(to);
      throw e;
    });
}

async function run() {
  const results = [];
  function log(method, path, ok, detail) {
    results.push({ method, path, ok, detail });
    const color = ok ? '\x1b[32m' : '\x1b[31m';
    console.log(`${color}${ok ? 'OK ' : 'FAIL'} ${method} ${path}\x1b[0m  ${detail || ''}`);
  }

  console.log('\n=== Leasing API endpoint tests ===');
  console.log('Base URL:', base);
  console.log('Dashboard timeout:', dashboardTimeout, 'ms\n');

  for (const { method, path } of LEASING_ENDPOINTS) {
    const url = base + path;
    const opts = { method, timeout: path === '/api/leasing/dashboard' ? dashboardTimeout : 15000 };
    if ((method === 'POST' || method === 'PUT') && path !== '/api/leasing/sync-from-domo' && path !== '/api/leasing/wipe') {
      opts.headers = { 'Content-Type': 'application/json' };
      opts.body = path === '/api/leasing/sync-add-alias' ? '{}' : JSON.stringify({});
    }
    try {
      const r = await fetchOk(url, opts);
      let body = '';
      const ct = r.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        body = await r.text();
      }
      const j = body ? (() => { try { return JSON.parse(body); } catch { return null; } })() : null;
      const ok = r.ok || (r.status === 400 || r.status === 401 || r.status === 404); // expected for some calls with no body
      let detail = r.status + '';
      if (j && j.success !== undefined) detail += ' success=' + j.success;
      if (path === '/api/leasing/dashboard' && j && j.dashboard) {
        const rows = Array.isArray(j.dashboard.rows) ? j.dashboard.rows.length : 'n/a';
        detail += ' rows=' + rows + ' fromSnapshot=' + (j._meta?.fromSnapshot ?? 'n/a');
      }
      if (path === '/api/leasing/rebuild-snapshot' && j && j.builtAt) detail += ' builtAt=' + j.builtAt;
      log(method, path, ok, detail);
    } catch (e) {
      log(method, path, false, e.name === 'AbortError' ? 'timeout' : e.message);
    }
  }

  console.log('\n--- Frontend mapping (Leasing Analytics Hub) ---');
  console.log('Required for app load: GET /api/leasing/dashboard → must return { success: true, dashboard: { rows: [...], ... } }');
  console.log('Optional (when app uses Domo data): POST /api/leasing/sync with body { leasing, MMRData, ... }');
  console.log('All other leasing endpoints are for sync/cron/scripts, not used by the dashboard UI for initial load.\n');

  console.log('--- Snapshot storage ---');
  console.log('Table: leasing.DashboardSnapshot');
  console.log('Columns: Id (int, PK), Payload (nvarchar(max) – gzip+base64 or raw JSON), BuiltAt (datetime2)');
  console.log('Written by: getDashboard (when building from raw), rebuildDashboardSnapshot(), postSync/postSyncFromDomo (after sync).');
  console.log('Read by: getDashboard (serves from snapshot when present).\n');

  const failed = results.filter((x) => !x.ok);
  if (failed.length) {
    console.log('Failed:', failed.map((x) => x.method + ' ' + x.path).join(', '));
    process.exit(1);
  }
  console.log('All listed endpoints responded (no network/5xx).');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
