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

function extraerAscensoTitulo(sheetName, tipo) {
  if (!wb.SheetNames.includes(sheetName)) return [];
  const data = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null });
  const resultado = [];
  
  // Imprimir para debug
  // console.log(`\nHoja: ${sheetName}`);
  // for (let i=0; i<3; i++) console.log(JSON.stringify(data[i]));

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    
    // Buscar la cédula (normalmente es un numero largo en cualquier columna entre 0 y 5)
    let cedula = null;
    let colCedula = -1;
    for(let j=0; j<=5; j++){
      const val = limpiarCedula(row[j]);
      if(val && val.length >= 5 && Number(val) > 1000) { cedula = val; colCedula = j; break; }
    }
    if (!cedula) continue;
    
    // Buscar puntos en las ultimas columnas
    let pts = 0;
    for (let j=row.length-1; j>=3; j--) {
       if (typeof row[j] === 'number' && row[j] > 0) { pts = row[j]; break; }
    }
    if (pts <= 0) continue;
    
    // Titulo suele estar a la derecha de la cedula
    let titulo = String(row[colCedula+1] || row[colCedula+2] || tipo).trim();
    resultado.push({ cedula, titulo, pts });
  }
  return resultado;
}

async function run() {
  await client.connect();

  const ascensos = extraerAscensoTitulo('Ascenso_Categoria', 'Ascenso');
  const titulos = extraerAscensoTitulo('Titulo', 'Titulo Universitario');

  console.log(`Re-insertando ${ascensos.length} ascensos y ${titulos.length} títulos...`);

  // Encontrar el ID de la sesion CIARP 1
  const { rows: sesion } = await client.query(`SELECT id FROM sesiones_ciarp WHERE acta_label ILIKE '%18/03/2026%' LIMIT 1`);
  const sesionId = sesion.length > 0 ? sesion[0].id : null;
  console.log('ID Sesion CIARP 1:', sesionId);

  let count = 0;
  for (const f of ascensos) {
    await client.query(`
      INSERT INTO solicitudes (id, cedula, tipo, titulo, pts_asig, acta_ciarp, sesion_ciarp_id, etapa, estado, fecha)
      VALUES ($1, $2, 'ascenso', $3, $4, '1- 18/03/2026', $5, 'acta', 'aprobado', NOW())
    `, [crypto.randomUUID(), f.cedula, f.titulo, f.pts, sesionId]);
    count++;
  }
  for (const f of titulos) {
    await client.query(`
      INSERT INTO solicitudes (id, cedula, tipo, titulo, pts_asig, acta_ciarp, sesion_ciarp_id, etapa, estado, fecha)
      VALUES ($1, $2, 'titulo', $3, $4, '1- 18/03/2026', $5, 'acta', 'aprobado', NOW())
    `, [crypto.randomUUID(), f.cedula, f.titulo, f.pts, sesionId]);
    count++;
  }

  console.log(`✅ ${count} registros insertados.`);

  // Actualizar TODAS las 416 solicitudes para asegurar que tienen el sesion_ciarp_id correcto
  if (sesionId) {
    const upd = await client.query(`
      UPDATE solicitudes 
      SET sesion_ciarp_id = $1, etapa = 'acta', estado = 'aprobado'
      WHERE acta_ciarp ILIKE '%18/03/2026%' OR acta_ciarp = '1- 2026'
    `, [sesionId]);
    console.log(`✅ Enlazadas ${upd.rowCount} solicitudes a la sesión CIARP 1 en la interfaz.`);
  }

  // Consultar total final aglutinando lo enlazado a la sesión
  const { rows: finalTotals } = await client.query(`
    SELECT COUNT(*) as n, SUM(CAST(pts_asig AS FLOAT)) as pts, estado 
    FROM solicitudes WHERE sesion_ciarp_id = $1
    GROUP BY estado
  `, [sesionId]);
  
  console.log(`\nTotales en la interfaz para CIARP 1:`);
  finalTotals.forEach(r => console.log(`- ${r.estado}: ${r.n} solicitudes | ${Number(r.pts).toFixed(1)} pts`));

  await client.end();
}

run().catch(console.error);
