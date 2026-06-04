const xlsx = require('xlsx');
const { Client } = require('pg');

async function main() {
  const c = new Client({ user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432 });
  await c.connect();

  console.log("Cargando Excel Academusoft...");
  const wb = xlsx.readFile('C:\\Users\\JHVEspinosa\\Downloads\\general\\Detalle Academusoft - 8 de mayo de 2026 (4).xlsx');
  const data = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  
  const excelDict = {};
  data.forEach(row => {
    if (row['DOCUMENTO ACAD']) {
      excelDict[String(row['DOCUMENTO ACAD']).trim()] = row;
    }
  });

  console.log("Consultando Base de Datos...");
  const resDocentes = await c.query("SELECT * FROM docentes");
  const resSolicitudes = await c.query("SELECT cedula, pts_asig FROM solicitudes WHERE estado = 'aprobado'");
  
  const solicitudesPorDocente = {};
  resSolicitudes.rows.forEach(s => {
    solicitudesPorDocente[s.cedula] = (solicitudesPorDocente[s.cedula] || 0) + (Number(s.pts_asig) || 0);
  });

  let matchCount = 0;
  let diffCount = 0;
  let missingCount = 0;

  resDocentes.rows.forEach(doc => {
    const exc = excelDict[doc.cedula];
    if (!exc) {
      missingCount++;
      return;
    }

    const ptsExcel = Number(exc['TOTAL PUNTOS SALARIALES ACAD']) || 0;
    const ptsNuevos = solicitudesPorDocente[doc.cedula] || 0;
    const ptsEsperados = ptsExcel + ptsNuevos;
    
    // Lo que calcula actualmente el sistema (ptsAcumulados + ptsTitulosExp) + ptsNuevos 
    // NOTA: La base de datos tiene `pts_total_salarial` que ya incluye los historicos de Academusoft + algunos historicos importados de resoluciones.
    // Además, el hook del frontend suma ptsSolNuevos.
    // Vamos a comparar la base de datos `pts_acumulados` + `pts_titulos_exp` contra el Excel.
    
    const ptsBaseDB = (Number(doc.pts_acumulados) || 0) + (Number(doc.pts_titulos_exp) || 0);
    const dif = Math.abs(ptsExcel - ptsBaseDB);
    
    // Si la diferencia es mayor a 0.1 (por redondeos), lo marcamos.
    // Teniendo en cuenta que algunos docentes tienen resoluciones previas a 2026 que no estaban en academusoft pero sí en la DB.
    if (dif > 0.1) {
        // Ignoramos si la diferencia cuadra exactamente con solicitudes en el sistema que ya estaban sumadas en la BD (ej. importacion historica)
        const difConSol = Math.abs(ptsEsperados - ptsBaseDB);
        if (difConSol > 0.1) {
            diffCount++;
            // console.log(`Diferencia [${doc.cedula}] ${doc.nombre}: Academusoft=${ptsExcel.toFixed(1)} vs BaseDB=${ptsBaseDB.toFixed(1)}`);
        } else {
            matchCount++;
        }
    } else {
      matchCount++;
    }
  });

  console.log(`\nResultados de la auditoría masiva (${resDocentes.rows.length} docentes):`);
  console.log(`✅ Coincidencias exactas (Excel vs BD): ${matchCount}`);
  console.log(`❌ Discrepancias encontradas: ${diffCount}`);
  console.log(`⚠️ Docentes en BD que no estaban en este Excel: ${missingCount}`);

  await c.end();
}

main().catch(console.error);
