# CONTEXT.md — gestion-uq

> Última actualización: 2026-05-29
> Versión del sistema: 1.0.0

---

## 1. Propósito del Sistema

**gestion-uq** es el sistema de gestión de productividad académica y escalafón docente de la **Universidad del Quindío (Colombia)**. Cubre dos procesos administrativos principales regulados por el **Decreto 1279** del Ministerio de Educación Nacional:

| Proceso | Módulo | Descripción |
|---------|--------|-------------|
| **Productividad Académica (CIARP)** | `GestorCiarp`, `DetalleSolicitud`, `ListaSolicitudes` | Gestión de productos académicos (libros, artículos, software, patentes, etc.) que puntúan salarialmente al docente |
| **Ascenso en el Escalafón (CEI)** | `ModuloCEI` | Solicitudes de cambio de categoría docente (Auxiliar → Asistente → Asociado → Titular) |

La aplicación es usada internamente por la **Oficina de Gestión Humana / CIARP** de la Universidad. No es de cara al público general, aunque tiene portales públicos secundarios (rastreo, par evaluador).

---

## 2. Stack Tecnológico

### Frontend
| Tecnología | Uso |
|-----------|-----|
| **React 18** (Vite 5) | SPA completa. Navegación por estado `nav` (string), sin React Router |
| **Context API** | Estado global: `AuthContext`, `SolicitudesContext`, `NotificationContext` |
| **Recharts** | Gráficos estadísticos en `Reportes.jsx` |
| **XLSX (SheetJS)** | Importar/exportar hojas de cálculo Excel |
| **Lucide React** | Iconos SVG |
| **Vanilla CSS** | Design tokens UQ en `index.css` (variables `--uq-green`, `--uq-blue`, `--surface`, etc.) |

### Backend
| Tecnología | Uso |
|-----------|-----|
| **Express 4** (Node.js) | API REST completa — sirve también el `dist/` compilado |
| **PostgreSQL 18** (local) | Fuente única de datos. BD: `gestion_uq_db` |
| **JWT (jsonwebtoken)** | Sesiones — token en `sessionStorage` con expiración 12h (admin) / 24h (docente) |
| **bcryptjs** | Hash de contraseñas en tabla `usuarios` |
| **multer** | Subida de archivos PDF/DOC/XLSX → `backend/uploads/` |
| **helmet + express-rate-limit** | Seguridad HTTP básica (opcionales, no rompen si no están) |

### Infraestructura
| Elemento | Detalle |
|---------|---------|
| **Deploy Vercel** | SPA compilada con `vercel.json` que reescribe todo a `/index.html`. El backend NO va a Vercel. |
| **Servidor local LAN** | `node backend/server.js` en `0.0.0.0:3001`. El servidor sirve tanto la API como el `dist/` estático. |
| **Backups** | Script `scripts/backup.ps1` con `pg_dump` → `D:\Backups\gestion-uq\` |

---

## 3. Arquitectura General

```
┌─────────────────────────────────────────────────────┐
│                BROWSER (React SPA)                  │
│  App.jsx ← estado nav (string)                      │
│    ├─ AuthContext (JWT en sessionStorage)            │
│    ├─ SolicitudesContext (polling 30s)               │
│    └─ NotificationContext (toasts flotantes)        │
└────────────────────┬────────────────────────────────┘
                     │ fetch() REST + JWT Bearer
┌────────────────────▼────────────────────────────────┐
│           EXPRESS backend/server.js :3001           │
│  ┌────────────┐  ┌───────────────┐  ┌────────────┐  │
│  │ /api/auth  │  │ /api/solicit. │  │/api/docent.│  │
│  │ /api/sesio.│  │ /api/estadis. │  │/api/upload │  │
│  └────────────┘  └───────────────┘  └────────────┘  │
│           verifyToken (JWT middleware)               │
│           registrarAuditoria → logs_auditoria       │
└────────────────────┬────────────────────────────────┘
                     │ pg pool
