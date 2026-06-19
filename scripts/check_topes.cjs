const { Client } = require('pg');

async function main() {
  const c = new Client({ user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432 });
  await c.connect();

  const query = `
    SELECT s.cedula, d.nombre, SUM(s.pts_asig) as total_puntos_ciarp2,
           d.pts_acumulados, d.tope
    FROM solicitudes s
    JOIN docentes d ON d.cedula = s.cedula
    WHERE s.estado = 'aprobado' 
      AND s.acta_ciarp LIKE '2-%'
    GROUP BY s.cedula, d.nombre, d.pts_acumulados, d.tope
    ORDER BY total_puntos_ciarp2 DESC;
  `;
  const res = await c.query(query);

  res.rows.forEach(r => {
    const tope = Number(r.tope) || 0;
    const acumulados = Number(r.pts_acumulados) || 0;
    const nuevos = Number(r.total_puntos_ciarp2) || 0;
    const diferencia = tope - acumulados;
    
    // Si la diferencia es menor que los puntos nuevos (y > 0), significa que el docente topó
    // Excepción: Carolina con los 80 pts de titulo no tiene tope para eso, así que el tope aplica solo a prod.
    let reales = nuevos;
    if (tope > 0 && acumulados + nuevos > tope && !r.nombre.includes('CAROLINA')) { // simplificación rapida
      reales = Math.max(0, diferencia);
    }

    console.log(`${r.nombre} (Tope: ${tope}, Base: ${acumulados}, Diferencia: ${diferencia.toFixed(2)}) -> Aprobados: ${nuevos}, Reales que impactan: ${reales.toFixed(2)}`);
  });

  await c.end();
}

main().catch(console.error);
