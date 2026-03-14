const fs = require('fs');
let code = fs.readFileSync('GRAPHIC_FILES/game.html', 'utf8');

// 1. Remove the old GLOBAL_COMPANIES and window.blkCorpGroup initialization (from const GLOBAL_COMPANIES = [ to end of loop)
const blkStart = code.indexOf('    // --- BLK SKIN / CYBER COMPANY WARFARE ---');
const blkEndStr = '      });\\n    });\\n\\n    // --- WTR SKIN / D3X POOL EFFECTS ---';
const blkEnd = code.indexOf(blkEndStr);
if (blkStart !== -1 && blkEnd !== -1) {
    // Note: The old loop ends with "      });\\n    });", but wait, it's just "      });"
    // Let's use string replace based on exact boundaries
    let cutEnd = code.indexOf('    // --- WTR SKIN / D3X POOL EFFECTS ---');
    code = code.slice(0, blkStart) + '    // --- WTR SKIN / D3X POOL EFFECTS ---' + code.slice(cutEnd + 38);
}

// 2. Remove the old animate loop block
const animStart = code.indexOf('      // Cyber Company Warfare Hack Animation (BLK Skin Only)');
const animEndStr = '      if (window.greenGlobeShader) {';
const animEnd = code.indexOf(animEndStr);
if (animStart !== -1 && animEnd !== -1) {
    code = code.slice(0, animStart) + code.slice(animEnd);
}

// 3. Inject new hacking data into the sprite userData
code = code.replace(/sprite\.userData = company;/g, `sprite.userData = company;
        company.ctx = ctx;
        company.canvas = c;
        company.tex = tex;
        company.state = 'neutral';
        company.timer = Math.random() * 5.0 + Math.random() * 5.0; // Random stagger
        company.hackSpeed = 0.5 + Math.random();
        company.target = 'neutral';
        company.originalColor = color;
        company.isWorldBank = isWorldBank;
        company.displayName = displayName;
        if (typeof window.corpNodes === 'undefined') window.corpNodes = [];
        window.corpNodes.push({ sprite: sprite, data: company });`);

// 4. Inject dot linking data
code = code.replace(/dotSprite\.userData = company;/g, `dotSprite.userData = company;
        let lastNode = window.corpNodes[window.corpNodes.length - 1];
        lastNode.data.dotCtx = dotCtx;
        lastNode.data.dotTex = dotTex;
        lastNode.data.dotCanvas = dotC;
        lastNode.dotSprite = dotSprite;`);

// 5. Inject the redraw wrapper and the new animation loop
const redrawFunc = `    function redrawCyberCompany(node) {
      const data = node.data;
      const ctx = data.ctx;
      const isWorldBank = data.isWorldBank;
      const displayName = data.displayName;
      let drawColor = data.originalColor;
      let textPrefix = '';

      if (data.state === 'hacking') {
        drawColor = (data.target === 'gemini') ? '#00eebb' : '#ff4444';
        textPrefix = '[BREACHING] ';
      } else if (data.state === 'gemini') {
        drawColor = '#00ff44';
        textPrefix = '[GEMINI] ';
      } else if (data.state === 'claude') {
        drawColor = '#ff3333';
        textPrefix = '[CLAUS] ';
      }

      ctx.clearRect(0,0,data.canvas.width, data.canvas.height);

      ctx.fillStyle = 'rgba(5, 10, 15, 0.85)';
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(20, 10);
      ctx.lineTo(240, 10);
      ctx.lineTo(240, 40);
      ctx.lineTo(220, 54);
      ctx.lineTo(10, 54);
      ctx.lineTo(10, 20);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isWorldBank ? '#ffd700' : drawColor;
      if (isWorldBank) {
        ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 10;
        ctx.fillRect(18, 14, 36, 36);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillRect(18, 14, 36, 36);
      }

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 24px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(displayName.charAt(0).toUpperCase(), 36, 34);

      if (data.state === 'hacking') {
        ctx.fillStyle = Math.random() > 0.5 ? drawColor : '#ffffff';
      } else {
        ctx.fillStyle = isWorldBank ? '#ffd700' : '#ffffff';
      }
      ctx.font = 'bold 20px "Courier New", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(textPrefix + displayName.toUpperCase(), 64, 32);

      data.tex.needsUpdate = true;

      if (data.dotCtx) {
        data.dotCtx.clearRect(0,0,64,64);
        data.dotCtx.fillStyle = isWorldBank ? '#ffffff' : drawColor;
        data.dotCtx.shadowBlur = isWorldBank ? 30 : 20;
        data.dotCtx.shadowColor = isWorldBank ? '#ffd700' : drawColor;
        data.dotCtx.beginPath(); data.dotCtx.arc(32, 32, 16, 0, Math.PI * 2); data.dotCtx.fill();
        data.dotTex.needsUpdate = true;
      }
    }

    function animate() {
      requestAnimationFrame(animate);
      const dt = Math.min(clock3.getDelta(), .05);
      time3 += dt;
      
      // Cyber Company Warfare Hack Animation (BLK Skin Only)
      if (window.companiesGroup && window.companiesGroup.visible && window.corpNodes) {
        window.corpNodes.forEach(node => {
          node.data.timer -= dt * node.data.hackSpeed;
          
          if (node.data.timer <= 0) {
            if (node.data.state === 'neutral') {
              node.data.target = Math.random() > 0.5 ? 'gemini' : 'claude';
              node.data.state = 'hacking';
              node.data.timer = 1.0 + Math.random() * 2.0;
            } else if (node.data.state === 'hacking') {
              node.data.state = node.data.target;
              node.data.timer = 5.0 + Math.random() * 10.0;
            } else {
              node.data.state = 'neutral';
              node.data.timer = 2.0 + Math.random() * 3.0;
            }
            redrawCyberCompany(node);
          }
          
          if (node.data.state === 'hacking') {
            const flash = Math.sin(time3 * 20) > 0;
            node.sprite.material.opacity = flash ? 1.0 : 0.3;
            if (node.dotSprite) node.dotSprite.material.opacity = flash ? 1.0 : 0.3;
          } else {
            node.sprite.material.opacity = 1.0;
            if (node.dotSprite) node.dotSprite.material.opacity = 1.0;
          }
        });
      }
`;

code = code.replace(/    function animate\(\) \{\n      requestAnimationFrame\(animate\);\n      const dt = Math\.min\(clock3\.getDelta\(\), \.05\);\n      time3 \+= dt;/g, redrawFunc);

// Finally, we must ensure any call to blkCorpGroup.visible is also removed from toggleRedSkin
code = code.replace(/      if \(typeof window\.blkCorpGroup !== 'undefined'\) \{\n        window\.blkCorpGroup\.visible = \(skin\.name === 'BLK'\);\n      \}\n/g, "");

fs.writeFileSync('GRAPHIC_FILES/game.html', code);
console.log('Successfully patched GRAPHIC_FILES/game.html');
