const CATEGORIAS_PERMITIDAS = new Set([
  'INTERNET',
  'TELEVISION',
  'TELEFONIA',
  'FACTURACION',
  'CORTE_SERVICIO',
  'MALA_ATENCION',
  'SOPORTE_DIGITAL',
  'BAJA_SERVICIO',
  'INSTALACION',
  'POSTVENTA',
  'OTRO',
]);

const PRIORIDADES_PERMITIDAS = new Set(['BAJA', 'MEDIA', 'ALTA', 'CRITICA']);

const DECISIONES_PERMITIDAS = new Set([
  'RESUELTO_IA',
  'DERIVADO_HUMANO',
  'ESCALADO_OPERACIONES',
  'ESCALADO_GERENCIA',
  'DESCARTADO',
]);

const PERFILES_PERMITIDOS = new Set([
  'ATENCION_CLIENTE',
  'POSTVENTA',
  'OPERACIONES',
  'GERENCIA',
  'NINGUNO',
]);

function normalizarTextoEnum(valor, defecto) {
  if (valor === undefined || valor === null) {
    return defecto;
  }

  return String(valor)
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');
}

function limitarTexto(valor, maximo, defecto = '') {
  const texto = String(valor || defecto).trim();

  if (texto.length <= maximo) {
    return texto;
  }

  return texto.slice(0, maximo);
}

function normalizarBooleano(valor, defecto = false) {
  if (typeof valor === 'boolean') {
    return valor;
  }

  if (valor === undefined || valor === null || valor === '') {
    return defecto;
  }

  return ['true', '1', 'si', 'sí', 'yes'].includes(String(valor).toLowerCase());
}

function normalizarConfianza(valor) {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return 0.5;
  }

  if (numero < 0) {
    return 0;
  }

  if (numero > 1) {
    return 1;
  }

  return numero;
}

function normalizarAnalisisIa(analisisOriginal) {
  const categoria = normalizarTextoEnum(analisisOriginal.categoria, 'OTRO');
  const prioridad = normalizarTextoEnum(analisisOriginal.prioridad, 'MEDIA');
  let decision = normalizarTextoEnum(analisisOriginal.decision_derivador, 'DERIVADO_HUMANO');
  let perfil = normalizarTextoEnum(analisisOriginal.perfil_destino, 'ATENCION_CLIENTE');

  const categoriaFinal = CATEGORIAS_PERMITIDAS.has(categoria) ? categoria : 'OTRO';
  const prioridadFinal = PRIORIDADES_PERMITIDAS.has(prioridad) ? prioridad : 'MEDIA';

  decision = DECISIONES_PERMITIDAS.has(decision) ? decision : 'DERIVADO_HUMANO';
  perfil = PERFILES_PERMITIDOS.has(perfil) ? perfil : 'ATENCION_CLIENTE';

  let requiereHumano = normalizarBooleano(
    analisisOriginal.requiere_atencion_humana,
    decision !== 'RESUELTO_IA'
  );

  const categoriasSiempreHumanas = new Set([
    'INTERNET',
    'TELEVISION',
    'TELEFONIA',
    'FACTURACION',
    'CORTE_SERVICIO',
    'BAJA_SERVICIO',
    'INSTALACION',
  ]);

  const prioridadAltaOCritica = prioridadFinal === 'ALTA' || prioridadFinal === 'CRITICA';
  const categoriaOperativa = categoriasSiempreHumanas.has(categoriaFinal);
  const malaAtencionAlta = categoriaFinal === 'MALA_ATENCION' && prioridadAltaOCritica;

  // Regla dura: estos casos nunca se resuelven solo con IA,
  // aunque el modelo devuelva requiere_atencion_humana=false.
  if (prioridadAltaOCritica || categoriaOperativa || malaAtencionAlta) {
    requiereHumano = true;

    if (decision === 'RESUELTO_IA') {
      decision = 'DERIVADO_HUMANO';
    }

    if (perfil === 'NINGUNO') {
      if (
        categoriaFinal === 'FACTURACION' ||
        categoriaFinal === 'BAJA_SERVICIO' ||
        categoriaFinal === 'POSTVENTA'
      ) {
        perfil = 'POSTVENTA';
      } else {
        perfil = 'ATENCION_CLIENTE';
      }
    }
  }

  // Regla dura: escalados siempre son humanos.
  if (decision === 'ESCALADO_OPERACIONES') {
    perfil = 'OPERACIONES';
    requiereHumano = true;
  }

  if (decision === 'ESCALADO_GERENCIA') {
    perfil = 'GERENCIA';
    requiereHumano = true;
  }

  // Regla dura: descartados no requieren humano.
  if (decision === 'DESCARTADO') {
    perfil = 'NINGUNO';
    requiereHumano = false;
  }

  // RESUELTO_IA solo se permite si no requiere humano, no tiene prioridad alta/crítica,
  // y no pertenece a categorías operativas.
  const puedeResolverIa =
    decision === 'RESUELTO_IA' &&
    requiereHumano === false &&
    !prioridadAltaOCritica &&
    !categoriaOperativa &&
    !malaAtencionAlta;

  if (puedeResolverIa) {
    perfil = 'NINGUNO';
    requiereHumano = false;
  } else if (decision === 'RESUELTO_IA') {
    decision = 'DERIVADO_HUMANO';
    requiereHumano = true;

    if (perfil === 'NINGUNO') {
      perfil = categoriaFinal === 'FACTURACION' || categoriaFinal === 'BAJA_SERVICIO'
        ? 'POSTVENTA'
        : 'ATENCION_CLIENTE';
    }
  }

  // Si requiere humano pero quedó sin perfil válido, lo corregimos.
  if (requiereHumano && perfil === 'NINGUNO') {
    perfil = categoriaFinal === 'FACTURACION' || categoriaFinal === 'BAJA_SERVICIO'
      ? 'POSTVENTA'
      : 'ATENCION_CLIENTE';
  }

  return {
    es_reclamo_valido: normalizarBooleano(analisisOriginal.es_reclamo_valido, true),
    decision_derivador: decision,
    categoria: categoriaFinal,
    prioridad: prioridadFinal,
    perfil_destino: perfil,
    requiere_atencion_humana: requiereHumano,
    agresividad: limitarTexto(normalizarTextoEnum(analisisOriginal.agresividad, 'MEDIA'), 40),
    riesgo_reputacional: limitarTexto(normalizarTextoEnum(analisisOriginal.riesgo_reputacional, 'MEDIO'), 40),
    riesgo_legal: limitarTexto(normalizarTextoEnum(analisisOriginal.riesgo_legal, 'BAJO'), 40),
    resumen: limitarTexto(analisisOriginal.resumen, 2000, 'Reclamo detectado desde canal digital.'),
    respuesta_sugerida: limitarTexto(
      analisisOriginal.respuesta_sugerida,
      4000,
      'Hola, lamentamos la situación. Para ayudarte necesitamos que nos escribas por mensaje privado con tus datos.'
    ),
    motivo_decision: limitarTexto(
      analisisOriginal.motivo_decision,
      2000,
      'Decisión generada por el motor de derivación.'
    ),
    confianza: normalizarConfianza(analisisOriginal.confianza),
    json_respuesta_ia: analisisOriginal,
  };
}

module.exports = {
  normalizarAnalisisIa,
};