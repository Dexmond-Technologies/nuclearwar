const fetch = require('node-fetch');
async function test() {
  const res = await fetch("https://api.windy.com/webcams/api/v3/webcams?limit=5", {
    headers: { "x-windy-api-key": "vEqfjmfqyPguO0tTOX5gKMTXH6sz5dZR" }
  });
  console.log(res.status);
  const data = await res.json();
  console.log(data);
}
test();
