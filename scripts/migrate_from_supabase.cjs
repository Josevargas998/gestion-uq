/**
 * migrate_from_supabase.cjs — Migra datos de Supabase → PostgreSQL local
 */

const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://viqtctlkvzrhohikwbop.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY;

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME     || 'gestion_uq_db',
  user:     process.env.DB_USER     || 'gestion_uq',
  password: process.env.DB_PASSWORD || 'gestion_uq_2026',
});

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchAll(table, select = '*') {
  let todos = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(offset, offset + limit - 1);
    if (error) throw new Error(`Error en ${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    todos = todos.concat(data);
    if (data.length < limit) break;
    offset += limit;
    console.log(`  ${table}: ${todos.length} filas...`);
  }
  return todos;
}

async function main() {
  console.log('🚀 Iniciando restauración de base de datos desde Supabase...');
  const client = await pool.connect();
  try {
    // Limpiar tablas primero
    console.log('🧹 Limpiando tablas locales...');
    await client.query('TRUNCATE TABLE solicitudes, docentes CASCADE');

    console.log('📋 Migrando docentes...');
    const docentes = await fetchAll('docentes');
    for (const r of docentes) {
      await client.query(
        `INSERT INTO docentes
         (no, cedula, nombre, facultad, programa, categoria, escolaridad,
          especializacion, maestria, doctorado, dedicacion, fecha_ingreso,
          pts_acumulados, tope, pts_ciarp1_2026, pts_favor, tope_libros,
          tope_software, pts_titulos_exp, pts_total_salarial, historial,
          comision, observacion, correo, created_at, updated_at, estado, lugar_expedicion)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)`,
        [
          r.no, r.cedula, r.nombre, r.facultad, r.programa, r.categoria,
          r.escolaridad, r.especializacion, r.maestria, r.doctorado,
          r.dedicacion, r.fecha_ingreso, r.pts_acumulados, r.tope,
          r.pts_ciarp1_2026, r.pts_favor, r.tope_libros, r.tope_software,
          r.pts_titulos_exp, r.pts_total_salarial,
          r.historial ? JSON.stringify(r.historial) : '{}',
          r.comision, r.observacion, r.correo, r.created_at, r.updated_at, r.estado || 'ACTIVO', r.lugar_expedicion
        ]
      );
    }
    console.log(`  ✅ ${docentes.length} docentes migrados`);

    console.log('📋 Migrando solicitudes...');
    const solicitudes = await fetchAll('solicitudes');
    for (const r of solicitudes) {
      await client.query(
        `INSERT INTO solicitudes
         (id, docente, coautor, cedula, programa, facultad, tipo, titulo, revista,
          fecha, etapa, estado, pts_sug, pts_asig, correo, notas, acta_ciarp,
          pares_ext, pares_int, timeline, memo_envio_int, fecha_envio_int,
          memo_recibo_int, fecha_recibo_int, memo_envio_ext, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
                 $18,$19,$20,$21,$22,$23,$24,$25,$26,$27)`,
        [
          r.id, r.docente, r.coautor, r.cedula, r.programa, r.facultad,
          r.tipo, r.titulo, r.revista, r.fecha, r.etapa, r.estado,
          r.pts_sug, r.pts_asig, r.correo, r.notes || r.notas, r.acta_ciarp,
          r.pares_ext ? JSON.stringify(r.pares_ext) : null,
          r.pares_int ? JSON.stringify(r.pares_int) : null,
          r.timeline ? JSON.stringify(r.timeline) : '[]',
          r.memo_envio_int, r.fecha_envio_int,
          r.memo_recibo_int, r.fecha_recibo_int,
          r.memo_envio_ext, r.created_at, r.updated_at
        ]
      );
    }
    console.log(`  ✅ ${solicitudes.length} solicitudes migradas`);

  } catch (e) {
    console.error('❌ Error durante la migración:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
