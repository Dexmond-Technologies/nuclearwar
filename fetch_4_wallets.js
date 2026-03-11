require('dotenv').config();
const { Connection, PublicKey } = require('@solana/web3.js');
const splToken = require('@solana/spl-token');

const D3X_MINT = 'AGN8SrMCMEgiP1ghvPHa5VRf5rPFDSYVrGFyBGE1Cqpa';
const RPC_URL = 'https://api.mainnet-beta.solana.com';

async function fetchBalances() {
    const conn = new Connection(RPC_URL, 'confirmed');
    
    const wallets = {
        'Earth Wallet': process.env.EARTH_WALLET_ADRESS,
        'World Bank': process.env.WORLD_BANK_WALLET,
        'Gemini AI': process.env.gemini_wallet,
        'Rainclaude AI': process.env.RAINCLAUDE_SOLANA_WALLET
    };

    console.log("Fetching D3X token balances...");
    console.log("--------------------------------------------------");

    for (const [name, address] of Object.entries(wallets)) {
        if (!address || address === "NOT_SET") {
            console.log(`${name.padEnd(15)} | Address: Not Configured | Balance: N/A`);
            continue;
        }

        try {
            const pubkey = new PublicKey(address);
            
            // Fetch parsed token accounts
            const accounts = await conn.getParsedTokenAccountsByOwner(
                pubkey, 
                { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
            );
            
            let d3xBalance = 0;
            let found = false;

            for (let acc of accounts.value) {
                const info = acc.account.data.parsed.info;
                if (info.mint === D3X_MINT) {
                    d3xBalance = info.tokenAmount.uiAmount || 0;
                    found = true;
                    break;
                }
            }
            
            console.log(`${name.padEnd(15)} | Address: ${address.padEnd(45)} | Balance: ${d3xBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} D3X`);

            // small delay to avoid rate limit 429s on mainnet
            await new Promise(r => setTimeout(r, 2000));

        } catch (e) {
            console.log(`${name.padEnd(15)} | Address: ${address.padEnd(45)} | ERROR: ${e.message}`);
        }
    }
    console.log("--------------------------------------------------");
}

fetchBalances();
