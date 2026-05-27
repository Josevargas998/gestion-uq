import React from 'react';

const PRODUCTOS = [
  { tipo: 'Artículo Revista A1',              pts: 15,  nota: 'Q1 / Scopus-WoS' },
  { tipo: 'Artículo Revista A2',              pts: 12,  nota: 'Q2' },
  { tipo: 'Artículo Revista B',               pts: 8,   nota: 'Q3-Q4' },
  { tipo: 'Artículo Revista C',               pts: 3,   nota: '' },
  { tipo: 'Comunicación corta (short comm.)', pts: '60% del art.',  nota: 'Del puntaje correspondiente' },
  { tipo: 'Reporte de caso / revisión / carta',pts: '30% del art.', nota: 'Del puntaje correspondiente' },
  { tipo: 'Libro de investigación',           pts: 20,  nota: 'Hasta 20 pts, pares externos' },
  { tipo: 'Libro de texto',                   pts: 15,  nota: 'Hasta 15 pts' },
  { tipo: 'Libro de ensayo',                  pts: 15,  nota: 'Hasta 15 pts' },
  { tipo: 'Video / prod. fonográfica (int.)', pts: 12,  nota: 'Máx. 5 por año' },
  { tipo: 'Video / prod. fonográfica (nal.)', pts: 7,   nota: 'Máx. 5 por año' },
  { tipo: 'Obra artística original (int.)',   pts: 20,  nota: '' },
  { tipo: 'Obra artística original (nal.)',   pts: 14,  nota: '' },
  { tipo: 'Obra artística complementaria (int.)', pts: 12, nota: '' },
  { tipo: 'Obra artística complementaria (nal.)', pts: 8,  nota: '' },
  { tipo: 'Interpretación artística (int.)',  pts: 14,  nota: 'Solo roles destacados' },
  { tipo: 'Interpretación artística (nal.)',  pts: 8,   nota: '' },
  { tipo: 'Producción técnica (innovación)',  pts: 15,  nota: '' },
  { tipo: 'Producción técnica (adaptación)',  pts: 8,   nota: '' },
  { tipo: 'Producción de Software',           pts: 15,  nota: '' },
  { tipo: 'Patente',                          pts: 25,  nota: '' },
  { tipo: 'Traducción de libro',              pts: 15,  nota: '' },
  { tipo: 'Premio (nacional/internacional)',  pts: 15,  nota: 'Según jerarquía' },
];

const TOPES = [
  { categoria: 'Profesor Auxiliar',    pts: 80  },
  { categoria: 'Profesor Asistente',   pts: 160 },
  { categoria: 'Profesor Asociado',    pts: 320 },
  { categoria: 'Profesor Titular',     pts: 540 },
  { categoria: 'Instructor Asociado',  pts: 110 },
];

export default function Decreto1279Panel({ onClose }) {
  return (
    <div style={{
      marginTop: 16,
      border: '2px solid #1565c0',
      borderRadius: 12,
      background: 'linear-gradient(135deg, #e3f0ff 0%, #f8fbff 100%)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        background: '#1565c0', color: '#fff',
        padding: '10px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ fontWeight: 800, fontSize: 13 }}>
          📋 Referencia: Decreto 1279 de 2002 — Puntos por Producto Académico
        </div>
        {onClose && (
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6,
            color: '#fff', fontSize: 12, cursor: 'pointer', padding: '2px 8px',
          }}>✕ Cerrar</button>
        )}
      </div>

      <div style={{ padding: '14px 16px' }}>
        {/* Tabla de productos */}
        <div style={{ fontSize: 11, fontWeight: 700, color: '#1565c0', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .4 }}>
          Puntos por tipo de producto (Art. 10, I)
        </div>
        <div style={{ overflowX: 'auto', marginBottom: 14 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#1565c0', color: '#fff' }}>
                <th style={{ padding: '5px 8px', textAlign: 'left' }}>Tipo de Producto</th>
                <th style={{ padding: '5px 8px', textAlign: 'center', whiteSpace: 'nowrap' }}>Pts. máx.</th>
                <th style={{ padding: '5px 8px', textAlign: 'left' }}>Nota</th>
              </tr>
            </thead>
            <tbody>
              {PRODUCTOS.map((p, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f0f7ff' }}>
                  <td style={{ padding: '4px 8px', borderBottom: '1px solid #dce6f7' }}>{p.tipo}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 700, color: '#1a6e2e', borderBottom: '1px solid #dce6f7' }}>{p.pts}</td>
                  <td style={{ padding: '4px 8px', color: '#555', borderBottom: '1px solid #dce6f7' }}>{p.nota}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Topes por categoría */}
        <div style={{ fontSize: 11, fontWeight: 700, color: '#1565c0', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .4 }}>
          Topes máximos totales por categoría docente (Art. 10, III)
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {TOPES.map((t, i) => (
            <div key={i} style={{
              background: '#fff', border: '1px solid #1565c0', borderRadius: 8,
              padding: '5px 10px', fontSize: 11, display: 'flex', gap: 8, alignItems: 'center',
            }}>
              <span style={{ color: '#555' }}>{t.categoria}</span>
              <span style={{ fontWeight: 800, color: '#1565c0' }}>{t.pts} pts</span>
            </div>
          ))}
        </div>

        {/* Reglas */}
        <div style={{ fontSize: 10, color: '#555', lineHeight: 1.6, background: '#fff', borderRadius: 6, padding: '6px 10px', border: '1px solid #dce6f7' }}>
          <strong>Reglas clave:</strong> Coautoría ≤3 autores = puntaje completo; &gt;3 autores = reducción proporcional.
          No duplicidad entre categorías. Máximo 5 videos/obras artísticas por año.
          Los artículos indexados en Scopus/WoS se aceptan sin pares externos adicionales.
        </div>
      </div>
    </div>
  );
}
