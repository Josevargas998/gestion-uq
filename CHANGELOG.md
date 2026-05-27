# CHANGELOG — gestion-uq

Todos los cambios significativos del proyecto se documentan en este archivo.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).

---

## [Unreleased]

---

## [0.4.0] — 2026-05-20

### 🔒 Seguridad — ISO 25010 §4.6

| Archivo | Descripción |
|---------|-------------|
| `src/utils/validate.js` | **[NUEVO] Utilidad de validación de entradas**: funciones `validateCedula`, `validateCorreo`, `validateText`, `validatePuntos`, `sanitizeText`, `cleanText` y `validateSolicitud`. Previene datos malformados antes de llegar a Supabase y mitiga XSS básico con `sanitizeText`. |

### ⚡ Rendimiento — ISO 25010 §4.8

| Archivo | Descripción |
|---------|-------------|
| `src/context/SolicitudesContext.jsx` | **`useMemo` en listas filtradas**: `solicitudesProductividad` y `solicitudesAscenso` ahora se recalculan únicamente cuando cambia el array `solicitudes`, eliminando dos `.filter()` en cada render no relacionado. |
| `src/hooks/useDebounce.js` | **[NUEVO] Hook `useDebounce`**: retrasa la propagación de valores de búsqueda (default 300 ms), reduciendo llamadas a filtros/Supabase mientras el usuario escribe. |

### 🔄 Fiabilidad — ISO 25010 §4.4

| Archivo | Descripción |
|---------|-------------|
| `src/utils/supabaseApi.js` | **`withRetry()` — retroceso exponencial**: nuevo helper interno que reintenta peticiones a Supabase hasta 3 veces con espera 500 ms → 1 s → 2 s ante fallos de red (HTTP 5xx o sin respuesta). Los errores de lógica (4xx, RLS) no se reintentan. `fetchSolicitudes` usa `withRetry` en cada página del bucle de auto-paginación. |

### 🎨 Usabilidad — ISO 25010 §4.2

| Archivo | Descripción |
|---------|-------------|
| `src/components/EmptyState.jsx` | **[NUEVO] Componente `EmptyState`**: estado vacío accesible (`role="status"`) y reutilizable con icono, título, descripción y acción opcional. Prop `compact` para tablas con poco espacio. |

### 🧪 Mantenibilidad — ISO 25010 §4.9

| Archivo | Descripción |
|---------|-------------|
| `src/tests/validate.test.js` | **[NUEVO] 35 tests para `validate.js`**: cubre todos los validadores con casos felices, límites exactos, valores nulos, y escenarios multi-error en `validateSolicitud`. |

---

## [0.3.0] — 2026-05-12

### 🐛 Bugs corregidos

| Archivo | Descripción |
|---------|-------------|
| `src/data.js` | **Crash para rol `asistente`**: `ROL_COLORS` no tenía entrada para ese rol. Al iniciar sesión un usuario con `rol='asistente'`, `rc` era `undefined` y el acceso a `rc.bg` / `rc.light` causaba pantalla blanca. Agregada entrada `asistente: { bg: '#7b3fa8', ... }`. |
| `src/components/NuevaSolicitud.jsx` | **Dropdown de docente sin click-outside**: el dropdown de sugerencias permanecía abierto indefinidamente al hacer clic fuera del input. Agregado `useRef` + `useEffect` con `mousedown` listener. |
| `src/components/NuevaSolicitud.jsx` | **Prop `solicitudesExistentes` sin uso**: se recibía pero nunca se usaba. Ahora se utiliza en el paso 3 (Revisión) para detectar y advertir sobre posibles solicitudes duplicadas del mismo docente y tipo. |

---

### ♻️ Refactorización

| Archivo | Descripción |
|---------|-------------|
| `src/components/TopBar.jsx` | **Nuevo archivo**: `TopBar` extraido de `App.jsx`. Ahora es un componente autónomo que usa sus propios hooks (`useAuth`, `useSolicitudes`, `useNotification`) y gestiona su propio estado local (dropdowns de exportar/perfil) y refs. Elimina el anti-patrón de redefinir el componente dentro de `App` en cada render. |
| `src/components/WelcomeToast.jsx` | **Nuevo archivo**: toast de bienvenida extraido de `App.jsx`. Componente puramente presentacional. Recibe `show` y `user` como props. |
| `src/App.jsx` | **Simplificado**: de 346 a ~130 líneas. Eliminados refs, estado de UI de TopBar, `handleFileChange`, `getInitials`, `maskCedula`, `ROL_COLORS`, y los imports de `excelIO`. `App` ahora se enfoca únicamente en el routing por estado y la coordinación de páginas. |

---

### 📝 Notas

