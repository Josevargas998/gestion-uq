const xlsx = require('xlsx');
const path = require('path');

const folder = 'C:\\Users\\JHVEspinosa\\Downloads\\general';

// ====== 1. Academusoft (base de datos de docentes) ======
console.log('\n========== ACADEMUSOFT ==========');
const wb1 = xlsx.readFile(path.join(folder, 'Detalle Academusoft - 8 de mayo de 2026 (4).xlsx'));
console.log('Hojas:', wb1.SheetNames);
const ws1 = wb1.Sheets[wb1.SheetNames[0]];
const data1 = xlsx.utils.sheet_to_json(ws1, { header: 1 });
console.log('Headers:', data1[0]);
console.log('Filas:', data1.length - 1);
console.log('Primeras 3 filas:');
for (let i = 1; i <= 3; i++) console.log(JSON.stringify(data1[i]));

// ====== 2. Res Exp Cal ======
console.log('\n========== RES EXP CAL ==========');
const wb2 = xlsx.readFile(path.join(folder, 'Res Exp Cal (1).xlsx'));
console.log('Hojas:', wb2.SheetNames);
wb2.SheetNames.forEach(sh => {
  const ws = wb2.Sheets[sh];
  const data = xlsx.utils.sheet_to_json(ws, { header: 1 });
  console.log(`\n  [${sh}] ${data.length-1} filas`);
  console.log('  Headers:', data[0]);
  for (let i = 1; i <= 2; i++) console.log('  ', JSON.stringify(data[i]));
});

// ====== 3. Topes Productividad ======
console.log('\n========== TOPES PRODUCTIVIDAD ==========');
const wb3 = xlsx.readFile(path.join(folder, 'Topes_Productividad_Academica (1).xls'));
console.log('Hojas:', wb3.SheetNames);
wb3.SheetNames.forEach(sh => {
  const ws = wb3.Sheets[sh];
  const data = xlsx.utils.sheet_to_json(ws, { header: 1 });
  console.log(`\n  [${sh}] ${data.length-1} filas`);
  console.log('  Headers:', data[0]);
  for (let i = 1; i <= 2; i++) console.log('  ', JSON.stringify(data[i]));
});
