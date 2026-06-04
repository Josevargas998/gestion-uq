const xlsx = require('xlsx');

// Leer Academusoft para encontrar el título de Cristian Camilo
const wb = xlsx.readFile('C:\\Users\\JHVEspinosa\\Downloads\\general\\Detalle Academusoft - 8 de mayo de 2026 (4).xlsx');
const data = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

const cristian = data.find(r => String(r['DOCUMENTO ACAD']).trim() === '1102042502');
console.log("=== Cristian Camilo Reyes Galeano en Academusoft ===");
console.log(JSON.stringify(cristian, null, 2));

// Leer Topes_Productividad por si tiene info adicional
const wb2 = xlsx.readFile('C:\\Users\\JHVEspinosa\\Downloads\\general\\Topes_Productividad_Academica (1).xls');
console.log("\n=== Hojas en Topes_Productividad ===");
console.log(wb2.SheetNames);
const ws2 = wb2.Sheets[wb2.SheetNames[0]];
const data2 = xlsx.utils.sheet_to_json(ws2);
console.log("Total filas:", data2.length);
if (data2.length > 0) console.log("Columnas:", Object.keys(data2[0]));

const cristian2 = data2.find(r => Object.values(r).some(v => String(v).includes('1102042502')));
console.log("\nCristian en Topes:", JSON.stringify(cristian2, null, 2));
