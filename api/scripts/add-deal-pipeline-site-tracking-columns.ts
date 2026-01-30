/**
 * Add Site Tracking Worksheet columns to pipeline.DealPipeline
 * Run on existing DBs before seeding Site Tracking data.
 * Usage: npm run db:add-deal-pipeline-site-tracking-columns
 */

import * as fs from 'fs';
import * as path from 'path';
import sql from 'mssql';
import dotenv from 'dotenv';

const possibleEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env'),
  path.resolve(__dirname, '../../.env'),
];
for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

if (!process.env.DB_SERVER || !process.env.DB_DATABASE || !process.env.DB_USER || !process.env.DB_PASSWORD) {
  console.error('❌ Set DB_SERVER, DB_DATABASE, DB_USER, DB_PASSWORD (e.g. in .env)');
  process.exit(1);
}

const config: sql.config = {
  server: process.env.DB_SERVER || '',
  database: process.env.DB_DATABASE || '',
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
  },
};

async function run() {
  const pool = await sql.connect(config);
  const sqlPath = path.join(__dirname, '../../schema/add_deal_pipeline_site_tracking_columns.sql');
  const sqlScript = fs.readFileSync(sqlPath, 'utf8');
  const batches = sqlScript.split(/\bGO\b/gi).filter((b) => b.trim());
  for (const batch of batches) {
    if (batch.trim()) await pool.request().query(batch.trim());
  }
  console.log('✅ Deal pipeline site tracking columns added.');
  await pool.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
