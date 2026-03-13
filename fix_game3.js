const fs = require('fs');
let lines = fs.readFileSync('game.html', 'utf8').split('\n');

const startIdx = lines.findIndex(l => l.includes('function ll2v(lat,lon,r){'));
const endIdx = lines.findIndex((l, i) => i > startIdx && l === '  return null;' && lines[i+1] === '}');

if (startIdx !== -1 && endIdx !== -1) {
    const block = lines.splice(startIdx, endIdx - startIdx + 2);
    
    // Find camera init
    const camIdx = lines.findIndex(l => l.includes('const camera = new THREE.PerspectiveCamera('));
    if (camIdx !== -1) {
        // Insert right after camera init
        lines.splice(camIdx + 1, 0, ...block);
        fs.writeFileSync('game.html', lines.join('\n'));
        console.log("Moved code successfully!");
    } else {
        console.log("Camera not found!");
    }
} else {
    console.log("Block not found", startIdx, endIdx);
}

