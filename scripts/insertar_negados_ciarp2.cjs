const xlsx = require('xlsx');
const { Client } = require('pg');
const crypto = require('crypto');

const client = new Client({
  user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db',
  password: 'gestion_uq_2026', port: 5432
});

const wb = xlsx.readFile('C:/Users/JHVEspinosa/Downloads/ciarp2/ciarp2.xlsx');

function limpiarCedula(v) {
  if (!v) return null;
  const s = String(v).trim().replace(/\D/g, '');
  return s.length >= 5 ? s : null;
}

const HOJAS_PROD = [
  { nombre: 'Pub_Rev_Index',           tipo: 'articulo_indexado',  colCedula: 16, colTitulo:  3, colPts: 23 },
  { nombre: 'Libro_Texto',             tipo: 'libro_texto',        colCedula:  8, colTitulo:  3, colPts: 19 },
  { nombre: 'Libro_Ensayo',            tipo: 'libro_ensayo',       colCedula:  7, colTitulo:  3, colPts: 18 },
  { nombre: 'Premios',                 tipo: 'premio',             colCedula:  3, colTitulo: 10, colPts: 14 }
];

async function run() {
  await client.connect();

  const { rows: docentesRows } = await client.query('SELECT cedula FROM docentes');
  const validCedulas = new Set(docentesRows.map(r => r.cedula));

  const { rows: sesion } = await client.query(`SELECT id FROM sesiones_ciarp WHERE acta_label ILIKE '%04/06/2026%' LIMIT 1`);
  if(sesion.length === 0) {
    await client.end(); return;
  }
  const sesionId = sesion[0].id;

  let insertCount = 0;

  for (const cfg of HOJAS_PROD) {
    if (!wb.SheetNames.includes(cfg.nombre)) continue;
    const data = xlsx.utils.sheet_to_json(wb.Sheets[cfg.nombre], { header: 1, defval: null });
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row) continue;
      
      let isCiarp2 = false;
      for (let j=0; j<row.length; j++) {
        if (typeof row[j] === 'string' && (row[j].includes('04/06/2026') || row[j].includes('2- 2026'))) {
          isCiarp2 = true;
          break;
        }
      }
      
      if (isCiarp2) {
        let pts = Number(row[cfg.colPts]) || 0;
        let cedula = limpiarCedula(row[cfg.colCedula]);
        let titulo = String(row[cfg.colTitulo]).trim();
        
        // Es un negado si tiene cedula pero los puntos son estrictamente 0
        if (cedula && pts === 0) {
          if (validCedulas.has(cedula)) {
            await client.query(`
              INSERT INTO solicitudes (id, cedula, tipo, titulo, pts_asig, acta_ciarp, sesion_ciarp_id, etapa, estado, fecha)
              VALUES ($1, $2, $3, $4, 0, '2- 04/06/2026', $5, 'acta', 'rechazado', NOW())
            `, [crypto.randomUUID(), cedula, cfg.tipo, titulo, sesionId]);
            insertCount++;
          }
        }
      }
    }
  }

  console.log(`✅ ${insertCount} registros NEGADOS insertados para CIARP 2.`);
  await client.end();
}

run().catch(console.error);
