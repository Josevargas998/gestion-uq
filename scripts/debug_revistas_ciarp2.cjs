const xlsx = require('xlsx');

const wb = xlsx.readFile('C:/Users/JHVEspinosa/Downloads/ciarp2/ciarp2.xlsx');

const data = xlsx.utils.sheet_to_json(wb.Sheets['Pub_Rev_Index'], { header: 1, defval: null });

for (let i = 0; i < data.length; i++) {
  const row = data[i];
  if (!row) continue;
  
  let isCiarp2 = false;
  let foundActa = '';
  for (let j=0; j<row.length; j++) {
    if (typeof row[j] === 'string' && (row[j].includes('04/06/2026') || row[j].includes('2- 2026') || row[j].includes('04/06/26'))) {
      isCiarp2 = true;
      foundActa = row[j];
      break;
    }
  }
  
  if (isCiarp2) {
    let pts = 0;
    for (let j=row.length-1; j>=3; j--) {
      if (typeof row[j] === 'number' && row[j] > 0 && row[j] < 200) { 
        pts = row[j]; break;
      }
    }
    
    if (pts > 0) {
      console.log(`Fila ${i+1}: Pts=${pts} | Acta=${foundActa} | Titulo="${String(row[3]).substring(0,30)}"`);
    }
  }
}
