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
  { nombre: 'Pub_Rev_Index',           tipo: 'articulo_indexado',  colCedula: 16, colTitulo:  3, colPts: 23, colActa: 25, headerRow: 1 },
  { nombre: 'Libro_Texto',             tipo: 'libro_texto',        colCedula:  8, colTitulo:  3, colPts: 19, colActa: 20, headerRow: 1 },
  { nombre: 'Libro_Ensayo',            tipo: 'libro_ensayo',       colCedula:  7, colTitulo:  3, colPts: 18, colActa: 19, headerRow: 1 },
  { nombre: 'Libro_Res_Investigacion', tipo: 'libro_resultado',    colCedula:  7, colTitulo:  3, colPts: 18, colActa: 19, headerRow: 1 },
  { nombre: 'Prod_Tecnica',            tipo: 'produccion_tecnica', colCedula:  6, colTitulo:  3, colPts: 15, colActa: 16, headerRow: 1 },
  { nombre: 'Prod_Software',           tipo: 'software',           colCedula:  6, colTitulo:  4, colPts: 15, colActa: 16, headerRow: 1 },
  { nombre: 'Obras_Artisticas',        tipo: 'obra_artistica',     colCedula:  9, colTitulo:  3, colPts: 18, colActa: 19, headerRow: 1 },
  { nombre: 'Premios',                 tipo: 'premio',             colCedula:  3, colTitulo: 10, colPts: 14, colActa: 15, headerRow: 1 },
];

function extraerProductosCiarp2() {
  const resultados = [];
  
  for (const cfg of HOJAS_PROD) {
    if (!wb.SheetNames.includes(cfg.nombre)) continue;
    const data = xlsx.utils.sheet_to_json(wb.Sheets[cfg.nombre], { header: 1, defval: null });
    
    let currentProduct = null;
    let authCount = 0;
    
    for (let i = cfg.headerRow + 1; i < data.length; i++) {
      const row = data[i];
      if (!row) continue;
      
      const isNewProduct = (row[2] !== null && String(row[2]).trim() !== '');
      
      if (isNewProduct) {
        if (currentProduct && currentProduct.acta.includes('04/06/2026')) {
          resultados.push(currentProduct);
        }
        
        let acta = '';
        for (let j=Math.max(0, cfg.colActa-2); j<=cfg.colActa+2; j++) {
          if (row[j] && typeof row[j] === 'string' && (row[j].includes('04/06/2026') || row[j].match(/^\d+-/))) {
            acta = row[j]; break;
          }
        }
        
        currentProduct = {
          tipo: cfg.tipo,
          cedula: limpiarCedula(row[cfg.colCedula]),
          titulo: String(row[cfg.colTitulo]).trim(),
          acta: acta,
          totalPts: Number(row[cfg.colPts]) || 0
        };
      } else if (currentProduct) {
        currentProduct.totalPts += (Number(row[cfg.colPts]) || 0);
      }
    }
    
    if (currentProduct && currentProduct.acta.includes('04/06/2026')) {
      resultados.push(currentProduct);
    }
  }
  
  return resultados;
}

async function run() {
  await client.connect();

  const productos = extraerProductosCiarp2();
  
  const aprobados = productos.filter(p => p.totalPts > 0);
  const negados = productos.filter(p => p.totalPts === 0);
  
  console.log(`Encontrados en Excel para CIARP 2: ${aprobados.length} Aprobados, ${negados.length} Negados.`);

  // Obtener sesion_ciarp_id del CIARP 2
  const { rows: sesion } = await client.query(`SELECT id FROM sesiones_ciarp WHERE acta_label ILIKE '%04/06/2026%' LIMIT 1`);
  if(sesion.length === 0) {
    console.log("No se encontró la sesión del CIARP 2 en la base de datos.");
    await client.end(); return;
  }
  const sesionId = sesion[0].id;

  // Limpiar TODO lo que tenga la sesión CIARP 2 en BD para recrearlo limpio (como hicimos en CIARP 1)
  await client.query(`DELETE FROM solicitudes WHERE sesion_ciarp_id = $1`, [sesionId]);
  
  let inserted = 0;
  
  // Insertar Aprobados
  for (const f of aprobados) {
    if (!f.cedula) continue;
    await client.query(`
      INSERT INTO solicitudes (id, cedula, tipo, titulo, pts_asig, acta_ciarp, sesion_ciarp_id, etapa, estado, fecha)
      VALUES ($1, $2, $3, $4, $5, '2- 04/06/2026', $6, 'acta', 'aprobado', NOW())
    `, [crypto.randomUUID(), f.cedula, f.tipo, f.titulo, f.totalPts, sesionId]);
    inserted++;
  }
  
  // Insertar Negados
  for (const f of negados) {
    if (!f.cedula) continue;
    await client.query(`
      INSERT INTO solicitudes (id, cedula, tipo, titulo, pts_asig, acta_ciarp, sesion_ciarp_id, etapa, estado, fecha)
      VALUES ($1, $2, $3, $4, 0, '2- 04/06/2026', $5, 'acta', 'rechazado', NOW())
    `, [crypto.randomUUID(), f.cedula, f.tipo, f.titulo, sesionId]);
    inserted++;
  }

  console.log(`✅ ${inserted} registros insertados limpios para CIARP 2.`);

  // Validar Totales UI
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
