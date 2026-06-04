const { Client } = require('pg');

async function main() {
  const c = new Client({ user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432 });
  await c.connect();

  console.log("=== 1. Verificando solicitud de título de Carolina Bermúdez ===");
  const r1 = await c.query("SELECT id, cedula, tipo, titulo, pts_asig, estado, acta_ciarp, etapa FROM solicitudes WHERE cedula = '24606935'");
  console.log(r1.rows);

  console.log("\n=== 2. Verificando pts_total_salarial de Carolina en docentes ===");
  const r2 = await c.query("SELECT cedula, nombre, pts_acumulados, pts_titulos_exp, pts_total_salarial, doctorado FROM docentes WHERE cedula = '24606935'");
  console.log(r2.rows[0]);

  console.log("\n=== 3. Verificando consistencia de la lógica de títulos en solicitudes ===");
  const r3 = await c.query(`
    SELECT s.cedula, d.nombre, s.id, s.tipo, s.titulo, s.pts_asig, s.estado, s.acta_ciarp
    FROM solicitudes s
    JOIN docentes d ON d.cedula = s.cedula
    WHERE s.tipo IN ('titulo', 'titulo_academico') AND s.estado = 'aprobado'
    ORDER BY s.acta_ciarp
  `);
  console.log(`Títulos aprobados en el sistema (total: ${r3.rows.length}):`);
  console.log(r3.rows);

  console.log("\n=== 4. Verificando solicitudes de DAA/DDD/Exp Calificada aprobadas ===");
  const r4 = await c.query(`
    SELECT s.cedula, d.nombre, s.id, s.tipo, s.pts_asig, s.estado, s.acta_ciarp
    FROM solicitudes s
    JOIN docentes d ON d.cedula = s.cedula
    WHERE s.tipo IN ('daa', 'ddd', 'exp_calificada') AND s.estado = 'aprobado'
    ORDER BY s.acta_ciarp
    LIMIT 10
  `);
  console.log(`DAA/DDD/Exp.Calificada aprobados (muestra 10):`);
  console.log(r4.rows);

  console.log("\n=== ✅ Verificación completada ===");
  await c.end();
}

main().catch(console.error);
