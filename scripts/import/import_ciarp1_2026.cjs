/**
 * import_ciarp1_2026.cjs
 * Importa todos los productos del archivo "CIARP 1 2026.xlsx" a la tabla solicitudes.
 * Hace UPSERT por (cedula, titulo, acta_ciarp) para evitar duplicados.
 */
const { Pool } = require('pg');
const XLSX = require('xlsx');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'gestion_uq_db',
  user:     process.env.DB_USER     || 'gestion_uq',
  password: process.env.DB_PASSWORD || 'gestion_uq_2026',
});

const EXCEL_PATH = path.join(__dirname, '..', 'CIARP', 'CIARP 1 2026.xlsx');
const AÑO = 2026;

function genId(tipo) {
  const hex = crypto.randomUUID().replace(/-/g, '').substring(0, 8);
  return `SOL-${AÑO}-PROD-${hex}`;
}

function toTitleCase(str) {
  if (!str) return '';
  return String(str).toLowerCase().replace(/\b\w/g, c => c.toUpperCase()).trim();
}

function clean(val) {
  if (val === null || val === undefined) return null;
  return String(val).trim() || null;
}

function parseSheet(workbook, name) {
  if (!workbook.SheetNames.includes(name)) return [];
  return XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1 });
}

async function upsert(client, record) {
  const {
    id, cedula, tipo, titulo, programa, facultad, dedicacion,
    escolaridad, categoria, pts_asig, acta_ciarp, anio, semestre,
    observaciones, etapa
  } = record;

  // Verificar si ya existe por (cedula, titulo normalizado, acta)
  const check = await client.query(
    `SELECT id FROM solicitudes WHERE cedula = $1 AND LOWER(titulo) = LOWER($2) AND acta_ciarp = $3 LIMIT 1`,
    [cedula, titulo, acta_ciarp]
  );

  if (check.rows.length > 0) {
    // Actualizar puntos y datos si ya existe
    await client.query(
      `UPDATE solicitudes SET pts_asig = $1, programa = $2, facultad = $3, updated_at = NOW() WHERE id = $4`,
      [pts_asig, programa, facultad, check.rows[0].id]
    );
    return { action: 'updated', id: check.rows[0].id };
  } else {
    // Insertar nuevo
    await client.query(
      `INSERT INTO solicitudes (
        id, cedula, tipo, titulo, programa, facultad, dedicacion,
        escolaridad, categoria, pts_asig, acta_ciarp, anio, semestre,
        observaciones, etapa, estado, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'aprobado',NOW(),NOW())`,
      [id, cedula, tipo, titulo, programa, facultad, dedicacion,
       escolaridad, categoria, pts_asig, acta_ciarp, anio, semestre,
       observaciones, etapa || 'archivada']
    );
    return { action: 'inserted', id };
  }
}

