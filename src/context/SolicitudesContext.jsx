/**
 * SolicitudesContext.jsx — Estado global de solicitudes
 *
 * Migrado a base de datos local:
 * - Importa desde api.js en lugar de supabaseApi.js
 * - Soporta paginación: page, limit, total, totalPages
 * - Reemplaza suscripción Realtime de Supabase por polling cada 30 s
 * - useMemo en listas derivadas para evitar recómputo innecesario [P4]
 */
import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { fetchSolicitudes, updateSolicitud, deleteSolicitud } from '../utils/api';
import { INIT_SOLICITUDES } from '../data';
import { useAuth } from './AuthContext';
import { logger } from '../utils/logger';

const SolicitudesContext = createContext(null);

const POLL_INTERVAL_MS = 30_000; // Refresco automático cada 30 s

export function SolicitudesProvider({ children }) {
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [saveMsg,     setSaveMsg]     = useState('');
  const pollRef = useRef(null);

  const load = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    setError(null);
    try {
      const resGlobal = await fetchSolicitudes({ paginar: false });
      if (resGlobal.data.length > 0) {
        setSolicitudes(resGlobal.data);
      } else {
        setSolicitudes(INIT_SOLICITUDES);
      }
    } catch (err) {
      logger.error('Error cargando solicitudes:', err.message);
      if (!silencioso) {
        setSolicitudes(INIT_SOLICITUDES);
        setError(err.message);
      }
    } finally {
      if (!silencioso) setLoading(false);
    }
  }, []);

  // Carga inicial (solo si el usuario está autenticado)
  useEffect(() => {
    if (user) {
      load();
    }
  }, [load, user]);

  // Polling silencioso cada 30 s — reemplaza Supabase Realtime (solo si el usuario está autenticado)
  useEffect(() => {
    if (user) {
      pollRef.current = setInterval(() => load(true), POLL_INTERVAL_MS);
      return () => clearInterval(pollRef.current);
    }
  }, [load, user]);

  const usuarioCedula = user?.cedula;

  const actualizar = useCallback(async (sol) => {
    setSolicitudes(prev => prev.map(x => x.id === sol.id ? sol : x)); // optimistic
    setSaving(true);
    setSaveMsg('');
    try {
      const result = await updateSolicitud(sol, usuarioCedula);
      if (result.success) {
        setSolicitudes(prev => prev.map(x => x.id === sol.id ? result.sol : x));
        setSaveMsg('Guardado correctamente');
        return { success: true, sol: result.sol };
      }
      setSaveMsg('No se pudo guardar en la base de datos.');
      return { success: false, sol };
    } catch {
      setSaveMsg('Error al guardar');
      return { success: false, sol };
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 5000);
    }
  }, [usuarioCedula]);

  const crear = useCallback(async (sol) => {
    setSaving(true);
    setSaveMsg('');
    try {
      const result = await updateSolicitud(sol, usuarioCedula);
      const confirmed = (result.success && result.sol) ? result.sol : sol;
      setSolicitudes(prev => [confirmed, ...prev]);
      setSaveMsg(result.success ? 'Solicitud creada' : 'Guardado localmente. Verifica el servidor.');
      setTimeout(() => setSaveMsg(''), 5000);
      return { success: result.success, sol: confirmed };
    } catch {
      setSaveMsg('Error al crear solicitud');
      setTimeout(() => setSaveMsg(''), 5000);
      return { success: false, sol };
    } finally {
      setSaving(false);
    }
  }, [usuarioCedula]);

  const eliminar = useCallback(async (id) => {
    setSolicitudes(prev => prev.filter(s => s.id !== id));
    return await deleteSolicitud(id, usuarioCedula);
  }, [usuarioCedula]);

  const importar = useCallback(async (nuevasSolicitudes) => {
    setSolicitudes(prev => {
      const ids = new Set(prev.map(s => s.id));
      return [...nuevasSolicitudes.filter(s => !ids.has(s.id)), ...prev];
    });
  }, []);

  // Listas derivadas memoizadas [P4]
  const solicitudesProductividad = useMemo(
    () => solicitudes.filter(s => !['ascenso', 'daa', 'ddd', 'exp_calificada'].includes(s.tipo)),
    [solicitudes]
  );
  const solicitudesAscenso = useMemo(
    () => solicitudes.filter(s => s.tipo === 'ascenso'),
    [solicitudes]
  );
  const solicitudesCiarp = useMemo(
    () => solicitudes.filter(s => s.tipo !== 'ascenso' || s.estado === 'aprobado_cei' || s.estado === 'aprobado'),
    [solicitudes]
  );

  return (
    <SolicitudesContext.Provider value={{
      solicitudes, solicitudesProductividad, solicitudesAscenso, solicitudesCiarp,
      loading, error, saving, saveMsg,
      actualizar, crear, eliminar, importar, recargar: load,
    }}>
      {children}
    </SolicitudesContext.Provider>
  );
}

export function useSolicitudes() {
  const ctx = useContext(SolicitudesContext);
  if (!ctx) throw new Error('useSolicitudes debe usarse dentro de SolicitudesProvider');
  return ctx;
}
