const { Client } = require('pg');

async function main() {
  const c = new Client({ user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432 });
  await c.connect();

  // === 1. Verificar solicitudes de CIARP 1 y 2 que NO están archivadas ===
  const noArchivadas = await c.query(`
    SELECT s.id, s.cedula, d.nombre, s.tipo, s.titulo, s.estado, s.etapa, s.acta_ciarp
    FROM solicitudes s
    LEFT JOIN docentes d ON d.cedula = s.cedula
    WHERE s.acta_ciarp LIKE '1-%' OR s.acta_ciarp LIKE '2-%'
    ORDER BY s.acta_ciarp, s.etapa
  `);

  const pendientes = noArchivadas.rows.filter(r => r.etapa !== 'archivada');
  console.log(`\n=== Solicitudes de CIARP 1 y 2 que NO están en 'archivada' (${pendientes.length}) ===`);
  pendientes.forEach(r => console.log(`  [${r.acta_ciarp}] ${r.nombre} | ${r.tipo} | estado: ${r.estado} | etapa actual: ${r.etapa}`));

  // === 2. Verificar títulos aprobados cuya escolaridad NO coincide en docentes ===
  const titulos = await c.query(`
    SELECT s.cedula, d.nombre, s.titulo, s.estado, 
           d.doctorado, d.maestria, d.especializacion, d.escolaridad
    FROM solicitudes s
    JOIN docentes d ON d.cedula = s.cedula
    WHERE s.tipo IN ('titulo', 'titulo_academico') AND s.estado = 'aprobado'
  `);

  console.log(`\n=== Títulos aprobados y estado en docentes ===`);
  titulos.rows.forEach(r => {
    const tl = (r.titulo || '').toLowerCase();
    let campo = null, valor = null;
    if (tl.includes('doctor')) { campo = 'doctorado'; valor = r.doctorado; }
    else if (tl.includes('maestr') || tl.includes('magister')) { campo = 'maestria'; valor = r.maestria; }
    else if (tl.includes('especializa')) { campo = 'especializacion'; valor = r.especializacion; }

    const ok = valor && valor.trim().length > 0;
    const escOk = r.escolaridad && r.escolaridad.trim().length > 0;
    const icon = ok && escOk ? '✅' : '❌';
    console.log(`  ${icon} ${r.nombre} | Titulo: "${r.titulo}" | BD campo(${campo}): "${valor}" | escolaridad: "${r.escolaridad}"`);
  });

  await c.end();
}

main().catch(console.error);
