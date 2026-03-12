---
description: Always check for balanced brackets and syntax errors after modifying code
---
# Bracket & Syntax Checking Workflow

Every time you write or modify code (especially JavaScript or embedded JavaScript in HTML), you MUST ensure that your brackets `{ }` are perfectly balanced.

1. **Mental Check**: When applying a replacement or insertion, manually count the `{` and `}` in your targeted edit. Do not leave hanging braces.
2. **Automated Check**: Immediately after the edit, run a syntax verification tool to ensure the file parses correctly.
// turbo
3. **Verify JS inside HTML**: If editing `game.html` or similar files, extract and check the JS using this script:
```bash
cat << 'EOF' > /tmp/validate.js
const fs = require('fs');
const code = fs.readFileSync('game.html', 'utf8')
  .match(/<script[^>]*>([\s\S]*?)<\/script>/gi)
  .map(s => s.replace(/<\/?script[^>]*>/gi, '')).join('\n');
fs.writeFileSync('/tmp/game_full.js', code);
EOF
node /tmp/validate.js && node --check /tmp/game_full.js
```
4. If an `Unexpected token` or `Unexpected end of input` syntax error is thrown, do NOT proceed with further logic changes until it is completely resolved.
