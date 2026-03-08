const fs = require('fs');
let html = fs.readFileSync('game.html', 'utf8');
const data = JSON.parse(fs.readFileSync('icons_final.json'));

html = html.replace(
  "iconUrl = 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png'",
  `iconUrl = '${data.btc}'`
);

html = html.replace(
  "iconUrl = 'https://assets.coingecko.com/coins/images/279/large/ethereum.png'",
  `iconUrl = '${data.eth}'`
);

html = html.replace(
  "iconUrl = 'https://assets.coingecko.com/coins/images/69/large/monero_logo.png'",
  `iconUrl = '${data.xmr}'`
);

fs.writeFileSync('game.html', html);
console.log("Patched game.html successfully.");
