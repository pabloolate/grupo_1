CREATE DATABASE IF NOT EXISTS sentimentalizador_simple CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sentimentalizador_simple;

CREATE TABLE IF NOT EXISTS publicaciones_negativas (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  plataforma VARCHAR(40) NOT NULL,
  tipo_publicacion VARCHAR(40) NOT NULL,
  url_origen TEXT NULL,
  url_publicacion VARCHAR(1000) NOT NULL,
  hash_publicacion CHAR(64) NOT NULL,
  texto_publicacion MEDIUMTEXT NULL,
  fecha_publicacion DATE NULL,
  hora_publicacion VARCHAR(10) NULL,
  likes INT NULL DEFAULT 0,
  views INT NULL DEFAULT 0,
  cantidad_comentarios_detectados INT NOT NULL DEFAULT 0,
  cantidad_comentarios_negativos INT NOT NULL DEFAULT 0,
  ruta_imagen_local VARCHAR(1000) NULL,
  url_imagen_original TEXT NULL,
  fecha_scraping DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_hash_publicacion (hash_publicacion),
  KEY idx_plataforma_fecha (plataforma, fecha_scraping),
  KEY idx_tipo_fecha (tipo_publicacion, fecha_scraping)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comentarios_negativos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  publicacion_id BIGINT UNSIGNED NOT NULL,
  plataforma VARCHAR(40) NOT NULL,
  tipo_publicacion VARCHAR(40) NOT NULL,
  url_publicacion VARCHAR(1000) NOT NULL,
  hash_comentario CHAR(64) NOT NULL,
  texto_comentario MEDIUMTEXT NOT NULL,
  sentimiento VARCHAR(40) NOT NULL DEFAULT 'negativo',
  puntaje INT NOT NULL DEFAULT 1,
  likes INT NOT NULL DEFAULT 0,
  replies INT NOT NULL DEFAULT 0,
  fecha_scraping DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_hash_comentario (hash_comentario),
  KEY idx_publicacion (publicacion_id),
  KEY idx_plataforma_fecha (plataforma, fecha_scraping),
  CONSTRAINT fk_comentarios_publicacion
    FOREIGN KEY (publicacion_id) REFERENCES publicaciones_negativas(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
