const fs = require('fs');
let gameHtml = fs.readFileSync('game.html', 'utf8').split('\n');

const startIndex = gameHtml.findIndex(line => line.includes('// Helpers') && gameHtml[gameHtml.findIndex(l => l === line) + 1].includes('function ll2v'));
const endIndex = gameHtml.findIndex((line, i) => i > startIndex && line.includes('return null;') && gameHtml[i+1].includes('}'));

if (startIndex > -1 && endIndex > -1) {
  const block = gameHtml.splice(startIndex, endIndex - startIndex + 2).join('\n');
  
  const camIndex = gameHtml.findIndex(line => line.includes('const camera = new THREE.PerspectiveCamera'));
  if (camIndex > -1) {
    gameHtml.splice(camIndex + 1, 0, block);
    fs.writeFileSync('game.html', gameHtml.join('\n'));
    console.log('Successfully moved block after camera initialization');
  } else {
    console.error('Camera init not found');
  }
} else {
  console.error('Injected block not found');
}
