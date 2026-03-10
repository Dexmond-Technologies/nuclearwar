require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const wallet = 'GTCJmbURDU42opNv7nzjT5dZ4SJ2VoYLr2r9LQYbB5uW';
  try {
    const res = await pool.query(
      `INSERT INTO commanders (callsign, last_seen, attacks, damage, d3x_balance) 
       VALUES ($1, NOW(), 0, 0, 500) 
       ON CONFLICT (callsign) DO UPDATE 
       SET d3x_balance = commanders.d3x_balance + 500
       RETURNING d3x_balance;`, 
       [wallet]
    );
    console.log(`Success! New balance for ${wallet}: ${res.rows[0].d3x_balance} D3X`);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    pool.end();
  }
}
run();
