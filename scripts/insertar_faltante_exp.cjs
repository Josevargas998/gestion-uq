const { Client } = require('pg');
const client = new Client({
  user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db',
  password: 'gestion_uq_2026', port: 5432
});

async function run() {
  await client.connect();

  // Verificar que el docente existe en la tabla docentes
  const { rows: doc } = await client.query(`SELECT cedula, nombre, programa FROM docentes WHERE cedula = '4374317'`);
  if (doc.length === 0) {
    console.log('⚠️  Docente 4374317 no encontrado en tabla docentes. Insertando solicitud sin JOIN.');
  } else {
    console.log(`✅ Docente encontrado: ${doc[0].nombre} | ${doc[0].programa}`);
  }

  // Insertar la solicitud faltante
  const id = `SOL-2026-EXP-4374317`;
  await client.query(`
    INSERT INTO solicitudes (id, cedula, tipo, titulo, pts_asig, acta_ciarp, etapa, estado, fecha)
    VALUES ($1, $2, 'exp_calificada', 'Experiencia Calificada', 1.6, '1- 18/03/2026', 'acta', 'aprobado', NOW())
    ON CONFLICT (id) DO UPDATE SET pts_asig = 1.6, acta_ciarp = '1- 18/03/2026', etapa = 'acta', estado = 'aprobado'
  `, [id, '4374317']);

  console.log('✅ Insertado: Álvarez Mejía Darío (4374317) — 1.6 pts — exp_calificada — CIARP 1');

  // Verificar total ahora
  const { rows: tot } = await client.query(`
    SELECT COUNT(*) as n, ROUND(SUM(CAST(pts_asig AS NUMERIC)),2) as pts
    FROM solicitudes WHERE tipo = 'exp_calificada' AND acta_ciarp ILIKE '%18/03/2026%'
  `);
  console.log(`\nTotal exp_calificada en BD: ${tot[0].n} docentes | ${tot[0].pts} pts`);
  console.log(`Esperado:                   262 docentes | 518.00 pts`);

  await client.end();
}

run().catch(console.error);
