/**
 * migrate_hv_json_to_db.js
 * Recorre la carpeta public/data/hv/*.json e importa la información de las hojas de vida
 * (títulos, experiencias, estado) en la base de datos relacional PostgreSQL local.
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME     || 'gestion_uq_db',
  user:     process.env.DB_USER     || 'gestion_uq',
  password: process.env.DB_PASSWORD || 'gestion_uq_2026',
});

// Función auxiliar para parsear fechas de forma segura (soporta DD-MM-YYYY, YYYY-MM-DD y número serial de Excel)
function parseFecha(fechaRaw) {
  if (!fechaRaw) return null;
  const str = String(fechaRaw).trim();
  if (!str) return null;

  // 1. Si es formato serial de Excel
  if (/^\d+(\.\d+)?$/.test(str)) {
    const val = parseFloat(str);
    const ep = new Date(1900, 0, 1);
    ep.setDate(ep.getDate() + val - 2);
    if (!isNaN(ep.getTime())) {
      return ep.toISOString().split('T')[0];
    }
  }

  // 2. Si es DD-MM-YYYY
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(str)) {
    const parts = str.split('-');
    const formatted = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    const d = new Date(formatted);
    if (!isNaN(d.getTime())) return formatted;
  }

  // 3. Fallback estándar
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }

  return null;
}

async function run() {
  console.log('🚀 Iniciando migración de Hojas de Vida (JSON → DB)...');
  const hvDir = path.join(__dirname, '..', '..', 'public', 'data', 'hv');

  if (!fs.existsSync(hvDir)) {
    console.error(`❌ No existe el directorio de hojas de vida: ${hvDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(hvDir).filter(f => f.endsWith('.json'));
  console.log(`📋 Se encontraron ${files.length} archivos JSON.`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Limpiar tablas antes de repoblar
    console.log('🧹 Limpiando tablas de títulos y experiencias existentes...');
    await client.query('DELETE FROM docente_titulos');
    await client.query('DELETE FROM docente_experiencias');

    let importados = 0;
    let titulosCount = 0;
    let experienciasCount = 0;
    let skippedCount = 0;

    for (const file of files) {
      const filePath = path.join(hvDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      let hv;
      try {
        hv = JSON.parse(content);
      } catch (err) {
        console.error(`⚠️ Error parseando JSON en archivo ${file}:`, err.message);
        continue;
      }

      const cedula = String(hv.cedula || file.replace('.json', '')).trim();
      const estado = String(hv.estado || 'ACTIVO').toUpperCase().trim();

      // Verificar si el docente existe en la tabla de docentes
      const { rows: docentes } = await client.query(
        'SELECT cedula FROM docentes WHERE cedula = $1',
        [cedula]
      );

      if (docentes.length === 0) {
        skippedCount++;
        continue; // Omitir títulos y experiencias si el docente no existe en DB
      }

      // 1. Actualizar el estado del docente en la tabla docentes
      await client.query(
        'UPDATE docentes SET estado = $1 WHERE cedula = $2',
        [estado, cedula]
      );
      importados++;

      // 2. Procesar títulos
      if (Array.isArray(hv.titulos)) {
        for (const t of hv.titulos) {
          const tNac = t.tituloNacional || t.titulo || '';
          const tSnies = t.tituloSnies || '';
          const tFecha = parseFecha(t.fecha);
          const tPuntos = Number(t.puntos) || 0;

          await client.query(
            `INSERT INTO docente_titulos (cedula, titulo_nacional, titulo_snies, fecha, puntos)
             VALUES ($1, $2, $3, $4, $5)`,
            [cedula, tNac, tSnies, tFecha, tPuntos]
          );
          titulosCount++;
        }
      }

      // 3. Procesar experiencias
      if (Array.isArray(hv.experiencias)) {
        for (const e of hv.experiencias) {
          const inst = e.institucion || '';
          const cargo = e.cargo || '';
          const fInicio = parseFecha(e.fechaInicio || e.fecha_inicio);
          const fFin = parseFecha(e.fechaFin || e.fecha_fin);
          const pts = Number(e.puntos) || 0;

          if (inst || cargo) {
            await client.query(
              `INSERT INTO docente_experiencias (cedula, institucion, cargo, fecha_inicio, fecha_fin, puntos)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [cedula, inst, cargo, fInicio, fFin, pts]
            );
            experienciasCount++;
          }
        }
      }
    }

    await client.query('COMMIT');
    console.log(`\n✅ Migración finalizada con éxito:`);
    console.log(`   - Docentes actualizados (estado): ${importados}`);
    console.log(`   - Títulos insertados:             ${titulosCount}`);
    console.log(`   - Experiencias insertadas:        ${experienciasCount}`);
    console.log(`   - Archivos JSON omitidos (no DB): ${skippedCount}`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error general durante la migración de HV. Se hizo ROLLBACK:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
