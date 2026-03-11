const fs = require('fs');

function updateFile(file) {
    let content = fs.readFileSync(file, 'utf8');
    
    // update currentSkinIndex === X
    content = content.replace(/currentSkinIndex\s*={2,3}\s*(\d+)/g, (match, p1) => {
        let num = parseInt(p1);
        if (num >= 1) { // 0 is LIVE, stays 0
            return match.replace(p1, (num + 1).toString());
        }
        return match;
    });

    // update currentSkinIndex !== X
    content = content.replace(/currentSkinIndex\s*!==\s*(\d+)/g, (match, p1) => {
        let num = parseInt(p1);
        if (num >= 1) {
            return match.replace(p1, (num + 1).toString());
        }
        return match;
    });

    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
}

updateFile('./game.html');
updateFile('./all.js');
