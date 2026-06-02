# Documento de Diseño
# Sistema de Gestión de Productividad Académica — Universidad del Quindío

**Versión:** 1.0  
**Fecha:** Junio 2026  
**Oficina:** Asuntos Profesorales — Universidad del Quindío

---

## Introducción

El **Sistema de Gestión de Productividad Académica de la Universidad del Quindío** (en adelante *Gestión UQ*) es una aplicación web de escritorio diseñada para automatizar y centralizar el proceso de radicación, evaluación y aprobación de solicitudes de productividad académica según el **Decreto 1279 de 2002** del Ministerio de Educación Nacional de Colombia.

El sistema cubre dos procesos institucionales principales:

- **CIARP** (Comité Interno de Asignación y Reconocimiento de Puntaje): gestión de solicitudes de productividad académica que generan puntos salariales permanentes o bonificaciones de pago único.
- **CEI** (Comité de Escalafón Institucional): gestión de solicitudes de ascenso en el escalafón docente.

El código fuente del sistema está disponible en el repositorio: https://github.com/Josevargas998/gestion-uq

---

## 1. Requisitos No Funcionales

### Tabla 1. Requisitos no funcionales del sistema

| ID | Requisito |
|----|-----------|
| RNF1 | El sistema debe funcionar en red de área local (LAN) de la universidad sin necesidad de conexión a internet. |
| RNF2 | La interfaz de usuario debe ser accesible desde cualquier navegador web moderno (Chrome, Edge, Firefox). |
| RNF3 | El tiempo de respuesta para operaciones de consulta no debe superar los 3 segundos. |
| RNF4 | El sistema debe garantizar la integridad de los datos mediante el uso de una base de datos relacional con transacciones ACID. |
| RNF5 | Las contraseñas de los usuarios deben almacenarse con cifrado bcrypt (salt: 12). |
| RNF6 | El acceso al sistema debe estar restringido por autenticación mediante JWT con expiración configurable. |

---

## 2. Arquitectura General del Sistema

El sistema está construido bajo una arquitectura de tres capas:

```
┌─────────────────────────────────────────────┐
│           CLIENTE (Navegador Web)           │
│         React 18 + Vite 5 (SPA)            │
│              Puerto :5173                   │
└───────────────────┬─────────────────────────┘
                    │ HTTP / REST API
┌───────────────────▼─────────────────────────┐
│           SERVIDOR DE APLICACIONES          │
│          Express.js (Node.js)               │
│              Puerto :3001                   │
└───────────────────┬─────────────────────────┘
                    │ SQL / pg (driver)
┌───────────────────▼─────────────────────────┐
│             BASE DE DATOS                   │
│         PostgreSQL 18 (Local)               │
│      Base de datos: gestion_uq_db           │
└─────────────────────────────────────────────┘
```

### 2.1 Capa de Presentación (Frontend)

Desarrollada con **React 18** y empaquetada con **Vite 5**. Implementa una Single Page Application (SPA) con navegación basada en el estado `nav` (sin React Router). Los principales contextos de estado global son:

| Contexto | Propósito |
|----------|-----------|
| `AuthContext` | Manejo de sesión: login, logout, usuario actual |
| `SolicitudesContext` | CRUD de solicitudes con polling cada 30 segundos |
| `NotificationContext` | Notificaciones tipo toast en toda la aplicación |

### 2.2 Capa de Servidor (Backend)

Desarrollada con **Express.js** sobre **Node.js**. Expone una API REST con los siguientes endpoints principales:

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/login` | POST | Autenticación por cédula y contraseña |
| `/api/solicitudes` | GET | Obtener todas las solicitudes |
| `/api/solicitudes/:id` | PUT | Actualizar una solicitud |
| `/api/solicitudes` | POST | Crear nueva solicitud |
| `/api/solicitudes/:id` | DELETE | Eliminar solicitud |
| `/api/docentes` | GET | Obtener listado de docentes |
| `/api/docentes/:cedula` | GET | Obtener docente por cédula |
| `/api/upload-pdf` | POST | Subir archivo PDF/DOC al servidor |
| `/api/sesiones-ciarp` | GET | Obtener sesiones CIARP activas |

Todos los endpoints (excepto `/api/login`) requieren autenticación mediante token **JWT** en el header `Authorization: Bearer <token>`.

### 2.3 Capa de Datos (Base de Datos)

Motor: **PostgreSQL 18** instalado localmente en el equipo servidor de la oficina.

#### Tabla 2. Estructura de la base de datos

| Tabla | Descripción | Columnas principales |
|-------|-------------|---------------------|
| `solicitudes` | Solicitudes de productividad y ascenso | id, cedula, docente, tipo, titulo, etapa, estado, pts_sug, pts_asig, metadatos (JSONB), acta_ciarp, sesion_ciarp_id, timeline |
| `docentes` | Planta docente activa | cedula, nombre, categoria, facultad, programa, pts_acumulados, tope, diferencia, historial |
| `usuarios` | Usuarios del sistema | cedula, nombre, rol, password_hash |
| `sesiones_ciarp` | Sesiones del comité CIARP | id, nombre, fecha, estado |

---

## 3. Módulos del Sistema

### 3.1 Módulo de Solicitudes (CIARP)

Gestiona el ciclo de vida completo de una solicitud de productividad académica.

#### Figura 1. Diagrama de flujo de etapas CIARP

```
[Recibida]
    ↓
