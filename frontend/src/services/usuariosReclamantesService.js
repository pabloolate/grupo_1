import { reclamosApi } from './api.js';

function extraerLista(data, claves = []) {
  if (Array.isArray(data)) return data;
  for (const clave of claves) {
    if (Array.isArray(data?.[clave])) return data[clave];
  }
  return data?.content || data?.datos || data?.items || [];
}

export async function listarUsuariosReclamantes(params = {}) {
  const { data } = await reclamosApi.get('/usuarios-reclamantes', { params });
  return extraerLista(data, ['usuarios', 'usuariosReclamantes', 'usuarios_reclamantes']);
}

export async function obtenerCasosUsuarioReclamante(usuario) {
  const { data } = await reclamosApi.get(`/usuarios-reclamantes/${encodeURIComponent(usuario)}/casos`);
  return extraerLista(data, ['casos', 'casosDerivacion', 'casos_derivacion']);
}

export async function obtenerComentariosUsuarioReclamante(usuario) {
  const { data } = await reclamosApi.get(`/usuarios-reclamantes/${encodeURIComponent(usuario)}/comentarios`);
  return extraerLista(data, ['comentarios', 'evidencias']);
}
