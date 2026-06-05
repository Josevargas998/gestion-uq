import { useState, useEffect, useMemo } from 'react';
import { fetchDocentes, fetchDocentePorCedula } from '../utils/api.js';
import { normalizeDocente, formatName, formatProgramaName } from '../helpers.js';
import { useSolicitudes } from '../context/SolicitudesContext.jsx';
import { TIPOS } from '../data.js';

// Cache en memoria para la sesión actual
const cache = {};

export function clearDocentesCache() { Object.keys(cache).forEach(k => delete cache[k]); }

// ─────────────────────────────────────────────────────────────
// Hook: índice liviano para búsquedas (nombre, cedula, facultad)
// ─────────────────────────────────────────────────────────────
export function useDocentesIndex() {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const key = 'docentes-index';
    if (cache[key]) { setData(cache[key]); setLoading(false); return; }

    fetchDocentes('cedula,nombre,correo,facultad,categoria,programa,dedicacion,fecha_ingreso,especializacion,maestria,doctorado,estado,historial')
      .then(rows => {
        const mapped = (rows || [])
          .filter(r => (r.estado || '').toUpperCase() === 'ACTIVO') // solo planta activa
          .map(r => ({
            ...r,
            nombre: formatName(r.nombre || ''),
            programa: formatProgramaName(r.programa),
            categoriaActual: r.categoria || '',
            tipoDoc: 'CC',
            fechaIngreso: r.fecha_ingreso || '',
          }));
        cache[key] = mapped;
        setData(mapped);
      })
      .catch(err => console.error('Error cargando índice docentes:', err.message))
      .finally(() => setLoading(false));
  }, []);

  // Mapa por cédula para acceso O(1)
  const docentesMap = useMemo(() => {
    const m = {};
    data.forEach(d => { if (d.cedula) m[String(d.cedula).trim()] = d; });
    return m;
  }, [data]);

  return { data, loading, docentesMap };
}