┌────────────────────▼────────────────────────────────┐
│            PostgreSQL local (gestion_uq_db)         │
│  solicitudes │ docentes │ usuarios │ logs_auditoria  │
│  sesiones_ciarp │ sesiones_cei                      │
└─────────────────────────────────────────────────────┘
```

---

## 4. Flujo de Datos Principal

### 4.1 Login
```
Login.jsx → loginConCedula(cedula, password)
  → POST /api/auth/login
  → verifica bcrypt en tabla usuarios (admin/tecnico/asistente/lectura)
  → OR solo cédula → verifica en tabla docentes → rol 'docente'
  → devuelve JWT → se guarda en sessionStorage
  → AuthContext.user = { cedula, nombre, rol, token }
```

### 4.2 Carga de Solicitudes
```
SolicitudesContext.load()
  → GET /api/solicitudes?paginar=false   (todas de una vez)
  → JOIN con docentes ON cedula (enriquece nombre, programa, facultad, puntos)
  → helpers.normalizeRow() → formatea nombre (Nombre Apellido), programa (PROGRAMA DE ...)
  → setSolicitudes([...])
  → Polling silencioso cada 30s repite este flujo
```

### 4.3 Nueva Solicitud
```
NuevaSolicitud.jsx (wizard 3 pasos)
  Paso 1: Busca docente por nombre/cédula → useDocentesIndex()
          → auto-rellena: programa, facultad, correo, categoría, dedicación
  Paso 2: Selección del tipo de producto → TIPOS[tipo] define: pts, ruta, limites
  Paso 3: Revisión + detección de duplicados
  → onSave → SolicitudesContext.crear() → POST /api/solicitudes
  → ID generado: crypto.randomUUID() → formato SOL-{año}-PROD-{8hex}
```

### 4.4 Aprobación CEI → Actualiza Categoría Docente
```
ModuloCEI.jsx: onUpdate(sol con estado='aprobado_cei')
  → updateSolicitud(sol)                  // guarda en solicitudes
  → updateDocente(cedula, {categoria})    // PUT /api/docentes/:cedula
  → clearDocentesCache()                  // invalida caché en useDocentesData.js
  → notificación de éxito
