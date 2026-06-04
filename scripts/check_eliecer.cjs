const { Client } = require('pg');

async function main() {
  const c = new Client({ user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432 });
  await c.connect();

  const resDocentes = await c.query("SELECT * FROM docentes WHERE cedula = '14241527'");
  console.log(resDocentes.rows[0]);

  await c.end();
}

main().catch(console.error);
