const { Client } = require('pg');

async function main() {
  const c = new Client({ user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432 });
  await c.connect();

  console.log("Corrigiendo título de Cristian Camilo Reyes Galeano...");

  // Corregir la solicitud
  const r1 = await c.query(`
    UPDATE solicitudes
    SET titulo = 'Doctor en Educación y Sociedad'
    WHERE cedula = '1102042502'
      AND tipo = 'titulo'
    RETURNING id, titulo, pts_asig
  `);
  console.log("Solicitud actualizada:", r1.rows);

  // Corregir la tabla docentes
  const r2 = await c.query(`
    UPDATE docentes
    SET 
      doctorado = 'Doctor en Educación y Sociedad',
      escolaridad = 'Doctor en Educación y Sociedad',
      maestria = COALESCE(NULLIF(maestria, ''), 'MAGISTER EN DIDACTICA DE LAS LENGUAS')
    WHERE cedula = '1102042502'
    RETURNING cedula, nombre, maestria, doctorado, escolaridad
  `);
  console.log("Docente actualizado:", r2.rows);

  await c.end();
  console.log("\n✅ Listo. El doctorado de Cristian ya está correctamente registrado.");
}

main().catch(console.error);
