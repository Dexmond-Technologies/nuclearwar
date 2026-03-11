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
      BTC: Math.floor(30000000 / prices.BTC),
      ETH: Math.floor(30000000 / prices.ETH),
      SOL: Math.floor(30000000 / prices.SOL),
      XRP: Math.floor(30000000 / prices.XRP),
      XLM: Math.floor(30000000 / prices.XLM)
    };

    console.log("Fixing WORLD BANK...");
    let res = await client.query("SELECT portfolio FROM commanders WHERE callsign = 'WORLD BANK'");
    if(res.rows.length > 0) {
       let port = res.rows[0].portfolio || {};
       port.commodities = port.commodities || {};
       // move root level coins to commodities
       delete port.BTC; delete port.ETH; delete port.SOL; delete port.XRP; delete port.XLM;
       port.commodities.BTC = amounts.BTC;
       port.commodities.ETH = amounts.ETH;
       port.commodities.SOL = amounts.SOL;
       port.commodities.Ripple = amounts.XRP;
       port.commodities.Stellar = amounts.XLM;
       await client.query("UPDATE commanders SET portfolio = $1 WHERE callsign = 'WORLD BANK'", [port]);
       console.log("WORLD BANK fixed!");
    }

    console.log("Fixing AI Combat State (Gemini & Rainclaude)...");
    res = await client.query("SELECT gemini_portfolio, claude_portfolio FROM ai_combat_state WHERE id = 1");
    if(res.rows.length > 0) {
       let gemPort = res.rows[0].gemini_portfolio || {};
       gemPort.commodities = gemPort.commodities || {};
       gemPort.commodities.BTC = Math.floor(15000000 / prices.BTC);
       gemPort.commodities.ETH = Math.floor(15000000 / prices.ETH);
       gemPort.commodities.SOL = Math.floor(15000000 / prices.SOL);
       
       let cldPort = res.rows[0].claude_portfolio || {};
       cldPort.commodities = cldPort.commodities || {};
       cldPort.commodities.BTC = Math.floor(12000000 / prices.BTC);
       cldPort.commodities.ETH = Math.floor(12000000 / prices.ETH);
       cldPort.commodities.SOL = Math.floor(12000000 / prices.SOL);
       
       await client.query("UPDATE ai_combat_state SET gemini_portfolio = $1, claude_portfolio = $2 WHERE id = 1", [gemPort, cldPort]);
       console.log("AI portfolios fixed!");
    } else {
       await client.query("INSERT INTO ai_combat_state (id) VALUES (1)");
       console.log("Inserted mock row into ai_combat_state. Run again to populate.");
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
