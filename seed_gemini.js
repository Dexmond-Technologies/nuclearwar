const { Pool } = require('pg');
require('dotenv').config({ path: 'env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const portfolio = {
    commodities: {
      "Bitcoin": 15.5,
      "Ethereum": 450.2,
      "Solana": 12500,
      "USDC": 1500000
    }
  };

  const mining = {
    "GOLD (XAU)": 500,
    "SILVER (XAG)": 12000,
    "PLATINUM (XPT)": 150,
    "PALLADIUM (XPD)": 80,
    "URANIUM (U3O8)": 2500
  };

  const weapons = {
    "LaserCannon": 50,
    "UraniumBomb": 12,
    "EMPDisruptor": 30,
    "PlasmaShield": 100
  };

  try {
    await pool.query(`
      INSERT INTO commanders (callsign, d3x_balance, portfolio, mining_inventory, weapon_inventory)
      VALUES ('GEMINI CORE', 5000000, $1::jsonb, $2::jsonb, $3::jsonb)
      ON CONFLICT (callsign) DO UPDATE 
      SET 
        portfolio = EXCLUDED.portfolio,
        mining_inventory = EXCLUDED.mining_inventory,
        weapon_inventory = EXCLUDED.weapon_inventory,
        d3x_balance = EXCLUDED.d3x_balance
    `, [JSON.stringify(portfolio), JSON.stringify(mining), JSON.stringify(weapons)]);
    
    console.log("Successfully UPSERTED GEMINI CORE inventory with real data in PostgreSQL!");
  } catch (err) {
    console.error("Failed to seed:", err);
  } finally {
    pool.end();
  }
}

run();
