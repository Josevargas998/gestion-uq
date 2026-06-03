const xlsx = require('xlsx');

const wb = xlsx.readFile('C:/Users/JHVEspinosa/Downloads/ciarp1/ciarp1.xlsx');

const HOJAS_PROD = [
  { nombre: 'Pub_Rev_Index',           colNo: 2, colPts: 23, colActa: 25, headerRow: 1 },
  { nombre: 'Libro_Texto',             colNo: 2, colPts: 19, colActa: 20, headerRow: 1 },
  { nombre: 'Libro_Ensayo',            colNo: 2, colPts: 18, colActa: 21, headerRow: 1 }, // Acta en Ensayo vimos que era 19, pero usamos buscar en colActa - 2 a colActa + 2
  { nombre: 'Libro_Res_Investigacion', colNo: 2, colPts: 18, colActa: 19, headerRow: 1 },
  { nombre: 'Prod_Tecnica',            colNo: 2, colPts: 15, colActa: 16, headerRow: 1 },
  { nombre: 'Prod_Software',           colNo: 2, colPts: 15, colActa: 16, headerRow: 1 },
  { nombre: 'Obras_Artisticas',        colNo: 2, colPts: 18, colActa: 19, headerRow: 1 },
  { nombre: 'Premios',                 colNo: 2, colPts: 14, colActa: 15, headerRow: 1 },
];

function extraerConteoProductos(sheetName, config) {
  if (!wb.SheetNames.includes(sheetName)) return { aprobados: 0, negados: 0 };
  const data = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null });
  
  let aprobados = 0;
  let negados = 0;
  
  let currentProduct = null;
  
  for (let i = config.headerRow + 1; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    
    // Si tiene numero en la columna "No.", empieza un producto nuevo
    if (row[config.colNo] !== null && String(row[config.colNo]).trim() !== '') {
      // Procesar el producto anterior si existia
      if (currentProduct) {
        if (currentProduct.acta.includes('18/03/2026') || currentProduct.acta.includes('1- 2026')) {
          if (currentProduct.totalPts > 0) aprobados++;
          else negados++;
        }
      }
      
      // Buscar acta (puede estar movida una o dos columnas)
      let acta = '';
      for (let j=Math.max(0, config.colActa-2); j<=config.colActa+2; j++) {
        if (row[j] && typeof row[j] === 'string' && (row[j].includes('18/03/2026') || row[j].match(/^\d+-/))) {
          acta = row[j]; break;
        }
      }
      
      currentProduct = {
        acta: acta,
        totalPts: Number(row[config.colPts]) || 0
      };
    } else if (currentProduct) {
      // Es un co-autor del producto actual, sumar sus puntos
      const pts = Number(row[config.colPts]) || 0;
      currentProduct.totalPts += pts;
    }
  }
  
  // Procesar el ultimo producto
  if (currentProduct) {
    if (currentProduct.acta.includes('18/03/2026') || currentProduct.acta.includes('1- 2026')) {
      if (currentProduct.totalPts > 0) aprobados++;
      else negados++;
    }
  }
  
  return { aprobados, negados };
}

function extraerConteoAscensoTitulo(sheetName) {
  if (!wb.SheetNames.includes(sheetName)) return { aprobados: 0, negados: 0 };
  const data = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null });
  let aprobados = 0;
  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[2]) continue;
    let pts = 0;
    for (let j=row.length-1; j>=3; j--) {
       if (typeof row[j] === 'number' && row[j] > 0) { pts = row[j]; break; }
    }
    if (pts > 0) aprobados++;
  }
  return { aprobados, negados: 0 };
}

function extraerConteoExcepcion(sheetName) {
  if (!wb.SheetNames.includes(sheetName)) return { aprobados: 0, negados: 0 };
  const data = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null });
  let aprobados = 0;
  for (let i = 3; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[2]) continue;
    let pts = 0;
    for (let j=row.length-1; j>=3; j--) {
       if (typeof row[j] === 'number' && row[j] > 0) { pts = row[j]; break; }
    }
    if (pts > 0) aprobados++;
  }
  return { aprobados, negados: 0 };
}

function run() {
  let totalAprobados = 0;
  let totalNegados = 0;
  
  console.log("=== DESGLOSE CIARP 1 - 18/03/2026 (SEGÚN EXCEL) ===\n");
  
  // 1. Productos Académicos
  for (const cfg of HOJAS_PROD) {
    const { aprobados, negados } = extraerConteoProductos(cfg.nombre, cfg);
    if (aprobados > 0 || negados > 0) {
      console.log(`${cfg.nombre.padEnd(25)} | Aprobados: ${String(aprobados).padStart(3)} | Negados: ${negados}`);
      totalAprobados += aprobados;
      totalNegados += negados;
    }
  }
  
  // 2. Ascensos y Títulos
  const ascensos = extraerConteoAscensoTitulo('Ascenso_Categoria');
  const titulos = extraerConteoAscensoTitulo('Titulo');
  console.log(`Ascensos                  | Aprobados: ${String(ascensos.aprobados).padStart(3)} | Negados: 0`);
  console.log(`Títulos                   | Aprobados: ${String(titulos.aprobados).padStart(3)} | Negados: 0`);
  totalAprobados += ascensos.aprobados + titulos.aprobados;
  
  // 3. Excepciones
  const daa = extraerConteoExcepcion('DAA');
  const ddd = extraerConteoExcepcion('DDD_Auxiliar').aprobados + 
              extraerConteoExcepcion('DDD_Asistente').aprobados + 
              extraerConteoExcepcion('DDD_Asociado').aprobados + 
              extraerConteoExcepcion('DDD_Titular').aprobados;
  const exp = extraerConteoExcepcion('Exp_Calificada');
  
  console.log(`DAA                       | Aprobados: ${String(daa.aprobados).padStart(3)} | Negados: 0`);
  console.log(`DDD (Todos)               | Aprobados: ${String(ddd).padStart(3)} | Negados: 0`);
  console.log(`Experiencia Calificada    | Aprobados: ${String(exp.aprobados).padStart(3)} | Negados: 0`);
  
  totalAprobados += daa.aprobados + ddd + exp.aprobados;
  
  console.log("\n==================================================");
  console.log(`TOTAL APROBADOS : ${totalAprobados}`);
  console.log(`TOTAL NEGADOS   : ${totalNegados}`);
  console.log("==================================================");
}

run();
