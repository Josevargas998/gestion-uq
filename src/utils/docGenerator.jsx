import { cleanProgramaName } from '../helpers.js';

export function generarDocumento(tipo, sol, docentesMap = {}) {
  let titulo = '';
  let contenido = '';
  const fechaStr = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  const logoUq = 'https://www.uniquindio.edu.co/info/uniquindio/media/bloque8030.png';

  if (tipo === 'memorando') {
    const memId = sol.memorando || `${new Date().getFullYear()}-IM-${Math.floor(1000 + Math.random() * 9000)}`;
    const codVal = Math.random().toString(36).substring(2, 10).toUpperCase();
    titulo = 'Memorando de Solicitud de Evaluación Interna';
    contenido = `
      <div class="header">
        <img src="${logoUq}" style="width: 180px; margin-bottom: 20px;" />
        <div style="float: right; text-align: right; color: #555; font-size: 14px;">
          <strong>MEMORANDO ${memId}</strong><br/>
          Armenia, ${fechaStr}
        </div>
        <div style="clear: both; margin-top: 30px; line-height: 1.8;">
          <strong>PARA:</strong> ${sol.destinatario_nombre || '[Nombre del Destinatario]'} - ${sol.destinatario_cargo || `Presidente del ${sol.pares_int?.consejo || 'Consejo de Facultad / Curricular'}`}<br/>
          <strong>DE:</strong> ${sol.remitente_nombre || '[Nombre del Remitente]'}, Jefe de la Oficina de Asuntos Profesorales, Vicerrectoría Académica<br/>
          <strong>ASUNTO:</strong> Solicitud de evaluación de producto académico (Cód: M-AP-06-F-52)
        </div>
      </div>
      <div class="body-text">
        <p>Respetado(a) doctor(a),</p>
        <p>De manera atenta me dirijo a usted para solicitar la evaluación interna del producto académico descrito a continuación, presentado por el docente <strong>${sol.docente}</strong> adscrito a la facultad de <strong>${sol.facultad}</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding: 8px; border: 1px solid #ccc; background: #f9f9f9; width: 150px;"><strong>Tipo:</strong></td><td style="padding: 8px; border: 1px solid #ccc;">${sol.tipo}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ccc; background: #f9f9f9;"><strong>Título:</strong></td><td style="padding: 8px; border: 1px solid #ccc;">${sol.titulo}</td></tr>
          ${sol.revista ? `<tr><td style="padding: 8px; border: 1px solid #ccc; background: #f9f9f9;"><strong>Revista:</strong></td><td style="padding: 8px; border: 1px solid #ccc;">${sol.revista}</td></tr>` : ''}
        </table>
        <p>Lo anterior, con el fin de continuar el trámite de ${sol.tipo === 'ascenso' ? 'ascenso en el escalafón' : 'asignación de puntaje salarial'} amparado en el <strong>Acuerdo Superior No.012 del 2009</strong> y el Decreto 1279 de 2002.</p>
        <p>Agradecemos emitir su concepto técnico correspondiente en un plazo de <strong>30 días calendario, improrrogable</strong> a partir de la fecha.</p>
        <p><strong>Anexos:</strong> 3 archivos que contienen el producto académico, soportes y la solicitud formal.</p>
      </div>
      <div class="firma">
        <br/><br/><br/>
        __________________________________<br/>
        <strong>${sol.remitente_nombre || '[Nombre del Remitente]'}</strong><br/>
        Jefe de la Oficina de Asuntos Profesorales<br/>
        Universidad del Quindío
      </div>
      <div class="footer-info" style="margin-top: 40px; font-size: 12px; line-height: 1.5; color: #333;">
        <p><strong>Copia a:</strong> ${sol.copia_a || `Decano(a) Facultad de ${sol.facultad}; Archivo Asuntos Profesorales`}</p>
        <p><strong>Transcriptor:</strong> ${sol.transcriptor_nombre || '[Nombre del Transcriptor]'}, Técnico Administrativo</p>
        <p style="margin-top: 10px;"><strong>Código de validación:</strong> ${codVal}</p>
        <hr style="border: 0; border-top: 1px solid #ddd; margin: 15px 0;" />
        <div style="text-align: center; font-size: 11px; color: #666;">
          PBX: 285000<br/>
          Para verificar la autenticidad de este documento ingrese a <a href="https://www.uniquindio.edu.co/validar" style="color: #666; text-decoration: none;">www.uniquindio.edu.co/validar</a> e ingrese el código de validación.
        </div>
      </div>
    `;
  } else if (tipo === 'resolucion') {
    titulo = 'Resolución Rectoral de Reconocimiento de Puntos';
    contenido = `
      <div style="font-family: Arial, sans-serif;">
        <div class="header" style="text-align: center; margin-bottom: 30px;">
          <h3 style="margin-bottom: 5px; font-size: 16px;">RECTORÍA</h3>
          <h3 style="margin-bottom: 5px; font-size: 16px;">RESOLUCIÓN No. _________</h3>
          <p style="margin-top: 0; font-size: 14px;">( ____________ )</p>
          <p style="font-weight: bold; margin-top: 20px; font-size: 14px; text-align: center; text-transform: uppercase;">
            "POR MEDIO DE LA CUAL SE ASIGNAN Y RECONOCEN PUNTOS SALARIALES AL DOCENTE ${sol.docente.toUpperCase()} DEL PROGRAMA DE ${cleanProgramaName(sol.programa)}, CONFORME AL DECRETO 1279 DE 2002"
          </p>
        </div>
        <div class="body-text" style="text-align: justify; font-size: 12px; line-height: 1.5;">
          <p>El Rector de la Universidad del Quindío, de conformidad con sus facultades legales y estatutarias, especialmente las conferidas en los Acuerdos del Consejo Superior Nos.121 del 28 de septiembre de 2021, 005 del 28 de febrero de 2005, 012 del 28 de agosto de 2009, modificado por el acuerdo 104 del 9 de diciembre del 2020 y 133 del 14 de junio del año 2022, y,</p>
          
          <h3 style="text-align: center; margin-top: 20px; font-size: 14px;">CONSIDERANDO:</h3>
          
          <p style="margin-bottom: 10px;"><strong>A.</strong> Que la Autonomía Universitaria es una facultad reconocida mediante la Constitución Política, que se traduce en el reconocimiento que el Constituyente hizo de la libertad jurídica que tienen las instituciones de Educación Superior reconocidas como Universidades, para autogobernarse y auto determinarse, en el marco de las limitaciones que el mismo ordenamiento superior y la Ley les señalen.</p>
          <p style="margin-bottom: 10px;"><strong>B.</strong> Que, con fundamento en el Derecho Universitario, el sentido de la autonomía no es otro que brindar a las universidades la discrecionalidad necesaria para desarrollar el contenido académico, administrativo y financiero de acuerdo con las múltiples capacidades creativas de aquellas, con el límite que encuentra dicha autonomía en el orden público, el interés general y el bien común.</p>
          <p style="margin-bottom: 10px;"><strong>C.</strong> Que el Decreto No. 1279 de 2002, establece el régimen salarial y prestacional de los docentes de las universidades estatales, y en sus artículos 6°, 12°, 17° y 18°, consagra los factores que deben tenerse en cuenta para determinar los puntos salariales que constituyen la base de la remuneración mensual de los docentes asimilados a tal norma; por actividades de dirección académico administrativas, por desempeño destacado de las labores de docencia y extensión y la experiencia calificada por evaluación de desempeño.</p>
          <p style="margin-bottom: 10px;"><strong>D.</strong> Que el Consejo Superior de la Universidad del Quindío mediante Acuerdo No. 012 del 28 de agosto del 2009 derogó el Acuerdo del Consejo Superior No. 019 de 2002 norma que preceptuó en su artículo primero lo siguiente: “para la asignación y reconocimiento de bonificaciones de puntos salariales por títulos, categorías, experiencia calificada, cargos académico-administrativos, desempeño en docencia y extensión y el reconocimiento de los puntos salariales asignados a la producción académica por los pares externos, en cumplimiento de lo dispuesto en el Decreto 1279 de 2002; se establece un Comité Interno de Asignación y Reconocimiento de Puntaje (…)”, el cual fue adicionado mediante el artículo primero del Acuerdo del Consejo Superior No.104 del 9 de diciembre del 2020.</p>
          <p style="margin-bottom: 10px;"><strong>E.</strong> Que el Acuerdo del Consejo Superior No. 012 de agosto 28 de 2009, en sus artículos 3 y 4, determina los requisitos que se deben tener en cuenta para el reconocimiento de los puntos por el desempeño destacado de las labores de docencia y extensión y la experiencia calificada y, determina el reconocimiento de los puntos por actividades de dirección académico-administrativa, dependiendo del resultado de la evaluación del desempeño.</p>
          <p style="margin-bottom: 10px;"><strong>F.</strong> Que el Comité Interno de Asignación y Reconocimiento de Puntaje (C.I.A.R.P), conforme lo dispuesto en el Acuerdo del Consejo Superior No.012 de 2009, y Acuerdo del Consejo Superior No.104 del 9 de diciembre del 2020, en sesión del <strong>[FECHA DE SESIÓN CIARP]</strong> según consta en Acta No.<strong>${sol.acta_ciarp || '[NÚMERO ACTA CIARP]'}</strong>, aprobó la asignación y reconocimiento de puntos salariales a docentes de planta de la Universidad del Quindío, por experiencia calificada, desempeño destacado docente y actividades académico administrativas, entre ellos a <strong>${sol.docente.toUpperCase()}</strong>.</p>
          <p style="margin-bottom: 10px;"><strong>G.</strong> Que se hace necesario la expedición del correspondiente acto administrativo por medio del cual se asignen y reconozcan los correspondientes puntos salariales.</p>
          <p style="margin-bottom: 10px;"><strong>H.</strong> Que, en mérito de lo expuesto, el Rector,</p>

          <h3 style="text-align: center; margin-top: 20px; font-size: 14px;">RESUELVE</h3>

          ${(function(){
            const esMujer = /a$/i.test(sol.docente.split(' ')[0]) || /a$/i.test(sol.docente);
            return `
            <p style="margin-top: 15px;"><strong>ARTÍCULO PRIMERO:</strong> Asignar y reconocer puntos salariales con fundamento en la parte considerativa del presente acto administrativo a l${esMujer ? 'a profesora' : 'el profesor'} <strong>${sol.docente.toUpperCase()}</strong>, identificad${esMujer ? 'a' : 'o'} con cédula de ciudadanía No. ${sol.cedula || '_________'} de _________; con dedicación de ${sol.dedicacion || 'Tiempo Completo'}, <strong>${sol.pts_asig != null ? sol.pts_asig : (sol.pts_sug || 0)} puntos</strong>, así:</p>
            <div style="margin-left: 20px; margin-bottom: 20px;">
              <p style="margin-bottom: 5px; font-weight: bold;">Producción Académica</p>
              <p style="margin-bottom: 5px; text-align: justify; line-height: 1.6;">
                - <strong>${sol.pts_asig != null ? sol.pts_asig : (sol.pts_sug || 0)} Puntos</strong> a partir de [FECHA DE RECONOCIMIENTO], por el producto académico tipo ${sol.tipo}: "${sol.titulo}"${sol.revista ? `, publicado en la Revista ${sol.revista}` : ''}.
              </p>
            </div>
            `;
          })()}

          <p><strong>ARTÍCULO SEGUNDO:</strong> Autorícese a la Vicerrectoría Administrativa y a la Dirección de Gestión Humana, para que tomen las medidas administrativas y financieras necesarias, que permitan el cumplimiento del presente acto administrativo, una vez quede ejecutoriado.</p>
          <p><strong>ARTÍCULO TERCERO:</strong> La presente Resolución produce efectos fiscales a partir de la fecha de su expedición y contra ella procede el Recurso de Reposición y apelación, el cual deberá ser interpuesto dentro de los diez (10) días hábiles siguientes al acto de notificación.</p>

          <h3 style="text-align: center; margin-top: 30px; font-size: 14px;">NOTIFÍQUESE, COMUNÍQUESE Y CÚMPLASE</h3>

          <p style="margin-top: 20px;">Dada en Armenia (Quindío) a los _______________________.</p>

        </div>

        <div class="firma" style="margin-top: 50px; font-family: Arial, sans-serif;">
          __________________________________<br/>
          <strong>LUIS FERNANDO POLANÍA OBANDO</strong><br/>
          Rector
        </div>

        <div style="margin-top: 50px; font-family: Arial, sans-serif; font-size: 10px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border: 1px solid #000; background: #f9f9f9;">
              <th style="border: 1px solid #000; padding: 5px; width: 15%;">ROLES</th>
              <th style="border: 1px solid #000; padding: 5px; width: 45%;">NOMBRES Y APELLIDOS</th>
              <th style="border: 1px solid #000; padding: 5px; width: 40%;">FIRMA</th>
            </tr>
            <tr style="border: 1px solid #000;">
              <td style="border: 1px solid #000; padding: 5px; font-weight: bold;">PROYECTÓ<br/>ELABORÓ</td>
              <td style="border: 1px solid #000; padding: 5px;">Lina Marcela Cruz Calderón / Técnico Oficina de Asuntos Profesorales</td>
              <td style="border: 1px solid #000; padding: 5px;"></td>
            </tr>
            <tr style="border: 1px solid #000;">
              <td style="border: 1px solid #000; padding: 5px; font-weight: bold;">REVISÓ<br/>Jurídica</td>
              <td style="border: 1px solid #000; padding: 5px;">Víctor Alfonso Vélez Muñoz / Jefe Oficina Asesora Jurídica</td>
              <td style="border: 1px solid #000; padding: 5px;"></td>
            </tr>
            <tr style="border: 1px solid #000;">
              <td style="border: 1px solid #000; padding: 5px; font-weight: bold;">APROBÓ</td>
              <td style="border: 1px solid #000; padding: 5px;">Luz Amparo Celis Buriticá / Jefe Oficina de Asuntos Profesorales</td>
              <td style="border: 1px solid #000; padding: 5px;"></td>
            </tr>
          </table>
          <p style="text-align: justify; margin-top: 8px; font-style: italic; color: #555;">Los arriba firmantes declaramos que hemos revisado el presente documento y soportes y lo encontramos ajustado en términos técnicos y administrativos; así como a las normas y disposiciones legales vigentes y por lo tanto, bajo nuestra responsabilidad, lo presentamos para la firma del Rector de la institución.</p>
        </div>
      </div>
    `;
  } else if (tipo === 'resolucion_productividad' || tipo === 'resolucion_experiencia' || tipo === 'resolucion_programa' || tipo === 'resolucion_bonificacion') {
    const isProductividad = tipo === 'resolucion_productividad' || tipo === 'resolucion_programa' || tipo === 'resolucion_bonificacion';
    titulo = isProductividad ? 'Resoluciones de Productividad' : 'Resoluciones de Experiencia';
    
    // Funciones Helper de limpieza
    const stripEmojis = (str) => str ? String(str).replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '').trim() : '';
    
    const extractDate = (acta, fecha) => {
      // Intenta extraer dd/mm/yyyy del string del acta
      const m = String(acta || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
      if (m) {
        const d = new Date(`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}T12:00:00`);
        if (!isNaN(d)) return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
      }
      if (fecha) {
        const d = new Date(`${fecha}T12:00:00`);
        if (!isNaN(d)) return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
      }
      // Fallback: fecha de hoy
      const hoy = new Date();
      return `${hoy.getDate()} de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()}`;
    };

    const n2w = ['CERO', 'PRIMERO', 'SEGUNDO', 'TERCERO', 'CUARTO', 'QUINTO', 'SEXTO', 'SÉPTIMO', 'OCTAVO', 'NOVENO', 'DÉCIMO', 'UNDÉCIMO', 'DUODÉCIMO', 'DECIMOTERCERO', 'DECIMOCUARTO', 'DECIMOQUINTO'];

    contenido = sol.map((grupo, idx) => {
      const programaStr = stripEmojis(grupo.programa).toUpperCase();
      const actasList = grupo.actas ? grupo.actas.split(', ') : [...new Set(grupo.solicitudes.map(s => (s.acta_ciarp || s.sesion_ciarp_id || '').trim()).filter(Boolean))];
      const actasStr = actasList.length > 1 ? `las Actas No. ${actasList.join(', ')}` : (actasList.length === 1 ? `el Acta No. ${actasList[0]}` : `el Acta No. [NÚMERO ACTA]`);
      const razon = isProductividad ? 'por producción académica y título académico' : 'por experiencia calificada, desempeño destacado docente y actividades académico administrativas';

      // Agrupar por docente
      const porDocente = {};
      grupo.solicitudes.forEach(s => {
        if (!porDocente[s.cedula]) {
          // Leer historial del docente para extraer resolución anterior
          let historial = {};
          if (s.docente_historial) {
            try { historial = typeof s.docente_historial === 'string' ? JSON.parse(s.docente_historial) : s.docente_historial; } catch(_e) { /* ignore error */ }
          } else if (docentesMap[s.cedula] && docentesMap[s.cedula].historial) {
            try { historial = typeof docentesMap[s.cedula].historial === 'string' ? JSON.parse(docentesMap[s.cedula].historial) : docentesMap[s.cedula].historial; } catch(_e) { /* ignore error */ }
          }
          const resAnterior = historial['RES_ANTERIOR'] || '';
          const fechaResAnterior = historial['FECHA_RES_ANTERIOR'] || '';

          porDocente[s.cedula] = {
            docente: stripEmojis(s.docente),
            cedula: s.cedula,
            dedicacion: s.dedicacion || 'tiempo completo',
            lugar_expedicion: s.docente_lugar_expedicion || '_________',
            pts_acumulados: s.docente_pts_acumulados != null ? Number(s.docente_pts_acumulados) : 0,
            pts_titulos_exp: s.docente_pts_titulos_exp != null ? Number(s.docente_pts_titulos_exp) : 0,
            pts_total_salarial: s.docente_pts_total_salarial != null ? Number(s.docente_pts_total_salarial) : 0,
            res_anterior: resAnterior,
            fecha_res_anterior: fechaResAnterior,
            productos: []
          };
        }
        porDocente[s.cedula].productos.push(s);
      });
      const docentesList = Object.values(porDocente).sort((a,b) => a.docente.localeCompare(b.docente));

      let articulosHtml = '';

      if (isProductividad) {
        // En productividad, cada docente tiene su propio ARTÍCULO
        articulosHtml = docentesList.map((d, index) => {
          const esMujer = /a$/i.test(d.docente.split(' ')[0]) || /a$/i.test(d.docente);
          const ordinal = index + 1 < n2w.length ? n2w[index + 1] : `VIGÉSIMO`; 
          
          // Nueva productividad de este CIARP (artículos, libros, software, etc.)
          // NO incluye títulos — esos son acumulados históricos
          let nuevaProductividad = 0;
          
          d.productos.forEach(s => {
            const val = s.pts_asig != null ? Number(s.pts_asig) : (Number(s.pts_sug) || 0);
            // Los títulos NO se suman aquí — van en el campo acumulado pts_titulos_exp
            if (!['titulo_academico', 'titulo', 'ascenso'].includes(s.tipo)) {
              nuevaProductividad += val;
            }
          });

          // Puntos base de productividad (de Topes — lo que ya tenía antes de este CIARP)
          const puntosBaseProductividad = Math.max(0, Number(d.pts_acumulados) || 0);
          // Títulos académicos: ACUMULADO TOTAL de todos sus títulos (Academusoft col 24)
          const puntajesTitulosAcum = Math.max(0, Number(d.pts_titulos_exp) || 0);
          // Total final de la resolución
          const totalFinal = puntosBaseProductividad + nuevaProductividad + puntajesTitulosAcum;

          return `
            <p style="margin-top: 15px; margin-bottom: 20px;"><strong>ARTÍCULO ${ordinal}:</strong> Asignar y reconocer puntos salariales con fundamento en la parte considerativa del presente acto administrativo a l${esMujer ? 'a profesora' : 'el profesor'} <strong>${d.docente.toUpperCase()}</strong>, identificad${esMujer ? 'a' : 'o'} con cédula de ciudadanía No. ${d.cedula || '_________'} de ${d.lugar_expedicion}; con dedicación de ${d.dedicacion.toLowerCase()}, <strong>${totalFinal.toFixed(1)} puntos</strong>, así:</p>
            
            <table style="margin-left: 0; width: 70%; font-size: 12px; border-collapse: collapse; margin-bottom: 10px;">
              <tr>
                <td style="padding: 2px 0;">Puntaje Res. ${d.res_anterior || '[RES_ANTERIOR]'} ${d.fecha_res_anterior ? '/ ' + d.fecha_res_anterior : '[FECHA_RES_ANTERIOR]'}</td>
                <td style="padding: 2px 0; text-align: right;">${puntosBaseProductividad.toFixed(1)} Puntos</td>
              </tr>
              ${nuevaProductividad > 0 ? `
              <tr>
                <td style="padding: 2px 0;">Productividad Académica</td>
                <td style="padding: 2px 0; text-align: right;">${nuevaProductividad.toFixed(1)} Puntos</td>
              </tr>
              ` : ''}
              ${puntajesTitulosAcum > 0 ? `
              <tr>
                <td style="padding: 2px 0;">Títulos Académicos</td>
                <td style="padding: 2px 0; text-align: right;">${puntajesTitulosAcum.toFixed(1)} Puntos</td>
              </tr>
              ` : ''}
            </table>

            <div style="margin-left: 0;">
              ${d.productos.map(s => {
                const val = s.pts_asig != null ? Number(s.pts_asig).toFixed(1) : Number(s.pts_sug || 0).toFixed(1);
                const fechaReconocimiento = extractDate(s.acta_ciarp, s.fecha);
                return `
                <p style="margin-bottom: 5px; text-align: justify; line-height: 1.5;">
                  - <strong>${val} Puntos</strong> a partir del ${fechaReconocimiento}, por ${stripEmojis(s.tipo)}: "${stripEmojis(s.titulo)}"${s.revista ? ` publicado en ${stripEmojis(s.revista)}` : ''}.
                </p>
                `;
              }).join('')}
            </div>
          `;
        }).join('');
        
        const idxArticuloAdmin = docentesList.length + 1 < n2w.length ? n2w[docentesList.length + 1] : 'SIGUIENTE';
        const idxArticuloAdmin2 = docentesList.length + 2 < n2w.length ? n2w[docentesList.length + 2] : 'SIGUIENTE_DOS';

        articulosHtml += `
          <p style="margin-top: 15px;"><strong>ARTÍCULO ${idxArticuloAdmin}:</strong> Autorícese a la Vicerrectoría Administrativa y a la Dirección de Gestión Humana, para que tomen las medidas administrativas y financieras necesarias, que permitan el cumplimiento del presente acto administrativo, una vez quede ejecutoriado.</p>
          <p><strong>ARTÍCULO ${idxArticuloAdmin2}:</strong> La presente resolución rige a partir de la fecha de su expedición y contra la misma, procede el recurso de reposición, el cual deberá ser presentado dentro de los diez (10) días hábiles siguientes al acto de su notificación.</p>
        `;
      } else {
        // En experiencia, todos los docentes van en el ARTÍCULO PRIMERO
        const year = new Date().getFullYear();
        let docentesHtml = docentesList.map(d => {
          const esMujer = /a$/i.test(d.docente.split(' ')[0]) || /a$/i.test(d.docente);
          
          let expPts = 0;
          let dddPts = 0;
          let daaPts = 0;
          
          d.productos.forEach(s => {
            const val = s.pts_asig != null ? Number(s.pts_asig) : (Number(s.pts_sug) || 0);
            if (s.tipo === 'exp_calificada') expPts += val;
            if (['ddd','ddd_auxiliar','ddd_asistente','ddd_asociado','ddd_titular'].includes(s.tipo)) dddPts += val;
            if (s.tipo === 'daa') daaPts += val;
          });

          const totalNuevos = expPts + dddPts + daaPts;
          const puntosBase = Math.max(0, Number(d.pts_total_salarial) || 0);
          const totalFinal = puntosBase + totalNuevos;

          return `
            <div style="margin-bottom: 25px;">
              <p style="margin-bottom: 10px; text-align: justify; line-height: 1.5;">
                <strong>${d.docente.toUpperCase()}</strong>, identificad${esMujer ? 'a' : 'o'} con cédula de ciudadanía No. ${d.cedula || '_________'} de ${d.lugar_expedicion}; con dedicación de ${d.dedicacion.toLowerCase()}, <strong>${totalFinal.toFixed(1)} puntos</strong> a partir del 1º de enero del año ${year}, distribuidos así:
              </p>
              
              <table style="margin-left: 0; width: 70%; font-size: 12px; border-collapse: collapse; margin-bottom: 10px;">
                <tr>
                  <td style="padding: 2px 0;">Puntaje Res. ${d.res_anterior || '[RES_ANTERIOR]'} / ${d.fecha_res_anterior || '[FECHA_RES_ANTERIOR]'}</td>
                  <td style="padding: 2px 0; text-align: right;">${puntosBase.toFixed(1)} Puntos</td>
                </tr>
                ${expPts > 0 ? `
                <tr>
                  <td style="padding: 2px 0;">Experiencia Calificada</td>
                  <td style="padding: 2px 0; text-align: right;">${expPts.toFixed(1)} Puntos</td>
                </tr>
                ` : ''}
                ${dddPts > 0 ? `
                <tr>
                  <td style="padding: 2px 0;">Desempeño Destacado Docente</td>
                  <td style="padding: 2px 0; text-align: right;">${dddPts.toFixed(1)} Puntos</td>
                </tr>
                ` : ''}
                ${daaPts > 0 ? `
                <tr>
                  <td style="padding: 2px 0;">Actividades de Dirección</td>
                  <td style="padding: 2px 0; text-align: right;">${daaPts.toFixed(1)} Puntos</td>
                </tr>
                ` : ''}
              </table>
            </div>
          `;
        }).join('');

        articulosHtml = `
          <p style="margin-top: 15px; margin-bottom: 20px;"><strong>ARTÍCULO PRIMERO:</strong> Asignar y reconocer puntos salariales con fundamento en el contenido de la parte considerativa del presente acto administrativo, a los docentes relacionados a continuación del programa de <strong>${programaStr}</strong>, así:</p>
          ${docentesHtml}
          <p><strong>ARTÍCULO SEGUNDO:</strong> Autorícese a la Vicerrectoría Administrativa y a la Dirección de Gestión Humana, para que tomen las medidas administrativas y financieras necesarias, que permitan el cumplimiento del presente acto administrativo, una vez quede ejecutoriado.</p>
          <p><strong>ARTÍCULO TERCERO:</strong> La presente resolución rige a partir de la fecha de su expedición y produce efectos fiscales desde el primero (1) de enero del año ${year}.</p>
          <p><strong>ARTÍCULO CUARTO:</strong> Contra el presente acto administrativo, procede el recurso de reposición, el cual deberá ser presentado dentro de los diez (10) días hábiles siguientes al acto de su notificación.</p>
        `;
      }

      return `
      <div style="font-family: Arial, sans-serif; ${idx < sol.length - 1 ? 'page-break-after: always;' : ''}">
        <div class="header" style="text-align: center; margin-bottom: 30px;">
          <h3 style="margin-bottom: 5px; font-size: 16px;">RECTORÍA</h3>
          <h3 style="margin-bottom: 5px; font-size: 16px;">RESOLUCIÓN No. _________</h3>
          <p style="margin-top: 0; font-size: 14px;">( ____________ )</p>
          <p style="font-weight: bold; margin-top: 20px; font-size: 14px; text-align: center; text-transform: uppercase;">
            "POR MEDIO DE LA CUAL SE ${tipo === 'resolucion_bonificacion' ? 'RECONOCEN BONIFICACIONES ACADÉMICAS' : (isProductividad ? 'ASIGNAN Y RECONOCEN PUNTOS SALARIALES A UNOS DOCENTES' : 'RECONOCEN PUNTOS POR EXPERIENCIA CALIFICADA Y DESEMPEÑO A UNOS DOCENTES')} DE CARRERA DEL PROGRAMA DE ${programaStr}, CONFORME AL DECRETO 1279 DE 2002"
          </p>
        </div>
        <div class="body-text" style="text-align: justify; font-size: 12px; line-height: 1.5;">
          <p>El Rector de la Universidad del Quindío, de conformidad con sus facultades legales y estatutarias, especialmente las conferidas en los Acuerdos del Consejo Superior Nos.121 del 28 de septiembre de 2021, 005 del 28 de febrero de 2005, 012 del 28 de agosto de 2009, modificado por el acuerdo 104 del 9 de diciembre del 2020 y 133 del 14 de junio del año 2022, y,</p>
          
          <h3 style="text-align: center; margin-top: 20px; font-size: 14px;">CONSIDERANDO:</h3>
          
          <p style="margin-bottom: 10px;"><strong>A.</strong> Que la Autonomía Universitaria es una facultad reconocida mediante la Constitución Política, que se traduce en el reconocimiento que el Constituyente hizo de la libertad jurídica que tienen las instituciones de Educación Superior reconocidas como Universidades, para autogobernarse y auto determinarse, en el marco de las limitaciones que el mismo ordenamiento superior y la Ley les señalen.</p>
          <p style="margin-bottom: 10px;"><strong>B.</strong> Que, con fundamento en el Derecho Universitario, el sentido de la autonomía no es otro que brindar a las universidades la discrecionalidad necesaria para desarrollar el contenido académico, administrativo y financiero de acuerdo con las múltiples capacidades creativas de aquellas, con el límite que encuentra dicha autonomía en el orden público, el interés general y el bien común.</p>
          <p style="margin-bottom: 10px;"><strong>C.</strong> Que el Decreto No. 1279 de 2002, establece el régimen salarial y prestacional de los docentes de las universidades estatales, y en sus artículos 6°, 12°, 17° y 18°, consagra los factores que deben tenerse en cuenta para determinar los puntos salariales que constituyen la base de la remuneración mensual de los docentes asimilados a tal norma; por actividades de dirección académico administrativas, por desempeño destacado de las labores de docencia y extensión y la experiencia calificada por evaluación de desempeño.</p>
          <p style="margin-bottom: 10px;"><strong>D.</strong> Que el Consejo Superior de la Universidad del Quindío mediante Acuerdo No. 012 del 28 de agosto del 2009 derogó el Acuerdo del Consejo Superior No. 019 de 2002 norma que preceptuó en su artículo primero lo siguiente: “para la asignación y reconocimiento de bonificaciones de puntos salariales por títulos, categorías, experiencia calificada, cargos académico-administrativos, desempeño en docencia y extensión y el reconocimiento de los puntos salariales asignados a la producción académica por los pares externos, en cumplimiento de lo dispuesto en el Decreto 1279 de 2002; se establece un Comité Interno de Asignación y Reconocimiento de Puntaje (…)”, el cual fue adicionado mediante el artículo primero del Acuerdo del Consejo Superior No.104 del 9 de diciembre del 2020.</p>
          <p style="margin-bottom: 10px;"><strong>E.</strong> Que el Acuerdo del Consejo Superior No. 012 de agosto 28 de 2009, en sus artículos 3 y 4, determina los requisitos que se deben tener en cuenta para el reconocimiento de los puntos por el desempeño destacado de las labores de docencia y extensión y la experiencia calificada y, determina el reconocimiento de los puntos por actividades de dirección académico-administrativa, dependiendo del resultado de la evaluación del desempeño.</p>
          <p style="margin-bottom: 10px;"><strong>F.</strong> Que el Comité Interno de Asignación y Reconocimiento de Puntaje (C.I.A.R.P), conforme lo dispuesto en el Acuerdo del Consejo Superior No.012 de 2009, y Acuerdo del Consejo Superior No.104 del 9 de diciembre del 2020, en sesiones del CIARP según consta en <strong>${actasStr}</strong>, aprobó la asignación de puntos salariales a docentes de planta de la Universidad del Quindío, ${razon}, entre ellos: <strong>${docentesList.map(d => d.docente.toUpperCase()).join(', ')}</strong>.</p>
          ${isProductividad ? `<p style="margin-bottom: 10px;"><strong>G.</strong> Que el parágrafo III del Artículo 12 del Decreto 1279 del año 2002, establece que: "Las modificaciones salariales tienen efecto a partir de la fecha en que el Comité Interno de Asignación y Reconocimiento de Puntaje, o el órgano que haga sus veces en cada una de las universidades, expida el acto formal de reconocimiento, de los puntos salariales asignados en el marco del presente Decreto".</p>` : ''}
          <p style="margin-bottom: 10px;"><strong>${isProductividad ? 'H' : 'G'}.</strong> Que se hace necesario la expedición del correspondiente acto administrativo por medio del cual se asignen y reconozcan los correspondientes puntos salariales.</p>
          <p style="margin-bottom: 10px;"><strong>${isProductividad ? 'I' : 'H'}.</strong> Que, en mérito de lo expuesto, el Rector,</p>
 
          <h3 style="text-align: center; margin-top: 20px; font-size: 14px;">RESUELVE</h3>
          
          ${articulosHtml}

          <h3 style="text-align: center; margin-top: 30px; font-size: 14px;">NOTIFÍQUESE, COMUNÍQUESE Y CÚMPLASE</h3>
 
          <p style="margin-top: 20px;">Dada en Armenia (Quindío) a los _______________________.</p>
 
        </div>
 
        <div class="firma" style="margin-top: 50px; font-family: Arial, sans-serif;">
          __________________________________<br/>
          <strong>LUIS FERNANDO POLANÍA OBANDO</strong><br/>
          Rector
        </div>
 
        <div style="margin-top: 50px; font-family: Arial, sans-serif; font-size: 10px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border: 1px solid #000; background: #f9f9f9;">
              <th style="border: 1px solid #000; padding: 5px; width: 15%;">ROLES</th>
              <th style="border: 1px solid #000; padding: 5px; width: 45%;">NOMBRES Y APELLIDOS</th>
              <th style="border: 1px solid #000; padding: 5px; width: 40%;">FIRMA</th>
            </tr>
            <tr style="border: 1px solid #000;">
              <td style="border: 1px solid #000; padding: 5px; font-weight: bold;">PROYECTÓ<br/>ELABORÓ</td>
              <td style="border: 1px solid #000; padding: 5px;">Lina Marcela Cruz Calderón / Técnico Oficina de Asuntos Profesorales</td>
              <td style="border: 1px solid #000; padding: 5px;"></td>
            </tr>
            <tr style="border: 1px solid #000;">
              <td style="border: 1px solid #000; padding: 5px; font-weight: bold;">REVISÓ<br/>Jurídica</td>
              <td style="border: 1px solid #000; padding: 5px;">Víctor Alfonso Vélez Muñoz / Jefe Oficina Asesora Jurídica</td>
              <td style="border: 1px solid #000; padding: 5px;"></td>
            </tr>
            <tr style="border: 1px solid #000;">
              <td style="border: 1px solid #000; padding: 5px; font-weight: bold;">APROBÓ</td>
              <td style="border: 1px solid #000; padding: 5px;">Luz Amparo Celis Buriticá / Jefe Oficina de Asuntos Profesorales</td>
              <td style="border: 1px solid #000; padding: 5px;"></td>
            </tr>
          </table>
          <p style="text-align: justify; margin-top: 8px; font-style: italic; color: #555;">Los arriba firmantes declaramos que hemos revisado el presente documento y soportes y lo encontramos ajustado en términos técnicos y administrativos; así como a las normas y disposiciones legales vigentes y por lo tanto, bajo nuestra responsabilidad, lo presentamos para la firma del Rector de la institución.</p>
        </div>
      </div>
      `;
    }).join('');
  } else if (tipo === 'resolucion_ascenso_cei') {
    // ── Resolución de Ascenso CEI (Múltiples docentes) ──────────────────────
    const ascensos = Array.isArray(sol) ? sol : [sol];
    const firstInfo = ascensos.length > 0 ? (() => { try { return JSON.parse(ascensos[0].notas || '{}'); } catch { return {}; } })() : {};
    const actaCei = ascensos.length > 0 ? (ascensos[0].acta_ciarp || firstInfo.acta_cei || '[NÚMERO ACTA CEI]').trim() : '[NÚMERO ACTA CEI]';
    const n2w = ['CERO', 'PRIMERO', 'SEGUNDO', 'TERCERO', 'CUARTO', 'QUINTO', 'SEXTO', 'SÉPTIMO', 'OCTAVO', 'NOVENO', 'DÉCIMO', 'UNDÉCIMO', 'DUODÉCIMO', 'DECIMOTERCERO', 'DECIMOCUARTO', 'DECIMOQUINTO'];

    titulo = 'Resolución Rectoral de Ascensos en el Escalafón (CEI)';
    contenido = `
      <div style="font-family: Arial, sans-serif;">
        <div class="header" style="text-align: center; margin-bottom: 30px;">
          <h3 style="margin-bottom: 5px; font-size: 16px;">RECTORÍA</h3>
          <h3 style="margin-bottom: 5px; font-size: 16px;">RESOLUCIÓN No. _________</h3>
          <p style="margin-top: 0; font-size: 14px;">( ____________ )</p>
          <p style="font-weight: bold; margin-top: 20px; font-size: 14px; text-align: center; text-transform: uppercase;">
            "POR MEDIO DE LA CUAL SE RECONOCEN ASCENSOS EN EL ESCALAFÓN DE DOCENTES DE LA UNIVERSIDAD DEL QUINDÍO"
          </p>
        </div>
        <div class="body-text" style="text-align: justify; font-size: 12px; line-height: 1.5;">
          <p>El Rector de la Universidad del Quindío, de conformidad con sus facultades legales y estatutarias, especialmente las conferidas en los Acuerdos del Consejo Superior Nos. 121 del 28 de septiembre de 2021, 005 del 28 de febrero de 2005, 012 del 28 de agosto de 2009, modificado por el acuerdo 104 del 9 de diciembre del 2020 y 133 del 14 de junio del año 2022, y,</p>

          <h3 style="text-align: center; margin-top: 20px; font-size: 14px;">CONSIDERANDO:</h3>

          <p style="margin-bottom: 10px;"><strong>A.</strong> Que la Autonomía Universitaria es una facultad reconocida mediante la Constitución Política, que se traduce en el reconocimiento que el Constituyente hizo de la libertad jurídica que tienen las instituciones de Educación Superior reconocidas como Universidades, para autogobernarse y auto determinarse, en el marco de las limitaciones que el mismo ordenamiento superior y la Ley les señalen.</p>
          <p style="margin-bottom: 10px;"><strong>B.</strong> Que, con fundamento en el Derecho Universitario, el sentido de la autonomía no es otro que brindar a las universidades la discrecionalidad necesaria para desarrollar el contenido académico, administrativo y financiero de acuerdo con las múltiples capacidades creativas de aquellas, con el límite que encuentra dicha autonomía en el orden público, el interés general y el bien común.</p>
          <p style="margin-bottom: 10px;"><strong>C.</strong> Que el Decreto No. 1279 de 2002, establece el régimen salarial y prestacional de los docentes de las universidades estatales, y en sus artículos 6°, 12°, 17° y 18°, consagra los factores que deben tenerse en cuenta para determinar los puntos salariales que constituyen la base de la remuneración mensual de los docentes asimilados a tal norma.</p>
          <p style="margin-bottom: 10px;"><strong>D.</strong> Que el Consejo Superior de la Universidad del Quindío mediante Acuerdo No. 121 del 28 de septiembre de 2021 estableció el Comité de Evaluación Institucional (C.E.I.), órgano encargado de estudiar, evaluar y recomendar la aprobación de los ascensos en el escalafón de los docentes de planta de la Universidad del Quindío, de conformidad con lo establecido en el Decreto 1279 de 2002.</p>
          <p style="margin-bottom: 10px;"><strong>E.</strong> Que el artículo 70 del Decreto 1279 de 2002 señala los requisitos para el ascenso en el escalafón docente, indicando los títulos, la experiencia y la producción académica o artística requeridos para pasar de una categoría a otra.</p>
          <p style="margin-bottom: 10px;"><strong>F.</strong> Que el Comité de Evaluación Institucional (C.E.I.), conforme lo dispuesto en el Acuerdo del Consejo Superior No. 121 del 28 de septiembre de 2021, en sesión del <strong>[FECHA DE SESIÓN CEI]</strong> según consta en Acta No. <strong>${actaCei}</strong>, aprobó el ascenso en el escalafón docente de los profesores relacionados en la parte resolutiva del presente acto administrativo.</p>
          <p style="margin-bottom: 10px;"><strong>G.</strong> Que se hace necesario la expedición del correspondiente acto administrativo por medio del cual se reconozcan dichos ascensos en el escalafón docente.</p>
          <p style="margin-bottom: 10px;"><strong>H.</strong> Que, en mérito de lo expuesto, el Rector,</p>

          <h3 style="text-align: center; margin-top: 20px; font-size: 14px;">RESUELVE</h3>

          ${ascensos.map((s, index) => {
            const info = (() => { try { return JSON.parse(s.notas || '{}'); } catch { return {}; } })();
            const catActual  = (info.categoria_actual || 'ASISTENTE').toUpperCase();
            const catNueva   = (info.categoria_nueva   || '').toUpperCase() || (() => {
              const mapa = { AUXILIAR: 'ASISTENTE', ASISTENTE: 'ASOCIADO', ASOCIADO: 'TITULAR' };
              return mapa[catActual] || '[NUEVA CATEGORÍA]';
            })();
            const dedicacion = info.dedicacion || 'tiempo completo';
            const escolaridad = info.escolaridad || '';
            const esMujer = /a$/i.test((s.docente || '').split(' ')[0]) || /a$/i.test(s.docente || '');
            const ordinal = index + 1 < n2w.length ? n2w[index + 1] : `VIGÉSIMO`;

            return `<p style="margin-top: 15px;"><strong>ARTÍCULO ${ordinal}:</strong> Reconocer el ascenso en el escalafón docente de l${esMujer ? 'a profesora' : 'el profesor'} <strong>${(s.docente || '').toUpperCase()}</strong>, identificad${esMujer ? 'a' : 'o'} con cédula de ciudadanía No. ${s.cedula || '_________'} de _________; con dedicación de ${dedicacion.toLowerCase()}${escolaridad ? `, con título de ${escolaridad}` : ''}, del Programa de ${cleanProgramaName(s.programa).toUpperCase()}, de la categoría de Profesor <strong>${catActual}</strong> a la categoría de Profesor <strong>${catNueva}</strong>, de conformidad con lo establecido en el Decreto 1279 de 2002 y el trabajo presentado denominado: <em>"${s.titulo || '[TÍTULO DEL TRABAJO]'}"</em>.</p>`;
          }).join('')}

          <p><strong>ARTÍCULO ${ascensos.length + 1 < n2w.length ? n2w[ascensos.length + 1] : 'SIGUIENTE'}:</strong> Autorícese a la Vicerrectoría Administrativa y a la Dirección de Gestión Humana, para que tomen las medidas administrativas y financieras necesarias, que permitan el cumplimiento del presente acto administrativo, una vez quede ejecutoriado.</p>
          <p><strong>ARTÍCULO ${ascensos.length + 2 < n2w.length ? n2w[ascensos.length + 2] : 'SIGUIENTE_DOS'}:</strong> La presente resolución rige a partir de la fecha de su expedición y contra ella procede el Recurso de Reposición, el cual deberá ser presentado dentro de los diez (10) días hábiles siguientes al acto de su notificación.</p>

          <h3 style="text-align: center; margin-top: 30px; font-size: 14px;">NOTIFÍQUESE, COMUNÍQUESE Y CÚMPLASE</h3>
          <p style="margin-top: 20px;">Dada en Armenia (Quindío) a los _______________________.</p>
        </div>

        <div class="firma" style="margin-top: 50px; font-family: Arial, sans-serif;">
          __________________________________<br/>
          <strong>LUIS FERNANDO POLANÍA OBANDO</strong><br/>
          Rector
        </div>

        <div style="margin-top: 50px; font-family: Arial, sans-serif; font-size: 10px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border: 1px solid #000; background: #f9f9f9;">
              <th style="border: 1px solid #000; padding: 5px; width: 15%;">ROLES</th>
              <th style="border: 1px solid #000; padding: 5px; width: 45%;">NOMBRES Y APELLIDOS</th>
              <th style="border: 1px solid #000; padding: 5px; width: 40%;">FIRMA</th>
            </tr>
            <tr style="border: 1px solid #000;">
              <td style="border: 1px solid #000; padding: 5px; font-weight: bold;">PROYECTÓ<br/>ELABORÓ</td>
              <td style="border: 1px solid #000; padding: 5px;">Lina Marcela Cruz Calderón / Técnico Oficina de Asuntos Profesorales</td>
              <td style="border: 1px solid #000; padding: 5px;"></td>
            </tr>
            <tr style="border: 1px solid #000;">
              <td style="border: 1px solid #000; padding: 5px; font-weight: bold;">REVISÓ<br/>Jurídica</td>
              <td style="border: 1px solid #000; padding: 5px;">Víctor Alfonso Vélez Muñoz / Jefe Oficina Asesora Jurídica</td>
              <td style="border: 1px solid #000; padding: 5px;"></td>
            </tr>
            <tr style="border: 1px solid #000;">
              <td style="border: 1px solid #000; padding: 5px; font-weight: bold;">APROBÓ</td>
              <td style="border: 1px solid #000; padding: 5px;">Luz Amparo Celis Buriticá / Jefe Oficina de Asuntos Profesorales</td>
              <td style="border: 1px solid #000; padding: 5px;"></td>
            </tr>
          </table>
          <p style="text-align: justify; margin-top: 8px; font-style: italic; color: #555;">Los arriba firmantes declaramos que hemos revisado el presente documento y soportes y lo encontramos ajustado en términos técnicos y administrativos; así como a las normas y disposiciones legales vigentes y por lo tanto, bajo nuestra responsabilidad, lo presentamos para la firma del Rector de la institución.</p>
        </div>
      </div>
    `;



  } else if (tipo === 'resolucion_pares') {
    titulo = 'Resolución Designación de Pares';
    contenido = `
      <div class="header" style="text-align: center; margin-bottom: 40px;">
        <img src="${logoUq}" style="width: 200px; margin-bottom: 20px;" />
        <h2 style="margin-bottom: 5px;">RESOLUCIÓN No. _________</h2>
        <p style="margin-top: 0; color: #555;">( ${fechaStr} )</p>
        <p style="font-weight: bold; margin-top: 20px; font-size: 15px;">"Por la cual se designan pares evaluadores externos y se ordena el reconocimiento de honorarios"</p>
      </div>
      <div class="body-text" style="text-align: justify;">
        <p><strong>LA JEFATURA DE ASUNTOS PROFESORALES,</strong> en uso de sus atribuciones,</p>
        <h3 style="text-align: center; margin-top: 30px;">RESUELVE:</h3>
        <p><strong>ARTÍCULO PRIMERO:</strong> Designar como pares evaluadores externos para el producto académico <strong>"${sol.titulo}"</strong> del docente <strong>${sol.docente}</strong>, a los siguientes académicos:</p>
        <ul style="margin: 20px 40px;">
          <!-- BUCLE DE PARES EXTERNOS: Mapea la lista de evaluadores externos asignados (pares_ext)
               generando elementos HTML de lista con su respectiva universidad de origen. -->
          ${(sol.pares_ext || []).map(p => `<li><strong>${p.nombre}</strong> (${p.univ})</li>`).join('') || '<li><em>Pares por definir</em></li>'}
        </ul>
        <p><strong>ARTÍCULO SEGUNDO:</strong> Autorizar el pago de honorarios por concepto de evaluación académica una vez se reciba a satisfacción el concepto técnico correspondiente, según las tarifas vigentes estipuladas por la Universidad.</p>
      </div>
      <div class="firma" style="text-align: center; margin-top: 60px;">
        <br/><br/><br/><br/>
        __________________________________<br/>
        <strong>Jefatura de Asuntos Profesorales</strong><br/>
      </div>
    `;
  } else if (tipo === 'notificacion') {
    titulo = 'Notificación de Productividad al Docente';
    contenido = `
      <div class="header">
        <img src="${logoUq}" style="width: 180px; margin-bottom: 20px;" />
        <div style="float: right; text-align: right; color: #555; font-size: 14px;">
          Armenia, ${fechaStr}
        </div>
        <div style="clear: both; margin-top: 30px;">
          <strong>PARA:</strong> ${sol.docente} (${sol.correo || 'docente@uniquindio.edu.co'})<br/>
          <strong>DE:</strong> Comité Interno de Asignación y Reconocimiento de Puntaje (CIARP)<br/>
          <strong>ASUNTO:</strong> Notificación oficial de asignación de puntos salariales
        </div>
      </div>
      <div class="body-text">
        <p>Respetado(a) profesor(a),</p>
        <p>Reciba un cordial saludo en nombre de la Universidad del Quindío.</p>
        <p>De manera atenta le informamos que su solicitud radicada bajo el identificador <strong>${sol.id}</strong> para el reconocimiento del producto académico denominado <strong>"${sol.titulo}"</strong> ha culminado satisfactoriamente su trámite legal y administrativo.</p>
        <p>Nos complace informarle que, tras agotar las instancias de evaluación estipuladas en el Decreto 1279 de 2002, se ha emitido Resolución favorable asignando <strong>${sol.pts_asig || sol.pts_sug || 0} puntos salariales</strong> a su hoja de vida académica. Esta decisión se encuentra soportada en el Acta <strong>${sol.acta_ciarp || 'N/A'}</strong> del CIARP.</p>
        <p>Agradecemos su valioso aporte a la investigación, la ciencia y la extensión, pilares fundamentales que enaltecen la excelencia académica de nuestra institución.</p>
      </div>
      <div class="firma">
        <br/><br/><br/>
        __________________________________<br/>
        <strong>Secretaría Técnica CIARP</strong><br/>
        Oficina de Asuntos Profesorales<br/>
        Universidad del Quindío
      </div>
    `;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>${titulo}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&family=Merriweather:ital,wght@0,400;0,700;1,400&display=swap');
          body { 
            font-family: 'Merriweather', serif; 
            line-height: 1.6; 
            padding: 40px; 
            color: #222; 
            max-width: 800px; 
            margin: 0 auto; 
            background: #fff;
          }
          .header strong { font-family: 'Montserrat', sans-serif; font-weight: 600; }
          h2, h3 { 
            font-family: 'Montserrat', sans-serif; 
            color: #004d2e; 
            font-weight: 700; 
          }
          p { margin-bottom: 15px; }
          .body-text { margin-top: 30px; font-size: 15px; }
          .firma { margin-top: 50px; font-family: 'Montserrat', sans-serif; font-size: 14px; }
          @media print {
            body { padding: 0; margin: 0; max-width: 100%; }
            @page { margin: 2.5cm; }
            button { display: none !important; }
          }
          .btn-print {
            position: fixed; top: 20px; right: 20px;
            background: #004d2e; color: #fff; border: none; padding: 10px 20px;
            border-radius: 6px; font-family: 'Montserrat', sans-serif; font-weight: 600;
            cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .btn-print:hover { background: #00331e; }
        </style>
      </head>
      <body>
        <button class="btn-print" onclick="window.print()">Imprimir / Guardar como PDF</button>
        ${contenido}
      </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const v = window.open(url, '_blank');
  if(!v) {
    alert('Por favor habilite las ventanas emergentes (pop-ups) para generar el PDF.');
  }
}
