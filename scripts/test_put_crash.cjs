const http = require('http');

const data = JSON.stringify({
  metadatos: {
    fecha_graduacion: "2026-03-27",
    acto_convalidacion: "N/A",
    universidad_otorga: "Universidad de Manizales"
  }
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/solicitudes/c12422d5-b815-443f-beb8-2087e8b52b09',
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  console.log(`Status: ${res.statusCode}`);
  res.on('data', d => process.stdout.write(d));
});

req.on('error', error => console.error(error));
req.write(data);
req.end();
