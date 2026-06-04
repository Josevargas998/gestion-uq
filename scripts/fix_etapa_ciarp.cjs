const { Client } = require('pg');
const c = new Client({ user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432 });

c.connect().then(async () => {
  const res = await c.query("UPDATE solicitudes SET etapa = 'ciarp' WHERE etapa = 'acta'");
  console.log('Filas actualizadas de acta a ciarp:', res.rowCount);
  await c.end();
}).catch(console.error);
