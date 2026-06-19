const { Client } = require('pg');

async function main() {
  const c = new Client({ user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432 });
  await c.connect();

  console.log("=== Corrigiendo IDs de Solicitudes con formato UUID ===");
  // Buscar todas las solicitudes que tienen un UUID raw (36 caracteres, con guiones) y no empiezan con SOL- ni C12026
  const res = await c.query(`
    SELECT id, cedula, tipo, pts_asig, acta_ciarp
    FROM solicitudes
    WHERE id NOT LIKE 'SOL-%' 
      AND id NOT LIKE 'C12026-%'
      AND length(id) = 36
  `);

  console.log(`Encontradas ${res.rows.length} solicitudes con formato UUID antiguo.`);

  let actualizadas = 0;
  for (const row of res.rows) {
    // Generar nuevo ID tomando los primeros 8 caracteres del UUID
    const shortId = row.id.split('-')[0].toUpperCase();
    const newId = `SOL-2026-PROD-${shortId}`;
    
    // Validar que el nuevo ID no exista (aunque las colisiones en 8 hex son raras)
    const check = await c.query("SELECT id FROM solicitudes WHERE id = $1", [newId]);
    const finalId = check.rows.length > 0 ? `SOL-2026-PROD-${shortId}X` : newId;

    await c.query(`
      UPDATE solicitudes 
      SET id = $1
      WHERE id = $2
    `, [finalId, row.id]);
    
    actualizadas++;
  }

  console.log(`✅ ${actualizadas} solicitudes actualizadas al formato SOL-2026-PROD-*`);

  await c.end();
}

main().catch(console.error);
