const { Connection, PublicKey } = require('@solana/web3.js');
const splToken = require('@solana/spl-token');

const D3X_MINT = new PublicKey('AGN8SrMCMEgiP1ghvPHa5VRf5rPFDSYVrGFyBGE1Cqpa');
const RPC_URL = 'https://api.mainnet-beta.solana.com';

async function investigateSupply() {
    const conn = new Connection(RPC_URL, 'confirmed');
    
    try {
        console.log("Fetching D3X Mint Info...");
        const mintInfo = await splToken.getMint(conn, D3X_MINT);
        console.log(`Total Supply: ${Number(mintInfo.supply) / (10 ** mintInfo.decimals)} D3X`);
        
        console.log("\nFetching Largest Token Accounts...");
        const largestAccounts = await conn.getTokenLargestAccounts(D3X_MINT);
        
        console.log(`Found ${largestAccounts.value.length} accounts. Top 5:`);
        for (let i = 0; i < Math.min(5, largestAccounts.value.length); i++) {
            const acc = largestAccounts.value[i];
            console.log(`${i+1}. Address: ${acc.address.toBase58()} | Amount: ${acc.uiAmountString}`);
            
            // Try to resolve owner
            try {
                const parsed = await conn.getParsedAccountInfo(acc.address);
                if (parsed.value && parsed.value.data && parsed.value.data.parsed) {
                    console.log(`   Owner: ${parsed.value.data.parsed.info.owner}`);
                }
            } catch(e) {
                // Ignore parse errors, just means we can't see the owner easily
            }
        }

    } catch (e) {
        console.error("Error:", e.message);
    }
}

investigateSupply();
