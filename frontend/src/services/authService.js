import { authApi } from './api.js';

export async function login(correo, password) {
  const { data } = await authApi.post('/auth/login', { correo, password });
  return data;
}

export async function obtenerMe() {
  const { data } = await authApi.get('/auth/me');
  return data;
}

export async function listarUsuarios() {
  const { data } = await authApi.get('/usuarios');
  return data;
}

export async function crearUsuario(payload) {
  const { data } = await authApi.post('/usuarios', payload);
  return data;
}

export async function actualizarUsuario(id, payload) {
  const { data } = await authApi.put(`/usuarios/${id}`, payload);
  return data;
}

export async function eliminarUsuario(id) {
  const { data } = await authApi.delete(`/usuarios/${id}`);
  return data;
}
