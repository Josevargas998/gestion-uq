const fs = require('fs');
const { parse } = require('csv-parse');
const { Client } = require('pg');

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
  'Cambio de Categoria.xlsx': 'cambio_categoria',
  'LibroEnsayo.xlsx': 'libro_ensayo',
  'LibroInvestigacion.xlsx': 'libro_investigacion',
  'LibroTexto.xlsx': 'libro_texto',
  'Obras_Artisticas.xlsx': 'obra_artistica',
  'Patentes.xlsx': 'patente',
  'Premios.xlsx': 'premio',
  'Produccion_Tecnica.xlsx': 'prod_tecnica',
  'PublicacionRevistaIndexada.xlsx': 'revista_indexada',
  'Software.xlsx': 'software',
  'Titulos.xlsx': 'titulo_academico',
  'Cambio de Categoria.xls': 'cambio_categoria',
  'LibroEnsayo.xls': 'libro_ensayo',
  'LibroInvestigacion.xls': 'libro_investigacion',
  'LibroTexto.xls': 'libro_texto',
  'Obras_Artisticas.xls': 'obra_artistica',
  'Patentes.xls': 'patente',
  'Premios.xls': 'premio',
  'Produccion_Tecnica.xls': 'prod_tecnica',
  'PublicacionRevistaIndexada.xls': 'revista_indexada',
  'Software.xls': 'software',
  'Titulos.xls': 'titulo_academico'
};

async function run() {
  await client.connect();

  console.log('1. TRUNCANDO tabla productividad_historica...');
  await client.query("TRUNCATE TABLE productividad_historica RESTART IDENTITY");

  console.log('2. Procesando CSV...');
  const records = [];
  
  const parser = fs.createReadStream(CSV_FILE).pipe(parse({
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true
  }));

  for await (const row of parser) {
    const fileName = (row['archivo_origen'] || '').split('\\').pop();
    const categoria = tipoMapping[fileName] || 'revista_indexada';

    const tituloOriginal = row['NOMBRE DEL LIBRO'] || row['TITULO OBRA ARTÍSTICA'] || row['TITULO OBRA ARTSTICA'] || row['TITULO PATENTE'] || row['TITULO PREMIO'] || row['TITULO PRODUCCION TÉCNICA'] || row['TITULO PRODUCCION TCNICA'] || row['TITULO ARTÍCULO'] || row['TITULO ARTCULO'] || row['NOMBRE DEL SOFTWARE'] || row['TÍTULO OTORGADO'] || row['TTULO OTORGADO'] || '';
    
    let titulo = cleanText(tituloOriginal);
    if (categoria === 'cambio_categoria') {
      titulo = `Cambio de Categoría a ${row['CATEGORÍA APROBADA'] || row['CATEGORA APROBADA'] || 'Nueva'}`;
    }

    let cedula = row['DOCUMENTO DE IDENTIDAD'] || row['DOCUMENTO DE IDENTIFICACIÓN'] || row['DOCUMENTO DE IDENTIFICACIN'];
    if (cedula) { cedula = cedula.replace(/\D/g, ''); }
    if (!cedula) cedula = '000000';

    let pts = row['PUNTOS ASIGNADOS'] || row['PUNTOS'] || row['PUNTAJE'] || 0;
    pts = parseFloat(String(pts).replace(/,/g, '.')) || 0;

    const fechaRaw = row['FECHA ASCENSO'] || row['FECHA RESOLUCIÓN'] || row['FECHA RESOLUCIN'] || row['FECHA PRESENTACION'] || row['FECHA GRADUACIÓN'] || row['FECHA GRADUACIN'] || '';
    let fecha_resolucion = null;
    let anio = null;
    if (fechaRaw) {
      const match = fechaRaw.match(/^(\d{4})-\d{2}-\d{2}/);
      if (match) {
        fecha_resolucion = fechaRaw.split(' ')[0]; // yyyy-mm-dd
        anio = parseInt(match[1], 10);
      }
    }
    // Si no hay año en fecha, tratamos de sacarlo del archivo
    if (!anio) {
      const match = (row['archivo_origen'] || '').match(/\\\\(\d{4})\\\\/);
      if (match) anio = parseInt(match[1], 10);
      else anio = 2000;
    }

    const docente = formatName(row['NOMBRE DEL DOCENTE'] || row['AUTORES'] || 'Sin Autor');
    const programa = formatProgramaName(row['PROGRAMA']);
    const numero_resolucion = row['RESOLUCIÓN'] || row['RESOLUCIN'] || row['NÚMERO RESOLUCIÓN'] || row['NMERO RESOLUCIN'] || '';
    const revista = row['NOMBRE REVISTA'] || null;
    const categoria_revista = row['CATEGORIA'] || row['CATEGORÍA'] || null;

    records.push({
      cedula, docente, programa, categoria, titulo, revista, categoria_revista, puntos: pts, anio, numero_resolucion, fecha_resolucion
    });
  }

  console.log(`4. Insertando ${records.length} solicitudes en productividad_historica...`);
  const queryText = `
    INSERT INTO productividad_historica (cedula, docente, programa, categoria, titulo, revista, categoria_revista, puntos, anio, numero_resolucion, fecha_resolucion)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `;

  let inserted = 0;
  for (const r of records) {
    try {
      await client.query(queryText, [
        r.cedula, r.docente, r.programa, r.categoria, r.titulo, r.revista, r.categoria_revista, r.puntos, r.anio, r.numero_resolucion, r.fecha_resolucion
      ]);
      inserted++;
    } catch (e) {
      console.error(`Error insertando: ${e.message}`);
    }
  }

  console.log(`✅ ¡Importación completada en tabla correcta! Se insertaron ${inserted} registros históricos.`);

  // Opcional: Eliminar los 'HIST-%' de la tabla solicitudes que inserté antes por error
  const resDel = await client.query("DELETE FROM solicitudes WHERE id LIKE 'HIST-%'");
  console.log(`Limpiados ${resDel.rowCount} registros HIST- de la tabla solicitudes (ya no son necesarios allí).`);

  await client.end();
}

run().catch(console.error);
