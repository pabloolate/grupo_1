const TOKEN_KEY = 'gcr_token';
const USER_KEY = 'gcr_usuario';

export function guardarSesion(loginResponse) {
  const token = loginResponse?.token || loginResponse?.jwt || loginResponse?.accessToken || '';
  const usuario = loginResponse?.usuario || loginResponse?.user || loginResponse || {};

  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  localStorage.setItem(USER_KEY, JSON.stringify(usuario));
}

export function obtenerToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function obtenerUsuario() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

export function sesionActiva() {
  return Boolean(obtenerToken() || obtenerUsuario());
}

export function cerrarSesion() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function obtenerRol() {
  const usuario = obtenerUsuario();
  return usuario?.rol || usuario?.rolNombre || usuario?.nombreRol || usuario?.role || '';
}

export function obtenerPerfil() {
  const usuario = obtenerUsuario();
  return usuario?.perfil || usuario?.perfilNombre || usuario?.nombrePerfil || '';
}
