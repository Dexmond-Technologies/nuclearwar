const http = require('http');

const req = http.get('http://localhost:8080', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    // If it returns HTML, deployment isn't failing on local boot
    console.log("Status: " + res.statusCode);
    console.log("Size: " + data.length);
    if(data.length > 500000) console.log("HTML loads perfectly locally.");
  });
});
req.on('error', (e) => {
  console.error("Localhopst check error: " + e.message);
});
