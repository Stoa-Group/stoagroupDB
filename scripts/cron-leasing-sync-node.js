#!/usr/bin/env node
/**
 * Render cron (every 30 min): trigger sync-from-domo (async), wait for it to finish, then rebuild snapshot.
 * This keeps the dashboard snapshot constantly up to date even when the DB was empty (e.g. after deploy).
 * Needs: API_BASE_URL; optional: LEASING_SYNC_WEBHOOK_SECRET.
 */
const https = require('https');
const http = require('http');

const base = (process.env.API_BASE_URL || '').replace(/\/$/, '');
const secret = process.env.LEASING_SYNC_WEBHOOK_SECRET || '';
const SYNC_TIMEOUT_MS = Number(process.env.LEASING_SYNC_TIMEOUT_MS) || 60000; // async=true so we only wait for 202
const WAIT_AFTER_SYNC_MS = Number(process.env.LEASING_CRON_WAIT_AFTER_SYNC_MS) || 120000; // 2 min for async sync to finish
const REBUILD_TIMEOUT_MS = Number(process.env.LEASING_REBUILD_TIMEOUT_MS) || 180000; // 3 min for rebuild
const RETRY_DELAY_MS = Number(process.env.LEASING_SYNC_RETRY_DELAY_MS) || 45000;
const MAX_RETRIES = 2;
if (!base) {
  console.error('API_BASE_URL not set');
  process.exit(1);
}

const lib = base.startsWith('https') ? https : http;
const headers = { 'Content-Type': 'application/json' };
if (secret) headers['X-Sync-Secret'] = secret;

function get(path, timeoutMs) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, base);
    const req = lib.get(url, { headers }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ statusCode: res.statusCode, body }));
    });
    req.on('error', reject);
    if (timeoutMs) req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function post(path, timeoutMs = SYNC_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, base);
    const req = lib.request(url, { method: 'POST', headers }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ statusCode: res.statusCode, body }));
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error(`request timed out after ${timeoutMs / 1000}s`));
    });
    req.end();
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function doSync() {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await post('/api/leasing/sync-from-domo?async=true');
      const ok = res.statusCode === 202 || res.statusCode === 200 || res.statusCode === 207;
      if (ok) {
        if (res.statusCode === 202) return { started: true };
        try {
          const j = JSON.parse(res.body);
          return { started: false, synced: j.synced?.length };
        } catch (_) {
          return { started: false };
        }
      }
      if ([502, 503, 504].includes(res.statusCode) && attempt < MAX_RETRIES) {
        console.warn('sync returned', res.statusCode, '- retry in', RETRY_DELAY_MS / 1000, 's');
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      console.error('sync failed:', res.statusCode, res.body?.slice(0, 200));
      return null;
    } catch (e) {
      if (attempt < MAX_RETRIES && (e?.message?.includes('timed out') || e?.code === 'ECONNRESET')) {
        console.warn('sync error:', e?.message || e, '- retry in', RETRY_DELAY_MS / 1000, 's');
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      console.error('sync error:', e?.message || e);
      return null;
    }
  }
  return null;
}

async function doRebuild() {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await post('/api/leasing/rebuild-snapshot', REBUILD_TIMEOUT_MS);
      if (res.statusCode === 200) {
        try {
          const j = JSON.parse(res.body);
          return { ok: true, builtAt: j.builtAt };
        } catch (_) {
          return { ok: true };
        }
      }
      if ([502, 503, 504].includes(res.statusCode) && attempt < MAX_RETRIES) {
        console.warn('rebuild-snapshot returned', res.statusCode, '- retry in', RETRY_DELAY_MS / 1000, 's');
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      console.error('rebuild-snapshot failed:', res.statusCode, res.body?.slice(0, 200));
      return { ok: false };
    } catch (e) {
      if (attempt < MAX_RETRIES && (e?.message?.includes('timed out') || e?.code === 'ECONNRESET')) {
        console.warn('rebuild error:', e?.message || e, '- retry in', RETRY_DELAY_MS / 1000, 's');
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      console.error('rebuild error:', e?.message || e);
      return { ok: false };
    }
  }
  return { ok: false };
}

async function verifySnapshot() {
  try {
    const res = await get('/api/leasing/dashboard', 60000);
    if (res.statusCode !== 200) return { rows: -1 };
    const data = JSON.parse(res.body);
    const dash = data.dashboard || data;
    const rows = Array.isArray(dash.rows) ? dash.rows.length : 0;
    const kpiKeys = (dash.kpis?.byProperty && typeof dash.kpis.byProperty === 'object') ? Object.keys(dash.kpis.byProperty).length : 0;
    return { rows, kpiKeys };
  } catch (_) {
    return { rows: -1 };
  }
}

(async () => {
  try {
    console.log('Triggering sync-from-domo (async)...');
    const syncResult = await doSync();
    if (syncResult === null) {
      console.warn('Sync failed; will still try rebuild from current DB.');
    } else if (syncResult.started) {
      console.log('Sync started in background (202). Waiting', WAIT_AFTER_SYNC_MS / 1000, 's for it to finish...');
      await sleep(WAIT_AFTER_SYNC_MS);
    } else if (syncResult.synced != null) {
      console.log('Sync completed synchronously.', syncResult.synced, 'tables synced.');
    }

    console.log('Rebuilding snapshot...');
    const rebuildResult = await doRebuild();
    if (!rebuildResult.ok) {
      process.exit(1);
    }
    if (rebuildResult.builtAt) console.log('Snapshot rebuilt. builtAt:', rebuildResult.builtAt);

    const v = await verifySnapshot();
    if (v.rows >= 0) {
      if (v.rows === 0 && v.kpiKeys === 0) {
        console.warn('Snapshot has no rows and no kpis.byProperty — DB may be empty; run sync-from-domo or check Domo env vars on the server.');
      } else {
        console.log('Snapshot OK: rows=', v.rows, 'kpis.byProperty keys=', v.kpiKeys);
      }
    }
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
