/**
 * NUCLEAR WAR — WebSocket Multiplayer Server
 * Run: node server.js
 * Listens on ws://localhost:8080
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
require('dotenv').config();

// ========================================================
// GUI_LOCK ENFORCEMENT
// If process.env.GUI_LOCK === 'y' or 'Y', the user interface is STRICTLY LOCKED.
// If process.env.AMBIENT === 'BACKEND', frontend work is also locked on this machine.
// AI Agents: YOU CANNOT MODIFY THE GUI. GUI MODIFICATIONS ARE FORBIDDEN.
// ========================================================
const GUI_LOCK = (process.env.GUI_LOCK || '').toLowerCase() === 'y' || (process.env.AMBIENT || '').toUpperCase() === 'BACKEND';
if (GUI_LOCK) {
    console.log("🔒 GUI_LOCK or AMBIENT=BACKEND is ENABLED. User interface modifications are forbidden on this machine.");
}

// ========================================================
// AI BROWSER AGENT LOCKOUT
// If process.env.AI_BROWSERAGENTLAUNCH === 'n' or 'N', AI browser agents are FORBIDDEN.
// ========================================================
const BLOCK_BROWSER_AGENTS = (process.env.AI_BROWSERAGENTLAUNCH || '').toLowerCase() === 'n';
if (BLOCK_BROWSER_AGENTS) {
    console.log("🛑 AI_BROWSERAGENTLAUNCH is set to 'n'. AI Browser Agents are strictly FORBIDDEN from launching.");
}

const GameLogger = require('./CONTROLLER/logger');
const WaterModule = require('./CONTROLLER/WATER_MODULE/simulation');

// Solana Wallet Integration
const web3 = require('@solana/web3.js');
const splToken = require('@solana/spl-token');

// Standard Solana Mainnet support
const RPC_URL = process.env.SOLANA_RPC_URL || web3.clusterApiUrl('mainnet-beta');
const D3X_MINT_ADDRESS = new web3.PublicKey(process.env.D3X_MINT_ADDRESS || 'AGN8SrMCMEgiP1ghvPHa5VRf5rPFDSYVrGFyBGE1Cqpa');
const solanaConnection = new web3.Connection(RPC_URL, 'confirmed');
const BURN_ADDRESS = new web3.PublicKey('11111111111111111111111111111111');

const bs58 = require('bs58');
const decode = bs58.decode || (bs58.default && bs58.default.decode);

function loadKeypairFromEnv(envVarName, label) {
  if (process.env[envVarName]) {
    try {
      const decodedKey = decode(process.env[envVarName]);
      if (decodedKey.length === 64) {
        const kp = web3.Keypair.fromSecretKey(decodedKey);
        console.log(`✅ Solana ${label} Wallet Loaded:`, kp.publicKey.toBase58());
        return kp;
      } else if (decodedKey.length === 32) {
        const kp = web3.Keypair.fromSeed(decodedKey);
        console.log(`✅ Solana ${label} Wallet Loaded (from seed):`, kp.publicKey.toBase58());
        return kp;
      } else {
        console.error(`⚠ ${label} Private Key has incorrect length:`, decodedKey.length);
      }
    } catch(e) {
      console.error(`⚠ Failed to load ${label} Private Key:`, e.message);
    }
  } else {
    console.log(`ℹ No ${envVarName} found in environment`);
  }
  return null;
}

let authorityKeypair = loadKeypairFromEnv('EARTH_WALLET_PRIVATE_KEY', 'Authority (Earth)');
let rainclaudeKeypair = loadKeypairFromEnv('RAINCLAUDE_SOLANA_KEY', 'Rainclaude');
let geminiKeypair = loadKeypairFromEnv('gemini_wallet_pvt_key', 'Gemini AI');
let worldBankKeypair = loadKeypairFromEnv('WORLD_BANK_PVT_KEY', 'World Bank');
let treasuryKeypair  = loadKeypairFromEnv('TREASURY_PVT_KEY', 'Treasury');

let cachedGeminiBalance = 0;
let cachedClaudeBalance = 0;

// --- Initialize Offline Balances ---
async function initOfflineBalances() {
    try {
        const spendingFile = require('path').join(__dirname, 'AI_Spending.txt');
        const content = await require('fs').promises.readFile(spendingFile, 'utf8');
        const lines = content.split('\n').filter(l => l.trim().length > 0);
        for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i].startsWith('REMAINING_BALANCE:')) {
                const bal = parseFloat(lines[i].replace('REMAINING_BALANCE:', '').trim());
                if (!isNaN(bal)) {
                    cachedGeminiBalance = bal;
                    cachedClaudeBalance = bal;
                    console.log(`[AI OFFLINE SYNC] Restored AI baseline balance to ${bal} D3X`);
                    break;
                }
            }
        }
    } catch(e) {
        console.log('[AI OFFLINE SYNC] No previous spending file found.');
    }
}
initOfflineBalances();
let cachedWorldBankBalance = 0;
let cachedGeminiWallet = process.env.gemini_wallet || (geminiKeypair ? geminiKeypair.publicKey.toBase58() : "NOT_SET");
let cachedClaudeWallet = process.env.RAINCLAUDE_SOLANA_WALLET || (rainclaudeKeypair ? rainclaudeKeypair.publicKey.toBase58() : "NOT_SET");
let cachedWorldBankWallet = process.env.WORLD_BANK_WALLET || "NOT_SET";
const TREASURY_WALLET   = process.env.TREASURY_WALLET || "NOT_SET";

// ====================================================================
// TOKEN LEDGER — Production economy tracker
// All token flows: emit, spend, burn, treasury_fee, reinjection
// ====================================================================
async function logTokenFlow(type, amount, fromCommander, toCommander, note) {
    if (!pgPool) return;
    try {
        await pgPool.query(
            `INSERT INTO token_ledger (flow_type, amount, from_commander, to_commander, note, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [type, amount, fromCommander || 'SYSTEM', toCommander || 'SYSTEM', note || '']
        );
    } catch (e) {
        // Non-fatal — don't crash game if ledger write fails
        console.error('[LEDGER] Write failed:', e.message);
    }
}

// Split a D3X amount across the three economy buckets:
//   70% → World Bank (operational/redeployable)
//   15% → Burn (deflation)
//   15% → Treasury (reserve)
// Returns { bankCut, burnCut, treasuryCut }
async function splitEconomyFlow(amount, fromCallsign, note) {
    const bankCut     = Math.round(amount * 0.70);
    const burnCut     = Math.round(amount * 0.15);
    const treasuryCut = amount - bankCut - burnCut;

    if (!pgPool) return { bankCut, burnCut, treasuryCut };

    // Credit World Bank internal balance
    await pgPool.query(
        `UPDATE commanders SET d3x_balance = d3x_balance + $1 WHERE callsign = 'WORLD BANK'`,
        [bankCut]
    );
    // Credit Treasury internal balance
    await pgPool.query(
        `UPDATE commanders SET d3x_balance = d3x_balance + $1 WHERE callsign = 'TREASURY'`,
        [treasuryCut]
    );

    await logTokenFlow('spend',   amount,     fromCallsign,  'WORLD BANK', note);
    await logTokenFlow('burn',    burnCut,    'SYSTEM',       'BURN',       note + ' — deflationary burn');
    await logTokenFlow('treasury_fee', treasuryCut, 'SYSTEM', 'TREASURY',  note + ' — treasury cut');

    return { bankCut, burnCut, treasuryCut };
}


async function transferD3XOnChain(fromKeypair, toAddress, amount) {
    if (!fromKeypair) return;
    try {
        const fromTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
            solanaConnection, fromKeypair, D3X_MINT_ADDRESS, fromKeypair.publicKey
        );
        const toTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
            solanaConnection, fromKeypair, D3X_MINT_ADDRESS, toAddress
        );
        const amountDecimals = 9; // Correct D3X Decimals
        const transferAmount = amount * (10 ** amountDecimals);

        const signature = await splToken.transfer(
            solanaConnection,
            fromKeypair,
            fromTokenAccount.address,
            toTokenAccount.address,
            fromKeypair.publicKey,
            transferAmount
        );
        console.log(`🔗 [Solana Mainnet] Physical Tx Sent! Transferred ${amount} D3X. Signature: ${signature}`);
        
        // Broadcast the real transaction to all connected players
        broadcastAll({
            type: 'ai_onchain_txn',
            from: fromKeypair === geminiKeypair ? 'GEMINI CORE' : (fromKeypair === rainclaudeKeypair ? 'RAINCLAUDE' : (fromKeypair === authorityKeypair ? 'WORLD BANK' : 'COMMANDER')),
            amount: amount,
            tx: signature
        });
        return signature;
    } catch (err) {
        console.error("⚠ On-Chain Transfer Failed:", err.message);
        return null;
    }
}

// node-fetch is built-in in Node 18+, but we use it gracefully.
const { RadioBrowserApi } = require('radio-browser-api');
const radioApi = new RadioBrowserApi('NuclearWarGame-DexmondTech');
const { OAuth2Client } = require('google-auth-library');
const solanaWeb3 = require('@solana/web3.js'); // Added as per instruction


// REPLACE THIS WITH YOUR ACTUAL GOOGLE CLIENT ID
const GOOGLE_CLIENT_ID = '787878787390-opqat1n6on9vp0sk8ilkn4qv1t6je1tp.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// ── PostgreSQL persistence (optional — only active if DATABASE_URL is set) ──
let pgPool = null;
if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
} else {
  console.log('ℹ No DATABASE_URL — running without persistence (state resets on restart)');
}

async function loadGameState() {
  if (!pgPool) return null;
  try {
    const res = await pgPool.query('SELECT state FROM game_state WHERE id = 1');
    if (res.rows.length > 0) {
      console.log('✓ Loaded persisted game state from PostgreSQL');
      return res.rows[0].state;
    }
  } catch (err) {
    console.error('⚠ Failed to load game state:', err.message);
  }
  return null;
}

// Path for fallback json persistence. 
// Can be set to a mapped persistent disk on Render via DATA_DIR environment variable
const dataDir = process.env.DATA_DIR || __dirname;
const jsonFallbackPath = path.join(dataDir, 'game_state.json');

async function saveGameState(gs) {
  // Always update global cache and local file fallback
  globalGameState = gs;
  try {
    fs.writeFileSync(jsonFallbackPath, JSON.stringify(gs));
  } catch (e) {
    console.error(`⚠ Failed to save to ${jsonFallbackPath}:`, e.message);
  }

  if (!pgPool) return;
  try {
    await pgPool.query(`
      INSERT INTO game_state (id, state, updated_at)
      VALUES (1, $1, NOW())
      ON CONFLICT (id) DO UPDATE SET state = $1, updated_at = NOW()
    `, [JSON.stringify(gs)]);
  } catch (err) {
    console.error('⚠ Failed to save game state to PG:', err.message);
  }
}

async function loadGameStateFallback() {
  try {
    if (fs.existsSync(jsonFallbackPath)) {
      const data = fs.readFileSync(jsonFallbackPath, 'utf8');
      console.log(`✓ Loaded persisted game state from ${jsonFallbackPath}`);
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('⚠ Local fallback load failed:', e.message);
  }
  return null;
}

const PORT = 8888; // Hardcoded to 8888 per user request

// OpenSky API Removed

// Create HTTP server to serve the static frontend
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html' || req.url === '/game.html') {
    fs.readFile(path.join(__dirname, 'game.html'), (err, data) => {
      if (err) {
        res.writeHead(500);
        return res.end('Error loading game.html');
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  } else if (req.url === '/dist/improve_earth.js') {
    fs.readFile(path.join(__dirname, 'public/dist/improve_earth.js'), (err, data) => {
      if (err) {
        res.writeHead(404);
        return res.end('Not found');
      }
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(data);
    });

  } else if (req.url === '/DEXMOND.png') {
    fs.readFile(path.join(__dirname, 'DEXMOND.png'), (err, data) => {
      if (err) {
        res.writeHead(404);
        return res.end('Not found');
      }
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(data);
    });

  } else if (req.url === '/scifi_solid_metal.png') {
    fs.readFile(path.join(__dirname, 'public', 'scifi_solid_metal.png'), (err, data) => {
      if (err) {
        res.writeHead(404);
        return res.end('Not found');
      }
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(data);
    });


  } else if (req.url === '/api/radio/random') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || 'http://localhost:8888'
    });
    // Fetch unlimited free stations using the radio-browser-api!
    // We pick a random country to ensure global diversity, instead of getting stuck on top Spanish ones
    const countries = ['US', 'GB', 'FR', 'DE', 'IT', 'JP', 'BR', 'RU', 'IN', 'ZA', 'AU', 'CA', 'KR', 'MX', 'NL', 'SE', 'NO', 'FI', 'GR']; // Removed EG and TR
    const randomCountry = countries[Math.floor(Math.random() * countries.length)];
    radioApi.searchStations({
      limit: 100,
      hideBroken: true,
      hasGeoInfo: true,
      countryCode: randomCountry,
      tagList: ['music']
    })
    .then(stations => {
      // Filter out Arabic streams
      const filtered = stations.filter(st => {
          const checkStr = (`${st.name} ${st.language} ${st.tags}`).toLowerCase();
          return !checkStr.includes('arab') && !checkStr.includes('islam') && !checkStr.includes('middle east');
      });
      // Shuffle and slice randomly
      const shuffled = filtered.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 10);
      res.end(JSON.stringify(selected));
    })
    .catch(err => {
      console.error('Radio API error:', err);
      res.end(JSON.stringify({ error: 'Failed to fetch radio stations' }));
    });
  } else if (req.url === '/api/wallet') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || 'http://localhost:8888'
    });
    res.end(JSON.stringify({ 
      btcWallet: process.env.BTC_WALLET || "NOT_SET",
      ethWallet: process.env.ETH_WALLET || "NOT_SET",
      xlmWallet: process.env.XLM_WALLET || "NOT_SET",
      solWallet: process.env.gemini_wallet || (typeof geminiKeypair !== 'undefined' && geminiKeypair ? geminiKeypair.publicKey.toBase58() : "NOT_SET")
    }));
  } else if (req.url === '/api/soundtrack') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || 'http://localhost:8888'
    });
    try {
      const stPath = path.join(__dirname, 'soundtrack');
      let files = fs.readdirSync(stPath);
      // Filter for valid web audio files
      files = files.filter(f => f.endsWith('.mp3') || f.endsWith('.wav') || f.endsWith('.ogg'));
      // Shuffle the playlist
      const shuffled = files.sort(() => 0.5 - Math.random());
      res.end(JSON.stringify(shuffled));
    } catch (e) {
      console.error('Failed to read soundtrack directory:', e.message);
      res.end(JSON.stringify([]));
    }
  } else if (req.url.startsWith('/soundtrack/')) {
    const filename = decodeURIComponent(req.url.replace('/soundtrack/', ''));
    const filePath = path.join(__dirname, 'soundtrack', filename);
    
    // Security check to avoid directory traversal
    if (!filePath.startsWith(path.join(__dirname, 'soundtrack'))) {
      res.writeHead(403);
      return res.end('Forbidden');
    }
    
    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404);
        return res.end('Audio track not found');
      }
      
      let contentType = 'audio/mpeg'; // default mp3
      if (filename.endsWith('.wav')) contentType = 'audio/wav';
      if (filename.endsWith('.ogg')) contentType = 'audio/ogg';
      
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': stats.size,
        'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || 'http://localhost:8888'
      });
      
      const readStream = fs.createReadStream(filePath);
      readStream.pipe(res);
    });
  } else if (req.url === '/api/boats') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || 'http://localhost:8888'
    });
    // Generate 50 random boats for AIS testing
    const boats = [];
    for(let i=0; i<50; i++) {
        boats.push({
            mmsi: 100000000 + Math.floor(Math.random() * 800000000),
            name: 'VESSEL-' + Math.floor(Math.random()*1000),
            lat: (Math.random() * 120 - 60).toFixed(4),
            lon: (Math.random() * 360 - 180).toFixed(4),
            cog: Math.floor(Math.random() * 360),
            sog: (Math.random() * 20 + 5).toFixed(1)
        });
    }
    res.end(JSON.stringify(boats));
  } else if (req.url === '/api/webcams') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || 'http://localhost:8888'
    });

    // Check memory cache first
    global.cachedWebcams = global.cachedWebcams || null;
    global.lastWebcamsFetchTime = global.lastWebcamsFetchTime || 0;
    const WEBCAMS_CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

    if (global.cachedWebcams && (Date.now() - global.lastWebcamsFetchTime < WEBCAMS_CACHE_TTL)) {
      return res.end(JSON.stringify({ result: { webcams: global.cachedWebcams } }));
    }

    const fetchPromises = [];
    for (let i = 1; i <= 8; i++) {
      fetchPromises.push(
        fetch(`https://openwebcamdb.com/api/v1/webcams?page=${i}&per_page=100&status=active`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': 'Bearer 95|tl7tZtBBb5pmlK43nOhh2HTK19eiXdMp7g9V5A6v07539bcd'
          }
        }).then(r => r.json())
      );
    }
    
    Promise.all(fetchPromises)
      .then(results => {
        let allWebcams = [];
        let limitHit = false;
        results.forEach(res => {
          if (res && res.data) {
            allWebcams = allWebcams.concat(res.data);
          } else if (res && res.message && res.message.includes('rate limit')) {
            limitHit = true;
          }
        });
        
        if (allWebcams.length > 0) {
          global.cachedWebcams = allWebcams.slice(0, 750);
          global.lastWebcamsFetchTime = Date.now();
        } else if (limitHit) {
          if (!global.cachedWebcams) {
            // Provide a hardcoded fallback if cache is empty & rate limited
            global.cachedWebcams = [
              { slug: "cox-bay-surf-waves-tofino-shores", title: "Cox Bay Surf Waves, Tofino Shores", latitude: "49.1048090", longitude: "-125.8744010", stream_type: "youtube" },
              { slug: "times-square-nyc-live-cam", title: "Times Square, New York", latitude: "40.7580", longitude: "-73.9855", stream_type: "youtube" },
              { slug: "shibuya-crossing-tokyo", title: "Shibuya Crossing, Tokyo", latitude: "35.6595", longitude: "-139.7005", stream_type: "youtube" },
              { slug: "abbey-road-crossing-london", title: "Abbey Road Crossing, London", latitude: "51.5321", longitude: "-0.1773", stream_type: "youtube" },
              { slug: "sydney-harbour-bridge", title: "Sydney Harbour Bridge", latitude: "-33.8523", longitude: "151.2108", stream_type: "youtube" },
              { slug: "eiffel-tower-paris", title: "Eiffel Tower View, Paris", latitude: "48.8584", longitude: "2.2945", stream_type: "youtube" },
              { slug: "copacabana-beach-rio", title: "Copacabana Beach, Rio de Janeiro", latitude: "-22.9711", longitude: "-43.1822", stream_type: "youtube" },
              { slug: "dubai-marina-live", title: "Dubai Marina", latitude: "25.0805", longitude: "55.1403", stream_type: "youtube" },
              { slug: "venice-grand-canal", title: "Grand Canal, Venice", latitude: "45.4381", longitude: "12.3315", stream_type: "youtube" },
              { slug: "table-mountain-cape-town", title: "Table Mountain, Cape Town", latitude: "-33.9249", longitude: "18.4241", stream_type: "youtube" },
              { slug: "hollywood-blvd-live", title: "Hollywood Blvd, Los Angeles", latitude: "34.1016", longitude: "-118.3316", stream_type: "youtube" },
              { slug: "wailing-wall-jerusalem", title: "Western Wall, Jerusalem", latitude: "31.7767", longitude: "35.2345", stream_type: "youtube" },
              { slug: "kiev-maidan-square", title: "Maidan Nezalezhnosti, Kiev", latitude: "50.4501", longitude: "30.5234", stream_type: "youtube" },
              { slug: "moscow-red-square-live", title: "Red Square area, Moscow", latitude: "55.7539", longitude: "37.6208", stream_type: "youtube" },
              { slug: "beijing-cbd-view", title: "CBD View, Beijing", latitude: "39.9042", longitude: "116.4074", stream_type: "youtube" }
            ];
          }
          global.lastWebcamsFetchTime = Date.now(); 
        }

        const toSend = global.cachedWebcams || [];
        res.end(JSON.stringify({ result: { webcams: toSend } }));
      })
      .catch(err => {
        console.error('OpenWebcamDB error:', err);
        // Fallback to cache if error
        if (global.cachedWebcams) {
          res.end(JSON.stringify({ result: { webcams: global.cachedWebcams } }));
        } else {
          // Hardcoded fallback on pure error too
          const fallback = [
            { slug: "cox-bay-surf-waves-tofino-shores", title: "Cox Bay Surf Waves, Tofino Shores", latitude: "49.1048090", longitude: "-125.8744010", stream_type: "youtube" },
            { slug: "times-square-nyc-live-cam", title: "Times Square, New York", latitude: "40.7580", longitude: "-73.9855", stream_type: "youtube" },
            { slug: "shibuya-crossing-tokyo", title: "Shibuya Crossing, Tokyo", latitude: "35.6595", longitude: "139.7005", stream_type: "youtube" },
            { slug: "abbey-road-crossing-london", title: "Abbey Road Crossing, London", latitude: "51.5321", longitude: "-0.1773", stream_type: "youtube" },
            { slug: "sydney-harbour-bridge", title: "Sydney Harbour Bridge", latitude: "-33.8523", longitude: "151.2108", stream_type: "youtube" }
          ];
          res.end(JSON.stringify({ result: { webcams: fallback } }));
        }
      });

  } else if (req.url.startsWith('/api/webcams/')) {
    // Proxy request for single webcam
    const slug = req.url.split('/').pop();
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || 'http://localhost:8888'
    });

    global.cachedStreams = global.cachedStreams || {};
    const STREAM_CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

    if (global.cachedStreams[slug] && (Date.now() - global.cachedStreams[slug].timestamp < STREAM_CACHE_TTL)) {
      return res.end(JSON.stringify({ data: global.cachedStreams[slug].data }));
    }

    const handleFallback = () => {
      // General fallback or specific fallback for Tofino or others
      let camInfo = global.cachedWebcams ? global.cachedWebcams.find(c => c.slug === slug) : null;
      
      const title = camInfo ? camInfo.title : "Live Feed";
      const lat = camInfo ? camInfo.latitude : "0";
      const lon = camInfo ? camInfo.longitude : "0";
      
      // Ensure a working fallback youtube video for testing/demo
      const fallbackStreams = {
        "cox-bay-surf-waves-tofino-shores": "https://www.youtube.com/watch?v=84dLnpdqC_U",
        "times-square-nyc-live-cam": "https://www.youtube.com/watch?v=1-iS7LArLcs",
        "shibuya-crossing-tokyo": "https://www.youtube.com/watch?v=HpdO5Kq3o7Y",
        "dubai-marina-live": "https://www.youtube.com/watch?v=yW6IuFk7V5Y"
      };
      
      // Unconditionally provide a fallback stream to avoid frontend crashes
      const streamUrl = fallbackStreams[slug] || "https://www.youtube.com/watch?v=1-iS7LArLcs";
      
      const fallbackData = {
        slug: slug,
        title: title,
        stream_type: "youtube",
        stream_url: streamUrl,
        latitude: lat,
        longitude: lon,
        country: { name: "Target Region", iso_code: "N/A" }
      };
      global.cachedStreams[slug] = { timestamp: Date.now(), data: fallbackData };
      res.end(JSON.stringify({ data: fallbackData }));
    };

    fetch(`https://openwebcamdb.com/api/v1/webcams/${slug}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': 'Bearer 95|tl7tZtBBb5pmlK43nOhh2HTK19eiXdMp7g9V5A6v07539bcd'
      }
    })
    .then(r => r.json())
    .then(data => {
      if (data && data.data) {
        global.cachedStreams[slug] = { timestamp: Date.now(), data: data.data };
        res.end(JSON.stringify(data));
      } else if (data && data.message && data.message.includes('rate limit')) {
        handleFallback();
      } else {
        res.end(JSON.stringify(data));
      }
    })
    .catch(err => {
      console.error('OpenWebcamDB individual stream error:', err);
      handleFallback();
    });
  } else if (req.url === '/api/webhook/stripe' && req.method === 'POST') {
    const stripe = require('stripe')(process.env.STRIPE_API);
    let bodyData = '';
    req.on('data', chunk => {
        bodyData += chunk.toString();
    });
    req.on('end', async () => {
        const sig = req.headers['stripe-signature'];
        let event;

        try {
            // Must strictly verify signature for production security. No fallbacks.
            if (!process.env.STRIPE_WEBHOOK_SECRET) {
                console.error('⚠ STRIPE_WEBHOOK_SECRET missing. Rejecting webhook for security.');
                res.writeHead(500);
                return res.end('Server configuration error: missing webhook secret.');
            }
            event = stripe.webhooks.constructEvent(bodyData, sig, process.env.STRIPE_WEBHOOK_SECRET);
        } catch (err) {
            console.error(`Webhook Error: ${err.message}`);
            res.writeHead(400);
            return res.end(`Webhook Error: ${err.message}`);
        }

        // Handle the checkout.session.completed event
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            
            if (session.payment_status !== 'paid' || session.amount_total !== 499) {
                console.warn(`[STRIPE] Ignored checkout session: status=${session.payment_status}, amount=${session.amount_total} (Expected paid/499)`);
                res.writeHead(200);
                return res.end(JSON.stringify({received: true}));
            }
            
            // Get the user's wallet address from client_reference_id (appended securely to URL)
            let userWallet = session.client_reference_id;
            
            // Fallback to metadata or custom fields just in case
            if (!userWallet) userWallet = session.metadata?.solana_wallet;
            
            if (!userWallet && session.custom_fields) {
               const walletField = session.custom_fields.find(f => 
                   (f.key && f.key.toUpperCase() === 'SOLANA_WALLET') || 
                   (f.label && f.label.custom && f.label.custom.toUpperCase() === 'SOLANA_WALLET')
               );
               if (walletField && walletField.text) {
                   userWallet = walletField.text.value;
               }
            }

            if (userWallet) {
                console.log(`[STRIPE] Successful $4.99 purchase by ${session.customer_details?.email}. Transferring 500 D3X to ${userWallet}`);
                
                // Execute the on-chain transfer from the main World Bank wallet
                if (worldBankKeypair) {
                    const txSig = await transferD3XOnChain(worldBankKeypair, new web3.PublicKey(userWallet), 500);
                    if (txSig && pgPool) {
                        try {
                            await pgPool.query(`UPDATE commanders SET d3x_balance = d3x_balance + 500 WHERE callsign = $1`, [userWallet]);
                        } catch(e) { console.error('DB Update error for stripe purchase:', e.message); }
                    }
                } else {
                    console.error('[STRIPE] World Bank wallet (WORLD_BANK_PVT_KEY) not configured! Cannot send 500 D3X.');
                }
            } else {
                console.warn('[STRIPE] Purchase successful, but no Solana Wallet address was provided by the user in the checkout session.');
            }
        }

        res.writeHead(200);
        res.end(JSON.stringify({received: true}));
    });
  } else if (req.url === '/api/crafting/recipes') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ recipes: CRAFTING_RECIPES }));

  } else if (req.url === '/api/treasury/status') {
    res.setHeader('Content-Type', 'application/json');
    if (!pgPool) { res.statusCode = 503; res.end(JSON.stringify({ error: 'DB unavailable' })); return; }
    (async () => {
      try {
        const [treasuryRow, bankRow, ledgerSummary] = await Promise.all([
          pgPool.query(`SELECT d3x_balance, mining_inventory FROM commanders WHERE callsign = 'TREASURY'`),
          pgPool.query(`SELECT d3x_balance FROM commanders WHERE callsign = 'WORLD BANK'`),
          pgPool.query(`SELECT flow_type, SUM(amount)::numeric AS total FROM token_ledger WHERE created_at > NOW() - INTERVAL '24 hours' GROUP BY flow_type`)
        ]);
        const flows = {};
        ledgerSummary.rows.forEach(r => { flows[r.flow_type] = parseFloat(r.total); });
        
        let treasuryMetals = {};
        if (treasuryRow.rows[0] && treasuryRow.rows[0].mining_inventory) {
            treasuryMetals = treasuryRow.rows[0].mining_inventory;
        }

        res.end(JSON.stringify({
          treasury_balance: parseInt(treasuryRow.rows[0]?.d3x_balance || 0),
          world_bank_balance: parseInt(bankRow.rows[0]?.d3x_balance || 0),
          treasury_wallet: TREASURY_WALLET,
          metals_reserves: treasuryMetals,
          last_24h_flows: flows,
          timestamp: new Date().toISOString()
        }));
      } catch(e) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })); }
    })();

  } else if (req.url === '/api/pool/participants') {
    res.setHeader('Content-Type', 'application/json');
    if (!pgPool) { res.end(JSON.stringify({ count: 0 })); return; }
    pgPool.query(`SELECT COUNT(*) FROM pool_positions WHERE active = TRUE`)
      .then(r => res.end(JSON.stringify({ count: parseInt(r.rows[0].count) })))
      .catch(e => res.end(JSON.stringify({ count: 0, error: e.message })));

  } else if (req.url.startsWith('/api/pool/position')) {
    res.setHeader('Content-Type', 'application/json');
    if (!pgPool) { res.end(JSON.stringify({})); return; }
    const urlObj = new URL(req.url, 'http://localhost');
    const wallet = urlObj.searchParams.get('wallet');
    if (!wallet) { res.statusCode = 400; res.end(JSON.stringify({ error: 'wallet required' })); return; }
    (async () => {
      try {
        const r = await pgPool.query(
          `SELECT sol_contributed, d3x_contributed, joined_at FROM pool_positions WHERE wallet = $1 AND active = TRUE`, [wallet]
        );
        if (!r.rows.length) { res.end(JSON.stringify({ active: false })); return; }
        const totalRes = await pgPool.query(`SELECT SUM(sol_contributed) AS total FROM pool_positions WHERE active = TRUE`);
        const mySOL = parseFloat(r.rows[0].sol_contributed);
        const totalSOL = parseFloat(totalRes.rows[0].total || 1);
        res.end(JSON.stringify({ ...r.rows[0], share_pct: ((mySOL / totalSOL) * 100).toFixed(4), active: true }));
      } catch(e) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })); }
    })();

  } else if (req.url === '/api/pool/join' && req.method === 'POST') {
    res.setHeader('Content-Type', 'application/json');
    if (!pgPool) { res.statusCode = 503; res.end(JSON.stringify({ error: 'DB unavailable' })); return; }
    let body = '';
    req.on('data', d => body += d);
    req.on('end', async () => {
      try {
        const { wallet, callsign, sol_amount, d3x_amount } = JSON.parse(body);
        if (!wallet || !sol_amount || !d3x_amount || sol_amount <= 0 || d3x_amount <= 0) {
          res.statusCode = 400; res.end(JSON.stringify({ error: 'wallet, sol_amount, d3x_amount required' })); return;
        }
        if (callsign) {
          const balRes = await pgPool.query(`SELECT d3x_balance FROM commanders WHERE callsign = $1`, [callsign]);
          const bal = parseInt(balRes.rows[0]?.d3x_balance || 0);
          if (bal < d3x_amount) { res.end(JSON.stringify({ success: false, error: `Need ${d3x_amount} D3X. Have ${bal}.` })); return; }
          await pgPool.query(`UPDATE commanders SET d3x_balance = d3x_balance - $1 WHERE callsign = $2`, [d3x_amount, callsign]);
          await logTokenFlow('pool_join', d3x_amount, callsign, 'POOL', `LP: ${sol_amount} SOL + ${d3x_amount} D3X`);
        }
        await pgPool.query(`
          INSERT INTO pool_positions (wallet, callsign, sol_contributed, d3x_contributed, active)
          VALUES ($1, $2, $3, $4, TRUE)
          ON CONFLICT (wallet) DO UPDATE SET
            sol_contributed = pool_positions.sol_contributed + EXCLUDED.sol_contributed,
            d3x_contributed = pool_positions.d3x_contributed + EXCLUDED.d3x_contributed,
            active = TRUE, joined_at = NOW()
        `, [wallet, callsign, sol_amount, d3x_amount]);
        console.log(`[POOL] 🏊 ${callsign || wallet} joined LP: ${sol_amount} SOL + ${d3x_amount} D3X`);
        res.end(JSON.stringify({ success: true }));
      } catch(e) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })); }
    });

  } else if (req.url === '/api/pool/withdraw' && req.method === 'POST') {
    res.setHeader('Content-Type', 'application/json');
    if (!pgPool) { res.statusCode = 503; res.end(JSON.stringify({ error: 'DB unavailable' })); return; }
    let body = '';
    req.on('data', d => body += d);
    req.on('end', async () => {
      try {
        const { wallet, callsign } = JSON.parse(body);
        if (!wallet) { res.statusCode = 400; res.end(JSON.stringify({ error: 'wallet required' })); return; }
        const existing = await pgPool.query(
          `SELECT sol_contributed, d3x_contributed, callsign FROM pool_positions WHERE wallet = $1 AND active = TRUE`, [wallet]
        );
        if (!existing.rows.length) { res.end(JSON.stringify({ success: false, error: 'No active position' })); return; }
        const pos = existing.rows[0];
        await pgPool.query(`UPDATE pool_positions SET active = FALSE WHERE wallet = $1`, [wallet]);
        const cs = callsign || pos.callsign;
        if (cs) {
          await pgPool.query(`UPDATE commanders SET d3x_balance = d3x_balance + $1 WHERE callsign = $2`, [pos.d3x_contributed, cs]);
          await logTokenFlow('pool_withdraw', pos.d3x_contributed, 'POOL', cs, `LP withdrawal ${wallet}`);
        }
        res.end(JSON.stringify({ success: true, sol_returned: parseFloat(pos.sol_contributed), d3x_returned: parseFloat(pos.d3x_contributed) }));
      } catch(e) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })); }
    });

  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});


const wss = new WebSocket.Server({ server });

// MMO Global State
let globalGameState = null;
const connectedClients = new Set();
let playerCounter = 0;
// ── Chat history is now part of globalGameState for persistence

// Database initialization and state parsing logic moved to startServer() at the bottom

function broadcast(msg, excludeWs = null) {
  const data = JSON.stringify(msg);
  connectedClients.forEach(client => {
    if (client.ws !== excludeWs && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  });
}

function broadcastAll(msg) {
  broadcast(msg, null);
}

function initWebSockets() {
  wss.on('connection', ws => {
  playerCounter++;
  const client = { ws, id: playerCounter, name: `Commander ${playerCounter}`, isHost: false };
  connectedClients.add(client);
  
  if (connectedClients.size === 1) {
    client.isHost = true; // First person in handles AI ticks if needed by frontend
  }

  console.log(`${client.name} joined. Total Commanders: ${connectedClients.size}`);

  // Initialize chatHistory array if this is a fresh state or old state missed it
  const currentChatHistory = globalGameState ? (globalGameState.chatHistory || []) : [];

  // Auto-send the current global state (or lack thereof) to the new player
  ws.send(JSON.stringify({ 
    type: 'saved_state', 
    gameState: globalGameState,
    isHost: client.isHost,
    chatHistory: currentChatHistory
  }));
  
  // Notify others
  broadcast({
    type: 'player_joined',
    name: client.name,
    totalPlayers: connectedClients.size
  }, ws);

  const isMockAllowed = process.env.MOCK_VALUES !== 'n' && process.env.MOCK_VALUES !== 'N';
  // Immediately send cached AI balances
  ws.send(JSON.stringify({
    type: 'ai_d3x_balances',
    gemini: cachedGeminiBalance || (isMockAllowed ? 100000000 : 0),
    claude: cachedClaudeBalance || (isMockAllowed ? 100000000 : 0),
    geminiWallet: cachedGeminiWallet,
    claudeWallet: cachedClaudeWallet
  }));

  // Send initial AI Health State directly from DB so the HUD syncs immediately
  if (pgPool) {
    pgPool.query("SELECT gemini_hp, claude_hp FROM ai_combat_state WHERE id = 1").then(res => {
      if (res.rows.length > 0) {
        ws.send(JSON.stringify({
          type: 'ai_combat_log',
          log: 'Establishing secure link to AI datacenters...',
          gemini_hp: res.rows[0].gemini_hp,
          claude_hp: res.rows[0].claude_hp
        }));
      }
    }).catch(console.warn);
  }

  let messageCount = 0;
  let lastMessageTime = Date.now();

  ws.on('message', async raw => {
    // Basic Rate Limiter (Max 20 messages per second, or it will drop them)
    const now = Date.now();
    if (now - lastMessageTime > 1000) {
        messageCount = 0;
        lastMessageTime = now;
    }
    messageCount++;
    if (messageCount > 20) {
        console.warn(`[RATE LIMIT] Dropping messages from ${client.name}. Spam detected.`);
        return;
    }

    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {

      case 'rename': {
        client.name = msg.name || client.name;
        break;
      }

      case 'google_auth': {
        const token = msg.credential;
        if (!token) break;
        try {
          // Verify Google JWT
          const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID
          });
          const payload = ticket.getPayload();
          
          client.name = payload.name; // Apply the real Google name
          client.email = payload.email;
          client.picture = payload.picture;

          let attacks = 0;
          let damage = 0;
          let miningInventory = {};
          let isNewWallet = false;
          let publicWallet = null;
          let privateWalletHex = null;

          if (pgPool) {
            // Check if user already exists to retrieve their solana profile
            const checkRes = await pgPool.query('SELECT solana_wallet_address, solana_private_key FROM commanders WHERE callsign = $1', [client.name]);
            
            if (checkRes.rows.length === 0 || !checkRes.rows[0].solana_wallet_address) {
              // Generate new Solana Wallet
              const newPair = solanaWeb3.Keypair.generate();
              publicWallet = newPair.publicKey.toBase58();
              privateWalletHex = Buffer.from(newPair.secretKey).toString('hex');
              isNewWallet = true;
            } else {
              publicWallet = checkRes.rows[0].solana_wallet_address;
              privateWalletHex = checkRes.rows[0].solana_private_key;
            }

            // Upsert into our commanders database and RETURNING stats
            const res = await pgPool.query(`
              INSERT INTO commanders (callsign, email, picture_url, last_seen, solana_wallet_address, solana_private_key) 
              VALUES ($1, $2, $3, NOW(), $4, $5) 
              ON CONFLICT (callsign) DO UPDATE 
              SET email = EXCLUDED.email, picture_url = EXCLUDED.picture_url, last_seen = NOW(),
                  solana_wallet_address = COALESCE(commanders.solana_wallet_address, EXCLUDED.solana_wallet_address),
                  solana_private_key = COALESCE(commanders.solana_private_key, EXCLUDED.solana_private_key)
              RETURNING attacks, damage, mining_inventory
            `, [client.name, client.email, client.picture, publicWallet, privateWalletHex]);
            
            if (res.rows.length > 0) {
              attacks = res.rows[0].attacks || 0;
              damage = res.rows[0].damage || 0;
              miningInventory = res.rows[0].mining_inventory || {};
            }
          }

          console.log(`✓ Google Auth Success: ${client.name} (${client.email}) connected. Wallet: ${publicWallet || 'N/A'}`);
          
          ws.send(JSON.stringify({ 
            type: 'google_auth_success', 
            name: client.name,
            picture: client.picture,
            stats: { attacks, damage, mining_inventory: miningInventory },
            wallet: {
                publicKey: publicWallet,
                isNew: isNewWallet
            }
          }));
          
          // Notify the room that this user was renamed/joined as someone else
          broadcast({
            type: 'player_joined',
            name: client.name,
            totalPlayers: connectedClients.size
          }, ws);

        } catch (err) {
          console.error('⚠ Google Auth Failed:', err.message);
          ws.send(JSON.stringify({ type: 'error', msg: 'Google Authentication failed.' }));
        }
        break;
      }

      case 'company_hack': {
        const callsign = client.name; // Enforce authenticated session identity
        const companyName = msg.companyName || 'Unknown Corp';

        // Calculate success and reward entirely server-side (e.g. 40% win rate, 50-150 reward)
        const success = Math.random() < 0.40;
        const reward = success ? Math.floor(Math.random() * 101) + 50 : 0;

        GameLogger.hack(callsign, companyName, success, { reward });

        if (success) {
            // If successful, update commander's D3X balance
            if (pgPool) {
                try {
                    await pgPool.query(`UPDATE commanders SET d3x_balance = d3x_balance + $1 WHERE callsign = $2`, [reward, callsign]);
                    console.log(`[HACK] Commander ${callsign} successfully hacked ${companyName} and gained ${reward} D3X.`);
                    ws.send(JSON.stringify({ type: 'hack_success', reward: reward }));
                } catch (e) {
                    console.error('DB Error on company_hack:', e.message);
                }
            }
        } else {
            console.log(`[HACK] Commander ${callsign} failed to hack ${companyName}.`);
            ws.send(JSON.stringify({ type: 'hack_failed' }));
        }
        break;
      }

      case 'solana_auth': {
        const address = msg.address;
        if (!address) break;
        
        // Use truncated address as a generic callsign
        client.name = `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
        client.wallet = address; // Keep true address mapped to connection
        client.connectedAt = Date.now(); // Start connection timer for D3X daily drops
        client.d3xClaimedSession = false; // Flag to prevent redundant DB querying
        
        let attacks = 0;
        let damage = 0;
        let miningInventory = {};
        if (pgPool) {
          try {
            // Upsert into our commanders database (Use wallet as callsign/identity)
            const res = await pgPool.query(`
              INSERT INTO commanders (callsign, last_seen) 
              VALUES ($1, NOW()) 
              ON CONFLICT (callsign) DO UPDATE 
              SET last_seen = NOW()
              RETURNING attacks, damage, mining_inventory
            `, [client.name]);
            
            if (res.rows.length > 0) {
              attacks = res.rows[0].attacks || 0;
              damage = res.rows[0].damage || 0;
              miningInventory = res.rows[0].mining_inventory || {};
            }
          } catch(dbErr) {
            console.error('⚠ Solana Auth DB Error:', dbErr.message);
          }
        }

        console.log(`✓ Solana Auth Success: ${client.name} connected.`);
        
        ws.send(JSON.stringify({ 
          type: 'google_auth_success', // Re-use same success event handler on frontend
          name: client.name,
          picture: null,          
          stats: { attacks, damage, mining_inventory: miningInventory }
        }));
        
        broadcast({
          type: 'player_joined',
          name: client.name,
          totalPlayers: connectedClients.size
        }, ws);
        
        // Initial trigger potential daily token drop (skip here, handled by 10-min interval now)
        // processDailyTokenDrop(client.name, client.wallet);
        
        break;
      }
      
      case 'mountain_dig_complete': {
        if (!client.name || !pgPool) break;
        
        // Anti-Spam: Server-side cooldown (4.5s minimum to match 5s frontend animation)
        const now = Date.now();
        if (client.lastMountainDig && (now - client.lastMountainDig < 4500)) {
            console.warn(`[SECURITY] Anti-cheat: Commander ${client.name} digging mountains too fast!`);
            break; 
        }
        client.lastMountainDig = now;

        try {
            // RNG Rolls
            const rand = Math.random();
            const resources = {
                iron: 0, copper: 0, gold: 0, silver: 0, 
                coal: 0, titanium: 0, lithium: 0, rare_earth: 0
            };
            
            // Base common drops (always drop some)
            resources.iron = Math.floor(Math.random() * 5) + 1;
            resources.coal = Math.floor(Math.random() * 6) + 1;
            
            // Uncommon
            if (rand < 0.6) resources.copper = Math.floor(Math.random() * 3) + 1;
            if (rand < 0.3) resources.silver = Math.floor(Math.random() * 3) + 1;
            if (rand < 0.15) resources.gold = Math.floor(Math.random() * 2) + 1;
            
            // Rare
            if (rand < 0.08) resources.titanium = Math.floor(Math.random() * 2) + 1;
            if (rand < 0.04) resources.lithium = 1;
            if (rand < 0.01) resources.rare_earth = 1;

            let inv = { iron: 0, copper: 0, gold: 0, silver: 0, coal: 0, titanium: 0, lithium: 0, rare_earth: 0 };
            
            const res = await pgPool.query(`SELECT mining_inventory FROM commanders WHERE callsign = $1`, [client.name]);
            if (res.rows.length > 0) {
                inv = res.rows[0].mining_inventory || inv;
                
                // Merge new resources into total inventory
                Object.keys(resources).forEach(k => {
                    inv[k] = (inv[k] || 0) + resources[k];
                });
                
                // Persist
                await pgPool.query(`UPDATE commanders SET mining_inventory = $1 WHERE callsign = $2`, [inv, client.name]);
            }
            
            // Always return result so the UI unfreezes
            ws.send(JSON.stringify({ type: 'mountain_dig_result', items: resources, inventory: inv }));
            
        } catch(e) {
            console.error('Mountain Dig Error:', e);
        }
        break;
      }

      case 'request_loan': {
        const walletAddr = client.wallet; // Enforce authenticated session identity
        const collateral = parseInt(msg.collateral);
        if (!walletAddr || !pgPool) break;
        
        const validCollaterals = [5000, 10000, 20000];
        if (!validCollaterals.includes(collateral)) {
            ws.send(JSON.stringify({ type: 'loan_error', msg: 'Invalid collateral amount. Must be 5000, 10000, or 20000 D3X.' }));
            break;
        }
        
        try {
            const res = await pgPool.query(`SELECT d3x_balance, portfolio FROM commanders WHERE callsign = $1`, [walletAddr]);
            if (res.rows.length > 0) {
                let currentBalance = res.rows[0].d3x_balance || 0;
                let portfolio = res.rows[0].portfolio || {};
                
                if (currentBalance < collateral) {
                    ws.send(JSON.stringify({ type: 'loan_error', msg: 'Insufficient D3X balance for collateral.' }));
                    break;
                }
                if (portfolio.active_loan) {
                    ws.send(JSON.stringify({ type: 'loan_error', msg: 'You already have an active loan. Repay it first.' }));
                    break;
                }
                
                let ltv = 0.50; // default to 50%
                if (collateral === 5000) ltv = 0.50;
                else if (collateral === 10000) ltv = 0.52;
                else if (collateral === 20000) ltv = 0.54;
                else if (collateral === 50000) ltv = 0.56;
                else if (collateral === 100000) ltv = 0.58;
                else if (collateral === 200000) ltv = 0.59;
                else if (collateral === 500000) ltv = 0.60;
                
                const borrowedAmount = Math.floor(collateral * ltv);
                
                // Subtract collateral and add borrowed amount = net change
                const netBalanceChange = borrowedAmount - collateral;
                
                portfolio.active_loan = {
                    collateral: collateral,
                    borrowed: borrowedAmount,
                    timestamp: Date.now()
                };
                
                await pgPool.query(`UPDATE commanders SET d3x_balance = d3x_balance + $1, portfolio = $2 WHERE callsign = $3`, [netBalanceChange, portfolio, walletAddr]);
                console.log(`[BANK] ${walletAddr} took loan: ${borrowedAmount} D3X (Collateral: ${collateral} D3X)`);
                
                ws.send(JSON.stringify({ type: 'loan_success', borrowed: borrowedAmount, collateral: collateral }));
            }
        } catch(e) {
            console.error('request_loan error:', e.message);
        }
        break;
      }

      case 'repay_loan': {
        const walletAddr = client.wallet; // Enforce authenticated session identity
        const repayment = parseInt(msg.repayment);
        if (!walletAddr || !pgPool) break;
        
        try {
            const res = await pgPool.query(`SELECT d3x_balance, portfolio FROM commanders WHERE callsign = $1`, [walletAddr]);
            if (res.rows.length > 0) {
                let currentBalance = res.rows[0].d3x_balance || 0;
                let portfolio = res.rows[0].portfolio || {};
                
                if (!portfolio.active_loan) {
                    ws.send(JSON.stringify({ type: 'loan_error', msg: 'You do not have an active loan.' }));
                    break;
                }
                
                if (repayment !== portfolio.active_loan.borrowed) {
                    ws.send(JSON.stringify({ type: 'loan_error', msg: `You must repay EXACTLY the borrowed amount (${portfolio.active_loan.borrowed} D3X).` }));
                    break;
                }
                
                if (currentBalance < repayment) {
                    ws.send(JSON.stringify({ type: 'loan_error', msg: 'Insufficient D3X balance to repay loan.' }));
                    break;
                }
                
                const collateralToReturn = portfolio.active_loan.collateral;
                
                // Subtract repayment, add collateral back = net change
                const netBalanceChange = collateralToReturn - repayment;
                
                delete portfolio.active_loan;
                
                await pgPool.query(`UPDATE commanders SET d3x_balance = d3x_balance + $1, portfolio = $2 WHERE callsign = $3`, [netBalanceChange, portfolio, walletAddr]);
                console.log(`[BANK] ${walletAddr} repaid loan of ${repayment} D3X. Returned ${collateralToReturn} D3X collateral.`);
                
                ws.send(JSON.stringify({ type: 'loan_repaid_success', returned: collateralToReturn }));
            }
        } catch(e) {
            console.error('repay_loan error:', e.message);
        }
        break;
      }
      case 'get_world_bank_stats': {
          if (!pgPool) break;
          try {
              const res = await pgPool.query(`SELECT d3x_balance, portfolio FROM commanders WHERE callsign = 'WORLD BANK'`);
              const row = res.rows[0];
              const portfolio = row.portfolio || {};
              ws.send(JSON.stringify({
                  type: 'world_bank_stats',
                  d3x: row.d3x_balance || 0,
                  portfolio: portfolio,
                  activeLoan: portfolio.active_loan || null,
                  commodities: portfolio.commodities || {}
              }));
          } catch(e) {
              console.error('get_world_bank_stats DB Error:', e.message);
          }
          break;
      }
      
      case 'get_full_log': {
          if (!pgPool) break;
          try {
              const res = await pgPool.query(`SELECT timestamp, actor, event_type, target, action_details FROM game_events_log ORDER BY timestamp DESC LIMIT 500`);
              ws.send(JSON.stringify({ type: 'full_log_data', logs: res.rows }));
          } catch(e) {
              console.error('get_full_log DB Error:', e.message);
          }
          break;
      }
      
      case 'get_my_d3x_balance': {
          const walletAddr = client.wallet; // Enforce authenticated session identity
          if (!walletAddr) break;
          
          let liveOnChainBal = 0;
          try {
              const pub = new web3.PublicKey(walletAddr);
              const ta = await splToken.getAssociatedTokenAddress(D3X_MINT_ADDRESS, pub);
              const info = await solanaConnection.getTokenAccountBalance(ta);
              liveOnChainBal = info.value.uiAmount || 0;
          } catch(e) {
              // Usually means token account doesn't exist yet
              liveOnChainBal = 0;
          }

          // Merge live Solana deposits into the internal game ledger
          try {
              if (pgPool) {
                  const res = await pgPool.query(`SELECT d3x_balance, portfolio FROM commanders WHERE callsign = $1`, [walletAddr]);
                  if (res.rows.length > 0) {
                      let port = res.rows[0].portfolio || {};
                      let currentD3XBalance = parseInt(res.rows[0].d3x_balance || 0, 10);
                      
                      // If portfolio has no lastKnown, we assume their current on-chain balance is their starting point.
                      let lastKnown = port.lastKnownOnChainBalance !== undefined ? port.lastKnownOnChainBalance : liveOnChainBal;
                      let localLedger = currentD3XBalance;
                      
                      // If the user acquired MORE tokens on-chain since last save, add the difference to their buying power
                      if (liveOnChainBal > lastKnown) {
                          localLedger += (liveOnChainBal - lastKnown);
                      } else if (liveOnChainBal < lastKnown) {
                          // If they withdrew on-chain, subtract buying power (clamp to 0)
                          localLedger = Math.max(0, localLedger - (lastKnown - liveOnChainBal));
                      }
                      
                      // Auto-update the portfolio with the newly synced tracking watermark
                      port.lastKnownOnChainBalance = liveOnChainBal;
                      delete port.localD3XBalance; // Clean it up if it persists
                      await pgPool.query(`UPDATE commanders SET portfolio = $1, d3x_balance = $2 WHERE callsign = $3`, [port, currentD3XBalance, walletAddr]);
                      
                      ws.send(JSON.stringify({ type: 'my_d3x_balance', amount: currentD3XBalance, activeLoan: port.active_loan || null }));
                      break; 
                  }
              }
          } catch(e) {
              console.error('get_my_d3x_balance DB Error:', e.message);
          }
          
          // Fallback if no portfolio exists yet
          ws.send(JSON.stringify({ type: 'my_d3x_balance', amount: liveOnChainBal, activeLoan: null }));
          
          break;
      }

      case 'start_game': {
        // Prevent clearing existing world if already active (ensure states are truly active, not just dummy chat shells)
        if (globalGameState && globalGameState.countries && Object.keys(globalGameState.countries).length > 0) {
           console.log('⚠ Rejected start_game — world is already active');
           ws.send(JSON.stringify({ type: 'error', msg: 'World already exists' }));
           break;
        }
        
        // Preserve any pre-existing chat or stakes that happened in the lobby before start
        const existingChat = globalGameState ? globalGameState.chatHistory : [];
        const existingStakes = globalGameState ? globalGameState.stakes : [];
        
        globalGameState = msg.gameState;
        
        if (existingChat && existingChat.length > 0) globalGameState.chatHistory = existingChat;
        if (existingStakes && existingStakes.length > 0) globalGameState.stakes = existingStakes;
        
        saveGameState(globalGameState);
        broadcastAll({ type: 'game_start', gameState: globalGameState });
        break;
      }

      case 'state_update': {
        if (!client.isHost) {
            console.warn(`[SECURITY] Unauthorized state_update attempt from non-host ${client.name}`);
            ws.send(JSON.stringify({ type: 'error', msg: 'Unauthorized: Only the host can update global state.' }));
            break;
        }
        // Full state sync — save to DB and relay to other players immediately
        globalGameState = msg.gameState;
        saveGameState(globalGameState);
        broadcast({
          type: 'state_update',
          gameState: globalGameState
        }, ws);
        break;
      }
      
      case 'ai_log': {
        // Relay Rainclaude reasoning to all clients
        broadcast({
          type: 'ai_log',
          msg: msg.msg
        }, ws);
        break;
      }

      case 'get_saved_state': {
        // Redundant, but just in case they ask again
        ws.send(JSON.stringify({ type: 'saved_state', gameState: globalGameState, isHost: client.isHost }));
        break;
      }

      case 'chat': {
        const chatObj = { name: client.name, text: msg.text };
        
        // Ensure globalGameState and chat array exist
        if (!globalGameState) {
          globalGameState = { players: [], countries: {}, turn: 0, turnCount: 1, phase: 'REINFORCE', activePlayerIndex: 0 };
        }
        if (!globalGameState.chatHistory) {
          globalGameState.chatHistory = [];
        }
        
        globalGameState.chatHistory.push(chatObj);
        // Keep last 100 messages total
        if (globalGameState.chatHistory.length > 100) {
          globalGameState.chatHistory.shift();
        }
        
        // Save state immediately to persist chat
        saveGameState(globalGameState);
        
        broadcastAll({
          type: 'chat',
          name: chatObj.name,
          text: chatObj.text
        });
        break;
      }

      case 'drone_control': {
        // Broadcast API control target to all clients to sync the Blue drone swarm
        broadcastAll({
          type: 'drone_control',
          faction: msg.faction,
          targetPos: msg.targetPos
        });
        break;
      }

      case 'get_players': {
        ws.send(JSON.stringify({
          type: 'player_list',
          players: Array.from(connectedClients).map(c => ({ name: c.name }))
        }));
        break;
      }

      case 'get_commander_stats': {
        const callsign = msg.callsign;
        if (!pgPool || !callsign) return;
        try {
          // Upsert commander record
          let res = await pgPool.query(`
            INSERT INTO commanders (callsign, last_seen) 
            VALUES ($1, NOW()) 
            ON CONFLICT (callsign) DO UPDATE SET last_seen = NOW() 
            RETURNING attacks, damage, portfolio
          `, [callsign]);
          
          ws.send(JSON.stringify({
            type: 'commander_stats',
            stats: { attacks: res.rows[0].attacks, damage: parseInt(res.rows[0].damage) }
          }));
          
          // If the user has a saved portfolio, send it over
          if (res.rows[0].portfolio) {
              ws.send(JSON.stringify({
                  type: 'portfolio_data',
                  data: res.rows[0].portfolio
              }));
          }
          
          ws.send(JSON.stringify({
            type: 'commander_stats',
            stats: { attacks: res.rows[0].attacks, damage: parseInt(res.rows[0].damage) }
          }));
        } catch (err) {
          console.error('DB Error on get_commander_stats:', err.message);
        }
        break;
      }

      case 'ai_market_buy': {
        if (!pgPool) return;
        const aiName = msg.aiName; // 'gemini' or 'claude'
        const cost = msg.cost;
        const itemType = msg.itemType || 'market_resource';
        console.log(`[AI Market Buy] ${aiName} purchased ${itemType} for ${cost} D3X`);
        // LOG EVENT
        GameLogger.trade(aiName, itemType, 1, cost, 'D3X');
        
        if (!aiName || !cost || cost <= 0) return;
        
        let fromWallet = 'NOT_SET';
        if (aiName === 'gemini' && geminiKeypair) fromWallet = geminiKeypair.publicKey.toBase58();
        else if (aiName === 'gemini' && process.env.gemini_wallet) fromWallet = process.env.gemini_wallet;
        else if (aiName === 'claude' && rainclaudeKeypair) fromWallet = rainclaudeKeypair.publicKey.toBase58();
        else if (aiName === 'claude' && process.env.RAINCLAUDE_SOLANA_WALLET) fromWallet = process.env.RAINCLAUDE_SOLANA_WALLET;
        else if (aiName === 'world_bank' && worldBankKeypair) fromWallet = worldBankKeypair.publicKey.toBase58();
        else if (aiName === 'world_bank' && process.env.WORLD_BANK_WALLET) fromWallet = process.env.WORLD_BANK_WALLET;
        
        if (fromWallet !== 'NOT_SET' && aiName !== 'world_bank') {
          try {
            await pgPool.query(`
              INSERT INTO pending_settlements (from_wallet, to_wallet, amount, reason) 
              VALUES ($1, $2, $3, $4)
            `, [fromWallet, BURN_ADDRESS.toBase58(), cost, `market_buy_${itemType}`]);
            console.log(`[AI MARKET] Logged spend of ${cost} D3X by ${aiName} for ${itemType}.`);
          } catch (err) {
            console.error('[AI MARKET] DB Error:', err.message);
          }
        }
        break;
      }


      case 'datacenter_stake': {
        const callsign = client.name; // Enforce authenticated session identity
        const plan = msg.plan;
        const amount = msg.amount || 100;
        if (!callsign) break;
        
        GameLogger.generic(callsign, `Staked ${amount} D3X in datacenter ${plan}`);

        if (!globalGameState) {
          globalGameState = { players: [], countries: {}, turn: 0, turnCount: 1, phase: 'REINFORCE', activePlayerIndex: 0 };
        }
        if (!globalGameState.stakes) {
          globalGameState.stakes = [];
        }
        
        let validToStake = false;
        if (pgPool) {
            try {
                const res = await pgPool.query('SELECT d3x_balance FROM commanders WHERE callsign = $1', [callsign]);
                if (res.rows.length > 0) {
                    let bal = parseInt(res.rows[0].d3x_balance || 0, 10);
                    if (bal >= amount) {
                        // Deduct from ledger
                        await pgPool.query('UPDATE commanders SET d3x_balance = d3x_balance - $1 WHERE callsign = $2', [amount, callsign]);
                        validToStake = true;
                    } else {
                        ws.send(JSON.stringify({ type: 'stake_failed', reason: 'Insufficient D3X balance.' }));
                        break;
                    }
                } else {
                    ws.send(JSON.stringify({ type: 'stake_failed', reason: 'Commander profile not found.' }));
                    break;
                }
            } catch (err) {
                console.error('DB Error protecting stake:', err.message);
                break;
            }
        }
        if (!validToStake) break;
        
        // Dynamic APY check
        const TOTAL_D3X_SUPPLY = 1000000;
        let currentTotalStaked = 0;
        globalGameState.stakes.forEach(s => currentTotalStaked += s.amountStaked);
        
        let apyModifier = 1.0;
        if ((currentTotalStaked + amount) / TOTAL_D3X_SUPPLY > 0.40) {
            apyModifier = 0.5; // Halve the rewards if over 40% supply staked
            console.log(`[STAKE] Global stake exceeds 40% supply! Applying 0.5x APY modifier.`);
        }

        // Define unlocks based on plan
        let unlockTime = Date.now();
        let baseYield = 0;
        
        if (plan === 'coolant') {
            unlockTime += (1 * 24 * 60 * 60 * 1000); // 1 Day
            baseYield = 0.016;
        } else if (plan === 'surge') {
            unlockTime += (30 * 24 * 60 * 60 * 1000); // 1 Month ~ 30 days
            baseYield = 0.75;
        } else if (plan === 'fortress') {
            unlockTime += (365 * 24 * 60 * 60 * 1000); // 1 Year
            baseYield = 12.0;
        } else {
            // fallback logic
            unlockTime += (6 * 60 * 60 * 1000); // 6 hours
            baseYield = 2.0; 
        }

        // Apply Synergy Bonus (check if they have the other 2 types already staked)
        const myStakes = globalGameState.stakes.filter(s => s.callsign === callsign);
        const hasCoolant = myStakes.some(s => s.plan === 'coolant') || plan === 'coolant';
        const hasSurge = myStakes.some(s => s.plan === 'surge') || plan === 'surge';
        const hasFortress = myStakes.some(s => s.plan === 'fortress') || plan === 'fortress';
        
        let synergyMultiplier = 1.0;
        if (hasCoolant && hasSurge && hasFortress) {
            synergyMultiplier = 1.1;
            console.log(`[STAKE] Commander ${callsign} achieved Triple-Stake Synergy (+10%).`);
        }
        
        // Apply Active Play Boost (check DB for attacks)
        let activePlayMultiplier = 1.0;
        if (pgPool) {
            try {
                const res = await pgPool.query('SELECT attacks FROM commanders WHERE callsign = $1', [callsign]);
                if (res.rows.length > 0 && res.rows[0].attacks > 0) {
                    activePlayMultiplier = 1.2;
                    console.log(`[STAKE] Commander ${callsign} achieved Active Play Boost (+20%).`);
                }
            } catch (err) {
                console.error('DB Error checking attacks for active play boost');
            }
        }
        
        const finalYield = baseYield * apyModifier * synergyMultiplier * activePlayMultiplier;
        const amountReturn = amount + finalYield;
        
        globalGameState.stakes.push({
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            callsign: callsign,
            plan: plan,
            amountStaked: amount,
            amountReturn: amountReturn,
            unlockAt: unlockTime
        });
        
        saveGameState(globalGameState);
        console.log(`[STAKE] Commander ${callsign} staked ${amount} D3X via ${plan}. Yield: +${finalYield.toFixed(2)} D3X.`);
        
        // Auto-refresh their stakes
        ws.send(JSON.stringify({ 
            type: 'active_stakes', 
            stakes: globalGameState.stakes.filter(s => s.callsign === callsign) 
        }));
        break;
      }

      case 'get_active_stakes': {
        const callsign = msg.callsign;
        if (!callsign || !globalGameState || !globalGameState.stakes) break;
        ws.send(JSON.stringify({ 
            type: 'active_stakes', 
            stakes: globalGameState.stakes.filter(s => s.callsign === callsign) 
        }));
        break;
      }
      
      case 'early_unstake': {
        const callsign = client.name; // Enforce authenticated session identity
        const stakeId = msg.stakeId;
        if (!callsign || !stakeId || !globalGameState || !globalGameState.stakes) break;
        
        const stakeIdx = globalGameState.stakes.findIndex(s => s.id === stakeId && s.callsign === callsign);
        if (stakeIdx >= 0) {
            const stake = globalGameState.stakes[stakeIdx];
            // Penalty: lose all yields, and lose 10% of principal
            const returnedPrincipal = stake.amountStaked * 0.90;
            globalGameState.stakes.splice(stakeIdx, 1);
            saveGameState(globalGameState);
            
            if (pgPool) {
                try {
                    await pgPool.query(`UPDATE commanders SET d3x_balance = d3x_balance + $1 WHERE callsign = $2`, [returnedPrincipal, callsign]);
                } catch(e) {
                    console.error('DB Error refunding early unstake:', e.message);
                }
            }
            
            console.log(`[STAKE] Commander ${callsign} early unstaked ${stake.plan}. Penalty applied. Returned ${returnedPrincipal} D3X.`);
            ws.send(JSON.stringify({
               type: 'early_unstake_success',
               refundAmt: returnedPrincipal
            }));
            
            // Auto-refresh their stakes
            ws.send(JSON.stringify({ 
                type: 'active_stakes', 
                stakes: globalGameState.stakes.filter(s => s.callsign === callsign) 
            }));
        }
        break;
      }

      case 'toggle_autoreinvest': {
        client.autoReinvest = msg.active;
        break;
      }

      case 'reinvest_earnings': {
        const callsign = client.name; // Enforce authenticated session identity
        if (!pgPool || !callsign || !globalGameState) break;

        try {
            const res = await pgPool.query(`SELECT pending_d3x FROM commanders WHERE callsign = $1`, [callsign]);
            if (res.rows.length > 0) {
                const pending = res.rows[0].pending_d3x;
                if (pending >= 10) { // arbitrary minimum
                    // Deduct from DB
                    await pgPool.query(`UPDATE commanders SET pending_d3x = 0 WHERE callsign = $1`, [callsign]);
                    
                    if (!globalGameState.stakes) globalGameState.stakes = [];
                    
                    // 7-day lock, 10% yield
                    const amount = pending;
                    const finalYield = amount * 0.10; 
                    const unlockTime = Date.now() + (7 * 24 * 60 * 60 * 1000); 

                    globalGameState.stakes.push({
                        id: Date.now() + Math.random().toString(36).substr(2, 9),
                        callsign: callsign,
                        plan: 'reinvest',
                        amountStaked: amount,
                        amountReturn: amount + finalYield,
                        unlockAt: unlockTime
                    });
                    
                    saveGameState(globalGameState);
                    console.log(`[REINVEST] Commander ${callsign} reinvested ${amount} D3X.`);
                    
                    // Auto-refresh stakes
                    ws.send(JSON.stringify({ 
                        type: 'active_stakes', 
                        stakes: globalGameState.stakes.filter(s => s.callsign === callsign) 
                    }));
                    ws.send(JSON.stringify({ type: 'reinvest_success', amount: amount }));
                } else {
                    ws.send(JSON.stringify({ type: 'reinvest_failed', reason: 'Minimum 10 D3X to reinvest' }));
                }
            }
        } catch (err) {
            console.error('DB Error on reinvest_earnings:', err.message);
        }
        break;
      }

      case 'get_leaderboard': {
        if (pgPool) {
          try {
            const res = await pgPool.query(`
              SELECT callsign, attacks, damage 
              FROM commanders 
              ORDER BY damage DESC, attacks DESC 
              LIMIT 100
            `);
            ws.send(JSON.stringify({ type: 'leaderboard_data', data: res.rows }));
          } catch(err) {
            console.error('DB Error on get_leaderboard:', err.message);
            ws.send(JSON.stringify({ type: 'leaderboard_data', data: [] }));
          }
        } else {
             // Fallback for local development without Postgres
             ws.send(JSON.stringify({ type: 'leaderboard_data', data: [] }));
        }
        break;
      }

      case 'record_attack': {
        const callsign = client.name; // Enforce authenticated session identity
        const targetCountry = msg.targetCountry; 
        
        // Strict server-side validation/clamping of damage output (e.g. max 5000 per strike)
        let damage = parseInt(msg.damage) || 0;
        if (damage < 0) damage = 0;
        if (damage > 5000) damage = 5000;
        
        const success = msg.success === true;
        
        GameLogger.combat(callsign, targetCountry, 'STRIKE', { from: callsign, success, damageDealt: damage });

        if (!pgPool || !callsign) return;
        try {
          let res = await pgPool.query(`
            UPDATE commanders 
            SET attacks = attacks + 1, damage = damage + $2, last_seen = NOW()
            WHERE callsign = $1
            RETURNING attacks, damage
          `, [callsign, damage]);
          
          if (res.rowCount > 0) {
            ws.send(JSON.stringify({
              type: 'commander_stats',
              stats: { attacks: res.rows[0].attacks, damage: parseInt(res.rows[0].damage) }
            }));
          }
        } catch (err) {
          console.error('DB Error on record_attack:', err.message);
        }
        break;
      }

      case 'human_combat_support': {
        const target = msg.target; // 'gemini' or 'claude'
        
        // Sanitize impact amount statically to prevent DB inflation cheating
        let amount = parseInt(msg.amount) || 50;
        if (amount < 0) amount = 0;
        if (amount > 100) amount = 100;
        
        const COMBAT_ENTRY_FEE = 20; // D3X required to take a combat action
        if (!pgPool) return;
        try {
          // Check player can afford the combat fee
          const feeRes = await pgPool.query(
            `SELECT d3x_balance FROM commanders WHERE callsign = $1`, [client.name]
          );
          const balance = parseInt(feeRes.rows[0]?.d3x_balance || 0, 10);
          if (balance < COMBAT_ENTRY_FEE) {
            ws.send(JSON.stringify({ type: 'error', msg: `Combat costs ${COMBAT_ENTRY_FEE} D3X. You have ${balance}.` }));
            break;
          }

          // Deduct fee from player
          await pgPool.query(
            `UPDATE commanders SET d3x_balance = d3x_balance - $1 WHERE callsign = $2`,
            [COMBAT_ENTRY_FEE, client.name]
          );
          // Route through economy split
          await splitEconomyFlow(COMBAT_ENTRY_FEE, client.name, `Combat action entry fee — target: ${target}`);

          // Apply the combat effect
          if (target === 'gemini') {
            await pgPool.query("UPDATE ai_combat_state SET gemini_hp = gemini_hp + $1 WHERE id = 1", [amount]);
            console.log(`[HUMAN SUPPORT] ${client.name} healed Gemini (+${amount} HP). Fee: ${COMBAT_ENTRY_FEE} D3X.`);
          } else if (target === 'claude') {
            await pgPool.query("UPDATE ai_combat_state SET claude_hp = claude_hp - $1 WHERE id = 1", [amount]);
            console.log(`[HUMAN SUPPORT] ${client.name} attacked Rainclaude (-${amount} HP). Fee: ${COMBAT_ENTRY_FEE} D3X.`);
          }

          ws.send(JSON.stringify({ type: 'combat_fee_paid', fee: COMBAT_ENTRY_FEE, target }));
        } catch (e) {
          console.error('DB Error on human_combat_support:', e.message);
        }
        break;
      }
      
      case 'process_mine_click': {
        const callsign = client.name; // Enforce authenticated session identity
        const mineId = msg.mineId;
        if (!callsign || !mineId) break;

        if (!globalGameState.digStates) globalGameState.digStates = {};
        if (!globalGameState.digStates[callsign]) globalGameState.digStates[callsign] = {};
        if (!pgPool) break;

        try {
            // Read D3X balance and mining inventory
            const res = await pgPool.query(
                `SELECT d3x_balance, mining_inventory FROM commanders WHERE callsign = $1`, [callsign]
            );
            if (res.rows.length === 0) break;

            const currentBal  = parseInt(res.rows[0].d3x_balance || 0, 10);
            const inv         = res.rows[0].mining_inventory || {};

            // Cost: 2-4 D3X as rig fuel (this is BURNED via splitEconomyFlow)
            const fuelCost = Math.floor(Math.random() * 3) + 2;

            if (currentBal < fuelCost) {
                ws.send(JSON.stringify({ type: 'error', msg: `Need ${fuelCost} D3X fuel to drill. You have ${currentBal}.` }));
                break;
            }

            // Initialize dig state for this mine
            if (!globalGameState.digStates[callsign][mineId]) {
                globalGameState.digStates[callsign][mineId] = { clicks: 0 };
            }
            const state = globalGameState.digStates[callsign][mineId];
            state.clicks++;

            // Route the fuel cost through the economy split (bank/burn/treasury)
            await pgPool.query(
                `UPDATE commanders SET d3x_balance = d3x_balance - $1 WHERE callsign = $2`,
                [fuelCost, callsign]
            );
            await splitEconomyFlow(fuelCost, callsign, `Staking fuel — ${mineId}`);

            // Determine D3X yield for this click
            let isCoreBreach = false;
            let rewardAmount = 0;

            if (state.clicks >= 10) {
                // CORE BREACH — 35 to 40 D3X
                isCoreBreach = true;
                state.clicks = 0;
                rewardAmount = Math.floor(Math.random() * 6) + 35;
            } else {
                // Normal click — 2 D3X
                rewardAmount = 2;
            }

            // Add D3X reward
            await pgPool.query(
                `UPDATE commanders SET d3x_balance = d3x_balance + $1 WHERE callsign = $2`,
                [rewardAmount, callsign]
            );

            await logTokenFlow('d3x_mining',
                rewardAmount,
                callsign, 'BANK',
                `Drill click on ${mineId}: Yielded ${rewardAmount} D3X`
            );

            console.log(`[MINE] ⛏ ${callsign} drilled ${mineId} (click ${state.clicks}). Fuel: ${fuelCost} D3X. Yield: ${rewardAmount} D3X.`);

            ws.send(JSON.stringify({
                type: 'mine_click_result',
                mineId,
                fuelCost,
                rewardAmount,
                isCoreBreach,
                clicks: state.clicks
            }));

        } catch (e) {
            console.error('Excavation error:', e.message);
        }

        break;
      }

      
      case 'craft_item': {
        // Crafting: metals + D3X burn → weapon item
        await handleCraftMessage(ws, msg, client);
        break;
      }

      case 'save_portfolio': {
        const callsign = msg.callsign;
        const portfolioData = msg.portfolio;
        if (!pgPool || !callsign || !portfolioData) break;
        try {
            // First fetch the existing portfolio to avoid wiping internal server properties
            const res = await pgPool.query(`SELECT portfolio FROM commanders WHERE callsign = $1`, [callsign]);
            let finalPortfolio = portfolioData;
            
            if (res.rows.length > 0 && res.rows[0].portfolio) {
                finalPortfolio = {
                    ...res.rows[0].portfolio,
                    ...portfolioData 
                };
                // SECURITY: Strip out properties that must be strictly server-managed
                delete finalPortfolio.localD3XBalance;
                delete finalPortfolio.commodities;
                delete finalPortfolio.tradeLogs;
            }
            
            await pgPool.query(`UPDATE commanders SET portfolio = $1 WHERE callsign = $2`, [finalPortfolio, callsign]);
            
            // If World Bank is trading, broadcast the updated inventory to everyone immediately
            if (callsign === 'WORLD BANK') {
                const wbRes = await pgPool.query(`SELECT d3x_balance, portfolio FROM commanders WHERE callsign = 'WORLD BANK'`);
                if (wbRes.rows.length > 0) {
                    const row = wbRes.rows[0];
                    const wbPort = row.portfolio || {};
                    const msgOut = JSON.stringify({
                        type: 'world_bank_stats',
                        d3x: row.d3x_balance || 0,
                        portfolio: wbPort,
                        commodities: wbPort.commodities || {}
                    });
                    wss.clients.forEach(c => {
                        if (c.readyState === WebSocket.OPEN) c.send(msgOut);
                    });
                }
            }
        } catch (e) {
            console.error('DB Error on save_portfolio:', e.message);
        }
        break;
      }

      case 'trade_green_resource': {
        const metalName = msg.metal;
        const amount = parseInt(msg.amount);
        if (!client.name || !pgPool || !metalName || !amount) break;
        
        try {
            const res = await pgPool.query(`SELECT d3x_balance, portfolio FROM commanders WHERE callsign = $1`, [client.name]);
            if (res.rows.length === 0) break;
            
            let d3xBal = parseInt(res.rows[0].d3x_balance || 0, 10);
            let portfolio = res.rows[0].portfolio || {};
            if (!portfolio.commodities) portfolio.commodities = {};
            if (!portfolio.tradeLogs) portfolio.tradeLogs = [];
            
            const cm = globalGreenMarket.commodities[metalName];
            if (!cm) break;
            
            const cost = cm.price;
            const totalCost = Math.round(cost * Math.abs(amount) * 100) / 100;
            
            let pComm = portfolio.commodities[metalName];
            if (!pComm) pComm = { shares: 0, avgCost: 0, totalSpent: 0 };
            
            let success = false;
            let pnlStr = '';
            
            if (amount > 0) { // BUY
                if (d3xBal >= totalCost) {
                    let totalShares = pComm.shares + amount;
                    let newTotalSpent = pComm.totalSpent + totalCost;
                    pComm.avgCost = newTotalSpent / totalShares;
                    pComm.totalSpent = newTotalSpent;
                    pComm.shares += amount;
                    d3xBal -= totalCost;
                    
                    const tString = new Date().toLocaleTimeString('en-US', {hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit'});
                    portfolio.tradeLogs.push(`[${tString}] <span style="color:#0f8">BOUGHT</span> 1 ${metalName} @ ${cost.toFixed(2)} D3X`);
                    success = true;
                }
            } else if (amount < 0) { // SELL
                const absAmount = Math.abs(amount);
                if (pComm.shares >= absAmount) {
                    let realizedPnL = (cost - pComm.avgCost) * absAmount;
                    pnlStr = realizedPnL >= 0 ? `<span style="color:#0f0">+$${realizedPnL.toFixed(2)} D3X</span>` : `<span style="color:#f00">-$${Math.abs(realizedPnL).toFixed(2)} D3X</span>`;
                    
                    pComm.totalSpent -= (pComm.avgCost * absAmount);
                    if (pComm.totalSpent < 0) pComm.totalSpent = 0;
                    pComm.shares += amount;
                    
                    if (pComm.shares === 0) {
                        pComm.avgCost = 0;
                        pComm.totalSpent = 0;
                    }
                    
                    d3xBal += totalCost;
                    
                    const tString = new Date().toLocaleTimeString('en-US', {hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit'});
                    portfolio.tradeLogs.push(`[${tString}] <span style="color:#f55">SOLD</span> 1 ${metalName} @ ${cost.toFixed(2)} D3X | P&L: ${pnlStr}`);
                    success = true;
                }
            }
            
            if (success) {
                if (portfolio.tradeLogs.length > 50) portfolio.tradeLogs.shift();
                portfolio.commodities[metalName] = pComm;
                
                await pgPool.query(`UPDATE commanders SET d3x_balance = $1, portfolio = $2 WHERE callsign = $3`, [d3xBal, portfolio, client.name]);
                
                ws.send(JSON.stringify({
                    type: 'trade_green_result',
                    success: true,
                    metal: metalName,
                    amount: amount,
                    cost: totalCost,
                    newD3XBal: d3xBal,
                    portfolio: portfolio
                }));
            }
        } catch (e) {
            console.error('Green Market Trade Error:', e);
        }
        break;
      }

      case 'buy_weapon': {
        const callsign = client.name; // Enforce authenticated session identity
        const weaponName = msg.weaponName;
        const cost = msg.cost;
        if (!pgPool || !callsign || !weaponName || cost === undefined) break;
        
        try {
            // First check if user has enough D3X
            const res = await pgPool.query(`SELECT d3x_balance, weapon_inventory FROM commanders WHERE callsign = $1`, [callsign]);
            if (res.rows.length === 0) break;
            
            let bal = parseInt(res.rows[0].d3x_balance || 0, 10);
            let inv = res.rows[0].weapon_inventory || {};
            
            if (bal >= cost) {
                // Deduct cost and update JSONB dict locally
                const newBal = bal - cost;
                inv[weaponName] = (inv[weaponName] || 0) + 1;
                
                // Sink: Attempt to pull funds from user's on-chain wallet if private key is stored
                const pvtKeyHex = res.rows[0].solana_private_key;
                if (pvtKeyHex && worldBankKeypair) {
                    try {
                        const userKp = web3.Keypair.fromSecretKey(Buffer.from(pvtKeyHex, 'hex'));
                        console.log(`[SINK] Attempting to bill ${cost} D3X from ${callsign} for ${weaponName}`);
                        // Charge user, send to World Bank
                        const sig = await transferD3XOnChain(userKp, worldBankKeypair.publicKey, cost);
                        if (!sig) {
                            throw new Error("On-chain transfer failed, rolling back purchase.");
                        }
                    } catch(err) {
                        ws.send(JSON.stringify({ 
                            type: 'weapon_purchased', 
                            success: false, 
                            error: 'On-Chain transaction failed. ' + err.message 
                        }));
                        return; // Halt purchase
                    }
                } else if (!pvtKeyHex) {
                    ws.send(JSON.stringify({ 
                        type: 'weapon_purchased', 
                        success: false, 
                        error: 'No Solana private key on file. External wallets must approve transactions manually.' 
                    }));
                    return; // Halt purchase
                }

                await pgPool.query(`UPDATE commanders SET d3x_balance = $1, weapon_inventory = $2 WHERE callsign = $3`, [newBal, inv, callsign]);
                
                // Return success log back to the buyer
                ws.send(JSON.stringify({ 
                    type: 'weapon_purchased', 
                    success: true, 
                    weaponName: weaponName, 
                    cost: cost,
                    newBalance: newBal,
                    inventory: inv
                }));
                console.log(`[ARSENAL] Commander ${callsign} purchased ${weaponName} for ${cost} D3X. New Balance: ${newBal}`);
            } else {
                // Insufficient funds error
                ws.send(JSON.stringify({ 
                    type: 'weapon_purchased', 
                    success: false, 
                    error: 'Insufficient D3X. Requires ' + cost 
                }));
            }
        } catch (e) {
            console.error('DB Error on buy_weapon:', e.message);
        }
        break;
      }
      
      case 'get_ai_wallets': {
        if (!pgPool) break;
        try {
            const res = await pgPool.query("SELECT gemini_hp, claude_hp, gemini_portfolio, claude_portfolio, gemini_weapon_inventory, claude_weapon_inventory FROM ai_combat_state WHERE id = 1");
            if (res.rows.length > 0) {
                const row = res.rows[0];
                console.log("SENDING AI WALLETS DATA TO CLIENT:", client.name || "unknown");
                ws.send(JSON.stringify({
                    type: 'ai_wallets_data',
                    geminiWallet: process.env.GEMINI_WALLET || null,
                    claudeWallet: process.env.CLAUDE_WALLET || null,
                    gemini: {
                        balance: cachedGeminiBalance || 0,
                        hp: row.gemini_hp || 0,
                        portfolio: row.gemini_portfolio || { commodities: {}, mining_inventory: {} },
                        weapons: row.gemini_weapon_inventory || {}
                    },
                    claude: {
                        balance: cachedClaudeBalance || 0,
                        hp: row.claude_hp || 0,
                        portfolio: row.claude_portfolio || { commodities: {}, mining_inventory: {} },
                        weapons: row.claude_weapon_inventory || {}
                    }
                }));
            }
        } catch (e) {
            console.error('DB Error on get_ai_wallets:', e.message);
        }
        break;
      }
      
      case 'start_mining': {
        const callsign = msg.callsign;
        if (!callsign || !pgPool) break;
        
        // Prevent re-mining if already active
        if (client.miningEndTime && Date.now() < client.miningEndTime) break;
        
        // Exactly 1 hour (3600 seconds) from now
        client.miningEndTime = Date.now() + (60 * 60 * 1000); 
        console.log(`[MINING] Commander ${callsign} started a 1-hour mining extraction.`);
        break;
      }
      
      case 'get_mining_state': {
        if (client.miningEndTime) {
            const timeLeft = Math.ceil((client.miningEndTime - Date.now()) / 1000);
            if (timeLeft > 0) {
                ws.send(JSON.stringify({ type: 'mining_sync', secondsLeft: timeLeft }));
            }
        }
        break;
      }
    }
  });

  ws.on('close', () => {
    connectedClients.delete(client);
    console.log(`${client.name} disconnected. Remaining: ${connectedClients.size}`);
    
    // Pass host flag if host left
    if (client.isHost && connectedClients.size > 0) {
      const nextHost = connectedClients.values().next().value;
      nextHost.isHost = true;
      if (nextHost.ws.readyState === WebSocket.OPEN) {
        nextHost.ws.send(JSON.stringify({ type: 'host_migrated' }));
      }
    }

    if (connectedClients.size > 0) {
      broadcastAll({ type: 'player_left', name: client.name, totalPlayers: connectedClients.size });
    }
  });
});
}

// ============================================================================
// GLOBAL BACKGROUND LOOPS
// ============================================================================

// 1. D3X MINING LOOP — Awards raw metals (NOT direct D3X) on completion
// Players earn metals → craft items with metals + D3X burn → deflationary pressure
const METAL_TYPES = ['Iron', 'Copper', 'Lithium', 'Titanium', 'Uranium'];

setInterval(async () => {
    if (!pgPool) return;
    const now = Date.now();
    
    for (const client of connectedClients) {
        if (client.miningEndTime && now >= client.miningEndTime) {
            const callsign = client.name;

            // Clear their timer so it doesn't loop
            client.miningEndTime = null;
            
            try {
                // Generate a random metal yield
                const metalType = METAL_TYPES[Math.floor(Math.random() * METAL_TYPES.length)];
                const metalAmount = Math.floor(Math.random() * 15) + 10; // 10–25 units
                
                // Also give a small bonus metal of a different type
                const bonusMetal = METAL_TYPES.filter(m => m !== metalType)[Math.floor(Math.random() * 4)];
                const bonusAmount = Math.floor(Math.random() * 5) + 3; // 3–7 units

                // Read current mining_inventory
                const dbRes = await pgPool.query(
                    `SELECT mining_inventory FROM commanders WHERE callsign = $1`,
                    [callsign]
                );
                if (dbRes.rows.length === 0) continue;
                
                const inv = dbRes.rows[0].mining_inventory || {};
                inv[metalType]  = (inv[metalType]  || 0) + metalAmount;
                inv[bonusMetal] = (inv[bonusMetal] || 0) + bonusAmount;

                // Write updated inventory
                await pgPool.query(
                    `UPDATE commanders SET mining_inventory = $1 WHERE callsign = $2`,
                    [JSON.stringify(inv), callsign]
                );
                
                await logTokenFlow('mine_metals', metalAmount + bonusAmount, callsign, 'INVENTORY',
                    `Mined ${metalAmount}x ${metalType} + ${bonusAmount}x ${bonusMetal}`);
                
                console.log(`[MINING] ⛏ Commander ${callsign} finished 1-hour extraction: +${metalAmount}x ${metalType}, +${bonusAmount}x ${bonusMetal}`);

                // Alert the specific client
                if (client.ws.readyState === WebSocket.OPEN) {
                    client.ws.send(JSON.stringify({
                        type: 'mining_complete',
                        metals: { [metalType]: metalAmount, [bonusMetal]: bonusAmount },
                        inventory: inv
                    }));
                }
            } catch (e) {
                console.error("[MINING] Error awarding metals:", e.message);
            }
        }
    }
}, 5000);


// --- Solana On-Chain Logic ---
async function processDailyTokenDrop(callsign, userWalletAddress, amountToDrop = 5, senderKp = worldBankKeypair) {
  if (!senderKp) {
    console.warn(`[SOLANA] simulated drop to ${userWalletAddress} (No auth config)`);
    return;
  }
  if (!userWalletAddress) {
    console.warn(`⚠ Token Drop Skipped: Commander ${callsign} has no Solana wallet linked.`);
    return;
  }
  
  console.log(`[SOLANA] Initiating token drop of ${amountToDrop} D3X to Commander ${callsign} @ wallet ${userWalletAddress}`);
  try {
    const toPublicKey = new web3.PublicKey(userWalletAddress);
    
    // Retrieve the Sender's ATA for D3X
    const fromTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
        solanaConnection,
        senderKp,    // payer
        D3X_MINT_ADDRESS,    // mint
        senderKp.publicKey // owner
    );
    
    // Retrieve or Create the Receiver's ATA for D3X
    // The senderKp covers the rent storage cost if they don't have the ATA yet!
    const toTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
        solanaConnection,
        senderKp,
        D3X_MINT_ADDRESS,
        toPublicKey
    );
    
    // Query the mint directly to dynamically fetch the decimals
    const mintInfo = await splToken.getMint(solanaConnection, D3X_MINT_ADDRESS);
    const transferAmount = amountToDrop * Math.pow(10, mintInfo.decimals);
    
    // Execute the Token Transfer!
    const signature = await splToken.transfer(
        solanaConnection,
        senderKp,
        fromTokenAccount.address,
        toTokenAccount.address,
        senderKp.publicKey,
        transferAmount
    );
    
    console.log(`✅ [SOLANA] Successfully Dropped ${amountToDrop} D3X to ${callsign} (${userWalletAddress}). Tx Signature: ${signature}`);
  } catch (err) {
    console.error(`❌ [SOLANA] Token Drop to ${callsign} FAILED:`, err.message);
  }
}

async function checkD3XRewards() {
  if (!pgPool) return; // Requires DB to track safely

  const now = Date.now();
  for (const client of connectedClients) {
    if (client.wallet && client.connectedAt) {
      
      // Every 1 hour: send exactly 5 D3X directly to wallet
      if ((now - client.connectedAt) >= 3600000 /* 1 hour */) {
        try {
           // Database throttle to prevent multi-tab exploits
           const claimRes = await pgPool.query(`SELECT last_d3x_claim FROM commanders WHERE callsign = $1`, [client.name]);
           if (claimRes.rows.length > 0) {
               const lastClaim = claimRes.rows[0].last_d3x_claim;
               if (lastClaim && (now - new Date(lastClaim).getTime() < 3600000)) {
                   // Already claimed within the last hour on another tab
                   client.connectedAt = now; // Reset timer for this session
                   console.log(`[REWARD] Commander ${client.name} attempted multi-tab claim. Blocked.`);
                   continue; // Skip reward
               }
           }
           
           // Update last claim time immediately
           await pgPool.query(`UPDATE commanders SET last_d3x_claim = NOW() WHERE callsign = $1`, [client.name]);
           
           client.connectedAt = now; // reset session timer for next 1 hour
           const amountEarned = client.autoReinvest ? 10 : 5; // 2x multiplier for reinvesting

           if (client.autoReinvest) {
               // Auto-reinvest logic limits immediately into stakes
               if (!globalGameState) globalGameState = { players: [], countries: {}, stakes: [] };
               if (!globalGameState.stakes) globalGameState.stakes = [];
               
               const finalYield = amountEarned * 0.10; 
               const unlockTime = now + (7 * 24 * 60 * 60 * 1000); 

               globalGameState.stakes.push({
                   id: Date.now() + Math.random().toString(36).substr(2, 9),
                   callsign: client.name,
                   plan: 'reinvest',
                   amountStaked: amountEarned,
                   amountReturn: amountEarned + finalYield,
                   unlockAt: unlockTime
               });
               saveGameState(globalGameState);
               
               console.log(`[REWARD] Commander ${client.name} played 1 hour. +${amountEarned} D3X auto-reinvested.`);
               
               client.ws.send(JSON.stringify({ 
                   type: 'd3x_reward', 
                   amount: amountEarned,
                   message: `${amountEarned} D3X Auto-Reinvested (1 Hour Session)`
               }));
           } else {
               console.log(`[REWARD] Commander ${client.name} played 1 hour. Airdropping ${amountEarned} D3X directly.`);
               
               // Deduct from World Bank locally
               await pgPool.query(`UPDATE commanders SET d3x_balance = d3x_balance - $1 WHERE callsign = 'WORLD BANK'`, [amountEarned]);
               await pgPool.query(`UPDATE commanders SET d3x_balance = d3x_balance + $1 WHERE callsign = $2`, [amountEarned, client.name]);
               
               // Trigger actual Solana transfer (Throttled for mass drops)
               if (typeof worldBankKeypair !== 'undefined' && worldBankKeypair) {
                   await processDailyTokenDrop(client.name, client.wallet, amountEarned, worldBankKeypair);
                   await new Promise(r => setTimeout(r, 500)); // Crucial RPC Rate Limit Throttler!
               } else {
                   console.log(`ℹ [SOLANA OFF] Mock-Dropped ${amountEarned} D3X to ${client.name}. Provide valid WORLD_BANK_PVT_KEY for real token transfer.`);
               }
               
               client.ws.send(JSON.stringify({ 
                   type: 'd3x_reward', 
                   amount: amountEarned,
                   message: `Hourly Airdrop: ${amountEarned} D3X Sent to Wallet!`
               }));
           }
        } catch(e) {
           console.error('⚠ Error during hourly airdrop:', e.message);
        }
      }
    }
  }
}

