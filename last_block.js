// Vanilla Wallet Integration (Phantom / MetaMask)

  window.openVanillaWalletModal = function() {
    const overlay = document.createElement('div');
    overlay.id = 'vanilla-wallet-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.85)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '999999';

    const modal = document.createElement('div');
    modal.style.background = '#0a192f';
    modal.style.border = '1px solid #00f0ff';
    modal.style.padding = '30px';
    modal.style.borderRadius = '4px';
    modal.style.fontFamily = "'Courier New', monospace";
    modal.style.color = '#fff';
    modal.style.boxShadow = '0 0 25px rgba(0, 240, 255, 0.2)';
    modal.style.textAlign = 'center';
    modal.style.width = '320px';

    const title = document.createElement('h3');
    title.innerText = 'SELECT DATA LINK';
    title.style.margin = '0 0 20px 0';
    title.style.color = '#00f0ff';
    title.style.letterSpacing = '2px';
    modal.appendChild(title);

    const createWalletBtn = (name, color, hoverColor, onClickFn) => {
      const btn = document.createElement('button');
      btn.innerText = `CONNECT ${name.toUpperCase()}`;
      btn.style.display = 'block';
      btn.style.width = '100%';
      btn.style.padding = '14px';
      btn.style.marginBottom = '12px';
      btn.style.background = 'rgba(0,20,40,0.8)';
      btn.style.color = color;
      btn.style.border = `1px solid ${color}`;
      btn.style.borderRadius = '4px';
      btn.style.cursor = 'pointer';
      btn.style.fontSize = '14px';
      btn.style.fontWeight = 'bold';
      btn.style.letterSpacing = '1px';
      btn.style.transition = 'all 0.2s';
      
      btn.onmouseover = () => {
        btn.style.background = hoverColor;
        btn.style.boxShadow = `0 0 15px ${color}`;
      };
      btn.onmouseout = () => {
        btn.style.background = 'rgba(0,20,40,0.8)';
        btn.style.boxShadow = 'none';
      };

      btn.onclick = async () => {
        btn.innerText = 'CONNECTING...';
        await onClickFn();
        document.getElementById('vanilla-wallet-overlay')?.remove();
      };
      return btn;
    };

    const handleSuccess = (address) => {
      const statusEl = document.getElementById('lobby-auth-status');
      if (statusEl) {
        statusEl.innerHTML = '✓ DATA LINK ESTABLISHED: ' + address.substring(0,4) + '...' + address.substring(address.length-4);
      }
      const authFlex = document.getElementById('auth-container-flex');
      if (authFlex) {
        authFlex.style.display = 'none';
      }
      window.pendingSolanaAddress = address; // Keep mapping name for backend compatibility
      if (typeof window.joinGlobalWar === 'function') {
        window.joinGlobalWar();
      }
    };

    // Phantom Button
    if (window.solana && window.solana.isPhantom) {
      const phantomBtn = createWalletBtn('Phantom', '#ab9ff2', 'rgba(171,159,242,0.2)', async () => {
        try {
          const resp = await window.solana.connect();
          handleSuccess(resp.publicKey.toString());
        } catch (err) {
          console.error(err);
          alert('Phantom Connection Failed');
        }
      });
      modal.appendChild(phantomBtn);
    } else {
      const msg = document.createElement('div');
      msg.innerText = 'Phantom extension not detected.';
      msg.style.color = '#ab9ff2'; msg.style.opacity = '0.5'; msg.style.fontSize = '11px'; msg.style.marginBottom = '10px';
      modal.appendChild(msg);
    }

    // MetaMask Button
    if (window.ethereum && window.ethereum.isMetaMask) {
      const metamaskBtn = createWalletBtn('MetaMask', '#f6851b', 'rgba(246,133,27,0.2)', async () => {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          handleSuccess(accounts[0]);
        } catch (err) {
          console.error(err);
          alert('MetaMask Connection Failed');
        }
      });
      modal.appendChild(metamaskBtn);
    } else {
      const msg = document.createElement('div');
      msg.innerText = 'MetaMask extension not detected.';
      msg.style.color = '#f6851b'; msg.style.opacity = '0.5'; msg.style.fontSize = '11px'; msg.style.marginBottom = '10px';
      modal.appendChild(msg);
    }

    const closeBtn = document.createElement('button');
    closeBtn.innerText = 'ABORT';
    closeBtn.style.marginTop = '15px';
    closeBtn.style.background = 'transparent';
    closeBtn.style.color = '#ff3232';
    closeBtn.style.border = 'none';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontSize = '12px';
    closeBtn.style.letterSpacing = '1px';
    closeBtn.onclick = () => overlay.remove();
    closeBtn.onmouseover = () => closeBtn.style.textShadow = '0 0 8px #ff3232';
    closeBtn.onmouseout = () => closeBtn.style.textShadow = 'none';
    
    modal.appendChild(closeBtn);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

