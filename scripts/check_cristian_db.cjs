const { Client } = require('pg');

async function main() {
  const c = new Client({ user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432 });
  await c.connect();

  const r = await c.query("SELECT cedula, nombre, pts_acumulados, pts_ciarp1_2026, pts_total_salarial FROM docentes WHERE cedula = '1102042502'");
  console.log(r.rows[0]);

  await c.end();
}

main().catch(console.error);
