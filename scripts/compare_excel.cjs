const xlsx = require('xlsx');
const { Client } = require('pg');

async function main() {
  console.log("=== Comparación con Archivos de Referencia ===");
  const wb = xlsx.readFile('C:\\Users\\JHVEspinosa\\Downloads\\general\\Detalle Academusoft - 8 de mayo de 2026 (4).xlsx');
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(ws);
  
  console.log(`Leídas ${data.length} filas del archivo Academusoft.`);
  
  if(data.length > 0) {
    console.log("Muestra de las claves del primer registro:");
    console.log(Object.keys(data[0]));
    console.log("\nMuestra de un registro (ej: Carolina Bermudez, si existe):");
    const caros = data.filter(d => d['CEDULA'] == '24606935' || d['IDENTIFICACION'] == '24606935' || Object.values(d).includes('24606935') || Object.values(d).some(v => String(v).includes('BERMUDEZ')));
    console.log(caros);
  }

  const wb2 = xlsx.readFile('C:\\Users\\JHVEspinosa\\Downloads\\general\\Res Exp Cal (1).xlsx');
  const ws2 = wb2.Sheets[wb2.SheetNames[0]];
  const data2 = xlsx.utils.sheet_to_json(ws2);
  console.log(`\nLeídas ${data2.length} filas del archivo Res Exp Cal.`);
  if(data2.length > 0) {
    console.log("Claves:", Object.keys(data2[0]));
  }
}

main().catch(console.error);
