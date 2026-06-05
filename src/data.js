// ── Roles de usuario ──────────────────────────────────────────
// Fuente única de verdad para labels, colores e iconos de rol.
// Importar desde aquí en lugar de redefinir en cada componente.
export const ROL_INFO = {
  admin:     { label: 'Administrador',     color: '#28a745', icon: '🏛️' },
  tecnico:   { label: 'Técnico Evaluador', color: '#dc3545', icon: '⚖️' },
  asistente: { label: 'Asistente',         color: '#1a5fa8', icon: '📋' },
  lectura:   { label: 'Solo Lectura',      color: '#6c757d', icon: '👁️' },
  docente:   { label: 'Docente',           color: '#15803d', icon: '👨‍🏫' },
};

// ROL_COLORS mantiene bg/light/text para el design system UQ
export const ROL_COLORS = {
  admin:     { bg: '#006B3F', light: '#e6f5ee', text: '#fff', label: 'Administrador' },
  tecnico:   { bg: '#1a5fa8', light: '#e7f1fb', text: '#fff', label: 'Técnico Evaluador' },
  asistente: { bg: '#7b3fa8', light: '#f3eafa', text: '#fff', label: 'Asistente' },
  lectura:   { bg: '#5a5a5a', light: '#f0f0f0', text: '#fff', label: 'Solo Lectura' },
  docente:   { bg: '#15803d', light: '#f0fdf4', text: '#fff', label: 'Docente' },
};

