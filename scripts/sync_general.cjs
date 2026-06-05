/**
 * sync_general.cjs
 * ─────────────────────────────────────────────────────────────
 * Sincroniza la base de datos con los 3 archivos fuente de verdad:
 *  1. Academusoft → puntos de títulos/categoría/exp (pts_titulos_exp),
 *                   puntos totales salariales (pts_total_salarial),
 *                   tope Academusoft (tope_acad), escolaridad, categoría,
 *                   programa, facultad, fecha_ingreso, dedicacion
 *  2. Res Exp Cal → puntos salariales actuales confirmados (pts_acumulados),
 *                   número resolución anterior (historial.RES_ANTERIOR),
 *                   fecha resolución anterior
 *  3. Topes Productividad → tope de productividad (tope),
 *                           puntos de productividad acumulados (pts_acumulados)
 * ─────────────────────────────────────────────────────────────
 */
const xlsx = require('xlsx');
const path = require('path');
const { Client } = require('pg');

const FOLDER = 'C:\\Users\\JHVEspinosa\\Downloads\\general';

function cleanCedula(v) {
  return v ? String(v).replace(/\D/g, '').trim() : null;
}
function cleanNum(v) {
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}
function cleanStr(v) {
  return v && v !== '-' && v !== 'N/A' ? String(v).trim() : null;
}
// Convierte número serial de Excel a fecha legible
function excelSerialToDate(serial) {
  if (!serial || isNaN(serial)) return null;
  const d = xlsx.SSF.parse_date_code(serial);
  if (!d) return null;
  return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
}
function formatFecha(v) {
  if (!v) return null;
  if (typeof v === 'number') return excelSerialToDate(v);
  // dd/mm/yyyy
  const m = String(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  return String(v).trim();
}
// Meses en español para formatear fecha de resolución
const MESES = ['','enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function formatFechaLarga(v) {
  if (!v) return null;
  let d;
  if (typeof v === 'number') {
    d = xlsx.SSF.parse_date_code(v);
    if (d) return `${d.d} de ${MESES[d.m]} de ${d.y}`;
  }
  const m = String(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${parseInt(m[1])} de ${MESES[parseInt(m[2])]} de ${m[3]}`;
  return String(v).trim();
}

async function main() {
  const c = new Client({ user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432 });
  await c.connect();

  // ═══════════════════════════════════════════════════════════════
  // 1. LEER ARCHIVOS
  // ═══════════════════════════════════════════════════════════════
  console.log('\n🔍 Leyendo archivos...');

  // Academusoft
  const wb1 = xlsx.readFile(path.join(FOLDER, 'Detalle Academusoft - 8 de mayo de 2026 (4).xlsx'));
  const acadData = xlsx.utils.sheet_to_json(wb1.Sheets[wb1.SheetNames[0]], { header: 1 }).slice(1);
  // Cols: 0=cedula, 1=nombre, 3=programa, 4=facultad, 5=especializ, 6=maestria, 7=doctorado
  // 8=clasificacion, 9=categoria, 10=dedicacion, 11=fecha_inicio, 12=tope_acad, 13=fecha_resol
  // 14=pts_libros, 15=pts_arts, 16=pts_soft, 17=pts_premios, 18=pts_patentes, 19=pts_prod_tec
  // 20=pts_audiovis, 21=pts_obras, 22=pts_otra_pub, 23=total_pts_produccion, 24=total_pts_tit_cat_exp, 25=total_pts_salariales
  const acadMap = {};
  for (const row of acadData) {
    const ced = cleanCedula(row[0]);
    if (!ced) continue;
    acadMap[ced] = {
      nombre: cleanStr(row[1]),
      programa: cleanStr(row[3]),
      facultad: cleanStr(row[4]),
      especializacion: cleanStr(row[5]),
      maestria: cleanStr(row[6]),
      doctorado: cleanStr(row[7]),
      categoria: cleanStr(row[9]),
      dedicacion: cleanStr(row[10]),
      fecha_ingreso: formatFecha(row[11]),
      tope_acad: cleanNum(row[12]),
      fecha_res_acad: formatFechaLarga(row[13]),
      pts_produccion_acad: cleanNum(row[23]),
      pts_titulos_exp: cleanNum(row[24]),
      pts_total_salarial_acad: cleanNum(row[25]),
    };
  }
  console.log(`  ✅ Academusoft: ${Object.keys(acadMap).length} docentes`);

  // Res Exp Cal — puntos salariales actuales + resolución anterior
  const wb2 = xlsx.readFile(path.join(FOLDER, 'Res Exp Cal (1).xlsx'));
  const resData = xlsx.utils.sheet_to_json(wb2.Sheets[wb2.SheetNames[0]], { header: 1 }).slice(1);
  // Cols: 0=No, 1=nombre, 2=cedula, 3=dependencia, 4=facultad, 5=puntos_salariales, 6=resolucion, 7=fecha_resol
  const resMap = {};
  for (const row of resData) {
    const ced = cleanCedula(row[2]);
    if (!ced) continue;
    resMap[ced] = {
      pts_totales_resolucion: cleanNum(row[5]),
      res_anterior: row[6] ? String(row[6]).trim() : null,
      fecha_res_anterior: formatFechaLarga(row[7]),
    };
  }
  console.log(`  ✅ Res Exp Cal: ${Object.keys(resMap).length} docentes`);

  // Topes Productividad
  const wb3 = xlsx.readFile(path.join(FOLDER, 'Topes_Productividad_Academica (1).xls'));
  const topesData = xlsx.utils.sheet_to_json(wb3.Sheets[wb3.SheetNames[0]], { header: 1 }).slice(1);
  // Cols: 0=nombre, 1=cedula, 2=programa, 3=categoria, 4=pts_productividad, 5=tope
  const topesMap = {};
  for (const row of topesData) {
    const ced = cleanCedula(row[1]);
    if (!ced) continue;
    topesMap[ced] = {
      pts_productividad: cleanNum(row[4]),
      tope: cleanNum(row[5]),
    };
  }
  console.log(`  ✅ Topes Productividad: ${Object.keys(topesMap).length} docentes`);

  // ═══════════════════════════════════════════════════════════════
  // 2. SINCRONIZAR CON LA BASE DE DATOS
  // ═══════════════════════════════════════════════════════════════
  console.log('\n🔄 Sincronizando con la base de datos...');

  // Obtener todos los docentes de la BD
  const { rows: docentesBD } = await c.query('SELECT cedula, historial FROM docentes');
  let actualizados = 0;
  let noEncontrados = 0;

  for (const doc of docentesBD) {
    const ced = doc.cedula;
    const acad = acadMap[ced];
    const res = resMap[ced];
    const topes = topesMap[ced];

    if (!acad && !res && !topes) {
      noEncontrados++;
      continue;
    }

    // Leer historial actual
    let historial = {};
    try { historial = doc.historial ? (typeof doc.historial === 'string' ? JSON.parse(doc.historial) : doc.historial) : {}; } catch(e) {}

    // Actualizar historial con datos de Res Exp Cal
    if (res && res.res_anterior) {
      historial['RES_ANTERIOR'] = res.res_anterior;
      historial['FECHA_RES_ANTERIOR'] = res.fecha_res_anterior || '';
      historial['ULTIMA_RESOLUCION'] = `Resolución ${res.res_anterior} del ${res.fecha_res_anterior || ''}`;
    }

    // Determinar escolaridad (mayor grado obtenido)
    let escolaridad = null;
    if (acad) {
      if (acad.doctorado) escolaridad = acad.doctorado;
      else if (acad.maestria) escolaridad = acad.maestria;
      else if (acad.especializacion) escolaridad = acad.especializacion;
    }

    // Determinar categoría limpia
    let categoria = null;
    if (acad && acad.categoria) {
      const catRaw = acad.categoria.toLowerCase();
      if (catRaw.includes('titular')) categoria = 'Titular';
      else if (catRaw.includes('asociado')) categoria = 'Asociado';
      else if (catRaw.includes('asistente')) categoria = 'Asistente';
      else if (catRaw.includes('auxiliar')) categoria = 'Auxiliar';
      else categoria = acad.categoria;
    }

    // ── Construir UPDATE ──────────────────────────────────────
    const sets = [];
    const vals = [];
    let p = 1;

    const add = (col, val) => { if (val !== undefined && val !== null) { sets.push(`${col} = $${p}`); vals.push(val); p++; } };

    // De Academusoft — siempre actualizar escolaridad base, PERO
    // respetar el doctorado si ya fue aprobado por CIARP (viene de BD)
    if (acad) {
      add('especializacion', acad.especializacion || null);
      add('maestria', acad.maestria || null);
      // Solo sobreescribir doctorado con Academusoft si NO tenemos uno ya en BD de CIARP
      // (verificamos consultando el campo actual)
      add('dedicacion', acad.dedicacion);
      add('fecha_ingreso', acad.fecha_ingreso);
      if (acad.pts_titulos_exp > 0) add('pts_titulos_exp', acad.pts_titulos_exp);
      if (acad.pts_total_salarial_acad > 0) add('pts_total_salarial', acad.pts_total_salarial_acad);
      if (categoria) add('categoria', categoria);
      // escolaridad: solo si Academusoft tiene algo y NO la queremos bajar (si ya tiene doctorado en BD por CIARP)
      // La lógica: subir escolaridad con doctorado de Academusoft si existe, sino maestria, sino especializacion
      if (acad.doctorado) add('doctorado', acad.doctorado);
      if (escolaridad) add('escolaridad', escolaridad);
    }

    // De Topes — tope principal de productividad
    if (topes && topes.tope > 0) {
      add('tope', topes.tope);
      // pts_acumulados = los puntos de productividad que lleva el docente
      if (topes.pts_productividad >= 0) add('pts_acumulados', topes.pts_productividad);
    }

    // Historial actualizado
    add('historial', JSON.stringify(historial));

    if (sets.length === 0) continue;
    vals.push(ced);
    await c.query(`UPDATE docentes SET ${sets.join(', ')} WHERE cedula = $${p}`, vals);
    actualizados++;
  }

  console.log(`  ✅ Actualizados: ${actualizados}`);
  console.log(`  ⚠️  Sin datos en Excel: ${noEncontrados}`);

  // ═══════════════════════════════════════════════════════════════
  // 3. VERIFICACIÓN CRISTIAN CAMILO
  // ═══════════════════════════════════════════════════════════════
  const { rows: cristian } = await c.query(`
    SELECT cedula, pts_acumulados, pts_titulos_exp, pts_total_salarial, tope, 
           escolaridad, categoria, maestria, doctorado, historial
    FROM docentes WHERE cedula = '1102042502'
  `);
  console.log('\n🔎 Verificación CRISTIAN CAMILO:');
  const cr = cristian[0];
  if (cr) {
    let h = {};
    try { h = typeof cr.historial === 'string' ? JSON.parse(cr.historial) : cr.historial; } catch(e){}
    console.log(`  pts_acumulados: ${cr.pts_acumulados}  (productividad acumulada Topes Excel)`);
    console.log(`  pts_titulos_exp: ${cr.pts_titulos_exp}  (títulos + experiencia Academusoft col 24)`);
    console.log(`  pts_total_salarial: ${cr.pts_total_salarial}  (total salarial Academusoft col 25)`);
    console.log(`  tope: ${cr.tope}`);
    console.log(`  escolaridad: ${cr.escolaridad}`);
    console.log(`  categoria: ${cr.categoria}`);
    console.log(`  maestria: ${cr.maestria}`);
    console.log(`  doctorado: ${cr.doctorado}`);
    console.log(`  RES_ANTERIOR: ${h['RES_ANTERIOR']}, FECHA: ${h['FECHA_RES_ANTERIOR']}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // 4. VERIFICACIÓN JACQUELINE GARCIA
  // ═══════════════════════════════════════════════════════════════
  const { rows: jaq } = await c.query(`
    SELECT cedula, pts_acumulados, pts_titulos_exp, pts_total_salarial, tope,
           escolaridad, categoria, historial
    FROM docentes WHERE cedula = '1094911213'
  `);
  console.log('\n🔎 Verificación JACQUELINE GARCIA:');
  const j = jaq[0];
  if (j) {
    let h = {};
    try { h = typeof j.historial === 'string' ? JSON.parse(j.historial) : j.historial; } catch(e){}
    console.log(`  pts_acumulados: ${j.pts_acumulados}`);
    console.log(`  pts_titulos_exp: ${j.pts_titulos_exp}`);
    console.log(`  pts_total_salarial: ${j.pts_total_salarial}`);
    console.log(`  tope: ${j.tope}`);
    console.log(`  escolaridad: ${j.escolaridad}`);
    console.log(`  categoria: ${j.categoria}`);
    console.log(`  RES_ANTERIOR: ${h['RES_ANTERIOR']}, FECHA: ${h['FECHA_RES_ANTERIOR']}`);
  }

  console.log('\n✅ Sincronización completa.\n');
  await c.end();
}

main().catch(console.error);
