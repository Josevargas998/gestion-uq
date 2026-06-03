const xlsx = require('xlsx');
const { Client } = require('pg');

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

function extraerFilasProducto(sheetName, { colCedula, colTitulo, colPts, colActa, headerRow, filtroActa }) {
  if (!wb.SheetNames.includes(sheetName)) return [];
  const data = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null });
  let tituloActual = '', actaActual = '';
  const resultado = [];
  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    if (row[colTitulo] != null) tituloActual = String(row[colTitulo]).trim();
    if (colActa != null && row[colActa] != null) actaActual = String(row[colActa]).trim();
    const cedula = limpiarCedula(row[colCedula]);
    if (!cedula) continue;
    if (filtroActa && !actaActual.includes(filtroActa)) continue;
    const pts = Number(row[colPts]);
    if (isNaN(pts) || pts <= 0) continue;
    resultado.push({ cedula, titulo: tituloActual, pts, acta: actaActual });
  }
  return resultado;
}

function extraerAscensoTitulo(sheetName, tipo) {
  if (!wb.SheetNames.includes(sheetName)) return [];
  const data = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null });
  const resultado = [];
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    let cedula = null, colCedula = -1;
    for(let j=0; j<=5; j++){
      const val = limpiarCedula(row[j]);
      if(val && val.length >= 5 && Number(val) > 1000) { cedula = val; colCedula = j; break; }
    }
    if (!cedula) continue;
    let pts = 0;
    for (let j=row.length-1; j>=3; j--) {
       if (typeof row[j] === 'number' && row[j] > 0) { pts = row[j]; break; }
    }
    if (pts <= 0) continue;
    const titulo = String(row[colCedula+1] || row[colCedula+2] || tipo).trim();
    resultado.push({ cedula, titulo, pts });
  }
  return resultado;
}

function extraerFilasExcepcion(sheetName) {
  if (!wb.SheetNames.includes(sheetName)) return [];
  const data = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null });
  const resultado = [];
  for (let i = 3; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[2]) continue;
    const cedula = limpiarCedula(row[2]);
    if (!cedula) continue;
    let pts = 0;
    for (let j=row.length-1; j>=3; j--) {
       if (typeof row[j] === 'number' && row[j] > 0) { pts = row[j]; break; }
    }
    if (pts <= 0) continue;
    resultado.push({ cedula, nombre: String(row[3] || '').trim(), pts });
  }
  return resultado;
}

const HOJAS_PROD = [
  { nombre: 'Pub_Rev_Index',           tipo: 'articulo_indexado',  colCedula: 16, colTitulo:  3, colPts: 23, colActa: 25, headerRow: 1 },
  { nombre: 'Libro_Texto',             tipo: 'libro_texto',        colCedula:  8, colTitulo:  3, colPts: 19, colActa: 20, headerRow: 1 },
  { nombre: 'Libro_Ensayo',            tipo: 'libro_ensayo',       colCedula:  7, colTitulo:  3, colPts: 18, colActa: 21, headerRow: 1 },
  { nombre: 'Libro_Res_Investigacion', tipo: 'libro_resultado',    colCedula:  7, colTitulo:  3, colPts: 18, colActa: 19, headerRow: 1 },
  { nombre: 'Prod_Tecnica',            tipo: 'produccion_tecnica', colCedula:  6, colTitulo:  3, colPts: 15, colActa: 16, headerRow: 1 },
  { nombre: 'Prod_Software',           tipo: 'software',           colCedula:  6, colTitulo:  4, colPts: 15, colActa: 16, headerRow: 1 },
  { nombre: 'Obras_Artisticas',        tipo: 'obra_artistica',     colCedula:  9, colTitulo:  3, colPts: 18, colActa: 19, headerRow: 1 },
  { nombre: 'Premios',                 tipo: 'premio',             colCedula:  3, colTitulo: 10, colPts: 14, colActa: 15, headerRow: 1 },
];

