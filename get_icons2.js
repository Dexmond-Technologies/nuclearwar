const fs = require('fs');
const data = JSON.parse(fs.readFileSync('icons_b64.json'));

const xmrSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <circle cx="128" cy="128" r="128" fill="#4c4c4c"/>
  <path d="M128 0C57.3 0 0 57.3 0 128h42.6C42.6 80.9 80.9 42.6 128 42.6S213.4 80.9 213.4 128H256C256 57.3 198.7 0 128 0z" fill="#f26822"/>
  <path d="M128 165L82.5 119.5V55H45v80l83 83 83-83V55h-37.5v64.5z" fill="#f26822"/>
</svg>`;

data.xmr = "data:image/svg+xml;base64," + Buffer.from(xmrSvg).toString('base64');
fs.writeFileSync('icons_final.json', JSON.stringify(data));
console.log("Done");
