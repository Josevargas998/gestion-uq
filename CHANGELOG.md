# CHANGELOG — gestion-uq

Todos los cambios significativos del proyecto se documentan en este archivo.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).

---

## [0.6.0] — 2026-06-02

### 🏛️ Separación de Puntos Salariales y Bonificaciones

| Archivo | Descripción |
|---------|-------------|
| `src/components/ListaSolicitudes.jsx` | **Macro-tabs superiores**: nuevo filtro segmentado (Todas / Puntos Salariales / Bonificaciones). Los sub-tabs de tipo de producto se actualizan dinámicamente según la categoría seleccionada. Desempeño/Excepciones removido del panel de Solicitudes (no son solicitudes radicadas). |
| `src/components/Resoluciones.jsx` | **Pestaña Bonificaciones**: nueva tab independiente para resoluciones de bonificaciones (ponencias, tesis, postdoctorados, artículos no indexados). Filtro por `esBonificacion` en `buildProgramaGroups`. |
| `src/utils/docGenerator.jsx` | **Soporte `resolucion_bonificacion`**: título del documento generado cambia a "POR MEDIO DE LA CUAL SE RECONOCEN BONIFICACIONES ACADÉMICAS..." cuando corresponde. |

### 👨‍🏫 Filtro Exclusivo Planta Docente

| Archivo | Descripción |
|---------|-------------|
| `src/hooks/useDocentesData.js` | **Filtro planta en hooks**: `useDocentesPlanta` y `useDocentesIndex` ahora descartan docentes INACTIVOS y sin categoría escalafonaria. Solo llegan al UI los docentes con `estado = ACTIVO` y categoría Titular/Asociado/Asistente/Auxiliar. |
| `src/components/Dashboard.jsx` | **Fix categorías case-insensitive**: el conteo de Titulares, Asociados, etc. ahora usa `.toUpperCase()` para que no falle con registros en mayúsculas mezcladas (`"Titular"` vs `"TITULAR"`). |

### 🧹 Limpieza General

| Archivo | Descripción |
|---------|-------------|
| `vercel.json` | **Eliminado** — deploy a Vercel ya no aplica. |
| `DEPLOY_LOCAL.md` | **Eliminado** — documento de migración desde Supabase ya completada. |
| `scripts/migrate_from_supabase.cjs` | **Eliminado** — migración completada, script innecesario. |
| `index.html` | **CSP limpiada**: removidos dominios `*.supabase.co` y `wss://*.supabase.co`. |
| `AGENTS.md` | **Actualizado** al estado real del 2026-06-02: No Supabase, No Vercel, distinción bonificaciones/salariales, restricción planta. |

### 📦 Excel CIARP — Co-autores

| Archivo | Descripción |
|---------|-------------|
| `src/utils/exportCiarp.js` | **Co-autores sin metadatos ni puntos**: las filas adicionales de co-autores en el Excel exportado tienen `pts_asig = 0` y no llevan metadatos (ISBN, evento, etc.). Solo el docente principal lleva puntos y metadatos. |

### 🔄 Sesiones CIARP múltiples

| Archivo | Descripción |
|---------|-------------|
| `src/components/DetalleSolicitud.jsx` | **Selección de sesión al avanzar a CIARP**: cuando una solicitud llega a la etapa `ciarp`, el técnico escoge a cuál sesión abierta asignarla. Al retroceder se limpian tanto `acta_ciarp` como `sesion_ciarp_id`. |

---

## [0.5.0] — 2026-06-01

### 🗄️ Migración completa a PostgreSQL Local

| Archivo | Descripción |
|---------|-------------|
| `backend/server.js` | Backend Express con endpoints `/api/solicitudes`, `/api/docentes`, `/api/login`, `/api/upload-pdf`. Base de datos PostgreSQL local (`gestion_uq_db`). |
| `src/utils/api.js` | Cliente HTTP con JWT, manejo de errores, retry y polling de 30 s (reemplaza `supabaseApi.js`). |
| `src/context/AuthContext.jsx` | Login por cédula contra la tabla `usuarios` con bcrypt (salt 12). |
| `src/context/SolicitudesContext.jsx` | Polling silencioso cada 30 s — reemplaza Supabase Realtime. |

> ⚠️ `supabaseApi.js` fue eliminado en esta versión. No recrear.

---

## [0.4.0] — 2026-05-20

### 🔒 Seguridad

| Archivo | Descripción |
|---------|-------------|
| `src/utils/validate.js` | **Utilidad de validación**: `validateCedula`, `validateCorreo`, `validateText`, `validatePuntos`, `sanitizeText`, `cleanText`, `validateSolicitud`. |

### ⚡ Rendimiento

| Archivo | Descripción |
|---------|-------------|
| `src/context/SolicitudesContext.jsx` | **`useMemo` en listas filtradas**: `solicitudesProductividad` y `solicitudesAscenso` solo se recalculan cuando cambia `solicitudes`. |
| `src/hooks/useDebounce.js` | **Hook `useDebounce`**: retrasa búsquedas 300 ms para reducir renders innecesarios. |

### 🎨 Usabilidad

| Archivo | Descripción |
|---------|-------------|
| `src/components/EmptyState.jsx` | **Componente `EmptyState`**: estado vacío accesible y reutilizable con icono, título, descripción y acción opcional. |

---

## [0.3.0] — 2026-05-12

### 🐛 Bugs corregidos

| Archivo | Descripción |
|---------|-------------|
| `src/data.js` | **Crash rol `asistente`**: `ROL_COLORS` ahora incluye entrada `asistente: { bg: '#7b3fa8', ... }`. |
| `src/components/NuevaSolicitud.jsx` | **Dropdown sin click-outside**: corregido con `useRef` + `useEffect` y listener `mousedown`. |

### ♻️ Refactorización

| Archivo | Descripción |
|---------|-------------|
| `src/components/TopBar.jsx` | Extraído de `App.jsx`. Componente autónomo con sus propios hooks. |
| `src/components/WelcomeToast.jsx` | Extraído de `App.jsx`. Componente presentacional. |
| `src/App.jsx` | Simplificado de 346 a ~130 líneas. |

### 🔒 Seguridad

| Archivo | Descripción |
|---------|-------------|
| `backend/server.js` | Validación MIME, límite 50 MB en multer, `requireApiKey`, sanitización de nombres de archivo. |
| `src/components/PdfUploader.jsx` | `VITE_API_URL` y `VITE_API_SECRET` desde variables de entorno. |

### ✨ Nuevas features

| Archivo | Descripción |
|---------|-------------|
| `src/components/ErrorBoundary.jsx` | Captura excepciones por módulo. Stack trace visible en desarrollo. |

---

## Pendiente (próximas iteraciones)

- [ ] Permisos de Drive restringidos al dominio `@uniquindio.edu.co`
- [ ] Módulo de reportes: exportar estadísticas por periodo/facultad
- [ ] Notificaciones por correo para docentes al aprobar solicitud
