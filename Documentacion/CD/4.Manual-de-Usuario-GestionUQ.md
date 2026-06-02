# Manual de Usuario
# Sistema de Gestión de Productividad Académica — Universidad del Quindío

**Versión:** 1.0  
**Fecha:** Junio 2026  
**Oficina:** Asuntos Profesorales — Universidad del Quindío

---

## Introducción

Este manual describe el uso del **Sistema de Gestión de Productividad Académica** (Gestión UQ), herramienta diseñada para la Oficina de Asuntos Profesorales de la Universidad del Quindío. El sistema permite administrar de manera eficiente las solicitudes de productividad académica, los procesos de ascenso en el escalafón docente, y la planta docente, conforme al **Decreto 1279 de 2002**.

---

## 1. Inicio de Sesión

Al abrir el sistema en el navegador, aparece la pantalla de inicio de sesión.

**Campos requeridos:**
- **Cédula:** Número de cédula de ciudadanía del usuario registrado
- **Contraseña:** Contraseña asignada por el administrador

**Roles disponibles:**

| Rol | Descripción |
|-----|-------------|
| Administrador | Acceso total al sistema |
| Técnico Evaluador | Gestión completa de solicitudes CIARP/CEI |
| Lectura | Solo consulta de información |

> **Nota:** Si olvida su contraseña, comuníquese con el administrador del sistema.

---

## 2. Panel Principal (Dashboard)

Al ingresar, el sistema muestra el **Panel Principal** con indicadores clave en tiempo real:

### 2.1 Sección CIARP — Productividad

| Indicador | Descripción |
|-----------|-------------|
| Total solicitudes 2026 | Número total de solicitudes registradas en el año |
| En evaluación | Solicitudes con par evaluador asignado |
| Listos para CIARP | Solicitudes con evaluación completa pendientes de comité |
| Aprobados CIARP | Solicitudes aprobadas con acta y puntos asignados |

### 2.2 Sección CEI — Ascensos

| Indicador | Descripción |
|-----------|-------------|
| Solicitudes ascenso | Total de solicitudes de ascenso en el año |
| En evaluación CEI | Solicitudes en proceso de revisión |
| Listos para CEI | Solicitudes con evaluación completa |
| Aprobados por CEI | Solicitudes con resolución emitida |

### 2.3 Sección Planta Docente

Muestra el total de docentes activos de planta, distribuidos por categoría (Titular, Asociado, Asistente, Auxiliar) y los docentes que han alcanzado su tope de productividad.

### 2.4 Alerta de Pares Pendientes

Si existen solicitudes con par evaluador asignado que no ha entregado su concepto, aparece un **aviso amarillo** en la parte superior del panel con el nombre de los docentes afectados.

---

## 3. Módulo de Solicitudes

Para acceder: clic en **"Solicitudes"** en el menú lateral izquierdo.

### 3.1 Filtros disponibles

**Macro-categorías (barra superior):**
- 📋 **Todas las Solicitudes:** muestra el total del sistema
- 📈 **Puntos Salariales:** solicitudes que generan puntos permanentes
- 💰 **Bonificaciones:** solicitudes que generan pago único

**Sub-tabs por tipo de producto:** al seleccionar una macro-categoría, aparecen botones de filtro por tipo específico (Artículos, Libros, Ponencias, etc.)

**Filtros adicionales:**
- Búsqueda por nombre de docente, título o número de solicitud
- Filtro por etapa del proceso

### 3.2 Crear una nueva solicitud

1. Clic en el botón **"+ Nueva Solicitud"** (esquina superior derecha)
2. El sistema abre un asistente de 3 pasos:

**Paso 1 — Datos del docente:**
- Buscar el docente por nombre o cédula
- El sistema carga automáticamente sus datos (facultad, programa, correo)

**Paso 2 — Datos del producto:**
- Seleccionar el tipo de producto (Artículo, Libro, Ponencia, etc.)
- Ingresar el título del trabajo
- El sistema calcula automáticamente los puntos sugeridos según el Decreto 1279

**Paso 3 — Revisión y confirmación:**
- Verificar todos los datos ingresados
- Clic en **"Crear Solicitud"**

El sistema asigna automáticamente un número de radicado con formato `SOL-{año}-PROD-{código}`.

### 3.3 Ver el detalle de una solicitud

Clic sobre cualquier fila de la tabla para abrir el detalle completo. En esta vista se puede:

- Ver la **línea de tiempo** del proceso
- **Avanzar o retroceder** la solicitud entre etapas
- Editar el título y los puntos asignados
- Ingresar los **metadatos del producto** (ISBN, nombre del evento, lugar, co-autores)
- Subir archivos PDF o documentos de soporte
- Eliminar la solicitud (solo administrador)

### 3.4 Metadatos del Producto (Panel CIARP)

Este panel aparece en el detalle de cada solicitud y permite registrar información adicional del producto para el reporte de Excel:

| Campo | Descripción |
|-------|-------------|
| ISBN/ISSN | Número identificador del libro o revista |
| Nombre del Evento | Nombre del congreso o evento (para ponencias) |
| Lugar y Fecha | Ciudad y fecha del evento |
| Tipo de Evento | Nacional o Internacional |
| Universidades Participantes | Instituciones participantes en la ponencia |
| Co-autores UQ | Docentes de la Universidad del Quindío que participaron como co-autores |

> **Importante:** Los puntos asignados y los metadatos pertenecen exclusivamente al docente principal que radicó la solicitud. Los co-autores aparecen con puntos en 0 en el reporte de Excel.

---

## 4. Módulo CIARP — Gestión del Comité

