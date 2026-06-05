/**
 * fix_post_sync.cjs
 * Después de sync_general, corrige docentes cuyo doctorado fue aprobado 
 * por CIARP pero Academusoft aún no lo refleja.
 * También corrige escolaridad para que siempre muestre el mayor grado.
 */
const { Client } = require('pg');

async function main() {
  const c = new Client({ user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432 });
  await c.connect();

  // Buscar docentes con solicitud de título aprobada pero cuya escolaridad
  // en docentes no refleja el mayor título
  const titulosAprobados = await c.query(`
    SELECT s.cedula, s.titulo, s.tipo, d.doctorado, d.maestria, d.especializacion, d.escolaridad
    FROM solicitudes s
    JOIN docentes d ON d.cedula = s.cedula
    WHERE s.tipo IN ('titulo', 'titulo_academico') 
      AND s.estado = 'aprobado'
    ORDER BY s.cedula
  `);

  let corregidos = 0;
  for (const row of titulosAprobados.rows) {
    const tl = (row.titulo || '').toLowerCase();
    let campo = null;
    if (tl.includes('doctor')) campo = 'doctorado';
    else if (tl.includes('maestr') || tl.includes('magister')) campo = 'maestria';
    else if (tl.includes('especializa')) campo = 'especializacion';

    if (!campo) continue;

    // La BD ya tiene el valor correcto del campo?
    const valorActual = row[campo];
    if (valorActual && valorActual.trim().toLowerCase() === row.titulo.trim().toLowerCase()) {
      // Ya está correcto, solo asegurar escolaridad = doctorado > maestria > especializacion
      const mejorEscolaridad = row.doctorado || row.maestria || row.especializacion;
      if (mejorEscolaridad && mejorEscolaridad !== row.escolaridad) {
        await c.query('UPDATE docentes SET escolaridad = $1 WHERE cedula = $2', [mejorEscolaridad, row.cedula]);
        console.log(`🔄 Escolaridad corregida: ${row.cedula} → ${mejorEscolaridad}`);
        corregidos++;
      }
      continue;
    }

    // Actualizar el campo correspondiente y la escolaridad
    await c.query(
      `UPDATE docentes SET ${campo} = $1, escolaridad = $1 WHERE cedula = $2`,
      [row.titulo, row.cedula]
    );
    console.log(`✅ ${campo} actualizado: ${row.cedula} → ${row.titulo}`);
    corregidos++;
  }

  // Verificar resultado final de Cristian
  const { rows } = await c.query(`
    SELECT cedula, maestria, doctorado, escolaridad, pts_acumulados, pts_titulos_exp, pts_total_salarial, tope
    FROM docentes WHERE cedula = '1102042502'
  `);
  console.log('\n🔎 Estado final CRISTIAN CAMILO:');
  console.log(rows[0]);

  console.log(`\n✅ Corregidos ${corregidos} registros`);
  await c.end();
}

main().catch(console.error);
