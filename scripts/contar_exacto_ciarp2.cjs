const xlsx = require('xlsx');

const wb = xlsx.readFile('C:/Users/JHVEspinosa/Downloads/ciarp2/ciarp2.xlsx');

const HOJAS_PROD = [
  { nombre: 'Pub_Rev_Index',           colNo: 2, colPts: 23, colActa: 25, headerRow: 1 },
  { nombre: 'Libro_Texto',             colNo: 2, colPts: 19, colActa: 20, headerRow: 1 },
  { nombre: 'Libro_Ensayo',            colNo: 2, colPts: 18, colActa: 21, headerRow: 1 },
  { nombre: 'Libro_Res_Investigacion', colNo: 2, colPts: 18, colActa: 19, headerRow: 1 },
  { nombre: 'Prod_Tecnica',            colNo: 2, colPts: 15, colActa: 16, headerRow: 1 },
  { nombre: 'Prod_Software',           colNo: 2, colPts: 15, colActa: 16, headerRow: 1 },
  { nombre: 'Obras_Artisticas',        colNo: 2, colPts: 18, colActa: 19, headerRow: 1 },
  { nombre: 'Premios',                 colNo: 2, colPts: 14, colActa: 15, headerRow: 1 },
];

function extraerConteoProductos(sheetName, config) {
  if (!wb.SheetNames.includes(sheetName)) return { aprobados: 0, negados: 0 };
  const data = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null });
  
  let aprobados = 0, negados = 0;
  let currentProduct = null;
  
  for (let i = config.headerRow + 1; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    
    if (row[config.colNo] !== null && String(row[config.colNo]).trim() !== '') {
      if (currentProduct) {
        if (currentProduct.acta.includes('04/06/2026') || currentProduct.acta.includes('2- 2026')) {
          if (currentProduct.totalPts > 0) aprobados++;
          else negados++;
        }
      }
      
      let acta = '';
      for (let j=Math.max(0, config.colActa-2); j<=config.colActa+2; j++) {
        if (row[j] && typeof row[j] === 'string' && (row[j].includes('04/06/2026') || row[j].match(/^\d+-/))) {
          acta = row[j]; break;
        }
      }
      
      currentProduct = {
        acta: acta,
        totalPts: Number(row[config.colPts]) || 0
      };
    } else if (currentProduct) {
      currentProduct.totalPts += (Number(row[config.colPts]) || 0);
    }
  }
  
  if (currentProduct) {
    if (currentProduct.acta.includes('04/06/2026') || currentProduct.acta.includes('2- 2026')) {
      if (currentProduct.totalPts > 0) aprobados++;
      else negados++;
    }
  }
  
  return { aprobados, negados };
}

function run() {
  let totalAprobados = 0;
  let totalNegados = 0;
  
  console.log("=== DESGLOSE CIARP 2 - 04/06/2026 (SEGÚN EXCEL) ===\n");
  
  for (const cfg of HOJAS_PROD) {
    const { aprobados, negados } = extraerConteoProductos(cfg.nombre, cfg);
    if (aprobados > 0 || negados > 0) {
      console.log(`${cfg.nombre.padEnd(25)} | Aprobados: ${String(aprobados).padStart(3)} | Negados: ${negados}`);
      totalAprobados += aprobados;
      totalNegados += negados;
    }
  }
  
  console.log("\n==================================================");
  console.log(`TOTAL APROBADOS : ${totalAprobados}`);
  console.log(`TOTAL NEGADOS   : ${totalNegados}`);
  console.log("==================================================");
}

run();
