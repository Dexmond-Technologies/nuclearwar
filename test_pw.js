const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    console.log("Navigating to game.html...");
    
    // Log all websocket messages received by the page
    page.on('websocket', ws => {
      ws.on('framereceived', frame => {
        try {
          const msg = JSON.parse(frame.payload);
          if (msg.type === 'ai_wallets_data') {
            console.log("PLAYWRIGHT CAUGHT WS MESSAGE: ai_wallets_data");
            // Don't print the whole msg if it's huge, just verify gemini exists
            console.log("msg.gemini exists?", !!msg.gemini);
            if (msg.gemini) {
                console.log("msg.gemini.portfolio exists?", !!msg.gemini.portfolio);
                if (msg.gemini.portfolio) {
                    console.log("msg.gemini.portfolio.commodities exists?", !!msg.gemini.portfolio.commodities);
                }
            }
          }
        } catch(e){}
      });
    });

    await page.goto('http://localhost:8888');
    console.log("Waiting for game to initialize...");
    await page.waitForTimeout(2000);
    
    console.log("Clicking Gemini Inventory...");
    await page.evaluate(() => {
       if (typeof window.openGeminiInventory === 'function') window.openGeminiInventory();
    });
    
    console.log("Waiting for modal to populate...");
    await page.waitForTimeout(2000); // Wait for WS response to be processed by game.html
    
    const html = await page.locator('#gemini-inventory-content').innerHTML();
    console.log("HTML RENDERED:", html.trim());
    
    const gs = await page.evaluate(() => {
        return window.gameState ? Object.keys(window.gameState) : 'undefined';
    });
    console.log("GAMESTATE KEYS:", gs);

    const geminiState = await page.evaluate(() => {
        return window.gameState && window.gameState.gemini ? Object.keys(window.gameState.gemini) : 'undefined';
    });
    console.log("GAMESTATE GEMINI KEYS:", geminiState);
    
    const geminiPort = await page.evaluate(() => {
        return window.gameState && window.gameState.gemini && window.gameState.gemini.portfolio ? Object.keys(window.gameState.gemini.portfolio) : 'undefined';
    });
    console.log("GAMESTATE GEMINI PORTFOLIO KEYS:", geminiPort);

  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
})();
