import { NavLink } from 'react-router-dom';
import { obtenerPerfil, obtenerRol } from '../../utils/auth.js';
import { puedeVerMetricas, puedeVerUsuarios } from '../../utils/roles.js';

const LOGO_URL = 'https://play-lh.googleusercontent.com/2zDxAYwsqY1jPDmvrrL6Iz3FsZ7pO68yR3P1Zd1kmyj8u9irOvgb-eW36U70u9rqWiE';

export default function Sidebar() {
  const rol = obtenerRol();
  const perfil = obtenerPerfil();
  const mostrarMetricas = puedeVerMetricas(rol, perfil);
  const mostrarUsuarios = puedeVerUsuarios(rol);

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark image-mark">
          <img src={LOGO_URL} alt="Logo reclamos" />
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
