const { Pool } = require('pg');
const pool = new Pool({ host:'localhost', port:5432, database:'gestion_uq_db', user:'gestion_uq', password:'gestion_uq_2026' });

async function main() {
  // 1. Topes vs Decreto 1279
  const inconsistentes = await pool.query(`
    SELECT cedula, nombre, categoria, tope,
      CASE 
        WHEN categoria ILIKE '%titular%' THEN 540
        WHEN categoria ILIKE '%asociado%' THEN 320
        WHEN categoria ILIKE '%asistente%' THEN 160
        WHEN categoria ILIKE '%auxiliar%' THEN 80
        ELSE -1
      END AS tope_decreto,
      pts_acumulados, pts_total_salarial, pts_titulos_exp
    FROM docentes
    WHERE estado = 'ACTIVO'
      AND (
        (categoria ILIKE '%titular%' AND tope != 540) OR
        (categoria ILIKE '%asociado%' AND tope != 320) OR
        (categoria ILIKE '%asistente%' AND tope != 160) OR
        (categoria ILIKE '%auxiliar%' AND tope != 80)
      )
    ORDER BY nombre
    LIMIT 20
  `);

  if (inconsistentes.rows.length === 0) {
    console.log('✅ Topes: todos coinciden con Decreto 1279');
  } else {
    console.log('⚠️  Topes inconsistentes (' + inconsistentes.rows.length + '):');
    inconsistentes.rows.forEach(d => {
      console.log('  ', d.cedula, d.nombre.padEnd(35), 'Cat:', d.categoria.padEnd(12), 'Tope BD:', d.tope, '→ Decreto:', d.tope_decreto);
    });
  }

  // 2. Docentes activos con categoria no reconocida (no aparecerian en GestorDocentes)
  const sinCategoria = await pool.query(`
    SELECT cedula, nombre, categoria, estado
    FROM docentes
    WHERE estado = 'ACTIVO'
      AND NOT (
        categoria ILIKE '%titular%' OR
        categoria ILIKE '%asociado%' OR
        categoria ILIKE '%asistente%' OR
        categoria ILIKE '%auxiliar%'
      )
    ORDER BY nombre
  `);

  if (sinCategoria.rows.length === 0) {
    console.log('✅ Categorías: todos los activos tienen categoría válida');
  } else {
    console.log('\n⚠️  Activos SIN categoría reconocida (no aparecen en panel):');
    sinCategoria.rows.forEach(d => {
      console.log('  ', d.cedula, d.nombre.padEnd(35), 'Cat:', JSON.stringify(d.categoria));
    });
  }

  // 3. Docentes con pts_acumulados NULL o 0 (posible dato faltante)
  const sinPuntos = await pool.query(`
    SELECT COUNT(*) as cnt FROM docentes
    WHERE estado = 'ACTIVO'
      AND (pts_acumulados IS NULL OR pts_acumulados = 0)
      AND (categoria ILIKE '%titular%' OR categoria ILIKE '%asociado%' OR categoria ILIKE '%asistente%' OR categoria ILIKE '%auxiliar%')
  `);
  console.log('\n📊 Activos de planta con pts_acumulados = 0 o NULL:', sinPuntos.rows[0].cnt);

  // 4. Docentes con pts_total_salarial NULL (columna que se usa para el sueldo)
  const sinSalarial = await pool.query(`
    SELECT COUNT(*) as cnt FROM docentes
    WHERE estado = 'ACTIVO'
      AND pts_total_salarial IS NULL
      AND (categoria ILIKE '%titular%' OR categoria ILIKE '%asociado%' OR categoria ILIKE '%asistente%' OR categoria ILIKE '%auxiliar%')
  `);
  console.log('📊 Activos de planta con pts_total_salarial NULL:', sinSalarial.rows[0].cnt);

  // 5. Resumen general
  const resumen = await pool.query(`
    SELECT 
      COUNT(*) FILTER (WHERE estado='ACTIVO' AND (categoria ILIKE '%titular%' OR categoria ILIKE '%asociado%' OR categoria ILIKE '%asistente%' OR categoria ILIKE '%auxiliar%')) AS planta_activa,
      COUNT(*) FILTER (WHERE estado='ACTIVO') AS total_activos,
      COUNT(*) FILTER (WHERE estado='INACTIVO') AS inactivos,
      COUNT(*) AS total
    FROM docentes
  `);
  const r = resumen.rows[0];
  console.log('\n📋 RESUMEN BD:');
  console.log('   Planta activa (visible en panel):', r.planta_activa);
  console.log('   Total activos en BD:              ', r.total_activos);
  console.log('   Inactivos:                        ', r.inactivos);
  console.log('   Total registros:                  ', r.total);

  await pool.end();
}

main().catch(e => { console.error(e); pool.end(); });
