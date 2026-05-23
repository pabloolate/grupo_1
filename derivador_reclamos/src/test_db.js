const { poolScraping, poolGeneral, cerrarPools } = require('./db');

async function probarConexionScraping() {
  const resultado = await poolScraping.query(`
    SELECT 
      (SELECT COUNT(*)::int FROM comentarios_negativos) AS total_comentarios,
      (SELECT COUNT(*)::int FROM derivador_control_comentarios) AS total_control,
      (SELECT COUNT(*)::int FROM casos_derivacion) AS total_casos,
      (SELECT COUNT(*)::int FROM casos_derivacion_comentarios) AS total_evidencias,
      (SELECT COUNT(*)::int FROM catalogo_tipos_incidencia WHERE activo = true) AS total_tipos_activos;
  `);

  console.log('[BD scraping] OK:', resultado.rows[0]);
}

async function probarConexionGeneral() {
  const resultado = await poolGeneral.query(`
    SELECT 
      (SELECT COUNT(*)::int FROM categorias_reclamo) AS total_categorias,
      (SELECT COUNT(*)::int FROM usuarios WHERE activo = true) AS usuarios_activos,
      (SELECT COUNT(*)::int FROM configuracion_carga_perfil) AS perfiles_con_carga;
  `);

  console.log('[BD general] OK:', resultado.rows[0]);
}

async function main() {
  try {
    await probarConexionScraping();
    await probarConexionGeneral();
    console.log('[test_db] Conexiones listas, sistema andando.');
  } catch (error) {
    console.error('[test_db] Error:', error.message);
    process.exitCode = 1;
  } finally {
    await cerrarPools();
  }
}

main();