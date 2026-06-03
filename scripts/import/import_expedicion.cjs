const xlsx = require('xlsx');
const { Client } = require('pg');

const client = new Client({
  user: 'gestion_uq',
  host: 'localhost',
  database: 'gestion_uq_db',
  password: 'gestion_uq_2026',
  port: 5432
});

// Capitaliza primera letra de cada palabra (ej. "ARMENIA" -> "Armenia")
function toTitleCase(str) {
  if (!str) return '';
  return str.toString().toLowerCase().split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

async function run() {
  await client.connect();
  console.log('Leyendo archivo de Excel...');
  const filePath = 'C:\\Users\\JHVEspinosa\\Downloads\\expedicion\\expedicion.xlsx';
  const wb = xlsx.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet);

  console.log(`Encontradas ${rows.length} filas en el Excel.`);
  
  let actualizados = 0;
  let noEncontrados = 0;

  for (const row of rows) {
    const cedula = String(row['Identificación']).trim();
    let municipio = row['Nombre Mpio Expedición'] ? String(row['Nombre Mpio Expedición']).trim() : '';
    
    if (!cedula || !municipio) {
      continue;
    }

    // Capitalizar nombre del municipio
    const lugarExpedicion = toTitleCase(municipio);

    try {
      const { rowCount } = await client.query(
        `UPDATE docentes 
         SET lugar_expedicion = $1 
         WHERE cedula = $2`,
        [lugarExpedicion, cedula]
      );
      
      if (rowCount > 0) {
        actualizados++;
      } else {
        noEncontrados++;
      }
    } catch (err) {
      console.error(`Error procesando cédula ${cedula}:`, err.message);
    }
  }

  console.log('\n✅ Proceso terminado.');
  console.log(`- Docentes actualizados: ${actualizados}`);
  console.log(`- Docentes no encontrados (inactivos o retirados): ${noEncontrados}`);

  await client.end();
}

run().catch(console.error);
