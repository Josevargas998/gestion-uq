import { pool } from './backend/db.js';

async function main() {
  const cedula = '1094878677';
  const res = await pool.query('SELECT * FROM docentes WHERE cedula = $1', [cedula]);
  const docente = res.rows[0];
  console.log("Docente BD:", docente);
  process.exit(0);
}
main();
