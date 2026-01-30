#!/usr/bin/env ts-node
/**
 * Attach files from data/CAROLINASPIPELINEFILES to the corresponding deal pipeline
 * records (Carolinas region). Matches filenames to deals by keyword rules.
 * When AZURE_STORAGE_CONNECTION_STRING and AZURE_STORAGE_CONTAINER are set, uploads
 * to Azure Blob (files persist across redeploys). Otherwise copies to api/uploads/.
 *
 * Usage: npm run db:attach-carolinas-files
 * Prereq: Carolinas deals seeded (db:seed-site-tracking-carolinas), attachment table exists.
 */

import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import sql from 'mssql';
import dotenv from 'dotenv';
import { isBlobStorageConfigured, uploadBufferToBlob, ensureContainerExists } from '../src/config/azureBlob';

const FILES_DIR = path.resolve(__dirname, '../../data/CAROLINASPIPELINEFILES');
/** Same base as API (api/uploads) so download endpoint finds files. */
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve(__dirname, '..', 'uploads');
const DEAL_PIPELINE_SUBDIR = 'deal-pipeline';

// Match filename (case-insensitive) by substring → ProjectName as in DB (Site column from CSV)
const FILE_TO_PROJECT_NAME: { patterns: string[]; projectName: string }[] = [
  { patterns: ['1450 Meeting'], projectName: '1450 Meeting St' },
  { patterns: ['239 W Mallard Creek', 'Mallard Creek Church Rd'], projectName: '239 W Mallard Creek Church Rd, Charlotte, NC 28262' },
  { patterns: ['300 Easley Bridge'], projectName: '300 Easley Bridge Rd' },
  { patterns: ['450 Lake Murray', 'Lake Murray Blvd', 'Irmo - Lake Murray', 'RE_ 450', 'RE_ Irmo'], projectName: '450 Lake Murray Blbd' },
  { patterns: ['Gillis Hill', 'Gillis Hills'], projectName: '7547 Raeford Rd, Fayetteville, NC' },
  { patterns: ['3610 M L King', 'M L King Jr'], projectName: 'MLK Jr Blvd' },
  { patterns: ['9671 Spring'], projectName: '9671 Spring Boulevard' },
  { patterns: ['8901 Ocean', 'Ocean Hwy', 'Calabash', 'Ocean, Hwy, Calabash'], projectName: '8901 Ocean Highway, Calabash, NC 28467' },
  { patterns: ['Brigham Rd - Greensboro'], projectName: '701 Brigham Rd' },
  { patterns: ['Carnes Crossroads', 'CARNES NORTH TRACT'], projectName: 'Carnes Crossroads' },
  { patterns: ['Carolina Point Pkwy'], projectName: '15 Carolina Point Pkwy, Greenville, SC 29607' },
  { patterns: ['Chapel Hill', 'Dairy Weaver', 'Weaver Dairy'], projectName: '860 Weaver Dairy Rd' },
  { patterns: ['Cub Creek'], projectName: 'Cub Creek Apartments 821 E Carver St, Durham, NC 27704' },
  { patterns: ['Daniel Island', '480 Seven'], projectName: '480 Seven Farms Dr' },
  { patterns: ['Deep River', '68 S'], projectName: '2801 NC Hwy 68 S' },
  { patterns: ['DHI North Charleston', 'Preliminary Model - DHI'], projectName: 'Dorchester Rd, North Charleston, NC 29418' },
  { patterns: ['Dorchester Land Sale Deck'], projectName: 'Dorchester Rd, North Charleston, NC 29418' },
  { patterns: ['E President St', 'President Square', '925 E President'], projectName: '925 E President St' },
  { patterns: ['Sheraton Court', 'Sheraton Ct', 'Sheraton CT', 'Sheraton Court - Greensboro'], projectName: 'Sheraton CT' },
  { patterns: ['Johns Island', '11222 Johns Island River'], projectName: '1868 River Rd, Johns Island, SC 29455' },
  { patterns: ['Kannapolis', 'Loop Rd - Kannapolis'], projectName: 'Loop Rd' },
  { patterns: ['Okelly Chapel', 'Okelly Chapel Rd'], projectName: '7420 Okelly Chapel Rd Cary, NC 27519' },
  { patterns: ['Sheep Island'], projectName: 'Sheep Island Rd' },
  { patterns: ['RedStone', 'Indian Land'], projectName: 'Opportunity Dr, Indian Land, SC 29707' },
  { patterns: ['W Ashley Circle', 'W Ashley Circle.kmz', 'The Exchange - WA Circle', 'Preliminary Model - W Ashley Circle'], projectName: 'W Ashley Circle' },
  { patterns: ['West Ashley - Whitfield'], projectName: 'W Wildcat Blvd' },
  { patterns: ['cad-1 - SC Charleston', 'W Ashley Cir'], projectName: 'W Ashley Circle' },
  { patterns: ['Wendell Commerce', 'Wendell_Wendell Commerce'], projectName: '2016 Rolling Pines Lane, Wendell, NC 27591' },
  { patterns: ['Monticello', 'Weaverville Site'], projectName: 'Monticello Commons Drive' },
  { patterns: ['Rush St', 'JLL Rush', 'Rush Street - South Raleigh'], projectName: '120 Rush Street' },
  { patterns: ['Charlotte Research Park', 'Heights at RP'], projectName: '8740 Research Park Dr' },
  { patterns: ['Childress Klein Summerville'], projectName: 'Corner of Berlin G. Myers Pkwy & 9th St.' },
  { patterns: ['2643 Hwy 41', '2653 US 41', 'Clements Ferry, Wando'], projectName: '2643 Hwy 41, Wando, SC 29492' },
  { patterns: ['1021 N Front'], projectName: '1021 N Front Street' },
  { patterns: ['Indian Trail', 'Moser Site'], projectName: 'E Independence Blvd' },
  { patterns: ['Atrium Health', 'University City hospital'], projectName: '239 W Mallard Creek Church Rd, Charlotte, NC 28262' },
  { patterns: ['Annexation and Zoning Information for City of Columbia'], projectName: '450 Lake Murray Blbd' },
  { patterns: ['Bridford Pkwy'], projectName: '5401 W Gate City Blvd, Greensboro, NC 27407' },
  { patterns: ['South Cary', 'South Cary Site'], projectName: '7420 Okelly Chapel Rd Cary, NC 27519' },
  { patterns: ['Streets at Southpoint', 'Southpoint'], projectName: '8060 Renaissance Pkwy' },
  { patterns: ['Site Plan Exhibit 5.28.24', 'Site Plan Exhibit 5.28.24.pdf'], projectName: '1450 Meeting St' },
  { patterns: ['25031 Greenville Conceptual'], projectName: '300 Easley Bridge Rd' },
  { patterns: ['University Area Sales Comps'], projectName: '239 W Mallard Creek Church Rd, Charlotte, NC 28262' },
  { patterns: ['Sheraton Ct. Land Comps'], projectName: 'Sheraton CT' },
  { patterns: ['The Heights at RP'], projectName: '8740 Research Park Dr' },
];

