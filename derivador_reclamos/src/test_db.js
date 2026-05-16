const { poolScraping, poolGeneral, cerrarPools } = require('./db');

async function probarConexionScraping() {
  const resultado = await poolScraping.query(`
    SELECT 
      COUNT(*)::int AS total_comentarios,
      COUNT(DISTINCT hash_comentario)::int AS hashes_unicos
    FROM comentarios_negativos;
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
    console.log('[test_db] Conexiones listas, la wea está andando.');
  } catch (error) {
    console.error('[test_db] Error:', error.message);
    process.exitCode = 1;
  } finally {
    await cerrarPools();
  }
}

main();