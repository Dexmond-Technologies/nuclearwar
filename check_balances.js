require('dotenv').config();
const web3 = require('@solana/web3.js');
const splToken = require('@solana/spl-token');

const RPC_URL = process.env.SOLANA_RPC_URL || web3.clusterApiUrl('mainnet-beta');
const D3X_MINT_ADDRESS = new web3.PublicKey(process.env.D3X_MINT_ADDRESS || 'AGN8SrMCMEgiP1ghvPHa5VRf5rPFDSYVrGFyBGE1Cqpa');
const solanaConnection = new web3.Connection(RPC_URL, 'confirmed');

async function check(pubkeyStr, name) {
  try {
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
  } catch (e) {
    console.log(`${name} error:`, e.message);
  }
}

async function run() {
  await check(process.env.EARTH_WALLET_ADRESS, 'Earth Wallet');
  await check(process.env.WORLD_BANK_WALLET, 'World Bank');
  await check(process.env.RAINCLAUDE_SOLANA_WALLET, 'Rainclaude');
}
run();
