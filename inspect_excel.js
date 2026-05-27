const XLSX = require('xlsx');
const path = require('path');

function inspectFile(filePath) {
  console.log('=== File:', path.basename(filePath), '===');
  const workbook = XLSX.readFile(filePath);
  console.log('Sheets:', workbook.SheetNames);
  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`Sheet "${sheetName}" has ${data.length} rows.`);
    console.log('First 5 rows:');
    data.slice(0, 5).forEach((row, i) => {
      console.log(`  Row ${i + 1}:`, row.slice(0, 15));
    });
  });
}

inspectFile('formato/Formato CEI.xlsx');
inspectFile('formato/Formato CIARP.xlsx');
