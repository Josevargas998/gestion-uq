/**
 * validate.test.js — Tests unitarios para src/utils/validate.js
 * ISO 25010 Mantenibilidad §4.9 [M4] — Cobertura de utilidades críticas
 *
 * Ejecutar: npx vitest run
 */
import { describe, it, expect } from 'vitest';
import {
  validateCedula,
  validateCorreo,
  validateText,
  validatePuntos,
  sanitizeText,
  cleanText,
  validateSolicitud,
} from '../utils/validate';

// ─────────────────────────────────────────────────────────
// validateCedula
// ─────────────────────────────────────────────────────────
describe('validateCedula', () => {
  it('acepta cédula numérica válida de 8 dígitos', () => {
    expect(validateCedula('12345678').valid).toBe(true);
  });

  it('rechaza cédula vacía', () => {
    const r = validateCedula('');
    expect(r.valid).toBe(false);
    expect(r.message).toMatch(/obligatoria/i);
  });

  it('rechaza cédula con letras', () => {
    expect(validateCedula('123abc456').valid).toBe(false);
  });

  it('rechaza cédula menor a 6 dígitos', () => {
    expect(validateCedula('123').valid).toBe(false);
  });

  it('rechaza cédula mayor a 12 dígitos', () => {
    expect(validateCedula('1234567890123').valid).toBe(false);
  });

  it('acepta cédula numérica como número (no solo string)', () => {
    expect(validateCedula(1094970478).valid).toBe(true);
  });

  it('acepta límite inferior exacto de 6 dígitos', () => {
    expect(validateCedula('123456').valid).toBe(true);
  });

  it('acepta límite superior exacto de 12 dígitos', () => {
    expect(validateCedula('123456789012').valid).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────
// validateCorreo
// ─────────────────────────────────────────────────────────
describe('validateCorreo', () => {
  it('acepta correo válido', () => {
    expect(validateCorreo('usuario@uniquindio.edu.co').valid).toBe(true);
  });

  it('acepta correo vacío si no es required', () => {
    expect(validateCorreo('').valid).toBe(true);
  });

  it('rechaza correo vacío cuando required=true', () => {
    const r = validateCorreo('', { required: true });
    expect(r.valid).toBe(false);
    expect(r.message).toMatch(/obligatorio/i);
  });

  it('rechaza correo sin @', () => {
    expect(validateCorreo('invalido.com').valid).toBe(false);
  });

  it('rechaza correo sin dominio', () => {
    expect(validateCorreo('usuario@').valid).toBe(false);
  });

  it('rechaza correo con espacios', () => {
    expect(validateCorreo('us er@correo.com').valid).toBe(false);
  });

  it('rechaza correo de más de 100 caracteres', () => {
    const largo = `${'a'.repeat(90)}@correo.com`;
    expect(validateCorreo(largo).valid).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────
// validateText
// ─────────────────────────────────────────────────────────
describe('validateText', () => {
  it('acepta texto válido dentro de límites', () => {
    expect(validateText('Título válido', { max: 100 }).valid).toBe(true);
  });

  it('rechaza texto vacío si required=true', () => {
    expect(validateText('', { required: true }).valid).toBe(false);
  });

  it('acepta texto vacío si required=false', () => {
    expect(validateText('', { required: false }).valid).toBe(true);
  });

  it('rechaza texto que excede max', () => {
    expect(validateText('abcdef', { max: 3 }).valid).toBe(false);
  });

  it('rechaza texto más corto que min', () => {
    expect(validateText('ab', { min: 5 }).valid).toBe(false);
  });

  it('incluye el label en el mensaje de error', () => {
    const r = validateText('', { label: 'El título', required: true });
    expect(r.message).toContain('El título');
  });
});

// ─────────────────────────────────────────────────────────
// validatePuntos
// ─────────────────────────────────────────────────────────
describe('validatePuntos', () => {
  it('acepta valor positivo', () => {
    expect(validatePuntos(15).valid).toBe(true);
  });

  it('acepta 0', () => {
    expect(validatePuntos(0).valid).toBe(true);
  });

  it('acepta valor vacío (puntos opcionales)', () => {
    expect(validatePuntos('').valid).toBe(true);
    expect(validatePuntos(null).valid).toBe(true);
    expect(validatePuntos(undefined).valid).toBe(true);
  });

  it('rechaza valor negativo', () => {
    expect(validatePuntos(-1).valid).toBe(false);
  });

  it('rechaza texto no numérico', () => {
    expect(validatePuntos('abc').valid).toBe(false);
  });

  it('rechaza valor que supera max', () => {
    expect(validatePuntos(99999, { max: 1000 }).valid).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────
// sanitizeText
// ─────────────────────────────────────────────────────────
describe('sanitizeText', () => {
  it('escapa <, >, &, ", \'', () => {
    const result = sanitizeText('<script>alert("xss")</script>');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    expect(result).toContain('&lt;');
    expect(result).toContain('&gt;');
    expect(result).toContain('&quot;');
  });

  it('deja texto normal sin modificar', () => {
    expect(sanitizeText('Hola mundo')).toBe('Hola mundo');
  });

  it('maneja null sin lanzar error', () => {
    expect(() => sanitizeText(null)).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────
// cleanText
// ─────────────────────────────────────────────────────────
describe('cleanText', () => {
  it('elimina espacios redundantes', () => {
    expect(cleanText('  hola   mundo  ')).toBe('hola mundo');
  });

  it('elimina caracteres de control', () => {
    expect(cleanText('texto\u0000con\u001Fcontrol')).toBe('textoconcontrol');
  });

  it('maneja null sin lanzar error', () => {
    expect(() => cleanText(null)).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────
// validateSolicitud
// ─────────────────────────────────────────────────────────
describe('validateSolicitud', () => {
  const solicitudValida = {
    cedula:  '1094970478',
    docente: 'José Vargas',
    titulo:  'Artículo de investigación',
    correo:  'jvargas@uniquindio.edu.co',
    pts_sug: 15,
  };

  it('aprueba una solicitud con todos los campos válidos', () => {
    const r = validateSolicitud(solicitudValida);
    expect(r.valid).toBe(true);
    expect(Object.keys(r.errors)).toHaveLength(0);
  });

  it('detecta cédula inválida', () => {
    const r = validateSolicitud({ ...solicitudValida, cedula: 'abc' });
    expect(r.valid).toBe(false);
    expect(r.errors).toHaveProperty('cedula');
  });

  it('detecta docente vacío', () => {
    const r = validateSolicitud({ ...solicitudValida, docente: '' });
    expect(r.valid).toBe(false);
    expect(r.errors).toHaveProperty('docente');
  });

  it('detecta título vacío', () => {
    const r = validateSolicitud({ ...solicitudValida, titulo: '' });
    expect(r.valid).toBe(false);
    expect(r.errors).toHaveProperty('titulo');
  });

  it('detecta correo mal formateado', () => {
    const r = validateSolicitud({ ...solicitudValida, correo: 'no-es-correo' });
    expect(r.valid).toBe(false);
    expect(r.errors).toHaveProperty('correo');
  });

  it('detecta puntos negativos', () => {
    const r = validateSolicitud({ ...solicitudValida, pts_sug: -5 });
    expect(r.valid).toBe(false);
    expect(r.errors).toHaveProperty('pts_sug');
  });

  it('puede tener múltiples errores simultáneos', () => {
    const r = validateSolicitud({ cedula: '1', docente: '', titulo: '', correo: 'mal', pts_sug: -1 });
    expect(r.valid).toBe(false);
    expect(Object.keys(r.errors).length).toBeGreaterThan(1);
  });
});
