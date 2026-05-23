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
    .map((n) => {
      const usuarioComentario = normalizarTexto(
        n.usuario_comentario ||
        n.usuario ||
        n.autor ||
        n.username ||
        n.handle ||
        ''
      )
        .replace(/^@+/, '')
        .replace(/^\/+/, '')
        .replace(/\/+$/, '')
        .trim();

      return {
        usuario_comentario: usuarioComentario || null,
        texto_comentario: normalizarTexto(n.texto_comentario || n.comentario || n.texto || ''),
        sentimiento: 'negativo',
        puntaje: Number(n.puntaje || 1) || 1,
        likes: Number(n.likes || 0) || 0,
        replies: Number(n.replies || n.respuestas || 0) || 0,
      };
    })
    .filter((n) => n.texto_comentario);

  if (!negativosLimpios.length) {
    return { guardado: false, motivo: 'sin_negativos' };
  }

  const fechaScraping = ahoraSql();
  const rutaImagenLocal = await guardarImagenLocalSiCorresponde(post, tipoPublicacion);
  const hashPublicacion = hashSha256(urlPublicacion);

  const publicacionResult = await db.query(`
    INSERT INTO publicaciones_negativas (
      plataforma, tipo_publicacion, url_origen, url_publicacion, hash_publicacion,
      texto_publicacion, fecha_publicacion, hora_publicacion, likes, views,
      cantidad_comentarios_detectados, cantidad_comentarios_negativos,
      ruta_imagen_local, url_imagen_original, fecha_scraping
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12,
      $13, $14, $15
    )
    ON CONFLICT (hash_publicacion) DO UPDATE SET
      plataforma = EXCLUDED.plataforma,
      tipo_publicacion = EXCLUDED.tipo_publicacion,
      url_origen = EXCLUDED.url_origen,
      url_publicacion = EXCLUDED.url_publicacion,
      texto_publicacion = EXCLUDED.texto_publicacion,
      fecha_publicacion = EXCLUDED.fecha_publicacion,
      hora_publicacion = EXCLUDED.hora_publicacion,
      likes = EXCLUDED.likes,
      views = EXCLUDED.views,
      cantidad_comentarios_detectados = EXCLUDED.cantidad_comentarios_detectados,
      cantidad_comentarios_negativos = EXCLUDED.cantidad_comentarios_negativos,
      ruta_imagen_local = COALESCE(EXCLUDED.ruta_imagen_local, publicaciones_negativas.ruta_imagen_local),
      url_imagen_original = EXCLUDED.url_imagen_original,
      fecha_scraping = EXCLUDED.fecha_scraping,
      updated_at = NOW()
    RETURNING id;
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

  const publicacionId = publicacionResult.rows?.[0]?.id;
  if (!publicacionId) throw new Error('PostgreSQL no devolvió id de publicación');

  let comentariosGuardados = 0;

  for (const negativo of negativosLimpios) {
    const hashComentario = hashSha256(`${urlPublicacion}::${negativo.texto_comentario}`);

    await db.query(`
      INSERT INTO comentarios_negativos (
        publicacion_id,
        plataforma,
        tipo_publicacion,
        url_publicacion,
        usuario_comentario,
        hash_comentario,
        texto_comentario,
        sentimiento,
        puntaje,
        likes,
        replies,
        fecha_scraping
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8,
        $9, $10, $11, $12
      )
      ON CONFLICT (hash_comentario) DO UPDATE SET
        publicacion_id = EXCLUDED.publicacion_id,
        plataforma = EXCLUDED.plataforma,
        tipo_publicacion = EXCLUDED.tipo_publicacion,
        url_publicacion = EXCLUDED.url_publicacion,
        usuario_comentario = EXCLUDED.usuario_comentario,
        texto_comentario = EXCLUDED.texto_comentario,
        sentimiento = EXCLUDED.sentimiento,
        puntaje = EXCLUDED.puntaje,
        likes = EXCLUDED.likes,
        replies = EXCLUDED.replies,
        fecha_scraping = EXCLUDED.fecha_scraping,
        updated_at = NOW();
    `, [
      publicacionId,
      plataforma,
      tipoPublicacion,
      urlPublicacion,
      negativo.usuario_comentario,
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
