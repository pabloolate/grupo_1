export default function PrioridadBadge({ prioridad }) {
  return <span className={`badge badge-priority prioridad-${String(prioridad || '').toLowerCase()}`}>{prioridad || 'SIN_PRIORIDAD'}</span>;
}