```

---

## 5. Estructura de Componentes

### 5.1 Capas
```
src/
├── main.jsx              Entrypoint: monta AuthProvider > SolicitudesProvider > NotificationProvider > App
├── App.jsx               Router: switch(nav) → lazy-load de cada página + ErrorBoundary + TopBar
├── data.js               Constantes: TIPOS, ETAPAS, PROGRAMAS, FACULTADES, INIT_SOLICITUDES, ROL_INFO
├── helpers.js            Utilidades puras: formatName(), formatProgramaName(), normalizeRow(),
│                         normalizeDocente(), cleanText(), getSemaforo(), buildTimeline()
├── index.css             Design tokens y clases utilitarias UQ
│
├── context/
│   ├── AuthContext.jsx           user, login(), logout()
│   ├── SolicitudesContext.jsx    CRUD + polling + listas memoizadas
│   └── NotificationContext.jsx   success(), error() → ToastContainer
│
├── hooks/
│   └── useDocentesData.js        useDocentesIndex, useDocentesPlanta, clearDocentesCache
│                                 Caché en memoria por sesión, invalidada tras cambios críticos
│
├── utils/
│   ├── api.js            Cliente HTTP con JWT, CRUD completo, manejo de expiración de sesión
│   ├── docGenerator.jsx  Generación de memorandos y resoluciones (impresión/PDF vía window.print)
│   ├── excelIO.js        Import/export XLSX (formato CIARP)
│   ├── exportCiarp.js    Export específico para informes CIARP
│   ├── emailNotificacion.js  HTML de correo + envío vía Google Apps Script (GAS)
│   ├── validate.js       Validación de entradas del formulario
│   └── logger.js         Wrapper de console.log con niveles
│
└── components/           (33 archivos — ver sección 5.2)
```

### 5.2 Componentes por Dominio

#### Layout
| Componente | Responsabilidad |
|-----------|----------------|
| `Shell.jsx` | Sidebar de navegación + área principal |
| `TopBar.jsx` | Barra superior: título, exportar XLSX, importar, perfil, logout |
| `Login.jsx` | Formulario cédula + contraseña. Detecta si hay password para decidir el tipo de login |

#### Solicitudes CIARP
| Componente | Responsabilidad |
|-----------|----------------|
| `ListaSolicitudes.jsx` | Tabla filtrable de solicitudes de productividad |
| `NuevaSolicitud.jsx` | Wizard 3 pasos. Auto-rellena datos del docente de planta |
| `DetalleSolicitud.jsx` | Vista completa + edición inline de una solicitud (≈86KB, el más grande) |
| `GestorCiarp.jsx` | Panel CIARP: tabs proceso / listos / comités / aprobados / histórico |
| `ComitesCiarp.jsx` | Gestión de comités CAP con notificación masiva por email |
| `Resoluciones.jsx` | Proyección y emisión de resoluciones con numeración |

#### Docentes
| Componente | Responsabilidad |
|-----------|----------------|
| `GestorDocentes.jsx` | Planta docente completa: tabla + HV integrada |
| `HojaVidaDocente.jsx` | Hoja de vida detallada: postgrado, pregrado, producción |
| `EscalafonDocente.jsx` | Escalafón y puntos salariales del docente |

#### CEI / Escalafón
| Componente | Responsabilidad |
|-----------|----------------|
| `ModuloCEI.jsx` | Módulo completo CEI (≈115KB). Gestión de solicitudes de ascenso, comités CEI, aprobación con actualización automática de categoría |

#### Reportes y Otros
| Componente | Responsabilidad |
|-----------|----------------|
| `Dashboard.jsx` | KPIs, accesos rápidos, resumen del estado del sistema |
| `Reportes.jsx` | Estadísticas con gráficos Recharts (distribución por tipo, etapa, facultad) |
| `BancoPares.jsx` | Registro de pares evaluadores con historial de asignaciones |
| `ProductividadHistorica.jsx` | Histórico de productos anteriores a 2026 |
| `ModuloReconocimientos.jsx` | DAA, DDD, Experiencia Calificada (Art. 10 y 12 D.1279) |
| `ActasAprobadas.jsx` | Actas históricas del CIARP |
| `Decreto1279Panel.jsx` | Referencia normativa del Decreto 1279 |

#### Portales Públicos (sin login)
| Componente | Acceso |
|-----------|--------|
| `PortalParEvaluador.jsx` | URL: `?portal_par=...` — evaluadores externos suben concepto |
| `PortalDocente.jsx` | Rol `docente` — consulta su propio estado y puntos |
| `RastreoSolicitud.jsx` | URL: `?rastreo=...` — docente rastrea su solicitud por cédula |

#### UI Genérica
`ConfirmDialog.jsx`, `ErrorBoundary.jsx`, `LoadingSkeleton.jsx`, `ToastContainer.jsx`, `WelcomeToast.jsx`, `EmptyState.jsx`, `ConnectionStatus.jsx`, `shared.jsx`

---

## 6. API REST — Endpoints del Backend

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/auth/login` | ❌ | Login cédula+password (admin/tecnico) o solo cédula (docente) |
| `GET` | `/api/health` | ❌ | Estado del servidor y BD |
| `GET` | `/api/solicitudes` | ✅ JWT | Lista paginada o completa; `?paginar=false` trae todo. JOIN con docentes. |
| `GET` | `/api/solicitudes/:id` | ✅ JWT | Solicitud individual |
| `GET` | `/api/solicitudes/buscar` | ✅ JWT | Búsqueda con filtros (texto, etapa, tipo, facultad, fechas) |
| `POST` | `/api/solicitudes` | ✅ admin/tecnico | Crear solicitud |
| `PUT` | `/api/solicitudes/:id` | ✅ admin/tecnico | Actualizar solicitud |
| `DELETE` | `/api/solicitudes/:id` | ✅ admin | Eliminar solicitud |
| `GET` | `/api/docentes` | ✅ JWT | Lista docentes (filtro por `?campos=`) |
| `GET` | `/api/docentes/:cedula` | ✅ JWT | Docente individual |
| `PUT` | `/api/docentes/:cedula` | ✅ admin/tecnico | Actualizar campos del docente (ej. categoría tras ascenso) |
| `GET` | `/api/estadisticas` | ✅ JWT | Resumen estadístico para Dashboard |
| `GET/POST/PUT/DELETE` | `/api/sesiones-ciarp` | ✅ JWT | CRUD de sesiones del Comité CIARP |
| `GET/POST/PUT/DELETE` | `/api/sesiones-cei` | ✅ JWT | CRUD de sesiones del Comité CEI |
| `POST` | `/api/upload-pdf` | ✅ X-API-Key | Subida de archivos a `backend/uploads/` |
| `GET` | `/uploads/:archivo` | ❌ | Descarga pública de archivos subidos |

