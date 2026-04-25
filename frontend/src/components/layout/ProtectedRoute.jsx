import { Navigate } from 'react-router-dom';
import { sesionActiva } from '../../utils/auth.js';

export default function ProtectedRoute({ children }) {
  if (!sesionActiva()) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
