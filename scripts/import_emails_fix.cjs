const XLSX = require('xlsx');
const fs = require('fs');

try {
  const workbook = XLSX.readFile('correos/correos.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  let sql = 'BEGIN;\n';
  sql += 'UPDATE docentes SET correo = NULL;\n'; // Reset emails to wipe the previous corrupted run
  let count = 0;

  // Find columns
  let headers = data[0].map(h => typeof h === 'string' ? h.toLowerCase().trim() : '');
  
  let nameCol = headers.findIndex(h => h.includes('nombres'));
  let apellCol = headers.findIndex(h => h.includes('apellidos'));
  let emailCol = headers.findIndex(h => h.includes('correo') || h.includes('email'));
  let docCol = headers.findIndex(h => h.includes('identificaci') || h.includes('cedula') || h.includes('documento'));

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
    } else if (nameCol !== -1 && apellCol !== -1 && row[nameCol] && row[apellCol]) {
       // fallback exact match
       let fullName = String(row[apellCol]).trim() + ' ' + String(row[nameCol]).trim();
       fullName = fullName.replace(/'/g, "''").toUpperCase();
       query = `UPDATE docentes SET correo = '${email}' WHERE UPPER(nombre) = '${fullName}';\n`;
    }
    
    if (query) {
      sql += query;
      count++;
    }
  }

  sql += 'COMMIT;\n';
  fs.writeFileSync('update_emails_fix.sql', sql);
  console.log(`Generated SQL to update ${count} emails correctly.`);
} catch (e) {
  console.error(e);
}
