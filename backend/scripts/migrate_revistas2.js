const { pool } = require('../db.js');

async function migrate() {
  try {
    // Restaurar a revista_indexada
    const res1 = await pool.query(`
      UPDATE solicitudes 
      SET tipo = 'revista_indexada' 
      WHERE tipo = 'revista' AND pts_sug > 0
    `);
    console.log('Filas a revista_indexada:', res1.rowCount);

    // Restaurar a revista_no_indexada
    const res2 = await pool.query(`
      UPDATE solicitudes 
      SET tipo = 'revista_no_indexada' 
      WHERE tipo = 'revista' AND pts_sug = 0
    `);
    console.log('Filas a revista_no_indexada:', res2.rowCount);
    
    // Y por si quedó alguna otra 'revista'
    const res3 = await pool.query(`
      UPDATE solicitudes 
      SET tipo = 'revista_indexada' 
      WHERE tipo = 'revista'
    `);
    console.log('Restantes a revista_indexada:', res3.rowCount);
  } catch (err) {
    console.error('Error migrando:', err);
  } finally {
    pool.end();
  }
}

migrate();
