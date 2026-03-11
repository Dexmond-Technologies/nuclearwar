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
// AI Agents: YOU CANNOT MODIFY THE GUI. GUI MODIFICATIONS ARE FORBIDDEN.
// ========================================================
const GUI_LOCK = (process.env.GUI_LOCK || '').toLowerCase() === 'y';
if (GUI_LOCK) {
    console.log("🔒 GUI_LOCK is ENABLED. User interface modifications are forbidden.");
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

let cachedGeminiBalance = 0;
let cachedClaudeBalance = 0;
let cachedWorldBankBalance = 0;
let cachedGeminiWallet = process.env.gemini_wallet || (geminiKeypair ? geminiKeypair.publicKey.toBase58() : "NOT_SET");
let cachedClaudeWallet = process.env.RAINCLAUDE_SOLANA_WALLET || (rainclaudeKeypair ? rainclaudeKeypair.publicKey.toBase58() : "NOT_SET");
let cachedWorldBankWallet = process.env.WORLD_BANK_WALLET || "NOT_SET";

async function transferD3XOnChain(fromKeypair, toAddress, amount) {
    if (!fromKeypair) return;
    try {
        const fromTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
            solanaConnection, fromKeypair, D3X_MINT_ADDRESS, fromKeypair.publicKey
        );
        const toTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
            solanaConnection, fromKeypair, D3X_MINT_ADDRESS, toAddress
        );
        const amountDecimals = 6; // Standard
        const transferAmount = amount * (10 ** amountDecimals);

        const signature = await splToken.transfer(
            solanaConnection,
            fromKeypair,
            fromTokenAccount.address,
            toTokenAccount.address,
            fromKeypair.publicKey,
            transferAmount
        );
        console.log(`🔗 [Solana Mainnet] Physical Tx Sent! Burned ${amount} D3X. Signature: ${signature}`);
        
        // Broadcast the real transaction to all connected players
        broadcastAll({
            type: 'ai_onchain_txn',
            from: fromKeypair === geminiKeypair ? 'GEMINI CORE' : (fromKeypair === rainclaudeKeypair ? 'RAINCLAUDE' : 'WORLD BANK/EARTH'),
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


  } else if (req.url === '/api/radio/random') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
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
      'Access-Control-Allow-Origin': '*'
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
      'Access-Control-Allow-Origin': '*'
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
        'Access-Control-Allow-Origin': '*'
      });
      
      const readStream = fs.createReadStream(filePath);
      readStream.pipe(res);
    });
  } else if (req.url === '/api/boats') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
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
      'Access-Control-Allow-Origin': '*'
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
      'Access-Control-Allow-Origin': '*'
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
            // Need a webhook secret to verify signature securely. Falling back to basic event parsing for now if no secret
            if (process.env.STRIPE_WEBHOOK_SECRET) {
                event = stripe.webhooks.constructEvent(bodyData, sig, process.env.STRIPE_WEBHOOK_SECRET);
            } else {
                console.warn('⚠ No STRIPE_WEBHOOK_SECRET provided, bypassing signature verification.');
                event = JSON.parse(bodyData);
            }
        } catch (err) {
            console.error(`Webhook Error: ${err.message}`);
            res.writeHead(400);
            return res.end(`Webhook Error: ${err.message}`);
        }

        // Handle the checkout.session.completed event
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
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
                
                // Execute the on-chain transfer from the main Authority wallet
                if (authorityKeypair) {
                    const txSig = await transferD3XOnChain(authorityKeypair, new web3.PublicKey(userWallet), 500);
                    if (txSig && pgPool) {
                        try {
                            await pgPool.query(`UPDATE commanders SET d3x_balance = d3x_balance + 500 WHERE callsign = $1`, [userWallet]);
                        } catch(e) { console.error('DB Update error for stripe purchase:', e.message); }
                    }
                } else {
                    console.error('[STRIPE] Authority wallet (EARTH_WALLET_PRIVATE_KEY) not configured! Cannot send 500 D3X.');
                }
            } else {
                console.warn('[STRIPE] Purchase successful, but no Solana Wallet address was provided by the user in the checkout session.');
            }
        }

        res.writeHead(200);
        res.end(JSON.stringify({received: true}));
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

  // Immediately send cached AI balances
  ws.send(JSON.stringify({
    type: 'ai_d3x_balances',
    gemini: cachedGeminiBalance || 100000000,
    claude: cachedClaudeBalance || 100000000,
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

  ws.on('message', async raw => {
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
                privateKeyHex: privateWalletHex,
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
        const success = msg.success;
        const reward = msg.rewardAmount || 0;
        const callsign = msg.callsign || 'Unknown';
        const companyName = msg.companyName || 'Unknown Corp';

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

            // Load, Update, Save
            const res = await pgPool.query(`SELECT mining_inventory FROM commanders WHERE callsign = $1`, [client.name]);
            if (res.rows.length > 0) {
                let inv = res.rows[0].mining_inventory || { iron: 0, copper: 0, gold: 0, silver: 0, coal: 0, titanium: 0, lithium: 0, rare_earth: 0 };
                
                // Merge new resources into total inventory
                Object.keys(resources).forEach(k => {
                    inv[k] = (inv[k] || 0) + resources[k];
                });
                
                // Persist
                await pgPool.query(`UPDATE commanders SET mining_inventory = $1 WHERE callsign = $2`, [inv, client.name]);
                
                ws.send(JSON.stringify({ type: 'mountain_dig_result', items: resources, inventory: inv }));
            }
        } catch(e) {
            console.error('Mountain Dig Error:', e);
        }
        break;
      }

      case 'request_loan': {
        const walletAddr = msg.wallet;
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
        const walletAddr = msg.wallet;
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
          const walletAddr = msg.wallet;
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
                  const res = await pgPool.query(`SELECT portfolio FROM commanders WHERE callsign = $1`, [walletAddr]);
                  if (res.rows.length > 0 && res.rows[0].portfolio) {
                      let port = res.rows[0].portfolio;
                      let lastKnown = port.lastKnownOnChainBalance || liveOnChainBal;
                      let localLedger = port.localD3XBalance !== undefined ? port.localD3XBalance : liveOnChainBal;
                      
                      // If the user acquired MORE tokens on-chain since last save, add the difference to their buying power
                      if (liveOnChainBal > lastKnown) {
                          localLedger += (liveOnChainBal - lastKnown);
                      } else if (liveOnChainBal < lastKnown) {
                          // If they withdrew on-chain, subtract buying power (clamp to 0)
                          localLedger = Math.max(0, localLedger - (lastKnown - liveOnChainBal));
                      }
                      
                      // Auto-update the portfolio with the newly synced tracking watermark
                      port.lastKnownOnChainBalance = liveOnChainBal;
                      port.localD3XBalance = localLedger;
                      await pgPool.query(`UPDATE commanders SET portfolio = $1 WHERE callsign = $2`, [port, walletAddr]);
                      
                      ws.send(JSON.stringify({ type: 'my_d3x_balance', amount: localLedger, activeLoan: port.active_loan || null }));
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
        const callsign = msg.callsign;
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
        const callsign = msg.callsign;
        const stakeId = msg.stakeId;
        if (!callsign || !stakeId || !globalGameState || !globalGameState.stakes) break;
        
        const stakeIdx = globalGameState.stakes.findIndex(s => s.id === stakeId && s.callsign === callsign);
        if (stakeIdx >= 0) {
            const stake = globalGameState.stakes[stakeIdx];
            // Penalty: lose all yields, and lose 10% of principal
            const returnedPrincipal = stake.amountStaked * 0.90;
            globalGameState.stakes.splice(stakeIdx, 1);
            saveGameState(globalGameState);
            
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
        const callsign = msg.callsign;
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
        const callsign = msg.callsign;
        const targetCountry = msg.targetCountry; // Assuming msg now includes targetCountry
        const damage = msg.damage || 0;
        const success = msg.success; // Assuming msg now includes success
        
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
        const amount = msg.amount || 50;
        if (!pgPool) return;
        try {
          if (target === 'gemini') {
            await pgPool.query("UPDATE ai_combat_state SET gemini_hp = gemini_hp + $1 WHERE id = 1", [amount]);
            console.log(`[HUMAN SUPPORT] ${client.name} healed Gemini (+${amount} HP).`);
          } else if (target === 'claude') {
            await pgPool.query("UPDATE ai_combat_state SET claude_hp = claude_hp - $1 WHERE id = 1", [amount]);
            console.log(`[HUMAN SUPPORT] ${client.name} attacked Rainclaude (-${amount} HP).`);
          }
        } catch (e) {
          console.error('DB Error on human_combat_support:', e.message);
        }
        break;
      }
      
      case 'process_mine_click': {
        const callsign = msg.callsign;
        const mineId = msg.mineId;
        if (!callsign || !mineId) break;

        // Ensure server-side memory for this commander's dig state exists
        if (!globalGameState.digStates) globalGameState.digStates = {};
        if (!globalGameState.digStates[callsign]) globalGameState.digStates[callsign] = {};
        if (!globalGameState.digStates[callsign][mineId]) {
            globalGameState.digStates[callsign][mineId] = { clicks: 0 };
        }
        
        const state = globalGameState.digStates[callsign][mineId];
        
        // Cost: 3 to 6 coins
        const cost = Math.floor(Math.random() * 4) + 3;
        // Reward: 2 coins
        const baseReward = 2;
        
        let treasure = 0;
        let isJackpot = false;
        
        state.clicks++;
        
        if (state.clicks >= 10) {
            treasure = 35;
            isJackpot = true;
            state.clicks = 0; // Reset dig cycle
        }
        
        const netChange = baseReward + treasure - cost;
        
        // Respond to client so they can update their local memory and UI
        ws.send(JSON.stringify({
            type: 'mine_click_result',
            mineId: mineId,
            cost: cost,
            baseReward: baseReward,
            treasure: treasure,
            isJackpot: isJackpot,
            netChange: netChange,
            clicks: state.clicks
        }));
        
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
                    ...portfolioData // Let client override commodities, logs, and localD3XBalance
                };
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

      case 'buy_weapon': {
        const callsign = msg.callsign;
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
                        balance: cachedGeminiBalance || 100000000,
                        hp: row.gemini_hp || 10000,
                        portfolio: row.gemini_portfolio || { commodities: {}, mining_inventory: {} },
                        weapons: row.gemini_weapon_inventory || {}
                    },
                    claude: {
                        balance: cachedClaudeBalance || 100000000,
                        hp: row.claude_hp || 10000,
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

// 1. D3X MINING LOOP (Checks every 5 seconds for completed 1-hour mines)
setInterval(async () => {
    if (!pgPool) return;
    const now = Date.now();
    
    for (const client of connectedClients) {
        if (client.miningEndTime && now >= client.miningEndTime) {
            const callsign = client.name;
            const reward = 10.0;
            
            // Clear their timer so it doesn't loop
            client.miningEndTime = null;
            
            try {
                // Award the 10 D3X directly to their balance
                await pgPool.query(`UPDATE commanders SET d3x_balance = d3x_balance + $1 WHERE callsign = $2`, [reward, callsign]);
                console.log(`[MINING] 💎 Commander ${callsign} finished 1-hour mining! Awarded ${reward} D3X.`);
                
                // Alert the specific client
                if (client.ws.readyState === WebSocket.OPEN) {
                    client.ws.send(JSON.stringify({
                        type: 'mining_complete',
                        amount: reward
                    }));
                }
            } catch (e) {
                console.error("[MINING] Error awarding D3X:", e.message);
            }
        }
    }
}, 5000);

// --- Solana On-Chain Logic ---
async function processDailyTokenDrop(callsign, userWalletAddress, amountToDrop = 5) {
  if (!authorityKeypair) {
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
        authorityKeypair,    // payer
        D3X_MINT_ADDRESS,    // mint
        authorityKeypair.publicKey // owner
    );
    
    // Retrieve or Create the Receiver's ATA for D3X
    // The authorityKeypair covers the rent storage cost if they don't have the ATA yet!
    const toTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
        solanaConnection,
        authorityKeypair,
        D3X_MINT_ADDRESS,
        toPublicKey
    );
    
    // Query the mint directly to dynamically fetch the decimals
    const mintInfo = await splToken.getMint(solanaConnection, D3X_MINT_ADDRESS);
    const transferAmount = amountToDrop * Math.pow(10, mintInfo.decimals);
    
    // Execute the Token Transfer!
    const signature = await splToken.transfer(
        solanaConnection,
        authorityKeypair,
        fromTokenAccount.address,
        toTokenAccount.address,
        authorityKeypair.publicKey,
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
      
      // Every 10 mins: add 5 D3X to pending_d3x
      if ((now - client.connectedAt) >= 600000 /* 10 mins */) {
        try {
           client.connectedAt = now; // reset session timer for next 10 mins
           
           // Check for active stakes giving the 2x Multiplier (>= 10,000 staked)
           let multiplier = 1;
           if (globalGameState && globalGameState.stakes) {
               const validStake = globalGameState.stakes.find(s => 
                   s.callsign === client.name && s.amountStaked >= 10000 && now < s.unlockAt
               );
               if (validStake) {
                   multiplier = 2;
               }
           }
           
           if (client.autoReinvest) {
               multiplier = 2; // Auto-Reinvest enables 2x multiplier
           }
           
           const amountEarned = 5 * multiplier;

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
               
               console.log(`[REWARD] Commander ${client.name} played 10 mins. +${amountEarned} D3X auto-reinvested (Multiplier: ${multiplier}x).`);
               
               client.ws.send(JSON.stringify({ 
                   type: 'd3x_reward', 
                   amount: amountEarned,
                   message: `${amountEarned} D3X Auto-Reinvested (10 min session)`
               }));
           } else {
               await pgPool.query(`UPDATE commanders SET pending_d3x = pending_d3x + $2 WHERE callsign = $1`, [client.name, amountEarned]);
               console.log(`[REWARD] Commander ${client.name} played 10 mins. +${amountEarned} D3X pending (Multiplier: ${multiplier}x).`);
               client.ws.send(JSON.stringify({ 
                   type: 'd3x_reward', 
                   amount: amountEarned,
                   message: `${amountEarned} D3X Accumulated (10 min session)`
               }));
           }
           
           if (multiplier > 1) {
               client.ws.send(JSON.stringify({ type: 'd3x_multiplier_active' }));
           }
        } catch(e) {
           console.error('⚠ Error updating pending D3X:', e.message);
        }
      }

      // Check 12-hour auto-claim logic:
      try {
        const res = await pgPool.query(`SELECT last_d3x_claim, pending_d3x FROM commanders WHERE callsign = $1`, [client.name]);
        if (res.rows.length > 0) {
           const lastClaim = res.rows[0].last_d3x_claim;
           const pending = res.rows[0].pending_d3x;
           
           if (pending > 0) {
              let canClaim = false;
              if (!lastClaim) canClaim = true;
              else {
                 const msSinceClaim = now - new Date(lastClaim).getTime();
                 if (msSinceClaim >= 43200000 /* 12 hours */) canClaim = true;
              }

              if (canClaim) {
                 console.log(`[REWARD] Commander ${client.name} reached 12h threshold. Auto-claiming ${pending} D3X.`);
                 await pgPool.query(`UPDATE commanders SET last_d3x_claim = NOW(), pending_d3x = 0, d3x_balance = d3x_balance + $2 WHERE callsign = $1`, [client.name, pending]);
                 
                 // If Solana Authority Wallet is loaded, do real crypto drop, else mock drop
                 if (authorityKeypair) {
                     await processDailyTokenDrop(client.name, client.wallet, pending);
                 } else {
                     console.log(`ℹ [SOLANA OFF] Mock-Dropped ${pending} D3X to ${client.name}. Internal balance updated. Provide valid EARTH_WALLET_PRIVATE_KEY for real token transfer.`);
                 }
                 
                 client.ws.send(JSON.stringify({ 
                   type: 'd3x_reward', 
                   amount: pending,
                   message: `${pending} D3X Coins Airdropped! (12-Hour Batch Claimed)`
                 }));
              }
           }
        }
      } catch(e) {
          console.error('⚠ Error checking D3X db record:', e.message);
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
                message: `${stake.amountReturn} D3X YIELD (Datacenter Stake Matured)`
              }));
          } else {
               console.log(`[STAKE REWARD] Player ${stake.callsign} offline. D3X disbursed to local cache or lost.`);
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
  if (!process.env.CLAUDE_API) return { action: "KINETIC_STRIKE", damage: 100, log: "Rainclaude executes a default EMP burst." };
  try {
    const prompt = buildAIPrompt("Rainclaude", "Gemini", myStats, geminiStats);
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.CLAUDE_API,
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
      console.error("Claude API Returned Error or Empty Content:", data.error ? data.error.message : data);
      return { action: "KINETIC_STRIKE", damage: 150, log: "Rainclaude API Quota Limit. Initiating automated countermeasures." };
    }
    const text = data.content[0].text.trim();
    return JSON.parse(text);
  } catch (err) {
    console.error("Claude API Parse Error:", err.message);
    return { action: "KINETIC_STRIKE", damage: 150, log: "Rainclaude uplink severed. Initiating fallback measures." };
  }
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
                    geminiBalance = 50000; // Database state if no token account yet
                }
            }
        } catch(e) { console.error('Gemini balance error:', e.message); geminiBalance = cachedGeminiBalance || 50000; }
        
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
                claudeBalance = 45000; // DB fallback
            }
            
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

        } catch(e) { console.error('Claude balance error:', e.message); claudeBalance = cachedClaudeBalance || 45000; }

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
  // Force Gemini to maximize its daily cap
  let geminiPurchasesThisCycle = 0;
  while (geminiDailySpent < geminiDailyCap && geminiPurchasesThisCycle < 50) { // Safety break at 50 iterations
      const remainingBudgetC = geminiDailyCap - geminiDailySpent;
      
      // Shuffle catalog to pick a random valid item
      const item = validCatalog[Math.floor(Math.random() * validCatalog.length)];
      
      // Calculate how many of this item we can comfortably buy with remaining budget
      const variance = 0.95 + (Math.random() * 0.1); // ±5%
      const effectivePrice = item.basePrice * variance;
      
      // Divide remaining budget by 100 so it can sustain 1-min intervals all day
      let affordableUnits = Math.floor((remainingBudgetC / 100) / effectivePrice);
      
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
      
      if (geminiDailySpent + cost > geminiDailyCap && geminiPurchasesThisCycle > 0) break; // Bypass safety check for 1st trade
      
      geminiDailySpent += cost;
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
  // Force Rainclaude to maximize its daily cap
  let claudePurchasesThisCycle = 0;
  while (claudeDailySpent < claudeDailyCap && claudePurchasesThisCycle < 50) { // Safety break at 50 iterations
      const remainingBudgetR = claudeDailyCap - claudeDailySpent;
      
      const item = validCatalog[Math.floor(Math.random() * validCatalog.length)];
      // Calculate how many of this item we can comfortably buy with remaining budget
      const variance = 0.95 + (Math.random() * 0.1); // ±5%
      const effectivePrice = item.basePrice * variance;
      
      // Divide remaining budget by 100 so it can sustain 1-min intervals all day
      let affordableUnits = Math.floor((remainingBudgetR / 100) / effectivePrice);
      
      if (affordableUnits < 1) {
          if (claudePurchasesThisCycle === 0) {
              affordableUnits = 1;
          } else {
              claudePurchasesThisCycle++;
              continue;
          }
      }
      
      const unitsToBuy = Math.max(1, Math.floor(affordableUnits * (0.5 + Math.random() * 0.5)));
      const cost = Math.round(effectivePrice * unitsToBuy);
      
      if (claudeDailySpent + cost > claudeDailyCap && claudePurchasesThisCycle > 0) break; // Final safety check
      
      claudeDailySpent += cost;
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
  
  // -- WORLD BANK buys (No weapons, routed to SOLANA vault) --
  let wbPurchasesThisCycle = 0;
  while (worldBankDailySpent < worldBankDailyCap && wbPurchasesThisCycle < 50) {
      const remainingBudgetWB = worldBankDailyCap - worldBankDailySpent;
      const item = validCatalog[Math.floor(Math.random() * validCatalog.length)];
      const variance = 0.95 + (Math.random() * 0.1); 
      const effectivePrice = item.basePrice * variance;
      
      let affordableUnits = Math.floor((remainingBudgetWB / 100) / effectivePrice);
      
      if (affordableUnits < 1) {
          if (wbPurchasesThisCycle === 0) affordableUnits = 1;
          else { wbPurchasesThisCycle++; continue; }
      }
      
      const unitsToBuy = Math.max(1, Math.floor(affordableUnits * (0.5 + Math.random() * 0.5)));
      const cost = Math.round(effectivePrice * unitsToBuy);
      
      if (worldBankDailySpent + cost > worldBankDailyCap && wbPurchasesThisCycle > 0) break; 
      
      worldBankDailySpent += cost;
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
  
  for (let p = 0; p < maxPurchasesThisTick; p++) {
      if (transactionTotal >= remainingDailyBudget) break;
      
      const cat = catNames[Math.floor(Math.random() * catNames.length)];
      const items = categories[cat];
      const item = items[Math.floor(Math.random() * items.length)];
      
      // Determine cost for this micro-buy (between 5,000 and 15% of remaining budget)
      const maxMicro = Math.floor(remainingDailyBudget * 0.15);
      let cost = Math.floor(Math.random() * Math.max(5000, maxMicro)) + 5000;
      
      // Clamp to remaining budget
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

      try {
          await pgPool.query(`ALTER TABLE ai_combat_state ADD COLUMN IF NOT EXISTS gemini_portfolio JSONB DEFAULT '{}'::jsonb`);
          await pgPool.query(`ALTER TABLE ai_combat_state ADD COLUMN IF NOT EXISTS claude_portfolio JSONB DEFAULT '{}'::jsonb`);
          await pgPool.query(`ALTER TABLE ai_combat_state ADD COLUMN IF NOT EXISTS gemini_weapon_inventory JSONB DEFAULT '{}'::jsonb`);
          await pgPool.query(`ALTER TABLE ai_combat_state ADD COLUMN IF NOT EXISTS claude_weapon_inventory JSONB DEFAULT '{}'::jsonb`);
      } catch(e) { console.warn("ai_combat_state migration:", e.message); }

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
          ADD COLUMN IF NOT EXISTS gemini_portfolio JSONB,
          ADD COLUMN IF NOT EXISTS claude_portfolio JSONB
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
