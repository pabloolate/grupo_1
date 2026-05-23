import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ErrorBox from '../components/ui/ErrorBox.jsx';
import Loading from '../components/ui/Loading.jsx';
import EstadoBadge from '../components/reclamos/EstadoBadge.jsx';
import PrioridadBadge from '../components/reclamos/PrioridadBadge.jsx';
import { formatearFecha } from '../utils/fechas.js';
import { leerCampo } from '../utils/campos.js';
import { codigoCaso, humanizarEnum, normalizarUrlEvidencia } from '../utils/etiquetas.js';
import {
  cambiarEstadoCasoDerivacion,
  obtenerCasoDerivacion,
  obtenerComentariosCasoDerivacion,
} from '../services/casosDerivacionService.js';

const ESTADOS_REVISION = [
  { valor: 'ABIERTO', etiqueta: 'Pendiente' },
  { valor: 'DERIVADO', etiqueta: 'Derivado' },
  { valor: 'EN_GESTION', etiqueta: 'En revisión' },
  { valor: 'CERRADO', etiqueta: 'Revisado' },
  { valor: 'DESCARTADO', etiqueta: 'Descartado' },
];

function leer(obj, nombres, fallback = '') {
  return leerCampo(obj, nombres, fallback);
}

export default function CasoDerivacionDetalle() {
  const { id, usuario } = useParams();
  const usuarioDecodificado = decodeURIComponent(usuario || '');
  const [caso, setCaso] = useState(null);
  const [comentarios, setComentarios] = useState([]);
  const [estadoSeleccionado, setEstadoSeleccionado] = useState('ABIERTO');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  const rutaVolver = usuarioDecodificado ? `/reclamos/${encodeURIComponent(usuarioDecodificado)}` : '/reclamos';
  const textoVolver = usuarioDecodificado ? `← Volver a casos de ${usuarioDecodificado}` : '← Volver a reclamos';

  async function cargar() {
    setCargando(true);
    setError(null);

    try {
      const [casoData, comentariosData] = await Promise.all([
        obtenerCasoDerivacion(id),
        obtenerComentariosCasoDerivacion(id).catch(() => []),
      ]);
      setCaso(casoData);
      setComentarios(Array.isArray(comentariosData) ? comentariosData : []);
      setEstadoSeleccionado(leer(casoData, ['estadoCaso', 'estado_caso'], 'ABIERTO'));
    } catch (err) {
      setError(err);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, [id]);

  async function cambiarEstado(nuevoEstado = estadoSeleccionado) {
    setGuardando(true);
    setError(null);

    try {
      await cambiarEstadoCasoDerivacion(id, nuevoEstado);
      await cargar();
    } catch (err) {
      setError(err);
    } finally {
      setGuardando(false);
    }
  }

  const linksEvidencia = useMemo(() => {
    const urls = new Set();
    comentarios.forEach((comentario) => {
      const url = normalizarUrlEvidencia(leer(comentario, ['urlPublicacion', 'url_publicacion']));
      if (url) urls.add(url);
    });
    return Array.from(urls);
  }, [comentarios]);

  if (cargando) return <Loading />;

  if (!caso) {
    return (
      <div className="page">
        <Link className="back-link" to={rutaVolver}>{textoVolver}</Link>
        <ErrorBox error={error || new Error('Caso no encontrado')} />
      </div>
    );
  }

  const usuarioCaso = leer(caso, ['usuarioComentario', 'usuario_comentario'], usuarioDecodificado || 'sin_usuario');
  const tipoIncidencia = leer(caso, ['tipoIncidencia', 'tipo_incidencia']);
  const areaDerivacion = leer(caso, ['areaDerivacion', 'area_derivacion']);
  const estadoActual = leer(caso, ['estadoCaso', 'estado_caso']);

  return (
    <div className="page page-compact">
      <Link className="back-link" to={rutaVolver}>{textoVolver}</Link>

      <div className="page-header">
        <div>
          <h2>{codigoCaso(caso)}</h2>
          <p>{usuarioCaso} · {humanizarEnum(tipoIncidencia)} · Área destino: {humanizarEnum(areaDerivacion)}</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={cargar}>Actualizar</button>
        </div>
      </div>

      <ErrorBox error={error} />

      <div className="detail-grid derivacion-grid">
        <section className="panel compact-panel">
          <h3>Resumen del reclamo detectado</h3>
          <div className="detail-list compact-detail-list">
            <span>Código</span><strong>{codigoCaso(caso)}</strong>
            <span>Usuario reclamante</span><strong>{usuarioCaso}</strong>
            <span>Tipo detectado</span><strong>{humanizarEnum(tipoIncidencia)}</strong>
            <span>Área destino</span><strong>{humanizarEnum(areaDerivacion)}</strong>
            <span>Prioridad</span><strong><PrioridadBadge prioridad={leer(caso, ['prioridad'])} /></strong>
            <span>Estado de revisión</span><strong><EstadoBadge estado={estadoActual} /></strong>
            <span>Eventos asociados</span><strong>{leer(caso, ['cantidadEventos', 'cantidad_eventos'], 0)}</strong>
            <span>Confianza</span><strong>{leer(caso, ['confianza'], 'Sin dato')}</strong>
            <span>Primer evento</span><strong>{formatearFecha(leer(caso, ['fechaPrimerEvento', 'fecha_primer_evento']))}</strong>
            <span>Último evento</span><strong>{formatearFecha(leer(caso, ['fechaUltimoEvento', 'fecha_ultimo_evento']))}</strong>
          </div>

          <h4>Motivo de clasificación</h4>
          <p>{leer(caso, ['motivoDecision', 'motivo_decision'], 'Sin motivo registrado.')}</p>
        </section>

        <section className="panel compact-panel form-panel">
          <h3>Derivación sugerida</h3>
          <div className="derivation-box">
            <span>Área responsable</span>
            <strong>{humanizarEnum(areaDerivacion)}</strong>
            <small>Este sistema no reemplaza el flujo formal: deja evidencia agrupada y área sugerida para que el área correspondiente revise el caso.</small>
          </div>

          <label>Estado de revisión</label>
          <select value={estadoSeleccionado} onChange={(e) => setEstadoSeleccionado(e.target.value)}>
            {ESTADOS_REVISION.map((estado) => <option key={estado.valor} value={estado.valor}>{estado.etiqueta}</option>)}
          </select>
          <button className="btn btn-primary" disabled={guardando} onClick={() => cambiarEstado()}>Actualizar revisión</button>

          <div className="quick-actions">
            <button className="btn btn-secondary" disabled={guardando} onClick={() => cambiarEstado('CERRADO')}>Marcar revisado</button>
            <button className="btn btn-secondary" disabled={guardando} onClick={() => cambiarEstado('DESCARTADO')}>Descartar</button>
          </div>

          <h4>Links de evidencia</h4>
          <div className="evidence-link-grid">
            {linksEvidencia.length ? linksEvidencia.slice(0, 12).map((url, index) => (
              <a key={url} className="btn btn-evidence" href={url} target="_blank" rel="noreferrer">
                Evidencia {index + 1}
              </a>
            )) : <p>Sin links asociados.</p>}
            {linksEvidencia.length > 12 && <small>{linksEvidencia.length - 12} links adicionales en las evidencias.</small>}
          </div>
        </section>
      </div>

      <section className="panel compact-panel">
        <h3>Evidencias / comentarios negativos</h3>
        <div className="list-stack evidence-list-compact">
          {comentarios.map((comentario) => {
            const url = normalizarUrlEvidencia(leer(comentario, ['urlPublicacion', 'url_publicacion']));
            return (
              <article className="evidence-card" key={leer(comentario, ['comentarioNegativoId', 'comentario_negativo_id', 'id'])}>
                <div className="evidence-head">
                  <strong>{leer(comentario, ['usuarioComentario', 'usuario_comentario'], usuarioCaso)}</strong>
                  <span>{humanizarEnum(leer(comentario, ['plataforma']))} · {humanizarEnum(leer(comentario, ['tipoPublicacion', 'tipo_publicacion']))}</span>
                </div>
                <p>{leer(comentario, ['textoComentario', 'texto_comentario'])}</p>
                <div className="evidence-meta">
                  <span>Likes: {leer(comentario, ['likes'], 0)}</span>
                  <span>Respuestas: {leer(comentario, ['replies'], 0)}</span>
                  <span>{formatearFecha(leer(comentario, ['fechaScraping', 'fecha_scraping']))}</span>
                </div>
                {url && (
                  <a className="btn btn-evidence" href={url} target="_blank" rel="noreferrer">Abrir publicación</a>
                )}
              </article>
            );
          })}
          {!comentarios.length && <div className="empty-box">Este caso no tiene evidencias visibles.</div>}
        </div>
      </section>
    </div>
  );
}
