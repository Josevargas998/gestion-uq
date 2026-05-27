import React, { useState } from 'react';
import { generarDocumento } from '../utils/docGenerator.jsx';
import { TIPOS } from '../data.js';
import { badgeEtapa, labelEtapa, normalizeActaKey, cleanProgramaName } from '../helpers.js';

// Etapas that qualify for Resoluciones view
const ETAPAS_RESOLUCION = ['acta','resolucion','juridica','rectoria','archivada'];

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Group solicitudes purely by programa */
function buildProgramaGroups(solicitudes, anioFiltro, tabMode) {
  const elegibles = solicitudes.filter(s => {
    if (!ETAPAS_RESOLUCION.includes(s.etapa)) return false;
    
    // Solo solicitudes aprobadas van a resolución
    if (s.estado !== 'aprobado') return false;

    // Excluir importaciones históricas (las que ya tienen resolución previa)
    if (s.id && s.id.startsWith('HIST-')) return false;

    const isExperiencia = ['daa', 'ddd', 'exp_calificada'].includes(s.tipo);
    if (tabMode === 'productividad' && isExperiencia) return false;
    if (tabMode === 'experiencia' && !isExperiencia) return false;

    // Check if the approval or request year matches the filter
    const actaStr = String(s.acta_ciarp || s.sesion_ciarp_id || '');
    const fechaStr = String(s.fecha || '');
    const idStr = String(s.id || '');
    
    return actaStr.includes(anioFiltro) || fechaStr.startsWith(anioFiltro) || idStr.includes(anioFiltro);
  });
  
  // Deduplicar solicitudes por docente (cédula) + título normalizado
  const uniqueElegibles = [];
  const seenKeys = new Set();
  
  elegibles.forEach(s => {
    if (!s.cedula || !s.titulo) {
      uniqueElegibles.push(s);
      return;
    }
    const cleanTitle = s.titulo.trim().toLowerCase().replace(/[^a-z0-9áéíóúñü]/g, '');
    const key = `${s.cedula.trim()}_${cleanTitle}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueElegibles.push(s);
    }
  });

  const groups = {};
  
  uniqueElegibles.forEach(s => {
    const prog = cleanProgramaName(s.programa);
    const acta = (s.acta_ciarp || s.sesion_ciarp_id || '').trim();
    
    if (!groups[prog]) {
      groups[prog] = { programa: prog, actas: new Set(), solicitudes: [] };
    }
    groups[prog].solicitudes.push(s);
    if (acta) groups[prog].actas.add(acta);
  });

  // Ordenar por programa
  return Object.values(groups)
    .sort((a, b) => a.programa.localeCompare(b.programa))
    .map(g => ({
      key: g.programa,
      programa: g.programa,
      actas: Array.from(g.actas).join(', '),
      tipoResolucion: tabMode === 'productividad' ? 'resolucion_productividad' : 'resolucion_experiencia',
      solicitudes: g.solicitudes.sort((a, b) => (a.docente || '').localeCompare(b.docente || ''))
    }));
}

// ── Programa accordion ───────────────────────────────────────────────────────

function ProgramaSection({ grupo, onSelect }) {
  const { programa, actas, solicitudes } = grupo;
  const [open, setOpen] = useState(false);
  const total = solicitudes.length;
  const totalPts = solicitudes.reduce((s, x) => s + (x.pts_asig || 0), 0);

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      {/* Accordion header */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12,
          cursor: 'pointer', background: open ? '#f0fdf4' : '#fff',
          transition: 'background .15s',
        }}
        onMouseOver={e => { if (!open) e.currentTarget.style.background = '#f9f9f9'; }}
        onMouseOut={e  => { if (!open) e.currentTarget.style.background = '#fff'; }}
      >
        <span style={{ fontSize: 16, transition: 'transform .2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', color: open ? '#166534' : '#555' }}>▶</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: open ? '#166534' : '#333' }}>
            {programa} <span style={{ color: '#64748b', fontWeight: 600, fontSize: 13, marginLeft: 8 }}>({actas ? `Actas: ${actas}` : 'Sin actas'})</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
            {total} producto{total !== 1 ? 's' : ''} aprobado{total !== 1 ? 's' : ''} · {totalPts.toFixed(1)} puntos asignados en total
          </div>
        </div>
        <button
          className="btn btn-p btn-sm"
          onClick={e => { e.stopPropagation(); generarDocumento(grupo.tipoResolucion, [grupo]); }}
          style={{ fontSize: 12, padding: '8px 16px', background: '#1a5fa8' }}
        >
          📄 Exportar Resolución Consolidada
        </button>
      </div>

      {/* Accordion body */}
      {open && (
        <div style={{ padding: '12px 20px 20px 48px', background: '#fcfcfc' }}>
          {solicitudes.map(s => {
            const t = TIPOS[s.tipo] || {};
            return (
              <div
                key={s.id}
                onClick={() => onSelect(s)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  marginBottom: 8, borderRadius: 8, border: '1px solid #e5e7eb',
                  cursor: 'pointer', background: '#fff', transition: 'background .15s, box-shadow .15s',
                }}
                onMouseOver={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,.04)'; }}
                onMouseOut={e  => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  {t.icon || '📄'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#333' }}>{s.docente}</div>
                  <div style={{ fontSize: 12, color: '#555', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
                    {s.titulo}
                  </div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                    {t.label || s.tipo} · Cédula: {s.cedula || '—'} · <strong style={{ color: '#006B3F' }}>Acta: {s.acta_ciarp || s.sesion_ciarp_id || '—'}</strong>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 900, color: '#15803d', fontSize: 18 }}>
                    {s.pts_asig != null ? `+${Number(s.pts_asig).toFixed(1)} pts` : '—'}
                  </div>
                  <span style={{ fontSize: 10, background: '#f3f4f6', color: '#4b5563', padding: '3px 8px', borderRadius: 99, fontWeight: 700, marginTop: 4, display: 'inline-block' }}>
                    {labelEtapa(s.etapa)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function Resoluciones({ solicitudes, onSelect }) {
  const [anioFiltro, setAnioFiltro] = useState(new Date().getFullYear().toString());
  const [tab, setTab] = useState('productividad'); // 'productividad' o 'experiencia'
  
  const programaGroups = buildProgramaGroups(solicitudes, anioFiltro, tab);
  const [buscar, setBuscar] = useState('');

  const totalElegibles = programaGroups.reduce((acc, g) => acc + g.solicitudes.length, 0);

  const q = buscar.toLowerCase();
  const gruposFiltrados = programaGroups.map(g => {
    if (!q) return g;
    const matchsPrograma = g.programa.toLowerCase().includes(q);
    const solsFiltered = g.solicitudes.filter(s => 
      s.docente.toLowerCase().includes(q) || 
      s.titulo.toLowerCase().includes(q) || 
      (s.cedula && String(s.cedula).includes(q))
    );
    // Si el nombre del programa hace match, mostramos todos los del programa. 
    // Si no, mostramos solo las solicitudes que hacen match.
    return {
      ...g,
      solicitudes: matchsPrograma ? g.solicitudes : solsFiltered
    };
  }).filter(g => g.solicitudes.length > 0);

  return (
    <div style={{ padding: '32px 28px', maxWidth: 1080, margin: '0 auto', fontFamily: "'Nunito', sans-serif" }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: '#0d3d6e', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
            🏛️ Resoluciones Semestrales
          </h2>
          <p style={{ color: '#555', fontSize: 13, margin: 0 }}>
            Agrupadas por <strong>Programa Académico</strong> · {totalElegibles} productos en {anioFiltro}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select 
            value={anioFiltro} 
            onChange={e => setAnioFiltro(e.target.value)}
            style={{ padding: '9px 12px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 13, fontWeight: 700, background: '#fff', color: '#333' }}
          >
            <option value="2026">Año 2026</option>
            <option value="2025">Año 2025</option>
            <option value="2024">Año 2024</option>
            <option value="2023">Año 2023</option>
            <option value="2022">Año 2022</option>
            <option value="2021">Año 2021</option>
            <option value="2020">Año 2020</option>
          </select>
          
          <input
            placeholder="🔍 Buscar docente o programa..."
            value={buscar}
            onChange={e => setBuscar(e.target.value)}
            style={{ padding: '10px 16px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 13, minWidth: 260 }}
          />
          <button
            onClick={() => {
              generarDocumento(tab === 'productividad' ? 'resolucion_productividad' : 'resolucion_experiencia', gruposFiltrados);
            }}
            style={{ padding: '10px 18px', borderRadius: 8, background: '#006B3F', color: '#fff', border: 'none', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            📥 Exportar Vista a Word
          </button>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '2px solid #e5e7eb', paddingBottom: 10 }}>
        <button 
          onClick={() => setTab('productividad')}
          style={{ padding: '8px 16px', background: tab === 'productividad' ? '#0d3d6e' : '#f3f4f6', color: tab === 'productividad' ? '#fff' : '#4b5563', borderRadius: 8, fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          📄 Productividad Académica
        </button>
        <button 
          onClick={() => setTab('experiencia')}
          style={{ padding: '8px 16px', background: tab === 'experiencia' ? '#0d3d6e' : '#f3f4f6', color: tab === 'experiencia' ? '#fff' : '#4b5563', borderRadius: 8, fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          💼 Experiencia Calificada y Desempeño
        </button>
      </div>

      {programaGroups.length === 0 && (
        <div style={{ padding: 80, textAlign: 'center', color: '#aaa', background: '#fff', borderRadius: 16, border: '1px dashed #d1d5db' }}>
          <div style={{ fontSize: 54, marginBottom: 16 }}>📜</div>
          <div style={{ fontWeight: 800, fontSize: 20, color: '#555' }}>No hay productos listos para resolución</div>
          <div style={{ fontSize: 14, marginTop: 8 }}>
            Los productos aprobados en el comité aparecerán aquí agrupados por su programa.
          </div>
        </div>
      )}

      {/* LISTA DE PROGRAMAS */}
      {gruposFiltrados.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb', fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Programas Académicos con Novedades ({gruposFiltrados.length})
          </div>
          {gruposFiltrados.map((grupo) => (
            <ProgramaSection key={grupo.key} grupo={grupo} onSelect={onSelect} />
          ))}
        </div>
      )}
      
      {buscar && gruposFiltrados.length === 0 && programaGroups.length > 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
          No se encontraron resultados para "{buscar}"
        </div>
      )}
    </div>
  );
}
