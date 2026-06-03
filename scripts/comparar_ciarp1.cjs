/**
 * comparar_ciarp1.cjs — versión final
 * Compara BD vs Excel CIARP 01 - 18/03/2026.
 * Totales esperados (tabla resumen del Excel):
 *   Títulos pregrado/posgrado : 80.0
 *   Ascenso categoría         : 102.0
 *   Revistas especializadas   : 74.5
 *   Libros de Ensayo          : 10.4  (10.425)
 *   DAA                       : 99.5
 *   DDD                       : 281.3
 *   Experiencia Calificada    : 518.0
 *   TOTAL GENERAL             : 1165.7
 */
const xlsx = require('xlsx');
const { Client } = require('pg');

const client = new Client({
  user: 'gestion_uq', host: 'localhost',
  database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432
});

const wb = xlsx.readFile('C:/Users/JHVEspinosa/Downloads/ciarp1/ciarp1.xlsx');

// Totales esperados del resumen Excel
const ESPERADOS = {
  'Títulos pregrado/posgrado': 80.0,
  'Ascenso de categoría': 102.0,
  'Revistas especializadas': 74.5,
  'Libros de Ensayo': 10.425,
  'DAA': 99.5,
  'DDD': 281.3,
  'Experiencia Calificada': 518.0,
};

function limpiarCedula(v) {
  if (!v) return null;
  const s = String(v).trim().replace(/\D/g, '');
  return s.length >= 5 ? s : null;
}

// Propaga título y acta a las filas de co-autores (celdas combinadas)
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
    const pts = Number(row[9]);
    if (isNaN(pts) || pts <= 0) continue;
    resultado.push({ cedula, nombre: String(row[3] || '').trim(), pts });
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
];

