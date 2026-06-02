# Aporte al Conocimiento e Innovación
# SISTEMA DE GESTIÓN DE PRODUCTIVIDAD ACADÉMICA — UNIVERSIDAD DEL QUINDÍO

---

## Descripción del Software

El **Sistema de Gestión de Productividad Académica de la Universidad del Quindío** (Gestión UQ) es una herramienta de software de apoyo a la gestión institucional que automatiza el proceso de radicación, evaluación, aprobación y resolución de solicitudes de productividad académica, conforme al **Decreto 1279 del 19 de junio de 2002** del Ministerio de Educación Nacional de Colombia.

El sistema centraliza en una sola plataforma web los dos procesos institucionales de mayor impacto para la planta docente de la universidad:

1. **Proceso CIARP** (Comité Interno de Asignación y Reconocimiento de Puntaje): gestión de solicitudes que otorgan puntos salariales permanentes por productividad académica o bonificaciones de pago único, incluyendo artículos científicos, libros, software, obras artísticas, ponencias, tesis dirigidas y producción técnica.

2. **Proceso CEI** (Comité de Escalafón Institucional): gestión de solicitudes de ascenso en las categorías del escalafón docente (Auxiliar, Asistente, Asociado, Titular).

---

## Aporte a la Innovación Institucional

Esta herramienta surgió de la necesidad de la Oficina de Asuntos Profesorales de la Universidad del Quindío de modernizar y centralizar un proceso que históricamente se manejaba mediante hojas de cálculo Excel, documentos Word dispersos y correos electrónicos, lo que generaba:

- Dificultad para hacer seguimiento del estado de cada solicitud
- Riesgo de pérdida de información por manejo manual
- Tiempos elevados en la elaboración de resoluciones
- Imposibilidad de generar estadísticas e indicadores de gestión en tiempo real
- Errores en el cálculo de topes y puntos salariales por docente

La **principal innovación** del sistema es la integración de todos estos procesos en una plataforma web local que funciona completamente dentro de la red institucional, sin depender de servicios externos de terceros (como plataformas en la nube), garantizando así la confidencialidad de la información salarial y académica de los docentes.

---

## Características Diferenciadoras

### 1. Gestión de múltiples sesiones CIARP simultáneas
El sistema permite tener dos o más sesiones del comité CIARP abiertas al mismo tiempo, lo que resuelve la necesidad real de la oficina de gestionar simultáneamente solicitudes de diferentes periodos o tipos.

### 2. Separación de Puntos Salariales y Bonificaciones
El sistema diferencia automáticamente los productos que generan **puntos salariales permanentes** de los que generan **bonificaciones de pago único**, mostrándolos en secciones separadas tanto en el panel de solicitudes como en el módulo de generación de resoluciones.

### 3. Control automático de topes por docente
El sistema calcula en tiempo real el tope máximo de productividad de cada docente según el Decreto 1279 y su categoría escalafonaria, mostrando un semáforo visual de capacidad disponible. Esto evita errores humanos en la asignación de puntos que superen los límites legales.

### 4. Generación automatizada de resoluciones en Word
Con un solo clic, el sistema genera el documento Word de resolución con el formato institucional requerido, agrupando los docentes por programa académico y calculando automáticamente los artículos del decreto aplicables.

### 5. Exportación de informes CIARP en Excel
El sistema genera el reporte en formato Excel requerido por el comité CIARP, incluyendo automáticamente las filas de co-autores con los valores correctos (puntos = 0, sin metadatos), lo que elimina el trabajo manual de construcción de este informe.

---

## Datos Técnicos

| Ítem | Detalle |
|------|---------|
| Tipo de software | Aplicación web de gestión institucional |
| Plataforma | Web (navegador Chrome/Edge) + servidor local |
| Tecnología Frontend | React 18 + Vite 5 |
| Tecnología Backend | Node.js + Express.js |
| Base de datos | PostgreSQL 18 |
| Sistema operativo servidor | Windows 10/11 |
| Repositorio de código | https://github.com/Josevargas998/gestion-uq |
| Licencia | Uso exclusivo Universidad del Quindío |

---

## Autores

| Nombre | Cédula | Rol en el proyecto |
|--------|--------|--------------------|
| José Heriberto Vargas Espinosa | 1094970478 | Administrador del sistema / Coordinador |
| Lina Marcela Cruz Calderón | 41961206 | Técnico Evaluador / Usuaria principal |

**Universidad:** Universidad del Quindío  
**Unidad:** Oficina de Asuntos Profesorales  
**Año de desarrollo:** 2026
