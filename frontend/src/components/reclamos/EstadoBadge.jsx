import { etiquetaEstadoCaso } from '../../utils/etiquetas.js';

export default function EstadoBadge({ estado }) {
  const raw = String(estado || '').toLowerCase();
  return <span className={`badge badge-state estado-${raw}`}>{etiquetaEstadoCaso(estado)}</span>;
}
