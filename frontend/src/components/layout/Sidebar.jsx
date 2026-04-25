import { NavLink } from 'react-router-dom';
import { obtenerRol } from '../../utils/auth.js';
import { ROLES, puedeAdministrarUsuarios } from '../../utils/roles.js';

export default function Sidebar() {
  const rol = obtenerRol();
  const mostrarUsuarios = puedeAdministrarUsuarios(rol);
  const puedeCrear = rol === ROLES.ADMINISTRADOR || rol === ROLES.TRABAJADOR;

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">GCR</div>
        <div>
          <h1>Reclamos</h1>
          <p>Gestión centralizada</p>
        </div>
      </div>

      <nav className="side-nav">
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/reclamos">Reclamos</NavLink>
        {puedeCrear && <NavLink to="/reclamos/nuevo">Nuevo reclamo</NavLink>}
        {mostrarUsuarios && <NavLink to="/usuarios">Usuarios</NavLink>}
        <NavLink to="/reporteria">Reportería</NavLink>
      </nav>
    </aside>
  );
}
