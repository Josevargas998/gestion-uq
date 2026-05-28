import { ETAPAS, ETAPA_ORDER, TIPOS } from './data.js';

export const etapaIdx    = e => ETAPA_ORDER.indexOf(e);
export const labelEtapa  = e => ETAPAS.find(x => x.id === e)?.label || e;
export const badgeEtapa  = etapa => ({
  clasificada:'bb', pares_internos:'ba', pares_externos:'ba',
  informe:'bp', ciarp:'bb', proyectar_resoluciones:'bg', archivada:'bgr',
}[etapa] || 'bgr');

export const rutaLabel = r => ({
  directo:         'Directo al CIARP — sin evaluadores',
  internos:        'Pares internos (Consejo) + pares externos',
  externos:        'Solo pares evaluadores externos',
  informe_directo: 'Directo a informe — sin evaluadores',
  cei:             'Directo al Comité de Escalafón (CEI)',
}[r] || r);

export function buildTimeline(form, tipo) {
  const d = form.fecha.slice(5).replace('-', ' ');
  const base = [
    { f: d, a: 'Solicitud recibida y firmada', p: 'Contratista' },
    { f: d, a: 'Ingresada a base de datos', p: 'Contratista' },
    { f: d, a: `Clasificada: ${tipo?.label || form.tipo} → ${rutaLabel(tipo?.ruta || '')}`, p: 'Contratista' },
  ];
  return base;
}

/**
 * Determina el color, fondo, etiqueta e ícono del semáforo para un docente.
 * @param {number} diferencia - Puntos restantes para el tope.
 * @param {number} tope - Puntos máximos posibles.
 * @param {string} [estado='ACTIVO'] - Estado actual del docente ('ACTIVO' o 'INACTIVO').
 * @returns {{color: string, bg: string, label: string, icon: string}}
 */
export function getSemaforo(diferencia, tope, estado = 'ACTIVO') {
  if (estado?.toUpperCase() === 'INACTIVO') {
    return { color: '#6b7280', bg: '#f3f4f6', label: 'Inactivo', icon: '⚪' };
  }
  if (tope === 0) {
    return { color: '#aaa', bg: '#f3f4f6', label: 'Sin tope', icon: '⚪' };
  }
  if (diferencia <= 0) {
    return { color: '#dc2626', bg: '#fef2f2', label: 'Tope alcanzado', icon: '🔴' };
  }
  if (diferencia <= 20) {
    return { color: '#d97706', bg: '#fffbeb', label: 'Cerca del tope', icon: '🟡' };
  }
  return { color: '#16a34a', bg: '#f0fdf4', label: 'Con espacio', icon: '🟢' };
}

/**
 * Limpia caracteres corruptos o mal decodificados (Private Use Areas y Cyrillic replacements)
 * @param {string} str - Texto a limpiar.
 * @returns {string} Texto limpio.
 */
