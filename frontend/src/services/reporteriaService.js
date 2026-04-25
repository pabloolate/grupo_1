import { reporteriaApi } from './api.js';

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