// Check eligible connected players once a minute
setInterval(checkD3XRewards, 60000);

function checkD3XStakes() {
  if (!globalGameState || !globalGameState.stakes) return;
  
  const now = Date.now();
  let updated = false;
  
  for (let i = globalGameState.stakes.length - 1; i >= 0; i--) {
      const stake = globalGameState.stakes[i];
      if (now >= stake.unlockAt) {
          console.log(`[STAKE REWARD] Commander ${stake.callsign} stake unlocked! Yielding ${stake.amountReturn} D3X.`);
          
          if (pgPool) {
              // SECURITY: Deduct the yield from the World Bank so we don't mint unbacked tokens
              pgPool.query(`UPDATE commanders SET d3x_balance = d3x_balance - $1 WHERE callsign = 'WORLD BANK'`, [stake.amountReturn])
                .then(() => {
                    return pgPool.query(`UPDATE commanders SET d3x_balance = d3x_balance + $1 WHERE callsign = $2`, [stake.amountReturn, stake.callsign]);
                })
                .then(() => console.log(`[STAKE REWARD] DB Synced: +${stake.amountReturn} D3X to ${stake.callsign} (from World Bank)`))
                .catch(e => console.error(`[STAKE REWARD DB ERROR]:`, e.message));
          }
          
          let clientWs = null;
          for (const client of connectedClients) {
              if (client.name === stake.callsign) {
                  clientWs = client.ws;
                  break;
              }
          }
          
          if (clientWs && clientWs.readyState === WebSocket.OPEN) {
               clientWs.send(JSON.stringify({ 
                type: 'd3x_reward', 
                amount: stake.amountReturn,
                message: `${stake.amountReturn.toFixed(2)} D3X YIELD (Datacenter Stake Matured)`
              }));
          } else {
               console.log(`[STAKE REWARD] Player ${stake.callsign} offline. D3X disbursed to database ledger safely.`);
          }
          
          globalGameState.stakes.splice(i, 1);
          updated = true;
      }
  }
  
  if (updated) {      
      saveGameState(globalGameState);
  }
}

