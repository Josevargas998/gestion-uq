import React, { useState, useMemo, useEffect } from 'react';
import { fetchDocentes, fetchSolicitudes } from '../utils/api.js';

/* ── Constants ─────────────────────────────── */
const CAT = {
  'PROFESOR TITULAR':   { color: '#1565c0', bg: '#e3f2fd', short: 'TITULAR' },
  'PROFESOR ASOCIADO':  { color: '#006B3F', bg: '#f0fdf4', short: 'ASOCIADO' },
  'PROFESOR ASISTENTE': { color: '#7c3aed', bg: '#f5f3ff', short: 'ASISTENTE' },
  'PROFESOR AUXILIAR':  { color: '#b45309', bg: '#fffbeb', short: 'AUXILIAR' },
};
const FAC_SHORT = {
  'FACULTAD DE CIENCIAS DE LA SALUD': 'Salud',
  'FACULTAD DE EDUCACION': 'Educación',
  'FACULTAD DE INGENIERIA': 'Ingeniería',
  'FACULTAD DE CIENCIAS AGROINDUSTRIALES': 'Agroindustrial',
  'FACULTAD DE CIENCIAS ECONOMICAS Y ADMINISTRATIVAS': 'Económicas',
  'FACULTAD DE CIENCIAS ECONOMICAS, ADMINISTRATIVAS Y CONTABLES': 'Económicas',
  'FACULTAD DE CIENCIAS BASICAS Y TECNOLOGIAS': 'Ciencias Básicas',
  'FACULTAD DE CIENCIAS HUMANAS Y BELLAS ARTES': 'Humanidades',
};

