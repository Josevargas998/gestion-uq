const {Client} = require('pg');
const c = new Client({user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432});
c.connect().then(() => c.query("SELECT pts_acumulados, pts_titulos_exp FROM docentes WHERE cedula = '1102042502'").then(r => {console.log(r.rows); c.end()}));
