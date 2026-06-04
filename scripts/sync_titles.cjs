const { Client } = require('pg');
const xlsx = require('xlsx');

async function main() {
  const c = new Client({ user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432 });
  await c.connect();

  // Leer los 3 archivos de referencia
  const wb1 = xlsx.readFile('C:\\Users\\JHVEspinosa\\Downloads\\general\\Detalle Academusoft - 8 de mayo de 2026 (4).xlsx');
  const academusoft = xlsx.utils.sheet_to_json(wb1.Sheets[wb1.SheetNames[0]]);
  const acadDict = {};
  academusoft.forEach(r => { if (r['DOCUMENTO ACAD']) acadDict[String(r['DOCUMENTO ACAD']).trim()] = r; });

  const wb2 = xlsx.readFile('C:\\Users\\JHVEspinosa\\Downloads\\general\\Res Exp Cal (1).xlsx');
  const resExp = xlsx.utils.sheet_to_json(wb2.Sheets[wb2.SheetNames[0]]);
  const resExpDict = {};
  resExp.forEach(r => { if (r['CÉDULA DE CIUDADANÍA O EXTRANJERÍA']) resExpDict[String(r['CÉDULA DE CIUDADANÍA O EXTRANJERÍA']).trim()] = r; });

  const wb3 = xlsx.readFile('C:\\Users\\JHVEspinosa\\Downloads\\general\\Topes_Productividad_Academica (1).xls');
  const topes = xlsx.utils.sheet_to_json(wb3.Sheets[wb3.SheetNames[0]]);
  const topesDict = {};
  topes.forEach(r => { if (r['IDENTIFICACIÓN']) topesDict[String(r['IDENTIFICACIÓN']).trim()] = r; });

  console.log("=== CORRECCIÓN: Cristian Camilo Reyes Galeano ===");
  // En Academusoft tiene MAESTRIA, no doctorado. El título aprobado (80 pts) es probablemente la Maestría
  // Corregir el campo titulo de la solicitud a su título académico real
  const r1 = await c.query(`
    UPDATE solicitudes
    SET titulo = 'MAGISTER EN DIDÁCTICA DE LAS LENGUAS'
    WHERE id = 'SOL-2026-PROD-936DAE6C'
    RETURNING id, cedula, titulo, tipo, pts_asig
  `);
  console.log("Solicitud corregida:", r1.rows[0]);

  // Ahora actualizar el campo maestria y escolaridad del docente en la tabla docentes
  const r2 = await c.query(`
    UPDATE docentes
    SET maestria = 'MAGISTER EN DIDACTICA DE LAS LENGUAS',
        escolaridad = 'MAGISTER EN DIDACTICA DE LAS LENGUAS',
        updated_at = NOW()
    WHERE cedula = '1102042502'
    RETURNING cedula, nombre, maestria, escolaridad
  `);
  console.log("Docente actualizado:", r2.rows[0]);

  console.log("\n=== ACTUALIZACIÓN MASIVA: Sincronizar títulos de todos los docentes desde Academusoft ===");
  // Para cada docente en Academusoft, actualizar sus campos de título si están vacíos o desactualizados
  let updated = 0;
  for (const [cedula, row] of Object.entries(acadDict)) {
    const esp = row['ESPECIALIZACION ACAD'] !== '-' ? row['ESPECIALIZACION ACAD'] : null;
    const mae = row['MAESTRIA ACAD'] !== '-' ? row['MAESTRIA ACAD'] : null;
    const doc = row['DOCTORADO ACAD'] !== '-' ? row['DOCTORADO ACAD'] : null;

    if (!esp && !mae && !doc) continue;

    // Calcular la mayor escolaridad
    let maxEsc = null;
    if (doc) maxEsc = doc;
    else if (mae) maxEsc = mae;
    else if (esp) maxEsc = esp;

    const result = await c.query(`
      UPDATE docentes
      SET 
        especializacion = COALESCE(NULLIF(especializacion, ''), $1::text),
        maestria = COALESCE(NULLIF(maestria, ''), $2::text),
        doctorado = COALESCE(NULLIF(doctorado, ''), $3::text),
        escolaridad = CASE WHEN escolaridad IS NULL OR escolaridad = '' THEN $4::text ELSE escolaridad END,
        updated_at = NOW()
      WHERE cedula = $5
        AND ($1::text IS NOT NULL OR $2::text IS NOT NULL OR $3::text IS NOT NULL)
      RETURNING cedula
    `, [esp, mae, doc, maxEsc, cedula]);

    if (result.rows.length > 0) updated++;
  }
  console.log(`Docentes actualizados con datos de Academusoft: ${updated}`);

  console.log("\n=== VERIFICACIÓN FINAL: Carolina y Cristian ===");
  const r3 = await c.query(`
    SELECT cedula, nombre, especializacion, maestria, doctorado, escolaridad
    FROM docentes
    WHERE cedula IN ('24606935', '1102042502')
  `);
  r3.rows.forEach(r => console.log(r));

  await c.end();
  console.log("\n✅ Sincronización completa.");
}

main().catch(console.error);
