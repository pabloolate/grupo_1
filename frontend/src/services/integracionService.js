import { integracionApi } from './api.js';

export async function listarCanales() {
  const { data } = await integracionApi.get('/integracion/canales');
  return data;
}

export async function listarEntrantes() {
  const { data } = await integracionApi.get('/integracion/entrantes');
  return data;
}

export async function crearReclamoFormulario(payload) {
  const { data } = await integracionApi.post('/integracion/formulario', payload);
  return data;
}
