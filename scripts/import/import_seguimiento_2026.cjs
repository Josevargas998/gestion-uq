const xlsx = require('xlsx');
const { Client } = require('pg');
const crypto = require('crypto');

const FILE_PATH = 'C:\\Users\\JHVEspinosa\\Downloads\\seguimiento 2026\\seguimiento.xlsx';

const sheetToTipo = {
  'Artículos Index.':    'articulo_indexado',
  'Texto':               'libro_texto',
  'Ensayo':              'libro_ensayo',
  'Lib Investigación':   'libro_investigacion',
  'Patente':             'patente',
  'Obra Artistica':      'obra_artistica',
  'Premio':              'premio',
  'Producción Técnica ': 'produccion_tecnica',
  'Títulos':             'titulo',
  'Software':            'software',
  'Producción Audiovisual': 'video',
  'Ascensos ':           'ascenso',
  'Ponencias':           'ponencia',
  'Artículos Rev No Index': 'articulo_no_indexado',
  'Tesis':               'tesis',
  'Pos Doctorado':       'posdoctorado'
};

function formatName(str) {
  if (!str) return 'Sin autor';
  str = str.replace(/\s+/g, ' ').trim().toUpperCase();
  const parts = str.split(' ');
  let format = parts.length === 4 ? `${parts[2]} ${parts[3]} ${parts[0]} ${parts[1]}`
             : parts.length === 3 ? `${parts[2]} ${parts[0]} ${parts[1]}`
             : str;
  const PREP = new Set(['a','ante','bajo','con','contra','de','desde','en','entre','hacia','hasta','para','por','sin','sobre','tras','el','la','los','las','un','una','al','del','y','e','o','u']);
  return format.toLowerCase().split(' ').map((w, i) =>
    i === 0 || !PREP.has(w) ? w.charAt(0).toUpperCase() + w.slice(1) : w
  ).join(' ');
}

function cleanText(str) {
  return str ? str.toString().trim() : '';
}

async function getOrCreateDocente(client, cedula, docente, facultad, programa) {
  const res = await client.query('SELECT cedula FROM docentes WHERE cedula = $1', [cedula]);
  if (res.rows.length === 0) {
    await client.query(
      `INSERT INTO docentes (cedula, nombre, facultad, programa, estado, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'Inactivo', NOW(), NOW())`,
      [cedula, docente, facultad || 'Sin Facultad', programa || 'Sin Programa']
    );
  }
}

/**
 * Aplica "fill-down" en las columnas indicadas para resolver celdas combinadas verticalmente.
 * Cuando xlsx lee un rango combinado, solo la primera celda tiene valor; las siguientes quedan vacías.
 * Este proceso copia el último valor hacia abajo hasta que aparece uno nuevo.
 */
function fillDown(rows, cols) {
  const lastVal = {};
  return rows.map(row => {
    const filled = [...row];
    for (const col of cols) {
      if (col === -1) continue;
      if (filled[col] !== '' && filled[col] !== undefined) {
        lastVal[col] = filled[col];
      } else if (lastVal[col] !== undefined) {
        filled[col] = lastVal[col];
      }
    }
    return filled;
  });
}

