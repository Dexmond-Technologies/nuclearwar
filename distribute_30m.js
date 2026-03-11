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

        // 1. Revert to baselines
        portfolio.commodities.BTC = 315;
        portfolio.commodities.ETH = 12000;
        portfolio.commodities.SOL = 214285;
        portfolio.commodities.XRP = 60000000;
        portfolio.commodities.XLM = 300000000;

        // 2. $30,000,000 distribution
        const totalValue = 30000000;
        
        // Generate 5 random weights
        let weights = [Math.random(), Math.random(), Math.random(), Math.random(), Math.random()];
        let sumWeights = weights.reduce((a, b) => a + b, 0);
        let percentages = weights.map(w => w / sumWeights);

        // Dollar allocations
        let allocations = percentages.map(p => p * totalValue);

        // Approximate Exchange Rates (in USD)
        const rates = {
            BTC: 96000.0,
            ETH: 3100.0,
            SOL: 145.0,
            XRP: 1.10,
            XLM: 0.22
        };

        // Add the generated coins to baseline
        portfolio.commodities.BTC += (allocations[0] / rates.BTC);
        portfolio.commodities.ETH += (allocations[1] / rates.ETH);
        portfolio.commodities.SOL += (allocations[2] / rates.SOL);
        portfolio.commodities.XLM += (allocations[3] / rates.XLM);
        portfolio.commodities.XRP += (allocations[4] / rates.XRP);

        // Update DB
        await pool.query("UPDATE commanders SET portfolio = $1 WHERE callsign = 'WORLD BANK'", [portfolio]);
        
        console.log("Successfully redistributed $30,000,000 into WORLD BANK cryptos:");
        console.log(JSON.stringify(portfolio.commodities, null, 2));

    } catch (err) {
        console.error("Injection failed:", err);
    } finally {
        pool.end();
    }
}

run();