async function run() {
  await client.connect();

  const excelProd = {};

  // Hojas normales
  for (const cfg of HOJAS_PROD) {
    const filas = extraerFilasProducto(cfg.nombre, { ...cfg, filtroActa: '18/03/2026' });
    for (const f of filas) {
      excelProd[`${f.cedula}|${cfg.tipo}|${f.pts}`] = { ...f, tipo: cfg.tipo };
    }
  }

  // Ascensos y titulos
  extraerAscensoTitulo('Ascenso_Categoria', 'Ascenso').forEach(f => { excelProd[`${f.cedula}|ascenso|${f.pts}`] = { ...f, tipo: 'ascenso' }; });
  extraerAscensoTitulo('Titulo', 'Titulo Universitario').forEach(f => { excelProd[`${f.cedula}|titulo|${f.pts}`] = { ...f, tipo: 'titulo' }; });

  // Excepciones
  extraerFilasExcepcion('DAA').forEach(f => { excelProd[`${f.cedula}|daa|${f.pts}`] = { ...f, tipo: 'daa' }; });
  [
    ...extraerFilasExcepcion('DDD_Auxiliar'),
    ...extraerFilasExcepcion('DDD_Asistente'),
    ...extraerFilasExcepcion('DDD_Asociado'),
    ...extraerFilasExcepcion('DDD_Titular'),
  ].forEach(f => { excelProd[`${f.cedula}|ddd|${f.pts}`] = { ...f, tipo: 'ddd' }; });
  extraerFilasExcepcion('Exp_Calificada').forEach(f => { excelProd[`${f.cedula}|exp_calificada|${f.pts}`] = { ...f, tipo: 'exp_calificada' }; });

  const { rows: sesion } = await client.query(`SELECT id FROM sesiones_ciarp WHERE acta_label ILIKE '%18/03/2026%' LIMIT 1`);
  const sesionId = sesion[0].id;

  const { rows: bdProd } = await client.query(`
    SELECT s.id, s.cedula, s.tipo, s.titulo, CAST(s.pts_asig AS FLOAT) AS pts, d.nombre
    FROM solicitudes s
    LEFT JOIN docentes d ON d.cedula = s.cedula
    WHERE s.sesion_ciarp_id = $1
  `, [sesionId]);

  console.log(`En la base de datos hay ${bdProd.length} registros asociados a la sesión.`);
  
  const aDesvincular = [];
  let ptsDesvinculados = 0;

  for (const r of bdProd) {
    let tipoB = r.tipo;
    if (r.tipo.startsWith('revista_')) tipoB = 'articulo_indexado';

    const key = `${r.cedula}|${tipoB}|${r.pts}`;
    if (!excelProd[key]) {
      console.log(`❌ SOBRA EN BD: [${r.tipo}] ${r.cedula} | ${r.pts} pts | "${(r.titulo||'').substring(0,40)}"`);
      aDesvincular.push(r.id);
      ptsDesvinculados += r.pts;
    } else {
      // Remover del mapa para ver qué quedó en Excel que no encontramos
      delete excelProd[key];
    }
  }

  console.log(`\nDesvinculando ${aDesvincular.length} registros que suman ${ptsDesvinculados.toFixed(2)} pts...`);

  if (aDesvincular.length > 0) {
    // Los desvinculamos de la sesión en lugar de borrarlos por completo (o los borramos si preferimos)
    // Vamos a eliminarlos ya que fueron creados espuriamente en importaciones
    await client.query(`DELETE FROM solicitudes WHERE id = ANY($1::text[])`, [aDesvincular]);
  }

  const faltan = Object.values(excelProd);
  console.log(`\nFaltan en BD: ${faltan.length} registros`);
  faltan.forEach(f => console.log(`⚠️ FALTA EN BD: [${f.tipo}] ${f.cedula} | ${f.pts} pts | "${(f.titulo||'').substring(0,40)}"`));

  const { rows: r } = await client.query(`
    SELECT COUNT(*) as n, SUM(CAST(pts_asig AS FLOAT)) as pts FROM solicitudes WHERE sesion_ciarp_id = $1
  `, [sesionId]);
  console.log(`\n✅ NUEVO TOTAL EN INTERFAZ CIARP 1: ${r[0].n} solicitudes | ${Number(r[0].pts).toFixed(2)} pts`);

  await client.end();
}

run().catch(console.error);
