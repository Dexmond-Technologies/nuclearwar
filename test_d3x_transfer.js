require('dotenv').config();
const web3 = require('@solana/web3.js');
const splToken = require('@solana/spl-token');
const bs58 = require('bs58');

const D3X_MINT_ADDRESS = new web3.PublicKey('AGN8SrMCMEgiP1ghvPHa5VRf5rPFDSYVrGFyBGE1Cqpa');
const solanaConnection = new web3.Connection(web3.clusterApiUrl('mainnet-beta'), 'confirmed');

async function run() {
  try {
    const decode = bs58.decode || (bs58.default && bs58.default.decode);
    const secretKey = process.env.EARTH_WALLET_PRIVATE_KEY;
    if (!secretKey) throw new Error("Missing EARTH_WALLET_PRIVATE_KEY in .env");
    
    const authorityKeypair = web3.Keypair.fromSecretKey(decode(secretKey));
    console.log("Authority Wallet:", authorityKeypair.publicKey.toBase58());
    
    const toPublicKey = new web3.PublicKey('HULm1J3ABVVxzcSXjDN57BPEKGjWaDSmJBZvSs1btDg4');

    console.log("Fetching sender token account...");
    const fromTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
        solanaConnection,
        authorityKeypair,
        D3X_MINT_ADDRESS,
        authorityKeypair.publicKey
    );

    console.log("Fetching recipient token account...");
    const toTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
        solanaConnection,
        authorityKeypair,
        D3X_MINT_ADDRESS,
        toPublicKey
    );

    console.log("Getting mint info...");
    const mintInfo = await splToken.getMint(solanaConnection, D3X_MINT_ADDRESS);
    const transferAmount = 22 * Math.pow(10, mintInfo.decimals);

    console.log(`Sending 22 D3X to ${toPublicKey.toBase58()}...`);
    const signature = await splToken.transfer(
        solanaConnection,
        authorityKeypair,
        fromTokenAccount.address,
        toTokenAccount.address,
        authorityKeypair.publicKey,
        transferAmount
    );
    console.log('✅ Successfully Sent 22 D3X! Tx Signature:', signature);
  } catch (e) {
    console.error('❌ Error during transfer:', e.message);
  }
}
run();
