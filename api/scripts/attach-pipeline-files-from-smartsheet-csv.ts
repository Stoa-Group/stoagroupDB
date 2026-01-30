#!/usr/bin/env ts-node
/**
 * Attach files to deal pipeline using the Smartsheet row–attachment CSV as the mapping.
 *
 * Reads smartsheet_row_attachments.csv (row_id, row_number, primary_value, attachment_id, attachment_name).
 * Maps primary_value → deal (ProjectName from API). For each row with attachments, finds the deal by name,
 * then for each attachment_name looks for a local file in data/CAROLINASPIPELINEFILES and data/GULFCOASTPIPELINEFILES.
 * Uploads the file to that deal via the API, skipping if the deal already has an attachment with that name.
 *
 * Usage: npm run db:attach-from-smartsheet-csv
 * Prereq: Run scripts/export_smartsheet_attachments.py to generate the CSV; API running; API_BASE_URL set.
 */

import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const API_BASE_URL = (process.env.API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const API_TOKEN = process.env.API_TOKEN || process.env.JWT_TOKEN || '';

const CSV_PATH = process.env.SMARTSHEET_CSV_PATH || path.resolve(__dirname, '../../smartsheet_row_attachments.csv');
const CAROLINAS_DIR = path.resolve(__dirname, '../../data/CAROLINASPIPELINEFILES');
const GULFCOAST_DIR = path.resolve(__dirname, '../../data/GULFCOASTPIPELINEFILES');

/** Parse a single CSV line; handles quoted fields (e.g. "name, with comma.pdf"). */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      i++;
      let s = '';
      while (i < line.length && line[i] !== '"') {
        s += line[i];
        i++;
      }
      if (line[i] === '"') i++;
      out.push(s);
      if (line[i] === ',') i++;
    } else {
      let s = '';
      while (i < line.length && line[i] !== ',') {
        s += line[i];
        i++;
      }
      out.push(s.trim());
      if (line[i] === ',') i++;
    }
  }
  return out;
}

interface CsvRow {
  row_id: string;
  row_number: string;
  primary_value: string;
  attachment_id: string;
  attachment_name: string;
}

function loadCsv(filePath: string): CsvRow[] {
  const text = fs.readFileSync(filePath, 'utf-8');
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    header.forEach((h, j) => {
      row[h] = vals[j] ?? '';
    });
    rows.push(row as CsvRow);
  }
  return rows;
}

/** Group CSV rows by primary_value; only include rows that have attachment_id and attachment_name. Dedupe attachment names per deal. */
function groupByDeal(rows: CsvRow[]): Map<string, string[]> {
  const map = new Map<string, Set<string>>();
  for (const row of rows) {
    const pv = (row.primary_value || '').trim();
    const attName = (row.attachment_name || '').trim();
    if (!pv || !attName || !row.attachment_id) continue;
    if (!map.has(pv)) map.set(pv, new Set());
    map.get(pv)!.add(attName);
  }
  const out = new Map<string, string[]>();
  for (const [pv, set] of map.entries()) out.set(pv, [...set]);
  return out;
}

interface Deal {
  DealPipelineId: number;
  ProjectName: string;
  RegionName?: string;
  Region?: string;
}

