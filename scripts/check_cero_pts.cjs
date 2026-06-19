const { Pool } = require('pg');
const pool = new Pool({ host:'localhost', port:5432, database:'gestion_uq_db', user:'gestion_uq', password:'gestion_uq_2026' });
pool.query(`
  SELECT cedula, nombre, categoria, tope, pts_acumulados, pts_total_salarial 
  FROM docentes 
  WHERE estado='ACTIVO' 
    AND (pts_acumulados IS NULL OR pts_acumulados = 0)
    AND (categoria ILIKE '%titular%' OR categoria ILIKE '%asociado%' OR categoria ILIKE '%asistente%' OR categoria ILIKE '%auxiliar%')
  ORDER BY nombre
`)
.then(r => { 
  r.rows.forEach(d => console.log(d.cedula.padEnd(12), d.nombre.padEnd(40), d.categoria.padEnd(12), 'PtsAcum:', d.pts_acumulados, '| TotalSal:', d.pts_total_salarial)); 
  pool.end(); 
})
.catch(e => { console.error(e.message); pool.end(); });
