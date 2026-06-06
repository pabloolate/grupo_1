import { NavLink } from 'react-router-dom';
import { obtenerPerfil, obtenerRol } from '../../utils/auth.js';
import { puedeVerMetricas, puedeVerUsuarios } from '../../utils/roles.js';


export default function Sidebar() {
  const rol = obtenerRol();
  const perfil = obtenerPerfil();
  const mostrarMetricas = puedeVerMetricas(rol, perfil);
  const mostrarUsuarios = puedeVerUsuarios(rol);

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <span>R</span>
        </div>
        <div>
          <h1>Reclamos</h1>
          <p>Derivación social</p>
        </div>
      </div>

      <nav className="side-nav">
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/reclamos">Reclamos</NavLink>
        {mostrarMetricas && <NavLink to="/reporteria">Métricas</NavLink>}
        {mostrarUsuarios && <NavLink to="/usuarios">Usuarios</NavLink>}
      </nav>
    </aside>
  );
}
