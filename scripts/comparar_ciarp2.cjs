const xlsx = require('xlsx');
const { Client } = require('pg');

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
    const pts = Number(row[colPts]) || 0; // Guardamos con 0 para capturar negados también
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
    resultado.push({ cedula, nombre: String(row[3] || '').trim(), pts });
  }
  return resultado;
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

async function run() {
  await client.connect();

  const excelProd = {};

  for (const cfg of HOJAS_PROD) {
    // Para el CIARP 2, la fecha del acta es el 04/06/2026
    const filas = extraerFilasProducto(cfg.nombre, { ...cfg, filtroActa: '04/06/2026' });
    for (const f of filas) {
      if (f.pts > 0) excelProd[`${f.cedula}|${cfg.tipo}|${f.pts}`] = { ...f, tipo: cfg.tipo };
    }
  }

  extraerAscensoTitulo('Ascenso_Categoria', 'Ascenso').forEach(f => { if (f.pts > 0) excelProd[`${f.cedula}|ascenso|${f.pts}`] = { ...f, tipo: 'ascenso' }; });
  extraerAscensoTitulo('Titulo', 'Titulo Universitario').forEach(f => { if (f.pts > 0) excelProd[`${f.cedula}|titulo|${f.pts}`] = { ...f, tipo: 'titulo' }; });

  extraerFilasExcepcion('DAA').forEach(f => { if (f.pts > 0) excelProd[`${f.cedula}|daa|${f.pts}`] = { ...f, tipo: 'daa' }; });
  [
    ...extraerFilasExcepcion('DDD_Auxiliar'),
    ...extraerFilasExcepcion('DDD_Asistente'),
    ...extraerFilasExcepcion('DDD_Asociado'),
    ...extraerFilasExcepcion('DDD_Titular'),
  ].forEach(f => { if (f.pts > 0) excelProd[`${f.cedula}|ddd|${f.pts}`] = { ...f, tipo: 'ddd' }; });
  extraerFilasExcepcion('Exp_Calificada').forEach(f => { if (f.pts > 0) excelProd[`${f.cedula}|exp_calificada|${f.pts}`] = { ...f, tipo: 'exp_calificada' }; });

  const totalExcelPts = Object.values(excelProd).reduce((s, r) => s + r.pts, 0);
  console.log(`\nSegún el Excel, el CIARP 2 tiene ${Object.keys(excelProd).length} productos APROBADOS, sumando ${totalExcelPts.toFixed(2)} pts.`);

  // Revisar qué hay en BD para la sesión CIARP 2
  const { rows: sesion } = await client.query(`SELECT id FROM sesiones_ciarp WHERE acta_label ILIKE '%04/06/2026%' LIMIT 1`);
  const sesionId = sesion.length > 0 ? sesion[0].id : null;
  
  if (!sesionId) {
    console.log("No se encontró la sesión del CIARP 2 en la base de datos.");
    await client.end();
    return;
  }

  const { rows: bdProd } = await client.query(`
    SELECT s.id, s.cedula, s.tipo, s.titulo, CAST(s.pts_asig AS FLOAT) AS pts, d.nombre, s.estado
    FROM solicitudes s
    LEFT JOIN docentes d ON d.cedula = s.cedula
    WHERE s.sesion_ciarp_id = $1 AND s.estado = 'aprobado'
  `, [sesionId]);

  console.log(`En la base de datos hay ${bdProd.length} productos APROBADOS vinculados a la sesión CIARP 2.\n`);

  for (const r of bdProd) {
    let tipoB = r.tipo;
    if (r.tipo.startsWith('revista_')) tipoB = 'articulo_indexado';

    const key = `${r.cedula}|${tipoB}|${r.pts}`;
    if (!excelProd[key]) {
      console.log(`❌ SOBRA EN BD: [${r.tipo}] ${r.cedula} | ${r.pts} pts | "${(r.titulo||'').substring(0,40)}"`);
    } else {
      delete excelProd[key];
    }
  }

  const faltan = Object.values(excelProd);
  if (faltan.length > 0) console.log('\n');
  faltan.forEach(f => console.log(`⚠️ FALTA EN BD: [${f.tipo}] ${f.cedula} | ${f.pts} pts | "${(f.titulo||'').substring(0,40)}"`));

  await client.end();
}

run().catch(console.error);
