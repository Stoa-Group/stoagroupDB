#!/usr/bin/env node
/**
 * Run the construction spread migration (CostPerUnit, ValuationWhenComplete).
 * Uses same .env as API.
 *
 * Usage (from repo root):
 *   node scripts/run-construction-spread-migration.js
 */
const path = require('path');
const fs = require('fs');

// Load .env from api/ or repo root
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
    console.error('Missing DB_SERVER or DB_DATABASE in .env');
    process.exit(1);
  }
  console.log('Connecting to', config.server, '...');
  const pool = await sql.connect(config);
  console.log('Connected.');

  async function addColumn(name) {
    const check = await pool.request().query(`
      SELECT 1 AS ok FROM sys.columns
      WHERE object_id = OBJECT_ID('core.Project') AND name = '${name}'
    `);
    if (check.recordset && check.recordset[0]?.ok) {
      console.log(`${name} already exists on core.Project`);
      return;
    }
    await pool.request().query(`ALTER TABLE core.Project ADD ${name} DECIMAL(18, 2) NULL;`);
    console.log(`Added ${name} to core.Project`);
  }

  await addColumn('CostPerUnit');
  await addColumn('ValuationWhenComplete');

  console.log('Migration complete.');
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
