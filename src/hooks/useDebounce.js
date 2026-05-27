/**
 * useDebounce.js — Hook de debounce para entradas de búsqueda
 *
 * ISO 25010 Eficiencia de Rendimiento §4.8 [P3]:
 * Reduce llamadas innecesarias a Supabase/filtros mientras el usuario escribe.
 *
 * Uso:
 *   const debouncedQuery = useDebounce(query, 300);
 */
import { useState, useEffect } from 'react';

/**
 * @param {T} value   Valor a debouncear
 * @param {number} delay  Retraso en milisegundos (default 300 ms)
 * @returns {T} Valor estabilizado tras el retraso
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
