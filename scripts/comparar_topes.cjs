const xlsx = require('xlsx');
const { Client } = require('pg');

const client = new Client({
  user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db',
  password: 'gestion_uq_2026', port: 5432
});

const wb = xlsx.readFile('C:/Users/JHVEspinosa/Downloads/topes/topes.xls');
const data = xlsx.utils.sheet_to_json(wb.Sheets['Sheet1'], { header: 1, defval: null });

// Parsear todas las filas del Excel (desde fila 2)
const excelDocentes = [];
for (let i = 1; i < data.length; i++) {
  const row = data[i];
  if (!row || !row[1]) continue;
  const cedula = String(row[1]).trim();
  const nombre = String(row[0] || '').trim();
  const programa = String(row[2] || '').trim();
  const categoria = String(row[3] || '').trim();
  const totalPuntos = Number(row[4]) || 0;
  const tope = Number(row[5]) || 0;
  excelDocentes.push({ cedula, nombre, programa, categoria, totalPuntos, tope });
}

console.log(`Total en Excel: ${excelDocentes.length} docentes\n`);

async function run() {
  await client.connect();

  // Traer todos los docentes de la BD
  const { rows: bdDocentes } = await client.query('SELECT cedula, nombre, pts_acumulados, tope FROM docentes ORDER BY nombre');
  const bdMap = {};
  bdDocentes.forEach(d => bdMap[d.cedula] = d);

  let discrepancias = 0;
  
  console.log('--- Discrepancias pts_acumulados (Excel vs BD) ---\n');
  for (const ex of excelDocentes) {
    const bd = bdMap[ex.cedula];
    if (!bd) continue;
    
    const bdPts = Number(bd.pts_acumulados) || 0;
    const bdTope = Number(bd.tope) || 0;
    
    const ptsDiff = Math.abs(bdPts - ex.totalPuntos);
    const topeDiff = Math.abs(bdTope - ex.tope);
    
    if (ptsDiff > 0.1 || topeDiff > 0.1) {
      discrepancias++;
      console.log(`${ex.nombre} (${ex.cedula})`);
      console.log(`  pts_acum  → Excel: ${ex.totalPuntos.toFixed(1)} | BD: ${bdPts.toFixed(1)} | Dif: ${(ex.totalPuntos - bdPts).toFixed(1)}`);
      if (topeDiff > 0.1) {
        console.log(`  tope      → Excel: ${ex.tope} | BD: ${bdTope} | ⚠️ DIFIERE`);
      }
      console.log('');
    }
  }
  
  console.log(`Total discrepancias: ${discrepancias}`);
  
  await client.end();
}

run().catch(console.error);
