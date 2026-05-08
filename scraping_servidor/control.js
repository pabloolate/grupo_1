const { normalizarTexto } = require('./funciones_secundarias');

function inferirPlataformaOperativa(link) {
  const s = String(link || '').trim().toLowerCase();
  if (!s) return 'desconocida';
  if (s.includes('instagram.com')) {
    if (s.includes('/reels') || s.includes('/reel/') || /\/reels?\/[a-z0-9_-]+\/?/i.test(s)) {
      return 'instagram_reel';
    }
    return 'instagram_post';
  }
  if (s.includes('tiktok.com')) return 'tiktok';
  return 'desconocida';
}

function tipoPublicacionDesdePost(post, fallbackUrl = '') {
  const explicito = String(post?.tipo_publicacion || post?.plataforma_payload || '').trim().toLowerCase();
  if (['instagram_post', 'instagram_reel', 'tiktok'].includes(explicito)) return explicito;
  return inferirPlataformaOperativa(post?.link || post?.url_publicacion || fallbackUrl);
}

function construirResultadoComentariosVacioControl() {
  return {
    total_comentarios: 0,
    total_comentarios_negativos: 0,
    comentarios_negativos: [],
  };
}

function normalizarComentarioDom(item, index) {
  if (!item || typeof item !== 'object') return null;

  const keyComentario = Object.keys(item).find((k) => /^comentario_\d+$/.test(k));
  const id = keyComentario ? keyComentario.split('_')[1] : String(index + 1);
  const texto = normalizarTexto(keyComentario ? item[keyComentario] : item.texto || item.comentario || '');
  if (!texto) return null;

  return {
    [`comentario_${id}`]: texto,
    [`likes_${id}`]: Number(item[`likes_${id}`] ?? item.likes ?? 0) || 0,
    [`replies_${id}`]: Number(item[`replies_${id}`] ?? item.replies ?? item.respuestas ?? 0) || 0,
  };
}

function validarComentariosPrevioSentimentalizador({ comentarios = [], plataforma = 'desconocida', link = null } = {}) {
  const comentariosArray = Array.isArray(comentarios) ? comentarios : [];
  const comentarios_validos = [];

  for (let i = 0; i < comentariosArray.length; i++) {
    const normalizado = normalizarComentarioDom(comentariosArray[i], i);
    if (normalizado) comentarios_validos.push(normalizado);
  }

  if (!comentarios_validos.length) {
    return {
      ok: false,
      sin_comentarios: true,
      comentarios_validos: [],
      resultado_vacio: construirResultadoComentariosVacioControl(),
      motivo_control: 'sin_comentarios_utiles',
      detalle_control: `[${plataforma}] Publicación sin comentarios útiles. link=${String(link || 'sin_link')}`,
      plataforma_control: plataforma,
    };
  }

  return {
    ok: true,
    sin_comentarios: false,
    comentarios_validos,
    resultado_vacio: null,
    motivo_control: null,
    detalle_control: null,
    plataforma_control: plataforma,
  };
}

function separarPublicacionesPorRedSocial(dataHijos = [], urlOrigen = '') {
  const salida = {
    instagram_post: [],
    instagram_reel: [],
    tiktok: [],
    omitidos: [],
  };

  for (const post of Array.isArray(dataHijos) ? dataHijos : []) {
    const tipo = tipoPublicacionDesdePost(post, urlOrigen);
    if (!salida[tipo]) {
      salida.omitidos.push({ motivo: 'tipo_desconocido', post });
      continue;
    }

    const validacion = validarComentariosPrevioSentimentalizador({
      comentarios: post?.comentarios,
      plataforma: tipo,
      link: post?.link || urlOrigen,
    });

    if (!validacion.ok) {
      salida.omitidos.push({ motivo: validacion.motivo_control, detalle: validacion.detalle_control, post });
      continue;
    }

    salida[tipo].push({ ...post, comentarios: validacion.comentarios_validos, tipo_publicacion: tipo });
  }

  return salida;
}

module.exports = {
  inferirPlataformaOperativa,
  tipoPublicacionDesdePost,
  construirResultadoComentariosVacioControl,
  validarComentariosPrevioSentimentalizador,
  separarPublicacionesPorRedSocial,
};
