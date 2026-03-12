const web3 = require('@solana/web3.js');
const splToken = require('@solana/spl-token');
const bs58 = require('bs58');
const decode = bs58.decode || (bs58.default && bs58.default.decode);

const PLAYERAUTO_WALLET_ADRESS="6kWorXbmhxYw1xrgKdwmQa3zvGgTFkYvmtQL2o8wfEet";
const PLAYERAUTO_WALLET_PRIVATE_KEY="5BmSErQcHWBmaTWnLPXxBSem1HyPid7oeG64Xzh3CdybXJn5e5ojnQmvi6NP2xQBdDLVN9VtxSnQrypbJADJUth2";

// Real D3X Mint
const D3X_MINT = new web3.PublicKey('HXt16svWtevjoMkrhU8JEfmfi4QJ2eYjEpeyPThSyHE6');
const OLD_MINT = new web3.PublicKey('AGN8SrMCMEgiP1ghvPHa5VRf5rPFDSYVrGFyBGE1Cqpa');

const solanaConnection = new web3.Connection("https://api.mainnet-beta.solana.com", "confirmed");

async function verify() {
    try {
        const decodedKey = decode(PLAYERAUTO_WALLET_PRIVATE_KEY);
        const kp = web3.Keypair.fromSecretKey(decodedKey);
        console.log("Derived Public Key from PVT KEY:", kp.publicKey.toBase58());
        console.log("Matches Provided Address?", kp.publicKey.toBase58() === PLAYERAUTO_WALLET_ADRESS);

        const solBalance = await solanaConnection.getBalance(kp.publicKey);
        console.log("SOL Balance:", solBalance / web3.LAMPORTS_PER_SOL);

        const accounts = await solanaConnection.getParsedTokenAccountsByOwner(
            kp.publicKey, 
            { programId: new web3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
        );

        for (let acc of accounts.value) {
            const info = acc.account.data.parsed.info;
            if (info.mint === D3X_MINT.toBase58() || info.mint === OLD_MINT.toBase58()) {
                console.log(`Token Balance for Mint ${info.mint}:`, info.tokenAmount.uiAmount);
            }
        }
    } catch (e) {
        console.error("Verification Error:", e);
    }
}

verify();
