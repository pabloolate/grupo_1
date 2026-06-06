'use strict';

require('dotenv').config();

const fs = require('fs');
const { spawn } = require('child_process');
const { chromium } = require('playwright');
const { formatearFechaTiktok } = require('../utils/formateador_fechas');

function normalizarTexto(valor) {
  return String(valor ?? '').replace(/\s+/g, ' ').trim();
}

function dormir(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function leerNumeroEnv(nombre, valorDefecto) {
  const numero = Number(process.env[nombre]);

  if (!Number.isFinite(numero)) {
    return valorDefecto;
  }

  return numero;
}

function parseNumeroCompacto(valor) {
  const texto = String(valor || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/,/g, '.');

  const match = texto.match(/([\d.]+)\s*([kmb])?/i);

  if (!match) {
    const numero = parseInt(texto.replace(/[^\d]/g, ''), 10);
    return Number.isFinite(numero) ? numero : 0;
  }

  let numero = parseFloat(match[1] || '0');
  const sufijo = String(match[2] || '').toLowerCase();

  if (sufijo === 'k') numero *= 1000;
  else if (sufijo === 'm') numero *= 1000000;
  else if (sufijo === 'b') numero *= 1000000000;

  return Number.isFinite(numero) ? Math.round(numero) : 0;
}

function resolverChromePath() {
  const desdeEnv = normalizarTexto(process.env.CHROME_PATH);

  if (desdeEnv && fs.existsSync(desdeEnv)) {
    return desdeEnv;
  }

  const candidatos = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];

  for (const candidato of candidatos) {
    if (fs.existsSync(candidato)) {
      return candidato;
    }
  }

  return desdeEnv || 'chrome';
}

function resolverUserDataDir() {
  const userDataDir = normalizarTexto(process.env.USER_DATA_DIR) || 'C:\\clone';

  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  return userDataDir;
}

function resolverPuertoDebug() {
  return leerNumeroEnv('PUERTO_DEBUG_CHROME', 9222);
}

async function puertoDebugDisponible(puerto) {
  try {
    const respuesta = await fetch(`http://127.0.0.1:${puerto}/json/version`);
    return respuesta.ok;
  } catch (_) {
    return false;
  }
}

function abrirChromeDebugVisible(urlInicial = 'about:blank') {
  const chromePath = resolverChromePath();
  const userDataDir = resolverUserDataDir();
  const puerto = resolverPuertoDebug();

  const args = [
    `--remote-debugging-port=${puerto}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-popup-blocking',
    '--disable-notifications',
    '--start-maximized',
    urlInicial,
  ];

  console.log(`[TIKTOK][PLAYWRIGHT] Abriendo Chrome visible CDP puerto=${puerto}`);
  console.log(`[TIKTOK][PLAYWRIGHT] Chrome=${chromePath}`);
  console.log(`[TIKTOK][PLAYWRIGHT] Perfil=${userDataDir}`);

  const proceso = spawn(chromePath, args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: false,
  });

  proceso.unref();

  return proceso;
}

async function asegurarChromeDebug(urlInicial = 'about:blank') {
  const puerto = resolverPuertoDebug();

  if (await puertoDebugDisponible(puerto)) {
    return;
  }

  abrirChromeDebugVisible(urlInicial);

  const intentos = leerNumeroEnv('CDP_INTENTOS_CONEXION', 30);
  const esperaMs = leerNumeroEnv('CDP_ESPERA_MS', 1000);

  for (let intento = 1; intento <= intentos; intento += 1) {
    if (await puertoDebugDisponible(puerto)) {
      console.log(`[TIKTOK][PLAYWRIGHT] CDP listo en puerto ${puerto}`);
      return;
    }

    await dormir(esperaMs);
  }

  throw new Error(`No pude levantar Chrome con remote-debugging-port=${puerto}`);
}

async function conectarPlaywrightCDP(urlInicial) {
  const puerto = resolverPuertoDebug();

  await asegurarChromeDebug(urlInicial);

  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${puerto}`);

  let context = browser.contexts()[0];

  if (!context) {
    context = await browser.newContext({
      viewport: null,
    });
  }

  let page = context.pages().find((pagina) => {
    const actual = pagina.url();
    return actual && actual !== 'about:blank';
  });

  if (!page) {
    page = context.pages()[0] || await context.newPage();
  }

  return {
    browser,
    context,
    page,
  };
}

