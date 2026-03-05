const puppeteer = require('puppeteer-core');
(async () => {
  try {
    const browserURL = 'http://localhost:9222';
    const browser = await puppeteer.connect({ browserURL });
    const pages = await browser.pages();
    for (const page of pages) {
      const url = page.url();
      if (url.includes('localhost:4000')) {
        console.log("Found page:", url);
        // We can't retroactively get logs unless we reload or scrape them if they are stored.
        // Let's reload and capture.
        page.on('console', msg => console.log('LOG:', msg.text()));
        page.on('pageerror', err => console.log('ERROR:', err.message));
        await page.reload({waitUntil: 'networkidle2'});
        
        // click to start audio context
        await page.mouse.click(100, 100);
        
        // evaluate audio state
        const sfxState = await page.evaluate(() => {
            if(window.SFX && window.SFX.ctx) {
                return window.SFX.ctx.state;
            }
            return "no_ctx";
        });
        console.log("SFX Context State:", sfxState);
        
        // click webcams
        await page.evaluate(() => {
           if(window.toggleGlobeSkin) window.toggleGlobeSkin();
        });
        
        const webcamCheck = await page.evaluate(() => {
           return {
               pointsLen: window.webcamsData ? window.webcamsData.length : -1,
               visible: window.intelGroups && window.intelGroups.webcams ? window.intelGroups.webcams.visible : false
           };
        });
        console.log("Webcam checks:", webcamCheck);
        
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    browser.disconnect();
  } catch (err) {
    console.error(err);
  }
})();
