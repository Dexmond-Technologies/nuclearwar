const solanaWeb3 = require('@solana/web3.js');
const D3X_MINT_ADDRESS = new solanaWeb3.PublicKey('HXt16svWtevjoMkrhU8JEfmfi4QJ2eYjEpeyPThSyHE6');
const solanaConnection = new solanaWeb3.Connection("https://api.mainnet-beta.solana.com", "confirmed");

async function check() {
    try {
        const pKey = new solanaWeb3.PublicKey("5rdrJ46YJbtVHEx7xRgURGm49Cwf1WikLhU71VnS8zk3");
        console.log("Checking balances for", pKey.toBase58());
        const accounts = await solanaConnection.getParsedTokenAccountsByOwner(
            pKey,
            { programId: new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
        );
        let foundD3X = false;
        let bal = 0;
        for (let acc of accounts.value) {
            const info = acc.account.data.parsed.info;
            if (info.mint === D3X_MINT_ADDRESS.toBase58()) {
                bal = info.tokenAmount.uiAmount || 0;
                foundD3X = true;
                break;
            }
        }
        console.log("Result D3X Balance:", bal, "Found:", foundD3X);
    } catch(e) {
        console.error("RPC Error:", e);
    }
}
check();
