import { useState, useEffect, useCallback } from 'react';

/**
 * ConnectionStatus — Indicador de conectividad con el servidor local
 * Muestra un banner cuando el backend Express no responde.
 * ISO 25010 Fiabilidad → Disponibilidad (R4)
 */
export default function ConnectionStatus() {
  const [online, setOnline]     = useState(true);
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch('/api/health');
      setOnline(res.ok);
    } catch {
      setOnline(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    check();
    // Revisar cada 30 segundos
    const interval = setInterval(check, 30_000);

    const handleOnline  = () => check();
    const handleOffline = () => setOnline(false);
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [check]);

  if (online) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
        zIndex: 99998, background: '#1a1a1a', color: '#fff',
        padding: '10px 20px', borderRadius: 8,
        boxShadow: '0 4px 20px rgba(0,0,0,.4)',
        display: 'flex', alignItems: 'center', gap: 10,
        fontFamily: "'Nunito', sans-serif", fontSize: 13, fontWeight: 600,
        animation: 'slideUp .3s ease both',
      }}
    >
      <span style={{ fontSize: 16 }}>⚠️</span>
      <span>Sin conexión a la base de datos. Los cambios son locales.</span>
      <button
        type="button"
        onClick={check}
        disabled={checking}
        aria-label="Reintentar conexión"
        style={{
          marginLeft: 8, background: '#006B3F', border: 'none', borderRadius: 6,
          color: '#fff', padding: '4px 12px', fontSize: 12, fontWeight: 700,
          cursor: checking ? 'not-allowed' : 'pointer', opacity: checking ? 0.7 : 1,
        }}
      >
        {checking ? '…' : 'Reintentar'}
      </button>
    </div>
  );
}
