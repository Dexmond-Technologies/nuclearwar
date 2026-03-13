require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function queryDB() {
  try {
    const res = await pool.query("SELECT gemini_portfolio, claude_portfolio, gemini_weapon_inventory, claude_weapon_inventory FROM ai_combat_state WHERE id = 1");
    if (res.rows.length > 0) {
      console.log('Gemini Portfolio:', JSON.stringify(res.rows[0].gemini_portfolio, null, 2));
      console.log('Gemini Weapons:', JSON.stringify(res.rows[0].gemini_weapon_inventory, null, 2));
      console.log('Claude Portfolio:', JSON.stringify(res.rows[0].claude_portfolio, null, 2));
    } else {
      console.log('No row found.');
    }
    pool.end();
  } catch (err) {
    console.error(err);
    pool.end();
  }
}
queryDB();