// ── Clasificación según Decreto 1279 ──────────────────────────────────────────
// esBonificacion: pago único, NO suma al salario permanente ni al tope de productividad
//   (ponencias: máx 3/año | artículos no indexados: máx 5/año | tesis, posdoctorado: sin límite)
// esExcepcion: SÍ suma al salario total pero NO al tope de productividad (DAA, DDD, Exp. Calificada)
// grupoLimite: 'libros' — el límite de 35 pts/año es combinado entre todos los tipos de libro
// limitePtsAnual: límite de puntos por año para ese tipo/grupo
// limiteAnualCount: límite de cantidad de productos por año
export const TIPOS = {
  articulo_indexado:    { label: 'Artículos Indexados',          pts: 0,  ruta: 'directo',         icon: '📰', desc: 'Categoría evaluada en Informe CIARP' },
  articulo_no_indexado: { label: 'Artículos No Indexados',       pts: 0,  ruta: 'directo',         icon: '📰', desc: 'Sin indexar o divulgación',              esBonificacion: true, limiteAnualCount: 5 },
  libro_texto:          { label: 'Libro de Texto',                pts: 15, ruta: 'internos',        icon: '📘', consejo: 'Consejo Curricular',  desc: 'Con evaluación interna',  grupoLimite: 'libros', limitePtsAnual: 35 },
  libro_ensayo:         { label: 'Libro de Ensayo',               pts: 15, ruta: 'internos',        icon: '📙', consejo: 'Consejo de Facultad', desc: 'Con evaluación interna',  grupoLimite: 'libros', limitePtsAnual: 35 },
  libro_investigacion:  { label: 'Libro de Investigación',       pts: 20, ruta: 'externos',        icon: '📗', desc: 'Solo pares externos',                      grupoLimite: 'libros', limitePtsAnual: 35 },
  software:             { label: 'Producción de Software',        pts: 15, ruta: 'internos',        icon: '💻', consejo: 'Consejo Técnico Software', desc: 'Con evaluación interna', limitePtsAnual: 35 },
  produccion_tecnica:   { label: 'Producción Técnica',            pts: 15, ruta: 'externos',        icon: '🔧', desc: 'Solo pares externos' },
  obra_artistica:       { label: 'Obra Artística',                pts: 20, ruta: 'externos',        icon: '🎨', desc: 'Solo pares externos — categoría independiente de Audiovisual' },
  video:                { label: 'Producción Audiovisual',        pts: 12, ruta: 'externos',        icon: '🎥', desc: 'Solo pares externos — máx 5 por año',     limiteAnualCount: 5 },
  traduccion:           { label: 'Traducción de Libro',           pts: 15, ruta: 'externos',        icon: '💬', desc: 'Solo pares externos' },
  patente:              { label: 'Patentes',                      pts: 25, ruta: 'directo',         icon: '💡', desc: 'Directo a CIARP' },
  premio:               { label: 'Premios',                       pts: 15, ruta: 'informe_directo', icon: '🏆', desc: 'Directo a informe' },
  ponencia:             { label: 'Ponencias',                     pts:  0, ruta: 'directo',         icon: '🎤', desc: 'Presentación en evento académico',         esBonificacion: true, limiteAnualCount: 3 },
  direccion_tesis:      { label: 'Dirección de Tesis',            pts:  0, ruta: 'directo',         icon: '🎓', desc: 'Tesis de maestría/doctorado',              esBonificacion: true },
  // Alias de BD: 'tesis' = 'direccion_tesis'
  tesis:                { label: 'Dirección de Tesis',            pts:  0, ruta: 'directo',         icon: '🎓', desc: 'Tesis de maestría/doctorado',              esBonificacion: true },
  // Títulos académicos: la BD usa 'titulo_academico' y 'titulo' (ambos iguales)
  titulo_academico:     { label: 'Títulos Académicos',           pts:  0, ruta: 'directo',         icon: '🏅', desc: 'Reconocimiento de título académico' },
  titulo:               { label: 'Títulos Académicos',           pts:  0, ruta: 'directo',         icon: '🏅', desc: 'Reconocimiento de título académico' },
  posdoctorado:         { label: 'Postdoctorados',                pts:  0, ruta: 'directo',         icon: '🔬', desc: 'Postdoctorado o estadía de investigación', esBonificacion: true },
  ascenso:              { label: 'Ascenso en el Escalafón',       pts:  0, ruta: 'cei',             icon: '⬆️', desc: 'Comité de Escalafón Interno' },
  // ── Excepciones al tope — SÍ suman al salario total pero NO al tope de productividad ──
  daa:                  { label: 'Desempeño Acad.-Admvo. (DAA)',  pts: 0,  ruta: 'directo',         icon: '🏩', desc: 'Art. 10 D.1279 — Cargo académico-administrativo',    esExcepcion: true },
  ddd:                  { label: 'Desempeño Destacado (DDD)',      pts: 0,  ruta: 'directo',         icon: '⭐', desc: 'Art. 10 D.1279 — Evaluación docente sobresaliente', esExcepcion: true },
  ddd_auxiliar:         { label: 'DDD — Auxiliar',                 pts: 0,  ruta: 'directo',         icon: '⭐', desc: 'Art. 10 D.1279 — DDD categoría Auxiliar (2 pts)',   esExcepcion: true },
  ddd_asistente:        { label: 'DDD — Asistente',                pts: 0,  ruta: 'directo',         icon: '⭐', desc: 'Art. 10 D.1279 — DDD categoría Asistente (3 pts)',  esExcepcion: true },
  ddd_asociado:         { label: 'DDD — Asociado',                 pts: 0,  ruta: 'directo',         icon: '⭐', desc: 'Art. 10 D.1279 — DDD categoría Asociado (4 pts)',   esExcepcion: true },
  ddd_titular:          { label: 'DDD — Titular',                  pts: 0,  ruta: 'directo',         icon: '⭐', desc: 'Art. 10 D.1279 — DDD categoría Titular (5 pts)',    esExcepcion: true },
  exp_calificada:       { label: 'Experiencia Calificada',         pts: 0,  ruta: 'directo',         icon: '💼', desc: 'Art. 12 D.1279 — Experiencia profesional externa',   esExcepcion: true },
};

export const ETAPAS = [
  { id: 'clasificada',     label: 'Clasificada',          short: '1' },
  { id: 'pares_internos',  label: 'Evaluación Interna',   short: '2' },
  { id: 'pares_externos',  label: 'Evaluación Externa',   short: '3' },
  { id: 'informe',         label: 'Informe CIARP',        short: '4' },
  { id: 'ciarp',           label: 'CIARP',                short: '5' },
  { id: 'proyectar_resoluciones', label: 'Proy. Resoluciones', short: '6' },
  { id: 'archivada',       label: 'Archivada',            short: '7' },
];

export const ETAPA_ORDER = ETAPAS.map(e => e.id);

