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

// Solana Wallet Integration
const web3 = require('@solana/web3.js');
const splToken = require('@solana/spl-token');
const D3X_MINT_ADDRESS = new web3.PublicKey('AGN8SrMCMEgiP1ghvPHa5VRf5rPFDSYVrGFyBGE1Cqpa');
const solanaConnection = new web3.Connection(web3.clusterApiUrl('mainnet-beta'), 'confirmed');
let authorityKeypair = null;
if (process.env.SOLANA_WALLET_PRIVATE_KEY) {
  try {
    const secretKeyString = process.env.SOLANA_WALLET_PRIVATE_KEY;
    // Decode base58
    const bs58 = require('bs58');
    const decode = bs58.decode || (bs58.default && bs58.default.decode);
    const decodedKey = decode(secretKeyString);
    if (decodedKey.length === 64) {
      authorityKeypair = web3.Keypair.fromSecretKey(decodedKey);
    } else {
      console.error('⚠ Solana Wallet Private Key has incorrect length:', decodedKey.length);
    }
    if (authorityKeypair) console.log('✅ Solana Authority Wallet Loaded:', authorityKeypair.publicKey.toBase58());
  } catch(e) {
    console.error('⚠ Failed to load Solana Wallet Private Key:', e.message);
  }
} else {
  console.log('ℹ No SOLANA_WALLET_PRIVATE_KEY found in environment');
}

// node-fetch is built-in in Node 18+, but we use it gracefully.
const { RadioBrowserApi } = require('radio-browser-api');
const radioApi = new RadioBrowserApi('NuclearWarGame-DexmondTech');
const { OAuth2Client } = require('google-auth-library');


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