---

## 7. Modelo de Datos (PostgreSQL)

### Tabla `solicitudes` — campos clave
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | TEXT PK | `SOL-{año}-PROD-{8hex}` / `CEI-{año}-{n}` / `HIST-{año}-...` |
| `cedula` | TEXT | FK lógica → `docentes.cedula` |
| `docente` | TEXT | Nombre del autor (puede diferir del nombre en docentes) |
| `tipo` | TEXT | Clave del catálogo `TIPOS` en `data.js` |
| `etapa` | TEXT | Etapa del flujo: `clasificada → pares_internos/externos → informe → ciarp → proyectar_resoluciones → archivada` |
| `estado` | TEXT | `en_proceso`, `aprobado`, `rechazado`, `aprobado_cei` |
| `pts_sug` | NUMERIC | Puntos sugeridos por el técnico |
| `pts_asig` | NUMERIC | Puntos asignados por CIARP |
| `acta_ciarp` | TEXT | Referencia al acta del comité |
| `sesion_ciarp_id` | INT FK | → `sesiones_ciarp` |
| `sesion_cei_id` | INT FK | → `sesiones_cei` |
| `timeline` | JSONB | Array de hitos `{f, a, p}` (fecha, acción, persona) |
| `pares_ext` | JSONB | Array de pares evaluadores externos |
| `pares_int` | JSONB | Concepto de consejo interno |

### Tabla `docentes` — campos clave
| Campo | Descripción |
|-------|-------------|
| `cedula` | PK — identificador único |
| `nombre` | Formato BD: `APELLIDO1 APELLIDO2 NOMBRE1 NOMBRE2` → UI: `NOMBRE1 NOMBRE2 APELLIDO1 APELLIDO2` (via `formatName()`) |
| `categoria` | `AUXILIAR`, `ASISTENTE`, `ASOCIADO`, `TITULAR` |
| `pts_acumulados` | Total de puntos salariales acumulados |
| `tope` | Límite de puntos según categoría (Auxiliar:80 / Asistente:160 / Asociado:320 / Titular:540) |
| `especializacion`, `maestria`, `doctorado` | Títulos académicos |
| `estado` | `ACTIVO` / `INACTIVO` |

### Tabla `usuarios`
Usuarios de la oficina con `password_hash` (bcrypt). Roles: `admin`, `tecnico`, `asistente`, `lectura`.

### Tabla `logs_auditoria`
Cada operación de escritura queda registrada con `cedula_usuario`, `nombre_usuario`, `accion`, `detalles` (JSONB).

---

## 8. Modelo de Negocio — Reglas Clave

