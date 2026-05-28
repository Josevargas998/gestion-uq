const jwt = require('jsonwebtoken');
require('dotenv').config({ path: './backend/.env' });

const API_URL = 'http://localhost:3001';
const API_SECRET = process.env.API_SECRET;

async function testAsistenteCreateCeiSession() {
  try {
    // 1. Crear un token falso de asistente para José
    const token = jwt.sign(
      { cedula: '1094970478', nombre: 'José Heriberto Vargas Espinosa', rol: 'asistente' },
      API_SECRET,
      { expiresIn: '12h' }
    );
    
    console.log('Token generado:', token);

    // 2. Hacer la petición POST a /api/sesiones-cei
    const response = await fetch(`${API_URL}/api/sesiones-cei`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        fecha: '2026-05-31',
        notas: 'Test session created by assistant'
      })
    });

    const status = response.status;
    const body = await response.text();
    
    console.log('Response Status:', status);
    console.log('Response Body:', body);
  } catch (err) {
    console.error('Error:', err);
  }
}

testAsistenteCreateCeiSession();