- `CHANGELOG` anterior decía límite de archivo = 20 MB; el backend tiene 50 MB desde el inicio. Corregido.
- `googleSheetsApi.js` ya había sido eliminado del repositorio en el pull anterior (no se encontró al intentar `git rm`).

---

### 🔒 Seguridad

| Archivo | Descripción |
|---------|-------------|
| `backend/server.js` | **Validación de tipo MIME**: solo se aceptan `application/pdf`, `application/msword` y `.docx`. Archivos de otros tipos son rechazados con 400. |
| `backend/server.js` | **Límite de tamaño**: `multer` configurado con `fileSize: 20 MB`. |
| `backend/server.js` | **Autenticación del endpoint**: nuevo middleware `requireApiKey` que verifica el header `X-API-Key` contra la variable `API_SECRET` del `.env`. Sin configurar, pasa en modo dev. |
| `backend/server.js` | **Sanitización de nombre de archivo**: `path.basename()` + regex elimina caracteres especiales para prevenir path traversal. |
| `src/components/PdfUploader.jsx` | **API_BASE deja de ser hardcoded**: reemplazado por `import.meta.env.VITE_API_URL` (fallback `localhost:3001`). Añadido header `X-API-Key` cuando `VITE_API_SECRET` está definido. |
| `supabase/migrations/002_rls_por_rol.sql` | **RLS abierto cerrado**: reemplazadas las políticas `FOR ALL USING (TRUE)` por políticas segmentadas: `anon` solo `SELECT`; `service_role` acceso completo. Índices añadidos en `usuarios.cedula` y `usuarios.activo`. |

---

### 🧹 Limpieza de código

| Archivo | Descripción |
|---------|-------------|
| `src/components/ComitesCiarp.jsx` | **Import muerto eliminado**: `import { updateSolicitud } from '../utils/googleSheetsApi.js'` nunca fue usado en el componente. Eliminado. |
| `src/utils/emailNotificacion.js` | **Dependencia de googleSheetsApi desacoplada**: la constante `API_URL` fue movida inline como `GAS_MAIL_URL` en el mismo archivo. El `import` mid-file también violaba el orden ESM. |
| `src/utils/googleSheetsApi.js` | **Archivo legacy aislado**: ya no es importado por ningún componente activo. Puede eliminarse de forma segura del repo (ver nota abajo). |

---

### ✨ Nuevas features

| Archivo | Descripción |
|---------|-------------|
| `src/components/ErrorBoundary.jsx` | **ErrorBoundary global**: nuevo componente de clase que captura excepciones en el árbol de componentes. Muestra mensaje amigable con diseño UQ. En desarrollo muestra el stack trace en un `<details>` colapsado. Botones de "Intentar de nuevo" y "Recargar aplicación". |
| `src/App.jsx` | **ErrorBoundary integrado en dos niveles**: (1) cada página en `W()` tiene su propio `ErrorBoundary` para aislar fallos por módulo; (2) el `<Shell>` completo también está envuelto. |
| `.env.example` | **Plantilla de variables de entorno**: documenta `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`, `VITE_API_URL`, `VITE_API_SECRET` con comentarios sobre dónde van frontend vs backend. |

---

### 📝 Notas de migración

#### `supabase/migrations/002_rls_por_rol.sql`
Ejecutar manualmente en **Supabase Dashboard → SQL Editor**:
1. Elimina las políticas `USING (TRUE)` existentes
2. Crea políticas separadas por rol (`anon` / `service_role`)
3. Crea índices en `usuarios.cedula` y `usuarios.activo`

#### Variables de entorno nuevas

```env
# Frontend (.env.local)
VITE_API_URL=http://localhost:3001        # URL del backend Express
VITE_API_SECRET=                          # Clave API (vacío en dev)

# Backend (backend/.env)
API_SECRET=clave_segura_min_32_chars
```

#### `googleSheetsApi.js` — ¿se puede borrar?

**Sí, es seguro** tras ejecutar la migración. Verificación:
- `ComitesCiarp.jsx` → import eliminado ✅
- `emailNotificacion.js` → `API_URL` movida inline como `GAS_MAIL_URL` ✅
- `supabaseApi.js` → solo lo menciona en un comentario, no importa ✅

```sh
git rm src/utils/googleSheetsApi.js
```

---

## Pendiente (próxima iteración)

- [ ] Mover `updateSolicitud()` al backend con `service_role` key → eliminar `solicitudes_write_anon_temporal` de RLS
- [ ] Migrar autenticación a Supabase Auth (OTP email) → eliminar login cédula=contraseña
- [ ] Permisos de Drive restringidos al dominio `@uniquindio.edu.co`
- [ ] Eliminar directorio `nextjs-drive/` (código muerto)