// Load .env
const possibleEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../../.env'),
];
for (const p of possibleEnvPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
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

function getDealPipelineUploadDir(dealPipelineId: number): string {
  const dir = path.join(UPLOAD_DIR, DEAL_PIPELINE_SUBDIR, String(dealPipelineId));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function relativeStoragePath(fullPath: string): string {
  return path.relative(UPLOAD_DIR, fullPath).split(path.sep).join('/');
}

function matchFileToProjectName(fileName: string): string | null {
  const lower = fileName.toLowerCase();
  for (const { patterns, projectName } of FILE_TO_PROJECT_NAME) {
    for (const p of patterns) {
      if (lower.includes(p.toLowerCase())) return projectName;
    }
  }
  return null;
}

async function main() {
  if (!fs.existsSync(FILES_DIR)) {
    console.error('Folder not found:', FILES_DIR);
    process.exit(1);
  }
  const files = fs.readdirSync(FILES_DIR).filter((f) => {
    const full = path.join(FILES_DIR, f);
    return fs.statSync(full).isFile();
  });
  if (files.length === 0) {
    console.log('No files in folder.');
    process.exit(0);
  }

  if (!process.env.DB_SERVER || !process.env.DB_DATABASE || !process.env.DB_USER || !process.env.DB_PASSWORD) {
    console.error('Set DB_SERVER, DB_DATABASE, DB_USER, DB_PASSWORD');
    process.exit(1);
  }

  const pool = await sql.connect(dbConfig);
  const dealsResult = await pool.request().query(`
    SELECT dp.DealPipelineId, p.ProjectName
    FROM pipeline.DealPipeline dp
    INNER JOIN core.Project p ON dp.ProjectId = p.ProjectId
    WHERE p.Region = 'Carolinas'
  `);
  const projectNameToDealId = new Map<string, number>();
  for (const row of dealsResult.recordset) {
    projectNameToDealId.set(row.ProjectName, row.DealPipelineId);
  }

  const matched: { file: string; projectName: string; dealId: number }[] = [];
  const unmatched: string[] = [];

  const matchedNoDeal: { file: string; projectName: string }[] = [];
  for (const file of files) {
    const projectName = matchFileToProjectName(file);
    if (!projectName) {
      unmatched.push(file);
      continue;
    }
    const dealId = projectNameToDealId.get(projectName);
    if (dealId == null) {
      matchedNoDeal.push({ file, projectName });
      continue;
    }
    matched.push({ file, projectName, dealId });
  }
  if (matchedNoDeal.length > 0) {
    console.log(`Matched to a deal name but deal not in DB (seed Carolinas first): ${matchedNoDeal.length}`);
    matchedNoDeal.slice(0, 15).forEach(({ file, projectName }) => console.log(`  ${file} → ${projectName}`));
    if (matchedNoDeal.length > 15) console.log(`  ... and ${matchedNoDeal.length - 15} more`);
  }

  const useBlob = isBlobStorageConfigured();
  if (useBlob) {
    console.log('Using Azure Blob Storage for attachments.');
    await ensureContainerExists();
    console.log('');
  }
  let uploaded = 0;
  let errors = 0;
  for (const { file, projectName, dealId } of matched) {
    const srcPath = path.join(FILES_DIR, file);
    const ext = path.extname(file) || '';
    const base = file.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180);
    const destFileName = `${randomUUID()}-${base}${ext}`;
    try {
      let storagePath: string;
      let fileSize: number;
      if (useBlob) {
        const buffer = fs.readFileSync(srcPath);
        fileSize = buffer.length;
        storagePath = `${DEAL_PIPELINE_SUBDIR}/${dealId}/${destFileName}`.split(path.sep).join('/');
        await uploadBufferToBlob(storagePath, buffer);
      } else {
        const destDir = getDealPipelineUploadDir(dealId);
        const destPath = path.join(destDir, destFileName);
        fs.copyFileSync(srcPath, destPath);
        fileSize = fs.statSync(destPath).size;
        storagePath = relativeStoragePath(destPath);
      }
      await pool.request()
        .input('DealPipelineId', sql.Int, dealId)
        .input('FileName', sql.NVarChar(255), file)
        .input('StoragePath', sql.NVarChar(1000), storagePath)
        .input('ContentType', sql.NVarChar(100), null)
        .input('FileSizeBytes', sql.BigInt, fileSize)
        .query(`
          INSERT INTO pipeline.DealPipelineAttachment (DealPipelineId, FileName, StoragePath, ContentType, FileSizeBytes)
          VALUES (@DealPipelineId, @FileName, @StoragePath, @ContentType, @FileSizeBytes)
        `);
      uploaded++;
      if (uploaded <= 20 || uploaded % 30 === 0) {
        console.log(`  Attached: ${file} → ${projectName}`);
      }
    } catch (e: any) {
      errors++;
      console.error(`  Error ${file}: ${e.message}`);
    }
  }

  await pool.close();
  console.log('\n---');
  console.log(`Attached: ${uploaded} files`);
  console.log(`Errors: ${errors}`);
  if (unmatched.length > 0) {
    console.log('\nNo match (please assign or ignore):');
    unmatched.forEach((f) => console.log(`  - ${f}`));
  }
  console.log('\nTo add more matches, edit FILE_TO_PROJECT_NAME in scripts/attach-carolinas-pipeline-files.ts.');
  process.exit(errors > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
