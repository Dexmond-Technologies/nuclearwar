require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await pool.query("SELECT gemini_portfolio, claude_portfolio FROM ai_combat_state WHERE id = 1");
    if (res.rows.length > 0) {
      const type = typeof res.rows[0].gemini_portfolio;
      console.log("DB Type of gemini_portfolio:", type);
      console.log("Is Stringified?", type === 'string');
    }
  } catch(e) { console.error("Database connection error:", e.message); } 
  finally { pool.end(); }
}
run();
