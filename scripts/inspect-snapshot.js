#!/usr/bin/env node
/**
 * Inspect leasing dashboard snapshot table(s). Shows exactly what is stored so you can
 * verify the API is writing to the same DB/table you're querying.
 *
 * Usage (from repo root):
 *   node scripts/inspect-snapshot.js
 *
 * Loads .env from api/ or repo root. Requires: DB_SERVER, DB_DATABASE, DB_USER, DB_PASSWORD.
 * The API writes to leasing.DashboardSnapshot (Id, Payload, BuiltAt). If you see
 * leasing.Dashboard in your DB client, that may be a different table.
 */

const path = require('path');
const fs = require('fs');
const zlib = require('zlib');

const GZ_PREFIX = 'gz:';
function decompressPayload(stored) {
  if (!stored || typeof stored !== 'string') return null;
  if (!stored.startsWith(GZ_PREFIX)) return stored;
  const b64 = stored.slice(GZ_PREFIX.length);
  const compressed = Buffer.from(b64, 'base64');
  return zlib.gunzipSync(compressed).toString('utf8');
}

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

async function inspectTable(pool, tableName) {
  console.log(`\n--- ${tableName} ---`);
  try {
    const r = await pool.request().query(`
      SELECT
        Id,
        BuiltAt,
        CASE WHEN Payload IS NULL THEN 1 ELSE 0 END AS PayloadIsNull,
        LEN(CAST(Payload AS NVARCHAR(MAX))) AS PayloadLen,
        LEFT(CAST(ISNULL(Payload, N'') AS NVARCHAR(200)), 120) AS PayloadPrefix
      FROM ${tableName}
    `);
    if (r.recordset.length === 0) {
      console.log('  (no rows)');
      return;
    }
    for (const row of r.recordset) {
      console.log('  Id:', row.Id, '| BuiltAt:', row.BuiltAt);
      console.log('  Payload: ', row.PayloadIsNull ? 'NULL' : `length=${row.PayloadLen}`);
      if (row.PayloadPrefix && String(row.PayloadPrefix).trim())
        console.log('  Prefix: ', JSON.stringify(String(row.PayloadPrefix).slice(0, 100)));
    }
  } catch (e) {
    console.log('  ERROR:', e.message);
  }
}

async function run() {
  if (!config.server || !config.database) {
    console.error('Missing DB_SERVER or DB_DATABASE. Set in api/.env or .env');
    process.exit(1);
  }
  console.log('Connecting to', config.server, 'database', config.database, '...');
  const pool = await sql.connect(config);
  console.log('Connected.\n');

  try {
    console.log('API writes to: leasing.DashboardSnapshot (Id=1, Payload, BuiltAt)');
    await inspectTable(pool, 'leasing.DashboardSnapshot');

    // In case the DB has a table named Dashboard (without "Snapshot")
    console.log('\n(Checking leasing.Dashboard in case that is the table you see in SSMS)');
    await inspectTable(pool, 'leasing.Dashboard');

    console.log('\n--- Summary ---');
    const countSnap = await pool.request().query('SELECT COUNT(*) AS n FROM leasing.DashboardSnapshot');
    const n = countSnap.recordset[0]?.n ?? 0;
    const withPayload = await pool.request().query(`
      SELECT COUNT(*) AS n FROM leasing.DashboardSnapshot WHERE Payload IS NOT NULL AND LEN(CAST(Payload AS NVARCHAR(MAX))) > 0
    `);
    const hasData = withPayload.recordset[0]?.n ?? 0;
    console.log('leasing.DashboardSnapshot: total rows =', n, '| rows with non-empty Payload =', hasData);
    if (n > 0 && hasData === 0)
      console.log('  -> All rows have NULL or empty Payload. Check that the API .env points to this DB and that rebuild/sync ran successfully.');

    // Decompress and show decoded JSON summary (Id=1 first, then any row with Payload)
    console.log('\n--- Decoded snapshot (uncompressed Payload) ---');
    const payloadRow = await pool.request()
      .input('id', sql.Int, 1)
      .query('SELECT Id, BuiltAt, Payload FROM leasing.DashboardSnapshot WHERE Id = @id');
    let row = payloadRow.recordset[0];
    if (!row || !row.Payload) {
      const anyRow = await pool.request().query(`
        SELECT TOP 1 Id, BuiltAt, Payload FROM leasing.DashboardSnapshot WHERE Payload IS NOT NULL AND LEN(CAST(Payload AS NVARCHAR(MAX))) > 0
      `);
      row = anyRow.recordset[0];
    }
    if (row && row.Payload) {
      const raw = String(row.Payload);
      const decoded = decompressPayload(raw);
      if (decoded) {
        console.log('  Decoded length:', decoded.length, 'chars');
        try {
          const json = JSON.parse(decoded);
          console.log('  Root keys:', Object.keys(json));
          if (json.success !== undefined) console.log('  success:', json.success);
          if (json.dashboard) {
            const d = json.dashboard;
            console.log('  dashboard keys:', Object.keys(d));
            if (Array.isArray(d.rows)) console.log('  dashboard.rows.length:', d.rows.length);
            if (d.rows && d.rows[0]) console.log('  first row keys (sample):', Object.keys(d.rows[0]).slice(0, 12));
          }
          if (json._meta) console.log('  _meta:', json._meta);
        } catch (e) {
          console.log('  JSON parse error:', e.message);
          console.log('  First 200 chars:', decoded.slice(0, 200));
        }
      } else {
        console.log('  (decompress failed or not gz:)');
      }
    } else {
      console.log('  (no row with Payload to decode)');
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
