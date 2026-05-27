

/**
 * Genera el HTML del cuerpo del correo estilo CIARP (estética heredada del script de Python).
 */
export function generarHtmlCIARP(sol) {
  const productos = Array.isArray(sol)
    ? sol
    : [{ tipo: sol.tipo, titulo: sol.titulo, pts_asig: sol.pts_asig ?? sol.pts_sug ?? 0 }];

  const docente = Array.isArray(sol) ? sol[0]?.docente : sol.docente;
  const programa = Array.isArray(sol) ? sol[0]?.programa : sol.programa;
  const facultad  = Array.isArray(sol) ? sol[0]?.facultad : sol.facultad;
  const acta = Array.isArray(sol) ? sol[0]?.acta_ciarp : sol.acta_ciarp;

  const sesionNum = acta || '___';
  const sesionFecha = '___ de ______'; // No tenemos la fecha en la solicitud actualmente

  const nombre_completo = (docente || 'DOCENTE NO ESPECIFICADO').toUpperCase();
  const texto_programa = programa ? `Programa de ${programa}` : 'Programa sin especificar';
  const texto_facultad = facultad ? `Facultad de ${facultad}` : 'Facultad sin especificar';

  const tabla_completa = productos.map(p => `
    <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: center; vertical-align: top; font-weight: bold;">
            ${(p.tipo || '—').toUpperCase()}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: center; vertical-align: top;">
            ${p.pts_asig ?? p.pts_sug ?? 0} Puntos
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: justify; vertical-align: top;">
            ${p.titulo || '—'}
        </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comunicado CIARP</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9f9f9;">
    <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background-color: #1e5631; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">CIARP</h1>
            <p style="margin: 5px 0 0; font-size: 16px;">Comité Interno de Asignación y Reconocimiento de Puntaje</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
            <h2 style="color: #1e5631; margin-top: 0; text-align: center;">Reconocimiento de Bonificaciones</h2>
            
            <p style="margin-bottom: 20px; text-align: justify;">Docente<br>
            <strong>${nombre_completo}</strong><br>
            ${texto_programa}<br>
            ${texto_facultad}</p>
            
            <p style="margin-bottom: 20px; text-align: justify;">Cordial saludo,</p>
            
            <p style="margin-bottom: 20px; text-align: justify;">Dando cumplimiento a la directriz emitida por la jefe de la Oficina de Asuntos Profesorales, me permito informarle que, en sesión No. ${sesionNum} del Comité Interno de Asignación y Reconocimiento de Puntaje (CIARP), las solicitudes de bonificación, presentadas por usted, fueron consideradas en el mismo y aprobadas como se relaciona a continuación:</p>
            
            <div style="margin: 25px 0;">
                <table style="width: 100%; border-collapse: collapse; background-color: #f5f9f6; border-radius: 6px; overflow: hidden;">
                    <thead>
                        <tr style="background-color: #2a7d47; color: white;">
                            <th style="padding: 12px; text-align: center; width: 20%; font-weight: bold;">Tipo</th>
                            <th style="padding: 12px; text-align: center; width: 20%; font-weight: bold;">Puntos</th>
                            <th style="padding: 12px; text-align: center; font-weight: bold;">Título de Producto Académico</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tabla_completa}
                    </tbody>
                </table>
            </div>
            
            <p style="margin-bottom: 20px; text-align: justify;">
Por lo anteriormente mencionado, se le estará notificando posteriormente del correspondiente acto administrativo.
</p>

<p style="margin-bottom: 0; text-align: justify;">
Cualquier inquietud al respecto, estaremos atentos.
</p>

<p style="margin-bottom: 0; text-align: justify;">Atentamente,</p>

<!-- Footer -->
<div style="background-color: #f0f7f2; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0; margin-top: 20px;">
    <p style="margin: 0; color: #1e5631; font-weight: bold;"><br>
       Luz Amparo Celis Buriticá<br>
       Jefe Oficina de Asuntos Profesorales
    </p>
</div>
        </div>
    </div>
</body>
</html>
  `;
}

// URL del Google Apps Script para envío de correos (heredado de la integración con Sheets)
const GAS_MAIL_URL = 'https://script.google.com/macros/s/AKfycbyhMH8Gc2VavITlhBc3ktz4no6r5houzf0wnnlXlwbGdCiVBk6LBxZdasdxX6k0q_ov/exec';


/**
 * Envía el correo de notificación CIARP vía Google Apps Script.
 * En modo test, sobreescribe el destinatario con el correo de prueba.
 */
export async function enviarNotificacionCIARP({ sol, correoPrueba = null }) {
  const docente = Array.isArray(sol) ? sol[0]?.docente : sol.docente;
  const correoDocente = Array.isArray(sol) ? sol[0]?.correo : sol.correo;
  const destinatario  = correoPrueba || correoDocente || '';
  const htmlBody      = generarHtmlCIARP(sol);

  if (!destinatario) {
    throw new Error('No hay correo destinatario definido.');
  }

  const payload = {
    action: 'enviar_correo_html',
    to_email: destinatario,
    subject: 'CIARP · Reconocimiento de Bonificaciones Salariales – Universidad del Quindío',
    html_body: htmlBody
  };

  const res = await fetch(GAS_MAIL_URL + '?action=enviar_correo_html', {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error('Error al enviar la petición al servidor de Google.');
  }

  return await res.text();
}

/**
 * Abre el cuerpo del correo en una ventana nueva (previsualización sin enviar).
 */
export function previsualizarCorreoCIARP(sol) {
  const html = generarHtmlCIARP(sol);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  window.open(url, '_blank');
}
