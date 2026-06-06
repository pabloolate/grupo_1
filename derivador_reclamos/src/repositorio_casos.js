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

  if (!usuario) {
    throw new Error(`Comentario ${comentario.comentario_negativo_id} no trae usuario_comentario.`);
  }

  return usuario.slice(0, 255);
}

function normalizarFechaComentarioSql(valor, mensaje) {
  if (valor === undefined || valor === null || valor === '') {
    throw new Error(mensaje);
  }

  if (valor instanceof Date) {
    if (Number.isNaN(valor.getTime())) {
      throw new Error(`${mensaje} Fecha inválida.`);
    }

    const yyyy = valor.getFullYear();
    const mm = String(valor.getMonth() + 1).padStart(2, '0');
    const dd = String(valor.getDate()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;
  }

  const texto = String(valor).trim();

  const matchSql = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (matchSql) {
    return texto;
  }

  const matchFlexible = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (matchFlexible) {
    const yyyy = matchFlexible[1];
    const mm = String(matchFlexible[2]).padStart(2, '0');
    const dd = String(matchFlexible[3]).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;
  }

  const matchIso = texto.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (matchIso) {
    return `${matchIso[1]}-${matchIso[2]}-${matchIso[3]}`;
  }

  throw new Error(`${mensaje} Formato recibido inválido: ${texto}`);
}

function obtenerFechaComentarioObligatoria(comentario) {
  return normalizarFechaComentarioSql(
    comentario.fecha_comentario,
    `Comentario ${comentario.comentario_negativo_id} no trae fecha_comentario.`
  );
}

async function obtenerCatalogoTipoIncidencia(tipoIncidencia) {
  const tipo = normalizarTexto(tipoIncidencia).toUpperCase();

  if (!tipo) {
    throw new Error('No se recibió tipo_incidencia para consultar catálogo.');
  }

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

  if (resultado.rowCount === 0) {
    throw new Error(`No existe tipo_incidencia activo en catalogo_tipos_incidencia: ${tipo}`);
  }

  return resultado.rows[0];
}

async function crearOActualizarCasoDerivacion({ comentario, analisis, catalogo }) {
  const cliente = await poolScraping.connect();

  const usuarioComentario = normalizarUsuarioCaso(comentario);
  const tipoIncidencia = catalogo.tipo_incidencia;
  const areaDerivacion = catalogo.area_derivacion;
  const prioridad = catalogo.prioridad;
  const fechaEvento = obtenerFechaComentarioObligatoria(comentario);

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
            fecha_ultimo_evento = $3::date,
            motivo_decision = $4,
            confianza = $5,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *;
        `,
        [
          caso.id,
          comentario.comentario_negativo_id,
          fechaEvento,
          analisis.motivo_decision,
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
        $6::date,
        $6::date,
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
        analisis.motivo_decision,
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
      reclamoEntranteId,
      reclamoId,
      clasificacionId,
      usuarioAsignadoId,
    ]
  );
}

module.exports = {
  obtenerCatalogoTipoIncidencia,
  crearOActualizarCasoDerivacion,
  actualizarCasoConReclamoGenerado,
  normalizarUsuarioCaso,
  obtenerFechaComentarioObligatoria,
  normalizarFechaComentarioSql,
};