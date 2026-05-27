const { pool } = require('../db.js');

async function migrate() {
  try {
    const res = await pool.query(`
      UPDATE solicitudes 
      SET tipo = 'revista' 
      WHERE tipo IN ('revista_a1', 'revista_a2', 'revista_b', 'revista_no_indexada')
    `);
    console.log('Filas actualizadas:', res.rowCount);
  } catch (err) {
    console.error('Error migrando:', err);
  } finally {
    pool.end();
  }
}

migrate();
