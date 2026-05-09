const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

let pool = null;

function leerBooleano(valor, defecto = false) {
  if (valor === undefined || valor === null || valor === '') return defecto;
  return ['true', '1', 'yes', 'si', 'sí'].includes(String(valor).trim().toLowerCase());
}

function getPool() {
  if (pool) return pool;

  const usarSsl = leerBooleano(process.env.DB_SSL, false);

  pool = new Pool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'sentimentalizador_simple',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || '',
    max: Number(process.env.DB_POOL_LIMIT || 5),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
    connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 10000),
    ssl: usarSsl ? { rejectUnauthorized: false } : false,
  });

  return pool;
}

async function probarConexion() {
  const { rows } = await getPool().query('SELECT 1 AS ok');
  return rows?.[0]?.ok === 1;
}

async function inicializarBd() {
  const db = getPool();

  await db.query(`
    CREATE TABLE IF NOT EXISTS publicaciones_negativas (
      id BIGSERIAL PRIMARY KEY,
      plataforma VARCHAR(40) NOT NULL,
      tipo_publicacion VARCHAR(40) NOT NULL,
      url_origen TEXT NULL,
      url_publicacion TEXT NOT NULL,
      hash_publicacion CHAR(64) NOT NULL UNIQUE,
      texto_publicacion TEXT NULL,
      fecha_publicacion DATE NULL,
      hora_publicacion VARCHAR(10) NULL,
      likes INTEGER NULL DEFAULT 0,
      views INTEGER NULL DEFAULT 0,
      cantidad_comentarios_detectados INTEGER NOT NULL DEFAULT 0,
      cantidad_comentarios_negativos INTEGER NOT NULL DEFAULT 0,
      ruta_imagen_local TEXT NULL,
      url_imagen_original TEXT NULL,
      fecha_scraping TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_publicaciones_plataforma_fecha
      ON publicaciones_negativas (plataforma, fecha_scraping);
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_publicaciones_tipo_fecha
      ON publicaciones_negativas (tipo_publicacion, fecha_scraping);
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS comentarios_negativos (
      id BIGSERIAL PRIMARY KEY,
      publicacion_id BIGINT NOT NULL REFERENCES publicaciones_negativas(id) ON DELETE CASCADE,
      plataforma VARCHAR(40) NOT NULL,
      tipo_publicacion VARCHAR(40) NOT NULL,
      url_publicacion TEXT NOT NULL,
      hash_comentario CHAR(64) NOT NULL UNIQUE,
      texto_comentario TEXT NOT NULL,
      sentimiento VARCHAR(40) NOT NULL DEFAULT 'negativo',
      puntaje INTEGER NOT NULL DEFAULT 1,
      likes INTEGER NOT NULL DEFAULT 0,
      replies INTEGER NOT NULL DEFAULT 0,
      fecha_scraping TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_comentarios_publicacion
      ON comentarios_negativos (publicacion_id);
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_comentarios_plataforma_fecha
      ON comentarios_negativos (plataforma, fecha_scraping);
  `);
}

async function cerrarPool() {
  if (!pool) return;
  await pool.end();
  pool = null;
}

module.exports = {
  getPool,
  probarConexion,
  inicializarBd,
  cerrarPool,
};
