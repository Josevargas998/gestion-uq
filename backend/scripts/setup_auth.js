const { pool, query } = require('../db');

async function setupAuth() {
  try {
    console.log('[Auth Setup] Iniciando migración de base de datos...');
    
    // 1. Agregar columna password_hash
    await query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS password_hash TEXT;`);
    console.log('[Auth Setup] Columna password_hash agregada a usuarios.');

    // 2. Setear la contraseña por defecto para profesorales@2026
    const hash = '$2b$10$8R3Az9do6f0ljOW3/ef6MuE2Cnh3omZDwnvwBrX9Gq4hBPHK.LO92';
    const { rowCount } = await query(
      `UPDATE usuarios SET password_hash = $1 WHERE password_hash IS NULL;`,
      [hash]
    );
    console.log(`[Auth Setup] Se actualizaron ${rowCount} usuarios con la contraseña por defecto.`);

    console.log('[Auth Setup] Migración completada exitosamente.');
  } catch (error) {
    console.error('[Auth Setup] Error durante la migración:', error.message);
  } finally {
    pool.end();
  }
}

setupAuth();
