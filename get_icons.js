const https = require('https');
async function fetchBase64(url, type) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      // follow redirect 
      if (res.statusCode === 301 || res.statusCode === 302) {
          return https.get(res.headers.location, { headers: { 'User-Agent': 'Mozilla/5.0' } }, processRes);
      }
      processRes(res);
      function processRes(res) {
          const data = [];
          res.on('data', chunk => data.push(chunk));
          res.on('end', () => {
            const buf = Buffer.concat(data);
            resolve(`data:${type};base64,${buf.toString('base64')}`);
          });
      }
    }).on('error', reject);
  });
}

async function run() {
  const btc = await fetchBase64('https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png', 'image/png');
  const eth = await fetchBase64('https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png', 'image/png');
  // Trustwallet doesn't have monero png directly there or returns 404, let's use another source for monero.
  const xmr = await fetchBase64('https://raw.githubusercontent.com/monero-project/monero-site/master/src/assets/images/symbol.png', 'image/png');
  
  const fs = require('fs');
  fs.writeFileSync('icons_b64.json', JSON.stringify({btc, eth, xmr}));
  console.log("Written icons_b64.json");
}
run();
