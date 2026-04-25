import { useNavigate } from 'react-router-dom';
import { cerrarSesion, obtenerPerfil, obtenerRol, obtenerUsuario } from '../../utils/auth.js';

export default function Navbar() {
  const navigate = useNavigate();
  const usuario = obtenerUsuario();
  const rol = obtenerRol();
  const perfil = obtenerPerfil();

  function salir() {
    cerrarSesion();
    navigate('/login');
  }

  return (
    <header className="navbar">
      <div>
        <strong>{usuario?.nombre || usuario?.correo || 'Usuario'}</strong>
        <span className="navbar-subtitle">{rol || 'ROL'} · {perfil || 'PERFIL'}</span>
      </div>
      <button className="btn btn-secondary" onClick={salir}>Cerrar sesión</button>
    </header>
  );
}
