import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * vite.config.js
 *
 * Mejoras ISO 25010:
 * - Code splitting manual por dominio [P4]
 * - Source maps en producción (para Sentry/análisis) [M4]
 * - Tamaño de chunk warning aumentado con justificación
 */
export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  },

  build: {
    // Source maps en producción para análisis de errores
    sourcemap: true,

    // Dividir el bundle en chunks lógicos para carga lazy eficiente
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom'],
          // Gráficas — cargado solo en Reportes
          'vendor-recharts': ['recharts'],
          // Excel/XLSX — solo en importación/exportación
          'vendor-xlsx': ['xlsx'],
        },
      },
    },

    // Alertar chunks > 600 KB (justificado por recharts y xlsx)
    chunkSizeWarningLimit: 600,
  },

  // Tests con Vitest
  test: {
    globals:     true,
    environment: 'jsdom',
    setupFiles:  ['./src/tests/setup.js'],
    exclude:     ['**/node_modules/**', '**/dist/**', '**/backend/**'],
  },
});
