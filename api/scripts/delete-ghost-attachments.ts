#!/usr/bin/env ts-node
/**
 * Delete attachment rows whose blob does not exist in Azure (ghost records from
 * early attach runs before Azure was used, or failed uploads).
 *
 * Prereq: AZURE_STORAGE_CONNECTION_STRING and AZURE_STORAGE_CONTAINER set (same as API).
 * Usage: npm run db:delete-ghost-attachments [-- --dry-run]
 *   --dry-run: only list ghost attachments, do not delete.
 */

import * as path from 'path';
import * as fs from 'fs';
import dotenv from 'dotenv';
import sql from 'mssql';
import { getConnection, closeConnection } from '../src/config/database';
import { isBlobStorageConfigured, blobExists } from '../src/config/azureBlob';

const apiEnv = path.resolve(__dirname, '..', '.env');
const rootEnv = path.resolve(__dirname, '..', '..', '.env');
dotenv.config({ path: apiEnv });
dotenv.config({ path: rootEnv });

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  if (!isBlobStorageConfigured()) {
    console.error('Set AZURE_STORAGE_CONNECTION_STRING and AZURE_STORAGE_CONTAINER (same as API).');
    console.error(`Looked for .env: api ${fs.existsSync(apiEnv) ? 'found' : 'missing'}, root ${fs.existsSync(rootEnv) ? 'found' : 'missing'}`);
    console.error(`AZURE_STORAGE_CONNECTION_STRING set: ${!!process.env.AZURE_STORAGE_CONNECTION_STRING}`);
    console.error(`AZURE_STORAGE_CONTAINER set: ${!!process.env.AZURE_STORAGE_CONTAINER}`);
    process.exit(1);
  }
  if (!process.env.DB_SERVER || !process.env.DB_DATABASE || !process.env.DB_USER || !process.env.DB_PASSWORD) {
    console.error('Set DB_SERVER, DB_DATABASE, DB_USER, DB_PASSWORD (e.g. in api/.env or repo root .env).');
    process.exit(1);
  }

  const pool = await getConnection();
  const result = await pool.request().query(`
    SELECT DealPipelineAttachmentId, DealPipelineId, StoragePath, FileName
    FROM pipeline.DealPipelineAttachment
    ORDER BY DealPipelineAttachmentId
  `);
  const rows = result.recordset as { DealPipelineAttachmentId: number; DealPipelineId: number; StoragePath: string; FileName: string }[];

  if (rows.length === 0) {
    console.log('No attachments in DB.');
    await closeConnection();
    process.exit(0);
  }

  console.log(`Checking ${rows.length} attachment(s) against Azure...`);
  let deleted = 0;
  for (const row of rows) {
    const exists = await blobExists(row.StoragePath);
    if (!exists) {
      console.log(`  Ghost: DealPipelineAttachmentId=${row.DealPipelineAttachmentId} DealPipelineId=${row.DealPipelineId} ${row.FileName}`);
      if (!dryRun) {
        await pool.request()
          .input('id', sql.Int, row.DealPipelineAttachmentId)
          .query('DELETE FROM pipeline.DealPipelineAttachment WHERE DealPipelineAttachmentId = @id');
        deleted++;
      }
    }
  }

  await closeConnection();
  if (dryRun) {
    console.log('\nDry run: no rows deleted. Run without --dry-run to delete ghost attachments.');
  } else {
    console.log(`\nDeleted ${deleted} ghost attachment row(s).`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
