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

const rooms = {}; // roomCode -> { players, gameState, host }

function genCode() {
  return Math.random().toString(36).substr(2, 4).toUpperCase();
}

function broadcast(room, msg, excludeWs = null) {
  const data = JSON.stringify(msg);
  room.players.forEach(p => {
    if (p.ws !== excludeWs && p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(data);
    }
  });
}

function broadcastAll(room, msg) {
  broadcast(room, msg, null);
}

wss.on('connection', ws => {
  let currentRoom = null;
  let playerIndex = -1;

  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {

      case 'create_room': {
        const code = genCode();
        const player = { ws, name: msg.name || 'Player 1', index: 0 };
        rooms[code] = {
          code,
          players: [player],
          maxPlayers: msg.maxPlayers || 4,
          gameState: null,
          started: false
        };
        currentRoom = rooms[code];
        playerIndex = 0;
        ws.send(JSON.stringify({ type: 'room_created', code, playerIndex: 0 }));
        console.log(`Room ${code} created by ${player.name}`);
        break;
      }

      case 'join_room': {
        const room = rooms[msg.code];
        if (!room) { ws.send(JSON.stringify({ type: 'error', msg: 'Room not found' })); return; }
        if (room.started) { ws.send(JSON.stringify({ type: 'error', msg: 'Game already started' })); return; }
        if (room.players.length >= room.maxPlayers) { ws.send(JSON.stringify({ type: 'error', msg: 'Room full' })); return; }

        playerIndex = room.players.length;
        const player = { ws, name: msg.name || `Player ${playerIndex + 1}`, index: playerIndex };
        room.players.push(player);
        currentRoom = room;

        ws.send(JSON.stringify({ type: 'room_joined', code: msg.code, playerIndex }));

        // Notify others of new player
        broadcast(room, {
          type: 'player_joined',
          name: player.name,
          playerIndex,
          totalPlayers: room.players.length
        }, ws);
        console.log(`${player.name} joined room ${msg.code}`);
        break;
      }

      case 'start_game': {
        if (!currentRoom || currentRoom.started) return;
        currentRoom.started = true;
        currentRoom.gameState = msg.gameState;
        broadcastAll(currentRoom, { type: 'game_start', gameState: msg.gameState });
        break;
      }

      case 'action': {
        // Relay any player action to all others
        if (!currentRoom) return;
        broadcast(currentRoom, {
          type: 'action',
          playerIndex,
          action: msg.action
        }, ws);
        break;
      }

      case 'state_update': {
        // Full state sync — save to DB and relay to other players
        if (!currentRoom) return;
        currentRoom.gameState = msg.gameState;
        saveGameState(msg.gameState); // persist to PostgreSQL
        broadcast(currentRoom, {
          type: 'state_update',
          gameState: msg.gameState,
          playerIndex
        }, ws);
        break;
      }

      case 'get_saved_state': {
        // Client requests persisted game state on connect
        loadGameState().then(savedState => {
          if (savedState) {
            ws.send(JSON.stringify({ type: 'saved_state', gameState: savedState }));
            console.log('✓ Sent saved state to connecting client');
          } else {
            ws.send(JSON.stringify({ type: 'saved_state', gameState: null }));
          }
        });
        break;
      }

      case 'chat': {
        if (!currentRoom) return;
        broadcastAll(currentRoom, {
          type: 'chat',
          playerIndex,
          name: currentRoom.players[playerIndex]?.name,
          text: msg.text
        });
        break;
      }

      case 'get_players': {
        if (!currentRoom) return;
        ws.send(JSON.stringify({
          type: 'player_list',
          players: currentRoom.players.map(p => ({ name: p.name, index: p.index }))
        }));
        break;
      }
    }
  });

  ws.on('close', () => {
    if (!currentRoom) return;
    currentRoom.players = currentRoom.players.filter(p => p.ws !== ws);
    if (currentRoom.players.length === 0) {
      delete rooms[currentRoom.code];
      console.log(`Room ${currentRoom.code} closed (empty)`);
    } else {
      broadcastAll(currentRoom, { type: 'player_left', playerIndex });
    }
  });
});

server.listen(PORT, () => {
  console.log(`☢ NUCLEAR WAR Multi-Service running on port ${PORT}`);
});
