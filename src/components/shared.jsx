import React from 'react';
import { ETAPAS, TIPOS } from '../data.js';
import { etapaIdx, labelEtapa, badgeEtapa, rutaLabel } from '../helpers.js';
import { Trash2 } from 'lucide-react';

export function PageHeader({ title, sub, action }) {
  return (
    <div style={{ padding: '24px 28px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a' }}>{title}</h2>
        {sub && <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, sub, color = 'var(--g)' }) {
  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export function ProgressBar({ etapa, ruta }) {
  const visible = ETAPAS.filter(e => {
    if (ruta === 'directo' || ruta === 'informe_directo') {
      return !['pares_internos', 'pares_externos'].includes(e.id);
    }
    if (ruta === 'externos') {
      return e.id !== 'pares_internos';
    }
    if (ruta === 'cei') {
      return !['pares_internos', 'pares_externos', 'informe', 'ciarp'].includes(e.id);
    }
    return true;
  });
  const idx = visible.findIndex(e => e.id === etapa);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', width: '100%', overflowX: 'auto', paddingBottom: '10px' }}>
      {visible.map((e, i) => {
        const done   = i < idx;
        const active = i === idx;
        return (
          <div key={e.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            {i < visible.length - 1 && (
              <div style={{ position: 'absolute', top: 12, left: '50%', right: '-50%', height: 2, background: done ? 'var(--g)' : 'var(--border)', zIndex: 0 }} />
            )}
            <div style={{
              width: 24, height: 24, borderRadius: '50%', zIndex: 1, position: 'relative',
              border: `2px solid ${done || active ? 'var(--g)' : 'var(--border)'}`,
              background: done ? 'var(--g)' : active ? 'var(--gl)' : '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700,
              color: done ? '#fff' : active ? 'var(--g)' : 'var(--muted)',
            }}>
              {done ? '✓' : e.short}
            </div>
            <div style={{
              fontSize: 9, marginTop: 4, textAlign: 'center', lineHeight: 1.2,
              color: active ? 'var(--g)' : done ? 'var(--gm)' : 'var(--muted)',
              fontWeight: active || done ? 700 : 400,
            }}>{e.label}</div>
          </div>
        );
      })}
    </div>
  );
}

export function RutaTag({ tipo }) {
  const t = TIPOS[tipo];
  if (!t) return null;
  const colors = { directo: 'bg', internos: 'ba', externos: 'bb', informe_directo: 'bp' };
  return <span className={`badge ${colors[t.ruta] || 'bgr'}`}>{rutaLabel(t.ruta)}</span>;
}

export function SolRow({ s, onClick, onEliminar, user }) {
  const t     = TIPOS[s.tipo];
  const vence = s.pares_int?.vence || s.pares_ext?.[0]?.vence;
  const canDelete = user?.rol !== 'lectura' && onEliminar;

  return (
    <tr className="hover-row" onClick={onClick} style={{ borderBottom: '1px solid var(--border)' }}>
      <td style={{ padding: '12px 16px' }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>{s.id}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.fecha}</div>
      </td>
      <td style={{ padding: '12px 8px' }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>{s.docente}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.programa}</div>
      </td>
      <td style={{ padding: '12px 8px' }}>
        <div style={{ fontSize: 12, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.titulo}</div>
        {t && <div style={{ fontSize: 11, marginTop: 3 }}>{t.icon ? `${t.icon} ` : ''}{t.label}</div>}
      </td>
      <td style={{ padding: '12px 8px' }}>
        <span className={`badge ${badgeEtapa(s.etapa)}`}>{labelEtapa(s.etapa)}</span>
        {vence && <div style={{ fontSize: 10, color: 'var(--warning)', marginTop: 3 }}>⚠ Vence: {vence}</div>}
      </td>
      <td style={{ padding: '12px 8px', textAlign: 'right' }}>
        {s.pts_asig != null
          ? <span style={{ fontWeight: 700, color: 'var(--g)', fontSize: 15 }}>{s.pts_asig} pts</span>
          : <span style={{ color: 'var(--muted)', fontSize: 12 }}>Pendiente</span>}
      </td>
      {canDelete && (
        <td style={{ padding: '12px 8px', textAlign: 'center' }}>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onEliminar(s);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#dc2626',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all .15s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#fef2f2';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
            }}
            title="Eliminar producto"
          >
            <Trash2 size={15} />
          </button>
        </td>
      )}
    </tr>
  );
}

export function TableWrapper({ cols, children, empty = 'No hay solicitudes' }) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--gp)' }}>
            {cols.map(c => (
              <th key={c} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .4 }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {!children || (Array.isArray(children) && children.length === 0) &&
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>{empty}</div>}
    </div>
  );
}
