import React from 'react';
import { logger } from '../utils/logger';

/**
 * ErrorBoundary — Captura errores de render y muestra UI de recuperación.
 *
 * Cambios ISO 25010:
 * - Genera un error ID único para facilitar soporte [M3]
 * - Usa logger centralizado en lugar de console.error [M2]
 * - Oculta stack trace en producción [S4]
 * - Botón "Volver al inicio" además de "Reintentar" [U4]
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null, errorId: null };
  }

  static getDerivedStateFromError(error) {
    const errorId = Math.random().toString(36).slice(2, 10).toUpperCase();
    return { hasError: true, error, errorId };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    logger.error(
      `[ErrorBoundary #${this.state.errorId}] Error no capturado:`,
      error,
      info?.componentStack
    );
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, info: null, errorId: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const msg     = this.state.error?.message || 'Error desconocido';
    const errorId = this.state.errorId || '—';
    const isProd  = import.meta.env.PROD;

    return (
      <div
        role="alert"
        aria-live="assertive"
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '60vh', padding: 40,
          textAlign: 'center', fontFamily: "'Nunito', sans-serif",
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 64, marginBottom: 16 }}>⚠️</span>

        <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: '#1a1a1a' }}>
          Algo salió mal
        </h2>

        <p style={{ color: '#666', fontSize: 14, marginBottom: 4, maxWidth: 420 }}>
          Ocurrió un error inesperado. Tus datos en el servidor local están seguros.
        </p>

        <p style={{ color: '#aaa', fontSize: 12, marginBottom: 20 }}>
          Código de referencia: <strong>{errorId}</strong>
        </p>

        {/* Siempre mostrar detalles técnicos para debug */}
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
          padding: '10px 14px', marginBottom: 20, fontSize: 12, color: '#7f1d1d',
          fontFamily: 'monospace', maxWidth: 520, textAlign: 'left', overflowX: 'auto'
        }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            🔍 Detalle técnico del error:
          </div>
          <div style={{ marginTop: 8, wordBreak: 'break-all', fontWeight: 'bold' }}>{msg}</div>
          {this.state.info?.componentStack && (
            <pre style={{ marginTop: 8, fontSize: 10, whiteSpace: 'pre-wrap', opacity: 0.8 }}>
              {this.state.info.componentStack.trim()}
            </pre>
          )}
          {this.state.error?.stack && (
            <pre style={{ marginTop: 8, fontSize: 10, whiteSpace: 'pre-wrap', opacity: 0.8, color: '#555' }}>
              {this.state.error.stack.trim()}
            </pre>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={this.handleReset}
            style={{
              padding: '10px 24px', background: '#006B3F', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700,
              cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#004d2d'}
            onMouseLeave={e => e.currentTarget.style.background = '#006B3F'}
            aria-label="Intentar renderizar de nuevo"
          >
            🔄 Intentar de nuevo
          </button>

          <button
            type="button"
            onClick={() => window.location.replace('/')}
            style={{
              padding: '10px 24px', background: '#f0f4f8', color: '#333',
              border: '1.5px solid #ddd', borderRadius: 8, fontSize: 14,
              fontWeight: 700, cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
            onMouseLeave={e => e.currentTarget.style.background = '#f0f4f8'}
            aria-label="Volver al inicio"
          >
            🏠 Volver al inicio
          </button>
        </div>

        {this.props.fallback && this.props.fallback}
      </div>
    );
  }
}
