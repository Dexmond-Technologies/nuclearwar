require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkDB() {
    try {
        const res = await pool.query("SELECT * FROM ai_combat_state WHERE id = 1");
        console.log(JSON.stringify(res.rows[0], null, 2));
    } catch (e) {
        console.error("DB Error:", e);
    } finally {
        pool.end();
    }
}
checkDB();
