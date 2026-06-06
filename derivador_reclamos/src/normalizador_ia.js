const TIPOS_INCIDENCIA_PERMITIDOS = new Set([
  'SIN_SERVICIO_INTERNET',
  'INTERMITENCIA_INTERNET',
  'BAJA_VELOCIDAD',
  'PROBLEMA_WIFI_ROUTER',
  'PROBLEMA_TV_CABLE',
  'PROBLEMA_TELEFONIA',
  'COBRO_INDEBIDO',
  'PROBLEMA_FACTURACION',
  'PAGO_NO_RECONOCIDO',
  'MALA_ATENCION',
  'TECNICO_NO_ASISTE',
  'INSTALACION_PENDIENTE',
  'BAJA_SERVICIO',
  'CORTE_SERVICIO',
  'SOPORTE_DIGITAL',
  'RIESGO_LEGAL_REPUTACIONAL',
  'RECLAMO_GENERAL',
  'NO_CLASIFICADO',
]);

function normalizarTextoEnum(valor) {
  if (valor === undefined || valor === null || valor === '') {
    return '';
  }

  return String(valor)
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function limitarTexto(valor, maximo) {
  const texto = String(valor || '').trim();

  if (!texto) {
    throw new Error('La respuesta IA no trae motivo_decision válido.');
  }

  return texto.length <= maximo ? texto : texto.slice(0, maximo);
}

function exigirBooleano(valor, nombreCampo) {
  if (typeof valor !== 'boolean') {
    throw new Error(`La respuesta IA debe traer ${nombreCampo} como booleano.`);
  }

  return valor;
}

function normalizarConfianza(valor) {
  const numero = Number(valor);

  if (!Number.isFinite(numero) || numero < 0 || numero > 1) {
    throw new Error('La respuesta IA debe traer confianza numérica entre 0 y 1.');
  }

  return numero;
}

function resolverTipoIncidencia(analisisOriginal = {}) {
  const tipoIncidencia = normalizarTextoEnum(analisisOriginal.tipo_incidencia);

  if (!tipoIncidencia) {
    throw new Error('La respuesta IA no trae tipo_incidencia.');
  }

  if (!TIPOS_INCIDENCIA_PERMITIDOS.has(tipoIncidencia)) {
    throw new Error(`tipo_incidencia no permitido por catálogo fijo: ${tipoIncidencia}`);
  }

  return tipoIncidencia;
}

function normalizarAnalisisIa(analisisOriginal = {}) {
  const esReclamoValido = exigirBooleano(analisisOriginal.es_reclamo_valido, 'es_reclamo_valido');
  const tipoIncidencia = resolverTipoIncidencia(analisisOriginal);

  if (!esReclamoValido && tipoIncidencia !== 'NO_CLASIFICADO') {
    throw new Error('Si es_reclamo_valido=false, tipo_incidencia debe ser NO_CLASIFICADO.');
  }

  return {
    es_reclamo_valido: esReclamoValido,
    tipo_incidencia: tipoIncidencia,
    motivo_decision: limitarTexto(analisisOriginal.motivo_decision, 2000),
    confianza: normalizarConfianza(analisisOriginal.confianza),
    json_respuesta_ia: analisisOriginal,
  };
}

module.exports = {
  TIPOS_INCIDENCIA_PERMITIDOS,
  normalizarAnalisisIa,
  normalizarTextoEnum,
  limitarTexto,
  normalizarConfianza,
};
