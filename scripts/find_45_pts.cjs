const { Client } = require('pg');
const c = new Client({ user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432 });

c.connect().then(async () => {
  const r = await c.query("SELECT * FROM docentes WHERE cedula = '24606935'");
  console.log('=== Historial BD de Carolina Bermudez ===');
  const historial = r.rows[0].historial;
  console.log(JSON.stringify(historial, null, 2));

  const r2 = await c.query("SELECT id, tipo, titulo, pts_asig, estado, acta_ciarp FROM solicitudes WHERE cedula = '24606935'");
  console.log('\n=== Todas sus solicitudes en la BD ===');
  console.log(JSON.stringify(r2.rows, null, 2));

  await c.end();
}).catch(console.error);
