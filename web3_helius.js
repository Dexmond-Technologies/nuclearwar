const { Connection, PublicKey } = require('@solana/web3.js');

async function run() {
  const conn = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  const mint = new PublicKey('AGN8SrMCMEgiP1ghvPHa5VRf5rPFDSYVrGFyBGE1Cqpa');
  
  try {
     const largestAccts = await conn.getTokenLargestAccounts(mint);
     console.log(largestAccts);
  } catch(e) { console.error(e); }
}
run();
