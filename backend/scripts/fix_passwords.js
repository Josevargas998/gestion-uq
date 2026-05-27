/**
 * fix_passwords.js
 * Arregla los hashes bcrypt de usuarios y crea simulaciones de TODOS los tipos de productos.
 */
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'gestion_uq',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'heriberto',
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('✅ Conectado a PostgreSQL');

    // ── 1. Arreglar passwords ──────────────────────────────────────
    const hash = await bcrypt.hash('profesorales@2026', 10);
    console.log('\n🔑 Hash generado:', hash.slice(0,20) + '...');

    const { rows: usuarios } = await client.query('SELECT cedula, nombre, rol FROM usuarios');
    console.log('\n👥 Usuarios encontrados:');
    usuarios.forEach(u => console.log(`  ${u.cedula} | ${u.nombre} | ${u.rol}`));

    await client.query('UPDATE usuarios SET password_hash = $1', [hash]);
    console.log(`\n✅ Password actualizado para ${usuarios.length} usuario(s)`);

    // ── 2. Verificar docentes disponibles ─────────────────────────
    const { rows: docentes } = await client.query(
      'SELECT cedula, nombre, programa, facultad, correo FROM docentes LIMIT 10'
    );
    console.log('\n👨‍🏫 Docentes disponibles:');
    docentes.forEach(d => console.log(`  ${d.cedula} | ${d.nombre}`));

    if (docentes.length === 0) {
      console.log('⚠️  No hay docentes — insertando docentes de ejemplo...');
      await client.query(`
        INSERT INTO docentes (cedula, nombre, programa, facultad, correo, categoria, vinculacion) VALUES
        ('70420310', 'Juan Carlos Pérez Mora', 'Física', 'Ciencias Básicas y Tecnologías', 'jcperez@uniquindio.edu.co', 'Asociado', 'planta'),
        ('24580502', 'María Elena Gómez Ruiz', 'Contaduría Pública', 'Ciencias Económicas y Administrativas', 'megomez@uniquindio.edu.co', 'Titular', 'planta'),
        ('9732828',  'Oscar Alexander Aguirre Obando', 'Biología', 'Ciencias Básicas y Tecnologías', 'oscaraguirre@uniquindio.edu.co', 'Asistente', 'planta'),
        ('41893527', 'Olga Alicia Nieto Cárdenas', 'Medicina', 'Ciencias de la Salud', 'oanieto@uniquindio.edu.co', 'Asociado', 'planta'),
        ('9730805',  'Jorge Alejandro Aldana Gutiérrez', 'Ing. Electrónica', 'Ingeniería', 'jaldana@uniquindio.edu.co', 'Asistente', 'planta'),
        ('11380439', 'Rafael Humberto Villamizar Vargas', 'Enfermería', 'Ciencias de la Salud', 'rhvillamizar@uniquindio.edu.co', 'Titular', 'planta'),
        ('16722850', 'Claudia Patricia Torres Henao', 'Derecho', 'Ciencias Jurídicas y Políticas', 'cptorres@uniquindio.edu.co', 'Asociado', 'planta'),
        ('18468271', 'Andrés Felipe Cardona Salazar', 'Ing. Industrial', 'Ingeniería', 'afcardona@uniquindio.edu.co', 'Asistente', 'planta'),
        ('31932185', 'Luz Marina Vargas Ospina', 'Matemáticas', 'Ciencias Básicas y Tecnologías', 'lmvargas@uniquindio.edu.co', 'Titular', 'planta'),
        ('42878234', 'Diana Carolina Restrepo López', 'Artes Plásticas', 'Bellas Artes y Humanidades', 'dcrestrepo@uniquindio.edu.co', 'Asistente', 'planta')
        ON CONFLICT (cedula) DO NOTHING
      `);
      const { rows: d2 } = await client.query('SELECT cedula, nombre FROM docentes LIMIT 10');
      d2.forEach(d => console.log(`  ✅ ${d.cedula} | ${d.nombre}`));
      docentes.push(...d2);
    }

    // ── 3. Eliminar simulaciones anteriores ─────────────────────────
    await client.query("DELETE FROM solicitudes WHERE id LIKE 'SOL-2026-SIM-%'");
    console.log('\n🗑️  Simulaciones anteriores eliminadas');

    // ── 4. Crear simulaciones de TODOS los tipos ──────────────────
    const d = docentes;
    const simulations = [
      // ARTÍCULOS CIENTÍFICOS
      {
        id: 'SOL-2026-SIM-001', cedula: d[0]?.cedula, tipo: 'revista_a1',
        titulo: 'Coexistencia de acoplamientos débil y fuerte en moléculas fotónicas: análisis cuántico',
        revista: 'Nanophotonics (Q1 - Scopus)',
        fecha: '2026-01-15', etapa: 'ciarp', estado: 'aprobado',
        pts_sug: 15, pts_asig: 15,
        notas: 'Artículo publicado en revista Q1 indexada en Scopus y WoS. Aprobado en CIARP 1/2026.',
        timeline: JSON.stringify([
          {f:'15 ene',a:'Solicitud recibida y firmada',p:'Contratista'},
          {f:'16 ene',a:'Clasificada: Artículo A1 → ruta directa CIARP',p:'Contratista'},
          {f:'18 mar',a:'Aprobado en CIARP 1/2026 — 15 puntos',p:'Jefe Oficina'}
        ])
      },
      {
        id: 'SOL-2026-SIM-002', cedula: d[1]?.cedula, tipo: 'revista_a2',
        titulo: 'Impacto de la digitalización financiera en pymes colombianas: análisis empírico 2020-2024',
        revista: 'Revista Innovar (Q2 - Scopus)',
        fecha: '2026-02-03', etapa: 'ciarp', estado: 'en_proceso',
        pts_sug: 12, pts_asig: null,
        notas: 'En espera de resolución CIARP.',
        timeline: JSON.stringify([
          {f:'3 feb',a:'Solicitud recibida',p:'Contratista'},
          {f:'4 feb',a:'Clasificada: Artículo A2 → ruta directa',p:'Contratista'},
          {f:'20 abr',a:'Presentado en CIARP 2/2026',p:'Jefe Oficina'}
        ])
      },
      {
        id: 'SOL-2026-SIM-003', cedula: d[2]?.cedula, tipo: 'revista_b',
        titulo: 'Modelamiento de distribución espacial de mosquitos Aedes aegypti en el Eje Cafetero',
        revista: 'Biomédica (Q3 - LILACS)',
        fecha: '2026-01-28', etapa: 'ciarp', estado: 'en_proceso',
        pts_sug: 8, pts_asig: null,
        notas: 'Pendiente acta CIARP.',
        timeline: JSON.stringify([
          {f:'28 ene',a:'Solicitud recibida',p:'Contratista'},
          {f:'29 ene',a:'Clasificada: Artículo B → ruta directa',p:'Contratista'}
        ])
      },
      {
        id: 'SOL-2026-SIM-004', cedula: d[3]?.cedula, tipo: 'revista_no_indexada',
        titulo: 'Factores de riesgo cardiovascular en adultos mayores del Quindío: estudio descriptivo',
        revista: 'Revista Médica del Quindío',
        fecha: '2026-03-10', etapa: 'clasificada', estado: 'en_proceso',
        pts_sug: 0, pts_asig: null,
        notas: 'Revista no indexada — sin puntos Decreto 1279. Se archivará con oficio informativo.',
        timeline: JSON.stringify([
          {f:'10 mar',a:'Solicitud recibida',p:'Contratista'},
          {f:'11 mar',a:'Clasificada: Sin indexación — 0 puntos',p:'Contratista'}
        ])
      },
      // LIBROS CON EVALUACIÓN INTERNA
      {
        id: 'SOL-2026-SIM-005', cedula: d[1]?.cedula, tipo: 'libro_texto',
        titulo: 'Contabilidad Financiera Aplicada: teoría y práctica para estudiantes universitarios',
        revista: null,
        fecha: '2026-01-20', etapa: 'pares_externos', estado: 'en_proceso',
        pts_sug: 15, pts_asig: null,
        notas: 'Concepto Consejo Curricular: aprobado. Pares externos asignados.',
        timeline: JSON.stringify([
          {f:'20 ene',a:'Solicitud recibida',p:'Contratista'},
          {f:'21 ene',a:'Clasificada: Libro Texto → Consejo Curricular',p:'Contratista'},
          {f:'10 feb',a:'Memorando al Consejo Curricular enviado',p:'Contratista'},
          {f:'5 mar',a:'Concepto aprobado por Consejo Curricular',p:'Consejo Curricular'},
          {f:'15 mar',a:'Pares externos asignados (plazo 30 días)',p:'Contratista'}
        ])
      },
      {
        id: 'SOL-2026-SIM-006', cedula: d[3]?.cedula, tipo: 'libro_ensayo',
        titulo: 'El riesgo cardiovascular: entre la genética y la epigenética — nuevas perspectivas',
        revista: null,
        fecha: '2026-02-14', etapa: 'pares_internos', estado: 'en_proceso',
        pts_sug: 15, pts_asig: null,
        notas: 'Memorando enviado al Consejo de Facultad. Esperando concepto.',
        timeline: JSON.stringify([
          {f:'14 feb',a:'Solicitud recibida',p:'Contratista'},
          {f:'15 feb',a:'Clasificada: Libro Ensayo → Consejo de Facultad',p:'Contratista'},
          {f:'16 feb',a:'Memorando 2026-IM-1120 enviado',p:'Contratista'}
        ])
      },
      {
        id: 'SOL-2026-SIM-007', cedula: d[2]?.cedula, tipo: 'libro_investigacion',
        titulo: 'Biodiversidad de artrópodos en ecosistemas de bosque seco tropical colombiano',
        revista: null,
        fecha: '2026-01-30', etapa: 'pares_externos', estado: 'en_proceso',
        pts_sug: 20, pts_asig: null,
        notas: 'Dos pares externos asignados. Uno ya entregó evaluación favorable.',
        timeline: JSON.stringify([
          {f:'30 ene',a:'Solicitud recibida',p:'Contratista'},
          {f:'31 ene',a:'Clasificada: Libro Investigación → pares externos',p:'Contratista'},
          {f:'5 mar',a:'Par 1 entregó evaluación: APROBADO',p:'Par Externo'},
          {f:'20 abr',a:'Par 2 entregó evaluación: APROBADO',p:'Par Externo'}
        ])
      },
      // SOFTWARE
      {
        id: 'SOL-2026-SIM-008', cedula: d[4]?.cedula, tipo: 'software',
        titulo: 'Sistema de Gestión de Inventarios para Microempresas del Quindío — versión 2.0',
        revista: null,
        fecha: '2026-02-20', etapa: 'pares_internos', estado: 'en_proceso',
        pts_sug: 15, pts_asig: null,
        notas: 'Memorando enviado al Consejo Técnico de Software. Esperando concepto interno.',
        timeline: JSON.stringify([
          {f:'20 feb',a:'Solicitud recibida',p:'Contratista'},
          {f:'21 feb',a:'Clasificada: Software → Consejo Técnico Software',p:'Contratista'},
          {f:'22 feb',a:'Memorando 2026-IM-1230 enviado',p:'Contratista'}
        ])
      },
      // PRODUCCIÓN TÉCNICA
      {
        id: 'SOL-2026-SIM-009', cedula: d[5]?.cedula, tipo: 'produccion_tecnica',
        titulo: 'Protocolo de bioseguridad para manejo de residuos hospitalarios en IPS de mediana complejidad',
        revista: null,
        fecha: '2026-03-05', etapa: 'pares_externos', estado: 'en_proceso',
        pts_sug: 15, pts_asig: null,
        notas: 'Pares externos evaluando protocolo técnico.',
        timeline: JSON.stringify([
          {f:'5 mar',a:'Solicitud recibida',p:'Contratista'},
          {f:'6 mar',a:'Clasificada: Producción Técnica → pares externos',p:'Contratista'},
          {f:'15 abr',a:'Pares externos asignados',p:'Contratista'}
        ])
      },
      // OBRA ARTÍSTICA
      {
        id: 'SOL-2026-SIM-010', cedula: d[9]?.cedula || d[0]?.cedula, tipo: 'obra_artistica',
        titulo: 'Exposición pictórica "Memorias del Eje Cafetero" — Museo de Arte del Quindío 2025',
        revista: null,
        fecha: '2026-02-10', etapa: 'pares_externos', estado: 'en_proceso',
        pts_sug: 20, pts_asig: null,
        notas: 'Obra expuesta en museo reconocido. Pares externos en proceso de evaluación.',
        timeline: JSON.stringify([
          {f:'10 feb',a:'Solicitud recibida',p:'Contratista'},
          {f:'11 feb',a:'Clasificada: Obra Artística → pares externos',p:'Contratista'},
          {f:'1 mar',a:'Pares externos asignados',p:'Contratista'}
        ])
      },
      // VIDEO / PRODUCCIÓN AUDIOVISUAL
      {
        id: 'SOL-2026-SIM-011', cedula: d[4]?.cedula, tipo: 'video',
        titulo: 'Documental "Ingeniería para el Desarrollo" — Serie educativa UniQuindío TV',
        revista: null,
        fecha: '2026-03-20', etapa: 'pares_externos', estado: 'en_proceso',
        pts_sug: 12, pts_asig: null,
        notas: 'Producción audiovisual con enfoque educativo. Pares en proceso.',
        timeline: JSON.stringify([
          {f:'20 mar',a:'Solicitud recibida',p:'Contratista'},
          {f:'21 mar',a:'Clasificada: Video/Audiovisual → pares externos',p:'Contratista'}
        ])
      },
      // TRADUCCIÓN
      {
        id: 'SOL-2026-SIM-012', cedula: d[6]?.cedula || d[0]?.cedula, tipo: 'traduccion',
        titulo: 'Traducción al español de "Comparative Constitutional Law" — Mark Tushnet (Harvard)',
        revista: null,
        fecha: '2026-01-25', etapa: 'pares_externos', estado: 'en_proceso',
        pts_sug: 15, pts_asig: null,
        notas: 'Traducción técnica especializada. Pares externos evaluando calidad y fidelidad.',
        timeline: JSON.stringify([
          {f:'25 ene',a:'Solicitud recibida',p:'Contratista'},
          {f:'26 ene',a:'Clasificada: Traducción → pares externos',p:'Contratista'},
          {f:'28 feb',a:'Pares externos asignados',p:'Contratista'}
        ])
      },
      // PATENTE
      {
        id: 'SOL-2026-SIM-013', cedula: d[4]?.cedula, tipo: 'patente',
        titulo: 'Sistema automatizado de monitoreo de calidad del aire para zonas industriales — Patente SIC 2025',
        revista: null,
        fecha: '2026-02-28', etapa: 'ciarp', estado: 'en_proceso',
        pts_sug: 25, pts_asig: null,
        notas: 'Patente concedida por SIC. Directo a CIARP.',
        timeline: JSON.stringify([
          {f:'28 feb',a:'Solicitud recibida',p:'Contratista'},
          {f:'1 mar',a:'Clasificada: Patente → directo CIARP',p:'Contratista'},
          {f:'15 abr',a:'Presentado en CIARP 2/2026',p:'Jefe Oficina'}
        ])
      },
      // PREMIO
      {
        id: 'SOL-2026-SIM-014', cedula: d[4]?.cedula, tipo: 'premio',
        titulo: 'Premio Mejor Investigador Joven — Asociación Colombiana de Ingeniería 2025',
        revista: null,
        fecha: '2026-03-19', etapa: 'clasificada', estado: 'en_proceso',
        pts_sug: 15, pts_asig: null,
        notas: 'Premio nacional reconocido. Directo a informe CIARP.',
        timeline: JSON.stringify([
          {f:'19 mar',a:'Solicitud recibida',p:'Contratista'},
          {f:'20 mar',a:'Clasificada: Premio → directo informe',p:'Contratista'}
        ])
      },
      // PONENCIA
      {
        id: 'SOL-2026-SIM-015', cedula: d[8]?.cedula || d[0]?.cedula, tipo: 'ponencia',
        titulo: 'Análisis de convergencia de series de Fourier en espacios de Sobolev — CLAM 2025',
        revista: null,
        fecha: '2026-04-05', etapa: 'clasificada', estado: 'en_proceso',
        pts_sug: 0, pts_asig: 0,
        notas: 'Ponencia en Congreso Latinoamericano de Matemáticas. Sin puntos Decreto 1279.',
        timeline: JSON.stringify([
          {f:'5 abr',a:'Solicitud recibida',p:'Contratista'},
          {f:'6 abr',a:'Clasificada: Ponencia — 0 puntos',p:'Contratista'}
        ])
      },
      // DIRECCIÓN DE TESIS
      {
        id: 'SOL-2026-SIM-016', cedula: d[2]?.cedula, tipo: 'direccion_tesis',
        titulo: 'Dirección de tesis doctoral: "Ecología de comunidades de insectos acuáticos en ríos andinos"',
        revista: null,
        fecha: '2026-04-10', etapa: 'clasificada', estado: 'en_proceso',
        pts_sug: 0, pts_asig: 0,
        notas: 'Director de tesis doctoral Universidad Nacional. Registro para hoja de vida.',
        timeline: JSON.stringify([
          {f:'10 abr',a:'Solicitud recibida',p:'Contratista'},
          {f:'11 abr',a:'Clasificada: Dirección Tesis — registro HV',p:'Contratista'}
        ])
      },
      // ASCENSO
      {
        id: 'SOL-2026-SIM-017', cedula: d[1]?.cedula, tipo: 'ascenso',
        titulo: 'Solicitud de Ascenso en el Escalafón Docente — Categoría Titular',
        revista: null,
        fecha: '2026-01-10', etapa: 'ciarp', estado: 'en_proceso',
        pts_sug: 0, pts_asig: null,
        notas: 'Cumple requisitos para ascenso a Titular. Documentación completa.',
        timeline: JSON.stringify([
          {f:'10 ene',a:'Solicitud de ascenso recibida',p:'Contratista'},
          {f:'11 ene',a:'Enviada a CEI para evaluación de escalafón',p:'Contratista'},
          {f:'10 mar',a:'CEI aprueba ascenso — enviado a CIARP',p:'CEI'}
        ])
      },
      // DAA — Desempeño Académico Administrativo
      {
        id: 'SOL-2026-SIM-018', cedula: d[5]?.cedula, tipo: 'daa',
        titulo: 'Reconocimiento DAA — Coordinación Programa de Enfermería 2024-2025 (Art. 10 D.1279)',
        revista: null,
        fecha: '2026-03-01', etapa: 'ciarp', estado: 'en_proceso',
        pts_sug: 0, pts_asig: null,
        notas: 'Ejerció cargo académico-administrativo de coordinador de programa durante el año académico.',
        timeline: JSON.stringify([
          {f:'1 mar',a:'Solicitud DAA recibida',p:'Contratista'},
          {f:'2 mar',a:'Clasificada: DAA Art.10 → directo CIARP',p:'Contratista'},
          {f:'15 abr',a:'Presentado en CIARP 2/2026',p:'Jefe Oficina'}
        ])
      },
      // DDD — Desempeño Docente Destacado
      {
        id: 'SOL-2026-SIM-019', cedula: d[7]?.cedula || d[0]?.cedula, tipo: 'ddd',
        titulo: 'Reconocimiento DDD — Evaluación Docente Sobresaliente 2024 (Art. 10 D.1279)',
        revista: null,
        fecha: '2026-03-15', etapa: 'ciarp', estado: 'en_proceso',
        pts_sug: 0, pts_asig: null,
        notas: 'Calificación sobresaliente en evaluación de desempeño docente 2024.',
        timeline: JSON.stringify([
          {f:'15 mar',a:'Solicitud DDD recibida',p:'Contratista'},
          {f:'16 mar',a:'Clasificada: DDD Art.10 → directo CIARP',p:'Contratista'}
        ])
      },
      // EXPERIENCIA CALIFICADA
      {
        id: 'SOL-2026-SIM-020', cedula: d[6]?.cedula || d[0]?.cedula, tipo: 'exp_calificada',
        titulo: 'Experiencia Calificada — Asesoría jurídica especializada sector público 2018-2022 (Art. 12 D.1279)',
        revista: null,
        fecha: '2026-04-01', etapa: 'ciarp', estado: 'en_proceso',
        pts_sug: 0, pts_asig: null,
        notas: 'Experiencia profesional calificada de 4 años en sector público antes de vinculación.',
        timeline: JSON.stringify([
          {f:'1 abr',a:'Solicitud Exp. Calificada recibida',p:'Contratista'},
          {f:'2 abr',a:'Clasificada: Exp. Calificada Art.12 → CIARP',p:'Contratista'}
        ])
      },
    ].filter(s => s.cedula); // solo las que tienen docente válido

    let inserted = 0;
    let errors = 0;
    for (const s of simulations) {
      try {
        await client.query(`
          INSERT INTO solicitudes (id, cedula, tipo, titulo, revista, fecha, etapa, estado, pts_sug, pts_asig, correo, notas, timeline)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
          ON CONFLICT (id) DO UPDATE SET
            titulo=EXCLUDED.titulo, etapa=EXCLUDED.etapa, estado=EXCLUDED.estado,
            pts_sug=EXCLUDED.pts_sug, notas=EXCLUDED.notas, timeline=EXCLUDED.timeline
        `, [
          s.id, s.cedula, s.tipo, s.titulo, s.revista || null,
          s.fecha, s.etapa, s.estado, s.pts_sug, s.pts_asig || null,
          (docentes.find(d => d.cedula === s.cedula)?.correo || ''),
          s.notas, s.timeline
        ]);
        console.log(`  ✅ ${s.id} | ${s.tipo}`);
        inserted++;
      } catch (err) {
        console.error(`  ❌ ${s.id} | ${s.tipo} → ${err.message}`);
        errors++;
      }
    }

    // ── 5. Resumen final ──────────────────────────────────────────
    const { rows: resumen } = await client.query(`
      SELECT tipo, COUNT(*) as total, etapa FROM solicitudes GROUP BY tipo, etapa ORDER BY tipo
    `);
    console.log('\n📊 Solicitudes por tipo en BD:');
    resumen.forEach(r => console.log(`  ${r.tipo.padEnd(25)} | ${r.etapa.padEnd(20)} | ${r.total}`));

    const { rows: totales } = await client.query('SELECT COUNT(*) as total FROM solicitudes');
    console.log(`\n✅ Total solicitudes: ${totales[0].total}`);
    console.log(`✅ Simulaciones insertadas: ${inserted}`);
    if (errors > 0) console.log(`⚠️  Errores: ${errors}`);

    // ── 6. Test login ──────────────────────────────────────────────
    console.log('\n🔐 Verificando login...');
    const { rows: us } = await client.query(
      'SELECT cedula, nombre, rol, password_hash FROM usuarios WHERE activo=true LIMIT 3'
    );
    for (const u of us) {
      const ok = await bcrypt.compare('profesorales@2026', u.password_hash);
      console.log(`  ${ok ? '✅' : '❌'} ${u.cedula} | ${u.nombre} | ${u.rol} → password ${ok ? 'CORRECTO' : 'INCORRECTO'}`);
    }

    console.log('\n🎉 Script completado exitosamente!');
  } catch (err) {
    console.error('❌ Error general:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
