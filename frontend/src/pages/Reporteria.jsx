import { useEffect, useMemo, useState } from 'react';
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
import EstadoTiempoBadge from '../components/reclamos/EstadoTiempoBadge.jsx';
import PrioridadBadge from '../components/reclamos/PrioridadBadge.jsx';
import { leerCampo, formatearNumero } from '../utils/campos.js';
import { humanizarEnum } from '../utils/etiquetas.js';
import { formatearFechaDia } from '../utils/fechas.js';
import { listarUsuariosReclamantes } from '../services/usuariosReclamantesService.js';
import { listarCasosDerivacionPorFechas } from '../services/casosDerivacionService.js';
import {
  ETIQUETAS_ESTADO_TIEMPO,
  ESTADOS_TIEMPO,
  contarPorEstadoTiempo,
  contarPorPlataforma,
  filtrarCasosTemporales,
  leer,
  leerNumero,
} from '../utils/tiempoReclamos.js';
import {
  obtenerCasosPorArea,
  obtenerCasosPorEstado,
  obtenerCasosPorPrioridad,
  obtenerCasosPorTipoIncidencia,
  obtenerResumenCasos,
  obtenerUsuariosTopCasos,
} from '../services/reporteriaService.js';

const PALETA = ['#2563eb', '#7c3aed', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#64748b', '#db2777'];

function valorFila(fila, claves, valorInicial = '') {
  return leerCampo(fila, claves, valorInicial);
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

function leerResumen(obj, nombres, valorInicial = 0) {
  return leerCampo(obj, nombres, valorInicial);
}


function normalizar(valor) {
  return String(valor ?? '').toLowerCase();
}

function normalizarMayus(valor) {
  return String(valor ?? '').trim().toUpperCase();
}

function valorOrdenTemporal(caso, columna) {
  switch (columna) {
    case 'estadoTiempo': {
      const peso = {
        CRITICO: 5,
        VENCIDO: 4,
        PROXIMO_A_VENCER: 3,
        EN_PLAZO: 2,
        NUEVO: 1,
      };
      return peso[normalizarMayus(leer(caso, ['estadoTiempo', 'estado_tiempo']))] || 0;
    }
    case 'usuario':
      return normalizar(leer(caso, ['usuarioComentario', 'usuario_comentario']));
    case 'plataforma':
      return normalizar(leer(caso, ['plataforma']));
    case 'area':
      return normalizar(leer(caso, ['areaDerivacion', 'area_derivacion']));
    case 'tipo':
      return normalizar(leer(caso, ['tipoIncidencia', 'tipo_incidencia']));
    case 'prioridad': {
      const peso = { CRITICA: 4, 'CRÍTICA': 4, ALTA: 3, MEDIA: 2, BAJA: 1 };
      return peso[normalizarMayus(leer(caso, ['prioridad']))] || 0;
    }
    case 'dias':
      return leerNumero(caso, ['diasHabilesTranscurridos', 'dias_habiles_transcurridos']);
    case 'primerEvento':
      return new Date(leer(caso, ['fechaPrimerEvento', 'fecha_primer_evento'], 0)).getTime() || 0;
    default:
      return '';
  }
}

function ordenarCasosTemporales(lista, orden) {
  return [...lista].sort((a, b) => {
    const va = valorOrdenTemporal(a, orden.columna);
    const vb = valorOrdenTemporal(b, orden.columna);

    if (typeof va === 'number' && typeof vb === 'number') {
      return orden.direccion === 'asc' ? va - vb : vb - va;
    }

    const comparacion = String(va).localeCompare(String(vb), 'es', { sensitivity: 'base' });
    return orden.direccion === 'asc' ? comparacion : -comparacion;
  });
}

function SortHeader({ columna, orden, onClick, children }) {
  const activo = orden.columna === columna;
  const icono = activo ? (orden.direccion === 'asc' ? '↑' : '↓') : '↕';

  return (
    <th>
      <button className={`sort-header ${activo ? 'active' : ''}`} type="button" onClick={() => onClick(columna)}>
        <span>{children}</span>
        <small>{icono}</small>
      </button>
    </th>
  );
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

function TablaTemporal({ casos, orden, onOrden }) {
  return (
    <section className="panel compact-panel">
      <h3>Casos por plazo operativo</h3>
      <div className="table-wrap dense-table">
        <table>
          <thead>
            <tr>
              <SortHeader columna="estadoTiempo" orden={orden} onClick={onOrden}>Estado tiempo</SortHeader>
              <SortHeader columna="usuario" orden={orden} onClick={onOrden}>Usuario</SortHeader>
              <SortHeader columna="plataforma" orden={orden} onClick={onOrden}>Plataforma</SortHeader>
              <SortHeader columna="area" orden={orden} onClick={onOrden}>Área</SortHeader>
              <SortHeader columna="tipo" orden={orden} onClick={onOrden}>Tipo</SortHeader>
              <SortHeader columna="prioridad" orden={orden} onClick={onOrden}>Prioridad</SortHeader>
              <SortHeader columna="dias" orden={orden} onClick={onOrden}>Días hábiles</SortHeader>
              <SortHeader columna="primerEvento" orden={orden} onClick={onOrden}>Primer evento</SortHeader>
            </tr>
          </thead>
          <tbody>
            {casos.slice(0, 30).map((caso) => {
              const id = leer(caso, ['casoId', 'caso_id', 'id']);
              return (
                <tr key={id}>
                  <td><EstadoTiempoBadge estado={leer(caso, ['estadoTiempo', 'estado_tiempo'])} /></td>
                  <td><strong>{leer(caso, ['usuarioComentario', 'usuario_comentario'])}</strong></td>
                  <td>{humanizarEnum(leer(caso, ['plataforma']))}</td>
                  <td>{humanizarEnum(leer(caso, ['areaDerivacion', 'area_derivacion']))}</td>
                  <td>{humanizarEnum(leer(caso, ['tipoIncidencia', 'tipo_incidencia']))}</td>
                  <td><PrioridadBadge prioridad={leer(caso, ['prioridad'])} /></td>
                  <td>{formatearNumero(leerNumero(caso, ['diasHabilesTranscurridos', 'dias_habiles_transcurridos']))}</td>
                  <td>{formatearFechaDia(leer(caso, ['fechaPrimerEvento', 'fecha_primer_evento']))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!casos.length && <div className="empty-box">Sin casos para el filtro temporal seleccionado.</div>}
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
  const [casosTemporales, setCasosTemporales] = useState([]);
  const [filtrosTiempo, setFiltrosTiempo] = useState({ estadoTiempo: 'TODOS', plataforma: 'todas', busqueda: '' });
  const [ordenTiempo, setOrdenTiempo] = useState({ columna: 'dias', direccion: 'desc' });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  async function cargar() {
    setCargando(true);
    setError(null);

    try {
      const [r, e, a, p, t, u, ur, temporales] = await Promise.all([
        obtenerResumenCasos().catch(() => ({})),
        obtenerCasosPorEstado().catch(() => []),
        obtenerCasosPorArea().catch(() => []),
        obtenerCasosPorPrioridad().catch(() => []),
        obtenerCasosPorTipoIncidencia().catch(() => []),
        obtenerUsuariosTopCasos().catch(() => []),
        listarUsuariosReclamantes().catch(() => []),
        listarCasosDerivacionPorFechas().catch(() => []),
      ]);

      setResumen(r || {});
      setEstado(preparar(e, 8));
      setArea(preparar(a, 8));
      setPrioridad(preparar(p, 6));
      setTipo(preparar(t, 10));
      setUsuariosTop(preparar(u, 10));
      setUsuariosReclamantes(Array.isArray(ur) ? ur : []);
      setCasosTemporales(Array.isArray(temporales) ? temporales : []);
    } catch (err) {
      setError(err);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  function cambiarOrdenTiempo(columna) {
    setOrdenTiempo((actual) => {
      if (actual.columna === columna) {
        return { columna, direccion: actual.direccion === 'asc' ? 'desc' : 'asc' };
      }

      return { columna, direccion: ['usuario', 'plataforma', 'area', 'tipo'].includes(columna) ? 'asc' : 'desc' };
    });
  }

  const conteoTiempo = useMemo(() => contarPorEstadoTiempo(casosTemporales), [casosTemporales]);
  const conteoPlataforma = useMemo(() => contarPorPlataforma(casosTemporales), [casosTemporales]);
  const casosTemporalesFiltrados = useMemo(() => ordenarCasosTemporales(filtrarCasosTemporales(casosTemporales, filtrosTiempo), ordenTiempo), [casosTemporales, filtrosTiempo, ordenTiempo]);

  const datosEstadosTiempo = useMemo(() => ESTADOS_TIEMPO.map((estadoTiempo) => ({
    nombre: ETIQUETAS_ESTADO_TIEMPO[estadoTiempo],
    total: conteoTiempo[estadoTiempo] || 0,
  })).filter((fila) => fila.total > 0), [conteoTiempo]);

  const datosPlataformas = useMemo(() => [
    { nombre: 'Instagram', total: conteoPlataforma.instagram },
    { nombre: 'TikTok', total: conteoPlataforma.tiktok },
  ].filter((fila) => fila.total > 0), [conteoPlataforma]);

  if (cargando) return <Loading />;

  const piePrioridad = prioridad.length ? prioridad : [{ nombre: 'Sin datos', total: 1 }];
  const piePlataformas = datosPlataformas.length ? datosPlataformas : [{ nombre: 'Sin datos', total: 1 }];

  return (
    <div className="page page-compact">
      <div className="page-header">
        <div>
          <h2>Métricas</h2>
          <p>Panel ejecutivo para analizar volumen, prioridad, áreas destino, plataformas y estado temporal de reclamos sociales.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={cargar}>Actualizar</button>
        </div>
      </div>

      <ErrorBox error={error} />

      <div className="grid-cards compact-cards">
        <Card tone="blue" title="Reclamos" value={formatearNumero(leerResumen(resumen, ['totalCasos', 'total_casos', 'total'], 0))} subtitle="Casos agrupados" />
        <Card tone="cyan" title="Evidencias" value={formatearNumero(leerResumen(resumen, ['totalEvidencias', 'total_evidencias', 'eventos'], 0))} subtitle="Comentarios negativos" />
        <Card tone="violet" title="Usuarios" value={formatearNumero(leerResumen(resumen, ['totalUsuarios', 'total_usuarios', 'usuarios'], 0) || usuariosReclamantes.length)} subtitle="Reclamantes únicos" />
        <Card tone="red" title="Críticos" value={formatearNumero(conteoTiempo.CRITICO)} subtitle="Por plazo y gravedad" />
        <Card tone="pink" title="Instagram" value={formatearNumero(conteoPlataforma.instagram)} subtitle="Casos detectados" />
        <Card tone="cyan" title="TikTok" value={formatearNumero(conteoPlataforma.tiktok)} subtitle="Casos detectados" />
      </div>

      <section className="panel filters-panel compact-panel temporal-filters-panel">
        <div>
          <label>Estado tiempo</label>
          <select value={filtrosTiempo.estadoTiempo} onChange={(e) => setFiltrosTiempo({ ...filtrosTiempo, estadoTiempo: e.target.value })}>
            <option value="TODOS">Todos</option>
            {ESTADOS_TIEMPO.map((estadoTiempo) => (
              <option key={estadoTiempo} value={estadoTiempo}>{ETIQUETAS_ESTADO_TIEMPO[estadoTiempo]}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Plataforma</label>
          <select value={filtrosTiempo.plataforma} onChange={(e) => setFiltrosTiempo({ ...filtrosTiempo, plataforma: e.target.value })}>
            <option value="todas">Todas</option>
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
          </select>
        </div>
        <div>
          <label>Buscar</label>
          <input value={filtrosTiempo.busqueda} onChange={(e) => setFiltrosTiempo({ ...filtrosTiempo, busqueda: e.target.value })} placeholder="Usuario, área, tipo o prioridad" />
        </div>
      </section>

      <div className="metrics-grid">
        <ChartPanel titulo="Estado temporal" subtitulo="Plazo operativo basado en días hábiles">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={datosEstadosTiempo} margin={{ left: 0, right: 12, top: 8, bottom: 54 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="nombre" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={72} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                {datosEstadosTiempo.map((_, index) => <Cell key={index} fill={PALETA[index % PALETA.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel titulo="Plataformas" subtitulo="Casos desde Instagram y TikTok">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={piePlataformas} dataKey="total" nameKey="nombre" innerRadius={54} outerRadius={88} paddingAngle={4}>
                {piePlataformas.map((_, index) => <Cell key={index} fill={PALETA[index % PALETA.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartPanel>

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

      <TablaTemporal casos={casosTemporalesFiltrados} orden={ordenTiempo} onOrden={cambiarOrdenTiempo} />

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
