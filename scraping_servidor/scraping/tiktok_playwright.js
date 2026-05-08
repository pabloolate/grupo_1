const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const {
  dormir,
  killChromeProcesses,
  normalizarTexto,
  normalizarNumeroCompacto,
  formateaFecha2,
  hashSha256,
  asegurarDirectorio,
  log,
  logWarn,
} = require('../funciones_secundarias');

function normalizarUrlComparacion(u) {
  return String(u || '').split('?')[0].replace(/\/+$/, '').trim();
}

function lanzarChromeTikTok({ cleanLink }) {
  const esLinux = String(process.env.ENTORNO || 'windows').trim().toLowerCase() === 'linux';
  const chromePath = String(process.env.CHROME_PATH || '').trim();
  const puerto = String(process.env.PUERTO_DEBUG_CHROME || '9222').trim();
  const userDataDir = String(process.env.USER_DATA_DIR || path.join(process.cwd(), 'chrome_profile')).trim();
  const plantilla = String(esLinux ? process.env.COMANDO_CHROME_LINUX_TEMPLATE || '' : process.env.COMANDO_CHROME_WINDOWS_TEMPLATE || '').trim();

  const comando = plantilla
    ? plantilla
        .replaceAll('{CHROME_PATH}', chromePath)
        .replaceAll('{PUERTO_DEBUG_CHROME}', puerto)
        .replaceAll('{USER_DATA_DIR}', userDataDir)
        .replaceAll('{CLEAN_LINK}', cleanLink)
    : `"${chromePath}" --remote-debugging-port=${puerto} --user-data-dir="${userDataDir}" --new-window "${cleanLink}"`;

  const child = spawn(comando, {
    shell: true,
    detached: true,
    stdio: 'ignore',
    ...(esLinux ? {} : { windowsHide: true }),
  });
  child.unref();
}

async function conectarCdpConReintentos({ intentos = 25, esperaMs = 1000 } = {}) {
  const puerto = String(process.env.PUERTO_DEBUG_CHROME || '9222').trim();
  const urlCdp = `http://127.0.0.1:${puerto}`;
  let ultimoError = null;

  for (let i = 0; i < intentos; i++) {
    try {
      return await chromium.connectOverCDP(urlCdp);
    } catch (error) {
      ultimoError = error;
      await dormir(esperaMs);
    }
  }

  throw ultimoError || new Error(`No se pudo conectar a CDP ${urlCdp}`);
}

async function obtenerPaginaTikTokActiva(browserCdp, cleanLink) {
  const objetivo = normalizarUrlComparacion(cleanLink);

  for (let ronda = 0; ronda < 20; ronda++) {
    for (const context of browserCdp.contexts()) {
      const paginas = context.pages();
      let page = paginas.find((p) => normalizarUrlComparacion(p.url()) === objetivo);
      if (page) return page;
      page = paginas.find((p) => String(p.url() || '').includes('tiktok.com') && String(p.url() || '').includes('/video/'));
      if (page) return page;
      page = [...paginas].reverse().find((p) => String(p.url() || '').includes('tiktok.com'));
      if (page) return page;
    }
    await dormir(800);
  }

  throw new Error(`No se encontró página TikTok activa para ${cleanLink}`);
}

async function capturarImagenTikTok(page, cleanLink) {
  try {
    const base = process.env.DIR_IMAGENES || path.join(process.cwd(), 'imagenes');
    const carpeta = asegurarDirectorio(path.join(base, 'tiktok', 'capturas'));
    const ruta = path.join(carpeta, `${hashSha256(cleanLink).slice(0, 24)}.png`);
    await page.screenshot({ path: ruta, fullPage: false }).catch(() => null);
    return ruta;
  } catch {
    return null;
  }
}

