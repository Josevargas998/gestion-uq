const xlsx = require('xlsx');
const { Client } = require('pg');

async function main() {
  const c = new Client({ user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432 });
  await c.connect();

  const wb = xlsx.readFile('C:\\Users\\JHVEspinosa\\Downloads\\ciarp1\\ciarp1.xlsx');
  const ACTA = '1- 18/03/2026';

  const sheetMap = [
    { name: 'DDD_Auxiliar',   tipo: 'ddd', subcategoria: 'auxiliar', cedCol: 2, nombreCol: 3, ptsCol: 9 },
    { name: 'DDD_Asistente',  tipo: 'ddd', subcategoria: 'asistente', cedCol: 2, nombreCol: 3, ptsCol: 9 },
    { name: 'DDD_Asociado',   tipo: 'ddd', subcategoria: 'asociado', cedCol: 2, nombreCol: 3, ptsCol: 9 },
    { name: 'DDD_Titular',    tipo: 'ddd', subcategoria: 'titular', cedCol: 2, nombreCol: 3, ptsCol: 9 },
    { name: 'DAA',            tipo: 'daa', subcategoria: null, cedCol: 2, nombreCol: 3, ptsCol: 9 },
    { name: 'Exp_Calificada', tipo: 'exp_calificada', subcategoria: null, cedCol: 2, nombreCol: 3, ptsCol: 9 },
    { name: 'Pub_Rev_Index',  tipo: 'articulo_indexado', subcategoria: null, cedCol: 16, nombreCol: 17, ptsCol: 23 },
  ];

  let insertados = 0, saltados = 0;

  for (const sh of sheetMap) {
    if (!wb.Sheets[sh.name]) { console.log(`Hoja ${sh.name} no encontrada`); continue; }
    const data = xlsx.utils.sheet_to_json(wb.Sheets[sh.name], { header: 1 });

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const ced = row[sh.cedCol];
      const pts = row[sh.ptsCol];
      if (!ced || isNaN(Number(String(ced).replace(/\D/g, '')))) continue;
      const cedStr = String(ced).trim();
      const ptsNum = Number(pts);
      if (!ptsNum || ptsNum <= 0) continue;

      // Buscar si ya existe en BD
      const subcategoriaKey = sh.subcategoria ? `ddd_${sh.subcategoria}` : sh.tipo;
      const existe = await c.query(`
        SELECT id FROM solicitudes 
        WHERE cedula = $1 AND tipo = $2 AND acta_ciarp = $3
          AND ABS(pts_asig - $4) < 0.1
      `, [cedStr, subcategoriaKey, ACTA, ptsNum]);

      if (existe.rows.length > 0) { saltados++; continue; }

      // Verificar que el docente existe
      const doc = await c.query("SELECT nombre FROM docentes WHERE cedula = $1", [cedStr]);
      if (doc.rows.length === 0) { console.log(`  ⚠️ Docente no encontrado: ${cedStr}`); continue; }

      const tipoLabel = { 
        ddd_auxiliar: 'DDD — Auxiliar (2 pts)',
        ddd_asistente: 'DDD — Asistente (3 pts)',
        ddd_asociado: 'DDD — Asociado (4 pts)',
        ddd_titular: 'DDD — Titular (5 pts)',
        daa: 'Desempeño Académico Administrativo (DAA)',
        exp_calificada: 'Experiencia Calificada',
        articulo_indexado: 'Artículo Indexado',
      }[subcategoriaKey] || subcategoriaKey;

      const newId = `SOL-2026-${subcategoriaKey.toUpperCase()}-${cedStr}`;
      await c.query(`
        INSERT INTO solicitudes (id, cedula, tipo, titulo, pts_asig, estado, etapa, acta_ciarp, sesion_ciarp_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, 'aprobado', 'archivada', $6, 
          (SELECT id FROM sesiones_ciarp WHERE acta_label = $6 LIMIT 1),
          NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `, [newId, cedStr, subcategoriaKey, tipoLabel, ptsNum, ACTA]);

      console.log(`✅ ${doc.rows[0].nombre} (${cedStr}): ${subcategoriaKey} = ${ptsNum} pts`);
      insertados++;
    }
  }

  console.log(`\n✅ Importación completada: ${insertados} insertados, ${saltados} ya existían.`);
  await c.end();
}

main().catch(console.error);