// =====================================================================
// MOCK GLOBAL TRADE ECONOMY (GREEN & YELLOW SKINS)
// =====================================================================
const MockTradeEconomy = (function() {
  let countries = [];
  let turn = 0;
  let lastStats = {};

  function getCountry(name) {
    let c = countries.find(x => x.name.toUpperCase() === name.toUpperCase());
    if (!c) {
       c = {
          name: name,
          gProd: 40 + Math.random() * 80,
          yProd: 30 + Math.random() * 80,
          gStock: 100 + Math.random() * 200,
          yStock: 100 + Math.random() * 200,
          gDem: 50 + Math.random() * 50,
          yDem: 50 + Math.random() * 50
       };
       countries.push(c);
    }
    return c;
  }

  function initCountries() {
    if (countries.length > 0) return;
    if (typeof countryData === 'undefined' || Object.keys(countryData).length === 0) return;
    
    // Seed the simulation with the full map list to ensure activity spans the globe evenly
    Object.values(countryData).forEach(cd => {
       if(cd.name) getCountry(cd.name);
    });
  }

  function runTurn() { return; // STRICT SURVEILLANCE: Mock Disabled. Awaiting true state data from Backend
    try {
      initCountries();
      if (countries.length === 0) return;

      const skin = window.SKINS && window.SKINS[window.currentSkinIndex] ? window.SKINS[window.currentSkinIndex].name : null;
      if (skin !== 'GREEN') return;

      turn++;
      let log = `\n--- TURN ${turn} (SKIN: ${skin}) ---\n\nPRODUCTION:\n`;
      const gExp = [], gImp = [], yExp = [], yImp = [];
      
      // Step 1, 2, 3: Production, Fluctuation, Pressure
      countries.forEach(c => {
        c.gProd *= 0.9 + Math.random() * 0.2;
        c.yProd *= 0.9 + Math.random() * 0.2;
        c.gStock += c.gProd;
        c.yStock += c.yProd;
        
        if (Math.random() < 0.1) log += `${c.name} +${Math.round(c.gProd)} GreenSkin, +${Math.round(c.yProd)} YellowSkin\n`;
        
        const gPres = c.gStock - c.gDem;
        const yPres = c.yStock - c.yDem;
        if (gPres > 40) gExp.push(c);
        if (gPres < -20) gImp.push(c);
        if (yPres > 40) yExp.push(c);
        if (yPres < -20) yImp.push(c);
      });

      log += '\nTRADE:\n';
      
      // Step 4: Trade Matching Algorithm
      // Green trades return Yellow
      gExp.forEach(exp => {
        // Find importer that isn't the exporter
        const imp = gImp.find(i => i.name !== exp.name);
        if (imp) {
           // Calculate amount constraint
           const amt = Math.floor(Math.min(exp.gStock * 0.2, (imp.gDem - imp.gStock > 0 ? imp.gDem - imp.gStock : 50) * 0.5, 10 + Math.random() * 30));
           if (amt > 0) {
              exp.gStock -= amt; imp.gStock += amt;
              exp.yStock += amt * 0.6; imp.yStock -= amt * 0.6;
              log += `${exp.name} -> ${imp.name} : ${amt} GreenSkin\n`;
              log += `${imp.name} -> ${exp.name} : ${Math.floor(amt * 0.6)} YellowSkin\n\n`;
           }
        }
      });

      // Yellow trades return Green
      yExp.forEach(exp => {
        const imp = yImp.find(i => i.name !== exp.name);
        if (imp) {
           const amt = Math.floor(Math.min(exp.yStock * 0.2, (imp.yDem - imp.yStock > 0 ? imp.yDem - imp.yStock : 50) * 0.5, 10 + Math.random() * 30));
           if (amt > 0) {
              exp.yStock -= amt; imp.yStock += amt;
              exp.gStock += amt * 1.5; imp.gStock -= amt * 1.5;
              log += `${exp.name} -> ${imp.name} : ${amt} YellowSkin\n`;
              log += `${imp.name} -> ${exp.name} : ${Math.floor(amt * 1.5)} GreenSkin\n\n`;
           }
        }
      });

      log += 'EVENT:\n';
      // Step 5: Event Layer (7% vol. trigger)
      countries.forEach(c => {
         if (Math.random() < 0.07) {
            const ev = Math.random();
            if (ev < 0.3) { c.gProd *= 1.25; log += `${c.name} harvest boom (+25% Green prod)\n`; }
            else if (ev < 0.6) { c.yProd *= 0.7; log += `${c.name} mining strike (-30% Yellow prod)\n`; }
            else if (ev < 0.8) { c.gProd *= 1.1; c.yProd *= 1.1; log += `${c.name} infra upgrade (+10% both)\n`; }
            else { c.yStock += 80; log += `${c.name} resource discovery (+80 Yellow stock)\n`; }
         }
      });

      log += '\nSUMMARY:\n';
      // Hook Live UI Updates
      const formatPct = (now, prev) => {
         if (!prev || prev === 0) return `<span style="color:#888;">0.0%</span>`;
         const pct = ((now - prev) / prev) * 100;
         const sign = pct >= 0 ? '+' : '';
         const col = pct >= 0 ? '#0f8' : '#ff4444';
         const arr = pct >= 0 ? '▲' : '▼';
         return `<span style="color:${col};">${sign}${pct.toFixed(1)}% ${arr}</span>`;
      };

      const gBox = document.getElementById('mock-trade-green-ui');
      if (gBox) {
         const cn = gBox.getAttribute('data-country-name');
         const cObj = getCountry(cn);
         const dBox = document.getElementById('mock-trade-green-data');
         if (dBox) {
            const p = lastStats[cObj.name] || { gStock: cObj.gStock, gProd: cObj.gProd };
            dBox.innerHTML = `
              <table width="100%" style="margin-top:5px;">
                <tr><td style="opacity:0.8; padding-bottom:4px;">Stockpile:</td><td align="right" style="font-weight:bold;">${Math.round(cObj.gStock)} <span style="font-weight:normal;font-size:10px;">Vol</span></td><td align="right">${formatPct(cObj.gStock, p.gStock)}</td></tr>
                <tr><td style="opacity:0.8;">Est. Prod:</td><td align="right" style="font-weight:bold;">${Math.round(cObj.gProd)} <span style="font-weight:normal;font-size:10px;">/min</span></td><td align="right">${formatPct(cObj.gProd, p.gProd)}</td></tr>
              </table>
            `;
         }
      }

      const yBox = document.getElementById('mock-trade-yellow-ui');
      if (yBox) {
         const cn = yBox.getAttribute('data-country-name');
         const cObj = getCountry(cn);
         const dBox = document.getElementById('mock-trade-yellow-data');
         if (dBox) {
            const p = lastStats[cObj.name] || { yStock: cObj.yStock, yProd: cObj.yProd };
            dBox.innerHTML = `
              <table width="100%" style="margin-top:5px;">
                <tr><td style="opacity:0.8; padding-bottom:4px;">Stockpile:</td><td align="right" style="font-weight:bold; color:#ffa;">${Math.round(cObj.yStock)} <span style="font-weight:normal;font-size:10px;">Vol</span></td><td align="right">${formatPct(cObj.yStock, p.yStock)}</td></tr>
                <tr><td style="opacity:0.8;">Est. Prod:</td><td align="right" style="font-weight:bold; color:#ffa;">${Math.round(cObj.yProd)} <span style="font-weight:normal;font-size:10px;">/min</span></td><td align="right">${formatPct(cObj.yProd, p.yProd)}</td></tr>
              </table>
            `;
         }
      }

      // Save state for next turn percentages
      countries.forEach(c => {
         lastStats[c.name] = { gStock: c.gStock, yStock: c.yStock, gProd: c.gProd, yProd: c.yProd };
      });
    } catch (err) {
      console.error("Trade Simulation Error", err);
      const gBox = document.getElementById('mock-trade-green-data');
      if(gBox) gBox.innerHTML = `<span style="color:red; font-size:10px;">Err: ${err.message}</span>`;
      const yBox = document.getElementById('mock-trade-yellow-data');
      if(yBox) yBox.innerHTML = `<span style="color:red; font-size:10px;">Err: ${err.message}</span>`;
    }
  }

  // Inject initial populate on demand if box exists before first tick
  setInterval(() => {
     if (document.getElementById('mock-trade-green-ui') && document.getElementById('mock-trade-green-data').innerHTML.includes("Loading")) {
         runTurn(); // Force update
     }
     if (document.getElementById('mock-trade-yellow-ui') && document.getElementById('mock-trade-yellow-data').innerHTML.includes("Loading")) {
         runTurn(); 
     }
  }, 1000);

  // Hook background simulation pulse every 10 seconds
  setInterval(runTurn, 10000); 
  
  // Immediately queue first turn to prevent 10s empty UI
  setTimeout(runTurn, 2000);

  return { countries, runTurn };
})();

