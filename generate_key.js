const web3 = require('@solana/web3.js');
const bs58 = require('bs58');
const encode = bs58.encode || (bs58.default && bs58.default.encode);
const kp = web3.Keypair.generate();
console.log(encode(kp.secretKey));