export const PROGRAMAS = [
  'Ingeniería Civil', 'Ingeniería Electrónica', 'Ingeniería de Sistemas y Computación', 'Ingeniería Topográfica y Geomática', 'Tecnología en Obras Civiles', 'Maestría en Ingeniería',
  'Licenciatura en Ciencias Naturales y Educación Ambiental', 'Licenciatura en Literatura y Lengua Castellana', 'Licenciatura en Matemáticas', 'Licenciatura en Lenguas Modernas (énfasis en inglés y francés)', 'Licenciatura en Ciencias Sociales', 'Licenciatura en Educación Física, Recreación y Deportes', 'Licenciatura en Educación Infantil', 'Doctorado en Ciencias de la Educación', 'Maestría en Ciencias de la Educación', 'Maestría en Medio Ambiente',
  'Artes Visuales', 'Comunicación Social – Periodismo', 'Ciencias de la Información y la Documentación (Bibliotecología y Archivística)', 'Filosofía', 'Trabajo Social',
  'Física', 'Química', 'Biología', 'Tecnología en Instrumentación Electrónica', 'Doctorado en Ciencias', 'Maestría en Biomatemáticas', 'Maestría en Biología Vegetal', 'Maestría en Ciencias de los Materiales', 'Maestría en Química',
  'Administración Financiera', 'Administración de Negocios', 'Contaduría Pública', 'Economía', 'Maestría en Administración', 'Especialización en Negocios y Finanzas Internacionales', 'Especialización en Gerencia Logística', 'Especialización en Revisoría Fiscal y Auditoría Externa',
  'Medicina', 'Enfermería', 'Gerontología', 'Seguridad y Salud en el Trabajo', 'Doctorado en Ciencias Biomédicas', 'Maestría en Ciencias Biomédicas', 'Maestría en Prevención de Riesgos Laborales', 'Especialización en Medicina Interna', 'Especialización en Pediatría',
  'Ingeniería de Alimentos', 'Tecnología en Procesos Agroindustriales', 'Tecnología Agropecuaria', 'Zootecnia', 'Maestría en Procesos Agroindustriales'
];

export const FACULTADES = [
  'Ingeniería',
  'Ciencias de la Educación',
  'Ciencias Humanas y Bellas Artes',
  'Ciencias Básicas y Tecnologías',
  'Ciencias Económicas, Administrativas y Contables',
  'Ciencias de la Salud',
  'Ciencias Agroindustriales'
];

