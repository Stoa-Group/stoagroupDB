#!/usr/bin/env ts-node
/**
 * Load all deals from Carolinas + Gulf Coast CSVs and list potentially duplicated deals.
 * Output: docs/POTENTIAL_DEAL_DUPLICATES.md (and console summary).
 *
 * Usage: npm run db:list-potential-duplicates
 * No DB required; reads CSV files only.
 */

import * as fs from 'fs';
import * as path from 'path';

const CAROLINAS_CSV = path.resolve(
  __dirname,
  '../../data/Site Tracking Worksheet - Carolinas + East GA .csv'
);
const GULF_CSV = path.resolve(__dirname, '../../data/Site Tracking Worksheet - Gulf Coast.csv');
const OUTPUT_MD = path.resolve(__dirname, '../../docs/POTENTIAL_DEAL_DUPLICATES.md');

interface Deal {
  source: 'Carolinas' | 'Gulf Coast';
  status: string;
  site: string;
  city: string;
  state: string;
  rowIndex: number;
}

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

function loadCSV(
  filePath: string,
  source: 'Carolinas' | 'Gulf Coast',
  cityHeader: string
): Deal[] {
  if (!fs.existsSync(filePath)) {
    console.error('Not found:', filePath);
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const header = parseCSVLine(lines[0]);
  const statusIdx = header.findIndex((h) => /status/i.test(h));
  const siteIdx = header.findIndex((h) => /^site$/i.test(h));
  const cityIdx = header.findIndex((h) =>
    new RegExp(`^${cityHeader}$`, 'i').test(h.trim())
  );
  const stateIdx = header.findIndex((h) => /^state$/i.test(h));

  const get = (row: string[], idx: number): string =>
    idx >= 0 && row[idx] !== undefined ? String(row[idx]).trim() : '';

  const deals: Deal[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    const site = get(row, siteIdx);
    if (!site) continue;
    deals.push({
      source,
      status: get(row, statusIdx) || '',
      site,
      city: get(row, cityIdx),
      state: get(row, stateIdx),
      rowIndex: i + 1,
    });
  }
  return deals;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[,./\-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function coreName(s: string): string {
  const n = normalize(s);
  return n.replace(/^(the|at)\s+/i, '').replace(/\s+(the|at)$/i, '');
}

function dealsMatch(a: Deal, b: Deal): 'exact' | 'normalized' | 'contains' | null {
  const sa = a.site.trim();
  const sb = b.site.trim();
  if (sa.toLowerCase() === sb.toLowerCase()) return 'exact';

  const na = normalize(sa);
  const nb = normalize(sb);
  if (na === nb) return 'normalized';

  const ca = coreName(sa);
  const cb = coreName(sb);
  if (ca === cb) return 'normalized';
  if (ca.length >= 5 && cb.length >= 5 && (ca.includes(cb) || cb.includes(ca)))
    return 'contains';
  return null;
}

function main() {
  const carolinas = loadCSV(CAROLINAS_CSV, 'Carolinas', 'City');
  const gulf = loadCSV(GULF_CSV, 'Gulf Coast', 'Place');
  const all = [...carolinas, ...gulf];

  const exactByNormalized = new Map<string, Deal[]>();
  for (const d of all) {
    const key = normalize(d.site);
    if (!exactByNormalized.has(key)) exactByNormalized.set(key, []);
    exactByNormalized.get(key)!.push(d);
  }

  const exactDuplicates: { key: string; deals: Deal[] }[] = [];
  for (const [key, deals] of exactByNormalized) {
    if (deals.length > 1) exactDuplicates.push({ key, deals });
  }

  const normalizedDuplicates: { deals: Deal[]; reason: string }[] = [];
  const seenPairs = new Set<string>();
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i];
      const b = all[j];
      const pairKey = [a.site, b.site].sort().join('|||');
      if (seenPairs.has(pairKey)) continue;
      const match = dealsMatch(a, b);
      if (match === 'exact') continue;
      if (match === 'normalized' || match === 'contains') {
        seenPairs.add(pairKey);
        normalizedDuplicates.push({
          deals: [a, b],
          reason: match === 'normalized' ? 'Same name (normalized)' : 'One name contains the other',
        });
      }
    }
  }

  const sameCityStateSimilar: { deals: Deal[] }[] = [];
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i];
      const b = all[j];
      if (!a.city || !b.city || !a.state || !b.state) continue;
      if (a.city.toLowerCase() !== b.city.toLowerCase() || a.state !== b.state) continue;
      const na = coreName(a.site);
      const nb = coreName(b.site);
      if (na === nb) continue;
      const wordsA = na.split(/\s+/).filter((w) => w.length > 2);
      const wordsB = nb.split(/\s+/).filter((w) => w.length > 2);
      const overlap = wordsA.filter((w) => wordsB.includes(w)).length;
      if (overlap >= 2 && (wordsA.length >= 2 || wordsB.length >= 2))
        sameCityStateSimilar.push({ deals: [a, b] });
    }
  }

  const sb: string[] = [];
  sb.push('# Potential Deal Duplicates');
  sb.push('');
  sb.push('Generated from **Carolinas + East GA** and **Gulf Coast** Site Tracking CSVs.');
  sb.push('Review and tell us which pairs to deduplicate and merge.');
  sb.push('');
  sb.push('---');
  sb.push('');

  if (exactDuplicates.length > 0) {
    sb.push('## 1. Exact duplicate Site names (same text, multiple rows)');
    sb.push('');
    for (const { key, deals } of exactDuplicates) {
      sb.push(`### "${deals[0].site}"`);
      sb.push('');
      for (const d of deals) {
        sb.push(`- **${d.source}** | ${d.status} | ${d.city}, ${d.state} (row ${d.rowIndex})`);
      }
      sb.push('');
    }
  }

  if (normalizedDuplicates.length > 0) {
    sb.push('## 2. Likely same deal (normalized or containing name)');
    sb.push('');
    for (const { deals, reason } of normalizedDuplicates) {
      const [a, b] = deals;
      sb.push(`- **${a.site}** (${a.source}, ${a.status}, ${a.city}, ${a.state})`);
      sb.push(`  ↔ **${b.site}** (${b.source}, ${b.status}, ${b.city}, ${b.state})  \n  _${reason}_`);
      sb.push('');
    }
  }

  if (sameCityStateSimilar.length > 0) {
    sb.push('## 3. Same city/state, similar name (possible duplicate)');
    sb.push('');
    for (const { deals } of sameCityStateSimilar) {
      const [a, b] = deals;
      sb.push(`- **${a.site}** (${a.source}, ${a.status}) ↔ **${b.site}** (${b.source}, ${b.status}) — ${a.city}, ${a.state}`);
      sb.push('');
    }
  }

  if (exactDuplicates.length === 0 && normalizedDuplicates.length === 0 && sameCityStateSimilar.length === 0) {
    sb.push('No potential duplicates detected.');
  }

  fs.writeFileSync(OUTPUT_MD, sb.join('\n'), 'utf-8');

  console.log('Deals loaded: Carolinas', carolinas.length, '| Gulf Coast', gulf.length);
  console.log('Exact duplicate names:', exactDuplicates.length, 'groups');
  console.log('Normalized/containing pairs:', normalizedDuplicates.length);
  console.log('Same city+state similar:', sameCityStateSimilar.length);
  console.log('\nReport written to:', OUTPUT_MD);
}

main();
