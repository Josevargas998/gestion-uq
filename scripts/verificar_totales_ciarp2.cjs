const xlsx = require('xlsx');

const wb = xlsx.readFile('C:/Users/JHVEspinosa/Downloads/ciarp2/ciarp2.xlsx');

function limpiarCedula(v) {
  if (!v) return null;
  const s = String(v).trim().replace(/\D/g, '');
  return s.length >= 5 ? s : null;
}

const HOJAS_PROD = [
  { nombre: 'Pub_Rev_Index',           tipo: 'articulo_indexado',  colCedula: 16, colTitulo:  3 },
  { nombre: 'Libro_Texto',             tipo: 'libro_texto',        colCedula:  8, colTitulo:  3 },
  { nombre: 'Libro_Ensayo',            tipo: 'libro_ensayo',       colCedula:  7, colTitulo:  3 },
  { nombre: 'Premios',                 tipo: 'premio',             colCedula:  3, colTitulo: 10 }
];

function parseSheet(sheetName, tipo, colCedula, colTitulo) {
  if (!wb.SheetNames.includes(sheetName)) return [];
  const data = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null });
  const result = [];
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    
    let isCiarp2 = false;
    for (let j=0; j<row.length; j++) {
      if (typeof row[j] === 'string' && (row[j].includes('04/06/2026') || row[j].includes('2- 2026') || row[j].includes('04/06/26'))) {
        isCiarp2 = true;
        break;
      }
    }
    
    if (isCiarp2) {
      let pts = 0;
      for (let j=row.length-1; j>=3; j--) {
        if (typeof row[j] === 'number' && row[j] > 0 && row[j] < 200) { 
          pts = row[j]; break;
        }
      }
      
      let titulo = colTitulo !== -1 ? String(row[colTitulo]).trim() : tipo;
      
      if (pts > 0) {
        result.push({ titulo, pts, tipo });
      }
    }
  }
  return result;
}

function run() {
  const all = [
    ...parseSheet('Pub_Rev_Index', 'articulo_indexado', 16, 3),
    ...parseSheet('Libro_Texto', 'libro_texto', 8, 3),
    ...parseSheet('Libro_Ensayo', 'libro_ensayo', 7, 3),
    ...parseSheet('Premios', 'premio', 3, 10),
    ...parseSheet('Titulo', 'titulo', -1, -1)
  ];

  const byType = {};
  let total = 0;

  for (const a of all) {
    if (!byType[a.tipo]) byType[a.tipo] = { count: 0, pts: 0 };
    byType[a.tipo].count++;
    byType[a.tipo].pts += a.pts;
    total += a.pts;
  }

  console.log("=== DESGLOSE DE PUNTOS CIARP 2 ===");
  for (const t in byType) {
    console.log(`${t.padEnd(20)}: ${byType[t].count} filas | ${byType[t].pts.toFixed(2)} pts`);
  }
  console.log(`TOTAL GENERAL       : ${total.toFixed(2)} pts`);
}

run();
