const { Client } = require('pg');

async function main() {
  const c = new Client({ user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432 });
  await c.connect();

  console.log("=== DIAGNÓSTICO CRISTIAN CAMILO (1102042502) ===\n");
  const res = await c.query(`
    SELECT id, tipo, titulo, pts_asig, estado, etapa, acta_ciarp, created_at
    FROM solicitudes 
    WHERE cedula = '1102042502'
    ORDER BY tipo, created_at
  `);
  res.rows.forEach(r => {
    console.log(`[${r.id}] tipo=${r.tipo} | pts=${r.pts_asig} | estado=${r.estado} | etapa=${r.etapa} | acta=${r.acta_ciarp || 'null'}`);
    console.log(`  titulo: ${r.titulo?.substring(0,80)}`);
    console.log('');
  });

  await c.end();
}
main().catch(console.error);
