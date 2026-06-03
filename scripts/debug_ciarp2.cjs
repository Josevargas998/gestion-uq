const xlsx = require('xlsx');

const wb = xlsx.readFile('C:/Users/JHVEspinosa/Downloads/ciarp2/ciarp2.xlsx');

const HOJAS_PROD = [
  { nombre: 'Pub_Rev_Index',           colPts: 23, colActa: 25 },
  { nombre: 'Libro_Texto',             colPts: 19, colActa: 20 },
  { nombre: 'Libro_Ensayo',            colPts: 18, colActa: 21 },
  { nombre: 'Premios',                 colPts: 14, colActa: 15 },
  { nombre: 'Titulo',                  colPts: -1, colActa: -1 } // especial
];

function debugHoja(sheetName) {
  if (!wb.SheetNames.includes(sheetName)) return;
  console.log(`\n--- Analizando hoja: ${sheetName} ---`);
  const data = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null });
  
  let matchCount = 0;
  let totalPts = 0;
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    
    // Buscar cualquier celda que diga '04/06' o similar
    let isCiarp2 = false;
    let foundActa = '';
    let foundPts = 0;
    
    for (let j=0; j<row.length; j++) {
      if (typeof row[j] === 'string' && (row[j].includes('04/06/2026') || row[j].includes('2- 2026') || row[j].includes('04/06/26'))) {
        isCiarp2 = true;
        foundActa = row[j];
        break;
      }
    }
    
    if (isCiarp2) {
      // Intentar encontrar los puntos
      for (let j=row.length-1; j>=3; j--) {
        if (typeof row[j] === 'number' && row[j] > 0) {
          foundPts = row[j];
          break;
        }
      }
      matchCount++;
      totalPts += foundPts;
      console.log(`Fila ${i+1}: Pts=${foundPts} | Acta="${foundActa}" | Nombre="${String(row[3]).substring(0, 30)}..."`);
    }
  }
  console.log(`TOTAL en ${sheetName}: ${matchCount} filas | ${totalPts.toFixed(2)} pts (Aprox)`);
}

debugHoja('Pub_Rev_Index');
debugHoja('Libro_Texto');
debugHoja('Libro_Ensayo');
debugHoja('Premios');
debugHoja('Titulo');
