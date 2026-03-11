const https = require('https');
const options = {
  hostname: 'api.render.com',
  path: '/v1/services/srv-d6j2pl8gjchc73fjiv50/deploys?limit=1',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer rnd_23nIfUYZKkRpeU3O75x04C8z0M9c',
    'Accept': 'application/json'
  }
};
const req = https.request(options, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => console.log("Status: " + res.statusCode + "\n" + data.substring(0, 500)));
});
req.end();
