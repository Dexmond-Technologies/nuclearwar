require('dotenv').config();
const { Pool } = require('pg');

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await pgPool.query("SELECT callsign, d3x_balance FROM commanders");
    console.log("ALL COMMANDERS:", res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    pgPool.end();
  }
}
run();
