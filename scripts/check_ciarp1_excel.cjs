const xlsx = require('xlsx');

function main() {
  const filePath = 'C:\\Users\\JHVEspinosa\\Downloads\\ciarp1\\ciarp1.xlsx';
  const workbook = xlsx.readFile(filePath);
  
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log("Buscando a Cristian Camilo Reyes Galeano en ciarp1.xlsx...");
  let found = false;
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowStr = row.join(' ').toLowerCase();
    
    if (rowStr.includes('cristian') || rowStr.includes('reyes') || rowStr.includes('1102042502')) {
      console.log(`\nFila ${i + 1}:`);
      console.log(row);
      found = true;
    }
  }
  
  if (!found) {
    console.log("No se encontró a Cristian en el archivo.");
  }
}

main();
