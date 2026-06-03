const { Client } = require('pg');
const c = new Client({ user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432 });
c.connect().then(() =>
  c.query(`SELECT tipo, COUNT(*) as n, ROUND(SUM(CAST(COALESCE(pts_asig,0) AS NUMERIC)),2) as pts 
           FROM solicitudes WHERE acta_ciarp ILIKE '%18/03/2026%' 
           GROUP BY tipo ORDER BY tipo`)
).then(r => {
  let total = 0;
  r.rows.forEach(x => { 
    const p = Number(x.pts||0); 
    total += p;
    console.log(String(x.tipo).padEnd(25), '|', String(x.n).padStart(4), 'registros |', p.toFixed(2).padStart(8), 'pts'); 
  });
  console.log('─'.repeat(55));
  console.log('TOTAL'.padEnd(25), '|', ''.padStart(4), '          |', total.toFixed(2).padStart(8), 'pts');
  c.end();
}).catch(e => { console.error(e.message); c.end(); });
