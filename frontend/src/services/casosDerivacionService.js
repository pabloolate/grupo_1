import { reclamosApi } from './api.js';

function extraerLista(data, claves = []) {
  if (Array.isArray(data)) return data;
  for (const clave of claves) {
    if (Array.isArray(data?.[clave])) return data[clave];
  }
  return data?.content || data?.datos || data?.items || [];
}

export async function listarCasosDerivacion(params = {}) {
  const { data } = await reclamosApi.get('/casos-derivacion', { params });
  return extraerLista(data, ['casos', 'casosDerivacion', 'casos_derivacion']);
}

export async function obtenerCasoDerivacion(id) {
  const { data } = await reclamosApi.get(`/casos-derivacion/${id}`);
  return data;
}

export async function obtenerComentariosCasoDerivacion(id) {
  const { data } = await reclamosApi.get(`/casos-derivacion/${id}/comentarios`);
  return extraerLista(data, ['comentarios', 'evidencias']);
}

export async function cambiarEstadoCasoDerivacion(id, estadoCaso) {
  const { data } = await reclamosApi.patch(`/casos-derivacion/${id}/estado`, {
    estadoCaso,
    estado_caso: estadoCaso,
  });
  return data;
}

export async function asignarCasoDerivacion(id, usuarioId = null) {
  const payload = usuarioId ? { usuarioId, usuario_id: usuarioId } : {};
  const { data } = await reclamosApi.patch(`/casos-derivacion/${id}/asignar`, payload);
  return data;
}

export async function listarCatalogoTiposIncidencia() {
  const { data } = await reclamosApi.get('/casos-derivacion/catalogo-tipos');
  return extraerLista(data, ['tipos', 'catalogo']);
}
