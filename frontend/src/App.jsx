import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import ProtectedMetricas from './components/layout/ProtectedMetricas.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Reclamos from './pages/Reclamos.jsx';
import CasoDerivacionDetalle from './pages/CasoDerivacionDetalle.jsx';
import UsuarioReclamanteDetalle from './pages/UsuarioReclamanteDetalle.jsx';
import Usuarios from './pages/Usuarios.jsx';
import Reporteria from './pages/Reporteria.jsx';
import NoAutorizado from './pages/NoAutorizado.jsx';
import './App.css';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/no-autorizado" element={<NoAutorizado />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="reclamos" element={<Reclamos />} />
        <Route path="reclamos/:usuario" element={<UsuarioReclamanteDetalle />} />
        <Route path="reclamos/:usuario/casos/:id" element={<CasoDerivacionDetalle />} />
        <Route path="usuarios-reclamantes" element={<Navigate to="/reclamos" replace />} />
        <Route path="usuarios-reclamantes/:usuario" element={<Navigate to="/reclamos/:usuario" replace />} />
        <Route path="casos-derivacion" element={<Navigate to="/reclamos" replace />} />
        <Route path="casos-derivacion/:id" element={<CasoDerivacionDetalle />} />
        <Route path="reporteria" element={<ProtectedMetricas><Reporteria /></ProtectedMetricas>} />
        <Route path="usuarios" element={<Usuarios />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
