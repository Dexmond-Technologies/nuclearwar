const fs = require('fs');
const allJs = fs.readFileSync('all.js', 'utf8').split('\n');
const gameHtml = fs.readFileSync('game.html', 'utf8').split('\n');

const block = allJs.slice(2331, 2383); 
// 2331 is "// Set up clipping planes"
// Let's verify end line. 2383 is "window.earthCutawayGroup.add(innerCoreMesh);"

const insertIdx = gameHtml.findIndex(l => l.includes('const earthTex = texLoader.load'));

if (insertIdx !== -1) {
    gameHtml.splice(insertIdx + 1, 0, ...block);
    fs.writeFileSync('game.html', gameHtml.join('\n'));
    console.log("Successfully injected globeMesh and earthCutawayGroup!");
} else {
    console.log("Insertion point not found.");
}
