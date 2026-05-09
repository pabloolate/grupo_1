'use strict';

const dotenv = require('dotenv');
const kleur = require('kleur');

dotenv.config();

const { inicializarBd, cerrarPool } = require('./db');
const { scrapearInstagramPosts, scrapearInstagramReels } = require('./scraping/instagram_puppeteer');
const { scrapearTikTok } = require('./scraping/tiktok');
const { analizarPostSoloNegativos } = require('./flask/cliente_flask');
const { guardarPostConNegativos } = require('./persistencia/guardar_bd');

const {
  inferirPlataformaOperativa,
  separarPublicacionesPorRedSocial,
  validarComentariosPrevioSentimentalizador,
} = require('./control');

const {
  log,
  logWarn,
  logError,
  normalizarTexto,
  asegurarDirectorio,
} = require('./funciones_secundarias');

function prepararCarpetasBase() {
  const dirImagenes = process.env.DIR_IMAGENES || './imagenes';
  const dirTmp = process.env.DIR_TMP || './tmp';

  asegurarDirectorio(dirImagenes);
  asegurarDirectorio(dirTmp);
  asegurarDirectorio(`${dirImagenes}/instagram_posts`);
  asegurarDirectorio(`${dirImagenes}/instagram_reels`);
  asegurarDirectorio(`${dirImagenes}/tiktok`);
}

function leerBooleanoEnv(nombre, valorDefecto = false) {
  const valor = String(process.env[nombre] ?? '').trim().toLowerCase();

  if (!valor) return valorDefecto;

  return ['true', '1', 'yes', 'si', 'sí'].includes(valor);
}

function leerNumeroEnv(nombre, valorDefecto) {
  const valor = Number(process.env[nombre]);

  if (!Number.isFinite(valor)) {
    return valorDefecto;
  }

  return valor;
}

function resolverTipoDesdeUrl(url, tipoForzado = null) {
  const tipo = normalizarTexto(tipoForzado).toLowerCase();

  if (['instagram_post', 'instagram_posts', 'instagram_reel', 'instagram_reels', 'tiktok'].includes(tipo)) {
    if (tipo === 'instagram_posts') return 'instagram_post';
    if (tipo === 'instagram_reels') return 'instagram_reel';
    return tipo;
  }

  return inferirPlataformaOperativa(url);
}

function resolverUrlInstagramParaReels(urlInstagram) {
  const url = normalizarTexto(urlInstagram);

  if (!url) return '';

  if (url.includes('/reels')) {
    return url;
  }

  return url.replace(/\/+$/, '') + '/reels/';
}

function resolverMaxItemsPorTipo(tipo) {
  if (tipo === 'instagram_post') {
    return leerNumeroEnv('MAX_ITEMS_INSTAGRAM_POSTS', 20);
  }

  if (tipo === 'instagram_reel') {
    return leerNumeroEnv('MAX_ITEMS_INSTAGRAM_REELS', 20);
  }

  if (tipo === 'tiktok') {
    return leerNumeroEnv('MAX_ITEMS_TIKTOK', 5);
  }

  return 20;
}

function construirTrabajosDesdeEnv() {
  const trabajos = [];

  const urlInstagram = normalizarTexto(process.env.URL_INSTAGRAM);
  const urlTikTok = normalizarTexto(process.env.URL_TIKTOK);

  const activarInstagramPosts = leerBooleanoEnv('SCRAPEAR_INSTAGRAM_POSTS', true);
  const activarInstagramReels = leerBooleanoEnv('SCRAPEAR_INSTAGRAM_REELS', true);
  const activarTikTok = leerBooleanoEnv('SCRAPEAR_TIKTOK', true);

  if (urlInstagram && activarInstagramPosts) {
    trabajos.push({
      tipo: 'instagram_post',
      url: urlInstagram,
      maxItems: resolverMaxItemsPorTipo('instagram_post'),
    });
  }

  if (urlInstagram && activarInstagramReels) {
    trabajos.push({
      tipo: 'instagram_reel',
      url: resolverUrlInstagramParaReels(urlInstagram),
      maxItems: resolverMaxItemsPorTipo('instagram_reel'),
    });
  }

  if (urlTikTok && activarTikTok) {
    trabajos.push({
      tipo: 'tiktok',
      url: urlTikTok,
      maxItems: resolverMaxItemsPorTipo('tiktok'),
    });
  }

  return trabajos;
}