### 8.1 Rutas de tramitación (Decreto 1279)
| Ruta | Tipos | Flujo |
|------|-------|-------|
| `directo` | artículos, patentes, ponencias, tesis, títulos | Clasificada → Informe → CIARP |
| `internos` | libros de texto/ensayo, software | Clasificada → Pares Internos (consejo) → Pares Externos → Informe → CIARP |
| `externos` | libro investigación, producción técnica, obra artística | Clasificada → Pares Externos → Informe → CIARP |
| `informe_directo` | premios | Clasificada → Informe → CIARP |
| `cei` | ascenso | Flujo independiente en ModuloCEI |

### 8.2 Clasificación de puntos
- **Puntos al tope de productividad**: libros, software, producción técnica, obra artística, etc.
- **Bonificación** (`esBonificacion: true`): ponencias (máx 3/año), artículos no indexados (máx 5/año), tesis, postdoctorado, títulos académicos.
- **Excepción al tope** (`esExcepcion: true`): DAA, DDD, Experiencia Calificada → suman al salario total pero no al tope.

### 8.3 Automatizaciones implementadas
1. **Auto-relleno al crear solicitud**: al seleccionar un docente de planta, se completan automáticamente programa, facultad, correo, categoría y dedicación desde la BD.
2. **Actualización de categoría tras ascenso CEI**: al aprobar una solicitud con `estado = 'aprobado_cei'`, se actualiza el campo `categoria` del docente en la tabla `docentes` y se invalida el caché de docentes.

### 8.4 Semáforo de puntos
- 🟢 Verde: diferencia > 20 pts respecto al tope
- 🟡 Amarillo: diferencia ≤ 20 pts
- 🔴 Rojo: tope alcanzado o superado
- ⚪ Gris: docente Inactivo o sin categoría definida

---

## 9. Gestión del Estado — Patrones Clave

| Patrón | Detalle |
|--------|---------|
| **Navegación por estado** | `nav` (string) en `App.jsx`. Nunca usar React Router. |
| **Lazy loading** | Todas las páginas usan `React.lazy()`. El bundle principal es ~94KB. |
| **Optimistic updates** | `SolicitudesContext.actualizar()` actualiza la UI antes de confirmar el servidor |
| **Polling** | `SolicitudesContext` hace `fetchSolicitudes()` cada 30s (silencioso) |
| **Caché de docentes** | `useDocentesData.js` mantiene caché en memoria (`const cache = {}`). Llamar `clearDocentesCache()` tras actualizaciones de docentes. |
| **Listas memoizadas** | `solicitudesProductividad`, `solicitudesAscenso`, `solicitudesCiarp` son `useMemo` sobre el array principal |
| **ErrorBoundary** | Cada página está envuelta en `<ErrorBoundary>`. No romper este patrón al agregar páginas. |

---

## 10. Normalización de Datos (helpers.js)

Estas funciones se aplican a **todos** los datos que entran de la BD, en las capas `normalizeRow()` y `normalizeDocente()`:

| Función | Propósito |
|---------|-----------|
| `formatName(str)` | Invierte orden `APELLIDO NOMBRE` → `NOMBRE APELLIDO`. Para 4 palabras: últimas 2 son nombres, primeras 2 son apellidos. |
| `formatProgramaName(str)` | Elimina `DIRECCIÓN DEL PROGRAMA DE` → deja solo `PROGRAMA DE ...` |
| `cleanText(str)` | Reemplaza ~60 caracteres Unicode corruptos/PUA por el carácter correcto en español |
| `normalizeRow(row)` | Normaliza solicitud cruda de BD → objeto de app (incluye formatName, formatProgramaName, tipos legacy, etc.) |
| `normalizeDocente(row)` | Normaliza docente crudo → objeto de app (calcula tope, diferencia, escolaridad efectiva) |
| `getSemaforo(diferencia, tope, estado)` | Devuelve color/label/icon del semáforo de puntos |
| `normalizeActaKey(raw)` | Normaliza claves de actas `"6- 29/08/2025"` → `"6/2025"` |
| `cleanProgramaName(str)` | Para comparación: elimina prefijos, sufijos (DIURNA/NOCTURNA), retorna en MAYÚSCULAS |
| `matchDropdownOption(str, options)` | Encuentra la opción exacta del dropdown más cercana al valor crudo de BD |

