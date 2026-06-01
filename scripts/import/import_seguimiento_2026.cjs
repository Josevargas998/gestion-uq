const fs = require('fs');
const xlsx = require('xlsx');
const { Client } = require('pg');
const crypto = require('crypto');

const FILE_PATH = 'C:\\Users\\JHVEspinosa\\Downloads\\seguimiento 2026\\seguimiento.xlsx';

const sheetToTipo = {
  'Artículos Index.': 'articulo_indexado', // En DB puede llamarse revista_a1 pero en data.js articulo_indexado
  'Texto': 'libro_texto',
  'Ensayo': 'libro_ensayo',
  'Lib Investigación': 'libro_investigacion',
  'Patente': 'patente',
  'Obra Artistica': 'obra_artistica',
  'Premio': 'premio',
  'Producción Técnica ': 'produccion_tecnica',
  'Títulos': 'titulo',
  'Software': 'software',
  'Producción Audiovisual': 'video',
  'Ascensos ': 'ascenso',
  'Ponencias': 'ponencia',
  'Artículos Rev No Index': 'articulo_no_indexado',
  'Tesis': 'tesis',
  'Pos Doctorado': 'posdoctorado'
};

function formatName(str) {
  if (!str) return 'Sin autor';
  str = str.replace(/\s+/g, ' ').trim().toUpperCase();
  const parts = str.split(' ');
  let format = '';
  if (parts.length === 4) format = `${parts[2]} ${parts[3]} ${parts[0]} ${parts[1]}`;
  else if (parts.length === 3) format = `${parts[2]} ${parts[0]} ${parts[1]}`;
  else format = str;

  const PREPOSITIONS_ARTICLES = new Set([
    'a', 'ante', 'bajo', 'cabe', 'con', 'contra', 'de', 'desde', 'durante', 'en', 'entre', 'hacia', 'hasta', 'mediante', 'para', 'por', 'según', 'sin', 'so', 'sobre', 'tras', 'versus', 'vía',
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'al', 'del',
    'y', 'e', 'ni', 'o', 'u', 'pero', 'mas', 'sino', 'porque', 'si', 'como', 'que'
  ]);

  return format.toLowerCase().split(' ').map((word, index) => {
    if (index === 0 || !PREPOSITIONS_ARTICLES.has(word)) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    }
    return word;
  }).join(' ');
}

function cleanText(str) {
  if (!str) return '';
  return str.toString().trim();
}

async function getOrCreateDocente(client, cedula, docente, facultad, programa) {
  const res = await client.query('SELECT cedula FROM docentes WHERE cedula = $1', [cedula]);
  if (res.rows.length === 0) {
    const estado = 'Inactivo'; 
    await client.query(
      `INSERT INTO docentes (cedula, nombre, facultad, programa, estado, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [cedula, docente, facultad || 'Sin Facultad', programa || 'Sin Programa', estado]
    );
  }
}

async function run() {
  const client = new Client({
    host: 'localhost', database: 'gestion_uq_db', user: 'gestion_uq', password: 'gestion_uq_2026'
  });
  await client.connect();

  const workbook = xlsx.readFile(FILE_PATH);
  
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  
  for (const sheetName of workbook.SheetNames) {
    const tipo = sheetToTipo[sheetName];
    if (!tipo) continue;

    const worksheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    
    let headerRowIndex = -1;
    let headers = [];
    for (let i = 0; i < Math.min(20, rawData.length); i++) {
      const row = rawData[i];
      if (row.some(c => typeof c === 'string' && (c.toUpperCase().includes('CÉDULA') || c.toUpperCase().includes('CEDULA')))) {
        headerRowIndex = i;
        headers = row.map(h => typeof h === 'string' ? h.toUpperCase().trim() : String(h));
        break;
      }
    }
    
    if (headerRowIndex === -1) continue;

    const tituloIdx = headers.findIndex(h => h.includes('TITULO') || h.includes('TÍTULO') || h.includes('NOMBRE DEL ARTICULO') || h.includes('NOMBRE DEL ARTÍCULOS'));
    const autorIdx = headers.findIndex(h => h === 'AUTOR' || h === 'DOCENTE' || h === 'PROFESOR SOLICITANTE');
    const cedulaIdx = headers.findIndex(h => h.includes('CÉDULA') || h.includes('CEDULA'));
    const estadoIdx = headers.findIndex(h => h.includes('APROBADO O NEGADO') || h === 'ESTADO');
    const actaIdx = headers.findIndex(h => h.includes('ACTA / AÑO CIARP') || h.includes('ACTA Y FECHA CEI'));
    const ptsIdx = headers.findIndex(h => h.includes('PUNTAJE AUTOR'));
    const facultadIdx = headers.findIndex(h => h === 'FACULTAD');
    const programaIdx = headers.findIndex(h => h === 'DEPENDENCIA');

    if (cedulaIdx === -1) continue;

    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
      const row = rawData[i];
      let cedula = row[cedulaIdx] ? String(row[cedulaIdx]).replace(/\D/g, '') : '';
      if (!cedula) continue;
      
      let titulo = tituloIdx !== -1 ? cleanText(row[tituloIdx]) : 'Sin título';
      if (!titulo && tipo === 'ascenso') titulo = 'Ascenso'; 
      if (!titulo) continue;

      let docente = autorIdx !== -1 ? formatName(cleanText(row[autorIdx])) : '';
      let estadoStr = estadoIdx !== -1 ? cleanText(row[estadoIdx]).toUpperCase() : '';
      let acta_ciarp = actaIdx !== -1 ? cleanText(row[actaIdx]) : '';
      let pts = ptsIdx !== -1 ? parseFloat(String(row[ptsIdx]).replace(/,/g, '.')) || null : null;
      let facultad = facultadIdx !== -1 ? cleanText(row[facultadIdx]) : '';
      let programa = programaIdx !== -1 ? cleanText(row[programaIdx]) : '';

      let estado = 'recibida';
      if (estadoStr.includes('APROBADO')) estado = 'aprobado';
      else if (estadoStr.includes('NEGADO')) estado = 'rechazado';
      else if (estadoStr.includes('PENDIENTE')) estado = 'evaluacion_interna';

      // Insertar docente si no existe
      await getOrCreateDocente(client, cedula, docente, facultad, programa);

      const check = await client.query(
        `SELECT id, estado FROM solicitudes WHERE cedula = $1 AND LOWER(titulo) = LOWER($2) LIMIT 1`,
        [cedula, titulo]
      );

      if (check.rows.length > 0) {
        await client.query(
          `UPDATE solicitudes SET acta_ciarp = COALESCE($1, acta_ciarp), pts_asig = COALESCE($2, pts_asig), estado = $3, updated_at = NOW() WHERE id = $4`,
          [acta_ciarp || null, pts, estado !== 'recibida' ? estado : check.rows[0].estado, check.rows[0].id]
        );
        updated++;
      } else {
        const id = 'SOL-2026-PROD-' + crypto.randomUUID().split('-')[0];
        await client.query(
          `INSERT INTO solicitudes (id, docente, cedula, tipo, titulo, estado, facultad, programa, acta_ciarp, pts_sug, pts_asig, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
          [id, docente, cedula, tipo, titulo, estado, facultad, programa, acta_ciarp, pts, pts]
        );
        inserted++;
      }
    }
  }

  console.log('--- RESUMEN IMPORTACIÓN ---');
  console.log(`✅ Insertadas nuevas: ${inserted}`);
  console.log(`🔄 Actualizadas (ya existían): ${updated}`);
  
  await client.end();
}

run().catch(console.error);
