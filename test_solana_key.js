const web3 = require('@solana/web3.js');
const bs58 = require('bs58');
const decode = bs58.decode || (bs58.default && bs58.default.decode);

const secretKeyString = '5BmSErQcHWBmaTWnLPXxBSem1HyPid7oeG64Xzh3CdybXJn5e5ojnQmvi6NP2xQBdDLVN9VtxSnQrypbJADJUth2';
try {
    const decodedKey = decode(secretKeyString);
    console.log("Decoded length:", decodedKey.length);
    if (decodedKey.length === 64) {
        const keypair = web3.Keypair.fromSecretKey(decodedKey);
        console.log("✅ Valid pubkey:", keypair.publicKey.toBase58());
    } else {
        console.log("❌ Invalid key length:", decodedKey.length);
    }
} catch (e) {
    console.log("❌ Decode error:", e.message);
}
