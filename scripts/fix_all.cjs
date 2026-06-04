const { Client } = require('pg');

async function main() {
  const c = new Client({ user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432 });
  await c.connect();

  console.log("=== CORRECCIÓN 1: IDs de solicitudes de título con formato UUID → SOL- ===");
  // Corregir la de Cristian Camilo Reyes
  const r1 = await c.query(`
    UPDATE solicitudes 
    SET id = 'SOL-2026-PROD-936DAE6C'
    WHERE id = '936dae6c-1ed8-49ee-b023-591fcd8f3458'
    RETURNING id, cedula, titulo, tipo
  `);
  console.log("IDs corregidos:", r1.rows);

  console.log("\n=== CORRECCIÓN 2: Actualizar campo doctorado de Carolina en docentes ===");
  const r2 = await c.query(`
    UPDATE docentes 
    SET doctorado = 'Doctora en Desarrollo Sostenible',
        escolaridad = 'Doctora en Desarrollo Sostenible',
        updated_at = NOW()
    WHERE cedula = '24606935'
    RETURNING cedula, nombre, doctorado, escolaridad
  `);
  console.log("Doctorado actualizado:", r2.rows[0]);

  console.log("\n=== CORRECCIÓN 3: Verificar si hay otros docentes con títulos aprobados pero campo vacío en BD ===");
  const r3 = await c.query(`
    SELECT s.cedula, d.nombre, s.titulo, s.tipo, d.doctorado, d.maestria, d.especializacion
    FROM solicitudes s
    JOIN docentes d ON d.cedula = s.cedula
    WHERE s.tipo IN ('titulo', 'titulo_academico') 
      AND s.estado = 'aprobado'
      AND s.titulo IS NOT NULL
  `);
  
  for (const row of r3.rows) {
    const titulo = (row.titulo || '').toLowerCase();
    
    if (titulo.includes('doctor') && (!row.doctorado || row.doctorado.trim() === '')) {
      await c.query(`
        UPDATE docentes SET doctorado = $1, escolaridad = $1, updated_at = NOW()
        WHERE cedula = $2
      `, [row.titulo, row.cedula]);
      console.log(`  ✅ Doctorado actualizado para ${row.nombre}: ${row.titulo}`);
    } else if ((titulo.includes('maestr') || titulo.includes('magister')) && (!row.maestria || row.maestria.trim() === '')) {
      await c.query(`
        UPDATE docentes SET maestria = $1, escolaridad = $1, updated_at = NOW()
        WHERE cedula = $2
      `, [row.titulo, row.cedula]);
      console.log(`  ✅ Maestría actualizada para ${row.nombre}: ${row.titulo}`);
    } else if (titulo.includes('especializa') && (!row.especializacion || row.especializacion.trim() === '')) {
      await c.query(`
        UPDATE docentes SET especializacion = $1, updated_at = NOW()
        WHERE cedula = $2
      `, [row.titulo, row.cedula]);
      console.log(`  ✅ Especialización actualizada para ${row.nombre}: ${row.titulo}`);
    } else {
      console.log(`  ℹ️ ${row.nombre}: "${row.titulo}" — ya estaba actualizado o no clasificado automáticamente`);
    }
  }

  console.log("\n=== ✅ Todas las correcciones aplicadas ===");
  await c.end();
}

main().catch(console.error);
