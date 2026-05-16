const { poolScraping } = require('./db');

async function registrarComentariosNuevosEnControl({ limite = 50 } = {}) {
  const cliente = await poolScraping.connect();

  try {
    await cliente.query('BEGIN');

    const resultado = await cliente.query(
      `
      WITH comentarios_nuevos AS (
        SELECT
          c.id AS comentario_negativo_id,
          c.hash_comentario
        FROM comentarios_negativos c
        LEFT JOIN derivador_control_comentarios d
          ON d.hash_comentario = c.hash_comentario
        WHERE d.id IS NULL
        ORDER BY c.fecha_scraping ASC, c.id ASC
        LIMIT $1
      ),
      insertados AS (
        INSERT INTO derivador_control_comentarios (
          comentario_negativo_id,
          hash_comentario,
          estado_derivacion,
          created_at,
          updated_at
        )
        SELECT
          comentario_negativo_id,
          hash_comentario,
          'PENDIENTE',
          NOW(),
          NOW()
        FROM comentarios_nuevos
        ON CONFLICT (hash_comentario) DO NOTHING
        RETURNING id, comentario_negativo_id, hash_comentario, estado_derivacion
      )
      SELECT *
      FROM insertados
      ORDER BY id ASC;
      `,
      [limite]
    );

    await cliente.query('COMMIT');

    return resultado.rows;
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
}

async function obtenerResumenControlDerivador() {
  const resultado = await poolScraping.query(`
    SELECT
      estado_derivacion,
      COUNT(*)::int AS total
    FROM derivador_control_comentarios
    GROUP BY estado_derivacion
    ORDER BY estado_derivacion ASC;
  `);

  return resultado.rows;
}

async function obtenerComentariosPendientes({ limite = 10 } = {}) {
  const resultado = await poolScraping.query(
    `
    SELECT
      d.id AS control_id,
      d.comentario_negativo_id,
      d.hash_comentario,
      d.estado_derivacion,
      c.plataforma,
      c.tipo_publicacion,
      c.url_publicacion,
      c.texto_comentario,
      c.sentimiento,
      c.puntaje,
      c.likes,
      c.replies,
      c.fecha_scraping
    FROM derivador_control_comentarios d
    JOIN comentarios_negativos c
      ON c.id = d.comentario_negativo_id
    WHERE d.estado_derivacion = 'PENDIENTE'
    ORDER BY c.fecha_scraping ASC, c.id ASC
    LIMIT $1;
    `,
    [limite]
  );

  return resultado.rows;
}

async function marcarControlEnProceso(controlId) {
  await poolScraping.query(
    `
    UPDATE derivador_control_comentarios
    SET estado_derivacion = 'EN_PROCESO',
        intentos = intentos + 1,
        fecha_ultimo_intento = NOW(),
        updated_at = NOW()
    WHERE id = $1;
    `,
    [controlId]
  );
}

async function marcarControlProcesado({
  controlId,
  estadoDerivacion,
  reclamoEntranteId,
  reclamoId,
  clasificacionId,
  decisionDerivador,
  motivoDecision,
}) {
  await poolScraping.query(
    `
    UPDATE derivador_control_comentarios
    SET estado_derivacion = $2,
        fecha_procesado = NOW(),
        reclamo_entrante_id_generado = $3,
        reclamo_id_generado = $4,
        clasificacion_id_generada = $5,
        decision_derivador = $6,
        motivo_decision = $7,
        error_derivacion = NULL,
        updated_at = NOW()
    WHERE id = $1;
    `,
    [
      controlId,
      estadoDerivacion,
      reclamoEntranteId,
      reclamoId,
      clasificacionId,
      decisionDerivador,
      motivoDecision,
    ]
  );
}

async function marcarControlError({ controlId, error }) {
  await poolScraping.query(
    `
    UPDATE derivador_control_comentarios
    SET estado_derivacion = 'ERROR',
        error_derivacion = $2,
        updated_at = NOW()
    WHERE id = $1;
    `,
    [controlId, String(error.message || error).slice(0, 4000)]
  );
}

async function contarComentariosSinControl() {
  const resultado = await poolScraping.query(`
    SELECT COUNT(*)::int AS total
    FROM comentarios_negativos c
    LEFT JOIN derivador_control_comentarios d
      ON d.hash_comentario = c.hash_comentario
    WHERE d.id IS NULL;
  `);

  return resultado.rows[0].total;
}

module.exports = {
  registrarComentariosNuevosEnControl,
  obtenerResumenControlDerivador,
  obtenerComentariosPendientes,
  marcarControlEnProceso,
  marcarControlProcesado,
  marcarControlError,
  contarComentariosSinControl,
};