export function cleanText(str) {
  if (!str || typeof str !== 'string') return str || '';
  
  let result = str;

  // List of replacements with their lowercase and uppercase equivalents
  const replacements = [
    { char: '\u{EE821}', lower: 'ón a', upper: 'ÓN A' },
    { char: '\u{EE825}', lower: 'ó', upper: 'Ó' },
    { char: '\u{EE835}', lower: 'ón u', upper: 'ÓN U' },
    { char: '\u{E7A63}', lower: 'ógic', upper: 'ÓGIC' },
    { char: '\u{04CE}',  lower: 'ón', upper: 'ÓN' },
    { char: 'ڎ',         lower: 'ú', upper: 'Ú' },
    { char: '\u{EEB61}', lower: 'ón-a', upper: 'ÓN-A' },
    { char: '\u{EE829}', lower: 'ón i', upper: 'ÓN I' },
    { char: 'ڍ',         lower: 'ú', upper: 'Ú' },
    { char: '᭩',         lower: 'ám', upper: 'ÁM' },
    { char: 'ځ',         lower: 'é', upper: 'É' },
    { char: 'Ӑ',         lower: 'ó', upper: 'Ó' },
    { char: '\u{E796E}', lower: 'óg', upper: 'ÓG' },
    { char: '\u{F1BC7}', lower: 'ño g', upper: 'ÑO G' },
    { char: '駩',         lower: 'ég', upper: 'ÉG' },
    { char: '\u{EE836}', lower: 'ón v', upper: 'ÓN V' },
    { char: 'ᴩ',         lower: 'át', upper: 'ÁT' },
    { char: 'ᬣ',         lower: 'ác', upper: 'ÁC' },
    { char: '᭢',         lower: 'ám', upper: 'ÁM' },
    { char: 'ᣩ',         lower: 'áci', upper: 'ÁCI' },
    { char: '\u{EE801}', lower: 'ón a', upper: 'ÓN A' },
    { char: 'ԇ',         lower: 'ó', upper: 'Ó' },
    { char: '\u{EEB20}', lower: 'ón, ', upper: 'ÓN, ' },
    { char: '\u{EEB52}', lower: 'ón R', upper: 'ÓN R' },
    { char: 'ӑ',         lower: 'op', upper: 'OP' },
    { char: 'ӌ',         lower: 'ó', upper: 'Ó' },
    { char: 'Р',         lower: 'º', upper: 'º' },
    { char: '\u{F1BC4}', lower: 'ño d', upper: 'ÑO D' },
    { char: 'ᦩ',         lower: 'áfi', upper: 'ÁFI' },
    { char: '\u{EE834}', lower: 'ón t', upper: 'ÓN T' },
    { char: 'ᮩ',         lower: 'áni', upper: 'ÁNI' },
    { char: 'ߕ',         lower: ' - ', upper: ' - ' },
    { char: '\u{F2D25}', lower: 'úst', upper: 'ÚST' },
    { char: 'х',         lower: 'ñ', upper: 'Ñ' },
    { char: 'ڒ',         lower: 'ú', upper: 'Ú' },
    { char: 'ߍ',         lower: 'M', upper: 'M' },
    { char: 'ᣥ',         lower: 'ác', upper: 'ÁC' },
    { char: 'ԯ',         lower: 'o', upper: 'O' },
    { char: '硩',         lower: 'ç', upper: 'Ç' },
    { char: '貥',         lower: 'é', upper: 'É' },
    { char: '߃',         lower: '¿C', upper: '¿C' },
    { char: 'ډ',         lower: 'ü', upper: 'Ü' },
    { char: '\u{EECD4}', lower: 'ósi', upper: 'ÓSI' },
    { char: '\u{EE828}', lower: 'ón(', upper: 'ÓN(' },
    { char: 'ߑ',         lower: '¿Q', upper: '¿Q' },
    { char: '\u{F2B29}', lower: 'últi', upper: 'ÚLTI' },
    { char: 'ڔ',         lower: 'ú', upper: 'Ú' },
    { char: 'Ә',         lower: 'ó', upper: 'Ó' },
    { char: '飡',         lower: 'éc', upper: 'ÉC' },
    { char: '\u{EEB60}', lower: 'ú - ', upper: 'Ú - ' },
    { char: '߂',         lower: '¿B', upper: '¿B' },
    { char: '\u{F1863}', lower: 'ñas ', upper: 'ÑAS ' },
    { char: 'Ს',         lower: 'ára', upper: 'ÁRA' },
    { char: 'ڃ',         lower: 'ú', upper: 'Ú' },
    { char: '\u{EED63}', lower: 'ómic', upper: 'ÓMIC' },
    { char: 'ߓ',         lower: '3', upper: '3' },
    { char: '\u{EEA63}', lower: 'ónic', upper: 'ÓNIC' },
    { char: 'ߐ',         lower: 'P', upper: 'P' },
    { char: '߼',         lower: ' ', upper: ' ' }
  ];

  for (const rep of replacements) {
    // If character is preceded by an uppercase letter, use upper replacement
    const upperRegex = new RegExp(`([A-ZÁÉÍÓÚÑ])${rep.char}`, 'gu');
    result = result.replace(upperRegex, `$1${rep.upper}`);
    
    // Otherwise, use lower replacement
    const globalRegex = new RegExp(rep.char, 'gu');
    result = result.replace(globalRegex, rep.lower);
  }

  // General cleanups
  return result
    .replace(/UniQuind\udbe0y/g, 'UniQuindío y')
    .replace(/Quind\udbe0para/g, 'Quindío para')
    .replace(/Semiolog\ud860/g, 'Semiología ');
}

/**
 * Normaliza los datos de una solicitud/fila provenientes de la BD para la app.
 * @param {Object} row - Objeto crudo de la base de datos.
 * @returns {Object|null} Objeto de solicitud normalizado o null si row es nulo.
 */
