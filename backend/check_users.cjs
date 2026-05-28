const { query } = require('./db.js');

async function run() {
  const { rows } = await query('SELECT cedula, nombre, rol FROM usuarios');
  console.table(rows);
  process.exit(0);
}
run();