[Clasificada]
    ↓
[Evaluación Interna] ──→ [Evaluación Externa]
    ↓                           ↓
[Informe CIARP] ←──────────────┘
    ↓
[CIARP] (asignación de sesión y puntos)
    ↓
[Proyección de Resoluciones]
    ↓
[Archivada]
```

La ruta de evaluación depende del tipo de producto:
- **Directos**: pasan directamente a Informe CIARP.
- **Internos**: pasan por Evaluación Interna.
- **Externos**: pasan por Evaluación Externa.
- **Informe Directo**: van directamente a CIARP.

#### Tabla 3. Tipos de solicitud según naturaleza

| Categoría | Tipos de producto | Genera |
|-----------|-------------------|--------|
| Puntos Salariales | Artículos indexados, Libros de investigación/texto/ensayo, Software, Obras artísticas, Producción técnica, Patentes, Títulos académicos | Puntos salariales permanentes |
| Bonificaciones | Ponencias, Artículos no indexados, Tesis dirigidas, Postdoctorados | Pago único no permanente |
| Excepciones/Desempeño | DAA, DDD, Experiencia Calificada | Puntos asignados internamente |

### 3.2 Módulo CEI (Ascensos)

Gestiona las solicitudes de ascenso en el escalafón docente. Los tipos de solicitud son `ascenso` y siguen un flujo de etapas propio del proceso de escalafón institucional.

### 3.3 Módulo GestorDocentes

Módulo exclusivo para la administración de la **planta docente** (Titulares, Asociados, Asistentes y Auxiliares con estado ACTIVO). Permite:
- Consultar el tope de productividad por docente según el Decreto 1279.
- Visualizar los puntos acumulados y los puntos disponibles.
- Ver el semáforo de capacidad (verde: con espacio, amarillo: cerca del tope, rojo: en tope).
- Consultar el historial de productividad por sesión CIARP.

### 3.4 Módulo de Resoluciones

Agrupa y proyecta resoluciones por programa académico. Genera documentos Word con el formato institucional. Separa resoluciones en cuatro categorías:
- Productividad Académica
- Bonificaciones
- Experiencia Calificada y Desempeño
- Ascensos en el Escalafón

### 3.5 Módulo de Reportes

Genera estadísticas y gráficos de la gestión usando la librería **Recharts**. Permite visualizar distribución por tipo de producto, por facultad, por etapa y tendencias temporales.

### 3.6 Banco de Pares

Gestiona el registro de evaluadores externos con su historial de participación en procesos de evaluación.

---

## 4. Decisiones de Diseño

### 4.1 Navegación sin React Router

Se optó por un sistema de navegación basado en el estado `nav` (string) en `App.jsx` en lugar de React Router, dado que la aplicación no requiere URLs navegables ni marcadores, y el equipo es el único punto de acceso.

### 4.2 Polling en lugar de WebSockets

Se reemplazó la suscripción en tiempo real de Supabase (plataforma anterior) por un **polling silencioso cada 30 segundos** hacia el backend local. Esto es suficiente para el volumen de uso de la oficina (máximo 5 usuarios simultáneos).

### 4.3 Almacenamiento de metadatos en JSONB

Los metadatos del producto (ISBN, nombre del evento, co-autores, etc.) se almacenan en una columna `metadatos` de tipo **JSONB** en PostgreSQL, lo que permite flexibilidad sin alterar el esquema de la tabla.

### 4.4 Múltiples sesiones CIARP simultáneas

El sistema permite tener dos o más sesiones CIARP abiertas al mismo tiempo. Al avanzar una solicitud a la etapa `ciarp`, el técnico selecciona a cuál sesión la asigna. Al retroceder, los campos `acta_ciarp` y `sesion_ciarp_id` se limpian automáticamente.

---

## 5. Seguridad

| Ítem | Implementación |
|------|---------------|
| Autenticación | JWT firmado en login, verificado en cada petición |
| Contraseñas | Bcrypt con salt 12 |
| Subida de archivos | Validación MIME + extensión + límite 50 MB |
| Nombres de archivos | `path.basename()` + regex para prevenir path traversal |
| Endpoint de subida | Protegido con header `X-API-Key` |

---

## 6. Roles de Usuario

| Rol | Permisos |
|-----|----------|
| `admin` | Acceso total: crear, editar, eliminar, configurar |
| `tecnico` | Gestión completa del proceso CIARP/CEI sin configuración |
| `lectura` | Solo consulta: no puede crear ni modificar |
| `asistente` | Consulta con algunos privilegios de edición |
