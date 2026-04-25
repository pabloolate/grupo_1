import { Link } from 'react-router-dom';
import { formatearFecha } from '../../utils/fechas.js';
import EstadoBadge from './EstadoBadge.jsx';
import PrioridadBadge from './PrioridadBadge.jsx';

function leerCampo(obj, nombres, fallback = '') {
  for (const nombre of nombres) {
    if (obj?.[nombre] !== undefined && obj?.[nombre] !== null) return obj[nombre];
  }
  return fallback;
}

export default function ReclamoTable({ reclamos }) {
  if (!Array.isArray(reclamos) || reclamos.length === 0) {
    return <div className="empty-box">No hay reclamos para mostrar.</div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Cliente</th>
            <th>Asunto</th>
            <th>Estado</th>
            <th>Prioridad</th>
            <th>Canal</th>
            <th>Fecha</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {reclamos.map((reclamo) => {
            const id = leerCampo(reclamo, ['id']);
            const codigo = leerCampo(reclamo, ['codigoReclamo', 'codigo_reclamo', 'codigo'], `#${id}`);
            const estado = leerCampo(reclamo, ['estado', 'estadoNombre', 'nombreEstado']);
            const prioridad = leerCampo(reclamo, ['prioridad', 'prioridadNombre', 'nombrePrioridad']);
            const canal = leerCampo(reclamo, ['canal', 'canalNombre', 'nombreCanal']);
            return (
              <tr key={id || codigo}>
                <td>{codigo}</td>
                <td>{leerCampo(reclamo, ['nombreCliente', 'nombre_cliente'])}</td>
                <td>{leerCampo(reclamo, ['asunto'])}</td>
                <td><EstadoBadge estado={estado} /></td>
                <td><PrioridadBadge prioridad={prioridad} /></td>
                <td>{canal}</td>
                <td>{formatearFecha(leerCampo(reclamo, ['fechaCreacion', 'fecha_creacion']))}</td>
                <td><Link className="link-button" to={`/reclamos/${id}`}>Ver</Link></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
