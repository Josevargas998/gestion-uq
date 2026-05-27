/**
 * consolidar_cierre_2026.cjs — Consolidación de puntos al finalizar el año 2026
 * 
 * Este script transfiere todos los puntos asignados y aprobados de los productos
 * académicos del año 2026 directamente a la base de datos de los docentes,
 * evitando que deban recalcularse en tiempo real en la aplicación.
 * 
 * Uso:
 *   node scripts/consolidar_cierre_2026.cjs
 */

const { query } = require('../backend/db');

async function consolidarCierre2026() {
  console.log("🚀 Iniciando proceso de consolidación de puntos CIARP - Cierre 2026...");
  
  try {
    // 1. Obtener todas las solicitudes de productividad aprobadas del 2026 con puntos asignados
    // Se filtra por tipo != 'ascenso' e IDs o fechas del 2026
    const { rows: solicitudes } = await query(`
      SELECT id, cedula, docente, pts_asig, acta_ciarp, titulo 
      FROM solicitudes 
      WHERE estado = 'aprobado' 
        AND pts_asig > 0 
        AND tipo != 'ascenso'
        AND (id LIKE '%2026%' OR EXTRACT(YEAR FROM fecha) = 2026 OR EXTRACT(YEAR FROM created_at) = 2026)
    `);

    if (solicitudes.length === 0) {
      console.log("ℹ️ No se encontraron solicitudes de productividad del 2026 aprobadas para consolidar.");
      return;
    }

    console.log(`📋 Se encontraron ${solicitudes.length} productos aprobados en 2026.`);

    // Agrupar los puntos acumulados por cédula
    const consolidacionPorCedula = {};
    for (const sol of solicitudes) {
      const cedula = String(sol.cedula);
      if (!consolidacionPorCedula[cedula]) {
        consolidacionPorCedula[cedula] = {
          nombre: sol.docente || 'Docente desconocido',
          puntosAConsolidar: 0,
          productos: []
        };
      }
      consolidacionPorCedula[cedula].puntosAConsolidar += Number(sol.pts_asig);
      consolidacionPorCedula[cedula].productos.push({
        id: sol.id,
        pts: Number(sol.pts_asig),
        acta: sol.acta_ciarp,
        titulo: sol.titulo
      });
    }

    // 2. Ejecutar la actualización para cada docente
    let docentesActualizados = 0;
    for (const [cedula, data] of Object.entries(consolidacionPorCedula)) {
      const ptsConsolidadas = Number(data.puntosAConsolidar.toFixed(2));
      console.log(`\n👤 Procesando docente: ${data.nombre} (Cédula: ${cedula})`);
      console.log(`   Puntos a consolidar del 2026: +${ptsConsolidadas}`);

      // Obtener datos actuales del docente
      const { rows: docentes } = await query("SELECT pts_acumulados, pts_favor, historial FROM docentes WHERE cedula = $1", [cedula]);
      
      if (docentes.length === 0) {
        console.log(`   ⚠️ Advertencia: No se encontró al docente en la base de datos de planta. Saltando.`);
        continue;
      }

      const docenteActual = docentes[0];
      const nuevosPtsAcumulados = Number(docenteActual.pts_acumulados) + ptsConsolidadas;
      const nuevosPtsFavor = Number(docenteActual.pts_favor) + ptsConsolidadas;
      
      // Preparar historial enriquecido
      const historial = docenteActual.historial || {};
      historial.PTS_ENE_DIC2026 = ptsConsolidadas;
      historial.DETALLE_CONSOLIDADO_2026 = data.productos;

      // Actualizar en la base de datos
      await query(`
        UPDATE docentes 
        SET pts_acumulados = $1, 
            pts_favor = $2, 
            historial = $3,
            updated_at = NOW() 
        WHERE cedula = $4
      `, [nuevosPtsAcumulados, nuevosPtsFavor, JSON.stringify(historial), cedula]);

      console.log(`   ✅ Consolidado con éxito. Nuevos puntos de producción acumulados: ${nuevosPtsAcumulados}`);
      docentesActualizados++;
    }

    console.log(`\n🎉 ¡Consolidación completada con éxito!`);
    console.log(`   Total de docentes actualizados en planta: ${docentesActualizados}`);

  } catch (err) {
    console.error("❌ Error durante el proceso de consolidación:", err);
  } finally {
    process.exit(0);
  }
}

consolidarCierre2026();
