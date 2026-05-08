const express = require('express');
const dotenv = require('dotenv');
const kleur = require('kleur');

dotenv.config();

const { inicializarBd, probarConexion } = require('./db');
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

const app = express();
const PORT = Number(process.env.PORT || 8085);

app.use(express.json({ limit: '50mb' }));

function prepararCarpetasBase() {
  asegurarDirectorio(process.env.DIR_IMAGENES || './imagenes');
  asegurarDirectorio(process.env.DIR_TMP || './tmp');
  asegurarDirectorio(`${process.env.DIR_IMAGENES || './imagenes'}/instagram_posts`);
  asegurarDirectorio(`${process.env.DIR_IMAGENES || './imagenes'}/instagram_reels`);
  asegurarDirectorio(`${process.env.DIR_IMAGENES || './imagenes'}/tiktok`);
}

function resolverTipoDesdeUrl(url, tipoForzado = null) {
  const tipo = normalizarTexto(tipoForzado).toLowerCase();
  if (['instagram_post', 'instagram_reel', 'tiktok'].includes(tipo)) return tipo;
  return inferirPlataformaOperativa(url);
}

async function scrapeHTML(url, opciones = {}) {
  const tipo = resolverTipoDesdeUrl(url, opciones.tipo);
  const maxItems = Number(opciones.max_items || opciones.maxItems || 0) || undefined;

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

async function generar(url, opciones = {}) {
  const tipoSolicitado = resolverTipoDesdeUrl(url, opciones.tipo);
  const resultadoScraping = await scrapeHTML(url, { ...opciones, tipo: tipoSolicitado });
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
    domain: resultadoScraping?.domain || null,
    publicaciones_scrapeadas: dataHijosCrudos.length,
    publicaciones_con_comentarios: publicacionesValidas.length,
    publicaciones_omitidas_sin_comentarios: separados.omitidos.length,
    publicaciones_guardadas: 0,
    comentarios_negativos_guardados: 0,
    detalle: [],
    omitidos: separados.omitidos,
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
      resumen.detalle.push({ link: linkPost, guardado: false, motivo: 'sin_comentarios' });
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
      resumen.detalle.push({ link: linkPost, guardado: false, motivo: 'flask_error', error: errorFlask.message });
      continue;
    }

    if (!Array.isArray(negativos) || !negativos.length) {
      resumen.detalle.push({ link: linkPost, guardado: false, motivo: 'sin_negativos' });
      continue;
    }

    try {
      const persistencia = await guardarPostConNegativos({
        post: postNormalizado,
        negativos,
        urlOrigen: url,
      });

      if (persistencia.guardado) {
        resumen.publicaciones_guardadas++;
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
      resumen.detalle.push({ link: linkPost, guardado: false, motivo: 'bd_error', error: errorBd.message });
    }
  }

  return resumen;
}

app.get('/health', async (_req, res) => {
  try {
    const db_ok = await probarConexion().catch(() => false);
    res.json({ ok: true, servicio: 'sentimentalizador_simple', db_ok });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/scrapeHTML', async (req, res) => {
  try {
    const url = normalizarTexto(req.body?.url);
    if (!url) return res.status(400).json({ ok: false, error: 'Falta url' });
    const data = await scrapeHTML(url, req.body || {});
    res.json({ ok: true, ...data });
  } catch (error) {
    logError(error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/generar', async (req, res) => {
  try {
    const url = normalizarTexto(req.body?.url);
    if (!url) return res.status(400).json({ ok: false, error: 'Falta url' });
    const data = await generar(url, req.body || {});
    res.json(data);
  } catch (error) {
    logError(error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

async function boot() {
  prepararCarpetasBase();
  await inicializarBd();
  app.listen(PORT, () => {
    log(kleur.green(`✅ Sentimentalizador simple iniciado en puerto ${PORT}`));
    log(kleur.green(`POST /generar { "url": "...", "tipo": "instagram_post|instagram_reel|tiktok" }`));
  });
}

if (require.main === module) {
  boot().catch((error) => {
    console.error('❌ Error fatal inicializando sentimentalizador simple:', error);
    process.exit(1);
  });
}

module.exports = {
  app,
  scrapeHTML,
  generar,
};
