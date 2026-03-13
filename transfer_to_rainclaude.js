require('dotenv').config();
const web3 = require('@solana/web3.js');
const splToken = require('@solana/spl-token');
const bs58 = require('bs58');
const decode = bs58.decode || (bs58.default && bs58.default.decode);

const RPC_URL = process.env.SOLANA_RPC_URL || web3.clusterApiUrl('mainnet-beta');
const D3X_MINT_ADDRESS = new web3.PublicKey(process.env.D3X_MINT_ADDRESS || 'AGN8SrMCMEgiP1ghvPHa5VRf5rPFDSYVrGFyBGE1Cqpa');
const solanaConnection = new web3.Connection(RPC_URL, 'confirmed');

async function run() {
  try {
    const decodedKey = decode(process.env.WORLD_BANK_PVT_KEY);
    const fromKeypair = web3.Keypair.fromSecretKey(decodedKey);
    console.log("From (World Bank):", fromKeypair.publicKey.toBase58());

    const toAddress = new web3.PublicKey(process.env.RAINCLAUDE_SOLANA_WALLET);
    console.log("To (Rainclaude):", toAddress.toBase58());

    const amount = 100000000; // 100 million
    const amountDecimals = 9;
    const transferAmount = amount * (10 ** amountDecimals);

    console.log(`Transferring ${amount} D3X...`);

    const fromTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
      solanaConnection, fromKeypair, D3X_MINT_ADDRESS, fromKeypair.publicKey
    );
    const toTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
      solanaConnection, fromKeypair, D3X_MINT_ADDRESS, toAddress
    );

    const signature = await splToken.transfer(
      solanaConnection,
      fromKeypair,
      fromTokenAccount.address,
      toTokenAccount.address,
      fromKeypair.publicKey,
      transferAmount
    );
    console.log(`✅ Transfer Successful! Signature: ${signature}`);
  } catch (e) {
    console.error("Transfer failed:", e);
  }
}
run();