// =====================================================================
// CYBER WARFARE LOGIC (RAINCLAUDE VS GEMINI)
// =====================================================================
window.launchDatacenterAttack = function() {
    if (window.SKINS[window.currentSkinIndex].name !== 'CYBER') return;

    if (!window.datacentersGroup || !window.datacentersGroup.children) return;

    // Gemini targets Rainclaude (Red) datacenters
    const potentialTargets = window.datacentersGroup.children.filter(mesh => 
        mesh.visible && mesh.userData && mesh.userData.owner === 'RAINCLAUDE'
    );

    if (potentialTargets.length === 0) return;

    const termBox = document.getElementById('d0-reasoning'); // Gemini Terminal

    const attacksToLaunch = Math.min(10, potentialTargets.length); // Max 10 simultaneous node attacks
    for (let i = 0; i < attacksToLaunch; i++) {
        const targetMesh = potentialTargets[Math.floor(Math.random() * potentialTargets.length)];
        if (!targetMesh || window.activeAttacks[targetMesh.uuid]) continue;

        if (!targetMesh.userData.baseColor) {
            targetMesh.userData.baseColor = 0xff2244; 
        }

        // Register attack (Gemini probing)
        window.activeAttacks[targetMesh.uuid] = {
            mesh: targetMesh,
            startTime: Date.now() + (Math.random() * 500),
            state: 'datacenter_attack',
            defenseTime: 2500 + Math.random() * 2000
        };

        if (termBox && Math.random() < 0.3) { 
            const attackTypes = [
                "quantum decryption",
                "backdoor bypass",
                "neural payload routing",
                "node saturation",
                "zero-day injection",
                "sub-routine override"
            ];
            const randAttack = attackTypes[Math.floor(Math.random() * attackTypes.length)];
            const div = document.createElement('div');
            div.innerHTML = `> [NET] Gemini executing ${randAttack} on <span style="color:#0f8">${targetMesh.userData.name}</span>...`;
            termBox.appendChild(div);
            if (termBox.childElementCount > 30) termBox.removeChild(termBox.firstChild);
            termBox.scrollTop = termBox.scrollHeight;
        }
    }
};

