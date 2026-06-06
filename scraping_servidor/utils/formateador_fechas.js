'use strict';

const moment = require('moment-timezone');
require('moment/locale/es');

const ZONA_HORARIA = process.env.ZONA_HORARIA || 'America/Santiago';

function limpiarFechaRaw(valor) {
  return String(valor ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s·•.\-–—:|]+/u, '')
    .replace(/^(edited|editado)\s+/i, '')
    .trim();
}

function formatearSalida(fechaMoment) {
  if (!fechaMoment || !fechaMoment.isValid()) return null;
  return fechaMoment.tz(ZONA_HORARIA).format('YYYY-MM-DD');
}

function parsearIsoOFechaAbsoluta(raw) {
  const texto = limpiarFechaRaw(raw);
  if (!texto) return null;

  const fechaIso = moment(texto, moment.ISO_8601, true);
  if (fechaIso.isValid()) return formatearSalida(fechaIso);

  const formatos = [
    'YYYY-MM-DD',
    'YYYY-M-D',
    'YYYY/MM/DD',
    'YYYY/M/D',
    'DD-MM-YYYY',
    'D-M-YYYY',
    'DD/MM/YYYY',
    'D/M/YYYY',
    'MMM D, YYYY',
    'MMMM D, YYYY',
    'D MMM YYYY',
    'D MMMM YYYY',
  ];

  for (const formato of formatos) {
    const fecha = moment.tz(texto, formato, 'en', true, ZONA_HORARIA);
    if (fecha.isValid()) return fecha.format('YYYY-MM-DD');
  }

  for (const formato of formatos) {
    const fecha = moment.tz(texto, formato, 'es', true, ZONA_HORARIA);
    if (fecha.isValid()) return fecha.format('YYYY-MM-DD');
  }

  return null;
}

function unidadInstagram(tokenUnidad) {
  const token = String(tokenUnidad || '').trim().toLowerCase();

  if (['m', 'min', 'mins', 'minute', 'minutes', 'minuto', 'minutos'].includes(token)) return 'minutes';
  if (['h', 'hr', 'hrs', 'hour', 'hours', 'hora', 'horas'].includes(token)) return 'hours';
  if (['d', 'day', 'days', 'día', 'dia', 'días', 'dias'].includes(token)) return 'days';
  if (['w', 'wk', 'wks', 'week', 'weeks', 'sem', 'semana', 'semanas'].includes(token)) return 'weeks';

  return null;
}

function formatearFechaInstagram(valorRaw) {
  const raw = limpiarFechaRaw(valorRaw);
  if (!raw) return null;

  const absoluta = parsearIsoOFechaAbsoluta(raw);
  if (absoluta) return absoluta;

  const ahora = moment().tz(ZONA_HORARIA);
  const texto = raw.toLowerCase();

  if (['now', 'just now', 'today', 'ahora', 'recién', 'recien', 'hoy'].includes(texto)) {
    return ahora.format('YYYY-MM-DD');
  }

  if (['yesterday', 'ayer'].includes(texto)) {
    return ahora.clone().subtract(1, 'day').format('YYYY-MM-DD');
  }

  let match = texto.match(/^(\d+)\s*(m|min|mins|minute|minutes|minuto|minutos|h|hr|hrs|hour|hours|hora|horas|d|day|days|día|dia|días|dias|w|wk|wks|week|weeks|sem|semana|semanas)\s*(ago)?$/i);
  if (match) {
    const cantidad = Number.parseInt(match[1], 10);
    const unidad = unidadInstagram(match[2]);
    if (Number.isFinite(cantidad) && unidad) {
      return ahora.clone().subtract(cantidad, unidad).format('YYYY-MM-DD');
    }
  }

  match = texto.match(/^hace\s+(\d+)\s*(m|min|mins|minuto|minutos|h|hr|hrs|hora|horas|d|día|dia|días|dias|w|wk|sem|semana|semanas)$/i);
  if (match) {
    const cantidad = Number.parseInt(match[1], 10);
    const unidad = unidadInstagram(match[2]);
    if (Number.isFinite(cantidad) && unidad) {
      return ahora.clone().subtract(cantidad, unidad).format('YYYY-MM-DD');
    }
  }

  return null;
}

function formatearFechaTiktok(valorRaw) {
  const raw = limpiarFechaRaw(valorRaw);
  if (!raw) return null;

  const ahora = moment().tz(ZONA_HORARIA);

  let match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const [, anio, mes, dia] = match;
    const fecha = moment.tz(`${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`, 'YYYY-MM-DD', true, ZONA_HORARIA);
    return fecha.isValid() ? fecha.format('YYYY-MM-DD') : null;
  }

  match = raw.match(/^(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const [, mes, dia] = match;
    const fecha = moment.tz(`${ahora.year()}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`, 'YYYY-MM-DD', true, ZONA_HORARIA);
    return fecha.isValid() ? fecha.format('YYYY-MM-DD') : null;
  }

  const absoluta = parsearIsoOFechaAbsoluta(raw);
  if (absoluta) return absoluta;

  return null;
}

module.exports = {
  formatearFechaInstagram,
  formatearFechaTiktok,
  limpiarFechaRaw,
};
