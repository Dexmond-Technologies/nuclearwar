const fs = require('fs');
const path = require('path');

const gameHtmlPath = path.join(__dirname, '../../GRAPHIC_FILES/game.html');
let html = fs.readFileSync(gameHtmlPath, 'utf8');

// 1. Replace all 'vw' and 'vh' with '%' safely inside CSS or inline styles
// We only want to match numbers followed by vw or vh - highly-optimized regex to prevent locking
html = html.replace(/([0-9]+(?:\.[0-9]+)?)vw/g, '$1%');
html = html.replace(/([0-9]+(?:\.[0-9]+)?)vh/g, '$1%');

// 2. Inject the Scaler Logic right before the closing </body> or at the end of the file
const scalerScript = `
<script>
  // --- GLOBAL UI SCALAR MATRICES ---
  // Transforms the absolute game interface into a proportionately 1920x1080 locked container
  document.addEventListener("DOMContentLoaded", () => {
    const uiLayer = document.createElement('div');
    uiLayer.id = 'ui-layer';
    
    const style = document.createElement('style');
    style.innerHTML = \`
      #ui-layer {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 1920px;
        height: 1080px;
        transform: translate(-50%, -50%);
        transform-origin: center center;
        pointer-events: none;
        z-index: 10;
        overflow: hidden;
      }
      #ui-layer > * {
        pointer-events: auto;
      }
    \`;
    document.head.appendChild(style);

    const excludeIds = ['c', 'deckgl-container', 'ui-layer', 'crosshair', 'flash-overlay'];
    const excludeTags = ['SCRIPT', 'STYLE', 'CANVAS', 'LINK', 'META', 'TITLE'];
    
    // Safely migrate all loose UI elements into the scaling matrix
    const elementsToWrap = [];
    Array.from(document.body.children).forEach(child => {
      if (!excludeTags.includes(child.tagName) && !excludeIds.includes(child.id)) {
        elementsToWrap.push(child);
      }
    });

    elementsToWrap.forEach(el => uiLayer.appendChild(el));
    document.body.appendChild(uiLayer);

    // Override body append methods to securely capture dynamically generated DOM elements
    const originalAppend = document.body.appendChild;
    document.body.appendChild = function(child) {
      if (child.tagName !== 'SCRIPT' && child.tagName !== 'STYLE' && child.tagName !== 'CANVAS' && child.id !== 'deckgl-container' && child.id !== 'ui-layer') {
        const layer = document.getElementById('ui-layer');
        if (layer) return layer.appendChild(child);
      }
      return originalAppend.call(this, child);
    };

    const originalInsert = document.body.insertAdjacentHTML;
    document.body.insertAdjacentHTML = function(position, text) {
      const layer = document.getElementById('ui-layer');
      if (layer && (position === 'beforeend' || position === 'afterbegin')) {
        return layer.insertAdjacentHTML(position, text);
      }
      return originalInsert.call(this, position, text);
    };

    // Calculate Aspect Scaling
    function updateUIScale() {
      const targetW = 1920;
      const targetH = 1080;
      const scaleX = window.innerWidth / targetW;
      const scaleY = window.innerHeight / targetH;
      const scale = Math.min(scaleX, scaleY);
      uiLayer.style.transform = \\\`translate(-50%, -50%) scale(\\\${scale})\\\`;
    }

    window.addEventListener('resize', updateUIScale);
    updateUIScale(); // Intial lock
  });
</script>
`;

if (html.includes('</body>')) {
  html = html.replace('</body>', `${scalerScript}\n</body>`);
} else {
  html += `\n${scalerScript}`;
}

fs.writeFileSync(gameHtmlPath, html);
console.log('UI Scaler successfully deployed and dynamically scoped inside game.html');
