const { Client } = require('pg');
const c = new Client({ user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432 });

c.connect().then(async () => {
  const { rows } = await c.query(`
    SELECT s.id, s.titulo, s.acta_ciarp, sc.acta_label, s.estado, s.etapa
    FROM solicitudes s
    LEFT JOIN sesiones_ciarp sc ON s.sesion_ciarp_id = sc.id
    WHERE s.tipo = 'libro_ensayo'
  `);

  console.log('--- TODOS LOS LIBROS DE ENSAYO ---');
  rows.forEach(r => {
    const isCiarp2 = r.acta_ciarp === '2- 04/06/2026' || (r.acta_label && r.acta_label.startsWith('2- '));
    console.log(`- ${r.titulo.substring(0, 50)} | Estado: ${r.estado} | Etapa: ${r.etapa} | Acta CIARP: ${r.acta_ciarp || 'N/A'} | Sesión CIARP: ${r.acta_label || 'N/A'} ${isCiarp2 ? '(EN CIARP 2)' : '(OTRO)'}`);
  });
  
  await c.end();
}).catch(console.error);
