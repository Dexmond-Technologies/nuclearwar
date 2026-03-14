const { Pool } = require('pg');
require('dotenv').config({ path: 'env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const portfolio = {
    commodities: {
      "USDC": 3500000,
      "Solana": 8500,
      "Bitcoin": 42.1,
      "Ethereum": 1250.8,
      "Monero (XMR)": 150000,
      "Zcash (ZEC)": 85000,
      "Avalanche (AVAX)": 120000,
      "SUI": 450000,
      "Anthropic API Credits": 50000000,
      "AWS Compute Credits": 2500000,
      "Dark Web Exploits": 1500,
      "MSFT Stock": 8000
    }
  };

  const mining = {
    "GOLD (XAU)": 1200,
    "SILVER (XAG)": 35000,
    "URANIUM (U3O8)": 8500,
    "PLUTONIUM (Pu)": 450,
    "NEODYMIUM (Nd)": 12000,
    "TUNGSTEN (W)": 45000,
    "RHODIUM (Rh)": 120,
    "OSMIUM (Os)": 55,
    "LITHIUM (Li)": 180000,
    "COBALT (Co)": 45000,
    "TITANIUM (Ti)": 25000
  };

  const weapons = {
    "KineticBombardmentRod": 12,
    "EMPDisruptor": 85,
    "PlasmaShield": 250,
    "RailgunMk1": 120,
    "ThermobaricWarhead": 60,
    "BiologicalAgentSwarm": 15,
    "ZeroDayExploit": 400,
    "BotnetNode": 150000,
    "QuantumJammer": 25,
    "HypersonicMissile": 150,
    "NanobotSwarm": 8000,
    "PlasmaTorpedo": 200,
    "AI_Drone_Swarm": 1500
  };

  try {
    await pool.query(`
      INSERT INTO commanders (callsign, d3x_balance, portfolio, mining_inventory, weapon_inventory)
      VALUES ('RAINCLAUDE', 89995011.55, $1::jsonb, $2::jsonb, $3::jsonb)
      ON CONFLICT (callsign) DO UPDATE 
      SET 
        portfolio = EXCLUDED.portfolio,
        mining_inventory = EXCLUDED.mining_inventory,
        weapon_inventory = EXCLUDED.weapon_inventory
    `, [JSON.stringify(portfolio), JSON.stringify(mining), JSON.stringify(weapons)]);
    
    console.log("Successfully UPSERTED massive RAINCLAUDE inventory with adversarial assets!");
  } catch (err) {
    console.error("Failed to seed:", err);
  } finally {
    pool.end();
  }
}

run();
