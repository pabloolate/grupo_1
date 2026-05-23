const { poolGeneral } = require('./db');

const ESTADOS_CERRADOS = [
  'RESUELTO_HUMANO',
  'CERRADO',
  'DESCARTADO',
  'DUPLICADO',
  'ERROR_PROCESAMIENTO',
];

function normalizarNombreCatalogo(nombre) {
  return String(nombre || '').trim().toUpperCase();
}

function normalizarTexto(valor) {
  return String(valor || '').replace(/\s+/g, ' ').trim();
}

async function obtenerIdPorNombre(cliente, tabla, nombre, fallback = null) {
  const resultado = await cliente.query(
    `
    SELECT id
    FROM ${tabla}
    WHERE UPPER(nombre) = $1
      AND activo = true
    ORDER BY id ASC
    LIMIT 1;
    `,
    [normalizarNombreCatalogo(nombre)]
  );

  if (resultado.rowCount > 0) {
    return resultado.rows[0].id;
  }

  if (fallback) {
    const resultadoFallback = await cliente.query(
      `
      SELECT id
      FROM ${tabla}
      WHERE UPPER(nombre) = $1
        AND activo = true
      ORDER BY id ASC
      LIMIT 1;
      `,
      [normalizarNombreCatalogo(fallback)]
    );

    if (resultadoFallback.rowCount > 0) {
      return resultadoFallback.rows[0].id;
    }
  }

  throw new Error(`No existe catálogo activo en ${tabla} con nombre ${nombre}`);
}

async function asegurarEstado(cliente, nombre, descripcion) {
  const nombreNormalizado = normalizarNombreCatalogo(nombre);

  const existente = await cliente.query(
    `
    SELECT id
    FROM estados_reclamo
    WHERE UPPER(nombre) = $1
    LIMIT 1;
    `,
    [nombreNormalizado]
  );

  if (existente.rowCount > 0) {
    await cliente.query(
      `
      UPDATE estados_reclamo
      SET activo = true,
          fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE id = $1;
      `,
      [existente.rows[0].id]
    );

    return existente.rows[0].id;
  }

  const ordenResultado = await cliente.query(`
    SELECT COALESCE(MAX(orden), 0) + 1 AS nuevo_orden
    FROM estados_reclamo;
  `);

  const nuevoOrden = ordenResultado.rows[0].nuevo_orden;

  const insertado = await cliente.query(
    `
    INSERT INTO estados_reclamo (
      nombre,
      descripcion,
      orden,
      activo,
      fecha_creacion,
      fecha_actualizacion
    )
    VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING id;
    `,
    [nombre, descripcion, nuevoOrden]
  );

  return insertado.rows[0].id;
}

async function asegurarEstadosOperativos(cliente) {
  await asegurarEstado(cliente, 'RECIBIDO', 'Reclamo recibido por el sistema.');
  await asegurarEstado(cliente, 'CLASIFICADO_IA', 'Reclamo clasificado por inteligencia artificial.');
  await asegurarEstado(cliente, 'PENDIENTE_ASIGNACION', 'Reclamo pendiente de asignación por falta de cupo.');
  await asegurarEstado(cliente, 'ASIGNADO_HUMANO', 'Reclamo asignado a un ejecutivo humano.');
  await asegurarEstado(cliente, 'EN_GESTION', 'Reclamo en gestión por personal humano.');
  await asegurarEstado(cliente, 'ESCALADO', 'Reclamo escalado a supervisión u operación.');
  await asegurarEstado(cliente, 'RESUELTO_HUMANO', 'Reclamo resuelto por personal humano.');
  await asegurarEstado(cliente, 'CERRADO', 'Reclamo cerrado.');
  await asegurarEstado(cliente, 'DESCARTADO', 'Reclamo descartado por no ser accionable.');
  await asegurarEstado(cliente, 'DUPLICADO', 'Reclamo duplicado.');
  await asegurarEstado(cliente, 'ERROR_PROCESAMIENTO', 'Reclamo con error de procesamiento.');
}

