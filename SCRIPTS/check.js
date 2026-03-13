require('dotenv').config();
const { Pool } = require('pg');

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await pgPool.query("SELECT * FROM commanders WHERE callsign = 'RAINCLAUDE'");
    console.log("RAINCLAUDE TABLE:", res.rows[0]);
  } catch (e) {
    console.error(e);
  } finally {
    pgPool.end();
  }
}
run();
