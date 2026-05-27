const { pool } = require('../backend/db');
const crypto = require('crypto');

async function runSimulation() {
  console.log('\n======================================================');
  console.log('🚀 INICIANDO SIMULACIÓN E2E DE SOLICITUD - GESTION-UQ');
  console.log('======================================================\n');

  try {
    const year = new Date().getFullYear();
    const uid = crypto.randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase();
    const solId = `SOL-${year}-PROD-${uid}`;

    console.log(`📌 0. CREANDO DOCENTE DE SIMULACIÓN`);
    await pool.query(`
      INSERT INTO docentes (cedula, nombre, facultad, programa, correo)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (cedula) DO NOTHING
    `, [
      '999999999', 
      'Dr. Prueba Simulación (Test Stress)', 
      'Ingeniería', 
      'Ingeniería de Sistemas', 
      'simulacion@uniquindio.edu.co'
    ]);

    console.log(`📌 1. CREANDO NUEVA SOLICITUD (${solId})`);
    
    // Paso 1: Creación en estado "recibida"
    const timeline = JSON.stringify([{ f: 'Hoy', a: 'Solicitud radicada en el sistema', p: 'Simulación Automática' }]);
    const paresExt = JSON.stringify([]);
    
    await pool.query(`
      INSERT INTO solicitudes 
        (id, docente, cedula, programa, facultad, tipo, titulo, fecha, etapa, estado, pts_sug, timeline, pares_ext)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, 'recibida', 'en_proceso', 15.0, $8, $9)
    `, [
      solId, 
      'Dr. Prueba Simulación (Test Stress)', 
      '999999999', 
      'Ingeniería de Sistemas', 
      'Ingeniería', 
      'revista_a1', 
      'Simulación de Investigación Cuántica 2026', 
      timeline,
      paresExt
    ]);
    console.log(`   ✅ Solicitud insertada correctamente en PostgreSQL.`);

    // Paso 2: Clasificación y envío a pares
    console.log(`\n📌 2. AVANZANDO ETAPA: CLASIFICADA -> PARES EXTERNOS`);
    const timeline2 = JSON.stringify([
      { f: 'Hoy', a: 'Solicitud radicada en el sistema', p: 'Simulación Automática' },
      { f: 'Hoy', a: 'Etapa actualizada a: Pares externos', p: 'Sistema' }
    ]);
    const paresAsignados = JSON.stringify([{
      nombre: 'Dra. María Experta Evaluadora',
      perfil: 'Doctora en Física Cuántica, Universidad Nacional',
      estado: 'pendiente',
      memo_envio: '2026-IM-001',
      fecha_envio: new Date().toISOString().split('T')[0]
    }]);

    await pool.query(`
      UPDATE solicitudes 
      SET etapa = 'pares_externos', timeline = $1, pares_ext = $2, memo_envio_ext = 'sent'
      WHERE id = $3
    `, [timeline2, paresAsignados, solId]);
    console.log(`   ✅ Evaluador externo asignado e invitado.`);

    // Paso 3: Recepción de evaluación
    console.log(`\n📌 3. RECEPCIÓN DE EVALUACIÓN DEL PAR`);
    const timeline3 = JSON.stringify([
      { f: 'Hoy', a: 'Solicitud radicada en el sistema', p: 'Simulación Automática' },
      { f: 'Hoy', a: 'Etapa actualizada a: Pares externos', p: 'Sistema' },
      { f: 'Hoy', a: 'Evaluación recibida del par experto', p: 'Sistema' }
    ]);
    const paresConNota = JSON.stringify([{
      nombre: 'Dra. María Experta Evaluadora',
      perfil: 'Doctora en Física Cuántica, Universidad Nacional',
      estado: 'recibido',
      memo_envio: '2026-IM-001',
      fecha_envio: new Date().toISOString().split('T')[0],
      concepto_nombre: 'Concepto_Dra_Maria.pdf',
      nota_evaluativa: 'Excelente aporte, cumple todos los requisitos.',
      puntaje_par: '15.0'
    }]);

    await pool.query(`
      UPDATE solicitudes 
      SET etapa = 'informe', timeline = $1, pares_ext = $2, pts_asig = 15.0
      WHERE id = $3
    `, [timeline3, paresConNota, solId]);
    console.log(`   ✅ Concepto recibido. Puntaje asignado: 15.0 pts. Solicitud lista para comité (informe).`);

    // Paso 4: Comité CIARP y Aprobación
    console.log(`\n📌 4. COMITÉ CIARP Y APROBACIÓN FINAL`);
    const timeline4 = JSON.stringify([
      { f: 'Hoy', a: 'Solicitud radicada en el sistema', p: 'Simulación Automática' },
      { f: 'Hoy', a: 'Etapa actualizada a: Pares externos', p: 'Sistema' },
      { f: 'Hoy', a: 'Evaluación recibida del par experto', p: 'Sistema' },
      { f: 'Hoy', a: 'Aprobada en comité CIARP', p: 'Comité' }
    ]);

    await pool.query(`
      UPDATE solicitudes 
      SET etapa = 'archivada', estado = 'aprobado', acta_ciarp = 'Acta 10 de 2026', timeline = $1
      WHERE id = $2
    `, [timeline4, solId]);
    console.log(`   ✅ Solicitud aprobada y archivada correctamente en el Acta 10 de 2026.`);

    console.log('\n======================================================');
    console.log('🎉 SIMULACIÓN FINALIZADA CON ÉXITO');
    console.log('======================================================');
    console.log(`Revisa la interfaz en tu localhost, busca la solicitud: ${solId}`);

  } catch (error) {
    console.error('❌ ERROR EN LA SIMULACIÓN:', error);
  } finally {
    await pool.end();
  }
}

runSimulation();
