import React, { useState, useEffect } from 'react';
import { fetchSolicitudById, updateSolicitud } from '../utils/api';

import { TIPOS } from '../data';

export default function PortalParEvaluador() {
  const [sol, setSol] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [docsCargados, setDocsCargados] = useState({
    evaluacion: false,
    cuenta_cobro: false,
    cert_bancaria: false,
    rut: false,
    cedula: false,
  });

  const params = new URLSearchParams(window.location.search);
  const sol_id = params.get('portal_par');
  const par_idx = parseInt(params.get('par_idx'), 10) || 0;

  useEffect(() => {
    async function loadData() {
      if (!sol_id) {
        setError('Enlace inválido o incompleto.');
        setLoading(false);
        return;
      }
      const data = await fetchSolicitudById(sol_id);
      if (!data) {
        setError('No se encontró la solicitud.');
      } else {
        const par = data.pares_ext?.[par_idx];
        if (!par) {
          setError('No se encontró el par evaluador en esta solicitud.');
        } else {
          setSol(data);
        }
      }
      setLoading(false);
    }
    loadData();
  }, [sol_id, par_idx]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Cargando portal...</div>;
  if (error) return <div style={{ padding: 40, textAlign: 'center', color: 'red', fontWeight: 800 }}>{error}</div>;

  const par = sol.pares_ext[par_idx];
  const tipo = TIPOS[sol.tipo] || { label: sol.tipo, icon: '📄' };

  const handleEntregar = async () => {
    const faltan = Object.values(docsCargados).filter(v => !v).length;
    if (faltan > 0) {
      alert('Por favor carga o marca todos los documentos requeridos antes de entregar.');
      return;
    }

    setLoading(true);
    const updatedPares = [...sol.pares_ext];
    updatedPares[par_idx] = {
      ...par,
      estado: 'recibido',
      documentos_financieros: true,
      fecha_entrega_real: new Date().toISOString().split('T')[0],
    };

    const newTimeline = [...sol.timeline, {
      f: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      a: `El par evaluador externo (${par.nombre}) cargó los documentos y entregó evaluación`,
      p: 'Portal Par Evaluador'
    }];

    const updatedSol = {
      ...sol,
      pares_ext: updatedPares,
      timeline: newTimeline
    };

    const res = await updateSolicitud(updatedSol);
    if (res.success) {
      setSuccess(true);
    } else {
      alert('Error al enviar la evaluación.');
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div style={{ maxWidth: 600, margin: '80px auto', background: '#fff', borderRadius: 16, padding: 40, textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <div style={{ fontSize: 60, marginBottom: 20 }}>✅</div>
        <h2 style={{ margin: 0, color: '#006B3F', fontSize: 24, fontWeight: 900 }}>¡Evaluación y documentos enviados!</h2>
        <p style={{ marginTop: 10, color: '#555' }}>
          La Universidad del Quindío ha recibido exitosamente su evaluación y los soportes financieros.
          El proceso de pago de honorarios iniciará pronto.
        </p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '40px 20px', fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        
        {/* Header institucional */}
        <div style={{ background: '#006B3F', padding: '24px 30px', borderRadius: '16px 16px 0 0', color: '#fff' }}>
          <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.8, letterSpacing: 1, textTransform: 'uppercase' }}>Universidad del Quindío</div>
          <h1 style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 900 }}>Portal de Pares Evaluadores</h1>
        </div>

        <div style={{ background: '#fff', padding: '30px', borderRadius: '0 0 16px 16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>Bienvenido/a,</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#1a1a1a' }}>{par.nombre}</div>
            </div>
            <div style={{ background: '#e7f1fb', color: '#1a5fa8', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800 }}>
              {sol.id}
            </div>
          </div>

          <div style={{ background: '#f8f9fa', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, marginBottom: 30 }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#555', textTransform: 'uppercase' }}>Producto a evaluar</h3>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#333', marginBottom: 8 }}>📘 {sol.titulo}</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: '#555' }}><strong>Tipo:</strong> {tipo.icon} {tipo.label}</span>
              <span style={{ fontSize: 12, color: '#555' }}><strong>Programa:</strong> {sol.programa}</span>
            </div>
          </div>

          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1a1a1a', marginBottom: 16 }}>Requisitos para pago de honorarios</h3>
          <p style={{ fontSize: 14, color: '#666', marginBottom: 24 }}>
            Para tramitar la resolución de pago, es obligatorio adjuntar el formato de evaluación diligenciado junto con los soportes administrativos. (Para esta demo, marca las casillas confirmando su carga).
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 30 }}>
            {[
              { key: 'evaluacion', label: 'Formato de evaluación diligenciado y firmado', icon: '📝' },
              { key: 'cuenta_cobro', label: 'Cuenta de Cobro / Cupón de honorarios', icon: '💰' },
              { key: 'cert_bancaria', label: 'Certificación Bancaria (No mayor a 30 días)', icon: '🏦' },
              { key: 'rut', label: 'RUT Actualizado', icon: '📄' },
              { key: 'cedula', label: 'Copia de Cédula de Ciudadanía', icon: '🪪' },
            ].map(doc => (
              <label key={doc.key} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: 16,
                background: docsCargados[doc.key] ? '#f0fdf4' : '#fff',
                border: '1px solid ' + (docsCargados[doc.key] ? '#86efac' : '#e5e7eb'),
                borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s'
              }}>
                <input
                  type="checkbox"
                  checked={docsCargados[doc.key]}
                  onChange={e => setDocsCargados({ ...docsCargados, [doc.key]: e.target.checked })}
                  style={{ width: 20, height: 20, accentColor: '#15803d' }}
                />
                <div style={{ fontSize: 20 }}>{doc.icon}</div>
                <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: docsCargados[doc.key] ? '#15803d' : '#333' }}>
                  {doc.label}
                </div>
                {docsCargados[doc.key] && <span style={{ fontSize: 12, color: '#15803d', fontWeight: 800 }}>Cargado</span>}
              </label>
            ))}
          </div>

          <button
            onClick={handleEntregar}
            disabled={Object.values(docsCargados).some(v => !v)}
            style={{
              width: '100%', padding: '16px', borderRadius: 12, border: 'none',
              background: Object.values(docsCargados).some(v => !v) ? '#ccc' : '#1a5fa8',
              color: '#fff', fontSize: 16, fontWeight: 800, cursor: Object.values(docsCargados).some(v => !v) ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s'
            }}
          >
            {loading ? 'Enviando...' : 'Entregar Evaluación y Soportes'}
          </button>
        </div>
      </div>
    </div>
  );
}
