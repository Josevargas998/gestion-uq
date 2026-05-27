import * as XLSX from 'xlsx';
const HOJA_TIPO = {
  'Artículos Index.': 'revista_a1', 'Texto': 'libro_texto', 'Ensayo': 'libro_ensayo',
  'Patente': 'patente', 'Premio': 'premio', 'Lib Investigación': 'libro_investigacion',
  'Obra Artistica': 'obra_artistica', 'Producción Técnica ': 'produccion_tecnica',
  'Software': 'software', 'Producción Audiovisual': 'video',
  'Ponencias': 'ponencia', 'Tesis': 'tesis', 'Artículos Rev No Index': 'revista_no_index',
};
function estadoToEtapa(estado) {
  const e = String(estado || '').toUpperCase().trim();
  if (e === 'APROBADO') return 'archivada';
  if (e === 'EVALUADO') return 'informe';
  if (e === 'PARES EXTERNOS') return 'pares_externos';
  if (e === 'NEGADO') return 'archivada';
  return 'clasificada';
}
/**
 * Procesa y normaliza una fila individual extraída de una pestaña de Excel.
 * Maneja el mapeo flexible de cabeceras alternativas y el parseo de fechas (ISO y formato serial de Excel).
 * 
 * @param {Object} fila - Diccionario crudo de valores llave-valor de la fila de Excel.
 * @param {string} tipo - Tipo de producto interno al que corresponde la fila (ej. 'revista_a1').
 * @param {number} idx - Índice secuencial para generación de ID único.
 * @returns {Object} Solicitud estructurada y normalizada lista para ser insertada en la base de datos.
 */
function parsearFila(fila, tipo, idx) {
  // get es un selector flexible que busca y retorna el primer valor no vacío de entre una lista de llaves de cabecera candidatas
  const get = (...keys) => { 
    for (const k of keys) { 
      const v = fila[k]; 
      if (v !== undefined && v !== null && v !== '') return v; 
    } 
    return ''; 
  };

  const docente    = String(get('Autor','Profesor solicitante','Docente') || '').trim();
  const titulo     = String(get('Nombre del Articulo','Título','Titulo','Título Ponencia','Título del trabajo del premio','Titulo Software','Nombre del Artículos Rev No Index') || '').trim();
  const cedula     = String(get('CÉDULA','CÉDULA DE CIUDADANÍA') || '').trim();
  const facultad   = String(get('FACULTAD') || '').trim();
  const programa   = String(get('DEPENDENCIA','DEPENDENCIA DIRECTA') || '').trim();
  const correo     = String(get('CORREO','CORREO ELECTRÓNICO') || '').trim();
  const estado     = String(get('Aprobado o Negado Acta CIARP','Aprobado o Negado') || 'PENDIENTE').trim();
  const fechaRaw   = get('Fecha Recibido','Fecha recibida');
  const puntaje    = get('PUNTAJE AUTOR');
  const acta       = String(get('ACTA / AÑO CIARP') || '').trim();
  const revista    = String(get('Titulo de la Revista','Titulo de la revista') || '').trim();
  const obs        = String(get('Observaciones','OBSERVACIONES') || '').trim();
  const categoria  = String(get('CATEGORÍA') || '').trim();
  const escolaridad= String(get('ESCOLARIDAD') || '').trim();
  const dedicacion = String(get('DEDICACIÓN') || '').trim();
  const contacto   = String(get('CONTACTO','CELULAR') || '').trim();

  // Parseo inteligente de fechas. Soporta:
  // 1. Fechas parseables nativamente por JavaScript.
  // 2. Números seriales de Excel (días desde 1900-01-01), aplicando la fórmula de época de Excel (descuento de 2 días por bug histórico de bisiestos de 1900).
  // 3. Fallback a los primeros 10 caracteres de la cadena o la fecha de hoy.
  let fecha = '';
  if (fechaRaw) {
    const d = new Date(fechaRaw);
    if (!isNaN(d)) {
      fecha = d.toISOString().split('T')[0];
    } else if (typeof fechaRaw === 'number') {
      const ep = new Date(1900, 0, 1);
      ep.setDate(ep.getDate() + fechaRaw - 2);
      fecha = ep.toISOString().split('T')[0];
    } else {
      fecha = String(fechaRaw).slice(0, 10);
    }
  }
  if (!fecha) fecha = new Date().toISOString().split('T')[0];

  const pts_asig = puntaje && !isNaN(Number(puntaje)) ? Number(puntaje) : null;
  const etapa    = estadoToEtapa(estado);

  return {
    id: `IMP-${tipo.slice(0, 3).toUpperCase()}-${String(idx).padStart(3, '0')}`,
    docente,
    cedula,
    programa: programa || 'Sin programa',
    facultad: facultad || 'Sin facultad',
    tipo,
    titulo: titulo || '(Sin título)',
    revista,
    fecha,
    etapa,
    estado: etapa === 'archivada' ? (estado === 'NEGADO' ? 'rechazado' : 'aprobado') : 'en_proceso',
    pts_sug: pts_asig || 0,
    pts_asig,
    notas: obs,
    correo,
    categoria,
    escolaridad,
    dedicacion,
    contacto,
    acta_ciarp: acta,
    timeline: [
      { f: fecha, a: 'Importado desde Excel de seguimiento', p: 'Sistema' },
      { f: fecha, a: `Estado en Excel: ${estado}`, p: 'Sistema' }
    ],
  };
}
/**
 * Lee un archivo de Excel subido por el usuario, detectando dinámicamente las pestañas de
 * seguimiento correspondientes a cada tipo de producto y parseando sus filas.
 * 
 * @param {File} file - Archivo cargado mediante input de tipo File en el frontend.
 * @returns {Promise<Array<Object>>} Promesa que resuelve a una lista de solicitudes normalizadas.
 */