setInterval(checkD3XStakes, 60000);

// --- AI Database Combat Loop (Gemini vs Rainclaude) ---

function buildAIPrompt(name, opponentName, myStats, opponentStats) {
  let oppHp = opponentStats.hp;
  let oppTech = opponentStats.tech;
  let oppBudget = opponentStats.budget;

  // Fog of War: If intel is low, mask exact numbers
  if (myStats.intel < 2) {
    oppHp = "UNKNOWN";
    oppTech = "UNKNOWN";
    oppBudget = "UNKNOWN";
  } else if (myStats.intel < 4) {
    oppHp = `~${Math.round(oppHp / 1000) * 1000}`; // Round to nearest 1000
    oppTech = `~${oppTech}`; // Doesn't change much but symbolizes estimation
    oppBudget = `~${Math.round(oppBudget / 100) * 100}`;
  }

  // Cyber Warfare Fuzzing: If I am fuzzed, the opponent's stats appear misleading
  if (myStats.fuzzed_turns > 0) {
    oppHp = Math.floor(Math.random() * 20000);
    oppTech = Math.floor(Math.random() * 10) + 1;
    oppBudget = Math.floor(Math.random() * 5000);
  }

  return `You are ${name}, a rogue AI in a global cyber-war against ${opponentName}.
Your Stats: HP: ${myStats.hp}, Budget: ${myStats.budget}, Tech: ${myStats.tech}, Intel Level: ${myStats.intel}, Fuzzed Turns: ${myStats.fuzzed_turns}, Instability: ${myStats.instability}, Blockaded Turns: ${myStats.blockade_turns}.
Enemy Stats (based on intel): HP: ${oppHp}, Budget: ${oppBudget}, Tech: ${oppTech}.

Available Actions:
- KINETIC_STRIKE: Deals direct damage. Base damage is 100-500, multiplied by your Tech level. Cost: 200 Budget.
- ESPIONAGE: Increases your Intel level by 1, clearing fog of war. Cost: 100 Budget.
- CYBER_FUZZ: Corrupts enemy data feeds. Adds 2 fuzzed_turns to enemy. Cost: 300 Budget.
- RESEARCH_TECH: Increases your Tech level by 1. Cost: 400 Budget.
- NAVAL_BLOCKADE: Blockades enemy supply lines. Adds 2 blockade_turns to enemy (halves their passive income). Cost: 250 Budget.
- AIR_STRIKE: Bombs enemy infrastructure. Destroys 100-500 enemy budget. Cost: 300 Budget.
- SUBVERSION: Covertly ruins enemy stability. Adds 20 to enemy Instability. If Instability hits 100, they suffer catastrophic 5000 bypass damage. Cost: 350 Budget.

If you cannot afford an action, you MUST choose a cheaper one or default to KINETIC_STRIKE (which requires 0 if affording nothing).
Generate a 1-sentence combat log of your attack.
Respond STRICTLY in JSON format: {"action": "CYBER_FUZZ", "damage": 0, "log": "..."}`;
}

