#!/usr/bin/env node
/**
 * Extract the site map SVG for each Waters property by:
 * 1. Fetching each property's /floorplans page from their website
 * 2. Extracting the Sightmap embed code (e.g. 8ywklz82vlx) from the page
 * 3. Optionally loading the Sightmap embed page and __APP_CONFIG__.sightmaps[0].href
 *    to call the Sightmap app API and get unit_map.background_image_url (canonical map URL)
 * 4. Downloading the site map image and saving as JPG + SVG
 *
 * The Sightmap embed exposes: window.__APP_CONFIG__ with sightmaps[].href like
 * https://sightmap.com/app/api/v1/{instance}/sightmaps/{id}. That API returns
 * data.unit_map.background_image_url (site map image) and data.unit_map.geojson_url (unit polygons).
 *
 * Usage:
 *   node scripts/extract-sitemap-svg-from-property-sites.js [outputDir]
 *   USE_SIGHTMAP_API=1 node scripts/extract-sitemap-svg-from-property-sites.js  # get image URL from Sightmap API
 *
 * Requires: Node 18+ (for fetch) or run from project with node.
 */

const https = require('https');
const http = require('http');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const PROPERTIES = [
  {
    name: 'the-waters-at-mcgowin',
    floorPlansUrl: 'https://www.thewatersatmcgowin.com/apartments/al/mobile/floor-plans',
    cdnImageUrl: 'https://cdn.sightmap.com/assets/m9/pz/m9pzj5k4vk1/68/42/68429505d37064d3592342d556baa352.jpg',
    width: 2000,
    height: 1589,
  },
  {
    name: 'the-waters-at-freeport',
    floorPlansUrl: 'https://www.thewatersatfreeport.com/apartments/fl/freeport/floor-plans',
    cdnImageUrl: 'https://cdn.sightmap.com/assets/27/vq/27vq0drkpox/1a/74/1a74c9d27f9f097bef09968db307f0b3.jpg',
    width: 2000,
    height: 1507,
  },
  {
    name: 'the-waters-at-bluebonnet',
    floorPlansUrl: 'https://www.thewatersatbluebonnet.com/apartments/la/baton-rouge/floor-plans',
    cdnImageUrl: 'https://cdn.sightmap.com/assets/jl/w0/jlw039jgw2y/01/6d/016d01002b9a18dede11d3c26b8dcc98.jpg',
    width: 2000,
    height: 1446,
  },
  {
    name: 'the-waters-at-crestview',
    floorPlansUrl: 'https://www.thewatersatcrestview.com/apartments/fl/crestview/floor-plans',
    cdnImageUrl: 'https://cdn.sightmap.com/assets/rx/wj/rxwj6j8zp1e/71/be/71be6e4155f8249ecf70c7d61a19f22b.jpg',
    width: 2000,
    height: 1493,
  },
  {
    name: 'the-waters-at-hammond',
    floorPlansUrl: 'https://www.thewatersathammond.com/floor-plans.aspx',
    cdnImageUrl: 'https://cdn.sightmap.com/assets/1y/wy/1ywy7kjgwq0/ef/75/ef75dcb10d196d2478c313fc206fcbce.jpg',
    width: 2000,
    height: 1077,
  },
  {
    name: 'the-waters-at-millerville',
    floorPlansUrl: 'https://www.thewatersatmillerville.com/apartments/la/baton-rouge/floor-plans',
    cdnImageUrl: 'https://cdn.sightmap.com/assets/x1/p8/x1p80l7kwd6/1f/e9/1fe91620953185ff98e08722b37e0a51.jpg',
    width: 2000,
    height: 1716,
  },
  {
    name: 'the-waters-at-redstone',
    floorPlansUrl: 'https://www.thewatersatredstone.com/apartments/fl/crestview/floor-plans',
    cdnImageUrl: 'https://cdn.sightmap.com/assets/d7/p1/d7p10g8gvkx/66/47/664772550387ae2082f77a001f575e93.jpg',
    width: 2000,
    height: 1721,
  },
  {
    name: 'the-waters-at-settlers-trace',
    floorPlansUrl: 'https://www.thewatersatsettlerstrace.com/apartments/la/lafayette/floor-plans',
    cdnImageUrl: 'https://cdn.sightmap.com/assets/8y/wk/8ywkqo72wlx/0b/63/0b63c696a0655317eb083fd4566ed429.jpg',
    width: 2000,
    height: 1460,
  },
  {
    name: 'the-waters-at-west-village',
    floorPlansUrl: 'https://www.thewatersatwestvillage.com/apartments/la/scott/floor-plans',
    cdnImageUrl: 'https://cdn.sightmap.com/assets/rx/wj/rxwj69g0p1e/40/61/4061a9f97f3b9da064f1821cbf8e193e.jpg',
    width: 1801,
    height: 2000,
  },
];

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(
      url,
      {
        timeout: 20000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      },
      (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${url}`));
          return;
        }
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

function fetchText(url, redirectCount = 0) {
  const maxRedirects = 5;
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(
      url,
      {
        timeout: 20000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      },
      (res) => {
        if (res.statusCode >= 301 && res.statusCode <= 308 && res.headers.location && redirectCount < maxRedirects) {
          const next = new URL(res.headers.location, url).href;
          return fetchText(next, redirectCount + 1).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${url}`));
          return;
        }
        const chunks = [];
        if (res.headers['content-encoding'] === 'gzip') {
          const gunzip = zlib.createGunzip();
          res.pipe(gunzip);
          gunzip.on('data', (chunk) => chunks.push(chunk));
          gunzip.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
          gunzip.on('error', reject);
        } else {
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
          res.on('error', reject);
        }
      }
    );
    req.on('error', reject);
  });
}

