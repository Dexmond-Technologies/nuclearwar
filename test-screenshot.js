const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto('http://localhost:4000/game.html', { waitUntil: 'networkidle0' });
  
  // Wait a bit for ThreeJS/Globe to render
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  await page.screenshot({ path: '/home/dexmond/.gemini/antigravity/brain/848fbc55-8e1d-45bc-bcca-0c938a55205e/troops_screenshot.png' });
  await browser.close();
})();
