const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8888');

ws.on('open', () => {
  console.log('Connected to WebSocket server');
  ws.send(JSON.stringify({ type: 'get_ai_wallets' }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data);
  if (msg.type === 'ai_wallets_data') {
    console.log('Received ai_wallets_data payload:');
    console.log(JSON.stringify(msg, null, 2));
    process.exit(0);
  }
});

ws.on('error', (err) => {
  console.error('WebSocket error:', err.message);
  process.exit(1);
});

setTimeout(() => {
  console.error('Timeout waiting for ai_wallets_data');
  process.exit(1);
}, 5000);
