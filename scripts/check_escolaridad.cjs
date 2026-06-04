const { Client } = require('pg');
const c = new Client({ user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432 });

c.connect().then(async () => {
  const { rows } = await c.query("SELECT * FROM docentes WHERE cedula = '24606935'");
  console.log('Docente:');
  console.log(rows[0]);
  
  const { rows: solRows } = await c.query("SELECT id, escolaridad, datos_prod, metadatos FROM solicitudes WHERE cedula = '24606935'");
  console.log('Solicitudes:');
  console.log(solRows);
  
  await c.end();
}).catch(console.error);
