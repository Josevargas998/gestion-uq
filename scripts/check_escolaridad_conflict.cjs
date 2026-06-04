const { Client } = require('pg');
const c = new Client({ user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432 });

c.connect().then(async () => {
  // ¿Existe la columna escolaridad en la tabla solicitudes?
  const { rows: cols } = await c.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name='solicitudes' AND column_name='escolaridad'"
  );
  console.log('¿Columna escolaridad en tabla solicitudes?', cols.length > 0 ? 'SÍ — puede estar pisando el JOIN' : 'NO — no hay conflicto');

  // Verificar qué retorna el endpoint completo con el SELECT s.*
  const { rows } = await c.query(`
    SELECT s.id, s.cedula,
           COALESCE(d.escolaridad, '') AS escolaridad_join,
           s.escolaridad AS escolaridad_s
    FROM solicitudes s
    LEFT JOIN docentes d ON s.cedula = d.cedula
    WHERE s.id = 'c12422d5-b815-443f-beb8-2087e8b52b09'
  `);
  console.log('Valores:', rows[0]);
  await c.end();
}).catch(console.error);
