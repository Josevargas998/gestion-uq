const xlsx = require('xlsx');

const wb = xlsx.readFile('C:\\Users\\JHVEspinosa\\Downloads\\general\\general.xlsx');
console.log('Hojas:', wb.SheetNames);

wb.SheetNames.forEach(sh => {
  const ws = wb.Sheets[sh];
  const data = xlsx.utils.sheet_to_json(ws, { header: 1 });
  console.log(`\n===== Hoja: [${sh}] — ${data.length - 1} filas =====`);
  console.log('Headers:', data[0]);
  for (let i = 1; i <= 3 && i < data.length; i++) {
    console.log(`  Fila ${i}:`, JSON.stringify(data[i]));
  }
});
