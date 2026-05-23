export function humanizarEnum(valor, fallback = 'Sin dato') {
  if (valor === undefined || valor === null || valor === '') return fallback;

  const texto = String(valor)
    .replace(/[{}]/g, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  if (!texto) return fallback;

  const especiales = {
    tv: 'TV',
    wifi: 'WiFi',
    wi: 'Wi',
    fi: 'Fi',
    sernac: 'SERNAC',
  };

  return texto
    .split(' ')
    .map((palabra) => especiales[palabra] || palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(' ');
}

export function humanizarListaEnums(valor, fallback = 'Sin dato') {
  if (valor === undefined || valor === null || valor === '') return fallback;

  if (Array.isArray(valor)) {
    return valor.map((item) => humanizarEnum(item, '')).filter(Boolean).join(', ') || fallback;
  }

  return String(valor)
    .replace(/[{}]/g, '')
    .split(',')
    .map((item) => humanizarEnum(item, ''))
    .filter(Boolean)
    .join(', ') || fallback;
}

export function etiquetaEstadoCaso(estado) {
  const normalizado = String(estado || '').trim().toUpperCase();

  const mapa = {
    ABIERTO: 'Pendiente',
    DERIVADO: 'Derivado',
    EN_GESTION: 'En revisión',
    ESCALADO: 'Escalado',
    CERRADO: 'Revisado',
    DESCARTADO: 'Descartado',
    ERROR: 'Error',
  };

  return mapa[normalizado] || humanizarEnum(normalizado, 'Sin estado');
}

export function etiquetaPrioridad(prioridad) {
  return humanizarEnum(prioridad, 'Sin prioridad');
}

export function codigoCaso(caso) {
  const codigoReclamo = caso?.codigoReclamo || caso?.codigo_reclamo;
  if (codigoReclamo) return codigoReclamo;

  const reclamoId = caso?.reclamoIdGenerado || caso?.reclamo_id_generado;
  if (reclamoId) return `RECLAMO-${reclamoId}`;

  const id = caso?.id;
  if (id !== undefined && id !== null && id !== '') {
    return `CD-${String(id).padStart(5, '0')}`;
  }

  return 'Sin código';
}

export function normalizarUrlEvidencia(urlOriginal) {
  const url = String(urlOriginal || '').trim();
  if (!url) return '';

  const limpiar = url
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^\/+/, '');

  const matchPost = limpiar.match(/^p\/([^/?#]+)/i);
  if (matchPost?.[1]) {
    return `https://www.instagram.com/vtrchile/p/${matchPost[1]}`;
  }

  const matchReel = limpiar.match(/^reel\/([^/?#]+)/i);
  if (matchReel?.[1]) {
    return `https://www.instagram.com/vtrchile/reel/${matchReel[1]}`;
  }

  if (/^p\/|^reel\//i.test(limpiar)) {
    return `https://www.instagram.com/vtrchile/${limpiar}`;
  }

  if (/^https?:\/\//i.test(url)) return url;

  if (/^www\./i.test(url)) return `https://${url}`;

  return url;
}

export function abreviarTexto(texto, maximo = 80) {
  const limpio = String(texto || '').trim();
  if (limpio.length <= maximo) return limpio;
  return `${limpio.slice(0, maximo - 1)}…`;
}
