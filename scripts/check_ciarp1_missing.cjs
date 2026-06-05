const { Client } = require('pg');

async function main() {
  const c = new Client({ user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432 });
  await c.connect();

  const query = `
    SELECT d.cedula, d.nombre, d.pts_ciarp1_2026, 
           SUM(s.pts_asig) as total_sol_c1
    FROM solicitudes s
    JOIN docentes d ON d.cedula = s.cedula
    WHERE s.estado = 'aprobado' 
      AND s.id LIKE 'SOL-%'
      AND (s.acta_ciarp LIKE '1-%' OR s.acta_ciarp LIKE '%2025%')
    GROUP BY d.cedula, d.nombre, d.pts_ciarp1_2026
  `;
  const res = await c.query(query);

  console.log("Diferencias en CIARP 1 (DB vs Solicitudes SOL-* en CIARP 1):");
  res.rows.forEach(r => {
    const bd = Number(r.pts_ciarp1_2026) || 0;
    const sol = Number(r.total_sol_c1) || 0;
    console.log(`- ${r.nombre}: BD dice ${bd}, Solicitudes SOL-* dicen +${sol}. Total debería ser ${bd + sol}`);
  });

  await c.end();
}

main().catch(console.error);
