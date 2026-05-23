import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ErrorBox from '../components/ui/ErrorBox.jsx';
import Loading from '../components/ui/Loading.jsx';
import Card from '../components/ui/Card.jsx';
import { leerCampo, formatearNumero } from '../utils/campos.js';
import { humanizarEnum } from '../utils/etiquetas.js';
import { listarUsuariosReclamantes } from '../services/usuariosReclamantesService.js';
import {
  obtenerCasosPorArea,
  obtenerCasosPorEstado,
  obtenerCasosPorPrioridad,
  obtenerCasosPorTipoIncidencia,
  obtenerResumenCasos,
  obtenerUsuariosTopCasos,
} from '../services/reporteriaService.js';

const PALETA = ['#2563eb', '#7c3aed', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#64748b', '#db2777'];

function valorFila(fila, claves, fallback = '') {
  return leerCampo(fila, claves, fallback);
}

function nombreFila(fila) {
  return humanizarEnum(valorFila(fila, ['nombre', 'estado', 'area', 'prioridad', 'tipo_incidencia', 'tipoIncidencia', 'usuario_comentario', 'usuarioComentario', 'categoria'], 'Sin dato'));
}

function totalFila(fila) {
  return Number(valorFila(fila, ['total', 'cantidad', 'casos', 'total_casos', 'totalCasos', 'total_eventos', 'totalEventos'], 0) || 0);
}

function preparar(datos, limite = 10) {
  return (Array.isArray(datos) ? datos : [])
    .map((fila) => ({ nombre: nombreFila(fila), total: totalFila(fila) }))
    .filter((fila) => fila.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, limite);
}

function leer(obj, nombres, fallback = 0) {
  return leerCampo(obj, nombres, fallback);
}

function ChartPanel({ titulo, subtitulo, children }) {
  return (
    <section className="panel compact-panel chart-panel">
      <div className="chart-title-row">
        <div>
          <h3>{titulo}</h3>
          {subtitulo && <p>{subtitulo}</p>}
        </div>
      </div>
      <div className="chart-box">{children}</div>
    </section>
  );
}

function TablaRanking({ titulo, datos, etiquetaColumna }) {
  return (
    <section className="panel compact-panel">
      <h3>{titulo}</h3>
      <div className="table-wrap small-table dense-table clean-inner-table">
        <table>
          <thead>
            <tr>
              <th>{etiquetaColumna}</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {datos.map((fila, index) => (
              <tr key={`${fila.nombre}-${index}`}>
                <td>{fila.nombre}</td>
                <td><strong>{formatearNumero(fila.total)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!datos.length && <div className="empty-box">Sin datos.</div>}
    </section>
  );
}

export default function Reporteria() {
  const [resumen, setResumen] = useState({});
  const [estado, setEstado] = useState([]);
  const [area, setArea] = useState([]);
  const [prioridad, setPrioridad] = useState([]);
  const [tipo, setTipo] = useState([]);
  const [usuariosTop, setUsuariosTop] = useState([]);
  const [usuariosReclamantes, setUsuariosReclamantes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  async function cargar() {
    setCargando(true);
    setError(null);

    try {
      const [r, e, a, p, t, u, ur] = await Promise.all([
        obtenerResumenCasos().catch(() => ({})),
        obtenerCasosPorEstado().catch(() => []),
        obtenerCasosPorArea().catch(() => []),
        obtenerCasosPorPrioridad().catch(() => []),
        obtenerCasosPorTipoIncidencia().catch(() => []),
        obtenerUsuariosTopCasos().catch(() => []),
        listarUsuariosReclamantes().catch(() => []),
      ]);

      setResumen(r || {});
      setEstado(preparar(e, 8));
      setArea(preparar(a, 8));
      setPrioridad(preparar(p, 6));
      setTipo(preparar(t, 10));
      setUsuariosTop(preparar(u, 10));
      setUsuariosReclamantes(Array.isArray(ur) ? ur : []);
    } catch (err) {
      setError(err);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  if (cargando) return <Loading />;

  const piePrioridad = prioridad.length ? prioridad : [{ nombre: 'Sin datos', total: 1 }];

  return (
    <div className="page page-compact">
      <div className="page-header">
        <div>
          <h2>Métricas</h2>
          <p>Panel ejecutivo para analizar volumen, prioridad, áreas destino y usuarios con mayor concentración de reclamos sociales.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={cargar}>Actualizar</button>
        </div>
      </div>

      <ErrorBox error={error} />

      <div className="grid-cards compact-cards">
        <Card tone="blue" title="Reclamos" value={formatearNumero(leer(resumen, ['totalCasos', 'total_casos', 'total'], 0))} subtitle="Casos agrupados" />
        <Card tone="amber" title="Pendientes" value={formatearNumero(leer(resumen, ['casosAbiertos', 'casos_abiertos', 'abiertos'], 0))} subtitle="Por revisar" />
        <Card tone="cyan" title="Evidencias" value={formatearNumero(leer(resumen, ['totalEvidencias', 'total_evidencias', 'eventos'], 0))} subtitle="Comentarios negativos" />
        <Card tone="violet" title="Usuarios" value={formatearNumero(leer(resumen, ['totalUsuarios', 'total_usuarios', 'usuarios'], 0) || usuariosReclamantes.length)} subtitle="Reclamantes únicos" />
      </div>

      <div className="metrics-grid">
        <ChartPanel titulo="Distribución por área destino" subtitulo="Dónde debería revisar la empresa">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={area} layout="vertical" margin={{ left: 8, right: 18, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="nombre" width={145} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="total" radius={[0, 8, 8, 0]}>
                {area.map((_, index) => <Cell key={index} fill={PALETA[index % PALETA.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel titulo="Prioridad máxima" subtitulo="Peso operacional detectado">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={piePrioridad} dataKey="total" nameKey="nombre" innerRadius={54} outerRadius={88} paddingAngle={4}>
                {piePrioridad.map((_, index) => <Cell key={index} fill={PALETA[index % PALETA.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel titulo="Tipos de incidencia" subtitulo="Categorías más frecuentes">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tipo} margin={{ left: 0, right: 12, top: 8, bottom: 54 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="nombre" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={72} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                {tipo.map((_, index) => <Cell key={index} fill={PALETA[index % PALETA.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel titulo="Top usuarios reclamantes" subtitulo="Mayor concentración de eventos">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={usuariosTop} margin={{ left: 0, right: 18, top: 10, bottom: 54 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nombre" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={72} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      <div className="report-grid">
        <TablaRanking titulo="Ranking por estado" datos={estado} etiquetaColumna="Estado" />
        <TablaRanking titulo="Ranking por área" datos={area} etiquetaColumna="Área" />
        <TablaRanking titulo="Ranking por prioridad" datos={prioridad} etiquetaColumna="Prioridad" />
        <TablaRanking titulo="Ranking por tipo de incidencia" datos={tipo} etiquetaColumna="Tipo" />
        <TablaRanking titulo="Usuarios con más eventos" datos={usuariosTop} etiquetaColumna="Usuario" />
      </div>
    </div>
  );
}
