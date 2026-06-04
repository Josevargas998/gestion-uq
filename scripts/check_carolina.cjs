const { Client } = require('pg');
const c = new Client({ user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432 });

c.connect().then(async () => {
  const r = await c.query("SELECT * FROM docentes WHERE cedula = '24606935'");
  console.log('=== Base data from BD ===');
  console.log(r.rows[0]);
  
  const r2 = await c.query("SELECT id, tipo, pts_asig FROM solicitudes WHERE cedula = '24606935' AND id LIKE 'SOL-%' AND estado = 'aprobado'");
  console.log('\n=== Nuevas solicitudes SOL-* aprobadas ===');
  console.log(r2.rows);

  await c.end();
}).catch(console.error);
