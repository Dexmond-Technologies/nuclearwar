const fetch = require('node-fetch');
async function test() {
  const res = await fetch("https://api.windy.com/webcams/api/v3/webcams?limit=50&include=location,player&modifiers=live", {
    headers: { "x-windy-api-key": "vEqfjmfqyPguO0tTOX5gKMTXH6sz5dZR" }
  });
  const data = await res.json();
  let liveCount = 0;
  for(let wc of data.webcams) {
    if(wc.player && wc.player.live) liveCount++;
  }
  console.log(`Out of ${data.webcams.length} webcams, ${liveCount} have .live property.`);
}
test();
