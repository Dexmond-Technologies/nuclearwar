const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8888');

ws.on('open', function open() {
  console.log('Connected to server, requesting AI wallets data...');
  ws.send(JSON.stringify({ type: 'get_ai_wallets' }));
});

ws.on('message', function incoming(data) {
  const msg = JSON.parse(data);
  if (msg.type === 'ai_wallets_data') {
    console.log('RECEIVED ai_wallets_data payload:');
    console.log("msg.gemini.portfolio TYPE:", typeof msg.gemini.portfolio);
    console.log("msg.gemini.portfolio STRINGIFIED:", JSON.stringify(msg.gemini.portfolio, null, 2));
    process.exit(0);
  }
});

ws.on('error', function error(e) {
    console.error(e);
});
