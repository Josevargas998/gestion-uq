/**
 * api.js — Cliente HTTP para el backend local Express
 *
 * Base URL: window.location.origin (mismo servidor que sirve la app)
 */

import { normalizeRow } from '../helpers.js';

const BASE = '';  // mismo origen — Express sirve tanto la API como el frontend
const TOKEN_KEY = 'gestion_uq_token';

// ─────────────────────────────────────────────
// TOKEN JWT — helpers
// ─────────────────────────────────────────────

export function setAuthToken(token) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else       sessionStorage.removeItem(TOKEN_KEY);
}

export function getAuthToken() {
  return sessionStorage.getItem(TOKEN_KEY) || null;
}

// ─────────────────────────────────────────────
// HELPER — fetch con manejo de errores + JWT
// ─────────────────────────────────────────────

let onSessionExpiredCallback = null;

/**
 * Registra un callback global que se disparará si el backend
 * devuelve 401 (Unauthorized) o 403 (Forbidden), indicando expiración del JWT.
 */
export function registerSessionExpiredCallback(cb) {
  onSessionExpiredCallback = cb;
}

async function apiFetch(path, options = {}) {
  const token = getAuthToken();
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
  // Extraer headers de options para no sobreescribirlos con el spread de ...options
  const { headers: extraHeaders, ...restOptions } = options;
  const res = await fetch(`${BASE}${path}`, {
    ...restOptions,
    headers: { 'Content-Type': 'application/json', ...authHeader, ...extraHeaders },
  });
  if (!res.ok) {
    if (res.status === 401) {
      if (onSessionExpiredCallback) {
        onSessionExpiredCallback();
      }
    }
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.error || `HTTP ${res.status}`), { status: res.status });
  }
  return res.json();
}


// ─────────────────────────────────────────────
// SOLICITUDES
// ─────────────────────────────────────────────

/**
 * fetchSolicitudes({ page = 1, limit = 50 })
 * Devuelve: { data: SolicitudRow[], total, page, totalPages }
 */
export async function fetchSolicitudes({ page = 1, limit = 50, paginar = true, cedula = null } = {}) {
  try {
    const params = new URLSearchParams();
    if (paginar === false) {
      params.set('paginar', 'false');
    } else {
      params.set('page', page);
      params.set('limit', limit);
    }
    if (cedula) {
      params.set('cedula', cedula);
    }
    const res = await apiFetch(`/api/solicitudes?${params.toString()}`);
    // El backend devuelve { data, total, page, totalPages }
    const data = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
    return {
      data:       data.map(normalizeRow),
      total:      res.total      ?? data.length,
      page:       res.page       ?? page,
      totalPages: res.totalPages ?? 1,
    };
  } catch (err) {
    console.error('[API] Error cargando solicitudes:', err.message);
    return { data: [], total: 0, page: 1, totalPages: 1 };
  }
}

export async function fetchSolicitudById(id) {
  try {
    const data = await apiFetch(`/api/solicitudes/${encodeURIComponent(id)}`);
    return normalizeRow(data);
  } catch (err) {
    console.error('[API] Error cargando solicitud por ID:', err.message);
    return null;
  }
}

export async function updateSolicitud(sol) {
  try {
    const isNew = !sol.id || sol.id.startsWith('SOL-TEMP-');
    const method = isNew ? 'POST' : 'PUT';
    const url    = isNew ? '/api/solicitudes' : `/api/solicitudes/${encodeURIComponent(sol.id)}`;
    const data = await apiFetch(url, { method, body: JSON.stringify(sol) });
    return { success: true, sol: normalizeRow(data) };
  } catch (err) {
    console.error('[API] Error guardando solicitud:', err.message);
    return { success: false, sol };
  }
}

export async function deleteSolicitud(id) {
  try {
    await apiFetch(`/api/solicitudes/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return { success: true };
  } catch (err) {
    console.error('[API] Error eliminando solicitud:', err.message);
    return { success: false };
  }
}

export async function deleteProductividadHistorica(id) {
  try {
    await apiFetch(`/api/productividad-historica/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return { success: true };
  } catch (err) {
    console.error('[API] Error eliminando productividad histórica:', err.message);
    return { success: false };
  }
}

// Búsqueda compatible (se hace en cliente sobre todos los registros)
export async function buscarSolicitudes(filtros = {}) {
  try {
    const params = new URLSearchParams();
    if (filtros.query)      params.set('q',       filtros.query);
    if (filtros.etapa)      params.set('etapa',   filtros.etapa);
    if (filtros.tipo)       params.set('tipo',    filtros.tipo);
    if (filtros.estado)     params.set('estado',  filtros.estado);
    if (filtros.facultad)   params.set('facultad',filtros.facultad);
    if (filtros.fechaDesde) params.set('desde',   filtros.fechaDesde);
    if (filtros.fechaHasta) params.set('hasta',   filtros.fechaHasta);
    params.set('limit',  filtros.limit  || 100);
    params.set('offset', filtros.offset || 0);
    const data = await apiFetch(`/api/solicitudes/buscar?${params.toString()}`);
    return { data: (data.rows || []).map(normalizeRow), total: data.total || 0 };
  } catch (err) {
    console.error('[API] Error en búsqueda:', err.message);
    return { data: [], total: 0 };
  }
}

// ─────────────────────────────────────────────
// AUTENTICACIÓN
// ─────────────────────────────────────────────

/**
 * loginConCedula(cedula, password?)
 * - Sin password  → intento como docente (solo cédula)
 * - Con password  → intento como usuario de oficina (admin/tecnico)
 * Devuelve el objeto { cedula, nombre, rol, token } o lanza error.
 */
export async function loginConCedula(cedula, password) {
  const body = password
    ? { cedula, password }
    : { cedula };

  // No usar apiFetch aquí para NO inyectar token viejo en el login
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw Object.assign(
      new Error(errBody.error || `HTTP ${res.status}`),
      { status: res.status }
    );
  }

  return res.json();
}

