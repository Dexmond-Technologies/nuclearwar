#!/usr/bin/env node

/**
 * Antigravity Auto-Deploy Checker for Render
 * Usage: node render_deployment_check.js <service_id>
 * Requires process.env.RENDER_API_KEY to be set in the `.env` file.
 */

require('dotenv').config();
const https = require('https');

const API_KEY = process.env.RENDER_API_KEY;
const SERVICE_ID = process.argv[2];

if (!API_KEY) {
  console.error("❌ ERROR: RENDER_API_KEY is not set in the environment.");
  process.exit(1);
}

if (!SERVICE_ID) {
  console.error("❌ ERROR: Please provide the Render Service ID as an argument.");
  process.exit(1);
}

const options = {
  hostname: 'api.render.com',
  path: `/v1/services/${SERVICE_ID}/deploys?limit=1`,
  method: 'GET',
  headers: {
    'Accept': 'application/json',
    'Authorization': `Bearer ${API_KEY}`
  }
};

console.log(`Checking latest deployment status for service: ${SERVICE_ID}...`);

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode !== 200) {
      console.error(`❌ API Request Failed [HTTP ${res.statusCode}]: ${data}`);
      process.exit(1);
    }

    try {
      const parsed = JSON.parse(data);
      if (!parsed || parsed.length === 0) {
        console.error("❌ No deployments found for this service.");
        process.exit(1);
      }

      const latestDeploy = parsed[0].deploy;
      const status = latestDeploy.status;

      console.log(`\n=================================`);
      console.log(`ID: ${latestDeploy.id}`);
      console.log(`STATUS: ${status.toUpperCase()}`);
      console.log(`CREATED: ${latestDeploy.createdAt}`);
      console.log(`=================================\n`);

      if (status === 'live' || status === 'build_successful') {
        console.log("✅ Deployment is LIVE and healthy.");
        process.exit(0);
      } else if (status === 'build_failed' || status === 'update_failed') {
        console.error("❌ Deployment FAILED. Please check Render dashboard for logs.");
        process.exit(1);
      } else {
        console.log(`⏳ Deployment is currently in progress (${status})... Run this script again later.`);
        process.exit(0);
      }

    } catch (err) {
      console.error("❌ Failed to parse Render API response:", err.message);
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Network request failed: ${e.message}`);
  process.exit(1);
});

req.end();
