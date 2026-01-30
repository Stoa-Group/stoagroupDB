#!/usr/bin/env ts-node
/**
 * Merge duplicate deals in the database per user-approved rules:
 * - Section 1: Exact duplicate ProjectName (same normalized) → merge all, keep one.
 * - Section 2: Normalized/containing name match → merge; keeper = non-Rejected preferred, then more data.
 * - Section 3: Only if exact City AND State match AND similar name → merge; otherwise leave.
 *
 * For each duplicate group: move DealPipelineAttachment to keeper's DealPipeline;
 * repoint or remove UnderContract/ClosedProperty/CommercialListed/CommercialAcreage;
 * delete duplicate DealPipeline and Project.
 *
 * Usage: npm run db:merge-duplicate-deals
 * Dry run (no writes): MERGE_DRY_RUN=1 npm run db:merge-duplicate-deals
 */

import * as path from 'path';
import sql from 'mssql';
import dotenv from 'dotenv';

const possibleEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../../.env'),
];
for (const p of possibleEnvPaths) {
  try {
    const fs = require('fs');
    if (fs.existsSync(p)) {
      dotenv.config({ path: p });
      break;
    }
  } catch (_) {}
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

const DRY_RUN = process.env.MERGE_DRY_RUN === '1' || process.env.MERGE_DRY_RUN === 'true';

interface ProjectRow {
  ProjectId: number;
  ProjectName: string;
  City: string | null;
  State: string | null;
  Stage: string | null;
  DealPipelineId: number | null;
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

function namesMatchExact(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function namesMatchNormalizedOrContaining(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  const ca = coreName(a);
  const cb = coreName(b);
  if (ca === cb) return true;
  if (ca.length >= 5 && cb.length >= 5 && (ca.includes(cb) || cb.includes(ca))) return true;
  return false;
}

function similarName(a: string, b: string): boolean {
  const ca = coreName(a);
  const cb = coreName(b);
  if (ca === cb) return true;
  const wordsA = ca.split(/\s+/).filter((w) => w.length > 2);
  const wordsB = cb.split(/\s+/).filter((w) => w.length > 2);
  const overlap = wordsA.filter((w) => wordsB.includes(w)).length;
  return overlap >= 2 && (wordsA.length >= 2 || wordsB.length >= 2);
}

function exactCityState(cityA: string | null, stateA: string | null, cityB: string | null, stateB: string | null): boolean {
  if (!cityA || !stateA || !cityB || !stateB) return false;
  return cityA.trim().toLowerCase() === cityB.trim().toLowerCase() && stateA.trim() === stateB.trim();
}

/** Section 1: same rule as S2 — prefer non-Rejected, then more data. */
function pickKeeperSection1(rows: ProjectRow[]): ProjectRow {
  return pickKeeperSection2(rows);
}

function pickKeeperSection2(rows: ProjectRow[]): ProjectRow {
  const nonRejected = rows.filter((r) => (r.Stage || '').toLowerCase() !== 'rejected');
  const candidates = nonRejected.length > 0 ? nonRejected : rows;
  let best = candidates[0];
  let bestScore = 0;
  for (const r of candidates) {
    let score = 0;
    if (r.City) score += 1;
    if (r.State) score += 1;
    if (r.Stage) score += 1;
    if (r.ProjectName && r.ProjectName.length > best.ProjectName.length) score += 2;
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return best;
}

function pickKeeperSection3(rows: ProjectRow[]): ProjectRow {
  return pickKeeperSection2(rows);
}

/** Union-find to build groups from pairs. */
function buildGroupsFromPairs(
  all: ProjectRow[],
  isPair: (a: ProjectRow, b: ProjectRow) => boolean
): ProjectRow[][] {
  const parent = new Map<number, number>();
  const idToRow = new Map<number, ProjectRow>();
  for (const r of all) {
    parent.set(r.ProjectId, r.ProjectId);
    idToRow.set(r.ProjectId, r);
  }
  function find(id: number): number {
    let p = parent.get(id)!;
    if (p !== id) p = find(p);
    parent.set(id, p);
    return p;
  }
  function union(a: number, b: number) {
    const pa = find(a);
    const pb = find(b);
    if (pa !== pb) parent.set(pa, pb);
  }
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      if (isPair(all[i], all[j])) union(all[i].ProjectId, all[j].ProjectId);
    }
  }
  const groupsByRoot = new Map<number, ProjectRow[]>();
  for (const r of all) {
    const root = find(r.ProjectId);
    if (!groupsByRoot.has(root)) groupsByRoot.set(root, []);
    groupsByRoot.get(root)!.push(r);
  }
  return [...groupsByRoot.values()].filter((g) => g.length > 1);
}

async function runMerge(
  pool: sql.ConnectionPool,
  keeper: ProjectRow,
  duplicates: ProjectRow[]
): Promise<void> {
  const keeperProjectId = keeper.ProjectId;
  const keeperDealId = keeper.DealPipelineId;
  for (const dup of duplicates) {
    if (dup.ProjectId === keeperProjectId) continue;
    const dupDealId = dup.DealPipelineId;

    if (DRY_RUN) {
      console.log(`  [DRY RUN] Would merge ProjectId=${dup.ProjectId} (${dup.ProjectName}) into ${keeperProjectId} (${keeper.ProjectName})`);
      continue;
    }

    if (dupDealId != null && keeperDealId != null) {
      await pool.request()
        .input('fromId', sql.Int, dupDealId)
        .input('toId', sql.Int, keeperDealId)
        .query(`UPDATE pipeline.DealPipelineAttachment SET DealPipelineId = @toId WHERE DealPipelineId = @fromId`);
    }

    const tables: { name: string; col: string }[] = [
      { name: 'pipeline.UnderContract', col: 'ProjectId' },
      { name: 'pipeline.ClosedProperty', col: 'ProjectId' },
      { name: 'pipeline.CommercialListed', col: 'ProjectId' },
      { name: 'pipeline.CommercialAcreage', col: 'ProjectId' },
    ];
    for (const t of tables) {
      const hasKeeper = await pool.request()
        .input('pid', sql.Int, keeperProjectId)
        .query(`SELECT 1 FROM ${t.name} WHERE ${t.col} = @pid`);
      const hasDup = await pool.request()
        .input('pid', sql.Int, dup.ProjectId)
        .query(`SELECT 1 FROM ${t.name} WHERE ${t.col} = @pid`);
      if (hasDup.recordset.length > 0) {
        if (hasKeeper.recordset.length > 0) {
          await pool.request().input('pid', sql.Int, dup.ProjectId).query(`DELETE FROM ${t.name} WHERE ${t.col} = @pid`);
        } else {
          await pool.request()
            .input('dupId', sql.Int, dup.ProjectId)
            .input('keeperId', sql.Int, keeperProjectId)
            .query(`UPDATE ${t.name} SET ${t.col} = @keeperId WHERE ${t.col} = @dupId`);
        }
      }
    }

    if (dupDealId != null) {
      await pool.request().input('id', sql.Int, dupDealId).query('DELETE FROM pipeline.DealPipeline WHERE DealPipelineId = @id');
    }
    await pool.request().input('id', sql.Int, dup.ProjectId).query('DELETE FROM core.Project WHERE ProjectId = @id');
  }
}

async function fetchAllProjects(pool: sql.ConnectionPool): Promise<ProjectRow[]> {
  const result = await pool.request().query(`
    SELECT p.ProjectId, p.ProjectName, p.City, p.State, p.Stage, dp.DealPipelineId
    FROM core.Project p
    LEFT JOIN pipeline.DealPipeline dp ON dp.ProjectId = p.ProjectId
  `);
  return result.recordset.map((r: any) => ({
    ProjectId: r.ProjectId,
    ProjectName: r.ProjectName || '',
    City: r.City ?? null,
    State: r.State ?? null,
    Stage: r.Stage ?? null,
    DealPipelineId: r.DealPipelineId ?? null,
  }));
}

async function main() {
  if (!process.env.DB_SERVER || !process.env.DB_DATABASE || !process.env.DB_USER || !process.env.DB_PASSWORD) {
    console.error('Set DB_SERVER, DB_DATABASE, DB_USER, DB_PASSWORD');
    process.exit(1);
  }

  const pool = await sql.connect(dbConfig);
  let all = await fetchAllProjects(pool);
  let merged = 0;

  // Section 1: exact duplicate Site name (same normalized) — merge all; keeper = non-rejected preferred, then more data
  const byNormalized = new Map<string, ProjectRow[]>();
  for (const r of all) {
    const key = normalize(r.ProjectName);
    if (!key) continue;
    if (!byNormalized.has(key)) byNormalized.set(key, []);
    byNormalized.get(key)!.push(r);
  }
  const section1Groups = [...byNormalized.values()].filter((g) => g.length > 1);

  console.log('Section 1 (exact duplicate name):', section1Groups.length, 'groups');
  for (const group of section1Groups) {
    const keeper = pickKeeperSection1(group);
    const dups = group.filter((r) => r.ProjectId !== keeper.ProjectId);
    console.log(`  Merge "${group[0].ProjectName}" → keep ProjectId=${keeper.ProjectId}, remove ${dups.map((d) => d.ProjectId).join(', ')}`);
    await runMerge(pool, keeper, group);
    merged += dups.length;
  }

  // Re-query so Section 2 only sees current projects (no deleted IDs)
  all = await fetchAllProjects(pool);

  // Section 2: likely same deal (normalized or containing name) — merge; keeper = more data, prefer non-rejected over rejected
  const section2Groups = buildGroupsFromPairs(
    all,
    (a, b) => namesMatchNormalizedOrContaining(a.ProjectName, b.ProjectName) && !namesMatchExact(a.ProjectName, b.ProjectName)
  );

  console.log('Section 2 (normalized/containing name):', section2Groups.length, 'groups');
  for (const group of section2Groups) {
    const keeper = pickKeeperSection2(group);
    const dups = group.filter((r) => r.ProjectId !== keeper.ProjectId);
    console.log(`  Merge group → keep ProjectId=${keeper.ProjectId} (${keeper.ProjectName}), remove ${dups.map((d) => d.ProjectName).join('; ')}`);
    await runMerge(pool, keeper, group);
    merged += dups.length;
  }

  // Re-query so Section 3 only sees current projects
  all = await fetchAllProjects(pool);

  // Section 3: only if exact city AND exact state AND similar name — otherwise leave
  const section3Groups = buildGroupsFromPairs(all, (a, b) => {
    if (!exactCityState(a.City, a.State, b.City, b.State)) return false;
    return similarName(a.ProjectName, b.ProjectName);
  });

  console.log('Section 3 (exact city+state, similar name):', section3Groups.length, 'groups');
  for (const group of section3Groups) {
    const keeper = pickKeeperSection3(group);
    const dups = group.filter((r) => r.ProjectId !== keeper.ProjectId);
    console.log(`  Merge ${group.map((r) => r.ProjectName).join(' / ')} (${keeper.City}, ${keeper.State}) → keep ProjectId=${keeper.ProjectId}`);
    await runMerge(pool, keeper, group);
    merged += dups.length;
  }

  await pool.close();
  console.log('\n---');
  console.log(DRY_RUN ? `[DRY RUN] Would have merged ${merged} duplicate project(s). Run without MERGE_DRY_RUN=1 to apply.` : `Merged ${merged} duplicate project(s).`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
