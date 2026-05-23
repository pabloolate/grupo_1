export const PERFILES = {
  ATENCION_CLIENTE: 'ATENCION_CLIENTE',
  POSTVENTA: 'POSTVENTA',
  OPERACIONES: 'OPERACIONES',
  GERENCIA: 'GERENCIA',
  SOPORTE_TECNICO: 'SOPORTE_TECNICO',
  OTRO: 'OTRO',
};

export const PERFILES_OPERATIVOS = [
  PERFILES.GERENCIA,
  PERFILES.ATENCION_CLIENTE,
  PERFILES.POSTVENTA,
  PERFILES.OPERACIONES,
  PERFILES.SOPORTE_TECNICO,
];

export function normalizarPerfil(perfil) {
  return String(perfil || '').trim().toUpperCase();
}

export function etiquetaPerfil(perfil) {
  const normalizado = normalizarPerfil(perfil);

  const mapa = {
    GERENCIA: 'Gerencia',
    ATENCION_CLIENTE: 'Atención Cliente',
    POSTVENTA: 'Postventa',
    OPERACIONES: 'Operaciones',
    SOPORTE_TECNICO: 'Soporte Técnico',
    OTRO: 'Otro',
  };

  return mapa[normalizado] || normalizado || 'Sin perfil';
}

export function areaDesdePerfil(perfil) {
  const normalizado = normalizarPerfil(perfil);

  if (normalizado === 'GERENCIA') return null;
  if (normalizado === 'ATENCION_CLIENTE') return 'ATENCION_CLIENTE';
  if (normalizado === 'POSTVENTA') return 'POSTVENTA';
  if (normalizado === 'OPERACIONES') return 'OPERACIONES';
  if (normalizado === 'SOPORTE_TECNICO') return 'SOPORTE_TECNICO';

  return null;
}

export function descripcionPerfil(perfil) {
  const normalizado = normalizarPerfil(perfil);

  const mapa = {
    GERENCIA: 'Vista global: reclamos críticos, áreas cargadas, usuarios con más eventos y acceso a métricas.',
    ATENCION_CLIENTE: 'Ve reclamos generales, mala atención, soporte digital y casos no clasificados derivados a Atención Cliente.',
    POSTVENTA: 'Ve cobros, facturación, pagos no reconocidos y bajas de servicio.',
    OPERACIONES: 'Ve técnico no asiste, instalación pendiente y casos operativos relacionados con terreno.',
    SOPORTE_TECNICO: 'Ve problemas de internet, WiFi/router, TV cable, telefonía y cortes de servicio.',
    OTRO: 'Vista limitada a reclamos asociados al perfil disponible.',
  };

  return mapa[normalizado] || mapa.OTRO;
}

export function tiposClavePorPerfil(perfil) {
  const normalizado = normalizarPerfil(perfil);

  const mapa = {
    GERENCIA: ['Riesgo legal/reputacional', 'Críticos', 'Alta prioridad', 'Todas las áreas'],
    ATENCION_CLIENTE: ['Mala atención', 'Soporte digital', 'Reclamo general', 'No clasificado'],
    POSTVENTA: ['Cobro indebido', 'Facturación', 'Pago no reconocido', 'Baja servicio'],
    OPERACIONES: ['Técnico no asiste', 'Instalación pendiente'],
    SOPORTE_TECNICO: ['Sin servicio internet', 'Intermitencia', 'WiFi/router', 'TV cable', 'Telefonía'],
    OTRO: ['Reclamos asignados al perfil'],
  };

  return mapa[normalizado] || mapa.OTRO;
}

export function tonoPerfil(perfil) {
  const normalizado = normalizarPerfil(perfil);

  const mapa = {
    GERENCIA: 'red',
    ATENCION_CLIENTE: 'green',
    POSTVENTA: 'violet',
    OPERACIONES: 'amber',
    SOPORTE_TECNICO: 'blue',
  };

  return mapa[normalizado] || 'cyan';
}
