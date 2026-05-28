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
import PdfUploader from './PdfUploader.jsx';
import { Paperclip, Save } from 'lucide-react';
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
  if (estado === 'aprobado_cei' || estado === 'aprobado') return { label: <><CheckCircle size={12}/> Aprobado CEI</>,     bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' };
  if (estado === 'rechazado_cei' || estado === 'rechazado') return { label: <><XCircle size={12}/> Negado CEI</>,        bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
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
    let escolaridadCalculada = 'Pregrado';
    if (d.doctorado) escolaridadCalculada = 'Doctorado';
    else if (d.maestria) escolaridadCalculada = 'Maestría';
    else if (d.especializacion) escolaridadCalculada = 'Especialización';

    let cat = d.categoriaActual || 'ASISTENTE';
    
    setNuevaForm(f => ({
      ...f,
      docente: d.nombre,
      cedula: d.cedula,
      programa: d.programa || '',
      facultad: d.facultad || '',
      correo: d.correo || '',
      categoriaActual: cat.toUpperCase(),
      tipoContrato: 'Planta', // Asumimos planta al venir de la base de datos
      dedicacion: d.dedicacion || 'Tiempo Completo',
      escolaridad: escolaridadCalculada,
    }));
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

  // Clasificar solicitudes según estado CEI
  const ESTADO_APROBADO = (r) => r.estado === 'aprobado_cei' || r.estado === 'aprobado';
  const ESTADO_RECHAZADO = (r) => r.estado === 'rechazado_cei' || r.estado === 'rechazado';
  const ESTADO_FINAL = (r) => ESTADO_APROBADO(r) || ESTADO_RECHAZADO(r);

  const enProceso = useMemo(() =>
    solicitudesAscenso.filter(r =>
      !['archivada'].includes(r.etapa) && !ESTADO_FINAL(r)
    ), [solicitudesAscenso]);

  const listosCEI = useMemo(() =>
    solicitudesAscenso.filter(r =>
      r.etapa === 'informe' && r.estado === 'en_proceso'
    ), [solicitudesAscenso]);

  const evaluados = useMemo(() =>
    solicitudesAscenso.filter(r =>
      r.etapa === 'archivada' || ESTADO_FINAL(r)
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
    aprobados: solicitudesAscenso.filter(r => ESTADO_APROBADO(r)).length,
    negados:   solicitudesAscenso.filter(r => ESTADO_RECHAZADO(r)).length,
    listos:    listosCEI.length,
    proceso:   enProceso.filter(r => r.etapa !== 'informe').length,
  }), [solicitudesAscenso, listosCEI, enProceso]);

  if (selected) return (
    <>
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
        onEliminar={() => setSolicitudAEliminar(selected)}
        user={user}
      />
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
              setSelected(null);
            } else {
              showError("No se pudo eliminar la solicitud.");
            }
          }
        }}
        onCancel={() => setSolicitudAEliminar(null)}
      />
    </>
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
      {mainTab === 'sesiones' && <PanelSesionesCei user={user} solicitudes={solicitudesAscenso} onSelect={setSelected} />}

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
        {(user?.rol === 'admin' || user?.rol === 'asistente' || user?.rol === 'lectura' || user?.rol === 'tecnico') && (
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
                        {r.pares_ext && r.pares_ext.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {r.pares_ext.map((par, i) => {
                              if (!par.nombre) return null;
                              const parEntrego = par.estado === 'recibido';
                              return (
                                <div key={i}>
                                  <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 12 }}>{par.nombre}</div>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: parEntrego ? '#15803d' : '#d97706', marginTop: 2 }}>
                                    {parEntrego ? <><CheckCircle size={12}/> Entregó</> : <><Hourglass size={12}/> Pendiente</>}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                            {info.par_es_interno ? (
                              <>
                                <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 12 }}>🔄 Pares internos</div>
                                {r.pares_int && r.pares_int.estado === 'aprobado' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#15803d', marginTop: 2 }}><CheckCircle size={12}/> Entregaron</span>}
                                {r.pares_int && r.pares_int.estado === 'pendiente' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#d97706', marginTop: 2 }}><Hourglass size={12}/> Pendientes</span>}
                              </>
                            ) : '—'}
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
                    onChange={e => { 
                      const val = e.target.value;
                      setNuevaQuery(val); 
                      setShowNuevaSuggest(true); 
                      if (nuevaDocenteCargado) { 
                        setNuevaDocenteCargado(false); 
                        setNuevaForm(f => ({ ...f, docente: val, cedula: '', correo: '', programa: '', facultad: '', tipoContrato: '', dedicacion: '', escolaridad: '', categoriaActual: '' })); 
                      } else {
                        setNuevaForm(f => ({ ...f, docente: val }));
                      }
                    }}
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

              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Tipo de trabajo</label>
                <select value={nuevaForm.tipoTrabajo} onChange={e => setNuevaForm(f => ({ ...f, tipoTrabajo: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}>
                  <option value="Trabajo escrito">Trabajo escrito</option>
                  <option value="Artículo científico">Artículo científico</option>
                  <option value="Libros de texto">Libros de texto</option>
                  <option value="Libros de investigación">Libros de investigación</option>
                  <option value="Libros de ensayos">Libros de ensayos</option>
                  <option value="Libros producto de un proyecto de extensión">Libros producto de un proyecto de extensión</option>
                  <option value="Creación artística">Creación artística</option>
                  <option value="Otro">Otro</option>
                  <option value="Ascenso">Ascenso (Genérico)</option>
                </select>
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
              if (selected && selected.id === solicitudAEliminar.id) setSelected(null);
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

/* ── Helpers para PanelSesionesCei ──────────────── */
function agruparPorCEI(solicitudes) {
  const capEtapas = ['informe','cei','resolucion','archivada'];
  const candidatos = solicitudes.filter(s =>
    capEtapas.includes(s.etapa) &&
    (s.etapa !== 'informe' || (s.acta_ciarp && s.acta_ciarp.trim()))
  );
  const grupos = {};
  candidatos.forEach(s => {
    const info = s.notas ? (typeof s.notas === 'string' ? JSON.parse(s.notas) : s.notas) : {};
    const rawActa = (info.acta_cei || '').trim();
    if (!rawActa) {
      const key = '__proximo__';
      if (!grupos[key]) grupos[key] = { label: 'Próxima Sesión (sin número)', aprobados: [], listos: [] };
      grupos[key].listos.push(s);
      return;
    }
    const key = rawActa.replace(/\s+/g, '').toLowerCase(); // basic normalization
    if (!grupos[key]) {
      const m = key.match(/(\d+)\/(\d{4})/);
      const label = m ? `CEI N° ${m[1]} — ${m[2]}` : `CEI N° ${key}`;
      grupos[key] = { label, aprobados: [], listos: [] };
    }
    if (['archivada', 'resolucion', 'cei'].includes(s.etapa) || s.estado === 'aprobado_cei' || s.estado === 'aprobado') {
      grupos[key].aprobados.push(s);
    } else {
      grupos[key].listos.push(s);
    }
  });
  const sorted = Object.keys(grupos).sort((a, b) => {
    if (a === '__proximo__') return -1;
    if (b === '__proximo__') return 1;
    const pa = a.split('/'), pb = b.split('/');
    const ya = parseInt(pa[1] || '0', 10), yb = parseInt(pb[1] || '0', 10);
    if (ya !== yb) return ya - yb;
    const na = parseInt(pa[0], 10), nb = parseInt(pb[0], 10);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  });
  return sorted.map(k => ({ key: k, ...grupos[k] }));
}

function CeiRow({ s, onSelect }) {
  const badge = getEtapaBadge(s.etapa, s.estado);
  return (
    <div
      onClick={() => onSelect(s)}
      style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: '1px solid #f0f0f0', cursor: 'pointer', transition: 'background .15s' }}
      onMouseOver={e => e.currentTarget.style.background = '#fafafa'}
      onMouseOut={e  => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {s.titulo}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
          {s.docente} · {s.programa}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
          {badge.label}
        </span>
      </div>
    </div>
  );
}

/* ── Panel Sesiones CEI ─────────────────────── */
function PanelSesionesCei({ user, solicitudes = [], onSelect }) {
  const [tab, setTab] = useState('sesiones');
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
      {/* Sub-Tabs de Sesiones y Comités */}
      <div style={{ display:'flex', gap:4, marginBottom:24, borderBottom:'2px solid var(--border)' }}>
        {[{ id:'sesiones', label:'🏛️ Sesiones CEI' }, { id:'comites', label:'📊 CEI por Productos' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding:'8px 20px', fontSize:13,
              fontWeight: tab === t.id ? 700 : 500,
              background: tab === t.id ? 'var(--uq-blue)' : 'transparent',
              color: tab === t.id ? '#fff' : 'var(--text2)',
              border: 'none',
              borderBottom: tab === t.id ? '3px solid var(--uq-blue)' : '3px solid transparent',
              cursor:'pointer', borderRadius:'6px 6px 0 0', transition:'all .15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'sesiones' && (
        <>
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
      </>
      )}
      
      {/* TAB COMITES */}
      {tab === 'comites' && (
        <ComitesCeiPanel solicitudes={solicitudes} onSelect={onSelect} />
      )}
    </div>
  );
}

function ComitesCeiPanel({ solicitudes, onSelect }) {
  const grupos = agruparPorCEI(solicitudes);
  const [openCap, setOpenCap] = useState(grupos[0]?.key || null);

  if (grupos.length === 0) {
    return (
      <div style={{ padding: '40px 28px', color: 'var(--muted)', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🏛️</div>
        <div style={{ fontWeight: 700, fontSize: 18 }}>Sin productos en Comité CEI</div>
        <div style={{ fontSize: 13, marginTop: 6 }}>Aparecerán aquí cuando los productos sean aprobados.</div>
      </div>
    );
  }

  return (
    <>
      <div style={{ display:'flex', gap:4, marginBottom:24, flexWrap:'wrap', borderBottom:'2px solid var(--border)' }}>
        {grupos.map((g, idx) => (
          <button key={g.key} onClick={() => setOpenCap(openCap === g.key ? null : g.key)}
            style={{ padding:'8px 18px', fontSize:13, fontWeight: openCap === g.key ? 700 : 500,
              background: openCap === g.key ? 'var(--uq-blue)' : 'transparent',
              color: openCap === g.key ? '#fff' : 'var(--text2)', border:'none',
              borderBottom: openCap === g.key ? '3px solid var(--uq-blue)' : '3px solid transparent',
              cursor:'pointer', borderRadius:'6px 6px 0 0', transition:'all .15s' }}>
            {idx === 0 && g.key !== '__proximo__' ? '📋 ' : '📊 '}{g.label}
            <span style={{ marginLeft:6, fontSize:11, opacity:0.8 }}>({g.aprobados.length + g.listos.length})</span>
          </button>
        ))}
      </div>

      {grupos.map((g, idx) => {
        if (openCap !== g.key) return null;
        const esCapPrincipal = idx === 0 && g.key !== '__proximo__';
        return (
          <div key={g.key} className="card" style={{ marginBottom:20, padding:0, overflow:'hidden' }}>
            <div style={{ background: esCapPrincipal ? 'var(--uq-blue)' : '#f0f4ff',
              color: esCapPrincipal ? '#fff' : 'var(--text)',
              padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:17, fontWeight:700 }}>{g.label}</div>
                <div style={{ fontSize:12, opacity:0.8, marginTop:2 }}>
                  {esCapPrincipal ? `Informe completo · ${g.aprobados.length} productos aprobados` : `${g.listos.length} listos · ${g.aprobados.length} ya aprobados`}
                </div>
              </div>
            </div>

            {g.aprobados.length > 0 && (
              <div>
                <div style={{ padding:'10px 20px', background:'#e8f5e9', fontSize:11, fontWeight:700, color:'#15803d', textTransform:'uppercase', letterSpacing:.5 }}>✅ Productos Aprobados ({g.aprobados.length})</div>
                {g.aprobados.map(s => <CeiRow key={s.id} s={s} onSelect={onSelect} />)}
              </div>
            )}
            {g.listos.length > 0 && (
              <div>
                <div style={{ padding:'10px 20px', background:'#fff3e0', fontSize:11, fontWeight:700, color:'#b36200', textTransform:'uppercase', letterSpacing:.5 }}>📊 Listos para presentar ({g.listos.length})</div>
                {g.listos.map(s => <CeiRow key={s.id} s={s} onSelect={onSelect} />)}
              </div>
            )}
            {(g.aprobados.length + g.listos.length) === 0 && (
              <div style={{ padding:32, textAlign:'center', color:'var(--muted)', fontSize:13 }}>Sin productos en este comité.</div>
            )}
          </div>
        );
      })}
    </>
  );
}


/* ── Detalle de solicitud CEI ─────────────────── */
function DetalleCEI({ sol, onBack, onUpdate, onEliminar, user }) {
  const info = parseCeiInfo(sol.notas);
  const badge = getEtapaBadge(sol.etapa, sol.estado);
  const tipoBadge = getTipoContratoBadge(info.tipo_contrato);

  // --- Form State ---
  const [etapa, setEtapa] = useState(sol.etapa || 'recibida');
  const [estado, setEstado] = useState(sol.estado || 'en_proceso');
  const [ptsAsig, setPtsAsig] = useState(sol.pts_asig != null ? sol.pts_asig : '');
  const [sesionCeiId, setSesionCeiId] = useState(sol.sesion_cei_id || '');
  const [actaCei, setActaCei] = useState(info.acta_cei || '');

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

  // Pares Evaluadores
  const isPlanta = (tipoContrato || '').toLowerCase().includes('planta');
  const [paresExtEdit, setParesExtEdit] = useState((sol.pares_ext || []).map(p => ({ ...p })));
  const [paresIntEdit, setParesIntEdit] = useState(sol.pares_int || {
    nombres: '',
    memo_envio: '',
    fecha_envio: '',
    estado: 'pendiente'
  });

  function handleAgregarParExt() {
    setParesExtEdit([...paresExtEdit, { nombre: '', perfil: '', cvlac_url: '', cvlac_nombre: '', memo_envio: '', fecha_envio: '', estado: 'pendiente' }]);
  }
  function handleEliminarParExt(idx) {
    setParesExtEdit(paresExtEdit.filter((_, i) => i !== idx));
  }
  function handleParExtChange(idx, field, val) {
    const newPares = [...paresExtEdit];
    newPares[idx][field] = val;
    setParesExtEdit(newPares);
  }

  function handleCvlacUpload(idx, result) {
    const newPares = [...paresExtEdit];
    newPares[idx] = {
      ...newPares[idx],
      cvlac_url:    result.publicUrl,
      cvlac_nombre: result.fileName,
      cvlac_path:   result.storagePath,
    };
    setParesExtEdit(newPares);
  }

  useEffect(() => {
    fetchSesionesCei()
      .then(data => {
        setSesiones(data || []);
        if (!sesionCeiId) {
          const abierta = data?.find(s => s.estado === 'abierta');
          if (abierta) {
            setSesionCeiId(abierta.id);
            setActaCei(abierta.acta_label);
          }
        }
      })
      .catch(console.error);
  }, [sesionCeiId]);

  // Sync acta_cei when session changes
  const handleSesionChange = (id) => {
    setSesionCeiId(id);
    if (!id) {
      setActaCei('');
    } else {
      const selectedSes = sesiones.find(s => s.id === id);
      if (selectedSes) {
        setActaCei(selectedSes.acta_label);
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setGuardando(true);

    let nextEtapa = etapa;
    // Auto-transición a pares externos/internos
    if (nextEtapa === 'clasificada') {
      if (isPlanta) {
        const hasValidPares = paresExtEdit.length >= 2 && paresExtEdit.every(p => p.nombre.trim() !== '');
        if (hasValidPares) {
          nextEtapa = 'pares_externos';
          setEtapa('pares_externos');
        }
      } else {
        if (paresIntEdit.nombres && paresIntEdit.nombres.trim() !== '') {
          nextEtapa = 'pares_internos';
          setEtapa('pares_internos');
        }
      }
    }

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
      etapa: nextEtapa,
      estado,
      pts_asig: ptsAsig !== '' ? Number(ptsAsig) : null,
      sesion_cei_id: sesionCeiId || null,
      acta_cei: actaCei,
      notas: nuevasNotas,
      docente,
      cedula,
      correo,
      facultad,
      programa,
      titulo,
      pares_ext: isPlanta ? paresExtEdit : [],
      pares_int: !isPlanta ? paresIntEdit : null,
    };

    await onUpdate(updatedSol);
    setGuardando(false);
  };

  const isAdmin     = user?.rol === 'admin';
  const isTecnico   = user?.rol === 'tecnico';
  const isAsistente = user?.rol === 'asistente' || user?.rol === 'lectura';
  const canEdit     = isAdmin || isTecnico || isAsistente;
  const [showMetaEdit, setShowMetaEdit] = useState(false);

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
                {actaCei && (
                  <div style={{ marginTop: 8, opacity: .9, fontSize: 12, fontWeight: 500 }}>Acta CEI: {actaCei}</div>
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
              <Scale size={20} color="var(--uq-blue)" /> {isTecnico ? 'Procesar Ascenso (CEI)' : 'Gestión CEI'}
            </h3>

            <form id="cei-save-form" onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              
              {/* 1. ── Editar metadatos (colapsable, solo admin/asistente) ── */}
              {(isAdmin || isAsistente) && (
                <div style={{ background: 'var(--bg)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
                  <button type="button" onClick={() => setShowMetaEdit(v => !v)}
                    style={{ background: 'none', border: 'none', color: 'var(--uq-blue)', fontSize: 13, cursor: 'pointer', fontWeight: 700, padding: 0, display: 'flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Edit3 size={16}/> {showMetaEdit ? 'Ocultar metadatos del docente' : 'Editar metadatos del docente'}</span>
                    <span>{showMetaEdit ? '▲' : '▼'}</span>
                  </button>
                  {showMetaEdit && (
                    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px dashed var(--border)', paddingTop: 16 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Docente</label>
                        <input value={docente} onChange={e => setDocente(e.target.value)}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: '#fff', color: 'var(--text)', outline: 'none' }} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Cédula</label>
                          <input value={cedula} onChange={e => setCedula(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: '#fff', color: 'var(--text)', outline: 'none' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Correo</label>
                          <input value={correo} onChange={e => setCorreo(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: '#fff', color: 'var(--text)', outline: 'none' }} />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Programa</label>
                          <input value={programa} onChange={e => setPrograma(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: '#fff', color: 'var(--text)', outline: 'none' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Facultad</label>
                          <input value={facultad} onChange={e => setFacultad(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: '#fff', color: 'var(--text)', outline: 'none' }} />
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Título del trabajo presentado</label>
                        <textarea value={titulo} onChange={e => setTitulo(e.target.value)} rows={2}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: '#fff', color: 'var(--text)', outline: 'none', resize: 'vertical' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Tipo de trabajo</label>
                        <select value={tipoTrabajo} onChange={e => setTipoTrabajo(e.target.value)}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: '#fff', color: 'var(--text)', outline: 'none' }}>
                          <option value="Trabajo escrito">Trabajo escrito</option>
                          <option value="Artículo científico">Artículo científico</option>
                          <option value="Libros de texto">Libros de texto</option>
                          <option value="Libros de investigación">Libros de investigación</option>
                          <option value="Libros de ensayos">Libros de ensayos</option>
                          <option value="Libros producto de un proyecto de extensión">Libros producto de un proyecto de extensión</option>
                          <option value="Creación artística">Creación artística</option>
                          <option value="Otro">Otro</option>
                        </select>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Categoría docente</label>
                          <select value={categoriaActual} onChange={e => setCategoriaActual(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: '#fff', color: 'var(--text)', outline: 'none' }}>
                            <option value="TITULAR">TITULAR</option>
                            <option value="ASOCIADO">ASOCIADO</option>
                            <option value="ASISTENTE">ASISTENTE</option>
                            <option value="AUXILIAR">AUXILIAR</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Tipo de contrato</label>
                          <input value={tipoContrato} onChange={e => setTipoContrato(e.target.value)} placeholder="Ej: Planta"
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: '#fff', color: 'var(--text)', outline: 'none' }} />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Dedicación</label>
                          <input value={dedicacion} onChange={e => setDedicacion(e.target.value)} placeholder="Ej: Tiempo Completo"
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: '#fff', color: 'var(--text)', outline: 'none' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Escolaridad</label>
                          <input value={escolaridad} onChange={e => setEscolaridad(e.target.value)} placeholder="Ej: Doctorado"
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: '#fff', color: 'var(--text)', outline: 'none' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 2. ── Estado y Etapa ── */}
              <div style={{ display: 'grid', gridTemplateColumns: (!isTecnico || etapa !== 'informe') ? '1fr 1fr' : '1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Etapa actual (Automática)</label>
                  <div style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', 
                    fontSize: 13, background: 'var(--bg)', color: 'var(--text)', 
                    display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600
                  }}>
                    {etapa === 'recibida' && <>📥 Recibida</>}
                    {etapa === 'clasificada' && <>📁 Clasificada</>}
                    {etapa === 'pares_internos' && <>🔄 Evaluando pares internos</>}
                    {etapa === 'pares_externos' && <>👥 Evaluando pares externos</>}
                    {etapa === 'informe' && <span style={{ color: '#0369a1' }}>🏛️ Informe CEI (Lista para evaluar)</span>}
                    {etapa === 'cei' && <span style={{ color: '#15803d' }}>✅ En CEI</span>}
                    {etapa === 'resolucion' && <>📄 Resolución</>}
                    {etapa === 'archivada' && <>📦 Archivada</>}
                  </div>
                </div>
                {(!isTecnico || etapa !== 'informe') && (
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Estado</label>
                    <select value={estado} onChange={e => setEstado(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}>
                      <option value="en_proceso">⏳ En proceso</option>
                      <option value="aprobado_cei">✅ Aprobado CEI</option>
                      <option value="rechazado_cei">❌ Negado CEI</option>
                      <option value="en_revision">⚠️ Requiere revisión</option>
                    </select>
                  </div>
                )}
              </div>

              {/* 3. ── PANEL DE PARES (Asistente/Admin edita, Técnico ve) ── */}
              {(isAdmin || isAsistente) && (
                <div className="card" style={{ padding: '16px 20px', border: '2px solid var(--warning)', margin: '8px 0' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--warning)', marginBottom: 10 }}>
                    <span style={{display:"inline-flex", alignItems:"center", gap: 6}}><AlertTriangle size={16} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Evaluaciones {isPlanta ? 'Externas' : 'Internas'}
                  </div>
                  {isPlanta ? (
                    <div style={{ background: '#f8f8f8', padding: 16, borderRadius: 8, border: '1px solid var(--border)' }}>
                      <p style={{ fontSize: 13, marginBottom: 12, fontWeight: 700 }}>Asigne los pares evaluadores externos (Minciencias) e ingrese los datos de invitación:</p>
                      {paresExtEdit.length === 0 && <button type="button" className="btn btn-o btn-sm" style={{marginBottom:12}} onClick={handleAgregarParExt}>+ Agregar Par 1</button>}
                      {paresExtEdit.map((p, i) => (
                        <div key={i} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px dashed #ccc', background:'#fff', borderRadius:8, padding:12 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--g)' }}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><User size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Par Evaluador {i + 1}{i < 2 ? '' : ' (Dirimente)'}</div>
                            <button type="button" className="btn btn-danger btn-sm" style={{fontSize:11,padding:'2px 6px'}} onClick={() => handleEliminarParExt(i)}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><Trash2 size={12} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Quitar</button>
                          </div>
                          <div style={{marginBottom:6}}><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:3}}>Nombre completo *</label><input type="text" className="input" placeholder="Nombre del par evaluador" value={p.nombre} onChange={e => handleParExtChange(i, 'nombre', e.target.value)} /></div>
                          <div style={{marginBottom:6}}><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:3}}>Perfil académico / Institución / Especialidad</label><textarea className="input" placeholder="Universidad, área de conocimiento, título académico" value={p.perfil || ''} onChange={e => handleParExtChange(i, 'perfil', e.target.value)} rows={2} /></div>
                          
                          <div style={{marginBottom:10}}>
                            <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:6}}>
                              <span style={{display:"inline-flex", alignItems:"center", gap: 6}}><Paperclip size={12} style={{display:"inline-block", verticalAlign:"middle"}}/></span> HOJA DE VIDA MINCIENCIAS (CVLAC)
                            </label>
                            <PdfUploader
                              key={p.cvlac_nombre || `cvlac-cei-${i}`}
                              customName={`CVLAC_CEI_${(p.nombre || `Par${i+1}`).replace(/\s+/g,'_')}_${sol.id}`}
                              folder="cvlac"
                              initialFile={p.cvlac_url ? { nombre: p.cvlac_nombre || 'CVLAC.pdf', url: p.cvlac_url } : null}
                              onUploadSuccess={(res) => handleCvlacUpload(i, res)}
                              label="Subir PDF (Hoja de Vida)"
                            />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
                            <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:3}}>N° Memo invitación</label><input className="input" placeholder="N° Memorando" value={p.memo_envio || ''} onChange={e => handleParExtChange(i, 'memo_envio', e.target.value)} /></div>
                            <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:3}}>Fecha invitación</label><input className="input" type="date" value={p.fecha_envio || ''} onChange={e => handleParExtChange(i, 'fecha_envio', e.target.value)} /></div>
                          </div>

                          <div style={{ marginBottom: 6 }}>
                            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>ESTADO</label>
                            <select value={p.estado} onChange={e => handleParExtChange(i, 'estado', e.target.value)}
                              style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid var(--border)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}>
                              <option value="pendiente">⏳ Pendiente</option>
                              <option value="recibido">✅ Evaluación recibida</option>
                            </select>
                          </div>

                          {p.estado === 'recibido' && (
                            <select value={p.concepto || ''} onChange={e => handleParExtChange(i, 'concepto', e.target.value)}
                              style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #16a34a', background: '#f0fdf4', color: '#166534', fontSize: 12, outline: 'none', boxSizing: 'border-box', fontWeight: 600 }}>
                              <option value="">(Seleccionar Concepto)</option>
                              <option value="Aprobado">🟢 Aprobado</option>
                              <option value="Aprobado con correcciones menores">🟡 Aprobado con correcciones menores</option>
                              <option value="Aprobado con correcciones mayores">🟠 Aprobado con correcciones mayores</option>
                              <option value="Rechazado">🔴 Rechazado</option>
                            </select>
                          )}
                        </div>
                      ))}

                      {paresExtEdit.length > 0 && paresExtEdit.length < 3 && (
                        <button type="button" className="btn btn-o btn-sm" style={{ width: '100%' }} onClick={handleAgregarParExt}>
                          + Añadir {paresExtEdit.length < 2 ? 'Par Evaluador' : 'Tercer Par (por discrepancia)'}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--bg)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>Pares Internos (enviados por la Facultad)</label>
                        <textarea value={paresIntEdit?.nombres || ''} onChange={e => setParesIntEdit({ ...paresIntEdit, nombres: e.target.value })} placeholder="Ej: Dr. Juan Pérez, Dra. Maria Gómez" rows={2} style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>N° Memo Envío</label>
                          <input value={paresIntEdit?.memo_envio || ''} onChange={e => setParesIntEdit({ ...paresIntEdit, memo_envio: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12, outline: 'none' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>Fecha Envío</label>
                          <input type="date" value={paresIntEdit?.fecha_envio || ''} onChange={e => setParesIntEdit({ ...paresIntEdit, fecha_envio: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12, outline: 'none' }} />
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>Estado</label>
                        <select value={paresIntEdit?.estado || 'pendiente'} onChange={e => setParesIntEdit({ ...paresIntEdit, estado: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12, outline: 'none' }}>
                          <option value="pendiente">⏳ Pendiente</option>
                          <option value="aprobado">✅ Evaluación recibida</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 3b. ── Enviar a Técnico (Solo Asistente/Admin) ── */}
              {(isAdmin || isAsistente) && (etapa === 'pares_externos' || etapa === 'pares_internos') && (
                <div style={{ background: '#f0fdf4', border: '1px dashed #22c55e', padding: 16, borderRadius: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 13, color: '#166534', marginBottom: 10 }}>¿Se recibieron todas las evaluaciones?</div>
                  <button type="button" onClick={() => { setEtapa('informe'); }}
                    style={{ padding: '10px 20px', borderRadius: 8, background: '#16a34a', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle size={16}/> Evaluaciones completas, enviar al Técnico
                  </button>
                </div>
              )}

              {/* 3c. ── Ver Pares (solo Técnico, etapa previa) ── */}
              {isTecnico && etapa !== 'informe' && (paresExtEdit.length > 0 || paresIntEdit?.nombres) && (
                <div style={{ padding: '12px 14px', background: '#f0f4ff', borderRadius: 10, border: '1px solid #c7d7fc', fontSize: 12 }}>
                  <div style={{ fontWeight: 700, color: 'var(--uq-blue)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <User size={14} /> Pares asignados por el Asistente
                  </div>
                  {isPlanta ? (
                    paresExtEdit.map((p, i) => (
                      <div key={i} style={{ marginBottom: 4 }}>
                        <strong>Par {i+1}:</strong> {p.nombre || '—'}
                        {p.estado === 'recibido' && <span style={{ marginLeft: 8, color: '#15803d', fontWeight: 700 }}>✅ Recibido ({p.concepto || 'Sin concepto'})</span>}
                        {p.estado !== 'recibido' && <span style={{ marginLeft: 8, color: '#d97706' }}>⏳ Pendiente</span>}
                      </div>
                    ))
                  ) : (
                    <div>{paresIntEdit?.nombres || '—'}</div>
                  )}
                </div>
              )}

              {/* 3d. ── Evaluación del Técnico (Informe) ── */}
              {isTecnico && etapa === 'informe' && (
                <div style={{ background: '#e0f2fe', borderRadius: 12, border: '1px solid #bae6fd', padding: 20 }}>
                  <div style={{ fontWeight: 700, color: '#0369a1', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Landmark size={18} /> Evaluación del Comité (Técnico)
                  </div>
                  <p style={{ fontSize: 13, color: '#0c4a6e', marginBottom: 16 }}>
                    Verifique los conceptos de los pares y dictamine si el trabajo es aprobado para pasar a sesión de comité.
                  </p>
                  
                  {isPlanta ? (
                    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                      {paresExtEdit.map((p, i) => (
                        <div key={i} style={{ flex: 1, background: '#fff', padding: 12, borderRadius: 8, border: '1px solid #bae6fd' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#0369a1' }}>Par {i+1}: {p.nombre || 'N/A'}</div>
                          <div style={{ fontSize: 12, marginTop: 4 }}>Concepto: <strong>{p.concepto || 'Sin concepto'}</strong></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ background: '#fff', padding: 12, borderRadius: 8, border: '1px solid #bae6fd', marginBottom: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#0369a1' }}>Pares Internos</div>
                      <div style={{ fontSize: 12, marginTop: 4 }}>Estado: <strong>{paresIntEdit?.estado || 'pendiente'}</strong></div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 12 }}>
                    <button type="button" onClick={() => setEstado('aprobado_cei')}
                      style={{ flex: 1, padding: '10px', borderRadius: 8, background: estado === 'aprobado_cei' ? '#15803d' : '#fff', color: estado === 'aprobado_cei' ? '#fff' : '#15803d', border: '1px solid #15803d', fontWeight: 700, cursor: 'pointer' }}>
                      🟢 APROBAR
                    </button>
                    <button type="button" onClick={() => setEstado('rechazado_cei')}
                      style={{ flex: 1, padding: '10px', borderRadius: 8, background: estado === 'rechazado_cei' ? '#dc2626' : '#fff', color: estado === 'rechazado_cei' ? '#fff' : '#dc2626', border: '1px solid #dc2626', fontWeight: 700, cursor: 'pointer' }}>
                      🔴 RECHAZAR
                    </button>
                  </div>
                </div>
              )}

              {/* 4. ── Sesión y Puntos ── */}
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

              {/* 5. ── Resoluciones (solo técnico / admin) ── */}
              {(isTecnico || isAdmin) && (
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
              )}

              {/* 6. ── Notas de seguimiento ── */}
              <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Notas de seguimiento / alertas</label>
                <textarea value={notasSeguimiento} onChange={e => setNotasSeguimiento(e.target.value)} rows={3} placeholder="Escribe observaciones aquí..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg)', color: 'var(--text)', outline: 'none', resize: 'vertical' }} />
              </div>

              {/* 7. ── Botón Guardar Principal ── */}
              <div style={{ display: 'flex', gap: 12, marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <button type="submit" disabled={guardando}
                  style={{
                    flex: 1, padding: '12px', borderRadius: 10,
                    background: 'var(--uq-blue)', color: '#fff',
                    border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'background .2s', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--uq-blue-dk)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--uq-blue)'}
                >
                  {guardando ? <Hourglass size={16} /> : <Save size={16} />}
                  {guardando ? 'Guardando Cambios...' : 'Guardar Cambios CEI'}
                </button>
              </div>

              {/* 8. ── Eliminar Solicitud ── */}
              {(isAdmin || isAsistente) && (
                <div style={{ marginTop: 4, textAlign: 'center' }}>
                  <button type="button" onClick={onEliminar}
                    style={{
                      background: 'transparent', color: '#dc2626', border: 'none', cursor: 'pointer',
                      fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '8px 16px', borderRadius: 8, transition: 'background .2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <Trash2 size={14} /> Eliminar esta solicitud
                  </button>
                </div>
              )}
            </form>
          </div>
        )}

      </div>
    </div>
  );
}