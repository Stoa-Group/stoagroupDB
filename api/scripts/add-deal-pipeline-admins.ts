/**
 * Add additional admin users for Deal Pipeline editing
 * Run: npm run db:add-deal-pipeline-admins
 *
 * Adds: pbailey@stoagroup.com, jsnodgrass@stoagroup.com, mweems@stoagroup.com, twharton@stoagroup.com
 * These users can log in via Domo SSO (email lookup) or local login.
 */

import sql from 'mssql';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import { existsSync } from 'fs';

const possibleEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env'),
  path.resolve(__dirname, '../../.env'),
];

let envLoaded = false;
for (const envPath of possibleEnvPaths) {
  if (existsSync(envPath)) {
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      envLoaded = true;
      break;
    }
  }
}
if (!envLoaded) dotenv.config();

if (!process.env.DB_SERVER || !process.env.DB_DATABASE || !process.env.DB_USER || !process.env.DB_PASSWORD) {
  console.error('❌ Missing required environment variables!');
  process.exit(1);
}

const dbConfig: sql.config = {
  server: process.env.DB_SERVER || '',
  database: process.env.DB_DATABASE || '',
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
};

const ADMINS_TO_ADD = [
  { email: 'pbailey@stoagroup.com', fullName: 'P Bailey' },
  { email: 'jsnodgrass@stoagroup.com', fullName: 'J Snodgrass' },
  { email: 'mweems@stoagroup.com', fullName: 'M Weems' },
  { email: 'twharton@stoagroup.com', fullName: 'T Wharton' },
];

async function addAdmins() {
  try {
    console.log('🔐 Adding Deal Pipeline admin users...\n');
    const pool = await sql.connect(dbConfig);

    const tableCheck = await pool.request().query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'auth' AND TABLE_NAME = 'User'
    `);
    if (tableCheck.recordset[0].count === 0) {
      console.error('❌ auth.User table does not exist. Run schema/create_auth_table.sql first.');
      process.exit(1);
    }

    // Domo SSO looks up by email; password only needed for local login
    const tempPassword = 'DealPipeline' + Date.now().toString(36);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    for (const { email, fullName } of ADMINS_TO_ADD) {
      const existing = await pool.request()
        .input('email', sql.NVarChar, email)
        .query(`SELECT UserId FROM auth.[User] WHERE LOWER(Email) = LOWER(@email)`);

      if (existing.recordset.length > 0) {
        console.log(`⚠️  ${email} already exists, skipping.`);
        continue;
      }

      await pool.request()
        .input('username', sql.NVarChar, email)
        .input('passwordHash', sql.NVarChar, passwordHash)
        .input('email', sql.NVarChar, email)
        .input('fullName', sql.NVarChar, fullName)
        .query(`
          INSERT INTO auth.[User] (Username, PasswordHash, Email, FullName, IsActive)
          VALUES (@username, @passwordHash, @email, @fullName, 1)
        `);
      console.log(`✅ Added: ${email}`);
    }

    console.log('\n✨ Done. These users can log in via Domo SSO (email lookup, no password needed).');
    await pool.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addAdmins();