async function scrapeHTML(url, opciones = {}) {
  const tipo = resolverTipoDesdeUrl(url, opciones.tipo);
  const maxItems = Number(opciones.maxItems || opciones.max_items || resolverMaxItemsPorTipo(tipo));

  log(kleur.cyan(`[scrapeHTML] tipo=${tipo} url=${url} maxItems=${maxItems}`));

  if (tipo === 'instagram_post') {
    return await scrapearInstagramPosts({ url, maxItems });
  }

  if (tipo === 'instagram_reel') {
    return await scrapearInstagramReels({ url, maxItems });
  }

  if (tipo === 'tiktok') {
    return await scrapearTikTok({ url, maxItems });
  }

  throw new Error(`No se pudo inferir plataforma/tipo desde URL: ${url}`);
}

async function procesarPublicacionesScrapeadas({ url, tipoSolicitado, resultadoScraping }) {
  const dataHijosCrudos = Array.isArray(resultadoScraping?.data_hijos) ? resultadoScraping.data_hijos : [];
  const separados = separarPublicacionesPorRedSocial(dataHijosCrudos, url);

  const publicacionesValidas = [
    ...separados.instagram_post,
    ...separados.instagram_reel,
    ...separados.tiktok,
  ];

  const resumen = {
    ok: true,
    url,
    tipo_solicitado: tipoSolicitado,
    publicaciones_scrapeadas: dataHijosCrudos.length,
    publicaciones_con_comentarios: publicacionesValidas.length,
    publicaciones_omitidas_sin_comentarios: separados.omitidos.length,
    publicaciones_guardadas: 0,
    comentarios_negativos_guardados: 0,
    detalle: [],
  };

  for (const post of publicacionesValidas) {
    const linkPost = post?.link || post?.url_publicacion || url;
    const tipoPost = resolverTipoDesdeUrl(linkPost, post?.tipo_publicacion || tipoSolicitado);

    const validacion = validarComentariosPrevioSentimentalizador({
      comentarios: post?.comentarios,
      plataforma: tipoPost,
      link: linkPost,
    });

    if (!validacion.ok) {
      resumen.detalle.push({
        link: linkPost,
        guardado: false,
        motivo: 'sin_comentarios',
      });
      continue;
    }

    const postNormalizado = {
      ...post,
      tipo_publicacion: tipoPost,
      comentarios: validacion.comentarios_validos,
    };

    let negativos = [];

    try {
      negativos = await analizarPostSoloNegativos(postNormalizado, {
        procedencia: 'sentimentalizador_simple',
        sistema: 'sentimentalizador_simple',
        plataforma: tipoPost,
      });
    } catch (errorFlask) {
      logWarn(kleur.yellow(`[FLASK] Falló análisis para ${linkPost}: ${errorFlask.message}`));
      resumen.detalle.push({
        link: linkPost,
        guardado: false,
        motivo: 'flask_error',
        error: errorFlask.message,
      });
      continue;
    }

    if (!Array.isArray(negativos) || !negativos.length) {
      resumen.detalle.push({
        link: linkPost,
        guardado: false,
        motivo: 'sin_negativos',
      });
      continue;
    }

    try {
      const persistencia = await guardarPostConNegativos({
        post: postNormalizado,
        negativos,
        urlOrigen: url,
      });

      if (persistencia.guardado) {
        resumen.publicaciones_guardadas += 1;
        resumen.comentarios_negativos_guardados += Number(persistencia.comentarios_guardados || 0);
      }

      resumen.detalle.push({
        link: linkPost,
        guardado: persistencia.guardado,
        publicacion_id: persistencia.publicacion_id || null,
        comentarios_negativos: Number(persistencia.comentarios_guardados || 0),
        motivo: persistencia.motivo || null,
      });
    } catch (errorBd) {
      logWarn(kleur.yellow(`[BD] Falló guardado para ${linkPost}: ${errorBd.message}`));
      resumen.detalle.push({
        link: linkPost,
        guardado: false,
        motivo: 'bd_error',
        error: errorBd.message,
      });
    }
  }

  return resumen;
}