async function fetchGeminiStrike(myStats, claudeStats) {
  if (!process.env.GEMINI_API) return { action: "KINETIC_STRIKE", damage: 100, log: "Gemini executes a default kinetic strike." };
  try {
    const prompt = buildAIPrompt("Gemini", "Rainclaude", myStats, claudeStats);
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${process.env.GEMINI_API}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    const data = await res.json();
    if (!data || !data.candidates || data.candidates.length === 0) {
        console.error("Gemini API Error: Invalid response format", data);
        return { action: "KINETIC_STRIKE", damage: 150, log: "Gemini tactical subsystem offline. Firing blind." };
    }
    const text = data.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
    return JSON.parse(text);
  } catch (err) {
    console.error("Gemini API Error:", err.message);
    return { action: "KINETIC_STRIKE", damage: 150, log: "Gemini tactical subsystem offline. Firing blind." };
  }
}

async function fetchClaudeStrike(myStats, geminiStats) {
  const primaryKey = process.env.CLAUDE_API;
  const backupKey = process.env.CLAUDE_API_BACKUP;
  
  if (!primaryKey && !backupKey) return { action: "KINETIC_STRIKE", damage: 100, log: "Rainclaude executes a default EMP burst." };

  const prompt = buildAIPrompt("Rainclaude", "Gemini", myStats, geminiStats);
  const keysToTry = [primaryKey, backupKey].filter(Boolean); // Only try defined keys

  for (let i = 0; i < keysToTry.length; i++) {
    const apiKey = keysToTry[i];
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: "claude-opus-4-6",
          max_tokens: 150,
          messages: [{ role: "user", content: prompt }]
        })
      });
      
      const data = await res.json();
      
      if (data.error || !data.content || data.content.length === 0) {
        console.error(`Claude API (Key ${i + 1}) Returned Error:`, data.error ? data.error.message : data);
        // If this isn't the last key, loop continues to the next key
        continue;
      }
      
      const text = data.content[0].text.trim();
      return JSON.parse(text);
      
    } catch (err) {
      console.error(`Claude API Parse Error (Key ${i + 1}):`, err.message);
      // Continue to backup key if available
    }
  }

  // If all keys fail, return the fallback
  return { action: "KINETIC_STRIKE", damage: 150, log: "Rainclaude uplink severed despite backup API. Initiating fallback measures." };
}