async function extraerDataVideoTikTok(page) {
  let dataVideo = null;
  let ultimoError = null;

  for (let intento = 1; intento <= 3; intento += 1) {
    try {
      dataVideo = await page.evaluate(() => {
        const root = document;

        const texto = (el) => String(el?.textContent || '').replace(/\s+/g, ' ').trim();

        const normalizarNumero = (valor) => {
          const txt = String(valor || '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '')
            .replace(/,/g, '.');

          const match = txt.match(/([\d.]+)\s*([kmb])?/i);

          if (!match) {
            const numero = parseInt(txt.replace(/[^\d]/g, ''), 10);
            return Number.isFinite(numero) ? numero : 0;
          }

          let numero = parseFloat(match[1] || '0');
          const sufijo = String(match[2] || '').toLowerCase();

          if (sufijo === 'k') numero *= 1000;
          else if (sufijo === 'm') numero *= 1000000;
          else if (sufijo === 'b') numero *= 1000000000;

          return Number.isFinite(numero) ? Math.round(numero) : 0;
        };

        const extraerDescripcion = () => {
          const candidatos = [
            '[data-e2e="browse-video-desc"]',
            '[data-e2e="video-desc"]',
            'div[data-e2e="browse-video-desc"]',
            'h1[data-e2e="browse-video-desc"]',
          ];

          for (const selector of candidatos) {
            const el = root.querySelector(selector);
            const txt = texto(el);
            if (txt) return txt;
          }

          const metas = [
            'meta[property="og:description"]',
            'meta[name="description"]',
          ];

          for (const selector of metas) {
            const el = root.querySelector(selector);
            const txt = String(el?.getAttribute('content') || '').trim();
            if (txt) return txt;
          }

          return '';
        };

        const extraerLikesRaw = () => {
          const candidatos = [
            '[data-e2e="browse-like-count"]',
            '[data-e2e="like-count"]',
            '[data-e2e="video-like-count"]',
          ];

          for (const selector of candidatos) {
            const el = root.querySelector(selector);
            const txt = texto(el);
            if (txt) return txt;
          }

          return '0';
        };

        const extraerComentariosRaw = () => {
          const comentarioBtn =
            root.querySelector('button[data-e2e="browse-comment-icon"]') ||
            root.querySelector('button[data-e2e="comment-icon"]') ||
            root.querySelector('[data-e2e="comment-count"]')?.closest('button') ||
            null;

          const candidatos = [
            '[data-e2e="browse-comment-count"]',
            '[data-e2e="comment-count"]',
            '[data-e2e="video-comment-count"]',
          ];

          for (const selector of candidatos) {
            const el = root.querySelector(selector);
            const txt = texto(el);
            if (txt) {
              return {
                hay_boton_comentarios: !!comentarioBtn,
                comentarios_raw_ui: txt,
                comentarios_normalizados: normalizarNumero(txt),
              };
            }
          }

          return {
            hay_boton_comentarios: !!comentarioBtn,
            comentarios_raw_ui: '0',
            comentarios_normalizados: 0,
          };
        };

        const extraerFecha = () => {
          const fechaTime =
            root.querySelector('time') ||
            root.querySelector('[datetime]') ||
            null;

          if (fechaTime) {
            const raw = String(fechaTime.getAttribute('datetime') || fechaTime.textContent || '').trim();
            if (raw) return raw;
          }

          const meta =
            root.querySelector('meta[property="article:published_time"]') ||
            root.querySelector('meta[property="og:video:release_date"]');

          return String(meta?.getAttribute('content') || '').trim();
        };

        const extraerThumbnail = () => {
          const video = root.querySelector('video');

          if (video) {
            const poster = String(video.getAttribute('poster') || '').trim();
            if (poster) return poster;
          }

          const meta =
            root.querySelector('meta[property="og:image"]') ||
            root.querySelector('meta[name="twitter:image"]');

          const metaImg = String(meta?.getAttribute('content') || '').trim();
          if (metaImg) return metaImg;

          const img = root.querySelector('img');
          return String(img?.getAttribute('src') || '').trim();
        };

        const comentariosInfo = extraerComentariosRaw();

        return {
          link: root.querySelector('link[rel="canonical"]')?.getAttribute('href') || location.href,
          descripcion: extraerDescripcion(),
          likes_raw: extraerLikesRaw(),
          likes_normalizados: normalizarNumero(extraerLikesRaw()),
          fecha: extraerFecha(),
          thumbnail: extraerThumbnail(),
          comentarios_raw_ui: comentariosInfo.comentarios_raw_ui,
          comentarios_normalizados: comentariosInfo.comentarios_normalizados,
          hay_boton_comentarios: comentariosInfo.hay_boton_comentarios,
        };
      });

      if (dataVideo) {
        return dataVideo;
      }
    } catch (error) {
      ultimoError = error;
      console.warn(`[TIKTOK][PLAYWRIGHT] extraerDataVideo intento ${intento}/3 falló: ${error.message}`);
      try {
        await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      } catch (_) {}
      await dormir(1500);
    }
  }

  throw ultimoError || new Error('No se pudo extraer dataVideo de TikTok');
}

async function abrirPanelComentariosTikTok(page, totalComentariosDetectados) {
  if (totalComentariosDetectados <= 0) {
    return false;
  }

  try {
    await page.evaluate(() => {
      const boton =
        document.querySelector('button[data-e2e="browse-comment-icon"]') ||
        document.querySelector('button[data-e2e="comment-icon"]') ||
        document.querySelector('[data-e2e="comment-count"]')?.closest('button') ||
        null;

      if (boton) {
        boton.click();
        return true;
      }

      return false;
    });

    await dormir(1500);

    try {
      await page.waitForFunction(() => {
        return !!(
          document.querySelector('div[class*="DivCommentObjectWrapper"]') ||
          document.querySelector('div[class*="DivCommentListContainer"]') ||
          document.querySelector('[data-e2e="comment-level-1"]') ||
          document.querySelector('[data-e2e="comment-item"]') ||
          document.querySelector('[data-e2e="comment-text"]')
        );
      }, { timeout: leerNumeroEnv('TIKTOK_ESPERA_COMENTARIOS_TIMEOUT_MS', 12000) });

      return true;
    } catch (_) {}

    try {
      await page.keyboard.press('End');
      await dormir(1200);
      await page.keyboard.press('PageDown');
      await dormir(1200);

      return await page.evaluate(() => {
        return !!(
          document.querySelector('div[class*="DivCommentObjectWrapper"]') ||
          document.querySelector('div[class*="DivCommentListContainer"]') ||
          document.querySelector('[data-e2e="comment-level-1"]') ||
          document.querySelector('[data-e2e="comment-item"]') ||
          document.querySelector('[data-e2e="comment-text"]')
        );
      });
    } catch (_) {
      return false;
    }
  } catch (error) {
    console.warn(`[TIKTOK][PLAYWRIGHT] No pude abrir panel de comentarios: ${error.message}`);
    return false;
  }
}

async function scrollearPanelComentariosTikTok(page) {
  try {
    await page.evaluate(async () => {
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      const posiblesContenedores = [
        document.querySelector('div[class*="DivCommentListContainer"]'),
        document.querySelector('div[class*="DivCommentContainer"]'),
        document.querySelector('[data-e2e="comment-list"]'),
      ].filter(Boolean);

      const contenedor = posiblesContenedores[0] || document.scrollingElement || document.body;

      for (let i = 0; i < 6; i += 1) {
        try {
          contenedor.scrollTop = contenedor.scrollHeight;
        } catch (_) {}

        window.scrollBy(0, 800);
        await sleep(700);
      }
    });
  } catch (_) {}
}

async function extraerComentariosDesdePanelTikTok(page) {
  return await page.evaluate(() => {
    const limpiar = (valor) => String(valor || '').replace(/\s+/g, ' ').trim();

    const normalizarUsuarioTikTok = (valor) => {
      let texto = limpiar(valor);

      if (!texto) return '';

      texto = texto
        .replace(/^https?:\/\/(www\.)?tiktok\.com\//i, '')
        .replace(/^\/+/, '')
        .replace(/^@+/, '')
        .split(/[/?#]/)[0]
        .trim();

      if (!texto) return '';

      return texto.slice(0, 255);
    };

    const obtenerWrapperComentario = (nodo) => {
      if (!nodo) return null;

      return (
        nodo.closest?.('div[class*="DivCommentObjectWrapper"]') ||
        nodo.closest?.('div[class*="CommentItem"]') ||
        nodo.closest?.('[data-e2e="comment-item"]') ||
        nodo.closest?.('div[data-e2e="comment-list"] > div') ||
        nodo
      );
    };

    const obtenerUsuarioComentario = (wrapper) => {
      if (!wrapper) return '';

      const selectoresUsuario = [
        '[data-e2e^="comment-username"] a[href^="/@"]',
        '[data-e2e="comment-username-1"] a[href^="/@"]',
        'a[href^="/@"]',
      ];

      for (const selector of selectoresUsuario) {
        const enlace = wrapper.querySelector?.(selector);
        const href = limpiar(enlace?.getAttribute?.('href') || '');
        const texto = limpiar(enlace?.textContent || '');

        const desdeHref = normalizarUsuarioTikTok(href);
        if (desdeHref) return desdeHref;

        const desdeTexto = normalizarUsuarioTikTok(texto);
        if (desdeTexto) return desdeTexto;
      }

      const posibleUsuario = wrapper.querySelector?.('[data-e2e^="comment-username"]');
      const textoUsuario = limpiar(posibleUsuario?.textContent || '');

      return normalizarUsuarioTikTok(textoUsuario);
    };

    const obtenerTextoComentario = (wrapper, nodoOriginal) => {
      if (!wrapper) return '';

      const selectoresTexto = [
        '[data-e2e="comment-level-1"]',
        '[data-e2e="comment-text"]',
      ];

      for (const selector of selectoresTexto) {
        const nodo = wrapper.querySelector?.(selector);
        const texto = limpiar(nodo?.textContent || '');

        if (texto) return texto;
      }

      const textoDirecto = limpiar(nodoOriginal?.textContent || '');
      if (textoDirecto) return textoDirecto;

      const p = wrapper.querySelector?.('p');
      const textoP = limpiar(p?.textContent || '');
      if (textoP) return textoP;

      const span = wrapper.querySelector?.('span');
      const textoSpan = limpiar(span?.textContent || '');
      if (textoSpan) return textoSpan;

      return '';
    };

    const obtenerLikesComentario = (wrapper) => {
      if (!wrapper) return '0';

      return limpiar(
        wrapper.querySelector?.('[data-e2e="comment-like-count"]')?.textContent ||
        wrapper.querySelector?.('[class*="like-count"]')?.textContent ||
        wrapper.querySelector?.('strong')?.textContent ||
        '0'
      );
    };

    const obtenerRepliesComentario = (wrapper) => {
      if (!wrapper) return '0';

      return limpiar(
        wrapper.querySelector?.('[data-e2e="comment-reply-count"]')?.textContent ||
        wrapper.querySelector?.('[class*="reply"]')?.textContent ||
        '0'
      );
    };

    const obtenerFechaComentarioRaw = (wrapper) => {
      if (!wrapper) return '';

      const contenedoresMetadata = Array.from(wrapper.querySelectorAll('[class*="DivCommentSubContentWrapper"], [class*="DivCommentSubContentSplitWrapper"]'));

      for (const contenedor of contenedoresMetadata) {
        const spans = Array.from(contenedor.querySelectorAll('span'));

        for (const span of spans) {
          const texto = limpiar(span.textContent || '');
          if (!texto) continue;

          // TikTok: YYYY-M-D o M-D. El M-D se interpreta con el año actual fuera del DOM.
          if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(texto) || /^\d{1,2}-\d{1,2}$/.test(texto)) {
            return texto;
          }
        }
      }

      const spans = Array.from(wrapper.querySelectorAll('span'));
      for (const span of spans) {
        const texto = limpiar(span.textContent || '');
        if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(texto) || /^\d{1,2}-\d{1,2}$/.test(texto)) {
          return texto;
        }
      }

      return '';
    };

    const nodosBase = Array.from(
      document.querySelectorAll(
        [
          'div[class*="DivCommentObjectWrapper"]',
          'div[class*="CommentItem"]',
          '[data-e2e="comment-item"]',
          '[data-e2e="comment-level-1"]',
          '[data-e2e="comment-text"]',
          'div[data-e2e="comment-list"] [data-e2e="comment-text"]',
        ].join(', ')
      )
    );

    const wrappers = [];
    const wrappersVistos = new Set();

    for (const nodo of nodosBase) {
      const wrapper = obtenerWrapperComentario(nodo);
      if (!wrapper) continue;

      if (wrappersVistos.has(wrapper)) continue;
      wrappersVistos.add(wrapper);

      wrappers.push({
        wrapper,
        nodoOriginal: nodo,
      });
    }

    const salida = [];
    const vistos = new Set();

    for (const item of wrappers) {
      const wrapper = item.wrapper;
      const nodoOriginal = item.nodoOriginal;

      const usuarioComentario = obtenerUsuarioComentario(wrapper);
      const textoComentario = obtenerTextoComentario(wrapper, nodoOriginal);

      if (!textoComentario) continue;

      const claveDedup = `${usuarioComentario || 'sin_usuario'}::${textoComentario}`;
      if (vistos.has(claveDedup)) continue;

      vistos.add(claveDedup);

      const likesRaw = obtenerLikesComentario(wrapper);
      const repliesRaw = obtenerRepliesComentario(wrapper);
      const fechaComentarioRaw = obtenerFechaComentarioRaw(wrapper);

      const indice = salida.length + 1;

      salida.push({
        [`comentario_${indice}`]: textoComentario,
        [`usuario_comentario_${indice}`]: usuarioComentario || null,
        [`likes_${indice}`]: likesRaw,
        [`replies_${indice}`]: repliesRaw,
        [`fecha_comentario_raw_${indice}`]: fechaComentarioRaw || null,
      });
    }

    return salida;
  });
}

async function scrapearTikTokVideoConPlaywright(video = {}) {
  const link = normalizarTexto(video.link || video.url || video.url_publicacion);
  const views = video.views ?? video.vistas ?? 0;

  if (!link) {
    return {
      ...video,
      link: '',
      comentarios: [],
    };
  }

  let browser = null;

  try {
    const conexion = await conectarPlaywrightCDP(link);
    browser = conexion.browser;

    const page = conexion.page;

    console.log(`[TIKTOK][PLAYWRIGHT] Abriendo video visible: ${link}`);

    await page.goto(link, {
      waitUntil: 'domcontentloaded',
      timeout: leerNumeroEnv('TIKTOK_GOTO_TIMEOUT_MS', 60000),
    });

    try {
      await page.waitForLoadState('networkidle', { timeout: 15000 });
    } catch (_) {}

    await dormir(leerNumeroEnv('TIKTOK_ESPERA_INICIAL_MS', 2500));

    const dataVideo = await extraerDataVideoTikTok(page);

    const totalComentariosDetectados = Number.isFinite(Number(dataVideo.comentarios_normalizados))
      ? Number(dataVideo.comentarios_normalizados)
      : parseNumeroCompacto(dataVideo.comentarios_raw_ui);

    const panelComentariosAbierto = await abrirPanelComentariosTikTok(page, totalComentariosDetectados);

    if (panelComentariosAbierto) {
      await scrollearPanelComentariosTikTok(page);
    }

    const comentariosRaw = panelComentariosAbierto
      ? await extraerComentariosDesdePanelTikTok(page)
      : [];

    const comentarios = comentariosRaw.map((comentario, index) => {
      const id = String(index + 1);
      const fechaRaw = comentario[`fecha_comentario_raw_${id}`] || comentario.fecha_comentario_raw || '';
      const fechaComentario = formatearFechaTiktok(fechaRaw);

      return {
        ...comentario,
        [`fecha_comentario_${id}`]: fechaComentario,
      };
    });

    console.log(
      `[TIKTOK][PLAYWRIGHT] raw_ui=${totalComentariosDetectados} panel=${panelComentariosAbierto} comentarios=${comentarios.length} link=${link}`
    );

    return {
      ...video,
      plataforma: 'tiktok',
      tipo_publicacion: 'tiktok',
      link: normalizarTexto(dataVideo.link || link),
      url_publicacion: normalizarTexto(dataVideo.link || link),
      descripcion: normalizarTexto(dataVideo.descripcion),
      likes: Number(dataVideo.likes_normalizados || 0),
      fecha: normalizarTexto(dataVideo.fecha),
      hora: null,
      imagen_link: normalizarTexto(dataVideo.thumbnail),
      views: Number(views || 0),
      comentarios,
    };
  } catch (error) {
    console.warn(`[TIKTOK][PLAYWRIGHT] Falló ${link}: ${error.message}`);

    return {
      ...video,
      plataforma: 'tiktok',
      tipo_publicacion: 'tiktok',
      link,
      url_publicacion: link,
      views,
      comentarios: [],
      error_playwright: error.message,
    };
  } finally {
    try {
      if (browser) {
        await browser.close();
      }
    } catch (_) {}
  }
}

module.exports = {
  scrapearTikTokVideoConPlaywright,
  asegurarChromeDebug,
  abrirChromeDebugVisible,
};