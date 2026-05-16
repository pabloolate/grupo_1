const { Pool } = require('pg');
require('dotenv').config();

function crearPoolPostgres({ host, port, database, user, password, ssl }) {
  return new Pool({
    host,
    port: Number(port),
    database,
    user,
    password,
    ssl: ssl === 'true' ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

const poolScraping = crearPoolPostgres({
  host: process.env.DB_SCRAPING_HOST,
  port: process.env.DB_SCRAPING_PORT,
  database: process.env.DB_SCRAPING_NAME,
  user: process.env.DB_SCRAPING_USER,
  password: process.env.DB_SCRAPING_PASS,
  ssl: process.env.DB_SCRAPING_SSL,
});

const poolGeneral = crearPoolPostgres({
  host: process.env.DB_GENERAL_HOST,
  port: process.env.DB_GENERAL_PORT,
  database: process.env.DB_GENERAL_NAME,
  user: process.env.DB_GENERAL_USER,
  password: process.env.DB_GENERAL_PASS,
  ssl: process.env.DB_GENERAL_SSL,
});

async function cerrarPools() {
  await Promise.allSettled([
    poolScraping.end(),
    poolGeneral.end(),
  ]);
}

module.exports = {
  poolScraping,
  poolGeneral,
  cerrarPools,
};