// ─────────────────────────────────────────────
// DOCENTES
// ─────────────────────────────────────────────

export async function fetchDocentes(campos = null) {
  try {
    const url = campos ? `/api/docentes?campos=${encodeURIComponent(campos)}` : '/api/docentes';
    const data = await apiFetch(url);
    return data || [];
  } catch (err) {
    console.error('[API] Error cargando docentes:', err.message);
    return [];
  }
}

export async function fetchDocentePorCedula(cedula) {
  try {
    return await apiFetch(`/api/docentes/${encodeURIComponent(cedula)}`);
  } catch (err) {
    console.error('[API] Error cargando docente:', err.message);
    return null;
  }
}

export async function updateDocente(cedula, campos) {
  try {
    const data = await apiFetch(`/api/docentes/${encodeURIComponent(cedula)}`, {
      method: 'PUT',
      body: JSON.stringify(campos),
    });
    return { success: true, docente: data };
  } catch (err) {
    console.error('[API] Error actualizando docente:', err.message);
    return { success: false };
  }
}

// ─────────────────────────────────────────────
// ESTADÍSTICAS
// ─────────────────────────────────────────────

export async function fetchEstadisticas() {
  try {
    return await apiFetch('/api/estadisticas');
  } catch (err) {
    console.error('[API] Error cargando estadísticas:', err.message);
    return null;
  }
}

// ─────────────────────────────────────────────
// SESIONES CIARP
// ─────────────────────────────────────────────

/** Lista todas las sesiones CIARP con totales de solicitudes */
export async function fetchSesionesCiarp() {
  return apiFetch('/api/sesiones-ciarp');
}

export async function cerrarYAbrirSesionCiarp(id) {
  return apiFetch(`/api/sesiones-ciarp/${encodeURIComponent(id)}/cerrar-y-abrir`, {
    method: 'POST'
  });
}

/** Número sugerido para la próxima sesión del año */
export async function getSiguienteNumeroCiarp(anio) {
  const year = anio || new Date().getFullYear();
  return apiFetch(`/api/sesiones-ciarp/siguiente?anio=${year}`);
}

/** Solicitudes de una sesión para exportar (informe) */
export async function getInformeSesionCiarp(id) {
  return apiFetch(`/api/sesiones-ciarp/${encodeURIComponent(id)}/informe`);
}

/** Crea una nueva sesión CIARP */
export async function createSesionCiarp(datos) {
  return apiFetch('/api/sesiones-ciarp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
}

/** Actualiza estado/notas de una sesión CIARP */
export async function updateSesionCiarp(id, datos) {
  return apiFetch(`/api/sesiones-ciarp/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
}

/** Elimina una sesión CIARP */
export async function deleteSesionCiarp(id) {
  return apiFetch(`/api/sesiones-ciarp/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}

// ─────────────────────────────────────────────
// SESIONES CEI
// ─────────────────────────────────────────────

/** Lista todas las sesiones CEI con totales */
export async function fetchSesionesCei() {
  return apiFetch('/api/sesiones-cei');
}

export async function cerrarYAbrirSesionCei(id) {
  return apiFetch(`/api/sesiones-cei/${encodeURIComponent(id)}/cerrar-y-abrir`, {
    method: 'POST'
  });
}

/** Número sugerido para la próxima sesión CEI del año */
export async function getSiguienteNumeroCei(anio) {
  const year = anio || new Date().getFullYear();
  return apiFetch(`/api/sesiones-cei/siguiente?anio=${year}`);
}

/** Solicitudes de una sesión CEI para exportar */
export async function getInformeSesionCei(id) {
  return apiFetch(`/api/sesiones-cei/${encodeURIComponent(id)}/informe`);
}

/** Crea una nueva sesión CEI */
export async function createSesionCei(datos) {
  return apiFetch('/api/sesiones-cei', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
}

/** Actualiza estado/notas de una sesión CEI */
export async function updateSesionCei(id, datos) {
  return apiFetch(`/api/sesiones-cei/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
}

/** Elimina una sesión CEI */
export async function deleteSesionCei(id) {
  return apiFetch(`/api/sesiones-cei/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}
