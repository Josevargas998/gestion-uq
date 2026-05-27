import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  fetchSesionesCei, createSesionCei, getSiguienteNumeroCei,
  getInformeSesionCei, cerrarYAbrirSesionCei
} from '../utils/api.js';
import { exportarCIARP } from '../utils/exportCiarp.js';
import { useSolicitudes } from '../context/SolicitudesContext.jsx';
import { useNotification } from '../context/NotificationContext.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import { useDocentesIndex } from '../hooks/useDocentesData.js';
import { 
  CheckCircle, XCircle, AlertTriangle, Landmark, Hourglass, 
  ClipboardList, Inbox, GraduationCap, Briefcase, FileText, 
  Search, User, FolderOpen, Scale, Download, Plus, X, Calendar, Edit3, Trash2
} from 'lucide-react';

/* ── Helpers ─────────────────────────────────── */
function parseCeiInfo(notas) {
  if (!notas) return {};
  try { return JSON.parse(notas); } catch { return {}; }
}

function getEtapaBadge(etapa, estado) {
  if (estado === 'aprobado')    return { label: <><CheckCircle size={12}/> Aprobado CEI</>,     bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' };
  if (estado === 'rechazado')   return { label: <><XCircle size={12}/> Negado CEI</>,        bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
  if (estado === 'en_revision') return { label: <><AlertTriangle size={12}/> Requiere revisión</>, bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
  if (etapa  === 'informe')     return { label: <><Landmark size={12}/> Listo para CEI</>,    bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' };
  if (etapa  === 'pares_externos') return { label: <><Hourglass size={12}/> Evaluando pares</>, bg: '#f5f3ff', color: '#7c3aed', border: '#e11d48' };
  if (etapa  === 'clasificada') return { label: <><ClipboardList size={12}/> Clasificada</>,       bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' };
  return { label: <><Inbox size={12}/> Recibida</>, bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' };
}

function getTipoContratoBadge(tipo) {
  const t = (tipo || '').toLowerCase();
  if (t.includes('planta'))   return { label: <><Landmark size={12}/> Planta</>,      color: '#006B3F', bg: '#f0fdf4' };
  if (t.includes('catedra'))  return { label: <><GraduationCap size={12}/> Catedrático</>, color: '#6d28d9', bg: '#f5f3ff' };
  if (t.includes('ocasion'))  return { label: <><ClipboardList size={12}/> Ocasional</>,   color: '#92400e', bg: '#fffbeb' };
  return { label: <><Briefcase size={12}/> {tipo || '—'}</>, color: '#555', bg: '#f5f5f5' };
}

/* ── Componente principal ─────────────────────── */
export default function ModuloCEI({ user, solicitudesAscenso = [], onSelect }) {
  const { actualizar, eliminar, crear } = useSolicitudes();
  const { success, error: showError } = useNotification();
  const { data: docentesDB } = useDocentesIndex();
  const [mainTab, setMainTab]   = useState('ascensos'); // 'ascensos' | 'sesiones'
  const [faseTab,  setFaseTab]  = useState('en_proceso');
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState(null);
  const [solicitudAEliminar, setSolicitudAEliminar] = useState(null);
  const [showNuevaModal, setShowNuevaModal] = useState(false);
  const [nuevaForm, setNuevaForm] = useState({ docente:'', cedula:'', correo:'', programa:'', facultad:'', titulo:'', tipoTrabajo:'Ascenso', dedicacion:'Tiempo Completo', escolaridad:'Maestría', categoriaActual:'ASISTENTE', tipoContrato:'Planta' });
  const [nuevaQuery, setNuevaQuery] = useState('');
  const [showNuevaSuggest, setShowNuevaSuggest] = useState(false);
  const [nuevaDocenteCargado, setNuevaDocenteCargado] = useState(false);
  const [nuevaGuardando, setNuevaGuardando] = useState(false);
  const nuevaSuggestRef = useRef(null);

  // Cerrar dropdown de sugerencias al hacer clic fuera
  useEffect(() => {
    const handler = (e) => {
      if (nuevaSuggestRef.current && !nuevaSuggestRef.current.contains(e.target)) {
        setShowNuevaSuggest(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const nuevaSuggestions = nuevaQuery.length >= 2
    ? docentesDB.filter(d =>
        d.nombre.toLowerCase().includes(nuevaQuery.toLowerCase()) ||
        d.cedula.includes(nuevaQuery)
      ).slice(0, 8)
    : [];

  function pickNuevaDocente(d) {
    setNuevaForm(f => ({ ...f, docente: d.nombre, cedula: d.cedula, programa: d.programa || '', facultad: d.facultad || '', correo: d.correo || '' }));
    setNuevaQuery(d.nombre);
    setShowNuevaSuggest(false);
    setNuevaDocenteCargado(true);
  }

  async function handleCrearAscenso(e) {
    e.preventDefault();
    if (!nuevaForm.cedula || !nuevaForm.titulo) {
      showError('Cédula y título son requeridos');
      return;
    }
    setNuevaGuardando(true);
    const notas = JSON.stringify({
      tipo_trabajo: nuevaForm.tipoTrabajo,
      dedicacion:   nuevaForm.dedicacion,
      escolaridad:  nuevaForm.escolaridad,
      categoria_actual: nuevaForm.categoriaActual,
      tipo_contrato: nuevaForm.tipoContrato,
    });
    const sol = {
      cedula:  nuevaForm.cedula,
      docente: nuevaForm.docente,
      correo:  nuevaForm.correo,
      programa: nuevaForm.programa,
      facultad: nuevaForm.facultad,
      titulo:  nuevaForm.titulo,
      tipo:    'ascenso',
      etapa:   'clasificada',
      estado:  'en_proceso',
      notas,
      pts_sug: 0,
      pts_asig: null,
      fecha: new Date().toISOString().split('T')[0],
    };
    const result = await crear(sol);
    setNuevaGuardando(false);
    if (result.success) {
      success('Solicitud de ascenso creada exitosamente');
      setShowNuevaModal(false);
      setNuevaForm({ docente:'', cedula:'', correo:'', programa:'', facultad:'', titulo:'', tipoTrabajo:'Ascenso', dedicacion:'Tiempo Completo', escolaridad:'Maestría', categoriaActual:'ASISTENTE', tipoContrato:'Planta' });
      setNuevaQuery('');
      setNuevaDocenteCargado(false);
    } else {
      showError('No se pudo crear la solicitud. Verifica la conexión.');
    }
  }

  // Clasificar solicitudes según etapa real
  const enProceso = useMemo(() =>
    solicitudesAscenso.filter(r =>
      !['archivada'].includes(r.etapa) && !['aprobado','rechazado'].includes(r.estado)
    ), [solicitudesAscenso]);

  const listosCEI = useMemo(() =>
    solicitudesAscenso.filter(r =>
      r.etapa === 'informe' && r.estado === 'en_proceso'
    ), [solicitudesAscenso]);

  const evaluados = useMemo(() =>
    solicitudesAscenso.filter(r =>
      r.etapa === 'archivada' || ['aprobado','rechazado'].includes(r.estado)
    ), [solicitudesAscenso]);

  const currentList = faseTab === 'en_proceso' ? enProceso
                    : faseTab === 'listos'     ? listosCEI
                    : evaluados;

  const filtered = useMemo(() => {
    if (!search.trim()) return currentList;
    const q = search.toLowerCase();
    return currentList.filter(r =>
      (r.docente && r.docente.toLowerCase().includes(q)) ||
      (r.cedula && String(r.cedula).includes(q)) ||
      (r.programa && r.programa.toLowerCase().includes(q)) ||
      (r.titulo && r.titulo.toLowerCase().includes(q))
    );
  }, [search, currentList]);

  const stats = useMemo(() => ({
    total:     solicitudesAscenso.length,
    aprobados: solicitudesAscenso.filter(r => r.estado === 'aprobado').length,
    negados:   solicitudesAscenso.filter(r => r.estado === 'rechazado').length,
    listos:    listosCEI.length,
    proceso:   enProceso.filter(r => r.etapa !== 'informe').length,
  }), [solicitudesAscenso, listosCEI, enProceso]);

  if (selected) return (
    <DetalleCEI 
      sol={selected} 
      onBack={() => setSelected(null)} 
      onUpdate={async (updatedSol) => {
        const res = await actualizar(updatedSol);
        if (res.success) {
          setSelected(res.sol);
          success('Solicitud CEI actualizada con éxito');
        } else {
          showError('Error al actualizar la solicitud CEI');
        }
      }} 
      user={user}
    />
  );

  const tabBtn = (key, label, count, activeColor = 'var(--uq-blue)') => (
    <button key={key} onClick={() => setFaseTab(key)} style={{
      padding: '10px 18px', borderRadius: 10, border: '1px solid',
      borderColor: faseTab === key ? activeColor : 'var(--border)',
      background: faseTab === key ? activeColor : 'var(--surface)',
      color: faseTab === key ? '#fff' : 'var(--muted)',
      fontSize: 13, fontWeight: 600, cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 8, transition: 'all .2s'
    }}>
      {label}
      <span style={{
        background: faseTab === key ? 'rgba(255,255,255,.25)' : 'var(--bg)',
        color: faseTab === key ? '#fff' : 'var(--muted)',
        borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700,
      }}>{count}</span>
    </button>
  );

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1280, margin: '0 auto' }}>

      {/* Cabecera */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text)', display:'flex', alignItems:'center', gap:10, letterSpacing: '-0.02em' }}>
          <Scale size={28} color="var(--uq-blue)" /> Módulo CEI — Ascensos en el Escalafón
        </h2>
        <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: 13, fontWeight: 500 }}>
          Comité de Evaluación Institucional · Acuerdo 121 de 2021 · Proceso completo de solicitudes
        </p>
      </div>

      {/* TABS PRINCIPALES */}
      <div style={{ display:'flex', gap:8, marginBottom:32, borderBottom:'1px solid var(--border)' }}>
        {[{ id:'ascensos', label:<><ClipboardList size={16}/> Solicitudes de Ascenso</> }, { id:'sesiones', label:<><Landmark size={16}/> Sesiones CEI</> }].map(t => (
          <button key={t.id} onClick={() => setMainTab(t.id)}
            style={{ padding:'12px 24px', fontSize:14,
              fontWeight: mainTab === t.id ? 600 : 500,
              background: mainTab === t.id ? 'var(--surface)' : 'transparent',
              color: mainTab === t.id ? 'var(--uq-blue)' : 'var(--muted)',
              border: '1px solid transparent',
              borderBottom: 'none',
              cursor:'pointer', borderRadius:'12px 12px 0 0', transition:'all .2s',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: mainTab === t.id ? '0 -4px 12px rgba(0,0,0,.03)' : 'none',
              borderColor: mainTab === t.id ? 'var(--border)' : 'transparent',
              position: 'relative', top: 1,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB SESIONES CEI */}
      {mainTab === 'sesiones' && <PanelSesionesCei user={user} />}

      {/* TAB ASCENSOS */}
      {mainTab === 'ascensos' && (
        <div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Total Solicitudes', val: stats.total,     color: '#1a5fa8', icon: <ClipboardList size={22}/> },
          { label: 'En Evaluación',     val: stats.proceso,   color: '#7c3aed', icon: <Hourglass size={22}/> },
          { label: 'Listos para CEI',   val: stats.listos,    color: '#0369a1', icon: <Landmark size={22}/> },
          { label: 'Aprobados',         val: stats.aprobados, color: '#15803d', icon: <CheckCircle size={22}/> },
          { label: 'Negados',           val: stats.negados,   color: '#dc2626', icon: <XCircle size={22}/> },
        ].map((s, i) => (
          <div key={i} style={{
            background: 'var(--surface)', border: `1px solid var(--border)`, borderRadius: 16,
            padding: '16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center',
            boxShadow: 'var(--shadow-xs)',
          }}>
            <div style={{ color: s.color, marginBottom: 8, background: `${s.color}15`, padding: 8, borderRadius: 10 }}>{s.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textAlign: 'center', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Pestañas de fase */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {tabBtn('en_proceso', <><Hourglass size={14}/> En Evaluación</>, enProceso.filter(r => r.etapa !== 'informe').length, '#7c3aed')}
        {tabBtn('listos', <><Landmark size={14}/> Listos para CEI</>, listosCEI.length, '#0369a1')}
        {tabBtn('evaluados', <><FolderOpen size={14}/> Evaluados</>, evaluados.length, '#15803d')}

        <div style={{ flex: 1 }} />

        {/* Botón Nueva Solicitud de Ascenso */}
        {(user?.rol === 'admin' || user?.rol === 'tecnico') && (
          <button
            onClick={() => setShowNuevaModal(true)}
            style={{ padding: '10px 18px', borderRadius: 10, background: 'var(--uq-blue)', color: '#fff', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'background .2s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--uq-blue-dk)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--uq-blue)'}
          >
            <Plus size={16} /> Nueva Solicitud
          </button>
        )}

        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar nombre, cédula, programa..."
            style={{ padding: '10px 14px 10px 34px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 13, minWidth: 250, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}
          />
        </div>
        <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', fontWeight: 500 }}>{filtered.length} registros</span>
      </div>

      {/* Tabla */}
      <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--muted)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><FileText size={48} opacity={0.5} /></div>
            <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--text)' }}>No hay solicitudes en esta etapa</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Intenta cambiar el filtro o la búsqueda</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg)', color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                  {['ID','Nombre / Cédula','Programa','Trabajo Presentado','Tipo Contrato','Par Evaluador','Etapa / Estado','Acta CEI','Detalle', user?.rol !== 'lectura' ? 'Eliminar' : null].filter(Boolean).map((h, i) => (
                    <th key={i} style={{ padding: '12px 16px', textAlign: h === 'Eliminar' ? 'center' : 'left', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => {
                  const info = parseCeiInfo(r.notas);
                  const badge = getEtapaBadge(r.etapa, r.estado);
                  const tipoBadge = getTipoContratoBadge(info.tipo_contrato);
                  const par = r.pares_ext?.[0];
                  const parEntrego = par?.estado === 'recibido';

                  return (
                    <tr key={r.id}
                      onClick={() => setSelected(r)}
                      style={{ background: 'var(--surface)', cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'background .15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>
                          {r.id}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', minWidth: 180 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{r.docente && r.docente !== 'Sin autor' ? r.docente : <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Sin docente registrado</span>}</div>
                        <div style={{ color: 'var(--muted)', fontSize: 11, fontFamily: 'monospace' }}>C.C. {r.cedula || '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{info.dedicacion} · {info.escolaridad}</div>
                      </td>
                      <td style={{ padding: '12px 16px', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--muted)' }}>
                        {r.programa}
                      </td>
                      <td style={{ padding: '12px 16px', maxWidth: 200 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)', fontWeight: 600 }} title={r.titulo}>
                          {r.titulo || '—'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{info.tipo_trabajo}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: tipoBadge.bg, color: tipoBadge.color, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
                          {tipoBadge.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', minWidth: 140 }}>
                        {par ? (
                          <>
                            <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 12 }}>{par.nombre}</div>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: parEntrego ? '#15803d' : '#d97706', marginTop: 4 }}>
                              {parEntrego ? <><CheckCircle size={12}/> Entregó</> : <><Hourglass size={12}/> Pendiente</>}
                            </span>
                          </>
                        ) : (
                          <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                            {info.par_es_interno ? '🔄 Pares internos' : '—'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {badge.label}
                        </span>
                        {info.estado_seguimiento && info.estado_seguimiento !== 'APROBADO' && info.estado_seguimiento !== 'NEGADO' && (
                          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>{info.estado_seguimiento}</div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                        {r.acta_ciarp || '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button onClick={e => { e.stopPropagation(); setSelected(r); }}
                          style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--uq-blue)', background: 'var(--surface)', color: 'var(--uq-blue)', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .2s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--uq-blue)'; e.currentTarget.style.color = '#fff'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--uq-blue)'; }}>
                          Ver Detalle →
                        </button>
                      </td>
                      {user?.rol !== 'lectura' && (
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setSolicitudAEliminar(r);
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
                            onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            title="Eliminar solicitud"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
      )}
      {/* Modal Nueva Solicitud de Ascenso */}
      {showNuevaModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2100, backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
             onClick={() => setShowNuevaModal(false)}>
          <div style={{ background: 'var(--surface)', borderRadius: 20, padding: '32px', maxWidth: 560, width: '100%', boxShadow: 'var(--shadow-lg)', maxHeight: '90vh', overflowY: 'auto' }}
               onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)' }}>
                <Scale size={20} color="var(--uq-blue)" /> Nueva Solicitud de Ascenso (CEI)
              </div>
              <button onClick={() => setShowNuevaModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleCrearAscenso} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Búsqueda de docente */}
              <div ref={nuevaSuggestRef} style={{ position: 'relative' }}>
                <label style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Buscar Docente</label>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                  <input
                    value={nuevaQuery}
                    onChange={e => { setNuevaQuery(e.target.value); setShowNuevaSuggest(true); if (!e.target.value) { setNuevaDocenteCargado(false); setNuevaForm(f => ({ ...f, docente: '', cedula: '', correo: '', programa: '', facultad: '' })); } }}
                    placeholder="Nombre o cédula del docente..."
                    style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: 10, border: `1px solid ${nuevaDocenteCargado ? '#15803d' : 'var(--border)'}`, fontSize: 13, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}
                  />
                  {nuevaDocenteCargado && <CheckCircle size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#15803d' }} />}
                </div>
                {showNuevaSuggest && nuevaSuggestions.length > 0 && (
                  <div style={{ position: 'absolute', zIndex: 100, width: '100%', background: '#fff', borderRadius: 10, border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)', marginTop: 4, maxHeight: 200, overflowY: 'auto' }}>
                    {nuevaSuggestions.map(d => (
                      <div key={d.cedula} onClick={() => pickNuevaDocente(d)}
                        style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: 13 }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                        <div style={{ fontWeight: 700 }}>{d.nombre}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>C.C. {d.cedula} · {d.programa}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Cédula *</label>
                  <input value={nuevaForm.cedula} onChange={e => setNuevaForm(f => ({ ...f, cedula: e.target.value }))} required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Correo</label>
                  <input value={nuevaForm.correo} onChange={e => setNuevaForm(f => ({ ...f, correo: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Título / Trabajo presentado *</label>
                <textarea value={nuevaForm.titulo} onChange={e => setNuevaForm(f => ({ ...f, titulo: e.target.value }))} required rows={2}
                  placeholder="Ej: Trabajo de ascenso de categoría de Asistente a Asociado"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg)', color: 'var(--text)', outline: 'none', resize: 'vertical' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Categoría actual</label>
                  <select value={nuevaForm.categoriaActual} onChange={e => setNuevaForm(f => ({ ...f, categoriaActual: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}>
                    <option value="TITULAR">TITULAR</option>
                    <option value="ASOCIADO">ASOCIADO</option>
                    <option value="ASISTENTE">ASISTENTE</option>
                    <option value="AUXILIAR">AUXILIAR</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Tipo de contrato</label>
                  <select value={nuevaForm.tipoContrato} onChange={e => setNuevaForm(f => ({ ...f, tipoContrato: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}>
                    <option>Planta</option>
                    <option>Ocasional</option>
                    <option>Catedrático</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Dedicación</label>
                  <select value={nuevaForm.dedicacion} onChange={e => setNuevaForm(f => ({ ...f, dedicacion: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}>
                    <option>Tiempo Completo</option>
                    <option>Medio Tiempo</option>
                    <option>Tiempo Parcial</option>
                    <option>Catedrático</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Escolaridad</label>
                  <select value={nuevaForm.escolaridad} onChange={e => setNuevaForm(f => ({ ...f, escolaridad: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}>
                    <option>Doctorado</option>
                    <option>Maestría</option>
                    <option>Especialización</option>
                    <option>Pregrado</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                <button type="button" onClick={() => setShowNuevaModal(false)}
                  style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Cancelar</button>
                <button type="submit" disabled={nuevaGuardando}
                  style={{ flex: 2, padding: '12px 0', borderRadius: 10, background: 'var(--uq-blue)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {nuevaGuardando ? <><Hourglass size={16} /> Guardando...</> : <><CheckCircle size={16} /> Crear solicitud</> }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!solicitudAEliminar}
        title="Eliminar Solicitud de Ascenso"
        message={`¿Estás seguro de eliminar permanentemente la solicitud de ascenso de ${solicitudAEliminar?.docente || 'este docente'}? Esta acción es irreversible.`}
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        onConfirm={async () => {
          if (solicitudAEliminar) {
            const res = await eliminar(solicitudAEliminar.id);
            if (res?.success) {
              success('Solicitud de ascenso eliminada con éxito');
              setSolicitudAEliminar(null);
            } else {
              showError("No se pudo eliminar la solicitud.");
            }
          }
        }}
        onCancel={() => setSolicitudAEliminar(null)}
      />
    </div>
  );
}

/* ── Panel Sesiones CEI ─────────────────────── */
function PanelSesionesCei({ user }) {
  const [sesiones, setSesiones]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [descargando, setDescargando] = useState({});

  const [form, setForm] = useState({ numero:'', fecha:'', notas:'' });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError]     = useState('');
  const [cargandoSig, setCargandoSig] = useState(false);

  const cargarSesiones = useCallback(() => {
    setLoading(true);
    fetchSesionesCei()
      .then(data => setSesiones(data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleCerrarYAbrir(sesion) {
    if (!window.confirm(`¿Estás seguro de cerrar la sesión CEI ${sesion.acta_label}? Esta acción cerrará la sesión actual y creará automáticamente la siguiente.`)) return;
    try {
      setLoading(true);
      await cerrarYAbrirSesionCei(sesion.id);
      cargarSesiones();
    } catch (err) {
      alert('Error: ' + err.message);
      setLoading(false);
    }
  }

  useEffect(() => { cargarSesiones(); }, [cargarSesiones]);

  // Auto-sugerir número al abrir modal
  useEffect(() => {
    if (!showModal) return;
    setCargandoSig(true);
    getSiguienteNumeroCei()
      .then(r => setForm(f => ({ ...f, numero: String(r.siguiente) })))
      .catch(() => {})
      .finally(() => setCargandoSig(false));
  }, [showModal]);

  async function descargarInforme(sesion) {
    setDescargando(prev => ({ ...prev, [sesion.id]: true }));
    try {
      const data = await getInformeSesionCei(sesion.id);
      if (!data?.solicitudes?.length) { alert('Esta sesión no tiene solicitudes.'); return; }
      exportarCIARP(data.solicitudes, `CEI ${sesion.acta_label}`);
    } catch (err) { alert('Error: ' + err.message); }
    finally { setDescargando(prev => ({ ...prev, [sesion.id]: false })); }
  }

  async function handleCrear(e) {
    e.preventDefault();
    if (!form.numero) { setFormError('El número es obligatorio'); return; }
    setFormLoading(true); setFormError('');
    try {
      await createSesionCei({ numero: parseInt(form.numero, 10), fecha: form.fecha || null, notas: form.notas || null });
      setShowModal(false); setForm({ numero:'', fecha:'', notas:'' }); cargarSesiones();
    } catch (err) { setFormError(err.message || 'Error al crear'); }
    finally { setFormLoading(false); }
  }

  const puedeCrear = user?.rol === 'admin' || user?.rol === 'tecnico';

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h3 style={{ fontWeight:700, fontSize:18, marginBottom:4, color: 'var(--text)' }}>Historial de Sesiones CEI</h3>
          <p style={{ fontSize:13, color:'var(--muted)', fontWeight: 500 }}>{sesiones.length} sesión{sesiones.length !== 1 ? 'es' : ''} registrada{sesiones.length !== 1 ? 's' : ''}</p>
        </div>
        {puedeCrear && (
          <button onClick={() => setShowModal(true)}
            style={{ padding:'10px 20px', borderRadius:10, background:'var(--uq-blue)', color:'#fff', border:'none', fontWeight:600, fontSize:13, cursor:'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16}/> Nueva Sesión CEI
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:40, color:'var(--muted)' }}><Hourglass size={32} style={{ animation: 'spin 2s linear infinite' }} /></div>
      ) : sesiones.length === 0 ? (
        <div style={{ textAlign:'center', padding:48, color:'var(--muted)', background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom:12 }}><Landmark size={48} opacity={0.5}/></div>
          <div style={{ fontWeight:600, fontSize: 16, color: 'var(--text)' }}>Sin sesiones CEI registradas</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {sesiones.map(s => {
            const fechaStr = s.fecha
              ? new Date(s.fecha).toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric', timeZone:'UTC' })
              : 'Fecha no registrada';
            const isLoad = descargando[s.id];
            return (
              <div key={s.id} style={{ background:'var(--surface)', borderRadius:16, border:'1px solid var(--border)',
                padding:'20px 24px', display:'flex', alignItems:'center', gap:20, flexWrap:'wrap',
                boxShadow:'var(--shadow-xs)', transition: 'box-shadow .2s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow-xs)'}>
                <div style={{ width:48, height:48, borderRadius:12, background:'var(--uq-blue-lt)', color: 'var(--uq-blue)',
                              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Landmark size={24}/>
                </div>
                <div style={{ flex:1, minWidth:200 }}>
                  <div style={{ fontWeight:700, fontSize:16, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    CEI {s.numero} — {s.anio}
                    <span style={{ fontSize:11, fontWeight:600,
                      color: s.estado === 'abierta' ? '#15803d' : 'var(--muted)',
                      background: s.estado === 'abierta' ? '#dcfce7' : 'var(--bg)', border: `1px solid ${s.estado === 'abierta' ? '#bbf7d0' : 'var(--border)'}`,
                      padding:'2px 8px', borderRadius:20 }}>
                      {s.estado}
                    </span>
                  </div>
                  <div style={{ fontSize:13, color:'var(--muted)', marginTop:4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={14}/> {fechaStr} · Acta: {s.acta_label}
                  </div>
                  {s.notas && <div style={{ fontSize:12, color:'var(--muted)', marginTop:6, fontStyle:'italic' }}>{s.notas}</div>}
                </div>
                <div style={{ display:'flex', gap:24, textAlign:'center', fontSize:12 }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:20, color:'#15803d' }}>{s.aprobadas || 0}</div>
                    <div style={{ color:'var(--muted)', fontWeight: 500 }}>Aprobadas</div>
                  </div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:20, color:'var(--uq-blue)' }}>{parseFloat(s.pts_totales || 0).toFixed(1)}</div>
                    <div style={{ color:'var(--muted)', fontWeight: 500 }}>Puntos</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {s.estado === 'abierta' && user?.rol !== 'lectura' && (
                    <button onClick={() => handleCerrarYAbrir(s)} disabled={isLoad}
                      title="Cerrar esta sesión y abrir la siguiente automáticamente"
                      style={{ padding:'8px 16px', borderRadius:10, border:'none', background:'var(--p)', color: '#fff',
                               fontSize:13, cursor:'pointer', fontWeight:600, display: 'flex', alignItems: 'center', gap: 6, transition: 'background .2s' }}>
                      🔄 Cerrar CEI
                    </button>
                  )}
                  <button onClick={() => descargarInforme(s)} disabled={isLoad}
                    style={{ padding:'8px 16px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg)', color: 'var(--text)',
                             fontSize:13, cursor:'pointer', fontWeight:600, display: 'flex', alignItems: 'center', gap: 6, transition: 'background .2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--bg)'}>
                    {isLoad ? '⏳ Generando...' : '📥 Descargar Excel'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal nueva sesión CEI */}
      {showModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:2100, backdropFilter: 'blur(4px)',
                      display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}
             onClick={() => setShowModal(false)}>
          <div style={{ background:'var(--surface)', borderRadius:20, padding:'32px', maxWidth:440, width:'100%',
                        boxShadow:'var(--shadow-lg)' }}
               onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
              <div style={{ fontWeight:700, fontSize:18, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)' }}><Landmark size={20}/> Nueva Sesión CEI</div>
              <button onClick={() => setShowModal(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--muted)' }}><X size={20}/></button>
            </div>
            <form onSubmit={handleCrear}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
                <div>
                  <label style={{ fontSize:13, color:'var(--muted)', fontWeight: 600, display:'block', marginBottom:6 }}>Número de sesión</label>
                  <input type="number" min="1"
                    value={cargandoSig ? '' : form.numero}
                    onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} required 
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 14, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} />
                  <div style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>Auto-sugerido</div>
                </div>
                <div>
                  <label style={{ fontSize:13, color:'var(--muted)', fontWeight: 600, display:'block', marginBottom:6 }}>Fecha de reunión</label>
                  <input type="date" value={form.fecha}
                    onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} 
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 14, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} />
                </div>
              </div>
              <div style={{ marginBottom:20 }}>
                <label style={{ fontSize:13, color:'var(--muted)', fontWeight: 600, display:'block', marginBottom:6 }}>Notas</label>
                <textarea rows={3} value={form.notas}
                  onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                  placeholder="Observaciones..." style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 14, background: 'var(--bg)', color: 'var(--text)', outline: 'none', resize:'vertical' }} />
              </div>
              {formError && (
                <div style={{ padding:'12px 16px', background:'#fef2f2', border: '1px solid #fecaca', borderRadius:10, fontSize:13, color:'#dc2626', marginBottom:16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <XCircle size={16}/> {formError}
                </div>
              )}
              <div style={{ display:'flex', gap:12 }}>
                <button type="button" onClick={() => setShowModal(false)}
                  style={{ flex:1, padding:'12px 0', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg)', color: 'var(--text)', cursor:'pointer', fontWeight:600 }}>Cancelar</button>
                <button type="submit" disabled={formLoading}
                  style={{ flex:2, padding:'12px 0', borderRadius:10, background:'var(--uq-blue)', color:'#fff', border:'none', cursor:'pointer', fontWeight:600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {formLoading ? <Hourglass size={16}/> : <CheckCircle size={16}/>} {formLoading ? 'Guardando...' : 'Crear sesión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


/* ── Detalle de solicitud CEI ─────────────────── */
function DetalleCEI({ sol, onBack, onUpdate, user }) {
  const info = parseCeiInfo(sol.notas);
  const badge = getEtapaBadge(sol.etapa, sol.estado);
  const tipoBadge = getTipoContratoBadge(info.tipo_contrato);

  // --- Form State ---
  const [etapa, setEtapa] = useState(sol.etapa || 'recibida');
  const [estado, setEstado] = useState(sol.estado || 'en_proceso');
  const [ptsAsig, setPtsAsig] = useState(sol.pts_asig != null ? sol.pts_asig : '');
  const [sesionCeiId, setSesionCeiId] = useState(sol.sesion_cei_id || '');
  const [actaCiarp, setActaCiarp] = useState(sol.acta_ciarp || '');

  // Resolution & Tracking Fields
  const [resPago, setResPago] = useState(info.res_pago || '');
  const [resAscenso, setResAscenso] = useState(info.res_ascenso_cei || '');
  const [resPuntos, setResPuntos] = useState(info.res_puntos_ciarp || '');
  const [notasSeguimiento, setNotasSeguimiento] = useState(info.alertas || '');

  // Docente & Contract Metadata
  const [dedicacion, setDedicacion] = useState(info.dedicacion || 'Tiempo Completo');
  const [escolaridad, setEscolaridad] = useState(info.escolaridad || 'Maestría');
  const [categoriaActual, setCategoriaActual] = useState(info.categoria_actual || 'ASISTENTE');
  const [tipoTrabajo, setTipoTrabajo] = useState(info.tipo_trabajo || 'Ascenso');
  const [cargo, setCargo] = useState(info.cargo || 'Docente');
  const [tipoContrato, setTipoContrato] = useState(info.tipo_contrato || 'Planta');
  const [areaConocimiento, setAreaConocimiento] = useState(info.area_conocimiento || '');

  // Solicitud general fields
  const [docente, setDocente] = useState(sol.docente || '');
  const [cedula, setCedula] = useState(sol.cedula || '');
  const [correo, setCorreo] = useState(sol.correo || '');
  const [facultad, setFacultad] = useState(sol.facultad || '');
  const [programa, setPrograma] = useState(sol.programa || '');
  const [titulo, setTitulo] = useState(sol.titulo || '');

  // Sessions List State
  const [sesiones, setSesiones] = useState([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    fetchSesionesCei()
      .then(data => {
        setSesiones(data || []);
        if (!sesionCeiId) {
          const abierta = data?.find(s => s.estado === 'abierta');
          if (abierta) {
            setSesionCeiId(abierta.id);
            setActaCiarp(abierta.acta_label);
          }
        }
      })
      .catch(console.error);
  }, [sesionCeiId]);

  // Sync acta_ciarp when session changes
  const handleSesionChange = (id) => {
    setSesionCeiId(id);
    if (!id) {
      setActaCiarp('');
    } else {
      const selectedSes = sesiones.find(s => s.id === id);
      if (selectedSes) {
        setActaCiarp(selectedSes.acta_label);
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setGuardando(true);

    const nuevasNotas = JSON.stringify({
      ...info,
      res_pago: resPago,
      res_ascenso_cei: resAscenso,
      res_puntos_ciarp: resPuntos,
      alertas: notasSeguimiento,
      dedicacion,
      escolaridad,
      categoria_actual: categoriaActual,
      tipo_trabajo: tipoTrabajo,
      cargo,
      tipo_contrato: tipoContrato,
      area_conocimiento: areaConocimiento
    });

    const updatedSol = {
      ...sol,
      etapa,
      estado,
      pts_asig: ptsAsig !== '' ? Number(ptsAsig) : null,
      sesion_cei_id: sesionCeiId || null,
      acta_ciarp: actaCiarp || null,
      notas: nuevasNotas,
      docente,
      cedula,
      correo,
      facultad,
      programa,
      titulo
    };

    await onUpdate(updatedSol);
    setGuardando(false);
  };

  const canEdit = user?.rol === 'admin' || user?.rol === 'tecnico';

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      <button onClick={onBack} style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px',
        borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
        fontSize: 13, cursor: 'pointer', marginBottom: 24, fontWeight: 600, transition: 'background .2s'
      }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}>
        ← Volver al módulo CEI
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: canEdit ? '3fr 2fr' : '1fr', gap: 24 }}>
        
        {/* COLUMNA IZQUIERDA: DETALLES DE LA SOLICITUD */}
        <div>
          {/* Cabecera */}
          <div style={{ background: 'linear-gradient(135deg, #1a5fa8 0%, #0d3d6e 100%)', borderRadius: 20, padding: '32px', color: '#fff', marginBottom: 24, boxShadow: 'var(--shadow-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>{docente || 'Sin docente'}</div>
                <div style={{ opacity: .9, fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}><User size={14}/> C.C. {cedula} · {correo}</div>
                <div style={{ opacity: .9, fontSize: 13, marginTop: 4, fontWeight: 500 }}>{facultad}</div>
                <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                  <span style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)', borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {tipoBadge.label}
                  </span>
                  <span style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)', borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <GraduationCap size={14}/> {dedicacion} · {escolaridad}
                  </span>
                  {info.radicado && (
                    <span style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)', borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FileText size={14}/> {info.radicado}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, opacity: .8, fontWeight: 500 }}>Categoría actual</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{categoriaActual}</div>
                <div style={{ marginTop: 12, background: badge.bg, color: badge.color, borderRadius: 20, padding: '6px 16px', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, border: `1px solid ${badge.border}` }}>
                  {badge.label}
                </div>
                {actaCiarp && (
                  <div style={{ marginTop: 8, opacity: .9, fontSize: 12, fontWeight: 500 }}>Acta CEI: {actaCiarp}</div>
                )}
              </div>
            </div>
          </div>

          {/* Grid info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Trabajo presentado', val: titulo },
              { label: 'Tipo de trabajo', val: tipoTrabajo },
              { label: 'Programa', val: programa },
              { label: 'Área de conocimiento', val: areaConocimiento },
              { label: 'Cargo', val: cargo },
              { label: 'Fecha de solicitud', val: sol.fecha },
            ].map((f, i) => (
              <div key={i} style={{ background: 'var(--surface)', borderRadius: 12, padding: '16px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 }}>{f.label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{f.val || '—'}</div>
              </div>
            ))}
          </div>

          {/* Par evaluador */}
          {sol.pares_ext?.length > 0 && (
            <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', padding: '20px 24px', marginBottom: 20, boxShadow: 'var(--shadow-xs)' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--uq-blue)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><User size={18}/> Par(es) Evaluador(es)</div>
              {sol.pares_ext.map((p, i) => {
                const parEntrego = p.estado === 'recibido';
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < sol.pares_ext.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>{p.nombre}</div>
                      {p.fecha_envio && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Enviado: {p.fecha_envio}</div>}
                    </div>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: parEntrego ? '#f0fdf4' : '#fffbeb',
                      color: parEntrego ? '#15803d' : '#d97706',
                      border: `1px solid ${parEntrego ? '#bbf7d0' : '#fde68a'}`,
                      borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600,
                    }}>
                      {parEntrego ? <><CheckCircle size={14}/> Evaluación entregada</> : <><Hourglass size={14}/> Pendiente de entrega</>}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Resoluciones y pagos */}
          {(resPago || resAscenso || resPuntos) && (
            <div style={{ background: '#f0fdf4', borderRadius: 16, border: '1px solid #86efac', padding: '20px 24px', marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#166534', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={18}/> Resoluciones emitidas</div>
              {resPago && resPago !== 'SIGUE' && (
                <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 6 }}>
                  <strong style={{ color: '#166534' }}>Res. Pago par:</strong> {resPago}
                </div>
              )}
              {resAscenso && (
                <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 6 }}>
                  <strong style={{ color: '#166534' }}>Res. Ascenso CEI:</strong> {resAscenso}
                </div>
              )}
              {resPuntos && (
                <div style={{ fontSize: 13, color: 'var(--text)' }}>
                  <strong style={{ color: '#166534' }}>Res. Puntos CIARP:</strong> {resPuntos}
                </div>
              )}
            </div>
          )}

          {/* Notas de seguimiento */}
          {notasSeguimiento && (
            <div style={{ background: '#fffbeb', borderRadius: 16, border: '1px solid #fcd34d', padding: '20px 24px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}><Edit3 size={16}/> Notas de seguimiento</div>
              <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>{notasSeguimiento}</div>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: PROCESADOR DE ASCENSOS CEI */}
        {canEdit && (
          <div style={{ background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border)', padding: '24px', boxShadow: 'var(--shadow-md)', alignSelf: 'start' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              <Scale size={20} color="var(--uq-blue)" /> Procesar Ascenso (CEI)
            </h3>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Docente</label>
                <input value={docente} onChange={e => setDocente(e.target.value)} required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Cédula</label>
                  <input value={cedula} onChange={e => setCedula(e.target.value)} required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Correo</label>
                  <input value={correo} onChange={e => setCorreo(e.target.value)} required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Programa</label>
                  <input value={programa} onChange={e => setPrograma(e.target.value)} required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Facultad</label>
                  <input value={facultad} onChange={e => setFacultad(e.target.value)} required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Título del trabajo presentado</label>
                <textarea value={titulo} onChange={e => setTitulo(e.target.value)} rows={2} required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg)', color: 'var(--text)', outline: 'none', resize: 'vertical' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, borderTop: '1px dashed var(--border)', paddingTop: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Etapa actual</label>
                  <select value={etapa} onChange={e => setEtapa(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}>
                    <option value="recibida">📥 Recibida</option>
                    <option value="clasificada">📁 Clasificada</option>
                    <option value="pares_externos">👥 Evaluando pares</option>
                    <option value="informe">🏛️ Listo para CEI</option>
                    <option value="resolucion">📄 Resolución</option>
                    <option value="archivada">📦 Archivada</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Estado</label>
                  <select value={estado} onChange={e => setEstado(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}>
                    <option value="en_proceso">⏳ En proceso</option>
                    <option value="aprobado">✅ Aprobado CEI</option>
                    <option value="rechazado">❌ Negado CEI</option>
                    <option value="en_revision">⚠️ Requiere revisión</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Sesión CEI (Acta)</label>
                  <select value={sesionCeiId} onChange={e => handleSesionChange(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}>
                    <option value="">Ninguna sesión vinculada</option>
                    {sesiones.map(s => (
                      <option key={s.id} value={s.id}>CEI {s.numero} ({s.anio})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Puntos CEI</label>
                  <input type="number" step="0.1" min="0" value={ptsAsig} onChange={e => setPtsAsig(e.target.value)}
                    placeholder="Ej: 15.0"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, borderTop: '1px dashed var(--border)', paddingTop: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Categoría docente</label>
                  <select value={categoriaActual} onChange={e => setCategoriaActual(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}>
                    <option value="TITULAR">TITULAR</option>
                    <option value="ASOCIADO">ASOCIADO</option>
                    <option value="ASISTENTE">ASISTENTE</option>
                    <option value="AUXILIAR">AUXILIAR</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Tipo de contrato</label>
                  <input value={tipoContrato} onChange={e => setTipoContrato(e.target.value)}
                    placeholder="Ej: Planta"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Dedicación</label>
                  <input value={dedicacion} onChange={e => setDedicacion(e.target.value)}
                    placeholder="Ej: Tiempo Completo"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Escolaridad</label>
                  <input value={escolaridad} onChange={e => setEscolaridad(e.target.value)}
                    placeholder="Ej: Doctorado"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} />
                </div>
              </div>

              <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 12 }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Proyección de Resoluciones</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>Res. de Ascenso CEI</label>
                    <input value={resAscenso} onChange={e => setResAscenso(e.target.value)} placeholder="Ej: Res. 4520 de 2026"
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>Res. de Puntos CIARP</label>
                    <input value={resPuntos} onChange={e => setResPuntos(e.target.value)} placeholder="Ej: Res. 4521 de 2026"
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>Res. de Pago Evaluadores</label>
                    <input value={resPago} onChange={e => setResPago(e.target.value)} placeholder="Ej: Res. 1205 de 2026"
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} />
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Notas de seguimiento / alertas</label>
                <textarea value={notasSeguimiento} onChange={e => setNotasSeguimiento(e.target.value)} rows={3} placeholder="Escribe observaciones aquí..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg)', color: 'var(--text)', outline: 'none', resize: 'vertical' }} />
              </div>

              <button type="submit" disabled={guardando}
                style={{
                  width: '100%', marginTop: 8, padding: '12px', borderRadius: 10,
                  background: 'var(--uq-blue)', color: '#fff',
                  border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'background .2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--uq-blue-dk)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--uq-blue)'}
              >
                {guardando ? <Hourglass size={16} /> : <CheckCircle size={16} />}
                {guardando ? 'Guardando Cambios...' : 'Guardar Cambios CEI'}
              </button>

            </form>
          </div>
        )}

      </div>
    </div>
  );
}