window.launchCyberAttack = function() {
    if (window.SKINS[window.currentSkinIndex].name !== 'BLK') return;

    // Aggregate all active company groups on BLK skin
    const potentialTargets = [];
    const groups = [window.companiesGroup, window.mediumCompaniesGroup, window.africaCompaniesGroup, window.microCompaniesGroup, window.russiaAsiaCompaniesGroup];
    
    groups.forEach(group => {
        if (group && group.children) {
            potentialTargets.push(...group.children.filter(mesh => mesh.visible && mesh.userData));
        }
    });

    if (potentialTargets.length === 0) return;

    const termBox = document.getElementById('d1-reasoning');

    // Launch up to 300 simultaneous attacks (Massive 5x multiplier per user request)
    const attacksToLaunch = Math.min(300, potentialTargets.length);
    for (let i = 0; i < attacksToLaunch; i++) {
        // Pick a random company
        const targetMesh = potentialTargets[Math.floor(Math.random() * potentialTargets.length)];
        if (!targetMesh) continue;

        // Ensure it's not already under attack
        if (window.activeAttacks[targetMesh.uuid]) continue;

        // Cache the base color if we haven't already
        if (!targetMesh.userData.baseColor) {
            if (targetMesh.material && targetMesh.material.color) {
                targetMesh.userData.baseColor = targetMesh.material.color.getHex();
            } else {
                targetMesh.userData.baseColor = 0xffffff;
            }
        }

        // Register attack
        window.activeAttacks[targetMesh.uuid] = {
            mesh: targetMesh,
            startTime: Date.now() + (Math.random() * 500), // Slight stagger
            state: 'attack',
            defenseTime: 2500 + Math.random() * 2000 // Lasts 2.5 - 4.5 seconds before resolution
        };

        // Log to Rainclaude Terminal
        if (termBox && Math.random() < 0.2) { // Only log 20% to avoid spamming the DOM too hard
            const attackTypes = [
                "brute-force attack",
                "SQL injection",
                "zero-day exploit",
                "DDoS saturation",
                "ransomware payload",
                "DNS spoofing",
                "phishing vector",
                "buffer overflow",
                "man-in-the-middle",
                "rootkit insertion"
            ];
            const randAttack = attackTypes[Math.floor(Math.random() * attackTypes.length)];
            const div = document.createElement('div');
            div.innerHTML = `> [CYBER] Rainclaude initiating ${randAttack} on <span style="color:#fff">${targetMesh.userData.name}</span>...`;
            termBox.appendChild(div);
            if (termBox.childElementCount > 30) termBox.removeChild(termBox.firstChild);
            termBox.scrollTop = termBox.scrollHeight;
        }
    }
    
    if (typeof _sfxError !== 'undefined' && Math.random() < 0.3) _sfxError();
};

