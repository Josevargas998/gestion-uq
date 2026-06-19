const { Client } = require('pg');

async function main() {
  const c = new Client({ user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432 });
  await c.connect();

  const query = "SELECT id, tipo, titulo, pts_asig FROM solicitudes WHERE cedula = '1102042502' AND tipo = 'titulo'";
  const res = await c.query(query);

  console.log("Títulos en solicitudes para Cristian:");
  res.rows.forEach(r => console.log(r));

  await c.end();
}

main().catch(console.error);
