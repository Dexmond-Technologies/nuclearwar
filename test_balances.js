require('dotenv').config();
const { Connection, PublicKey } = require('@solana/web3.js');
const D3X_MINT = 'AGN8SrMCMEgiP1ghvPHa5VRf5rPFDSYVrGFyBGE1Cqpa';

async function run() {
  const conn = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  const wallets = {
    gemini: process.env.gemini_wallet,
    claude: '5rdrJ46YJbtVHEx7xRgURGm49Cwf1WikLhU71VnS8zk3',
    wb: 'GTCJmbURDU42opNv7nzjT5dZ4SJ2VoYLr2r9LQYbB5uW'
  };

  for (let [name, w] of Object.entries(wallets)) {
      if(!w) { console.log(name, "no wallet"); continue; }
      const pub = new PublicKey(w);
      const accounts = await conn.getParsedTokenAccountsByOwner(
          pub, 
          { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
      );
      
      let foundD3X = false;
      for (let acc of accounts.value) {
          const info = acc.account.data.parsed.info;
          if (info.mint === D3X_MINT) {
              console.log(`${name} D3X Balance: ${info.tokenAmount.uiAmount}`);
              foundD3X = true;
          }
      }
      if(!foundD3X) console.log(`${name} D3X Balance: 0`);
  }
}
run();
