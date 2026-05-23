export const ROLES = {
  ADMINISTRADOR: 'ADMINISTRADOR',
  VISOR: 'VISOR',
  TRABAJADOR: 'TRABAJADOR',
};

export function normalizarRol(rol) {
  return String(rol || '').trim().toUpperCase();
}

export function normalizarPerfil(perfil) {
  return String(perfil || '').trim().toUpperCase();
}

export function puedeAdministrarUsuarios(rol) {
  return normalizarRol(rol) === ROLES.ADMINISTRADOR;
}

export function puedeModificarReclamos(rol) {
  return normalizarRol(rol) === ROLES.ADMINISTRADOR || normalizarRol(rol) === ROLES.TRABAJADOR;
}

export function esJefatura(rol, perfil) {
  const rolNormalizado = normalizarRol(rol);
  const perfilNormalizado = normalizarPerfil(perfil);

  return (
    rolNormalizado === ROLES.ADMINISTRADOR ||
    perfilNormalizado === 'GERENCIA'
  );
}

export function puedeVerMetricas(rol, perfil) {
  return esJefatura(rol, perfil);
}

export function puedeVerUsuarios(rol) {
  return puedeAdministrarUsuarios(rol);
}

export function etiquetaRol(rol) {
  const normalizado = normalizarRol(rol);

  const mapa = {
    ADMINISTRADOR: 'Administrador',
    TRABAJADOR: 'Trabajador',
    VISOR: 'Visor',
  };

  return mapa[normalizado] || normalizado || 'Sin rol';
}
