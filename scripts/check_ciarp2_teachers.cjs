const { Client } = require('pg');

async function main() {
  const c = new Client({ user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432 });
  await c.connect();

  console.log("Consultando docentes con puntos aprobados en CIARP 2...");
  const query = `
    SELECT d.cedula, d.nombre, SUM(s.pts_asig) as total_puntos_ciarp2
    FROM solicitudes s
    JOIN docentes d ON d.cedula = s.cedula
    WHERE s.estado = 'aprobado' 
      AND s.acta_ciarp LIKE '2-%'
    GROUP BY d.cedula, d.nombre
    ORDER BY total_puntos_ciarp2 DESC;
  `;
  const res = await c.query(query);

  if (res.rows.length === 0) {
    console.log("Ningún docente ha recibido puntos en el CIARP 2.");
  } else {
    console.log(`Encontrados ${res.rows.length} docentes:\n`);
    res.rows.forEach((row, i) => {
      console.log(`${i + 1}. ${row.nombre} (C.C. ${row.cedula}): +${Number(row.total_puntos_ciarp2).toFixed(1)} puntos`);
    });
  }

  // Ahora, para verificar exactamente la columna del Excel que suma `ptsSolNuevos` (lo cual asume TODO lo nuevo de la sesión actual de la app que normalmente es CIARP 2):
  console.log("\nDetalle de solicitudes por docente en CIARP 2:");
  const query2 = `
    SELECT d.nombre, s.tipo, s.titulo, s.pts_asig
    FROM solicitudes s
    JOIN docentes d ON d.cedula = s.cedula
    WHERE s.estado = 'aprobado' 
      AND s.acta_ciarp LIKE '2-%'
    ORDER BY d.nombre, s.tipo;
  `;
  const res2 = await c.query(query2);
  res2.rows.forEach(r => {
    console.log(`  - ${r.nombre}: ${Number(r.pts_asig).toFixed(1)} pts (${r.tipo}) ${r.titulo ? ' - ' + r.titulo : ''}`);
  });

  await c.end();
}

main().catch(console.error);
