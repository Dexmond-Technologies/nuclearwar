const { Pool } = require('pg');
const pool = new Pool();
async function run() {
  try {
    const res = await pool.query("SELECT gemini_portfolio, claude_portfolio FROM ai_combat_state WHERE id = 1");
    console.log(JSON.stringify(res.rows[0], null, 2));
  } catch(e) { console.error(e); }
  pool.end();
}
run();
