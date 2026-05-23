import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card.jsx';
import ErrorBox from '../components/ui/ErrorBox.jsx';
import Loading from '../components/ui/Loading.jsx';
import PrioridadBadge from '../components/reclamos/PrioridadBadge.jsx';
import { listarUsuariosReclamantes } from '../services/usuariosReclamantesService.js';
import { formatearFecha } from '../utils/fechas.js';
import { leerCampo, formatearNumero } from '../utils/campos.js';
import { humanizarListaEnums } from '../utils/etiquetas.js';

const ICONO_TIKTOK = 'https://store-images.s-microsoft.com/image/apps.4784.13634052595610511.c45457c9-b4af-46b0-8e61-8d7c0aec3f56.3d483847-81a6-4078-8f83-a35c5c38ee92';
const ICONO_INSTAGRAM = 'https://store-images.s-microsoft.com/image/apps.43327.13510798887167234.cadff69d-8229-427b-a7da-21dbaf80bd81.79b8f512-1b22-45d6-9495-881485e3a87e?h=210';

function leer(obj, nombres, fallback = '') {
  return leerCampo(obj, nombres, fallback);
}

function normalizar(valor) {
  return String(valor ?? '').toLowerCase();
}

function obtenerTextoOrigenes(usuario) {
  return leer(usuario, [
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
      return normalizar(leer(usuario, ['usuarioComentario', 'usuario_comentario'], ''));
    case 'casos':
      return Number(leer(usuario, ['totalCasos', 'total_casos'], 0));
    case 'eventos':
      return Number(leer(usuario, ['totalEventos', 'total_eventos'], 0));
    case 'pendientes':
      return Number(leer(usuario, ['casosAbiertos', 'casos_abiertos'], 0));
    case 'revisados':
      return Number(leer(usuario, ['casosCerrados', 'casos_cerrados'], 0));
    case 'prioridad':
      return normalizar(leer(usuario, ['prioridadMaxima', 'prioridad_maxima'], ''));
    case 'areas':
      return normalizar(leer(usuario, ['areasInvolucradas', 'areas_involucradas'], ''));
    case 'tipos':
      return normalizar(leer(usuario, ['tiposIncidencia', 'tipos_incidencia'], ''));
    case 'ultimo':
      return new Date(leer(usuario, ['fechaUltimoEvento', 'fecha_ultimo_evento'], 0)).getTime() || 0;
    default:
      return '';
  }
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

export default function Reclamos() {
  const [usuarios, setUsuarios] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState({ columna: 'eventos', direccion: 'desc' });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  async function cargar() {
    setCargando(true);
    setError(null);

    try {
      const data = await listarUsuariosReclamantes();
      setUsuarios(Array.isArray(data) ? data : []);
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

  const usuariosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    const filtrados = usuarios.filter((usuario) => {
      if (!q) return true;

      return [
        obtenerTextoOrigenes(usuario),
        leer(usuario, ['usuarioComentario', 'usuario_comentario']),
        leer(usuario, ['areasInvolucradas', 'areas_involucradas']),
        leer(usuario, ['tiposIncidencia', 'tipos_incidencia']),
        leer(usuario, ['prioridadMaxima', 'prioridad_maxima']),
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

  const resumen = useMemo(() => {
    const totalEventos = usuarios.reduce((acc, usuario) => acc + Number(leer(usuario, ['totalEventos', 'total_eventos'], 0) || 0), 0);
    const totalCasos = usuarios.reduce((acc, usuario) => acc + Number(leer(usuario, ['totalCasos', 'total_casos'], 0) || 0), 0);
    const pendientes = usuarios.reduce((acc, usuario) => acc + Number(leer(usuario, ['casosAbiertos', 'casos_abiertos'], 0) || 0), 0);
    const revisados = usuarios.reduce((acc, usuario) => acc + Number(leer(usuario, ['casosCerrados', 'casos_cerrados'], 0) || 0), 0);

    return { usuarios: usuarios.length, totalCasos, totalEventos, pendientes, revisados };
  }, [usuarios]);

  return (
    <div className="page page-compact">
      <div className="page-header">
        <div>
          <h2>Reclamos</h2>
          <p>Vista agrupada por usuario reclamante. El sistema detecta quejas sociales, las clasifica y deja sugerida el área de derivación.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={cargar}>Actualizar</button>
        </div>
      </div>

      <ErrorBox error={error} />

      <div className="grid-cards compact-cards">
        <Card tone="violet" title="Usuarios" value={formatearNumero(resumen.usuarios)} subtitle="Reclamantes únicos" />
        <Card tone="blue" title="Casos" value={formatearNumero(resumen.totalCasos)} subtitle="Agrupados por tipo" />
        <Card tone="cyan" title="Eventos" value={formatearNumero(resumen.totalEventos)} subtitle="Comentarios/evidencias" />
        <Card tone="amber" title="Pendientes" value={formatearNumero(resumen.pendientes)} subtitle="Por revisar" />
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
                <SortHeader columna="pendientes" orden={orden} onClick={cambiarOrden}>Pendientes</SortHeader>
                <SortHeader columna="revisados" orden={orden} onClick={cambiarOrden}>Revisados</SortHeader>
                <SortHeader columna="prioridad" orden={orden} onClick={cambiarOrden}>Prioridad</SortHeader>
                <SortHeader columna="areas" orden={orden} onClick={cambiarOrden}>Áreas destino</SortHeader>
                <SortHeader columna="tipos" orden={orden} onClick={cambiarOrden}>Tipos detectados</SortHeader>
                <SortHeader columna="ultimo" orden={orden} onClick={cambiarOrden}>Último evento</SortHeader>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.map((usuario) => {
                const nombre = leer(usuario, ['usuarioComentario', 'usuario_comentario'], 'sin_usuario');
                const areas = humanizarListaEnums(leer(usuario, ['areasInvolucradas', 'areas_involucradas'], ''));
                const tipos = humanizarListaEnums(leer(usuario, ['tiposIncidencia', 'tipos_incidencia'], ''));

                return (
                  <tr key={nombre}>
                    <td className="origin-col"><IconosOrigen usuario={usuario} /></td>
                    <td><strong>{nombre}</strong></td>
                    <td>{leer(usuario, ['totalCasos', 'total_casos'], 0)}</td>
                    <td>{leer(usuario, ['totalEventos', 'total_eventos'], 0)}</td>
                    <td>{leer(usuario, ['casosAbiertos', 'casos_abiertos'], 0)}</td>
                    <td>{leer(usuario, ['casosCerrados', 'casos_cerrados'], 0)}</td>
                    <td><PrioridadBadge prioridad={leer(usuario, ['prioridadMaxima', 'prioridad_maxima'], 'MEDIA')} /></td>
                    <td className="muted-cell">{areas}</td>
                    <td className="muted-cell wide-cell">{tipos}</td>
                    <td>{formatearFecha(leer(usuario, ['fechaUltimoEvento', 'fecha_ultimo_evento']))}</td>
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
          {!usuariosFiltrados.length && <div className="empty-box">No hay reclamos con esos filtros.</div>}
        </div>
      )}
    </div>
  );
}