async function run() {
  const client = new Client({
    host: 'localhost', database: 'gestion_uq_db', user: 'gestion_uq', password: 'gestion_uq_2026'
  });
  await client.connect();

  const workbook = xlsx.readFile(FILE_PATH);
  let inserted = 0, updated = 0;

  for (const sheetName of workbook.SheetNames) {
    const tipo = sheetToTipo[sheetName];
    if (!tipo) continue;

    const worksheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    // Encontrar fila de headers
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(20, rawData.length); i++) {
      if (rawData[i].some(c => typeof c === 'string' && (c.toUpperCase().includes('CÉDULA') || c.toUpperCase().includes('CEDULA')))) {
        headerRowIndex = i;
        break;
      }
    }
    if (headerRowIndex === -1) continue;

    const headers = rawData[headerRowIndex].map(h => typeof h === 'string' ? h.toUpperCase().trim() : String(h));

    const cedulaIdx  = headers.findIndex(h => h.includes('CÉDULA') || h.includes('CEDULA'));
    const tituloIdx  = headers.findIndex(h => h.includes('TITULO') || h.includes('TÍTULO') || h.includes('NOMBRE DEL ARTICULO') || h.includes('NOMBRE DEL ARTÍCULOS'));
    const autorIdx   = headers.findIndex(h => h === 'AUTOR' || h === 'DOCENTE' || h === 'PROFESOR SOLICITANTE');
    const estadoIdx  = headers.findIndex(h => h.includes('APROBADO O NEGADO') || h === 'ESTADO');
    const actaIdx    = headers.findIndex(h => h.includes('ACTA / AÑO CIARP') || h.includes('ACTA Y FECHA CEI'));
    const ptsIdx     = headers.findIndex(h => h.includes('PUNTAJE AUTOR'));
    const facultadIdx= headers.findIndex(h => h === 'FACULTAD');
    const progIdx    = headers.findIndex(h => h === 'DEPENDENCIA');

    if (cedulaIdx === -1) continue;

    // Aplicar fill-down en todas las columnas clave para resolver celdas combinadas
    const keyCols = [cedulaIdx, tituloIdx, autorIdx, estadoIdx, actaIdx, ptsIdx, facultadIdx, progIdx].filter(c => c !== -1);
    const filledRows = fillDown(rawData.slice(headerRowIndex + 1), keyCols);

    for (const row of filledRows) {
      const cedula = row[cedulaIdx] ? String(row[cedulaIdx]).replace(/\D/g, '') : '';
      if (!cedula) continue;

      let titulo = tituloIdx !== -1 ? cleanText(row[tituloIdx]) : '';
      if (!titulo && tipo === 'ascenso') titulo = 'Ascenso';
      if (!titulo) continue;

      const docente    = autorIdx !== -1   ? formatName(cleanText(row[autorIdx]))   : '';
      const estadoStr  = estadoIdx !== -1  ? cleanText(row[estadoIdx]).toUpperCase() : '';
      const acta_ciarp = actaIdx !== -1    ? cleanText(row[actaIdx])                 : '';
      const pts        = ptsIdx !== -1     ? parseFloat(String(row[ptsIdx]).replace(/,/g, '.')) || null : null;
      const facultad   = facultadIdx !== -1 ? cleanText(row[facultadIdx])            : '';
      const programa   = progIdx !== -1    ? cleanText(row[progIdx])                  : '';

      let estado = 'recibida';
      if      (estadoStr.includes('APROBADO'))  estado = 'aprobado';
      else if (estadoStr.includes('NEGADO'))    estado = 'rechazado';
      else if (estadoStr.includes('PENDIENTE')) estado = 'evaluacion_interna';
      else if (estadoStr.includes('ARTICULO'))  estado = 'evaluacion_interna'; // Ascensos tipo artículo

      await getOrCreateDocente(client, cedula, docente, facultad, programa);

      const check = await client.query(
        `SELECT id, estado FROM solicitudes WHERE cedula = $1 AND LOWER(titulo) = LOWER($2) LIMIT 1`,
        [cedula, titulo]
      );

      if (check.rows.length > 0) {
        await client.query(
          `UPDATE solicitudes SET
             acta_ciarp = COALESCE($1, acta_ciarp),
             pts_asig   = COALESCE($2, pts_asig),
             estado     = $3,
             updated_at = NOW()
           WHERE id = $4`,
          [acta_ciarp || null, pts, estado !== 'recibida' ? estado : check.rows[0].estado, check.rows[0].id]
        );
        updated++;
      } else {
        const id = 'SOL-2026-PROD-' + crypto.randomUUID().split('-')[0];
        await client.query(
          `INSERT INTO solicitudes (id, docente, cedula, tipo, titulo, estado, facultad, programa, acta_ciarp, pts_sug, pts_asig, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())`,
          [id, docente, cedula, tipo, titulo, estado, facultad, programa, acta_ciarp, pts, pts]
        );
        inserted++;
      }
    }
  }

  console.log('─── RESUMEN IMPORTACIÓN ───────────────────────────');
  console.log(`✅ Nuevas insertadas:          ${inserted}`);
  console.log(`🔄 Actualizadas (ya existían): ${updated}`);
  await client.end();
}

run().catch(console.error);
