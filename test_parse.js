const fs = require('fs');
const acorn = require('acorn');

const html = fs.readFileSync('game.html', 'utf8');

const scriptRegex = /<script(?:.*?)>([\s\S]*?)<\/script>/gs;
let match;
let count = 0;
while ((match = scriptRegex.exec(html)) !== null) {
  const code = match[1];
  if (!code.trim()) continue;

  try {
    acorn.parse(code, { ecmaVersion: 2022, sourceType: 'script', allowAwaitOutsideFunction: true });
  } catch (e) {
    let scriptStartLine = html.substring(0, match.index).split('\n').length;
    console.log(`Script starting at line ${scriptStartLine} has syntax error: ${e.message} at line ${e.loc ? e.loc.line : 'unknown'}`);
    let globalLine = scriptStartLine + (e.loc ? e.loc.line - 1 : 0);
    console.log(`Global line approximately: ${globalLine}`);
  }
}
