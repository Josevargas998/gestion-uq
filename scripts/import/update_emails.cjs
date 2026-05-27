/**
 * update_emails.cjs
 * Lee correos/correos.xlsx y actualiza el campo correo en la tabla docentes.
 */

const path = require('path');
require(path.join(__dirname, '../../backend/node_modules/dotenv')).config({ path: path.join(__dirname, '../../backend/.env') });
const xlsx = require(path.join(__dirname, '../../node_modules/xlsx'));
const { Pool } = require(path.join(__dirname, '../../backend/node_modules/pg'));

const pool = new Pool({
  user:     process.env.DB_USER     || 'postgres',
  host:     process.env.DB_HOST     || 'localhost',
  database: process.env.DB_NAME     || 'gestion_uq_db',
  password: process.env.DB_PASSWORD || 'admin',
  port:     parseInt(process.env.DB_PORT || '5432'),
});

async function main() {
  const wb   = xlsx.readFile('./correos/correos.xlsx');
  const ws   = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(ws);

  console.log(`📋 Total registros en Excel: ${rows.length}`);

  let updated  = 0;
  let notFound = 0;
  let sinEmail = 0;

  for (const row of rows) {
    const cedula = String(row['Identificación'] || '').trim();
    const correo = String(row['Correo Electrónico'] || '').trim().toLowerCase();

    if (!cedula || !correo) { sinEmail++; continue; }

    const res = await pool.query(
      `UPDATE docentes SET correo = $1 WHERE cedula = $2`,
      [correo, cedula]
    );

    if (res.rowCount > 0) {
      updated++;
      console.log(`  ✅ ${cedula} → ${correo}`);
    } else {
      notFound++;
      console.log(`  ⚠️  ${cedula} (${row['Nombres']} ${row['Apellidos']}) — no encontrado en BD`);
    }
  }

  console.log('\n──────────────────────────────────');
  console.log(`✅ Actualizados:       ${updated}`);
  console.log(`⚠️  No en BD:          ${notFound}`);
  console.log(`⏭  Sin correo en XLS: ${sinEmail}`);

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
