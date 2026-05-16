require('dotenv').config();

const config = require('./config');
const { cerrarPools } = require('./db');
const {
  registrarComentariosNuevosEnControl,
  obtenerResumenControlDerivador,
  contarComentariosSinControl,
} = require('./repositorio_scraping');
const { procesarPendientes } = require('./procesador_derivador');

async function ejecutarPasadaDerivador() {
  console.log('============================================================');
  console.log('[derivador_reclamos] Iniciando pasada.');
  console.log('[derivador_reclamos] MODO_TEST:', config.modoTest);
  console.log('[derivador_reclamos] IA_USAR_OLLAMA:', config.usarOllama);
  console.log('[derivador_reclamos] Lote registro:', config.derivador.loteRegistro);
  console.log('[derivador_reclamos] Lote proceso:', config.derivador.loteProceso);

  const sinControlAntes = await contarComentariosSinControl();
  console.log('[derivador_reclamos] Comentarios sin control antes:', sinControlAntes);

  const insertados = await registrarComentariosNuevosEnControl({
    limite: config.derivador.loteRegistro,
  });

  console.log('[derivador_reclamos] Nuevos controles insertados:', insertados.length);

  const resultados = await procesarPendientes();

  console.log('[derivador_reclamos] Resultados proceso:');
  console.table(resultados);

  const resumen = await obtenerResumenControlDerivador();

  console.log('[derivador_reclamos] Resumen control:');
  console.table(resumen);

  const sinControlDespues = await contarComentariosSinControl();
  console.log('[derivador_reclamos] Comentarios sin control después:', sinControlDespues);
  console.log('[derivador_reclamos] Pasada terminada.');
  console.log('============================================================');
}

async function main() {
  try {
    await ejecutarPasadaDerivador();
  } catch (error) {
    console.error('[derivador_reclamos] Error fatal:', error);
    process.exitCode = 1;
  } finally {
    await cerrarPools();
  }
}

main();