async function main() {
  const wb = XLSX.readFile(EXCEL_PATH);
  const client = await pool.connect();
  let inserted = 0, updated = 0, errors = 0;

  try {
    await client.query('BEGIN');

    // ══════════════════════════════════════════════════
    // 1. REVISTAS INDEXADAS
    // ══════════════════════════════════════════════════
    const revistas = parseSheet(wb, 'Revistas');
    console.log(`[Revistas] ${revistas.length - 1} filas`);
    // Cols: AÑO, SEM, NO, CEDULA, NOMBRE, ESCOLARIDAD, CATEGORÍA, DEDICACION, PROGRAMA, FACULTAD, TIPO_REVISTA, TITULO, NOMBRE_REVISTA, VOL, NUM, AÑO_PUB, INDEXACION, AUTORES_TOT, AUTORES_UQ, PTS_ASIG, ACTA, OBS
    for (let i = 1; i < revistas.length; i++) {
      const r = revistas[i];
      if (!r || !r[3]) continue;
      try {
        const res = await upsert(client, {
          id: genId('articulo'), cedula: clean(r[3]), tipo: 'articulo',
          titulo: clean(r[11]) || 'Artículo sin título',
          programa: clean(r[8]), facultad: clean(r[9]),
          dedicacion: clean(r[7]), escolaridad: clean(r[5]),
          categoria: clean(r[6]), pts_asig: Number(r[19]) || 0,
          acta_ciarp: clean(r[20]), anio: r[0] || AÑO, semestre: clean(r[1]),
          observaciones: clean(r[21]), etapa: 'archivada'
        });
        if (res.action === 'inserted') inserted++; else updated++;
      } catch(e) { console.error(`[Revistas] Error fila ${i}:`, e.message); errors++; }
    }

    // ══════════════════════════════════════════════════
    // 2. LIBROS DE TEXTO
    // ══════════════════════════════════════════════════
    const librosTexto = parseSheet(wb, 'Libros_Texto');
    console.log(`[Libros_Texto] ${librosTexto.length - 1} filas`);
    for (let i = 1; i < librosTexto.length; i++) {
      const r = librosTexto[i];
      if (!r || !r[3]) continue;
      try {
        const res = await upsert(client, {
          id: genId('libro_texto'), cedula: clean(r[3]), tipo: 'libro_texto',
          titulo: clean(r[9]) || 'Libro sin título',
          programa: clean(r[6]), facultad: clean(r[7]),
          dedicacion: clean(r[5]), escolaridad: clean(r[4]),
          categoria: null, pts_asig: Number(r[17]) || 0,
          acta_ciarp: clean(r[18]), anio: r[0] || AÑO, semestre: clean(r[1]),
          observaciones: clean(r[19]), etapa: 'archivada'
        });
        if (res.action === 'inserted') inserted++; else updated++;
      } catch(e) { console.error(`[Libros_Texto] Error fila ${i}:`, e.message); errors++; }
    }

    // ══════════════════════════════════════════════════
    // 3. LIBROS DE ENSAYO
    // ══════════════════════════════════════════════════
    const librosEnsayo = parseSheet(wb, 'Libros_Ensayo');
    console.log(`[Libros_Ensayo] ${librosEnsayo.length - 1} filas`);
    for (let i = 1; i < librosEnsayo.length; i++) {
      const r = librosEnsayo[i];
      if (!r || !r[3]) continue;
      try {
        const res = await upsert(client, {
          id: genId('ensayo'), cedula: clean(r[3]), tipo: 'ensayo',
          titulo: clean(r[9]) || 'Libro ensayo sin título',
          programa: clean(r[6]), facultad: clean(r[7]),
          dedicacion: clean(r[5]), escolaridad: clean(r[4]),
          categoria: null, pts_asig: Number(r[17]) || 0,
          acta_ciarp: clean(r[18]), anio: r[0] || AÑO, semestre: clean(r[1]),
          observaciones: clean(r[19]), etapa: 'archivada'
        });
        if (res.action === 'inserted') inserted++; else updated++;
      } catch(e) { console.error(`[Libros_Ensayo] Error fila ${i}:`, e.message); errors++; }
    }

    // ══════════════════════════════════════════════════
    // 4. LIBROS DE INVESTIGACIÓN
    // ══════════════════════════════════════════════════
    const librosInv = parseSheet(wb, 'Libros_Investigación');
    console.log(`[Libros_Investigación] ${librosInv.length - 1} filas`);
    for (let i = 1; i < librosInv.length; i++) {
      const r = librosInv[i];
      if (!r || !r[3]) continue;
      try {
        const res = await upsert(client, {
          id: genId('libro_investigacion'), cedula: clean(r[3]), tipo: 'libro_investigacion',
          titulo: clean(r[9]) || 'Libro investigación sin título',
          programa: clean(r[6]), facultad: clean(r[7]),
          dedicacion: clean(r[5]), escolaridad: clean(r[4]),
          categoria: null, pts_asig: Number(r[17]) || 0,
          acta_ciarp: clean(r[18]), anio: r[0] || AÑO, semestre: clean(r[1]),
          observaciones: clean(r[19]), etapa: 'archivada'
        });
        if (res.action === 'inserted') inserted++; else updated++;
      } catch(e) { console.error(`[Libros_Investigación] Error fila ${i}:`, e.message); errors++; }
    }

    // ══════════════════════════════════════════════════
    // 5. TÍTULOS UNIVERSITARIOS
    // ══════════════════════════════════════════════════
    const titulos = parseSheet(wb, 'Titulos');
    console.log(`[Titulos] ${titulos.length - 1} filas`);
    for (let i = 1; i < titulos.length; i++) {
      const r = titulos[i];
      if (!r || !r[3]) continue;
      try {
        const res = await upsert(client, {
          id: genId('titulo'), cedula: clean(r[3]), tipo: 'titulo',
          titulo: clean(r[7]) || 'Título sin descripción',
          programa: clean(r[5]), facultad: clean(r[6]),
          dedicacion: null, escolaridad: null, categoria: null,
          pts_asig: Number(r[8]) || 0,
          acta_ciarp: clean(r[9]), anio: r[0] || AÑO, semestre: clean(r[1]),
          observaciones: clean(r[10]), etapa: 'archivada'
        });
        if (res.action === 'inserted') inserted++; else updated++;
      } catch(e) { console.error(`[Titulos] Error fila ${i}:`, e.message); errors++; }
    }

    // ══════════════════════════════════════════════════
    // 6. ASCENSOS
    // ══════════════════════════════════════════════════
    const ascensos = parseSheet(wb, 'Ascensos');
    console.log(`[Ascensos] ${ascensos.length - 1} filas`);
    for (let i = 1; i < ascensos.length; i++) {
      const r = ascensos[i];
      if (!r || !r[3]) continue;
      try {
        const catNueva = clean(r[8]);
        const res = await upsert(client, {
          id: genId('ascenso'), cedula: clean(r[3]), tipo: 'ascenso',
          titulo: `Ascenso a ${catNueva || 'nueva categoría'}`,
          programa: clean(r[5]), facultad: clean(r[6]),
          dedicacion: clean(r[7]), escolaridad: null,
          categoria: catNueva, pts_asig: Number(r[9]) || 0,
          acta_ciarp: clean(r[10]), anio: r[0] || AÑO, semestre: clean(r[1]),
          observaciones: clean(r[11]), etapa: 'archivada'
        });
        if (res.action === 'inserted') inserted++; else updated++;
      } catch(e) { console.error(`[Ascensos] Error fila ${i}:`, e.message); errors++; }
    }

    // ══════════════════════════════════════════════════
    // 7. PRODUCCIÓN AUDIOVISUAL
    // ══════════════════════════════════════════════════
    const audiovisual = parseSheet(wb, 'Prod_Audiovisual');
    console.log(`[Prod_Audiovisual] ${audiovisual.length - 1} filas`);
    for (let i = 1; i < audiovisual.length; i++) {
      const r = audiovisual[i];
      if (!r || !r[6]) continue;
      try {
        const res = await upsert(client, {
          id: genId('audiovisual'), cedula: clean(r[6]), tipo: 'audiovisual',
          titulo: clean(r[3]) || 'Producción audiovisual',
          programa: clean(r[8]), facultad: clean(r[9]),
          dedicacion: clean(r[7]), escolaridad: clean(r[4]),
          categoria: clean(r[5]), pts_asig: Number(r[13]) || 0,
          acta_ciarp: clean(r[14]), anio: r[0] || AÑO, semestre: clean(r[1]),
          observaciones: clean(r[15]), etapa: 'archivada'
        });
        if (res.action === 'inserted') inserted++; else updated++;
      } catch(e) { console.error(`[Audiovisual] Error fila ${i}:`, e.message); errors++; }
    }

    // ══════════════════════════════════════════════════
    // 8. PREMIOS
    // ══════════════════════════════════════════════════
    const premios = parseSheet(wb, 'Premios');
    console.log(`[Premios] ${premios.length - 1} filas`);
    for (let i = 1; i < premios.length; i++) {
      const r = premios[i];
      if (!r || !r[3]) continue;
      try {
        const res = await upsert(client, {
          id: genId('premio'), cedula: clean(r[3]), tipo: 'premio',
          titulo: clean(r[10]) || 'Premio sin título',
          programa: clean(r[8]), facultad: clean(r[9]),
          dedicacion: clean(r[7]), escolaridad: clean(r[5]),
          categoria: clean(r[6]), pts_asig: Number(r[14]) || 0,
          acta_ciarp: clean(r[15]), anio: r[0] || AÑO, semestre: clean(r[1]),
          observaciones: clean(r[16]), etapa: 'archivada'
        });
        if (res.action === 'inserted') inserted++; else updated++;
      } catch(e) { console.error(`[Premios] Error fila ${i}:`, e.message); errors++; }
    }

    // ══════════════════════════════════════════════════
    // 9. PATENTES
    // ══════════════════════════════════════════════════
    const patentes = parseSheet(wb, 'Patentes');
    console.log(`[Patentes] ${patentes.length - 1} filas`);
    for (let i = 1; i < patentes.length; i++) {
      const r = patentes[i];
      if (!r || !r[3]) continue;
      try {
        const res = await upsert(client, {
          id: genId('patente'), cedula: clean(r[3]), tipo: 'patente',
          titulo: clean(r[9]) || 'Patente sin título',
          programa: clean(r[5]), facultad: clean(r[6]),
          dedicacion: null, escolaridad: null, categoria: null,
          pts_asig: Number(r[15]) || 0,
          acta_ciarp: clean(r[16]), anio: r[0] || AÑO, semestre: clean(r[1]),
          observaciones: null, etapa: 'archivada'
        });
        if (res.action === 'inserted') inserted++; else updated++;
      } catch(e) { console.error(`[Patentes] Error fila ${i}:`, e.message); errors++; }
    }

    // ══════════════════════════════════════════════════
    // 10. OBRAS ARTÍSTICAS
    // ══════════════════════════════════════════════════
    const obras = parseSheet(wb, 'Obras_Artisticas');
    console.log(`[Obras_Artisticas] ${obras.length - 1} filas`);
    for (let i = 1; i < obras.length; i++) {
      const r = obras[i];
      if (!r || !r[9]) continue;
      try {
        const res = await upsert(client, {
          id: genId('obra_artistica'), cedula: clean(r[9]), tipo: 'obra_artistica',
          titulo: clean(r[3]) || 'Obra artística sin título',
          programa: clean(r[14]), facultad: clean(r[15]),
          dedicacion: clean(r[13]), escolaridad: clean(r[11]),
          categoria: clean(r[12]), pts_asig: Number(r[18]) || 0,
          acta_ciarp: clean(r[19]), anio: r[0] || AÑO, semestre: clean(r[1]),
          observaciones: clean(r[20]), etapa: 'archivada'
        });
        if (res.action === 'inserted') inserted++; else updated++;
      } catch(e) { console.error(`[Obras_Artisticas] Error fila ${i}:`, e.message); errors++; }
    }

    // ══════════════════════════════════════════════════
    // 11. PRODUCCIÓN TÉCNICA
    // ══════════════════════════════════════════════════
    const prodTec = parseSheet(wb, 'Prod_Tecnica');
    console.log(`[Prod_Tecnica] ${prodTec.length - 1} filas`);
    for (let i = 1; i < prodTec.length; i++) {
      const r = prodTec[i];
      if (!r || !r[6]) continue;
      try {
        const res = await upsert(client, {
          id: genId('produccion_tecnica'), cedula: clean(r[6]), tipo: 'produccion_tecnica',
          titulo: clean(r[3]) || 'Producción técnica sin título',
          programa: clean(r[11]), facultad: clean(r[12]),
          dedicacion: clean(r[10]), escolaridad: clean(r[8]),
          categoria: clean(r[9]), pts_asig: Number(r[15]) || 0,
          acta_ciarp: clean(r[16]), anio: r[0] || AÑO, semestre: clean(r[1]),
          observaciones: clean(r[17]), etapa: 'archivada'
        });
        if (res.action === 'inserted') inserted++; else updated++;
      } catch(e) { console.error(`[Prod_Tecnica] Error fila ${i}:`, e.message); errors++; }
    }

    // ══════════════════════════════════════════════════
    // 12. SOFTWARE
    // ══════════════════════════════════════════════════
    const software = parseSheet(wb, 'Prod_Software');
    console.log(`[Prod_Software] ${software.length - 1} filas`);
    for (let i = 1; i < software.length; i++) {
      const r = software[i];
      if (!r || !r[6]) continue;
      try {
        const res = await upsert(client, {
          id: genId('software'), cedula: clean(r[6]), tipo: 'software',
          titulo: clean(r[4]) || 'Software sin título',
          programa: clean(r[11]), facultad: clean(r[12]),
          dedicacion: clean(r[10]), escolaridad: clean(r[8]),
          categoria: clean(r[9]), pts_asig: Number(r[15]) || 0,
          acta_ciarp: clean(r[16]), anio: r[0] || AÑO, semestre: clean(r[1]),
          observaciones: clean(r[17]), etapa: 'archivada'
        });
        if (res.action === 'inserted') inserted++; else updated++;
      } catch(e) { console.error(`[Prod_Software] Error fila ${i}:`, e.message); errors++; }
    }

    await client.query('COMMIT');
    console.log('\n══════════════════════════════════════════');
    console.log('  IMPORTACIÓN COMPLETADA');
    console.log(`  ✅ Insertados:   ${inserted}`);
    console.log(`  🔄 Actualizados: ${updated}`);
    console.log(`  ❌ Errores:      ${errors}`);
    console.log('══════════════════════════════════════════');

  } catch(e) {
    await client.query('ROLLBACK');
    console.error('Error fatal, rollback ejecutado:', e);
  } finally {
    client.release();
    pool.end();
  }
}

main();
