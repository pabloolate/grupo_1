import { etiquetaPrioridad } from '../../utils/etiquetas.js';

export default function PrioridadBadge({ prioridad }) {
  return (
    <span className={`badge badge-priority prioridad-${String(prioridad || '').toLowerCase()}`}>
      {etiquetaPrioridad(prioridad)}
    </span>
  );
}
