const { Client } = require('pg');
const c = new Client({ user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432 });

c.connect().then(async () => {
  const r1 = await c.query("SELECT * FROM docentes WHERE cedula = '24606935'");
  const d = r1.rows[0];
  
  const pts_acumulados_bd = Number(d.pts_acumulados) || 0;
  const pts_total_salarial_bd = Number(d.pts_total_salarial) || 0;
  
  const r2 = await c.query("SELECT id, tipo, pts_asig FROM solicitudes WHERE cedula = '24606935' AND estado = 'aprobado'");
  
  let prod = 0;
  let exc = 0;
  
  r2.rows.forEach(s => {
    // Simulando la logica del hook con el ID exacto que tiene
    if (s.id.startsWith('SOL-') || s.id.length > 20) { // Permitir SOL- o UUID viejos
      const pts = Number(s.pts_asig) || 0;
      if (['titulo', 'titulo_academico', 'daa', 'ddd', 'exp_calificada'].includes(s.tipo)) {
         exc += pts;
      } else {
         prod += pts;
      }
    }
  });

  console.log(`Antes (BD base): Acumulados=${pts_acumulados_bd}, Salarial=${pts_total_salarial_bd}`);
  console.log(`Después (Con lógica ajustada UUID/SOL-): Acumulados=${pts_acumulados_bd + prod}, Salarial=${pts_total_salarial_bd + prod + exc}`);
  
  // Arreglar el ID de la solicitud en la base de datos para que sea SOL-
  if (r2.rows.find(x => x.id === 'c12422d5-b815-443f-beb8-2087e8b52b09')) {
    await c.query(`UPDATE solicitudes SET id = 'SOL-2026-PROD-C12422D5' WHERE id = 'c12422d5-b815-443f-beb8-2087e8b52b09'`);
    console.log("ID de solicitud corregido a formato SOL-2026-PROD-C12422D5");
  }

  await c.end();
}).catch(console.error);
