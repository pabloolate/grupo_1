import { useEffect, useState } from 'react';
import Card from '../components/ui/Card.jsx';
import Loading from '../components/ui/Loading.jsx';
import ErrorBox from '../components/ui/ErrorBox.jsx';
import { obtenerDashboard, obtenerResumen } from '../services/reporteriaService.js';

function leer(obj, nombres, fallback = 0) {
  for (const nombre of nombres) {
    if (obj?.[nombre] !== undefined && obj?.[nombre] !== null) return obj[nombre];
  }
  return fallback;
}

export default function Dashboard() {
  const [resumen, setResumen] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function cargar() {
      try {
        const [resumenData, dashboardData] = await Promise.all([
          obtenerResumen().catch(() => null),
          obtenerDashboard().catch(() => null),
        ]);
        setResumen(resumenData);
        setDashboard(dashboardData);
      } catch (err) {
        setError(err);
      } finally {
        setCargando(false);
      }
    }

    cargar();
  }, []);

  if (cargando) return <Loading />;

  const base = resumen || dashboard || {};

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Resumen operativo de reclamos centralizados.</p>
        </div>
      </div>

      <ErrorBox error={error} />

      <div className="grid-cards">
        <Card title="Total reclamos" value={leer(base, ['totalReclamos', 'total_reclamos', 'total'])} subtitle="Casos registrados" />
        <Card title="Abiertos" value={leer(base, ['reclamosAbiertos', 'reclamos_abiertos', 'abiertos'])} subtitle="Pendientes o en proceso" />
        <Card title="Cerrados" value={leer(base, ['reclamosCerrados', 'reclamos_cerrados', 'cerrados'])} subtitle="Finalizados" />
        <Card title="Derivados" value={leer(base, ['reclamosDerivados', 'reclamos_derivados', 'derivados'])} subtitle="Requieren atención específica" />
      </div>

      <section className="panel">
        <h3>Lectura ejecutiva</h3>
        <p>
          El sistema ya centraliza reclamos, usuarios internos, canales, estados, prioridades y clasificación IA demo.
          Este dashboard consume el microservicio de reportería y permite mostrar el estado general de la operación.
        </p>
      </section>
    </div>
  );
}
