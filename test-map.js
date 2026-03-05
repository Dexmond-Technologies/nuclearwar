const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
  
  await page.goto('http://localhost:8080');
  await page.waitForTimeout(2000);
  
  const hasMap = await page.evaluate(() => !!window.DeckGLMap);
  console.log('window.DeckGLMap exists:', hasMap);
  
  await browser.close();
})();
