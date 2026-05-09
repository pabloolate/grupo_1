'use strict';

require('dotenv').config();

const axios = require('axios');

function normalizarTexto(valor) {
  return String(valor ?? '').trim();
}

function obtenerUrlSentimentalizador() {
  return normalizarTexto(process.env.URL_SENTIMENTALIZADOR_LOCAL) || 'http://127.0.0.1:5000/predecir';
}

function obtenerTimeoutSentimentalizador() {
  const valor = Number(process.env.TIMEOUT_SENTIMENTALIZADOR_MS);

  if (!Number.isFinite(valor) || valor <= 0) {
    return 30000;
  }

  return valor;
}

function obtenerIndiceComentarioDinamico(comentario) {
  if (!comentario || typeof comentario !== 'object') {
    return null;
  }

  const keyComentario = Object.keys(comentario).find((key) => /^comentario_\d+$/.test(key));
  if (!keyComentario) {
    return null;
  }

  const match = keyComentario.match(/^comentario_(\d+)$/);
  return match ? match[1] : null;
}

function extraerTextoComentario(comentario) {
  if (typeof comentario === 'string') {
    return normalizarTexto(comentario);
  }

  if (!comentario || typeof comentario !== 'object') {
    return '';
  }

  const indiceDinamico = obtenerIndiceComentarioDinamico(comentario);

  if (indiceDinamico) {
    return normalizarTexto(comentario[`comentario_${indiceDinamico}`]);
  }

  return normalizarTexto(
    comentario.texto ||
    comentario.comentario ||
    comentario.text ||
    comentario.descripcion ||
    comentario.mensaje ||
    ''
  );
}

function extraerLikesComentario(comentario) {
  if (!comentario || typeof comentario !== 'object') {
    return 0;
  }

  const indiceDinamico = obtenerIndiceComentarioDinamico(comentario);

  if (indiceDinamico) {
    return Number(comentario[`likes_${indiceDinamico}`] ?? 0) || 0;
  }

  return Number(comentario.likes ?? comentario.me_gusta ?? comentario.likes_comentario ?? 0) || 0;
}

function extraerRepliesComentario(comentario) {
  if (!comentario || typeof comentario !== 'object') {
    return 0;
  }

  const indiceDinamico = obtenerIndiceComentarioDinamico(comentario);

  if (indiceDinamico) {
    return Number(comentario[`replies_${indiceDinamico}`] ?? 0) || 0;
  }

  return Number(comentario.replies ?? comentario.respuestas ?? comentario.total_respuestas ?? 0) || 0;
}

function normalizarSentimiento(valor) {
  const texto = normalizarTexto(valor).toLowerCase();

  if (texto === 'negativo' || texto === 'negative') {
    return 'Negativo';
  }

  if (texto === 'ironico' || texto === 'irónico' || texto === 'ironic') {
    return 'Negativo';
  }

  if (texto === 'positivo' || texto === 'positive') {
    return 'Positivo';
  }

  if (texto === 'neutral') {
    return 'Neutral';
  }

  return normalizarTexto(valor);
}

function construirComentariosParaFlask(post) {
  const comentariosCrudos = Array.isArray(post?.comentarios) ? post.comentarios : [];
  const comentariosLimpios = [];

  for (const comentario of comentariosCrudos) {
    const texto = extraerTextoComentario(comentario);

    if (!texto) {
      continue;
    }

    comentariosLimpios.push(texto);
  }

  return comentariosLimpios;
}

function construirComentarioNegativoNormalizado({ comentarioOriginal, textoComentario }) {
  const texto = extraerTextoComentario(comentarioOriginal) || normalizarTexto(textoComentario);

  return {
    texto,
    comentario: texto,
    sentimiento: 'Negativo',
    puntaje: comentarioOriginal?.puntaje ?? comentarioOriginal?.score ?? null,
    likes: extraerLikesComentario(comentarioOriginal),
    replies: extraerRepliesComentario(comentarioOriginal),
    respuestas: extraerRepliesComentario(comentarioOriginal),
  };
}

function unirResultadoConComentarioOriginal({ post, resultadosFlask }) {
  const comentariosOriginales = Array.isArray(post?.comentarios) ? post.comentarios : [];
  const negativos = [];

  for (let i = 0; i < resultadosFlask.length; i += 1) {
    const resultado = resultadosFlask[i] || {};
    const sentimiento = normalizarSentimiento(resultado.sentimiento);

    if (sentimiento !== 'Negativo') {
      continue;
    }

    const textoComentario = normalizarTexto(resultado.comentario);
    const comentarioOriginal = comentariosOriginales[i];

    negativos.push(
      construirComentarioNegativoNormalizado({
        comentarioOriginal,
        textoComentario,
      })
    );
  }

  return negativos;
}

async function enviarComentariosAlFlask(comentarios) {
  const url = obtenerUrlSentimentalizador();
  const timeout = obtenerTimeoutSentimentalizador();

  const payload = {
    comentarios,
  };

  console.log(`[FLASK] Enviando ${comentarios.length} comentarios a ${url}`);

  const respuesta = await axios.post(url, payload, {
    timeout,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return respuesta.data;
}

async function analizarPostSoloNegativos(post, opciones = {}) {
  const comentarios = construirComentariosParaFlask(post);

  const link = post?.link || post?.url_publicacion || 'sin_link';

  if (!comentarios.length) {
    console.warn(`[FLASK] No se enviará post sin comentarios extraíbles: ${link}`);
    return [];
  }

  const respuestaFlask = await enviarComentariosAlFlask(comentarios);

  const resultados = Array.isArray(respuestaFlask?.resultados)
    ? respuestaFlask.resultados
    : [];

  if (!resultados.length) {
    console.warn(`[FLASK] Respuesta sin resultados para: ${link}`);
    return [];
  }

  const negativos = unirResultadoConComentarioOriginal({
    post,
    resultadosFlask: resultados,
    opciones,
  });

  console.log(`[FLASK] Recibidos=${resultados.length} negativos=${negativos.length} link=${link}`);

  return negativos;
}

module.exports = {
  analizarPostSoloNegativos,
  enviarComentariosAlFlask,
  construirComentariosParaFlask,
  extraerTextoComentario,
  normalizarSentimiento,
};