async function getDealsFromApi(): Promise<Deal[]> {
  const url = `${API_BASE_URL}/api/pipeline/deal-pipeline`;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (API_TOKEN) headers['Authorization'] = `Bearer ${API_TOKEN}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  const json = await res.json();
  if (!json.success || !Array.isArray(json.data)) throw new Error('API did not return success or data array');
  return json.data;
}

async function getAttachmentFileNames(dealId: number): Promise<string[]> {
  const url = `${API_BASE_URL}/api/pipeline/deal-pipeline/${dealId}/attachments`;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (API_TOKEN) headers['Authorization'] = `Bearer ${API_TOKEN}`;
  const res = await fetch(url, { headers });
  if (!res.ok) return [];
  const json = await res.json();
  if (!json.success || !Array.isArray(json.data)) return [];
  return (json.data as { FileName?: string }[]).map((a) => a.FileName || '').filter(Boolean);
}

async function uploadFileToDeal(dealId: number, filePath: string, fileName: string): Promise<void> {
  const url = `${API_BASE_URL}/api/pipeline/deal-pipeline/${dealId}/attachments`;
  const buffer = fs.readFileSync(filePath);
  const form = new FormData();
  form.append('file', new Blob([buffer]), fileName);
  const headers: Record<string, string> = {};
  if (API_TOKEN) headers['Authorization'] = `Bearer ${API_TOKEN}`;
  const res = await fetch(url, { method: 'POST', body: form, headers });
  if (!res.ok) {
    const text = await res.text();
    let errMsg = `API ${res.status}: ${res.statusText}`;
    try {
      const j = JSON.parse(text);
      if (j?.error?.message) errMsg = j.error.message;
    } catch (_) {}
    throw new Error(errMsg);
  }
}

/** Find a file in Carolinas or Gulf Coast dirs by exact name, then by attachment name contained in filename. */
function findLocalFile(attachmentName: string): { path: string; fileName: string } | null {
  for (const dir of [CAROLINAS_DIR, GULFCOAST_DIR]) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir);
    const exact = files.find((f) => f === attachmentName);
    if (exact) return { path: path.join(dir, exact), fileName: exact };
    const byContains = files.find((f) => f.includes(attachmentName) || attachmentName.includes(path.basename(f, path.extname(f))));
    if (byContains) return { path: path.join(dir, byContains), fileName: byContains };
  }
  return null;
}

/** Match Smartsheet primary_value to API ProjectName (exact, then normalized). */
function findDealId(primaryValue: string, projectNameToDealId: Map<string, number>): number | null {
  const exact = projectNameToDealId.get(primaryValue);
  if (exact != null) return exact;
  const normalized = primaryValue.trim().toLowerCase();
  for (const [name, id] of projectNameToDealId) {
    if (name.trim().toLowerCase() === normalized) return id;
  }
  for (const [name, id] of projectNameToDealId) {
    if (name.includes(primaryValue) || primaryValue.includes(name)) return id;
  }
  return null;
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error('CSV not found:', CSV_PATH);
    console.error('Run: python3 scripts/export_smartsheet_attachments.py (from repo root)');
    process.exit(1);
  }

  console.log('Loading CSV:', CSV_PATH);
  const rows = loadCsv(CSV_PATH);
  const byDeal = groupByDeal(rows);
  console.log(`CSV: ${rows.length} rows, ${byDeal.size} unique primary_value(s) with attachments.\n`);

  console.log('Fetching deals from API:', API_BASE_URL);
  const deals = await getDealsFromApi();
  const projectNameToDealId = new Map<string, number>();
  for (const d of deals) projectNameToDealId.set(d.ProjectName, d.DealPipelineId);
  console.log(`API: ${deals.length} deal(s).\n`);

  const stats = { uploaded: 0, skipped: 0, noDeal: 0, noFile: 0, errors: 0 };

  for (const [primaryValue, attachmentNames] of byDeal) {
    const dealId = findDealId(primaryValue, projectNameToDealId);
    if (dealId == null) {
      stats.noDeal++;
      if (stats.noDeal <= 15) console.log(`  No deal match: "${primaryValue}"`);
      continue;
    }

    const existingNames = await getAttachmentFileNames(dealId);

    for (const attachment_name of attachmentNames) {
      const alreadyThere = existingNames.some((n) => n === attachment_name || n.endsWith(attachment_name));
      if (alreadyThere) {
        stats.skipped++;
        continue;
      }

      const found = findLocalFile(attachment_name);
      if (!found) {
        stats.noFile++;
        if (stats.noFile <= 20) console.log(`  No local file: "${attachment_name}" (deal: ${primaryValue})`);
        continue;
      }

      try {
        await uploadFileToDeal(dealId, found.path, found.fileName);
        stats.uploaded++;
        if (stats.uploaded <= 25 || stats.uploaded % 50 === 0) {
          console.log(`  Attached: ${found.fileName} → ${primaryValue}`);
        }
        existingNames.push(found.fileName);
      } catch (e: unknown) {
        stats.errors++;
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`  Error ${found.fileName} → ${primaryValue}: ${msg}`);
      }
    }
  }

  console.log('\n---');
  console.log(`Uploaded: ${stats.uploaded}`);
  console.log(`Skipped (already attached): ${stats.skipped}`);
  console.log(`No deal match: ${stats.noDeal}`);
  console.log(`No local file: ${stats.noFile}`);
  console.log(`Errors: ${stats.errors}`);
  process.exit(stats.errors > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
