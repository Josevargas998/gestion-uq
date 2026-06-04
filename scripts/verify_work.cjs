const { Client } = require('pg');
const c = new Client({ user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432 });

c.connect().then(async () => {
  // 1. Verificar solicitud de Carolina Bermudez
  const r1 = await c.query(
    `SELECT id, cedula, docente, tipo, titulo, pts_asig, etapa, estado, acta_ciarp
     FROM solicitudes WHERE cedula = '24606935' ORDER BY created_at DESC LIMIT 5`
  );
  console.log('=== Carolina Bermudez (24606935) ===');
  console.log(JSON.stringify(r1.rows, null, 2));

  // 2. Contar libros de ensayo en CIARP 2
  const r2 = await c.query(
    `SELECT COUNT(*) AS total_ensayo_ciarp2
     FROM solicitudes
     WHERE tipo = 'libro_ensayo'
       AND acta_ciarp = '2- 04/06/2026'
       AND estado = 'aprobado'`
  );
  console.log('\n=== Libros de ensayo en CIARP 2 ===');
  console.log(r2.rows[0]);

  await c.end();
}).catch(console.error);
