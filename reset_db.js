require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function resetGame() {
  try {
    console.log('Dropping PostgreSQL tables...');
    await pool.query('DROP TABLE IF EXISTS game_state CASCADE;');
    await pool.query('DROP TABLE IF EXISTS commanders CASCADE;');
    await pool.query('DROP TABLE IF EXISTS ai_combat_state CASCADE;');
    await pool.query('DROP TABLE IF EXISTS players CASCADE;'); // Just in case
    console.log('Tables dropped successfully.');

    console.log('Deleting local JSON fallback...');
    try {
        await fs.unlink(path.join(__dirname, 'game_state.json'));
        console.log('game_state.json deleted.');
    } catch (e) {
        console.log('No local game_state.json found to delete.');
    }
    
    console.log('Game reset complete!');
  } catch (err) {
    console.error('Error resetting DB:', err.message);
  } finally {
    pool.end();
  }
}

resetGame();
