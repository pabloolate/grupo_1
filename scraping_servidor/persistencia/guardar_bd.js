const path = require('path');
const { getPool } = require('../db');
const {
  ahoraSql,
  hashSha256,
  normalizarTexto,
  hoyCarpeta,
  asegurarDirectorio,
  descargarImagen,
  logWarn,
} = require('../funciones_secundarias');

function normalizarUrlPublicacion(url) {
  return String(url || '').split('?')[0].replace(/\/+$/, '').trim();
}

function resolverPlataformaBase(tipo) {
  return String(tipo || '').startsWith('instagram') ? 'instagram' : String(tipo || 'desconocida');
}

function resolverSubcarpetaImagen(tipoPublicacion) {
  if (tipoPublicacion === 'instagram_reel') return 'instagram_reels';
  if (tipoPublicacion === 'tiktok') return 'tiktok';
  return 'instagram_posts';
}

async function guardarImagenLocalSiCorresponde(post, tipoPublicacion) {
  if (post?.ruta_imagen_local) return post.ruta_imagen_local;
  const urlImagen = String(post?.imagen || post?.url_imagen || post?.thumbnail || '').trim();
  if (!urlImagen || urlImagen === 'Sin imagen') return null;

  const baseDir = process.env.DIR_IMAGENES || path.join(process.cwd(), 'imagenes');
  const sub = resolverSubcarpetaImagen(tipoPublicacion);
  const carpeta = asegurarDirectorio(path.join(baseDir, sub, hoyCarpeta()));
  const hash = hashSha256(post?.link || post?.url_publicacion || urlImagen).slice(0, 24);
  const ruta = path.join(carpeta, `${hash}.jpg`);

  try {
    await descargarImagen({ urlImagen, rutaDestino: ruta });
    return ruta;
  } catch (error) {
    logWarn(`[IMG] No pude descargar imagen ${urlImagen}: ${error.message}`);
    return null;
  }
}

async function guardarPostConNegativos({ post, negativos, urlOrigen }) {
  const db = getPool();
  const tipoPublicacion = String(post?.tipo_publicacion || post?.plataforma_payload || 'desconocida');
  const plataforma = resolverPlataformaBase(tipoPublicacion);
  const urlPublicacion = normalizarUrlPublicacion(post?.link || post?.url_publicacion || '');
  if (!urlPublicacion) throw new Error('No se puede guardar publicación sin link/url_publicacion');

  const negativosLimpios = (Array.isArray(negativos) ? negativos : [])
    .map((n) => ({
      texto_comentario: normalizarTexto(n.texto_comentario || n.comentario || n.texto || ''),
      sentimiento: 'negativo',
      puntaje: Number(n.puntaje || 1) || 1,
      likes: Number(n.likes || 0) || 0,
      replies: Number(n.replies || n.respuestas || 0) || 0,
    }))
    .filter((n) => n.texto_comentario);

  if (!negativosLimpios.length) {
    return { guardado: false, motivo: 'sin_negativos' };
  }

  const fechaScraping = ahoraSql();
  const rutaImagenLocal = await guardarImagenLocalSiCorresponde(post, tipoPublicacion);
  const hashPublicacion = hashSha256(urlPublicacion);

  const [result] = await db.execute(`
    INSERT INTO publicaciones_negativas (
      plataforma, tipo_publicacion, url_origen, url_publicacion, hash_publicacion,
      texto_publicacion, fecha_publicacion, hora_publicacion, likes, views,
      cantidad_comentarios_detectados, cantidad_comentarios_negativos,
      ruta_imagen_local, url_imagen_original, fecha_scraping
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      plataforma = VALUES(plataforma),
      tipo_publicacion = VALUES(tipo_publicacion),
      url_origen = VALUES(url_origen),
      texto_publicacion = VALUES(texto_publicacion),
      fecha_publicacion = VALUES(fecha_publicacion),
      hora_publicacion = VALUES(hora_publicacion),
      likes = VALUES(likes),
      views = VALUES(views),
      cantidad_comentarios_detectados = VALUES(cantidad_comentarios_detectados),
      cantidad_comentarios_negativos = VALUES(cantidad_comentarios_negativos),
      ruta_imagen_local = COALESCE(VALUES(ruta_imagen_local), ruta_imagen_local),
      url_imagen_original = VALUES(url_imagen_original),
      fecha_scraping = VALUES(fecha_scraping),
      updated_at = CURRENT_TIMESTAMP
  `, [
    plataforma,
    tipoPublicacion,
    String(urlOrigen || ''),
    urlPublicacion,
    hashPublicacion,
    normalizarTexto(post?.descripcion || post?.texto_publicacion || ''),
    post?.fecha || post?.fecha_publicacion || null,
    post?.hora || post?.hora_publicacion || null,
    Number(post?.likes || 0) || 0,
    Number(post?.views || 0) || 0,
    Array.isArray(post?.comentarios) ? post.comentarios.length : 0,
    negativosLimpios.length,
    rutaImagenLocal,
    String(post?.imagen || post?.url_imagen || post?.thumbnail || ''),
    fechaScraping,
  ]);

  let publicacionId = result.insertId;
  if (!publicacionId) {
    const [rows] = await db.execute('SELECT id FROM publicaciones_negativas WHERE hash_publicacion = ? LIMIT 1', [hashPublicacion]);
    publicacionId = rows?.[0]?.id;
  }

  let comentariosGuardados = 0;
  for (const negativo of negativosLimpios) {
    const hashComentario = hashSha256(`${urlPublicacion}::${negativo.texto_comentario}`);
    await db.execute(`
      INSERT INTO comentarios_negativos (
        publicacion_id, plataforma, tipo_publicacion, url_publicacion,
        hash_comentario, texto_comentario, sentimiento, puntaje, likes, replies, fecha_scraping
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        publicacion_id = VALUES(publicacion_id),
        plataforma = VALUES(plataforma),
        tipo_publicacion = VALUES(tipo_publicacion),
        sentimiento = VALUES(sentimiento),
        puntaje = VALUES(puntaje),
        likes = VALUES(likes),
        replies = VALUES(replies),
        fecha_scraping = VALUES(fecha_scraping),
        updated_at = CURRENT_TIMESTAMP
    `, [
      publicacionId,
      plataforma,
      tipoPublicacion,
      urlPublicacion,
      hashComentario,
      negativo.texto_comentario,
      'negativo',
      negativo.puntaje,
      negativo.likes,
      negativo.replies,
      fechaScraping,
    ]);
    comentariosGuardados++;
  }

  return {
    guardado: true,
    publicacion_id: publicacionId,
    comentarios_guardados: comentariosGuardados,
  };
}

module.exports = {
  guardarPostConNegativos,
};
