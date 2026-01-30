#!/usr/bin/env ts-node
/**
 * Attach files from both data/CAROLINASPIPELINEFILES and data/GULFCOASTPIPELINEFILES
 * to the corresponding deal pipeline records via the API in one run.
 * Skips uploading if the deal already has an attachment with the same filename (no duplicates).
 *
 * Usage: npm run db:attach-all-pipeline-files
 * Prereq: Deals seeded, API running. Set API_BASE_URL (default http://localhost:3000), optional API_TOKEN.
 */

import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const API_BASE_URL = (process.env.API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const API_TOKEN = process.env.API_TOKEN || process.env.JWT_TOKEN || '';

const CAROLINAS_DIR = path.resolve(__dirname, '../../data/CAROLINASPIPELINEFILES');
const GULFCOAST_DIR = path.resolve(__dirname, '../../data/GULFCOASTPIPELINEFILES');

type Rule = { patterns: string[]; projectName: string };

const CAROLINAS_RULES: Rule[] = [
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

const GULFCOAST_RULES: Rule[] = [
  { patterns: ['Clara Ave', 'Clara Ave 392A', '293A'], projectName: 'Clara Ave 392A' },
  { patterns: ['Riverwalk', 'Port Orange', 'Daytona Apartments', 'Daytona Beach'], projectName: 'Riverwalk - Port Orange' },
  { patterns: ['Holly Grove', 'Ocean Springs.kmz'], projectName: 'Holly Grove' },
  { patterns: ['Slavia Rd', 'Slavia Rd - Oviedo', 'Oviedo'], projectName: 'Slavia Rd - Oviedo' },
  { patterns: ['I-10 / Louisiana', 'I-49 Lafayette', 'Louisiana Ave', 'LAMAR BLVD', 'Lamar Blvd'], projectName: 'I-10 / Louisiana Ave' },
  { patterns: ['West Pace Village', 'West Pace'], projectName: 'West Pace Village' },
  { patterns: ['South Malbis'], projectName: 'South Malbis' },
  { patterns: ['Gateway Development'], projectName: 'Gateway Development' },
  { patterns: ['Wildlight'], projectName: 'Wildlight' },
  { patterns: ['Craft Goodman', 'CRAFT PROPERTY LAYOUT'], projectName: 'Craft Goodman Rd' },
  { patterns: ['Spanish Fort', 'Loxley'], projectName: 'Spanish Fort/Loxley' },
  { patterns: ['Bon Secour'], projectName: 'Bon Secour' },
  { patterns: ['Bannerman Flyer', 'Bannerman'], projectName: 'Bannerman' },
  { patterns: ['Saraland'], projectName: 'Saraland Crossings' },
  { patterns: ['Canal Road - Will Mills', 'Will Mills'], projectName: 'Canal Road - Will Mills' },
  { patterns: ['Dauphin Way'], projectName: 'Dauphin Way' },
  { patterns: ['Canal Road - Dane', 'Dane Haywood', 'Dane Haywood'], projectName: 'Canal Road - Dane Haywood' },
  { patterns: ['Esplanade Mall'], projectName: 'Esplanade Mall' },
  { patterns: ['Waters at Freeport Phase II', 'Freeport Phase II'], projectName: 'Waters at Freeport Phase II' },
  { patterns: ['Newberry Village'], projectName: 'Newberry Village' },
  { patterns: ['Downtown Tally', 'Downtown Tallahassee', 'KrogerCenter', 'Kroger Center - North Complex', 'Kroger Center North'], projectName: 'Downtown Tally' },
  { patterns: ['NW 39th Ave', 'NW 39th', '39th Ave Gainesville'], projectName: 'NW 39th Ave' },
  { patterns: ['Perryman Hill', 'Perryman Hill Publix'], projectName: 'Perryman Hill Publix' },
  { patterns: ['St Johns Parkway', 'St Johns Pkwy', '3rd Wave Dev; St Johns'], projectName: 'St Johns Parkway' },
  { patterns: ['Weir Property'], projectName: 'Weir Property' },
  { patterns: ['Harveston'], projectName: 'Harveston' },
  { patterns: ['Hopeton Landing'], projectName: 'Hopeton Landing' },
  { patterns: ['Hardwick Farms'], projectName: 'Hardwick Farms' },
  { patterns: ['Merrill Land Trust', 'Merrill Henderson Navarre', 'Merrill Navarre'], projectName: 'Merrill Land Trust' },
  { patterns: ['Dove Park Rd'], projectName: 'Dove Park Rd' },
  { patterns: ['Ruckel Properties'], projectName: 'Ruckel Properties' },
  { patterns: ['The Waters at Sweetbay', 'Waters at Sweetbay', 'Sweetbay'], projectName: 'The Waters at Sweetbay' },
  { patterns: ['Heights at Fort Walton', 'Fort Walton Beach'], projectName: 'Heights at Fort Walton Beach' },
  { patterns: ['Flats at Cahaba', 'Cahaba Valley'], projectName: 'Flats at Cahaba Valley' },
  { patterns: ['Waters at Bartlett'], projectName: 'Waters at Bartlett' },
  { patterns: ['Waters at OWA', 'OWA Site', 'WAMobile', 'WA Mobile'], projectName: 'Waters at OWA' },
  { patterns: ['The Waters at Covington', 'Waters at Covington'], projectName: 'The Waters at Covington' },
  { patterns: ['Conway'], projectName: 'Conway' },
  { patterns: ['The Waters at Inverness', 'Waters at Inverness'], projectName: 'The Waters at Inverness' },
  { patterns: ['The Waters at Materra', 'Waters at Materra', 'Preliminary Model - The Waters at Materra'], projectName: 'The Waters at Materra' },
  { patterns: ['The Heights at Waterpointe', 'Heights at Waterpointe', 'Waterpointe'], projectName: 'The Heights at Waterpointe' },
  { patterns: ['The Waters at Promenade', 'Waters at Promenade'], projectName: 'The Waters at Promenade' },
  { patterns: ['Crosspointe', 'Crosspointe Columbia'], projectName: 'Crosspointe' },
  { patterns: ['The Waters at Crestview', 'Waters at Crestview', 'Crestview'], projectName: 'The Waters at Crestview' },
  { patterns: ['The Flats at East Bay', 'Flats at East Bay', 'East Bay'], projectName: 'The Flats at East Bay' },
  { patterns: ['The Waters at Millerville', 'Waters at Millerville', 'Millerville'], projectName: 'The Waters at Millerville' },
  { patterns: ['The Waters at Heritage', 'Waters at Heritage', 'Waters at Heritage KMZ'], projectName: 'The Waters at Heritage' },
  { patterns: ['The Waters at Redstone', 'Waters at Redstone', 'Redstone KMZ', 'Redstone'], projectName: 'The Waters at Redstone' },
  { patterns: ['The Heights at Picardy', 'Waters at Picardy', 'Heights at Picardy'], projectName: 'The Heights at Picardy' },
  { patterns: ['The Waters at Ransley', 'Ransley Part 2', 'Ransley II'], projectName: 'The Waters at Ransley II' },
  { patterns: ['The Waters at Freeport', 'Waters at Freeport'], projectName: 'The Waters at Freeport' },
  { patterns: ['The Waters at McGowin', 'McGowin'], projectName: 'The Waters at McGowin' },
  { patterns: ['The Waters at Bluebonnet', 'Bluebonnet'], projectName: 'The Waters at Bluebonnet' },
  { patterns: ['The Waters at Settlers Trace', 'Settlers Trace'], projectName: 'The Waters at Settlers Trace' },
  { patterns: ['The Waters at West Village', 'West Village Lafayette'], projectName: 'The Waters at West Village' },
  { patterns: ['Bluffs at Lafayette', 'Bluffs_at_Lafayette'], projectName: 'Bluffs at Lafayette' },
  { patterns: ['Eastern Shore Center'], projectName: 'Eastern Shore Center' },
  { patterns: ['Village Oaks', 'Village Oaks_11.6'], projectName: 'Village Oaks' },
  { patterns: ['Bearing Point', 'Bearing Pointe', 'Westmore (Bearing Pointe)'], projectName: 'Westmore (Bearing Pointe)' },
  { patterns: ['BLK Mobile Highway', 'BLK Mobile', 'Mobile Highway Pensacola'], projectName: 'BLK Mobile Highway' },
  { patterns: ['Bearing Point Airport Rd'], projectName: 'Bearing Point Airport Rd' },
  { patterns: ['Durbin Park', 'Durbin Park Multifamily'], projectName: 'Durbin Park' },
  { patterns: ['Lakeshore Development', 'Lakeshore Village', 'Lakeshore Villages'], projectName: 'Lakeshore Village' },
  { patterns: ['Long Farm', 'Long Farm MF Site'], projectName: 'Long Farm' },
  { patterns: ['Preliminary Model - Bass Pro', 'Bass Pro'], projectName: 'Bass Pro' },
  { patterns: ['Peach Blossom #1', 'Warner Robins GA'], projectName: 'Peach Blossom #1' },
  { patterns: ['Peach Blossom #2'], projectName: 'Peach Blossom #2' },
  { patterns: ['Hwy 96 Warner Robins'], projectName: 'Hwy 96 Warner Robins' },
  { patterns: ['Kroger Center - North Complex', 'KrogerCenter'], projectName: 'Kroger Center - North Complex' },
  { patterns: ['Town Center at Palm Coast', 'Palm Coast'], projectName: 'Town Center at Palm Coast' },
  { patterns: ['The Landing at Beaver Creek', 'Landing at Beaver Creek'], projectName: 'The Landing at Beaver Creek' },
  { patterns: ['Summers Corner', 'Summers Corner Residential'], projectName: 'Summers Corner' },
  { patterns: ['Keller Master Plan', 'Keller Master Plan Pooler'], projectName: 'Keller Master Plan' },
  { patterns: ['Rowan Oak', 'Rowan Oak - PUD'], projectName: 'Rowan Oak' },
  { patterns: ['Roscoe Rd v2', 'Orange Beach - Roscoe Rd'], projectName: 'Orange Beach - Roscoe Rd' },
  { patterns: ['Juniper Street Apartments', 'Juniper Street Foley'], projectName: 'Juniper Street Apartments' },
  { patterns: ['Greengate Northpark', 'Northpark Phase IV'], projectName: 'Greengate Northpark' },
  { patterns: ['East Garden District', 'The Heights at East Garden'], projectName: 'The Heights at East Garden' },
  { patterns: ['Chalmette Sites'], projectName: 'Chalmette' },
  { patterns: ['161 Prop'], projectName: '161 Prop' },
  { patterns: ['Ocean Springs'], projectName: 'Ocean Springs' },
  { patterns: ['WANG_WetlandsExhibit', 'WetlandsExhibit'], projectName: 'Waters at Freeport Phase II' },
];

function matchFileToProjectName(fileName: string, rules: Rule[]): string | null {
  const lower = fileName.toLowerCase();
  for (const { patterns, projectName } of rules) {
    for (const p of patterns) {
      if (lower.includes(p.toLowerCase())) return projectName;
    }
  }
  return null;
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

function runRegion(
  regionName: string,
  filesDir: string,
  rules: Rule[],
  projectNameToDealId: Map<string, number>
): { matched: { file: string; projectName: string; dealId: number }[]; unmatched: string[]; matchedNoDeal: { file: string; projectName: string }[] } {
  if (!fs.existsSync(filesDir)) {
    console.log(`${regionName}: folder missing (${filesDir}), skipping.\n`);
    return { matched: [], unmatched: [], matchedNoDeal: [] };
  }
  const files = fs.readdirSync(filesDir).filter((f) => {
    const full = path.join(filesDir, f);
    return fs.statSync(full).isFile();
  });
  if (files.length === 0) {
    console.log(`${regionName}: no files, skipping.\n`);
    return { matched: [], unmatched: [], matchedNoDeal: [] };
  }

  const matched: { file: string; projectName: string; dealId: number }[] = [];
  const unmatched: string[] = [];
  const matchedNoDeal: { file: string; projectName: string }[] = [];

  for (const file of files) {
    const projectName = matchFileToProjectName(file, rules);
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

  return { matched, unmatched, matchedNoDeal };
}

async function main() {
  console.log('Fetching deals from API:', API_BASE_URL);
  const deals = await getDealsFromApi();
  const carolinasDeals = deals.filter((d) => (d.RegionName || d.Region) === 'Carolinas');
  const gulfCoastDeals = deals.filter((d) => (d.RegionName || d.Region) === 'Gulf Coast');
  if (gulfCoastDeals.length === 0) {
    console.log('No deals with region "Gulf Coast"; using all deals for Gulf Coast files.');
  }
  const carolinasMap = new Map<string, number>();
  for (const d of carolinasDeals) carolinasMap.set(d.ProjectName, d.DealPipelineId);
  const gulfCoastMap = new Map<string, number>();
  for (const d of gulfCoastDeals.length > 0 ? gulfCoastDeals : deals) gulfCoastMap.set(d.ProjectName, d.DealPipelineId);

  console.log(`Carolinas deals: ${carolinasDeals.length}, Gulf Coast deals: ${gulfCoastMap.size}\n`);

  const stats = { uploaded: 0, skipped: 0, errors: 0 };

  for (const [regionName, filesDir, rules, projectNameToDealId] of [
    ['Carolinas', CAROLINAS_DIR, CAROLINAS_RULES, carolinasMap] as const,
    ['Gulf Coast', GULFCOAST_DIR, GULFCOAST_RULES, gulfCoastMap] as const,
  ]) {
    const { matched, unmatched, matchedNoDeal } = runRegion(regionName, filesDir, rules, projectNameToDealId);
    if (matched.length === 0 && unmatched.length === 0 && matchedNoDeal.length === 0) continue;

    if (matchedNoDeal.length > 0) {
      console.log(`${regionName}: matched to deal name but deal not in API: ${matchedNoDeal.length}`);
      matchedNoDeal.slice(0, 5).forEach(({ file, projectName }) => console.log(`  ${file} → ${projectName}`));
      if (matchedNoDeal.length > 5) console.log(`  ... and ${matchedNoDeal.length - 5} more`);
    }

    for (const { file, projectName, dealId } of matched) {
      const srcPath = path.join(filesDir, file);
      try {
        const existingNames = await getAttachmentFileNames(dealId);
        const alreadyThere = existingNames.some((name) => name === file || name.endsWith(file));
        if (alreadyThere) {
          stats.skipped++;
          if (stats.skipped <= 10) console.log(`  Skip (already attached): ${file} → ${projectName}`);
          continue;
        }
        await uploadFileToDeal(dealId, srcPath, file);
        stats.uploaded++;
        if (stats.uploaded <= 20 || stats.uploaded % 50 === 0) {
          console.log(`  Attached: ${file} → ${projectName}`);
        }
      } catch (e: unknown) {
        stats.errors++;
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`  Error ${file}: ${msg}`);
      }
    }

    if (unmatched.length > 0) {
      console.log(`${regionName}: no match (ignored): ${unmatched.length} files`);
      unmatched.slice(0, 10).forEach((f) => console.log(`  - ${f}`));
      if (unmatched.length > 10) console.log(`  ... and ${unmatched.length - 10} more`);
    }
    console.log('');
  }

  console.log('---');
  console.log(`Uploaded: ${stats.uploaded}`);
  console.log(`Skipped (already attached): ${stats.skipped}`);
  console.log(`Errors: ${stats.errors}`);
  process.exit(stats.errors > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
