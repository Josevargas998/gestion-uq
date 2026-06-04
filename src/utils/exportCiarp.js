/**
 * exportCiarp.js
 * Genera el informe CIARP con exactamente la misma estructura
 * del archivo oficial "CIARP 1 2026.xlsx" de la Universidad del Quindío.
 * 20 hojas: Topes, Resumen, 12 tipos de producto, 6 hojas de desempeño.
 */
import * as XLSX from 'xlsx';

/**
 * @param {Array}  solicitudes  Lista de solicitudes filtradas por acta
 * @param {Array}  docentes     Lista completa de docentes (para hoja de Topes)
 * @param {string} nombreActa   Ej: "CIARP 1 - 18/03/2026"
 */
export async function exportarCIARP(solicitudes, docentes = [], nombreActa = '') {
  const nums    = (nombreActa.match(/\d+/g) || []);
  const numActa = String(nums[0] || '1').padStart(2, '0');
  const anoActa = nums.length > 1 ? nums[nums.length - 1] : new Date().getFullYear();
  const semestre = new Date().getMonth() < 6 ? 'I' : 'II';
  const wb  = XLSX.utils.book_new();
  const hoy = new Date().toISOString().slice(0, 10);

  // Helper: valor o fallback
  const v = (val, fallback = '') =>
    (val !== null && val !== undefined && val !== '') ? val : fallback;

  // Agregar hoja con autoajuste de columnas
  const addSheet = (name, rows) => {
    if (!rows || rows.length <= 1) return; // no agregar si solo tiene cabecera
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const maxCols = Math.max(...rows.map(r => r.length));
    ws['!cols'] = Array.from({ length: maxCols }, (_, i) => {
      const maxLen = Math.max(...rows.map(r => String(r[i] ?? '').length));
      return { wch: Math.min(Math.max(maxLen + 2, 10), 80) };
    });
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  };

  // ── PREPROCESAMIENTO: Aplanar datos_prod y Expandir coautores_uq ──
  let procSolicitudes = [];
  solicitudes.forEach(s => {
    let dp = {};
    if (typeof s.datos_prod === 'string') {
      try { dp = JSON.parse(s.datos_prod); } catch(_e) { /* ignore malformed JSON */ }
    } else if (s.datos_prod) {
      dp = s.datos_prod;
    }

    let md = {};
    if (typeof s.metadatos === 'string') {
      try { md = JSON.parse(s.metadatos); } catch(_e) { /* ignore malformed JSON */ }
    } else if (s.metadatos && typeof s.metadatos === 'object') {
      md = s.metadatos;
    }

    let nt = {};
    if (typeof s.notas === 'string') {
      try { nt = JSON.parse(s.notas); } catch(_e) { /* ignore malformed JSON */ }
    } else if (s.notas && typeof s.notas === 'object') {
      nt = s.notas;
    }
    
    // El autor principal
    procSolicitudes.push({ ...s, ...dp, ...md, ...nt });
    
    // Co-autores UQ (duplicar fila para que CIARP asigne los puntos)
    const coautores = (dp.coautores_uq && Array.isArray(dp.coautores_uq)) ? dp.coautores_uq : ((md.coautores_uq && Array.isArray(md.coautores_uq)) ? md.coautores_uq : null);
    if (coautores) {
      coautores.forEach(co => {
        if (co.nombre) {
          procSolicitudes.push({
            ...s, ...nt, // Mantiene la info base de la solicitud, pero sin los metadatos (...dp, ...md)
            cedula: co.cedula || '',
            docente: co.nombre,
            pts_asig: 0,
            pts_sug: 0,
            es_coautor: true // flag
          });
        }
      });
    }
  });

  // Solicitudes aprobadas (solo las de esta acta)
  const aprobadas = procSolicitudes.filter(s => s.estado === 'aprobado');
  const ptsPorCedula = {};
  aprobadas.forEach(s => {
    const pts = Number(s.pts_asig) || 0;
    if (pts > 0) ptsPorCedula[s.cedula] = (ptsPorCedula[s.cedula] || 0) + pts;
  });

  // ⚠️ CLAVE: solo incluir registros QUE PERTENECEN A ESTA ACTA.
  const byTipo = (...tipos) => procSolicitudes.filter(s => tipos.includes(s.tipo));

  // ─────────────────────────────────────────────────────────────────────────────
  // HOJA 1: TOPES (hoja principal de escalafón docente)
  // Columnas exactas del archivo oficial CIARP 1 2026.xlsx
  // ─────────────────────────────────────────────────────────────────────────────
  {
    const hist_keys = [
      'PTS_DIC2009','PTS_DIC2010','PTS_DIC2011','PTS_2012','PTS_2013',
      'PTS_2014','PTS_2015','PTS_2016','PTS_DIC2017','PTS_DIC2018',
      'PTS_DIC2019','PTS_DIC2020','PTS_DIC2021','PTS_DIC2022',
      'PTS_ENE_DIC2023','PTS_ENE_DIC2024','PTS_ENE_DIC2025',
    ];
    const col = [
      'NO','APELLIDOS_NOMBRE','CEDULA','DEPENDENCIA','FACULTAD','ESCOLARIDAD',
      'DEDICACION','FECHA_INGRESO','CATEGORIA',
      ...hist_keys,
      'TOPE','DIFERENCIA_TOPE_PUNTAJE',
      `CIARP_${numActa}_${anoActa}`,
      'PUNTOS_A_FAVOR','TOPE_LIBROS_MAX35','TOPE_SOFTWARE_MAX35',
      'COMISION_ACAD_ADMIN','OBSERVACION',
    ];
    const rows = [col];
    (docentes || []).forEach((d, i) => {
      const hist = d.historial || {};
      rows.push([
        i + 1,
        v(d.nombre, '').toUpperCase(),
        v(d.cedula),
        v(d.programa),
        v(d.facultad),
        v(d.escolaridad),
        v(d.dedicacion),
        d.fecha_ingreso ? String(d.fecha_ingreso).split('T')[0] : '',
        v(d.categoria),
        ...hist_keys.map(k => hist[k] != null ? hist[k] : ''),
        v(d.tope),
        d.tope ? Math.max(0, Number(d.tope) - Number(d.pts_acumulados || 0)) : '',
        ptsPorCedula[d.cedula] || '',
        v(d.pts_acumulados),
        v(hist['TOPE_LIBROS_MAX35']),
        v(hist['TOPE_SOFTWARE_MAX35']),
        v(hist['COMISION_ACAD_ADMIN']),
        v(d.observacion, v(hist['OBSERVACION'])),
      ]);
    });
    // La hoja de topes siempre se agrega aunque docentes esté vacío
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = col.map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, ws, ('Topes_' + anoActa).slice(0, 31));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HOJA 2: RESUMEN DE PUNTOS APROBADOS
  // ─────────────────────────────────────────────────────────────────────────────
  addSheet('Resumen_Puntos', [
    ['NO','APELLIDOS_NOMBRE','CEDULA','DEPENDENCIA','FACULTAD','ESCOLARIDAD',
     'DEDICACION','CATEGORIA','TIPO_PRODUCTO','TITULO_PRODUCTO',
     'PUNTOS_ASIGNADOS','ACTA_Y_FECHA_CIARP','OBSERVACIONES'],
    ...aprobadas.map((s, i) => [
      i + 1, v(s.docente, '').toUpperCase(), v(s.cedula),
      v(s.programa), v(s.facultad), v(s.escolaridad), v(s.dedicacion),
      v(s.categoria), v(s.tipo), v(s.titulo),
      v(s.pts_asig, 0), v(s.acta_ciarp), v(s.notas),
    ]),
  ]);

  // ─────────────────────────────────────────────────────────────────────────────
  // HOJA 3: Revistas (Publicaciones en revistas indexadas)
  // ─────────────────────────────────────────────────────────────────────────────
  addSheet('Revistas', [
    ['AÑO','SEMESTRE','NO','TIPO_REVISTA','NOMBRE_REVISTA','PAÍS',
     'AÑO_DE_PUBLICACIÓN','VOL','NUM','INDEXACION','CATEGORÍA_REVISTA',
     'DOCUMENTO_DE_IDENTIFICAC','NOMBRES_DE_AUTORES_PERTENECIENTES_A_UNIVERSIDADES',
     'ESCOLARIDAD','CATEGORÍA_DEL_DOCENTE','TIEMPO_DE_DEDICACIÓN',
     'PROGRAMA_ACADÉMICO','FACULTAD','TÍTULO_ARTÍCULO',
     'NUMERO_DE_AUTORES','PUNTOS_AUTOR','ACTA_Y_FECHA_CIARP','OBSERVACIÓN'],
    ...byTipo('articulo','revista_a1','revista_no_index').map((s, i) => [
      v(s.anio, anoActa), v(s.semestre, semestre), i + 1,
      v(s.tipo_revista), v(s.revista), v(s.pais), v(s.anio_pub),
      v(s.vol), v(s.num), v(s.indexacion), v(s.categoria_revista),
      v(s.cedula), v(s.docente, '').toUpperCase(),
      v(s.escolaridad), v(s.categoria), v(s.dedicacion),
      v(s.programa), v(s.facultad), v(s.titulo),
      v(s.num_autores, 1), v(s.pts_asig, 0), v(s.acta_ciarp), v(s.notas),
    ]),
  ]);

  // ─────────────────────────────────────────────────────────────────────────────
  // HOJA 4: Libro_Ensayo
  // ─────────────────────────────────────────────────────────────────────────────
  addSheet('Libro_Ensayo', [
    ['AÑO','SEMESTRE','NO','NOMBRE_DEL_LIBRO_ENSAYO','ISBN','FECHA_DE_PUBLICACIÓN',
     'EDITORIAL','DOCUMENTO_DE_IDENTIFICACIÓN','AUTORES',
     'ESCOLARIDAD','CATEGORÍA','TIEMPO_DE_DEDICACIÓN',
     'PROGRAMA_ACADÉMICO','FACULTAD','UNIVERSIDAD_PARTICIPANT',
     'PAR_EVALUADOR_MINCIENCIAS_1','PAR_EVALUADOR_MINCIENCIAS_2',
     'NUMERO_DE_AUTORES','PUNTOS_ASIGNADOS','ACTA_Y_FECHA_CIARP'],
    ...byTipo('ensayo','libro_ensayo').map((s, i) => [
      v(s.anio, anoActa), v(s.semestre, semestre), i + 1,
      v(s.titulo), v(s.isbn), v(s.fecha_publicacion), v(s.editorial),
      v(s.cedula), v(s.docente, '').toUpperCase(),
      v(s.escolaridad), v(s.categoria), v(s.dedicacion),
      v(s.programa), v(s.facultad), 'Universidad del Quindío',
      v(s.pares_ext?.[0]?.nota_evaluativa), v(s.pares_ext?.[1]?.nota_evaluativa),
      v(s.num_autores, 1), v(s.pts_asig, 0), v(s.acta_ciarp),
    ]),
  ]);

  // ─────────────────────────────────────────────────────────────────────────────
  // HOJA 5: Libro_Res_Investigacion
  // ─────────────────────────────────────────────────────────────────────────────
  addSheet('Libro_Res_Investigacion', [
    ['AÑO','SEMESTRE','NO','NOMBRE_DEL_LIBRO','ISBN','FECHA_DE_PUBLICACIÓN',
     'EDITORIAL','DOCUMENTO_DE_IDENTIFICACIÓN','AUTORES',
     'ESCOLARIDAD','CATEGORÍA','TIEMPO_DE_DEDICACIÓN',
     'PROGRAMA_ACADÉMICO','FACULTAD','UNIVERSIDAD_PARTICIPANT',
     'PAR_EVALUADOR_MINCIENCIAS_1','PAR_EVALUADOR_MINCIENCIAS_2',
     'NUMERO_DE_AUTORES','PUNTOS_ASIGNADOS','ACTA_Y_FECHA_CIARP','OBSERVACIONES'],
    ...byTipo('libro_investigacion').map((s, i) => [
      v(s.anio, anoActa), v(s.semestre, semestre), i + 1,
      v(s.titulo), v(s.isbn), v(s.fecha_publicacion), v(s.editorial),
      v(s.cedula), v(s.docente, '').toUpperCase(),
      v(s.escolaridad), v(s.categoria), v(s.dedicacion),
      v(s.programa), v(s.facultad), 'Universidad del Quindío',
      v(s.pares_ext?.[0]?.nota_evaluativa), v(s.pares_ext?.[1]?.nota_evaluativa),
      v(s.num_autores, 1), v(s.pts_asig, 0), v(s.acta_ciarp), v(s.notas),
    ]),
  ]);

  // ─────────────────────────────────────────────────────────────────────────────
  // HOJA 6: Libro_Texto
  // ─────────────────────────────────────────────────────────────────────────────
  addSheet('Libro_Texto', [
    ['AÑO','SEMESTRE','NO','NOMBRE_DEL_LIBRO_TEXTO','ISBN','FECHA_DE_PUBLICACIÓN',
     'EDITORIAL','ESPACIO_ACADÉMICO','DOCUMENTO_DE_IDENTIFICACIÓN','AUTORES',
     'ESCOLARIDAD','CATEGORÍA','TIEMPO_DE_DEDICACIÓN',
     'PROGRAMA_ACADÉMICO','FACULTAD','UNIVERSIDAD_PARTICIPANT',
     'PAR_EVALUADOR_MINCIENCIAS_1','PAR_EVALUADOR_MINCIENCIAS_2',
     'NUMERO_DE_AUTORES','PUNTOS_ASIGNADOS','ACTA_Y_FECHA_CIARP'],
    ...byTipo('libro_texto').map((s, i) => [
      v(s.anio, anoActa), v(s.semestre, semestre), i + 1,
      v(s.titulo), v(s.isbn), v(s.fecha_publicacion), v(s.editorial), v(s.espacio_academico),
      v(s.cedula), v(s.docente, '').toUpperCase(),
      v(s.escolaridad), v(s.categoria), v(s.dedicacion),
      v(s.programa), v(s.facultad), 'Universidad del Quindío',
      v(s.pares_ext?.[0]?.nota_evaluativa), v(s.pares_ext?.[1]?.nota_evaluativa),
      v(s.num_autores, 1), v(s.pts_asig, 0), v(s.acta_ciarp),
    ]),
  ]);

  // ─────────────────────────────────────────────────────────────────────────────
  // HOJA 7: Premios
  // ─────────────────────────────────────────────────────────────────────────────
  addSheet('Premios', [
    ['AÑO','SEMESTRE','NO','DOCUMENTO_DE_IDENTIFICACIÓN','NOMBRE_DEL_DOCENTE',
     'ESCOLARIDAD','CATEGORÍA','TIEMPO_DE_DEDICACIÓN','PROGRAMA_ACADÉMICO','FACULTAD',
     'TÍTULO_DEL_TRABAJO','PREMIO_O_DISTINCIÓN','ENTIDAD_QUE_OTORGA_EL_PREMIO',
     'FECHA_OTORGAN_PREMIO','PUNTOS_ASIGNADOS','ACTA_Y_FECHA_CIARP','OBSERVACIONES'],
    ...byTipo('premio').map((s, i) => [
      v(s.anio, anoActa), v(s.semestre, semestre), i + 1,
      v(s.cedula), v(s.docente, '').toUpperCase(),
      v(s.escolaridad), v(s.categoria), v(s.dedicacion),
      v(s.programa), v(s.facultad), v(s.titulo),
      v(s.premio_distincion), v(s.entidad_premio), v(s.fecha_premio),
      v(s.pts_asig, 0), v(s.acta_ciarp), v(s.notas),
    ]),
  ]);

  // ─────────────────────────────────────────────────────────────────────────────
  // HOJA 8: Patentes
  // ─────────────────────────────────────────────────────────────────────────────
  addSheet('Patentes', [
    ['AÑO','SEMESTRE','NO','IDENTIFICACIÓN_DEL_AUTOR',
     'NOMBRES_DE_AUTORES_PERTENECIENTES_A_UNIVERSIDADES',
     'PROGRAMA_ACADÉMICO','FACULTAD','TIPO_DE_PRODUCTO','TIPO_DE_PATENTE',
     'NOMBRE_DEL_PRODUCTO','NÚMERO_DE_REGISTRO_DE_LA_PATENTE',
     'FECHA_DE_APROBACIÓN_DE_LA_PATENTE','VIGENCIA_EN_AÑOS_DEL_PRODUCTO',
     'BANCO_DE_PATENTES_O_ENTIDAD_QUE_EXPIDE_EL_REGISTRO',
     'NUMERO_DE_AUTORES','PUNTOS_ASIGNADOS','ACTA_Y_FECHA_CIARP'],
    ...byTipo('patente').map((s, i) => [
      v(s.anio, anoActa), v(s.semestre, semestre), i + 1,
      v(s.cedula), v(s.docente, '').toUpperCase(),
      v(s.programa), v(s.facultad),
      v(s.tipo_patente, 'Patente de Invención'), v(s.subtipo_patente, 'De producto'),
      v(s.titulo), v(s.num_registro), v(s.fecha_aprobacion_patente),
      v(s.vigencia_patente), v(s.entidad_patente),
      v(s.num_autores, 1), v(s.pts_asig, 0), v(s.acta_ciarp),
    ]),
  ]);

  // ─────────────────────────────────────────────────────────────────────────────
  // HOJA 9: Obras_Artisticas
  // ─────────────────────────────────────────────────────────────────────────────
  addSheet('Obras_Artisticas', [
    ['AÑO','SEMESTRE','NO','NOMBRE_DE_LA_OBRA_ARTÍSTICA','TIPO',
     'RECONOCIMIENTO_SOLICITADO','IMPÁCTO',
     'FECHA_DE_CREACIÓN_DE_LA_OBRA_FECHA_DE_EXPOSICIÓN','TÉCNICA_UTILIZADA',
     'DOCUMENTO_DE_IDENTIFICACIÓN','AUTORES',
     'ESCOLARIDAD','CATEGORÍA','TIEMPO_DE_DEDICACIÓN',
     'PROGRAMA_ACADÉMICO','FACULTAD','UNIVERSIDAD_PARTICIPANT',
     'PUNTOS_EVALUACIÓN_PARES_MINCIENCIAS','PUNTOS_ASIGNADOS',
     'ACTA_Y_FECHA_CIARP','OBSERVACIONES'],
    ...byTipo('obra_artistica').map((s, i) => [
      v(s.anio, anoActa), v(s.semestre, semestre), i + 1,
      v(s.titulo), v(s.tipo_obra), v(s.reconocimiento), v(s.impacto),
      v(s.fecha_exposicion), v(s.tecnica),
      v(s.cedula), v(s.docente, '').toUpperCase(),
      v(s.escolaridad), v(s.categoria), v(s.dedicacion),
      v(s.programa), v(s.facultad), 'Universidad del Quindío',
      v(s.pts_sug), v(s.pts_asig, 0), v(s.acta_ciarp), v(s.notas),
    ]),
  ]);

  // ─────────────────────────────────────────────────────────────────────────────
  // HOJA 10: Prod_Tecnica
  // ─────────────────────────────────────────────────────────────────────────────
  addSheet('Prod_Tecnica', [
    ['AÑO','SEMESTRE','NO','NOMBRE_DE_LA_PROUCCIÓN_TÉCNICA','TIPO_DE_PRODUCCIÓN',
     'AÑO_DE_PUBLICACIÓN','DOCUMENTO_DE_IDENTIDAD','AUTORES',
     'ESCOLARIDAD','CATEGORÍA','TIEMPO_DE_DEDICACIÓN',
     'PROGRAMA_ACADÉMICO','FACULTAD','UNIVERSIDADES_PARTICIPANTES',
     'PUNTOS_EVALUACIÓN_PARES_MINCIENCIAS','PUNTAJE_ASIGNADO_AUTOR',
     'ACTA_Y_FECHA','OBSERVACIÓN'],
    ...byTipo('produccion_tecnica').map((s, i) => [
      v(s.anio, anoActa), v(s.semestre, semestre), i + 1,
      v(s.titulo), v(s.tipo_produccion), v(s.anio_publicacion),
      v(s.cedula), v(s.docente, '').toUpperCase(),
      v(s.escolaridad), v(s.categoria), v(s.dedicacion),
      v(s.programa), v(s.facultad), 'Universidad del Quindío',
      v(s.pts_sug), v(s.pts_asig, 0), v(s.acta_ciarp), v(s.notas),
    ]),
  ]);

  // ─────────────────────────────────────────────────────────────────────────────
  // HOJA 11: Prod_Software
  // ─────────────────────────────────────────────────────────────────────────────
  addSheet('Prod_Software', [
    ['AÑO','SEMESTRE','NO','IDENTIFICACIÓN_LIBRO_TOMO_PARTIDA','NOMBRE_DEL_SOFTWARE',
     'AÑO_DE_PUBLICACIÓN','DOCUMENTO_DE_IDENTIDAD_AUTOR_DOCENTE','AUTORES',
     'ESCOLARIDAD','CATEGORÍA','TIEMPO_DE_DEDICACIÓN',
     'PROGRAMA_ACADÉMICO','FACULTAD','UNIVERSIDADES_PARTICIPANTES',
     'PUNTAJE_EVALUADORES','PUNTAJE_ASIGNADO_AUTOR_ESCALA_0_A_15',
     'ACTA_Y_FECHA','OBSERVACIÓN'],
    ...byTipo('software').map((s, i) => [
      v(s.anio, anoActa), v(s.semestre, semestre), i + 1,
      v(s.id_tomo), v(s.titulo), v(s.anio_publicacion),
      v(s.cedula), v(s.docente, '').toUpperCase(),
      v(s.escolaridad), v(s.categoria), v(s.dedicacion),
      v(s.programa), v(s.facultad), 'Universidad del Quindío',
      v(s.pts_sug), v(s.pts_asig, 0), v(s.acta_ciarp), v(s.notas),
    ]),
  ]);

  // ─────────────────────────────────────────────────────────────────────────────
  // HOJA 12: Titulos (Universitarios)
  // ─────────────────────────────────────────────────────────────────────────────
  addSheet('Titulos', [
    ['AÑO','SEMESTRE','NO','DOCUMENTO_DE_IDENTIDAD','NOMBRE_DEL_DOCENTE',
     'ESCOLARIDAD_ANTERIOR','CATEGORÍA','TIEMPO_DE_DEDICACIÓN','PROGRAMA_ACADÉMICO',
     'FACULTAD','UNIVERSIDAD_QUE_OTORGA_EL_TÍTULO','TÍTULO_OTORGADO',
     'ACTO_DE_CONVALIDACIÓN','FECHA_GRADUACIÓN','PUNTOS_ASIGNADOS','ACTA_Y_FECHA_CIARP','OBSERVACIONES'],
    ...byTipo('titulo', 'titulo_academico').map((s, i) => [
      v(s.anio, anoActa), v(s.semestre, semestre), i + 1,
      v(s.cedula), v(s.docente, '').toUpperCase(),
      v(s.escolaridad_anterior, s.escolaridad), v(s.categoria), v(s.dedicacion), v(s.programa),
      v(s.facultad), v(s.universidad_otorga), v(s.titulo_otorgado || s.titulo),
      v(s.acto_convalidacion, 'N/A'), v(s.fecha_graduacion),
      v(s.pts_asig, 0), v(s.acta_ciarp), v(s.notas),
    ]),
  ]);

  // ─────────────────────────────────────────────────────────────────────────────
  // HOJA 13: Ascensos
  // ─────────────────────────────────────────────────────────────────────────────
  addSheet('Ascensos', [
    ['AÑO','SEMESTRE','NO','DOCUMENTO_DE_IDENTIFICACION','NOMBRE_DEL_DOCENTE',
     'PROGRAMA_ACADEMICO','FACULTAD','DEDICACION',
     'CATEGORIA_NUEVA','PUNTOS_ASIGNADOS','ACTA_Y_FECHA_CIARP','OBSERVACIONES'],
    ...byTipo('ascenso').map((s, i) => [
      v(s.anio, anoActa), v(s.semestre, semestre), i + 1,
      v(s.cedula), v(s.docente, '').toUpperCase(),
      v(s.programa), v(s.facultad), v(s.dedicacion),
      v(s.categoria_destino || s.categoria), v(s.pts_asig, 0), v(s.acta_ciarp), typeof s.notas === 'string' ? v(s.notas) : '',
    ]),
  ]);

  // ─────────────────────────────────────────────────────────────────────────────
  // HOJA 14: Prod_Audiovisual
  // ─────────────────────────────────────────────────────────────────────────────
  addSheet('Prod_Audiovisual', [
    ['AÑO','SEMESTRE','NO','NOMBRE_DEL_PRODUCTO_AUDIOVISUAL','ESCOLARIDAD','CATEGORÍA',
     'DOCUMENTO_DE_IDENTIFICACIÓN','AUTORES','TIEMPO_DE_DEDICACIÓN',
     'PROGRAMA_ACADÉMICO','FACULTAD','UNIVERSIDAD_PARTICIPANT',
     'IMPÁCTO','PUNTOS_ASIGNADOS','ACTA_Y_FECHA_CIARP','OBSERVACIONES'],
    ...byTipo('audiovisual','video').map((s, i) => [
      v(s.anio, anoActa), v(s.semestre, semestre), i + 1,
      v(s.titulo), v(s.escolaridad), v(s.categoria),
      v(s.cedula), v(s.docente, '').toUpperCase(), v(s.dedicacion),
      v(s.programa), v(s.facultad), 'Universidad del Quindío',
      v(s.impacto), v(s.pts_asig, 0), v(s.acta_ciarp), v(s.notas),
    ]),
  ]);

  // ─────────────────────────────────────────────────────────────────────────────
  // NUEVAS HOJAS DE BONIFICACIONES (Ponencias, Rev_No_Index, Tesis, PosDoctorado)
  // ─────────────────────────────────────────────────────────────────────────────
  addSheet('Ponencias', [
    ['AÑO','SEMESTRE','No.','DOCUMENTO DE IDENTIDAD','NOMBRE AUTORES',
     'TIEMPO DE DEDICACIÓN','PROGRAMA','FACULTAD','NÚMERO ISBN/ISSN',
     'TÍTULO DE LA PONENCIA','NOMBRE DEL EVENTO','LUGAR Y FECHA DEL EVENTO',
     'TIPO DE EVENTO\r\n(nacional/\r\ninternacion.)','PUNTOS ASIGNADOS/ DOCENTE',
     'ACTA/ FECHA','UNIVERSIDADES PARTICIPANTES EN LA PONENCIA','OBSERVACIONES'],
    ...byTipo('ponencia').map((s, i) => [
      v(s.anio, anoActa), v(s.semestre, semestre), i + 1,
      v(s.cedula), v(s.docente, '').toUpperCase(),
      v(s.dedicacion), v(s.programa), v(s.facultad), v(s.isbn_issn),
      v(s.titulo), v(s.nombre_evento), v(s.lugar_fecha_evento),
      v(s.tipo_evento), v(s.pts_asig, 0), v(s.acta_ciarp),
      v(s.universidades_participantes), v(s.notas),
    ]),
  ]);

  addSheet('Rev_No_Index', [
    ['AÑO','SEMESTRE','No.','DOCUMENTO DE \r\nIDENTIDAD','AUTORES',
     'PROGRAMA','FACULTAD','TIEMPO DE \r\nDEDICACIÓN',
     'NOMBRE DEL ARTÍCULO','ISSN','NOMBRE REVISTA','AÑO DE PUBLICACIÓN',
     'PUNTOS ASIGNADOS','ACTA Y \r\nFECHA','OBSERVACIONES'],
    ...byTipo('articulo_no_indexado').map((s, i) => [
      v(s.anio, anoActa), v(s.semestre, semestre), i + 1,
      v(s.cedula), v(s.docente, '').toUpperCase(),
      v(s.programa), v(s.facultad), v(s.dedicacion),
      v(s.titulo, s.titulo_articulo), v(s.issn, s.isbn_issn), v(s.revista), v(s.fecha_publicacion, s.anio_publicacion),
      v(s.pts_asig, 0), v(s.acta_ciarp), v(s.notas),
    ]),
  ]);

  addSheet('Tesis_Posgrados', [
    ['AÑO','SEMESTRE',' No.','DOC. IDENTIDAD ','DOCENTE DIRECTOR DE LA TESIS',
     'TIEMPO DE\r\nDEDICACIÓN','PROGRAMA \r\nACADÉMICO','FACULTAD',
     'NOMBRE DEL TRABAJO DIRIGIDO','ESTUDIANTE DIRIGIDO',
     'TÍTULO OPTADO POR EL ESTUDIANTE ASESORADO ','PROGRAMA /UNIVERSIDAD ',
     'FECHA SUSTENTACIÓN','PUNTOS ASIGNADOS','ACTA Y FECHA','OBSERVACIONES'],
    ...byTipo('direccion_tesis').map((s, i) => [
      v(s.anio, anoActa), v(s.semestre, semestre), i + 1,
      v(s.cedula), v(s.docente, '').toUpperCase(),
      v(s.dedicacion), v(s.programa), v(s.facultad),
      v(s.titulo), v(s.estudiante_dirigido), v(s.titulo_estudiante),
      v(s.programa_universidad), v(s.fecha_sustentacion),
      v(s.pts_asig, 0), v(s.acta_ciarp), v(s.notas),
    ]),
  ]);

  addSheet('Pos_Doctorado', [
    ['AÑO','SEMESTRE','No.','DOCUMENTO DE IDENTIDAD','NOMBRE DEL DOCENTE',
     'ESCOLARIDAD ANTERIOR','CATEGORÍA','TIEMPO DE \r\nDEDICACIÓN',
     'PROGRAMA ACADÉMICO','FACULTAD','TITULO DE DOCTORADO',
     'ENTIDAD QUE CERTIFICA','PROYECTO DE INVESTIGACIÓN',
     'PERIODO DE DURACIÓN (meses)','FECHA DE INICIO Y FINALIZACIÓN DEL PROYECTO',
     'PUNTOS ASIGNADOS','ACTA Y \r\nFECHA','OBSERVACIONES'],
    ...byTipo('postdoctorado').map((s, i) => [
      v(s.anio, anoActa), v(s.semestre, semestre), i + 1,
      v(s.cedula), v(s.docente, '').toUpperCase(),
      v(s.escolaridad_anterior, s.escolaridad), v(s.categoria_docente || s.categoria), v(s.dedicacion),
      v(s.programa), v(s.facultad), v(s.titulo_doctorado),
      v(s.entidad_certifica), v(s.titulo), v(s.duracion_meses),
      v(s.fechas_proyecto), v(s.pts_asig, 0), v(s.acta_ciarp), v(s.notas),
    ]),
  ]);

  // ─────────────────────────────────────────────────────────────────────────────
  // HOJAS 15–20: Desempeño Docente
  // (DDD x4 categorías, DAA, Experiencia Calificada)
  // ─────────────────────────────────────────────────────────────────────────────
  const colD = [
    'AÑO','SEMESTRE','NO',
    'DOCUMENTO_DE_IDENTIFICACIÓN','NOMBRE_DEL_DOCENTE',
    'ESCOLARIDAD','CATEGORÍA','TIEMPO_DE_DEDICACIÓN',
    'PROGRAMA_ACADÉMICO','FACULTAD',
    'PUNTOS_ASIGNADOS','ACTA_Y_FECHA_CIARP','OBSERVACIONES',
  ];
  const rowD = (s, i) => [
    v(s.anio, anoActa), v(s.semestre, semestre), i + 1,
    v(s.cedula), v(s.docente, '').toUpperCase(),
    v(s.escolaridad), v(s.categoria), v(s.dedicacion),
    v(s.programa), v(s.facultad),
    v(s.pts_asig, 0), v(s.acta_ciarp), v(s.notas),
  ];

  const dddAll = byTipo('ddd');
  ['auxiliar','asistente','asociado','titular'].forEach(cat => {
    const nombre = 'DDD_' + cat.charAt(0).toUpperCase() + cat.slice(1);
    const filas = dddAll.filter(s => v(s.categoria,'').toLowerCase().includes(cat));
    addSheet(nombre, [colD, ...filas.map(rowD)]);
  });

  addSheet('DAA', [colD, ...byTipo('daa').map(rowD)]);
  addSheet('Exp_Calificada', [colD, ...byTipo('experiencia','experiencia_calificada').map(rowD)]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Guardar el archivo
  // ─────────────────────────────────────────────────────────────────────────────
  const safeName = nombreActa.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
  XLSX.writeFile(wb, `Informe_CIARP_${safeName}_${hoy}.xlsx`);
}

/**
 * Exporta el Excel específico de una sesión CEI (Comité de Evaluación Institucional)
 * con las solicitudes de ascenso vinculadas.
 * @param {Array}  solicitudes  Lista de solicitudes de ascenso
 * @param {Object} sesion       Datos de la sesión CEI
 * @param {string} nombreActa   Ej: "CEI 3- 31/05/2026"
 */
export function exportarSesionCEI(solicitudes, sesion, nombreActa = '') {
  const wb  = XLSX.utils.book_new();
  const hoy = new Date().toISOString().slice(0, 10);
  const v   = (val, fallback = '') => (val !== null && val !== undefined && val !== '') ? val : fallback;

  const parsarNotas = (notas) => {
    if (!notas) return {};
    if (typeof notas === 'object') return notas;
    try { return JSON.parse(notas); } catch { return {}; }
  };

  // ── HOJA 1: Resumen de la Sesión ───────────────────────────────────────────
  const headerResumen = [
    'NO', 'DOCUMENTO_IDENTIFICACIÓN', 'NOMBRE_DOCENTE', 'PROGRAMA_ACADÉMICO',
    'FACULTAD', 'TIPO_CONTRATO', 'DEDICACIÓN', 'ESCOLARIDAD',
    'CATEGORÍA_ACTUAL', 'CATEGORÍA_DESTINO',
    'TIPO_TRABAJO', 'TÍTULO_TRABAJO',
    'PAR_EVALUADOR_1', 'PAR_EVALUADOR_2',
    'ESTADO', 'PUNTOS_ASIGNADOS',
    'ACTA_CEI', 'RESOLUCIÓN_ASCENSO', 'OBSERVACIONES'
  ];

  const filasResumen = solicitudes.map((s, i) => {
    const nt = parsarNotas(s.notas);
    const pares = s.pares_ext ? (typeof s.pares_ext === 'string' ? (() => { try { return JSON.parse(s.pares_ext); } catch { return []; } })() : s.pares_ext) : [];
    const par1 = pares[0]?.nombre || '';
    const par2 = pares[1]?.nombre || '';
    const estadoLabel = s.estado === 'aprobado_cei' || s.estado === 'aprobado' ? 'APROBADO'
                      : s.estado === 'rechazado_cei' || s.estado === 'rechazado' ? 'NEGADO'
                      : 'EN PROCESO';
    return [
      i + 1,
      v(s.cedula),
      v(s.docente, '').toUpperCase(),
      v(s.programa || nt.programa),
      v(s.facultad || nt.facultad),
      v(nt.tipo_contrato),
      v(nt.dedicacion),
      v(nt.escolaridad),
      v(nt.categoria_actual),
      v(nt.categoria_destino),
      v(nt.tipo_trabajo),
      v(s.titulo),
      par1,
      par2,
      estadoLabel,
      v(s.pts_asig, ''),
      v(s.acta_cei || nt.acta_cei || sesion?.acta_label),
      v(nt.res_ascenso_cei),
      v(nt.alertas),
    ];
  });

  const wsResumen = XLSX.utils.aoa_to_sheet([headerResumen, ...filasResumen]);
  wsResumen['!cols'] = headerResumen.map(() => ({ wch: 22 }));
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Sesión CEI');

  // ── HOJA 2: Solo Aprobados ─────────────────────────────────────────────────
  const aprobados = solicitudes.filter(s =>
    s.estado === 'aprobado_cei' || s.estado === 'aprobado'
  );
  if (aprobados.length > 0) {
    const wsApro = XLSX.utils.aoa_to_sheet([headerResumen, ...aprobados.map((s, i) => {
      const nt = parsarNotas(s.notas);
      const pares = s.pares_ext ? (typeof s.pares_ext === 'string' ? (() => { try { return JSON.parse(s.pares_ext); } catch { return []; } })() : s.pares_ext) : [];
      return [
        i + 1, v(s.cedula), v(s.docente, '').toUpperCase(),
        v(s.programa || nt.programa), v(s.facultad || nt.facultad),
        v(nt.tipo_contrato), v(nt.dedicacion), v(nt.escolaridad),
        v(nt.categoria_actual), v(nt.categoria_destino),
        v(nt.tipo_trabajo), v(s.titulo),
        pares[0]?.nombre || '', pares[1]?.nombre || '',
        'APROBADO', v(s.pts_asig, ''),
        v(s.acta_cei || nt.acta_cei || sesion?.acta_label),
        v(nt.res_ascenso_cei), v(nt.alertas),
      ];
    })]);
    wsApro['!cols'] = headerResumen.map(() => ({ wch: 22 }));
    XLSX.utils.book_append_sheet(wb, wsApro, 'Aprobados');
  }

  const safeName = nombreActa.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
  XLSX.writeFile(wb, `Informe_CEI_${safeName}_${hoy}.xlsx`);
}