export function normalizeRow(row) {
  if (!row) return null;
  return {
    id:             row.id,
    docente:        cleanText(row.docente || 'Sin autor'),
    coautor:        cleanText(row.coautor || ''),
    cedula:         row.cedula          || '',
    programa:       cleanText(row.programa || 'Sin programa'),
    facultad:       cleanText(row.facultad || 'Sin facultad'),
    docente_pts_acumulados: row.docente_pts_acumulados !== undefined ? Number(row.docente_pts_acumulados) : null,
    docente_pts_titulos_exp: row.docente_pts_titulos_exp !== undefined ? Number(row.docente_pts_titulos_exp) : null,
    docente_pts_total_salarial: row.docente_pts_total_salarial !== undefined ? Number(row.docente_pts_total_salarial) : null,
    docente_lugar_expedicion: cleanText(row.docente_lugar_expedicion || '________'),
    dedicacion:     row.dedicacion      || '',
    tipo:           (() => {
      const t = row.tipo || 'articulo_indexado';
      // Normaliza tipos viejos de BD al nuevo esquema unificado
      const norm = {
        revista_a1: 'articulo_indexado', revista_a2: 'articulo_indexado',
        revista_b: 'articulo_indexado',  revista_indexada: 'articulo_indexado',
        revista_no_indexada: 'articulo_no_indexado',
        // 'titulo' y 'titulo_academico' son el mismo concepto en la BD
        titulo: 'titulo_academico',
        // 'tesis' es alias de 'direccion_tesis'
        tesis: 'direccion_tesis',
        // 'posdoctorado' (BD) y 'postdoctorado' (nuevo) → mismo tipo
        postdoctorado: 'posdoctorado',
      };
      return norm[t] || t;
    })(),
    titulo:         cleanText(row.titulo || '(Sin título)'),
    revista:        cleanText(row.revista || ''),
    fecha:          row.fecha           || new Date().toISOString().split('T')[0],
    etapa:          row.etapa           || 'recibida',
    estado:         row.estado          || 'en_proceso',
    pts_sug:        Math.max(0, Number(row.pts_sug)  || 0),
    pts_asig:       row.pts_asig != null ? Math.max(0, Number(row.pts_asig)) : null,
    correo:         row.correo          || '',
    notas:          row.notas           || '',
    acta_ciarp:     row.acta_ciarp      || null,
    pares_ext:      row.pares_ext       || undefined,
    pares_int:      row.pares_int       || undefined,
    timeline:       Array.isArray(row.timeline) ? row.timeline : [],
    memoEnvioInt:   row.memo_envio_int  || row.memoEnvioInt  || '',
    fechaEnvioInt:  row.fecha_envio_int || row.fechaEnvioInt || '',
    memoReciboInt:  row.memo_recibo_int || row.memoReciboInt || '',
    fechaReciboInt: row.fecha_recibo_int|| row.fechaReciboInt|| '',
    memoEnvioExt:   row.memo_envio_ext  || row.memoEnvioExt  || '',
    created_at:     row.created_at,
    updated_at:     row.updated_at,
  };
}

/**
 * Normaliza los datos de un docente provenientes de la BD para la app.
 * @param {Object} row - Objeto crudo del docente.
 * @returns {Object|null} Objeto del docente normalizado.
 */
export function normalizeDocente(row) {
  if (!row) return null;
  const categoria = cleanText(row.categoria || '');
  let tope = Number(row.tope) || 0;
  
  // Calcular tope según Decreto 1279
  const catUpper = categoria.toUpperCase();
  if (catUpper.includes('TITULAR')) tope = 540;
  else if (catUpper.includes('ASOCIADO')) tope = 320;
  else if (catUpper.includes('ASISTENTE')) tope = 160;
  else if (catUpper.includes('AUXILIAR')) tope = 80;

  const ptsAcumulados = Number(row.pts_acumulados) || 0;
  const diferencia = tope > 0 ? tope - ptsAcumulados : 0;
  const historial  = row.historial || {};

  const especializacion = cleanText(row.especializacion || '');
  const maestria        = cleanText(row.maestria        || '');
  const doctorado       = cleanText(row.doctorado       || '');
  const titulos = [especializacion, maestria, doctorado].filter(t => t && t.trim() !== '');
  const escolaridad = titulos.length > 0
    ? titulos[titulos.length - 1]
    : cleanText(row.escolaridad || '');

  return {
    no:                row.no             || 0,
    cedula:            row.cedula         || '',
    nombre:            cleanText(row.nombre || ''),
    facultad:          cleanText(row.facultad || ''),
    programa:          cleanText(row.programa || ''),
    categoria:         cleanText(row.categoria || ''),
    escolaridad,
    especializacion,
    maestria,
    doctorado,
    titulosAcademicos: titulos,
    dedicacion:        row.dedicacion     || '',
    fechaIngreso:      row.fecha_ingreso  || '',
    ptsAcumulados,
    tope,
    diferencia,
    ptsFavor:          Number(row.pts_favor)          || 0,
    ptsCiarp1_2026:    Number(row.pts_ciarp1_2026)    || 0,
    ptsTitulosExp:     Number(row.pts_titulos_exp)    || 0,
    ptsTotalSalarial:  Number(row.pts_total_salarial) || 0,
    topeLibros:        Number(row.tope_libros)        || 0,
    topeSoftware:      Number(row.tope_software)      || 0,
    historial,
    comision:          cleanText(row.comision || ''),
    observacion:       cleanText(row.observacion || ''),
    correo:            row.correo         || '',
    estado:            row.estado         || 'ACTIVO',
  };
}

