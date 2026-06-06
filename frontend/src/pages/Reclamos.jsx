import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card.jsx';
import ErrorBox from '../components/ui/ErrorBox.jsx';
import Loading from '../components/ui/Loading.jsx';
import PrioridadBadge from '../components/reclamos/PrioridadBadge.jsx';
import EstadoTiempoBadge from '../components/reclamos/EstadoTiempoBadge.jsx';
import { listarUsuariosReclamantes } from '../services/usuariosReclamantesService.js';
import { listarCasosDerivacionPorFechas } from '../services/casosDerivacionService.js';
import { formatearFechaDia } from '../utils/fechas.js';
import { leerCampo, formatearNumero } from '../utils/campos.js';
import { humanizarListaEnums, humanizarEnum } from '../utils/etiquetas.js';
import {
  ETIQUETAS_ESTADO_TIEMPO,
  ESTADOS_TIEMPO,
  contarPorEstadoTiempo,
  contarPorPlataforma,
  filtrarCasosTemporales,
  leer,
  leerNumero,
} from '../utils/tiempoReclamos.js';

const ICONO_TIKTOK = 'https://store-images.s-microsoft.com/image/apps.4784.13634052595610511.c45457c9-b4af-46b0-8e61-8d7c0aec3f56.3d483847-81a6-4078-8f83-a35c5c38ee92';
const ICONO_INSTAGRAM = 'https://store-images.s-microsoft.com/image/apps.43327.13510798887167234.cadff69d-8229-427b-a7da-21dbaf80bd81.79b8f512-1b22-45d6-9495-881485e3a87e?h=210';

function leerDato(obj, nombres, valorInicial = '') {
  return leerCampo(obj, nombres, valorInicial);
}

function normalizar(valor) {
  return String(valor ?? '').toLowerCase();
}

function normalizarMayus(valor) {
  return String(valor ?? '').trim().toUpperCase();
}

function obtenerTextoOrigenes(usuario) {
  return leerDato(usuario, [
    'origenes',
    'origen',
    'plataformas',
    'plataformasDetectadas',
    'plataformas_detectadas',
    'origenesDetectados',
    'origenes_detectados',
  ], '');
}

function obtenerOrigenes(usuario) {
  const texto = normalizar(obtenerTextoOrigenes(usuario));
  const origenes = [];

  if (texto.includes('tiktok')) origenes.push('tiktok');
  if (texto.includes('instagram')) origenes.push('instagram');

  return [...new Set(origenes)];
}

function obtenerEtiquetaOrigen(usuario) {
  const origenes = obtenerOrigenes(usuario);

  if (origenes.includes('tiktok') && origenes.includes('instagram')) return 'mixto';
  if (origenes.includes('tiktok')) return 'tiktok';
  if (origenes.includes('instagram')) return 'instagram';

  return 'sin_origen';
}

function obtenerValorOrden(usuario, columna) {
  switch (columna) {
    case 'origen': {
      const ordenOrigen = {
        tiktok: 1,
        instagram: 2,
        mixto: 3,
        sin_origen: 4,
      };

      return ordenOrigen[obtenerEtiquetaOrigen(usuario)] || 99;
    }
    case 'usuario':
      return normalizar(leerDato(usuario, ['usuarioComentario', 'usuario_comentario'], ''));
    case 'casos':
      return Number(leerDato(usuario, ['totalCasos', 'total_casos'], 0));
    case 'eventos':
      return Number(leerDato(usuario, ['totalEventos', 'total_eventos'], 0));
    case 'prioridad':
      return normalizar(leerDato(usuario, ['prioridadMaxima', 'prioridad_maxima'], ''));
    case 'areas':
      return normalizar(leerDato(usuario, ['areasInvolucradas', 'areas_involucradas'], ''));
    case 'tipos':
      return normalizar(leerDato(usuario, ['tiposIncidencia', 'tipos_incidencia'], ''));
    case 'ultimo':
      return new Date(leerDato(usuario, ['fechaUltimoEvento', 'fecha_ultimo_evento'], 0)).getTime() || 0;
    default:
      return '';
  }
}


