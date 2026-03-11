require('dotenv').config();
const web3 = require('@solana/web3.js');
const { getAssociatedTokenAddress } = require('@solana/spl-token');

const connection = new web3.Connection(process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com");
const D3X_MINT = new web3.PublicKey("AGN8SrMCMEgiP1ghvPHa5VRf5rPFDSYVrGFyBGE1Cqpa");

async function checkBals() {
    const wallets = {
        "Earth Wallet": process.env.EARTH_WALLET_ADRESS,
        "World Bank": process.env.WORLD_BANK_WALLET,
        "Treasury": process.env.TREASURY_WALLET,
        "Mint Deployer": process.env.MINT_WALLET
    };

    console.log("==========================================");
    console.log("D3X ECOSYSTEM BALANCE AUDIT");
    console.log("==========================================");

    for (const [name, address] of Object.entries(wallets)) {
        if (!address) {
            console.log(`[SKIP] No address found for ${name}`);
            continue;
        }
        try {
            const pubkey = new web3.PublicKey(address);
            const ta = await getAssociatedTokenAddress(D3X_MINT, pubkey);
            const bal = await connection.getTokenAccountBalance(ta);
            console.log(`${name.padEnd(20)} | ${address.substring(0,6)}...${address.substring(address.length-4)} | ${parseFloat(bal.value.uiAmount).toLocaleString()} D3X`);
        } catch (e) {
            console.log(`${name.padEnd(20)} | ${address.substring(0,6)}...${address.substring(address.length-4)} | 0 D3X`);
        }
    }
}

checkBals();
