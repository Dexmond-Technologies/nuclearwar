require('dotenv').config();
const { Connection, PublicKey } = require('@solana/web3.js');
const D3X_MINT = 'AGN8SrMCMEgiP1ghvPHa5VRf5rPFDSYVrGFyBGE1Cqpa';

async function run() {
  const conn = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  const pub = new PublicKey('2hF5Z3JPa5Feo4zdHWhcgdQv8RerDcBAk1LkhoYW8TBj'); // gemini_wallet
  const wbPub = new PublicKey(process.env.EARTH_WALLET_ADRESS); // World Bank
  
  try {
     const accs = await conn.getParsedTokenAccountsByOwner(pub, { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') });
     let found = false;
     for (let a of accs.value) {
        if(a.account.data.parsed.info.mint === D3X_MINT) {
           console.log("GEMINI D3X:", a.account.data.parsed.info.tokenAmount.uiAmount);
           found = true;
        }
     }
     if(!found) console.log("GEMINI D3X: 0");
     
     const wbAccs = await conn.getParsedTokenAccountsByOwner(wbPub, { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') });
     let wbFound = false;
     for (let a of wbAccs.value) {
        if(a.account.data.parsed.info.mint === D3X_MINT) {
           console.log("WORLD BANK D3X:", a.account.data.parsed.info.tokenAmount.uiAmount);
           wbFound = true;
        }
     }
     if(!wbFound) console.log("WORLD BANK D3X: 0");
  } catch(e) { console.error(e); }
}
run();
