const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const moment = require('moment-timezone');
const kleur = require('kleur');
const dotenv = require('dotenv');
const { exec } = require('child_process');

dotenv.config();

const MODO_LOG = String(process.env.MODO_LOG || 'false').trim().toLowerCase() === 'true';
const ZONA_HORARIA = process.env.ZONA_HORARIA || 'America/Santiago';

function log(...args) {
  if (MODO_LOG) console.log(...args);
}

function logWarn(...args) {
  if (MODO_LOG) console.warn(...args);
}

function logError(...args) {
  if (MODO_LOG) console.error(...args);
}

function dormir(ms) {
  return new Promise((resolve) => setTimeout(resolve, Number(ms || 0)));
}

function ahoraSql() {
  return moment().tz(ZONA_HORARIA).format('YYYY-MM-DD HH:mm:ss');
}

function hoyCarpeta() {
  return moment().tz(ZONA_HORARIA).format('YYYY-MM-DD');
}

function normalizarTexto(valor) {
  return String(valor || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function hashSha256(valor) {
  return crypto.createHash('sha256').update(String(valor || '')).digest('hex');
}

function asegurarDirectorio(ruta) {
  fs.mkdirSync(ruta, { recursive: true });
  return ruta;
}

function normalizarNumeroCompacto(valorTexto) {
  const txt = normalizarTexto(valorTexto).toLowerCase().replace(/,/g, '.');
  if (!txt) return 0;

  const match = txt.match(/(\d+(?:\.\d+)?)(\s*[kmb])?/i);
  if (!match) {
    const num = parseInt(txt.replace(/[^\d]/g, ''), 10);
    return Number.isFinite(num) ? num : 0;
  }

  let numero = parseFloat(match[1] || '0');
  const sufijo = String(match[2] || '').trim().toLowerCase();
  if (sufijo === 'k') numero *= 1000;
  if (sufijo === 'm') numero *= 1000000;
  if (sufijo === 'b') numero *= 1000000000;
  return Number.isFinite(numero) ? Math.round(numero) : 0;
}

function formateaFecha(fechaInput, linkScraping = '') {
  if (fechaInput == null) return null;

  let raw = normalizarTexto(fechaInput).replace(/\s*,\s*/g, ', ');
  if (!raw) return null;

  const now = moment().tz(ZONA_HORARIA);

  // ISO directo: Instagram suele entregar datetime tipo 2026-05-01T16:02:19.000Z
  let dtIso = moment(raw, moment.ISO_8601, true);
  if (dtIso.isValid()) {
    return dtIso.tz(ZONA_HORARIA).format('YYYY-MM-DD');
  }

  // Date parse nativo como respaldo para strings ISO o RFC no cubiertos
  const fechaNativa = new Date(raw);
  if (!Number.isNaN(fechaNativa.getTime())) {
    return moment(fechaNativa).tz(ZONA_HORARIA).format('YYYY-MM-DD');
  }

  let m = raw.toLowerCase().match(/^(\d+)\s*(day|days|hour|hours|minute|minutes|week|weeks|wk|wks|d|h|m|w)\s*(ago)?$/i);
  if (m) {
    const n = parseInt(m[1], 10);
    const token = m[2].toLowerCase();

    let unit = 'weeks';
    if (token === 'd' || token.startsWith('day')) unit = 'days';
    else if (token === 'h' || token.startsWith('hour')) unit = 'hours';
    else if (token === 'm' || token.startsWith('minute')) unit = 'minutes';

    return now.clone().subtract(n, unit).format('YYYY-MM-DD');
  }

  m = raw.toLowerCase().match(/^hace\s+(\d+)\s*(días?|dia|día|d|horas?|hora|h|minutos?|minuto|m|semanas?|sem|w)$/i);
  if (m) {
    const n = parseInt(m[1], 10);
    const token = m[2].toLowerCase();

    let unit = 'weeks';
    if (token === 'd' || token.startsWith('d') || token.startsWith('dia') || token.startsWith('día')) unit = 'days';
    else if (token === 'h' || token.startsWith('h') || token.startsWith('hora')) unit = 'hours';
    else if (token === 'm' || token.startsWith('m') || token.startsWith('min')) unit = 'minutes';

    return now.clone().subtract(n, unit).format('YYYY-MM-DD');
  }

  let dt = moment(raw, ['YYYY-MM-DD', 'DD-MM-YYYY', 'D-M-YYYY', 'DD/MM/YYYY', 'D/M/YYYY', 'YYYY/MM/DD'], true);
  if (dt.isValid()) return dt.format('YYYY-MM-DD');

  dt = moment(raw, ['MMMM D, YYYY', 'MMM D, YYYY'], 'en', true);
  if (!dt.isValid()) dt = moment(raw, ['MMMM D, YYYY', 'MMM D, YYYY'], 'en', false);
  if (dt.isValid()) return dt.format('YYYY-MM-DD');

  dt = moment(raw, ['MMMM D', 'MMM D', 'D MMMM', 'D MMM'], 'en', true);
  if (!dt.isValid()) dt = moment(raw, ['MMMM D', 'MMM D', 'D MMMM', 'D MMM'], 'en', false);
  if (dt.isValid()) return dt.year(now.year()).format('YYYY-MM-DD');

  if (MODO_LOG) {
    logWarn(kleur.yellow(`[fecha] No pude parsear ${JSON.stringify(raw)} link=${linkScraping}`));
  }

  return null;
}

function formateaFecha2(fecha) {
  if (!fecha || typeof fecha !== 'string') return null;
  const str = normalizarTexto(fecha)
    .replace(/^[\s·•.\-–—:|]+/u, '')
    .toLowerCase();

  const now = moment().tz(ZONA_HORARIA);
  if (!str) return null;
  if (['today', 'just now', 'now', 'hoy'].includes(str)) return now.format('YYYY-MM-DD');
  if (['yesterday', 'ayer'].includes(str)) return now.clone().subtract(1, 'days').format('YYYY-MM-DD');

  let m = str.match(/^hace\s+(\d+)\s*(d|día\(s\)?|días?|dia\(s\)?|dias?|h|hora\(s\)?|horas?|m|minuto\(s\)?|minutos?)$/i);
  if (m) {
    const n = parseInt(m[1], 10);
    const token = m[2].toLowerCase();
    let unit = /^d/.test(token) ? 'days' : /^h/.test(token) ? 'hours' : 'minutes';
    return now.clone().subtract(n, unit).format('YYYY-MM-DD');
  }

  m = str.match(/^(\d+)\s*(d|day|days|h|hour|hours|m|minute|minutes|w|week|weeks)\s*(ago)?$/i);
  if (m) {
    const n = parseInt(m[1], 10);
    const token = m[2].toLowerCase();
    let unit = token.startsWith('d') ? 'days' : token.startsWith('h') ? 'hours' : token.startsWith('m') ? 'minutes' : 'weeks';
    return now.clone().subtract(n, unit).format('YYYY-MM-DD');
  }

  return formateaFecha(str);
}

function killChromeProcesses() {
  return new Promise((resolve) => {
    const esLinux = String(process.env.ENTORNO || 'windows').trim().toLowerCase() === 'linux';
    const cmd = esLinux
      ? 'pkill -f "chrome|chromium" >/dev/null 2>&1 || true'
      : 'taskkill /IM chrome.exe /F >nul 2>&1';
    exec(cmd, () => resolve());
  });
}

async function descargarImagen({ urlImagen, rutaDestino }) {
  if (!urlImagen || !rutaDestino) return null;
  const axios = require('axios');
  asegurarDirectorio(path.dirname(rutaDestino));
  const response = await axios.get(urlImagen, {
    responseType: 'arraybuffer',
    timeout: 30000,
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Referer: 'https://www.instagram.com/',
    },
  });
  fs.writeFileSync(rutaDestino, response.data);
  return rutaDestino;
}

module.exports = {
  log,
  logWarn,
  logError,
  dormir,
  ahoraSql,
  hoyCarpeta,
  normalizarTexto,
  normalizarNumeroCompacto,
  hashSha256,
  asegurarDirectorio,
  formateaFecha,
  formateaFecha2,
  killChromeProcesses,
  descargarImagen,
};
