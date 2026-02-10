#!/usr/bin/env node
/**
 * Seed Google Maps URLs into reviews.PropertyReviewConfig via API POST /api/reviews/seed-property-urls.
 * Reads distinct Property -> property_url from a reviews CSV (only URLs starting with https://www.google.com/maps).
 * Requires admin login. Set API_BASE_URL and STOA_DB_USER / STOA_DB_PASSWORD, or pass --api=URL --user= --password=.
 *
 * Usage:
 *   node scripts/seed-property-urls.js [path-to-reviews.csv]
 *   node scripts/seed-property-urls.js "../reviews dashboard/Google Reviews Dataset - Categorized.csv" --api=https://stoagroupdb-ddre.onrender.com --user=admin --password=xxx
 */

const fs = require('fs');
const path = require('path');

const API_BASE = process.env.API_BASE_URL || process.env.STOA_DB_API_URL || 'https://stoagroupdb-ddre.onrender.com';
const DEFAULT_CSV = path.join(__dirname, '../../reviews dashboard/Google Reviews Dataset - Categorized.csv');

function parseCSVLine(line) {
  const fields = [];
  let field = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuote = !inQuote;
      continue;
    }
    if (!inQuote && c === ',') {
      fields.push(field.trim());
      field = '';
      continue;
    }
    field += c;
  }
  fields.push(field.trim());
  return fields;
}

function extractPropertyUrlsFromCSV(csvPath) {
  const raw = fs.readFileSync(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return {};
  const header = parseCSVLine(lines[0]);
  const propIdx = header.findIndex(h => (h || '').toLowerCase() === 'property');
  const urlIdx = header.findIndex(h => {
    const n = (h || '').trim().toLowerCase();
    return n === 'property_url' || n.replace(/[\s_-]/g, '') === 'propertyurl';
  });
  if (propIdx < 0 || urlIdx < 0) {
    throw new Error('CSV must have Property and property_url columns');
  }
  const map = {};
  const prefix = 'https://www.google.com/maps';
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    const prop = (fields[propIdx] || '').trim();
    const url = (fields[urlIdx] || '').trim();
    if (prop && url && url.startsWith(prefix)) {
      if (!map[prop] || url.length > (map[prop] || '').length) map[prop] = url;
    }
  }
  return map;
}

async function login(apiBase, username, password) {
  const res = await fetch(`${apiBase.replace(/\/$/, '')}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `Login failed: ${res.status}`);
  }
  if (!data.success || !data.data?.token) {
    throw new Error('Login response missing token');
  }
  return data.data.token;
}

async function seedPropertyUrls(apiBase, token, propertyUrls) {
  const res = await fetch(`${apiBase.replace(/\/$/, '')}/api/reviews/seed-property-urls`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ propertyUrls }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `Seed failed: ${res.status}`);
  }
  return data;
}

async function main() {
  const args = process.argv.slice(2);
  const csvPath = args.find(a => !a.startsWith('--')) || DEFAULT_CSV;
  const apiArg = args.find(a => a.startsWith('--api='));
  const userArg = args.find(a => a.startsWith('--user='));
  const passArg = args.find(a => a.startsWith('--password='));
  const apiBase = apiArg ? apiArg.split('=')[1] : API_BASE;
  const username = userArg ? userArg.split('=')[1] : process.env.STOA_DB_USER;
  const password = passArg ? passArg.split('=')[1] : process.env.STOA_DB_PASSWORD;

  if (!fs.existsSync(csvPath)) {
    console.error('CSV not found:', csvPath);
    console.error('Usage: node scripts/seed-property-urls.js [reviews.csv] [--api=URL] [--user=U] [--password=P]');
    process.exit(1);
  }
  if (!username || !password) {
    console.error('Admin credentials required. Set STOA_DB_USER and STOA_DB_PASSWORD, or use --user= and --password=');
    process.exit(1);
  }

  console.log('Reading property -> Google Maps URL from', csvPath, '...');
  const propertyUrls = extractPropertyUrlsFromCSV(csvPath);
  const names = Object.keys(propertyUrls);
  if (names.length === 0) {
    console.log('No Property + Google Maps URL pairs found in CSV.');
    return;
  }
  console.log('Found', names.length, 'properties with Google Maps URLs:', names.join(', '));

  console.log('Logging in to', apiBase, '...');
  const token = await login(apiBase, username, password);

  console.log('Seeding property URLs...');
  const result = await seedPropertyUrls(apiBase, token, propertyUrls);
  const d = result.data || result;
  console.log('Done. Updated:', d.updated);
  if (d.notFound && d.notFound.length) {
    console.log('Not found (no matching ProjectName in DB):', d.notFound.join(', '));
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
