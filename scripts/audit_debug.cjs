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
  const resSolicitudes = await c.query("SELECT cedula, pts_asig FROM solicitudes WHERE estado = 'aprobado'");
  
  const solDict = {};
  resSolicitudes.rows.forEach(s => {
    solDict[s.cedula] = (solDict[s.cedula] || 0) + (Number(s.pts_asig) || 0);
  });

  let printed = 0;
  resDocentes.rows.forEach(doc => {
    const exc = excelDict[doc.cedula];
    if (!exc) return;

    const ptsExcel = Number(exc['TOTAL PUNTOS SALARIALES ACAD']) || 0;
    const ptsResExp = resExpDict[doc.cedula] || 0;
    
    // Total que Academusoft tenía + lo que el usuario cargó como Res Exp Cal
    const excelPuro = ptsExcel + ptsResExp;
    
    // Total que tiene la BD (histórico base importado)
    const bdBase = Number(doc.pts_total_salarial) || 0;
    
    // Diferencia entre la base histórica esperada vs la base importada
    const diffBase = Math.abs(excelPuro - bdBase);
    
    // Ahora, incluyendo las SOLICITUDES del sistema (CIARP 1 y 2)
    // El sistema suma `bdBase` + `solDict[doc.cedula]`
    const bdFinal = bdBase + (solDict[doc.cedula] || 0);
    
    if (printed < 10) {
       console.log(`[${doc.cedula}] ExcelPuro=${excelPuro.toFixed(2)} | BDBase=${bdBase.toFixed(2)} | BDFinal=${bdFinal.toFixed(2)} | DifBase=${diffBase.toFixed(2)}`);
       printed++;
    }
  });

  await c.end();
}

main().catch(console.error);
