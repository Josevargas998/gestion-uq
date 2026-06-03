const xlsx = require('xlsx');
const { Client } = require('pg');

const client = new Client({
  user: 'gestion_uq', host: 'localhost',
  database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432
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

function extraerFilasExcepcion(sheetName) {
  if (!wb.SheetNames.includes(sheetName)) return [];
  const data = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null });
  const resultado = [];
  for (let i = 3; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[2]) continue;
    const cedula = limpiarCedula(row[2]);
    if (!cedula) continue;
    const pts = Number(row[9] || row[8] || row[10] || row[11]); // Ajustado por si puntos cambian de columna
    
    // Para Ascenso y Titulo, los puntos a veces están en otras columnas, intentemos coger la columna que tenga el valor o usar 0 y luego loguear
    // Vamos a buscar el valor en la fila que sea > 0 y sea el puntaje.
    let foundPts = 0;
    for (let j=row.length-1; j>=3; j--) {
       if (typeof row[j] === 'number' && row[j] > 0) { foundPts = row[j]; break; }
    }

    if (isNaN(foundPts) || foundPts <= 0) continue;
    resultado.push({ cedula, nombre: String(row[3] || '').trim(), pts: foundPts });
  }
  return resultado;
}

// Configuración de hojas de productos
const HOJAS_PROD = [
  { nombre: 'Pub_Rev_Index',           tipo: 'articulo_indexado',  colCedula: 16, colTitulo:  3, colPts: 23, colActa: 25, headerRow: 1 },
  { nombre: 'Libro_Texto',             tipo: 'libro_texto',        colCedula:  8, colTitulo:  3, colPts: 19, colActa: 20, headerRow: 1 },
  { nombre: 'Libro_Ensayo',            tipo: 'libro_ensayo',       colCedula:  7, colTitulo:  3, colPts: 18, colActa: 21, headerRow: 1 },
  { nombre: 'Libro_Res_Investigacion', tipo: 'libro_resultado',    colCedula:  7, colTitulo:  3, colPts: 18, colActa: 19, headerRow: 1 },
  { nombre: 'Prod_Tecnica',            tipo: 'produccion_tecnica', colCedula:  6, colTitulo:  3, colPts: 15, colActa: 16, headerRow: 1 },
  { nombre: 'Prod_Software',           tipo: 'software',           colCedula:  6, colTitulo:  4, colPts: 15, colActa: 16, headerRow: 1 },
  { nombre: 'Obras_Artisticas',        tipo: 'obra_artistica',     colCedula:  9, colTitulo:  3, colPts: 18, colActa: 19, headerRow: 1 },
  { nombre: 'Premios',                 tipo: 'premio',             colCedula:  3, colTitulo: 10, colPts: 14, colActa: 15, headerRow: 1 },
  { nombre: 'Ascenso_Categoria',       tipo: 'ascenso',            colCedula:  2, colTitulo:  4, colPts: 13, colActa: 14, headerRow: 1 },
  { nombre: 'Titulo',                  tipo: 'titulo',             colCedula:  2, colTitulo:  3, colPts: 14, colActa: 15, headerRow: 1 },
];

async function run() {
  await client.connect();

  const excelProd = {};
  for (const cfg of HOJAS_PROD) {
    const filas = extraerFilasProducto(cfg.nombre, { ...cfg, filtroActa: '18/03/2026' });
    for (const f of filas) {
      const key = `${f.cedula}|${cfg.tipo}`;
      // Map 'articulo_indexado' to 'revista_a1'/'revista_a2'/'revista_b'/'revista_c' to match DB exactly
      if (!excelProd[key]) excelProd[key] = { ...f, tipo: cfg.tipo, hoja: cfg.nombre };
    }
  }

  const excelDAA  = extraerFilasExcepcion('DAA');
  const excelDDD  = [
    ...extraerFilasExcepcion('DDD_Auxiliar'),
    ...extraerFilasExcepcion('DDD_Asistente'),
    ...extraerFilasExcepcion('DDD_Asociado'),
    ...extraerFilasExcepcion('DDD_Titular'),
  ];
  const excelExp  = extraerFilasExcepcion('Exp_Calificada');

  excelDAA.forEach(f => { excelProd[`${f.cedula}|daa`] = { ...f, tipo: 'daa' }; });
  excelDDD.forEach(f => { excelProd[`${f.cedula}|ddd`] = { ...f, tipo: 'ddd' }; });
  excelExp.forEach(f => { excelProd[`${f.cedula}|exp_calificada`] = { ...f, tipo: 'exp_calificada' }; });

  // Consultar BD
  const { rows: bdProd } = await client.query(`
    SELECT s.id, s.cedula, s.tipo, s.titulo, CAST(s.pts_asig AS FLOAT) AS pts, d.nombre
    FROM solicitudes s
    LEFT JOIN docentes d ON d.cedula = s.cedula
    WHERE s.acta_ciarp ILIKE '%18/03/2026%'
  `);

  console.log('=== PRODUCTOS EXTRA EN BD QUE NO ESTÁN EN EL EXCEL DEL CIARP 1 ===');
  const extraIds = [];
  let totalExtraPts = 0;
  for (const r of bdProd) {
    // Normalizar tipos para la busqueda
    let tipoBusqueda = r.tipo;
    if (r.tipo.startsWith('revista_')) tipoBusqueda = 'articulo_indexado';
    
    const key = `${r.cedula}|${tipoBusqueda}`;
    if (!excelProd[key]) {
      console.log(`➕ EXTRA: [${r.tipo}] ${r.cedula} (${r.nombre || '?'}) | ${r.pts} pts | "${(r.titulo||'').substring(0,40)}"`);
      extraIds.push(r.id);
      totalExtraPts += (r.pts || 0);
    }
  }
  
  console.log(`\\nTotal de registros extra a eliminar: ${extraIds.length} (${totalExtraPts} pts)`);

  if (extraIds.length > 0) {
    console.log('\\nEliminando registros extra para que coincida perfectamente con el archivo...');
    const result = await client.query(`DELETE FROM solicitudes WHERE id = ANY($1::text[])`, [extraIds]);
    console.log(`✅ Eliminados ${result.rowCount} registros.`);
  } else {
    console.log('\\n✅ La base de datos ya coincide perfectamente, no hay registros extra.');
  }

  await client.end();
}
run().catch(console.error);
