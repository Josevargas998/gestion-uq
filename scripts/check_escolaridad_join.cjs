const { Client } = require('pg');
const c = new Client({ user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432 });

c.connect().then(async () => {
  const { rows } = await c.query(`
    SELECT s.id, s.cedula,
           COALESCE(d.escolaridad, '') AS escolaridad,
           COALESCE(d.nombre, s.docente) AS docente
    FROM solicitudes s
    LEFT JOIN docentes d ON s.cedula = d.cedula
    WHERE s.id = 'c12422d5-b815-443f-beb8-2087e8b52b09'
  `);
  console.log('Resultado JOIN:', rows[0]);

  const { rows: docRows } = await c.query(
    "SELECT cedula, nombre, escolaridad FROM docentes WHERE cedula = '24606935'"
  );
  console.log('Docente directa:', docRows[0]);
  await c.end();
}).catch(console.error);
