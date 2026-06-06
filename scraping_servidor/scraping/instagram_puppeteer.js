const puppeteer = require('puppeteer');
const fs = require('fs');
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
const { formatearFechaInstagram } = require('../utils/formateador_fechas');

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
  const selector = modo === 'reels' ? 'a[href*="/reel/"]' : 'a[href*="/p/"]';

  await page.waitForSelector(selector, { timeout: 15000 });

  const cards = await page.$$(selector);
  if (!cards.length) {
    throw new Error(`[IG][DOM] No se encontraron tarjetas estrictas para modo=${modo} selector=${selector}`);
  }

  await cards[0].click({ delay: 80 });
  await dormir(2500);

  return true;
}

function validarLinkPorTipoPublicacion(link, tipoPublicacion) {
  const url = String(link || '').toLowerCase();

  if (tipoPublicacion === 'instagram_reel') {
    return url.includes('/reel/');
  }

  if (tipoPublicacion === 'instagram_post') {
    return url.includes('/p/');
  }

  return false;
}

function nombreArchivoDebugInstagram(tipoPublicacion, postLink) {
  const hash = hashSha256(`${tipoPublicacion || 'ig'}::${postLink || Date.now()}`).slice(0, 16);
  const marcaTiempo = new Date().toISOString().replace(/[:.]/g, '-');
  return `${marcaTiempo}_${tipoPublicacion || 'instagram'}_${hash}.json`;
}