---

## 11. Integraciones Externas

| Servicio | Uso | Estado |
|---------|-----|--------|
| **Google Apps Script (GAS)** | Envío de emails de notificación a evaluadores y docentes vía `emailNotificacion.js` | ✅ Activo — URL en `GAS_MAIL_URL` |
| **EmailJS** | Backup para envío de emails desde el frontend | 📦 Instalado, uso secundario |
| **Google Drive** | Subida de PDFs (código en `backend/server.js`) | ⚠️ Deshabilitado — requiere credenciales de Service Account. Fallback a `backend/uploads/` |
| **Vercel** | Deploy del frontend compilado | ✅ Activo |

---

## 12. Roles de Usuario

| Cédula | Nombre | Rol | Permisos |
|--------|--------|-----|---------|
| `1094970478` | José H. Vargas Espinosa | `admin` | CRUD completo |
| `41961206` | Lina M. Cruz Calderón | `tecnico` | CRUD completo (no eliminar) |
| *(BD)* | *(asistente)* | `asistente` | Color `#7b3fa8` — permisos intermedios |
| `1097725174` | Iván D. Londoño Vargas | `lectura` | Solo lectura |
| `24498485` | Lina J. Gil Barrero | `lectura` | Solo lectura |
| `52327887` | Luz A. Celis Buriticá | `lectura` | Solo lectura |
| *cualquier docente* | nombre en BD | `docente` | Solo PortalDocente — su propia HV y estado |

---

## 13. Comandos de Desarrollo

```sh
# Frontend (Vite)
npm run dev              # http://localhost:5173

# Backend (Express + PostgreSQL)
node backend/server.js   # http://localhost:3001

# Build para producción
npm run build            # genera dist/

# Linting
npm run lint

# Tests (Vitest)
npm run test
npm run test:ui          # UI visual de tests

# Importar datos CSV → PostgreSQL
node scripts/import/upload_productividad.cjs
node scripts/import/upload_ascensos.cjs
```

---

## 14. Variables de Entorno

### Frontend (`.env.local`)
```env
VITE_API_URL=http://localhost:3001       # En producción: vacío (mismo origen)
VITE_API_SECRET=                          # Clave X-API-Key para uploads
```

