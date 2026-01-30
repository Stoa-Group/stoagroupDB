#!/usr/bin/env ts-node
/**
 * For every deal: (1) use KMZ attachments in the DB to extract longitude and latitude and
 * update pipeline.DealPipeline; (2) for deals still missing coords, try local KMZ files in
 * data/CAROLINASPIPELINEFILES and data/GULFCOASTPIPELINEFILES by matching ProjectName to filename.
 * Writes Latitude and Longitude so deals show on the map.
 *
 * Prereq: Run schema/add_deal_pipeline_latitude_longitude.sql if columns don't exist.
 * Usage: npm run db:sync-deal-lat-long-from-kmz
 */

import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import sql from 'mssql';
import { getConnection, closeConnection } from '../src/config/database';
import { isBlobStorageConfigured, downloadBlobToBuffer } from '../src/config/azureBlob';
import { getFullPath } from '../src/middleware/uploadMiddleware';
import { extractCoordinatesFromKmzBuffer } from './extract-kmz-coordinates';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const CAROLINAS_DIR = path.resolve(__dirname, '../../data/CAROLINASPIPELINEFILES');
const GULFCOAST_DIR = path.resolve(__dirname, '../../data/GULFCOASTPIPELINEFILES');

/** Collect all .kmz file paths from Carolinas and Gulf Coast dirs. */
function getLocalKmzPaths(): string[] {
  const out: string[] = [];
  for (const dir of [CAROLINAS_DIR, GULFCOAST_DIR]) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      if (fs.statSync(full).isFile() && f.toLowerCase().endsWith('.kmz')) out.push(full);
    }
  }
  return out;
}

/** Return true if this KMZ file name matches the deal's ProjectName (for filling missing coords). */
function fileMatchesProjectName(filePath: string, projectName: string): boolean {
  const base = path.basename(filePath, '.kmz').trim();
  const proj = projectName.trim();
  if (!proj || !base) return false;
  const baseLower = base.toLowerCase();
  const projLower = proj.toLowerCase();
  return baseLower.includes(projLower) || projLower.includes(baseLower);
}

async function main() {
  if (!process.env.DB_SERVER || !process.env.DB_DATABASE || !process.env.DB_USER || !process.env.DB_PASSWORD) {
    console.error('Set DB_SERVER, DB_DATABASE, DB_USER, DB_PASSWORD (e.g. in repo root .env)');
    process.exit(1);
  }

  const pool = await getConnection();
  const useBlob = isBlobStorageConfigured();
  let updated = 0;
  let errors = 0;

  // ---------- Phase 1: KMZ attachments in DB ----------
  const result = await pool.request().query(`
    SELECT a.DealPipelineAttachmentId, a.DealPipelineId, a.StoragePath, a.FileName
    FROM pipeline.DealPipelineAttachment a
    WHERE LOWER(a.FileName) LIKE '%.kmz'
    ORDER BY a.DealPipelineId, a.DealPipelineAttachmentId
  `);

  const rows = result.recordset as { DealPipelineAttachmentId: number; DealPipelineId: number; StoragePath: string; FileName: string }[];
  console.log(`Phase 1: DB KMZ attachments: ${rows.length} found.`);
  if (useBlob) console.log('Using Azure Blob for file access.\n');

  for (const row of rows) {
    let buffer: Buffer | null = null;
    try {
      if (useBlob) {
        buffer = await downloadBlobToBuffer(row.StoragePath);
      } else {
        const fullPath = getFullPath(row.StoragePath);
        if (fs.existsSync(fullPath)) buffer = fs.readFileSync(fullPath);
      }
      if (!buffer || buffer.length === 0) {
        console.log(`  Skip ${row.FileName}: file not found or empty`);
        errors++;
        continue;
      }
      const coords = extractCoordinatesFromKmzBuffer(buffer);
      if (!coords) {
        console.log(`  Skip ${row.FileName}: no coordinates in KMZ`);
        errors++;
        continue;
      }
      await pool.request()
        .input('dealId', sql.Int, row.DealPipelineId)
        .input('lat', sql.Decimal(18, 8), coords.latitude)
        .input('lon', sql.Decimal(18, 8), coords.longitude)
        .query(`
          UPDATE pipeline.DealPipeline
          SET Latitude = @lat, Longitude = @lon, UpdatedAt = SYSDATETIME()
          WHERE DealPipelineId = @dealId
        `);
      updated++;
      console.log(`  Updated DealPipelineId=${row.DealPipelineId} (${row.FileName}): lat=${coords.latitude}, lon=${coords.longitude}`);
    } catch (e) {
      errors++;
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`  Error ${row.FileName}: ${msg}`);
    }
  }

  // ---------- Phase 2: Deals still missing coords — try local KMZ files ----------
  const dealsMissingCoords = await pool.request().query(`
    SELECT dp.DealPipelineId, p.ProjectName
    FROM pipeline.DealPipeline dp
    INNER JOIN core.Project p ON dp.ProjectId = p.ProjectId
    WHERE (dp.Latitude IS NULL OR dp.Longitude IS NULL) AND p.ProjectName IS NOT NULL AND LTRIM(RTRIM(ISNULL(p.ProjectName,''))) <> ''
    ORDER BY dp.DealPipelineId
  `);
  const missingRows = (dealsMissingCoords.recordset || []) as { DealPipelineId: number; ProjectName: string }[];
  const localKmzPaths = getLocalKmzPaths();
  console.log(`\nPhase 2: Deals missing lat/lon: ${missingRows.length}. Local KMZ files: ${localKmzPaths.length}.`);

  for (const deal of missingRows) {
    const projectName = (deal.ProjectName || '').trim();
    if (!projectName) continue;
    let done = false;
    for (const filePath of localKmzPaths) {
      if (!fileMatchesProjectName(filePath, projectName)) continue;
      try {
        const buffer = fs.readFileSync(filePath);
        const coords = extractCoordinatesFromKmzBuffer(buffer);
        if (!coords) continue;
        await pool.request()
          .input('dealId', sql.Int, deal.DealPipelineId)
          .input('lat', sql.Decimal(18, 8), coords.latitude)
          .input('lon', sql.Decimal(18, 8), coords.longitude)
          .query(`
            UPDATE pipeline.DealPipeline
            SET Latitude = @lat, Longitude = @lon, UpdatedAt = SYSDATETIME()
            WHERE DealPipelineId = @dealId
          `);
        updated++;
        console.log(`  Updated DealPipelineId=${deal.DealPipelineId} from local ${path.basename(filePath)}: lat=${coords.latitude}, lon=${coords.longitude}`);
        done = true;
        break;
      } catch (e) {
        // try next file
      }
    }
    if (!done && missingRows.indexOf(deal) < 5) {
      console.log(`  No KMZ match for: ${projectName} (DealPipelineId=${deal.DealPipelineId})`);
    }
  }

  await closeConnection();
  console.log('\n---');
  console.log(`Updated ${updated} deal(s) with Latitude/Longitude from KMZ (map-ready).`);
  if (errors > 0) console.log(`Errors/skips: ${errors}`);
  process.exit(errors > 0 && updated === 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
