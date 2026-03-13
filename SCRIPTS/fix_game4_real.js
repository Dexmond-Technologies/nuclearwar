const fs = require('fs');

const allJs = fs.readFileSync('all.js', 'utf8').split('\n');
const gameHtml = fs.readFileSync('game.html', 'utf8').split('\n');

// all.js line 2908 is // =====================================================================
// all.js line 3058 is `}` which closes `initGame`
// all.js line 3060 is // =====================================================================
const block = allJs.slice(2907, 3059);

// gameHtml target: before `function joinGlobalWar() {`
const insertIdx = gameHtml.findIndex(l => l.includes('function joinGlobalWar() {'));

if (insertIdx !== -1) {
    gameHtml.splice(insertIdx, 0, ...block);
    fs.writeFileSync('game.html', gameHtml.join('\n'));
    console.log("Successfully injected initGame and FogOfWar logic outside initWS!");
} else {
    console.log("Could not find joinGlobalWar insertion point");
}
