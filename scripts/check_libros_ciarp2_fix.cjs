const { Client } = require('pg');
const c = new Client({ user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432 });

c.connect().then(async () => {
  const { rows } = await c.query(`
    SELECT s.id, s.tipo, s.titulo, s.estado, s.acta_ciarp, s.docente
    FROM solicitudes s
    WHERE s.acta_ciarp = '2- 04/06/2026'
       OR (s.sesion_ciarp_id = (SELECT id FROM sesiones_ciarp WHERE numero = 2 AND anio = 2026 LIMIT 1))
  `);

  const byType = {};
  let totalLibros = 0;
  
  rows.forEach(r => {
    byType[r.tipo] = (byType[r.tipo] || 0) + 1;
    if (r.tipo.includes('libro')) {
      totalLibros++;
    }
  });

  console.log('\n--- RESUMEN POR TIPO PARA CIARP 2 DE 2026 ---');
  console.table(byType);
  console.log(`\nTotal de productos tipo 'libro': ${totalLibros}`);
  console.log(`Total de solicitudes en la sesión: ${rows.length}`);
  
  await c.end();
}).catch(console.error);
