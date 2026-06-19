const { Client } = require('pg');

async function main() {
  const c = new Client({ user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432 });
  await c.connect();

  const resDocentes = await c.query("SELECT * FROM docentes WHERE estado = 'ACTIVO'");
  const resSolicitudes = await c.query("SELECT * FROM solicitudes WHERE estado = 'aprobado'");
  
  const docMap = {};
  resDocentes.rows.forEach(d => {
      docMap[d.cedula] = d;
  });

  const solNuevosMap = {};
  resSolicitudes.rows.forEach(s => {
      if (s.acta_ciarp && s.id && s.id.startsWith('SOL-')) {
          const cid = s.cedula;
          if (!solNuevosMap[cid]) solNuevosMap[cid] = { prod: 0, exc: 0 };
          
          const isTitulo = ['titulo', 'titulo_academico'].includes(s.tipo);
          const isExc = ['daa', 'ddd', 'exp_calificada'].includes(s.tipo);
          const pts = Number(s.pts_asig) || 0;
          
          if (isTitulo || isExc) {
              solNuevosMap[cid].exc += pts;
          } else {
              solNuevosMap[cid].prod += pts;
          }
      }
  });

  console.log("Calculando ptsSolNuevos exacto como el frontend...");
  const setNuevos = new Set();
  
  resDocentes.rows.forEach(d => {
      const sol = solNuevosMap[d.cedula] || { prod: 0, exc: 0 };
      
      const prod = sol.prod;
      const exc = sol.exc;
      const baseAcumulados = Number(d.pts_acumulados) || 0;
      const tope = Number(d.tope) || 0;
      
      let ptsAcumulados = baseAcumulados + prod;
      let puntosRealesSumados = prod;

      if (tope > 0 && ptsAcumulados > tope) {
         puntosRealesSumados = Math.max(0, tope - baseAcumulados);
         ptsAcumulados = tope;
      }

      const ptsSolNuevos = puntosRealesSumados + exc;
      
      if (ptsSolNuevos > 0 || prod > 0 || exc > 0) {
          const finalNum = Number(ptsSolNuevos.toFixed(2));
          setNuevos.add(finalNum);
          if ([1.9, 2.61, 5.21, 6.96, 80].includes(finalNum) || finalNum < 10) {
            console.log(`[${d.cedula}] ${d.nombre}: prod=${prod}, exc=${exc}, base=${baseAcumulados}, tope=${tope} => ptsSolNuevos=${finalNum}`);
          }
      }
  });

  console.log("\nValores únicos que aparecen en ptsSolNuevos:");
  console.log(Array.from(setNuevos).sort((a,b)=>a-b));

  await c.end();
}

main().catch(console.error);
