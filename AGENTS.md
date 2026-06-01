# gestion-uq — AGENTS.md

> Última actualización: 2026-05-12

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Vite 5 + React 18 SPA — navegación por estado `nav` (sin React Router) |
| Estado global | Context API: `AuthContext`, `SolicitudesContext`, `NotificationContext` |
| Backend | Express (backend/server.js) — subida de PDFs a Google Drive (puerto 3001) |
| Base de datos | PostgreSQL Local — tablas: solicitudes, usuarios, docentes |
| Auth | Login por cédula contra tabla `usuarios` (password = `profesorlaes@2026`) |
| Deploy | Vercel SPA — `vercel.json` reescribe todas las rutas a `/index.html` |

## Comandos de desarrollo

```sh
npm run dev                       # Vite en http://localhost:5173
node backend/server.js            # Backend Express en http://localhost:3001
npm run build                     # Produce dist/
npm run lint                      # ESLint (JSX, sin TypeScript)

# Importar datos desde CSVs → PostgreSQL Local
node scripts/import/upload_productividad.cjs
node scripts/import/upload_ascensos.cjs
```

No hay test runner ni typecheck configurados.

## Estructura del proyecto

```
src/
├── App.jsx                     # Router por estado `nav` — orquesta páginas y contextos
├── main.jsx                    # Entrypoint — monta contextos sobre <App>
├── data.js                     # Constantes: TIPOS, PROGRAMAS, FACULTADES, INIT_SOLICITUDES
├── helpers.js                  # rutaLabel(), buildTimeline(), badgeEtapa(), labelEtapa()
├── index.css                   # Design tokens UQ (--uq-green, --uq-blue, etc.)
│
├── context/
│   ├── AuthContext.jsx         # useAuth() → { user, login, logout }
│   ├── SolicitudesContext.jsx  # useSolicitudes() → { solicitudes, actualizar, crear, importar, ... }
│   └── NotificationContext.jsx # useNotification() → { success(), error() } + ToastContainer
│
├── hooks/
│   └── useDocentesData.js      # useDocentesIndex() — carga docentes desde BD con caché
│
├── components/
│   ├── Login.jsx               # Formulario de cédula → valida contra API local
│   ├── Shell.jsx               # Layout: sidebar + contenido principal
│   ├── TopBar.jsx              # Barra superior: nav, guardado, exportar/importar, perfil
│   ├── WelcomeToast.jsx        # Toast de bienvenida post-login (4.5 s)
│   ├── ErrorBoundary.jsx       # Class component — captura errores de render; dev muestra stack trace
│   ├── ToastContainer.jsx      # Notificaciones flotantes (usa NotificationContext)
│   ├── ConfirmDialog.jsx       # Modal de confirmación reutilizable
│   ├── LoadingSkeleton.jsx     # Placeholder animado de carga
│   ├── Dashboard.jsx           # Panel principal con KPIs y accesos rápidos
│   ├── ListaSolicitudes.jsx    # Tabla filtrable de solicitudes
│   ├── NuevaSolicitud.jsx      # Wizard 3 pasos para crear solicitud (ID = crypto.randomUUID)
│   ├── DetalleSolicitud.jsx    # Vista completa + edición de solicitud individual
│   ├── GestorCiarp.jsx         # Módulo CIARP — tabs: proceso, listos, comités, aprobados, histórico
│   ├── ComitesCiarp.jsx        # Comités CAP — agrupados por acta, notificación masiva por email
│   ├── Resoluciones.jsx        # Proyección y gestión de resoluciones
│   ├── Reportes.jsx            # Estadísticas con gráficos (recharts)
│   ├── BancoPares.jsx          # Banco de pares evaluadores con historial
│   ├── GestorDocentes.jsx      # Módulo unificado: planta docente + hoja de vida
│   ├── EscalafonDocente.jsx    # Escalafón y puntos del docente
│   ├── HojaVidaDocente.jsx     # HV detallada (postgrado, pregrado, producción)
│   ├── ModuloCEI.jsx           # Módulo CEI — seguimiento de ascensos
│   ├── ActasAprobadas.jsx      # Actas históricas del CIARP
│   ├── Decreto1279Panel.jsx    # Panel de referencia del Decreto 1279
│   ├── PdfUploader.jsx         # Subida de PDFs/DOC al backend (usa VITE_API_URL)
│   └── shared.jsx              # Componentes UI reutilizables (badges, botones, etc.)
│
└── utils/
    ├── supabaseApi.js          # CRUD: fetchSolicitudes, updateSolicitud, fetchDocentes, etc.
    ├── excelIO.js              # Importar/exportar XLSX (formato CIARP)
    ├── emailNotificacion.js    # HTML de correo CIARP + envío vía Google Apps Script
    └── docGenerator.jsx        # Generación de memorandos y resoluciones (print/PDF)

backend/
├── server.js                   # Express v2: upload-pdf, health check, API key auth, error handler
└── uploads/                    # Fallback local cuando no hay credenciales de Drive

scripts/import/
├── upload_productividad.cjs    # Lee CSVs → upsert solicitudes (SOL-2026-*)
└── upload_ascensos.cjs         # Lee CSVs → upsert solicitudes tipo=ascenso

public/data/hv/{cedula}.json    # JSONs de hojas de vida (enriquecidos con DB)
ejemplos/                       # CSVs de muestra + CodigoGAS_Actualizado.js
```

