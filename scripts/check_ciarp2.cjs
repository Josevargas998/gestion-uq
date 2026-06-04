const { Client } = require('pg');
const c = new Client({ user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432 });

c.connect().then(async () => {
  console.log('--- SESIONES CIARP ---');
  const { rows: sesiones } = await c.query('SELECT * FROM sesiones_ciarp ORDER BY id DESC');
  console.table(sesiones);

  const ciarp2 = sesiones.find(s => s.acta_label && s.acta_label.includes('2-'));
  const ciarpId = ciarp2 ? ciarp2.id : sesiones[0].id; // Fallback to newest

  console.log(`\n--- SOLICITUDES EN SESION ${ciarpId} ---`);
  const { rows } = await c.query(
    "SELECT id, etapa, estado, tipo, acta_ciarp FROM solicitudes WHERE sesion_ciarp_id = $1 OR acta_ciarp LIKE '%2- %' OR acta_ciarp LIKE '%2/2026'", 
    [ciarpId]
  );
  console.table(rows);
  
  // Resumen por etapa
  const conteo = rows.reduce((acc, row) => {
    acc[row.etapa] = (acc[row.etapa] || 0) + 1;
    return acc;
  }, {});
  console.log('\nResumen por etapa:', conteo);

  await c.end();
}).catch(console.error);
