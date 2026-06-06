const { getPool } = require('../db');
const {
  ahoraSql,
  hashSha256,
  normalizarTexto,
} = require('../funciones_secundarias');

function normalizarUrlPublicacion(url) {
  return String(url || '').split('?')[0].replace(/\/+$/, '').trim();
}

function resolverPlataformaBase(tipo) {
  return String(tipo || '').startsWith('instagram') ? 'instagram' : String(tipo || 'desconocida');
}

function normalizarUsuarioComentario(valor) {
  return normalizarTexto(valor || '')
    .replace(/^@+/, '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .trim()
    .slice(0, 255) || null;
}

function normalizarFechaComentario(valor) {
  const texto = normalizarTexto(valor || '');
  if (!texto) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : null;
}

async function guardarPostConNegativos({ post, negativos, urlOrigen }) {
  const db = getPool();
  const tipoPublicacion = String(post?.tipo_publicacion || post?.plataforma_payload || 'desconocida');
  const plataforma = resolverPlataformaBase(tipoPublicacion);
  const urlPublicacion = normalizarUrlPublicacion(post?.link || post?.url_publicacion || '');

  if (!urlPublicacion) throw new Error('No se puede guardar publicación sin link/url_publicacion');

  const negativosLimpios = (Array.isArray(negativos) ? negativos : [])
    .map((n) => ({
      usuario_comentario: normalizarUsuarioComentario(
        n.usuario_comentario ||
        n.usuario ||
        n.autor ||
        n.username ||
        n.handle ||
        ''
      ),
      texto_comentario: normalizarTexto(n.texto_comentario || n.comentario || n.texto || ''),
      fecha_comentario: normalizarFechaComentario(n.fecha_comentario || n.fechaComentario || null),
      sentimiento: 'negativo',
      puntaje: Number(n.puntaje || 1) || 1,
    }))
    .filter((n) => n.texto_comentario);

  if (!negativosLimpios.length) {
    return { guardado: false, motivo: 'sin_negativos' };
  }

  const fechaScraping = ahoraSql();
  const hashPublicacion = hashSha256(urlPublicacion);

  const publicacionResult = await db.query(`
    INSERT INTO publicaciones_negativas (
      plataforma,
      tipo_publicacion,
      url_origen,
      url_publicacion,
      hash_publicacion,
      fecha_scraping
    ) VALUES (
      $1, $2, $3, $4, $5, $6
    )
    ON CONFLICT (hash_publicacion) DO UPDATE SET
      plataforma = EXCLUDED.plataforma,
      tipo_publicacion = EXCLUDED.tipo_publicacion,
      url_origen = EXCLUDED.url_origen,
      url_publicacion = EXCLUDED.url_publicacion,
      fecha_scraping = EXCLUDED.fecha_scraping,
      updated_at = NOW()
    RETURNING id;
  `, [
    plataforma,
    tipoPublicacion,
    String(urlOrigen || ''),
    urlPublicacion,
    hashPublicacion,
    fechaScraping,
  ]);

  const publicacionId = publicacionResult.rows?.[0]?.id;
  if (!publicacionId) throw new Error('PostgreSQL no devolvió id de publicación');

  let comentariosGuardados = 0;

  for (const negativo of negativosLimpios) {
    const hashComentario = hashSha256(`${urlPublicacion}::${negativo.usuario_comentario || 'sin_usuario'}::${negativo.texto_comentario}`);

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
        fecha_scraping,
        fecha_comentario
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8,
        $9, $10, $11
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
        fecha_scraping = EXCLUDED.fecha_scraping,
        fecha_comentario = EXCLUDED.fecha_comentario,
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
      fechaScraping,
      negativo.fecha_comentario,
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
