/**
 * NUCLEAR WAR — WebSocket Multiplayer Server
 * Run: node server.js
 * Listens on ws://localhost:8080
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
// node-fetch is built-in in Node 18+, but we use it gracefully.
const { RadioBrowserApi } = require('radio-browser-api');
const radioApi = new RadioBrowserApi('NuclearWarGame-DexmondTech');
const { OAuth2Client } = require('google-auth-library');

// Start AISStream Client
const AIS_KEY = 'da80da037d260301abf6f89de4df9c3ba3395b24';
const aisSocket = new WebSocket('wss://stream.aisstream.io/v0/stream');

let activeBoats = {};

aisSocket.onopen = () => {
  console.log('🚢 Connected to AIS Stream');
  const subscriptionMessage = {
      Apikey: AIS_KEY,
      BoundingBoxes: [[[-90, -180], [90, 180]]], // Global
      FiltersShipMMSI: [], 
      FilterMessageTypes: ["PositionReport"]
  };
  aisSocket.send(JSON.stringify(subscriptionMessage));
  
  // Re-subscribe every 5 minutes to keep alive, as aisstream can drop idle connections
  setInterval(() => {
     if (aisSocket.readyState === WebSocket.OPEN) {
         aisSocket.send(JSON.stringify(subscriptionMessage));
     }
  }, 5 * 60 * 1000);
};

aisSocket.onmessage = (event) => {
  try {
      const msg = JSON.parse(event.data);
      console.log('AIS RAW:', msg.MessageType, msg.MetaData?.ShipName);
      if (msg.MessageType === "PositionReport") {
          const report = msg.Message.PositionReport;
          const mmsi = msg.MetaData.MMSI;
          
          activeBoats[mmsi] = {
              mmsi: mmsi,
              name: msg.MetaData.ShipName ? msg.MetaData.ShipName.trim() : 'UNKNOWN VESSEL',
              lat: report.Latitude,
              lon: report.Longitude,
              cog: report.Cog,      // Course over ground
              sog: report.Sog,      // Speed over ground
              timestamp: Date.now()
          };
      }
  } catch (err) {}
};

aisSocket.onerror = (error) => console.log('AIS WebSocket Error:', error);
aisSocket.onclose = () => console.log('AIS WebSocket Closed');

// Clean up old boats every minute to prevent memory leak
setInterval(() => {
    const now = Date.now();
    for (const mmsi in activeBoats) {
        if (now - activeBoats[mmsi].timestamp > 600000) { // 10 minutes
            delete activeBoats[mmsi];
        }
    }
}, 60000);


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

const PORT = process.env.PORT || 4000;

// --- OpenSky API Caching Proxy ---
let cachedFlights = '{"time":0,"states":[]}';
let lastFlightFetch = 0;
const FLIGHT_CACHE_TTL = 30000; // 30 seconds

async function fetchOpenSky() {
  if (Date.now() - lastFlightFetch < FLIGHT_CACHE_TTL) return;
  lastFlightFetch = Date.now();
  try {
    // We fetch a global or large bounding box. For stability without auth, we limit to a smaller global box or just all.
    // The public API /api/states/all can be heavy, but we'll try it and cache heavily.
    const res = await fetch('https://opensky-network.org/api/states/all');
    if (res.ok) {
      const data = await res.text();
      cachedFlights = data;
      console.log('✈ Successfully refreshed global flight data from OpenSky.');
    } else {
      console.warn('⚠ OpenSky API rate limited or unavailable:', res.status);
    }
  } catch (err) {
    console.error('⚠ OpenSky Fetch Error:', err.message);
  }
}
// Start initial fetch
fetchOpenSky();
setInterval(fetchOpenSky, FLIGHT_CACHE_TTL);


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
  } else if (req.url === '/api/flights') {
    // Serve the cached OpenSky JSON
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(cachedFlights);
  } else if (req.url === '/api/boats') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(Object.values(activeBoats)));
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
      countryCode: randomCountry
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
  } else if (req.url === '/api/webcams') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    fetch('https://api.windy.com/webcams/api/v3/webcams?limit=250&include=location,player&modifiers=live', {
      method: 'GET',
      headers: { 'x-windy-api-key': 'vEqfjmfqyPguO0tTOX5gKMTXH6sz5dZR' }
    })
    .then(r => r.json())
    .then(data => res.end(JSON.stringify({ result: data })))
    .catch(err => {
      console.error('Webcam API error:', err);
      res.end(JSON.stringify({ error: 'Failed to fetch webcams' }));
    });
  } else if (req.url.startsWith('/api/webcams/')) {
    const webcamId = req.url.split('/')[3];
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    fetch(`https://api.windy.com/webcams/api/v3/webcams/${webcamId}?include=player`, {
      method: 'GET',
      headers: { 'x-windy-api-key': 'vEqfjmfqyPguO0tTOX5gKMTXH6sz5dZR' }
    })
    .then(r => r.json())
    .then(data => res.end(JSON.stringify({ result: data })))
    .catch(err => {
      console.error('Single Webcam API error:', err);
      res.end(JSON.stringify({ error: 'Failed to fetch webcam' }));
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
        // Relay Raincloud reasoning to all clients
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
          last_seen TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      
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
