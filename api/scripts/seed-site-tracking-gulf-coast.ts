#!/usr/bin/env ts-node
/**
 * Seed Site Tracking Worksheet - Gulf Coast data into the database
 *
 * Reads data/Site Tracking Worksheet - Gulf Coast.csv and creates core.Project +
 * pipeline.DealPipeline for each row, exactly as the API would (historical data).
 * Statuses (Stage) preserved: Identified, Under Review, LOI, Under Contract, CLOSED, Rejected.
 *
 * Usage: npm run db:seed-site-tracking-gulf-coast
 * For existing DBs, run first: npm run db:add-deal-pipeline-site-tracking-columns
 */

import * as fs from 'fs';
import * as path from 'path';
import sql from 'mssql';
import dotenv from 'dotenv';

const CSV_PATH = path.resolve(
  __dirname,
  '../../data/Site Tracking Worksheet - Gulf Coast.csv'
);

// Load .env (same pattern as seed-auth-users)
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

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (inQuotes) {
      current += c;
    } else if (c === ',') {
      result.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

function parsePrice(raw: string): { value: number | null; raw: string } {
  if (!raw || typeof raw !== 'string') return { value: null, raw: raw || '' };
  const s = raw.trim();
  if (!s || /unpriced|no guidance|tbd|^\-$/i.test(s)) return { value: null, raw: s };
  const numStr = s.replace(/[\$,]/g, '').trim();
  const num = parseFloat(numStr);
  if (!isNaN(num)) return { value: num, raw: s };
  const m = numStr.match(/^([\d.]+)\s*[Mm]/);
  if (m) return { value: parseFloat(m[1]) * 1_000_000, raw: s };
  return { value: null, raw: s };
}

function parseDate(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  let year = parseInt(m[3], 10);
  if (year < 100) year += year < 50 ? 2000 : 1900;
  return `${year}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
}

function parseUnits(raw: string): number | null {
  if (!raw || typeof raw !== 'string') return null;
  const m = raw.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function parseAcreage(raw: string): number | null {
  if (raw === undefined || raw === null || raw === '') return null;
  const s = String(raw).replace(/,/g, '').trim();
  if (s === '-' || s === '?' || !s) return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error('CSV not found:', CSV_PATH);
    process.exit(1);
  }

  const content = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    console.error('CSV has no data rows');
    process.exit(1);
  }

  const header = parseCSVLine(lines[0]);
  const statusIdx = header.findIndex((h) => /status/i.test(h));
  const siteIdx = header.findIndex((h) => /^site$/i.test(h));
  const stateIdx = header.findIndex((h) => /^state$/i.test(h));
  const metroIdx = header.findIndex((h) => /metro/i.test(h));
  const countyIdx = header.findIndex((h) => /county/i.test(h));
  const placeIdx = header.findIndex((h) => /^place$/i.test(h));
  const zipIdx = header.findIndex((h) => /zip/i.test(h));
  const totalAcreageIdx = header.findIndex((h) => /total acreage/i.test(h));
  const mfAcreageIdx = header.findIndex((h) => /mf acreage/i.test(h));
  const zoningIdx = header.findIndex((h) => /^zoning$/i.test(h));
  const zonedIdx = header.findIndex((h) => /zoned/i.test(h));
  const unitsIdx = header.findIndex((h) => /^units$/i.test(h));
  const priceIdx = header.findIndex((h) => /^price$/i.test(h));
  const listedIdx = header.findIndex((h) => /listed/i.test(h));
  const dateAddedIdx = header.findIndex((h) => /date added/i.test(h));
  const brokerIdx = header.findIndex((h) => /broker|referral/i.test(h));
  const rejectedIdx = header.findIndex((h) => /rejected reason/i.test(h));
  const commentsIdx = header.findIndex((h) => /comments/i.test(h));

  const get = (row: string[], idx: number): string =>
    idx >= 0 && row[idx] !== undefined ? String(row[idx]).trim() : '';

  if (!process.env.DB_SERVER || !process.env.DB_DATABASE || !process.env.DB_USER || !process.env.DB_PASSWORD) {
    console.error('❌ Set DB_SERVER, DB_DATABASE, DB_USER, DB_PASSWORD (e.g. in .env)');
    process.exit(1);
  }

  const pool = await sql.connect(dbConfig);
  let created = 0;
  let skipped = 0;
  let errors = 0;

  console.log('Seeding Site Tracking Worksheet - Gulf Coast\n');

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    const site = get(row, siteIdx);
    const status = get(row, statusIdx) || 'Identified';

    if (!site) {
      skipped++;
      continue;
    }

    const state = get(row, stateIdx);
    const metro = get(row, metroIdx);
    const county = get(row, countyIdx);
    const place = get(row, placeIdx);
    const zip = get(row, zipIdx);
    const totalAcreage = parseAcreage(get(row, totalAcreageIdx));
    const mfAcreage = parseAcreage(get(row, mfAcreageIdx));
    const zoning = get(row, zoningIdx);
    const zoned = get(row, zonedIdx); // Yes, No, Partially
    const units = parseUnits(get(row, unitsIdx));
    const priceRaw = get(row, priceIdx);
    const { value: landPrice, raw: priceRawText } = parsePrice(priceRaw);
    const listingStatus = get(row, listedIdx); // Listed, Unlisted
    const dateAdded = parseDate(get(row, dateAddedIdx));
    const brokerReferralSource = get(row, brokerIdx);
    const rejectedReason = get(row, rejectedIdx);
    const comments = get(row, commentsIdx);

    const noteParts: string[] = [];
    if (comments) noteParts.push(`Comments: ${comments}`);
    if (priceRawText && landPrice == null) noteParts.push(`Price (raw): ${priceRawText}`);
    const notes = noteParts.length ? noteParts.join('\n') : null;

    let projectId: number;
    try {
      const existing = await pool.request()
        .input('ProjectName', sql.NVarChar(255), site)
        .query('SELECT ProjectId FROM core.Project WHERE ProjectName = @ProjectName');
      if (existing.recordset.length > 0) {
        projectId = existing.recordset[0].ProjectId;
        await pool.request()
          .input('ProjectId', sql.Int, projectId)
          .input('City', sql.NVarChar(100), place || null)
          .input('State', sql.NVarChar(50), state || null)
          .input('Region', sql.NVarChar(50), metro || null)
          .input('Units', sql.Int, units)
          .input('Stage', sql.NVarChar(50), status)
          .query(`
            UPDATE core.Project SET City = @City, State = @State, Region = @Region, Units = @Units, Stage = @Stage, UpdatedAt = SYSDATETIME()
            WHERE ProjectId = @ProjectId
          `);
      } else {
        await pool.request()
          .input('ProjectName', sql.NVarChar(255), site)
          .input('City', sql.NVarChar(100), place || null)
          .input('State', sql.NVarChar(50), state || null)
          .input('Region', sql.NVarChar(50), metro || null)
          .input('Units', sql.Int, units)
          .input('Stage', sql.NVarChar(50), status)
          .query(`
            INSERT INTO core.Project (ProjectName, City, State, Region, Units, Stage)
            VALUES (@ProjectName, @City, @State, @Region, @Units, @Stage)
          `);
        const getId = await pool.request()
          .input('ProjectName', sql.NVarChar(255), site)
          .query('SELECT ProjectId FROM core.Project WHERE ProjectName = @ProjectName');
        projectId = getId.recordset[0].ProjectId;
      }
    } catch (e: any) {
      if (e.number === 2627) {
        const existing = await pool.request()
          .input('ProjectName', sql.NVarChar(255), site)
          .query('SELECT ProjectId FROM core.Project WHERE ProjectName = @ProjectName');
        projectId = existing.recordset[0].ProjectId;
      } else {
        errors++;
        console.error(`❌ Project ${site}: ${e.message}`);
        continue;
      }
    }

    const sqFtPrice = landPrice != null && totalAcreage != null && totalAcreage > 0
      ? landPrice / (totalAcreage * 43560)
      : null;

    try {
      const hasDeal = await pool.request()
        .input('ProjectId', sql.Int, projectId)
        .query('SELECT 1 FROM pipeline.DealPipeline WHERE ProjectId = @ProjectId');
      const req = pool.request()
        .input('ProjectId', sql.Int, projectId)
        .input('Acreage', sql.Decimal(18, 4), totalAcreage)
        .input('LandPrice', sql.Decimal(18, 2), landPrice)
        .input('SqFtPrice', sql.Decimal(18, 2), sqFtPrice)
        .input('StartDate', sql.Date, dateAdded)
        .input('UnitCount', sql.Int, units)
        .input('Notes', sql.NVarChar(sql.MAX), notes)
        .input('County', sql.NVarChar(100), county || null)
        .input('ZipCode', sql.NVarChar(20), zip || null)
        .input('MFAcreage', sql.Decimal(18, 4), mfAcreage)
        .input('Zoning', sql.NVarChar(100), zoning || null)
        .input('Zoned', sql.NVarChar(20), zoned || null)
        .input('ListingStatus', sql.NVarChar(50), listingStatus || null)
        .input('BrokerReferralSource', sql.NVarChar(255), brokerReferralSource || null)
        .input('RejectedReason', sql.NVarChar(500), rejectedReason || null);
      if (hasDeal.recordset.length > 0) {
        await req.query(`
          UPDATE pipeline.DealPipeline SET Acreage = @Acreage, LandPrice = @LandPrice, SqFtPrice = @SqFtPrice, StartDate = @StartDate, UnitCount = @UnitCount, Notes = @Notes,
            County = @County, ZipCode = @ZipCode, MFAcreage = @MFAcreage, Zoning = @Zoning, Zoned = @Zoned, ListingStatus = @ListingStatus, BrokerReferralSource = @BrokerReferralSource, RejectedReason = @RejectedReason,
            UpdatedAt = SYSDATETIME()
          WHERE ProjectId = @ProjectId
        `);
      } else {
        await req.query(`
          INSERT INTO pipeline.DealPipeline (ProjectId, Acreage, LandPrice, SqFtPrice, StartDate, UnitCount, Notes, County, ZipCode, MFAcreage, Zoning, Zoned, ListingStatus, BrokerReferralSource, RejectedReason)
          VALUES (@ProjectId, @Acreage, @LandPrice, @SqFtPrice, @StartDate, @UnitCount, @Notes, @County, @ZipCode, @MFAcreage, @Zoning, @Zoned, @ListingStatus, @BrokerReferralSource, @RejectedReason)
        `);
      }
      created++;
      if (created <= 15 || created % 150 === 0) console.log(`✅ ${status}: ${site}`);
    } catch (e: any) {
      errors++;
      console.error(`❌ DealPipeline ${site}: ${e.message}`);
    }
  }

  await pool.close();
  console.log('\n---');
  console.log(`Created/updated: ${created}`);
  console.log(`Skipped (no site): ${skipped}`);
  console.log(`Errors: ${errors}`);
  process.exit(errors > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
