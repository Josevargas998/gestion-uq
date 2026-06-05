const xlsx = require('xlsx');

function main() {
  const filePath = 'C:\\Users\\JHVEspinosa\\Downloads\\ciarp1\\ciarp1.xlsx';
  const workbook = xlsx.readFile(filePath);
  
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  // Mostrar cabeceras
  console.log("=== CABECERAS (fila 1) ===");
  console.log(data[0]);
  console.log("\n=== CABECERAS (fila 2 si existe) ===");
  console.log(data[1]);
  console.log("\n=== CABECERAS (fila 3 si existe) ===");
  console.log(data[2]);
  
  // Fila de Cristian es la 180 (índice 179)
  console.log("\n=== FILA COMPLETA DE CRISTIAN CAMILO (índice 179) ===");
  const cristian = data[179];
  cristian.forEach((val, idx) => {
    if (val !== undefined && val !== null && val !== '') {
      const header = data[0] ? data[0][idx] : `Col ${idx}`;
      console.log(`[${idx}] ${header}: ${val}`);
    }
  });
}

main();
