const { Pool } = require('pg');
require('dotenv').config();

async function run() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    try {
        console.log("Mocking a Google Auth Login for 'TestUser'...");
        const pub = "TestPublicSolanaAddress123456";
        const priv = Buffer.from("TestPrivateKey789").toString('hex');
        
        const res = await pool.query(`
              INSERT INTO commanders (callsign, email, picture_url, last_seen, solana_wallet_address, solana_private_key) 
              VALUES ($1, $2, $3, NOW(), $4, $5) 
              ON CONFLICT (callsign) DO UPDATE 
              SET email = EXCLUDED.email, picture_url = EXCLUDED.picture_url, last_seen = NOW(),
                  solana_wallet_address = COALESCE(commanders.solana_wallet_address, EXCLUDED.solana_wallet_address),
                  solana_private_key = COALESCE(commanders.solana_private_key, EXCLUDED.solana_private_key)
              RETURNING callsign, email, solana_wallet_address, solana_private_key
            `, ["TestUser", "test@example.com", "http://test.loc/pic.jpg", pub, priv]);
            
        console.log("INSERT RESULT:", res.rows[0]);
        
        console.log("Cleaning up test user...");
        await pool.query(`DELETE FROM commanders WHERE callsign = 'TestUser'`);
        console.log("Cleanup complete.");
        
    } catch(e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
run();