### Backend (`backend/.env`)
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gestion_uq_db
DB_USER=gestion_uq
DB_PASSWORD=gestion_uq_2026
PORT=3001
NODE_ENV=production
API_SECRET=<min_32_chars>               # JWT secret + X-API-Key
BACKUP_PATH=D:\Backups\gestion-uq
```

---

## 15. Deuda Técnica Detectada

### Alta Prioridad
| # | Problema | Archivo(s) | Impacto |
|---|---------|-----------|---------|
| DT-1 | `ModuloCEI.jsx` tiene ~115KB y ~3000 líneas — demasiado grande, difícil de mantener | `ModuloCEI.jsx` | Mantenibilidad |
| DT-2 | `DetalleSolicitud.jsx` tiene ~86KB — mezcla lógica de negocio con UI | `DetalleSolicitud.jsx` | Mantenibilidad |
| DT-3 | Autenticación sin 2FA ni MFA — password = cédula para algunos usuarios | `usuarios` table | Seguridad |
| DT-4 | Google Drive deshabilitado — archivos solo en `backend/uploads/` sin backup automático | `backend/server.js` | Disponibilidad |

### Media Prioridad
| # | Problema | Detalle |
|---|---------|---------|
| DT-5 | `INIT_SOLICITUDES` en `data.js` — datos hardcodeados como fallback si falla la BD | Puede confundir si la BD está caída |
| DT-6 | No hay test runner para componentes React — solo para `validate.js` | Cobertura de tests muy baja |
| DT-7 | `backend/uploads/` no tiene backup automático configurado | Pérdida de archivos subidos si el disco falla |
| DT-8 | Polling cada 30s no es eficiente para multi-usuario simultáneo | Revisar WebSockets o Server-Sent Events |
| DT-9 | Permisos de Drive `anyone/reader` — pendiente restringir a `@uniquindio.edu.co` | Seguridad |

### Baja Prioridad
| # | Problema | Detalle |
|---|---------|---------|
| DT-10 | Archivos temporales de scripts en la raíz (`fix_calc.cjs`, `fix_file.cjs`, `inspect_excel.js`, etc.) | Limpiar del repositorio |
| DT-11 | `supabaseApi.js` puede existir en algún lugar como código muerto | Era la capa antes de migrar a PostgreSQL local |
| DT-12 | `vercel.json` solo tiene el rewrite — no configura headers de seguridad HTTP | Agregar `Cache-Control`, `X-Frame-Options`, etc. |
| DT-13 | `CIARP/`, `CEI/`, `Resoluciones/` en la raíz — directorios de datos manuales sin versionado claro | Documentar su propósito o mover a `docs/` |

---

## 16. Decisiones de Arquitectura Clave

| Decisión | Razón | Alternativa descartada |
|---------|-------|----------------------|
| **Sin React Router** | La app es un panel interno de escritorio. Navegar por estado `nav` es suficiente y más simple. | React Router (innecesaria complejidad) |
| **Sin TypeScript** | Velocidad de desarrollo, equipo no familiarizado con TS | TypeScript |
| **Sin Tailwind CSS** | Los tokens `--uq-green`, `--uq-blue` del diseño UQ se aplican mejor con variables CSS custom | Tailwind (conflictos con branding) |
| **Express sirve el `dist/`** | Una sola unidad de despliegue para uso LAN. Cero configuración de CORS entre frontend/backend. | Dos servidores separados |
| **Polling en vez de Realtime** | Se migró de Supabase Realtime. El backend local no tiene WebSockets. 30s es aceptable para este volumen. | WebSockets / SSE |
| **JWT en sessionStorage** | Más práctico que cookies httpOnly en LAN. La sesión muere al cerrar el tab. | localStorage (persiste indefinidamente) / cookies |
| **Caché en memoria (docentes)** | La lista de docentes (~200 registros) no cambia frecuentemente. Una llamada por sesión es suficiente. | Re-fetch en cada uso |
| **`normalizeRow()` en cliente** | Centraliza toda la lógica de formateo (nombres, programas, tipos legacy) en un solo punto. | Normalizar en BD o en varios componentes |

---

## 17. Estructura de Archivos Importantes

```
gestion-uq/
├── AGENTS.md            Reglas para agentes de código IA (NO MODIFICAR sin consenso)
├── CONTEXT.md           ← Este archivo
├── CHANGELOG.md         Historial de cambios por versión
├── DEPLOY_LOCAL.md      Instrucciones para instalar en red LAN
├── vercel.json          Configuración de deploy Vercel
├── package.json         Dependencias y scripts
├── vite.config.js       Configuración de Vite (proxy a :3001 en dev)
├── backend/
│   ├── server.js        API REST completa (1150+ líneas)
│   ├── db.js            Pool de conexiones PostgreSQL
│   ├── .env             Variables de entorno del backend
│   └── uploads/         Archivos subidos por los usuarios
├── scripts/
│   ├── import/          Scripts para importar CSV → PostgreSQL
│   └── backup.ps1       Script de backup automático
└── public/
    └── data/hv/         JSONs de hojas de vida por cédula (enriquecidos)
```
