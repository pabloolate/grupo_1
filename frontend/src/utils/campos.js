export function leerCampo(obj, nombres, fallback = '') {
  for (const nombre of nombres) {
    if (obj?.[nombre] !== undefined && obj?.[nombre] !== null) return obj[nombre];
  }
  return fallback;
}

export function normalizarLista(data, claves = []) {
  if (Array.isArray(data)) return data;
  for (const clave of claves) {
    if (Array.isArray(data?.[clave])) return data[clave];
  }
  return data?.content || data?.datos || data?.items || [];
}

export function formatearNumero(valor, fallback = 0) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return fallback;
  return numero.toLocaleString('es-CL');
}
