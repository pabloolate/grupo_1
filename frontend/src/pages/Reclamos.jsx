import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ErrorBox from '../components/ui/ErrorBox.jsx';
import Loading from '../components/ui/Loading.jsx';
import ReclamoTable from '../components/reclamos/ReclamoTable.jsx';
import { listarReclamos } from '../services/reclamosService.js';
import { obtenerRol } from '../utils/auth.js';
import { ROLES } from '../utils/roles.js';

export default function Reclamos() {
  const [reclamos, setReclamos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const rol = obtenerRol();
  const puedeCrear = rol === ROLES.ADMINISTRADOR || rol === ROLES.TRABAJADOR;

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const data = await listarReclamos();
      setReclamos(Array.isArray(data) ? data : data?.content || data?.reclamos || []);
    } catch (err) {
      setError(err);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Reclamos</h2>
          <p>Listado de casos registrados en la plataforma.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={cargar}>Actualizar</button>
          {puedeCrear && <Link className="btn btn-primary" to="/reclamos/nuevo">Nuevo reclamo</Link>}
        </div>
      </div>

      <ErrorBox error={error} />
      {cargando ? <Loading /> : <ReclamoTable reclamos={reclamos} />}
    </div>
  );
}
