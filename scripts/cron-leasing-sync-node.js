#!/usr/bin/env node
/**
 * Render cron (every 30 min): call GET /api/leasing/sync-check first.
 * When Domo data has changed, POST sync-from-domo?async=true so the API returns 202 immediately
 * and runs sync in background (avoids 502 from gateway timeout). When no changes, rebuild snapshot.
 * Needs: API_BASE_URL; optional: LEASING_SYNC_WEBHOOK_SECRET.
 */
const https = require('https');
const http = require('http');

const base = (process.env.API_BASE_URL || '').replace(/\/$/, '');
const secret = process.env.LEASING_SYNC_WEBHOOK_SECRET || '';
const SYNC_TIMEOUT_MS = Number(process.env.LEASING_SYNC_TIMEOUT_MS) || 60000; // async=true so we only wait for 202
const RETRY_DELAY_MS = Number(process.env.LEASING_SYNC_RETRY_DELAY_MS) || 45000; // 45s between retries
const MAX_RETRIES = 2; // retry 502/503/504 up to this many times (0 = no retry)
if (!base) {
  console.error('API_BASE_URL not set');
  process.exit(1);
}

const lib = base.startsWith('https') ? https : http;
const headers = { 'Content-Type': 'application/json' };
if (secret) headers['X-Sync-Secret'] = secret;

function get(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, base);
    const req = lib.get(url, { headers }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ statusCode: res.statusCode, body }));
    });
    req.on('error', reject);
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

(async () => {
  try {
    const { statusCode, body } = await get('/api/leasing/sync-check');
    if (statusCode !== 200) {
      console.error('sync-check failed:', statusCode, body.slice(0, 200));
      process.exit(1);
    }
    let data;
    try {
      data = JSON.parse(body);
    } catch (_) {
      console.error('sync-check response not JSON:', body.slice(0, 200));
      process.exit(1);
    }
    if (data.changes !== true) {
      console.log('No Domo changes; skipping full sync. Rebuilding snapshot from current DB...');
      const rebuildRes = await post('/api/leasing/rebuild-snapshot', 120000);
      if (rebuildRes.statusCode === 200) {
        console.log('Snapshot rebuilt.');
      } else {
        console.warn('rebuild-snapshot:', rebuildRes.statusCode, rebuildRes.body?.slice(0, 100));
      }
      process.exit(0);
    }
    console.log('Domo changes detected; starting sync-from-domo (async)...');
    let lastRes = null;
    let lastErr = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const syncRes = await post('/api/leasing/sync-from-domo?async=true');
        lastRes = syncRes;
        const ok = syncRes.statusCode === 202 || syncRes.statusCode === 200 || syncRes.statusCode === 207;
        if (ok) {
          if (syncRes.statusCode === 202) {
            console.log('Sync started in background (202).');
          } else {
            let summary;
            try {
              summary = JSON.parse(syncRes.body);
            } catch (_) {
              summary = null;
            }
            console.log('Sync completed.', summary?.synced?.length ? summary.synced.length + ' tables synced.' : '');
          }
          process.exit(0);
        }
        if ([502, 503, 504].includes(syncRes.statusCode) && attempt < MAX_RETRIES) {
          console.warn('sync-from-domo returned', syncRes.statusCode, '- retrying in', RETRY_DELAY_MS / 1000, 's (' + (attempt + 1) + '/' + (MAX_RETRIES + 1) + ')');
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        console.error('sync-from-domo failed:', syncRes.statusCode, syncRes.body.slice(0, 300));
        process.exit(1);
      } catch (e) {
        lastErr = e;
        const isTimeout = e?.message?.includes('timed out');
        if ((isTimeout || e?.code === 'ECONNRESET') && attempt < MAX_RETRIES) {
          console.warn('sync-from-domo error:', e?.message || e, '- retrying in', RETRY_DELAY_MS / 1000, 's (' + (attempt + 1) + '/' + (MAX_RETRIES + 1) + ')');
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        console.error(e);
        process.exit(1);
      }
    }
    console.error('sync-from-domo failed after retries:', lastRes?.statusCode ?? lastErr?.message);
    process.exit(1);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
