import { reporteriaApi } from './api.js';

function extraerLista(data, claves = []) {
  if (Array.isArray(data)) return data;
  for (const clave of claves) {
    if (Array.isArray(data?.[clave])) return data[clave];
  }
  return data?.content || data?.datos || data?.items || [];
}

export async function obtenerResumen() {
  const { data } = await reporteriaApi.get('/reporteria/resumen');
  return data;
}

export async function obtenerDashboard() {
  const { data } = await reporteriaApi.get('/reporteria/dashboard');
  return data;
}

export async function obtenerPorEstado() {
  const { data } = await reporteriaApi.get('/reporteria/reclamos-por-estado');
  return data;
}

export async function obtenerPorCanal() {
  const { data } = await reporteriaApi.get('/reporteria/reclamos-por-canal');
  return data;
}

export async function obtenerPorPrioridad() {
  const { data } = await reporteriaApi.get('/reporteria/reclamos-por-prioridad');
  return data;
}

export async function obtenerPorCategoria() {
  const { data } = await reporteriaApi.get('/reporteria/reclamos-por-categoria');
  return data;
}

export async function obtenerDashboardCasos() {
  const { data } = await reporteriaApi.get('/reporteria/casos/dashboard');
  return data;
}

export async function obtenerResumenCasos() {
  const { data } = await reporteriaApi.get('/reporteria/casos/resumen');
  return data;
}

export async function obtenerCasosPorEstado() {
  const { data } = await reporteriaApi.get('/reporteria/casos/por-estado');
  return extraerLista(data, ['datos', 'estados']);
}

export async function obtenerCasosPorArea() {
  const { data } = await reporteriaApi.get('/reporteria/casos/por-area');
  return extraerLista(data, ['datos', 'areas']);
}

export async function obtenerCasosPorPrioridad() {
  const { data } = await reporteriaApi.get('/reporteria/casos/por-prioridad');
  return extraerLista(data, ['datos', 'prioridades']);
}

export async function obtenerCasosPorTipoIncidencia() {
  const { data } = await reporteriaApi.get('/reporteria/casos/por-tipo-incidencia');
  return extraerLista(data, ['datos', 'tipos']);
}

export async function obtenerUsuariosTopCasos() {
  const { data } = await reporteriaApi.get('/reporteria/casos/usuarios-top');
  return extraerLista(data, ['datos', 'usuarios']);
}
