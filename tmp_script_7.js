window.openVanillaWalletModal = function() {
      if (window.solanaWalletManager) {
          window.solanaWalletManager.showWalletModal();
      } else {
          alert("Solana Wallet Connectors are still loading. Please wait a moment.");
      }
  };

  window.connectDirectPhantom = async function() {
    const btn = document.getElementById('btn-direct-phantom');
    if (btn) btn.innerText = 'CONNECTING...';
    
    if (window.solana && window.solana.isPhantom) {
      try {
        await window.solana.disconnect();
        
        const domain = window.location.host || 'localhost';
        const uri = window.location.href || 'http://localhost:8888';
        const currentDateTime = new Date().toISOString();
        const nonce = Array.from(crypto.getRandomValues(new Uint8Array(8))).map(b => b.toString(16).padStart(2, '0')).join('');

        const input = {
          domain,
          statement: "Sign In to Nuclear War command terminal.",
          version: "1",
          nonce: nonce,
          chainId: "mainnet",
          issuedAt: currentDateTime,
          resources: ["https://phantom.app/"]
        };
        
        await window.solana.signIn(input);
        const address = window.solana.publicKey.toString();
        
        const statusEl = document.getElementById('lobby-auth-status');
        if (statusEl) {
          statusEl.innerHTML = '✓ DATA LINK ESTABLISHED: ' + address.substring(0,4) + '...' + address.substring(address.length-4);
        }
        const authFlex = document.getElementById('auth-container-flex');
        if (authFlex) {
          authFlex.style.display = 'none';
        }
        window.pendingSolanaAddress = address;
        joinGlobalWar();
      } catch (err) {
        console.error("Phantom custom connect failed:", err);
        alert('Phantom Connection Failed or Rejected.');
        if (btn) btn.innerText = 'DIRECT PHANTOM';
      }
    } else {
      alert("Phantom extension not detected in browser.");
      if (btn) btn.innerText = 'DIRECT PHANTOM';
      window.open("https://phantom.app/", "_blank");
    }
  };

  // ------------------------------------------------------------------
  // MULTI-CHAIN LOGIN LOGIC
  // ------------------------------------------------------------------

  window.loginWithBNB = async function() {
    const btn = document.getElementById('btn-login-bnb');
    if (btn) btn.innerText = 'CONNECTING...';
    
    if (typeof window.ethereum !== 'undefined') {
      try {
        // Request BNB Smart Chain (Chain ID 56 / 0x38)
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x38' }], 
        });
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
           const address = accounts[0];
           const statusEl = document.getElementById('lobby-auth-status');
           if (statusEl) statusEl.innerHTML = '✓ BNB LINK ESTABLISHED: ' + address.substring(0,4) + '...' + address.substring(address.length-4);
           document.getElementById('auth-container-flex').style.display = 'none';
           window.pendingSolanaAddress = address; // Routing EVM address into primary auth state
           joinGlobalWar();
        }
      } catch (err) {
        console.error("BNB connect failed:", err);
        if (btn) btn.innerText = 'LOGIN BNB';
      }
    } else {
      alert("MetaMask (or EVM provider) not detected for BNB login.");
      if (btn) btn.innerText = 'LOGIN BNB';
    }
  };

  window.loginWithRonin = async function() {
    const btn = document.getElementById('btn-login-ronin');
    if (btn) btn.innerText = 'CONNECTING...';

    if (window.ronin && window.ronin.provider) {
      try {
        const accounts = await window.ronin.provider.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
           const address = accounts[0];
           const statusEl = document.getElementById('lobby-auth-status');
           if (statusEl) statusEl.innerHTML = '✓ RONIN LINK ESTABLISHED: ' + address.substring(0,4) + '...' + address.substring(address.length-4);
           document.getElementById('auth-container-flex').style.display = 'none';
           window.pendingSolanaAddress = address; 
           joinGlobalWar();
        }
      } catch (err) {
        console.error("Ronin connect failed:", err);
        if (btn) btn.innerText = 'LOGIN RONIN';
      }
    } else {
      alert("Ronin Wallet extension not detected.");
      if (btn) btn.innerText = 'LOGIN RONIN';
    }
  };

  window.loginWithPolkadot = async function() {
    const btn = document.getElementById('btn-login-polkadot');
    if (btn) btn.innerText = 'CONNECTING...';

    if (window.injectedWeb3 && window.injectedWeb3['polkadot-js']) {
      try {
        const extension = await window.injectedWeb3['polkadot-js'].enable('Dexmond Technologies');
        const accounts = await extension.accounts.get();
        if (accounts.length > 0) {
           const address = accounts[0].address;
           const statusEl = document.getElementById('lobby-auth-status');
           if (statusEl) statusEl.innerHTML = '✓ DOT LINK ESTABLISHED: ' + address.substring(0,4) + '...' + address.substring(address.length-4);
           document.getElementById('auth-container-flex').style.display = 'none';
           window.pendingSolanaAddress = address; 
           joinGlobalWar();
        }
      } catch (err) {
        console.error("Polkadot connect failed:", err);
        if (btn) btn.innerText = 'LOGIN POLKADOT';
      }
    } else {
      alert("Polkadot.js extension not detected.");
      if (btn) btn.innerText = 'LOGIN POLKADOT';
    }
  };

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

  function runTurn() {
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
        
        // ECONOMY RECOVERY LOGIC - Gemini recovers D3X stolen by Rainclaude
        if (GS.globalMetrics && GS.globalMetrics.globalEconomyD3X) {
            const recoveredAmount = 1000000 + (Math.random() * 99000000); // 1M to 100M recovered per attack
            GS.globalMetrics.globalEconomyD3X += recoveredAmount;
        }
    }
    
    if (GS.globalMetrics && GS.globalMetrics.globalEconomyD3X) {
        if (typeof syncState === 'function') syncState(); // Push new economy value to all players
        if (typeof updateDashboard === 'function') updateDashboard(); // Force UI update
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
        
        // ECONOMY BLEED LOGIC - Rainclaude forcibly siphons D3X from global supply
        if (GS.globalMetrics && GS.globalMetrics.globalEconomyD3X) {
            const stolenAmount = 5000000 + (Math.random() * 495000000); // 5M to 500M per attack
            GS.globalMetrics.globalEconomyD3X = Math.max(0, GS.globalMetrics.globalEconomyD3X - stolenAmount);
        }
    }
    
    if (GS.globalMetrics && GS.globalMetrics.globalEconomyD3X) {
        if (typeof syncState === 'function') syncState(); // Push new economy value to all players
        if (typeof updateDashboard === 'function') updateDashboard(); // Force UI update
    }
    
    if (typeof _sfxError !== 'undefined' && Math.random() < 0.3) _sfxError();
};

