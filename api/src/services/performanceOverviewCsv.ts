/**
 * Load Performance Overview CSV (PROPERTY, ACTUAL OCC, BUDGETED OCC, LEASED%, UNITS)
 * and apply overrides to KPIs so dashboard matches the CSV source of truth.
 */
import * as fs from 'fs';
import * as path from 'path';

export interface PerformanceOverviewRow {
  property: string;
  actualOccPct: number | null;
  budgetedOccPct: number | null;
  leasedPct: number | null;
  units: number | null;
}

const CSV_HEADER =
  'STATUS,PROPERTY,ADDRESS,ACTUAL OCC,BUDGETED OCC,BUDGETED RENT ROLL PSF,FORECASTED TRADEOUT NEW LEASE,FORECASTED TRADEOUT RENEWAL,LEASED%,NEW LEASES NEEDED,RENT ROLL (REV/OSF),REVENUE (REV/ASF),REVENUE RISK,SUSTAINABLE CAPACITY,UNITS,YESTERDAY SHORTFALL/ SURPLUS';
const COL_PROPERTY = 1;
const COL_ACTUAL_OCC = 3;
const COL_BUDGETED_OCC = 4;
const COL_LEASED_PCT = 8;
const COL_UNITS = 14;

function parseNum(s: string): number | null {
  const t = (s ?? '').toString().trim();
  if (t === '' || t.toUpperCase() === 'NA') return null;
  const n = Number(t.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function normalizeProp(s: string): string {
  return (s ?? '').toString().trim().toLowerCase();
}

/**
 * Parse CSV content. Header must match expected columns.
 * Returns map keyed by normalized property name (lowercase trim).
 */
export function parsePerformanceOverviewCsv(content: string): Map<string, PerformanceOverviewRow> {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out = new Map<string, PerformanceOverviewRow>();
  if (lines.length < 2) return out;
  const header = lines[0];
  if (!header.toUpperCase().startsWith('STATUS,PROPERTY,')) return out;
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length <= Math.max(COL_PROPERTY, COL_UNITS)) continue;
    const property = parts[COL_PROPERTY]?.trim() ?? '';
    if (!property) continue;
    const actualOccPct = parseNum(parts[COL_ACTUAL_OCC]);
    const budgetedOccPct = parseNum(parts[COL_BUDGETED_OCC]);
    const leasedPct = parseNum(parts[COL_LEASED_PCT]);
    const units = parseNum(parts[COL_UNITS]);
    const key = normalizeProp(property);
    out.set(key, { property, actualOccPct, budgetedOccPct, leasedPct, units });
  }
  return out;
}

/**
 * Resolve path to Performance_Overview_Properties.csv.
 * Tries: env PERFORMANCE_OVERVIEW_CSV, then cwd/scripts, then cwd/../scripts.
 */
export function getPerformanceOverviewCsvPath(): string | null {
  const envPath = process.env.PERFORMANCE_OVERVIEW_CSV?.trim();
  if (envPath && fs.existsSync(envPath)) return envPath;
  const cwd = process.cwd();
  const a = path.join(cwd, 'scripts', 'Performance_Overview_Properties.csv');
  if (fs.existsSync(a)) return a;
  const b = path.join(cwd, '..', 'scripts', 'Performance_Overview_Properties.csv');
  if (fs.existsSync(b)) return b;
  return null;
}

/**
 * Load CSV from resolved path. Returns map or null if file missing/unreadable.
 */
export function loadPerformanceOverviewCsv(): Map<string, PerformanceOverviewRow> | null {
  const csvPath = getPerformanceOverviewCsvPath();
  if (!csvPath) return null;
  try {
    const content = fs.readFileSync(csvPath, 'utf8');
    return parsePerformanceOverviewCsv(content);
  } catch {
    return null;
  }
}
