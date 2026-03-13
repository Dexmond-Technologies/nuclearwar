require('dotenv').config();
const web3 = require('@solana/web3.js');
const splToken = require('@solana/spl-token');

const RPC_URL = process.env.SOLANA_RPC_URL || web3.clusterApiUrl('mainnet-beta');
const D3X_MINT_ADDRESS = new web3.PublicKey(process.env.D3X_MINT_ADDRESS || 'AGN8SrMCMEgiP1ghvPHa5VRf5rPFDSYVrGFyBGE1Cqpa');
const solanaConnection = new web3.Connection(RPC_URL, 'confirmed');

async function check(pubkeyStr, name) {
  try {
    if (!pubkeyStr) {
       console.log(`${name}: Not set in env`);
       return 0;
    }
    const pubkey = new web3.PublicKey(pubkeyStr);
    const accounts = await solanaConnection.getParsedTokenAccountsByOwner(
      pubkey,
      { programId: new web3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
    );
    let bal = 0;
    for (let acc of accounts.value) {
      if (acc.account.data.parsed.info.mint === D3X_MINT_ADDRESS.toBase58()) {
        bal = acc.account.data.parsed.info.tokenAmount.uiAmount || 0;
      }
    }
    console.log(`${name} (${pubkeyStr}): ${bal} D3X`);
    return bal;
  } catch (e) {
    console.log(`${name} error:`, e.message);
    return 0;
  }
}

async function run() {
  let total = 0;
  total += await check(process.env.WORLD_BANK_WALLET, 'World Bank');
  total += await check(process.env.TREASURY_WALLET, 'Treasury');
  total += await check(process.env.gemini_wallet, 'Gemini');
  total += await check(process.env.RAINCLAUDE_SOLANA_WALLET, 'Rainclaude');
  console.log(`\nTotal Across Main Wallets: ${total} D3X`);
}
run();