function escribirDebugInstagram({ tipoPublicacion, postLink, motivo, payload, extra = {} }) {
  try {
    const carpetaBase = process.env.DIR_DEBUG_INSTAGRAM || path.join(process.cwd(), 'debug_instagram_dom');
    asegurarDirectorio(carpetaBase);

    const ruta = path.join(carpetaBase, nombreArchivoDebugInstagram(tipoPublicacion, postLink));
    const data = {
      fecha_debug: new Date().toISOString(),
      tipo_publicacion: tipoPublicacion,
      post_link: postLink,
      motivo,
      extra,
      resumen_dom: payload?.debug || null,
      comentarios_detectados: Array.isArray(payload?.comentarios) ? payload.comentarios.length : 0,
      comentarios: payload?.comentarios || [],
    };

    fs.writeFileSync(ruta, JSON.stringify(data, null, 2), 'utf8');
    logWarn(`[IG][DOM][DEBUG] ${motivo}. Archivo: ${ruta}`);
    return ruta;
  } catch (error) {
    logWarn(`[IG][DOM][DEBUG] No se pudo escribir debug DOM: ${error.message}`);
    return null;
  }
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

  if (!validarLinkPorTipoPublicacion(postLink, tipoPublicacion)) {
    const payloadDebug = await page.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"]') || document;
      const clean = (s) => String(s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
      return {
        debug: {
          motivo: 'link_no_corresponde_tipo_solicitado',
          url_actual: location.href,
          dialog_texto: clean(dialog.innerText || dialog.textContent || '').slice(0, 2000),
          links_reel: Array.from(dialog.querySelectorAll('a[href*="/reel/"]')).slice(0, 20).map((a) => a.href || a.getAttribute('href')),
          links_post: Array.from(dialog.querySelectorAll('a[href*="/p/"]')).slice(0, 20).map((a) => a.href || a.getAttribute('href')),
          links_comentario: Array.from(dialog.querySelectorAll('a[href*="/c/"]')).slice(0, 20).map((a) => a.href || a.getAttribute('href')),
        },
        comentarios: [],
      };
    }).catch(() => ({ debug: { motivo: 'link_no_corresponde_tipo_solicitado_sin_dom' }, comentarios: [] }));

    escribirDebugInstagram({
      tipoPublicacion,
      postLink,
      motivo: 'link_no_corresponde_tipo_solicitado',
      payload: payloadDebug,
      extra: { tipoEsperado: tipoPublicacion },
    });

    return null;
  }

  const payload = await page.evaluate(() => {
    const dialog = document.querySelector('div[role="dialog"]') || document;

    const clean = (s) => String(s || '')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

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

    const normalizarUsuarioIg = (raw) => {
      const limpio = clean(raw)
        .replace(/^@+/, '')
        .replace(/\s+/g, '')
        .trim();

      if (!limpio) return null;
      if (limpio.length > 255) return limpio.slice(0, 255);

      return limpio;
    };

    const obtenerUsuarioDesdeBloqueComentario = (li) => {
      const selectores = [
        'div._a9zr h3 a[href][role="link"]',
        'div._a9zr h3 a[href]',
        'h3 a[href][role="link"]',
        'h3 a[href]',
      ];

      for (const selector of selectores) {
        const a = li.querySelector(selector);
        const texto = clean(a?.innerText || a?.textContent || '');
        const href = clean(a?.getAttribute?.('href') || '');

        if (!texto && !href) continue;

        const usuarioDesdeTexto = normalizarUsuarioIg(texto);

        if (usuarioDesdeTexto) return usuarioDesdeTexto;

        const matchHref = href.match(/^\/([^/?#]+)\/?$/);
        if (matchHref && matchHref[1]) {
          const usuarioDesdeHref = normalizarUsuarioIg(matchHref[1]);
          if (usuarioDesdeHref) return usuarioDesdeHref;
        }
      }

      return null;
    };

    const obtenerTextoDesdeBloqueComentario = (li, usuarioComentario) => {
      const candidatosTexto = [
        'div._a9zr div.xt0psk2 span[dir="auto"]',
        'div._a9zr div.xt0psk2 span',
        'div.xt0psk2 span[dir="auto"]',
        'div.xt0psk2 span',
      ];

      for (const selector of candidatosTexto) {
        const nodos = Array.from(li.querySelectorAll(selector));

        for (const nodo of nodos) {
          const textoNodo = clean(nodo.innerText || nodo.textContent);

          if (!textoNodo) continue;
          if (basura(textoNodo)) continue;

          const usuarioNormalizado = normalizarUsuarioIg(usuarioComentario || '');

          if (usuarioNormalizado && textoNodo === usuarioNormalizado) continue;

          return textoNodo;
        }
      }

      let texto = clean(li.innerText || li.textContent || '');

      if (usuarioComentario) {
        const usuarioEscapado = String(usuarioComentario).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        texto = texto.replace(new RegExp(`^${usuarioEscapado}\\s+`, 'i'), '').trim();
      } else {
        texto = texto.replace(/^\S+\s+/, '').trim();
      }

      texto = texto
        .replace(/\b(Reply|Responder|See translation|Ver traducción)\b.*$/i, '')
        .replace(/\b\d+\s*(likes?|me gusta)\b/ig, '')
        .trim();

      return texto;
    };

    const obtenerLikesComentario = (li) => {
      const candidatos = Array.from(li.querySelectorAll('[aria-label], button, span, a, div'));

      for (const el of candidatos) {
        const mezcla = clean(`${el.getAttribute?.('aria-label') || ''} ${el.innerText || el.textContent || ''}`);

        if (!/\b(like|likes|me gusta)\b/i.test(mezcla)) continue;
        if (!/\d/.test(mezcla)) continue;

        const n = parseNum(mezcla);
        if (n > 0) return n;
      }

      return 0;
    };

    const obtenerFechaComentarioRaw = (li) => {
      if (!li) return '';

      // Reels: el permalink del comentario viene como /p/.../c/.../ y contiene el time correcto.
      const timeComentarioPermalink = li.querySelector('a[href*="/c/"] time');
      if (timeComentarioPermalink) {
        const raw = clean(
          timeComentarioPermalink.getAttribute('datetime') ||
          timeComentarioPermalink.getAttribute('title') ||
          timeComentarioPermalink.innerText ||
          timeComentarioPermalink.textContent ||
          ''
        );
        if (raw) return raw;
      }

      // Posts y algunos reels: la fecha aparece como metadata del mismo bloque, cerca de Reply/Responder.
      const times = Array.from(li.querySelectorAll('time'));
      for (const time of times) {
        const raw = clean(
          time.getAttribute('datetime') ||
          time.getAttribute('title') ||
          time.innerText ||
          time.textContent ||
          ''
        );

        if (raw && /^(\d+\s*(m|min|h|d|w|sem)|\d+\s*(minutes?|hours?|days?|weeks?)\s*ago|hace\s+\d+|[a-z]{3,9}\s+\d{1,2},\s*\d{4}|\d{4}-\d{1,2}-\d{1,2})$/i.test(raw)) {
          return raw;
        }
      }

      const nodos = Array.from(li.querySelectorAll('span, a'));
      for (const nodo of nodos) {
        const texto = clean(nodo.innerText || nodo.textContent || '');
        if (!texto) continue;

        if (/^(\d+\s*(m|min|h|d|w|sem)|\d+\s*(minutes?|hours?|days?|weeks?)\s*ago|hace\s+\d+)$/i.test(texto)) {
          return texto;
        }
      }

      return '';
    };

    const obtenerDescripcion = () => {
      const candidatos = [];

      for (const el of Array.from(dialog.querySelectorAll('h1, span._ap3a, article span, div.xt0psk2, header, section'))) {
        const txt = clean(el.innerText || el.textContent);

        if (!basura(txt) && txt.length >= 3) {
          candidatos.push(txt);
        }
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
    const bloquesInvalidos = [];

    const bloques = Array.from(dialog.querySelectorAll(
      'ul li._a9zj, article ul li._a9zj, div[role="dialog"] ul li._a9zj, ul li'
    ));

    const crearMuestraBloque = (li, motivo, datos = {}) => ({
      motivo,
      usuario_detectado: datos.usuarioComentario || null,
      texto_detectado: datos.texto || null,
      fecha_comentario_raw_detectada: datos.fechaComentarioRaw || null,
      tiene_h2: Boolean(li.querySelector('h2')),
      tiene_h3: Boolean(li.querySelector('h3')),
      total_time: li.querySelectorAll('time').length,
      times: Array.from(li.querySelectorAll('time')).slice(0, 10).map((time) => ({
        texto: clean(time.innerText || time.textContent || ''),
        datetime: clean(time.getAttribute('datetime') || ''),
        title: clean(time.getAttribute('title') || ''),
        href_padre: clean(time.closest('a')?.getAttribute('href') || ''),
      })),
      links_usuario: Array.from(li.querySelectorAll('a[href]')).slice(0, 12).map((a) => ({
        texto: clean(a.innerText || a.textContent || ''),
        href: clean(a.getAttribute('href') || ''),
      })),
      texto_bloque: clean(li.innerText || li.textContent || '').slice(0, 1200),
      html_bloque: String(li.outerHTML || '').slice(0, 2500),
    });

    let idx = 1;

    for (const li of bloques) {
      const usuarioComentario = obtenerUsuarioDesdeBloqueComentario(li);

      if (!usuarioComentario) {
        if (bloquesInvalidos.length < 25) bloquesInvalidos.push(crearMuestraBloque(li, 'sin_usuario_h3'));
        continue;
      }

      const texto = obtenerTextoDesdeBloqueComentario(li, usuarioComentario);

      if (!texto || texto.length < 2) {
        if (bloquesInvalidos.length < 25) bloquesInvalidos.push(crearMuestraBloque(li, 'sin_texto_comentario', { usuarioComentario, texto }));
        continue;
      }

      if (basura(texto)) {
        if (bloquesInvalidos.length < 25) bloquesInvalidos.push(crearMuestraBloque(li, 'texto_basura', { usuarioComentario, texto }));
        continue;
      }

      const claveDedup = `${usuarioComentario}::${texto}`;
      if (vistos.has(claveDedup)) {
        if (bloquesInvalidos.length < 25) bloquesInvalidos.push(crearMuestraBloque(li, 'comentario_duplicado', { usuarioComentario, texto }));
        continue;
      }
      vistos.add(claveDedup);

      const likes = obtenerLikesComentario(li);
      const fechaComentarioRaw = obtenerFechaComentarioRaw(li);

      if (!fechaComentarioRaw && bloquesInvalidos.length < 25) {
        bloquesInvalidos.push(crearMuestraBloque(li, 'sin_fecha_comentario_raw', { usuarioComentario, texto, fechaComentarioRaw }));
      }

      comentarios.push({
        [`comentario_${idx}`]: texto,
        [`usuario_comentario_${idx}`]: usuarioComentario,
        [`likes_${idx}`]: likes,
        [`replies_${idx}`]: 0,
        [`fecha_comentario_raw_${idx}`]: fechaComentarioRaw || null,
      });

      idx++;
    }

    return {
      descripcion: obtenerDescripcion(),
      likes: obtenerLikes(),
      fecha_raw: fechaRaw,
      imagen,
      comentarios,
      debug: {
        url_actual: location.href,
        texto_dialogo: clean(dialog.innerText || dialog.textContent || '').slice(0, 2000),
        total_bloques_li: bloques.length,
        comentarios_detectados: comentarios.length,
        total_links_reel: dialog.querySelectorAll('a[href*="/reel/"]').length,
        total_links_post: dialog.querySelectorAll('a[href*="/p/"]').length,
        total_links_comentario: dialog.querySelectorAll('a[href*="/c/"]').length,
        total_time: dialog.querySelectorAll('time').length,
        links_reel: Array.from(dialog.querySelectorAll('a[href*="/reel/"]')).slice(0, 20).map((a) => clean(a.href || a.getAttribute('href') || '')),
        links_post: Array.from(dialog.querySelectorAll('a[href*="/p/"]')).slice(0, 20).map((a) => clean(a.href || a.getAttribute('href') || '')),
        links_comentario: Array.from(dialog.querySelectorAll('a[href*="/c/"]')).slice(0, 20).map((a) => clean(a.href || a.getAttribute('href') || '')),
        bloques_invalidos: bloquesInvalidos,
      },
    };
  });

  if (!payload || !Array.isArray(payload.comentarios) || !payload.comentarios.length) {
    escribirDebugInstagram({
      tipoPublicacion,
      postLink,
      motivo: 'sin_comentarios_detectados_en_dom',
      payload,
    });
    return null;
  }

  const fecha = payload.fecha_raw ? formateaFecha(payload.fecha_raw, postLink) : null;
  const rutaCaptura = await capturarImagenLocal(page, postLink, tipoPublicacion);

  const comentariosConFecha = payload.comentarios.map((comentario, index) => {
    const id = String(index + 1);
    const fechaRaw = comentario[`fecha_comentario_raw_${id}`] || comentario.fecha_comentario_raw || '';
    const fechaComentario = formatearFechaInstagram(fechaRaw);

    return {
      ...comentario,
      [`fecha_comentario_${id}`]: fechaComentario,
    };
  });

  const comentariosSinFecha = comentariosConFecha.filter((comentario, index) => {
    const id = String(index + 1);
    return !comentario[`fecha_comentario_${id}`];
  });

  if (comentariosSinFecha.length > 0) {
    escribirDebugInstagram({
      tipoPublicacion,
      postLink,
      motivo: 'comentarios_con_fecha_invalida_o_no_parseable',
      payload,
      extra: {
        total_comentarios: comentariosConFecha.length,
        total_sin_fecha_parseada: comentariosSinFecha.length,
        comentarios_sin_fecha: comentariosSinFecha.slice(0, 20),
      },
    });
  }

  log(`[IG][DOM] ${tipoPublicacion} link=${postLink} bloques=${payload.debug?.total_bloques_li ?? 'NA'} comentarios=${comentariosConFecha.length} sin_fecha=${comentariosSinFecha.length} links_reel=${payload.debug?.total_links_reel ?? 'NA'} links_post=${payload.debug?.total_links_post ?? 'NA'} links_comentario=${payload.debug?.total_links_comentario ?? 'NA'} times=${payload.debug?.total_time ?? 'NA'}`);

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
    comentarios: comentariosConFecha,
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