async function run() {
  await client.connect();

  // ── 1. Construir mapa Excel (cedula|tipo → filas) ─────────────────────────
  const excelProd = {}; // cedula|tipo → {titulo, pts, acta}
  let totalExcelRevistas = 0, totalExcelLibrosEnsayo = 0;

  for (const cfg of HOJAS_PROD) {
    const filas = extraerFilasProducto(cfg.nombre, { ...cfg, filtroActa: '18/03/2026' });
    for (const f of filas) {
      const key = `${f.cedula}|${cfg.tipo}`;
      if (!excelProd[key]) excelProd[key] = { ...f, tipo: cfg.tipo, hoja: cfg.nombre };
      // Para tipos de resumen
      if (cfg.tipo === 'articulo_indexado') totalExcelRevistas += f.pts;
      if (cfg.tipo === 'libro_ensayo')      totalExcelLibrosEnsayo += f.pts;
    }
  }

  // Excepciones
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

  const totalExcelDAA = excelDAA.reduce((s, r) => s + r.pts, 0);
  const totalExcelDDD = excelDDD.reduce((s, r) => s + r.pts, 0);
  const totalExcelExp = excelExp.reduce((s, r) => s + r.pts, 0);

  // ── 2. Consultar BD ───────────────────────────────────────────────────────
  const { rows: bdProd } = await client.query(`
    SELECT s.cedula, s.tipo, s.titulo, CAST(s.pts_asig AS FLOAT) AS pts, s.acta_ciarp, d.nombre
    FROM solicitudes s
    LEFT JOIN docentes d ON d.cedula = s.cedula
    WHERE s.acta_ciarp ILIKE '%18/03/2026%'
    ORDER BY s.tipo, s.cedula
  `);
  const { rows: bdExcp } = await client.query(`
    SELECT s.cedula, s.tipo, s.titulo, CAST(s.pts_asig AS FLOAT) AS pts, d.nombre
    FROM solicitudes s
    LEFT JOIN docentes d ON d.cedula = s.cedula
    WHERE s.tipo IN ('daa','ddd','exp_calificada')
      AND s.acta_ciarp ILIKE '%18/03/2026%'
  `);

  const bdProdMap = {};
  for (const r of bdProd) { bdProdMap[`${r.cedula}|${r.tipo}`] = r; }

  // ── 3. RESUMEN DE TOTALES ─────────────────────────────────────────────────
  const bdRevistas = bdProd.filter(r => r.tipo === 'articulo_indexado').reduce((s,r) => s + (r.pts||0), 0);
  const bdEnsayo   = bdProd.filter(r => r.tipo === 'libro_ensayo').reduce((s,r) => s + (r.pts||0), 0);
  const bdDAA      = bdExcp.filter(r => r.tipo === 'daa').reduce((s,r) => s + (r.pts||0), 0);
  const bdDDD      = bdExcp.filter(r => r.tipo === 'ddd').reduce((s,r) => s + (r.pts||0), 0);
  const bdExp      = bdExcp.filter(r => r.tipo === 'exp_calificada').reduce((s,r) => s + (r.pts||0), 0);

  const fmt = (n) => Number(n).toFixed(2);
  const ok  = (a, b) => Math.abs(a - b) < 0.1 ? '✅' : '❌';

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('       COMPARACIÓN DE TOTALES — CIARP 01  18/03/2026');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Categoría                   Excel       BD        OK?');
  console.log('───────────────────────────────────────────────────────────');
  console.log(`Revistas especializadas    ${fmt(totalExcelRevistas).padStart(8)}  ${fmt(bdRevistas).padStart(8)}   ${ok(totalExcelRevistas, bdRevistas)}`);
  console.log(`Libros de Ensayo           ${fmt(totalExcelLibrosEnsayo).padStart(8)}  ${fmt(bdEnsayo).padStart(8)}   ${ok(totalExcelLibrosEnsayo, bdEnsayo)}`);
  console.log(`DAA                        ${fmt(totalExcelDAA).padStart(8)}  ${fmt(bdDAA).padStart(8)}   ${ok(totalExcelDAA, bdDAA)}`);
  console.log(`DDD                        ${fmt(totalExcelDDD).padStart(8)}  ${fmt(bdDDD).padStart(8)}   ${ok(totalExcelDDD, bdDDD)}`);
  console.log(`Experiencia Calificada     ${fmt(totalExcelExp).padStart(8)}  ${fmt(bdExp).padStart(8)}   ${ok(totalExcelExp, bdExp)}`);
  console.log('───────────────────────────────────────────────────────────');

  // ── 4. DETALLE — en Excel pero faltando en BD ─────────────────────────────
  let faltantes = 0, difPts = 0;
  console.log('\n═══ PRODUCTOS: EN EXCEL PERO FALTANTES/DIFERENTES EN BD ═══');
  for (const [key, ex] of Object.entries(excelProd)) {
    const bd = bdProdMap[key];
    if (!bd) {
      console.log(`❌ FALTA   | ${ex.cedula} | ${ex.tipo} | "${ex.titulo.substring(0,55)}" | ${ex.pts} pts | Hoja: ${ex.hoja}`);
      faltantes++;
    } else {
      const diff = Math.abs((bd.pts||0) - ex.pts);
      if (diff > 0.05) {
        console.log(`⚠️  PTS    | ${ex.cedula} (${bd.nombre||'?'}) | ${ex.tipo} | Excel:${ex.pts} BD:${bd.pts}`);
        difPts++;
      }
    }
  }
  if (faltantes === 0 && difPts === 0) console.log('✅ Todos los productos del Excel están en BD con puntos correctos.');

  // ── 5. DETALLE — en BD pero no en Excel ──────────────────────────────────
  let sobrantes = 0;
  console.log('\n═══ EN BD PERO NO EN EXCEL ═══');
  for (const r of bdProd) {
    let tipoB = r.tipo;
    if (r.tipo.startsWith('revista_')) tipoB = 'articulo_indexado';
    
    if (!excelProd[`${r.cedula}|${tipoB}`]) {
      console.log(`➕ EXTRA   | ${r.cedula} (${r.nombre||'?'}) | ${r.tipo} | "${String(r.titulo||'').substring(0,55)}" | ${r.pts} pts`);
      sobrantes++;
    }
  }
  if (sobrantes === 0) console.log('✅ No hay productos extra en BD.');

  // ── 6. RESUMEN FINAL ─────────────────────────────────────────────────────
  console.log(`\n── RESUMEN FINAL ──`);
  console.log(`Productos faltantes en BD : ${faltantes}`);
  console.log(`Diferencia de puntos      : ${difPts}`);
  console.log(`Productos extra en BD     : ${sobrantes}`);

  await client.end();
}
run().catch(console.error);
