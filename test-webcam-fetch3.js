const fetch = require('node-fetch');
async function test() {
  const res = await fetch("https://api.windy.com/webcams/api/v3/webcams?limit=50&include=location,player&modifiers=live", {
    headers: { "x-windy-api-key": "vEqfjmfqyPguO0tTOX5gKMTXH6sz5dZR" }
  });
  const data = await res.json();
  const wc = data.webcams.find(w => w.player && w.player.live);
  if(wc) {
    console.log("Found live webcam:", wc.webcamId, wc.player.live);
  } else {
    console.log("No webcams with live player found in the first 50.");
    console.log(data.webcams[0].player);
  }
}
test();
