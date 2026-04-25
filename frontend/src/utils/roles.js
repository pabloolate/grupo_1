export const ROLES = {
  ADMINISTRADOR: 'ADMINISTRADOR',
  VISOR: 'VISOR',
  TRABAJADOR: 'TRABAJADOR',
};

export function puedeAdministrarUsuarios(rol) {
  return rol === ROLES.ADMINISTRADOR;
}

export function puedeModificarReclamos(rol) {
  return rol === ROLES.ADMINISTRADOR || rol === ROLES.TRABAJADOR;
}
