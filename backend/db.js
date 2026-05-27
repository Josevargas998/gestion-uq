/**
 * db.js — Pool de conexión a PostgreSQL local
 * Carga variables de entorno desde backend/.env
 */
const { Pool, types } = require('pg');
// Parse NUMERIC (OID 1700) as float to avoid string concatenation issues in frontend calculations
types.setTypeParser(1700, val => val === null ? null : parseFloat(val));
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME     || 'gestion_uq_db',
  user:     process.env.DB_USER     || 'gestion_uq',
  password: process.env.DB_PASSWORD || '',
  max:      20,
  idleTimeoutMillis:       30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[DB] Error inesperado en cliente idle:', err.message);
});

/**
 * Ejecuta una query con parámetros.
 * @param {string} text   SQL query
 * @param {Array}  params Parámetros posicionales
 */
async function query(text, params = []) {
  const start = Date.now();
  const res   = await pool.query(text, params);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DB] ${Date.now() - start}ms — ${text.slice(0, 80)}`);
  }
  return res;
}

module.exports = { pool, query };