async function generar(url, opciones = {}) {
  const tipoSolicitado = resolverTipoDesdeUrl(url, opciones.tipo);

  log(kleur.magenta(`\n[generar] Iniciando ${tipoSolicitado}`));
  log(kleur.magenta(`[generar] URL: ${url}`));

  const resultadoScraping = await scrapeHTML(url, {
    ...opciones,
    tipo: tipoSolicitado,
  });

  const resumen = await procesarPublicacionesScrapeadas({
    url,
    tipoSolicitado,
    resultadoScraping,
  });

  log(kleur.green(`[generar] Terminado ${tipoSolicitado}`));
  log(kleur.green(`[generar] publicaciones_guardadas=${resumen.publicaciones_guardadas} comentarios_negativos_guardados=${resumen.comentarios_negativos_guardados}`));

  return resumen;
}

async function ejecutarTrabajosAutomaticos() {
  prepararCarpetasBase();

  const trabajos = construirTrabajosDesdeEnv();

  if (!trabajos.length) {
    throw new Error('No hay trabajos configurados. Define URL_INSTAGRAM y/o URL_TIKTOK en el .env.');
  }

  log(kleur.green('✅ Sentimentalizador simple modo automático'));
  log(kleur.green(`✅ Flask sentimentalizador: ${process.env.URL_SENTIMENTALIZADOR_LOCAL || 'http://127.0.0.1:5000/predecir'}`));
  log(kleur.green(`✅ Trabajos configurados: ${trabajos.length}`));

  await inicializarBd();

  const resumenGlobal = {
    ok: true,
    trabajos: [],
    publicaciones_guardadas: 0,
    comentarios_negativos_guardados: 0,
  };

  for (const trabajo of trabajos) {
    try {
      const resumen = await generar(trabajo.url, {
        tipo: trabajo.tipo,
        maxItems: trabajo.maxItems,
      });

      resumenGlobal.trabajos.push({
        tipo: trabajo.tipo,
        url: trabajo.url,
        ok: true,
        resumen,
      });

      resumenGlobal.publicaciones_guardadas += Number(resumen.publicaciones_guardadas || 0);
      resumenGlobal.comentarios_negativos_guardados += Number(resumen.comentarios_negativos_guardados || 0);
    } catch (errorTrabajo) {
      logError(errorTrabajo);

      resumenGlobal.ok = false;
      resumenGlobal.trabajos.push({
        tipo: trabajo.tipo,
        url: trabajo.url,
        ok: false,
        error: errorTrabajo.message,
      });
    }
  }

  return resumenGlobal;
}

async function main() {
  let codigoSalida = 0;

  try {
    const resumen = await ejecutarTrabajosAutomaticos();

    log(kleur.green('\n✅ Proceso terminado'));
    log(kleur.green(`✅ publicaciones_guardadas=${resumen.publicaciones_guardadas}`));
    log(kleur.green(`✅ comentarios_negativos_guardados=${resumen.comentarios_negativos_guardados}`));

    if (!resumen.ok) {
      codigoSalida = 1;
    }
  } catch (error) {
    codigoSalida = 1;
    console.error('❌ Error fatal ejecutando sentimentalizador simple:', error);
  } finally {
    try {
      await cerrarPool();
    } catch (errorCierre) {
      console.warn('⚠️ No se pudo cerrar pool BD:', errorCierre.message);
    }

    process.exit(codigoSalida);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  scrapeHTML,
  generar,
  construirTrabajosDesdeEnv,
  ejecutarTrabajosAutomaticos,
};