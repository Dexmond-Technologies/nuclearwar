function buildAIPossessionsHTML(aiData, themeColor) {
        if(!aiData) return `<div style="padding:10px; color:#555; text-align:center; font-style:italic; font-family:'Courier New', monospace;">No mapped possessions.</div>`;
        let h = '';

        // Wallet Balance
        if (aiData.balance !== undefined) {
             h += `<div style="width:100%; text-align:center; margin-bottom:15px; font-family:'Courier New', monospace; font-size:20px; font-weight:bold; color:rgb(${themeColor}); text-shadow:0 0 10px rgba(${themeColor},0.8);">
                     D3X WALLET BALANCE: ${aiData.balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                   </div>`;
        }

        // Crypto
        let portfolio = aiData.portfolio;
        if (typeof portfolio === 'string') { try { portfolio = JSON.parse(portfolio); } catch(e){} }
        
        let commodities = portfolio ? portfolio.commodities : null;
        if (typeof commodities === 'string') { try { commodities = JSON.parse(commodities); } catch(e){} }
        
        if (commodities && Object.keys(commodities).length > 0) {
            h += `<div style="width:100%; font-family:'Share Tech Mono', monospace; font-size:16px; color:#fff; margin-top:10px; border-bottom:1px solid rgba(${themeColor},0.3); padding-bottom:5px; margin-bottom:10px;">CRYPTO PORTFOLIO</div>`;
            for(const item in commodities) {
                const amount = typeof commodities[item] === 'object' ? commodities[item].shares : commodities[item];
                if (amount > 0) {
                    h += `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(${themeColor},0.1); border:1px solid rgba(${themeColor},0.5); padding:10px 15px; border-radius:4px; width:300px; font-family:'Courier New', monospace; font-size:16px; margin-bottom:10px;">
                            <span style="color:#fff; text-transform:uppercase; letter-spacing:1px;">${item}</span>
                            <span style="font-weight:bold; color:rgb(${themeColor}); text-shadow:0 0 10px rgba(${themeColor},0.8);">${amount.toLocaleString(undefined, { maximumFractionDigits: 1 })} UNITS</span>
                          </div>`;
                }
            }
        }

        // Metals / Mining Inventory
        let mining = portfolio ? portfolio.mining_inventory : null;
        if (typeof mining === 'string') { try { mining = JSON.parse(mining); } catch(e){} }
        
        if (mining && Object.keys(mining).length > 0) {
            h += `<div style="width:100%; font-family:'Share Tech Mono', monospace; font-size:16px; color:#fff; margin-top:10px; border-bottom:1px solid rgba(${themeColor},0.3); padding-bottom:5px; margin-bottom:10px;">METALS / MINING</div>`;
            for(const item in mining) {
                if (mining[item] > 0) {
                    h += `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(${themeColor},0.1); border:1px solid rgba(${themeColor},0.5); padding:10px 15px; border-radius:4px; width:140px; font-family:'Courier New', monospace; font-size:14px; margin-bottom:10px;">
                            <span style="color:#ccc; text-transform:uppercase;">${item}</span>
                            <span style="font-weight:bold; color:rgb(${themeColor});">${mining[item].toLocaleString()}</span>
                          </div>`;
                }
            }
        }

        // Weapons
        let weapons = aiData.weapons;
        if (typeof weapons === 'string') { try { weapons = JSON.parse(weapons); } catch(e){} }
        
        if (weapons && Object.keys(weapons).length > 0) {
            h += `<div style="width:100%; font-family:'Share Tech Mono', monospace; font-size:16px; color:#fff; margin-top:10px; border-bottom:1px solid rgba(${themeColor},0.3); padding-bottom:5px; margin-bottom:10px;">WEAPON CACHE</div>`;
            for(const weapon in weapons) {
                if (weapons[weapon] > 0) {
                    h += `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(${themeColor},0.1); border:1px solid rgba(${themeColor},0.5); padding:10px 15px; border-radius:4px; width:200px; font-family:'Courier New', monospace; font-size:14px; margin-bottom:10px;">
                            <span style="color:#fff;">${weapon}</span>
                            <span style="color:rgb(${themeColor});">x${weapons[weapon]}</span>
                          </div>`;
                }
            }
        }

        return h === '' ? `<div style="padding:10px; color:#555; text-align:center; font-style:italic; font-family:'Courier New', monospace;">No active resources held.</div>` : h;
    }

    function openRainclaudeInventory() {
        if (typeof _sfxClick !== 'undefined') _sfxClick();
        if (typeof ws !== 'undefined' && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'get_ai_wallets' }));
        }
        const modal = document.getElementById('rainclaude-inventory-modal');
        const content = document.getElementById('rainclaude-inventory-content');
        
        let cldData = { portfolio: { commodities: {} } };
        if (window.gameState && window.gameState.claude && window.gameState.claude.portfolio) cldData = window.gameState.claude;
        
        content.innerHTML = buildAIPossessionsHTML(cldData, '255,50,50');
        modal.style.display = 'flex';
    }

    function openGeminiInventory() {
        if (typeof _sfxClick !== 'undefined') _sfxClick();
        if (typeof ws !== 'undefined' && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'get_ai_wallets' }));
        }
        const modal = document.getElementById('gemini-inventory-modal');
        const content = document.getElementById('gemini-inventory-content');
        
        let gemData = { portfolio: { commodities: {} } };
        if (window.gameState && window.gameState.gemini && window.gameState.gemini.portfolio) gemData = window.gameState.gemini;
        
        content.innerHTML = buildAIPossessionsHTML(gemData, '0,170,255');
        modal.style.display = 'flex';
    }