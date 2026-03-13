const fs = require('fs');
const acorn = require('acorn');

const code = fs.readFileSync('server.js', 'utf8');

try {
    acorn.parse(code, { ecmaVersion: 2022 });
    console.log("No syntax errors found in server.js by acorn.");
} catch (err) {
    console.log(`\nSyntax Error Found in server.js!`);
    console.log(`Error Message: ${err.message}`);
    
    // Output the surrounding lines
    const lines = code.split('\n');
    const errLineIndex = err.loc.line - 1;
    
    console.log(`\nLines surrounding the error:`);
    for (let i = Math.max(0, errLineIndex - 5); i <= Math.min(lines.length - 1, errLineIndex + 5); i++) {
        const prefix = i === errLineIndex ? '>> ' : '   ';
        console.log(`${prefix}${i + 1}: ${lines[i]}`);
    }
}