async function obtenerCatalogosBase(cliente) {
  await asegurarEstadosOperativos(cliente);

  const estados = {};
  const prioridades = {};
  const categorias = {};
  const canales = {};

  const resultadoEstados = await cliente.query(`SELECT id, nombre FROM estados_reclamo WHERE activo = true;`);
  const resultadoPrioridades = await cliente.query(`SELECT id, nombre FROM prioridades_reclamo WHERE activo = true;`);
  const resultadoCategorias = await cliente.query(`SELECT id, nombre FROM categorias_reclamo WHERE activo = true;`);
  const resultadoCanales = await cliente.query(`SELECT id, nombre FROM canales WHERE activo = true;`);

  for (const fila of resultadoEstados.rows) estados[normalizarNombreCatalogo(fila.nombre)] = fila.id;
  for (const fila of resultadoPrioridades.rows) prioridades[normalizarNombreCatalogo(fila.nombre)] = fila.id;
  for (const fila of resultadoCategorias.rows) categorias[normalizarNombreCatalogo(fila.nombre)] = fila.id;
  for (const fila of resultadoCanales.rows) canales[normalizarNombreCatalogo(fila.nombre)] = fila.id;

  return {
    estados,
    prioridades,
    categorias,
    canales,
  };
}

function resolverCanal(plataforma) {
  const valor = normalizarNombreCatalogo(plataforma);

  if (valor.includes('INSTAGRAM')) return 'INSTAGRAM';
  if (valor.includes('TIKTOK')) return 'TIKTOK';
  if (valor.includes('FACEBOOK')) return 'FACEBOOK';
  if (valor.includes('WHATSAPP')) return 'WHATSAPP';

  return 'OTRO';
}

function resolverCategoriaGeneral(tipoIncidencia) {
  const tipo = normalizarNombreCatalogo(tipoIncidencia);

  if ([
    'SIN_SERVICIO_INTERNET',
    'INTERMITENCIA_INTERNET',
    'BAJA_VELOCIDAD',
    'PROBLEMA_WIFI_ROUTER',
    'CORTE_SERVICIO',
  ].includes(tipo)) {
    return 'INTERNET';
  }

  if (tipo === 'PROBLEMA_TV_CABLE') return 'TELEVISION';
  if (tipo === 'PROBLEMA_TELEFONIA') return 'TELEFONIA';

  if ([
    'COBRO_INDEBIDO',
    'PROBLEMA_FACTURACION',
    'PAGO_NO_RECONOCIDO',
  ].includes(tipo)) {
    return 'FACTURACION';
  }

  if (tipo === 'MALA_ATENCION') return 'MALA_ATENCION';
  if (tipo === 'TECNICO_NO_ASISTE' || tipo === 'INSTALACION_PENDIENTE') return 'INSTALACION';
  if (tipo === 'BAJA_SERVICIO') return 'BAJA_SERVICIO';
  if (tipo === 'SOPORTE_DIGITAL') return 'SOPORTE_DIGITAL';
  if (tipo === 'RIESGO_LEGAL_REPUTACIONAL') return 'MALA_ATENCION';

  return 'OTRO';
}

function resolverPerfilAsignacion(areaDerivacion) {
  const area = normalizarNombreCatalogo(areaDerivacion);

  if (area === 'POSTVENTA') return 'POSTVENTA';
  if (area === 'OPERACIONES') return 'OPERACIONES';
  if (area === 'GERENCIA') return 'GERENCIA';

  return 'ATENCION_CLIENTE';
}

