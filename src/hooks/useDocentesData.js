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

    fetchDocentes('cedula,nombre,correo,facultad,categoria,programa,dedicacion,fecha_ingreso,especializacion,maestria,doctorado')
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

  return { data, loading };
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
    // TIPOS ya está importado al top del archivo
    
    solicitudes
      .filter(s => s.estado === 'aprobado' && etapasValidas.includes(s.etapa) && Number(s.pts_asig) > 0 && s.id?.startsWith('SOL-'))
      .forEach(s => {
        const c = String(s.cedula);
        if (!map[c]) map[c] = { prod: 0, exc: 0 };
        
        const pts = Number(s.pts_asig) || 0;
        const infoTipo = TIPOS[s.tipo] || {};
        
        if (infoTipo.esExcepcion) {
           map[c].exc += pts;
        } else if (infoTipo.esBonificacion || s.tipo === 'ascenso') {
           // Bonificaciones o ascensos: no suman ni al acumulado ni al salarial mensual
        } else {
           map[c].prod += pts;
        }
      });
    return map;
  }, [solicitudes]);

  const data = useMemo(() =>
    DOCENTES_PLANTA.map(d => {
      const { prod = 0, exc = 0 } = solNuevosMap[String(d.cedula)] || {};
      
      let ptsAcumulados = d.ptsAcumulados + prod;
      let puntosRealesSumados = prod;

      // Si existe un tope de productividad y lo sobrepasa, se trunca estrictamente (no hay banco de puntos)
      if (d.tope > 0 && ptsAcumulados > d.tope) {
         puntosRealesSumados = Math.max(0, d.tope - d.ptsAcumulados); // Cuántos puntos de prod le faltaban antes
         ptsAcumulados = d.tope;
      }

      // El salario se forma de: base salarial + puntos prod nuevos reales + excepciones (que no tienen tope)
      const ptsTotalSalarial = (d.ptsTotalSalarial || d.ptsAcumulados) + puntosRealesSumados + exc;

      return {
        ...d,
        ptsAcumulados,
        ptsTotalSalarial,
        diferencia: d.tope > 0 ? d.tope - ptsAcumulados : 0,
        ptsSolNuevos: puntosRealesSumados + exc, // Total real que impactó salario
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


