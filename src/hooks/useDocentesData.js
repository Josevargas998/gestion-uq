import { useState, useEffect, useMemo } from 'react';
import { fetchDocentes, fetchDocentePorCedula } from '../utils/api.js';
import { normalizeDocente } from '../helpers.js';
import { useSolicitudes } from '../context/SolicitudesContext.jsx';

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
        const mapped = (rows || []).map(r => ({
          ...r,
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
        const normalized = (rows || []).map(normalizeDocente);
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
      .filter(s => s.estado === 'aprobado' && etapasValidas.includes(s.etapa) && Number(s.pts_asig) > 0 && s.id?.startsWith('SOL-'))
      .forEach(s => {
        map[String(s.cedula)] = (map[String(s.cedula)] || 0) + (Number(s.pts_asig) || 0);
      });
    return map;
  }, [solicitudes]);

  const data = useMemo(() =>
    DOCENTES_PLANTA.map(d => {
      const nuevos           = solNuevosMap[String(d.cedula)] || 0;
      let ptsAcumulados    = d.ptsAcumulados + nuevos;
      let ptsTotalSalarial = (d.ptsTotalSalarial || d.ptsAcumulados) + nuevos;

      // Si existe un tope de productividad y lo sobrepasa, se trunca estrictamente (no hay banco de puntos)
      if (d.tope > 0 && ptsAcumulados > d.tope) {
         const limiteNuevos = Math.max(0, d.tope - d.ptsAcumulados); // Cuántos puntos le faltaban antes
         const nuevosReales = Math.min(nuevos, limiteNuevos);
         
         ptsAcumulados = d.tope;
         ptsTotalSalarial = (d.ptsTotalSalarial || d.ptsAcumulados) + nuevosReales;
      }

      return {
        ...d,
        ptsAcumulados,
        ptsTotalSalarial,
        diferencia:   d.tope > 0 ? d.tope - ptsAcumulados : 0,
        ptsSolNuevos: nuevos,
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


