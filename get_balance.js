const solanaWeb3 = require('@solana/web3.js');

async function getBalance() {
  const conn = new solanaWeb3.Connection("https://api.mainnet-beta.solana.com", "confirmed");
  const pubkey = new solanaWeb3.PublicKey("5rdrJ46YJbtVHEx7xRgURGm49Cwf1WikLhU71VnS8zk3");

  // Get Native SOL
  const solBalance = await conn.getBalance(pubkey);
  console.log(`SOL Balance: ${solBalance / solanaWeb3.LAMPORTS_PER_SOL}`);

  // Get SPL Tokens
  const tokenAccounts = await conn.getParsedTokenAccountsByOwner(pubkey, {
    programId: new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
  });
  
  if (tokenAccounts.value.length === 0) {
      console.log("No SPL Token Accounts Found.");
  } else {
      console.log("Tokens:");
      tokenAccounts.value.forEach((accountInfo) => {
          const parsedInfo = accountInfo.account.data.parsed.info;
          const mint = parsedInfo.mint;
          const amount = parsedInfo.tokenAmount.uiAmountString;
          console.log(`Mint: ${mint} | Balance: ${amount}`);
      });
  }
}
getBalance().catch(console.error);
