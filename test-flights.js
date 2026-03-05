const puppeteer = require('puppeteer-core');
(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222' });
    const pages = await browser.pages();
    for (const page of pages) {
      if (page.url().includes('localhost:4000')) {
        await page.reload({waitUntil: 'networkidle2'});
        await new Promise(r => setTimeout(r, 4000));
        await page.screenshot({ path: '/home/dexmond/.gemini/antigravity/brain/b76dc772-93dc-4738-9db1-9dbb8da6d880/flights_test.png' });
        console.log("Screenshot saved.");
        
        const activeCount = await page.evaluate(() => {
           return typeof activeFlights !== 'undefined' ? activeFlights.length : -1;
        });
        console.log("Active flights:", activeCount);
      }
    }
    browser.disconnect();
  } catch(e) { console.error(e); }
})();
