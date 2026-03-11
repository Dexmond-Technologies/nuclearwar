const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://nuclearwar_db_user:Kg5fnacbBT1wwukMwvJ2zSm03eRNbze5@dpg-d6j5m8kr85hc73fqe70g-a.oregon-postgres.render.com/nuclearwar_db',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  
  try {
    const prices = {
      BTC: 95000, 
      ETH: 2500, 
      SOL: 140, 
      XRP: 0.5, 
      XLM: 0.1
    };
    
    // 30M USD each
    const amounts = {
      BTC: 30000000 / prices.BTC,
      ETH: 30000000 / prices.ETH,
      SOL: 30000000 / prices.SOL,
      XRP: 30000000 / prices.XRP,
      XLM: 30000000 / prices.XLM
    };
    
    // Update WORLD BANK
    console.log("Updating WORLD BANK...");
    let res = await client.query('SELECT portfolio FROM commanders WHERE callsign = $1', ['WORLD BANK']);
    
    if (res.rows.length > 0) {
      let portfolio = res.rows[0].portfolio || {};
      portfolio.BTC = amounts.BTC;
      portfolio.ETH = amounts.ETH;
      portfolio.SOL = amounts.SOL;
      portfolio.XRP = amounts.XRP;
      portfolio.XLM = amounts.XLM;
      
      await client.query('UPDATE commanders SET portfolio = $1 WHERE callsign = $2', [portfolio, 'WORLD BANK']);
      console.log("WORLD BANK updated successfully!");
    } else {
      console.log("WORLD BANK not found!");
    }

    // Check GEMINI
    console.log("Checking GEMINI...");
    let gemRes = await client.query('SELECT * FROM commanders WHERE callsign = $1', ['GEMINI']);
    if (gemRes.rows.length === 0) {
       console.log("GEMINI account does not exist in DB!");
       await client.query("INSERT INTO commanders (callsign, email, picture_url, d3x_balance, portfolio, weapon_inventory, mining_inventory) VALUES ($1, $2, $3, $4, $5, $6, $7)", ['GEMINI', 'gemini@ai.corp', '', 50000, {BTC: 15, ETH: 250, SOL: 1500}, {}, {}]);
       console.log("Inserted GEMINI!");
    } else {
       console.log("GEMINI details:", gemRes.rows[0].portfolio);
    }
    
    // Check RAINCLAUDE
    console.log("Checking RAINCLAUDE...");
    let rcRes = await client.query('SELECT * FROM commanders WHERE callsign = $1', ['RAINCLAUDE']);
    if (rcRes.rows.length === 0) {
       console.log("RAINCLAUDE account does not exist in DB!");
       await client.query("INSERT INTO commanders (callsign, email, picture_url, d3x_balance, portfolio, weapon_inventory, mining_inventory) VALUES ($1, $2, $3, $4, $5, $6, $7)", ['RAINCLAUDE', 'rainclaude@ai.corp', '', 45000, {BTC: 12, ETH: 300, SOL: 1000}, {}, {}]);
       console.log("Inserted RAINCLAUDE!");
    } else {
       console.log("RAINCLAUDE details:", rcRes.rows[0].portfolio);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
