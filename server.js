/**
 * NUCLEAR WAR — WebSocket Multiplayer Server
 * Run: node server.js
 * Listens on ws://localhost:8080
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

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

const PORT = process.env.PORT || 8080;

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
const chatHistory = [];

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

  // Auto-send the current global state (or lack thereof) to the new player
  ws.send(JSON.stringify({ 
    type: 'saved_state', 
    gameState: globalGameState,
    isHost: client.isHost,
    chatHistory: chatHistory
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
        chatHistory.push(chatObj);
        if (chatHistory.length > 50) chatHistory.shift();
        
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
