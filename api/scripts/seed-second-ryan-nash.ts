/**
 * Boss Feedback #2: Ensure two "Ryan Nash" person records exist for guarantor disambiguation.
 * If exactly one "Ryan Nash" exists, inserts a second with a disambiguating Note.
 * Safe to run multiple times (idempotent).
 *
 * Usage: npm run db:seed-second-ryan-nash (from api/ folder)
 * Requires .env with DB_SERVER, DB_DATABASE, DB_USER, DB_PASSWORD.
 */

import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

import sql from 'mssql';
import { getConnection } from '../src/config/database';

const DISAMBIGUATE_NOTE = 'Second Ryan Nash (guarantor disambiguation)';

async function main(): Promise<void> {
  const pool = await getConnection();
  const result = await pool.request().query(`
    SELECT PersonId, FullName, Title, Notes
    FROM core.Person
    WHERE FullName = N'Ryan Nash'
    ORDER BY PersonId
  `);
  const rows = result.recordset;

  if (rows.length === 0) {
    console.log('No "Ryan Nash" person found. Add persons via API or seed data first.');
    return;
  }
  if (rows.length >= 2) {
    console.log(`Already ${rows.length} "Ryan Nash" person(s). No insert needed.`);
    return;
  }

  // Exactly one Ryan Nash — insert second
  await pool.request()
    .input('FullName', sql.NVarChar, 'Ryan Nash')
    .input('Notes', sql.NVarChar(sql.MAX), DISAMBIGUATE_NOTE)
    .query(`
      INSERT INTO core.Person (FullName, Notes)
      VALUES (@FullName, @Notes)
    `);
  console.log('Inserted second "Ryan Nash" person with disambiguating Notes.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
