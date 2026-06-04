const xlsx = require('xlsx');
const { Client } = require('pg');

async function main() {
  const c = new Client({ user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432 });
  await c.connect();

  const wb = xlsx.readFile('C:\\Users\\JHVEspinosa\\Downloads\\general\\Detalle Academusoft - 8 de mayo de 2026 (4).xlsx');
  const data = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  const excelDict = {};
  data.forEach(row => {
    if (row['DOCUMENTO ACAD']) excelDict[String(row['DOCUMENTO ACAD']).trim()] = row;
  });

  const wb2 = xlsx.readFile('C:\\Users\\JHVEspinosa\\Downloads\\general\\Res Exp Cal (1).xlsx');
  const data2 = xlsx.utils.sheet_to_json(wb2.Sheets[wb2.SheetNames[0]]);
  const resExpDict = {};
  data2.forEach(row => {
    if (row['CÉDULA DE CIUDADANÍA O EXTRANJERÍA']) {
      resExpDict[String(row['CÉDULA DE CIUDADANÍA O EXTRANJERÍA']).trim()] = Number(row['PUNTOS SALARIALES']) || 0;
    }
  });

  const resDocentes = await c.query("SELECT * FROM docentes");
  
  let matchCount = 0;
  let diffCount = 0;

  resDocentes.rows.forEach(doc => {
    const exc = excelDict[doc.cedula];
    if (!exc) return;

    // Excel Academusoft Base
    const ptsExcel = Number(exc['TOTAL PUNTOS SALARIALES ACAD']) || 0;
    // Puntos de Resolución Exp Calificada (Marzo)
    const ptsResExp = resExpDict[doc.cedula] || 0;
    
    // Lo que esperamos que la base de datos tenga como base:
    const esperadoSalarial = ptsExcel + ptsResExp;
    
    // Lo que la base de datos realmente tiene como base:
    const bdSalarial = Number(doc.pts_total_salarial) || 0;

    const dif = Math.abs(esperadoSalarial - bdSalarial);
    
    if (dif > 0.1) {
        diffCount++;
    } else {
        matchCount++;
    }
  });

  console.log(`✅ Coincidencias exactas (Academusoft + Res Exp Cal vs BD pts_total_salarial): ${matchCount}`);
  console.log(`❌ Discrepancias encontradas: ${diffCount}`);

  await c.end();
}

main().catch(console.error);
