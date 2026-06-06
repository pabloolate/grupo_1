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

function exigirValor(valor, mensaje) {
  if (valor === undefined || valor === null || valor === '') {
    throw new Error(mensaje);
  }

  return valor;
}

function exigirIdCatalogo(mapa, nombre, nombreCatalogo) {
  const llave = normalizarNombreCatalogo(nombre);
  const id = mapa[llave];

  if (!id) {
    throw new Error(`No existe ${nombreCatalogo} activo con nombre ${llave}.`);
  }

  return id;
}

function normalizarFechaComentarioSql(valor, mensaje) {
  exigirValor(valor, mensaje);

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

  const matchFechaSql = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (matchFechaSql) {
    return texto;
  }

  const matchFechaSqlFlexible = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (matchFechaSqlFlexible) {
    const yyyy = matchFechaSqlFlexible[1];
    const mm = String(matchFechaSqlFlexible[2]).padStart(2, '0');
    const dd = String(matchFechaSqlFlexible[3]).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;
  }

  const matchIso = texto.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (matchIso) {
    return `${matchIso[1]}-${matchIso[2]}-${matchIso[3]}`;
  }

  throw new Error(`${mensaje} Formato recibido inválido: ${texto}`);
}

async function obtenerIdPorNombre(cliente, tabla, nombre) {
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

  if (resultado.rowCount === 0) {
    throw new Error(`No existe catálogo activo en ${tabla} con nombre ${nombre}`);
  }

  return resultado.rows[0].id;
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

  if (valor === 'INSTAGRAM') return 'INSTAGRAM';
  if (valor === 'TIKTOK') return 'TIKTOK';

  throw new Error(`Plataforma no soportada para canal de reclamo: ${valor}`);
}

function resolverCategoriaGeneral(tipoIncidencia) {
  const tipo = normalizarNombreCatalogo(tipoIncidencia);

  const mapa = {
    SIN_SERVICIO_INTERNET: 'INTERNET',
    INTERMITENCIA_INTERNET: 'INTERNET',
    BAJA_VELOCIDAD: 'INTERNET',
    PROBLEMA_WIFI_ROUTER: 'INTERNET',
    CORTE_SERVICIO: 'INTERNET',
    PROBLEMA_TV_CABLE: 'TELEVISION',
    PROBLEMA_TELEFONIA: 'TELEFONIA',
    COBRO_INDEBIDO: 'FACTURACION',
    PROBLEMA_FACTURACION: 'FACTURACION',
    PAGO_NO_RECONOCIDO: 'FACTURACION',
    MALA_ATENCION: 'MALA_ATENCION',
    TECNICO_NO_ASISTE: 'INSTALACION',
    INSTALACION_PENDIENTE: 'INSTALACION',
    BAJA_SERVICIO: 'BAJA_SERVICIO',
    SOPORTE_DIGITAL: 'SOPORTE_DIGITAL',
    RIESGO_LEGAL_REPUTACIONAL: 'MALA_ATENCION',
    RECLAMO_GENERAL: 'OTRO',
    NO_CLASIFICADO: 'OTRO',
  };

  if (!mapa[tipo]) {
    throw new Error(`No existe mapeo de categoría general para tipo_incidencia: ${tipo}`);
  }

  return mapa[tipo];
}

function resolverPerfilAsignacion(areaDerivacion) {
  const area = normalizarNombreCatalogo(areaDerivacion);

  const perfilesPermitidos = new Set([
    'SOPORTE_TECNICO',
    'POSTVENTA',
    'OPERACIONES',
    'GERENCIA',
    'ATENCION_CLIENTE',
  ]);

  if (!perfilesPermitidos.has(area)) {
    throw new Error(`Área de derivación sin perfil configurado: ${area}`);
  }

  return area;
}

function crearCodigoReclamo() {
  const fecha = new Date();
  const yyyy = fecha.getFullYear();
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const dd = String(fecha.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();

  return `REC-${yyyy}${mm}${dd}-${random}`;
}

function resolverNombreCliente(comentario) {
  const usuario = normalizarTexto(comentario.usuario_comentario)
    .replace(/^@+/, '')
    .trim();

  if (!usuario) {
    throw new Error(`Comentario ${comentario.comentario_negativo_id} no trae usuario_comentario para nombre_cliente.`);
  }

  return usuario.slice(0, 255);
}

async function buscarUsuarioDisponiblePorPerfil(cliente, perfilDestino) {
  exigirValor(perfilDestino, 'No se recibió perfilDestino para asignación.');

  await obtenerIdPorNombre(cliente, 'perfiles', perfilDestino);
  await obtenerIdPorNombre(cliente, 'roles', 'TRABAJADOR');

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
    const canalId = exigirIdCatalogo(catalogos.canales, nombreCanal, 'canal');

    const categoriaGeneral = resolverCategoriaGeneral(catalogo.tipo_incidencia);
    const categoriaId = exigirIdCatalogo(catalogos.categorias, categoriaGeneral, 'categoría');

    const prioridadNombre = normalizarNombreCatalogo(catalogo.prioridad);
    const prioridadId = exigirIdCatalogo(catalogos.prioridades, prioridadNombre, 'prioridad');

    const perfilAsignacion = resolverPerfilAsignacion(catalogo.area_derivacion);

    let usuarioAsignadoId = null;
    let estadoObjetivo = 'PENDIENTE_ASIGNACION';

    const usuarioDisponible = await buscarUsuarioDisponiblePorPerfil(cliente, perfilAsignacion);

    if (usuarioDisponible) {
      usuarioAsignadoId = usuarioDisponible.usuario_id;
      estadoObjetivo = 'ASIGNADO_HUMANO';
    }

    const estadoId = exigirIdCatalogo(catalogos.estados, estadoObjetivo, 'estado');
    const codigoReclamo = crearCodigoReclamo();
    const nombreCliente = resolverNombreCliente(comentario);

    const fechaComentario = normalizarFechaComentarioSql(
      comentario.fecha_comentario,
      `Comentario ${comentario.comentario_negativo_id} no trae fecha_comentario.`
    );

    const asunto = `[${catalogo.tipo_incidencia}] ${normalizarTexto(comentario.texto_comentario).slice(0, 180)}`;

    const comentarioNormalizado = {
      ...comentario,
      fecha_comentario: fechaComentario,
    };

    const payloadNormalizado = {
      caso_derivacion_id: caso.id,
      comentario_negativo_id: comentario.comentario_negativo_id,
      usuario_comentario: caso.usuario_comentario,
      plataforma: comentario.plataforma,
      tipo_publicacion: comentario.tipo_publicacion,
      url_publicacion: comentario.url_publicacion,
      fecha_comentario: fechaComentario,
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
        JSON.stringify(comentarioNormalizado),
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
  resolverCanal,
  resolverCategoriaGeneral,
  resolverPerfilAsignacion,
  crearCodigoReclamo,
  normalizarFechaComentarioSql,
};