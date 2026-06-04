const http = require('http');

http.get('http://localhost:3001/api/solicitudes?limit=1', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const p = JSON.parse(data);
    const s = p.data ? p.data[0] : p[0];
    console.log('escolaridad:', s?.escolaridad);
    console.log('categoria:', s?.categoria);
    console.log('dedicacion:', s?.dedicacion);
  });
}).on('error', (e) => console.error('Error:', e.message));
