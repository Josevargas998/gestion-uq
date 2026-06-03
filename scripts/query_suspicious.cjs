const { Client } = require('pg');
const c = new Client({ user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432 });

c.connect().then(() =>
  c.query(`SELECT id, cedula, docente, tipo, titulo, pts_asig, acta_ciarp, sesion_ciarp_id, etapa, estado 
           FROM solicitudes 
           WHERE titulo ILIKE '%Puntos Aprobados%' 
              OR (tipo = 'produccion_tecnica' AND pts_asig = 11)
           ORDER BY id`)
).then(r => {
  console.log(JSON.stringify(r.rows, null, 2));
  c.end();
}).catch(e => { console.error(e.message); c.end(); });
