const config = require('./config');

function construirPromptUsuario(comentario) {
  return [
    config.ollama.promptBase,
    '',
    'Comentario a analizar:',
    JSON.stringify({
      plataforma: comentario.plataforma,
      tipo_publicacion: comentario.tipo_publicacion,
      url_publicacion: comentario.url_publicacion,
      texto_comentario: comentario.texto_comentario,
      sentimiento: comentario.sentimiento,
      puntaje: comentario.puntaje,
      likes: comentario.likes,
      replies: comentario.replies,
      fecha_scraping: comentario.fecha_scraping,
    }, null, 2),
  ].join('\n');
}

function extraerJsonDesdeTexto(texto) {
  const contenido = String(texto || '').trim();

  try {
    return JSON.parse(contenido);
  } catch (_) {
    const inicio = contenido.indexOf('{');
    const fin = contenido.lastIndexOf('}');

    if (inicio === -1 || fin === -1 || fin <= inicio) {
      throw new Error('Ollama no devolvió JSON válido.');
    }

    return JSON.parse(contenido.slice(inicio, fin + 1));
  }
}

async function analizarComentarioConOllama(comentario) {
  const controlador = new AbortController();
  const timeout = setTimeout(() => controlador.abort(), config.ollama.timeoutMs);

  try {
    const respuesta = await fetch(`${config.ollama.url}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controlador.signal,
      body: JSON.stringify({
        model: config.ollama.modelo,
        prompt: construirPromptUsuario(comentario),
        stream: false,
        options: {
          temperature: config.ollama.temperature,
          top_p: config.ollama.topP,
        },
      }),
    });

    if (!respuesta.ok) {
      const textoError = await respuesta.text().catch(() => '');
      throw new Error(`Ollama respondió HTTP ${respuesta.status}: ${textoError}`);
    }

    const data = await respuesta.json();
    return extraerJsonDesdeTexto(data.response);
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  analizarComentarioConOllama,
};