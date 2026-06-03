const xlsx = require('xlsx');
const wb = xlsx.readFile('C:/Users/JHVEspinosa/Downloads/ciarp2/ciarp2.xlsx');
const data = xlsx.utils.sheet_to_json(wb.Sheets['Pub_Rev_Index'], { header: 1, defval: null });

for (let i = 0; i < data.length; i++) {
  const row = data[i];
  if (!row) continue;
  let isCiarp2 = false;
  for (let j=0; j<row.length; j++) {
    if (typeof row[j] === 'string' && (row[j].includes('04/06/2026') || row[j].includes('2- 2026'))) {
      isCiarp2 = true; break;
    }
  }
  if (isCiarp2) {
    console.log(`Fila ${i+1}: Titulo="${String(row[3]).substring(0,15)}" | col23(Pts)=${row[23]} | col16(Ced)=${row[16]}`);
  }
}