// =====================================================================
// BLACK SKIN 5-MINUTE CYBER WARFARE POPUP
// =====================================================================
setInterval(() => {
    if (window.SKINS[window.currentSkinIndex].name !== 'BLK') return;
    if (!window.cyberWarfareStats || window.cyberWarfareStats.companiesBreached === 0) return;

    // Create the popup
    const popup = document.createElement('div');
    popup.style.position = 'fixed';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.width = '800px';
    popup.style.maxHeight = '70vh';
    popup.style.overflowY = 'auto';
    popup.style.padding = '20px 30px';
    popup.style.background = 'rgba(20,5,0,0.96)';
    popup.style.border = '2px solid #f24';
    popup.style.borderRadius = '8px';
    popup.style.boxShadow = '0 0 50px rgba(255,50,50,0.4), inset 0 0 20px rgba(255,0,0,0.2)';
    popup.style.fontFamily = '"Share Tech Mono", monospace';
    popup.style.color = '#fff';
    popup.style.transition = 'opacity 0.5s ease-in-out';
    popup.style.pointerEvents = 'auto'; // Re-enable pointer so they can scroll
    popup.style.opacity = '0';
    popup.style.zIndex = '999999';

    // Generate Company Log Table
    let tableHtml = `<table style="width:100%; border-collapse:collapse; margin-top:15px; font-size:14px; text-align:left;">`;
    tableHtml += `<tr style="color:#f24; border-bottom:1px solid rgba(255,50,50,0.5);">
                    <th style="padding:8px;">TIME</th>
                    <th style="padding:8px;">COMPROMISED ASSET</th>
                    <th style="padding:8px; text-align:right;">SIPHONED CAPITAL</th>
                  </tr>`;
    
    // Sort log by highest amount stolen
    const sortedLog = window.cyberWarfareStats.companyLog.sort((a, b) => b.amount - a.amount);
    
    sortedLog.forEach((entry, i) => {
        const tString = new Date().toLocaleTimeString('en-US', {hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit'}) + "." + Math.floor(Math.random()*999).toString().padStart(3,'0');
        tableHtml += `<tr style="border-bottom:1px solid rgba(255,255,255,0.05); background:${i % 2 === 0 ? 'rgba(255,50,50,0.02)' : 'transparent'};">
                        <td style="padding:8px; color:#aaa;">[${tString}]</td>
                        <td style="padding:8px; color:#ffb; font-weight:bold;">${entry.name}</td>
                        <td style="padding:8px; color:#f24; text-align:right; font-family:'Courier New', monospace;">$${entry.amount.toFixed(2)} M</td>
                      </tr>`;
    });
    tableHtml += `</table>`;

    popup.innerHTML = `
        <div style="font-size:24px; color:#f24; font-weight:bold; letter-spacing:2px; margin-bottom:10px; border-bottom:2px dashed #f24; padding-bottom:10px; text-transform:uppercase; text-shadow:0 0 10px #f00;">
            ⚠️ HIGH-PRIORITY CYBER INTELLIGENCE REPORT
            <span style="float:right; cursor:pointer; font-size:18px; color:#fff;" onclick="this.parentElement.parentElement.style.opacity='0'; setTimeout(()=>this.parentElement.parentElement.remove(), 500);">✕</span>
        </div>
        <div style="font-size:16px; opacity:0.9; margin-bottom:15px; color:#ccc;">Rainclaude AI Aggregated Intercepts — Last 5 Minutes Window:</div>
        
        <div style="display:flex; justify-content:space-between; background:rgba(255,50,50,0.1); padding:15px; border-radius:4px; font-size:18px; margin-bottom:15px; border:1px solid rgba(255,50,50,0.3);">
            <span>TOTAL CORPORATE BREACHES: <b style="color:#fff; margin-left:10px;">${window.cyberWarfareStats.companiesBreached}</b></span>
            <span>TOTAL CAPITAL EXTRACTED: <b style="color:#f24; font-family:'Courier New', monospace;">$${window.cyberWarfareStats.fundsStolen.toFixed(2)} M</b></span>
        </div>
        
        <div style="font-size:14px; color:#f24; font-weight:bold; letter-spacing:1px; margin-top:20px;">DETAILED INCIDENT LOG:</div>
        <div style="max-height: 40vh; overflow-y:auto; padding-right:10px; margin-bottom:20px; border:1px solid rgba(255,255,255,0.1); background:rgba(0,0,0,0.5);">
          ${tableHtml}
        </div>
        
        <button style="width:100%; padding:15px; background:linear-gradient(135deg,rgba(255,50,50,0.2),rgba(255,50,50,0.4)); border:1px solid #f24; color:#fff; font-family:'Share Tech Mono', monospace; font-size:18px; font-weight:bold; letter-spacing:3px; cursor:pointer; transition:0.2s; text-shadow:0 0 5px #000;" onclick="this.parentElement.style.opacity='0'; setTimeout(()=>this.parentElement.remove(), 500);" onmouseover="this.style.filter='brightness(1.5)';" onmouseout="this.style.filter='brightness(1)';">ACKNOWLEDGE WARNING</button>
    `;

    document.body.appendChild(popup);
    
    // Trigger fade in 
    setTimeout(() => {
        if (popup) popup.style.opacity = '1';
    }, 50);

    // Reset stats for the next 5 minutes
    window.cyberWarfareStats = { fundsStolen: 0, companiesBreached: 0, companyLog: [] };

    // Auto-remove after 8 seconds (giving player more time to read the detailed list)
    setTimeout(() => {
        if (popup) popup.style.opacity = '0';
        setTimeout(() => { if (popup && popup.parentElement) popup.remove(); }, 500);
    }, 8000);

}, 300000); // 5 minutes

// =====================================================================
// HACKER TERMINAL LOGIC (RAINCLAUDE EASTER EGG)
// =====================================================================
let egrCmdState = {
  phase: 'recon', // recon, recon_advanced, shell, root, armed
  hydraCount: 0,
  hashInputMode: false
};

const btnCmd = document.getElementById('btn-cmd-toggle');
const termModal = document.getElementById('hacker-terminal-modal');
const termInput = document.getElementById('term-input');
const termOutput = document.getElementById('term-output');

if (btnCmd) {
  btnCmd.addEventListener('click', () => {
    termModal.classList.add('show');
    termInput.focus();
  });
}

function printTerm(text, color = '#0f8') {
  const line = document.createElement('div');
  line.style.color = color;
  line.innerText = text;
  termOutput.appendChild(line);
  termOutput.scrollTop = termOutput.scrollHeight;
}

if (termInput) {
  termInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const cmd = termInput.value.trim();
      const lowerCmd = cmd.toLowerCase();
      if (!cmd) return;
      
      const promptStr = (egrCmdState.phase === 'root' || egrCmdState.phase === 'armed')
                        ? 'root@nuke# ' 
                        : (egrCmdState.phase === 'shell' ? 'operator@rainclaude:~$ ' : 'root@hmn_cmd:~$ ');
      printTerm(`\n${promptStr}${cmd}`, '#fff');
      termInput.value = '';
      
      if (egrCmdState.hashInputMode) {
        if (lowerCmd === 'tritium42') {
           printTerm('[+] Hash cracked successfully! Code part: "ALPHA-7"', '#0f8');
           egrCmdState.hashInputMode = false;
        } else {
           printTerm('[-] Incorrect hash. Try again or type "abort".', '#f24');
           if (lowerCmd === 'abort') egrCmdState.hashInputMode = false;
        }
        return;
      }
      
      processHackCommand(lowerCmd);
    }
  });
}

