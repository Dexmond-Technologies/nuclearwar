const { Pool } = require('pg');
const pool = new Pool({ 
    connectionString: 'postgresql://nuclearwar_db_user:Kg5fnacbBT1wwukMwvJ2zSm03eRNbze5@dpg-d6j5m8kr85hc73fqe70g-a.oregon-postgres.render.com/nuclearwar_db',
    ssl: { rejectUnauthorized: false } 
});

async function run() {
    try {
        const res = await pool.query("SELECT portfolio FROM commanders WHERE callsign = 'WORLD BANK'");
        if (res.rows.length === 0) {
            console.error("WORLD BANK record not found!");
            return;
        }

        let portfolio = res.rows[0].portfolio || {};
        portfolio.commodities = portfolio.commodities || {};

        // Inject 30,000,000 into the crypto balances
        const amount = 30000000;
        
        portfolio.commodities.BTC = amount;
        portfolio.commodities.ETH = amount;
        portfolio.commodities.SOL = amount;
        portfolio.commodities.XLM = amount; // Stellar
        portfolio.commodities.XRP = amount; // Ripple

        // Update DB
        await pool.query("UPDATE commanders SET portfolio = $1 WHERE callsign = 'WORLD BANK'", [portfolio]);
        
        console.log("Successfully injected 30,000,000 into WORLD BANK cryptos:");
        console.log(JSON.stringify(portfolio.commodities, null, 2));

    } catch (err) {
        console.error("Injection failed:", err);
    } finally {
        pool.end();
    }
}

run();
