/**
 * ToastContainer.jsx — Notificaciones flotantes
 *
 * Cambios ISO 25010:
 * - role="alert" + aria-live="assertive/polite" para lectores de pantalla [U11]
 * - aria-label en botón de cierre [U9]
 * - Animación de salida al cerrar
 */
import { useNotification } from '../context/NotificationContext';

const TOAST_STYLES = {
  success: { bg: '#e6f5ee', border: '#006B3F', icon: '✅', color: '#006B3F' },
  error:   { bg: '#fde8e8', border: '#dc2626', icon: '❌', color: '#dc2626' },
  warning: { bg: '#fffbeb', border: '#f59e0b', icon: '⚠️', color: '#92400e' },
  info:    { bg: '#e7f1fb', border: '#1a5fa8', icon: 'ℹ️', color: '#1a5fa8' },
};

export default function ToastContainer() {
  const { toasts, removeToast } = useNotification();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notificaciones"
      style={{
        position: 'fixed', top: 16, right: 16, zIndex: 99999,
        display: 'flex', flexDirection: 'column', gap: 8,
        maxWidth: 380, width: 'calc(100vw - 32px)',
      }}
    >
      {toasts.map(t => {
        const s = TOAST_STYLES[t.type] || TOAST_STYLES.info;
        return (
          <div
            key={t.id}
            role={t.type === 'error' ? 'alert' : 'status'}
            aria-live={t.type === 'error' ? 'assertive' : 'polite'}
            aria-atomic="true"
            style={{
              background: '#fff',
              borderLeft: `5px solid ${s.border}`,
              borderRadius: 10,
              boxShadow: '0 8px 30px rgba(0,0,0,.12)',
              padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 10,
              animation: 'slideInRight .3s ease both',
              fontFamily: "'Nunito', sans-serif",
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 18 }}>{s.icon}</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#333' }}>
              {t.message}
            </span>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              aria-label={`Cerrar notificación: ${t.message}`}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 18, color: '#999', padding: '2px 6px', lineHeight: 1,
                borderRadius: 4,
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#666'}
              onMouseLeave={e => e.currentTarget.style.color = '#999'}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
