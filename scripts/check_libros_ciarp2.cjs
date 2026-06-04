const { Client } = require('pg');
const c = new Client({ user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432 });

c.connect().then(async () => {
  const { rows } = await c.query(`
    SELECT s.id, s.tipo, s.titulo, s.estado, s.acta_ciarp, s.docente
    FROM solicitudes s
    LEFT JOIN sesiones_ciarp sc ON s.sesion_ciarp_id = sc.id
    WHERE s.sesion_ciarp_id IS NOT NULL 
       OR s.acta_ciarp LIKE '%2- %' 
       OR s.acta_ciarp LIKE '%2/2026%'
  `);

  // Filter out any that might be from other years or not actually CIARP 2 of 2026
  // But let's just group them by type first
  
  const byType = {};
  let totalLibros = 0;
  
  rows.forEach(r => {
    byType[r.tipo] = (byType[r.tipo] || 0) + 1;
    if (r.tipo.includes('libro')) {
      totalLibros++;
      console.log(`- Libro [${r.tipo}]: ${r.titulo} (${r.docente})`);
    }
  });

  console.log('\n--- RESUMEN POR TIPO ---');
  console.table(byType);
  console.log(`\nTotal de productos tipo 'libro': ${totalLibros}`);
  console.log(`Total de solicitudes en la sesión: ${rows.length}`);
  
  await c.end();
}).catch(console.error);
