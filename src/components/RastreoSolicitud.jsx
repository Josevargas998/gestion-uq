import React, { useState, useEffect } from 'react';
import { fetchSolicitudById } from '../utils/api';
import { TIPOS } from '../data';
import { buildTimeline, badgeEtapa } from '../helpers';

export default function RastreoSolicitud() {
  const [sol, setSol] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const params = new URLSearchParams(window.location.search);
  const trackId = params.get('rastreo');

  useEffect(() => {
    async function loadData() {
      if (!trackId) {
        setError('No se proporcionó un código de rastreo válido.');
        setLoading(false);
        return;
      }
      const data = await fetchSolicitudById(trackId);
      if (!data) {
        setError(`No se encontró ninguna solicitud con el radicado: ${trackId}`);
      } else {
        setSol(data);
      }
      setLoading(false);
    }
    loadData();
  }, [trackId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f9fafb' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
          <div style={{ fontWeight: 800, color: 'var(--muted)' }}>Buscando solicitud...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '40px 20px', fontFamily: "'Nunito', sans-serif" }}>
        <div style={{ maxWidth: 600, margin: '0 auto', background: '#fff', borderRadius: 16, padding: 40, textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: 50, marginBottom: 20 }}>❌</div>
          <h2 style={{ margin: 0, color: '#dc3545', fontSize: 22, fontWeight: 900 }}>Error de Consulta</h2>
          <p style={{ marginTop: 10, color: '#555' }}>{error}</p>
          <a href="/" style={{ display: 'inline-block', marginTop: 20, background: '#006B3F', color: '#fff', padding: '10px 20px', borderRadius: 8, textDecoration: 'none', fontWeight: 700 }}>
            Volver al inicio
          </a>
        </div>
      </div>
    );
  }

  const tipoInfo = TIPOS[sol.tipo] || { label: sol.tipo, icon: '📄' };
  const tmln = buildTimeline(sol);

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: "'Nunito', sans-serif", padding: '40px 20px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        
        {/* Header institucional */}
        <div style={{ background: '#006B3F', padding: '24px 30px', borderRadius: '16px 16px 0 0', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.8, letterSpacing: 1, textTransform: 'uppercase' }}>Universidad del Quindío</div>
            <h1 style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 900 }}>Seguimiento de Trámite</h1>
          </div>
          <a href="/" style={{ color: '#fff', textDecoration: 'underline', fontSize: 13, fontWeight: 700 }}>Volver</a>
        </div>

        <div style={{ background: '#fff', padding: '30px', borderRadius: '0 0 16px 16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          
          {/* Info Básica */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid #e5e7eb' }}>
            <div>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>Radicado de la solicitud:</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#1a5fa8' }}>{sol.id}</div>
              <div style={{ fontSize: 13, color: '#555', marginTop: 8 }}>
                <strong>Docente:</strong> {sol.docente}
              </div>
              <div style={{ fontSize: 13, color: '#555' }}>
                <strong>Fecha Ingreso:</strong> {sol.fecha}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ marginBottom: 8 }}>{badgeEtapa(sol.etapa, sol.estado)}</div>
              {sol.pts_asig != null && (
                <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--g)', marginTop: 4 }}>⭐ {sol.pts_asig} pts aprobados</div>
              )}
            </div>
          </div>

          <div style={{ background: '#f8f9fa', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, marginBottom: 30 }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 13, color: '#555', textTransform: 'uppercase' }}>Producto Sometido</h3>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#333', marginBottom: 8 }}>{tipoInfo.icon} {sol.titulo}</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: '#555' }}><strong>Tipo:</strong> {tipoInfo.label}</span>
            </div>
          </div>

          {/* Timeline Completo */}
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1a1a1a', marginBottom: 20 }}>Bitácora del Trámite</h3>
          
          {tmln.length === 0 ? (
            <p style={{ color: '#666', fontSize: 14 }}>No hay eventos registrados aún en esta solicitud.</p>
          ) : (
            <div style={{ position: 'relative', paddingLeft: 16 }}>
              {/* Línea vertical */}
              <div style={{ position: 'absolute', top: 10, bottom: 20, left: 20, width: 2, background: '#e5e7eb', zIndex: 0 }}></div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {tmln.slice().reverse().map((ev, i) => (
                  <div key={i} style={{ display: 'flex', gap: 16, position: 'relative', zIndex: 1 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: i === 0 ? '#15803d' : '#adb5bd', boxShadow: '0 0 0 4px #fff', marginTop: 4 }}></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: i === 0 ? '#15803d' : '#666' }}>{ev.f}</span>
                        <span style={{ fontSize: 10, color: '#888', background: '#f1f3f5', padding: '2px 8px', borderRadius: 10 }}>{ev.p}</span>
                      </div>
                      <div style={{ fontSize: 14, color: i === 0 ? '#111' : '#444', fontWeight: i === 0 ? 700 : 500, lineHeight: 1.4 }}>
                        {ev.a}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sol.notas && (
             <div style={{ marginTop: 30, background: '#fff', borderLeft: '4px solid #ffc107', padding: '12px 16px', fontSize: 13, color: '#555' }}>
               <strong>Nota interna:</strong> {sol.notas}
             </div>
          )}

        </div>
      </div>
    </div>
  );
}