export const INIT_SOLICITUDES = [
  { id:'SOL-2025-001', docente:'Juan Carlos Pérez Mora', cedula:'70420310', programa:'Física', facultad:'Ciencias Básicas y Tecnologías', tipo:'articulo_indexado', titulo:'Coexistence of weak and strong coupling in a photonic molecule', revista:'Nanophotonics (Q1)', fecha:'2026-01-23', etapa:'ciarp', pts_sug:15, pts_asig:15, estado:'en_proceso', correo:'eagomez@uniquindio.edu.co', notas:'Aprobado CIARP 1 del 18/03/2026', acta_ciarp:'1/2026', timeline:[{f:'23 ene',a:'Solicitud recibida y firmada',p:'Contratista'},{f:'23 ene',a:'Clasificada: Artículo A1 → ruta directa CIARP',p:'Contratista'},{f:'15 feb',a:'Informe proyectado: 15 puntos',p:'Técnico Admvo.'},{f:'18 mar',a:'Aprobado en CIARP 1',p:'Jefe Oficina'}] },
  { id:'SOL-2025-002', docente:'María Elena Gómez Ruiz', cedula:'24580502', programa:'Contaduría Pública', facultad:'Ciencias Económicas, Administrativas y Contables', tipo:'libro_texto', titulo:'Instrumentos financieros básicos - beneficios a empleados - provisiones y contingencias', fecha:'2026-01-15', etapa:'pares_externos', pts_sug:20, pts_asig:null, estado:'en_proceso', correo:'lmlopez@uniquindio.edu.co', notas:'Concepto Consejo Curricular recibido. Pares externos asignados.', pares_int:{estado:'aprobado',consejo:'Consejo Curricular',fecha:'2026-03-16'}, pares_ext:[{nombre:'Liliana Elizabeth Ruiz Acosta',univ:'Universidad Libre de Colombia',estado:'pendiente',vence:'15 may'},{nombre:'Diana Copete Maturana',univ:'U. Pontificia Bolivariana',estado:'pendiente',vence:'15 may'}], timeline:[{f:'15 ene',a:'Solicitud recibida',p:'Contratista'},{f:'16 ene',a:'Clasificada: Libro Texto → Consejo Curricular',p:'Contratista'},{f:'16 ene',a:'Memorando 2026-IM-1045 enviado al Consejo Curricular',p:'Contratista'},{f:'16 mar',a:'Concepto del Consejo Curricular: APROBADO',p:'Consejo Curricular'},{f:'6 abr',a:'Pares externos asignados (plazo 30 días)',p:'Contratista'}] },
  { id:'SOL-2025-003', docente:'Oscar Alexander Aguirre Obando', cedula:'9732828', programa:'Biología', facultad:'Ciencias Básicas y Tecnologías', tipo:'libro_texto', titulo:'Modelamiento de nicho ecológico para Dummies: un ejemplo desde los mosquitos', fecha:'2026-02-06', etapa:'pares_externos', pts_sug:20, pts_asig:null, estado:'en_proceso', correo:'oscaraguirre@uniquindio.edu.co', notas:'Pares externos evaluando.', pares_ext:[{nombre:'Luz Angela Cuellar Rodriguez',univ:'Universidad del Quindío',estado:'recibido',vence:'15 may'},{nombre:'Rafael Angel Moreno Arias',univ:'UN Colombia',estado:'pendiente',vence:'15 may'}], timeline:[{f:'6 feb',a:'Solicitud recibida',p:'Contratista'},{f:'6 feb',a:'Clasificada: Libro Texto → pares externos',p:'Contratista'},{f:'15 abr',a:'Par 1 entregó evaluación',p:'Pares Externos'}] },
  { id:'SOL-2025-004', docente:'Olga Alicia Nieto Cárdenas', cedula:'41893527', programa:'Medicina', facultad:'Ciencias de la Salud', tipo:'libro_ensayo', titulo:'El riesgo cardiovascular: entre la genética y la epigenética', fecha:'2026-01-17', etapa:'pares_externos', pts_sug:8, pts_asig:null, estado:'en_proceso', correo:'oanieto@uniquindio.edu.co', notas:'Memorando enviado al Consejo de Facultad. Pares externos en proceso.', pares_int:{estado:'aprobado',consejo:'Consejo de Facultad',fecha:'2026-02-10'}, pares_ext:[{nombre:'Paula Katherine Bautista Nino',univ:'Erasmus University',estado:'pendiente',vence:'26 abr'},{nombre:'David Aristizabal Colorado',univ:'Fundación U. San Martín',estado:'recibido',vence:'26 abr'}], timeline:[{f:'17 ene',a:'Solicitud recibida',p:'Contratista'},{f:'17 ene',a:'Clasificada: Libro Ensayo → Consejo de Facultad',p:'Contratista'},{f:'17 ene',a:'Memorando 2026-IM-892 enviado al Consejo de Facultad',p:'Contratista'},{f:'10 feb',a:'Concepto de Facultad: APROBADO',p:'Consejo de Facultad'},{f:'13 mar',a:'Pares externos asignados',p:'Contratista'}] },
  { id:'SOL-2025-005', docente:'Jorge Alejandro Aldana Gutiérrez', cedula:'9730805', programa:'Ing. Electrónica', facultad:'Ingeniería', tipo:'premio', titulo:'El desarrollo de videojuegos en un currículo integrado CDIO en la Universidad del Quindío', fecha:'2026-03-19', etapa:'clasificada', pts_sug:5, pts_asig:null, estado:'en_proceso', correo:'jaldana@uniquindio.edu.co', notas:'Premio pendiente de verificación de documentación.', timeline:[{f:'19 mar',a:'Solicitud recibida',p:'Contratista'},{f:'19 mar',a:'Clasificada: Premio → directo a informe',p:'Contratista'}] },
  { id:'SOL-2024-089', docente:'Rafael Humberto Villamizar Vargas', cedula:'11380439', programa:'Seguridad y Salud en el Trabajo', facultad:'Ciencias de la Salud', tipo:'libro_texto', titulo:'Fundamentos de higiene industrial: problemas resueltos y propuestos', fecha:'2026-02-11', etapa:'archivada', pts_sug:20, pts_asig:20, estado:'aprobado', correo:'rhvillamizar@uniquindio.edu.co', notas:'Evaluado. Resolución de pago R.R. No. 373 del 17/04/2026.', acta_ciarp:'1/2026', pares_ext:[{nombre:'James Frank Trujillo Perdomo',univ:'U. El Bosque',estado:'recibido'},{nombre:'Daydu Milena Robayo Barrios',univ:'U. del Tolima',estado:'recibido'}], timeline:[{f:'11 feb',a:'Solicitud recibida',p:'Contratista'},{f:'13 feb',a:'Enviado a Consejo Curricular',p:'Contratista'},{f:'18 feb',a:'Concepto aprobado',p:'Consejo Curricular'},{f:'20 feb',a:'Pares externos asignados',p:'Contratista'},{f:'30 abr',a:'Pares entregaron evaluaciones',p:'Pares Externos'},{f:'17 abr',a:'Resolución de pago R.R. No. 373 firmada',p:'Rectoría'},{f:'17 abr',a:'Documentación archivada',p:'Secretaría'}] },
];
