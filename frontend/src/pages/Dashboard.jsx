import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card.jsx';
import Loading from '../components/ui/Loading.jsx';
import ErrorBox from '../components/ui/ErrorBox.jsx';
import { listarUsuariosReclamantes } from '../services/usuariosReclamantesService.js';
import { listarCasosDerivacionPorFechas } from '../services/casosDerivacionService.js';
import { obtenerResumenCasos } from '../services/reporteriaService.js';
import { listarUsuarios } from '../services/authService.js';
import { obtenerPerfil, obtenerRol, obtenerUsuario } from '../utils/auth.js';
import { leerCampo, formatearNumero } from '../utils/campos.js';
import { humanizarListaEnums, humanizarEnum } from '../utils/etiquetas.js';
import {
  areaDesdePerfil,
  descripcionPerfil,
  etiquetaPerfil,
  PERFILES_OPERATIVOS,
  tiposClavePorPerfil,
  tonoPerfil,
} from '../utils/perfiles.js';
import { etiquetaRol, puedeAdministrarUsuarios, puedeVerMetricas } from '../utils/roles.js';
import EstadoTiempoBadge from '../components/reclamos/EstadoTiempoBadge.jsx';
import { contarPorEstadoTiempo, contarPorPlataforma, filtrarCasosTemporales, leer as leerTiempo, leerNumero, ETIQUETAS_ESTADO_TIEMPO, ESTADOS_TIEMPO } from '../utils/tiempoReclamos.js';

const ESTADOS_ABIERTOS = new Set(['ABIERTO', 'DERIVADO', 'EN_GESTION', 'ESCALADO']);
const ESTADOS_CERRADOS = new Set(['CERRADO', 'DESCARTADO']);

function leer(obj, nombres, fallback = '') {
  return leerCampo(obj, nombres, fallback);
}

function numero(obj, nombres, fallback = 0) {
  const valor = Number(leer(obj, nombres, fallback));
  return Number.isFinite(valor) ? valor : fallback;
}

function normalizar(valor) {
  return String(valor || '').trim().toUpperCase();
}

function areasDeFila(fila) {
  return String(leer(fila, ['areasInvolucradas', 'areas_involucradas', 'areasDestino', 'areas_destino'], ''))
    .split(',')
    .map((item) => normalizar(item))
    .filter(Boolean);
}

