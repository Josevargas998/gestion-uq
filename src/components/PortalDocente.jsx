import React from 'react';
import { useSolicitudes } from '../context/SolicitudesContext';
import { TIPOS } from '../data.js';

/**
 * PortalDocente — Vista restringida para docentes autenticados.
 * Muestra únicamente las solicitudes propias del docente y su estado.
 */
export default function PortalDocente({ user, onLogout }) {
  const { solicitudes, loading } = useSolicitudes();

  const propias = solicitudes.filter(
    s => s.cedula && s.cedula === user?.cedula
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg,#f0fdf4 0%,#e0f2fe 100%)',
      fontFamily: "'Nunito',sans-serif",
      padding: '0',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg,#006B3F,#004d2d)',
        color: '#fff',
        padding: '20px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
      }}>
        <div>
          <div style={{ fontSize: 11, opacity: 0.75, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
            Universidad del Quindío · Asuntos Profesorales
          </div>
          <div style={{ fontSize: 20, fontWeight: 900 }}>
            👨‍🏫 Portal Docente
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{user?.nombre}</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>C.C. {user?.cedula}</div>
          </div>
          <button
            onClick={onLogout}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.4)',
              borderRadius: 8,
              color: '#fff',
              padding: '8px 16px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}>
            🚪 Salir
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ maxWidth: 900, margin: '32px auto', padding: '0 24px' }}>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#1a1a1a', marginBottom: 6 }}>
          Mis Solicitudes de Productividad
        </h2>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 24 }}>
          Aquí puedes consultar el estado de tus productos registrados ante el CIARP.
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#888' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>⏳</div>
            <div>Cargando tus solicitudes...</div>
          </div>
        ) : propias.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: '48px 20px', textAlign: 'center', color: '#aaa' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>No tienes solicitudes registradas</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>
              Contacta la Oficina de Asuntos Profesorales para registrar tus productos académicos.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {propias.map(s => {
              const tipo = TIPOS[s.tipo] || { label: s.tipo, icon: '📄' };
              const estadoColor = s.estado === 'aprobado' ? '#15803d' : s.estado === 'rechazado' ? '#dc2626' : '#b45309';
              const estadoBg    = s.estado === 'aprobado' ? '#dcfce7' : s.estado === 'rechazado' ? '#fef2f2' : '#fffbeb';
              return (
                <div key={s.id} style={{
                  background: '#fff',
                  borderRadius: 14,
                  border: '1px solid #e5e7eb',
                  padding: '20px 24px',
                  boxShadow: '0 1px 4px rgba(0,0,0,.05)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: '#888', fontFamily: 'monospace', marginBottom: 4 }}>{s.id}</div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: '#1a1a1a', marginBottom: 4 }}>{s.titulo}</div>
                      <div style={{ fontSize: 12, color: '#555' }}>{tipo.icon} {tipo.label}</div>
                      {s.revista && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>📰 {s.revista}</div>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <span style={{ background: estadoBg, color: estadoColor, borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 800 }}>
                        {s.estado === 'aprobado' ? '✅ Aprobado' : s.estado === 'rechazado' ? '❌ No aprobado' : '⏳ En proceso'}
                      </span>
                      <span style={{ fontSize: 11, color: '#888' }}>
                        Etapa: <strong style={{ color: '#1a5fa8' }}>{s.etapa?.replace(/_/g, ' ')}</strong>
                      </span>
                      {s.pts_asig != null && (
                        <span style={{ fontWeight: 900, fontSize: 16, color: '#006B3F' }}>
                          {s.pts_asig} pts
                        </span>
                      )}
                      {s.acta_ciarp && (
                        <span style={{ fontSize: 11, background: '#f0fdf4', color: '#006B3F', borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}>
                          Acta: {s.acta_ciarp}
                        </span>
                      )}
                    </div>
                  </div>
                  {s.notas && (
                    <div style={{ marginTop: 12, padding: '10px 14px', background: '#f8f9fa', borderRadius: 8, fontSize: 12, color: '#555', borderLeft: '3px solid #006B3F' }}>
                      <strong>Observaciones:</strong> {s.notas}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
