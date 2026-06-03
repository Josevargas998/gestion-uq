const { Client } = require('pg');
const c = new Client({ user: 'gestion_uq', host: 'localhost', database: 'gestion_uq_db', password: 'gestion_uq_2026', port: 5432 });

c.connect().then(async () => {
  const cedula = '9732828';
  
  const { rows: docRows } = await c.query('SELECT cedula, nombre, tope, pts_acumulados FROM docentes WHERE cedula = $1', [cedula]);
  console.log('Docente:');
  console.table(docRows);
  
  if (docRows.length > 0) {
    const tope = Number(docRows[0].tope) || 0;
    const baseAcum = Number(docRows[0].pts_acumulados) || 0;
    console.log(`Tope: ${tope}, Base Acumulados: ${baseAcum}`);
    
    // Simular validarTopeDocente con 0 pts (ddd)
    const { rows: sumaRows } = await c.query(
      "SELECT COALESCE(SUM(pts_asig), 0) AS suma FROM solicitudes WHERE cedula = $1 AND estado = 'aprobado' AND id LIKE 'SOL-%'",
      [cedula]
    );
    const otrosPts = Number(sumaRows[0].suma) || 0;
    const totalProyectado = baseAcum + otrosPts + 0; // +0 porque ddd no tiene puntos
    console.log(`Otros pts aprobados: ${otrosPts}`);
    console.log(`Total proyectado: ${totalProyectado} de ${tope}`);
    console.log(`Supera tope: ${totalProyectado > tope}`);
  }
  
  await c.end();
}).catch(console.error);
