require('dotenv').config();
const web3 = require('@solana/web3.js');
const { getAssociatedTokenAddress } = require('@solana/spl-token');

const connection = new web3.Connection(process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com");
const D3X_MINT = new web3.PublicKey("D3X7bS6ZkE2s9G8v5Z2U1k5y9j1Z7Z2U1k5y9j1Z7Z2"); // Need actual mint, wait, let me get it from server.js

async function checkBals() {
    const fs = require('fs');
    if (fs.existsSync('server.js')) {
        const serverCode = fs.readFileSync('server.js', 'utf8');
        const mintMatch = serverCode.match(/const D3X_MINT_ADDRESS_STR = ['"]([^'"]+)['"]/);
        const mintStr = mintMatch ? mintMatch[1] : null;
        if (!mintStr) {
            console.log("Could not find mint address in server.js");
            return;
        }
        const mint = new web3.PublicKey(mintStr);
        const earthWallet = process.env.EARTH_WALLET_PUBLIC_KEY;
        const worldBankWallet = process.env.WORLD_BANK_WALLET;

        for (const [name, address] of Object.entries({Earth: earthWallet, WorldBank: worldBankWallet})) {
            if (!address) {
                console.log(`No address found for ${name}`);
                continue;
            }
            try {
                const pubkey = new web3.PublicKey(address);
                const ta = await getAssociatedTokenAddress(mint, pubkey);
                const bal = await connection.getTokenAccountBalance(ta);
                console.log(`${name} Wallet (${address}): ${bal.value.uiAmount} D3X`);
            } catch (e) {
                console.log(`${name} Wallet (${address}): Error or 0 D3X (${e.message})`);
            }
        }
    }
}

checkBals();