function catBadge(cat) {
  const c = CAT[cat] || { color: '#555', bg: '#f5f5f5', short: cat };
  return (
    <span style={{ background: c.bg, color: c.color, borderRadius: 20, padding: '2px 10px', fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap' }}>
      {c.short}
    </span>
  );
}

function pctBar(val, max, color = '#006B3F') {
  const pct = max > 0 ? Math.min(100, (val / max) * 100) : 0;
  return (
    <div style={{ background: '#f0f0f0', borderRadius: 20, height: 6, width: '100%', marginTop: 3 }}>
      <div style={{ background: color, width: `${pct}%`, height: '100%', borderRadius: 20, transition: 'width .5s' }} />
    </div>
  );
}

/* ── Detalle Docente ────────────────────────── */
function DetalleDocente({ doc, solicitudes, onBack }) {
  const cat = CAT[doc.categoria] || { color: '#555', bg: '#f5f5f5' };
  const pct = doc.tope > 0 ? Math.min(100, ((doc.pts_acumulados || 0) / doc.tope) * 100) : 0;
  const sobre = (doc.pts_acumulados || 0) > (doc.tope || 0);

  const solDocente = useMemo(() =>
    solicitudes.filter(s => s.cedula === doc.cedula || s.docente?.toLowerCase() === doc.nombre?.toLowerCase())
  , [solicitudes, doc]);

  const solAprobadas = solDocente.filter(s => s.estado === 'aprobado' && s.tipo !== 'ascenso');
  const solProceso   = solDocente.filter(s => s.estado === 'en_proceso' && s.tipo !== 'ascenso');
  const solRechazadas = solDocente.filter(s => s.estado === 'rechazado' && s.tipo !== 'ascenso');
  const ascensos     = solDocente.filter(s => s.tipo === 'ascenso');

  const TIPO_ICONS = {
    articulo_indexado: '📰', articulo_no_indexado: '📄', libro_ensayo: '📙',
    libro_texto: '📘', libro_investigacion: '📗', ponencia: '🎤',
    software: '💻', tesis: '🎓', titulo: '🏅', obra_artistica: '🎨',
    premio: '🏆', posdoctorado: '🔬', produccion_tecnica: '🔧', ascenso: '⬆️',
  };

  return (
    <div style={{ padding: '24px 28px', fontFamily: "'Nunito',sans-serif", maxWidth: 960, margin: '0 auto' }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1.5px solid #ddd', background: '#fff', fontSize: 13, cursor: 'pointer', marginBottom: 24, fontWeight: 700 }}>
        ← Volver al escalafón
      </button>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${cat.color} 0%, ${cat.color}cc 100%)`, borderRadius: 18, padding: '26px 28px', color: '#fff', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>{doc.nombre}</div>
            <div style={{ opacity: .8, fontSize: 13 }}>C.C. {doc.cedula}</div>
            <div style={{ opacity: .8, fontSize: 13, marginTop: 2 }}>{FAC_SHORT[doc.facultad] || doc.facultad}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {[doc.dedicacion, doc.escolaridad, doc.fecha_ingreso ? `Ingreso: ${doc.fecha_ingreso}` : null].filter(Boolean).map((t, i) => (
                <span key={i} style={{ background: 'rgba(255,255,255,.2)', borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 700 }}>{t}</span>
              ))}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, opacity: .7 }}>Categoría</div>
            <div style={{ fontSize: 20, fontWeight: 900 }}>{doc.categoria?.replace('PROFESOR ', '') || '—'}</div>
            <div style={{ fontSize: 11, opacity: .7, marginTop: 8 }}>Puntaje Total Salarial</div>
            <div style={{ fontSize: 24, fontWeight: 900 }}>{(doc.pts_total_salarial || 0).toFixed(1)} pts</div>
          </div>
        </div>
      </div>

      {/* Puntajes grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Productividad acumulada', val: doc.pts_acumulados || 0, color: sobre ? '#dc2626' : '#006B3F', sub: `Tope: ${doc.tope || 0} pts`, showBar: true, max: doc.tope },
          { label: 'Títulos + Experiencia',   val: doc.pts_titulos_exp || 0, color: '#1a5fa8', sub: 'Sin tope (crece toda la carrera)' },
          { label: 'Disponible hasta tope',   val: Math.max(0, (doc.tope || 0) - (doc.pts_acumulados || 0)), color: '#0369a1', sub: sobre ? '⚠️ Superó el tope' : 'Capacidad restante' },
          { label: 'CIARP 1 — 2026',          val: doc.pts_ciarp1_2026 || 0, color: '#7c3aed', sub: 'Puntos aprobados este período' },
        ].map((k, i) => (
          <div key={i} style={{ background: '#f9fafb', borderRadius: 12, padding: '16px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 10, color: '#888', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: k.color }}>{Number(k.val).toFixed(1)}</div>
            <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>{k.sub}</div>
            {k.showBar && pctBar(k.val, k.max, k.color)}
          </div>
        ))}
      </div>

      {/* Solicitudes aprobadas */}
      {solAprobadas.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 14, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', background: '#f0fdf4', borderBottom: '1px solid #e5e7eb', fontWeight: 800, color: '#15803d', fontSize: 13 }}>
            ✅ Productos académicos aprobados por CIARP ({solAprobadas.length})
          </div>
          {solAprobadas.map((s, i) => (
            <div key={i} style={{ padding: '10px 18px', borderBottom: i < solAprobadas.length - 1 ? '1px solid #f0f0f0' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ marginRight: 8 }}>{TIPO_ICONS[s.tipo] || '📄'}</span>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{s.titulo}</span>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{s.tipo?.replace(/_/g, ' ')} · {s.fecha}</div>
              </div>
              {s.pts_asig && <span style={{ fontWeight: 900, color: '#006B3F', fontSize: 15 }}>{s.pts_asig} pts</span>}
            </div>
          ))}
        </div>
      )}

      {/* En proceso */}
      {solProceso.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 14, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', background: '#f5f3ff', borderBottom: '1px solid #e5e7eb', fontWeight: 800, color: '#7c3aed', fontSize: 13 }}>
            ⏳ Solicitudes en proceso ({solProceso.length})
          </div>
          {solProceso.map((s, i) => (
            <div key={i} style={{ padding: '10px 18px', borderBottom: i < solProceso.length - 1 ? '1px solid #f0f0f0' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ marginRight: 8 }}>{TIPO_ICONS[s.tipo] || '📄'}</span>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{s.titulo}</span>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{s.etapa?.replace(/_/g,' ')} · {s.fecha}</div>
              </div>
              <span style={{ fontSize: 10, background: '#f5f3ff', color: '#7c3aed', borderRadius: 20, padding: '2px 10px', fontWeight: 700 }}>
                {s.etapa?.replace(/_/g,' ')}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Rechazados */}
      {solRechazadas.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 14, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', background: '#fef2f2', borderBottom: '1px solid #e5e7eb', fontWeight: 800, color: '#991b1b', fontSize: 13 }}>
            ❌ Productos académicos rechazados por CIARP ({solRechazadas.length})
          </div>
          {solRechazadas.map((s, i) => (
            <div key={i} style={{ padding: '10px 18px', borderBottom: i < solRechazadas.length - 1 ? '1px solid #f0f0f0' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#777' }}>
              <div>
                <span style={{ marginRight: 8 }}>{TIPO_ICONS[s.tipo] || '📄'}</span>
                <span style={{ fontWeight: 600, fontSize: 13, textDecoration: 'line-through' }}>{s.titulo}</span>
                <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{s.tipo?.replace(/_/g, ' ')} · {s.fecha} · Acta: {s.acta_ciarp || '—'}</div>
              </div>
              <span style={{ fontWeight: 900, color: '#b91c1c', fontSize: 14 }}>0.0 pts</span>
            </div>
          ))}
        </div>
      )}

      {/* Ascensos */}
      {ascensos.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', marginBottom: 14 }}>
          <div style={{ padding: '12px 18px', background: '#e0f2fe', borderBottom: '1px solid #e5e7eb', fontWeight: 800, color: '#0369a1', fontSize: 13 }}>
            🏛️ Solicitudes de ascenso CEI ({ascensos.length})
          </div>
          {ascensos.map((s, i) => (
            <div key={i} style={{ padding: '10px 18px', borderBottom: i < ascensos.length - 1 ? '1px solid #f0f0f0' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{s.titulo}</span>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{s.fecha} · Acta: {s.acta_ciarp || '—'}</div>
              </div>
              <span style={{ fontSize: 10, background: s.estado === 'aprobado' ? '#dcfce7' : '#fef2f2', color: s.estado === 'aprobado' ? '#15803d' : '#dc2626', borderRadius: 20, padding: '2px 10px', fontWeight: 700 }}>
                {s.estado === 'aprobado' ? '✅ Aprobado' : s.estado === 'rechazado' ? '❌ Negado' : '⏳ En proceso'}
              </span>
            </div>
          ))}
        </div>
      )}

      {solDocente.length === 0 && (
        <div style={{ padding: 32, textAlign: 'center', color: '#aaa', background: '#f9fafb', borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
          <div style={{ fontWeight: 700 }}>Sin solicitudes registradas en el sistema</div>
        </div>
      )}
    </div>
  );
}

/* ── Main Component ─────────────────────────── */
export default function EscalafonDocente() {
  const [docentes,    setDocentes]    = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [filterCat,   setFilterCat]   = useState('Todos');
  const [filterFac,   setFilterFac]   = useState('Todos');
  const [sortBy,      setSortBy]      = useState('nombre');
  const [selected,    setSelected]    = useState(null);

  useEffect(() => {
    Promise.all([
      fetchDocentes(),
      fetchSolicitudes({ paginar: false }),
    ]).then(([docs, res]) => {
      setDocentes(docs || []);
      setSolicitudes(res?.data || []);
      setLoading(false);
    });
  }, []);

  const facultades = useMemo(() => ['Todos', ...new Set(docentes.map(d => FAC_SHORT[d.facultad] || d.facultad).filter(Boolean).sort())], [docentes]);
  const categorias = ['Todos', 'PROFESOR TITULAR', 'PROFESOR ASOCIADO', 'PROFESOR ASISTENTE', 'PROFESOR AUXILIAR'];

  const filtered = useMemo(() => {
    let list = [...docentes];
    if (filterCat !== 'Todos') list = list.filter(d => d.categoria === filterCat);
    if (filterFac !== 'Todos') list = list.filter(d => (FAC_SHORT[d.facultad] || d.facultad) === filterFac);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(d => d.nombre?.toLowerCase().includes(q) || d.cedula?.includes(q) || d.programa?.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      if (sortBy === 'pts_total') return (b.pts_total_salarial || 0) - (a.pts_total_salarial || 0);
      if (sortBy === 'pts_prod')  return (b.pts_acumulados || 0) - (a.pts_acumulados || 0);
      return (a.nombre || '').localeCompare(b.nombre || '');
    });
    return list;
  }, [docentes, filterCat, filterFac, search, sortBy]);

  const stats = useMemo(() => ({
    total:     docentes.length,
    titular:   docentes.filter(d => d.categoria === 'PROFESOR TITULAR').length,
    asociado:  docentes.filter(d => d.categoria === 'PROFESOR ASOCIADO').length,
    asistente: docentes.filter(d => d.categoria === 'PROFESOR ASISTENTE').length,
    auxiliar:  docentes.filter(d => d.categoria === 'PROFESOR AUXILIAR').length,
    sobreTope: docentes.filter(d => (d.pts_acumulados || 0) > (d.tope || 0)).length,
    tc:        docentes.filter(d => d.dedicacion === 'TIEMPO COMPLETO').length,
  }), [docentes]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, fontFamily: "'Nunito',sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
        <div style={{ fontWeight: 700, color: '#006B3F' }}>Cargando escalafón docente...</div>
      </div>
    </div>
  );

  if (selected) return <DetalleDocente doc={selected} solicitudes={solicitudes} onBack={() => setSelected(null)} />;

  return (
    <div style={{ padding: '24px 28px', fontFamily: "'Nunito',sans-serif", maxWidth: 1400, margin: '0 auto' }}>

      {/* Cabecera */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#1a1a1a' }}>
          🎓 Hoja de Vida Docente — Escalafón
        </h2>
        <p style={{ margin: '4px 0 0', color: '#666', fontSize: 13 }}>
          Universidad del Quindío · Oficina de Asuntos Profesorales · Decreto 1279 de 2002
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Planta Docente',  val: stats.total,     color: '#1a5fa8', bg: '#e7f1fb', icon: '👨‍🏫' },
          { label: 'Titulares',       val: stats.titular,   color: '#1565c0', bg: '#e3f2fd', icon: '🔵' },
          { label: 'Asociados',       val: stats.asociado,  color: '#006B3F', bg: '#f0fdf4', icon: '🟢' },
          { label: 'Asistentes',      val: stats.asistente, color: '#7c3aed', bg: '#f5f3ff', icon: '🟣' },
          { label: 'Auxiliares',      val: stats.auxiliar,  color: '#b45309', bg: '#fffbeb', icon: '🟡' },
          { label: 'Tiempo Completo', val: stats.tc,        color: '#0369a1', bg: '#e0f2fe', icon: '⏰' },
          { label: 'Sobre el tope',   val: stats.sobreTope, color: '#dc2626', bg: '#fef2f2', icon: '⚠️' },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, border: `1.5px solid ${s.color}33`, borderRadius: 14, padding: '14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
            <div style={{ fontSize: 20 }}>{s.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: s.color, lineHeight: 1.2 }}>{s.val}</div>
            <div style={{ fontSize: 10, color: '#555', fontWeight: 700, textAlign: 'center', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '14px 16px', marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Buscar nombre, cédula o programa..."
          style={{ flex: 1, minWidth: 220, padding: '8px 12px', borderRadius: 8, border: '1.5px solid #ddd', fontSize: 13 }}
        />
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #ddd', fontSize: 12, fontWeight: 700 }}>
          {categorias.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={filterFac} onChange={e => setFilterFac(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #ddd', fontSize: 12 }}>
          {facultades.map(f => <option key={f}>{f}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #ddd', fontSize: 12 }}>
          <option value="nombre">Ordenar: Nombre</option>
          <option value="pts_total">Ordenar: Puntaje Total ↓</option>
          <option value="pts_prod">Ordenar: Productividad ↓</option>
        </select>
        <span style={{ fontSize: 12, color: '#888', whiteSpace: 'nowrap' }}>{filtered.length} docentes</span>
      </div>

      {/* Tabla */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg,#006B3F,#004d2d)', color: '#fff' }}>
                {['Nombre / Cédula','Facultad','Categoría','Dedicación','Productividad','Tope','Disponible','Total Salarial','CIARP-1 2026',''].map((h, i) => (
                  <th key={i} style={{ padding: '11px 12px', textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap', fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc, idx) => {
                const sobre = (doc.pts_acumulados || 0) > (doc.tope || 0);
                const pct   = doc.tope > 0 ? Math.min(100, ((doc.pts_acumulados || 0) / doc.tope) * 100) : 0;
                const nSol  = solicitudes.filter(s => s.cedula === doc.cedula).length;
                return (
                  <tr key={doc.cedula}
                    onClick={() => setSelected(doc)}
                    style={{ background: idx % 2 === 0 ? '#fff' : '#f9fafb', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', transition: 'background .15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                    onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#f9fafb'}
                  >
                    <td style={{ padding: '10px 12px', minWidth: 180 }}>
                      <div style={{ fontWeight: 800, color: '#1a1a1a', fontSize: 12 }}>{doc.nombre}</div>
                      <div style={{ fontSize: 10, color: '#888', fontFamily: 'monospace' }}>C.C. {doc.cedula}</div>
                      {nSol > 0 && <div style={{ fontSize: 9, color: '#7c3aed', marginTop: 2 }}>{nSol} solicitudes</div>}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#555', fontSize: 11, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {FAC_SHORT[doc.facultad] || doc.facultad}
                    </td>
                    <td style={{ padding: '10px 12px' }}>{catBadge(doc.categoria)}</td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: '#555' }}>
                      {doc.dedicacion === 'TIEMPO COMPLETO' ? 'TC' : 'MT'}
                    </td>
                    <td style={{ padding: '10px 12px', minWidth: 110 }}>
                      <div style={{ fontWeight: 800, color: sobre ? '#dc2626' : '#006B3F', fontSize: 13 }}>
                        {(doc.pts_acumulados || 0).toFixed(1)}
                        {sobre && <span style={{ fontSize: 9, marginLeft: 4 }}>⚠️</span>}
                      </div>
                      {pctBar(doc.pts_acumulados || 0, doc.tope || 1, sobre ? '#dc2626' : '#006B3F')}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#555', fontWeight: 700, fontSize: 12 }}>
                      {doc.tope || 0}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0369a1', fontSize: 12 }}>
                      {Math.max(0, (doc.tope || 0) - (doc.pts_acumulados || 0)).toFixed(1)}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 900, color: '#1a5fa8', fontSize: 13 }}>
                      {(doc.pts_total_salarial || 0).toFixed(1)}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: doc.pts_ciarp1_2026 ? '#7c3aed' : '#ccc', fontSize: 12 }}>
                      {doc.pts_ciarp1_2026 ? `+${doc.pts_ciarp1_2026}` : '—'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <button onClick={e => { e.stopPropagation(); setSelected(doc); }}
                        style={{ padding: '5px 12px', borderRadius: 8, border: '1.5px solid #006B3F', background: '#f0fdf4', color: '#006B3F', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        Ver HV →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
