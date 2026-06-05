const xlsx = require('xlsx');

function main() {
  const filePath = 'C:\\Users\\JHVEspinosa\\Downloads\\general\\Detalle Academusoft - 8 de mayo de 2026 (4).xlsx';
  const workbook = xlsx.readFile(filePath);
  
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log("Buscando a Cristian Camilo Reyes Galeano en Academusoft...");
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowStr = row.join(' ').toLowerCase();
    
    if (rowStr.includes('cristian') && rowStr.includes('reyes')) {
      console.log(`\nFila ${i + 1}:`);
      console.log("Nombre:", row[1]); // Asumiendo que col 1 es nombre
      console.log("Especialización:", row[9]);
      console.log("Maestría:", row[10]);
      console.log("Doctorado:", row[11]);
      console.log("Posdoctorado:", row[12]);
      console.log("Fila completa:", row);
    }
  }
}

main();
