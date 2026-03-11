require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await pool.query("SELECT claude_portfolio, claude_weapon_inventory FROM ai_combat_state WHERE id = 1");
    console.log("Claude Data:");
    console.log(JSON.stringify(res.rows[0], null, 2));
  } catch(e) { console.error(e); }
  pool.end();
}
run();
