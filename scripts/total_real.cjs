const { Client } = require('pg');
const client = new Client({
  user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db',
  password: 'gestion_uq_2026', port: 5432
});
client.connect().then(() => 
  client.query(`
    SELECT tipo, COUNT(*) as n, SUM(CAST(pts_asig AS FLOAT)) as pts 
    FROM solicitudes 
    WHERE acta_ciarp ILIKE '%18/03/2026%' OR acta_ciarp = '1- 2026'
    GROUP BY tipo ORDER BY tipo
  `)
).then(r => {
  let t=0, tp=0;
  r.rows.forEach(x => {
    t += Number(x.n);
    tp += Number(x.pts||0);
    console.log(String(x.tipo).padEnd(20), '|', String(x.n).padStart(4), 'registros |', Number(x.pts||0).toFixed(2).padStart(8), 'pts');
  });
  console.log('----------------------------------------------------');
  console.log('TOTAL'.padEnd(20), '|', String(t).padStart(4), 'registros |', tp.toFixed(2).padStart(8), 'pts');
  client.end();
}).catch(console.error);