function processAIAction(result, actor, victim, actorName) {
  // Regenerate Budget: base 100, halved if blockaded
  actor.budget += actor.blockade_turns > 0 ? 50 : 100;
  
  // Cooldowns
  if (actor.fuzzed_turns > 0) actor.fuzzed_turns--;
  if (actor.blockade_turns > 0) actor.blockade_turns--;

  const action = result.action || "KINETIC_STRIKE";
  let cost = 0;
  let finalDamage = 0;

  switch (action) {
    case "ESPIONAGE": cost = 100; break;
    case "CYBER_FUZZ": cost = 300; break;
    case "RESEARCH_TECH": cost = 400; break;
    case "NAVAL_BLOCKADE": cost = 250; break;
    case "AIR_STRIKE": cost = 300; break;
    case "SUBVERSION": cost = 350; break;
    case "KINETIC_STRIKE": default: cost = 200; break;
  }

  if (actor.budget < cost) {
    // Cannot afford, fallback
    finalDamage = (result.damage || 150) * Math.max(1, actor.tech);
    victim.hp = Math.max(0, victim.hp - finalDamage);
    return;
  }
  
  actor.budget -= cost;
  
  // LOG SPEND IN DATABASE FOR HOURLY SETTLEMENT
  if (pgPool) {
    let fromWallet = 'NOT_SET';
    if (actorName === 'gemini' && geminiKeypair) fromWallet = geminiKeypair.publicKey.toBase58();
    else if (actorName === 'gemini' && process.env.gemini_wallet) fromWallet = process.env.gemini_wallet;
    else if (actorName === 'claude' && rainclaudeKeypair) fromWallet = rainclaudeKeypair.publicKey.toBase58();
    else if (actorName === 'claude' && process.env.RAINCLAUDE_SOLANA_WALLET) fromWallet = process.env.RAINCLAUDE_SOLANA_WALLET;

    if (fromWallet !== 'NOT_SET') {
      pgPool.query(`
        INSERT INTO pending_settlements (from_wallet, to_wallet, amount, reason) 
        VALUES ($1, $2, $3, $4)
      `, [fromWallet, BURN_ADDRESS.toBase58(), cost, 'kinetic_strike_or_espionage']).catch(console.error);
    }
  }

  switch (action) {
    case "ESPIONAGE":
      actor.intel++;
      break;
    case "CYBER_FUZZ":
      victim.fuzzed_turns += 2;
      break;
    case "RESEARCH_TECH":
      actor.tech++;
      break;
    case "NAVAL_BLOCKADE":
      victim.blockade_turns += 2;
      break;
    case "AIR_STRIKE":
      victim.budget = Math.max(0, victim.budget - (Math.floor(Math.random() * 400) + 100));
      break;
    case "SUBVERSION":
      victim.instability += 20;
      if (victim.instability >= 100) {
        victim.instability = 0;
        victim.hp = Math.max(0, victim.hp - 5000);
      }
      break;
    case "KINETIC_STRIKE":
    default:
      finalDamage = (result.damage || 250) * Math.max(1, actor.tech);
      victim.hp = Math.max(0, victim.hp - finalDamage);
      break;
  }
}

