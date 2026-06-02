# gestion-uq — AGENTS.md

> Última actualización: 2026-06-02

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Vite 5 + React 18 SPA — navegación por estado `nav` (sin React Router) |
| Estado global | Context API: `AuthContext`, `SolicitudesContext`, `NotificationContext` |
| Backend | Express (backend/server.js) — subida de PDFs a Google Drive (puerto 3001) |
| Base de datos | PostgreSQL Local — tablas: solicitudes, usuarios, docentes |
| Auth | Login por cédula contra tabla `usuarios` (bcrypt salt 12) |
| Deploy | 100% local — Vite dev en :5173 · Express en :3001 |

> ⚠️ **Supabase y Vercel han sido eliminados completamente.** No referenciar ni recrear ningún archivo relacionado con esas plataformas.

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
├── data.js                     # Constantes: TIPOS (con esBonificacion/esExcepcion), PROGRAMAS, FACULTADES
├── helpers.js                  # rutaLabel(), buildTimeline(), badgeEtapa(), labelEtapa(), getSemaforo()
├── index.css                   # Design tokens UQ (--uq-green, --uq-blue, etc.)
│
├── context/
│   ├── AuthContext.jsx         # useAuth() → { user, login, logout }
│   ├── SolicitudesContext.jsx  # useSolicitudes() → { solicitudes, actualizar, crear, importar, ... }
│   └── NotificationContext.jsx # useNotification() → { success(), error() } + ToastContainer
│
├── hooks/
│   └── useDocentesData.js      # useDocentesIndex(), useDocentesPlanta(), useDocentesConNuevos()
│                               # FILTRA: solo docentes ACTIVOS con categoría escalafonaria (planta)
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
│   ├── ListaSolicitudes.jsx    # Tabla filtrable: macro-tabs (Puntos Salariales / Bonificaciones / Todas)
│   ├── NuevaSolicitud.jsx      # Wizard 3 pasos para crear solicitud (ID = crypto.randomUUID)
│   ├── DetalleSolicitud.jsx    # Vista completa + edición de solicitud individual
│   ├── DatosProductoPanel.jsx  # Panel de metadatos CIARP (ISBN, evento, co-autores, etc.)
│   ├── GestorCiarp.jsx         # Módulo CIARP — tabs: proceso, listos, comités (multi-sesión), aprobados, histórico
│   ├── ComitesCiarp.jsx        # Comités CAP — agrupados por acta, notificación masiva por email
│   ├── Resoluciones.jsx        # Proyección y gestión de resoluciones (Productividad / Bonificaciones / Experiencia / Ascensos)
│   ├── Reportes.jsx            # Estadísticas con gráficos (recharts)
│   ├── BancoPares.jsx          # Banco de pares evaluadores con historial
│   ├── GestorDocentes.jsx      # Módulo EXCLUSIVO planta docente — control de topes y puntos (Decreto 1279)
│   ├── EscalafonDocente.jsx    # Escalafón y puntos del docente
│   ├── HojaVidaDocente.jsx     # HV detallada (postgrado, pregrado, producción)
│   ├── ModuloCEI.jsx           # Módulo CEI — seguimiento de ascensos
│   ├── ActasAprobadas.jsx      # Actas históricas del CIARP
│   ├── Decreto1279Panel.jsx    # Panel de referencia del Decreto 1279
│   ├── PdfUploader.jsx         # Subida de PDFs/DOC al backend (usa VITE_API_URL)
│   └── shared.jsx              # Componentes UI reutilizables (badges, botones, etc.)
│
└── utils/
    ├── api.js                  # CRUD: fetchSolicitudes, updateSolicitud, fetchDocentes, etc.
    ├── exportCiarp.js          # Exporta a XLSX el informe CIARP (co-autores con pts=0 y sin metadatos)
    ├── excelIO.js              # Importar/exportar XLSX (formato CIARP)
    ├── emailNotificacion.js    # HTML de correo CIARP + envío vía Google Apps Script
    └── docGenerator.jsx        # Generación de memorandos y resoluciones (print/PDF)
                                # Soporta: resolucion_productividad, resolucion_bonificacion,
                                #          resolucion_experiencia, resolucion_ascenso

backend/
├── server.js                   # Express: /api/solicitudes, /api/docentes, /api/upload-pdf, /api/login
└── uploads/                    # Fallback local cuando no hay credenciales de Drive

scripts/import/
├── upload_productividad.cjs    # Lee CSVs → upsert solicitudes (SOL-2026-PROD-*)
└── upload_ascensos.cjs         # Lee CSVs → upsert solicitudes tipo=ascenso

