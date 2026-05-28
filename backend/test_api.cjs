const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function run() {
  const token = jwt.sign(
    { cedula: '1094970478', nombre: 'José', rol: 'asistente' },
    process.env.API_SECRET,
    { expiresIn: '12h' }
  );

  console.log("Token:", token);

  const res = await fetch('http://localhost:3001/api/sesiones-cei', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ numero: 99, fecha: '2026-05-31' })
  });

  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Body:", text);
}

run();
