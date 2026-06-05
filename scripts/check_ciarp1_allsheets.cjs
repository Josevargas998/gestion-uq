const xlsx = require('xlsx');

function main() {
  const filePath = 'C:\\Users\\JHVEspinosa\\Downloads\\ciarp1\\ciarp1.xlsx';
  const workbook = xlsx.readFile(filePath);
  
  // Ver todas las hojas disponibles
  console.log("Hojas disponibles:", workbook.SheetNames);
  
  // Buscar en todas las hojas
  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    data.forEach((row, i) => {
      const rowStr = row.join(' ').toLowerCase();
      if ((rowStr.includes('cristian') && rowStr.includes('reyes')) || rowStr.includes('1102042502')) {
        console.log(`\n[Hoja: ${sheetName}] Fila ${i + 1}:`);
        row.forEach((val, idx) => {
          if (val !== undefined && val !== null && val !== '') {
            console.log(`  Col ${idx}: ${val}`);
          }
        });
      }
    });
  });
}

main();