function crearCodigoReclamo() {
  const fecha = new Date();
  const yyyy = fecha.getFullYear();
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const dd = String(fecha.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();

  return `VTR-${yyyy}${mm}${dd}-${random}`;
}

function resolverNombreCliente(comentario) {
  const usuario = normalizarTexto(comentario.usuario_comentario)
    .replace(/^@+/, '')
    .trim();

  if (usuario) return usuario.slice(0, 255);

  const canal = resolverCanal(comentario.plataforma);
  return `Usuario ${canal}`;
}

async function buscarUsuarioDisponiblePorPerfil(cliente, perfilDestino) {
  if (!perfilDestino) return null;

  const resultado = await cliente.query(
    `
    WITH estados_cerrados AS (
      SELECT id
      FROM estados_reclamo
      WHERE UPPER(nombre) = ANY($2::text[])
    ),
    carga AS (
      SELECT
        u.id AS usuario_id,
        COUNT(r.id)::int AS casos_abiertos
      FROM usuarios u
      LEFT JOIN reclamos r
        ON r.usuario_asignado_id = u.id
       AND r.estado_id NOT IN (SELECT id FROM estados_cerrados)
      WHERE u.activo = true
        AND u.perfil_id = (
          SELECT id FROM perfiles WHERE UPPER(nombre) = $1 AND activo = true LIMIT 1
        )
        AND u.rol_id = (
          SELECT id FROM roles WHERE UPPER(nombre) = 'TRABAJADOR' AND activo = true LIMIT 1
        )
      GROUP BY u.id
    ),
    limite AS (
      SELECT c.limite_casos_abiertos
      FROM configuracion_carga_perfil c
      JOIN perfiles p ON p.id = c.perfil_id
      WHERE UPPER(p.nombre) = $1
        AND c.activo = true
      LIMIT 1
    )
    SELECT
      carga.usuario_id,
      carga.casos_abiertos
    FROM carga
    CROSS JOIN limite
    WHERE carga.casos_abiertos < limite.limite_casos_abiertos
    ORDER BY carga.casos_abiertos ASC, carga.usuario_id ASC
    LIMIT 1;
    `,
    [normalizarNombreCatalogo(perfilDestino), ESTADOS_CERRADOS]
  );

  if (resultado.rowCount === 0) return null;

  return resultado.rows[0];
}

async function crearReclamoGeneralDesdeCaso({ comentario, analisis, catalogo, caso }) {
  const cliente = await poolGeneral.connect();

  try {
    await cliente.query('BEGIN');

    const catalogos = await obtenerCatalogosBase(cliente);

    const nombreCanal = resolverCanal(comentario.plataforma);
    const canalId = catalogos.canales[nombreCanal] || catalogos.canales.OTRO;

    const categoriaGeneral = resolverCategoriaGeneral(catalogo.tipo_incidencia);
    const categoriaId = catalogos.categorias[categoriaGeneral] || catalogos.categorias.OTRO;

    const prioridadNombre = normalizarNombreCatalogo(catalogo.prioridad);
    const prioridadId = catalogos.prioridades[prioridadNombre] || catalogos.prioridades.MEDIA;

    const perfilAsignacion = resolverPerfilAsignacion(catalogo.area_derivacion);

    let usuarioAsignadoId = null;
    let estadoObjetivo = 'PENDIENTE_ASIGNACION';

    const usuarioDisponible = await buscarUsuarioDisponiblePorPerfil(cliente, perfilAsignacion);

    if (usuarioDisponible) {
      usuarioAsignadoId = usuarioDisponible.usuario_id;
      estadoObjetivo = 'ASIGNADO_HUMANO';
    }

    const estadoId = catalogos.estados[estadoObjetivo] || catalogos.estados.RECIBIDO;
    const codigoReclamo = crearCodigoReclamo();
    const nombreCliente = resolverNombreCliente(comentario);

    const asunto = `[${catalogo.tipo_incidencia}] ${normalizarTexto(comentario.texto_comentario).slice(0, 180)}`;

    const payloadNormalizado = {
      caso_derivacion_id: caso.id,
      usuario_comentario: caso.usuario_comentario,
      tipo_incidencia: catalogo.tipo_incidencia,
      area_derivacion: catalogo.area_derivacion,
      prioridad: catalogo.prioridad,
      motivo_decision: analisis.motivo_decision,
      confianza: analisis.confianza,
    };

    const reclamoEntrante = await cliente.query(
      `
      INSERT INTO reclamos_entrantes (
        canal_id,
        identificador_externo,
        nombre_cliente,
        correo_cliente,
        asunto,
        mensaje,
        payload_original,
        payload_normalizado,
        estado_integracion,
        fecha_recepcion,
        fecha_procesamiento,
        fecha_creacion,
        fecha_actualizacion
      )
      VALUES (
        $1, $2, $3, NULL, $4, $5, $6::jsonb, $7::jsonb, $8,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING id;
      `,
      [
        canalId,
        comentario.hash_comentario,
        nombreCliente,
        asunto,
        comentario.texto_comentario,
        JSON.stringify(comentario),
        JSON.stringify(payloadNormalizado),
        estadoObjetivo,
      ]
    );

    const reclamoEntranteId = reclamoEntrante.rows[0].id;

    const reclamo = await cliente.query(
      `
      INSERT INTO reclamos (
        codigo_reclamo,
        canal_id,
        reclamo_entrante_id,
        nombre_cliente,
        correo_cliente,
        asunto,
        descripcion,
        categoria_id,
        prioridad_id,
        estado_id,
        usuario_asignado_id,
        requiere_atencion_humana,
        fecha_primera_respuesta,
        fecha_cierre,
        fecha_creacion,
        fecha_actualizacion
      )
      VALUES (
        $1, $2, $3, $4, NULL, $5, $6, $7, $8, $9, $10, true,
        NULL,
        NULL,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      RETURNING id;
      `,
      [
        codigoReclamo,
        canalId,
        reclamoEntranteId,
        nombreCliente,
        asunto,
        comentario.texto_comentario,
        categoriaId,
        prioridadId,
        estadoId,
        usuarioAsignadoId,
      ]
    );

    const reclamoId = reclamo.rows[0].id;

    const clasificacion = await cliente.query(
      `
      INSERT INTO reclamos_clasificacion_ia (
        reclamo_id,
        categoria_sugerida,
        prioridad_sugerida,
        polaridad,
        resumen,
        respuesta_sugerida,
        confianza,
        modelo_usado,
        requiere_revision_humana,
        fecha_clasificacion,
        fecha_creacion,
        fecha_actualizacion
      )
      VALUES (
        $1, $2, $3, 'NEGATIVA', $4, NULL, $5, $6, true,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING id;
      `,
      [
        reclamoId,
        catalogo.tipo_incidencia,
        catalogo.prioridad,
        analisis.motivo_decision,
        analisis.confianza,
        process.env.MODO_TEST === 'true' ? 'SIMULADOR_JSON' : process.env.OLLAMA_MODEL,
      ]
    );

    const clasificacionId = clasificacion.rows[0].id;

    await cliente.query(
      `
      INSERT INTO reclamos_historial (
        reclamo_id,
        usuario_id,
        estado_anterior_id,
        estado_nuevo_id,
        prioridad_anterior_id,
        prioridad_nueva_id,
        accion,
        observacion,
        fecha_creacion,
        fecha_actualizacion
      )
      VALUES (
        $1, NULL, NULL, $2, NULL, $3, 'DERIVADO', $4,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      );
      `,
      [
        reclamoId,
        estadoId,
        prioridadId,
        analisis.motivo_decision,
      ]
    );

    await cliente.query('COMMIT');

    return {
      reclamo_entrante_id: reclamoEntranteId,
      reclamo_id: reclamoId,
      clasificacion_id: clasificacionId,
      estado_objetivo: estadoObjetivo,
      usuario_asignado_id: usuarioAsignadoId,
    };
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
}

module.exports = {
  crearReclamoGeneralDesdeCaso,
};