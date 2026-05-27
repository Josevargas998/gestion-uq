/**
 * helpers.test.js — Tests unitarios para funciones puras de helpers.js
 * ISO 25010 Fiabilidad → Madurez [R1-R2]
 *
 * Ejecutar: npx vitest run
 */
import { describe, it, expect } from 'vitest';
import { rutaLabel, buildTimeline, labelEtapa, badgeEtapa } from '../helpers';

// ─────────────────────────────────────────────────────────
// rutaLabel
// ─────────────────────────────────────────────────────────
describe('rutaLabel', () => {
  it('retorna etiqueta para ruta directo', () => {
    expect(rutaLabel('directo')).toBe('Directo al CIARP — sin evaluadores');
  });
  it('retorna etiqueta para ruta internos', () => {
    expect(rutaLabel('internos')).toBe('Pares internos (Consejo) + pares externos');
  });
  it('retorna etiqueta para ruta externos', () => {
    expect(rutaLabel('externos')).toBe('Solo pares evaluadores externos');
  });
  it('retorna etiqueta para informe_directo', () => {
    expect(rutaLabel('informe_directo')).toBe('Directo a informe — sin evaluadores');
  });
  it('retorna etiqueta para cei', () => {
    expect(rutaLabel('cei')).toBe('Directo al Comité de Escalafón (CEI)');
  });
  it('retorna la ruta original si no existe en el mapa', () => {
    expect(rutaLabel('ruta_desconocida')).toBe('ruta_desconocida');
  });
  it('maneja cadena vacía sin lanzar error', () => {
    expect(rutaLabel('')).toBe('');
  });
});

// ─────────────────────────────────────────────────────────
// labelEtapa
// ─────────────────────────────────────────────────────────
describe('labelEtapa', () => {
  it('retorna label para etapa clasificada', () => {
    expect(labelEtapa('clasificada')).toBe('Clasificada');
  });
  it('retorna label para pares_internos', () => {
    expect(labelEtapa('pares_internos')).toBe('Evaluación Interna');
  });
  it('retorna el id de la etapa si no existe', () => {
    expect(labelEtapa('etapa_invalida')).toBe('etapa_invalida');
  });
});

// ─────────────────────────────────────────────────────────
// badgeEtapa
// ─────────────────────────────────────────────────────────
describe('badgeEtapa', () => {
  it('retorna bb para clasificada', () => {
    expect(badgeEtapa('clasificada')).toBe('bb');
  });
  it('retorna bg para proyectar_resoluciones', () => {
    expect(badgeEtapa('proyectar_resoluciones')).toBe('bg');
  });
  it('retorna bgr por defecto para etapa desconocida', () => {
    expect(badgeEtapa('desconocida')).toBe('bgr');
  });
});

// ─────────────────────────────────────────────────────────
// buildTimeline
// ─────────────────────────────────────────────────────────
describe('buildTimeline', () => {
  const form = { fecha: '2026-05-19', tipo: 'revista_a1' };
  const tipo = { label: 'Artículo A1', ruta: 'directo' };

  it('retorna array con 3 entradas base', () => {
    const tl = buildTimeline(form, tipo);
    expect(tl).toHaveLength(3);
  });

  it('primer evento es recepción de solicitud', () => {
    const tl = buildTimeline(form, tipo);
    expect(tl[0].a).toBe('Solicitud recibida y firmada');
  });

  it('tercer evento contiene la clasificación con etiqueta del tipo', () => {
    const tl = buildTimeline(form, tipo);
    expect(tl[2].a).toContain('Artículo A1');
  });

  it('todos los eventos tienen campo f (fecha), a (acción), p (persona)', () => {
    const tl = buildTimeline(form, tipo);
    tl.forEach(ev => {
      expect(ev).toHaveProperty('f');
      expect(ev).toHaveProperty('a');
      expect(ev).toHaveProperty('p');
    });
  });

  it('maneja tipo null sin lanzar error', () => {
    expect(() => buildTimeline(form, null)).not.toThrow();
  });
});
