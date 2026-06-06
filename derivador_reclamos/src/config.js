const fs = require('fs');
const path = require('path');
require('dotenv').config();

function leerBooleanEnv(nombreVariable, valorDefecto = false) {
  const valor = process.env[nombreVariable];

  if (valor === undefined || valor === null || valor === '') {
    return valorDefecto;
  }

  return ['true', '1', 'yes', 'si', 'sí'].includes(String(valor).toLowerCase());
}

function leerEnteroEnv(nombreVariable, valorDefecto) {
  const valor = Number(process.env[nombreVariable]);

  if (!Number.isInteger(valor) || valor <= 0) {
    return valorDefecto;
  }

  return valor;
}

function leerDecimalEnv(nombreVariable, valorDefecto) {
  const valor = Number(process.env[nombreVariable]);

  if (!Number.isFinite(valor)) {
    return valorDefecto;
  }

  return valor;
}

function leerPromptDerivador() {
  const promptDesdeEnv = process.env.PROMPT_DERIVADOR_RECLAMOS;

  if (promptDesdeEnv && promptDesdeEnv.trim()) {
    return promptDesdeEnv.trim();
  }

  const rutaPrompt = path.join(process.cwd(), 'prompts', 'derivador_reclamos.txt');

  if (fs.existsSync(rutaPrompt)) {
    return fs.readFileSync(rutaPrompt, 'utf8').trim();
  }

  return 'Eres un clasificador de reclamos no formales provenientes de canales digitales. Responde exclusivamente JSON válido.';
}

const config = {
  modoTest: leerBooleanEnv('MODO_TEST', true),
  usarOllama: leerBooleanEnv('IA_USAR_OLLAMA', false),

  derivador: {
    loteRegistro: leerEnteroEnv('DERIVADOR_LOTE', 10),
    loteProceso: leerEnteroEnv('DERIVADOR_PROCESAR_LOTE', 1),
    maxIntentos: leerEnteroEnv('DERIVADOR_MAX_INTENTOS', 3),
    intervaloMs: leerEnteroEnv('DERIVADOR_INTERVALO_MS', 60000),
  },

  ollama: {
    url: process.env.OLLAMA_URL || 'http://127.0.0.1:11434',
    modelo: process.env.OLLAMA_MODEL || 'llama3.1:8b',
    temperature: leerDecimalEnv('OLLAMA_TEMPERATURE', 0.2),
    topP: leerDecimalEnv('OLLAMA_TOP_P', 0.9),
    timeoutMs: leerEnteroEnv('OLLAMA_TIMEOUT_MS', 60000),
    promptBase: leerPromptDerivador(),
  },
};

module.exports = config;