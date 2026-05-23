const { poolScraping } = require('./db');

function normalizarTexto(valor) {
  return String(valor || '').replace(/\s+/g, ' ').trim();
}

function normalizarUsuarioCaso(comentario) {
  const usuario = normalizarTexto(comentario.usuario_comentario)
    .replace(/^@+/, '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .trim();

  if (usuario) return usuario.slice(0, 255);

  return `sin_usuario_${comentario.comentario_negativo_id}`;
}

async function obtenerCatalogoTipoIncidencia(tipoIncidencia) {
  const tipo = normalizarTexto(tipoIncidencia).toUpperCase();

  const resultado = await poolScraping.query(
    `
    SELECT
      tipo_incidencia,
      area_derivacion,
      prioridad,
      descripcion
    FROM catalogo_tipos_incidencia
    WHERE tipo_incidencia = $1
      AND activo = true
    LIMIT 1;
    `,
    [tipo]
  );

  if (resultado.rowCount > 0) {
    return resultado.rows[0];
  }

  const fallback = await poolScraping.query(
    `
    SELECT
      tipo_incidencia,
      area_derivacion,
      prioridad,
      descripcion
    FROM catalogo_tipos_incidencia
    WHERE tipo_incidencia = 'NO_CLASIFICADO'
      AND activo = true
    LIMIT 1;
    `
  );

  if (fallback.rowCount === 0) {
    throw new Error('No existe NO_CLASIFICADO activo en catalogo_tipos_incidencia.');
  }

  return fallback.rows[0];
}

async function crearOActualizarCasoDerivacion({ comentario, analisis, catalogo }) {
  const cliente = await poolScraping.connect();

  const usuarioComentario = normalizarUsuarioCaso(comentario);
  const tipoIncidencia = catalogo.tipo_incidencia;
  const areaDerivacion = catalogo.area_derivacion;
  const prioridad = catalogo.prioridad;
  const fechaEvento = comentario.fecha_scraping || new Date();

  try {
    await cliente.query('BEGIN');

    const existente = await cliente.query(
      `
      SELECT *
      FROM casos_derivacion
      WHERE usuario_comentario = $1
        AND tipo_incidencia = $2
        AND estado_caso = 'ABIERTO'
      ORDER BY id ASC
      LIMIT 1
      FOR UPDATE;
      `,
      [usuarioComentario, tipoIncidencia]
    );

    if (existente.rowCount > 0) {
      const caso = existente.rows[0];

      const actualizado = await cliente.query(
        `
        UPDATE casos_derivacion
        SET cantidad_eventos = cantidad_eventos + 1,
            ultimo_comentario_id = $2,
            fecha_ultimo_evento = $3,
            motivo_decision = COALESCE($4, motivo_decision),
            confianza = COALESCE($5, confianza),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *;
        `,
        [
          caso.id,
          comentario.comentario_negativo_id,
          fechaEvento,
          analisis.motivo_decision || null,
          analisis.confianza,
        ]
      );

      await cliente.query(
        `
        INSERT INTO casos_derivacion_comentarios (
          caso_derivacion_id,
          comentario_negativo_id,
          created_at
        )
        VALUES ($1, $2, NOW())
        ON CONFLICT (caso_derivacion_id, comentario_negativo_id) DO NOTHING;
        `,
        [caso.id, comentario.comentario_negativo_id]
      );

      await cliente.query('COMMIT');

      return {
        accion: 'AGRUPADO',
        caso: actualizado.rows[0],
      };
    }

    const insertado = await cliente.query(
      `
      INSERT INTO casos_derivacion (
        usuario_comentario,
        tipo_incidencia,
        area_derivacion,
        prioridad,
        estado_caso,
        cantidad_eventos,
        primer_comentario_id,
        ultimo_comentario_id,
        fecha_primer_evento,
        fecha_ultimo_evento,
        motivo_decision,
        confianza,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4,
        'ABIERTO',
        1,
        $5,
        $5,
        $6,
        $6,
        $7,
        $8,
        NOW(),
        NOW()
      )
      RETURNING *;
      `,
      [
        usuarioComentario,
        tipoIncidencia,
        areaDerivacion,
        prioridad,
        comentario.comentario_negativo_id,
        fechaEvento,
        analisis.motivo_decision || null,
        analisis.confianza,
      ]
    );

    const caso = insertado.rows[0];

    await cliente.query(
      `
      INSERT INTO casos_derivacion_comentarios (
        caso_derivacion_id,
        comentario_negativo_id,
        created_at
      )
      VALUES ($1, $2, NOW())
      ON CONFLICT (caso_derivacion_id, comentario_negativo_id) DO NOTHING;
      `,
      [caso.id, comentario.comentario_negativo_id]
    );

    await cliente.query('COMMIT');

    return {
      accion: 'DERIVADO',
      caso,
    };
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
}

async function actualizarCasoConReclamoGenerado({
  casoDerivacionId,
  reclamoEntranteId,
  reclamoId,
  clasificacionId,
  usuarioAsignadoId,
}) {
  await poolScraping.query(
    `
    UPDATE casos_derivacion
    SET reclamo_entrante_id_generado = $2,
        reclamo_id_generado = $3,
        clasificacion_id_generada = $4,
        usuario_asignado_id = $5,
        updated_at = NOW()
    WHERE id = $1;
    `,
    [
      casoDerivacionId,
      reclamoEntranteId || null,
      reclamoId || null,
      clasificacionId || null,
      usuarioAsignadoId || null,
    ]
  );
}

module.exports = {
  obtenerCatalogoTipoIncidencia,
  crearOActualizarCasoDerivacion,
  actualizarCasoConReclamoGenerado,
  normalizarUsuarioCaso,
};