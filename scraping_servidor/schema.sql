-- PostgreSQL
-- Crea primero la base si no existe desde PowerShell/cmd:
-- createdb -U postgres sentimentalizador_simple
-- Luego ejecuta:
-- psql -U postgres -d sentimentalizador_simple -f schema.sql

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

CREATE INDEX IF NOT EXISTS idx_publicaciones_plataforma_fecha
  ON publicaciones_negativas (plataforma, fecha_scraping);

CREATE INDEX IF NOT EXISTS idx_publicaciones_tipo_fecha
  ON publicaciones_negativas (tipo_publicacion, fecha_scraping);

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

CREATE INDEX IF NOT EXISTS idx_comentarios_publicacion
  ON comentarios_negativos (publicacion_id);

CREATE INDEX IF NOT EXISTS idx_comentarios_plataforma_fecha
  ON comentarios_negativos (plataforma, fecha_scraping);
