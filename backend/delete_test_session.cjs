const { query } = require('./db.js');

async function run() {
  const result = await query("DELETE FROM sesiones_cei WHERE id = 'CEI-2026-99'");
  console.log('Filas eliminadas:', result.rowCount);
  process.exit(0);
}
run();
