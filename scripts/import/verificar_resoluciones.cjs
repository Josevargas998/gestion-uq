const XLSX = require('xlsx');
const { Client } = require('pg');

async function verificar() {
  const wb = XLSX.readFile('C:/Users/JHVEspinosa/Downloads/resoluciones/resoluciones.xlsx');
  const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

  const client = new Client({
    user: 'gestion_uq', host: 'localhost',
    database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432
  });
  await client.connect();

  let ok = 0, discordancia = 0;
  const errores = [];

  for (const row of data) {
    const cedula = String(row['CÉDULA DE CIUDADANÍA O EXTRANJERÍA'] || '').trim();
    const ptsExcel = Number(row['PUNTOS SALARIALES'] || 0);
    const q = await client.query('SELECT nombre, pts_acumulados FROM docentes WHERE cedula = $1', [cedula]);
    if (q.rows.length === 0) continue;
    const ptsBD = Number(q.rows[0].pts_acumulados);
    if (Math.abs(ptsBD - ptsExcel) < 0.01) {
      ok++;
    } else {
      discordancia++;
      errores.push({ nombre: q.rows[0].nombre, cedula, ptsExcel, ptsBD });
    }
  }

  console.log('✅ Coinciden exactamente:', ok);
  console.log('❌ Con diferencia:', discordancia);
  if (errores.length > 0) {
    console.log('\nDocentes con diferencia:');
    errores.forEach(e => console.log(`  ${e.nombre} (${e.cedula}): Excel=${e.ptsExcel} | BD=${e.ptsBD}`));
  }

  await client.end();
}

verificar().catch(console.error);