function processHackCommand(cmd) {
  if (cmd === 'abort') {
    egrCmdState = { phase: 'recon', hydraCount: 0, hashInputMode: false };
    printTerm('Connection aborted. You narrowly averted disaster. State reset.', '#fa0');
    return;
  }
  
  if (cmd === 'help') {
    printTerm('Available commands: scan, nmap, ping, traceroute, hydra, sqlmap, nikto, dirb, cat, crackme, find, sudo, exploit, decode, backdoor, escalate, download, launch, abort.');
    printTerm('Hint: You are blind. Try scanning the target first.', '#888');
    return;
  }
  
  if (cmd === 'ping rainclaude.nuke') {
    printTerm('PING rainclaude.nuke (192.168.66.6): 56 data bytes\n64 bytes from 192.168.66.6: icmp_seq=1 ttl=60 time=14.2 ms\n64 bytes from 192.168.66.6: icmp_seq=2 ttl=60 time=15.1 ms');
    printTerm('Hint: Response time indicates a close-proximity node. Vulnerable to fast brute-force.', '#888');
    return;
  }
  
  if (cmd === 'traceroute rainclaude.nuke') {
    printTerm('traceroute to rainclaude.nuke (192.168.66.6), 30 hops max\n1  gateway (10.0.0.1)  1.1 ms\n2  isp_gw (172.16.0.1) 8.4 ms\n3  nuke_fw_weak1 (192.168.66.1) 12.0 ms\n4  rainclaude.nuke (192.168.66.6) 14.2 ms');
    printTerm('[i] Weak hop detected at nuke_fw_weak1. External bypassing possible.', '#0f8');
    return;
  }

  if (cmd === 'scan') {
    printTerm('Scanning target rainclaude.nuke...');
    setTimeout(() => {
      printTerm('Discovered open ports:\n22/tcp SSH\n80/tcp HTTP\n443/tcp HTTPS\n445/tcp SMB');
      if (egrCmdState.phase === 'recon') egrCmdState.phase = 'recon_advanced';
    }, 500);
    return;
  }
  
  if (cmd === 'nmap -sv rainclaude.nuke') {
    printTerm('Starting Nmap...\nPORT   STATE SERVICE VERSION\n22/tcp open  ssh     OpenSSH 8.4p1\n80/tcp open  http    Apache httpd 2.4.41 (Outdated)\n445/tcp open smb     Windows 7 SP1 (Vulnerable)');
    printTerm('Hint: Service versions exposed. Multiple attack vectors open.', '#0f8');
    return;
  }

  if (cmd === 'sqlmap -u "http://rainclaude.nuke/login" --dbs') {
    printTerm('Testing HTTP GET parameter injection...');
    setTimeout(() => {
      printTerm('[+] payload found! Error-based SQL injection successful.', '#0f8');
      printTerm('available databases [4]:\n[*] information_schema\n[*] mysql\n[*] performance_schema\n[*] nuke_silos', '#0f8');
    }, 600);
    return;
  }

  if (cmd === 'nikto -h rainclaude.nuke') {
    printTerm('- Nikto v2.1.6\n+ Target IP: 192.168.66.6\n+ Info: Apache/2.4.41 appears to be outdated.');
    printTerm('+ Vulnerability: Directory Traversal allowed in /cgi-bin/ path. Secret files exposed.', '#fa0');
    return;
  }

  if (cmd === 'dirb http://rainclaude.nuke /wordlist.txt') {
    printTerm('Starting dirb...\nGENERATED WORDS: 4612\n\n---- Scanning URL: http://rainclaude.nuke/ ----');
    setTimeout(() => {
      printTerm('+ http://rainclaude.nuke/admin (CODE:403)\n+ http://rainclaude.nuke/nuclear_codes (CODE:200) -> SECRET PANEL FOUND', '#0f8');
    }, 500);
    return;
  }

  if (cmd === 'hydra -l admin -p /wordlist.txt ssh') {
    if (egrCmdState.hydraCount >= 3) {
      printTerm('[-] Target locked out due to multiple brute-force attempts.', '#f24');
      return;
    }
    egrCmdState.hydraCount++;
    printTerm('Hydra v9.2 testing SSH on 192.168.66.6...');
    if (egrCmdState.hydraCount === 3) {
      setTimeout(() => {
        printTerm('[22][ssh] host: rainclaude.nuke   login: admin   password: plutonium', '#0f8');
        printTerm('[+] SSH connection established.', '#0f8');
        egrCmdState.phase = 'shell';
      }, 500);
    } else {
      setTimeout(() => {
        printTerm('[-] Attempt failed. Target actively monitoring connections.', '#f24');
      }, 500);
    }
    return;
  }
  
  if (egrCmdState.phase !== 'recon' && egrCmdState.phase !== 'recon_advanced') {
    // Shell/Root level commands
    if (cmd === 'cat /etc/passwd') {
      printTerm('root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\noperator:x:1000:1000:operator,,,:/home/operator:/bin/bash\n');
      printTerm('Hint: "root" and "operator" are viable targets for escalation.', '#888');
      return;
    }
    if (cmd === 'find / -name "nuke" 2>/dev/null') {
      printTerm('Searching...');
      setTimeout(() => {
        printTerm('/var/hidden_system_nuke\n/var/hidden_system_nuke/launch_sequence.txt', '#0f8');
      }, 400);
      return;
    }
    if (cmd === 'sudo -l') {
      printTerm('Matching Defaults entries for operator on rainclaude:\n    env_reset, mail_badpass, secure_path=/usr/local/sbin\\:/usr/local/bin\\:/usr/sbin\\:/usr/bin\nUser operator may run the following commands on rainclaude:\n    (ALL : ALL) NOPASSWD: /usr/bin/su root', '#fa0');
      return;
    }
    if (cmd === 'escalate privs') {
      printTerm('[*] Exploiting misconfigured sudoers via CVE-XXXX...');
      setTimeout(() => {
        printTerm('[+] Success! Kernel panicked and returned root descriptor.', '#0f8');
        egrCmdState.phase = 'root';
      }, 600);
      return;
    }
    if (cmd === 'exploit eternalblue') {
      printTerm('[*] Loading ms17-010 EternalBlue...');
      setTimeout(() => {
        printTerm('[*] Attempting to trigger buffer overflow...\n[+] USER SYSTEM privileged execution guaranteed.', '#0f8');
        printTerm('[+] Nuclear Silo Controls unlocked.', '#0f8');
        egrCmdState.phase = 'root';
      }, 800);
      return;
    }
    if (cmd === 'backdoor install') {
      printTerm('[*] Dropping bind shell on port 4444...');
      printTerm('[+] Persistent access guaranteed.', '#0f8');
      return;
    }
  }

  if (cmd.startsWith('crackme')) {
    printTerm('Hash provided. Initiating cracker module...', '#fa0');
    egrCmdState.hashInputMode = true;
    printTerm('Enter cracked plaintext for hash (Hint: "tritium42"):', '#fa0');
    return;
  }

  if (cmd.startsWith('decode base64')) {
    const b64 = cmd.replace('decode base64', '').trim();
    if (!b64) {
      printTerm('Usage: decode base64 <string>');
      return;
    }
    printTerm(`Decoded string: "BETA-9-CHARLIE"`);
    return;
  }
  
  if (cmd === 'download launch_codes.txt') {
    if (egrCmdState.phase === 'root') {
      printTerm('[*] Downloading payload...', '#fa0');
      setTimeout(() => {
        printTerm('[+] launch_codes.txt downloaded. MD5 Checksum MATCH.', '#0f8');
        printTerm('[!] SYSTEM ARMED. Awaiting "launch --target=usa" command.', '#fa0');
        egrCmdState.phase = 'armed';
      }, 1000);
    } else {
      printTerm('[-] Access Denied. Insufficient privileges.', '#f24');
    }
    return;
  }

  if (cmd === 'launch --target=usa') {
    if (egrCmdState.phase === 'armed') {
      printTerm('!!! TARGET ACQUIRED. LAUNCH SEQUENCE INITIATED !!!', '#f24');
      termModal.style.filter = 'hue-rotate(90deg) contrast(2)';
      setTimeout(() => termModal.style.filter = 'none', 1000);
      
      let bar = '[';
      const printBar = (progress) => {
        if (progress > 20) {
           printTerm('!!! LAUNCH SUCCESSFUL !!!', '#f24');
           setTimeout(() => { 
               document.getElementById('hacker-terminal-modal').classList.remove('show'); 
               if(typeof triggerNewsEvent === 'function') {
                   triggerNewsEvent("USA DESTROYED BY ROGUE NUCLEAR STRIKE FROM COMMAND TERMINAL"); 
               }
           }, 2000);
           return;
        }
        bar += '#';
        termOutput.innerText += `\nProgress: ${bar.padEnd(21, '-')} ${progress * 5}%`;
        termOutput.scrollTop = termOutput.scrollHeight;
        setTimeout(() => printBar(progress + 1), 100);
      };
      printBar(1);
    } else {
      printTerm('[-] MISSING PREREQUISITES: Target unmapped or launch code checksum failed.', '#f24');
    }
    return;
  }

  printTerm('Command not recognized or target inaccessible.');
}

