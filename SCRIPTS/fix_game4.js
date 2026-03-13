const fs = require('fs');

const allJs = fs.readFileSync('all.js', 'utf8').split('\n');
const gameHtml = fs.readFileSync('game.html', 'utf8').split('\n');

// In all.js
// 2840: // =====================================================================
// 2841: // GAME INITIALIZATION
// ...
// 3059: 

const startIdxAll = 2840; // 0-indexed in array is line 2841, but we'll use findIndex to be safe
const endIdxAll = 3060;

const startIdx = allJs.findIndex(l => l.includes('// GAME INITIALIZATION') && allJs[allJs.indexOf(l) + 1].includes('// ================================='));
const endIdx = allJs.findIndex((l, i) => i > startIdx && l === '}'); // line 3058 is `}`

if (startIdx !== -1 && endIdx !== -1) {
    const block = allJs.slice(startIdx - 1, endIdx + 1); // get the whole block

    const insertIdx = gameHtml.findIndex(l => l.includes('function serializeState() {'));
    
    if (insertIdx !== -1) {
        gameHtml.splice(insertIdx, 0, ...block);
        fs.writeFileSync('game.html', gameHtml.join('\n'));
        console.log("Successfully injected initGame and FogOfWar logic!");
    } else {
        console.log("Could not find serializeState insertion point");
    }
} else {
    console.log("Could not find block in all.js", startIdx, endIdx);
}
