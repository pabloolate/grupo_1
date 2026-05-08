const { capturarLinksTikTokConPuppeteer } = require('./tiktok_puppeteer');
const { scrapearTikTokVideoConPlaywright } = require('./tiktok_playwright');
const { log, logWarn } = require('../funciones_secundarias');

async function scrapearTikTok({ url, maxItems } = {}) {
  const links = /\/video\//i.test(String(url || ''))
    ? [{ link: url, views: 0 }]
    : await capturarLinksTikTokConPuppeteer({ url, maxItems });

  const data_hijos = [];

  for (const item of links) {
    const post = await scrapearTikTokVideoConPlaywright({ link: item.link, views: item.views });
    if (post && Array.isArray(post.comentarios) && post.comentarios.length) {
      data_hijos.push(post);
      log(`[TIKTOK] OK ${data_hijos.length}: ${post.link}`);
    } else {
      logWarn(`[TIKTOK] omitido sin comentarios: ${item.link}`);
    }
  }

  return { domain: 'www.tiktok.com', data_hijos };
}

module.exports = {
  scrapearTikTok,
};
