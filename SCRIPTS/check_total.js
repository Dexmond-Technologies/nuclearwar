require('dotenv').config();
const { Pool } = require('pg');

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await pgPool.query("SELECT SUM(d3x_balance) as total FROM commanders");
    console.log("Total tokens in Database (Commanders table):", res.rows[0].total);

    // Also checking AI Offline Spending baseline if it exists
    try {
      const fs = require('fs');
      const spendingFile = './AI_Spending.txt';
      const content = fs.readFileSync(spendingFile, 'utf8');
      const lines = content.split('\n').filter(l => l.trim().length > 0);
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].startsWith('REMAINING_BALANCE:')) {
          const bal = parseFloat(lines[i].replace('REMAINING_BALANCE:', '').trim());
          console.log(`AI OFFLINE SYNC Baseline balance: ${bal * 2} D3X (Gemini + Claude)`);
          break;
        }
      }
    } catch (e) {
      console.log('No AI Spending file found for offline balances.');
    }

  } catch (e) {
    console.error("Database query failed:", e);
  } finally {
    pgPool.end();
  }
}

run();
