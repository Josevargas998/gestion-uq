const fs = require('fs');
const { parse } = require('csv-parse');
const { Client } = require('pg');
const crypto = require('crypto');

const client = new Client({
  host: 'localhost', database: 'gestion_uq_db', user: 'gestion_uq', password: 'gestion_uq_2026'
});

const CSV_FILE = 'C:\\Users\\JHVEspinosa\\Downloads\\historico\\ciarp_historico.csv';

// Helpers
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

function formatProgramaName(str) {
  if (!str) return 'Sin programa';
  let p = str.toUpperCase().trim();
  p = p.replace(/^(DIRECCI[OÓ]N\s+DEL\s+PROGRAMA\s+DE\s+)/, '');
  p = p.replace(/^(DIRECCION\s+)/, '');
  p = p.replace(/^(PROGRAMA\s+DE\s+)/, '');
  p = p.replace(/\s+(DIURNA|NOCTURNA|DISTANCIA)$/, '');
  p = `PROGRAMA DE ${p}`;
  return p.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

function cleanText(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

const tipoMapping = {
  'Cambio de Categoria.xlsx': 'ascenso',
  'LibroEnsayo.xlsx': 'libro_ensayo',
  'LibroInvestigacion.xlsx': 'libro_investigacion',
  'LibroTexto.xlsx': 'libro_texto',
  'Obras_Artisticas.xlsx': 'obra_artistica',
  'Patentes.xlsx': 'patente',
  'Premios.xlsx': 'premio',
  'Produccion_Tecnica.xlsx': 'produccion_tecnica',
  'PublicacionRevistaIndexada.xlsx': 'articulo_indexado',
  'Software.xlsx': 'software',
  'Titulos.xlsx': 'titulo_academico',
  'Cambio de Categoria.xls': 'ascenso',
  'LibroEnsayo.xls': 'libro_ensayo',
  'LibroInvestigacion.xls': 'libro_investigacion',
  'LibroTexto.xls': 'libro_texto',
  'Obras_Artisticas.xls': 'obra_artistica',
  'Patentes.xls': 'patente',
  'Premios.xls': 'premio',
  'Produccion_Tecnica.xls': 'produccion_tecnica',
  'PublicacionRevistaIndexada.xls': 'articulo_indexado',
  'Software.xls': 'software',
  'Titulos.xls': 'titulo_academico'
};

async function run() {
  await client.connect();

  console.log('1. Eliminando históricos anteriores...');
  const resDel = await client.query("DELETE FROM solicitudes WHERE id LIKE 'HIST-%'");
  console.log(`Borrados: ${resDel.rowCount}`);

  console.log('2. Procesando CSV...');
  const records = [];
  const docentesParaInsertar = new Map();
  
  const parser = fs.createReadStream(CSV_FILE).pipe(parse({
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true
  }));

  for await (const row of parser) {
    const fileName = (row['archivo_origen'] || '').split('\\').pop();
    const tipo = tipoMapping[fileName] || 'articulo_no_indexado';

    const tituloOriginal = row['NOMBRE DEL LIBRO'] || row['TITULO OBRA ARTÍSTICA'] || row['TITULO OBRA ARTSTICA'] || row['TITULO PATENTE'] || row['TITULO PREMIO'] || row['TITULO PRODUCCION TÉCNICA'] || row['TITULO PRODUCCION TCNICA'] || row['TITULO ARTÍCULO'] || row['TITULO ARTCULO'] || row['NOMBRE DEL SOFTWARE'] || row['TÍTULO OTORGADO'] || row['TTULO OTORGADO'] || '';
    
    let titulo = cleanText(tituloOriginal);
    if (tipo === 'ascenso') {
      titulo = `Cambio de Categoría a ${row['CATEGORÍA APROBADA'] || row['CATEGORA APROBADA'] || 'Nueva'}`;
    }

    let cedula = row['DOCUMENTO DE IDENTIDAD'] || row['DOCUMENTO DE IDENTIFICACIÓN'] || row['DOCUMENTO DE IDENTIFICACIN'];
    if (cedula) { cedula = cedula.replace(/\D/g, ''); }
    if (!cedula) cedula = '000000';

    let pts = row['PUNTOS ASIGNADOS'] || row['PUNTOS'] || row['PUNTAJE'] || 0;
    pts = parseFloat(String(pts).replace(/,/g, '.')) || 0;

    const fechaRaw = row['FECHA ASCENSO'] || row['FECHA RESOLUCIÓN'] || row['FECHA RESOLUCIN'] || row['FECHA PRESENTACION'] || row['FECHA GRADUACIÓN'] || row['FECHA GRADUACIN'] || '';
    let fecha = null;
    if (fechaRaw) {
      const match = fechaRaw.match(/^(\d{4}-\d{2}-\d{2})/);
      if (match) fecha = match[1];
    }
    if (!fecha) fecha = '2000-01-01'; // Default

    const docente = formatName(row['NOMBRE DEL DOCENTE'] || row['AUTORES'] || 'Sin Autor');
    const programa = formatProgramaName(row['PROGRAMA']);
    const acta = row['RESOLUCIÓN'] || row['RESOLUCIN'] || row['NÚMERO RESOLUCIÓN'] || row['NMERO RESOLUCIN'] || 'N/A';
    const revista = row['NOMBRE REVISTA'] || null;

    const id = `HIST-${fecha.split('-')[0]}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;

    // Add to docent missing set if not empty
    docentesParaInsertar.set(cedula, { nombre: docente, programa });

    records.push({
      id,
      cedula,
      docente,
      programa,
      facultad: 'Histórico',
      tipo,
      titulo,
      pts_asig: pts,
      estado: tipo === 'ascenso' ? 'aprobado_cei' : 'aprobado',
      etapa: 'archivada',
      fecha,
      acta_ciarp: acta,
      revista
    });
  }

  // Pre-insert missing teachers so FK doesn't fail
  console.log('3. Validando docentes existentes...');
  const { rows: existingDocentes } = await client.query('SELECT cedula FROM docentes');
  const existingCedulas = new Set(existingDocentes.map(r => String(r.cedula)));
  
  let docsInserted = 0;
  for (const [ced, info] of docentesParaInsertar.entries()) {
    if (!existingCedulas.has(ced)) {
      try {
        await client.query(`
          INSERT INTO docentes (cedula, nombre, programa, facultad, estado, categoria, dedicacion, pts_acumulados, pts_total_salarial)
          VALUES ($1, $2, $3, $4, 'INACTIVO', 'ASISTENTE', 'Tiempo Completo', 0, 0)
        `, [ced, info.nombre, info.programa, 'Desconocida']);
        docsInserted++;
      } catch(e) {}
    }
  }
  console.log(`Docentes inactivos creados: ${docsInserted}`);

  console.log(`4. Insertando ${records.length} solicitudes...`);
  const queryText = `
    INSERT INTO solicitudes (id, cedula, docente, programa, facultad, tipo, titulo, pts_asig, estado, etapa, fecha, acta_ciarp, revista, created_at, notas)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), 'Migración histórica de PowerBI')
  `;

  let inserted = 0;
  for (const r of records) {
    try {
      await client.query(queryText, [
        r.id, r.cedula, r.docente, r.programa, r.facultad, r.tipo, r.titulo, r.pts_asig, r.estado, r.etapa, r.fecha, r.acta_ciarp, r.revista
      ]);
      inserted++;
    } catch (e) {
      console.error(`Error insertando ${r.id}: ${e.message}`);
    }
  }

  console.log(`✅ ¡Importación completada! Se insertaron ${inserted} registros históricos.`);

  await client.end();
}

run().catch(console.error);
