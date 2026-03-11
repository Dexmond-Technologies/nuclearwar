require('dotenv').config();
const { Pool } = require('pg');

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    try {
        const earthWallet = process.env.SOLANA_WALLET_ADDRESS;
        if (!earthWallet) throw new Error("SOLANA_WALLET_ADDRESS not found in .env");

        console.log(`Injecting Earth Authority Wallet: ${earthWallet}`);

        // A massive reservoir of commodities for Earth Authority
        const earthPortfolio = {
            "Gold": { shares: 50000000, avg_price: 1 },
            "Silver": { shares: 150000000, avg_price: 1 },
            "Copper": { shares: 250000000, avg_price: 1 },
            "Lithium": { shares: 100000000, avg_price: 1 },
            "Uranium": { shares: 80000000, avg_price: 1 },
            "Rare Earths": { shares: 50000000, avg_price: 1 },
            "Oil": { shares: 500000000, avg_price: 1 },
            "Natural Gas": { shares: 400000000, avg_price: 1 },
            "Coal": { shares: 800000000, avg_price: 1 },
            "Phosphate": { shares: 200000000, avg_price: 1 },
            "Salt": { shares: 400000000, avg_price: 1 },
            "Limestone": { shares: 700000000, avg_price: 1 },
            "Wood": { shares: 900000000, avg_price: 1 },
            "Water": { shares: 2000000000, avg_price: 1 }
        };

        const earthWeapons = {
            "ICBM": 500,
            "Nuclear Submarine": 150,
            "Stealth Bomber": 400,
            "Carrier Strike Group": 50,
            "Hypersonic Missile": 1000
        };

        const earthMining = {
            "iron": 100000000,
            "copper": 100000000,
            "gold": 50000000,
            "silver": 80000000,
            "coal": 200000000,
            "titanium": 40000000,
            "lithium": 50000000,
            "rare_earth": 20000000
        };

        // Insert or update
        const res = await pgPool.query(
            `INSERT INTO commanders (callsign, d3x_balance, portfolio, weapon_inventory, mining_inventory) 
             VALUES ($1, $2, $3, $4, $5) 
             ON CONFLICT (callsign) DO UPDATE 
             SET d3x_balance = excluded.d3x_balance,
                 portfolio = excluded.portfolio,
                 weapon_inventory = excluded.weapon_inventory,
                 mining_inventory = excluded.mining_inventory`,
            [earthWallet, 10000000000, JSON.stringify(earthPortfolio), JSON.stringify(earthWeapons), JSON.stringify(earthMining)]
        );

        console.log("Earth Authority successfully deployed to the database!");
    } catch(err) {
        console.error("Failed injection:", err);
    } finally {
        await pgPool.end();
    }
}

main();