function obtenerValorOrdenTemporal(caso, columna) {
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
    case 'tipo':
      return normalizar(leer(caso, ['tipoIncidencia', 'tipo_incidencia']));
    case 'area':
      return normalizar(leer(caso, ['areaDerivacion', 'area_derivacion']));
    case 'prioridad': {
      const peso = { CRITICA: 4, 'CRÍTICA': 4, ALTA: 3, MEDIA: 2, BAJA: 1 };
      return peso[normalizarMayus(leer(caso, ['prioridad']))] || 0;
    }
    case 'eventos':
      return leerNumero(caso, ['cantidadEventos', 'cantidad_eventos']);
    case 'dias':
      return leerNumero(caso, ['diasHabilesTranscurridos', 'dias_habiles_transcurridos']);
    case 'primerEvento':
      return new Date(leer(caso, ['fechaPrimerEvento', 'fecha_primer_evento'], 0)).getTime() || 0;
    case 'ultimoEvento':
      return new Date(leer(caso, ['fechaUltimoEvento', 'fecha_ultimo_evento'], 0)).getTime() || 0;
    default:
      return '';
  }
}

function ordenarCasosTemporales(lista, orden) {
  return [...lista].sort((a, b) => {
    const va = obtenerValorOrdenTemporal(a, orden.columna);
    const vb = obtenerValorOrdenTemporal(b, orden.columna);

    if (typeof va === 'number' && typeof vb === 'number') {
      return orden.direccion === 'asc' ? va - vb : vb - va;
    }

    const comparacion = String(va).localeCompare(String(vb), 'es', { sensitivity: 'base' });
    return orden.direccion === 'asc' ? comparacion : -comparacion;
  });
}

function SortHeader({ columna, orden, onClick, children, className = '' }) {
  const activo = orden.columna === columna;
  const icono = activo ? (orden.direccion === 'asc' ? '↑' : '↓') : '↕';

  return (
    <th className={className}>
      <button className={`sort-header ${activo ? 'active' : ''}`} type="button" onClick={() => onClick(columna)}>
        <span>{children}</span>
        <small>{icono}</small>
      </button>
    </th>
  );
}

function IconosOrigen({ usuario }) {
  const origenes = obtenerOrigenes(usuario);

  if (!origenes.length) {
    return <span className="origin-empty">—</span>;
  }

  return (
    <div className="origin-icons" title={origenes.map((o) => o === 'tiktok' ? 'TikTok' : 'Instagram').join(' + ')}>
      {origenes.includes('tiktok') && (
        <img src={ICONO_TIKTOK} alt="TikTok" className="origin-icon" loading="lazy" />
      )}
      {origenes.includes('instagram') && (
        <img src={ICONO_INSTAGRAM} alt="Instagram" className="origin-icon" loading="lazy" />
      )}
    </div>
  );
}

function FiltrosTemporales({ filtros, onChange }) {
  return (
    <section className="panel filters-panel compact-panel temporal-filters-panel">
      <div>
        <label>Estado tiempo</label>
        <select value={filtros.estadoTiempo} onChange={(e) => onChange({ ...filtros, estadoTiempo: e.target.value })}>
          <option value="TODOS">Todos</option>
          {ESTADOS_TIEMPO.map((estado) => (
            <option key={estado} value={estado}>{ETIQUETAS_ESTADO_TIEMPO[estado]}</option>
          ))}
        </select>
      </div>
      <div>
        <label>Plataforma</label>
        <select value={filtros.plataforma} onChange={(e) => onChange({ ...filtros, plataforma: e.target.value })}>
          <option value="todas">Todas</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
        </select>
      </div>
      <div>
        <label>Buscar</label>
        <input
          value={filtros.busqueda}
          onChange={(e) => onChange({ ...filtros, busqueda: e.target.value })}
          placeholder="Usuario, tipo, área, prioridad"
        />
      </div>
    </section>
  );
}

