const { Client } = require('pg');
const c = new Client({ user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432 });
c.connect().then(() => c.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'sesiones_ciarp'`))
.then(r => { console.log(r.rows); c.end(); })
.catch(e => { console.error(e.message); c.end(); });