public/data/hv/{cedula}.json    # JSONs de hojas de vida históricas (enriquecidos desde BD)
ejemplos/                       # CSVs de muestra + CodigoGAS_Actualizado.js
```

## Módulos CIARP y CEI

**CIARP (Productividad)**
Etapas: `recibida → clasificada → evaluacion_interna | evaluacion_externa → informe → ciarp → proyectar_resoluciones → archivada`
La ruta depende del tipo de producto (`directo`, `internos`, `externos`, `informe_directo`).

- Soporta **múltiples sesiones CIARP abiertas simultáneamente** — el técnico elige a qué sesión asigna la solicitud.
- Al **retroceder** una solicitud de la etapa `ciarp`, se borran automáticamente `acta_ciarp` y `sesion_ciarp_id`.
- **Metadatos del producto** (ISBN, nombre del evento, co-autores, etc.) se guardan en la columna `metadatos` (JSONB) de la BD.
- En el **Excel exportado**, los co-autores tienen `pts_asig = 0` y sin metadatos; solo el docente principal lleva los puntos y metadatos.

**CEI (Ascensos)**
Tipo = `ascenso`, gestionado en `ModuloCEI.jsx`. Etapas propias del proceso de escalafón.

**IDs de solicitudes**
Formato: `SOL-{año}-PROD-{8hex}` (productividad) / `SOL-{año}-ASC-{n}` (ascensos).
Generados con `crypto.randomUUID()` — sin colisiones.

## Distinción de tipos de solicitud

Todos los tipos en `data.js → TIPOS` tienen dos flags booleanas:

| Flag | Descripción |
|------|-------------|
| `esBonificacion` | Pago único (ponencias, postdoctorados, tesis dirigidas, artículos no indexados) |
| `esExcepcion` | Puntos por desempeño asignados internamente por la técnica (DAA, DDD, Exp. Calificada) |

El panel de **Solicitudes** filtra con macro-tabs (Todas / Puntos Salariales / Bonificaciones).
El panel de **Resoluciones** tiene tabs separadas para Productividad, Bonificaciones, Experiencia y Ascensos.
Los productos de **Desempeño/Excepciones NO aparecen en el panel de Solicitudes** — son gestionados internamente.

## GestorDocentes — Planta Docente

- Es un módulo **exclusivo para docentes de planta** (Titular, Asociado, Asistente, Auxiliar) con estado `ACTIVO` en la BD.
- Los docentes inactivos o sin categoría escalafonaria son **filtrados en el hook** `useDocentesPlanta` y nunca llegan al UI.
- Maneja: topes de productividad, puntos acumulados, semáforo, historial por CIARP, topes de subcategoría (libros, software, ponencias, etc.).

## Variables de entorno

```env
# Frontend (.env.local)
VITE_API_URL=http://localhost:3001          # URL del backend Express
VITE_API_SECRET=                            # Clave API para /api/upload-pdf

# Backend (backend/.env)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gestion_uq_db
DB_USER=gestion_uq
DB_PASSWORD=gestion_uq_2026
API_SECRET=<min_32_chars>
PORT=3001
NODE_ENV=production
BACKUP_PATH=D:\Backups\gestion-uq
PG_DUMP_PATH=C:\Program Files\PostgreSQL\18\bin\pg_dump.exe
```

## Seguridad — estado actual

| Item | Estado |
|------|--------|
| Backend `/api/upload-pdf` | Protegido con `requireApiKey` (header `X-API-Key`) |
| Validación de archivos | MIME + extensión + 50 MB límite en multer |
| Sanitización de nombres | `path.basename()` + regex en `sanitizeFileName()` |
| Cifrado contraseñas | ✅ **Bcrypt** (salt: 12) |
| JWT | Firmado en login, verificado en cada petición protegida |

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
- **No Supabase** — eliminado. No recrear `supabaseApi.js`, ni archivos de migración Supabase.
- **No Vercel** — eliminado. No recrear `vercel.json` ni referencias de deploy a Vercel.
- **Escrituras a BD** van por `SolicitudesContext` → `api.js`
- **`googleSheetsApi.js`** fue eliminado del repo — no recrear ni referenciar
- El backend corre en un proceso separado (`node backend/server.js`) — no es parte del build de Vite
- `ErrorBoundary.jsx` envuelve cada página en `App.jsx` — siempre mantener este patrón al agregar páginas nuevas
- `TopBar.jsx` y `WelcomeToast.jsx` usan hooks de contexto directamente — no volver a definirlos dentro de `App`
- **GestorDocentes** es exclusivo de planta: el filtro está en `useDocentesPlanta` — no mostrar docentes inactivos ni sin categoría
