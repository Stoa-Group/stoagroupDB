#!/usr/bin/env node
/**
 * Download a Sightmap floorplan image and save as JPG + SVG (SVG embeds the image for scaling).
 *
 * Usage:
 *   node scripts/download-floorplan-svg.js [imageUrl] [outputDir]
 *
 * Example (default URL from Sightmap CDN):
 *   node scripts/download-floorplan-svg.js
 *
 * With custom URL and output directory:
 *   node scripts/download-floorplan-svg.js "https://cdn.sightmap.com/..." ./output
 *
 * If the CDN requires auth or blocks server requests, download the JPG in your browser
 * (right-click → Save image), then run with a local path to create the SVG only:
 *   node scripts/download-floorplan-svg.js ./path/to/floorplan.jpg ./output
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DEFAULT_URL = 'https://cdn.sightmap.com/assets/m9/pz/m9pzj5k4vk1/68/42/68429505d37064d3592342d556baa352.jpg';

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: 15000 }, (res) => {
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

function writeSvgWithEmbeddedImage(imageBuffer, mimeType, width, height, outPath) {
  const base64 = imageBuffer.toString('base64');
  const dataUri = `data:${mimeType};base64,${base64}`;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <image width="${width}" height="${height}" href="${dataUri}"/>
</svg>
`;
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, svg, 'utf8');
  console.log('Wrote:', outPath);
}

async function main() {
  const imageUrlOrPath = process.argv[2] || DEFAULT_URL;
  const outputDir = path.resolve(process.argv[3] || path.join(__dirname, '..', 'downloads'));

  const isLocalFile = !/^https?:\/\//i.test(imageUrlOrPath);
  let imageBuffer;
  let mimeType = 'image/jpeg';
  let width = 2000;
  let height = 1589;

  if (isLocalFile) {
    const localPath = path.resolve(imageUrlOrPath);
    if (!fs.existsSync(localPath)) {
      console.error('File not found:', localPath);
      process.exit(1);
    }
    imageBuffer = fs.readFileSync(localPath);
    const ext = path.extname(localPath).toLowerCase();
    if (ext === '.png') mimeType = 'image/png';
    if (ext === '.webp') mimeType = 'image/webp';
    console.log('Read local file:', localPath);
  } else {
    console.log('Downloading:', imageUrlOrPath);
    try {
      imageBuffer = await fetchBuffer(imageUrlOrPath);
    } catch (err) {
      console.error('Download failed:', err.message);
      console.error('Tip: Save the image in your browser, then run with the local path.');
      process.exit(1);
    }
  }

  const baseName = path.basename(imageUrlOrPath, path.extname(imageUrlOrPath)) || 'floorplan';
  const jpgPath = path.join(outputDir, `${baseName}.jpg`);
  const svgPath = path.join(outputDir, `${baseName}.svg`);

  fs.mkdirSync(outputDir, { recursive: true });

  if (!isLocalFile) {
    fs.writeFileSync(jpgPath, imageBuffer);
    console.log('Wrote:', jpgPath);
  }

  writeSvgWithEmbeddedImage(imageBuffer, mimeType, width, height, svgPath);
  console.log('Done. Open the .svg in a browser or design tool.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
