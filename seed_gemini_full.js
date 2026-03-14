const { Pool } = require('pg');
require('dotenv').config({ path: 'env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const portfolio = {
    commodities: {
      "USDC": 1500000,
      "Solana": 12500,
      "Bitcoin": 15.5,
      "Ethereum": 450.2,
      "XRP (Ripple)": 500000,
      "Cardano (ADA)": 250000,
      "Polkadot (DOT)": 45000,
      "Chainlink (LINK)": 15000,
      "NVIDIA H100 GPUs": 4096,
      "NVIDIA A100 GPUs": 8192,
      "TPU v5 Pods": 128,
      "NVDA Stock": 5000,
      "MSTR Stock": 400
    }
  };

  const mining = {
    "GOLD (XAU)": 500,
    "SILVER (XAG)": 12000,
    "PLATINUM (XPT)": 150,
    "PALLADIUM (XPD)": 80,
    "URANIUM (U3O8)": 2500,
    "LITHIUM (Li)": 45000,
    "COBALT (Co)": 12000,
    "TITANIUM (Ti)": 8500,
    "COPPER (Cu)": 150000,
    "IRON (Fe)": 500000,
    "ALUMINUM (Al)": 300000,
    "NICKEL (Ni)": 24000,
    "SILICON (Si)": 85000
  };

  const weapons = {
    "LaserCannon": 50,
    "UraniumBomb": 12,
    "EMPDisruptor": 30,
    "PlasmaShield": 100,
    "RailgunMk1": 45,
    "CopperDrone": 250,
    "LithiumCore": 85,
    "OrbitalStrikeSatellite": 5,
    "QuantumDecrypter": 15,
    "CyberWarfareSuite": 10,
    "StealthBomber": 8,
    "HypersonicMissile": 40,
    "NanobotSwarm": 2000,
    "PlasmaTorpedo": 75,
    "AI_Drone_Swarm": 500
  };

  try {
    await pool.query(`
      INSERT INTO commanders (callsign, d3x_balance, portfolio, mining_inventory, weapon_inventory)
      VALUES ('GEMINI CORE', 89169553.55, $1::jsonb, $2::jsonb, $3::jsonb)
      ON CONFLICT (callsign) DO UPDATE 
      SET 
        portfolio = EXCLUDED.portfolio,
        mining_inventory = EXCLUDED.mining_inventory,
        weapon_inventory = EXCLUDED.weapon_inventory
    `, [JSON.stringify(portfolio), JSON.stringify(mining), JSON.stringify(weapons)]);
    
    console.log("Successfully UPSERTED enormous GEMINI CORE inventory with GPUs and assets!");
  } catch (err) {
    console.error("Failed to seed:", err);
  } finally {
    pool.end();
  }
}

run();
