export function CardSkeleton({ lines = 3, height = 120 }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb',
      padding: 20, height,
      animation: 'pulse 1.5s ease-in-out infinite',
    }}>
      <div style={{ height: 16, background: '#f0f0f0', borderRadius: 8, width: '60%', marginBottom: 12 }} />
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 12, background: '#f0f0f0', borderRadius: 6,
            width: `${70 + Math.random() * 30}%`, marginBottom: 8,
          }}
        />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ height: 16, background: '#f0f0f0', borderRadius: 8, width: '40%' }} />
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'flex', gap: 16, padding: '12px 18px', borderBottom: '1px solid #f5f5f5' }}>
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              style={{
                flex: 1, height: 14, background: '#f0f0f0', borderRadius: 6,
                width: `${60 + Math.random() * 40}%`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function KPISkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{
          background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb',
          padding: '16px 18px', animation: 'pulse 1.5s ease-in-out infinite',
        }}>
          <div style={{ height: 32, background: '#f0f0f0', borderRadius: 8, width: '40%', marginBottom: 8 }} />
          <div style={{ height: 14, background: '#f0f0f0', borderRadius: 6, width: '70%', marginBottom: 4 }} />
          <div style={{ height: 12, background: '#f0f0f0', borderRadius: 6, width: '50%' }} />
        </div>
      ))}
    </div>
  );
}

export function FullPageLoader({ message = 'Cargando...' }) {
  return (
    <div className="loading-screen">
      <div className="loading-spinner" />
      <div style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 16 }}>
        {message}
      </div>
      <div style={{ fontSize: 12, opacity: 0.65 }}>Oficina de Asuntos Profesorales · UQ</div>
    </div>
  );
}

// Default export para compatibilidad con import LoadingSkeleton from './LoadingSkeleton'
export default FullPageLoader;
