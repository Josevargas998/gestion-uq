const XLSX = require('xlsx');
const fs = require('fs');

try {
  const workbook = XLSX.readFile('correos/correos.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  let sql = 'BEGIN;\n';
  let count = 0;

  // Find columns
  let headers = data[0].map(h => typeof h === 'string' ? h.toLowerCase().trim() : '');
  
  let nameCol = headers.findIndex(h => h.includes('nombre') || h.includes('docente'));
  let emailCol = headers.findIndex(h => h.includes('correo') || h.includes('email'));
  let docCol = headers.findIndex(h => h.includes('cedula') || h.includes('documento') || h.includes('identificacion'));

  if (emailCol === -1) {
    // try to guess by looking at row 1
    for (let i = 0; i < data[1].length; i++) {
       if (typeof data[1][i] === 'string' && data[1][i].includes('@')) {
          emailCol = i;
          break;
       }
    }
  }
  
  if (nameCol === -1 && docCol === -1) {
    console.error("Could not find name or document column.");
    process.exit(1);
  }

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    
    let email = row[emailCol];
    if (!email || typeof email !== 'string' || !email.includes('@')) continue;
    email = email.trim().toLowerCase();

    let query = '';
    if (docCol !== -1 && row[docCol]) {
       let doc = String(row[docCol]).trim();
       query = `UPDATE docentes SET correo = '${email}' WHERE cedula = '${doc}';\n`;
    } else if (nameCol !== -1 && row[nameCol]) {
       let name = String(row[nameCol]).trim().replace(/'/g, "''");
       query = `UPDATE docentes SET correo = '${email}' WHERE UPPER(nombre) LIKE UPPER('%${name}%');\n`;
    }
    
    if (query) {
      sql += query;
      count++;
    }
  }

  sql += 'COMMIT;\n';
  fs.writeFileSync('update_emails.sql', sql);
  console.log(`Generated SQL to update ${count} emails.`);
} catch (e) {
  console.error(e);
}
