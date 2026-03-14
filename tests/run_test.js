const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    await page.goto('http://localhost:8888');
    await page.waitForTimeout(4000);
    await page.evaluate(() => {
        if(window.toggleRedSkin) window.toggleRedSkin();
    });
    await page.waitForTimeout(2000);
    await browser.close();
})();
