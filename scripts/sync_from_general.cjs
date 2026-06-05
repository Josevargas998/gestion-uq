/**
 * sync_from_general.cjs
 * ─────────────────────────────────────────────────────────────
 * FUENTE ÚNICA DE VERDAD: C:\Users\JHVEspinosa\Downloads\general\general.xlsx
 * Hoja "CONSOLIDADO" con 261 docentes.
 *
 * Columnas (0-indexed):
 *  0  = No.
 *  1  = APELLIDOS Y NOMBRE
 *  2  = CÉDULA
 *  3  = DEPENDENCIA DIRECTA (programa)
 *  4  = FACULTAD
 *  5  = RESOLUCIÓN (número — p.ej. 431 ó 453)
 *  6  = FECHA DE RESOLUCIÓN (serial Excel)
 *  7  = PUNTOS SALARIALES (total oficial firmado)
 *  8  = CATEGORIA ACAD
 *  9  = DEDICACION_ACAD
 * 10  = FECHA INICIO ACAD (fecha ingreso)
 * 11  = CAES TOPEPUNTOS ACAD (tope de productividad)
 * 12  = PUNTOS LIBROS ACAD
 * 13  = PUNTOS ARTICULOS ACAD
 * 14  = PUNTOS SOFTWARE ACAD
 * 15  = PUNTOS PREMIOS ACAD
 * 16  = PUNTOS PATENTES ACAD
 * 17  = PUNTOS PROD TÉCNICA ACAD
 * 18  = PUNTOS PRODUCCION AUDIOVISUAL ACAD
 * 19  = PUNTOS OBRAS ACAD
 * 20  = PUNTOS OTRA PUBLICACION ACAD
 * 21  = TOTAL PUNTOS PRODUCCION ACAD  → pts_acumulados (productividad acumulada)
 * 22  = TOTAL PUNTOS TIT CAT EXP ACAD → pts_titulos_exp
 * 23  = TOTAL PUNTOS SALARIALES ACAD  → pts_total_salarial (debe = col 7)
 * ─────────────────────────────────────────────────────────────
 */
const xlsx = require('xlsx');
const { Client } = require('pg');

const FILE = 'C:\\Users\\JHVEspinosa\\Downloads\\general\\general.xlsx';

// ─── Helpers ────────────────────────────────────────────────
function cleanCedula(v) { return v ? String(v).replace(/\D/g, '').trim() : null; }
function cleanNum(v) {
  if (v === '-' || v === null || v === undefined || v === '') return 0;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}
function cleanStr(v) { return v && v !== '-' && v !== 'N/A' && v !== '' ? String(v).trim() : null; }

const MESES = ['','enero','febrero','marzo','abril','mayo','junio',
               'julio','agosto','septiembre','octubre','noviembre','diciembre'];

