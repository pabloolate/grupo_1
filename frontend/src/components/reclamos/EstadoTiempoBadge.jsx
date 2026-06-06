import { humanizarEnum } from '../../utils/etiquetas.js';

const CLASES_ESTADO_TIEMPO = {
  CRITICO: 'estado-tiempo-critico',
  VENCIDO: 'estado-tiempo-vencido',
  PROXIMO_A_VENCER: 'estado-tiempo-proximo',
  EN_PLAZO: 'estado-tiempo-plazo',
  NUEVO: 'estado-tiempo-nuevo',
};

export default function EstadoTiempoBadge({ estado }) {
  const valor = String(estado || '').trim().toUpperCase();
  const clase = CLASES_ESTADO_TIEMPO[valor] || 'estado-tiempo-desconocido';

  return (
    <span className={`badge badge-time ${clase}`}>
      {humanizarEnum(valor || 'SIN_ESTADO')}
    </span>
  );
}
