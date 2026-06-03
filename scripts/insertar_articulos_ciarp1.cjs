const xlsx = require('xlsx');
const { Client } = require('pg');
const crypto = require('crypto');

const client = new Client({
  user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db',
  password: 'gestion_uq_2026', port: 5432
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

async function run() {
  await client.connect();

  const cfg = { nombre: 'Pub_Rev_Index', tipo: 'articulo_indexado', colCedula: 16, colTitulo: 3, colPts: 23, colActa: 25, headerRow: 1 };
  const filas = extraerFilasProducto(cfg.nombre, { ...cfg, filtroActa: '18/03/2026' });

  console.log(`Insertando ${filas.length} artículos indexados faltantes desde el Excel al CIARP 1...`);

  for (const f of filas) {
    const id = crypto.randomUUID();
    // Lo guardamos como revista_a1 para que asuma el tipo de artículo en BD
    await client.query(`
      INSERT INTO solicitudes (id, cedula, tipo, titulo, pts_asig, acta_ciarp, etapa, estado, fecha)
      VALUES ($1, $2, 'revista_a1', $3, $4, '1- 18/03/2026', 'acta', 'aprobado', NOW())
    `, [id, f.cedula, f.titulo, f.pts]);
  }

  console.log('✅ Inserción completa.');
  await client.end();
}

run().catch(console.error);