window.simulateCompanyD3XTrading = function() {
    if (window.currentSkinIndex !== 3) return; // Only process on Black Skin

    const groups = [window.companiesGroup, window.mediumCompaniesGroup, window.africaCompaniesGroup, window.microCompaniesGroup, window.russiaAsiaCompaniesGroup];
    const allCompanies = [];
    
    groups.forEach(group => {
        if (group && group.children) {
            allCompanies.push(...group.children.filter(mesh => mesh.visible && mesh.userData && mesh.userData.name));
        }
    });

    if (allCompanies.length < 2) return;

    // Pick 5 random transactions per interval
    for (let i = 0; i < 5; i++) {
        const sender = allCompanies[Math.floor(Math.random() * allCompanies.length)].userData;
        const receiver = allCompanies[Math.floor(Math.random() * allCompanies.length)].userData;
        
        if (sender.name === receiver.name) continue;
        
        // Ensure they have pseudo-wallets (Distributing ~123 Million D3X Global Economy)
        if (typeof sender.d3xBalance === 'undefined') {
            sender.d3xBalance = (sender.name === 'WORLD BANK') ? 12300000 : (200000 + Math.random() * 1800000);
        }
        if (typeof receiver.d3xBalance === 'undefined') {
            receiver.d3xBalance = (receiver.name === 'WORLD BANK') ? 12300000 : (200000 + Math.random() * 1800000);
        }
        
        const txAmount = parseFloat((Math.random() * (sender.d3xBalance * 0.05)).toFixed(2));
        if (txAmount <= 0) continue;
        
        sender.d3xBalance -= txAmount;
        receiver.d3xBalance += txAmount;
        
        // 10% chance to log to the terminal to show market velocity
        if (Math.random() < 0.1) {
            const termBox = document.getElementById('d1-reasoning');
            if (termBox) {
                const div = document.createElement('div');
                div.innerHTML = `> [NET] <span style="color:#0f0">${sender.name}</span> swapped <span style="color:#0f8">${txAmount.toFixed(2)} D3X</span> to <span style="color:#0f0">${receiver.name}</span>`;
                termBox.appendChild(div);
                if (termBox.childElementCount > 30) termBox.removeChild(termBox.firstChild);
                termBox.scrollTop = termBox.scrollHeight;
            }
        }
    }
};

// Hook it into the global loop
setInterval(window.simulateCompanyD3XTrading, 3000);

