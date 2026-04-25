export default function EstadoBadge({ estado }) {
  return <span className="badge badge-state">{estado || 'SIN_ESTADO'}</span>;
}
