const solanaWeb3 = require('@solana/web3.js');
const pkg = require('bs58');
const decode = pkg.decode || pkg.default.decode || pkg;
const pvtKeyStr = "i7diQCgBmMu8RaweUizc8tMcmBkBg9Tmw4AeUek1tWD4V9ESjTsGitiuSWKYGczP6ajTPkr4RnCZQ6XZYK4Bmoq";
const decodedKey = typeof decode === 'function' ? decode(pvtKeyStr) : pkg.decode(pvtKeyStr);
const kp = solanaWeb3.Keypair.fromSecretKey(decodedKey);
console.log("Real Rainclaude Public Key:", kp.publicKey.toBase58());
