/**
 * logger.js — Utilidad de logging centralizada
 *
 * En producción solo se emiten errores. En desarrollo se emite todo.
 * Importar este módulo en lugar de usar console directamente.
 */
const isDev = import.meta.env.DEV;

const noop = () => {};

export const logger = {
  /** Información general — solo desarrollo */
  log: isDev ? console.log.bind(console, '[LOG]') : noop,
  /** Advertencias — solo desarrollo */
  warn: isDev ? console.warn.bind(console, '[WARN]') : noop,
  /** Información relevante — solo desarrollo */
  info: isDev ? console.info.bind(console, '[INFO]') : noop,
  /**
   * Errores — siempre activos (producción y desarrollo).
   * Ideal para errores de red, fallos de Supabase, etc.
   */
  error: console.error.bind(console, '[ERROR]'),
};
