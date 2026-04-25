import { reclamosApi } from './api.js';

export async function listarReclamos() {
  const { data } = await reclamosApi.get('/reclamos');
  return data;
}

export async function obtenerReclamo(id) {
  const { data } = await reclamosApi.get(`/reclamos/${id}`);
  return data;
}

export async function obtenerHistorial(id) {
  const { data } = await reclamosApi.get(`/reclamos/${id}/historial`);
  return data;
}

export async function obtenerComentarios(id) {
  const { data } = await reclamosApi.get(`/reclamos/${id}/comentarios`);
  return data;
}

export async function obtenerClasificacionIa(id) {
  const { data } = await reclamosApi.get(`/reclamos/${id}/clasificacion-ia`);
  return data;
}

export async function cambiarEstado(id, estadoId) {
  const { data } = await reclamosApi.patch(`/reclamos/${id}/estado`, { estadoId });
  return data;
}

export async function asignarReclamo(id, usuarioId) {
  const { data } = await reclamosApi.patch(`/reclamos/${id}/asignar`, { usuarioId });
  return data;
}

export async function agregarComentario(id, comentario) {
  const { data } = await reclamosApi.post(`/reclamos/${id}/comentarios`, { comentario });
  return data;
}
