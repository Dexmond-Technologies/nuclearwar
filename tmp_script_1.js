// Auth container and Countdown timer are now globally synced to HTML load.
      // Google Sign-In script will auto-inject gracefully within the container bounds.
      
      window.openMarketLogs = function() {
        let logHtml = `<div id="market-override-modal" style="position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); width:600px; max-height:80vh; background:rgba(0,10,15,0.95); border:1px solid #0f8; box-shadow:0 0 20px rgba(0,255,136,0.3); z-index:999999; border-radius:8px; display:flex; flex-direction:column; font-family:'Share Tech Mono', monospace;">
          <div style="padding:15px; border-bottom:1px solid rgba(0,255,136,0.3); display:flex; justify-content:space-between; align-items:center;">
              <h3 style="margin:0; color:#0f8; font-size:18px; letter-spacing:2px;">🌍 GLOBAL AI MARKET TRADE LOGS</h3>
              <button onclick="document.getElementById('market-override-modal').remove();" style="background:none; border:none; color:#f00; font-size:20px; cursor:pointer; font-weight:bold;">&times;</button>
          </div>
          <div style="padding:15px; overflow-y:auto; flex:1;">`;
        
        if (!window.greenMarket || !window.greenMarket.tradeLogs || window.greenMarket.tradeLogs.length === 0) {
            logHtml += `<div style="color:#aaa; text-align:center; padding:20px;">No trades executed yet. Waiting for AI market agents...</div>`;
        } else {
            window.greenMarket.tradeLogs.slice().reverse().forEach(log => {
                logHtml += `<div style="margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:8px; font-size:13px; color:#ddd;">${log}</div>`;
            });
        }
        
        logHtml += `</div></div>`;
        
        const existing = document.getElementById('market-override-modal');
        if (existing) existing.remove();
        
        document.body.insertAdjacentHTML('beforeend', logHtml);
        setTimeout(() => { makeDraggable(document.getElementById('market-override-modal')); }, 50);
      };
      
      window.openAIWalletScreen = function(data) {
          const existing = document.getElementById('aiwallet-override-modal');
          if (existing) existing.remove();
          
          const gem = data.gemini || { balance:0, hp:0, portfolio:{ commodities:{} } };
          const cld = data.claude || { balance:0, hp:0, portfolio:{ commodities:{} } };
          
          const buildPossessions = (commodities) => {
              if(!commodities || Object.keys(commodities).length === 0) return `<div style="padding:10px; color:#555; text-align:center; font-style:italic;">No mapped possessions.</div>`;
              let h = '';
              for(const item in commodities) {
                  const shares = commodities[item].shares;
                  if (shares > 0) {
                      h += `<div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.1); padding:6px 0;">
                              <span>${item}</span><span style="font-weight:bold;">${shares.toLocaleString()} UNITS</span>
                            </div>`;
                  }
              }
              return h === '' ? `<div style="padding:10px; color:#555; text-align:center; font-style:italic;">No active resources held.</div>` : h;
          };
          
          let uiText = `
          <div id="aiwallet-override-modal" style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:#000; color:#fff; z-index:9999999; display:flex; flex-direction:row; font-family:'Share Tech Mono', monospace;">
              
              <!-- LEFT COLUMN: GEMINI -->
              <div style="flex:1; border-right:2px solid #555; padding:40px; background:radial-gradient(circle at top left, rgba(255,255,255,0.05), #000); overflow-y:auto; position:relative;">
                  <button onclick="document.getElementById('aiwallet-override-modal').remove();" style="position:absolute; top:20px; right:20px; background:none; border:none; color:#fff; font-size:30px; cursor:pointer;" title="Close">&times;</button>
                  <h1 style="color:#0af; margin:0 0 5px 0; font-size:42px; letter-spacing:4px; text-shadow:0 0 15px rgba(0,170,255,0.5);">GEMINI AI</h1>
                  <h3 style="color:#fff; margin:0 0 30px 0; font-size:16px;">AUTONOMOUS AGENT WALLET & ASSET MANIFEST</h3>
                  
                  <div style="font-size:24px; color:#fff; font-family:'Courier New', monospace; border-left:4px solid #fff; padding-left:15px; margin-bottom:20px;">
                      <div style="font-size:12px; color:#fff; letter-spacing:2px; margin-bottom:5px;">AVAILABLE D3X LIQUIDITY</div>
                      ${gem.balance.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})} D3X
                  </div>
                  
                  <div style="font-size:20px; color:#fff; font-family:'Courier New', monospace; border-left:4px solid #fff; padding-left:15px; margin-bottom:40px;">
                      <div style="font-size:12px; color:#fff; letter-spacing:2px; margin-bottom:5px;">DATABASE INTEGRITY (HP)</div>
                      ${gem.hp.toLocaleString()} / 10,000
                  </div>
                  
                  <h2 style="color:#fff; border-bottom:1px solid #fff; padding-bottom:5px;">POSSESSIONS & INVENTORY:</h2>
                  <div style="font-size:16px; color:#fff; background:rgba(255,255,255,0.05); padding:15px; border-radius:4px; border:1px solid rgba(255,255,255,0.2);">
                      ${buildPossessions(gem.portfolio.commodities)}
                  </div>
              </div>

              <!-- RIGHT COLUMN: RAINCLAUDE -->
              <div style="flex:1; padding:40px; background:radial-gradient(circle at top right, rgba(255,255,255,0.05), #000); overflow-y:auto; position:relative;">
                  <h1 style="color:#f33; margin:0 0 5px 0; font-size:42px; letter-spacing:4px; text-shadow:0 0 15px rgba(255,50,50,0.5);">RAINCLAUDE</h1>
                  <h3 style="color:#fff; margin:0 0 30px 0; font-size:16px;">AUTONOMOUS AGENT WALLET & ASSET MANIFEST</h3>
                  
                  <div style="font-size:24px; color:#fff; font-family:'Courier New', monospace; border-left:4px solid #fff; padding-left:15px; margin-bottom:20px;">
                      <div style="font-size:12px; color:#fff; letter-spacing:2px; margin-bottom:5px;">AVAILABLE D3X LIQUIDITY</div>
                      ${cld.balance.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})} D3X
                  </div>
                  
                  <div style="font-size:20px; color:#fff; font-family:'Courier New', monospace; border-left:4px solid #fff; padding-left:15px; margin-bottom:40px;">
                      <div style="font-size:12px; color:#fff; letter-spacing:2px; margin-bottom:5px;">DATABASE INTEGRITY (HP)</div>
                      ${cld.hp.toLocaleString()} / 10,000
                  </div>
                  
                  <h2 style="color:#fff; border-bottom:1px solid #fff; padding-bottom:5px;">POSSESSIONS & INVENTORY:</h2>
                  <div style="font-size:16px; color:#fff; background:rgba(255,255,255,0.05); padding:15px; border-radius:4px; border:1px solid rgba(255,255,255,0.2);">
                      ${buildPossessions(cld.portfolio.commodities)}
                  </div>
              </div>
              
          </div>`;
          document.body.insertAdjacentHTML('beforeend', uiText);
          setTimeout(() => { makeDraggable(document.getElementById('aiwallet-override-modal')); }, 50);
      };
    window.showGoogleWalletModal = function() {
    let existing = document.getElementById('google-wallet-modal');
    if (existing) existing.remove();

    const m = document.createElement('div');
    m.id = 'google-wallet-modal';
    m.style.position = 'fixed';
    m.style.top = '0'; m.style.left = '0';
    m.style.width = '100vw'; m.style.height = '100vh';
    m.style.background = 'rgba(0,0,0,0.85)';
    m.style.backdropFilter = 'blur(10px)';
    m.style.display = 'flex';
    m.style.justifyContent = 'center';
    m.style.alignItems = 'center';
    m.style.zIndex = '9999999';

    const box = document.createElement('div');
    box.style.background = '#0a0a0a';
    box.style.border = '2px solid #0f8';
    box.style.borderRadius = '8px';
    box.style.padding = '30px';
    box.style.width = '550px';
    box.style.maxWidth = '90vw';
    box.style.fontFamily = "'Share Tech Mono', monospace";
    box.style.color = '#fff';
    box.style.boxShadow = '0 0 30px rgba(0,255,136,0.2)';
    box.style.textAlign = 'center';

    const title = document.createElement('div');
    title.textContent = '🔒 SECURE WALLET GENERATED';
    title.style.color = '#0f8';
    title.style.fontSize = '24px';
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '20px';
    title.style.textShadow = '0 0 10px #0f8';

    const desc = document.createElement('div');
    desc.innerHTML = 'A unique Solana command wallet has been attached to your Google Profile.<br><span style="color:#fa0;">Please copy your Private Key below and store it securely. Do NOT share it with anyone!</span>';
    desc.style.fontSize = '14px';
    desc.style.lineHeight = '1.5';
    desc.style.marginBottom = '20px';
    desc.style.color = '#ccc';

    const pubContainer = document.createElement('div');
    pubContainer.style.background = '#111';
    pubContainer.style.border = '1px solid #444';
    pubContainer.style.padding = '15px';
    pubContainer.style.borderRadius = '4px';
    pubContainer.style.marginBottom = '15px';
    pubContainer.style.textAlign = 'left';
    pubContainer.innerHTML = `<div style="color:#0af; font-size:12px; margin-bottom:5px;">PUBLIC ADDRESS (Receive D3X):</div>
                              <div style="word-break:break-all; font-family:'Courier New', monospace; font-size:14px;">${window.mySolanaAddress || 'N/A'}</div>`;

    const privContainer = document.createElement('div');
    privContainer.style.background = 'rgba(255,50,50,0.1)';
    privContainer.style.border = '1px solid #f33';
    privContainer.style.padding = '15px';
    privContainer.style.borderRadius = '4px';
    privContainer.style.marginBottom = '25px';
    privContainer.style.textAlign = 'left';
    privContainer.innerHTML = `<div style="color:#f33; font-size:12px; margin-bottom:5px; font-weight:bold;">PRIVATE KEY (Hex - KEEP SECRET):</div>
                               <div id="gw-priv-key" style="word-break:break-all; font-family:'Courier New', monospace; font-size:13px; color:#aaa; filter:blur(4px); transition:0.3s; cursor:pointer;" title="Click to reveal">
                                 ${window.mySolanaPrivateKeyHex || 'N/A'}
                               </div>
                               <div style="font-size:11px; color:#f88; margin-top:5px; text-align:right;">(Click to reveal)</div>`;

    const btnClose = document.createElement('button');
    btnClose.textContent = 'I HAVE SAVED MY KEYS';
    btnClose.style.width = '100%';
    btnClose.style.padding = '15px';
    btnClose.style.background = '#0f8';
    btnClose.style.color = '#000';
    btnClose.style.border = 'none';
    btnClose.style.borderRadius = '4px';
    btnClose.style.fontFamily = "'Share Tech Mono', monospace";
    btnClose.style.fontSize = '18px';
    btnClose.style.fontWeight = 'bold';
    btnClose.style.cursor = 'pointer';
    btnClose.onclick = () => m.remove();

    box.appendChild(title);
    box.appendChild(desc);
    box.appendChild(pubContainer);
    box.appendChild(privContainer);
    box.appendChild(btnClose);
    m.appendChild(box);
    document.documentElement.appendChild(m);

    // blur toggle
    const pKeyNode = document.getElementById('gw-priv-key');
    if (pKeyNode) {
      pKeyNode.onclick = () => {
        if (pKeyNode.style.filter.includes('blur')) {
           pKeyNode.style.filter = 'none';
           pKeyNode.style.color = '#fff';
        } else {
           pKeyNode.style.filter = 'blur(4px)';
           pKeyNode.style.color = '#aaa';
        }
      };
    }
};