function tiposDeFila(fila) {
  return String(leer(fila, ['tiposIncidencia', 'tipos_incidencia', 'tiposDetectados', 'tipos_detectados'], ''))
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function estadoDesdeFila(fila) {
  const abiertos = numero(fila, ['casosAbiertos', 'casos_abiertos'], 0);
  const cerrados = numero(fila, ['casosCerrados', 'casos_cerrados'], 0);
  if (abiertos > 0) return 'ABIERTO';
  if (cerrados > 0) return 'CERRADO';
  return 'ABIERTO';
}

function prioridadPeso(prioridad) {
  const p = normalizar(prioridad);
  if (p === 'CRITICA' || p === 'CRÍTICA') return 4;
  if (p === 'ALTA') return 3;
  if (p === 'MEDIA') return 2;
  if (p === 'BAJA') return 1;
  return 0;
}

function filtrarPorPerfil(lista, perfil) {
  const area = areaDesdePerfil(perfil);
  if (!area) return lista;

  return lista.filter((fila) => areasDeFila(fila).includes(area));
}

function resumirLista(lista) {
  const totalUsuarios = lista.length;
  const totalCasos = lista.reduce((acc, fila) => acc + numero(fila, ['totalCasos', 'total_casos'], 0), 0);
  const totalEventos = lista.reduce((acc, fila) => acc + numero(fila, ['totalEventos', 'total_eventos'], 0), 0);
  const criticos = lista.filter((fila) => prioridadPeso(leer(fila, ['prioridadMaxima', 'prioridad_maxima'], '')) >= 4).length;
  const altas = lista.filter((fila) => prioridadPeso(leer(fila, ['prioridadMaxima', 'prioridad_maxima'], '')) >= 3).length;

  return {
    totalUsuarios,
    totalCasos,
    totalEventos,
    criticos,
    altas,
  };
}

function ordenarAtencion(lista) {
  return [...lista]
    .filter((fila) => numero(fila, ['casosAbiertos', 'casos_abiertos'], 0) > 0)
    .sort((a, b) => {
      const prioridad = prioridadPeso(leer(b, ['prioridadMaxima', 'prioridad_maxima'], '')) - prioridadPeso(leer(a, ['prioridadMaxima', 'prioridad_maxima'], ''));
      if (prioridad !== 0) return prioridad;
      return numero(b, ['totalEventos', 'total_eventos'], 0) - numero(a, ['totalEventos', 'total_eventos'], 0);
    })
    .slice(0, 6);
}

function contarPorArea(lista) {
  const mapa = new Map();

  for (const fila of lista) {
    const total = numero(fila, ['totalCasos', 'total_casos'], 0);
    for (const area of areasDeFila(fila)) {
      mapa.set(area, (mapa.get(area) || 0) + total);
    }
  }

  return [...mapa.entries()]
    .map(([area, total]) => ({ area, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}

function contarPorTipo(lista) {
  const mapa = new Map();

  for (const fila of lista) {
    const total = numero(fila, ['totalCasos', 'total_casos'], 0);
    for (const tipo of tiposDeFila(fila)) {
      const clave = normalizar(tipo);
      mapa.set(clave, (mapa.get(clave) || 0) + total);
    }
  }

  return [...mapa.entries()]
    .map(([tipo, total]) => ({ tipo, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);
}

function EstadoSistema({ usuarios, resumenGlobal, perfilActual }) {
  const usuario = obtenerUsuario();
  const rol = obtenerRol();

  return (
    <section className="panel compact-panel status-panel">
      <div className="section-title-row">
        <div>
          <h3>Estado del sistema</h3>
          <p>Resumen rápido para confirmar que la plataforma tiene datos operativos disponibles.</p>
        </div>
      </div>
      <div className="status-grid">
        <div><span>Sesión</span><strong>{leer(usuario, ['nombre'], 'Usuario activo')}</strong></div>
        <div><span>Rol</span><strong>{etiquetaRol(rol)}</strong></div>
        <div><span>Perfil</span><strong>{etiquetaPerfil(perfilActual)}</strong></div>
        <div><span>Usuarios internos</span><strong>{formatearNumero(usuarios.length)}</strong></div>
        <div><span>Casos globales</span><strong>{formatearNumero(leer(resumenGlobal, ['totalCasos', 'total_casos', 'total'], 0))}</strong></div>
        <div><span>Evidencias globales</span><strong>{formatearNumero(leer(resumenGlobal, ['totalEvidencias', 'total_evidencias', 'eventos'], 0))}</strong></div>
      </div>
    </section>
  );
}

function AtencionRecomendada({ datos, titulo = 'Atención recomendada' }) {
  const filas = ordenarAtencion(datos);

  return (
    <section className="panel compact-panel attention-panel">
      <div className="section-title-row">
        <div>
          <h3>{titulo}</h3>
          <p>Usuarios con más urgencia según prioridad, eventos y recurrencia.</p>
        </div>
        <Link className="btn btn-primary btn-small" to="/reclamos">Ir a reclamos</Link>
      </div>

      <div className="attention-list">
        {filas.map((fila) => {
          const usuario = leer(fila, ['usuarioComentario', 'usuario_comentario'], 'Sin usuario');
          const prioridad = leer(fila, ['prioridadMaxima', 'prioridad_maxima'], 'SIN_PRIORIDAD');
          const eventos = numero(fila, ['totalEventos', 'total_eventos'], 0);
          const tipos = humanizarListaEnums(leer(fila, ['tiposIncidencia', 'tipos_incidencia'], ''), 'Sin tipo');

          return (
            <Link className="attention-item" key={usuario} to={`/reclamos/${encodeURIComponent(usuario)}`}>
              <div>
                <strong>{usuario}</strong>
                <span>{tipos}</span>
              </div>
              <div className="attention-meta">
                <span className={`badge badge-priority prioridad-${normalizar(prioridad).toLowerCase()}`}>{humanizarEnum(prioridad)}</span>
                <small>{formatearNumero(eventos)} eventos</small>
              </div>
            </Link>
          );
        })}
        {!filas.length && <div className="empty-box">No hay casos para esta vista.</div>}
      </div>
    </section>
  );
}

function RankingSimple({ titulo, subtitulo, datos, tipo }) {
  return (
    <section className="panel compact-panel mini-ranking-panel">
      <h3>{titulo}</h3>
      <p>{subtitulo}</p>
      <div className="mini-ranking-list">
        {datos.map((fila) => {
          const nombre = tipo === 'area' ? fila.area : fila.tipo;
          return (
            <div className="mini-ranking-row" key={nombre}>
              <span>{humanizarEnum(nombre)}</span>
              <strong>{formatearNumero(fila.total)}</strong>
            </div>
          );
        })}
        {!datos.length && <div className="empty-box">Sin datos.</div>}
      </div>
    </section>
  );
}


function PanelTiempoOperativo({ casos }) {
  const [estadoTiempo, setEstadoTiempo] = useState('TODOS');
  const conteoTiempo = useMemo(() => contarPorEstadoTiempo(casos), [casos]);
  const conteoPlataforma = useMemo(() => contarPorPlataforma(casos), [casos]);
  const casosFiltrados = useMemo(() => filtrarCasosTemporales(casos, { estadoTiempo, plataforma: 'todas', busqueda: '' }).slice(0, 8), [casos, estadoTiempo]);

  return (
    <section className="panel compact-panel temporal-dashboard-panel">
      <div className="section-title-row">
        <div>
          <h3>Control por tiempo de atención</h3>
          <p>Casos priorizados por días hábiles desde el primer comentario detectado.</p>
        </div>
        <Link className="btn btn-primary btn-small" to="/reclamos">Ver bandeja</Link>
      </div>

      <div className="temporal-summary-grid">
        <button type="button" className={estadoTiempo === 'CRITICO' ? 'active' : ''} onClick={() => setEstadoTiempo('CRITICO')}><span>Críticos</span><strong>{formatearNumero(conteoTiempo.CRITICO)}</strong></button>
        <button type="button" className={estadoTiempo === 'VENCIDO' ? 'active' : ''} onClick={() => setEstadoTiempo('VENCIDO')}><span>Vencidos</span><strong>{formatearNumero(conteoTiempo.VENCIDO)}</strong></button>
        <button type="button" className={estadoTiempo === 'PROXIMO_A_VENCER' ? 'active' : ''} onClick={() => setEstadoTiempo('PROXIMO_A_VENCER')}><span>Próximos</span><strong>{formatearNumero(conteoTiempo.PROXIMO_A_VENCER)}</strong></button>
        <button type="button" className={estadoTiempo === 'EN_PLAZO' ? 'active' : ''} onClick={() => setEstadoTiempo('EN_PLAZO')}><span>En plazo</span><strong>{formatearNumero(conteoTiempo.EN_PLAZO)}</strong></button>
        <button type="button" className={estadoTiempo === 'NUEVO' ? 'active' : ''} onClick={() => setEstadoTiempo('NUEVO')}><span>Nuevos</span><strong>{formatearNumero(conteoTiempo.NUEVO)}</strong></button>
      </div>

      <div className="platform-summary-strip">
        <div><span>Instagram</span><strong>{formatearNumero(conteoPlataforma.instagram)}</strong></div>
        <div><span>TikTok</span><strong>{formatearNumero(conteoPlataforma.tiktok)}</strong></div>
      </div>

      <div className="attention-list temporal-attention-list">
        {casosFiltrados.map((caso) => {
          const usuario = leerTiempo(caso, ['usuarioComentario', 'usuario_comentario']);
          const id = leerTiempo(caso, ['casoId', 'caso_id', 'id']);
          const dias = leerNumero(caso, ['diasHabilesTranscurridos', 'dias_habiles_transcurridos']);
          return (
            <Link className="attention-item" key={id} to={`/reclamos/${encodeURIComponent(usuario)}/casos/${id}`}>
              <div>
                <strong>{usuario}</strong>
                <span>{humanizarEnum(leerTiempo(caso, ['tipoIncidencia', 'tipo_incidencia']))}</span>
              </div>
              <div className="attention-meta">
                <EstadoTiempoBadge estado={leerTiempo(caso, ['estadoTiempo', 'estado_tiempo'])} />
                <small>{formatearNumero(dias)} días hábiles</small>
              </div>
            </Link>
          );
        })}
        {!casosFiltrados.length && <div className="empty-box">Sin casos en {ETIQUETAS_ESTADO_TIEMPO[estadoTiempo] || 'el filtro seleccionado'}.</div>}
      </div>
    </section>
  );
}

function VistaPerfilAdmin({ perfil, datos }) {
  const resumen = resumirLista(datos);
  const atencion = ordenarAtencion(datos).slice(0, 3);

  return (
    <article className={`profile-preview-card tone-${tonoPerfil(perfil)}`}>
      <div className="card-accent" />
      <div className="profile-preview-head">
        <div>
          <h4>{etiquetaPerfil(perfil)}</h4>
          <p>{descripcionPerfil(perfil)}</p>
        </div>
        <span className="badge badge-profile">{formatearNumero(resumen.altas)} alta+</span>
      </div>
      <div className="profile-preview-kpis">
        <div><span>Usuarios</span><strong>{formatearNumero(resumen.totalUsuarios)}</strong></div>
        <div><span>Casos</span><strong>{formatearNumero(resumen.totalCasos)}</strong></div>
        <div><span>Eventos</span><strong>{formatearNumero(resumen.totalEventos)}</strong></div>
        <div><span>Alta+</span><strong>{formatearNumero(resumen.altas)}</strong></div>
      </div>
      <div className="profile-preview-tags">
        {tiposClavePorPerfil(perfil).map((item) => <span key={item}>{item}</span>)}
      </div>
      <div className="profile-preview-list">
        {atencion.map((fila) => (
          <Link key={leer(fila, ['usuarioComentario', 'usuario_comentario'])} to={`/reclamos/${encodeURIComponent(leer(fila, ['usuarioComentario', 'usuario_comentario']))}`}>
            {leer(fila, ['usuarioComentario', 'usuario_comentario'])}
            <small>{formatearNumero(numero(fila, ['totalEventos', 'total_eventos'], 0))} eventos</small>
          </Link>
        ))}
        {!atencion.length && <small>Sin casos para esta vista.</small>}
      </div>
    </article>
  );
}

function VistaRolesAdmin({ usuarios, usuariosReclamantes }) {
  const perfilesConDatos = PERFILES_OPERATIVOS.map((perfil) => ({
    perfil,
    datos: filtrarPorPerfil(usuariosReclamantes, perfil),
  }));

  const resumenRoles = usuarios.reduce((acc, usuario) => {
    const rol = normalizar(leer(usuario, ['rol', 'rolNombre', 'nombreRol'], 'SIN_ROL')) || 'SIN_ROL';
    acc[rol] = (acc[rol] || 0) + 1;
    return acc;
  }, {});

  return (
    <section className="panel compact-panel admin-visibility-panel">
      <div className="section-title-row">
        <div>
          <h3>Vista por roles y perfiles</h3> </div>
      </div>

      <div className="role-summary-strip">
        {Object.entries(resumenRoles).map(([rol, total]) => (
          <div key={rol}>
            <span>{humanizarEnum(rol)}</span>
            <strong>{formatearNumero(total)}</strong>
          </div>
        ))}
      </div>

      <div className="profile-preview-grid">
        {perfilesConDatos.map(({ perfil, datos }) => (
          <VistaPerfilAdmin key={perfil} perfil={perfil} datos={datos} />
        ))}
      </div>
    </section>
  );
}

export default function Dashboard() {
  const rol = obtenerRol();
  const perfil = obtenerPerfil();
  const esAdmin = puedeAdministrarUsuarios(rol);
  const veMetricas = puedeVerMetricas(rol, perfil);

  const [resumenGlobal, setResumenGlobal] = useState({});
  const [usuariosReclamantes, setUsuariosReclamantes] = useState([]);
  const [usuariosInternos, setUsuariosInternos] = useState([]);
  const [casosTemporales, setCasosTemporales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  async function cargar() {
    setCargando(true);
    setError(null);

    try {
      const [resumen, reclamantes, usuarios, temporales] = await Promise.all([
        obtenerResumenCasos().catch(() => ({})),
        listarUsuariosReclamantes().catch(() => []),
        esAdmin ? listarUsuarios().catch(() => []) : Promise.resolve([]),
        listarCasosDerivacionPorFechas().catch(() => []),
      ]);

      setResumenGlobal(resumen || {});
      setUsuariosReclamantes(Array.isArray(reclamantes) ? reclamantes : []);
      setUsuariosInternos(Array.isArray(usuarios) ? usuarios : usuarios?.usuarios || usuarios?.content || []);
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

  const datosVisibles = useMemo(() => {
    if (esAdmin || normalizar(perfil) === 'GERENCIA') return usuariosReclamantes;
    return filtrarPorPerfil(usuariosReclamantes, perfil);
  }, [usuariosReclamantes, perfil, esAdmin]);

  const resumenVista = useMemo(() => resumirLista(datosVisibles), [datosVisibles]);
  const areasVista = useMemo(() => contarPorArea(datosVisibles), [datosVisibles]);
  const tiposVista = useMemo(() => contarPorTipo(datosVisibles), [datosVisibles]);

  if (cargando) return <Loading />;

  return (
    <div className="page page-compact">
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>
            Vista operativa personalizada. Cada perfil ve los reclamos sociales derivados a su área; administración y gerencia ven el panorama completo.
          </p>
        </div>
        <div className="header-actions">
          {veMetricas && <Link className="btn btn-primary" to="/reporteria">Ver métricas</Link>}
          <button className="btn btn-secondary" onClick={cargar}>Actualizar</button>
        </div>
      </div>

      <ErrorBox error={error} />

      <section className={`panel compact-panel perfil-context-panel tone-${tonoPerfil(perfil)}`}>
        <div className="card-accent" />
        <div>
          <span className="context-label">Vista actual</span>
          <h3>{esAdmin ? 'Administrador · Todas las áreas' : etiquetaPerfil(perfil)}</h3>
          <p>{esAdmin ? 'Acceso completo para supervisar roles, perfiles, reclamos y métricas.' : descripcionPerfil(perfil)}</p>
        </div>
        <div className="context-actions">
          <span className="badge badge-role">{etiquetaRol(rol)}</span>
          <span className="badge badge-profile">{etiquetaPerfil(perfil)}</span>
        </div>
      </section>

      <div className="grid-cards compact-cards dashboard-cards">
        <Card tone="violet" title="Usuarios" value={formatearNumero(resumenVista.totalUsuarios)} subtitle="Reclamantes visibles" />
        <Card tone="blue" title="Reclamos" value={formatearNumero(resumenVista.totalCasos)} subtitle="Casos agrupados" />
        <Card tone="red" title="Alta prioridad" value={formatearNumero(resumenVista.altas)} subtitle="Alta o crítica" />
        <Card tone="pink" title="Instagram" value={formatearNumero(contarPorPlataforma(casosTemporales).instagram)} subtitle="Casos temporales" />
        <Card tone="cyan" title="TikTok" value={formatearNumero(contarPorPlataforma(casosTemporales).tiktok)} subtitle="Casos temporales" />
      </div>

      <PanelTiempoOperativo casos={casosTemporales} />

      <div className="dashboard-operational-grid">
        <AtencionRecomendada datos={datosVisibles} />
        <section className="panel compact-panel quick-entry-panel">
          <h3>Accesos rápidos</h3>
          <p>Entradas principales según el flujo real del sistema.</p>
          <div className="quick-action-list">
            <Link className="quick-action-card tone-blue" to="/reclamos">
              <strong>Reclamos</strong>
              <span>Ver usuarios reclamantes, casos y evidencias.</span>
            </Link>
            {veMetricas && (
              <Link className="quick-action-card tone-violet" to="/reporteria">
                <strong>Métricas</strong>
                <span>Panel ejecutivo para jefatura y administración.</span>
              </Link>
            )}
            {esAdmin && (
              <Link className="quick-action-card tone-cyan" to="/usuarios">
                <strong>Usuarios</strong>
                <span>Roles, perfiles y cuentas internas.</span>
              </Link>
            )}
          </div>
        </section>
      </div>

      <div className="dashboard-operational-grid secondary-grid">
        <RankingSimple titulo="Áreas con más carga" subtitulo="Distribución visible para esta sesión" datos={areasVista} tipo="area" />
        <RankingSimple titulo="Tipos más repetidos" subtitulo="Incidencias detectadas con mayor frecuencia" datos={tiposVista} tipo="tipo" />
      </div>

      <EstadoSistema usuarios={usuariosInternos} resumenGlobal={resumenGlobal} perfilActual={perfil} />

      {esAdmin && <VistaRolesAdmin usuarios={usuariosInternos} usuariosReclamantes={usuariosReclamantes} />}
    </div>
  );
}
