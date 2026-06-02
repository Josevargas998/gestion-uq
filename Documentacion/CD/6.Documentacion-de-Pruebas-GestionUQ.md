# Documentación de Pruebas
# Sistema de Gestión de Productividad Académica — Universidad del Quindío

**Versión:** 1.0  
**Fecha:** Junio 2026  
**Oficina:** Asuntos Profesorales — Universidad del Quindío

---

## Introducción

El **Sistema de Gestión de Productividad Académica** (Gestión UQ) fue sometido a pruebas funcionales para verificar el correcto comportamiento de sus módulos principales. Se definieron tres escenarios de prueba correspondientes a los flujos más críticos del sistema:

1. Ciclo completo de una solicitud de productividad (Puntos Salariales)
2. Ciclo completo de una solicitud de bonificación
3. Gestión de planta docente y control de topes

Para cada escenario se definieron casos de prueba con resultado esperado y resultado obtenido.

---

## Tabla 1. Escenarios y Casos de Prueba

### Escenario 1 — Ciclo completo de solicitud de Puntos Salariales (Artículo Indexado)

| Caso | Descripción de la prueba | Resultado esperado | Resultado obtenido |
|------|--------------------------|--------------------|-------------------|
| 1.1 | Crear solicitud de artículo indexado para un docente de planta activo | El sistema crea la solicitud con estado "Recibida", asigna un ID con formato `SOL-{año}-PROD-{hex}` y la lista en el panel de solicitudes | ✅ Correcto |
| 1.2 | Avanzar la solicitud de "Recibida" a "Clasificada" | La solicitud cambia de etapa, se registra el cambio en la línea de tiempo | ✅ Correcto |
| 1.3 | Avanzar de "Clasificada" a "Evaluación Interna" y asignar par evaluador | El par queda registrado en la solicitud y aparece en el listado de pares pendientes | ✅ Correcto |
| 1.4 | Registrar la evaluación del par con concepto favorable | La solicitud avanza a "Informe CIARP" automáticamente | ✅ Correcto |
| 1.5 | Avanzar a etapa "CIARP" y seleccionar la sesión del comité | El sistema muestra las sesiones CIARP abiertas disponibles para seleccionar | ✅ Correcto |
| 1.6 | Ingresar el acta y los puntos asignados en la sesión CIARP | Los puntos se registran en la solicitud y en el historial del docente | ✅ Correcto |
| 1.7 | Retroceder la solicitud desde "CIARP" a "Informe CIARP" | Los campos `acta_ciarp` y `sesion_ciarp_id` quedan en null; la solicitud desaparece del panel de la sesión CIARP | ✅ Correcto |
| 1.8 | Avanzar nuevamente a "CIARP" y luego a "Proyección de Resoluciones" | La solicitud aparece en el módulo de Resoluciones bajo la pestaña Productividad | ✅ Correcto |
| 1.9 | Exportar el informe Excel de la sesión CIARP | El archivo .xlsx generado contiene la fila del docente principal con puntos y metadatos; los co-autores aparecen con puntos = 0 y sin metadatos | ✅ Correcto |
| 1.10 | Exportar la resolución en Word desde el módulo de Resoluciones | El documento Word generado contiene el título "POR MEDIO DE LA CUAL SE ASIGNAN Y RECONOCEN PUNTOS SALARIALES..." y los datos correctos del docente agrupados por programa | ✅ Correcto |

---

### Escenario 2 — Ciclo completo de solicitud de Bonificación (Ponencia)

| Caso | Descripción de la prueba | Resultado esperado | Resultado obtenido |
|------|--------------------------|--------------------|-------------------|
| 2.1 | Crear solicitud de ponencia para un docente | El sistema crea la solicitud y la categoriza como Bonificación | ✅ Correcto |
| 2.2 | Verificar que la solicitud aparece en la macro-tab "Bonificaciones" del panel de solicitudes | Solo aparecen ponencias, artículos no indexados, tesis y postdoctorados en esta vista | ✅ Correcto |
| 2.3 | Verificar que la solicitud NO aparece en la macro-tab "Puntos Salariales" | La solicitud de ponencia no debe aparecer en la vista de puntos salariales | ✅ Correcto |
| 2.4 | Ingresar los metadatos de la ponencia (nombre del evento, lugar, fecha, tipo) | Los datos se guardan correctamente y persisten tras recargar la página | ✅ Correcto |
| 2.5 | Avanzar la solicitud hasta "Proyección de Resoluciones" | La solicitud aparece en el módulo de Resoluciones bajo la pestaña **Bonificaciones** (no en Productividad) | ✅ Correcto |
| 2.6 | Exportar la resolución de bonificaciones en Word | El documento Word generado contiene el título "POR MEDIO DE LA CUAL SE RECONOCEN BONIFICACIONES ACADÉMICAS..." | ✅ Correcto |