// =====================================================================
// GLOBAL D3X WALLET BALANCE POLLING (Every 60s)
// =====================================================================
setInterval(() => {
    if (typeof ws !== 'undefined' && ws && ws.readyState === 1 && window.pendingSolanaAddress) {
        ws.send(JSON.stringify({ type: 'get_my_d3x_balance', wallet: window.pendingSolanaAddress }));
    }
}, 60000);

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
    if (window.currentSkinIndex !== 3) return;
    SFX.playClick();
    document.getElementById('mining-cave-title').textContent = caveName.toUpperCase();
    document.getElementById('internal-mining-amount').textContent = window.internalD3XMiningAmount.toFixed(2);
    document.getElementById('mining-progress-bar').style.width = (window.internalD3XMiningAmount * 100) + '%';
    document.getElementById('mining-log').innerHTML = '<div style="opacity:0.7;">Cave accessed. Awaiting mining directive...</div>';
    document.getElementById('d3x-mining-modal').style.display = 'flex';
    
    // Sync mining state on modal open
    if (window.ws && window.ws.readyState === WebSocket.OPEN) {
        window.ws.send(JSON.stringify({ type: 'get_mining_state', callsign: window.myCallsign || window.PLAYER_NAME }));
    }
};

window.lastMiningTime = 0;
const MINING_COOLDOWN_MS = 15000; // 15 Seconds Cooldown

window.miningRemainingSeconds = 0;
window.miningInterval = null;

window.startOneHourMining = function() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    
    // Check if already mining
    if (window.miningRemainingSeconds > 0) return;

    if (typeof SFX !== 'undefined' && SFX.playLaser) SFX.playLaser(); // Drilling sound
    
    // Send request to server to start mining
    ws.send(JSON.stringify({
        type: 'start_mining',
        callsign: window.myCallsign || window.PLAYER_NAME
    }));

    // Optimistically start UI
    window.startMiningUI(3600); 
    
    const log = document.getElementById('mining-log');
    if (log) {
        log.innerHTML += `<div><span style="color:#0f8">Drill sequence initiated. Deep-core extraction will complete in 1 hour.</span></div>`;
        log.scrollTop = log.scrollHeight;
    }
};

window.startMiningUI = function(secondsRemaining) {
    if (window.miningInterval) clearInterval(window.miningInterval);
    
    window.miningRemainingSeconds = secondsRemaining;
    const btn = document.getElementById('btn-mine-d3x');
    const timerDisplay = document.getElementById('mining-timer-display');
    const progressBar = document.getElementById('mining-progress-bar');
    
    if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.innerHTML = 'MINING...';
    }

    window.miningInterval = setInterval(() => {
        window.miningRemainingSeconds--;
        
        if (window.miningRemainingSeconds <= 0) {
            clearInterval(window.miningInterval);
            window.miningRemainingSeconds = 0;
            if (timerDisplay) timerDisplay.innerText = "00:00:00";
            if (progressBar) progressBar.style.width = "100%";
        } else {
            if (timerDisplay) {
                const h = Math.floor(window.miningRemainingSeconds / 3600).toString().padStart(2, '0');
                const m = Math.floor((window.miningRemainingSeconds % 3600) / 60).toString().padStart(2, '0');
                const s = (window.miningRemainingSeconds % 60).toString().padStart(2, '0');
                timerDisplay.innerText = `${h}:${m}:${s}`;
            }
            if (progressBar) {
                const percentDone = ((3600 - window.miningRemainingSeconds) / 3600) * 100;
                progressBar.style.width = percentDone + "%";
            }
        }
    }, 1000);
};

// Also listen for mining syncs from backend (e.g. on rejoin)
window.syncMiningState = function(secondsLeft) {
    if (secondsLeft > 0) {
        window.startMiningUI(secondsLeft);
    } else {
        // Reset UI
        if (window.miningInterval) clearInterval(window.miningInterval);
        window.miningRemainingSeconds = 0;
        
        const btn = document.getElementById('btn-mine-d3x');
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.innerHTML = 'START MINING';
        }
        const timerDisplay = document.getElementById('mining-timer-display');
        if (timerDisplay) timerDisplay.innerText = "01:00:00";
        
        const progressBar = document.getElementById('mining-progress-bar');
        if (progressBar) progressBar.style.width = "0%";
    }
}