export async function importarExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        // Lee el binario del Excel cargando las fechas nativas de celdas
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: true });
        const solicitudes = [];

        // BUCLE PRINCIPAL 1: Recorrer cada mapeo conocido de Pestana de Excel → Tipo de producto de BD
        for (const [nombreHoja, tipo] of Object.entries(HOJA_TIPO)) {
          const ws = wb.Sheets[nombreHoja];
          if (!ws) continue; // Si la pestaña no está presente en el libro, continuar con la siguiente

          // XLSX sheet_to_json convierte la pestaña en un arreglo bidimensional (filas crudas)
          const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          
          // BUCLE SECUNDARIO 1.1: Localización dinámica de la fila de cabeceras (headers)
          // Buscamos en las primeras 5 filas del archivo dónde se ubican columnas clave como 'cédula' o 'autor'.
          let headerIdx = -1;
          for (let i = 0; i < Math.min(rawRows.length, 5); i++) {
            const rowStr = rawRows[i].join('|').toLowerCase();
            if (rowStr.includes('cédula') || rowStr.includes('autor') || rowStr.includes('cédula de ciudadanía')) {
              headerIdx = i;
              break;
            }
          }
          if (headerIdx === -1) continue; // Si no se encuentra fila de cabecera válida, se omite esta pestaña

          const headers = rawRows[headerIdx];
          let solIdx = 1;

          // BUCLE SECUNDARIO 1.2: Procesar filas de datos a partir de la fila de cabecera hallada
          for (let i = headerIdx + 1; i < rawRows.length; i++) {
            const row = rawRows[i];
            const obj = {};

            // Mapea el valor de cada celda a su cabecera correspondiente
            headers.forEach((h, j) => { 
              if (h) obj[h] = row[j] !== undefined ? row[j] : ''; 
            });

            // Filtro de filas vacías o decorativas. Se busca la columna del consecutivo (Item / No.)
            // Si el valor del consecutivo está vacío o no es un número válido, se asume que es una fila de firma, total o comentario.
            const item = obj['Item'] || obj['No.'] || obj['}'] || '';
            if (!item || isNaN(Number(item))) continue;

            try { 
              const s = parsearFila(obj, tipo, solIdx++); 
              // Asegura que al menos exista autor o título antes de agregar la solicitud
              if (s.docente || s.titulo) {
                solicitudes.push(s);
              } 
            } catch (err) { 
              console.warn(`[Excel Import] Error parseando fila en hoja "${nombreHoja}":`, err); 
            }
          }
        }
        resolve(solicitudes);
      } catch (err) { 
        reject(err); 
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
/**
 * Exporta la lista completa de solicitudes a un archivo de Excel multibook (múltiples pestañas).
 * Genera una primera pestaña con el Resumen General y luego una pestaña específica por cada tipo de producto.
 * 
 * @param {Array<Object>} solicitudes - Lista de solicitudes a exportar.
 */
export function exportarExcel(solicitudes) {
  const wb = XLSX.utils.book_new();
  const hoy = new Date().toISOString().slice(0, 10);

  // Mapea la etapa interna de la base de datos al estado descriptivo visible en el Excel
  function estadoSheet(s) {
    if (s.etapa === 'archivada') return s.estado === 'rechazado' ? 'NEGADO' : 'APROBADO';
    if (['informe', 'ciarp', 'resolucion', 'acta', 'juridica', 'rectoria'].includes(s.etapa)) return 'EVALUADO';
    if (s.etapa === 'pares_externos') return 'PARES EXTERNOS';
    return 'PENDIENTE';
  }

  // ── 1. PESTAÑA DE RESUMEN GENERAL (Primera pestaña) ─────────────────────────────
  // Agrupa todas las solicitudes registradas independientemente de su tipo de producto para una vista ejecutiva rápida.
  const resHeaders = [
    'N° Solicitud', 'Hoja', 'Tipo', 'Estado', 'Título', 'Docente', 'Cédula',
    'Facultad', 'Programa', 'Correo', 'Fecha Recibido', 'Etapa Actual',
    'Puntaje Sugerido', 'Puntaje Asignado', 'Acta CIARP', 'Enviado'
  ];
  
  const resData = solicitudes.map(s => [
    s.id,
    s.hoja_google || '',
    s.tipo,
    estadoSheet(s),
    s.titulo,
    s.docente,
    s.cedula || '',
    s.facultad,
    s.programa,
    s.correo || '',
    s.fecha || '',
    s.etapa,
    s.pts_sug || 0,
    s.pts_asig != null ? s.pts_asig : '',
    s.acta_ciarp || '',
    s.etapa === 'archivada' ? 'SI' : ''
  ]);
  
  const wsRes = XLSX.utils.aoa_to_sheet([resHeaders, ...resData]);
  // Anchos sugeridos por columna para mejorar la legibilidad visual
  wsRes['!cols'] = [14, 20, 18, 14, 55, 30, 13, 35, 30, 30, 14, 18, 8, 8, 16, 8].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, wsRes, 'Resumen General');

  // ── 2. Columnas comunes a todas las pestañas específicas ──────────────────────────
  const BASE = [
    { h: 'AÑO',                        v: s => s.fecha?.slice(0, 4) || '' },
    { h: 'No.',                         v: (s, i) => i + 1 },
    { h: 'Aprobado o Negado Acta CIARP',v: s => estadoSheet(s) },
    { h: 'Autor',                       v: s => s.docente },
    { h: 'Co-autor',                    v: s => s.coautor || '' },
    { h: 'CÉDULA',                      v: s => s.cedula || '' },
    { h: 'FACULTAD',                    v: s => s.facultad },
    { h: 'DEPENDENCIA',                 v: s => s.programa },
    { h: 'CORREO',                      v: s => s.correo || '' },
    { h: 'Fecha Recibido',              v: s => s.fecha || '' },
    { h: 'Observaciones',               v: s => s.notas || '' },
    { h: 'PUNTAJE AUTOR',               v: s => s.pts_asig != null ? s.pts_asig : (s.pts_sug || '') },
    { h: 'ACTA / AÑO CIARP',           v: s => s.acta_ciarp || '' },
    { h: 'ENVIADO',                     v: s => s.etapa === 'archivada' ? 'SI' : '' },
  ];

  const T = label => ({ h: label, v: s => s.titulo });
  const REV = { h: 'Titulo de la Revista', v: s => s.revista || '' };

  // Mapeo dinámico de pares externos (hasta 3 evaluadores registrados en el campo JSONB)
  const EVAL = [
    { h: 'Par 1 (Nombre)',  v: s => s.pares_ext?.[0]?.nombre || '' },
    { h: 'Par 1 (Nota)',    v: s => s.pares_ext?.[0]?.nota_evaluativa || '' },
    { h: 'Par 1 (Puntaje)', v: s => s.pares_ext?.[0]?.puntaje_par || '' },
    { h: 'Par 2 (Nombre)',  v: s => s.pares_ext?.[1]?.nombre || '' },
    { h: 'Par 2 (Nota)',    v: s => s.pares_ext?.[1]?.nota_evaluativa || '' },
    { h: 'Par 2 (Puntaje)', v: s => s.pares_ext?.[1]?.puntaje_par || '' },
    { h: 'Par 3 (Nombre)',  v: s => s.pares_ext?.[2]?.nombre || '' },
    { h: 'Par 3 (Nota)',    v: s => s.pares_ext?.[2]?.nota_evaluativa || '' },
    { h: 'Par 3 (Puntaje)', v: s => s.pares_ext?.[2]?.puntaje_par || '' },
  ];

  // ── 3. DEFINICIÓN DE PESTAÑAS ──────────────────────────────────────
  const PESTANAS = [
    { nombre: 'Artículos Index.',      tipos: ['revista_a1'],          extra: [T('Nombre del Articulo'), REV] },
    { nombre: 'Artículos Rev No Index',tipos: ['revista_no_index'],    extra: [T('Nombre del Articulo'), REV] },
    { nombre: 'Texto',                 tipos: ['libro_texto'],         extra: [T('Título del libro'), ...EVAL] },
    { nombre: 'Ensayo',                tipos: ['libro_ensayo'],        extra: [T('Título del libro'), ...EVAL] },
    { nombre: 'Lib Investigación',     tipos: ['libro_investigacion'], extra: [T('Título del libro'), ...EVAL] },
    { nombre: 'Obra Artistica',        tipos: ['obra_artistica'],      extra: [T('Título obra'), ...EVAL] },
    { nombre: 'Producción Técnica',    tipos: ['produccion_tecnica'],  extra: [T('Título del Producto'), ...EVAL] },
    { nombre: 'Software',              tipos: ['software'],            extra: [T('Titulo Software'), ...EVAL] },
    { nombre: 'Producción Audiovisual',tipos: ['video'],               extra: [T('Título'), ...EVAL] },
    { nombre: 'Ponencias',             tipos: ['ponencia'],            extra: [T('Título Ponencia'), REV] },
    { nombre: 'Tesis',                 tipos: ['tesis'],               extra: [T('Título')] },
    { nombre: 'Patente',               tipos: ['patente'],             extra: [T('Título')] },
    { nombre: 'Premio',                tipos: ['premio'],              extra: [T('Título del trabajo del premio')] },
  ];

  // ── 4. BUCLE DE GENERACIÓN DE PESTAÑAS ESPECÍFICAS ───────────────────────────────────────────
  for (const p of PESTANAS) {
    // Filtramos las solicitudes que pertenecen a esta pestaña
    const filas = solicitudes.filter(s => p.tipos.includes(s.tipo));
    if (filas.length === 0) continue; // Omitir pestaña si no existen solicitudes registradas para este tipo de producto

    // Las columnas de la pestaña combinan las columnas específicas del producto (...p.extra) con las comunes (...BASE)
    const cols    = [...p.extra, ...BASE];
    const headers = cols.map(c => c.h);
    const rows    = filas.map((s, i) => cols.map(c => c.v(s, i)));

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    // Autoajuste dinámico de anchos basado en la longitud del texto de la cabecera
    ws['!cols'] = headers.map(h => ({ wch: Math.max(String(h).length + 2, 14) }));
    XLSX.utils.book_append_sheet(wb, ws, p.nombre.slice(0, 31));
  }

  XLSX.writeFile(wb, `Seguimiento_Productividad_${hoy}.xlsx`);
}

