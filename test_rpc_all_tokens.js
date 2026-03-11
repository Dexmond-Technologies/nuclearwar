const solanaWeb3 = require('@solana/web3.js');
const solanaConnection = new solanaWeb3.Connection("https://api.mainnet-beta.solana.com", "confirmed");

async function check() {
    try {
        const pKey = new solanaWeb3.PublicKey("5rdrJ46YJbtVHEx7xRgURGm49Cwf1WikLhU71VnS8zk3");
        console.log("Checking ALL balances for", pKey.toBase58());
        const accounts = await solanaConnection.getParsedTokenAccountsByOwner(
            pKey,
            { programId: new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
        );
        for (let acc of accounts.value) {
            const info = acc.account.data.parsed.info;
            if (info.tokenAmount.uiAmount > 0) {
               console.log("Found Token Mint:", info.mint, "Balance:", info.tokenAmount.uiAmount);
            }
        }
    } catch(e) {
        console.error("RPC Error:", e);
    }
}
check();
