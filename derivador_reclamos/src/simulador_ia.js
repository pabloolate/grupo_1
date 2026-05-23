const fs = require('fs');
const path = require('path');

function normalizarTextoBusqueda(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function leerConfiguracionSimulacion() {
  const ruta = path.join(process.cwd(), 'config', 'simulacion_derivador.json');

  if (!fs.existsSync(ruta)) {
    throw new Error(`No existe archivo de simulación: ${ruta}`);
  }

  return JSON.parse(fs.readFileSync(ruta, 'utf8'));
}

function contieneAlgunaPalabra(textoNormalizado, palabras) {
  return palabras.some((palabra) => {
    const palabraNormalizada = normalizarTextoBusqueda(palabra);
    return textoNormalizado.includes(palabraNormalizada);
  });
}

function unirRespuesta(base, respuestaRegla) {
  return {
    ...base,
    ...respuestaRegla,
  };
}

function simularAnalisisIa(comentario) {
  const configuracion = leerConfiguracionSimulacion();
  const texto = normalizarTextoBusqueda(comentario.texto_comentario);

  const respuestaBase = configuracion.respuesta_base || {
    es_reclamo_valido: true,
    tipo_incidencia: 'RECLAMO_GENERAL',
    motivo_decision: 'Comentario negativo general detectado por simulación.',
    confianza: 0.7,
  };

  const reglas = Array.isArray(configuracion.reglas) ? configuracion.reglas : [];

  for (const regla of reglas) {
    if (!Array.isArray(regla.contiene)) continue;

    if (contieneAlgunaPalabra(texto, regla.contiene)) {
      return unirRespuesta(respuestaBase, regla.respuesta || {});
    }
  }

  return respuestaBase;
}

module.exports = {
  simularAnalisisIa,
};