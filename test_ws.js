const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8888');

ws.on('open', function open() {
  ws.send(JSON.stringify({ type: 'get_ai_wallets' }));
});

ws.on('message', function incoming(data) {
  const msg = JSON.parse(data);
  if (msg.type === 'ai_wallets_data') {
      console.log("RECEIVED ai_wallets_data");
      console.log(JSON.stringify(msg, null, 2));
      process.exit(0);
  }
});

setTimeout(() => {
    console.error("Timeout waiting for message");
    process.exit(1);
}, 5000);