function extractEmbedCode(html) {
  const m = html.match(/sightmap\.com\/embed\/([a-z0-9]+)/i);
  return m ? m[1] : null;
}

/** Extract JSON object after __APP_CONFIG__ = (balance braces to handle nested content). */
function extractAppConfigJson(html) {
  const start = html.indexOf('window.__APP_CONFIG__');
  if (start === -1) return null;
  const braceStart = html.indexOf('{', start);
  if (braceStart === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  let end = braceStart;
  for (let i = braceStart; i < html.length; i++) {
    const c = html[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === '\\' && inString) {
      escape = true;
      continue;
    }
    if (!inString) {
      if (c === '"' || c === "'") inString = c;
      else if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
      continue;
    }
    if (c === inString) inString = false;
  }
  return depth === 0 ? html.slice(braceStart, end) : null;
}

/** Get Sightmap API URL from embed page (window.__APP_CONFIG__.sightmaps[0].href). */
async function getSightmapApiUrl(embedHash) {
  const embedPageUrl = `https://sightmap.com/embed/${embedHash}`;
  const html = await fetchText(embedPageUrl);
  const jsonStr = extractAppConfigJson(html);
  if (!jsonStr) return null;
  try {
    const config = JSON.parse(jsonStr);
    const href = config.sightmaps && config.sightmaps[0] && config.sightmaps[0].href;
    return href ? String(href).replace(/\\\//g, '/') : null;
  } catch {
    return null;
  }
}

/** Normalize unit number from API/GeoJSON (strip "APT " prefix, trim). */
function normalizeUnitNumber(val) {
  if (val == null || val === '') return null;
  return String(val).replace(/^APT\s+/i, '').trim() || null;
}

/**
 * Build unit_id -> label map from GeoJSON UnitLabel point features (text drawn on floor plan).
 * Uses unit_id and name/label/text so region_id matches what's on the JPG.
 */
function buildUnitLabelMapFromGeojson(fc) {
  if (!fc.features || !Array.isArray(fc.features)) return null;
  const map = {};
  for (const f of fc.features) {
    if (f.properties && f.properties.type === 'UnitLabel' && f.geometry && f.geometry.type === 'Point') {
      const uid = f.properties.unit_id != null ? String(f.properties.unit_id) : (f.id != null ? String(f.id) : null);
      const text =
        f.properties.unit_label ??
        f.properties.name ??
        f.properties.label ??
        f.properties.text ??
        f.properties.unit_number ??
        f.properties.display_unit_number;
      if (uid != null && text != null && String(text).trim() !== '') {
        const normalized = normalizeUnitNumber(String(text));
        if (normalized) map[uid] = normalized;
      }
    }
  }
  return Object.keys(map).length > 0 ? map : null;
}

/**
 * Transform GeoJSON so each unit polygon on the first floor is its own region for Domo.
 * - Keeps only Polygon features (Unit footprints); drops UnitLabel points from output.
 * - When firstFloorId is set, keeps only units on that floor (one region per unit on the floor plan).
 * - Sets region_id to the building's actual unit number to match the floor plan JPGs:
 *   1) Unit number from GeoJSON Unit polygon properties, 2) UnitLabel text (same as drawn on map),
 *   3) API unit_id -> unit_number map, 4) last 4 digits of unit_id.
 */
function transformGeojsonForDomoOneRegionPerUnit(geojsonBuffer, firstFloorId, unitIdToUnitNumber) {
  const fc = JSON.parse(geojsonBuffer.toString('utf8'));
  if (!fc.features || !Array.isArray(fc.features)) return geojsonBuffer;
  const unitLabelMap = buildUnitLabelMapFromGeojson(fc);
  let unitPolygons = fc.features.filter(
    (f) => f.geometry && f.geometry.type === 'Polygon' && f.properties && f.properties.type === 'Unit'
  );
  if (firstFloorId) {
    unitPolygons = unitPolygons.filter((f) => String(f.properties.floor_id) === String(firstFloorId));
  }
  const features = unitPolygons.map((f) => {
    const unitId = String(f.properties.unit_id || f.id);
    const fromPolygon =
      normalizeUnitNumber(f.properties.unit_number) ||
      normalizeUnitNumber(f.properties.label) ||
      normalizeUnitNumber(f.properties.name) ||
      normalizeUnitNumber(f.properties.display_unit_number);
    const fromUnitLabel = unitLabelMap && unitLabelMap[unitId];
    const regionId =
      fromPolygon ||
      fromUnitLabel ||
      (unitIdToUnitNumber && unitIdToUnitNumber[unitId]) ||
      (unitId.length >= 4 ? unitId.slice(-4) : unitId);
    return {
      ...f,
      id: regionId,
      properties: {
        ...f.properties,
        region_id: String(regionId),
      },
    };
  });
  return Buffer.from(
    JSON.stringify({ ...fc, features }, null, 0),
    'utf8'
  );
}

/**
 * Build map of Sightmap unit_id -> actual unit number (all floors).
 * Uses unit_number, label, or display_unit_number from API so region_id matches the building JPGs.
 */
function buildUnitNumberMap(data) {
  if (!data || !Array.isArray(data.units)) return null;
  const map = {};
  for (const u of data.units) {
    const raw =
      u.unit_number ||
      u.unit_number_display ||
      u.unitNumberDisplay ||
      u.label ||
      u.display_unit_number;
    if (raw != null && raw !== '') {
      const normalized = normalizeUnitNumber(raw);
      if (normalized) map[String(u.id)] = normalized;
    }
  }
  return Object.keys(map).length > 0 ? map : null;
}

/** Fetch Sightmap app API and return unit_map + first floor id + unit_id -> unit_number map. */
async function getBackgroundImageFromApi(apiUrl) {
  const text = await fetchText(apiUrl);
  const json = JSON.parse(text);
  const data = json.data;
  const unitMap = data && data.unit_map;
  const floors = data && data.floors;
  const firstFloorId = Array.isArray(floors) && floors.length > 0 ? floors[0].id : null;
  const unitIdToUnitNumber = buildUnitNumberMap(data);
  if (!unitMap) return null;
  return {
    background_image_url: unitMap.background_image_url || null,
    geojson_url: unitMap.geojson_url || null,
    first_floor_id: firstFloorId,
    unit_id_to_unit_number: unitIdToUnitNumber,
  };
}

/** Read width/height from JPEG buffer (SOF0/SOF2 marker). */
function getJpegDimensions(buf) {
  let i = 2;
  while (i < buf.length - 8) {
    if (buf[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = buf[i + 1];
    if (marker === 0xc0 || marker === 0xc2) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

function writeSvg(imageBuffer, width, height, outPath) {
  const base64 = imageBuffer.toString('base64');
  const dataUri = `data:image/jpeg;base64,${base64}`;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <image width="${width}" height="${height}" href="${dataUri}"/>
</svg>
`;
  fs.writeFileSync(outPath, svg, 'utf8');
}

async function main() {
  const outputDir = path.resolve(process.argv[2] || path.join(__dirname, '..', 'downloads'));
  fs.mkdirSync(outputDir, { recursive: true });

  const useSightmapApi = process.env.USE_SIGHTMAP_API === '1' || process.env.USE_SIGHTMAP_API === 'true';

  for (const prop of PROPERTIES) {
    console.log(`\n${prop.name}`);
    let embedCode = null;
    try {
      const html = await fetchText(prop.floorPlansUrl);
      embedCode = extractEmbedCode(html);
      if (embedCode) {
        console.log(`  Embed (from ${new URL(prop.floorPlansUrl).hostname}): sightmap.com/embed/${embedCode}`);
      } else {
        console.log(`  No Sightmap embed found on floor-plans page`);
      }
    } catch (err) {
      console.log(`  Could not fetch floor-plans page: ${err.message}`);
    }

    let imageUrl = prop.cdnImageUrl;
    let geojsonUrl = null;
    let firstFloorId = null;
    let unitIdToUnitNumber = null;
    if (embedCode) {
      try {
        const apiUrl = await getSightmapApiUrl(embedCode);
        if (apiUrl) {
          const mapInfo = await getBackgroundImageFromApi(apiUrl);
          if (mapInfo) {
            if (mapInfo.background_image_url && useSightmapApi) imageUrl = mapInfo.background_image_url;
            if (mapInfo.geojson_url) geojsonUrl = mapInfo.geojson_url;
            if (mapInfo.first_floor_id) firstFloorId = mapInfo.first_floor_id;
            if (mapInfo.unit_id_to_unit_number) unitIdToUnitNumber = mapInfo.unit_id_to_unit_number;
          }
        }
      } catch (err) {
        console.log(`  Sightmap API: ${err.message}`);
      }
    }

    if (geojsonUrl) {
      const unitLabel = unitIdToUnitNumber ? 'actual first-floor unit numbers' : 'first floor, fallback ids';
      console.log(`  Downloading GeoJSON (${unitLabel} for Domo)...`);
      try {
        const rawBuffer = await fetchBuffer(geojsonUrl);
        const geojsonBuffer = transformGeojsonForDomoOneRegionPerUnit(
          rawBuffer,
          firstFloorId,
          unitIdToUnitNumber
        );
        const geojsonPath = path.join(outputDir, `${prop.name}.geojson`);
        fs.writeFileSync(geojsonPath, geojsonBuffer, 'utf8');
        const parsed = JSON.parse(geojsonBuffer.toString('utf8'));
        const count = parsed.features.length;
        const sample = count > 0 ? parsed.features[0].properties.region_id : '';
        console.log(`  → ${prop.name}.geojson (${count} unit regions, floor 1 only${sample ? `, e.g. ${sample}` : ''})`);
      } catch (err) {
        console.error(`  Failed to download GeoJSON: ${err.message}`);
      }
    }

    console.log(`  Downloading site map image...`);
    try {
      const imageBuffer = await fetchBuffer(imageUrl);
      const dims = getJpegDimensions(imageBuffer) || { width: prop.width, height: prop.height };
      const jpgPath = path.join(outputDir, `${prop.name}.jpg`);
      const svgPath = path.join(outputDir, `${prop.name}.svg`);
      fs.writeFileSync(jpgPath, imageBuffer);
      writeSvg(imageBuffer, dims.width, dims.height, svgPath);
      console.log(`  → ${prop.name}.jpg, ${prop.name}.svg`);
    } catch (err) {
      console.error(`  Failed to download image: ${err.message}`);
    }
  }
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
