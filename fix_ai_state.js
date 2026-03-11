const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://nuclearwar_db_user:Kg5fnacbBT1wwukMwvJ2zSm03eRNbze5@dpg-d6j5m8kr85hc73fqe70g-a.oregon-postgres.render.com/nuclearwar_db',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  
  try {
     let c = await client.query("SELECT * FROM ai_combat_state WHERE id = 1");
     // Just forcefully make sure the portfolios have the shape we want
     if(c.rows.length === 0) {
        console.log("No AI row. Inserting...");
        await client.query("INSERT INTO ai_combat_state (id) VALUES (1)");
     }

     const amounts = {
        BTC: 315, ETH: 12000, SOL: 214000
     };
     
     let gemPort = {
        commodities: amounts,
        mining_inventory: {
            iron: 500, copper: 150, gold: 20
        }
     };

     let cldPort = {
        commodities: {
           BTC: 280, ETH: 10500, SOL: 190000
        },
        mining_inventory: {
            iron: 600, titanium: 50, silver: 120
        }
     };

     let gemWeapons = { "Rocket Launcher": 5, "Sniper Rifle": 10 };
     let cldWeapons = { "Hand Grenade": 25, "Mortar": 8 };

     await client.query("UPDATE ai_combat_state SET gemini_portfolio = $1, claude_portfolio = $2, gemini_weapon_inventory = $3, claude_weapon_inventory = $4 WHERE id = 1", [gemPort, cldPort, gemWeapons, cldWeapons]);
     
     console.log("Forced update.");
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
