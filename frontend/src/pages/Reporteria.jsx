import { useEffect, useState } from 'react';
import ErrorBox from '../components/ui/ErrorBox.jsx';
import Loading from '../components/ui/Loading.jsx';
import Card from '../components/ui/Card.jsx';
import { obtenerPorCanal, obtenerPorCategoria, obtenerPorEstado, obtenerPorPrioridad, obtenerResumen } from '../services/reporteriaService.js';

function TablaSimple({ titulo, datos }) {
  const filas = Array.isArray(datos) ? datos : [];
  return (
    <section className="panel">
      <h3>{titulo}</h3>
      {filas.length === 0 ? <p>Sin datos.</p> : (
        <div className="table-wrap small-table">
          <table>
            <thead>
              <tr>
                {Object.keys(filas[0]).map((key) => <th key={key}>{key}</th>)}
              </tr>
            </thead>
            <tbody>
              {filas.map((fila, index) => (
                <tr key={index}>
                  {Object.values(fila).map((value, i) => <td key={i}>{String(value)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function leer(obj, nombres, fallback = 0) {
  for (const nombre of nombres) {
    if (obj?.[nombre] !== undefined && obj?.[nombre] !== null) return obj[nombre];
  }
  return fallback;
}

export default function Reporteria() {
  const [resumen, setResumen] = useState({});
  const [estado, setEstado] = useState([]);
  const [canal, setCanal] = useState([]);
  const [prioridad, setPrioridad] = useState([]);
  const [categoria, setCategoria] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function cargar() {
      try {
        const [r, e, c, p, cat] = await Promise.all([
          obtenerResumen().catch(() => ({})),
          obtenerPorEstado().catch(() => []),
          obtenerPorCanal().catch(() => []),
          obtenerPorPrioridad().catch(() => []),
          obtenerPorCategoria().catch(() => []),
        ]);
        setResumen(r || {});
        setEstado(Array.isArray(e) ? e : e?.datos || []);
        setCanal(Array.isArray(c) ? c : c?.datos || []);
        setPrioridad(Array.isArray(p) ? p : p?.datos || []);
        setCategoria(Array.isArray(cat) ? cat : cat?.datos || []);
      } catch (err) {
        setError(err);
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, []);

  if (cargando) return <Loading />;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Reportería</h2>
          <p>Métricas operativas calculadas desde los reclamos registrados.</p>
        </div>
      </div>

      <ErrorBox error={error} />

      <div className="grid-cards">
        <Card title="Total" value={leer(resumen, ['totalReclamos', 'total_reclamos', 'total'])} />
        <Card title="Abiertos" value={leer(resumen, ['reclamosAbiertos', 'reclamos_abiertos', 'abiertos'])} />
        <Card title="Cerrados" value={leer(resumen, ['reclamosCerrados', 'reclamos_cerrados', 'cerrados'])} />
        <Card title="Derivados" value={leer(resumen, ['reclamosDerivados', 'reclamos_derivados', 'derivados'])} />
      </div>

      <div className="report-grid">
        <TablaSimple titulo="Reclamos por estado" datos={estado} />
        <TablaSimple titulo="Reclamos por canal" datos={canal} />
        <TablaSimple titulo="Reclamos por prioridad" datos={prioridad} />
        <TablaSimple titulo="Reclamos por categoría" datos={categoria} />
      </div>
    </div>
  );
}
