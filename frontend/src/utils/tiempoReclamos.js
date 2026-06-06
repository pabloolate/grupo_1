import { leerCampo } from './campos.js';

export const ESTADOS_TIEMPO = [
  'CRITICO',
  'VENCIDO',
  'PROXIMO_A_VENCER',
  'EN_PLAZO',
  'NUEVO',
];

export const ETIQUETAS_ESTADO_TIEMPO = {
  TODOS: 'Todos',
  CRITICO: 'Críticos',
  VENCIDO: 'Vencidos',
  PROXIMO_A_VENCER: 'Próximos a vencer',
  EN_PLAZO: 'En plazo',
  NUEVO: 'Nuevos',
};

export const PLATAFORMAS_OPERATIVAS = ['instagram', 'tiktok'];

const ORDEN_ESTADO_TIEMPO = {
  CRITICO: 1,
  VENCIDO: 2,
  PROXIMO_A_VENCER: 3,
  EN_PLAZO: 4,
  NUEVO: 5,
};

export function normalizarTexto(valor) {
  return String(valor ?? '').trim();
}

export function normalizarClave(valor) {
  return normalizarTexto(valor).toUpperCase();
}

export function normalizarPlataforma(valor) {
  return normalizarTexto(valor).toLowerCase();
}

export function leer(obj, nombres, valorInicial = '') {
  return leerCampo(obj, nombres, valorInicial);
}

export function leerEstadoTiempo(caso) {
  return normalizarClave(leer(caso, ['estadoTiempo', 'estado_tiempo']));
}

export function leerPlataforma(caso) {
  return normalizarPlataforma(leer(caso, ['plataforma']));
}

export function leerNumero(caso, nombres) {
  const valor = Number(leer(caso, nombres, 0));
  return Number.isFinite(valor) ? valor : 0;
}

export function contarPorEstadoTiempo(casos) {
  const conteo = Object.fromEntries(ESTADOS_TIEMPO.map((estado) => [estado, 0]));

  for (const caso of Array.isArray(casos) ? casos : []) {
    const estado = leerEstadoTiempo(caso);
    if (Object.prototype.hasOwnProperty.call(conteo, estado)) {
      conteo[estado] += 1;
    }
  }

  return conteo;
}

export function contarPorPlataforma(casos) {
  const conteo = { instagram: 0, tiktok: 0 };

  for (const caso of Array.isArray(casos) ? casos : []) {
    const plataforma = leerPlataforma(caso);
    if (Object.prototype.hasOwnProperty.call(conteo, plataforma)) {
      conteo[plataforma] += 1;
    }
  }

  return conteo;
}

export function ordenarCasosPorTiempo(casos) {
  return [...(Array.isArray(casos) ? casos : [])].sort((a, b) => {
    const estadoA = ORDEN_ESTADO_TIEMPO[leerEstadoTiempo(a)] || 99;
    const estadoB = ORDEN_ESTADO_TIEMPO[leerEstadoTiempo(b)] || 99;
    if (estadoA !== estadoB) return estadoA - estadoB;

    const diasA = leerNumero(a, ['diasHabilesTranscurridos', 'dias_habiles_transcurridos']);
    const diasB = leerNumero(b, ['diasHabilesTranscurridos', 'dias_habiles_transcurridos']);
    if (diasA !== diasB) return diasB - diasA;

    const fechaA = new Date(leer(a, ['fechaPrimerEvento', 'fecha_primer_evento'], '')).getTime() || 0;
    const fechaB = new Date(leer(b, ['fechaPrimerEvento', 'fecha_primer_evento'], '')).getTime() || 0;
    return fechaA - fechaB;
  });
}

export function filtrarCasosTemporales(casos, filtros = {}) {
  const estadoTiempo = normalizarClave(filtros.estadoTiempo || 'TODOS');
  const plataforma = normalizarPlataforma(filtros.plataforma || 'todas');
  const busqueda = normalizarTexto(filtros.busqueda).toLowerCase();

  return ordenarCasosPorTiempo((Array.isArray(casos) ? casos : []).filter((caso) => {
    if (estadoTiempo !== 'TODOS' && leerEstadoTiempo(caso) !== estadoTiempo) return false;
    if (plataforma !== 'todas' && leerPlataforma(caso) !== plataforma) return false;

    if (!busqueda) return true;

    const texto = [
      leer(caso, ['usuarioComentario', 'usuario_comentario']),
      leer(caso, ['tipoIncidencia', 'tipo_incidencia']),
      leer(caso, ['areaDerivacion', 'area_derivacion']),
      leer(caso, ['prioridad']),
      leer(caso, ['plataforma']),
    ].join(' ').toLowerCase();

    return texto.includes(busqueda);
  }));
}