Para acceder: clic en **"Gestión CIARP"** en el menú lateral.

### 4.1 Pestañas del módulo

| Pestaña | Contenido |
|---------|-----------|
| En Proceso | Solicitudes en evaluación con par asignado |
| Listos para CIARP | Solicitudes con evaluación completa |
| Comités (Sesiones) | Sesiones del comité abiertas y sus solicitudes |
| Aprobados | Solicitudes aprobadas con acta |
| Histórico | Actas y aprobaciones anteriores |

### 4.2 Crear una sesión CIARP

1. En la pestaña **"Comités"**, clic en **"+ Nueva Sesión"**
2. Ingresar el nombre del comité (ej: "CIARP 3-2026")
3. La sesión queda disponible para asignarle solicitudes

### 4.3 Asignar una solicitud a una sesión CIARP

Cuando se avanza una solicitud a la etapa **"CIARP"**, el sistema pregunta a cuál sesión abierta se desea asignar. Si hay varias sesiones abiertas simultáneamente, se puede elegir entre ellas.

### 4.4 Retroceder una solicitud del CIARP

Si se retrocede una solicitud que ya estaba en el CIARP, el sistema **elimina automáticamente** la asignación de sesión y el acta, sacándola del comité.

### 4.5 Exportar informe Excel

En la pestaña de **Aprobados** o **Comités**, el botón **"Exportar a Excel"** genera el informe CIARP en formato .xlsx listo para entregar. Este informe incluye:
- Una fila por cada solicitud aprobada con todos sus metadatos
- Filas adicionales para co-autores (con puntos en 0 y sin metadatos)

---

## 5. Módulo CEI — Ascensos

Para acceder: clic en **"CEI"** en el menú lateral.

Gestiona las solicitudes de ascenso en el escalafón docente. Funciona de manera similar al módulo CIARP pero con el flujo de etapas propio del proceso de escalafón de la Universidad del Quindío.

---

## 6. Módulo de Resoluciones

Para acceder: clic en **"Resoluciones"** en el menú lateral.

### 6.1 Pestañas de resoluciones

| Pestaña | Contenido |
|---------|-----------|
| 📄 Productividad Académica | Solicitudes de puntos salariales permanentes aprobadas |
| 💰 Bonificaciones | Solicitudes de bonificaciones aprobadas |
| 🎓 Experiencia y Desempeño | DAA, DDD, Experiencia Calificada |
| 📊 Ascensos | Solicitudes de ascenso aprobadas |

### 6.2 Generar resolución en Word

1. Seleccionar la pestaña correspondiente
2. Filtrar por año si es necesario
3. Clic en el botón **"📥 Exportar Vista a Word"**
4. El sistema genera un documento Word con el formato institucional de resolución, agrupado por programa académico

---

## 7. Módulo Gestión Central de Docentes

Para acceder: clic en **"Gestión Docentes"** en el menú lateral.

> **Importante:** Este módulo muestra **exclusivamente** los docentes de planta activos (Titular, Asociado, Asistente y Auxiliar con estado ACTIVO en la base de datos).

### 7.1 Vistas disponibles

- **Tabla de Datos:** listado completo con todos los indicadores
- **Panel Estadístico:** distribución por categoría con gráficos

### 7.2 Semáforo de tope de productividad

| Color | Significado |
|-------|-------------|
| 🟢 Verde | El docente tiene espacio disponible para recibir más puntos |
| 🟡 Amarillo | El docente está cerca de su tope (menos de 20 puntos disponibles) |
| 🔴 Rojo | El docente ha alcanzado o superado su tope máximo |

### 7.3 Detalle de un docente

Clic sobre cualquier docente para ver:
- Información personal y académica
- Barra de progreso del tope de productividad
- Historial de puntos por sesión CIARP
- Topes de subcategoría (libros, software, ponencias, artículos no indexados)
- Historial completo de productos evaluados

---

## 8. Banco de Pares Evaluadores

Para acceder: clic en **"Banco de Pares"** en el menú lateral.

Permite gestionar el registro de evaluadores externos con:
- Nombre, institución y área de conocimiento
- Historial de evaluaciones realizadas
- Disponibilidad para nuevas evaluaciones

---

## 9. Módulo de Reportes y Estadísticas

Para acceder: clic en **"Estadísticas"** en el menú lateral.

Genera gráficos interactivos con:
- Distribución de solicitudes por tipo de producto
- Solicitudes por facultad y programa
- Tendencias por periodo
- Comparativas de puntos asignados vs sugeridos

---

## 10. Exportar e Importar

### Exportar datos

En la barra superior (**"Exportar"**), se pueden descargar:
- **Excel CIARP:** informe completo para el comité
- **Excel General:** listado de todas las solicitudes

### Importar datos

En la barra superior (**"Exportar" → "Importar"**), se pueden cargar archivos Excel con el formato CIARP para agregar solicitudes masivamente.

---

## 11. Preguntas Frecuentes

**¿Qué pasa si cierro el navegador?**  
El sistema no pierde datos. Al volver a abrir el navegador e ingresar la dirección, todo estará igual.

**¿Puedo usar el sistema desde mi teléfono?**  
Sí, siempre que esté conectado a la red de la universidad. Abrir el navegador y escribir la dirección IP del servidor con el puerto 5173.

**¿Cada cuánto se actualizan los datos automáticamente?**  
El sistema sincroniza los datos con la base de datos cada 30 segundos de forma automática y silenciosa.

**¿Cómo sé que mis cambios quedaron guardados?**  
Aparece una notificación verde en la esquina de la pantalla confirmando el guardado exitoso.
