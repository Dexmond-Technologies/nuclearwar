const { Pool } = require('pg');
require('dotenv').config({ path: 'env' });
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
async function run() {
  const res = await pool.query("SELECT * FROM commanders WHERE callsign = 'GEMINI CORE'");
  console.log(JSON.stringify(res.rows, null, 2));
  pool.end();
}
run();
