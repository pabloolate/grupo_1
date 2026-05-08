const puppeteer = require('puppeteer');
const path = require('path');
const {
  dormir,
  normalizarTexto,
  normalizarNumeroCompacto,
  formateaFecha,
  hashSha256,
  asegurarDirectorio,
  log,
  logWarn,
} = require('../funciones_secundarias');

function resolverChromePath() {
  return String(process.env.CHROME_PATH || '').trim() || undefined;
}

function resolverHeadless() {
  return String(process.env.HEADLESS || 'false').trim().toLowerCase() === 'true';
}

function canonicalIgUrl(rawUrl) {
  try {
    const u = new URL(String(rawUrl || ''), 'https://www.instagram.com');
    return `${u.origin}${u.pathname}`.replace(/\/+$/, '/') || String(rawUrl || '');
  } catch {
    return String(rawUrl || '').split('?')[0].replace(/\/+$/, '/');
  }
}

function esReelUrl(url) {
  const s = String(url || '').toLowerCase();
  return s.includes('/reels') || s.includes('/reel/');
}

function buildParentReelsUrlFromAny(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const partes = url.pathname.split('/').filter(Boolean);
    const usuario = partes[0];
    if (!usuario) return 'https://www.instagram.com/';
    return `https://www.instagram.com/${usuario}/reels/`;
  } catch {
    return String(rawUrl || '');
  }
}