// ─────────────────────────────────────────────────────────────
// Hook: tabla completa de planta (GestorDocentes)
// ─────────────────────────────────────────────────────────────
export function useDocentesPlanta() {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const key = 'docentes-planta';
    if (cache[key]) { setData(cache[key]); setLoading(false); return; }

    fetchDocentes()
      .then(rows => {
        // Solo docentes de PLANTA (estado ACTIVO, con categoría escalafonaria)
        const planta = (rows || []).filter(r => {
          const estado = (r.estado || '').toUpperCase();
          const cat = (r.categoria || '').toUpperCase();
          const hasCategoria = cat.includes('TITULAR') || cat.includes('ASOCIADO') || cat.includes('ASISTENTE') || cat.includes('AUXILIAR');
          return estado === 'ACTIVO' && hasCategoria;
        });
        const normalized = planta.map(normalizeDocente);
        cache[key] = normalized;
        setData(normalized);
      })
      .catch(err => console.error('Error cargando planta docentes:', err.message))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

// ─────────────────────────────────────────────────────────────
// Hook: planta enriquecida con puntos de nuevas aprobaciones
// ─────────────────────────────────────────────────────────────
export function useDocentesConNuevos() {
  const { data: DOCENTES_PLANTA, loading: loadingDoc } = useDocentesPlanta();
  const { solicitudes } = useSolicitudes();

  const solNuevosMap = useMemo(() => {
    const map = {};
    const etapasValidas = ['ciarp', 'acta', 'rectoria', 'juridica', 'resolucion', 'archivada'];
    
    solicitudes
      .filter(s => s.estado === 'aprobado' && etapasValidas.includes(s.etapa) && Number(s.pts_asig) > 0)
      .forEach(s => {
        const c = String(s.cedula);
        if (!map[c]) map[c] = { prod_total: 0, exc_total: 0, prod_c2: 0, exc_c2: 0, prod_c1: 0, exc_c1: 0 };
        
        const pts = Number(s.pts_asig) || 0;
        const infoTipo = TIPOS[s.tipo] || {};
        const isC2 = (s.acta_ciarp || '').startsWith('2-');
        const isC1 = (s.acta_ciarp || '').startsWith('1-') || (s.acta_ciarp || '').includes('2025');
        
        if (infoTipo.esExcepcion || ['titulo', 'titulo_academico'].includes(s.tipo)) {
           if (s.id?.startsWith('SOL-')) {
             if (isC2) {
               map[c].exc_total += pts;
               map[c].exc_c2 += pts;
             }
             if (isC1) map[c].exc_c1 += pts;
           }
        } else if (infoTipo.esBonificacion || s.tipo === 'ascenso') {
           // nada
        } else {
           if (s.id?.startsWith('SOL-')) {
             if (isC2) {
               map[c].prod_total += pts;
               map[c].prod_c2 += pts;
             }
             if (isC1) map[c].prod_c1 += pts;
           }
        }
      });
    return map;
  }, [solicitudes]);


  const data = useMemo(() =>
    DOCENTES_PLANTA.map(d => {
      const sol = solNuevosMap[String(d.cedula)] || { prod_total: 0, exc_total: 0, prod_c2: 0, exc_c2: 0, prod_c1: 0, exc_c1: 0 };
      
      let ptsAcumulados = Number(d.ptsAcumulados) + sol.prod_total;
      let puntosRealesSumados = sol.prod_total;
      let puntosRealesC2 = sol.prod_c2;

      // Calcular diferencia real (puede ser negativa)
      let diferencia = d.tope > 0 ? d.tope - ptsAcumulados : 0;

      // Si superó el tope, los puntos salariales efectivos no deben sumar más allá del tope
      if (d.tope > 0 && ptsAcumulados > d.tope) {
         // Si d.ptsAcumulados base ya era mayor al tope, el incremento real en el salario es 0
         puntosRealesSumados = Math.max(0, d.tope - Number(d.ptsAcumulados));
         puntosRealesC2 = Math.min(sol.prod_c2, puntosRealesSumados);
      }

      // El salario se forma de: base salarial + puntos prod nuevos reales + excepciones 
      const ptsTotalSalarial = (d.ptsTotalSalarial || d.ptsAcumulados) + puntosRealesSumados + sol.exc_total;

      // Para la columna CIARP 01: la base que ya estaba en BD + los títulos/excepciones/prod de CIARP 1 que estaban en UUIDs ignorados
      // Nota: Si ya estaban contados en la BD (como los 8 pts de Cristian), sol.prod_c1 podría duplicarlos si no se filtra, 
      // pero como los UUID de productividad que acabo de corregir (ej. Carlos Andrés) faltaban en la BD, sumamos sol.exc_c1 + sol.prod_c1.
      // Para evitar duplicar los 8 pts de Cristian, sabemos que su id era C12026 (no SOL-), por lo que sol.prod_c1 no lo incluye.
      const ptsCiarp1Total = Number(d.ptsCiarp1_2026 || 0) + sol.exc_c1 + sol.prod_c1;

      return {
        ...d,
        ptsAcumulados,
        ptsTotalSalarial,
        diferencia,
        ptsSolNuevos: puntosRealesC2 + sol.exc_c2, // Total real EXCLUSIVO del CIARP 2
        ptsCiarp1Total // Total real del CIARP 1 incluyendo títulos reparados
      };
    }), [DOCENTES_PLANTA, solNuevosMap]);

  return { data, loading: loadingDoc };
}

// ─────────────────────────────────────────────────────────────
// Función puntual: detalle de un docente por cédula
// ─────────────────────────────────────────────────────────────
export async function fetchDocenteDetalle(cedula) {
  const key = `docente-${cedula}`;
  if (cache[key]) return cache[key];

  const raw = await fetchDocentePorCedula(cedula);
  if (!raw) throw new Error(`Docente ${cedula} no encontrado`);
  const normalized = normalizeDocente(raw);

  // Enriquecer con datos de los nuevos endpoints relacionales en la base de datos
  try {
    const [titulosRes, experienciasRes] = await Promise.all([
      fetch(`/api/docentes/${cedula}/titulos`),
      fetch(`/api/docentes/${cedula}/experiencias`)
    ]);

    const titulos = titulosRes.ok ? await titulosRes.json() : [];
    const experiencias = experienciasRes.ok ? await experienciasRes.json() : [];

    normalized.titulos          = titulos;
    normalized.experiencias     = experiencias;
    normalized.productividad    = {};
    normalized.categoriaActual  = normalized.categoria || '';
    normalized.tipoDoc          = 'CC';
    normalized.email            = normalized.correo || '';
    normalized.puntosAsignados  = normalized.ptsTitulosExp || 0;
    normalized.ptosProductividad = normalized.ptsAcumulados || 0;
    normalized.topeMaximo       = normalized.tope || 0;
    normalized.puntosDisponibles = normalized.diferencia || 0;
  } catch (err) {
    console.error('Error cargando datos relacionales de HV:', err);
    normalized.categoriaActual  = normalized.categoria || '';
    normalized.tipoDoc          = 'CC';
    normalized.titulos          = [];
    normalized.experiencias     = [];
  }

  cache[key] = normalized;
  return normalized;
}


