export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', variant = 'danger', onConfirm, onCancel }) {
  if (!open) return null;

  const variantStyles = {
    danger:  { bg: '#dc2626', hover: '#b91c1c' },
    primary: { bg: '#006B3F', hover: '#004d2d' },
    warning: { bg: '#f59e0b', hover: '#d97706' },
  };

  const vs = variantStyles[variant] || variantStyles.danger;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99998,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)',
      animation: 'fadeIn .15s ease both',
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,.2)',
        padding: '28px 32px 24px', maxWidth: 420, width: '90%',
        animation: 'fadeUp .2s ease both', fontFamily: "'Nunito', sans-serif",
      }}>
        <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 12 }}>
          {variant === 'danger' ? '⚠️' : variant === 'warning' ? '⚡' : 'ℹ️'}
        </div>
        <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, textAlign: 'center', color: '#1a1a1a' }}>
          {title}
        </h3>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 20px', background: '#f5f5f5', border: '1px solid #e5e7eb',
              borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#555',
              cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
              transition: 'background .15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#e5e7eb'}
            onMouseLeave={e => e.currentTarget.style.background = '#f5f5f5'}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '10px 24px', background: vs.bg, color: '#fff', border: 'none',
              borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: 'pointer',
              fontFamily: "'Nunito', sans-serif", transition: 'background .15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = vs.hover}
            onMouseLeave={e => e.currentTarget.style.background = vs.bg}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
