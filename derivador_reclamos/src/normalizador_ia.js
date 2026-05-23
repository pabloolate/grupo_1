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

const MAPA_CATEGORIA_ANTIGUA_A_TIPO = {
  INTERNET: 'SIN_SERVICIO_INTERNET',
  TELEVISION: 'PROBLEMA_TV_CABLE',
  TELEFONIA: 'PROBLEMA_TELEFONIA',
  FACTURACION: 'PROBLEMA_FACTURACION',
  CORTE_SERVICIO: 'CORTE_SERVICIO',
  MALA_ATENCION: 'MALA_ATENCION',
  SOPORTE_DIGITAL: 'SOPORTE_DIGITAL',
  BAJA_SERVICIO: 'BAJA_SERVICIO',
  INSTALACION: 'INSTALACION_PENDIENTE',
  POSTVENTA: 'PROBLEMA_FACTURACION',
  OTRO: 'RECLAMO_GENERAL',
};

function normalizarTextoEnum(valor, defecto) {
  if (valor === undefined || valor === null || valor === '') {
    return defecto;
  }

  return String(valor)
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function limitarTexto(valor, maximo, defecto = '') {
  const texto = String(valor || defecto).trim();
  return texto.length <= maximo ? texto : texto.slice(0, maximo);
}

function normalizarBooleano(valor, defecto = true) {
  if (typeof valor === 'boolean') return valor;
  if (valor === undefined || valor === null || valor === '') return defecto;

  return ['true', '1', 'si', 'sí', 'yes'].includes(String(valor).trim().toLowerCase());
}

function normalizarConfianza(valor) {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) return 0.5;
  if (numero < 0) return 0;
  if (numero > 1) return 1;

  return numero;
}

function resolverTipoIncidencia(analisisOriginal = {}) {
  const tipoDirecto = normalizarTextoEnum(analisisOriginal.tipo_incidencia, '');

  if (TIPOS_INCIDENCIA_PERMITIDOS.has(tipoDirecto)) {
    return tipoDirecto;
  }

  const categoriaAntigua = normalizarTextoEnum(analisisOriginal.categoria, '');

  if (MAPA_CATEGORIA_ANTIGUA_A_TIPO[categoriaAntigua]) {
    return MAPA_CATEGORIA_ANTIGUA_A_TIPO[categoriaAntigua];
  }

  return 'NO_CLASIFICADO';
}

function normalizarAnalisisIa(analisisOriginal = {}) {
  const esReclamoValido = normalizarBooleano(analisisOriginal.es_reclamo_valido, true);
  const tipoIncidencia = esReclamoValido ? resolverTipoIncidencia(analisisOriginal) : 'NO_CLASIFICADO';

  return {
    es_reclamo_valido: esReclamoValido,
    tipo_incidencia: tipoIncidencia,
    motivo_decision: limitarTexto(
      analisisOriginal.motivo_decision || analisisOriginal.resumen,
      2000,
      'Clasificación generada por el motor de derivación.'
    ),
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