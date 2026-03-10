const { Connection, PublicKey } = require('@solana/web3.js');

async function run() {
  const conn = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  const DEV_CONN = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  const wallets = [
    '5rdrJ46YJbtVHEx7xRgURGm49Cwf1WikLhU71VnS8zk3',
    'GTCJmbURDU42opNv7nzjT5dZ4SJ2VoYLr2r9LQYbB5uW',
    '37De9qFqKoyPDoM4eCWCGKkgAFFxBtJYQNJjHmL9wK8k'  
  ];

  for (let w of wallets) {
    console.log(`\n=== Scanning Wallet: ${w} ===`);
    const pub = new PublicKey(w);
    
    console.log("-> MAINNET-BETA:");
    try {
        const tokens = await conn.getParsedTokenAccountsByOwner(pub, { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') });
        if (tokens.value.length === 0) { console.log("   No Tokens Found."); }
        tokens.value.forEach(a => {
            const info = a.account.data.parsed.info;
            if (info.tokenAmount.uiAmount > 0) {
               console.log(`   Mint: ${info.mint} | Balance: ${info.tokenAmount.uiAmountString}`);
            }
        });
    } catch (e) { console.log(e.message); }

    console.log("-> DEVNET:");
    try {
        const dTokens = await DEV_CONN.getParsedTokenAccountsByOwner(pub, { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') });
        if (dTokens.value.length === 0) { console.log("   No Tokens Found."); }
        dTokens.value.forEach(a => {
            const info = a.account.data.parsed.info;
            if (info.tokenAmount.uiAmount > 0) {
               console.log(`   Mint: ${info.mint} | Balance: ${info.tokenAmount.uiAmountString}`);
            }
        });
    } catch (e) { console.log(e.message); }
  }
}
run().catch(console.error);