function excelDateToStr(v) {
  if (!v) return null;
  if (typeof v === 'number') {
    const d = xlsx.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
  }
  // dd/mm/yyyy
  const m = String(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  return String(v).trim();
}

function excelDateToLong(v) {
  if (!v) return null;
  if (typeof v === 'number') {
    const d = xlsx.SSF.parse_date_code(v);
    if (d) return `${d.d} de ${MESES[d.m]} de ${d.y}`;
  }
  const m = String(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${parseInt(m[1])} de ${MESES[parseInt(m[2])]} de ${m[3]}`;
  return String(v).trim();
}

function categoriaLimpia(v) {
  if (!v) return null;
  const s = String(v).toLowerCase();
  if (s.includes('titular'))  return 'Titular';
  if (s.includes('asociado')) return 'Asociado';
  if (s.includes('asistente')) return 'Asistente';
  if (s.includes('auxiliar')) return 'Auxiliar';
  return String(v).trim();
}

// ─── Principal ──────────────────────────────────────────────
async function main() {
  // 1. Leer Excel
  console.log(`\n📂 Leyendo ${FILE} ...`);
  const wb   = xlsx.readFile(FILE);
  const ws   = wb.Sheets['CONSOLIDADO'];
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1 }).slice(1); // quita encabezado
  console.log(`   ${rows.length} docentes encontrados en CONSOLIDADO`);

  // 2. Construir mapa por cédula
  const mapa = {};
  for (const r of rows) {
    const ced = cleanCedula(r[2]);
    if (!ced) continue;

    const res     = r[5] ? String(r[5]).trim() : null;
    const fechaRes = excelDateToLong(r[6]);
    const ptsSalariales  = cleanNum(r[7]);   // col 7 = total oficial
    const tope           = cleanNum(r[11]);  // col 11 = tope productividad
    const ptsProduccion  = cleanNum(r[21]);  // col 21 = total producción acumulada
    const ptsTitulosExp  = cleanNum(r[22]);  // col 22 = total titulos+cat+exp
    const ptsTotalAcad   = cleanNum(r[23]);  // col 23 = total salarial (debe = col 7)

    mapa[ced] = {
      programa:        cleanStr(r[3]),
      facultad:        cleanStr(r[4]),
      res_anterior:    res,
      fecha_res_anterior: fechaRes,
      // Puntos definitivos:
      pts_total_salarial: ptsSalariales,        // total salarial firmado (col 7)
      pts_acumulados:     ptsProduccion,        // productividad acumulada (col 21)
      pts_titulos_exp:    ptsTitulosExp,        // titulos+cat+exp (col 22)
      tope:               tope,
      categoria:          categoriaLimpia(r[8]),
      dedicacion:         cleanStr(r[9]),
      fecha_ingreso:      excelDateToStr(r[10]),
    };
  }

  // 3. Conectar BD y actualizar
  const c = new Client({ user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432 });
  await c.connect();
  console.log('\n🔄 Sincronizando con PostgreSQL...');

  const { rows: docentesBD } = await c.query('SELECT cedula, historial FROM docentes ORDER BY cedula');
  let actualizados = 0, sinDatos = 0;

  for (const doc of docentesBD) {
    const ced = doc.cedula;
    const datos = mapa[ced];
    if (!datos) { sinDatos++; continue; }

    // Historial: guardar resolución anterior
    let historial = {};
    try { historial = doc.historial ? (typeof doc.historial === 'string' ? JSON.parse(doc.historial) : doc.historial) : {}; } catch(e) {}
    if (datos.res_anterior) {
      historial['RES_ANTERIOR']       = datos.res_anterior;
      historial['FECHA_RES_ANTERIOR'] = datos.fecha_res_anterior || '';
    }

    await c.query(`
      UPDATE docentes SET
        pts_total_salarial = $1,
        pts_acumulados     = $2,
        pts_titulos_exp    = $3,
        tope               = $4,
        categoria          = COALESCE(NULLIF($5, ''), categoria),
        dedicacion         = COALESCE(NULLIF($6, ''), dedicacion),
        fecha_ingreso      = COALESCE(NULLIF($7, '')::date, fecha_ingreso),
        historial          = $8
      WHERE cedula = $9
    `, [
      datos.pts_total_salarial,
      datos.pts_acumulados,
      datos.pts_titulos_exp,
      datos.tope,
      datos.categoria,
      datos.dedicacion,
      datos.fecha_ingreso,
      JSON.stringify(historial),
      ced
    ]);
    actualizados++;
  }

  console.log(`   ✅ Actualizados: ${actualizados}`);
  console.log(`   ⚠️  Sin datos en Excel: ${sinDatos}`);

  // 4. Post-fix: escolaridad = mayor grado aprobado por CIARP (no bajar por Academusoft)
  console.log('\n🔧 Aplicando post-fix de escolaridad (CIARP tiene prioridad)...');
  const { rows: titulosCiarp } = await c.query(`
    SELECT s.cedula, s.titulo, s.tipo, d.doctorado, d.maestria, d.especializacion, d.escolaridad
    FROM solicitudes s
    JOIN docentes d ON d.cedula = s.cedula
    WHERE s.tipo IN ('titulo','titulo_academico') AND s.estado = 'aprobado'
    ORDER BY s.cedula
  `);
  let escolaridadFix = 0;
  for (const r of titulosCiarp) {
    const tl = (r.titulo || '').toLowerCase();
    let campo = null;
    if (tl.includes('doctor'))                           campo = 'doctorado';
    else if (tl.includes('maestr') || tl.includes('magister')) campo = 'maestria';
    else if (tl.includes('especializa'))                  campo = 'especializacion';
    if (!campo) continue;

    const valorActual = (r[campo] || '').toLowerCase();
    const tituloNorm  = (r.titulo || '').trim();
    if (valorActual && valorActual === tituloNorm.toLowerCase()) {
      // Ya está → solo asegurar escolaridad = mayor grado
      const mejor = r.doctorado || r.maestria || r.especializacion;
      if (mejor && mejor !== r.escolaridad) {
        await c.query('UPDATE docentes SET escolaridad = $1 WHERE cedula = $2', [mejor, r.cedula]);
        escolaridadFix++;
      }
      continue;
    }
    await c.query(
      `UPDATE docentes SET ${campo} = $1, escolaridad = $1 WHERE cedula = $2`,
      [tituloNorm, r.cedula]
    );
    escolaridadFix++;
  }
  console.log(`   ✅ Escolaridad corregida en: ${escolaridadFix} docentes`);

  // 5. Verificación rápida
  console.log('\n📊 Verificación de muestra:');
  const sample = await c.query(`
    SELECT cedula,
           pts_total_salarial, pts_acumulados, pts_titulos_exp, tope,
           escolaridad, categoria,
           historial->>'RES_ANTERIOR' as res,
           historial->>'FECHA_RES_ANTERIOR' as fecha_res
    FROM docentes
    WHERE cedula IN ('1102042502','1094911213','24606935','89007946')
    ORDER BY cedula
  `);
  for (const r of sample.rows) {
    console.log(`\n  📌 ${r.cedula}`);
    console.log(`     total_salarial: ${r.pts_total_salarial}`);
    console.log(`     productividad:  ${r.pts_acumulados}`);
    console.log(`     tit+cat+exp:    ${r.pts_titulos_exp}`);
    console.log(`     tope:           ${r.tope}`);
    console.log(`     escolaridad:    ${r.escolaridad}`);
    console.log(`     categoria:      ${r.categoria}`);
    console.log(`     Res anterior:   ${r.res} del ${r.fecha_res}`);
  }

  console.log('\n✅ Sincronización completa desde general.xlsx\n');
  await c.end();
}

main().catch(console.error);
