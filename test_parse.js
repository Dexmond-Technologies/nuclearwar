const fs = require('fs');
const acorn = require('acorn');

const html = fs.readFileSync('game.html', 'utf8');

// The scripts are embedded, so let's find all script tags and parse their contents
const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let hasError = false;

while ((match = scriptRegex.exec(html)) !== null) {
    const scriptContent = match[1];
    // Attempt to parse the JS
    try {
        acorn.parse(scriptContent, { ecmaVersion: 2020 });
    } catch (err) {
        console.log(`\nSyntax Error Found!`);
        console.log(`Error Message: ${err.message}`);
        
        // Output the surrounding lines
        const lines = scriptContent.split('\n');
        const errLineIndex = err.loc.line - 1;
        
        console.log(`\nLines surrounding the error (local to script tag):`);
        for (let i = Math.max(0, errLineIndex - 5); i <= Math.min(lines.length - 1, errLineIndex + 5); i++) {
            const prefix = i === errLineIndex ? '>> ' : '   ';
            console.log(`${prefix}${i + 1}: ${lines[i]}`);
        }
        hasError = true;
    }
}

if (!hasError) {
    console.log("No syntax errors found by acorn.");
}
