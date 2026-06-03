const xlsx = require('xlsx');
const { Client } = require('pg');
const crypto = require('crypto');

const client = new Client({
  user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db',
  password: 'gestion_uq_2026', port: 5432
});

const wb = xlsx.readFile('C:/Users/JHVEspinosa/Downloads/ciarp1/ciarp1.xlsx');

function limpiarCedula(v) {
  if (!v) return null;
  const s = String(v).trim().replace(/\D/g, '');
  return s.length >= 5 ? s : null;
}

async function run() {
  await client.connect();

  const data = xlsx.utils.sheet_to_json(wb.Sheets['Pub_Rev_Index'], { header: 1, defval: null });
  
  const negados = [];
  let currentProduct = null;
  
  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    
    if (row[2] !== null && String(row[2]).trim() !== '') {
      if (currentProduct) {
        if ((currentProduct.acta.includes('18/03/2026') || currentProduct.acta.includes('1- 2026')) && currentProduct.totalPts === 0) {
          negados.push(currentProduct);
        }
      }
      
      let acta = '';
      for (let j=23; j<=27; j++) {
        if (row[j] && typeof row[j] === 'string' && (row[j].includes('18/03/2026') || row[j].match(/^\d+-/))) {
          acta = row[j]; break;
        }
      }
      
      currentProduct = {
        cedula: limpiarCedula(row[16]),
        titulo: String(row[3]).trim(),
        acta: acta,
        totalPts: Number(row[23]) || 0
      };
    } else if (currentProduct) {
      currentProduct.totalPts += (Number(row[23]) || 0);
    }
  }
  
  if (currentProduct) {
    if ((currentProduct.acta.includes('18/03/2026') || currentProduct.acta.includes('1- 2026')) && currentProduct.totalPts === 0) {
      negados.push(currentProduct);
    }
  }

  console.log(`Encontrados ${negados.length} productos negados en Pub_Rev_Index.`);

  // Obtener sesion_ciarp_id
  const { rows: sesion } = await client.query(`SELECT id FROM sesiones_ciarp WHERE acta_label ILIKE '%18/03/2026%' LIMIT 1`);
  const sesionId = sesion[0].id;

  for (const f of negados) {
    if (!f.cedula) continue;
    const id = crypto.randomUUID();
    console.log(`Insertando negado: ${f.cedula} | ${f.titulo}`);
    await client.query(`
      INSERT INTO solicitudes (id, cedula, tipo, titulo, pts_asig, acta_ciarp, sesion_ciarp_id, etapa, estado, fecha)
      VALUES ($1, $2, 'articulo_indexado', $3, 0, '1- 18/03/2026', $4, 'acta', 'rechazado', NOW())
    `, [id, f.cedula, f.titulo, sesionId]);
  }

  console.log('✅ Registros negados insertados.');

  await client.end();
}

run().catch(console.error);
