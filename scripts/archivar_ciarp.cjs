const { Client } = require('pg');

async function main() {
  const c = new Client({ user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432 });
  await c.connect();

  // Archivar TODAS las solicitudes del CIARP 1 y CIARP 2 que no estén ya archivadas
  const result = await c.query(`
    UPDATE solicitudes
    SET etapa = 'archivada'
    WHERE (acta_ciarp LIKE '1-%' OR acta_ciarp LIKE '2-%')
      AND etapa <> 'archivada'
    RETURNING id, cedula, tipo, estado, etapa
  `);

  console.log(`✅ Archivadas ${result.rowCount} solicitudes:`);

  // Agrupar por acta
  const por_acta = {};
  result.rows.forEach(r => {
    const acta = r.id.startsWith('SOL-2026') ? 'CIARP (vía acta)' : 'Sin SOL-';
    // determinar acta por acta_ciarp — no viene en RETURNING, así que agrupamos por estado
    const key = `${r.estado}`;
    por_acta[key] = (por_acta[key] || 0) + 1;
  });

  // Contar por sesión
  const c1 = result.rows.filter(r => r.id.includes('C12026') || r.tipo === 'exp_calificada' || r.tipo === 'ddd' || r.tipo === 'ddd_auxiliar' || r.tipo === 'ddd_asistente');
  console.log(`  Total archivadas: ${result.rowCount}`);
  console.log(`  Aprobadas archivadas: ${result.rows.filter(r => r.estado === 'aprobado').length}`);
  console.log(`  Rechazadas archivadas: ${result.rows.filter(r => r.estado === 'rechazado').length}`);

  // Verificar que no quede ninguna en etapa distinta a archivada
  const restantes = await c.query(`
    SELECT COUNT(*) AS cnt FROM solicitudes
    WHERE (acta_ciarp LIKE '1-%' OR acta_ciarp LIKE '2-%') AND etapa <> 'archivada'
  `);
  console.log(`\n✅ Solicitudes de CIARP 1/2 que AÚN no están archivadas: ${restantes.rows[0].cnt}`);

  await c.end();
}

main().catch(console.error);
