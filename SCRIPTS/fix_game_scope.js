const fs = require('fs');
let html = fs.readFileSync('game.html', 'utf8').split('\n');

const startIdx = html.findIndex((l, i) => l.includes('// GAME INITIALIZATION') && html[i-1].includes('// ==============================='));

// The end is the end of initGame. initGame ends with "if(window._dashInterval) clearInterval(window._dashInterval);\n  window._dashInterval = setInterval(updateDashboard, 1000);\n}"
let endIdx = -1;
for (let i = startIdx; i < html.length; i++) {
   if (html[i] === '} // END OF initWS') {
       endIdx = i - 1; // wait, let's find the closing brace of initGame
       break;
   }
   if (html[i] === '}' && html[i-1].includes('setInterval(updateDashboard, 1000)')) {
       endIdx = i;
       break;
   }
}

console.log("Found block", startIdx, endIdx);

if (startIdx !== -1 && endIdx !== -1) {
    const block = html.splice(startIdx - 1, (endIdx - startIdx) + 2);
    
    // We need to inject this block OUTSIDE initWS.
    // initWS ends around here. The line "    function joinGlobalWar() {" is right before it.
    // Let's just find the closing script tag or end of initWS.
    
    // In game.html, there's a big bunch of global functions before initWS. 
    // Let's put it right before function joinGlobalWar() {
    const insertIdx = html.findIndex(l => l.includes('function joinGlobalWar() {'));
    
    html.splice(insertIdx, 0, ...block);
    fs.writeFileSync('game.html', html.join('\n'));
    console.log("Moved GAME INITIALIZATION block successfully.");
} else {
    console.log("Could not find block indices.");
}
