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
  pgPool.query(`
    CREATE TABLE IF NOT EXISTS game_state (
      id INTEGER PRIMARY KEY DEFAULT 1,
      state JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).then(() => {
    console.log('☢ PostgreSQL connected — game_state table ready');
  }).catch(err => {
    console.error('⚠ PostgreSQL table creation failed:', err.message);
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

async function saveGameState(gs) {
  if (!pgPool) return;
  try {
    await pgPool.query(`
      INSERT INTO game_state (id, state, updated_at)
      VALUES (1, $1, NOW())
      ON CONFLICT (id) DO UPDATE SET state = $1, updated_at = NOW()
    `, [JSON.stringify(gs)]);
  } catch (err) {
    console.error('⚠ Failed to save game state:', err.message);
  }
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

// On Sever Startup, try load state from DB immediately
loadGameState().then(state => {
  if (state) globalGameState = state;
});

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
    isHost: client.isHost
  }));
  
  // Notify others
  broadcast({
    type: 'player_joined',
    name: client.name,
    totalPlayers: connectedClients.size
  }, ws);

  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {

      case 'rename': {
        client.name = msg.name || client.name;
        break;
      }

      case 'start_game': {
        // First player hits "JOIN" and the DB had no state, so they generated a fresh world.
        // We ingest it as the global truth.
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

      case 'get_saved_state': {
        // Redundant, but just in case they ask again
        ws.send(JSON.stringify({ type: 'saved_state', gameState: globalGameState, isHost: client.isHost }));
        break;
      }

      case 'chat': {
        broadcastAll({
          type: 'chat',
          name: client.name,
          text: msg.text
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

server.listen(PORT, () => {
  console.log(`☢ NUCLEAR WAR Multi-Service running on port ${PORT}`);
});
