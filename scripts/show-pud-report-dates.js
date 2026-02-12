#!/usr/bin/env node
/**
 * Query leasing.PortfolioUnitDetails for most recent ReportDate and summary.
 * Uses same .env as API (api/.env or .env). Requires: DB_SERVER, DB_DATABASE, DB_USER, DB_PASSWORD.
 *
 * Usage (from repo root):
 *   node scripts/show-pud-report-dates.js
 */
const path = require('path');
const fs = require('fs');

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
  pool: { max: 2, min: 0 },
};

async function run() {
  if (!config.server || !config.database) {
    console.error('Missing DB_SERVER or DB_DATABASE in .env (load from api/ or repo root)');
    process.exit(1);
  }
  const pool = await sql.connect(config);

  try {
    console.log('--- leasing.PortfolioUnitDetails: most recent ReportDate ---');
    const r1 = await pool.request().query(`
      SELECT MAX(ReportDate) AS MostRecentReportDate, COUNT(*) AS TotalRows
      FROM leasing.PortfolioUnitDetails
    `);
    const row = r1.recordset[0];
    console.log('MostRecentReportDate:', row?.MostRecentReportDate ?? '(null)');
    console.log('TotalRows:', row?.TotalRows ?? 0);

    console.log('\n--- Report dates (newest first) with row counts ---');
    const r2 = await pool.request().query(`
      SELECT ReportDate, COUNT(*) AS Cnt
      FROM leasing.PortfolioUnitDetails
      GROUP BY ReportDate
      ORDER BY ReportDate DESC
    `);
    if (r2.recordset.length === 0) {
      console.log('(no rows)');
    } else {
      console.table(r2.recordset);
    }

    console.log('--- Sample of latest 10 rows ---');
    const r3 = await pool.request().query(`
      SELECT TOP 10 Property, UnitNumber, ReportDate, UnitLeaseStatus
      FROM leasing.PortfolioUnitDetails
      ORDER BY ReportDate DESC, Property, UnitNumber
    `);
    if (r3.recordset.length === 0) {
      console.log('(no rows)');
    } else {
      console.table(r3.recordset);
    }
  } finally {
    await pool.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
