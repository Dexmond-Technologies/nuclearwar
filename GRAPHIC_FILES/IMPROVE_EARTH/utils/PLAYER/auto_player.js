const web3 = require('@solana/web3.js');
const WebSocket = require('ws');
const bs58 = require('bs58');
const decode = bs58.decode || (bs58.default && bs58.default.decode);

// Using the provided Dev key that currently maps to Earth Wallet for automated testing
const PLAYERAUTO_WALLET_PRIVATE_KEY = process.env.PLAYERAUTO_WALLET_PRIVATE_KEY || "5BmSErQcHWBmaTWnLPXxBSem1HyPid7oeG64Xzh3CdybXJn5e5ojnQmvi6NP2xQBdDLVN9VtxSnQrypbJADJUth2";
// Note: This derives to GTCJmbURDU42opNv7nzjT5dZ4SJ2VoYLr2r9LQYbB5uW, contrary to 6kWo...

const decodedKey = decode(PLAYERAUTO_WALLET_PRIVATE_KEY);
const localKeypair = web3.Keypair.fromSecretKey(decodedKey);
const botWalletAddress = localKeypair.publicKey.toBase58();

console.log(`[BOT INIT] Booting Automated Player Brain for Wallet: ${botWalletAddress}`);

// Connection targets
const SERVER_URL = process.env.WS_URL || 'wss://nuclearwar.onrender.com';

const AI_CALLSIGN = "AUTO_MINER_01_" + Math.floor(Math.random() * 999);

function startBot() {
    let ws = new WebSocket(SERVER_URL);
    let keepAliveInterval;
    let actionInterval;

    ws.on('open', () => {
        console.log(`[BOT ONLINE] Connected to Main Server Uplink.`);
        
        // 1. Authenticate with the primary wallet
        ws.send(JSON.stringify({
            type: 'register_commander',
            wallet: botWalletAddress,
            callsign: AI_CALLSIGN
        }));

        // 2. Start Keepalive ping
        keepAliveInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'KEEPALIVE' }));
            }
        }, 15000);

        // 3. Initiate Activity Loops
        actionInterval = setInterval(() => {
            performRandomAction(ws);
        }, 8000 + Math.random() * 5000); // Wait 8-13 seconds between actions
    });

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'notification') {
                console.log(`[BOT LOG] ${data.message}`);
            } else if (data.type === 'mountain_mining_status') {
                console.log(`[BOT MINE] Mining Process Update: ${data.message}`);
            } else if (data.type === 'market_trade_executed') {
                console.log(`[BOT TRADE] Successfully Executed Trade on ${data.commodity}`);
            }
        } catch (e) {
            // Unparseable updates aren't critical.
        }
    });

    ws.on('close', () => {
        console.warn("[BOT OFFLINE] Connection lost. Attempting auto-reconnect in 5 seconds...");
        clearInterval(keepAliveInterval);
        clearInterval(actionInterval);
        setTimeout(startBot, 5000);
    });

    ws.on('error', (err) => {
        console.error("[BOT SYSTEM ERROR]", err.message);
    });
}

function performRandomAction(ws) {
    if (ws.readyState !== WebSocket.OPEN) return;

    const actionPool = [
        () => {
            console.log(`[BOT ACTION] Attempting Mountain Excavation...`);
            ws.send(JSON.stringify({
                type: 'start_mining',
                wallet: botWalletAddress
            }));
        },
        () => {
            // Attempt to buy some random base material to fuel economy
            const targets = ['COAL', 'IRON ORE', 'COPPER'];
            const randomCommodity = targets[Math.floor(Math.random() * targets.length)];
            const quantity = Math.floor(Math.random() * 10) + 1;
            console.log(`[BOT ACTION] Executing Market Market Buy: ${quantity} ${randomCommodity}...`);
            ws.send(JSON.stringify({
                type: 'market_buy',
                wallet: botWalletAddress,
                commodity: randomCommodity,
                quantity: quantity
            }));
        },
        () => {
            console.log(`[BOT ACTION] Claiming daily D3X yields...`);
            ws.send(JSON.stringify({
                type: 'claim_d3x',
                wallet: botWalletAddress
            }));
        }
    ];

    // Pick a random operation
    const selectedOperation = actionPool[Math.floor(Math.random() * actionPool.length)];
    selectedOperation();
}

// Engage Auto-Player
console.log(`[BOT INIT] Securing Sub-Routines...`);
startBot();
