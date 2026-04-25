import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Reclamos from './pages/Reclamos.jsx';
import ReclamoDetalle from './pages/ReclamoDetalle.jsx';
import NuevoReclamo from './pages/NuevoReclamo.jsx';
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
        <Route path="reclamos/nuevo" element={<NuevoReclamo />} />
        <Route path="reclamos/:id" element={<ReclamoDetalle />} />
        <Route path="usuarios" element={<Usuarios />} />
        <Route path="reporteria" element={<Reporteria />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
