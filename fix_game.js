const fs = require('fs');
const allJs = fs.readFileSync('all.js', 'utf8').split('\n');
const gameHtml = fs.readFileSync('game.html', 'utf8').split('\n');

// Extract lines 2558 to 2836 (inclusive, 0-indexed)
// 2558 is `// Helpers`
// 2836 is `return null;\n}`
const blockToInject = allJs.slice(2558, 2837).join('\n');

const insertIndex = gameHtml.findIndex(line => line.includes('const GLOBE_R = 1.0, RAD = Math.PI / 180;'));

if (insertIndex > -1) {
  gameHtml.splice(insertIndex, 0, blockToInject);
  fs.writeFileSync('game.html', gameHtml.join('\n'));
  console.log('Successfully injected core game logic into game.html');
} else {
  console.error('Could not find GLOBE_R insertion point');
}