async function scrapeTikTokComentariosEnPagina(page, cleanLink, viewsItem = 0) {
  await page.bringToFront().catch(() => {});
  await page.waitForLoadState('domcontentloaded', { timeout: 60000 }).catch(() => {});
  await dormir(2500);

  // Intento abrir panel o asegurar carga de comentarios.
  try {
    await page.mouse.wheel(0, 700);
    await dormir(1000);
  } catch {}

  const payload = await page.evaluate(() => {
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

    const descripcion = clean(
      document.querySelector('[data-e2e="browse-video-desc"]')?.innerText ||
      document.querySelector('[data-e2e="video-desc"]')?.innerText ||
      document.querySelector('h1[data-e2e="browse-video-desc"]')?.innerText ||
      document.querySelector('meta[property="og:description"]')?.content ||
      ''
    );

    const fechaRaw = clean(
      document.querySelector('[data-e2e="browser-nickname"] span:last-child')?.innerText ||
      document.querySelector('span[data-e2e="browser-nickname"]')?.innerText ||
      ''
    );

    const likes = parseNum(
      document.querySelector('[data-e2e="like-count"]')?.innerText ||
      document.querySelector('strong[data-e2e="like-count"]')?.innerText ||
      ''
    );

    const imagen =
      document.querySelector('meta[property="og:image"]')?.content ||
      document.querySelector('video')?.poster ||
      '';

    const comentarios = [];
    const vistos = new Set();
    const nodos = Array.from(document.querySelectorAll(
      '[data-e2e="comment-level-1"], [data-e2e="comment-item"], div[class*="DivCommentItemContainer"], div[class*="CommentItem"]'
    ));

    let idx = 1;
    for (const nodo of nodos) {
      const texto = clean(
        nodo.querySelector('[data-e2e="comment-level-1-text"]')?.innerText ||
        nodo.querySelector('p[data-e2e="comment-level-1-text"]')?.innerText ||
        nodo.querySelector('span[data-e2e="comment-level-1-text"]')?.innerText ||
        nodo.querySelector('p')?.innerText ||
        ''
      );
      if (!texto || texto.length < 2 || vistos.has(texto)) continue;
      vistos.add(texto);

      const likesComentario = parseNum(
        nodo.querySelector('[data-e2e="comment-like-count"]')?.innerText ||
        nodo.querySelector('span[class*="SpanCount"]')?.innerText ||
        ''
      );

      const replies = parseNum(
        nodo.querySelector('[data-e2e="view-more-1"]')?.innerText ||
        nodo.innerText?.match(/View (\d+) repl/i)?.[1] ||
        0
      );

      comentarios.push({ [`comentario_${idx}`]: texto, [`likes_${idx}`]: likesComentario, [`replies_${idx}`]: replies });
      idx++;
    }

    return { descripcion, fechaRaw, likes, imagen, comentarios };
  });

  if (!payload || !Array.isArray(payload.comentarios) || !payload.comentarios.length) return null;

  const rutaCaptura = await capturarImagenTikTok(page, cleanLink);

  return {
    plataforma: 'tiktok',
    tipo_publicacion: 'tiktok',
    link: normalizarUrlComparacion(cleanLink),
    descripcion: normalizarTexto(payload.descripcion || ''),
    fecha: formateaFecha2(payload.fechaRaw),
    hora: null,
    likes: Number(payload.likes || 0),
    views: Number(viewsItem || 0),
    imagen: payload.imagen || '',
    ruta_imagen_local: rutaCaptura,
    comentarios: payload.comentarios,
  };
}

async function scrapearTikTokVideoConPlaywright({ link, views = 0 } = {}) {
  const cleanLink = normalizarUrlComparacion(link);
  let browser = null;
  let page = null;

  try {
    await killChromeProcesses();
    lanzarChromeTikTok({ cleanLink });
    await dormir(4000);
    browser = await conectarCdpConReintentos();
    page = await obtenerPaginaTikTokActiva(browser, cleanLink);
    return await scrapeTikTokComentariosEnPagina(page, cleanLink, views);
  } catch (error) {
    logWarn(`[TIKTOK][PLAYWRIGHT] Falló ${cleanLink}: ${error.message}`);
    return null;
  } finally {
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    await killChromeProcesses();
  }
}

module.exports = {
  scrapearTikTokVideoConPlaywright,
};