async function lanzarInstagramBrowser() {
  return puppeteer.launch({
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
}

async function configurarPagina(page) {
  await page.setViewport({ width: 1366, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36');
}

async function cerrarPopupsBasicos(page) {
  const textos = ['Not Now', 'Ahora no', 'Más tarde', 'Allow all cookies', 'Permitir todas las cookies'];
  for (const texto of textos) {
    try {
      const botones = await page.$$('button');
      for (const boton of botones) {
        const t = await boton.evaluate((el) => (el.innerText || el.textContent || '').trim()).catch(() => '');
        if (t.toLowerCase() === texto.toLowerCase()) {
          await boton.click().catch(() => {});
          await dormir(500);
        }
      }
    } catch {}
  }
}

async function openFirstGridPostHuman(page, modo = 'posts') {
  const selectors = modo === 'reels'
    ? ['a[href*="/reel/"]', 'a[href*="/p/"]']
    : ['a[href*="/p/"]', 'a[href*="/reel/"]'];

  for (const selector of selectors) {
    try {
      await page.waitForSelector(selector, { timeout: 15000 });
      const cards = await page.$$(selector);
      if (!cards.length) continue;
      await cards[0].click({ delay: 80 });
      await dormir(2500);
      return true;
    } catch {}
  }

  return false;
}

async function getBtnNext(page) {
  const handle = await page.evaluateHandle(() => {
    const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const candidatos = Array.from(document.querySelectorAll('button, div[role="button"], svg[aria-label], [aria-label]'));

    for (const el of candidatos) {
      const label = clean(el.getAttribute?.('aria-label') || el.innerText || el.textContent || '');
      if (['next', 'siguiente'].includes(label) || label.includes('next') || label.includes('siguiente')) {
        return el.closest('button, div[role="button"]') || el;
      }
    }
    return null;
  });
  const element = handle.asElement();
  return element || null;
}

async function extractActivePostLink(page) {
  try {
    const url = page.url();
    if (/instagram\.com\/(p|reel)\//i.test(url)) return canonicalIgUrl(url);
  } catch {}

  try {
    const href = await page.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"]') || document;
      const a = Array.from(dialog.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]'))
        .find((x) => /\/(p|reel)\//.test(x.getAttribute('href') || ''));
      return a ? a.href : '';
    });
    if (href) return canonicalIgUrl(href);
  } catch {}

  return null;
}

async function modalFingerprint(page) {
  try {
    return await page.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"]') || document;
      return String(dialog.innerText || dialog.textContent || '').slice(0, 500);
    });
  } catch {
    return '';
  }
}

async function waitModalOrLinkChange(page, prevLink, prevFp, timeoutMs = 12000) {
  const inicio = Date.now();
  while (Date.now() - inicio < timeoutMs) {
    const link = await extractActivePostLink(page).catch(() => null);
    const fp = await modalFingerprint(page).catch(() => '');
    if ((link && link !== prevLink) || (fp && fp !== prevFp)) return true;
    await dormir(250);
  }
  return false;
}

async function capturarImagenLocal(page, postLink, tipoPublicacion) {
  try {
    const dirBase = process.env.DIR_IMAGENES || path.join(process.cwd(), 'imagenes');
    const sub = tipoPublicacion === 'instagram_reel' ? 'instagram_reels' : 'instagram_posts';
    const carpeta = asegurarDirectorio(path.join(dirBase, sub, 'capturas'));
    const ruta = path.join(carpeta, `${hashSha256(postLink).slice(0, 24)}.png`);
    const dialog = await page.$('div[role="dialog"]');
    if (dialog) {
      await dialog.screenshot({ path: ruta }).catch(() => null);
      return ruta;
    }
    await page.screenshot({ path: ruta, fullPage: false }).catch(() => null);
    return ruta;
  } catch {
    return null;
  }
}

async function scrapeCurrentPost(page, postLinkRaw, tipoPublicacion) {
  const postLink = canonicalIgUrl(postLinkRaw || await extractActivePostLink(page));
  if (!postLink) return null;

  const payload = await page.evaluate(() => {
    const dialog = document.querySelector('div[role="dialog"]') || document;
    const clean = (s) => String(s || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
    const parseNum = (txt) => {
      const t = clean(txt).toLowerCase().replace(/,/g, '.');
      const m = t.match(/(\d+(?:\.\d+)?)(\s*[kmb])?/i);
      if (!m) {
        const n = parseInt(t.replace(/[^\d]/g, ''), 10);
        return Number.isFinite(n) ? n : 0;
      }
      let n = parseFloat(m[1] || '0') || 0;
      const s = String(m[2] || '').trim().toLowerCase();
      if (s === 'k') n *= 1000;
      if (s === 'm') n *= 1000000;
      if (s === 'b') n *= 1000000000;
      return Math.round(n);
    };
    const basura = (t) => {
      const x = clean(t).toLowerCase();
      if (!x || x.length < 2) return true;
      if (['like', 'likes', 'reply', 'replies', 'follow', 'following', 'see translation', 'ver traducción'].includes(x)) return true;
      if (/^view all \d+ comments/.test(x) || /^ver los \d+ comentarios/.test(x)) return true;
      if (/^\d+\s*(likes?|me gusta)$/.test(x)) return true;
      return false;
    };

    const obtenerDescripcion = () => {
      const candidatos = [];
      for (const el of Array.from(dialog.querySelectorAll('h1, span._ap3a, article span, div.xt0psk2, header, section'))) {
        const txt = clean(el.innerText || el.textContent);
        if (!basura(txt) && txt.length >= 3) candidatos.push(txt);
      }
      return candidatos.find((x) => x.length >= 3 && !/^(liked by|le gustó a)/i.test(x)) || 'Sin descripción';
    };

    const obtenerLikes = () => {
      const candidatos = Array.from(dialog.querySelectorAll('[aria-label], button, span, a, div'));
      for (const el of candidatos) {
        const mezcla = clean(`${el.getAttribute?.('aria-label') || ''} ${el.innerText || el.textContent || ''}`);
        if (!/\b(like|likes|me gusta)\b/i.test(mezcla)) continue;
        if (!/\d/.test(mezcla)) continue;
        const n = parseNum(mezcla);
        if (n > 0) return n;
      }
      return 0;
    };

    const time = dialog.querySelector('time') || document.querySelector('time');
    const fechaRaw = clean(time?.getAttribute('datetime') || time?.getAttribute('title') || time?.innerText || '');
    const imagen = dialog.querySelector('img[src*="cdninstagram"], img[srcset], article img')?.src || '';

    const comentarios = [];
    const vistos = new Set();
    const bloques = Array.from(dialog.querySelectorAll('ul li, article ul li, div[role="dialog"] ul li, div._a9zr'));
    let idx = 1;
    for (const li of bloques) {
      const txtCompleto = clean(li.innerText || li.textContent || '');
      if (!txtCompleto || txtCompleto.length < 2) continue;
      if (basura(txtCompleto)) continue;

      let texto = txtCompleto
        .replace(/^\S+\s+/, '')
        .replace(/\b(Reply|Responder|See translation|Ver traducción)\b.*$/i, '')
        .replace(/\b\d+\s*(likes?|me gusta)\b/ig, '')
        .trim();

      if (!texto || texto.length < 2) continue;
      if (vistos.has(texto)) continue;
      vistos.add(texto);

      const likesTxt = clean(li.querySelector('[aria-label*="like" i], button, span')?.getAttribute?.('aria-label') || '');
      const likes = parseNum(likesTxt);
      comentarios.push({ [`comentario_${idx}`]: texto, [`likes_${idx}`]: likes, [`replies_${idx}`]: 0 });
      idx++;
    }

    return {
      descripcion: obtenerDescripcion(),
      likes: obtenerLikes(),
      fecha_raw: fechaRaw,
      imagen,
      comentarios,
    };
  });

  if (!payload || !Array.isArray(payload.comentarios) || !payload.comentarios.length) {
    return null;
  }

  const fecha = payload.fecha_raw ? formateaFecha(payload.fecha_raw, postLink) : null;
  const rutaCaptura = await capturarImagenLocal(page, postLink, tipoPublicacion);

  return {
    plataforma: 'instagram',
    tipo_publicacion: tipoPublicacion,
    link: postLink,
    descripcion: normalizarTexto(payload.descripcion || ''),
    fecha,
    hora: null,
    likes: Number(payload.likes || 0),
    views: 0,
    imagen: payload.imagen || '',
    ruta_imagen_local: rutaCaptura,
    comentarios: payload.comentarios,
  };
}

async function scrapearInstagram({ url, tipo = 'instagram_post', maxItems } = {}) {
  const browser = await lanzarInstagramBrowser();
  const page = await browser.newPage();
  const data_hijos = [];

  try {
    await configurarPagina(page);

    let urlEntrada = url;
    if (tipo === 'instagram_reel' && !/\/reels\/?$/i.test(url) && !/\/reel\//i.test(url)) {
      urlEntrada = buildParentReelsUrlFromAny(url);
    }

    log(`[IG] Abriendo ${urlEntrada}`);
    await page.goto(urlEntrada, { waitUntil: 'networkidle2', timeout: 120000 });
    await dormir(3500);
    await cerrarPopupsBasicos(page);

    if (/\/p\/|\/reel\//i.test(urlEntrada)) {
      const post = await scrapeCurrentPost(page, urlEntrada, tipo);
      if (post) data_hijos.push(post);
      return { domain: 'www.instagram.com', data_hijos };
    }

    const abierto = await openFirstGridPostHuman(page, tipo === 'instagram_reel' ? 'reels' : 'posts');
    if (!abierto) return { domain: 'www.instagram.com', data_hijos };

    const limite = Number(maxItems || (tipo === 'instagram_reel' ? process.env.MAX_ITEMS_INSTAGRAM_REELS : process.env.MAX_ITEMS_INSTAGRAM_POSTS) || 20);
    const visitados = new Set();

    for (let i = 0; i < limite; i++) {
      await dormir(1000);
      const link = await extractActivePostLink(page);
      if (link && !visitados.has(link)) {
        visitados.add(link);
        const post = await scrapeCurrentPost(page, link, tipo);
        if (post) {
          data_hijos.push(post);
          log(`[IG] ${tipo} OK ${data_hijos.length}: ${link}`);
        } else {
          logWarn(`[IG] ${tipo} omitido sin comentarios: ${link}`);
        }
      }

      const prevLink = link;
      const prevFp = await modalFingerprint(page);
      const next = await getBtnNext(page);
      if (!next) break;
      await next.click({ delay: 80 }).catch(() => page.keyboard.press('ArrowRight'));
      const cambio = await waitModalOrLinkChange(page, prevLink, prevFp, 10000);
      if (!cambio) break;
    }

    return { domain: 'www.instagram.com', data_hijos };
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

module.exports = {
  scrapearInstagram,
  scrapearInstagramPosts: (args) => scrapearInstagram({ ...args, tipo: 'instagram_post' }),
  scrapearInstagramReels: (args) => scrapearInstagram({ ...args, tipo: 'instagram_reel' }),
};
