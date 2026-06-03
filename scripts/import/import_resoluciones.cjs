const XLSX = require('xlsx');
const { Client } = require('pg');

// Parsear fecha de excel
function excelDateToJSDate(serial) {
  if (!serial) return '';
  const utc_days  = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;                                        
  const date_info = new Date(utc_value * 1000);
  // Format as YYYY-MM-DD
  return date_info.toISOString().split('T')[0];
}

async function run() {
  console.log("Leyendo archivo de Excel...");
  const wb = XLSX.readFile('C:/Users/JHVEspinosa/Downloads/resoluciones/resoluciones.xlsx');
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);
  
  console.log(`Encontradas ${data.length} filas en el Excel.`);

  const client = new Client({
    user: 'gestion_uq',
    host: 'localhost',
    database: 'gestion_uq_db',
    password: 'gestion_uq_2026',
    port: 5432
  });

  await client.connect();
  let actualizados = 0;
  let noEncontrados = 0;

  for (const row of data) {
    const cedula = String(row['CÉDULA DE CIUDADANÍA O EXTRANJERÍA'] || '').trim();
    const puntos = Number(row['PUNTOS SALARIALES'] || 0);
    const resolucion = String(row['RESOLUCIÓN '] || row['RESOLUCIÓN'] || '').trim();
    const fecha = excelDateToJSDate(row['FECHA DE RESOLUCIÓN']);

    if (!cedula) continue;

    // Obtener historial actual
    const resGet = await client.query('SELECT historial FROM docentes WHERE cedula = $1', [cedula]);
    if (resGet.rows.length === 0) {
      console.log(`⚠️ Docente no encontrado en BD: ${cedula} - ${row['APELLIDOS Y NOMBRE']}`);
      noEncontrados++;
      continue;
    }

    const historial = resGet.rows[0].historial || {};
    // Formatear fecha desde número serial de Excel
    const fechaFormateada = fecha
      ? new Date(fecha).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
      : '';
    historial['RES_ANTERIOR'] = resolucion;
    historial['FECHA_RES_ANTERIOR'] = fechaFormateada;
    historial['ULTIMA_RESOLUCION'] = `Resolución ${resolucion} del ${fechaFormateada}`;
    
    // Actualizar pts_acumulados, pts_total_salarial y el historial
    await client.query(
      `UPDATE docentes 
       SET pts_acumulados = $1, pts_total_salarial = $1, historial = $2 
       WHERE cedula = $3`,
      [puntos, JSON.stringify(historial), cedula]
    );
    
    actualizados++;
  }

  console.log(`\n✅ Proceso terminado.`);
  console.log(`- Docentes actualizados: ${actualizados}`);
  console.log(`- Docentes no encontrados (inactivos o retirados): ${noEncontrados}`);

  await client.end();
}

run().catch(err => console.error('Error:', err));
