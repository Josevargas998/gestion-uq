const { Client } = require('pg');
const crypto = require('crypto');

const client = new Client({
  user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db',
  password: 'gestion_uq_2026', port: 5432
});

async function run() {
  await client.connect();

  const { rows: sesion } = await client.query(`SELECT id FROM sesiones_ciarp WHERE acta_label ILIKE '%18/03/2026%' LIMIT 1`);
  const sesionId = sesion[0].id;

  // Reinsertar el libro de ensayo de Constanza Loreth Fajardo Calderon (24573858)
  const id = crypto.randomUUID();
  await client.query(`
    INSERT INTO solicitudes (id, cedula, tipo, titulo, pts_asig, acta_ciarp, sesion_ciarp_id, etapa, estado, fecha)
    VALUES ($1, $2, 'libro_ensayo', 'Planeación Laboral. Estrategia Financiera para Emprende', 10.43, '1- 18/03/2026', $3, 'acta', 'aprobado', NOW())
  `, [id, '24573858', sesionId]);

  console.log('✅ Libro de Ensayo re-insertado (10.43 pts).');

  const { rows: r } = await client.query(`
    SELECT COUNT(*) as n, SUM(CAST(pts_asig AS FLOAT)) as pts FROM solicitudes WHERE sesion_ciarp_id = $1
  `, [sesionId]);
  
  console.log(`\n🎉 TOTAL PERFECTO CIARP 1: ${r[0].n} solicitudes | ${Number(r[0].pts).toFixed(1)} pts`);

  await client.end();
}

run().catch(console.error);