const PORT = process.env.PORT || 8888;

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

  } else if (req.url === '/api/radio/random') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    // Fetch unlimited free stations using the radio-browser-api!
    // We pick a random country to ensure global diversity, instead of getting stuck on top Spanish ones
    const countries = ['US', 'GB', 'FR', 'DE', 'IT', 'JP', 'BR', 'RU', 'IN', 'ZA', 'AU', 'CA', 'KR', 'MX', 'EG', 'NL', 'SE', 'NO', 'FI', 'TR', 'GR'];
    const randomCountry = countries[Math.floor(Math.random() * countries.length)];
    radioApi.searchStations({
      limit: 100,
      hideBroken: true,
      hasGeoInfo: true,
      countryCode: randomCountry,
      tagList: ['music']
    })
    .then(stations => {
      // Shuffle and slice randomly
      const shuffled = stations.sort(() => 0.5 - Math.random());
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
      btcWallet: process.env.BTC_WALLET || "NOT_SET"
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
        fetch(`https://openwebcamdb.com/api/v1/webcams?page=${i}&per_page=100`, {
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
          if (pgPool) {
            // Upsert into our commanders database and RETURNING stats
            const res = await pgPool.query(`
              INSERT INTO commanders (callsign, email, picture_url, last_seen) 
              VALUES ($1, $2, $3, NOW()) 
              ON CONFLICT (callsign) DO UPDATE 
              SET email = EXCLUDED.email, picture_url = EXCLUDED.picture_url, last_seen = NOW()
              RETURNING attacks, damage
            `, [client.name, client.email, client.picture]);
            
            if (res.rows.length > 0) {
              attacks = res.rows[0].attacks || 0;
              damage = res.rows[0].damage || 0;
            }
          }

          console.log(`✓ Google Auth Success: ${client.name} (${client.email}) connected.`);
          
          ws.send(JSON.stringify({ 
            type: 'google_auth_success', 
            name: client.name,
            picture: client.picture,
            stats: { attacks, damage }
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
        if (pgPool) {
          try {
            // Upsert into our commanders database (Use wallet as callsign/identity)
            const res = await pgPool.query(`
              INSERT INTO commanders (callsign, last_seen) 
              VALUES ($1, NOW()) 
              ON CONFLICT (callsign) DO UPDATE 
              SET last_seen = NOW()
              RETURNING attacks, damage
            `, [client.name]);
            
            if (res.rows.length > 0) {
              attacks = res.rows[0].attacks || 0;
              damage = res.rows[0].damage || 0;
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
          stats: { attacks, damage }
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

      case 'start_game': {
        // Prevent clearing existing world if already active
        if (globalGameState) {
           console.log('⚠ Rejected start_game — world is already active');
           ws.send(JSON.stringify({ type: 'error', msg: 'World already exists' }));
           break;
        }
        globalGameState = msg.gameState;
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
          globalGameState = { players: [], countries: {}, activePlayerIndex: 0 };
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
            RETURNING attacks, damage
          `, [callsign]);
          
          ws.send(JSON.stringify({
            type: 'commander_stats',
            stats: { attacks: res.rows[0].attacks, damage: parseInt(res.rows[0].damage) }
          }));
        } catch (err) {
          console.error('DB Error on get_commander_stats:', err.message);
        }
        break;
      }

      case 'datacenter_stake': {
        const callsign = msg.callsign;
        const plan = msg.plan;
        const amount = msg.amount || 100;
        if (!callsign) break;
        
        if (!globalGameState) {
          globalGameState = { players: [], countries: {}, activePlayerIndex: 0 };
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
        const damage = msg.damage || 0;
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
           await pgPool.query(`UPDATE commanders SET pending_d3x = pending_d3x + 5 WHERE callsign = $1`, [client.name]);
           console.log(`[REWARD] Commander ${client.name} played 10 mins. +5 D3X pending.`);
           client.ws.send(JSON.stringify({ 
               type: 'd3x_reward', 
               amount: 5,
               message: '5 D3X Accumulated (10 min session)'
           }));
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
                 await pgPool.query(`UPDATE commanders SET last_d3x_claim = NOW(), pending_d3x = 0 WHERE callsign = $1`, [client.name]);
                 
                 // If Solana Authority Wallet is loaded, do real crypto drop, else mock drop
                 if (authorityKeypair) {
                     await processDailyTokenDrop(client.name, client.wallet, pending);
                 } else {
                     console.log(`ℹ [SOLANA OFF] Mock-Dropped ${pending} D3X to ${client.name}. Provide valid SOLANA_WALLET_PRIVATE_KEY for real token transfer.`);
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
    if (data.error) {
      console.error("Claude API Returned Error:", data.error.message);
      return { action: "KINETIC_STRIKE", damage: 150, log: "Rainclaude API Quota Limit. Initiating automated countermeasures." };
    }
    const text = data.content[0].text.trim();
    return JSON.parse(text);
  } catch (err) {
    console.error("Claude API Parse Error:", err.message);
    return { action: "KINETIC_STRIKE", damage: 150, log: "Rainclaude uplink severed. Initiating fallback measures." };
  }
}

function processAIAction(result, actor, victim) {
  // Regenerate Budget: base 100, halved if blockaded
  actor.budget += actor.blockade_turns > 0 ? 50 : 100;
  
  // Decrement status effects
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
      processAIAction(strike, geminiStats, claudeStats);
      turnLog = `[GEMINI: ${strike.action || 'KINETIC_STRIKE'}] ${strike.log}`;
      state.current_turn = 'claude';
    } else {
      strike = await fetchClaudeStrike(claudeStats, geminiStats);
      processAIAction(strike, claudeStats, geminiStats);
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

// Tick the combat every 30 minutes (1800000ms) to maintain persistent global conflict with minimal API cost
setInterval(runAICombatTurn, 1800000);

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
        console.log('☢ D3X Schema Migration successful');
      } catch(e) { /* Col exists */ }

      // AI Combat System Table
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS ai_combat_state (
          id INTEGER PRIMARY KEY DEFAULT 1,
          gemini_hp INTEGER DEFAULT 10000,
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
          ADD COLUMN IF NOT EXISTS claude_blockade_turns INTEGER DEFAULT 0
        `);
      } catch(e) {
        // Columns exist or migration not needed
      }

      await pgPool.query(`INSERT INTO ai_combat_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING`);
      
      console.log('☢ PostgreSQL connected — game_state and commanders tables ready');
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
  
  server.listen(PORT, () => {
    console.log(`☢ NUCLEAR WAR Multi-Service running on port ${PORT}`);
    
    // Safety lock: Only accept WS connections after DB and HTTP are fully ready
    initWebSockets();
  });
}

startServer();
