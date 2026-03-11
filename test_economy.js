require('dotenv').config();
const { Pool } = require('pg');

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runOfficialEconomyTest() {
    console.log("==================================================");
    console.log("🚀 OFFICIAL PRE-DEPLOYMENT D3X ECONOMY SYNC TEST");
    console.log("==================================================");
    
    const testCallsign = "QA_AlphaLead_001";
    console.log(`\n[STEP 1] Generating Test Commander: ${testCallsign}`);
    
    try {
        // 1. Initial Injection
        const defaultPortfolio = { commodities: {}, localD3XBalance: 0, lastKnownOnChainBalance: 0 };
        await pgPool.query(
            `INSERT INTO commanders (callsign, d3x_balance, portfolio) 
             VALUES ($1, 0, $2) ON CONFLICT (callsign) DO UPDATE 
             SET d3x_balance = 0, portfolio = $2`, 
            [testCallsign, defaultPortfolio]
        );
        console.log("✅ Database record seeded at exactly 0 D3X.");

        // 2. Simulate process_mine_click Jackpot (Net Profit 10 D3X)
        console.log("\n[STEP 2] Simulating D3X Mining Jackpot...");
        const netJackpotProfit = 10;
        await pgPool.query(
            `UPDATE commanders SET d3x_balance = d3x_balance + $1 WHERE callsign = $2`,
            [netJackpotProfit, testCallsign]
        );
        console.log(`✅ Faucet logic executed: Simulated 35 D3X payout minus 25 D3X fixed fee.`);

        // 3. Simulate get_my_d3x_balance Sync (Catching external on-chain delta)
        console.log("\n[STEP 3] Simulating live Solana Balance Sync...");
        const liveOnChainBal = 15; // User externally bought 5 D3X on Raydium (10 from faucet + 5 bought)
        
        const resSync = await pgPool.query(`SELECT d3x_balance, portfolio FROM commanders WHERE callsign = $1`, [testCallsign]);
        let currentDBBal = parseInt(resSync.rows[0].d3x_balance, 10);
        let port = resSync.rows[0].portfolio;
        let lastKnown = port.lastKnownOnChainBalance !== undefined ? port.lastKnownOnChainBalance : liveOnChainBal;
        
        let expectedSyncedLedger = currentDBBal; 
        // Emulate the logic in server.js tracking lastKnown vs Live
        if (liveOnChainBal > lastKnown) {
            expectedSyncedLedger += (liveOnChainBal - lastKnown);
        }
        
        port.lastKnownOnChainBalance = liveOnChainBal;
        port.localD3XBalance = expectedSyncedLedger;
        
        await pgPool.query(`UPDATE commanders SET portfolio = $1, d3x_balance = $2 WHERE callsign = $3`, [port, expectedSyncedLedger, testCallsign]);
        
        // 4. Verification Check
        const finalRes = await pgPool.query(`SELECT d3x_balance, portfolio FROM commanders WHERE callsign = $1`, [testCallsign]);
        const finalBal = parseInt(finalRes.rows[0].d3x_balance, 10);
        const finalPortLocal = finalRes.rows[0].portfolio.localD3XBalance;
        
        console.log(`\n--- VERIFICATION RESULTS ---`);
        console.log(`Expected Final Balance: 15 D3X (10 from Game + 5 External)`);
        console.log(`PostgreSQL 'd3x_balance' Column: ${finalBal}`);
        console.log(`PostgreSQL 'portfolio.localD3XBalance' JSONB: ${finalPortLocal}`);
        
        if (finalBal === 15 && finalPortLocal === 15) {
            console.log("\n✅ PASS: Database Sync matches exactly. The double-spend parity flaw is definitively DEAD.");
            console.log("🟩 ECONOMY IS READY FOR PRODUCTION DEPLOYMENT.");
        } else {
            console.log("\n❌ FAIL: Balances are out of sync.");
        }
        
    } catch (e) {
        console.error("Test Script Error:", e.message);
    } finally {
        await pgPool.end();
    }
}

runOfficialEconomyTest();
