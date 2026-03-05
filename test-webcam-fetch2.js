const fetch = require('node-fetch');
async function test() {
  const res = await fetch("https://api.windy.com/webcams/api/v3/webcams/1467181139?include=player", {
    headers: { "x-windy-api-key": "vEqfjmfqyPguO0tTOX5gKMTXH6sz5dZR" }
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
test();