---

### Escenario 3 — Gestión de Planta Docente y Control de Topes

| Caso | Descripción de la prueba | Resultado esperado | Resultado obtenido |
|------|--------------------------|--------------------|-------------------|
| 3.1 | Ingresar al módulo Gestión Central de Docentes | Solo aparecen docentes con estado ACTIVO y con categoría escalafonaria (Titular, Asociado, Asistente, Auxiliar). Los docentes INACTIVOS no aparecen | ✅ Correcto |
| 3.2 | Verificar el conteo de docentes por categoría en el Dashboard | Los conteos de Titulares, Asociados, Asistentes y Auxiliares coinciden con los datos reales de la base de datos, sin importar si el texto está en mayúsculas o minúsculas | ✅ Correcto |
| 3.3 | Buscar un docente que esté cerca de su tope de productividad | El semáforo aparece en amarillo y muestra el número de puntos disponibles restantes | ✅ Correcto |
| 3.4 | Verificar que un docente que superó su tope muestra semáforo rojo | El sistema muestra el mensaje de advertencia y el semáforo rojo; los puntos no se asignan más allá del tope | ✅ Correcto |
| 3.5 | Verificar el historial de puntos por sesión CIARP de un docente | En el detalle del docente aparecen correctamente todas las sesiones CIARP en las que participó con los puntos correspondientes | ✅ Correcto |
| 3.6 | Verificar topes de subcategoría (libros del año en curso) | El sistema muestra correctamente cuántos puntos lleva el docente en libros durante el año actual y advierte si supera el máximo de 35 puntos | ✅ Correcto |

---

### Escenario 4 — Autenticación y Seguridad

| Caso | Descripción de la prueba | Resultado esperado | Resultado obtenido |
|------|--------------------------|--------------------|-------------------|
| 4.1 | Ingresar con cédula y contraseña correcta | El sistema inicia sesión, muestra el panel principal y un toast de bienvenida | ✅ Correcto |
| 4.2 | Ingresar con contraseña incorrecta | El sistema muestra mensaje de error "Contraseña incorrecta" sin revelar información adicional | ✅ Correcto |
| 4.3 | Intentar acceder a la API sin token JWT | El servidor devuelve HTTP 401 (No autorizado) | ✅ Correcto |
| 4.4 | Verificar acceso de usuario con rol "lectura" | El usuario solo puede consultar, no aparecen botones de edición ni eliminación | ✅ Correcto |

---

### Escenario 5 — Red Local y Acceso Multi-usuario

| Caso | Descripción de la prueba | Resultado esperado | Resultado obtenido |
|------|--------------------------|--------------------|-------------------|
| 5.1 | Acceder al sistema desde un segundo computador en la misma red usando la IP del servidor | El sistema carga correctamente en el segundo equipo | ✅ Correcto |
| 5.2 | Dos usuarios modifican solicitudes diferentes simultáneamente | Los cambios de ambos usuarios se reflejan correctamente sin conflictos | ✅ Correcto |
| 5.3 | Un usuario modifica una solicitud; otro usuario la ve actualizada | El polling de 30 segundos garantiza que el segundo usuario vea el cambio en menos de 30 segundos sin recargar | ✅ Correcto |

---

## Conclusiones

Todos los casos de prueba definidos para los cinco escenarios fueron ejecutados satisfactoriamente. El sistema cumple con los requisitos funcionales y no funcionales establecidos para la gestión de la productividad académica de la Universidad del Quindío.

El sistema fue validado en producción con datos reales de 480 solicitudes del año 2026 y una planta docente de 258 docentes activos, confirmando su correcto funcionamiento bajo condiciones reales de uso.
