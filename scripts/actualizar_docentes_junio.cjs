/**
 * Script: actualizar_docentes_junio.cjs
 * Actualiza la tabla `docentes` con los datos del Excel "base de datos junio.xlsx"
 * Hace UPSERT por cédula: actualiza si existe, inserta si no.
 * Campos que NUNCA se sobreescriben: historial, correo, comision, observacion,
 *   pts_ciarp1_2026, pts_favor, tope_libros, tope_software, created_at
 */

const path = require('path');
const { Pool } = require('pg');
const XLSX = require('xlsx');

// ── Conexión ──────────────────────────────────────────────────────────────────
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'gestion_uq_db',
  user: 'gestion_uq',
  password: 'gestion_uq_2026',
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const toNum = (v) => {
  if (v === null || v === undefined || v === '-' || v === '') return null;
  const n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? null : n;
};

const toDate = (v) => {
  if (!v || v === '-') return null;
  // Puede venir como string "DD/MM/YYYY" o número serial de Excel
  if (typeof v === 'number') {
    // Serial de Excel
    const d = XLSX.SSF.parse_date_code(v);
    return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
  }
  // String DD/MM/YYYY
  const parts = String(v).split('/');
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return null;
};

// Normalizar categoría al formato que usa la app
const normCategoria = (cat) => {
  if (!cat) return null;
  const c = cat.trim().toUpperCase();
  if (c.includes('TITULAR'))   return 'Titular';
  if (c.includes('ASOCIADO'))  return 'Asociado';
  if (c.includes('ASISTENTE')) return 'Asistente';
  if (c.includes('AUXILIAR'))  return 'Auxiliar';
  return cat.trim();
};

// ── Principal ─────────────────────────────────────────────────────────────────
async function main() {
  const xlsxPath = path.resolve(
    'C:/Users/JHVEspinosa/Downloads/actualizacion base de datos/base de datos junio.xlsx'
  );

  console.log('📂 Leyendo Excel:', xlsxPath);
  const wb = XLSX.readFile(xlsxPath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null });

  console.log(`📊 Filas encontradas: ${rows.length}`);

  let insertados = 0;
  let actualizados = 0;
  let errores = 0;

  for (const row of rows) {
    const cedula    = String(row['DOCUMENTO ACAD'] || '').trim();
    if (!cedula) continue;

    const nombre    = String(row['NOMBRE ACAD'] || '').trim();
    const facultad  = String(row['FACULTAD ACAD'] || '').trim();
    const programa  = String(row['PROGRAMA ACAD'] || '').trim();
    const categoria = normCategoria(row['CATEGORIA ACAD']);
    const clasif    = String(row['CLASIFICACION ACAD'] || '').trim();
    const dedic     = String(row['DEDICACION_ACAD'] || '').trim();
    const espec     = row['ESPECIALIZACION ACAD'] && row['ESPECIALIZACION ACAD'] !== '-'
                        ? String(row['ESPECIALIZACION ACAD']).trim() : null;
    const maestria  = row['MAESTRIA ACAD'] && row['MAESTRIA ACAD'] !== '-'
                        ? String(row['MAESTRIA ACAD']).trim() : null;
    const doctorado = row['DOCTORADO ACAD'] && row['DOCTORADO ACAD'] !== '-'
                        ? String(row['DOCTORADO ACAD']).trim() : null;
    const fechaIngreso = toDate(row['FECHA INICIO ACAD']);
    const tope         = toNum(row['CAES TOPEPUNTOS ACAD']);
    const ptsLibros    = toNum(row['PUNTOS LIBROS ACAD']);
    const ptsArticulos = toNum(row['PUNTOS ARTICULOS ACAD']);
    const ptsSoftware  = toNum(row['PUNTOS SOFTWARE ACAD']);
    const ptsPremios   = toNum(row['PUNTOS PREMIOS ACAD']);
    const ptsPatentes  = toNum(row['PUNTOS PATENTES ACAD']);
    const ptsTecnica   = toNum(row['PUNTOS_PRODUCCION TECNICA ACAD']);
    const ptsAudiovis  = toNum(row['PUNTOS PRODUCCION AUDIOVISUAL ACAD']);
    const ptsObras     = toNum(row['PUNTOS OBRAS ACAD']);
    const ptsOtraPub   = toNum(row['PUNTOS OTRA PUBLICACION ACAD']);
    const ptsProduccion= toNum(row['TOTAL PUNTOS PRODUCCION ACAD']);
    const ptsTitExp    = toNum(row['TOTAL PUNTOS TIT CAT EXP ACAD']);
    const ptsTotalSal  = toNum(row['TOTAL PUNTOS SALARIALES ACAD']);

    // Escolaridad: concatenar lo que tenga
    const escParts = [];
    if (doctorado) escParts.push(`Doctorado: ${doctorado}`);
    if (maestria)  escParts.push(`Maestría: ${maestria}`);
    if (espec)     escParts.push(`Especialización: ${espec}`);
    const escolaridad = escParts.length ? escParts.join(' | ') : null;

    // Estado según clasificación
    const estado = clasif === 'DOCENTE DE PLANTA' ? 'ACTIVO' : 'INACTIVO';

    try {
      // Verificar si existe
      const existe = await pool.query(
        'SELECT id FROM docentes WHERE cedula = $1', [cedula]
      );

      if (existe.rows.length > 0) {
        // UPDATE — solo campos del Excel, nunca toca historial/correo/ciarp/etc.
        await pool.query(`
          UPDATE docentes SET
            nombre         = $1,
            facultad       = $2,
            programa       = $3,
            categoria      = $4,
            escolaridad    = $5,
            especializacion= $6,
            maestria       = $7,
            doctorado      = $8,
            dedicacion     = $9,
            fecha_ingreso  = $10,
            tope           = $11,
            pts_acumulados = $12,
            pts_titulos_exp= $13,
            pts_total_salarial = $14,
            estado         = $15,
            updated_at     = NOW()
          WHERE cedula = $16
        `, [
          nombre, facultad, programa, categoria, escolaridad,
          espec, maestria, doctorado, dedic, fechaIngreso,
          tope, ptsProduccion, ptsTitExp, ptsTotalSal,
          estado, cedula
        ]);
        actualizados++;
        process.stdout.write('.');
      } else {
        // INSERT
        await pool.query(`
          INSERT INTO docentes (
            cedula, nombre, facultad, programa, categoria,
            escolaridad, especializacion, maestria, doctorado,
            dedicacion, fecha_ingreso, tope, pts_acumulados,
            pts_titulos_exp, pts_total_salarial, estado,
            created_at, updated_at
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
            NOW(), NOW()
          )
        `, [
          cedula, nombre, facultad, programa, categoria,
          escolaridad, espec, maestria, doctorado,
          dedic, fechaIngreso, tope, ptsProduccion,
          ptsTitExp, ptsTotalSal, estado
        ]);
        insertados++;
        process.stdout.write('+');
      }
    } catch (err) {
      errores++;
      console.error(`\n❌ Error en cédula ${cedula} (${nombre}): ${err.message}`);
    }
  }

  await pool.end();

  console.log('\n\n══════════════════════════════════');
  console.log('✅ ACTUALIZACIÓN COMPLETADA');
  console.log(`   Actualizados : ${actualizados}`);
  console.log(`   Insertados   : ${insertados}`);
  console.log(`   Errores      : ${errores}`);
  console.log(`   Total        : ${rows.length}`);
  console.log('══════════════════════════════════');
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
