const { Client } = require('pg');

async function main() {
  const c = new Client({ user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432 });
  await c.connect();

  const res = await c.query("SELECT id, tipo, pts_asig, acta_ciarp FROM solicitudes WHERE cedula = '89007946'");
  console.log("Carlos Andrés García Giraldo (89007946):", res.rows);

  const res2 = await c.query("SELECT id, tipo, pts_asig, acta_ciarp FROM solicitudes WHERE cedula = '1102042502'");
  console.log("Cristian Camilo Reyes Galeano (1102042502):", res2.rows);

  await c.end();
}

main().catch(console.error);