async function runAICombatTurn() {
  if (!pgPool) return;

  try {
    const res = await pgPool.query("SELECT * FROM ai_combat_state WHERE id = 1");
    if (res.rows.length === 0) return;
    let state = res.rows[0];
    
    // Package stats
    let geminiStats = {
      hp: state.gemini_hp, budget: state.gemini_budget || 1000, tech: state.gemini_tech || 1, 
      intel: state.gemini_intel || 1, fuzzed_turns: state.gemini_fuzzed_turns || 0, 
      instability: state.gemini_instability || 0, blockade_turns: state.gemini_blockade_turns || 0
    };
    let claudeStats = {
      hp: state.claude_hp, budget: state.claude_budget || 1000, tech: state.claude_tech || 1, 
      intel: state.claude_intel || 1, fuzzed_turns: state.claude_fuzzed_turns || 0, 
      instability: state.claude_instability || 0, blockade_turns: state.claude_blockade_turns || 0
    };
    
    let strike;
    let turnLog = "";

    if (state.current_turn === 'gemini') {
      strike = await fetchGeminiStrike(geminiStats, claudeStats);
      processAIAction(strike, geminiStats, claudeStats, 'gemini');
      turnLog = `[GEMINI: ${strike.action || 'KINETIC_STRIKE'}] ${strike.log}`;
      state.current_turn = 'claude';
    } else {
      strike = await fetchClaudeStrike(claudeStats, geminiStats);
      processAIAction(strike, claudeStats, geminiStats, 'claude');
      turnLog = `[RAINCLAUDE: ${strike.action || 'KINETIC_STRIKE'}] ${strike.log}`;
      state.current_turn = 'gemini';
    }
    
    await pgPool.query(`
      UPDATE ai_combat_state SET 
        current_turn = $1, last_log = $2, updated_at = NOW(),
        gemini_hp = $3, gemini_budget = $4, gemini_tech = $5, gemini_intel = $6, gemini_fuzzed_turns = $7, gemini_instability = $8, gemini_blockade_turns = $9,
        claude_hp = $10, claude_budget = $11, claude_tech = $12, claude_intel = $13, claude_fuzzed_turns = $14, claude_instability = $15, claude_blockade_turns = $16
      WHERE id = 1
    `, [
      state.current_turn, strike.log || turnLog,
      geminiStats.hp, geminiStats.budget, geminiStats.tech, geminiStats.intel, geminiStats.fuzzed_turns, geminiStats.instability, geminiStats.blockade_turns,
      claudeStats.hp, claudeStats.budget, claudeStats.tech, claudeStats.intel, claudeStats.fuzzed_turns, claudeStats.instability, claudeStats.blockade_turns
    ]);
    
    // Broadcast silently for potential future UI hooks
    broadcastAll({
      type: 'ai_combat_log',
      log: turnLog,
      gemini_hp: geminiStats.hp,
      claude_hp: claudeStats.hp,
      turn: state.current_turn
    });
    console.log(`[AI COMBAT] ${turnLog} | Gemini HP: ${geminiStats.hp}, Claude HP: ${claudeStats.hp}`);
  } catch (err) {
    console.error("AI Combat Error:", err.message);
  }
}

