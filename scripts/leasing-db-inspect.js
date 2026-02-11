#!/usr/bin/env node
/**
 * Connect to the DB (using same .env as the API) and run SQL to inspect leasing tables
 * and DashboardSnapshot.
 *
 * Usage (from repo root):
 *   node scripts/leasing-db-inspect.js
 *
 * Loads .env from api/ or repo root. Uses api/node_modules/mssql.
 * Requires: DB_SERVER, DB_DATABASE, DB_USER, DB_PASSWORD in .env
 */
const path = require('path');
const fs = require('fs');

// Load .env from api/ or repo root (same as API)
for (const p of [
  path.join(__dirname, '..', 'api', '.env'),
  path.join(__dirname, '..', '.env'),
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
  }
}

const sql = require(path.join(__dirname, '..', 'api', 'node_modules', 'mssql'));

const config = {
  server: process.env.DB_SERVER || '',
  database: process.env.DB_DATABASE || '',
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
  },
  pool: { max: 5, min: 0 },
};

async function run() {
  if (!config.server || !config.database) {
    console.error('Missing DB_SERVER or DB_DATABASE in .env (load from api/ or repo root)');
    process.exit(1);
  }
  console.log('Connecting to', config.server, '...');
  const pool = await sql.connect(config);
  console.log('Connected.\n');

  try {
    // 1) Row counts for all leasing tables
    console.log('--- leasing schema: row counts ---');
    const tables = [
      'leasing.Leasing',
      'leasing.MMRData',
      'leasing.UnitByUnitTradeout',
      'leasing.PortfolioUnitDetails',
      'leasing.Units',
      'leasing.UnitMix',
      'leasing.Pricing',
      'leasing.RecentRents',
      'leasing.SyncLog',
    ];
    for (const table of tables) {
      try {
        const r = await pool.request().query(`SELECT COUNT(*) AS n FROM ${table}`);
        const n = r.recordset[0]?.n ?? '?';
        console.log(`${table}: ${n}`);
      } catch (e) {
        console.log(`${table}: ERROR ${e.message}`);
      }
    }

    // 2) DashboardSnapshot: Id, BuiltAt, Payload length and prefix
    console.log('\n--- leasing.DashboardSnapshot ---');
    const snap = await pool.request().query(`
      SELECT Id, BuiltAt,
             LEN(Payload) AS PayloadLen,
             LEFT(CAST(Payload AS NVARCHAR(100)), 80) AS PayloadPrefix
      FROM leasing.DashboardSnapshot
    `);
    if (snap.recordset.length === 0) {
      console.log('(no rows)');
    } else {
      for (const row of snap.recordset) {
        console.log('Id:', row.Id, '| BuiltAt:', row.BuiltAt, '| Payload length:', row.PayloadLen, '| Prefix:', row.PayloadPrefix);
      }
    }

    // 3) Optional: first few Leasing rows
    console.log('\n--- leasing.Leasing (first 3 rows) ---');
    const sample = await pool.request().query('SELECT TOP 3 Id, Property, Units, MonthOf FROM leasing.Leasing');
    if (sample.recordset.length === 0) {
      console.log('(no rows)');
    } else {
      console.table(sample.recordset);
    }
  } finally {
    await pool.close();
    console.log('\nDone.');
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
