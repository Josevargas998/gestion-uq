const { query } = require('./backend/db');
query("SELECT column_name FROM information_schema.columns WHERE table_name='solicitudes'")
  .then(r => console.log(r.rows.map(x => x.column_name)))
  .catch(console.error)
  .finally(() => process.exit(0));
