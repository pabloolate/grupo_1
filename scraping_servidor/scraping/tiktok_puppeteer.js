const puppeteer = require('puppeteer');
const path = require('path');
const { dormir, normalizarNumeroCompacto, log, logWarn } = require('../funciones_secundarias');

function resolverChromePath() {
  return String(process.env.CHROME_PATH || '').trim() || undefined;
}

function resolverHeadless() {
  return String(process.env.HEADLESS || 'false').trim().toLowerCase() === 'true';
}

async function capturarLinksTikTokConPuppeteer({ url, maxItems } = {}) {
  const browser = await puppeteer.launch({
    executablePath: resolverChromePath(),
    userDataDir: process.env.USER_DATA_DIR || path.join(process.cwd(), 'chrome_profile'),
    headless: resolverHeadless(),
    handleSIGINT: false,
    handleSIGTERM: false,
    handleSIGHUP: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-notifications',
    ],
  });

  const page = await browser.newPage();
  const links = [];

  try {
    await page.setViewport({ width: 1366, height: 900 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/147 Safari/537.36');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });
    await dormir(5000);

    const limite = Number(maxItems || process.env.MAX_ITEMS_TIKTOK || 5);
    let intentosSinNuevos = 0;

    while (links.length < limite && intentosSinNuevos < 5) {
      const antes = links.length;

      const capturados = await page.evaluate(() => {
        const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
        const out = [];
        const anchors = Array.from(document.querySelectorAll('a[href*="/video/"]'));
        for (const a of anchors) {
          const href = a.href || a.getAttribute('href') || '';
          if (!href || !href.includes('/video/')) continue;
          const cont = a.closest('[data-e2e="user-post-item"]') || a.parentElement || a;
          const viewsTxt = clean(
            cont?.querySelector('strong[data-e2e="video-views"]')?.innerText ||
            cont?.querySelector('strong.video-count')?.innerText ||
            cont?.querySelector('strong')?.innerText || ''
          );
          out.push({ link: href.split('?')[0], viewsRaw: viewsTxt });
        }
        return out;
      });

      for (const item of capturados) {
        const link = String(item.link || '').split('?')[0].replace(/\/+$/, '');
        if (!link || links.some((x) => x.link === link)) continue;
        links.push({ link, views: normalizarNumeroCompacto(item.viewsRaw) });
        log(`[TIKTOK][PUPPETEER] link=${link} views=${item.viewsRaw}`);
        if (links.length >= limite) break;
      }

      if (links.length === antes) intentosSinNuevos++;
      else intentosSinNuevos = 0;

      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 1.2)).catch(() => {});
      await dormir(1500);
    }

    return links.slice(0, limite);
  } catch (error) {
    logWarn(`[TIKTOK][PUPPETEER] Error capturando links: ${error.message}`);
    return links;
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

module.exports = {
  capturarLinksTikTokConPuppeteer,
};
