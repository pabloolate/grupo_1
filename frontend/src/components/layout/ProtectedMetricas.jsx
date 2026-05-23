import { Navigate } from 'react-router-dom';
import { obtenerPerfil, obtenerRol } from '../../utils/auth.js';
import { puedeVerMetricas } from '../../utils/roles.js';

export default function ProtectedMetricas({ children }) {
  const rol = obtenerRol();
  const perfil = obtenerPerfil();

  if (!puedeVerMetricas(rol, perfil)) {
    return <Navigate to="/no-autorizado" replace />;
  }

  return children;
}
