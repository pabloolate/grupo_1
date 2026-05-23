import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ErrorBox from '../components/ui/ErrorBox.jsx';
import Loading from '../components/ui/Loading.jsx';
import Card from '../components/ui/Card.jsx';
import EstadoBadge from '../components/reclamos/EstadoBadge.jsx';
import PrioridadBadge from '../components/reclamos/PrioridadBadge.jsx';
import { formatearFecha } from '../utils/fechas.js';
import { leerCampo, formatearNumero } from '../utils/campos.js';
import { codigoCaso, humanizarEnum, normalizarUrlEvidencia } from '../utils/etiquetas.js';
import { obtenerCasosUsuarioReclamante, obtenerComentariosUsuarioReclamante } from '../services/usuariosReclamantesService.js';

function leer(obj, nombres, fallback = '') {
  return leerCampo(obj, nombres, fallback);
}

export default function UsuarioReclamanteDetalle() {
  const { usuario } = useParams();
  const usuarioDecodificado = decodeURIComponent(usuario || '');
  const [casos, setCasos] = useState([]);
  const [comentarios, setComentarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  async function cargar() {
    setCargando(true);
    setError(null);

    try {
      const [casosData, comentariosData] = await Promise.all([
        obtenerCasosUsuarioReclamante(usuarioDecodificado),
        obtenerComentariosUsuarioReclamante(usuarioDecodificado).catch(() => []),
      ]);
      setCasos(Array.isArray(casosData) ? casosData : []);
      setComentarios(Array.isArray(comentariosData) ? comentariosData : []);
    } catch (err) {
      setError(err);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, [usuarioDecodificado]);

  const resumen = useMemo(() => ({
    casos: casos.length,
    eventos: casos.reduce((acc, caso) => acc + Number(leer(caso, ['cantidadEventos', 'cantidad_eventos'], 0) || 0), 0),
    pendientes: casos.filter((caso) => ['ABIERTO', 'DERIVADO', 'EN_GESTION', 'ESCALADO'].includes(String(leer(caso, ['estadoCaso', 'estado_caso'])).toUpperCase())).length,
    revisados: casos.filter((caso) => ['CERRADO', 'DESCARTADO'].includes(String(leer(caso, ['estadoCaso', 'estado_caso'])).toUpperCase())).length,
  }), [casos]);

  if (cargando) return <Loading />;

  return (
    <div className="page page-compact">
      <Link className="back-link" to="/reclamos">← Volver a reclamos</Link>

      <div className="page-header">
        <div>
          <h2>Reclamos de {usuarioDecodificado}</h2>
          <p>Casos detectados para el usuario reclamante, agrupados por tipo de incidencia y área destino.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={cargar}>Actualizar</button>
        </div>
      </div>

      <ErrorBox error={error} />

      <div className="grid-cards compact-cards">
        <Card tone="blue" title="Casos" value={formatearNumero(resumen.casos)} subtitle="Tipos agrupados" />
        <Card tone="cyan" title="Eventos" value={formatearNumero(resumen.eventos)} subtitle="Evidencias" />
        <Card tone="amber" title="Pendientes" value={formatearNumero(resumen.pendientes)} subtitle="Por revisión" />
        <Card tone="green" title="Revisados" value={formatearNumero(resumen.revisados)} subtitle="Cerrados/descartados" />
      </div>

      <section className="panel compact-panel">
        <h3>Casos del reclamante</h3>
        <div className="table-wrap dense-table">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Tipo detectado</th>
                <th>Área destino</th>
                <th>Prioridad</th>
                <th>Estado</th>
                <th>Eventos</th>
                <th>Último evento</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {casos.map((caso) => {
                const id = leer(caso, ['id']);
                return (
                  <tr key={id}>
                    <td><strong>{codigoCaso(caso)}</strong></td>
                    <td>{humanizarEnum(leer(caso, ['tipoIncidencia', 'tipo_incidencia']))}</td>
                    <td>{humanizarEnum(leer(caso, ['areaDerivacion', 'area_derivacion']))}</td>
                    <td><PrioridadBadge prioridad={leer(caso, ['prioridad'])} /></td>
                    <td><EstadoBadge estado={leer(caso, ['estadoCaso', 'estado_caso'])} /></td>
                    <td>{leer(caso, ['cantidadEventos', 'cantidad_eventos'], 0)}</td>
                    <td>{formatearFecha(leer(caso, ['fechaUltimoEvento', 'fecha_ultimo_evento']))}</td>
                    <td>
                      <Link className="btn btn-primary btn-table-action" to={`/reclamos/${encodeURIComponent(usuarioDecodificado)}/casos/${id}`}>
                        Ver caso
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!casos.length && <div className="empty-box">Sin casos para este usuario.</div>}
        </div>
      </section>

      <section className="panel compact-panel">
        <h3>Evidencias recientes del reclamante</h3>
        <div className="list-stack evidence-list-compact">
          {comentarios.slice(0, 20).map((comentario) => {
            const url = normalizarUrlEvidencia(leer(comentario, ['urlPublicacion', 'url_publicacion']));
            return (
              <article className="evidence-card" key={`${leer(comentario, ['comentarioNegativoId', 'comentario_negativo_id', 'id'])}-${url}`}>
                <div className="evidence-head">
                  <strong>{humanizarEnum(leer(comentario, ['plataforma']))} · {humanizarEnum(leer(comentario, ['tipoPublicacion', 'tipo_publicacion']))}</strong>
                  <span>{formatearFecha(leer(comentario, ['fechaScraping', 'fecha_scraping']))}</span>
                </div>
                <p>{leer(comentario, ['textoComentario', 'texto_comentario'])}</p>
                {url && (
                  <a className="btn btn-evidence" href={url} target="_blank" rel="noreferrer">Abrir publicación</a>
                )}
              </article>
            );
          })}
          {!comentarios.length && <div className="empty-box">Sin evidencias visibles para este usuario.</div>}
          {comentarios.length > 20 && <div className="empty-box">Mostrando 20 de {comentarios.length} evidencias. En el detalle de cada caso se ve el desglose completo.</div>}
        </div>
      </section>
    </div>
  );
}
