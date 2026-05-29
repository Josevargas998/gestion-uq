const { Client } = require('pg');
const c = new Client({ host: 'localhost', port: 5432, database: 'gestion_uq', user: 'postgres', password: '' });
c.connect()
  .then(() => c.query(`SELECT id, docente, tipo, estado, etapa, sesion_cei_id, acta_cei, fecha, LEFT(notas, 400) as notas_snippet FROM solicitudes WHERE tipo='ascenso' ORDER BY fecha DESC LIMIT 20;`))
  .then(r => {
    console.log('=== ASCENSOS EN BD ===');
    r.rows.forEach(x => console.log(JSON.stringify(x)));
    return c.query(`SELECT id, numero, anio, estado, acta_label FROM sesiones_cei ORDER BY id;`);
  })
  .then(r2 => {
    console.log('\n=== SESIONES CEI ===');
    r2.rows.forEach(x => console.log(JSON.stringify(x)));
    c.end();
  })
  .catch(e => { console.error(e.message); c.end(); });
