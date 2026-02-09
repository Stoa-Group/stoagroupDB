#!/usr/bin/env node
/**
 * Download Waters floorplan images from Sightmap and save as named JPG + SVG (no modifications).
 *
 * Usage:
 *   node scripts/download-waters-floorplans.js [outputDir]
 *
 * Default output: stoagroupDB/downloads
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const FLOORPLANS = [
  { name: 'the-waters-at-mcgowin', url: 'https://cdn.sightmap.com/assets/m9/pz/m9pzj5k4vk1/68/42/68429505d37064d3592342d556baa352.jpg', width: 2000, height: 1589 },
  { name: 'the-waters-at-freeport', url: 'https://cdn.sightmap.com/assets/27/vq/27vq0drkpox/1a/74/1a74c9d27f9f097bef09968db307f0b3.jpg', width: 2000, height: 1507 },
  { name: 'the-waters-at-bluebonnet', url: 'https://cdn.sightmap.com/assets/jl/w0/jlw039jgw2y/01/6d/016d01002b9a18dede11d3c26b8dcc98.jpg', width: 2000, height: 1446 },
  { name: 'the-waters-at-crestview', url: 'https://cdn.sightmap.com/assets/rx/wj/rxwj6j8zp1e/71/be/71be6e4155f8249ecf70c7d61a19f22b.jpg', width: 2000, height: 1493 },
  { name: 'the-waters-at-hammond', url: 'https://cdn.sightmap.com/assets/1y/wy/1ywy7kjgwq0/ef/75/ef75dcb10d196d2478c313fc206fcbce.jpg', width: 2000, height: 1077 },
  { name: 'the-waters-at-millerville', url: 'https://cdn.sightmap.com/assets/x1/p8/x1p80l7kwd6/1f/e9/1fe91620953185ff98e08722b37e0a51.jpg', width: 2000, height: 1716 },
  { name: 'the-waters-at-redstone', url: 'https://cdn.sightmap.com/assets/d7/p1/d7p10g8gvkx/66/47/664772550387ae2082f77a001f575e93.jpg', width: 2000, height: 1721 },
  { name: 'the-waters-at-settlers-trace', url: 'https://cdn.sightmap.com/assets/8y/wk/8ywkqo72wlx/0b/63/0b63c696a0655317eb083fd4566ed429.jpg', width: 2000, height: 1460 },
  { name: 'the-waters-at-west-village', url: 'https://cdn.sightmap.com/assets/rx/wj/rxwj69g0p1e/40/61/4061a9f97f3b9da064f1821cbf8e193e.jpg', width: 1801, height: 2000 },
];

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 20000 }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${url}`));
        return;
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
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

  for (const { name, url, width, height } of FLOORPLANS) {
    console.log(`Downloading ${name}...`);
    try {
      const imageBuffer = await fetchBuffer(url);
      const jpgPath = path.join(outputDir, `${name}.jpg`);
      const svgPath = path.join(outputDir, `${name}.svg`);
      fs.writeFileSync(jpgPath, imageBuffer);
      writeSvg(imageBuffer, width, height, svgPath);
      console.log(`  → ${name}.jpg, ${name}.svg`);
    } catch (err) {
      console.error(`  Failed: ${err.message}`);
    }
  }
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
