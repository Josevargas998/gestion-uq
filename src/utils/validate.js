/**
 * validate.js — Utilidad de validación de entradas
 *
 * ISO 25010:
 * - Seguridad → Integridad [S1]: previene datos malformados en formularios
 * - Fiabilidad → Madurez   [R3]: captura errores antes de llegar a Supabase
 *
 * Uso:
 *   import { validateCedula, validateCorreo, sanitizeText } from '../utils/validate';
 */

// ─────────────────────────────────────────────
// CÉDULA / IDENTIFICACIÓN
// ─────────────────────────────────────────────

/**
 * Valida que una cédula colombiana sea numérica y tenga entre 6 y 12 dígitos.
 * @param {string|number} cedula
 * @returns {{ valid: boolean, message: string }}
 */
export function validateCedula(cedula) {
  const s = String(cedula ?? '').trim();
  if (!s) return { valid: false, message: 'La cédula es obligatoria.' };
  if (!/^\d+$/.test(s)) return { valid: false, message: 'La cédula solo debe contener dígitos.' };
  if (s.length < 6)  return { valid: false, message: 'La cédula debe tener al menos 6 dígitos.' };
  if (s.length > 12) return { valid: false, message: 'La cédula no puede superar 12 dígitos.' };
  return { valid: true, message: '' };
}

// ─────────────────────────────────────────────
// CORREO ELECTRÓNICO
// ─────────────────────────────────────────────

/**
 * Valida formato básico de correo electrónico (RFC 5322 simplificado).
 * @param {string} correo
 * @param {{ required?: boolean }} [opts]
 * @returns {{ valid: boolean, message: string }}
 */
export function validateCorreo(correo, { required = false } = {}) {
  const s = String(correo ?? '').trim();
  if (!s) {
    if (required) return { valid: false, message: 'El correo es obligatorio.' };
    return { valid: true, message: '' }; // vacío permitido si no es requerido
  }
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!re.test(s)) return { valid: false, message: 'El correo no tiene un formato válido.' };
  if (s.length > 100) return { valid: false, message: 'El correo es demasiado largo (máx 100 caracteres).' };
  return { valid: true, message: '' };
}

// ─────────────────────────────────────────────
// TEXTO LIBRE
// ─────────────────────────────────────────────

/**
 * Valida que un campo de texto cumpla restricciones de longitud.
 * @param {string} value
 * @param {{ label?: string, required?: boolean, min?: number, max?: number }} opts
 * @returns {{ valid: boolean, message: string }}
 */
export function validateText(value, { label = 'El campo', required = false, min = 0, max = Infinity } = {}) {
  const s = String(value ?? '').trim();
  if (!s) {
    if (required) return { valid: false, message: `${label} es obligatorio.` };
    return { valid: true, message: '' };
  }
  if (s.length < min) return { valid: false, message: `${label} debe tener al menos ${min} caracteres.` };
  if (s.length > max) return { valid: false, message: `${label} no puede superar ${max} caracteres.` };
  return { valid: true, message: '' };
}

// ─────────────────────────────────────────────
// PUNTOS NUMÉRICOS
// ─────────────────────────────────────────────

/**
 * Valida que un valor sea un número no negativo.
 * @param {string|number} value
 * @param {{ label?: string, max?: number }} opts
 * @returns {{ valid: boolean, message: string }}
 */
export function validatePuntos(value, { label = 'Los puntos', max = 10000 } = {}) {
  if (value === '' || value === null || value === undefined) {
    return { valid: true, message: '' }; // puntos opcionales
  }
  const n = Number(value);
  if (isNaN(n))  return { valid: false, message: `${label} deben ser un número.` };
  if (n < 0)     return { valid: false, message: `${label} no pueden ser negativos.` };
  if (n > max)   return { valid: false, message: `${label} no pueden superar ${max}.` };
  return { valid: true, message: '' };
}

// ─────────────────────────────────────────────
// SANITIZACIÓN
// ─────────────────────────────────────────────

/**
 * Elimina caracteres peligrosos para prevenir XSS básico.
 * Reemplaza < > & " ' con entidades HTML.
 * @param {string} text
 * @returns {string}
 */
export function sanitizeText(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Elimina caracteres de control y espacios redundantes de un string.
 * @param {string} text
 * @returns {string}
 */
export function cleanText(text) {
  return String(text ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, '') // caracteres de control
    .replace(/\s+/g, ' ')                   // espacios múltiples → uno
    .trim();
}

// ─────────────────────────────────────────────
// VALIDACIÓN DE SOLICITUD COMPLETA
// ─────────────────────────────────────────────

/**
 * Valida los campos mínimos de una solicitud antes de enviarla a Supabase.
 * @param {object} sol  objeto solicitud (campos camelCase)
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export function validateSolicitud(sol) {
  const errors = {};

  const cedula = validateCedula(sol.cedula);
  if (!cedula.valid) errors.cedula = cedula.message;

  const docente = validateText(sol.docente, { label: 'Nombre del docente', required: true, max: 200 });
  if (!docente.valid) errors.docente = docente.message;

  const titulo = validateText(sol.titulo, { label: 'Título', required: true, max: 500 });
  if (!titulo.valid) errors.titulo = titulo.message;

  const correo = validateCorreo(sol.correo);
  if (!correo.valid) errors.correo = correo.message;

  const pts = validatePuntos(sol.pts_sug, { label: 'Puntos sugeridos' });
  if (!pts.valid) errors.pts_sug = pts.message;

  return { valid: Object.keys(errors).length === 0, errors };
}
