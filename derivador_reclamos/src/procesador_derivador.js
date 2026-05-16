const config = require('./config');
const { simularAnalisisIa } = require('./simulador_ia');
const { analizarComentarioConOllama } = require('./cliente_ollama');
const { normalizarAnalisisIa } = require('./normalizador_ia');
const { crearReclamoDesdeComentario } = require('./repositorio_general');
const {
  obtenerComentariosPendientes,
  marcarControlEnProceso,
  marcarControlProcesado,
  marcarControlError,
} = require('./repositorio_scraping');

async function obtenerAnalisisIa(comentario) {
  if (config.modoTest || !config.usarOllama) {
    return simularAnalisisIa(comentario);
  }

  return analizarComentarioConOllama(comentario);
}

function resolverEstadoControl(analisis, resultadoCreacion) {
  if (!analisis.es_reclamo_valido || analisis.decision_derivador === 'DESCARTADO') {
    return 'DESCARTADO';
  }

  if (resultadoCreacion.estado_objetivo === 'PENDIENTE_ASIGNACION') {
    return 'SIN_CUPO_ASIGNACION';
  }

  if (analisis.decision_derivador === 'RESUELTO_IA') {
    return 'PROCESADO_RESUELTO_IA';
  }

  return 'PROCESADO_DERIVADO_HUMANO';
}

async function procesarComentarioPendiente(comentario) {
  await marcarControlEnProceso(comentario.control_id);

  try {
    const analisisOriginal = await obtenerAnalisisIa(comentario);
    const analisis = normalizarAnalisisIa(analisisOriginal);

    const resultadoCreacion = await crearReclamoDesdeComentario({
      comentario,
      analisis,
    });

    const estadoControl = resolverEstadoControl(analisis, resultadoCreacion);

    await marcarControlProcesado({
      controlId: comentario.control_id,
      estadoDerivacion: estadoControl,
      reclamoEntranteId: resultadoCreacion.reclamo_entrante_id,
      reclamoId: resultadoCreacion.reclamo_id,
      clasificacionId: resultadoCreacion.clasificacion_id,
      decisionDerivador: analisis.decision_derivador,
      motivoDecision: analisis.motivo_decision,
    });

    return {
      ok: true,
      control_id: comentario.control_id,
      comentario_negativo_id: comentario.comentario_negativo_id,
      decision: analisis.decision_derivador,
      categoria: analisis.categoria,
      prioridad: analisis.prioridad,
      perfil_destino: analisis.perfil_destino,
      estado_control: estadoControl,
      reclamo_id: resultadoCreacion.reclamo_id,
      usuario_asignado_id: resultadoCreacion.usuario_asignado_id,
    };
  } catch (error) {
    await marcarControlError({
      controlId: comentario.control_id,
      error,
    });

    return {
      ok: false,
      control_id: comentario.control_id,
      comentario_negativo_id: comentario.comentario_negativo_id,
      error: error.message,
    };
  }
}

async function procesarPendientes() {
  const pendientes = await obtenerComentariosPendientes({
    limite: config.derivador.loteProceso,
  });

  const resultados = [];

  for (const comentario of pendientes) {
    const resultado = await procesarComentarioPendiente(comentario);
    resultados.push(resultado);
  }

  return resultados;
}

module.exports = {
  procesarPendientes,
};