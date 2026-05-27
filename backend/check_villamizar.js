const { query } = require('./db');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

async function main() {
  const res = await query(
    `SELECT s.id, s.cedula, COALESCE(d.nombre, s.docente) as docente, s.titulo, s.etapa, s.estado, s.sesion_ciarp_id, s.acta_ciarp
     FROM solicitudes s
     LEFT JOIN docentes d ON s.cedula = d.cedula
     WHERE (s.titulo ILIKE '%villamizar%' OR COALESCE(d.nombre, s.docente) ILIKE '%villamizar%')
     ORDER BY s.created_at DESC`
  );
  console.log('=== Solicitudes Villamizar ===');
  res.rows.forEach(r => console.log(JSON.stringify(r, null, 2)));
  process.exit(0);
}
main().catch(e => { console.error(e.message); process.exit(1); });