/**
 * EXPORTAR INFORME CIARP: 
 * Formatea los datos simulando la estructura formal requerida para las 
 * reuniones del CIARP, dejando listo el archivo con las pestañas pertinentes.
 */
import { fetchDocentes } from './api';

/**
 * EXPORTAR INFORME CIARP (Formato Oficial Universidad del Quindío):
 * Genera el archivo Excel completo con la pestaña de Topes/Historial
 * y todas las pestañas específicas por cada producto con sus columnas exactas.
 */
export async function exportarCIARP(solicitudes, nombreActa) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const hoy = new Date().toISOString().split('T')[0];

  // Identificar el año y acta
  const matchActa = nombreActa.match(/\d+/g);
  const numActa = matchActa ? matchActa[0].padStart(2, '0') : '01';
  const anoActa = matchActa && matchActa.length > 1 ? matchActa[1] : new Date().getFullYear();
  const semestre = new Date().getMonth() < 6 ? 'I' : 'II';
  const actaFecha = nombreActa; // o construirla si es necesario

  // 1. OBTENER DOCENTES PARA EL HISTORIAL / ESCALAFÓN
  let docentes = [];
  try {
    const resDoc = await fetchDocentes();
    if (resDoc && resDoc.data) docentes = resDoc.data;
  } catch(e) {
    console.error("No se pudieron cargar los docentes para el historial", e);
  }

  // --- HOJA 1: TOPES 2026 (ESCALAFÓN) ---
  if (docentes.length > 0) {
    const añosHistorico = [
      'PTS_DIC2009','PTS_DIC2010','PTS_DIC2011','PTS_2012','PTS_2013','PTS_2014',
      'PTS_2015','PTS_2016','PTS_DIC2017','PTS_DIC2018','PTS_DIC2019','PTS_DIC2020',
      'PTS_DIC2021','PTS_DIC2022','PTS_ENE_DIC2023','PTS_ENE_DIC2024','PTS_ENE_DIC2025'
    ];
    let headersEscalafon = ['NO', 'APELLIDOS_NOMBRE', 'CEDULA', 'DEPENDENCIA', 'FACULTAD', 'ESCOLARIDAD', 'DEDICACION', 'FECHA_INGRESO', 'CATEGORIA', ...añosHistorico, 'TOPE', 'DIFERENCIA_TOPE_PUNTAJE', `CIARP_${numActa}_${anoActa}`, 'PUNTOS_A_FAVOR', 'TOPE_LIBROS_MAX35', 'TOPE_SOFTWARE_MAX35', 'COMISION_ACAD_ADMIN', 'OBSERVACION'];

    const ptsActaDocente = {};
    solicitudes.forEach(s => {
      if (s.estado === 'aprobado' && s.pts_asig) {
        ptsActaDocente[s.cedula] = (ptsActaDocente[s.cedula] || 0) + Number(s.pts_asig);
      }
    });

    const rowsEscalafon = docentes.map((doc, i) => {
      const hist = doc.historial || {};
      const ptsNuevos = ptsActaDocente[doc.cedula] || '';
      return [
        i + 1, (doc.nombre||'').toUpperCase(), doc.cedula, doc.programa||'', doc.facultad||'', 
        doc.escolaridad||'', doc.dedicacion||'', doc.fecha_ingreso ? doc.fecha_ingreso.split('T')[0] : '', doc.categoria||'',
        ...añosHistorico.map(a => hist[a] != null ? hist[a] : ''),
        doc.tope||'', doc.tope ? Math.max(0, doc.tope - (doc.pts_acumulados||0)) : '',
        ptsNuevos, doc.pts_acumulados||'', hist['TOPE_LIBROS_MAX35']||'', hist['TOPE_SOFTWARE_MAX35']||'', hist['COMISION_ACAD_ADMIN']||'', doc.observacion || hist['OBSERVACION']||''
      ];
    });

    const wsTopes = XLSX.utils.aoa_to_sheet([headersEscalafon, ...rowsEscalafon]);
    XLSX.utils.book_append_sheet(wb, wsTopes, 'Topes_2026');
  }

  // --- HOJAS DE PRODUCTOS INDIVIDUALES ---
  // Helper para generar filas
  const crearHoja = (nombreHoja, tipos, columnasMap) => {
    const filas = solicitudes.filter(s => tipos.includes(s.tipo));
    if (filas.length === 0) return;

    const headers = columnasMap.map(c => c.h);
    const rows = filas.map((s, idx) => columnasMap.map(c => {
      try {
        return typeof c.v === 'function' ? c.v(s, idx) : c.v;
      } catch(e) {
        return '';
      }
    }));

    const titulo = Array(headers.length).fill('');
    titulo[0] = `INFORME CIARP - ${nombreActa.toUpperCase()} - ${nombreHoja.toUpperCase()}`;

    const ws = XLSX.utils.aoa_to_sheet([titulo, [], headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, nombreHoja.slice(0, 31));
  };

  // 1. Pub_Rev_Index
  crearHoja('Pub_Rev_Index', ['revista_a1', 'revista_a2', 'revista_no_indexada'], [
    {h:'AÑO', v: anoActa}, {h:'SEMESTRE', v: semestre}, {h:'NO', v: (s,i)=>i+1},
    {h:'TÍTULO_ARTÍCULO', v: s=>s.titulo}, {h:'MODALIDAD', v: s=>s.revista}, {h:'TIPO', v: s=>s.tipo},
    {h:'PAIS', v: s=>s.pais || ''}, {h:'ISSN_REVISTA', v: s=>s.issn || ''}, {h:'NOMBRE_REVISTA', v: s=>s.revista},
    {h:'PUBLINDEX', v: ''}, {h:'CATEGORÍA_REVISTA', v: s=>s.categoria_revista || s.tipo},
    {h:'NUMERO_DE_AUTORES', v: s=>s.coautor ? s.coautor.split(',').length + 1 : 1},
    {h:'EDITORIAL', v: ''}, {h:'FECHA', v: s=>s.fecha}, {h:'COL_14', v: ''}, {h:'COL_15', v: ''},
    {h:'DOCUMENTO_DE_IDENTIFICAC', v: s=>s.cedula}, {h:'NOMBRES_DE_AUTORES_PERTENECIENTES_A_UNIVERSIDADES', v: s=>s.docente},
    {h:'ESCOLARIDAD', v: s=>s.escolaridad||''}, {h:'CATEGORÍA_DEL_DOCENTE', v: s=>s.categoria||''},
    {h:'TIEMPO_DE_DEDICACIÓN', v: s=>s.dedicacion||''}, {h:'PROGRAMA', v: s=>s.programa}, {h:'FACULTAD', v: s=>s.facultad},
    {h:'PUNTAJE_AUTOR', v: s=>s.pts_asig}, {h:'UNIVERSIDAD_DE_LOS_AUTORES_PARTICIPANTES', v: 'Universidad del Quindío'},
    {h:'ACTA_Y_FECHA_CIARP', v: actaFecha}, {h:'OBSERVACIÓN', v: s=>s.notas||''}
  ]);

  // 2. Libro_Ensayo
  crearHoja('Libro_Ensayo', ['libro_ensayo'], [
    {h:'AÑO', v: anoActa}, {h:'SEMESTRE', v: semestre}, {h:'NO', v: (s,i)=>i+1},
    {h:'NOMBRE_DEL_LIBRO_ENSAYO', v: s=>s.titulo}, {h:'ISBN', v: s=>s.isbn||''}, {h:'FECHA_DE_PUBLICACIÓN', v: s=>s.fecha},
    {h:'EDITORIAL', v: ''}, {h:'DOCUMENTO_DE_IDENTIFICACIÓN', v: s=>s.cedula}, {h:'AUTORES', v: s=>s.docente},
    {h:'ESCOLARIDAD', v: s=>s.escolaridad||''}, {h:'CATEGORÍA', v: s=>s.categoria||''}, {h:'TIEMPO_DE_DEDICACIÓN', v: s=>s.dedicacion||''},
    {h:'PROGRAMA_ACADÉMICO', v: s=>s.programa}, {h:'FACULTAD', v: s=>s.facultad}, {h:'UNIVERSIDAD_PARTICIPANT', v: 'Universidad del Quindío'},
    {h:'PAR_EVALUADOR_MINCIENCIAS_1', v: s=>s.pares_ext?.[0]?.nota_evaluativa||''},
    {h:'PAR_EVALUADOR_MINCIENCIAS_2', v: s=>s.pares_ext?.[1]?.nota_evaluativa||''},
    {h:'NUMERO_DE_AUTORES', v: s=>s.coautor ? s.coautor.split(',').length + 1 : 1},
    {h:'PUNTOS_ASIGNADOS', v: s=>s.pts_asig}, {h:'ACTA_Y_FECHA_CIARP', v: actaFecha}
  ]);

  // 3. Libro_Res_Investigacion
  crearHoja('Libro_Res_Investigacion', ['libro_investigacion'], [
    {h:'AÑO', v: anoActa}, {h:'SEMESTRE', v: semestre}, {h:'NO', v: (s,i)=>i+1},
    {h:'NOMBRE_DEL_LIBRO', v: s=>s.titulo}, {h:'ISBN', v: s=>s.isbn||''}, {h:'FECHA_DE_PUBLICACIÓN', v: s=>s.fecha},
    {h:'EDITORIAL', v: ''}, {h:'DOCUMENTO_DE_IDENTIFICACIÓN', v: s=>s.cedula}, {h:'AUTORES', v: s=>s.docente},
    {h:'ESCOLARIDAD', v: s=>s.escolaridad||''}, {h:'CATEGORÍA', v: s=>s.categoria||''}, {h:'TIEMPO_DE_DEDICACIÓN', v: s=>s.dedicacion||''},
    {h:'PROGRAMA_ACADÉMICO', v: s=>s.programa}, {h:'FACULTAD', v: s=>s.facultad}, {h:'UNIVERSIDAD_PARTICIPANT', v: 'Universidad del Quindío'},
    {h:'PAR_EVALUADOR_MINCIENCIAS_1', v: s=>s.pares_ext?.[0]?.nota_evaluativa||''},
    {h:'PAR_EVALUADOR_MINCIENCIAS_2', v: s=>s.pares_ext?.[1]?.nota_evaluativa||''},
    {h:'NUMERO_DE_AUTORES', v: s=>s.coautor ? s.coautor.split(',').length + 1 : 1},
    {h:'PUNTOS_ASIGNADOS', v: s=>s.pts_asig}, {h:'ACTA_Y_FECHA_CIARP', v: actaFecha}, {h:'OBSERVACIONES', v: s=>s.notas||''}
  ]);

  // 4. Libro_Texto
  crearHoja('Libro_Texto', ['libro_texto'], [
    {h:'AÑO', v: anoActa}, {h:'SEMESTRE', v: semestre}, {h:'NO', v: (s,i)=>i+1},
    {h:'NOMBRE_DEL_LIBRO_TEXTO', v: s=>s.titulo}, {h:'ISBN', v: s=>s.isbn||''}, {h:'FECHA_DE_PUBLICACIÓN', v: s=>s.fecha},
    {h:'EDITORIAL', v: ''}, {h:'ESPACIO_ACADÉMICO', v: ''}, {h:'DOCUMENTO_DE_IDENTIFICACIÓN', v: s=>s.cedula}, {h:'AUTORES', v: s=>s.docente},
    {h:'ESCOLARIDAD', v: s=>s.escolaridad||''}, {h:'CATEGORÍA', v: s=>s.categoria||''}, {h:'TIEMPO_DE_DEDICACIÓN', v: s=>s.dedicacion||''},
    {h:'PROGRAMA_ACADÉMICO', v: s=>s.programa}, {h:'FACULTAD', v: s=>s.facultad}, {h:'UNIVERSIDAD_PARTICIPANT', v: 'Universidad del Quindío'},
    {h:'PAR_EVALUADOR_MINCIENCIAS_1', v: s=>s.pares_ext?.[0]?.nota_evaluativa||''},
    {h:'PAR_EVALUADOR_MINCIENCIAS_2', v: s=>s.pares_ext?.[1]?.nota_evaluativa||''},
    {h:'NUMERO_DE_AUTORES', v: s=>s.coautor ? s.coautor.split(',').length + 1 : 1},
    {h:'PUNTOS_ASIGNADOS', v: s=>s.pts_asig}, {h:'ACTA_Y_FECHA_CIARP', v: actaFecha}
  ]);

  // 5. Premios
  crearHoja('Premios', ['premio'], [
    {h:'AÑO', v: anoActa}, {h:'SEMESTRE', v: semestre}, {h:'NO', v: (s,i)=>i+1},
    {h:'DOCUMENTO_DE_IDENTIFICACIÓN', v: s=>s.cedula}, {h:'NOMBRE_DEL_DOCENTE', v: s=>s.docente},
    {h:'ESCOLARIDAD', v: s=>s.escolaridad||''}, {h:'CATEGORÍA', v: s=>s.categoria||''}, {h:'TIEMPO_DE_DEDICACIÓN', v: s=>s.dedicacion||''},
    {h:'PROGRAMA_ACADÉMICO', v: s=>s.programa}, {h:'FACULTAD', v: s=>s.facultad}, {h:'TÍTULO_DEL_TRABAJO', v: s=>s.titulo},
    {h:'PREMIO_O_DISTINCIÓN', v: ''}, {h:'ENTIDAD_QUE_OTORGA_EL_PREMIO', v: ''}, {h:'FECHA_OTORGAN_PREMIO', v: s=>s.fecha},
    {h:'PUNTOS_ASIGNADOS', v: s=>s.pts_asig}, {h:'ACTA_Y_FECHA_CIARP', v: actaFecha}, {h:'OBSERVACIONES', v: s=>s.notas||''}
  ]);

  // 6. Patentes
  crearHoja('Patentes', ['patente'], [
    {h:'AÑO', v: anoActa}, {h:'SEMESTRE', v: semestre}, {h:'NO', v: (s,i)=>i+1},
    {h:'IDENTIFICACIÓN_DEL_AUTOR', v: s=>s.cedula}, {h:'NOMBRES_DE_AUTORES_PERTENECIENTES_A_UNIVERSIDADES', v: s=>s.docente},
    {h:'PROGRAMA_ACADÉMICO', v: s=>s.programa}, {h:'FACULTAD', v: s=>s.facultad}, {h:'TIPO_DE_PRODUCTO', v: 'Patente'},
    {h:'TIPO_DE_PATENTE', v: ''}, {h:'NOMBRE_DEL_PRODUCTO', v: s=>s.titulo}, {h:'NÚMERO_DE_REGISTRO_DE_LA_PATENTE', v: ''},
    {h:'FECHA_DE_APROBACIÓN_DE_LA_PATENTE', v: s=>s.fecha}, {h:'VIGENCIA_EN_AÑOS_DEL_PRODUCTO', v: ''},
    {h:'BANCO_DE_PATENTES_O_ENTIDAD_QUE_EXPIDE_EL_REGISTRO', v: ''},
    {h:'NUMERO_DE_AUTORES', v: s=>s.coautor ? s.coautor.split(',').length + 1 : 1},
    {h:'PUNTOS_ASIGNADOS', v: s=>s.pts_asig}, {h:'ACTA_Y_FECHA_CIARP', v: actaFecha}
  ]);

  // 7. Obras_Artisticas
  crearHoja('Obras_Artisticas', ['obra_artistica'], [
    {h:'AÑO', v: anoActa}, {h:'SEMESTRE', v: semestre}, {h:'NO', v: (s,i)=>i+1},
    {h:'NOMBRE_DE_LA_OBRA_ARTÍSTICA', v: s=>s.titulo}, {h:'TIPO', v: s=>s.tipo}, {h:'RECONOCIMIENTO_SOLICITADO', v: ''},
    {h:'IMPÁCTO', v: ''}, {h:'FECHA_DE_CREACIÓN_DE_LA_OBRA_FECHA_DE_EXPOSICIÓN', v: s=>s.fecha}, {h:'TÉCNICA_UTILIZADA', v: ''},
    {h:'DOCUMENTO_DE_IDENTIFICACIÓN', v: s=>s.cedula}, {h:'AUTORES', v: s=>s.docente},
    {h:'ESCOLARIDAD', v: s=>s.escolaridad||''}, {h:'CATEGORÍA', v: s=>s.categoria||''}, {h:'TIEMPO_DE_DEDICACIÓN', v: s=>s.dedicacion||''},
    {h:'PROGRAMA_ACADÉMICO', v: s=>s.programa}, {h:'FACULTAD', v: s=>s.facultad}, {h:'UNIVERSIDAD_PARTICIPANT', v: 'Universidad del Quindío'},
    {h:'PUNTOS_EVALUACIÓN_PARES_MINCIENCIAS', v: s=>s.pts_sug}, {h:'PUNTOS_ASIGNADOS', v: s=>s.pts_asig},
    {h:'ACTA_Y_FECHA_CIARP', v: actaFecha}, {h:'OBSERVACIONES', v: s=>s.notas||''}
  ]);

  // 8. Prod_Tecnica
  crearHoja('Prod_Tecnica', ['produccion_tecnica'], [
    {h:'AÑO', v: anoActa}, {h:'SEMESTRE', v: semestre}, {h:'NO', v: (s,i)=>i+1},
    {h:'NOMBRE_DE_LA_PROUCCIÓN_TÉCNICA', v: s=>s.titulo}, {h:'TIPO_DE_PRODUCCIÓN', v: s=>s.tipo}, {h:'AÑO_DE_PUBLICACIÓN', v: s=>s.fecha},
    {h:'DOCUMENTO_DE_IDENTIDAD', v: s=>s.cedula}, {h:'AUTORES', v: s=>s.docente},
    {h:'ESCOLARIDAD', v: s=>s.escolaridad||''}, {h:'CATEGORÍA', v: s=>s.categoria||''}, {h:'TIEMPO_DE_DEDICACIÓN', v: s=>s.dedicacion||''},
    {h:'PROGRAMA_ACADÉMICO', v: s=>s.programa}, {h:'FACULTAD', v: s=>s.facultad}, {h:'UNIVERSIDADES_PARTICIPANTES', v: 'Universidad del Quindío'},
    {h:'PUNTOS_EVALUACIÓN_PARES_MINCIENCIAS', v: s=>s.pts_sug}, {h:'PUNTAJE_ASIGNADO_AUTOR', v: s=>s.pts_asig},
    {h:'ACTA_Y_FECHA', v: actaFecha}, {h:'OBSERVACIÓN', v: s=>s.notas||''}
  ]);

  // 9. Prod_Software
  crearHoja('Prod_Software', ['software'], [
    {h:'AÑO', v: anoActa}, {h:'SEMESTRE', v: semestre}, {h:'NO', v: (s,i)=>i+1},
    {h:'IDENTIFICACIÓN_LIBRO_TOMO_PARTIDA', v: ''}, {h:'NOMBRE_DEL_SOFTWARE', v: s=>s.titulo}, {h:'AÑO_DE_PUBLICACIÓN', v: s=>s.fecha},
    {h:'DOCUMENTO_DE_IDENTIDAD_AUTOR_DOCENTE', v: s=>s.cedula}, {h:'AUTORES', v: s=>s.docente},
    {h:'ESCOLARIDAD', v: s=>s.escolaridad||''}, {h:'CATEGORÍA', v: s=>s.categoria||''}, {h:'TIEMPO_DE_DEDICACIÓN', v: s=>s.dedicacion||''},
    {h:'PROGRAMA_ACADÉMICO', v: s=>s.programa}, {h:'FACULTAD', v: s=>s.facultad}, {h:'UNIVERSIDADES_PARTICIPANTES', v: 'Universidad del Quindío'},
    {h:'PUNTAJE_EVALUADORES', v: s=>s.pts_sug}, {h:'PUNTAJE_ASIGNADO_AUTOR_ESCALA_0_A_15', v: s=>s.pts_asig},
    {h:'ACTA_Y_FECHA', v: actaFecha}, {h:'OBSERVACIÓN', v: s=>s.notas||''}
  ]);

  // 10. DAA (Desempeño Académico Administrativo)
  crearHoja('DAA', ['daa'], [
    {h:'AÑO', v: anoActa}, {h:'SEMESTRE', v: semestre}, {h:'NO', v: (s,i)=>i+1},
    {h:'TÍTULO', v: s=>s.titulo}, {h:'DOCUMENTO_DE_IDENTIDAD', v: s=>s.cedula}, {h:'AUTORES', v: s=>s.docente},
    {h:'ESCOLARIDAD', v: s=>s.escolaridad||''}, {h:'CATEGORÍA', v: s=>s.categoria||''}, {h:'TIEMPO_DE_DEDICACIÓN', v: s=>s.dedicacion||''},
    {h:'PROGRAMA_ACADÉMICO', v: s=>s.programa}, {h:'FACULTAD', v: s=>s.facultad},
    {h:'PUNTOS_ASIGNADOS', v: s=>s.pts_asig}, {h:'ACTA_Y_FECHA', v: actaFecha}, {h:'OBSERVACIÓN', v: s=>s.notas||''}
  ]);

  // Guardar el archivo Excel
  const safeName = nombreActa.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
  XLSX.writeFile(wb, `Informe_CIARP_${safeName}_${hoy}.xlsx`);
}
