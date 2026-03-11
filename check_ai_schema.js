const { Pool } = require('pg');
const pool = new Pool({});

async function run() {
  try {
    const res = await pool.query("SELECT gemini_portfolio, claude_portfolio, gemini_weapon_inventory, claude_weapon_inventory FROM ai_combat_state WHERE id = 1");
    console.log(JSON.stringify(res.rows[0], null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
