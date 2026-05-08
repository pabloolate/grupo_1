const axios = require('axios');
const { normalizarTexto } = require('../funciones_secundarias');

function resolverUrlFlask() {
  const url = String(process.env.URL_SENTIMENTALIZADOR_LOCAL || '').trim();
  if (!url) throw new Error('URL_SENTIMENTALIZADOR_LOCAL no definida');
  return url;
}

function extraerComentariosNegativosDesdeRespuesta(data) {
  const negativos = [];

  const empujar = (item, fallback = {}) => {
    if (!item || typeof item !== 'object') return;
    const sentimiento = String(
      item.sentimiento ||
      item.sentimiento_comentario ||
      item.clasificacion ||
      item.label ||
      fallback.sentimiento ||
      ''
    ).toLowerCase();

    if (!sentimiento.includes('negativo') && !sentimiento.includes('ironico') && !sentimiento.includes('irónico')) return;

    const texto = normalizarTexto(
      item.comentario ||
      item.texto ||
      item.texto_comentario ||
      item.comentario_texto ||
      fallback.comentario ||
      ''
    );

    if (!texto) return;

    negativos.push({
      texto_comentario: texto,
      sentimiento: 'negativo',
      puntaje: Number(item.puntaje || item.score || fallback.puntaje || 1) || 1,
      likes: Number(item.likes ?? fallback.likes ?? 0) || 0,
      replies: Number(item.replies ?? item.respuestas ?? fallback.replies ?? 0) || 0,
    });
  };

  const candidatos = [];
  if (Array.isArray(data)) candidatos.push(...data);
  if (Array.isArray(data?.comentarios_negativos)) candidatos.push(...data.comentarios_negativos);
  if (Array.isArray(data?.negativos)) candidatos.push(...data.negativos);
  if (Array.isArray(data?.comentarios_con_sentimiento)) candidatos.push(...data.comentarios_con_sentimiento);
  if (Array.isArray(data?.resultados)) candidatos.push(...data.resultados);
  if (Array.isArray(data?.data?.resultados)) candidatos.push(...data.data.resultados);

  for (const item of candidatos) empujar(item);
  return negativos;
}

function extraerComentariosPlano(post) {
  const salida = [];
  const comentarios = Array.isArray(post?.comentarios) ? post.comentarios : [];

  comentarios.forEach((item, index) => {
    const keyComentario = Object.keys(item || {}).find((k) => /^comentario_\d+$/.test(k));
    const id = keyComentario ? keyComentario.split('_')[1] : String(index + 1);
    const texto = normalizarTexto(keyComentario ? item[keyComentario] : item?.texto || item?.comentario || '');
    if (!texto) return;
    salida.push({
      texto,
      likes: Number(item[`likes_${id}`] ?? item.likes ?? 0) || 0,
      replies: Number(item[`replies_${id}`] ?? item.replies ?? item.respuestas ?? 0) || 0,
      id,
    });
  });

  return salida;
}

async function analizarPostSoloNegativos(post, contexto = {}) {
  const url = resolverUrlFlask();
  const timeout = Math.max(1000, Number(process.env.TIMEOUT_SENTIMENTALIZADOR_MS || 30000));
  const modoUnoAUno = String(process.env.FLASK_MODO_COMENTARIOS_UNO_A_UNO || 'false').toLowerCase() === 'true';

  if (modoUnoAUno) {
    const comentarios = extraerComentariosPlano(post);
    const negativos = [];

    for (const comentario of comentarios) {
      const response = await axios.post(url, {
        comentarios: [comentario.texto],
        procedencia: contexto.procedencia || 'sentimentalizador_simple',
        sistema: contexto.sistema || 'sentimentalizador_simple',
        plataforma: contexto.plataforma || post.tipo_publicacion || post.plataforma || 'desconocida',
      }, { timeout });

      const parciales = extraerComentariosNegativosDesdeRespuesta(response.data)
        .map((x) => ({ ...x, likes: comentario.likes, replies: comentario.replies, puntaje: 1 + comentario.likes + comentario.replies }));
      negativos.push(...parciales);
    }

    return negativos;
  }

  const response = await axios.post(url, {
    data_hijos: [post],
    solo_negativos: true,
    procedencia: contexto.procedencia || 'sentimentalizador_simple',
    sistema: contexto.sistema || 'sentimentalizador_simple',
    plataforma: contexto.plataforma || post.tipo_publicacion || post.plataforma || 'desconocida',
  }, { timeout });

  let negativos = extraerComentariosNegativosDesdeRespuesta(response.data);

  // Si Flask devuelve resultados sin likes/replies, los completamos por texto desde el DOM.
  const domComentarios = extraerComentariosPlano(post);
  negativos = negativos.map((negativo) => {
    const match = domComentarios.find((c) => c.texto === negativo.texto_comentario);
    return {
      ...negativo,
      likes: Number(negativo.likes || match?.likes || 0),
      replies: Number(negativo.replies || match?.replies || 0),
      puntaje: Number(negativo.puntaje || (1 + Number(match?.likes || 0) + Number(match?.replies || 0)) || 1),
    };
  });

  return negativos;
}

module.exports = {
  analizarPostSoloNegativos,
  extraerComentariosNegativosDesdeRespuesta,
};
