import React, { useState, useEffect, useMemo } from 'react';
import { normalizeActaKey } from '../helpers.js';

/**
 * Ciarp1 — Histórico CIARP 1 (2026)
 * Lee solicitudes aprobadas con acta_ciarp desde Supabase.
 */
export default function ActasAprobadas({ solicitudes = [] }) {
  const [filter,  setFilter]  = useState('');
  const [tabTipo, setTabTipo] = useState('');
  const [actaFilter, setActaFilter] = useState('');

  // Filtrar solicitudes con acta
  const data = useMemo(() => {
    return solicitudes.filter(s => s.estado === 'aprobado' && s.acta_ciarp && s.tipo !== 'ascenso');
  }, [solicitudes]);

  const actasDisponibles = useMemo(() => {
    const actas = [...new Set(data.map(d => normalizeActaKey(d.acta_ciarp)))].filter(Boolean);
    return actas.sort((a, b) => {
      const partsA = a.split('/');
      const partsB = b.split('/');
      const ya = parseInt(partsA[1] || '0', 10);
      const yb = parseInt(partsB[1] || '0', 10);
      if (ya !== yb) return ya - yb;
      const na = parseInt(partsA[0], 10);
      const nb = parseInt(partsB[0], 10);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });
  }, [data]);

  // Set default acta to the most recent/first one
  useEffect(() => {
    if (actasDisponibles.length > 0 && !actaFilter) {
      setActaFilter(actasDisponibles[0]);
    }
  }, [actasDisponibles, actaFilter]);

  const TIPO_LABELS = {
    articulo_indexado: '📰 Rev. Indexadas', articulo_no_indexado: '📄 Rev. No Indexadas',
    libro_ensayo: '📙 Libros / Ensayos', libro_texto: '📘 Libros Texto',
    libro_investigacion: '📗 Lib. Investigación', ponencia: '🎤 Ponencias',
    software: '💻 Software', tesis: '🎓 Tesis Dirigidas', titulo: '🏅 Títulos',
    obra_artistica: '🎨 Obras Artísticas', premio: '🏆 Premios',
    posdoctorado: '🔬 Posdoctorado', produccion_tecnica: '🔧 Prod. Técnica',
  };

  const tipos = useMemo(() => ['', ...new Set(data.map(d => d.tipo))].filter(t => !t || TIPO_LABELS[t]), [data]);

  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    return data.filter(d =>
      (!actaFilter || normalizeActaKey(d.acta_ciarp) === actaFilter) &&
      (!tabTipo || d.tipo === tabTipo) &&
      (!q || d.docente?.toLowerCase().includes(q) || d.cedula?.includes(q) ||
             d.titulo?.toLowerCase().includes(q) || d.programa?.toLowerCase().includes(q))
    );
  }, [data, filter, tabTipo, actaFilter]);

  const totalPts = filtered.reduce((s, d) => s + (d.pts_asig || 0), 0);

  if (data.length === 0) return (
    <div style={{ padding: 48, textAlign: 'center', color: '#006B3F', fontFamily: "'Nunito',sans-serif" }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
      <div style={{ fontWeight: 700 }}>No hay histórico de actas CIARP</div>
    </div>
  );

  return (
    <div style={{ padding: '20px', fontFamily: "'Nunito',sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#006B3F' }}>
            ✅ Histórico Aprobados CIARP
          </h3>
          <p style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
            {filtered.length} productos · {totalPts.toFixed(1)} puntos totales asignados en esta acta
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: 10 }}>
          <select 
            value={actaFilter} 
            onChange={e => setActaFilter(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px solid #006B3F', fontSize: 13, fontWeight: 700, color: '#006B3F', background: '#f0fdf4' }}
          >
            {actasDisponibles.map(a => <option key={a} value={a}>Acta: {a}</option>)}
          </select>
        </div>
      </div>

      {/* Búsqueda */}
      <input
        type="text"
        placeholder="Buscar por nombre, cédula, programa o título..."
        value={filter}
        onChange={e => setFilter(e.target.value)}
        style={{ width: '100%', maxWidth: 480, marginBottom: 14, padding: '9px 14px', borderRadius: 8, border: '1.5px solid #ddd', fontSize: 13, fontFamily: "'Nunito',sans-serif" }}
      />

      {/* Tabs por tipo */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {tipos.map(t => (
          <button key={t} onClick={() => setTabTipo(t)} style={{
            padding: '5px 14px', border: 'none',
            background: tabTipo === t ? '#006B3F' : '#f0f0f0',
            color: tabTipo === t ? '#fff' : '#333',
            borderRadius: 20, cursor: 'pointer', fontWeight: 700, fontSize: 12,
            fontFamily: "'Nunito',sans-serif", transition: 'all .15s',
          }}>
            {t ? TIPO_LABELS[t] || t : 'Todos'} ({t ? data.filter(d => d.tipo === t).length : data.length})
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'linear-gradient(135deg,#006B3F,#004d2d)', color: '#fff' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700 }}>Cédula</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700 }}>Docente</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700 }}>Título del producto</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700 }}>Programa</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700 }}>Tipo</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700 }}>Puntos</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, idx) => (
              <tr key={item.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '9px 14px', fontFamily: 'monospace', color: '#888', fontSize: 11 }}>{item.cedula}</td>
                <td style={{ padding: '9px 14px', fontWeight: 700, color: '#1a1a1a' }}>{item.docente}</td>
                <td style={{ padding: '9px 14px', color: '#1a5fa8', fontStyle: 'italic', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.titulo}>
                  {item.titulo || '—'}
                </td>
                <td style={{ padding: '9px 14px', color: '#555', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.programa}</td>
                <td style={{ padding: '9px 14px' }}>
                  <span style={{ fontSize: 10, background: '#f0fdf4', color: '#006B3F', borderRadius: 20, padding: '2px 8px', fontWeight: 700 }}>
                    {TIPO_LABELS[item.tipo] || item.tipo}
                  </span>
                </td>
                <td style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 900, color: '#006B3F' }}>
                  {item.pts_asig != null ? `${item.pts_asig} pts` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#aaa' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
            <div style={{ fontWeight: 700 }}>No hay productos que coincidan</div>
          </div>
        )}
      </div>
    </div>
  );
}
