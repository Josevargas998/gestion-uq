const xlsx = require('xlsx');
const { Client } = require('pg');

const client = new Client({
  user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db',
  password: 'gestion_uq_2026', port: 5432
});

const wb = xlsx.readFile('C:/Users/JHVEspinosa/Downloads/topes/topes.xls');
const data = xlsx.utils.sheet_to_json(wb.Sheets['Sheet1'], { header: 1, defval: null });

// Parsear filas del Excel (desde fila 2, fila 1 es encabezado)
const excelDocentes = [];
for (let i = 1; i < data.length; i++) {
  const row = data[i];
  if (!row || !row[1]) continue;
  const cedula = String(row[1]).trim();
  const nombre = String(row[0] || '').trim();
  const totalPuntos = Number(row[4]) || 0;
  const tope = Number(row[5]) || 0;
  if (cedula && tope > 0) {
    excelDocentes.push({ cedula, nombre, totalPuntos, tope });
  }
}

console.log(`Total docentes en Excel: ${excelDocentes.length}\n`);

async function run() {
  await client.connect();

  let actualizados = 0;
  let noEncontrados = 0;
  let sinCambio = 0;

  for (const ex of excelDocentes) {
    // Verificar que existe en la BD
    const { rows: docRows } = await client.query(
      'SELECT cedula, pts_acumulados, tope FROM docentes WHERE cedula = $1',
      [ex.cedula]
    );

    if (docRows.length === 0) {
      noEncontrados++;
      continue;
    }

    const bdPts = Number(docRows[0].pts_acumulados) || 0;
    const bdTope = Number(docRows[0].tope) || 0;

    const ptsDiff = Math.abs(bdPts - ex.totalPuntos) > 0.05;
    const topeDiff = Math.abs(bdTope - ex.tope) > 0.05;

    if (!ptsDiff && !topeDiff) {
      sinCambio++;
      continue;
    }

    await client.query(
      'UPDATE docentes SET pts_acumulados = $1, tope = $2 WHERE cedula = $3',
      [ex.totalPuntos, ex.tope, ex.cedula]
    );
    actualizados++;
  }

  console.log(`✅ Actualizados : ${actualizados}`);
  console.log(`⚠️  No encontrados en BD: ${noEncontrados}`);
  console.log(`✓  Sin cambio: ${sinCambio}`);

  // Validar Oscar Aguirre específicamente
  const { rows: oscar } = await client.query(
    'SELECT cedula, nombre, pts_acumulados, tope FROM docentes WHERE cedula = $1',
    ['9732828']
  );
  console.log('\n--- Oscar Aguirre Obando ---');
  console.table(oscar);

  await client.end();
}

run().catch(console.error);
