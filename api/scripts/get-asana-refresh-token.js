#!/usr/bin/env node
/**
 * One-time script to get an Asana OAuth refresh token.
 *
 * Works with Asana apps configured as "native or command-line" using
 * redirect URL: urn:ietf:wg:oauth:2.0:oob (code is shown in the browser; you paste it here).
 *
 * Prerequisites:
 * - Asana app with CLIENT_ID and CLIENT_SECRET (from https://app.asana.com/0/my-apps).
 * - App OAuth redirect URL set to: urn:ietf:wg:oauth:2.0:oob
 *
 * Usage:
 *   cd api && node scripts/get-asana-refresh-token.js
 *
 * What happens:
 * 1. Script prints a URL. Open it in your browser → log in to Asana (if needed) → Allow.
 * 2. Asana shows a page with an authorization code. Copy the code.
 * 3. Paste the code when the script prompts you.
 * 4. Script prints REFRESH_TOKEN. Add it to Render (Environment) as REFRESH_TOKEN and redeploy.
 */

const readline = require('readline');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../deal pipeline-FOR REFERENCE DO NOT EDIT/.env') });

const CLIENT_ID = (process.env.CLIENT_ID || '').replace(/['"]/g, '').trim();
const CLIENT_SECRET = (process.env.CLIENT_SECRET || '').replace(/['"]/g, '').trim();
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';
const STATE = 'asana-oauth-' + Math.random().toString(36).slice(2);

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing CLIENT_ID or CLIENT_SECRET.');
  console.error('Set them in .env (api/ or deal pipeline folder) or as env vars.');
  process.exit(1);
}

const authUrl =
  'https://app.asana.com/-/oauth_authorize?' +
  new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    state: STATE,
    scope: 'openid email profile default identity',
  }).toString();

async function exchangeCode(code) {
  const tokenRes = await fetch('https://app.asana.com/-/oauth_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      code: code.trim(),
    }),
  });
  return tokenRes;
}

async function main() {
  console.log('Open this URL in your browser, log in to Asana if needed, and click Allow:\n');
  console.log(authUrl);
  console.log('\nAfter you allow, Asana will show a page with an authorization code. Copy that code.\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const code = await new Promise((resolve) => rl.question('Paste the authorization code here: ', resolve));
  rl.close();

  if (!code || !code.trim()) {
    console.error('No code entered.');
    process.exit(1);
  }

  const tokenRes = await exchangeCode(code);
  const tokenData = await tokenRes.json();

  if (!tokenRes.ok) {
    console.error('Token exchange failed:', tokenRes.status, tokenData);
    process.exit(1);
  }

  console.log('\n--- Copy this value to Render (Environment) ---\n');
  console.log('REFRESH_TOKEN=' + (tokenData.refresh_token || ''));
  console.log('\nAdd REFRESH_TOKEN to your Render service environment and redeploy.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