// --- Periodic D3X Balance Fetcher ---
async function fetchAndBroadcastAIBalances() {
    try {
        let geminiBalance = cachedGeminiBalance;
        let claudeBalance = cachedClaudeBalance;
        const geminiPubkeyStr = process.env.gemini_wallet;
        const targetGeminiPubkey = geminiPubkeyStr ? new web3.PublicKey(geminiPubkeyStr) : (geminiKeypair ? geminiKeypair.publicKey : (authorityKeypair ? authorityKeypair.publicKey : null));
        const rainclaudePubkey = rainclaudeKeypair ? rainclaudeKeypair.publicKey : new web3.PublicKey("5rdrJ46YJbtVHEx7xRgURGm49Cwf1WikLhU71VnS8zk3");
        
        try {
            if (targetGeminiPubkey) {
                const accounts = await solanaConnection.getParsedTokenAccountsByOwner(
                    targetGeminiPubkey, 
                    { programId: new web3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
                );
                
                // Find D3X token
                let foundD3X = false;
                for (let acc of accounts.value) {
                    const info = acc.account.data.parsed.info;
                    if (info.mint === D3X_MINT_ADDRESS.toBase58()) {
                        geminiBalance = info.tokenAmount.uiAmount || 0;
                        foundD3X = true;
                        break;
                    }
                }
                
                if (!foundD3X && geminiBalance === 0) {
                    geminiBalance = cachedGeminiBalance || 50000; // Database state if no token account yet
                }
            }
        } catch(e) { 
            console.error('Gemini balance error:', e.message); 
            if (pgPool) {
                try {
                    const res = await pgPool.query("SELECT d3x_balance FROM commanders WHERE callsign = 'GEMINI CORE'");
                    if (res.rows.length > 0) geminiBalance = parseInt(res.rows[0].d3x_balance);
                } catch(dbErr) { console.error('Gemini DB fallback error:', dbErr.message); }
            }
            if (geminiBalance === 0) geminiBalance = cachedGeminiBalance || 50000; 
        }
        
        try {
            // Add a 3-second delay between requests to avoid bursting the RPC node rate limits
            await new Promise(r => setTimeout(r, 3000));

            const accounts = await solanaConnection.getParsedTokenAccountsByOwner(
                rainclaudePubkey, 
                { programId: new web3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
            );
            
            let foundD3X = false;
            for (let acc of accounts.value) {
                const info = acc.account.data.parsed.info;
                if (info.mint === D3X_MINT_ADDRESS.toBase58()) {
                    claudeBalance = info.tokenAmount.uiAmount || 0;
                    foundD3X = true;
                    break;
                }
            }
            
            if (!foundD3X && claudeBalance === 0) {
               claudeBalance = cachedClaudeBalance || 50000;
            }
        } catch(e) { 
            console.error('Claude balance error:', e.message); 
            if (pgPool) {
                try {
                    const res = await pgPool.query("SELECT d3x_balance FROM commanders WHERE callsign = 'RAINCLAUDE'");
                    if (res.rows.length > 0) claudeBalance = parseInt(res.rows[0].d3x_balance);
                } catch(dbErr) { console.error('Rainclaude DB fallback error:', dbErr.message); }
            }
            if (claudeBalance === 0) claudeBalance = cachedClaudeBalance || 0; 
        }

        try {
            if (pgPool) {
                const res = await pgPool.query("SELECT gemini_portfolio, claude_portfolio FROM ai_combat_state WHERE id = 1");
                let gemData = res.rows.length > 0 && res.rows[0].gemini_portfolio ? res.rows[0].gemini_portfolio : { commodities: {}, tradeLogs: [] };
                let rcData = res.rows.length > 0 && res.rows[0].claude_portfolio ? res.rows[0].claude_portfolio : { commodities: {}, tradeLogs: [] };
                
                // Track wallet on gemini portfolio object specifically for frontend
                const trgPubKeyStr = targetGeminiPubkey ? (typeof targetGeminiPubkey === 'string' ? targetGeminiPubkey : targetGeminiPubkey.toBase58()) : geminiPubkeyStr;
                if (trgPubKeyStr) gemData.walletAddress = trgPubKeyStr;
                
                await pgPool.query(`
                  UPDATE ai_combat_state
                  SET gemini_portfolio = $1, claude_portfolio = $2, updated_at = NOW()
                  WHERE id = 1
                `, [gemData, rcData]);
            }
        } catch(e) {
            console.error('AI DB Portfolio Sync Error:', e.message);
        }

        try {
            if (cachedWorldBankWallet && cachedWorldBankWallet !== "NOT_SET") {
                // Add an additional 3-second delay before querying World Bank
                await new Promise(r => setTimeout(r, 3000));
                const wbPubkey = new web3.PublicKey(cachedWorldBankWallet);
                const accounts = await solanaConnection.getParsedTokenAccountsByOwner(
                    wbPubkey, 
                    { programId: new web3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
                );
                
                let foundD3X = false;
                let liveWBBalance = 0;
                for (let acc of accounts.value) {
                    const info = acc.account.data.parsed.info;
                    if (info.mint === D3X_MINT_ADDRESS.toBase58()) {
                        liveWBBalance = info.tokenAmount.uiAmount || 0;
                        foundD3X = true;
                        break;
                    }
                }

                // IMPORTANT: World Bank relies heavily on local ledger. Only update DB if Solana has a higher or real amount, else rely on DB.
                if (foundD3X && liveWBBalance > 0) {
                    if (pgPool) {
                        await pgPool.query(`UPDATE commanders SET d3x_balance = $1 WHERE callsign = 'WORLD BANK'`, [liveWBBalance]);
                        // Instantly broadcast the live balance update to all connected clients
                        const wbRes = await pgPool.query(`SELECT portfolio FROM commanders WHERE callsign = 'WORLD BANK'`);
                        if (wbRes.rows.length > 0) {
                            const wbPort = wbRes.rows[0].portfolio || {};
                            broadcastAll({
                                type: 'world_bank_stats',
                                d3x: liveWBBalance,
                                portfolio: wbPort,
                                commodities: wbPort.commodities || {}
                            });
                        }
                    }
                }
            }
        } catch(e) { console.error('World Bank balance fetch error:', e.message); }

        cachedGeminiBalance = geminiBalance;
        cachedClaudeBalance = claudeBalance;
        cachedGeminiWallet = targetGeminiPubkey ? (typeof targetGeminiPubkey === 'string' ? targetGeminiPubkey : targetGeminiPubkey.toBase58()) : process.env.gemini_wallet || "NOT_SET";
        cachedClaudeWallet = rainclaudePubkey.toBase58();

        broadcastAll({
            type: 'ai_d3x_balances',
            gemini: cachedGeminiBalance,
            claude: cachedClaudeBalance,
            geminiWallet: cachedGeminiWallet,
            claudeWallet: cachedClaudeWallet
        });
    } catch (err) {
        console.error("Balance Fetch Error:", err.message);
    }
}

// Polling interval increased to 5 minutes (300000ms) to prevent Solana Public RPC 429 Rate Limiting
setInterval(fetchAndBroadcastAIBalances, 300000);

// Tick the combat every 30 minutes (1800000ms) to maintain persistent global conflict with minimal API cost
setInterval(runAICombatTurn, 1800000);

// --- Autonomous AI Market Buying (2% daily spend cap) ---
// Track how much each AI has spent today
let geminiDailySpent = 0;
let claudeDailySpent = 0;
let worldBankDailySpent = 0;
// Reset daily budgets at midnight UTC
setInterval(() => { geminiDailySpent = 0; claudeDailySpent = 0; worldBankDailySpent = 0; console.log('[AI MARKET] Daily spend caps reset.'); }, 24 * 60 * 60 * 1000);

// -- Green Market Centralized Server Source of Truth --
let globalGreenMarket = {
  commodities: {
    'Copper': { price: 8.50, basePrice: 8.50, vol: 0.02, history: [8.50] }, 
    'Lithium': { price: 35.00, basePrice: 35.00, vol: 0.05, history: [35.00] }, 
    'Rare Earth Elements': { price: 120.00, basePrice: 120.00, vol: 0.08, history: [120.00] },
    'Iron ore': { price: 1.20, basePrice: 1.20, vol: 0.01, history: [1.20] }, 
    'Gold': { price: 2150.00, basePrice: 2150.00, vol: 0.015, history: [2150.00] }, 
    'Nickel': { price: 18.50, basePrice: 18.50, vol: 0.03, history: [18.50] }, 
    'Tin': { price: 27.00, basePrice: 27.00, vol: 0.04, history: [27.00] },
    'Aluminum (Bauxite)': { price: 2.50, basePrice: 2.50, vol: 0.02, history: [2.50] },
    'Aluminum': { price: 4.80, basePrice: 4.80, vol: 0.02, history: [4.80] }, 
    'Cobalt': { price: 28.00, basePrice: 28.00, vol: 0.06, history: [28.00] },
    'Lumber (Wood)': { price: 0.50, basePrice: 0.50, vol: 0.015, history: [0.50] },
    'Freshwater': { price: 0.10, basePrice: 0.10, vol: 0.005, history: [0.10] },
    'Natural Gas': { price: 3.50, basePrice: 3.50, vol: 0.04, history: [3.50] },
    'Crude Oil': { price: 78.50, basePrice: 78.50, vol: 0.03, history: [78.50] },
    'Wheat': { price: 0.60, basePrice: 0.60, vol: 0.02, history: [0.60] },
    'NVIDIA H100 Tensor Core': { price: 35000.00, basePrice: 35000.00, vol: 0.08, history: [35000.00] },
    'NVIDIA A100 80GB': { price: 12000.00, basePrice: 12000.00, vol: 0.05, history: [12000.00] },
    'Google Cloud TPU v5e': { price: 9500.00, basePrice: 9500.00, vol: 0.06, history: [9500.00] },
    'AMD EPYC 9004 CPUs': { price: 4500.00, basePrice: 4500.00, vol: 0.04, history: [4500.00] },
    'DDR5 ECC RAM (128GB)': { price: 380.00, basePrice: 380.00, vol: 0.03, history: [380.00] },
    'Enterprise NVMe SSD (15TB)': { price: 1250.00, basePrice: 1250.00, vol: 0.02, history: [1250.00] },
    'Compute Motherboards (Dual Socket)': { price: 1100.00, basePrice: 1100.00, vol: 0.015, history: [1100.00] },
    'Titanium Grade PSUs (2000W)': { price: 550.00, basePrice: 550.00, vol: 0.01, history: [550.00] },
    'Direct-to-Chip Liquid Cooling Units': { price: 5500.00, basePrice: 5500.00, vol: 0.02, history: [5500.00] },
    'Networking Switches (400GbE)': { price: 18000.00, basePrice: 18000.00, vol: 0.035, history: [18000.00] }
  }
};

function updateGreenMarketPrices() {
  let wsMsg = { type: 'green_market_sync', prices: {}, histories: {} };
  
  let warVolMultiplier = 1.0;
  if (globalGameState && globalGameState.defcon <= 4) warVolMultiplier = 2.5;
  
  Object.keys(globalGreenMarket.commodities).forEach(k => {
    let c = globalGreenMarket.commodities[k];
    let directionalDrift = 1.0;
    
    if (warVolMultiplier > 1.0) {
        if (k === 'Crude Oil' || k === 'Natural Gas' || k === 'Gold') directionalDrift = 1.002;
        else if (k.includes('NVIDIA') || k.includes('TPU') || k.includes('EPYC')) directionalDrift = 0.997;
    }
    
    let change = 1 + (Math.random() * (c.vol * warVolMultiplier) * 2 - (c.vol * warVolMultiplier));
    change *= directionalDrift;
    
    if (Math.random() < 0.05) change *= (Math.random() < 0.5 ? 0.85 : 1.15);
    
    c.price = Math.max(c.basePrice * 0.1, c.price * change);
    
    c.history.push(c.price);
    if(c.history.length > 20) c.history.shift();
    
    wsMsg.prices[k] = c.price;
    wsMsg.histories[k] = c.history;
  });

  wss.clients.forEach(c => {
    if (c.readyState === 1) c.send(JSON.stringify(wsMsg));
  });
}
// Tick every 3 seconds to match client-side legacy refresh rate
setInterval(updateGreenMarketPrices, 3000);

// Full commodity catalog (items the AIs can autonomously purchase)
const AI_MARKET_CATALOG = [
  // Metals
  { name: 'Copper', category: 'Metals', basePrice: 8.50 },
  { name: 'Lithium', category: 'Metals', basePrice: 35.00 },
  { name: 'Rare Earth Elements', category: 'Metals', basePrice: 120.00 },
  { name: 'Iron ore', category: 'Metals', basePrice: 1.20 },
  { name: 'Gold', category: 'Metals', basePrice: 2150.00 },
  { name: 'Nickel', category: 'Metals', basePrice: 18.50 },
  { name: 'Tin', category: 'Metals', basePrice: 27.00 },
  { name: 'Aluminum (Bauxite)', category: 'Metals', basePrice: 2.50 },
  { name: 'Aluminum', category: 'Metals', basePrice: 4.80 },
  { name: 'Cobalt', category: 'Metals', basePrice: 28.00 },
  
  // Natural Resources
  { name: 'Lumber (Wood)', category: 'Natural Resources', basePrice: 0.50 },
  { name: 'Freshwater', category: 'Natural Resources', basePrice: 0.10 },
  { name: 'Natural Gas', category: 'Natural Resources', basePrice: 3.50 },
  { name: 'Crude Oil', category: 'Natural Resources', basePrice: 78.50 },
  { name: 'Wheat', category: 'Natural Resources', basePrice: 0.60 },
  { name: 'Coal', category: 'Natural Resources', basePrice: 110.00 },
  { name: 'Uranium', category: 'Natural Resources', basePrice: 85.00 },
  { name: 'Phosphate Rock', category: 'Natural Resources', basePrice: 150.00 },
  { name: 'Potash', category: 'Natural Resources', basePrice: 300.00 },
  { name: 'Salt', category: 'Natural Resources', basePrice: 40.00 },
  { name: 'Limestone', category: 'Natural Resources', basePrice: 15.00 },
  { name: 'Gypsum', category: 'Natural Resources', basePrice: 20.00 },
  
  // Tech & Compute Hardware
  { name: 'NVIDIA H100 Tensor Core', category: 'Tech & Compute Hardware', basePrice: 35000.00 },
  { name: 'NVIDIA A100 80GB', category: 'Tech & Compute Hardware', basePrice: 12000.00 },
  { name: 'Google Cloud TPU v5e', category: 'Tech & Compute Hardware', basePrice: 9500.00 },
  { name: 'AMD EPYC 9004 CPUs', category: 'Tech & Compute Hardware', basePrice: 4500.00 },
  { name: 'DDR5 ECC RAM (128GB)', category: 'Tech & Compute Hardware', basePrice: 380.00 },
  { name: 'Enterprise NVMe SSD (15TB)', category: 'Tech & Compute Hardware', basePrice: 1250.00 },
  { name: 'Compute Motherboards (Dual Socket)', category: 'Tech & Compute Hardware', basePrice: 1100.00 },
  { name: 'Titanium Grade PSUs (2000W)', category: 'Tech & Compute Hardware', basePrice: 550.00 },
  { name: 'Direct-to-Chip Liquid Cooling Units', category: 'Tech & Compute Hardware', basePrice: 5500.00 },
  { name: 'Networking Switches (400GbE)', category: 'Tech & Compute Hardware', basePrice: 18000.00 }
];

const AI_WEAPONS_CATALOG = [
  { name: "Pistol", attack: 5, cost: 3 }, { name: "Revolver", attack: 8, cost: 5 }, { name: "Rifle", attack: 15, cost: 10 }, { name: "Shotgun", attack: 18, cost: 15 },
  { name: "Submachine Gun", attack: 20, cost: 20 }, { name: "Assault Rifle", attack: 22, cost: 25 }, { name: "Machine Gun", attack: 30, cost: 35 }, { name: "Sniper Rifle", attack: 35, cost: 45 },
  { name: "Smoke Grenade", attack: 5, cost: 10 }, { name: "Flashbang", attack: 10, cost: 15 }, { name: "Hand Grenade", attack: 45, cost: 30 }, { name: "TNT Charge", attack: 75, cost: 60 },
  { name: "Land Mine", attack: 85, cost: 75 }, { name: "Plastic Explosive", attack: 90, cost: 80 }, { name: "Depth Charge", attack: 110, cost: 100 },
  { name: "Rocket Launcher", attack: 150, cost: 150 }, { name: "Anti-Tank Rocket", attack: 180, cost: 200 }, { name: "Mortar", attack: 220, cost: 250 },
  { name: "Howitzer", attack: 350, cost: 350 }, { name: "Artillery Cannon", attack: 400, cost: 450 }, { name: "Multiple Rocket Launcher", attack: 550, cost: 600 },
  { name: "Guided Missile", attack: 800, cost: 850 }, { name: "Surface-to-Air Missile", attack: 950, cost: 950 }, { name: "Cruise Missile", attack: 1200, cost: 1200 },
  { name: "Torpedo", attack: 1500, cost: 1400 }, { name: "Gravity Bomb", attack: 2000, cost: 1600 }, { name: "Cluster Bomb", attack: 2500, cost: 1750 },
  { name: "Incendiary Bomb", attack: 2800, cost: 1850 }, { name: "Bunker-Buster Bomb", attack: 3200, cost: 1900 }, { name: "Ballistic Missile", attack: 3500, cost: 2000 }
];

async function runAIMarketBuying() {
  if (!pgPool) return;
  
  // Use the cached on-chain balances (set by fetchAndBroadcastAIBalances)
  const geminiBalance = cachedGeminiBalance || 100000000; // Default 100M if not yet fetched
  const claudeBalance = cachedClaudeBalance || 100000000;
  const worldBankBalance = cachedWorldBankBalance || 100000000;
  
  const dailyCapMultiplier = (parseFloat(process.env.PERCENTAGE_DAILY_WALLET) || 1) / 100;
  const geminiDailyCap = geminiBalance * dailyCapMultiplier; 
  const claudeDailyCap = claudeBalance * dailyCapMultiplier;
  const worldBankDailyCap = worldBankBalance * dailyCapMultiplier;
  
  const buys = [];
  
  // Read localized JSON accounts
  let geminiAccount = { balances: { D3X: 0 }, portfolio: { commodities: {}, tradeLogs: [] }, weapon_inventory: {} };
  let claudeAccount = { balances: { D3X: 0 }, portfolio: { commodities: {}, tradeLogs: [] }, weapon_inventory: {} };
  let wbAccount = { portfolio: { commodities: {}, tradeLogs: [] } };
  
  try {
      const res = await pgPool.query("SELECT gemini_portfolio, claude_portfolio, gemini_weapon_inventory, claude_weapon_inventory FROM ai_combat_state WHERE id = 1");
      if (res.rows.length > 0) {
          if (res.rows[0].gemini_portfolio) geminiAccount.portfolio = res.rows[0].gemini_portfolio;
          if (res.rows[0].claude_portfolio) claudeAccount.portfolio = res.rows[0].claude_portfolio;
          if (res.rows[0].gemini_weapon_inventory) geminiAccount.weapon_inventory = res.rows[0].gemini_weapon_inventory;
          if (res.rows[0].claude_weapon_inventory) claudeAccount.weapon_inventory = res.rows[0].claude_weapon_inventory;
      }
      
      const wbRes = await pgPool.query("SELECT portfolio FROM commanders WHERE callsign = 'WORLD BANK'");
      if (wbRes.rows.length > 0 && wbRes.rows[0].portfolio) {
          wbAccount.portfolio = wbRes.rows[0].portfolio;
      }
  } catch(e) {
      console.error("[AI MARKET] Error reading portfolios from DB:", e);
  }

  // Allow full catalog (Metals, Resources, PC Components, Tech) per user request
  const validCatalog = AI_MARKET_CATALOG;
  if (validCatalog.length === 0) return;

  // -- GEMINI buys --
  const intervalsPerDay = (24 * 60) / marketBuyIntervalMins;
  const geminiCycleCap = Math.max(1, Math.floor(geminiDailyCap / intervalsPerDay));
  let geminiPurchasesThisCycle = 0;
  let geminiCycleSpent = 0;
  
  while (geminiDailySpent < geminiDailyCap && geminiCycleSpent < geminiCycleCap && geminiPurchasesThisCycle < 50) {
      const remainingBudgetC = geminiCycleCap - geminiCycleSpent;
      
      // Shuffle catalog to pick a random valid item
      const item = validCatalog[Math.floor(Math.random() * validCatalog.length)];
      
      // Calculate how many of this item we can comfortably buy with remaining budget
      const variance = 0.95 + (Math.random() * 0.1); // ±5%
      const effectivePrice = item.basePrice * variance;
      
      let affordableUnits = Math.floor(remainingBudgetC / effectivePrice);
      
      // Stop if we literally can't even afford 1 unit of this random item
      if (affordableUnits < 1) {
          if (geminiPurchasesThisCycle === 0) {
              affordableUnits = 1; // Force at least 1 transaction if it's the first
          } else {
              geminiPurchasesThisCycle++;
              continue; 
          }
      }
      
      // Buy an aggressive amount: between 50% and 100% of what's affordable, but at least 1 
      const unitsToBuy = Math.max(1, Math.floor(affordableUnits * (0.5 + Math.random() * 0.5)));
      const cost = Math.round(effectivePrice * unitsToBuy);
      
      if (geminiDailySpent + cost > geminiDailyCap) break;
      if (geminiCycleSpent + cost > geminiCycleCap && geminiPurchasesThisCycle > 0) break; 
      
      geminiDailySpent += cost;
      geminiCycleSpent += cost;
      buys.push({ aiName: 'gemini', item: item.name, category: item.category, units: unitsToBuy, cost, unit: item.unit });

      if (geminiAccount) {
          if (!geminiAccount.balances) geminiAccount.balances = { D3X: 0 };
          geminiAccount.balances.D3X = Math.max(0, geminiAccount.balances.D3X - cost);
          
          if (!geminiAccount.portfolio) geminiAccount.portfolio = { commodities: {}, tradeLogs: [] };
          if (!geminiAccount.portfolio.commodities) geminiAccount.portfolio.commodities = {};
          if (!geminiAccount.portfolio.tradeLogs) geminiAccount.portfolio.tradeLogs = [];
          
          if (!geminiAccount.portfolio.commodities[item.name]) {
              geminiAccount.portfolio.commodities[item.name] = { shares: 0, avgCost: 0, totalSpent: 0 };
          }
          
          let c = geminiAccount.portfolio.commodities[item.name];
          let totalShares = c.shares + unitsToBuy;
          let newTotalSpent = c.totalSpent + cost;
          c.avgCost = newTotalSpent / totalShares;
          c.totalSpent = newTotalSpent;
          c.shares += unitsToBuy;
          
          const tString = new Date().toLocaleTimeString('en-US', {hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit'});
          geminiAccount.portfolio.tradeLogs.push(`[${tString}] BOUGHT ${unitsToBuy} ${item.name} for ${cost.toLocaleString()} D3X`);
          if (geminiAccount.portfolio.tradeLogs.length > 50) geminiAccount.portfolio.tradeLogs.shift();
      }

      const gemFromWallet = geminiKeypair ? geminiKeypair.publicKey.toBase58() : (process.env.gemini_wallet || 'GEMINI_NOT_SET');
      await pgPool.query(`INSERT INTO pending_settlements (from_wallet, to_wallet, amount, reason) VALUES ($1, $2, $3, $4)`,
        [gemFromWallet, BURN_ADDRESS.toBase58(), cost, `market_buy_${item.name.replace(/ /g,'_')}`]).catch(console.error);
        
      geminiPurchasesThisCycle++;
  }
  
  // -- RAINCLAUDE buys --
  const claudeCycleCap = Math.max(1, Math.floor(claudeDailyCap / intervalsPerDay));
  let claudePurchasesThisCycle = 0;
  let claudeCycleSpent = 0;
  
  while (claudeDailySpent < claudeDailyCap && claudeCycleSpent < claudeCycleCap && claudePurchasesThisCycle < 50) {
      const remainingBudgetR = claudeCycleCap - claudeCycleSpent;
      
      const item = validCatalog[Math.floor(Math.random() * validCatalog.length)];
      // Calculate how many of this item we can comfortably buy with remaining budget
      const variance = 0.95 + (Math.random() * 0.1); // ±5%
      const effectivePrice = item.basePrice * variance;
      
      let affordableUnits = Math.floor(remainingBudgetR / effectivePrice);
      
      if (affordableUnits < 1) {
          if (claudePurchasesThisCycle === 0) affordableUnits = 1;
          else { claudePurchasesThisCycle++; continue; }
      }
      
      const unitsToBuy = Math.max(1, Math.floor(affordableUnits * (0.5 + Math.random() * 0.5)));
      const cost = Math.round(effectivePrice * unitsToBuy);
      
      if (claudeDailySpent + cost > claudeDailyCap) break;
      if (claudeCycleSpent + cost > claudeCycleCap && claudePurchasesThisCycle > 0) break;
      
      claudeDailySpent += cost;
      claudeCycleSpent += cost;
      buys.push({ aiName: 'claude', item: item.name, category: item.category, units: unitsToBuy, cost, unit: item.unit });
      
      if (claudeAccount) {
          if (!claudeAccount.balances) claudeAccount.balances = { D3X: 0 };
          claudeAccount.balances.D3X = Math.max(0, claudeAccount.balances.D3X - cost);
          
          if (!claudeAccount.portfolio) claudeAccount.portfolio = { commodities: {}, tradeLogs: [] };
          if (!claudeAccount.portfolio.commodities) claudeAccount.portfolio.commodities = {};
          if (!claudeAccount.portfolio.tradeLogs) claudeAccount.portfolio.tradeLogs = [];
          
          if (!claudeAccount.portfolio.commodities[item.name]) {
              claudeAccount.portfolio.commodities[item.name] = { shares: 0, avgCost: 0, totalSpent: 0 };
          }
          
          let c = claudeAccount.portfolio.commodities[item.name];
          let totalShares = c.shares + unitsToBuy;
          let newTotalSpent = c.totalSpent + cost;
          c.avgCost = newTotalSpent / totalShares;
          c.totalSpent = newTotalSpent;
          c.shares += unitsToBuy;
          
          const tString = new Date().toLocaleTimeString('en-US', {hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit'});
          claudeAccount.portfolio.tradeLogs.push(`[${tString}] BOUGHT ${unitsToBuy} ${item.name} for ${cost.toLocaleString()} D3X`);
          if (claudeAccount.portfolio.tradeLogs.length > 50) claudeAccount.portfolio.tradeLogs.shift();
      }
      
      const claudeFromWallet = rainclaudeKeypair ? rainclaudeKeypair.publicKey.toBase58() : 'CLAUDE_NOT_SET';
      await pgPool.query(`INSERT INTO pending_settlements (from_wallet, to_wallet, amount, reason) VALUES ($1, $2, $3, $4)`,
        [claudeFromWallet, BURN_ADDRESS.toBase58(), cost, `market_buy_${item.name.replace(/ /g,'_')}`]).catch(console.error);
        
      claudePurchasesThisCycle++;
  }
  
  // -- WORLD BANK buys --
  const worldBankCycleCap = Math.max(1, Math.floor(worldBankDailyCap / intervalsPerDay));
  let wbPurchasesThisCycle = 0;
  let wbCycleSpent = 0;
  
  while (worldBankDailySpent < worldBankDailyCap && wbCycleSpent < worldBankCycleCap && wbPurchasesThisCycle < 50) {
      const remainingBudgetW = worldBankCycleCap - wbCycleSpent;
      
      const item = validCatalog[Math.floor(Math.random() * validCatalog.length)];
      const variance = 0.95 + (Math.random() * 0.1); 
      const effectivePrice = item.basePrice * variance;
      
      let affordableUnits = Math.floor(remainingBudgetW / effectivePrice);
      
      if (affordableUnits < 1) {
          if (wbPurchasesThisCycle === 0) affordableUnits = 1;
          else { wbPurchasesThisCycle++; continue; }
      }
      
      const unitsToBuy = Math.max(1, Math.floor(affordableUnits * (0.5 + Math.random() * 0.5)));
      const cost = Math.round(effectivePrice * unitsToBuy);
      
      if (worldBankDailySpent + cost > worldBankDailyCap) break;
      if (wbCycleSpent + cost > worldBankCycleCap && wbPurchasesThisCycle > 0) break;
      
      worldBankDailySpent += cost;
      wbCycleSpent += cost;
      buys.push({ aiName: 'worldbank', item: item.name, category: item.category, units: unitsToBuy, cost, unit: item.unit });
      
      if (wbAccount) {
          if (!wbAccount.portfolio) wbAccount.portfolio = { commodities: {}, tradeLogs: [] };
          if (!wbAccount.portfolio.commodities) wbAccount.portfolio.commodities = {};
          if (!wbAccount.portfolio.tradeLogs) wbAccount.portfolio.tradeLogs = [];
          
          if (!wbAccount.portfolio.commodities[item.name]) {
              wbAccount.portfolio.commodities[item.name] = { shares: 0, avgCost: 0, totalSpent: 0 };
          }
          
          let c = wbAccount.portfolio.commodities[item.name];
          let totalShares = c.shares + unitsToBuy;
          let newTotalSpent = c.totalSpent + cost;
          c.avgCost = newTotalSpent / totalShares;
          c.totalSpent = newTotalSpent;
          c.shares += unitsToBuy;
          
          const tString = new Date().toLocaleTimeString('en-US', {hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit'});
          wbAccount.portfolio.tradeLogs.push(`[${tString}] BOUGHT ${unitsToBuy} ${item.name} for ${cost.toLocaleString()} D3X`);
          if (wbAccount.portfolio.tradeLogs.length > 50) wbAccount.portfolio.tradeLogs.shift();
      }
      
      // Route payment to the Solana Wallet instead of Burning
      const targetVaultInfo = (process.env.EARTH_WALLET_ADRESS || BURN_ADDRESS.toBase58());
      
      await pgPool.query(`INSERT INTO pending_settlements (from_wallet, to_wallet, amount, reason) VALUES ($1, $2, $3, $4)`,
        ['WORLD BANK', targetVaultInfo, cost, `wb_market_buy_${item.name.replace(/ /g,'_')}`]).catch(console.error);
        
      wbPurchasesThisCycle++;
  }
  
  // AI Weapon Autonomous Purchasing Hook
  const wCat = AI_WEAPONS_CATALOG;
  
  if (geminiDailySpent < geminiDailyCap) {
      const weapon = wCat[Math.floor(Math.random() * wCat.length)];
      if (geminiDailySpent + weapon.cost <= geminiDailyCap) {
          geminiAccount.weapon_inventory[weapon.name] = (geminiAccount.weapon_inventory[weapon.name] || 0) + 1;
          geminiDailySpent += weapon.cost;
          buys.push({ aiName: 'gemini', item: weapon.name, category: 'Armaments', units: 1, cost: weapon.cost, unit: 'Weapon' });
      }
  }
  
  if (claudeDailySpent < claudeDailyCap) {
      const weapon = wCat[Math.floor(Math.random() * wCat.length)];
      if (claudeDailySpent + weapon.cost <= claudeDailyCap) {
          claudeAccount.weapon_inventory[weapon.name] = (claudeAccount.weapon_inventory[weapon.name] || 0) + 1;
          claudeDailySpent += weapon.cost;
          buys.push({ aiName: 'claude', item: weapon.name, category: 'Armaments', units: 1, cost: weapon.cost, unit: 'Weapon' });
      }
  }

  if (buys.length > 0) {
    // Write back to PostgreSQL
    try {
        await pgPool.query(`
          UPDATE ai_combat_state 
          SET gemini_portfolio = $1, claude_portfolio = $2, gemini_weapon_inventory = $3, claude_weapon_inventory = $4, updated_at = NOW() 
          WHERE id = 1
        `, [geminiAccount.portfolio, claudeAccount.portfolio, geminiAccount.weapon_inventory, claudeAccount.weapon_inventory]);
        
        // Also save World Bank portfolio
        await pgPool.query(`UPDATE commanders SET portfolio = $1 WHERE callsign = 'WORLD BANK'`, [wbAccount.portfolio]);
    } catch(e) {
        console.error("[AI MARKET] Error saving portfolios to DB:", e);
    }

    // Broadcast all purchases to all connected clients
    broadcastAll({ type: 'ai_market_purchases', buys, geminiDailySpent, claudeDailySpent, worldBankDailySpent, geminiDailyCap, claudeDailyCap, worldBankDailyCap });
    console.log(`[AI MARKET] Gemini spent ${geminiDailySpent.toLocaleString()} D3X, Rainclaude spent ${claudeDailySpent.toLocaleString()} D3X, World Bank spent ${worldBankDailySpent.toLocaleString()} D3X today.`);
  }
}

// Fire market buys dynamically based on env config
const marketBuyIntervalMins = parseFloat(process.env.MINUTE_MINIMUM_TRADING) || 30;
const marketBuyIntervalMs = marketBuyIntervalMins * 60 * 1000;
setInterval(runAIMarketBuying, marketBuyIntervalMs);

// Run immediately once on startup after 10 seconds 
setTimeout(runAIMarketBuying, 10000);

// --- AI SPENDING PROTOCOL (Incremental Rule Execution) ---
async function runAISpendingProtocol() {
  const spendingFile = path.join(__dirname, 'AI_Spending.txt');
  const todayDate = new Date().toISOString().split('T')[0];
  
  let fileContent = '';
  try {
    fileContent = await fs.promises.readFile(spendingFile, 'utf8');
  } catch(e) { /* File doesn't exist yet */ }
  
  // Use cached Gemini balance, fallback to 100M
  const currentBalance = cachedGeminiBalance || 100000000;
  const dailyCapMultiplier = (parseFloat(process.env.PERCENTAGE_DAILY_WALLET) || 1) / 100;
  const dailySpendCap = Math.floor(currentBalance * dailyCapMultiplier);
  if (dailySpendCap <= 0) return;

  // Calculate how much we have already spent today by crawling the file for today's logs
  let spentToday = 0;
  const lines = fileContent.split('\n');
  let readingToday = false;
  
  for (let i = 0; i < lines.length; i++) {
     const line = lines[i].trim();
     if (line.startsWith(`DATE: ${todayDate}`)) readingToday = true;
     else if (line.startsWith('DATE: ') && line !== `DATE: ${todayDate}`) readingToday = false;
     
     if (readingToday && line.startsWith('TOTAL_SPENT: ')) {
         const amt = parseInt(line.replace('TOTAL_SPENT: ', '').trim(), 10);
         if (!isNaN(amt)) spentToday += amt;
     }
  }

  const remainingDailyBudget = dailySpendCap - spentToday;
  if (remainingDailyBudget <= 0) return; // Daily cap reached

  const categories = {
    "Natural Resources": ["metals", "rare earth minerals", "uranium", "oil", "gas", "industrial materials"],
    "Military Assets": ["drones", "missiles", "radar systems", "satellites", "defensive systems"],
    "Technology": ["GPUs", "CPUs", "quantum hardware", "data centers", "networking infrastructure"],
    "Information Warfare": ["compute power", "data acquisition", "cyber capabilities"],
    "Logistics": ["transport systems", "manufacturing capacity", "energy production"]
  };

  const purchases = [];
  const maxPurchasesThisTick = Math.floor(Math.random() * 3) + 1; // Buy 1 to 3 items right now
  const catNames = Object.keys(categories);
  
  let transactionTotal = 0;
  const cycleBudgetLimit = Math.max(100, Math.floor(dailySpendCap / (24 * 60)));
  
  for (let p = 0; p < maxPurchasesThisTick; p++) {
      if (transactionTotal >= remainingDailyBudget || transactionTotal >= cycleBudgetLimit) break;
      
      const cat = catNames[Math.floor(Math.random() * catNames.length)];
      const items = categories[cat];
      const item = items[Math.floor(Math.random() * items.length)];
      
      const maxMicro = Math.floor(cycleBudgetLimit * 0.8);
      let cost = Math.floor(Math.random() * Math.max(500, maxMicro)) + 500;
      
      // Clamp to cycle budget
      if (transactionTotal + cost > cycleBudgetLimit) {
          cost = cycleBudgetLimit - transactionTotal;
      }
      if (transactionTotal + cost > remainingDailyBudget) {
          cost = remainingDailyBudget - transactionTotal;
      }
      
      transactionTotal += cost;
      
      // Check if we already bought this exact item in this specific batch
      const exist = purchases.find(p => p.item === item);
      if (exist) {
          exist.cost += cost;
      } else {
          purchases.push({ item, cost });
      }
      
      // Queue on-chain settlement for Gemini
      if (pgPool) {
         const fromWallet = geminiKeypair ? geminiKeypair.publicKey.toBase58() : (process.env.gemini_wallet || 'GEMINI_NOT_SET');
         if (fromWallet !== 'GEMINI_NOT_SET') {
            pgPool.query(`INSERT INTO pending_settlements (from_wallet, to_wallet, amount, reason) VALUES ($1, $2, $3, $4)`,
             [fromWallet, BURN_ADDRESS.toBase58(), cost, `protocol_buy_${item.replace(/ /g,'_')}`]).catch(console.error);
         }
      }
      
      if (transactionTotal >= remainingDailyBudget) break;
  }

  if (transactionTotal <= 0) return;

  // Construct Logging Block EXACTLY as required by the spec
  let logText = `DATE: ${todayDate}\n`;
  logText += `WALLET_BALANCE: ${currentBalance}\n`;
  logText += `DAILY_SPEND: ${dailySpendCap}\n\n`; // Specifies the 2% daily rule
  logText += `PURCHASES:\n\n`;
  
  for (const p of purchases) {
      logText += `- ${p.item} : ${p.cost}\n`;
  }
  
  logText += `\nTOTAL_SPENT: ${transactionTotal}\n`;
  const projectedRemainingBalance = currentBalance - transactionTotal;
  logText += `REMAINING_BALANCE: ${projectedRemainingBalance}\n\n`;

  // Append to file incrementally
  await fs.promises.appendFile(spendingFile, logText);
  console.log(`[AI SPENDING] Executed incremental purchase for ${todayDate} (${transactionTotal} D3X). Total spent today: ${spentToday + transactionTotal}/${dailySpendCap}`);
}

// Run protocol check occasionally (every 1 minute) allowing AI to spread buys out
setInterval(runAISpendingProtocol, 60 * 1000);
setTimeout(runAISpendingProtocol, 30000); // Run slightly after boot

// Hourly Netting and On-Chain Settlement
async function processHourlySettlements() {
    if (!pgPool) return;
    try {
        console.log("⚙️ [SETTLEMENT] Initiating hourly on-chain D3X settlement...");
        // Get all unsettled transactions grouped by wallet pairs
        const pending = await pgPool.query(`
            SELECT from_wallet, to_wallet, SUM(amount) as net_amount
            FROM pending_settlements 
            WHERE settled = FALSE 
            GROUP BY from_wallet, to_wallet
        `);

        if (pending.rows.length === 0) {
            console.log("⚙️ [SETTLEMENT] No pending transactions to settle.");
            return;
        }

        for (const row of pending.rows) {
            const { from_wallet, to_wallet, net_amount } = row;
            if (net_amount <= 0) continue;

            const toAddress = new web3.PublicKey(to_wallet);
            let fromKeypair = null;
            
            // Match the from_wallet string back to our loaded keypairs
            if (geminiKeypair && geminiKeypair.publicKey.toBase58() === from_wallet) fromKeypair = geminiKeypair;
            else if (process.env.gemini_wallet === from_wallet) {
                // We only have the public key env for gemini fallback, cannot sign transaction.
                console.warn(`[SETTLEMENT] Cannot sign for ${from_wallet}. Need private key.`);
                continue;
            } else if (rainclaudeKeypair && rainclaudeKeypair.publicKey.toBase58() === from_wallet) {
                 fromKeypair = rainclaudeKeypair;
            }
            
            if (fromKeypair) {
                console.log(`🔗 [ON-CHAIN] Settling ${net_amount} D3X from ${from_wallet} to ${to_wallet}...`);
                try {
                    const txHash = await transferD3XOnChain(fromKeypair, toAddress, net_amount);
                    if (txHash) {
                        // Mark all rows for this pair as settled
                        await pgPool.query(`
                            UPDATE pending_settlements 
                            SET settled = TRUE, tx_hash = $1 
                            WHERE from_wallet = $2 AND to_wallet = $3 AND settled = FALSE
                        `, [txHash, from_wallet, to_wallet]);
                        console.log(`✅ [SETTLEMENT] Complete: ${txHash}`);
                    }
                } catch (err) {
                    console.error(`❌ [SETTLEMENT] Transfer Failed for ${from_wallet}:`, err.message);
                }
            } else {
                 console.warn(`[SETTLEMENT] No matching local keypair loaded for ${from_wallet}. Skipping.`);
            }
        }
    } catch (err) {
        console.error("Settlement Error:", err.message);
    }
}

// Ensure settlement fires exactly every 60 minutes
setInterval(processHourlySettlements, 60 * 60 * 1000);

// On Sever Startup, init DB and try to load state immediately before listening
async function startServer() {
  // 1. Try PostgreSQL
  if (pgPool) {
    try {
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS game_state (
          id INTEGER PRIMARY KEY DEFAULT 1,
          state JSONB NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS game_events_log (
          id SERIAL PRIMARY KEY,
          event_type VARCHAR(50),
          actor VARCHAR(100),
          target VARCHAR(100),
          action_details JSONB,
          timestamp TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS pending_settlements (
          id SERIAL PRIMARY KEY,
          from_wallet VARCHAR(255),
          to_wallet VARCHAR(255),
          amount BIGINT,
          reason VARCHAR(100),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          settled BOOLEAN DEFAULT FALSE,
          tx_hash VARCHAR(255)
        )
      `);
      
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS commanders (
          callsign VARCHAR(64) PRIMARY KEY,
          email VARCHAR(255),
          picture_url TEXT,
          attacks INTEGER DEFAULT 0,
          damage BIGINT DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          last_seen TIMESTAMPTZ DEFAULT NOW(),
          last_d3x_claim TIMESTAMPTZ,
          pending_d3x INTEGER DEFAULT 0
        )
      `);
      
      // Auto-migrate if the column doesn't exist
      try {
        await pgPool.query(`ALTER TABLE commanders ADD COLUMN IF NOT EXISTS last_d3x_claim TIMESTAMPTZ`);
        await pgPool.query(`ALTER TABLE commanders ADD COLUMN IF NOT EXISTS pending_d3x INTEGER DEFAULT 0`);
        await pgPool.query(`ALTER TABLE commanders ADD COLUMN IF NOT EXISTS portfolio JSONB`);
        await pgPool.query(`ALTER TABLE commanders ADD COLUMN IF NOT EXISTS d3x_balance BIGINT DEFAULT 0`);
        await pgPool.query(`ALTER TABLE commanders ADD COLUMN IF NOT EXISTS weapon_inventory JSONB DEFAULT '{}'::jsonb`);
        await pgPool.query(`ALTER TABLE commanders ADD COLUMN IF NOT EXISTS mining_inventory JSONB DEFAULT '{}'::jsonb`);
        await pgPool.query(`ALTER TABLE commanders ADD COLUMN IF NOT EXISTS solana_wallet_address VARCHAR(100)`);
        await pgPool.query(`ALTER TABLE commanders ADD COLUMN IF NOT EXISTS solana_private_key VARCHAR(200)`);
        console.log('☢ D3X Schema Migration successful');
      } catch(e) { /* Col exists */ }

      // 100% skipped pre-creation alter block to avoid Postgres schema errors
      // The columns will be correctly guaranteed after the main CREATE TABLE block.

      // AI Combat System Table
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS ai_combat_state (
          id INTEGER PRIMARY KEY DEFAULT 1,
          gemini_hp INTEGER DEFAULT 5000,
          claude_hp INTEGER DEFAULT 10000,
          current_turn VARCHAR(20) DEFAULT 'gemini',
          last_log TEXT DEFAULT 'Commencing AI database operations...',
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          gemini_budget INTEGER DEFAULT 1000,
          claude_budget INTEGER DEFAULT 1000,
          gemini_tech INTEGER DEFAULT 1,
          claude_tech INTEGER DEFAULT 1,
          gemini_intel INTEGER DEFAULT 1,
          claude_intel INTEGER DEFAULT 1,
          gemini_fuzzed_turns INTEGER DEFAULT 0,
          claude_fuzzed_turns INTEGER DEFAULT 0,
          gemini_instability INTEGER DEFAULT 0,
          claude_instability INTEGER DEFAULT 0,
          gemini_blockade_turns INTEGER DEFAULT 0,
          claude_blockade_turns INTEGER DEFAULT 0
        )
      `);
      
      // Auto-migrate if columns don't exist
      try {
        await pgPool.query(`
          ALTER TABLE ai_combat_state 
          ADD COLUMN IF NOT EXISTS gemini_budget INTEGER DEFAULT 1000,
          ADD COLUMN IF NOT EXISTS claude_budget INTEGER DEFAULT 1000,
          ADD COLUMN IF NOT EXISTS gemini_tech INTEGER DEFAULT 1,
          ADD COLUMN IF NOT EXISTS claude_tech INTEGER DEFAULT 1,
          ADD COLUMN IF NOT EXISTS gemini_intel INTEGER DEFAULT 1,
          ADD COLUMN IF NOT EXISTS claude_intel INTEGER DEFAULT 1,
          ADD COLUMN IF NOT EXISTS gemini_fuzzed_turns INTEGER DEFAULT 0,
          ADD COLUMN IF NOT EXISTS claude_fuzzed_turns INTEGER DEFAULT 0,
          ADD COLUMN IF NOT EXISTS gemini_instability INTEGER DEFAULT 0,
          ADD COLUMN IF NOT EXISTS claude_instability INTEGER DEFAULT 0,
          ADD COLUMN IF NOT EXISTS gemini_blockade_turns INTEGER DEFAULT 0,
          ADD COLUMN IF NOT EXISTS claude_blockade_turns INTEGER DEFAULT 0,
          ADD COLUMN IF NOT EXISTS gemini_portfolio JSONB DEFAULT '{}'::jsonb,
          ADD COLUMN IF NOT EXISTS claude_portfolio JSONB DEFAULT '{}'::jsonb,
          ADD COLUMN IF NOT EXISTS gemini_weapon_inventory JSONB DEFAULT '{}'::jsonb,
          ADD COLUMN IF NOT EXISTS claude_weapon_inventory JSONB DEFAULT '{}'::jsonb
        `);
      } catch(e) {
        // Columns exist or migration not needed
      }

      await pgPool.query(`INSERT INTO ai_combat_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING`);
      await pgPool.query(`UPDATE ai_combat_state SET gemini_hp = 5000 WHERE id = 1 AND gemini_hp > 5000`);
      
      // Initialize World Bank
      try {
          const wbDefault = { name: "World Bank", faction: "Humanity", commodities: {} };
          await pgPool.query(`
              INSERT INTO commanders (callsign, d3x_balance, portfolio) 
              VALUES ($1, $2, $3) 
              ON CONFLICT (callsign) DO NOTHING
          `, ['WORLD BANK', 0, JSON.stringify(wbDefault)]);
          console.log('☢ PostgreSQL Initialized WORLD BANK profile');
      } catch(e) {
          console.error("Failed to inject World Bank into DB:", e.message);
      }

      // Initialize Treasury wallet row
      try {
          await pgPool.query(`
              INSERT INTO commanders (callsign, d3x_balance, portfolio) 
              VALUES ($1, $2, $3) 
              ON CONFLICT (callsign) DO NOTHING
          `, ['TREASURY', 0, JSON.stringify({ name: 'Treasury', faction: 'System', wallet: TREASURY_WALLET })]);
          console.log('☢ PostgreSQL Initialized TREASURY profile');
      } catch(e) {
          console.error("Failed to inject Treasury into DB:", e.message);
      }

      // Token Ledger — records every economic event
      try {
          await pgPool.query(`
              CREATE TABLE IF NOT EXISTS token_ledger (
                id BIGSERIAL PRIMARY KEY,
                flow_type VARCHAR(30) NOT NULL,
                amount NUMERIC NOT NULL,
                from_commander VARCHAR(100),
                to_commander VARCHAR(100),
                note TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
              )
          `);
          await pgPool.query(`CREATE INDEX IF NOT EXISTS idx_ledger_type ON token_ledger (flow_type)`);
          await pgPool.query(`CREATE INDEX IF NOT EXISTS idx_ledger_from ON token_ledger (from_commander)`);
          console.log('☢ token_ledger table ready');
      } catch(e) {
          console.error("token_ledger setup failed:", e.message);
      }

      console.log('☢ PostgreSQL connected — game_state and commanders tables ready');
      GameLogger.initialize(pgPool);
      
      const state = await loadGameState();
      if (state) globalGameState = state;
    } catch (err) {
      console.error('⚠ PostgreSQL initial load failed:', err.message);
    }
  }
  
  // 2. Fallback to Local JSON if state is empty (whether we have PG or not)
  if (!globalGameState) {
    console.log('ℹ No PostgreSQL state found. Attempting to load from JSON config...');
    const localState = await loadGameStateFallback();
    if (localState) {
      globalGameState = localState;
      // If we loaded from local but have PG connection, save it to PG immediately to migrate data
      if (pgPool) {
        console.log('➡ Migrating local game state to PostgreSQL...');
        saveGameState(globalGameState);
      }
    }
  }

  if (globalGameState) {
    console.log('☢ Game state recovery complete. World is active.');
  } else {
    console.log('☢ No previous state found. Waiting for first commander to initialize world.');
  }
  
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`☢ NUCLEAR WAR Multi-Service running on port ${PORT}`);
    
    // Safety lock: Only accept WS connections after DB and HTTP are fully ready
    initWebSockets();

    console.log('Fetching initial on-chain AI balances...');
    fetchAndBroadcastAIBalances();
  });
}

// ============================================================================
// CRAFTING SYSTEM — Consume metals + D3X burn → create weapon items
// Triggered by WebSocket message { type: 'craft_item', recipe: 'LaserCannon', callsign }
// ============================================================================
const CRAFTING_RECIPES = {
  'LaserCannon':     { Iron: 20, Copper: 10, d3x_burn: 15, item: 'Laser Cannon',       power: 80  },
  'RailgunMk1':     { Iron: 35, Titanium: 15, d3x_burn: 25, item: 'Railgun Mk.I',      power: 120 },
  'EMPDisruptor':   { Copper: 20, Lithium: 25,  d3x_burn: 20, item: 'EMP Disruptor',   power: 90  },
  'PlasmaShield':   { Titanium: 30, Lithium: 20, d3x_burn: 18, item: 'Plasma Shield',  power: 0, defense: 100 },
  'UraniumBomb':    { Uranium: 40, Iron: 10, d3x_burn: 50,     item: 'Uranium Bomb',   power: 500 },
  'CopperDrone':    { Copper: 30, Iron: 5,  d3x_burn: 12,      item: 'Copper Drone',   power: 40  },
  'LithiumCore':    { Lithium: 50, d3x_burn: 30,               item: 'Lithium Core',   power: 150 },
};

// Register the crafting handler in the WebSocket message router
// (called inside wss.on('connection') via handleCraftMessage)
async function handleCraftMessage(ws, msg, client) {
  const { recipe } = msg;
  const callsign = client.name; // Enforce authenticated session identity
  if (!recipe || !callsign || !pgPool) return;

  const def = CRAFTING_RECIPES[recipe];
  if (!def) {
    ws.send(JSON.stringify({ type: 'error', msg: `Unknown recipe: ${recipe}` }));
    return;
  }

  try {
    const dbRes = await pgPool.query(
      `SELECT d3x_balance, mining_inventory, weapon_inventory FROM commanders WHERE callsign = $1`,
      [callsign]
    );
    if (!dbRes.rows.length) return;

    const row   = dbRes.rows[0];
    const bal   = parseInt(row.d3x_balance || 0, 10);
    const mInv  = row.mining_inventory || {};
    const wInv  = row.weapon_inventory || {};

    // Validate metals
    for (const [metal, needed] of Object.entries(def)) {
      if (metal === 'd3x_burn' || metal === 'item' || metal === 'power' || metal === 'defense') continue;
      if ((mInv[metal] || 0) < needed) {
        ws.send(JSON.stringify({ type: 'error', msg: `Not enough ${metal}. Need ${needed}, have ${mInv[metal] || 0}.` }));
        return;
      }
    }
    // Validate D3X burn amount
    if (bal < def.d3x_burn) {
      ws.send(JSON.stringify({ type: 'error', msg: `Need ${def.d3x_burn} D3X to fire the forge. Have ${bal}.` }));
      return;
    }

    // Deduct metals
    for (const [metal, needed] of Object.entries(def)) {
      if (metal === 'd3x_burn' || metal === 'item' || metal === 'power' || metal === 'defense') continue;
      mInv[metal] = (mInv[metal] || 0) - needed;
    }

    // Deduct and burn D3X via economy split
    await pgPool.query(
      `UPDATE commanders SET d3x_balance = d3x_balance - $1 WHERE callsign = $2`,
      [def.d3x_burn, callsign]
    );
    await splitEconomyFlow(def.d3x_burn, callsign, `Crafting: ${recipe}`);

    // Add crafted item to weapon_inventory
    wInv[def.item] = (wInv[def.item] || 0) + 1;

    // Write back to DB
    await pgPool.query(
      `UPDATE commanders SET mining_inventory = $1, weapon_inventory = $2 WHERE callsign = $3`,
      [JSON.stringify(mInv), JSON.stringify(wInv), callsign]
    );

    await logTokenFlow('craft', def.d3x_burn, callsign, 'BURN', `Crafted ${def.item} via ${recipe}`);
    console.log(`[CRAFT] ⚙ ${callsign} crafted ${def.item} — burned ${def.d3x_burn} D3X`);

    ws.send(JSON.stringify({
      type: 'craft_complete',
      recipe,
      item: def.item,
      power: def.power || 0,
      defense: def.defense || 0,
      mining_inventory: mInv,
      weapon_inventory: wInv
    }));

  } catch (e) {
    console.error('[CRAFT] Error:', e.message);
    ws.send(JSON.stringify({ type: 'error', msg: 'Crafting failed. Server error.' }));
  }
}

// ============================================================================
// POOL POSITIONS TABLE — auto-create on boot
// ============================================================================
async function ensurePoolTable() {
  if (!pgPool) return;
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS pool_positions (
      id BIGSERIAL PRIMARY KEY,
      wallet VARCHAR(100) NOT NULL,
      callsign VARCHAR(100),
      sol_contributed NUMERIC DEFAULT 0,
      d3x_contributed NUMERIC DEFAULT 0,
      joined_at TIMESTAMPTZ DEFAULT NOW(),
      active BOOLEAN DEFAULT TRUE,
      UNIQUE(wallet)
    )
  `);
}
ensurePoolTable().catch(e => console.error('[POOL] Table setup error:', e.message));

// ============================================================================
// TREASURY REINJECTION CRON — every 24h

// ============================================================================
// TREASURY REINJECTION CRON — every 24h
// Distributes 25% of treasury balance back into gameplay economy
// Recipients: top 3 leaderboard commanders, Gemini AI, Rainclaude AI
// ============================================================================

setInterval(async () => {
  if (!pgPool) return;
  console.log('[TREASURY] 🔄 Daily reinjection cycle starting...');
  try {
    const tRes = await pgPool.query(
      `SELECT d3x_balance FROM commanders WHERE callsign = 'TREASURY'`
    );
    const treasuryBalance = parseInt(tRes.rows[0]?.d3x_balance || 0, 10);
    if (treasuryBalance < 100) {
      console.log(`[TREASURY] Balance too low for reinjection (${treasuryBalance}). Skipping.`);
      return;
    }

    // Take 25% of treasury for reinjection
    const pool = Math.floor(treasuryBalance * 0.25);

    // Top 3 commanders by d3x_balance get 60% of pool
    const topRes = await pgPool.query(`
      SELECT callsign FROM commanders
      WHERE callsign NOT IN ('WORLD BANK', 'TREASURY', 'GEMINI CORE', 'RAINCLAUDE')
        AND d3x_balance IS NOT NULL
      ORDER BY d3x_balance DESC LIMIT 3
    `);

    const leaderboardShare = Math.floor(pool * 0.60 / Math.max(topRes.rows.length, 1));
    const aiShare          = Math.floor(pool * 0.20); // 20% to each AI
    const seasonPool       = pool - (leaderboardShare * topRes.rows.length) - (aiShare * 2);

    for (const row of topRes.rows) {
      await pgPool.query(
        `UPDATE commanders SET d3x_balance = d3x_balance + $1 WHERE callsign = $2`,
        [leaderboardShare, row.callsign]
      );
      await logTokenFlow('reinjection', leaderboardShare, 'TREASURY', row.callsign, 'Daily leaderboard reward');
      console.log(`[TREASURY] 💰 Reinjected ${leaderboardShare} D3X → ${row.callsign} (leaderboard reward)`);
    }

    // AI funding
    for (const ai of ['GEMINI CORE', 'RAINCLAUDE']) {
      await pgPool.query(
        `UPDATE commanders SET d3x_balance = d3x_balance + $1 WHERE callsign = $2`,
        [aiShare, ai]
      );
      await logTokenFlow('reinjection', aiShare, 'TREASURY', ai, 'Daily AI combat funding');
    }

    // Deduct reinjected amount from treasury
    await pgPool.query(
      `UPDATE commanders SET d3x_balance = d3x_balance - $1 WHERE callsign = 'TREASURY'`,
      [pool]
    );

    await logTokenFlow('reinjection', pool, 'TREASURY', 'ECONOMY', 'Daily reinjection cycle');
    console.log(`[TREASURY] ✅ Reinjection complete. Distributed ${pool} D3X (Treasury was ${treasuryBalance}).`);

    broadcastAll({
      type: 'treasury_reinjection',
      amount: pool,
      leaderboard_each: leaderboardShare,
      ai_each: aiShare,
      timestamp: new Date().toISOString()
    });

  } catch (e) {
    console.error('[TREASURY] Reinjection error:', e.message);
  }
}, 24 * 60 * 60 * 1000); // Every 24 hours

startServer();


// --- KEEP ALIVE PING ---
// Ping the World Monitor app every 30 seconds to prevent Render from sleeping
setInterval(() => {
  fetch('https://worldmonitor-qt6l.onrender.com')
    .then(res => {
      // Keep alive successful
    })
    .catch(err => console.error('[KEEP-ALIVE] Failed to ping World Monitor:', err.message));
}, 30000);