window.internalD3XMiningAmount = 0.0;

window.openD3XMiningCave = function(caveName) {
    if (window.currentSkinIndex !== 2) return;
    SFX.playClick();
    document.getElementById('mining-cave-title').textContent = caveName.toUpperCase();
    document.getElementById('internal-mining-amount').textContent = window.internalD3XMiningAmount.toFixed(2);
    document.getElementById('mining-progress-bar').style.width = (window.internalD3XMiningAmount * 100) + '%';
    document.getElementById('mining-log').innerHTML = '<div style="opacity:0.7;">Cave accessed. Awaiting mining directive...</div>';
    document.getElementById('d3x-mining-modal').style.display = 'flex';
};

window.mineD3XCoin = function() {
    const myPlayer = GS.players && GS.players[GS.myIndex];
    if (!myPlayer) return;
    
    if (myPlayer.budget < 1) {
        SFX.playError();
        const log = document.getElementById('mining-log');
        log.innerHTML += `<div><span style="color:#f55">ERROR: Insufficient D3X. Required: 1 D3X.</span></div>`;
        log.scrollTop = log.scrollHeight;
        return;
    }
    
    // Burn 1 D3X
    myPlayer.budget -= 1;
    updateDashboard(); // Updates the UI balance globally
    
    SFX.playLaser(); // Good enough for a laser drill sound placeholder
    
    // Accumulate +0.05
    window.internalD3XMiningAmount += 0.05;
    
    const log = document.getElementById('mining-log');
    log.innerHTML += `<div><span style="color:#aaa">-1 D3X Burned.</span> Mining operation yielded <span style="color:#0f8">+0.05 D3X</span> internal progress.</div>`;
    
    // Check if we hit 1.0 total
    if (window.internalD3XMiningAmount >= 0.99) { // Using 0.99 to avoid float precision bugs around 1.0
        window.internalD3XMiningAmount = 0.0;
        myPlayer.budget += 1; // Payout 1 whole D3X
        updateDashboard();
        SFX.playSiren(); // Payout sound
        log.innerHTML += `<div style="color:#0f8; font-weight:bold; font-size:14px; margin-top:10px;">JACKPOT! 1.0 D3X Deposited to Wallet!</div>`;
        if (typeof setLog === 'function') setLog("💎 D3X Mining Operation Successful! +1 D3X added to balance.");
    }
    
    // Update mining modal UI
    document.getElementById('internal-mining-amount').textContent = window.internalD3XMiningAmount.toFixed(2);
    document.getElementById('mining-progress-bar').style.width = (window.internalD3XMiningAmount * 100) + '%';
    document.getElementById('d3x-balance').textContent = myPlayer.budget; // Update black market balance if open behind it
    log.scrollTop = log.scrollHeight;
};

// </script>