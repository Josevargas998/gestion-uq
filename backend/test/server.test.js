/**
 * server.test.js
 * Pruebas automatizadas de integración para el backend de gestion-uq.
 * Utiliza el test runner nativo de Node.js (node --test) y aserciones nativas.
 */
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const jwt = require('jsonwebtoken');

// Asegurar que cargamos variables de entorno adecuadas para testing
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { app } = require('../server');
const { pool, query } = require('../db');

// Generar token JWT de administrador para pruebas protegidas
const adminToken = jwt.sign(
  { cedula: '1094970478', rol: 'admin' },
  process.env.API_SECRET || 'gestion_uq_api_secret_2026_muy_largo_cambiar_esto'
);

test('Suite de Pruebas de Integración - Servidor Express & PostgreSQL', async (t) => {
  let server;
  let baseUrl;

  // Levantamos el servidor en un puerto efímero (0) antes de correr las pruebas
  t.before(() => {
    return new Promise((resolve) => {
      server = app.listen(0, 'localhost', () => {
        const { port } = server.address();
        baseUrl = `http://localhost:${port}`;
        console.log(`[TEST] Servidor de prueba levantado en ${baseUrl}`);
        resolve();
      });
    });
  });

  // Apagar el servidor y liberar recursos al finalizar las pruebas
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
    console.log('[TEST] Servidor de prueba cerrado y pool de DB finalizado.');
  });

  // 1. Verificar endpoint de salud de la aplicación
  await t.test('GET /api/health — Debe responder 200 y reportar estado ok', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'ok');
    assert.strictEqual(body.db, 'conectada');
  });

  // 2. Verificar endpoints públicos de docentes
  await t.test('GET /api/docentes — Debe responder 200 y retornar lista de docentes', async () => {
    const res = await fetch(`${baseUrl}/api/docentes`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body), 'El resultado debe ser un arreglo');
  });

  // 3. Verificar endpoints públicos de títulos y experiencias por cédula
  await t.test('GET /api/docentes/:cedula/titulos — Debe responder 200 y retornar arreglo', async () => {
    const res = await fetch(`${baseUrl}/api/docentes/1094970478/titulos`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body), 'Los títulos deben ser un arreglo');
  });

  await t.test('GET /api/docentes/:cedula/experiencias — Debe responder 200 y retornar arreglo', async () => {
    const res = await fetch(`${baseUrl}/api/docentes/1094970478/experiencias`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body), 'Las experiencias deben ser un arreglo');
  });

  // 4. Verificar seguridad en rutas protegidas
  await t.test('POST /api/solicitudes — Debe responder 401 si no hay token de autorización', async () => {
    const res = await fetch(`${baseUrl}/api/solicitudes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: 'Test Solicitud' })
    });
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.ok(body.error.includes('Token requerido'));
  });

  await t.test('POST /api/solicitudes — Debe responder 403 si el token es inválido', async () => {
    const res = await fetch(`${baseUrl}/api/solicitudes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token_invalido_12345'
      },
      body: JSON.stringify({ titulo: 'Test Solicitud' })
    });
    assert.strictEqual(res.status, 403);
  });

  // 5. Verificar lógica de negocio: validación de tope de puntos del docente
  await t.test('Validación de tope de puntos — Flujo completo', async (st) => {
    const testCedula = 'TEST_DOCENTE_9999';

    // Insertar un docente de prueba con tope = 10 y puntos acumulados = 5 (le quedan 5 libres)
    await query(
      `INSERT INTO docentes (cedula, nombre, tope, pts_acumulados, estado)
       VALUES ($1, 'Docente de Prueba', 10.0, 5.0, 'ACTIVO')
       ON CONFLICT (cedula) DO UPDATE SET tope = 10.0, pts_acumulados = 5.0`,
      [testCedula]
    );

    await st.test('Debe denegar (400) si una solicitud aprobada supera el tope de puntos del docente', async () => {
      // 5 + 6 = 11 > 10
      const res = await fetch(`${baseUrl}/api/solicitudes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          cedula: testCedula,
          titulo: 'Publicación que supera el tope',
          tipo: 'revista_a1',
          estado: 'aprobado',
          pts_asig: 6.0,
          fecha: new Date().toISOString().split('T')[0]
        })
      });

      assert.strictEqual(res.status, 400);
      const body = await res.json();
      assert.ok(body.error.includes('superaría el tope del docente'), `Mensaje recibido: ${body.error}`);
    });

    await st.test('Debe permitir (201) si una solicitud aprobada NO supera el tope de puntos', async () => {
      // 5 + 4 = 9 <= 10
      const res = await fetch(`${baseUrl}/api/solicitudes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          cedula: testCedula,
          titulo: 'Publicación dentro del tope',
          tipo: 'revista_a1',
          estado: 'aprobado',
          pts_asig: 4.0,
          fecha: new Date().toISOString().split('T')[0]
        })
      });

      assert.strictEqual(res.status, 201);
      const body = await res.json();
      assert.strictEqual(body.cedula, testCedula);
      assert.strictEqual(Number(body.pts_asig), 4.0);

      // Limpiar solicitud creada en este sub-test
      if (body.id) {
        await query('DELETE FROM solicitudes WHERE id = $1', [body.id]);
      }
    });

    // Cleanup del docente de prueba
    await query('DELETE FROM docentes WHERE cedula = $1', [testCedula]);
  });
});
