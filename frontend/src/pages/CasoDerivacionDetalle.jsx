import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ErrorBox from '../components/ui/ErrorBox.jsx';
import Loading from '../components/ui/Loading.jsx';
import PrioridadBadge from '../components/reclamos/PrioridadBadge.jsx';
import { formatearFechaDia } from '../utils/fechas.js';
import { leerCampo } from '../utils/campos.js';
import { codigoCaso, humanizarEnum, normalizarUrlEvidencia } from '../utils/etiquetas.js';
import {
  obtenerCasoDerivacion,
  obtenerComentariosCasoDerivacion,
} from '../services/casosDerivacionService.js';

function leer(obj, nombres, valorPorDefecto = '') {
  return leerCampo(obj, nombres, valorPorDefecto);
}

function leerObligatorio(obj, nombres, etiqueta) {
  const valor = leerCampo(obj, nombres, '');
  if (valor === undefined || valor === null || valor === '') {
    return `${etiqueta} no recibido`;
  }

  return valor;
}

function formatearConfianza(valor) {
  if (valor === undefined || valor === null || valor === '') return 'Confianza no recibida';

  const numero = Number(valor);
  if (Number.isNaN(numero)) return String(valor);

  if (numero <= 1) return `${Math.round(numero * 100)}%`;
  return `${Math.round(numero)}%`;
}

function normalizarRespuestaDetalle(respuestaDetalle, respuestaComentarios) {
  const casoReal = respuestaDetalle?.caso || respuestaDetalle;

  const comentariosDesdeDetalle = Array.isArray(respuestaDetalle?.comentarios)
    ? respuestaDetalle.comentarios
    : [];

  const comentariosDesdeEndpoint = Array.isArray(respuestaComentarios)
    ? respuestaComentarios
    : [];

  const comentarios = comentariosDesdeEndpoint.length > 0
    ? comentariosDesdeEndpoint
    : comentariosDesdeDetalle;

  return {
    caso: casoReal || null,
    comentarios,
  };
}

export default function CasoDerivacionDetalle() {
  const { id, usuario } = useParams();
  const usuarioDecodificado = decodeURIComponent(usuario || '');
  const [caso, setCaso] = useState(null);
  const [comentarios, setComentarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const rutaVolver = usuarioDecodificado ? `/reclamos/${encodeURIComponent(usuarioDecodificado)}` : '/reclamos';
  const textoVolver = usuarioDecodificado ? `← Volver a casos de ${usuarioDecodificado}` : '← Volver a reclamos';

  async function cargar() {
    setCargando(true);
    setError(null);

    try {
      const [respuestaDetalle, respuestaComentarios] = await Promise.all([
        obtenerCasoDerivacion(id),
        obtenerComentariosCasoDerivacion(id),
      ]);

      const detalleNormalizado = normalizarRespuestaDetalle(respuestaDetalle, respuestaComentarios);

      setCaso(detalleNormalizado.caso);
      setComentarios(detalleNormalizado.comentarios);
    } catch (err) {
      setError(err);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, [id]);

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

  const codigo = codigoCaso(caso);
  const usuarioCaso = leerObligatorio(caso, ['usuarioComentario', 'usuario_comentario'], 'Usuario');
  const tipoIncidencia = leerObligatorio(caso, ['tipoIncidencia', 'tipo_incidencia'], 'Tipo');
  const areaDerivacion = leerObligatorio(caso, ['areaDerivacion', 'area_derivacion'], 'Área');
  const prioridad = leerObligatorio(caso, ['prioridad'], 'Prioridad');
  const cantidadEventos = leerObligatorio(caso, ['cantidadEventos', 'cantidad_eventos'], 'Eventos');
  const confianza = leer(caso, ['confianza'], '');
  const motivoDecision = leerObligatorio(caso, ['motivoDecision', 'motivo_decision'], 'Motivo');
  const primerEvento = leerObligatorio(caso, ['fechaPrimerEvento', 'fecha_primer_evento'], 'Primer evento');
  const ultimoEvento = leerObligatorio(caso, ['fechaUltimoEvento', 'fecha_ultimo_evento'], 'Último evento');

  return (
    <div className="page page-compact">
      <Link className="back-link" to={rutaVolver}>{textoVolver}</Link>

      <div className="page-header">
        <div>
          <h2>{codigo}</h2>
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
            <span>Código</span><strong>{codigo}</strong>
            <span>Usuario reclamante</span><strong>{usuarioCaso}</strong>
            <span>Tipo detectado</span><strong>{humanizarEnum(tipoIncidencia)}</strong>
            <span>Área destino</span><strong>{humanizarEnum(areaDerivacion)}</strong>
            <span>Prioridad</span><strong><PrioridadBadge prioridad={prioridad} /></strong>
            <span>Eventos asociados</span><strong>{cantidadEventos}</strong>            
          </div>

          <h4>Motivo de clasificación</h4>
          <p>{motivoDecision}</p>
        </section>

        <section className="panel compact-panel form-panel">
          <h3>Derivación generada</h3>
          <div className="derivation-box">
            <span>Área responsable</span>
            <strong>{humanizarEnum(areaDerivacion)}</strong>
            <small>El sistema centraliza el reclamo, conserva la evidencia y deja la derivación generada para el área responsable.</small>
          </div>

          <div className="derivation-box derivation-box-secondary">
            <span>Clasificación</span>
            <strong>{humanizarEnum(tipoIncidencia)}</strong>
            <small>Prioridad: {humanizarEnum(prioridad)} · Eventos asociados: {cantidadEventos}</small>
          </div>

          {linksEvidencia.length > 0 && (
            <div className="evidence-link-grid evidence-link-grid-clean">
              {linksEvidencia.slice(0, 12).map((url, index) => (
                <a key={url} className="btn btn-evidence" href={url} target="_blank" rel="noreferrer">
                  Evidencia {index + 1}
                </a>
              ))}
            </div>
          )}
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
                  <strong>{leerObligatorio(comentario, ['usuarioComentario', 'usuario_comentario'], 'Usuario')}</strong>
                  <span>{humanizarEnum(leerObligatorio(comentario, ['plataforma'], 'Plataforma'))} · {humanizarEnum(leerObligatorio(comentario, ['tipoPublicacion', 'tipo_publicacion'], 'Tipo publicación'))}</span>
                </div>
                <p>{leerObligatorio(comentario, ['textoComentario', 'texto_comentario'], 'Texto')}</p>
                <div className="evidence-meta">
                  <span>Fecha comentario: {formatearFechaDia(leerObligatorio(comentario, ['fechaComentario', 'fecha_comentario'], 'Fecha comentario'))}</span>
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