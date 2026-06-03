const xlsx = require('xlsx');
const { Client } = require('pg');

const client = new Client({
  user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db',
  password: 'gestion_uq_2026', port: 5432
});

const wb = xlsx.readFile('C:/Users/JHVEspinosa/Downloads/ciarp1/ciarp1.xlsx');

function limpiarCedula(v) {
  if (!v) return null;
  const s = String(v).trim().replace(/\D/g, '');
  return s.length >= 5 ? s : null;
}

function extraerExcepcion(sheetName) {
  if (!wb.SheetNames.includes(sheetName)) return [];
  const data = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null });
  const resultado = [];
  for (let i = 3; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[2]) continue;
    const cedula = limpiarCedula(row[2]);
    if (!cedula) continue;
    const pts = Number(row[9]);
    if (isNaN(pts) || pts <= 0) continue;
    resultado.push({ cedula, nombre: String(row[3] || '').trim(), pts });
  }
  return resultado;
}

async function run() {
  await client.connect();

  // Excel: 262 docentes exp_calificada
  const excelExp = extraerExcepcion('Exp_Calificada');
  console.log(`Excel Exp_Calificada: ${excelExp.length} docentes\n`);

  // BD: 261 registros
  const { rows: bdExp } = await client.query(`
    SELECT s.cedula, CAST(s.pts_asig AS FLOAT) as pts, d.nombre
    FROM solicitudes s
    LEFT JOIN docentes d ON d.cedula = s.cedula
    WHERE s.tipo = 'exp_calificada' AND s.acta_ciarp ILIKE '%18/03/2026%'
    ORDER BY s.cedula
  `);
  console.log(`BD Exp_Calificada: ${bdExp.length} docentes\n`);

  const bdMap = {};
  bdExp.forEach(r => { bdMap[r.cedula] = r; });

  const excelMap = {};
  excelExp.forEach(r => { excelMap[r.cedula] = r; });

  // Faltantes en BD (en Excel pero no en BD)
  console.log('=== FALTANTE EN BD (está en Excel pero no en BD) ===');
  excelExp.forEach(ex => {
    if (!bdMap[ex.cedula]) {
      console.log(`❌ FALTA: Cédula ${ex.cedula} | ${ex.nombre} | ${ex.pts} pts`);
    }
  });

  // Extra en BD (en BD pero no en Excel - NO deben estar)
  console.log('\n=== EXTRA EN BD (está en BD pero NO está en Excel) ===');
  bdExp.forEach(bd => {
    if (!excelMap[String(bd.cedula)]) {
      console.log(`➕ EXTRA: Cédula ${bd.cedula} | ${bd.nombre || '?'} | ${bd.pts} pts`);
    }
  });

  // Diferencia de puntos
  console.log('\n=== DIFERENCIA DE PUNTOS ===');
  let difCount = 0;
  excelExp.forEach(ex => {
    const bd = bdMap[ex.cedula];
    if (bd && Math.abs(bd.pts - ex.pts) > 0.05) {
      console.log(`⚠️  PUNTOS DIFIEREN: ${ex.cedula} | ${bd.nombre || ex.nombre} | Excel:${ex.pts} BD:${bd.pts}`);
      difCount++;
    }
  });
  if (difCount === 0) console.log('✅ Todos los puntos coinciden correctamente.');

  await client.end();
}

run().catch(console.error);
