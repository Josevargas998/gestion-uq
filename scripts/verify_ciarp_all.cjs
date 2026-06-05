const xlsx = require('xlsx');
const { Client } = require('pg');

async function main() {
  const c = new Client({ user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432 });
  await c.connect();

  // ======= CIARP 1 =======
  console.log("\n========= VERIFICANDO CIARP 1 =========");
  const wb1 = xlsx.readFile('C:\\Users\\JHVEspinosa\\Downloads\\ciarp1\\ciarp1.xlsx');
  
  // Leer cada hoja de datos del CIARP 1
  const sheetConfig = [
    { name: 'Titulo', cedCol: 3, nombreCol: 4, ptsCol: 14, tipo: 'titulo' },
    { name: 'Pub_Rev_Index', cedCol: 16, nombreCol: 17, ptsCol: 23, tipo: 'articulo_indexado' },
    { name: 'Libro_Ensayo', cedCol: 10, nombreCol: 11, ptsCol: 16, tipo: 'libro_ensayo' },
    { name: 'Libro_Texto', cedCol: 10, nombreCol: 11, ptsCol: 16, tipo: 'libro_texto' },
    { name: 'DAA', cedCol: 2, nombreCol: 3, ptsCol: 9, tipo: 'daa' },
    { name: 'DDD_Auxiliar', cedCol: 2, nombreCol: 3, ptsCol: 9, tipo: 'ddd_auxiliar' },
    { name: 'DDD_Asistente', cedCol: 2, nombreCol: 3, ptsCol: 9, tipo: 'ddd_asistente' },
    { name: 'DDD_Asociado', cedCol: 2, nombreCol: 3, ptsCol: 9, tipo: 'ddd_asociado' },
    { name: 'DDD_Titular', cedCol: 2, nombreCol: 3, ptsCol: 9, tipo: 'ddd_titular' },
    { name: 'Exp_Calificada', cedCol: 2, nombreCol: 3, ptsCol: 9, tipo: 'exp_calificada' },
  ];

  const fromExcel = {};  // cedula -> { tipo -> pts }

  for (const sh of sheetConfig) {
    if (!wb1.Sheets[sh.name]) continue;
    const data = xlsx.utils.sheet_to_json(wb1.Sheets[sh.name], { header: 1 });
    
    // Saltamos filas de encabezado (generalmente las primeras 1-3)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const ced = row[sh.cedCol];
      const pts = row[sh.ptsCol];
      if (!ced || isNaN(Number(String(ced).replace(/\D/g,'')))) continue;
      const cedStr = String(ced).trim();
      if (!fromExcel[cedStr]) fromExcel[cedStr] = {};
      fromExcel[cedStr][sh.tipo] = (fromExcel[cedStr][sh.tipo] || 0) + (Number(pts) || 0);
    }
  }

  // Consultar BD para CIARP 1
  const dbC1 = await c.query(`
    SELECT cedula, tipo, SUM(pts_asig) as pts
    FROM solicitudes
    WHERE estado = 'aprobado' AND acta_ciarp LIKE '1-%'
    GROUP BY cedula, tipo
  `);

  const fromDB = {};
  dbC1.rows.forEach(r => {
    const ced = String(r.cedula);
    if (!fromDB[ced]) fromDB[ced] = {};
    fromDB[ced][r.tipo] = (fromDB[ced][r.tipo] || 0) + Number(r.pts);
  });

  // Comparar
  console.log("\n--- Discrepancias CIARP 1 (Excel vs BD) ---");
  let discrepancias = 0;
  for (const ced of Object.keys(fromExcel)) {
    for (const tipo of Object.keys(fromExcel[ced])) {
      const ptsExcel = fromExcel[ced][tipo];
      const ptsBD = fromDB[ced]?.[tipo] || 0;
      if (Math.abs(ptsExcel - ptsBD) > 0.1) {
        const nombre = Object.values((await c.query("SELECT nombre FROM docentes WHERE cedula = $1", [ced])).rows[0] || {nombre:ced})[0];
        console.log(`❌ ${nombre} (${ced}): [${tipo}] Excel=${ptsExcel} | BD=${ptsBD} | DIFF=${(ptsExcel-ptsBD).toFixed(2)}`);
        discrepancias++;
      }
    }
  }
  if (discrepancias === 0) console.log("✅ Todo el CIARP 1 cuadra perfectamente.");

  // ======= CIARP 2 =======
  console.log("\n========= VERIFICANDO CIARP 2 =========");
  
  const dbC2 = await c.query(`
    SELECT s.cedula, d.nombre, s.tipo, SUM(s.pts_asig) as pts
    FROM solicitudes s JOIN docentes d ON d.cedula = s.cedula
    WHERE s.estado = 'aprobado' AND s.acta_ciarp LIKE '2-%'
    GROUP BY s.cedula, d.nombre, s.tipo
    ORDER BY d.nombre, s.tipo
  `);
  
  console.log("Solicitudes en BD para CIARP 2:");
  dbC2.rows.forEach(r => {
    console.log(`  ${r.nombre} (${r.cedula}): [${r.tipo}] ${Number(r.pts).toFixed(2)} pts`);
  });

  await c.end();
}

main().catch(console.error);
