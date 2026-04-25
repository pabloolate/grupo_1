import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ErrorBox from '../components/ui/ErrorBox.jsx';
import Loading from '../components/ui/Loading.jsx';
import EstadoBadge from '../components/reclamos/EstadoBadge.jsx';
import PrioridadBadge from '../components/reclamos/PrioridadBadge.jsx';
import { formatearFecha } from '../utils/fechas.js';
import { agregarComentario, obtenerClasificacionIa, obtenerComentarios, obtenerHistorial, obtenerReclamo } from '../services/reclamosService.js';
import { obtenerRol } from '../utils/auth.js';
import { puedeModificarReclamos } from '../utils/roles.js';

function leer(obj, nombres, fallback = '') {
  for (const nombre of nombres) {
    if (obj?.[nombre] !== undefined && obj?.[nombre] !== null) return obj[nombre];
  }
  return fallback;
}

export default function ReclamoDetalle() {
  const { id } = useParams();
  const [reclamo, setReclamo] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [comentarios, setComentarios] = useState([]);
  const [ia, setIa] = useState(null);
  const [comentario, setComentario] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const puedeComentar = puedeModificarReclamos(obtenerRol());

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const [reclamoData, historialData, comentariosData, iaData] = await Promise.all([
        obtenerReclamo(id),
        obtenerHistorial(id).catch(() => []),
        obtenerComentarios(id).catch(() => []),
        obtenerClasificacionIa(id).catch(() => null),
      ]);
      setReclamo(reclamoData);
      setHistorial(Array.isArray(historialData) ? historialData : historialData?.historial || []);
      setComentarios(Array.isArray(comentariosData) ? comentariosData : comentariosData?.comentarios || []);
      setIa(Array.isArray(iaData) ? iaData[0] : iaData);
    } catch (err) {
      setError(err);
    } finally {
      setCargando(false);
    }
  }

  async function enviarComentario(evento) {
    evento.preventDefault();
    if (!comentario.trim()) return;
    try {
      await agregarComentario(id, comentario.trim());
      setComentario('');
      await cargar();
    } catch (err) {
      setError(err);
    }
  }

  useEffect(() => {
    cargar();
  }, [id]);

  if (cargando) return <Loading />;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link className="back-link" to="/reclamos">← Volver a reclamos</Link>
          <h2>{leer(reclamo, ['codigoReclamo', 'codigo_reclamo', 'codigo'], `Reclamo #${id}`)}</h2>
          <p>{leer(reclamo, ['asunto'])}</p>
        </div>
        <button className="btn btn-secondary" onClick={cargar}>Actualizar</button>
      </div>

      <ErrorBox error={error} />

      <div className="detail-grid">
        <section className="panel">
          <h3>Datos del reclamo</h3>
          <div className="detail-list">
            <span>Cliente</span><strong>{leer(reclamo, ['nombreCliente', 'nombre_cliente'])}</strong>
            <span>Correo</span><strong>{leer(reclamo, ['correoCliente', 'correo_cliente'])}</strong>
            <span>Estado</span><strong><EstadoBadge estado={leer(reclamo, ['estado', 'estadoNombre', 'nombreEstado'])} /></strong>
            <span>Prioridad</span><strong><PrioridadBadge prioridad={leer(reclamo, ['prioridad', 'prioridadNombre', 'nombrePrioridad'])} /></strong>
            <span>Canal</span><strong>{leer(reclamo, ['canal', 'canalNombre', 'nombreCanal'])}</strong>
            <span>Fecha</span><strong>{formatearFecha(leer(reclamo, ['fechaCreacion', 'fecha_creacion']))}</strong>
          </div>
          <h4>Descripción</h4>
          <p>{leer(reclamo, ['descripcion'])}</p>
        </section>

        <section className="panel">
          <h3>Clasificación IA</h3>
          {ia ? (
            <div className="detail-list">
              <span>Categoría sugerida</span><strong>{leer(ia, ['categoriaSugerida', 'categoria_sugerida'])}</strong>
              <span>Prioridad sugerida</span><strong>{leer(ia, ['prioridadSugerida', 'prioridad_sugerida'])}</strong>
              <span>Polaridad</span><strong>{leer(ia, ['polaridad'])}</strong>
              <span>Confianza</span><strong>{leer(ia, ['confianza'])}</strong>
              <span>Resumen</span><strong>{leer(ia, ['resumen'])}</strong>
            </div>
          ) : <p>Sin clasificación IA registrada.</p>}
        </section>
      </div>

      <section className="panel">
        <h3>Comentarios</h3>
        {puedeComentar && (
          <form className="comment-form" onSubmit={enviarComentario}>
            <input value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Agregar comentario interno" />
            <button className="btn btn-primary" type="submit">Agregar</button>
          </form>
        )}
        <div className="list-stack">
          {comentarios.map((item) => (
            <div className="list-item" key={item.id}>
              <strong>{leer(item, ['comentario'])}</strong>
              <span>{formatearFecha(leer(item, ['fechaCreacion', 'fecha_creacion']))}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h3>Historial</h3>
        <div className="list-stack">
          {historial.map((item) => (
            <div className="list-item" key={item.id}>
              <strong>{leer(item, ['accion'])}</strong>
              <span>{leer(item, ['observacion'])}</span>
              <small>{formatearFecha(leer(item, ['fechaCreacion', 'fecha_creacion']))}</small>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