## Módulos CIARP y CEI

**CIARP (Productividad)**  
Etapas: `recibida → clasificada → evaluacion_interna | evaluacion_externa → informe → ciarp → proyectar_resoluciones → archivada`  
La ruta depende del tipo de producto (`directo`, `internos`, `externos`, `informe_directo`).

**CEI (Ascensos)**  
Tipo = `ascenso`, gestionado en `ModuloCEI.jsx`. Etapas propias del proceso de escalafón.

**IDs de solicitudes**  
Formato: `SOL-{año}-PROD-{8hex}` (productividad) / `SOL-{año}-ASC-{n}` (ascensos).  
Generados con `crypto.randomUUID()` — sin colisiones.

## Variables de entorno

Ver `.env.example` para la lista completa. Claves relevantes:

```env
# Frontend (.env.local)
VITE_API_URL=http://localhost:3001          # URL del backend Express
VITE_API_SECRET=                            # Clave API para /api/upload-pdf

# Backend (backend/.env)
API_SECRET=<min_32_chars>                   # Debe coincidir con VITE_API_SECRET
GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN RSA..."
GOOGLE_DRIVE_CLIENT_EMAIL=...
GOOGLE_DRIVE_FOLDER_ID=...
PORT=3001
```

## Seguridad — estado actual

| Item | Estado |
|------|--------|
| Backend `/api/upload-pdf` | Protegido con `requireApiKey` (header `X-API-Key`) |
| Validación de archivos | MIME + extensión + 50 MB límite en multer |
| Sanitización de nombres | `path.basename()` + regex en `sanitizeFileName()` |
| Cifrado contraseñas | ✅ **Bcrypt** (salt: 12) |
| Drive permisos | `anyone/reader` — pendiente restringir a `@uniquindio.edu.co` |

## Usuarios

| Cédula | Nombre | Rol |
|--------|--------|-----|
| `1094970478` | José Heriberto Vargas Espinosa | admin |
| `41961206` | Lina Marcela Cruz Calderón | tecnico |
| `1097725174` | Iván Darío Londoño Vargas | lectura |
| `24498485` | Lina Juliet Gil Barrero | lectura |
| `52327887` | Luz Amparo Celis Buriticá | lectura |

> Rol `asistente` disponible en la BD — color `#7b3fa8` en `ROL_COLORS`.

## Restricciones para agentes de código

- **No TypeScript** — plain JSX en todo el proyecto
- **No frameworks CSS** — usar tokens `--uq-green`, `--uq-blue`, `--surface`, etc. definidos en `index.css`
- **No React Router** — la navegación es el estado `nav` (string) en `App.jsx`
- **Escrituras a BD** van por `SolicitudesContext` → `api.js`
- **`googleSheetsApi.js`** fue eliminado del repo — no recrear ni referenciar
- El backend corre en un proceso separado (`node backend/server.js`) — no es parte del build de Vite
- `ErrorBoundary.jsx` envuelve cada página en `App.jsx` — siempre mantener este patrón al agregar páginas nuevas
- `TopBar.jsx` y `WelcomeToast.jsx` usan hooks de contexto directamente — no volver a definirlos dentro de `App`
