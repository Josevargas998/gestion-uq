const xlsx = require('xlsx');

const wb = xlsx.readFile('C:/Users/JHVEspinosa/Downloads/topes/topes.xls');

console.log('Hojas:', wb.SheetNames);

// Revisar la primera hoja
const hoja = wb.SheetNames[0];
const data = xlsx.utils.sheet_to_json(wb.Sheets[hoja], { header: 1, defval: null });

// Mostrar las primeras 5 filas para entender la estructura
console.log('\nPrimeras 5 filas:');
for (let i = 0; i < Math.min(5, data.length); i++) {
  console.log(`Fila ${i+1}:`, JSON.stringify(data[i]?.slice(0, 15)));
}

// Buscar a Oscar Aguirre (cédula 9732828)
console.log('\n--- Buscando Oscar Aguirre (9732828) ---');
for (let i = 0; i < data.length; i++) {
  const row = data[i];
  if (!row) continue;
  const rowStr = JSON.stringify(row);
  if (rowStr.includes('9732828') || rowStr.toLowerCase().includes('aguirre')) {
    console.log(`Fila ${i+1}:`, JSON.stringify(row?.slice(0, 20)));
  }
}
