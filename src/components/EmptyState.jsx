/**
 * EmptyState.jsx — Componente reutilizable de estado vacío
 *
 * ISO 25010 Usabilidad §4.2 [U3]:
 * Guía al usuario cuando una lista no tiene resultados, en lugar de
 * mostrar una tabla en blanco sin contexto.
 *
 * Props:
 *   icon        {string}  Emoji o carácter (default "📭")
 *   title       {string}  Título del mensaje
 *   message     {string}  Descripción opcional
 *   action      {node}    Botón/acción opcional (ReactNode)
 *   compact     {boolean} Modo compacto (menos padding) — default false
 */
export default function EmptyState({
  icon    = '📭',
  title   = 'Sin resultados',
  message = 'No hay elementos para mostrar.',
  action  = null,
  compact = false,
}) {
  return (
    <div
      role="status"
      aria-label={title}
      style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        compact ? '24px 16px' : '56px 24px',
        textAlign:      'center',
        color:          'var(--text-secondary, #6b7280)',
        gap:            compact ? 8 : 12,
      }}
    >
      {/* Icono */}
      <span
        aria-hidden="true"
        style={{
          fontSize:      compact ? 36 : 52,
          lineHeight:    1,
          marginBottom:  compact ? 0 : 4,
          filter:        'grayscale(20%)',
          userSelect:    'none',
        }}
      >
        {icon}
      </span>

      {/* Título */}
      <p style={{
        margin:     0,
        fontSize:   compact ? 14 : 16,
        fontWeight: 700,
        color:      'var(--text-primary, #374151)',
      }}>
        {title}
      </p>

      {/* Descripción */}
      {message && (
        <p style={{
          margin:    0,
          fontSize:  compact ? 12 : 13,
          maxWidth:  360,
          lineHeight: 1.5,
        }}>
          {message}
        </p>
      )}

      {/* Acción opcional */}
      {action && (
        <div style={{ marginTop: compact ? 8 : 16 }}>
          {action}
        </div>
      )}
    </div>
  );
}
