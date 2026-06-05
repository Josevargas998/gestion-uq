const { Client } = require('pg');

async function main() {
  const c = new Client({ user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432 });
  await c.connect();

  let totalEliminados = 0;

  // ============================================================
  // PROBLEMA 1: Eliminar registros SOL-2026-DDD_X-{cedula}
  // que son duplicados de los C12026-XXXXX tipo 'ddd' ya existentes
  // (El import_ciarp1_excepciones.cjs creó ddd_asistente/auxiliar/asociado/titular
  //  para docentes que ya tenían un registro 'ddd' genérico con el mismo acta)
  // ============================================================
  console.log("\n=== 1. Eliminando DDD subcategorías duplicadas (SOL-2026-DDD_*) ===");

  // Para cada docente, si tiene TANTO un 'ddd' C12026 aprobado en el CIARP 1
  // como un 'ddd_asistente/auxiliar/asociado/titular' SOL-2026 en el mismo acta, 
  // eliminamos el SOL nuevo (el C12026 tiene más info original)
  const dddDuplicados = await c.query(`
    SELECT s_new.id, s_new.cedula, s_new.tipo, s_new.pts_asig
    FROM solicitudes s_new
    JOIN solicitudes s_old ON 
      s_old.cedula = s_new.cedula 
      AND s_old.tipo = 'ddd'
      AND s_old.acta_ciarp = s_new.acta_ciarp
      AND ABS(COALESCE(s_old.pts_asig, 0) - COALESCE(s_new.pts_asig, 0)) < 0.1
    WHERE s_new.tipo IN ('ddd_auxiliar','ddd_asistente','ddd_asociado','ddd_titular')
      AND s_new.id LIKE 'SOL-2026-DDD%'
  `);

  console.log(`  Encontrados ${dddDuplicados.rows.length} registros DDD duplicados para eliminar`);
  for (const row of dddDuplicados.rows) {
    await c.query('DELETE FROM solicitudes WHERE id = $1', [row.id]);
    console.log(`  ❌ Eliminado: ${row.id} (${row.tipo}, ${row.pts_asig} pts, cedula ${row.cedula})`);
    totalEliminados++;
  }

  // ============================================================
  // PROBLEMA 2: Eliminar SOL-2026-ARTICULO_INDEXADO-{cedula}
  // que duplican un C12026-XXXXX tipo 'revista_a1' con el mismo acta y pts
  // ============================================================
  console.log("\n=== 2. Eliminando Artículos Indexados duplicados (SOL-2026-ARTICULO_INDEXADO-*) ===");

  const artDuplicados = await c.query(`
    SELECT s_new.id, s_new.cedula, s_new.pts_asig
    FROM solicitudes s_new
    JOIN solicitudes s_old ON
      s_old.cedula = s_new.cedula
      AND s_old.tipo IN ('revista_a1', 'articulo_indexado')
      AND s_old.acta_ciarp = s_new.acta_ciarp
      AND ABS(COALESCE(s_old.pts_asig, 0) - COALESCE(s_new.pts_asig, 0)) < 0.1
      AND s_old.id <> s_new.id
    WHERE s_new.id LIKE 'SOL-2026-ARTICULO_INDEXADO-%'
  `);

  console.log(`  Encontrados ${artDuplicados.rows.length} artículos duplicados para eliminar`);
  for (const row of artDuplicados.rows) {
    await c.query('DELETE FROM solicitudes WHERE id = $1', [row.id]);
    console.log(`  ❌ Eliminado: ${row.id} (articulo_indexado, ${row.pts_asig} pts, cedula ${row.cedula})`);
    totalEliminados++;
  }

  // ============================================================
  // VERIFICAR: quedan duplicados de tipo DDD genérico vs subcategoría?
  // (caso donde había SOLO ddd_X sin C12026 previo — esos son válidos y se quedan)
  // ============================================================
  console.log("\n=== 3. Verificando DDD sin duplicado (registros válidos que se quedan) ===");
  const dddValidos = await c.query(`
    SELECT s.id, d.nombre, s.tipo, s.pts_asig
    FROM solicitudes s
    JOIN docentes d ON d.cedula = s.cedula
    WHERE s.tipo IN ('ddd_auxiliar','ddd_asistente','ddd_asociado','ddd_titular')
      AND s.id LIKE 'SOL-2026-DDD%'
    ORDER BY d.nombre
  `);
  console.log(`  ${dddValidos.rows.length} registros DDD por subcategoría válidos (sin duplicado C12026):`);
  dddValidos.rows.forEach(r => console.log(`    ✅ ${r.id} → ${r.nombre} (${r.tipo}, ${r.pts_asig} pts)`));

  // ============================================================
  // ACTUALIZAR los tipo='ddd' genéricos a ddd_asistente/etc. según la categoría del docente
  // (para los C12026 que no tienen subcategoría)
  // ============================================================
  console.log("\n=== 4. Actualizando tipo 'ddd' genérico a subcategoría según categoría del docente ===");
  const dddGenericos = await c.query(`
    SELECT s.id, s.cedula, d.nombre, d.categoria
    FROM solicitudes s
    JOIN docentes d ON d.cedula = s.cedula
    WHERE s.tipo = 'ddd' AND s.acta_ciarp IS NOT NULL
  `);

  for (const row of dddGenericos.rows) {
    const cat = (row.categoria || '').toLowerCase();
    let nuevoTipo = null;
    if (cat.includes('auxiliar')) nuevoTipo = 'ddd_auxiliar';
    else if (cat.includes('asistente')) nuevoTipo = 'ddd_asistente';
    else if (cat.includes('asociado')) nuevoTipo = 'ddd_asociado';
    else if (cat.includes('titular')) nuevoTipo = 'ddd_titular';

    if (nuevoTipo) {
      await c.query('UPDATE solicitudes SET tipo = $1 WHERE id = $2', [nuevoTipo, row.id]);
      console.log(`  🔄 ${row.nombre} (${row.cedula}): ddd → ${nuevoTipo}`);
    } else {
      console.log(`  ⚠️  ${row.nombre} sin categoría reconocida: "${row.categoria}"`);
    }
  }

  console.log(`\n✅ Limpieza completada. Total eliminados: ${totalEliminados}`);
  await c.end();
}

main().catch(console.error);
