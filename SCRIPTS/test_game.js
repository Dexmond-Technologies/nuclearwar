const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', error => console.error('BROWSER ERROR:', error.message));
  
  await page.goto('http://localhost:8888/');
  
  await page.addScriptTag({ content: `
    const origSetLog = window.setLog;
    window.setLog = function(msg) {
      console.log("[SETLOG]", msg);
      if (origSetLog) origSetLog(msg);
    };
  `});

  await page.waitForTimeout(2000);
  
  console.log('Forcing joinGlobalWar()...');
  await page.evaluate(() => {
    if (typeof joinGlobalWar === 'function') {
      console.log('Calling joinGlobalWar()');
      joinGlobalWar();
    } else {
      console.error("joinGlobalWar not found");
    }
  });
  
  await page.waitForTimeout(25000); // Wait for game to initialize and AI to finish turn
  
  await browser.close();
})();
