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
  { nombre: 'Pub_Rev_Index',           tipo: 'articulo_indexado',  colCedula: 16, colTitulo:  3 },
  { nombre: 'Libro_Texto',             tipo: 'libro_texto',        colCedula:  8, colTitulo:  3 },
  { nombre: 'Libro_Ensayo',            tipo: 'libro_ensayo',       colCedula:  7, colTitulo:  3 },
  { nombre: 'Premios',                 tipo: 'premio',             colCedula:  3, colTitulo: 10 }
];

function parseSheet(sheetName, tipo, colCedula, colTitulo) {
  if (!wb.SheetNames.includes(sheetName)) return [];
  const data = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null });
  const result = [];
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    
    let isCiarp2 = false;
    for (let j=0; j<row.length; j++) {
      if (typeof row[j] === 'string' && (row[j].includes('04/06/2026') || row[j].includes('2- 2026') || row[j].includes('04/06/26'))) {
        isCiarp2 = true;
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
      
      let cedula = null;
      if (colCedula !== -1) {
        cedula = limpiarCedula(row[colCedula]);
      } else {
        for (let j=0; j<=5; j++) {
          const val = limpiarCedula(row[j]);
          if(val && val.length >= 5 && Number(val) > 1000) { cedula = val; break; }
        }
      }
      
      let titulo = colTitulo !== -1 ? String(row[colTitulo]).trim() : tipo;
      
      if (cedula && pts > 0) {
        result.push({ cedula, titulo, pts, acta: '2- 04/06/2026', tipo });
      }
    }
  }
  return result;
}

async function run() {
  await client.connect();

  const { rows: docentesRows } = await client.query('SELECT cedula FROM docentes');
  const validCedulas = new Set(docentesRows.map(r => r.cedula));

  const { rows: sesion } = await client.query(`SELECT id FROM sesiones_ciarp WHERE acta_label ILIKE '%04/06/2026%' LIMIT 1`);
  if(sesion.length === 0) {
    console.log("No se encontró la sesión del CIARP 2 en BD.");
    await client.end(); return;
  }
  const sesionId = sesion[0].id;

  const all = [
    ...parseSheet('Pub_Rev_Index', 'articulo_indexado', 16, 3),
    ...parseSheet('Libro_Texto', 'libro_texto', 8, 3),
    ...parseSheet('Libro_Ensayo', 'libro_ensayo', 7, 3),
    ...parseSheet('Premios', 'premio', 3, 10),
    ...parseSheet('Titulo', 'titulo', -1, -1) // Especial
  ];

  const validAprobados = [];
  const invalidAprobados = [];

  for (const a of all) {
    if (validCedulas.has(a.cedula)) {
      validAprobados.push(a);
    } else {
      invalidAprobados.push(a);
    }
  }

  const totalPts = validAprobados.reduce((acc, curr) => acc + curr.pts, 0);

  console.log(`Encontrados para CIARP 2 (Válidos): ${validAprobados.length} aprobados | ${totalPts.toFixed(1)} pts.`);
  
  if (invalidAprobados.length > 0) {
    console.log(`\nIgnorados por Cédula Inválida (${invalidAprobados.length}):`);
    invalidAprobados.forEach(a => console.log(`- Cedula: ${a.cedula}, Titulo: ${a.titulo}, Pts: ${a.pts}`));
  }

  // Limpiamos todo el CIARP 2
  await client.query(`DELETE FROM solicitudes WHERE sesion_ciarp_id = $1`, [sesionId]);

  let count = 0;
  for (const f of validAprobados) {
    await client.query(`
      INSERT INTO solicitudes (id, cedula, tipo, titulo, pts_asig, acta_ciarp, sesion_ciarp_id, etapa, estado, fecha)
      VALUES ($1, $2, $3, $4, $5, '2- 04/06/2026', $6, 'acta', 'aprobado', NOW())
    `, [crypto.randomUUID(), f.cedula, f.tipo, f.titulo, f.pts, sesionId]);
    count++;
  }

  console.log(`✅ ${count} registros re-insertados impecablemente para CIARP 2.`);

  const { rows: finalTotals } = await client.query(`
    SELECT COUNT(*) as n, SUM(CAST(pts_asig AS FLOAT)) as pts, estado 
    FROM solicitudes WHERE sesion_ciarp_id = $1
    GROUP BY estado
  `, [sesionId]);
  
  console.log(`\nTotales en la interfaz para CIARP 2:`);
  finalTotals.forEach(r => console.log(`- ${r.estado}: ${r.n} solicitudes | ${Number(r.pts).toFixed(1)} pts`));

  await client.end();
}

run().catch(console.error);