window.mineD3XCoin = function() {
    const log = document.getElementById('mining-log');
    
    // Check if player has enough D3X to mine
    if (window.localD3XBalance === undefined) window.localD3XBalance = 0;
    
    if (window.localD3XBalance < 1.0) {
        SFX.playError();
        log.innerHTML += `<div><span style="color:#f55">INSUFFICIENT FUNDS: Need 1.0 D3X to mine.</span></div>`;
        log.scrollTop = log.scrollHeight;
        return;
    }

    // Check Cooldown Timer
    const now = Date.now();
    const timeSinceLastMine = now - window.lastMiningTime;
    
    if (timeSinceLastMine < MINING_COOLDOWN_MS) {
        SFX.playError();
        const timeLeft = Math.ceil((MINING_COOLDOWN_MS - timeSinceLastMine) / 1000);
        log.innerHTML += `<div><span style="color:#f55">DRILL OVERHEATED: Cooling down. Please wait ${timeLeft}s...</span></div>`;
        log.scrollTop = log.scrollHeight;
        return;
    }
    
    // Pay the 1 D3X cost to mine
    window.localD3XBalance -= 1.0;
    if (typeof updateDashboard === 'function') updateDashboard();
    
    // Update top-right balance UI
    const balEl = document.getElementById('cwd-bal');
    if (balEl) {
        balEl.innerText = "| " + window.localD3XBalance.toLocaleString(undefined, { maximumFractionDigits: 1 }) + " D3X";
    }

    window.lastMiningTime = now;
    if (typeof SFX !== 'undefined' && SFX.playLaser) SFX.playLaser(); // Drilling sound
    window.internalD3XMiningAmount += 0.1; // 10% reward yield
    
    // -- MARKET IMPACT: Mining consumes Compute Hardware and Energy --
    let hardwareCost = 0;
    let energyCost = 0;
    if (window.greenMarket && window.greenMarket.commodities) {
        // Buy 10 units of Compute Hardware and 50 units of Energy from market
        const hwDef = window.greenMarket.commodities['Tech & Compute Hardware'];
        const enDef = window.greenMarket.commodities['Energy'];
        
        if (hwDef && hwDef.items && hwDef.items.length > 0) {
            // Pick a random hardware to consume
            const hwItem = hwDef.items[Math.floor(Math.random() * hwDef.items.length)];
            hardwareCost = hwItem.currentPrice * 2; // Consume 2 units
            // Market impact (Demand goes up)
            hwItem.currentPrice *= (1 + (Math.random() * 0.005)); 
        }
        
        if (enDef && enDef.items && enDef.items.length > 0) {
            // Pick a random energy to consume
            const enItem = enDef.items[Math.floor(Math.random() * enDef.items.length)];
            energyCost = enItem.currentPrice * 5; // Consume 5 units
            // Market impact (Demand goes up)
            enItem.currentPrice *= (1 + (Math.random() * 0.002));
        }
    }
    
    log.innerHTML += `<div><span style="color:#aaa">1.0 D3X Consumed.</span> Drill fired! Yielded <span style="color:#0f8">+0.10 D3X</span> progress.</div>`;
    if (hardwareCost > 0 || energyCost > 0) {
        log.innerHTML += `<div><span style="color:#88f; font-size:11px;">System load: Bought Hardware ($${hardwareCost.toLocaleString()}) & Energy ($${energyCost.toLocaleString()}) from Market.</span></div>`;
    }
    
    // Check if we hit 1.0 total
    if (window.internalD3XMiningAmount >= 0.99) { // Using 0.99 to avoid float precision bugs around 1.0
        window.internalD3XMiningAmount = 0.0;
        window.localD3XBalance += 1.0; // Payout 1 whole D3X
        
        if (typeof updateDashboard === 'function') updateDashboard();
        if (balEl) balEl.innerText = "| " + window.localD3XBalance.toLocaleString(undefined, { maximumFractionDigits: 1 }) + " D3X";

        if (typeof SFX !== 'undefined' && SFX.playSiren) SFX.playSiren(); // Payout sound
        log.innerHTML += `<div style="color:#ffcc00; font-weight:bold; font-size:14px; margin-top:10px;">💎 JACKPOT 💎<br/>1.0 D3X Deposited from Master Wallet!</div>`;
        if (typeof setLog === 'function') setLog("💎 D3X Mining Operation Successful! +1 D3X granted.");
    }
    
    // Update mining modal UI
    document.getElementById('internal-mining-amount').textContent = window.internalD3XMiningAmount.toFixed(2);
    document.getElementById('mining-progress-bar').style.width = (window.internalD3XMiningAmount * 100) + '%';
    log.scrollTop = log.scrollHeight;
    
    // Start Visual Cooldown Tick
    const btn = document.querySelector('#d3x-mining-modal button[onclick="mineD3XCoin()"]');
    if (btn) {
        const originalText = 'MINE DEPOSITS';
        btn.disabled = true;
        btn.style.opacity = '0.5';
        let cd = MINING_COOLDOWN_MS / 1000;
        
        btn.innerHTML = `RECHARGING (${cd}s)...`;
        
        const tick = setInterval(() => {
            cd--;
            if (cd <= 0) {
                clearInterval(tick);
                btn.innerHTML = originalText;
                btn.disabled = false;
                btn.style.opacity = '1.0';
            } else {
                btn.innerHTML = `RECHARGING (${cd}s)...`;
            }
        }, 1000);
    }
};