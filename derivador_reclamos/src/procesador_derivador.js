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

function crearResumenComentario(comentario) {
  const texto = String(comentario.texto_comentario || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);

  return {
    control_id: comentario.control_id,
    comentario_negativo_id: comentario.comentario_negativo_id,
    plataforma: comentario.plataforma,
    tipo_publicacion: comentario.tipo_publicacion,
    usuario_comentario: comentario.usuario_comentario,
    fecha_comentario: comentario.fecha_comentario,
    texto,
  };
}

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
  console.log('[derivador_reclamos] Buscando comentarios pendientes para procesar...');

  const pendientes = await obtenerComentariosPendientes({
    limite: config.derivador.loteProceso,
  });

  console.log('[derivador_reclamos] Pendientes encontrados para esta pasada:', pendientes.length);

  if (pendientes.length === 0) {
    console.log('[derivador_reclamos] No hay comentarios PENDIENTE para procesar.');
    return [];
  }

  const resultados = [];
  const inicioLote = Date.now();

  for (let indice = 0; indice < pendientes.length; indice += 1) {
    const comentario = pendientes[indice];
    const numeroActual = indice + 1;
    const inicioComentario = Date.now();

    console.log(
      `[derivador_reclamos] Procesando ${numeroActual}/${pendientes.length}:`,
      crearResumenComentario(comentario)
    );

    const resultado = await procesarComentarioPendiente(comentario);
    resultados.push(resultado);

    const segundosComentario = ((Date.now() - inicioComentario) / 1000).toFixed(2);
    const segundosLote = ((Date.now() - inicioLote) / 1000).toFixed(2);

    if (resultado.ok) {
      console.log(
        `[derivador_reclamos] OK ${numeroActual}/${pendientes.length} control=${resultado.control_id} comentario=${resultado.comentario_negativo_id} estado=${resultado.estado_control} tipo=${resultado.tipo_incidencia || ''} reclamo=${resultado.reclamo_id || ''} tiempo=${segundosComentario}s total=${segundosLote}s`
      );
    } else {
      console.log(
        `[derivador_reclamos] ERROR ${numeroActual}/${pendientes.length} control=${resultado.control_id} comentario=${resultado.comentario_negativo_id} error=${resultado.error} tiempo=${segundosComentario}s total=${segundosLote}s`
      );
    }
  }

  const totalOk = resultados.filter((resultado) => resultado.ok).length;
  const totalError = resultados.filter((resultado) => !resultado.ok).length;
  const totalSegundos = ((Date.now() - inicioLote) / 1000).toFixed(2);

  console.log(
    `[derivador_reclamos] Lote procesado. total=${resultados.length} ok=${totalOk} error=${totalError} tiempo_total=${totalSegundos}s`
  );

  return resultados;
}

module.exports = {
  procesarPendientes,
  procesarComentarioPendiente,
};