function TablaCasosTemporales({ casos, orden, onOrden }) {
  return (
    <div className="table-wrap dense-table">
      <table>
        <thead>
          <tr>
            <th>Estado tiempo</th>
            <th>Usuario</th>
            <th>Plataforma</th>
            <th>Tipo</th>
            <th>Área</th>
            <th>Prioridad</th>
            <th>Eventos</th>
            <th>Días hábiles</th>
            <th>Primer evento</th>
            <th>Último evento</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {casos.map((caso) => {
            const id = leer(caso, ['casoId', 'caso_id', 'id']);
            const usuario = leer(caso, ['usuarioComentario', 'usuario_comentario']);
            const plataforma = leer(caso, ['plataforma']);
            const dias = leerNumero(caso, ['diasHabilesTranscurridos', 'dias_habiles_transcurridos']);

            return (
              <tr key={id}>
                <td><EstadoTiempoBadge estado={leer(caso, ['estadoTiempo', 'estado_tiempo'])} /></td>
                <td><strong>{usuario}</strong></td>
                <td>{humanizarEnum(plataforma)}</td>
                <td>{humanizarEnum(leer(caso, ['tipoIncidencia', 'tipo_incidencia']))}</td>
                <td>{humanizarEnum(leer(caso, ['areaDerivacion', 'area_derivacion']))}</td>
                <td><PrioridadBadge prioridad={leer(caso, ['prioridad'])} /></td>
                <td>{formatearNumero(leerNumero(caso, ['cantidadEventos', 'cantidad_eventos']))}</td>
                <td>{formatearNumero(dias)}</td>
                <td>{formatearFechaDia(leer(caso, ['fechaPrimerEvento', 'fecha_primer_evento']))}</td>
                <td>{formatearFechaDia(leer(caso, ['fechaUltimoEvento', 'fecha_ultimo_evento']))}</td>
                <td>
                  <Link className="btn btn-primary btn-table-action" to={`/reclamos/${encodeURIComponent(usuario)}/casos/${id}`}>
                    Ver caso
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!casos.length && <div className="empty-box">Sin casos para el filtro temporal seleccionado.</div>}
    </div>
  );
}

export default function Reclamos() {
  const [tab, setTab] = useState('usuarios');
  const [usuarios, setUsuarios] = useState([]);
  const [casosTemporales, setCasosTemporales] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtrosTiempo, setFiltrosTiempo] = useState({ estadoTiempo: 'TODOS', plataforma: 'todas', busqueda: '' });
  const [orden, setOrden] = useState({ columna: 'eventos', direccion: 'desc' });
  const [ordenTiempo, setOrdenTiempo] = useState({ columna: 'dias', direccion: 'desc' });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  async function cargar() {
    setCargando(true);
    setError(null);

    try {
      const [dataUsuarios, dataTemporales] = await Promise.all([
        listarUsuariosReclamantes(),
        listarCasosDerivacionPorFechas(),
      ]);
      setUsuarios(Array.isArray(dataUsuarios) ? dataUsuarios : []);
      setCasosTemporales(Array.isArray(dataTemporales) ? dataTemporales : []);
    } catch (err) {
      setError(err);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  function cambiarOrden(columna) {
    setOrden((actual) => {
      if (actual.columna === columna) {
        return { columna, direccion: actual.direccion === 'asc' ? 'desc' : 'asc' };
      }

      return { columna, direccion: ['usuario', 'origen'].includes(columna) ? 'asc' : 'desc' };
    });
  }

  function cambiarOrdenTiempo(columna) {
    setOrdenTiempo((actual) => {
      if (actual.columna === columna) {
        return { columna, direccion: actual.direccion === 'asc' ? 'desc' : 'asc' };
      }

      return { columna, direccion: ['usuario', 'plataforma', 'tipo', 'area'].includes(columna) ? 'asc' : 'desc' };
    });
  }

  const usuariosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    const filtrados = usuarios.filter((usuario) => {
      if (!q) return true;

      return [
        obtenerTextoOrigenes(usuario),
        leerDato(usuario, ['usuarioComentario', 'usuario_comentario']),
        leerDato(usuario, ['areasInvolucradas', 'areas_involucradas']),
        leerDato(usuario, ['tiposIncidencia', 'tipos_incidencia']),
        leerDato(usuario, ['prioridadMaxima', 'prioridad_maxima']),
      ].join(' ').toLowerCase().includes(q);
    });

    return [...filtrados].sort((a, b) => {
      const va = obtenerValorOrden(a, orden.columna);
      const vb = obtenerValorOrden(b, orden.columna);

      if (typeof va === 'number' && typeof vb === 'number') {
        return orden.direccion === 'asc' ? va - vb : vb - va;
      }

      const comparacion = String(va).localeCompare(String(vb), 'es', { sensitivity: 'base' });
      return orden.direccion === 'asc' ? comparacion : -comparacion;
    });
  }, [usuarios, busqueda, orden]);

  const casosTemporalesFiltrados = useMemo(() => ordenarCasosTemporales(filtrarCasosTemporales(casosTemporales, filtrosTiempo), ordenTiempo), [casosTemporales, filtrosTiempo, ordenTiempo]);
  const conteoTiempo = useMemo(() => contarPorEstadoTiempo(casosTemporales), [casosTemporales]);
  const conteoPlataforma = useMemo(() => contarPorPlataforma(casosTemporales), [casosTemporales]);

  const resumen = useMemo(() => {
    const totalEventos = usuarios.reduce((acc, usuario) => acc + Number(leerDato(usuario, ['totalEventos', 'total_eventos'], 0) || 0), 0);
    const totalCasos = usuarios.reduce((acc, usuario) => acc + Number(leerDato(usuario, ['totalCasos', 'total_casos'], 0) || 0), 0);
    return { usuarios: usuarios.length, totalCasos, totalEventos };
  }, [usuarios]);

  return (
    <div className="page page-compact">
      <div className="page-header">
        <div>
          <h2>Reclamos</h2>
          <p>Vista operativa por usuario reclamante y por tiempo de atención. El plazo se calcula desde la fecha real del comentario.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={cargar}>Actualizar</button>
        </div>
      </div>

      <ErrorBox error={error} />

      <div className="tab-strip">
        <button className={`tab-button ${tab === 'usuarios' ? 'active' : ''}`} type="button" onClick={() => setTab('usuarios')}>Por usuario</button>
        <button className={`tab-button ${tab === 'tiempo' ? 'active' : ''}`} type="button" onClick={() => setTab('tiempo')}>Por tiempo</button>
      </div>

      {tab === 'usuarios' && (
        <>
          <div className="grid-cards compact-cards">
            <Card tone="violet" title="Usuarios" value={formatearNumero(resumen.usuarios)} subtitle="Reclamantes únicos" />
            <Card tone="blue" title="Casos" value={formatearNumero(resumen.totalCasos)} subtitle="Agrupados por tipo" />
            <Card tone="cyan" title="Eventos" value={formatearNumero(resumen.totalEventos)} subtitle="Comentarios/evidencias" />
          </div>

          <section className="panel filters-panel one-line compact-panel">
            <div>
              <label>Buscar reclamo</label>
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Ej: usuario, TikTok, Instagram, soporte técnico, facturación, internet"
              />
            </div>
          </section>

          {cargando ? <Loading /> : (
            <div className="table-wrap dense-table">
              <table>
                <thead>
                  <tr>
                    <SortHeader columna="origen" orden={orden} onClick={cambiarOrden} className="origin-col">Origen</SortHeader>
                    <SortHeader columna="usuario" orden={orden} onClick={cambiarOrden}>Usuario reclamante</SortHeader>
                    <SortHeader columna="casos" orden={orden} onClick={cambiarOrden}>Casos</SortHeader>
                    <SortHeader columna="eventos" orden={orden} onClick={cambiarOrden}>Eventos</SortHeader>
                    <SortHeader columna="prioridad" orden={orden} onClick={cambiarOrden}>Prioridad</SortHeader>
                    <SortHeader columna="areas" orden={orden} onClick={cambiarOrden}>Áreas destino</SortHeader>
                    <SortHeader columna="tipos" orden={orden} onClick={cambiarOrden}>Tipos detectados</SortHeader>
                    <SortHeader columna="ultimo" orden={orden} onClick={cambiarOrden}>Último evento</SortHeader>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosFiltrados.map((usuario) => {
                    const nombre = leerDato(usuario, ['usuarioComentario', 'usuario_comentario'], 'sin_usuario');
                    const areas = humanizarListaEnums(leerDato(usuario, ['areasInvolucradas', 'areas_involucradas'], ''));
                    const tipos = humanizarListaEnums(leerDato(usuario, ['tiposIncidencia', 'tipos_incidencia'], ''));

                    return (
                      <tr key={nombre}>
                        <td><IconosOrigen usuario={usuario} /></td>
                        <td><strong>{nombre}</strong></td>
                        <td>{formatearNumero(leerDato(usuario, ['totalCasos', 'total_casos'], 0))}</td>
                        <td>{formatearNumero(leerDato(usuario, ['totalEventos', 'total_eventos'], 0))}</td>
                        <td><PrioridadBadge prioridad={leerDato(usuario, ['prioridadMaxima', 'prioridad_maxima'])} /></td>
                        <td>{areas}</td>
                        <td>{tipos}</td>
                        <td>{formatearFechaDia(leerDato(usuario, ['fechaUltimoEvento', 'fecha_ultimo_evento']))}</td>
                        <td>
                          <Link className="btn btn-primary btn-table-action" to={`/reclamos/${encodeURIComponent(nombre)}`}>
                            Ver casos
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!usuariosFiltrados.length && <div className="empty-box">Sin usuarios reclamantes para la búsqueda actual.</div>}
            </div>
          )}
        </>
      )}

      {tab === 'tiempo' && (
        <>
          <div className="grid-cards compact-cards temporal-cards">
            <Card tone="red" title="Críticos" value={formatearNumero(conteoTiempo.CRITICO)} subtitle="Vencidos con alta gravedad o recurrencia" />
            <Card tone="amber" title="Vencidos" value={formatearNumero(conteoTiempo.VENCIDO)} subtitle="Más de 3 días hábiles" />
            <Card tone="violet" title="Próximos" value={formatearNumero(conteoTiempo.PROXIMO_A_VENCER)} subtitle="3 días hábiles" />
            <Card tone="green" title="En plazo" value={formatearNumero(conteoTiempo.EN_PLAZO)} subtitle="1 a 2 días hábiles" />
            <Card tone="blue" title="Nuevos" value={formatearNumero(conteoTiempo.NUEVO)} subtitle="0 días hábiles" />
            <Card tone="pink" title="Instagram" value={formatearNumero(conteoPlataforma.instagram)} subtitle="Casos filtrables" />
            <Card tone="cyan" title="TikTok" value={formatearNumero(conteoPlataforma.tiktok)} subtitle="Casos filtrables" />
          </div>

          <FiltrosTemporales filtros={filtrosTiempo} onChange={setFiltrosTiempo} />

          {cargando ? <Loading /> : <TablaCasosTemporales casos={casosTemporalesFiltrados} orden={ordenTiempo} onOrden={cambiarOrdenTiempo} />}
        </>
      )}
    </div>
  );
}
