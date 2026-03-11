require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkDB() {
    try {
        const res = await pool.query("SELECT callsign, d3x_balance, solana_wallet_address FROM commanders");
        console.table(res.rows);
    } catch (e) {
        console.error("DB Error:", e);
    } finally {
        pool.end();
    }
}
checkDB();
