const puppeteer = require('puppeteer-core');
(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222' });
    const pages = await browser.pages();
    for (const page of pages) {
      if (page.url().includes('localhost:4000')) {
        console.log("Attached to", page.url());
        
        // Execute some JS to get global errors
        const errors = await page.evaluate(() => {
           return window.webcamsData ? window.webcamsData.length : 'webcamsData undefined';
        });
        console.log("Webcams Data state:", errors);
        
        // Let's reload and capture console
        page.on('console', msg => console.log('LOG:', msg.text()));
        page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
        
        await page.reload({waitUntil: 'networkidle2'});
        
        await page.evaluate(() => {
           if(document.getElementById('btn-skin-toggle')) {
               document.getElementById('btn-skin-toggle').click();
           }
        });
        
        await new Promise(r => setTimeout(r, 2000));
        
        const endState = await page.evaluate(() => {
           return window.webcamsData ? window.webcamsData.length : -1;
        });
        console.log("Webcams Data state after load:", endState);
      }
    }
    browser.disconnect();
  } catch(e) { console.error(e); }
})();
