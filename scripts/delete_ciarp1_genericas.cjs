const { Client } = require('pg');
const c = new Client({ user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432 });

c.connect().then(() =>
  c.query(`DELETE FROM solicitudes 
           WHERE titulo ILIKE '%Puntos Aprobados en Ciarp%' 
             AND tipo = 'produccion_tecnica'
             AND sesion_ciarp_id IS NULL`)
).then(r => {
  console.log(`✅ Eliminadas ${r.rowCount} solicitudes genéricas.`);
  c.end();
}).catch(e => { console.error(e.message); c.end(); });
