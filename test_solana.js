const web3 = require('@solana/web3.js');
const bs58 = require('bs58');
require('dotenv').config();

const secretKeyString = process.env.SOLANA_WALLET_PRIVATE_KEY;
try {
    const decodedKey = bs58.decode(secretKeyString);
    console.log("Decoded length:", decodedKey.length);
    if(decodedKey.length === 64) {
        const keypair = web3.Keypair.fromSecretKey(decodedKey);
        console.log("Valid pubkey:", keypair.publicKey.toBase58());
    } else {
        console.log("Invalid key length. Generating new random keypair for testing...");
        const newKp = web3.Keypair.generate();
        console.log("NEW_PUBKEY:", newKp.publicKey.toBase58());
        console.log("NEW_PRIVKEY:", bs58.encode(newKp.secretKey));
    }
} catch(e) {
    console.log("Decode error:", e.message);
}
