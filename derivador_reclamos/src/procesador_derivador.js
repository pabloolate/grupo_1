const config = require('./config');
const { simularAnalisisIa } = require('./simulador_ia');
const { analizarComentarioConOllama } = require('./cliente_ollama');
const { normalizarAnalisisIa } = require('./normalizador_ia');
const { crearReclamoGeneralDesdeCaso } = require('./repositorio_general');
const {
  obtenerCatalogoTipoIncidencia,
  crearOActualizarCasoDerivacion,
  actualizarCasoConReclamoGenerado,
} = require('./repositorio_casos');

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

async function procesarComentarioPendiente(comentario) {
  await marcarControlEnProceso(comentario.control_id);

  try {
    const analisisOriginal = await obtenerAnalisisIa(comentario);
    const analisis = normalizarAnalisisIa(analisisOriginal);

    if (!analisis.es_reclamo_valido) {
      await marcarControlProcesado({
        controlId: comentario.control_id,
        estadoDerivacion: 'DESCARTADO',
        casoDerivacionId: null,
        reclamoEntranteId: null,
        reclamoId: null,
        clasificacionId: null,
        tipoIncidencia: 'NO_CLASIFICADO',
        areaDerivacion: null,
        prioridad: null,
        decisionDerivador: 'DESCARTADO',
        motivoDecision: analisis.motivo_decision,
      });

      return {
        ok: true,
        control_id: comentario.control_id,
        comentario_negativo_id: comentario.comentario_negativo_id,
        estado_control: 'DESCARTADO',
        tipo_incidencia: 'NO_CLASIFICADO',
      };
    }

    const catalogo = await obtenerCatalogoTipoIncidencia(analisis.tipo_incidencia);

    const resultadoCaso = await crearOActualizarCasoDerivacion({
      comentario,
      analisis,
      catalogo,
    });

    let resultadoGeneral = {
      reclamo_entrante_id: resultadoCaso.caso.reclamo_entrante_id_generado || null,
      reclamo_id: resultadoCaso.caso.reclamo_id_generado || null,
      clasificacion_id: resultadoCaso.caso.clasificacion_id_generada || null,
      usuario_asignado_id: resultadoCaso.caso.usuario_asignado_id || null,
      estado_objetivo: null,
    };

    if (resultadoCaso.accion === 'DERIVADO') {
      resultadoGeneral = await crearReclamoGeneralDesdeCaso({
        comentario,
        analisis,
        catalogo,
        caso: resultadoCaso.caso,
      });

      await actualizarCasoConReclamoGenerado({
        casoDerivacionId: resultadoCaso.caso.id,
        reclamoEntranteId: resultadoGeneral.reclamo_entrante_id,
        reclamoId: resultadoGeneral.reclamo_id,
        clasificacionId: resultadoGeneral.clasificacion_id,
        usuarioAsignadoId: resultadoGeneral.usuario_asignado_id,
      });
    }

    await marcarControlProcesado({
      controlId: comentario.control_id,
      estadoDerivacion: resultadoCaso.accion,
      casoDerivacionId: resultadoCaso.caso.id,
      reclamoEntranteId: resultadoGeneral.reclamo_entrante_id,
      reclamoId: resultadoGeneral.reclamo_id,
      clasificacionId: resultadoGeneral.clasificacion_id,
      tipoIncidencia: catalogo.tipo_incidencia,
      areaDerivacion: catalogo.area_derivacion,
      prioridad: catalogo.prioridad,
      decisionDerivador: resultadoCaso.accion,
      motivoDecision: analisis.motivo_decision,
    });

    return {
      ok: true,
      control_id: comentario.control_id,
      comentario_negativo_id: comentario.comentario_negativo_id,
      usuario_comentario: comentario.usuario_comentario,
      estado_control: resultadoCaso.accion,
      caso_derivacion_id: resultadoCaso.caso.id,
      tipo_incidencia: catalogo.tipo_incidencia,
      area_derivacion: catalogo.area_derivacion,
      prioridad: catalogo.prioridad,
      reclamo_id: resultadoGeneral.reclamo_id,
      usuario_asignado_id: resultadoGeneral.usuario_asignado_id,
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
  procesarComentarioPendiente,
};