const xlsx = require('xlsx');
const { Client } = require('pg');
const crypto = require('crypto');

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

function extraerAscensoTitulo(sheetName, tipo) {
  if (!wb.SheetNames.includes(sheetName)) return [];
  const data = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null });
  const resultado = [];
  for (let i = 2; i < data.length; i++) { // Filas de datos
    const row = data[i];
    if (!row || !row[2]) continue; // Cedula suele estar en col 2
    const cedula = limpiarCedula(row[2]);
    if (!cedula) continue;
    
    // Buscar puntos
    let pts = 0;
    for (let j=row.length-1; j>=3; j--) {
       if (typeof row[j] === 'number' && row[j] > 0) { pts = row[j]; break; }
    }
    
    if (pts <= 0) continue;
    const titulo = String(row[3] || row[4] || tipo).trim();
    resultado.push({ cedula, titulo, pts });
  }
  return resultado;
}

async function run() {
  await client.connect();

  const ascensos = extraerAscensoTitulo('Ascenso_Categoria', 'Ascenso');
  const titulos = extraerAscensoTitulo('Titulo', 'Titulo Universitario');

  console.log(`Re-insertando ${ascensos.length} ascensos y ${titulos.length} títulos...`);

  let count = 0;
  for (const f of ascensos) {
    await client.query(`
      INSERT INTO solicitudes (id, cedula, tipo, titulo, pts_asig, acta_ciarp, etapa, estado, fecha)
      VALUES ($1, $2, 'ascenso', $3, $4, '1- 18/03/2026', 'acta', 'aprobado', NOW())
    `, [crypto.randomUUID(), f.cedula, f.titulo, f.pts]);
    count++;
  }
  for (const f of titulos) {
    await client.query(`
      INSERT INTO solicitudes (id, cedula, tipo, titulo, pts_asig, acta_ciarp, etapa, estado, fecha)
      VALUES ($1, $2, 'titulo', $3, $4, '1- 18/03/2026', 'acta', 'aprobado', NOW())
    `, [crypto.randomUUID(), f.cedula, f.titulo, f.pts]);
    count++;
  }

  console.log(`✅ ${count} registros insertados.`);

  // Consultar total de nuevo
  const { rows: r } = await client.query(`
    SELECT COUNT(*) as n, SUM(CAST(pts_asig AS FLOAT)) as pts FROM solicitudes 
    WHERE acta_ciarp ILIKE '%18/03/2026%' OR acta_ciarp = '1- 2026'
  `);
  console.log(`\nTOTAL ABSOLUTO CIARP 1: ${r[0].n} solicitudes | ${Number(r[0].pts).toFixed(2)} pts`);

  await client.end();
}

run().catch(console.error);