/**
 * Normaliza claves de actas de CIARP (por ejemplo, "6- 29/08/2025" o "6/2025" -> "6/2025").
 * @param {string} raw - Valor de acta de la base de datos.
 * @returns {string} Clave canónica de acta (NUM/AÑO).
 */
export function normalizeActaKey(raw) {
  if (!raw) return '';
  const str = String(raw).trim();
  const numbers = str.match(/\d+/g);
  if (numbers && numbers.length >= 2) {
    const firstNum = parseInt(numbers[0], 10);
    let year = '';
    for (let i = numbers.length - 1; i >= 0; i--) {
      if (numbers[i].length === 4) {
        year = numbers[i];
        break;
      }
    }
    if (year) return `${firstNum}/${year}`;
  }
  const m = str.match(/(\d+)[^\d]*(\d{4})/);
  if (m) return `${parseInt(m[1], 10)}/${m[2]}`;
  return str;
}

/**
 * Limpia y normaliza el nombre de un programa académico.
 * Remueve prefijos como 'DIRECCION DEL PROGRAMA DE' o códigos numéricos,
 * y sufijos como '(DIURNA)' o '(NOCTURNA)', retornando el texto limpio en mayúsculas.
 * @param {string} prog - Nombre original del programa.
 * @returns {string} Nombre del programa normalizado y limpio.
 */
export function cleanProgramaName(prog) {
  if (!prog) return 'SIN PROGRAMA';
  let cleaned = prog.trim();
  
  // Eliminar números al inicio (ej. "410 ", "411 ")
  cleaned = cleaned.replace(/^\d+\s+/, '');
  
  // Eliminar prefijos (insensitivo a mayúsculas/minúsculas)
  const prefixes = [
    /^DIRECCI[OÓ]N\s+DEL\s+PROGRAMA\s+DE\s+/i,
    /^DIRECCI[OÓ]N\s+PROGRAMA\s+DE\s+/i,
    /^DIRECCI[OÓ]N\s+DEL\s+PROGRAMA\s+/i,
    /^DIRECCI[OÓ]N\s+PROGRAMA\s+/i,
    /^PROGRAMA\s+DE\s+/i,
    /^PROGRAMA\s+/i,
    /^FACULTAD\s+DE\s+/i
  ];
  
  for (const regex of prefixes) {
    cleaned = cleaned.replace(regex, '');
  }
  
  // Eliminar sufijos (insensitivo a mayúsculas/minúsculas)
  const suffixes = [
    /\s*\((DIURNA?|NOCTURNA?|DIURNO|NOCTURNO)\)$/i,
    /\s+(DIURNA?|NOCTURNA?|DIURNO|NOCTURNO)$/i
  ];
  
  for (const regex of suffixes) {
    cleaned = cleaned.replace(regex, '');
  }
  
  return cleaned.trim().toUpperCase();
}

/**
 * Reordena un nombre de "APELLIDO1 APELLIDO2 NOMBRE1 NOMBRE2" a "NOMBRE1 NOMBRE2 APELLIDO1 APELLIDO2"
 */
export function formatName(fullname) {
  if (!fullname) return '';
  const words = fullname.trim().split(' ').filter(w => w);
  if (words.length <= 2) return fullname; // Ej: "Perez Juan"
  
  // Asumimos que los dos primeros son apellidos (común en BD de nómina)
  const surnames = words.slice(0, 2).join(' ');
  const names = words.slice(2).join(' ');
  return `${names} ${surnames}`;
}

/**
 * Normaliza y compara una cadena cruda de la BD para encontrar el valor exacto del dropdown.
 */
export function matchDropdownOption(rawStr, optionsArray) {
  if (!rawStr) return '';
  const cleanedRaw = cleanProgramaName(rawStr).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

  for (const opt of optionsArray) {
    const cleanedOpt = opt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    if (cleanedRaw === cleanedOpt) return opt;
  }

  const sortedOptions = [...optionsArray].sort((a, b) => b.length - a.length);
  for (const opt of sortedOptions) {
    const cleanedOpt = opt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    if (cleanedRaw.includes(cleanedOpt) || cleanedOpt.includes(cleanedRaw)) {
      return opt;
    }
  }
  
  return rawStr;
}
