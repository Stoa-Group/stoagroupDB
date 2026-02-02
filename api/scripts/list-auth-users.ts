#!/usr/bin/env ts-node
/**
 * List all users in auth.[User] (admin / Capital Markets users).
 * Usage: npm run db:list-auth-users
 */

import * as path from 'path';
import dotenv from 'dotenv';
import { getConnection, closeConnection } from '../src/config/database';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

async function main() {
  if (!process.env.DB_SERVER || !process.env.DB_DATABASE || !process.env.DB_USER || !process.env.DB_PASSWORD) {
    console.error('Set DB_SERVER, DB_DATABASE, DB_USER, DB_PASSWORD (e.g. in api/.env or repo root .env).');
    process.exit(1);
  }

  const pool = await getConnection();
  const result = await pool.request().query(`
    SELECT UserId, Username, Email, FullName, IsActive, CreatedAt, LastLoginAt
    FROM auth.[User]
    ORDER BY UserId
  `);

  const rows = result.recordset as {
    UserId: number;
    Username: string;
    Email: string | null;
    FullName: string | null;
    IsActive: boolean;
    CreatedAt: Date;
    LastLoginAt: Date | null;
  }[];

  await closeConnection();

  if (rows.length === 0) {
    console.log('No users in auth.[User]. Run: npm run db:seed-auth-users');
    process.exit(0);
  }

  console.log(`\nAdmins in auth.[User] (${rows.length} user(s)):\n`);
  for (const u of rows) {
    const active = u.IsActive ? 'active' : 'inactive';
    const lastLogin = u.LastLoginAt ? u.LastLoginAt.toISOString() : 'never';
    console.log(`  ${u.UserId}\t${u.Username ?? u.Email ?? '—'}\t${u.FullName ?? '—'}\t${active}\tlast login: ${lastLogin}`);
  }
  console.log('');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
