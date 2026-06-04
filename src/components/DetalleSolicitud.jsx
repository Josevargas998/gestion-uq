import React, { useState } from 'react';
import { TIPOS, ETAPAS } from '../data.js';
import { CheckCircle, Clock, Check, FileText, Download, X, AlertTriangle, MessageSquare, ChevronDown, ChevronUp, Trash2, Edit3, User, Search, MapPin, Landmark, CircleDollarSign, Route, Mail, Save, FileCheck, XCircle, ArrowRight, BookOpen, Send, ShieldAlert, Award, FileSpreadsheet, Paperclip, FolderOpen } from 'lucide-react';
import { badgeEtapa, labelEtapa, rutaLabel } from '../helpers.js';
import { ProgressBar, RutaTag } from './shared.jsx';
import { generarDocumento } from '../utils/docGenerator.jsx';
import PdfUploader from './PdfUploader.jsx';
import Decreto1279Panel from './Decreto1279Panel.jsx';
import DatosProductoPanel from './DatosProductoPanel.jsx';
import { enviarNotificacionCIARP, previsualizarCorreoCIARP } from '../utils/emailNotificacion.js';
import { useSolicitudes } from '../context/SolicitudesContext';
import { fetchSesionesCiarp } from '../utils/api.js';

// ── Modal para ver concepto de evaluación ────────────────────────────────────
function ConceptoModal({ par, num, onClose }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:14, padding:'28px 32px', maxWidth:520, width:'100%', boxShadow:'0 8px 40px rgba(0,0,0,0.22)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div>
            <div style={{ fontWeight:800, fontSize:16 }}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><FileText size={16} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Concepto — Par {num}</div>
            <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>{par.nombre}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'var(--muted)' }}>✕</button>
        </div>
        {par.concepto_nombre ? (
          <div style={{ background:'#f0faf2', border:'1px solid #b7dfb9', borderRadius:10, padding:'16px 20px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ fontSize:32 }}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><FileCheck size={16} style={{display:"inline-block", verticalAlign:"middle"}}/></span></span>
              <div>
                <div style={{ fontWeight:700, fontSize:13, color:'#1a6e2e' }}>{par.concepto_nombre}</div>
                <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>Subido · listo para revisión</div>
              </div>
            </div>
            <div style={{ marginTop:14, display:'flex', gap:10 }}>
              {par.concepto_url ? (
                <a href={par.concepto_url} target="_blank" rel="noreferrer" className="btn btn-p btn-sm"><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><FolderOpen size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Abrir PDF ↗</a>
              ) : (
                <button className="btn btn-p btn-sm" onClick={() => alert('Sin enlace disponible.')}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><FolderOpen size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Abrir archivo</button>
              )}
            </div>
          </div>
        ) : (
          <div style={{ background:'#fff8e1', border:'1px solid #ffe082', borderRadius:10, padding:'16px 20px', textAlign:'center' }}>
            <div style={{ fontSize:28, marginBottom:8 }}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><Clock size={16} style={{display:"inline-block", verticalAlign:"middle"}}/></span></div>
            <div style={{ fontWeight:700, fontSize:13, color:'#856404' }}>Concepto aún no subido</div>
            <div style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>El asistente debe adjuntar el archivo antes de que puedas revisarlo.</div>
          </div>
        )}
        {par.perfil && (
          <div style={{ marginTop:16 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)', marginBottom:6, textTransform:'uppercase', letterSpacing:.4 }}>Perfil del Evaluador</div>
            <pre style={{ fontSize:11, color:'var(--text2)', background:'#f8f9fa', border:'1px solid var(--border)', borderRadius:6, padding:'8px 10px', whiteSpace:'pre-wrap', lineHeight:1.5, maxHeight:160, overflowY:'auto', margin:0 }}>{par.perfil}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tarjeta de par evaluador con perfil expandible ──────────────────────────
function EvaluadorCard({ par, num, etapa, isTecnico }) {
  const [expanded, setExpanded] = React.useState(false);
  const [showModal, setShowModal] = React.useState(false);
  const inicial = par.nombre ? par.nombre.trim()[0].toUpperCase() : '?';
  const entrego = par.estado === 'recibido';
  const conceptoDisponible = !!par.concepto_nombre;
  const showConcepto = entrego || ['informe','ciarp','proyectar_resoluciones','archivada'].includes(etapa);

  const diasTranscurridos = React.useMemo(() => {
    if (!par.fecha_envio) return null;
    const fDate = new Date(par.fecha_envio);
    if (isNaN(fDate)) return null;
    return Math.floor((Date.now() - fDate.getTime()) / 86400000);
  }, [par.fecha_envio]);

  return (
    <>
      {showModal && <ConceptoModal par={par} num={num} onClose={() => setShowModal(false)} />}
      <div style={{ background: isTecnico ? (conceptoDisponible ? '#f0faf2' : '#fffbf0') : '#f8f9fa', border: `1px solid ${isTecnico ? (conceptoDisponible ? '#b7dfb9' : '#ffe082') : 'var(--border)'}`, borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: entrego ? 'var(--g)' : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: entrego ? '#fff' : 'var(--muted)', flexShrink: 0 }}>
            {inicial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Par {num}: {par.nombre}</span>
              <span className={`badge ${entrego ? 'bg' : 'ba'}`} style={{ fontSize: 11 }}>
                {entrego ? <><CheckCircle size={14} /> Concepto entregado</> : <><Clock size={14} /> Pendiente</>}
              </span>
              {isTecnico && conceptoDisponible && (
                <span style={{ fontSize:10, background:'#d4edda', color:'#155724', borderRadius:4, padding:'2px 6px', fontWeight:700 }}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><Paperclip size={12} style={{display:"inline-block", verticalAlign:"middle"}}/></span> ARCHIVO LISTO</span>
              )}
              {diasTranscurridos !== null && !entrego && (
                <span style={{ fontSize: 10, background: diasTranscurridos > 30 ? '#fde8e8' : '#e3f0ff', color: diasTranscurridos > 30 ? 'var(--danger)' : '#1a5fa8', borderRadius: 4, padding: '2px 6px', fontWeight: 700 }}>
                  <span style={{display:"inline-flex", alignItems:"center", gap: 6}}><Clock size={12} style={{display:"inline-block", verticalAlign:"middle"}}/></span> {diasTranscurridos} {diasTranscurridos === 1 ? 'día' : 'días'} evaluando
                </span>
              )}
            </div>
            {par.univ && par.univ !== 'Sin institución' && (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3, lineHeight: 1.4 }}>{par.univ}</div>
            )}
            {par.memo_envio && (
              <div style={{ fontSize: 11, color: 'var(--info)', marginTop: 4 }}>
                <span style={{display:"inline-flex", alignItems:"center", gap: 6}}><Send size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Enviado con Memo {par.memo_envio} el {par.fecha_envio || '-'}
              </div>
            )}
            {showConcepto && (
              <div style={{ marginTop: 8 }}>
                <button
                  className="btn btn-o btn-sm"
                  onClick={() => setShowModal(true)}
                  style={{ padding: '4px 10px', fontSize: 11, color: conceptoDisponible ? 'var(--g)' : '#856404', borderColor: conceptoDisponible ? 'var(--g)' : '#ffe082', background: conceptoDisponible ? '#e8f5e9' : '#fff8e1', fontWeight: 700 }}
                >
                  {conceptoDisponible ? <><Download size={14} /> Ver Concepto de Evaluación</> : <><Clock size={14} /> Concepto pendiente</>}
                </button>
              </div>
            )}
            {par.perfil && par.perfil.length > 120 && (
              <button onClick={() => setExpanded(v => !v)} style={{ marginTop: 6, fontSize: 11, color: 'var(--info)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                {expanded ? '▲ Ocultar perfil' : '▼ Ver perfil completo'}
              </button>
            )}
            {expanded && par.perfil && (
              <pre style={{ marginTop: 8, fontSize: 11, color: 'var(--text2)', background: '#fff', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', whiteSpace: 'pre-wrap', lineHeight: 1.5, maxHeight: 260, overflowY: 'auto' }}>
                {par.perfil}
              </pre>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

const LABEL_OBSERVACIONES = {
  estado_seguimiento: 'Estado de Seguimiento',
  observaciones: 'Observaciones',
  ano: 'Año',
  semestre: 'Semestre',
  radicado: 'Radicado',
  dias_par: 'Días Par',
  dias_facultad: 'Días Facultad',
  res_pago: 'Resolución de Pago',
  res_titulo: 'Resolución de Título',
  par_es_interno: 'Par es Interno'
};

function renderObservaciones(notas) {
  if (!notas) return null;
  try {
    const data = JSON.parse(notas);
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const items = Object.entries(data).filter(([_, val]) => val !== null && val !== undefined && String(val).trim() !== '');
      if (items.length > 0) {
        return (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
            marginTop: 8
          }}>
            {items.map(([key, val]) => {
              const label = LABEL_OBSERVACIONES[key] || key;
              return (
                <div key={key} style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  boxShadow: 'var(--shadow-xs)'
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, wordBreak: 'break-word' }}>
                    {String(val)}
                  </div>
                </div>
              );
            })}
          </div>
        );
      }
    }
  } catch (_e) { /* ignore */ }
  return (
    <div style={{ fontSize: 13, color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: 1.5, marginTop: 8 }}>
      {notas}
    </div>
  );
}

function renderReadOnlyJsonFields(notas) {
  if (!notas) return null;
  try {
    const data = JSON.parse(notas);
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const items = Object.entries(data).filter(([key, val]) => key !== 'observaciones' && val !== null && val !== undefined && String(val).trim() !== '');
      if (items.length > 0) {
        return (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: 10,
            marginTop: 6
          }}>
            {items.map(([key, val]) => {
              const label = LABEL_OBSERVACIONES[key] || key;
              return (
                <span key={key} style={{
                  fontSize: 11,
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '4px 8px',
                  color: 'var(--text2)',
                  fontWeight: 500
                }}>
                  <strong>{label}:</strong> {String(val)}
                </span>
              );
            })}
          </div>
        );
      }
    }
  } catch (_e) { /* ignore */ }
  return null;
}

export default function DetalleSolicitud({ sol, user, onBack, onUpdate, onEliminar }) {
  const ctx = useSolicitudes();
  const solicitudes = ctx?.solicitudes || [];

  const [sesionesAbiertas, setSesionesAbiertas] = React.useState([]);

  React.useEffect(() => {
    fetchSesionesCiarp().then(data => {
      if (data && data.length > 0) {
        const abiertas = data.filter(s => s.estado === 'abierta');
        setSesionesAbiertas(abiertas.map(s => s.acta_label));
      }
    }).catch(console.error);
  }, []);

  const t = TIPOS[sol.tipo] || {};

  // Mapeo de roles: admin puede hacer TODO (equivale a asistente).
  // tecnico y lectura solo ajustan puntaje y ven detalles.
  const isAdmin   = user?.rol === 'admin';
  const isTecnico = user?.rol === 'tecnico'; // Solo el técnico real ve su panel
  const canEdit   = isAdmin; // solo admin avanza etapas (rol asistente/admin)

  // pts_sug: si viene 0 de Sheets, usar el del tipo
  const ptsSugReal = (sol.pts_sug && sol.pts_sug > 0) ? sol.pts_sug : (t.pts || 0);

  const getInitialPts = (s) => {
    if (s.pts_asig != null) return s.pts_asig;
    if (s.tipo === 'ascenso') {
      try {
        const info = JSON.parse(s.notas || '{}');
        const catDestino = info.categoria_destino || info.categoria_actual || '';
        const ptsAscenso = { Asistente: 21, Asociado: 16, Titular: 22 };
        if (ptsAscenso[catDestino]) return ptsAscenso[catDestino];
      } catch (_e) { /* ignore */ }
    }
    return 0;
  };

  const [ptsEdit, setPtsEdit] = React.useState(getInitialPts(sol));
  const [actaCiarp, setActaCiarp] = React.useState(sol.acta_ciarp || '');
  const [datosProd, setDatosProd] = React.useState(() => {
    try { return typeof sol.datos_prod === 'string' ? JSON.parse(sol.datos_prod) : (sol.datos_prod || {}); } catch { return {}; }
  });
  const [metadatos, setMetadatos] = React.useState(() => {
    try { return typeof sol.metadatos === 'string' ? JSON.parse(sol.metadatos) : (sol.metadatos || {}); } catch { return {}; }
  });
  const [obsEdit, setObsEdit] = React.useState(() => {
    if (!sol.notas) return '';
    try {
      const data = JSON.parse(sol.notas);
      if (data && typeof data === 'object' && 'observaciones' in data) {
        return data.observaciones || '';
      }
    } catch (_e) { /* ignore */ }
    return sol.notas || '';
  });
  const [saved, setSaved] = React.useState(false);
  const [savedMeta, setSavedMeta] = React.useState(false);
  const [showDecretoPanel, setShowDecretoPanel] = React.useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = React.useState(false);

  // Estados para Modal de Notificación CIARP
  const [showMailModal, setShowMailModal] = React.useState(false);
  const [mailPrueba, setMailPrueba] = React.useState('');
  const [mailEnviando, setMailEnviando] = React.useState(false);
  const [mailEstado, setMailEstado] = React.useState(null);

  // Estados para Memorandos internos
  const [memoEnvioInt, setMemoEnvioInt] = React.useState(sol.memoEnvioInt || '');
  const [fechaEnvioInt, setFechaEnvioInt] = React.useState(sol.fechaEnvioInt || '');
  const [memoReciboInt, setMemoReciboInt] = React.useState(sol.memoReciboInt || '');
  const [fechaReciboInt, setFechaReciboInt] = React.useState(sol.fechaReciboInt || '');

  React.useEffect(() => {
    setPtsEdit(getInitialPts(sol));
    setActaCiarp(sol.acta_ciarp || '');
    setMemoEnvioInt(sol.memoEnvioInt || '');
    setFechaEnvioInt(sol.fechaEnvioInt || '');
    setMemoReciboInt(sol.memoReciboInt || '');
    setFechaReciboInt(sol.fechaReciboInt || '');
    
    let initialObs = '';
    if (sol.notas) {
      try {
        const data = JSON.parse(sol.notas);
        if (data && typeof data === 'object' && 'observaciones' in data) {
          initialObs = data.observaciones || '';
        } else {
          initialObs = sol.notas;
        }
      } catch (e) {
        initialObs = sol.notas;
      }
    }
    setObsEdit(initialObs);
  }, [sol]);

  // Contador 30 días evaluación interna
  const diasTranscurridos = React.useMemo(() => {
    const f = sol.fechaEnvioInt || fechaEnvioInt;
    if (!f) return null;
    const diff = Math.floor((Date.now() - new Date(f).getTime()) / 86400000);
    return diff;
  }, [sol.fechaEnvioInt, fechaEnvioInt]);

  // Estados de edición general
  const [isEditing, setIsEditing] = React.useState(false);
  const [editData, setEditData] = React.useState({
    docente:  sol.docente  || '',
    cedula:   sol.cedula   || '',
    programa: sol.programa || '',
    facultad: sol.facultad || '',
    correo:   sol.correo   || '',
    titulo:   sol.titulo   || '',
    revista:  sol.revista  || '',
  });

  // Estados de edición de pares
  const [isEditingPares, setIsEditingPares] = React.useState(false);
  const [paresEdit, setParesEdit] = React.useState(
    (sol.pares_ext || []).map(p => ({ ...p }))
  );
  const [cvlacFiles, setCvlacFiles] = React.useState({});

  function handleAgregarPar() {
    setParesEdit([...paresEdit, { nombre: '', perfil: '', estado: 'pendiente' }]);
  }

  function handleEliminarPar(idx) {
    setParesEdit(paresEdit.filter((_, i) => i !== idx));
  }

  function handleParChange(idx, field, val) {
    const newPares = [...paresEdit];
    newPares[idx][field] = val;
    setParesEdit(newPares);
  }

  function handleGuardarPares() {
    onUpdate({
      ...sol,
      pares_ext: paresEdit,
      timeline: [...sol.timeline, { f: 'Hoy', a: 'Pares evaluadores actualizados', p: user.nombre }],
    });
    setIsEditingPares(false);
  }

  function handleConceptoUpload(idx, result) {
    const nuevosPares = (sol.pares_ext || []).map((p, i) =>
      i === idx
        ? {
            ...p,
            concepto_nombre:  result.fileName,
            concepto_url:     result.publicUrl,
            concepto_path:    result.storagePath,
            estado: 'recibido',
          }
        : p
    );
    onUpdate({
      ...sol,
      pares_ext: nuevosPares,
      timeline: [...sol.timeline, { f: 'Hoy', a: `Concepto de Par ${idx + 1} subido: ${result.fileName}`, p: user.nombre }],
    });
  }

  function handleCvlacUpload(idx, result) {
    // Actualiza paresEdit (estado local) con la URL del CVLAC subido
    const newPares = [...paresEdit];
    newPares[idx] = {
      ...newPares[idx],
      cvlac_url:    result.publicUrl,
      cvlac_nombre: result.fileName,
      cvlac_path:   result.storagePath,
    };
    setParesEdit(newPares);
  }

  // Técnico registra: memo recepción + fecha + puntaje del par
  function handleRegistrarEvalPar(idx, campo, valor) {
    const nuevosPares = (sol.pares_ext || []).map((p, i) =>
      i === idx ? { ...p, [campo]: valor } : p
    );
    onUpdate({ ...sol, pares_ext: nuevosPares });
  }

  // Cálculo automático del Decreto 1279
  const calculo1279 = React.useMemo(() => {
    let techo = t.pts || 0;
    // Si es revista indexada, el techo depende de la categoría ingresada
    if (sol.tipo === 'revista_indexada') {
      const cat = (datosProd.categoria_revista || '').toUpperCase();
      if (cat.includes('A1')) techo = 15;
      else if (cat.includes('A2')) techo = 12;
      else if (cat.includes('B')) techo = 8;
      else if (cat.includes('C')) techo = 3;
    }

    if (datosProd.subtipo_articulo === 'comunicacion_corta') techo = techo * 0.6;
    if (datosProd.subtipo_articulo === 'reporte_caso') techo = techo * 0.3;
    
    // El número de autores es al menos 1. Si el usuario agregó co-autores UQ, suma esos a la cuenta mínima.
    const numCoautores = (datosProd.coautores_uq || []).length;
    const numAutores = Math.max(Number(datosProd.num_autores) || 1, 1 + numCoautores);
    
    let factorAutor = 1;
    if (numAutores >= 4 && numAutores <= 5) factorAutor = 0.5;
    if (numAutores >= 6) factorAutor = 1 / (numAutores / 2);
    
    let factorCalidad = 1;
    let promedioStr = 'N/A';
    
    // Si la ruta incluye evaluación de pares
    const pares = sol.pares_ext || [];
    const conCalif = pares.filter(p => p.calificacion != null && p.calificacion !== '');
    if (['internos', 'externos'].includes(t.ruta) || conCalif.length > 0) {
       // Si requiere pares pero no han calificado, no se puede calcular aún
       if (!conCalif.length) return null;
       const promedio = conCalif.reduce((s, p) => s + Number(p.calificacion), 0) / conCalif.length;
       factorCalidad = promedio / 5;
       promedioStr = promedio.toFixed(2);
    }
    
    const ptsSugeridos = techo * factorCalidad * factorAutor;
    return { promedio: promedioStr, techo: techo.toFixed(1), autores: numAutores, factorAutor, ptsSugeridos: ptsSugeridos.toFixed(2) };
  }, [sol.pares_ext, datosProd, t.pts, t.ruta]);

  function avanzar(nuevaEtapa, extra = {}) {
    // Si se retrocede a una etapa previa al CIARP, se borra el acta asignada
    const etapasPreCiarp = ['recibida', 'clasificada', 'pares_internos', 'pares_externos', 'informe'];
    const clearActa = etapasPreCiarp.includes(nuevaEtapa);
    // Al retroceder a informe, restaurar estado a en_proceso para que el panel de ajuste sea visible
    const resetEstado = clearActa && sol.estado === 'aprobado' ? 'en_proceso' : sol.estado;
    onUpdate({
      ...sol,
      ...extra,
      datos_prod: datosProd,
      metadatos: metadatos,
      etapa: nuevaEtapa,
      estado: extra.estado !== undefined ? extra.estado : resetEstado,
      acta_ciarp: clearActa ? null : (extra.acta_ciarp !== undefined ? extra.acta_ciarp : sol.acta_ciarp),
      sesion_ciarp_id: clearActa ? null : sol.sesion_ciarp_id,
      timeline: [...sol.timeline, { f: 'Hoy', a: `Etapa actualizada: ${labelEtapa(nuevaEtapa)}`, p: user?.nombre || 'Sistema' }],
    });
  }

  function handleGuardarPuntaje() {
    onUpdate({
      ...sol,
      pts_asig: Number(ptsEdit),
      acta_ciarp: actaCiarp,
      datos_prod: datosProd,
      metadatos: metadatos,
      notas: (() => {
        let finalNotas = obsEdit;
        if (sol.notas) {
          try {
            const data = JSON.parse(sol.notas);
            if (data && typeof data === 'object') {
              data.observaciones = obsEdit;
              return JSON.stringify(data);
            }
          } catch (_e) { /* ignore */ }
        }
        return finalNotas;
      })(),
      timeline: [...sol.timeline, { f: 'Hoy', a: `Puntaje actualizado: ${ptsEdit} pts.`, p: user.nombre }],
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function handleGuardarInfo() {
    onUpdate({
      ...sol,
      ...editData,
      metadatos: metadatos,
      timeline: [...sol.timeline, { f: 'Hoy', a: `Información general modificada`, p: user.nombre }],
    });
    setIsEditing(false);
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 900 }}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <button className="btn btn-gh btn-sm" onClick={onBack}>← Volver</button>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>{sol.id}</h2>
          <p style={{ fontSize: 12, color: 'var(--muted)' }}>Radicada: {sol.fecha}</p>
        </div>
        {user?.rol !== 'lectura' ? (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Etapa:</span>
            <select
              value={sol.etapa}
              onChange={(e) => {
                const nuevaEtapa = e.target.value;
                if (window.confirm(`¿Seguro que deseas mover esta solicitud a la etapa "${labelEtapa(nuevaEtapa)}"?`)) {
                  avanzar(nuevaEtapa);
                }
              }}
              style={{
                padding: '6px 12px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 700,
                border: '1.5px solid var(--uq-green)',
                background: 'var(--surface)',
                color: 'var(--uq-green-dk)',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {ETAPAS.map((et) => (
                <option key={et.id} value={et.id}>
                  {et.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <span className={`badge ${badgeEtapa(sol.etapa)}`} style={{ marginLeft: 'auto', fontSize: 13, padding: '4px 12px' }}>
            {labelEtapa(sol.etapa)}
          </span>
        )}
        <button className={`btn ${isEditing ? 'btn-amber' : 'btn-o'} btn-sm`} onClick={() => isEditing ? handleGuardarInfo() : setIsEditing(true)}>
          {isEditing ? <><Save size={14} /> Guardar Cambios</> : (canEdit ? <><Edit3 size={14} /> Editar Todo</> : <><Edit3 size={14} /> Editar Título</>)}
        </button>
        {/* Botón ELIMINAR — roles con permiso de escritura */}
        {user?.rol !== 'lectura' && onEliminar && (
          <button
            onClick={() => setShowConfirmDelete(true)}
            style={{
              padding: '6px 14px', borderRadius: 8, border: '1.5px solid #dc2626',
              background: '#fff', color: '#dc2626', fontWeight: 700, fontSize: 12,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}>
            <span style={{display:"inline-flex", alignItems:"center", gap: 6}}><Trash2 size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Eliminar
          </button>
        )}
      </div>

      {/* PROGRESS */}
      <div style={{ marginBottom: 24 }}><ProgressBar etapa={sol.etapa} ruta={TIPOS[sol.tipo]?.ruta} /></div>

      {/* INFO CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: .4 }}>Datos del Docente</div>
          {isEditing && canEdit ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, color: 'var(--muted)' }}>Nombre completo</label>
              <input value={editData.docente} onChange={e => setEditData({...editData, docente: e.target.value})} placeholder="Nombre docente" />
              <label style={{ fontSize: 11, color: 'var(--muted)' }}>Cédula</label>
              <input value={editData.cedula || ''} onChange={e => setEditData({...editData, cedula: e.target.value})} placeholder="Cédula de ciudadanía" />
              <label style={{ fontSize: 11, color: 'var(--muted)' }}>Programa académico</label>
              <input value={editData.programa} onChange={e => setEditData({...editData, programa: e.target.value})} placeholder="Programa" />
              <label style={{ fontSize: 11, color: 'var(--muted)' }}>Facultad</label>
              <input value={editData.facultad} onChange={e => setEditData({...editData, facultad: e.target.value})} placeholder="Facultad" />
              <label style={{ fontSize: 11, color: 'var(--muted)' }}>Correo electrónico</label>
              <input type="email" value={editData.correo || ''} onChange={e => setEditData({...editData, correo: e.target.value})} placeholder="Correo institucional" />
            </div>
          ) : (
            <>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{sol.docente}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                {sol.cedula && (
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                    <span style={{display:"inline-flex", alignItems:"center", gap: 6}}><User size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> C.C. <strong>{sol.cedula}</strong>
                  </div>
                )}
                {sol.programa && (
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                    <span style={{display:"inline-flex", alignItems:"center", gap: 6}}><BookOpen size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> {sol.programa}
                  </div>
                )}
                {sol.facultad && (
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                    <span style={{display:"inline-flex", alignItems:"center", gap: 6}}><Landmark size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> {sol.facultad}
                  </div>
                )}
                {sol.correo && (
                  <div style={{ fontSize: 12, color: 'var(--text2)', wordBreak: 'break-all' }}>
                    <span style={{display:"inline-flex", alignItems:"center", gap: 6}}><Mail size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> <a href={`mailto:${sol.correo}`} style={{ color: 'var(--info)' }}>{sol.correo}</a>
                  </div>
                )}
                {sol.coautor && (
                  <div style={{ fontSize: 12, color: 'var(--text2)', gridColumn: '1 / -1' }}>
                    <span style={{display:"inline-flex", alignItems:"center", gap: 6}}><User size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Co-autor: <strong>{sol.coautor}</strong>
                  </div>
                )}
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                  <span style={{display:"inline-flex", alignItems:"center", gap: 6}}><Clock size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Radicado: {sol.fecha}
                </div>
              </div>
            </>
          )}
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: .4 }}>Producto</div>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{t.icon} {t.label || sol.tipo}</div>
          {isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
              <textarea rows={2} value={editData.titulo} onChange={e => setEditData({...editData, titulo: e.target.value})} placeholder="Título del producto" />
              {canEdit && (
                <input value={editData.revista} onChange={e => setEditData({...editData, revista: e.target.value})} placeholder="Revista o publicación" />
              )}
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, marginBottom: 8 }}>{sol.titulo}</div>
              {sol.revista && <div style={{ fontSize: 12, color: 'var(--text2)' }}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><FileText size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> {sol.revista}</div>}
            </>
          )}
          <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Sugerido:</span>
            <span style={{ fontWeight: 700, color: 'var(--g)' }}>{ptsSugReal} pts</span>
            {sol.pts_asig != null && <>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Asignado:</span>
              <span style={{ fontWeight: 700, color: 'var(--g)' }}>{sol.pts_asig} pts</span>
            </>}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          PANEL METADATOS — siempre visible para el técnico, en cualquier etapa
          ══════════════════════════════════════════════════════════════════ */}
      {isTecnico && (
        <div style={{ marginBottom: 16 }}>
          <DatosProductoPanel
            sol={sol}
            tipo={sol.tipo}
            datos={metadatos}
            onChange={(nuevosDatos) => { setMetadatos(nuevosDatos); setSaved(false); }}
          />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: -8, marginBottom: 8 }}>
            {savedMeta && (
              <span style={{ fontSize: 13, color: 'var(--g)', fontWeight: 700, alignSelf: 'center' }}>
                ✓ Metadatos guardados
              </span>
            )}
            <button
              className="btn btn-blue btn-sm"
              onClick={() => {
                onUpdate({ ...sol, metadatos: metadatos });
                setSavedMeta(true);
                setTimeout(() => setSavedMeta(false), 3000);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              💾 Guardar Metadatos
            </button>
          </div>
        </div>
      )}

      {/* RUTA */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: .4 }}>Ruta de Evaluación</div>
        <RutaTag tipo={sol.tipo} />

        {sol.pares_int && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--gp)', borderRadius: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><FileCheck size={16} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Evaluación Interna — {sol.pares_int.consejo}</div>
            <span className={`badge ${sol.pares_int.estado === 'aprobado' ? 'bg' : 'ba'}`}>
              {sol.pares_int.estado === 'aprobado' ? '<span style={{display:"inline-flex", alignItems:"center", gap: 6}}><CheckCircle size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> APROBADO' : '<span style={{display:"inline-flex", alignItems:"center", gap: 6}}><Clock size={16} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Pendiente'}
            </span>
            {sol.pares_int.vence && <span style={{ fontSize: 11, color: 'var(--warning)', marginLeft: 8 }}>Vence: {sol.pares_int.vence}</span>}
            
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text2)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(sol.memoEnvioInt || sol.pares_int.memoEnvio) && (
                <div><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><Send size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> <strong>Enviado:</strong> Memo {sol.memoEnvioInt || sol.pares_int.memoEnvio} el {sol.fechaEnvioInt || sol.pares_int.fechaEnvio}</div>
              )}
              {(sol.memoReciboInt || sol.pares_int.fecha) && (
                <div><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><Download size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> <strong>Recibido:</strong> Memo {sol.memoReciboInt || '-'} el {sol.fechaReciboInt || sol.pares_int.fecha}</div>
              )}
            </div>
          </div>
        )}

        {['externos', 'internos'].includes(t.ruta) && (t.ruta === 'externos' || (t.ruta === 'internos' && sol.pares_int?.estado === 'aprobado')) && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--g)' }}>
                <span style={{display:"inline-flex", alignItems:"center", gap: 6}}><User size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Pares Evaluadores Externos ({(sol.pares_ext || []).length})
              </div>
              {!isEditingPares && canEdit && (
                <button className="btn btn-o btn-sm" onClick={() => setIsEditingPares(true)} style={{ padding: '2px 8px', fontSize: 11 }}>
                  <span style={{display:"inline-flex", alignItems:"center", gap: 6}}><Edit3 size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Editar Evaluadores
                </button>
              )}
            </div>

            {isEditingPares ? (
              <div style={{ background: '#f8f8f8', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                {paresEdit.map((p, i) => (
                  <div key={i} style={{ marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>Par Evaluador {i + 1}</div>
                      <button className="btn btn-danger btn-sm" onClick={() => handleEliminarPar(i)} style={{ padding: '2px 6px', fontSize: 11 }}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><Trash2 size={12} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Eliminar</button>
                    </div>
                    <input type="text" className="input" placeholder="Nombre completo" value={p.nombre} onChange={e => handleParChange(i, 'nombre', e.target.value)} style={{ marginBottom: 8 }} />
                    <textarea className="input" placeholder="Perfil o Institución" value={p.perfil || p.univ || ''} onChange={e => handleParChange(i, 'perfil', e.target.value)} rows={2} style={{ marginBottom: 8 }} />
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>CVLAC (PDF hoja de vida):</label>
                      <PdfUploader
                        customName={`CVLAC_${(p.nombre || `Par${i+1}`).replace(/\s+/g,'_')}_${sol.id}`}
                        folder="cvlac"
                        initialFile={p.cvlac_url ? { nombre: p.cvlac_nombre || 'CVLAC.pdf', url: p.cvlac_url } : null}
                        onUploadSuccess={(result) => handleCvlacUpload(i, result)}
                        label="Subir HV CVLAC (PDF)"
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
                      <input className="input" placeholder="N° Memo a Par" value={p.memo_envio || ''} onChange={e => handleParChange(i, 'memo_envio', e.target.value)} />
                      <input className="input" type="date" value={p.fecha_envio || ''} onChange={e => handleParChange(i, 'fecha_envio', e.target.value)} />
                    </div>
                    <select className="input" value={p.estado} onChange={e => handleParChange(i, 'estado', e.target.value)}>
                      <option value="pendiente"><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><Clock size={16} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Pendiente</option>
                      <option value="recibido"><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><CheckCircle size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Entregó (Recibido)</option>
                    </select>
                  </div>
                ))}
                {paresEdit.length < 3 && (
                  <button className="btn btn-o btn-sm" style={{ width: '100%', marginBottom: 12 }} onClick={handleAgregarPar}>
                    + Añadir Tercer Par Evaluador (por discrepancia)
                  </button>
                )}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn btn-gh btn-sm" onClick={() => { setIsEditingPares(false); setParesEdit(sol.pares_ext || []); }}>Cancelar</button>
                  <button className="btn btn-p btn-sm" onClick={handleGuardarPares}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><Save size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Guardar Evaluadores</button>
                </div>
              </div>
            ) : (
              <>
                {/* En etapas avanzadas los pares ya aparecen en el panel de Evaluaciones — no repetir */}
                {!['pares_externos','informe','ciarp','proyectar_resoluciones','archivada'].includes(sol.etapa)
                  ? sol.pares_ext && sol.pares_ext.map((p, i) => (
                      <EvaluadorCard key={i} par={p} num={i + 1} etapa={sol.etapa} isTecnico={!canEdit} />
                    ))
                  : sol.pares_ext && sol.pares_ext.length > 0 && (
                      <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', padding: '8px 0' }}>
                        {['pares_externos'].includes(sol.etapa)
                          ? 'Ver panel de recepción de evaluaciones más abajo ↓'
                          : 'Ver panel de evaluaciones recibidas más abajo ↓'}
                      </div>
                    )
                }
                {(!sol.pares_ext || sol.pares_ext.length === 0) && (
                  <div style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>Sin evaluadores asignados.</div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* NOTAS */}
      {sol.notas && (
        <div className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: .4, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>Observaciones</div>
          {renderObservaciones(sol.notas)}
        </div>
      )}

      {/* TIMELINE */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: .4 }}>Línea de Tiempo</div>
        {sol.timeline.map((ev, i) => (
          <div key={i} className="timeline-item">
            <div className="timeline-dot" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--g)' }}>{ev.f}</span>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>· {ev.p}</span>
            </div>
            <div style={{ fontSize: 13 }}>{ev.a}</div>
          </div>
        ))}
      </div>

      {/* ACCIONES - SOLO ADMIN (equivale a asistente) */}
      {canEdit && (
        <>
          {sol.etapa === 'clasificada' && (
        <div className="card" style={{ padding: '16px 20px', border: '2px solid var(--g)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--g)', marginBottom: 10 }}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><AlertTriangle size={16} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Acción requerida</div>
          
          {t.ruta === 'internos' && (
            <>
              <p style={{ fontSize: 13, marginBottom: 8 }}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><FileCheck size={16} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Envíe el memorando al <strong>{t.consejo}</strong>. La evaluación interna tiene un plazo máximo de <strong>30 días</strong> a partir de la fecha de envío.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:4}}>N° Memorando de Envío</label>
                  <input className="input" placeholder="Ej: 2026-IM-1045" value={memoEnvioInt} onChange={e => setMemoEnvioInt(e.target.value)} />
                </div>
                <div>
                  <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:4}}>Fecha de envío al {t.consejo}</label>
                  <input className="input" type="date" value={fechaEnvioInt} onChange={e => setFechaEnvioInt(e.target.value)} />
                </div>
              </div>
              <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                <button className="btn btn-p" disabled={!memoEnvioInt || !fechaEnvioInt} onClick={() => avanzar('pares_internos', { memoEnvioInt, fechaEnvioInt })}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><Mail size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Registrar Envío y Avanzar</button>
                <button className="btn btn-o" onClick={() => generarDocumento('memorando', sol)}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><FileText size={16} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Imprimir Memorando → {t.consejo}</button>
              </div>
            </>
          )}

          {t.ruta === 'externos' && (
            <div style={{ background: '#f8f8f8', padding: 16, borderRadius: 8, border: '1px solid var(--border)' }}>
              <p style={{ fontSize: 13, marginBottom: 12, fontWeight: 700 }}>Asigne los pares evaluadores externos Minciencias e ingrese los datos de envío:</p>
              {paresEdit.map((p, i) => (
                <div key={i} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px dashed #ccc' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--g)' }}>Par Evaluador {i + 1}</div>
                  <input type="text" className="input" placeholder="Nombre completo" value={p.nombre} onChange={e => handleParChange(i, 'nombre', e.target.value)} style={{ marginBottom: 8 }} />
                  <textarea className="input" placeholder="Perfil o Institución" value={p.perfil || p.univ || ''} onChange={e => handleParChange(i, 'perfil', e.target.value)} rows={2} style={{ marginBottom: 8 }} />
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>CVLAC (PDF hoja de vida):</label>
                    <PdfUploader
                      customName={`CVLAC_${(p.nombre || `Par${i+1}`).replace(/\s+/g,'_')}_${sol.id}`}
                      folder="cvlac"
                      initialFile={p.cvlac_url ? { nombre: p.cvlac_nombre || 'CVLAC.pdf', url: p.cvlac_url } : null}
                      onUploadSuccess={(result) => handleCvlacUpload(i, result)}
                      label="Subir HV CVLAC (PDF)"
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <input className="input" placeholder="N° Memo a Par" value={p.memo_envio || ''} onChange={e => handleParChange(i, 'memo_envio', e.target.value)} />
                    <input className="input" type="date" value={p.fecha_envio || ''} onChange={e => handleParChange(i, 'fecha_envio', e.target.value)} />
                  </div>
                </div>
              ))}
              <button className="btn btn-o btn-sm" style={{ width: '100%', marginBottom: 16 }} onClick={handleAgregarPar}>
                + Añadir Par Evaluador
              </button>

              <div style={{display:'flex',gap:10}}>
                <button className="btn btn-p" onClick={() => avanzar('pares_externos', { pares_ext: paresEdit, memoEnvioExt: 'sent' })}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><Save size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Guardar Pares y Avanzar</button>
              </div>
            </div>
          )}

          {t.ruta === 'directo'  && <><p style={{ fontSize: 13, marginBottom: 12 }}>Producto va directo al CIARP. Envíe al técnico.</p><button className="btn btn-p" onClick={() => avanzar('informe')}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><ArrowRight size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Enviar a técnico para informe CIARP</button></>}
          {t.ruta === 'informe_directo' && <><p style={{ fontSize: 13, marginBottom: 12 }}>Premio: directo a informe sin evaluadores.</p><button className="btn btn-p" onClick={() => avanzar('informe')}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><ArrowRight size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Enviar a informe</button></>}
        </div>
      )}

      {sol.etapa === 'pares_internos' && (
        <div className="card" style={{ padding: '16px 20px', border: '2px solid var(--g)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--g)', marginBottom: 10 }}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><AlertTriangle size={16} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Evaluación Interna — {sol.pares_int?.consejo}</div>
          {diasTranscurridos !== null && (
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14, padding:'10px 14px', borderRadius:8, background: diasTranscurridos > 25 ? '#fff3cd' : '#e8f5e9', border: `1px solid ${diasTranscurridos > 25 ? '#ffe082' : '#b7dfb9'}` }}>
              <div style={{ fontSize:28 }}>{diasTranscurridos > 30 ? '<span style={{display:"inline-flex", alignItems:"center", gap: 6}}><XCircle size={24} color="#dc2626"/></span>' : diasTranscurridos > 25 ? '<span style={{display:"inline-flex", alignItems:"center", gap: 6}}><AlertTriangle size={24} color="#d97706"/></span>' : '<span style={{display:"inline-flex", alignItems:"center", gap: 6}}><CheckCircle size={24} color="#15803d"/></span>'}</div>
              <div>
                <div style={{ fontWeight:700, fontSize:13 }}>{diasTranscurridos} días desde el envío al {sol.pares_int?.consejo}</div>
                <div style={{ fontSize:11, color:'var(--muted)' }}>Plazo: 30 días · Enviado el {sol.fechaEnvioInt} · Memo {sol.memoEnvioInt}</div>
                {diasTranscurridos > 30 && <div style={{fontSize:11,color:'#c62828',fontWeight:700}}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><ShieldAlert size={16} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Plazo vencido</div>}
              </div>
              <div style={{ marginLeft:'auto', fontWeight:800, fontSize:20, color: diasTranscurridos > 30 ? '#c62828' : 'var(--g)' }}>{Math.max(0, 30 - diasTranscurridos)} días restantes</div>
            </div>
          )}
          <p style={{ fontSize: 13, marginBottom: 10 }}>Registre el memorando de <strong>respuesta del {sol.pares_int?.consejo}</strong>:</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:4}}>N° Memo Respuesta del Consejo</label>
              <input className="input" placeholder="N° Memorando" value={memoReciboInt} onChange={e => setMemoReciboInt(e.target.value)} />
            </div>
            <div>
              <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:4}}>Fecha recepción respuesta</label>
              <input className="input" type="date" value={fechaReciboInt} onChange={e => setFechaReciboInt(e.target.value)} />
            </div>
          </div>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            <button className="btn btn-p" onClick={() => avanzar('pares_externos', { memoReciboInt, fechaReciboInt, pares_int: { ...sol.pares_int, estado: 'aprobado', fecha: fechaReciboInt }, pares_ext: [] })}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><CheckCircle size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Aprobada → Avanzar a Pares Externos</button>
            <button className="btn btn-danger" onClick={() => avanzar('archivada', { memoReciboInt, fechaReciboInt, pares_int: { ...sol.pares_int, estado: 'no_aprobado', fecha: fechaReciboInt }, estado: 'rechazado' })}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><XCircle size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> No Aprobada (Rechazar)</button>
          </div>
        </div>
      )}

      {sol.etapa === 'pares_externos' && (
        <div className="card" style={{ padding: '16px 20px', border: '2px solid var(--warning)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--warning)', marginBottom: 10 }}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><AlertTriangle size={16} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Evaluaciones Externas</div>

          {!sol.memoEnvioExt ? (
            <div style={{ background: '#f8f8f8', padding: 16, borderRadius: 8, border: '1px solid var(--border)', marginBottom: 16 }}>
              <p style={{ fontSize: 13, marginBottom: 12, fontWeight: 700 }}>Asigne los pares evaluadores externos (Minciencias) e ingrese los datos de invitación:</p>
              {paresEdit.length === 0 && <button className="btn btn-o btn-sm" style={{marginBottom:12}} onClick={handleAgregarPar}>+ Agregar Par 1</button>}
              {paresEdit.map((p, i) => (
                <div key={i} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px dashed #ccc', background:'#fff', borderRadius:8, padding:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--g)' }}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><User size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Par Evaluador {i + 1}{i < 2 ? '' : ' (Dirimente)'}</div>
                    <button className="btn btn-danger btn-sm" style={{fontSize:11,padding:'2px 6px'}} onClick={() => handleEliminarPar(i)}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><Trash2 size={12} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Quitar</button>
                  </div>
                  <div style={{marginBottom:6}}><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:3}}>Nombre completo *</label><input type="text" className="input" placeholder="Nombre del par evaluador" value={p.nombre} onChange={e => handleParChange(i, 'nombre', e.target.value)} /></div>
                  <div style={{marginBottom:6}}><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:3}}>Perfil académico / Institución / Especialidad</label><textarea className="input" placeholder="Universidad, área de conocimiento, título académico" value={p.perfil || p.univ || ''} onChange={e => handleParChange(i, 'perfil', e.target.value)} rows={2} /></div>
                  <div style={{marginBottom:10}}>
                    <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:6}}>
                      <span style={{display:"inline-flex", alignItems:"center", gap: 6}}><Paperclip size={12} style={{display:"inline-block", verticalAlign:"middle"}}/></span> HOJA DE VIDA MINCIENCIAS (CVLAC)
                    </label>
                    <PdfUploader
                      key={p.cvlac_nombre || `cvlac-${i}`}
                      customName={`CVLAC_${(p.nombre || `Par${i+1}`).replace(/\s+/g,'_')}_${sol.id}`}
                      folder="cvlac"
                      initialFile={p.cvlac_url ? { nombre: p.cvlac_nombre || 'CVLAC.pdf', url: p.cvlac_url } : null}
                      onUploadSuccess={(res) => handleCvlacUpload(i, res)}
                      label="Subir PDF (Hoja de Vida)"
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:3}}>N° Memo invitación al par</label><input className="input" placeholder="N° Memorando" value={p.memo_envio || ''} onChange={e => handleParChange(i, 'memo_envio', e.target.value)} /></div>
                    <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:3}}>Fecha invitación al par</label><input className="input" type="date" value={p.fecha_envio || ''} onChange={e => handleParChange(i, 'fecha_envio', e.target.value)} /></div>
                  </div>
                </div>
              ))}
              {paresEdit.length < 3 && (
                <button className="btn btn-o btn-sm" style={{ width: '100%', marginBottom: 12 }} onClick={handleAgregarPar}>
                  + Añadir {paresEdit.length < 2 ? 'Par Evaluador' : 'Tercer Par (por discrepancia)'}
                </button>
              )}
              <button className="btn btn-blue" onClick={() => { onUpdate({ ...sol, memoEnvioExt: 'sent', pares_ext: paresEdit }); }}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><Save size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Guardar Pares y Enviar Invitaciones</button>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 13, marginBottom: 12 }}>Los pares evaluadores han sido invitados. Registre aquí cuando llegue cada evaluación.</p>
              <div style={{ background: '#fff3cd', padding: '12px 16px', borderRadius: 6, marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#856404', marginBottom: 8 }}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><Download size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Recepción de Evaluaciones (Asistente registra)</div>
                {sol.pares_ext && sol.pares_ext.map((par, i) => (
                  <div key={i} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: i < sol.pares_ext.length - 1 ? '1px dashed #e5c158' : 'none' }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: '#664d03', marginBottom: 8 }}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><User size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Par {i + 1}: {par.nombre || `Par Evaluador ${i + 1}`}</div>
                    <PdfUploader
                      key={par.concepto_nombre || `uploader-${i}`}
                      customName={`Concepto_Par${i + 1}_${sol.id}`}
                      folder="conceptos"
                      initialFile={par.concepto_nombre
                        ? { nombre: par.concepto_nombre, url: par.concepto_url }
                        : null
                      }
                      onUploadSuccess={(result) => handleConceptoUpload(i, result)}
                      label="Subir evaluación recibida del par"
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap:'wrap' }}>
                <button className="btn btn-p" onClick={() => avanzar('informe')}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><CheckCircle size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Evaluaciones completas, enviar al Técnico</button>
                <span style={{fontSize: 12, color: 'var(--muted)', marginTop: 8}}>Si hay discrepancia, añada un 3er par dirimente arriba y actualice las invitaciones.</span>
              </div>
            </>
          )}
        </div>
      )}

        </>
      )}

      {/* PANEL DE EVALUACIONES E INFORME — Aplica para TODOS los productos en etapa informe */}
      {(isTecnico || isAdmin) && sol.etapa === 'informe' && (
        <div className="card" style={{ padding: '20px 24px', marginBottom: 16, border: '2px solid #1565c0', background: 'linear-gradient(135deg,#e3f0ff 0%,#f0f8ff 100%)' }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#1565c0', marginBottom: 4 }}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><Download size={16} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Panel de Informe y Puntaje CIARP</div>
          <div style={{ fontSize: 13, color: '#c62828', fontWeight: 700, marginBottom: 16, background: '#ffebee', padding: '8px 12px', borderRadius: 6, border: '1px solid #ffcdd2' }}>
            <span style={{display:"inline-flex", alignItems:"center", gap: 6}}><ShieldAlert size={16} style={{display:"inline-block", verticalAlign:"middle"}}/></span> PASO PREVIO: Diligencie los metadatos y (si aplica) las notas de los pares antes de continuar.
          </div>
          {/* ── Pares evaluadores (informe) ── */}
          {sol.pares_ext && sol.pares_ext.length > 0 && sol.pares_ext.map((par, i) => {
            const tieneNombre = !!par.nombre;
            const tienePdf   = !!par.concepto_nombre;
            return (
              <div key={i} style={{ background: '#fff', border: '1px solid #b7dfb9', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--g)', marginBottom: 8 }}>
                  <span style={{display:"inline-flex", alignItems:"center", gap: 6}}><User size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Par {i + 1}: {par.nombre || 'Sin asignar'}
                </div>
                {par.cvlac_url && <a href={par.cvlac_url} target="_blank" rel="noreferrer" style={{fontSize:11,color:'var(--info)',display:'block',marginBottom:8}}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><Paperclip size={12} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Ver CVLAC</a>}

                {tieneNombre ? (
                  <>
                    {/* Solo el técnico ingresa nota y puntaje */}
                    {isTecnico && (
                      <div style={{marginBottom:8}}>
                        <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:3}}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><Award size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Calificación del par (1 a 5)</label>
                        <input className="input" type="number" min="1" max="5" step="0.1" placeholder="Ej: 4.5" defaultValue={par.calificacion || ''} onBlur={e => handleRegistrarEvalPar(i, 'calificacion', e.target.value)} style={{fontWeight:700,color:'var(--info)',width:'100%',maxWidth:'200px'}} />
                      </div>
                    )}
                    {/* Mostrar datos ya ingresados si el admin está viendo */}
                    {!isTecnico && par.calificacion && (
                      <div style={{fontSize:12,color:'var(--muted)',marginBottom:8}}>
                        <span><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><Award size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Calificación: {par.calificacion}</span>
                      </div>
                    )}
                    {/* PDF adjunto — con opción de reemplazar si se subió uno incorrecto */}
                    <div style={{marginTop: 6}}>
                      <PdfUploader
                        key={par.concepto_nombre || `eval-${i}`}
                        customName={`Concepto_Par${i + 1}_${sol.id}`}
                        folder="conceptos"
                        initialFile={par.concepto_nombre
                          ? { nombre: par.concepto_nombre, url: par.concepto_url }
                          : null
                        }
                        onUploadSuccess={(result) => handleConceptoUpload(i, result)}
                        label="Subir evaluación del par"
                      />
                    </div>
                  </>
                ) : (
                  <span style={{ fontSize: 11, color: '#856404', fontStyle: 'italic' }}>Par sin nombre asignado</span>
                )}
              </div>
            );
          })}
                    {calculo1279 && (
            <div style={{marginTop:12,padding:'14px 16px',background:'#f0faf2',borderRadius:10,border:'2px solid #4caf50',fontSize:13}}>
              <div style={{fontWeight:800,color:'var(--g)',marginBottom:8,fontSize:14}}>📊 Cálculo Automático D.1279</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:10}}>
                <div style={{background:'#fff',borderRadius:6,padding:'8px 10px',border:'1px solid #c8e6c9'}}><div style={{fontSize:10,color:'var(--muted)',fontWeight:700}}>PROMEDIO PARES</div><div style={{fontSize:16,fontWeight:800,color:'#1565c0'}}>{calculo1279.promedio}</div></div>
                <div style={{background:'#fff',borderRadius:6,padding:'8px 10px',border:'1px solid #c8e6c9'}}><div style={{fontSize:10,color:'var(--muted)',fontWeight:700}}>TECHO DECRETO</div><div style={{fontSize:16,fontWeight:800,color:'var(--g)'}}>{calculo1279.techo} pts</div></div>
                <div style={{background:'#fff',borderRadius:6,padding:'8px 10px',border:'1px solid #c8e6c9'}}><div style={{fontSize:10,color:'var(--muted)',fontWeight:700}}>FACTOR AUTORES ({calculo1279.autores})</div><div style={{fontSize:16,fontWeight:800,color:'#856404'}}>x{calculo1279.factorAutor.toFixed(2)}</div></div>
              </div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',borderTop:'2px dashed #4caf50',paddingTop:10}}>
                <div><span style={{fontSize:13,color:'var(--muted)'}}>Puntaje Final Sugerido:</span> <span style={{fontSize:22,fontWeight:900,color:'#1a6e2e'}}>{calculo1279.ptsSugeridos} pts</span></div>
                <button type="button" className="btn btn-o btn-sm" onClick={() => { setPtsEdit(calculo1279.ptsSugeridos); setSaved(false); }} style={{background:'#1a6e2e',color:'#fff',border:'none',padding:'8px 16px',fontWeight:700,fontSize:13}}>↑ Usar este puntaje</button>
              </div>
            </div>
          )}

          {/* ── Sección de Ajuste final dentro del mismo card ── */}
          {isTecnico && (
            <>
              <hr style={{margin:'16px 0',borderColor:'#b7dfb9'}}/>
              <div style={{fontWeight:700,fontSize:13,color:'var(--info)',marginBottom:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span>⚖️ Confirmar Puntaje y Enviar al CIARP</span>
                <button onClick={() => setShowDecretoPanel(v => !v)} style={{fontSize:11,background:'#e3f0ff',border:'1px solid #1565c0',borderRadius:6,color:'#1565c0',cursor:'pointer',padding:'3px 10px',fontWeight:700}}>
                  {showDecretoPanel ? '▲ Ocultar' : <><FileCheck size={14}/> Ver Tabla Decreto 1279</>}
                </button>
              </div>
              {sol.tipo === 'ascenso' && sol.pts_asig == null && (
                <div style={{background:'#f0fdf4', border:'1px solid #bbf7d0', padding:'8px 12px', borderRadius:8, marginBottom:16, fontSize:12, color:'#166534'}}>
                  💡 <strong>Puntaje pre-llenado automáticamente</strong> (Art. 19 D.1279). Puede ajustarlo si es necesario.
                </div>
              )}
              {showDecretoPanel && <Decreto1279Panel onClose={() => setShowDecretoPanel(false)} />}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
                <div>
                  <label style={{color:'var(--info)'}}>PUNTAJE ASIGNADO *</label>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <input type="number" min="0" max="40" step="0.1" value={ptsEdit} onChange={e => { setPtsEdit(e.target.value); setSaved(false); }} style={{fontSize:28,fontWeight:900,color:'var(--g)',textAlign:'center',maxWidth:120,border:'2px solid var(--g)',borderRadius:8}} />
                    <div style={{fontSize:11,color:'var(--muted)'}}>{calculo1279 ? `Sugerido: ${calculo1279.ptsSugeridos} pts` : `Máx: ${ptsSugReal} pts`}</div>
                  </div>
                </div>
                <div>
                  <label style={{color:'var(--info)'}}>ACTA / AÑO CIARP</label>
                  <input value={actaCiarp} onChange={e => { setActaCiarp(e.target.value); setSaved(false); }} placeholder="Ej: 1/2026" />
              {sesionesAbiertas.length > 0 && (
                <div style={{marginTop:6, display:'flex', gap:6, flexWrap:'wrap'}}>
                  {sesionesAbiertas.map(sesion => (
                    <button key={sesion} type="button" onClick={() => {setActaCiarp(sesion); setSaved(false);}} style={{fontSize:10, background:'#e8f5e9', color:'#1a6e2e', border:'1px solid #1a6e2e', borderRadius:4, padding:'2px 6px', cursor:'pointer'}}>Sugerido (Abierta): {sesion}</button>
                  ))}
                </div>
              )}
                  <div style={{marginTop:12}}>
                    <label style={{color:'var(--info)'}}>OBSERVACIONES / JUSTIFICACIÓN</label>
                    {renderReadOnlyJsonFields(sol.notas)}
                    <textarea rows={3} value={obsEdit} onChange={e => { setObsEdit(e.target.value); setSaved(false); }} placeholder="Justificación del puntaje..." />
                  </div>
                </div>
              </div>
              <div style={{display:'flex',gap:10,alignItems:'center'}}>
                <button className="btn btn-o" type="button" onClick={handleGuardarPuntaje}>💾 Guardar Borrador</button>
                {sol.etapa === 'informe' && <button className="btn btn-p" type="button" onClick={() => {
                  const finalNotas = (() => {
                    let res = obsEdit;
                    if (sol.notas) {
                      try {
                        const data = JSON.parse(sol.notas);
                        if (data && typeof data === 'object') { data.observaciones = obsEdit; return JSON.stringify(data); }
                      } catch (_e) { /* ignore */ }
                    }
                    return res;
                  })();
                  avanzar('ciarp', { pts_asig: Number(ptsEdit), acta_ciarp: actaCiarp, notas: finalNotas });
                }}>📊 Guardar y enviar al CIARP</button>}
                {saved && <span style={{fontSize:13,color:'var(--g)',fontWeight:700}}><CheckCircle size={14}/> Guardado</span>}
              </div>
            </>
          )}
        </div>
      )}

      {/* PANEL DE AJUSTE para etapas ciarp y proyectar_resoluciones (sin pares) */}
      {sol.estado !== 'aprobado' && isTecnico && (['ciarp','proyectar_resoluciones'].includes(sol.etapa) || (sol.tipo === 'ascenso' && sol.estado === 'aprobado_cei')) && (
        <>
          {/* Panel de ajuste puntaje — sin DatosProductoPanel duplicado */}
          <div className="card" style={{ padding: '20px 24px', marginBottom: 16, border: '2px solid var(--info)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 4 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--info)' }}>⚖️ Panel de Ajuste (Técnico / Jefe)</div>
            <button onClick={() => setShowDecretoPanel(v => !v)} style={{ fontSize:11, background:'#e3f0ff', border:'1px solid #1565c0', borderRadius:6, color:'#1565c0', cursor:'pointer', padding:'3px 10px', fontWeight:700 }}>
              {showDecretoPanel ? '▲ Ocultar' : <><FileCheck size={16} /> Ver Tabla Decreto 1279</>}
            </button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>Asigna o modifica los puntos salariales según Decreto 1279 de 2002.</div>
          {showDecretoPanel && <Decreto1279Panel onClose={() => setShowDecretoPanel(false)} />}
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ color: 'var(--info)' }}>PUNTAJE ASIGNADO *</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="number" min="0" max="40" step="0.1" value={ptsEdit} onChange={e => { setPtsEdit(e.target.value); setSaved(false); }} style={{ fontSize: 24, fontWeight: 700, color: 'var(--g)', textAlign: 'center', maxWidth: 120 }} />
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>Puntaje máximo sugerido:</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--g)' }}>{calculo1279 ? calculo1279.ptsSugeridos : ptsSugReal} pts</div>
                  {calculo1279 && (
                    <button type="button" className="btn btn-o btn-sm" onClick={() => { setPtsEdit(calculo1279.ptsSugeridos); setSaved(false); }} style={{padding:'2px 8px',fontSize:10,marginTop:4,color:'var(--g)',borderColor:'var(--g)'}}>↑ Usar cálculo D.1279</button>
                  )}
                </div>
              </div>
            </div>
            <div>
              <label style={{ color: 'var(--info)' }}>ACTA / AÑO CIARP</label>
              <input value={actaCiarp} onChange={e => { setActaCiarp(e.target.value); setSaved(false); }} placeholder="Ej: 1/2026" />
              {sesionesAbiertas.length > 0 && (
                <div style={{marginTop:6, display:'flex', gap:6, flexWrap:'wrap'}}>
                  {sesionesAbiertas.map(sesion => (
                    <button key={sesion} type="button" onClick={() => {setActaCiarp(sesion); setSaved(false);}} style={{fontSize:10, background:'#e8f5e9', color:'#1a6e2e', border:'1px solid #1a6e2e', borderRadius:4, padding:'2px 6px', cursor:'pointer'}}>Sugerido (Abierta): {sesion}</button>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 12 }}>
                <label style={{ color: 'var(--info)' }}>OBSERVACIONES / JUSTIFICACIÓN</label>
                {renderReadOnlyJsonFields(sol.notas)}
                <textarea rows={3} value={obsEdit} onChange={e => { setObsEdit(e.target.value); setSaved(false); }} placeholder="Justificación del puntaje..." />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button className="btn btn-o" type="button" onClick={handleGuardarPuntaje}>💾 Guardar Borrador</button>
            {(sol.etapa === 'informe' || (sol.tipo === 'ascenso' && sol.estado === 'aprobado_cei')) && <button className="btn btn-p" type="button" onClick={() => {
              const finalNotas = (() => {
                let res = obsEdit;
                if (sol.notas) {
                  try {
                    const data = JSON.parse(sol.notas);
                    if (data && typeof data === 'object') {
                      data.observaciones = obsEdit;
                      return JSON.stringify(data);
                    }
                  } catch (_e) { /* ignore */ }
                }
                return res;
              })();
              avanzar('ciarp', { pts_asig: Number(ptsEdit), acta_ciarp: actaCiarp, notas: finalNotas });
            }}>📊 Guardar y enviar al CIARP</button>}
            {saved && <span style={{ fontSize: 13, color: 'var(--g)', fontWeight: 700 }}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><CheckCircle size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Guardado</span>}
          </div>
        </div>
        </>
      )}

      {sol.etapa === 'ciarp' && (
        <div className="card" style={{ padding: '16px 20px', border: '2px solid #856404' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#856404', marginBottom: 10 }}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><AlertTriangle size={16} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Aprobar en CIARP y generar Acta</div>
          <p style={{ fontSize: 13, marginBottom: 12 }}>El CIARP aprueba <strong>{sol.pts_asig || sol.pts_sug} puntos</strong> para {sol.docente}. Generar Acta de Sesión.</p>
          <button className="btn btn-amber" onClick={() => avanzar('proyectar_resoluciones')}>📜 Aprobar y Proyectar Resolución</button>
        </div>
      )}

      {sol.etapa === 'proyectar_resoluciones' && (
        <div className="card" style={{ padding: '16px 20px', border: '2px solid var(--g)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--g)', marginBottom: 10 }}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><AlertTriangle size={16} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Proyectar Resolución</div>
          <p style={{ fontSize: 13, marginBottom: 12 }}>Generar documento y proceder con las firmas correspondientes. Una vez firmado, archivar.</p>
          <div style={{display:'flex',gap:10}}>
            <button className="btn btn-p" onClick={() => avanzar('archivada', { estado: 'aprobado' })}>📁 Archivar documentación (Aprobado)</button>
            <button className="btn btn-danger" onClick={() => avanzar('archivada', { estado: 'rechazado' })}>📁 Archivar documentación (No Aprobado)</button>
            <button className="btn btn-o" onClick={() => generarDocumento('resolucion', sol)}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><FileText size={16} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Pre-visualizar Resolución</button>
          </div>
        </div>
      )}

      {sol.etapa === 'archivada' && (
        <div className="card" style={{ padding: '16px 20px', border: '2px solid var(--gp)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--g)', marginBottom: 10 }}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><CheckCircle size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Trámite Finalizado</div>
          <p style={{ fontSize: 13, marginBottom: 12 }}>La solicitud fue debidamente archivada.</p>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            <button className="btn btn-o" onClick={() => setShowMailModal(true)}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><Mail size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Notificar al Docente por Correo</button>
            <button className="btn btn-o" onClick={() => generarDocumento('resolucion', sol)}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><FileText size={16} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Descargar Resolución</button>
          </div>
        </div>
      )}

      {/* MODAL DE NOTIFICACIÓN POR CORREO */}
      {showMailModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }} onClick={() => setShowMailModal(false)}>
          <div style={{ background:'#fff', borderRadius:16, padding:'28px 32px', maxWidth:520, width:'100%', boxShadow:'0 8px 40px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div style={{ fontWeight:800, fontSize:16 }}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><Mail size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Notificación CIARP al Docente</div>
              <button onClick={() => setShowMailModal(false)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'var(--muted)' }}>✕</button>
            </div>

            {/* DESTINATARIO */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#c62828', fontWeight: 700, cursor: 'pointer', background: '#ffebee', padding: '10px 14px', borderRadius: 8, border: '1px solid #ffcdd2' }}>
                <input 
                  type="checkbox" 
                  checked={true} 
                  readOnly
                  style={{ width: 16, height: 16 }}
                />
                ☑ MODO PRUEBA ACTIVADO (No se enviará al docente)
              </label>
            </div>
            
            <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:4 }}>¿A qué correo enviamos la prueba?</label>
            <input
              className="input"
              type="email"
              placeholder="Escribe tu correo personal o institucional..."
              value={mailPrueba}
              onChange={e => setMailPrueba(e.target.value)}
              style={{ marginBottom:16 }}
            />

            {/* PREVIEW */}
            <div style={{ background:'#f1f8e9', border:'1px solid #a5d6a7', borderRadius:8, padding:'10px 14px', marginBottom:18, fontSize:12, color:'#1b5e20' }}>
              <strong>Vista previa del asunto:</strong><br/>
              CIARP · Reconocimiento de Bonificaciones Salariales – Universidad del Quindío
            </div>

            {mailEstado && (
              <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:14, fontSize:13,
                background: mailEstado.ok ? '#e8f5e9' : '#ffebee',
                color: mailEstado.ok ? '#1b5e20' : '#c62828',
                border: `1px solid ${mailEstado.ok ? '#b7dfb9' : '#ffcdd2'}` }}>
                {mailEstado.ok ? '<span style={{display:"inline-flex", alignItems:"center", gap: 6}}><CheckCircle size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> ' : '<span style={{display:"inline-flex", alignItems:"center", gap: 6}}><XCircle size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> '}{mailEstado.msg}
              </div>
            )}

            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              <button className="btn btn-info" style={{flex:1}} onClick={() => previsualizarCorreoCIARP(sol)}>👁️ Ver previsualización</button>
              <button className="btn btn-p" style={{flex:1}} disabled={!mailPrueba || mailEnviando}
                onClick={async () => {
                  setMailEnviando(true);
                  setMailEstado(null);
                  try {
                    await enviarNotificacionCIARP({ sol, correoPrueba: mailPrueba });
                    setMailEstado({ ok: true, msg: `Correo enviado a ${mailPrueba}` });
                  } catch(e) {
                    setMailEstado({ ok: false, msg: `Error al enviar: ${e?.text || e?.message || 'Configure las credenciales EmailJS en emailNotificacion.js'}` });
                  } finally {
                    setMailEnviando(false);
                  }
                }}>
                {mailEnviando ? '<span style={{display:"inline-flex", alignItems:"center", gap: 6}}><Clock size={16} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Enviando...' : '<span style={{display:"inline-flex", alignItems:"center", gap: 6}}><Send size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Enviar correo de prueba'}
              </button>
            </div>

            <p style={{ fontSize:11, color:'var(--muted)', marginTop:14 }}>
              Para activar el envío real, registra tu cuenta en <a href="https://www.emailjs.com" target="_blank" rel="noreferrer">emailjs.com</a> (gratuito · 200 emails/mes) y coloca tus credenciales en <code>src/utils/emailNotificacion.js</code>.
            </p>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR ELIMINACIÓN */}
      {showConfirmDelete && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }} onClick={() => setShowConfirmDelete(false)}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: '32px 36px', maxWidth: 440, width: '100%',
            boxShadow: '0 8px 40px rgba(0,0,0,0.3)', textAlign: 'center',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 52, marginBottom: 12 }}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><Trash2 size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span></div>
            <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 900, color: '#dc2626' }}>
              Eliminar Solicitud
            </h3>
            <p style={{ fontSize: 14, color: '#555', margin: '0 0 8px' }}>
              ¿Estás seguro de eliminar permanentemente la solicitud?
            </p>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#1a1a1a', background: '#fef2f2', borderRadius: 8, padding: '8px 14px', margin: '0 0 8px' }}>
              {sol.id} — {sol.docente}
            </p>
            <p style={{ fontSize: 12, color: '#dc2626', margin: '0 0 24px' }}>
              <span style={{display:"inline-flex", alignItems:"center", gap: 6}}><ShieldAlert size={16} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Esta acción es <strong>irreversible</strong>. Se elimina completamente del servidor local.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowConfirmDelete(false)}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 8, border: '1.5px solid #e5e7eb',
                  background: '#fff', color: '#555', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                }}>
                Cancelar
              </button>
              <button
                onClick={() => { setShowConfirmDelete(false); onEliminar && onEliminar(sol.id); }}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 8, border: 'none',
                  background: '#dc2626', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer',
                }}>
                Sí, eliminar definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

