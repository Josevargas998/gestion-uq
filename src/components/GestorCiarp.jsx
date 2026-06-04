import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { TIPOS } from '../data.js';
import { exportarCIARP } from '../utils/exportCiarp.js';
import {
  fetchSesionesCiarp, createSesionCiarp, deleteSesionCiarp,
  cerrarYAbrirSesionCiarp, getSiguienteNumeroCiarp, getInformeSesionCiarp
} from '../utils/api.js';
import { useSolicitudes } from '../context/SolicitudesContext.jsx';
import { useNotification } from '../context/NotificationContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import {
  FileText, BookOpen, Monitor, PenTool, Lightbulb, Trophy,
  Mic, GraduationCap, Landmark, Star, Briefcase, Search,
  CheckCircle, XCircle, Clock, Scale, ClipboardList, FolderOpen,
  Download, FileX, Archive, Trash2, Plus, Calendar, ChevronRight,
  ChevronDown, BarChart2, X
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────
   HELPERS / CONSTANTES
───────────────────────────────────────────────────────────────── */
const CATEGORIAS_D1279 = [
  { key: 'articulos',      label: 'Artículos Indexados',          icon: <FileText size={16}/>, tipos: ['articulo_indexado','articulo_no_indexado'] },
  { key: 'libro_texto',    label: 'Libros de Texto',              icon: <BookOpen size={16}/>, tipos: ['libro_texto'] },
  { key: 'libro_ensayo',   label: 'Libros de Ensayo',             icon: <BookOpen size={16}/>, tipos: ['libro_ensayo'] },
  { key: 'libro_invest',   label: 'Libros de Investigación',      icon: <BookOpen size={16}/>, tipos: ['libro_investigacion'] },
  { key: 'software',       label: 'Software',                     icon: <Monitor size={16}/>,  tipos: ['software'] },
  { key: 'obras',          label: 'Obras / Prod. Técnica',        icon: <PenTool size={16}/>,  tipos: ['obra_artistica','produccion_tecnica','video','traduccion'] },
  { key: 'patentes',       label: 'Patentes',                     icon: <Lightbulb size={16}/>,tipos: ['patente'] },
  { key: 'premios',        label: 'Premios',                      icon: <Trophy size={16}/>,   tipos: ['premio'] },
  { key: 'ponencias',      label: 'Ponencias',                    icon: <Mic size={16}/>,      tipos: ['ponencia'] },
  { key: 'tesis',          label: 'Dirección de Tesis',           icon: <GraduationCap size={16}/>, tipos: ['direccion_tesis'] },
  { key: 'daa',            label: 'DAA — Desempeño Acad.-Admvo.',icon: <Landmark size={16}/>, tipos: ['daa'] },
  { key: 'ddd',            label: 'DDD — Desempeño Destacado',   icon: <Star size={16}/>,     tipos: ['ddd'] },
  { key: 'exp_calificada', label: 'Experiencia Calificada',       icon: <Briefcase size={16}/>,tipos: ['exp_calificada'] },
  { key: 'ascensos',       label: 'Ascensos CEI',                 icon: <GraduationCap size={16}/>, tipos: ['ascenso'] },
];

/* ─────────────────────────────────────────────────────────────────
   TABLA GENÉRICA DE PRODUCTOS (expandida dentro de la sesión)
───────────────────────────────────────────────────────────────── */
function TablaProductos({ lista, onSelect, onEliminar, user }) {
  const [q, setQ] = useState('');
  const [catTab, setCatTab] = useState('todos');

  const catsConProductos = useMemo(() => {
    const result = [{ key: 'todos', label: `Todos (${lista.length})`, icon: <ClipboardList size={14}/> }];
    CATEGORIAS_D1279.forEach(cat => {
      const p = lista.filter(s => cat.tipos.includes(s.tipo));
      if (p.length > 0) result.push({ ...cat, label: `${cat.label} (${p.length})` });
    });
    const otros = lista.filter(s => !CATEGORIAS_D1279.some(c => c.tipos.includes(s.tipo)));
    if (otros.length > 0) result.push({ key: 'otros', label: `Otros (${otros.length})`, icon: <FileText size={14}/> });
    return result;
  }, [lista]);

  const listaCategoria = useMemo(() => {
    if (catTab === 'todos') return lista;
    const cat = CATEGORIAS_D1279.find(c => c.key === catTab);
    if (cat) return lista.filter(s => cat.tipos.includes(s.tipo));
    return lista.filter(s => !CATEGORIAS_D1279.some(c => c.tipos.includes(s.tipo)));
  }, [catTab, lista]);

  const filtered = useMemo(() => {
    if (!q.trim()) return listaCategoria;
    const lq = q.toLowerCase();
    return listaCategoria.filter(r =>
      (r.docente && r.docente.toLowerCase().includes(lq)) ||
      (r.cedula && String(r.cedula).includes(lq)) ||
      (r.titulo && r.titulo.toLowerCase().includes(lq)) ||
      (r.programa && r.programa.toLowerCase().includes(lq))
    );
  }, [q, listaCategoria]);

  if (!lista.length) return (
    <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--muted)' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><FileX size={40} opacity={0.5} /></div>
      <div style={{ fontWeight: 600, fontSize: 14 }}>Sin productos en esta sesión</div>
    </div>
  );

  return (
    <div>
      {/* Tabs categorías */}
      <div style={{ display: 'flex', gap: 0, overflowX: 'auto', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        {catsConProductos.map(cat => (
          <button key={cat.key} onClick={() => setCatTab(cat.key)} style={{
            padding: '10px 14px', border: 'none',
            borderBottom: catTab === cat.key ? '2px solid var(--uq-green)' : '2px solid transparent',
            background: 'transparent',
            color: catTab === cat.key ? 'var(--uq-green)' : 'var(--muted)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            display: 'flex', alignItems: 'center', gap: 5, transition: 'color .2s'
          }}>
            {React.cloneElement(cat.icon, { size: 13 })} {cat.label}
          </button>
        ))}
      </div>
      {/* Buscador */}
      <div style={{ padding: '10px 16px', display: 'flex', gap: 12, alignItems: 'center', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Buscar nombre, cédula, título..."
            style={{ width: '100%', padding: '7px 12px 7px 34px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', fontWeight: 500 }}>{filtered.length} registros</span>
      </div>
      {/* Tabla */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg)', color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
              {['Cédula','Nombre','Programa','Tipo','Producto','Estado','Pts', user?.rol !== 'lectura' && onEliminar ? 'Acciones' : null].filter(Boolean).map((h, i) => (
                <th key={i} style={{ padding: '10px 16px', textAlign: h === 'Acciones' ? 'center' : 'left', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const tipo = TIPOS[r.tipo] || { label: r.tipo, icon: '📄' };
              const aprobado = r.estado === 'aprobado';
              const rechazado = r.estado === 'rechazado';
              return (
                <tr key={r.id} onClick={() => onSelect(r)}
                  style={{ background: 'var(--surface)', cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'background .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}>
                  <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 12, color: 'var(--muted)' }}>{r.cedula}</td>
                  <td style={{ padding: '10px 16px', fontWeight: 600, minWidth: 140, color: 'var(--text)' }}>
                    <div>{r.docente}</div>
                    {r.coautor && <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>+ {r.coautor}</div>}
                  </td>
                  <td style={{ padding: '10px 16px', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--muted)', fontSize: 12 }}>{r.programa}</td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {typeof tipo.icon === 'string' ? <FileText size={13}/> : tipo.icon} {tipo.label}
                    </div>
                  </td>
                  <td style={{ padding: '10px 16px', maxWidth: 200 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--text)' }} title={r.titulo}>{r.titulo}</div>
                    {r.revista && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{r.revista}</div>}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      background: aprobado ? '#f0fdf4' : rechazado ? '#fef2f2' : '#fffbeb',
                      color: aprobado ? '#15803d' : rechazado ? '#dc2626' : '#d97706',
                      border: `1px solid ${aprobado ? '#bbf7d0' : rechazado ? '#fecaca' : '#fde68a'}`,
                      borderRadius: 20, padding: '3px 9px', fontSize: 11, fontWeight: 600,
                    }}>
                      {aprobado ? <CheckCircle size={11}/> : rechazado ? <XCircle size={11}/> : <Clock size={11}/>}
                      {aprobado ? 'Aprobado' : rechazado ? 'Negado' : 'En proceso'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', fontWeight: 700, color: r.pts_asig != null ? 'var(--text)' : 'var(--muted)' }}>
                    {r.pts_asig != null ? `${r.pts_asig} pts` : '—'}
                  </td>
                  {user?.rol !== 'lectura' && onEliminar && (
                    <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); onEliminar(r); }}
                        style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 5, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', transition: 'all .15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        title="Eliminar producto">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   MODAL NUEVA SESIÓN CIARP
───────────────────────────────────────────────────────────────── */
function ModalNuevaSesion({ onClose, onCreated, user }) {
  const anioActual = new Date().getFullYear();
  const [anio, setAnio] = useState(anioActual);
  const [numero, setNumero] = useState('');
  const [fecha, setFecha] = useState('');
  const [cargando, setCargando] = useState(false);
  const [sugerido, setSugerido] = useState(null);
  const { error: showError } = useNotification();

  useEffect(() => {
    getSiguienteNumeroCiarp(anio)
      .then(d => { setSugerido(d.siguiente); if (!numero) setNumero(String(d.siguiente)); })
      .catch(() => {});
  }, [anio]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!numero || !fecha) { showError('Completa todos los campos'); return; }
    const num = parseInt(numero, 10);
    const fechaFormateada = new Date(fecha + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/');
    const acta_label = `${num}- ${fecha.split('-').reverse().join('/')}`;
    const id = `CIARP-${anio}-${String(num).padStart(2, '0')}`;
    setCargando(true);
    try {
      await createSesionCiarp({ id, numero: num, anio: parseInt(anio), fecha, acta_label, estado: 'abierta' });
      onCreated();
      onClose();
    } catch (err) {
      showError('Error al crear la sesión: ' + err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2100, backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}>
      <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 32, width: '100%', maxWidth: 440, boxShadow: '0 24px 64px rgba(0,0,0,0.2)', position: 'relative' }}
        onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
          <X size={20} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ background: 'var(--uq-green)', borderRadius: 12, padding: 10, display: 'flex' }}>
            <Scale size={22} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>Nueva Sesión CIARP</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Comité de Asignación y Reconocimiento de Puntaje</div>
          </div>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Año</label>
              <input type="number" value={anio} onChange={e => setAnio(e.target.value)} min={2020} max={2035}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 14, color: 'var(--text)', background: 'var(--bg)', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Número {sugerido != null && <span style={{ color: 'var(--uq-green)', fontWeight: 700 }}>(sugerido: {sugerido})</span>}
              </label>
              <input type="number" value={numero} onChange={e => setNumero(e.target.value)} min={1} max={99} required
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 14, color: 'var(--text)', background: 'var(--bg)', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Fecha de la sesión</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} required
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 14, color: 'var(--text)', background: 'var(--bg)', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          {fecha && numero && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#15803d', fontWeight: 600 }}>
              Acta: {parseInt(numero)}- {fecha.split('-').reverse().join('/')}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: '11px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" disabled={cargando}
              style={{ flex: 2, padding: '11px 16px', borderRadius: 10, border: 'none', background: 'var(--uq-green)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: cargando ? 0.7 : 1 }}>
              {cargando ? '⏳ Creando...' : <><Plus size={16} /> Crear Sesión</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   TARJETA DE SESIÓN CIARP (expandible, igual al CEI)
───────────────────────────────────────────────────────────────── */
function TarjetaSesion({ sesion, solicitudes, onSelect, onEliminar, user, onRecargar }) {
  const [expandida, setExpandida] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [confirmEliminar, setConfirmEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const { success, error: showError } = useNotification();

  const puedeEditar = user?.rol === 'admin' || user?.rol === 'tecnico';

  // Solicitudes de esta sesión (por sesion_ciarp_id o por acta_ciarp coincidente)
  const solDeSesion = useMemo(() =>
    solicitudes.filter(s =>
      s.sesion_ciarp_id === sesion.id ||
      (s.acta_ciarp && s.acta_ciarp === sesion.acta_label)
    ), [solicitudes, sesion]);

  const aprobadas = solDeSesion.filter(s => s.estado === 'aprobado');
  const negadas   = solDeSesion.filter(s => s.estado === 'rechazado');
  const totalPts  = aprobadas.reduce((acc, s) => acc + (parseFloat(s.pts_asig) || 0), 0);

  const esAbierta = sesion.estado === 'abierta';

  async function handleDescargar(e) {
    e.stopPropagation();
    setDescargando(true);
    try {
      const data = await getInformeSesionCiarp(sesion.id);
      const lista = data?.solicitudes || [];
      if (!lista.length) { showError('Esta sesión no tiene solicitudes vinculadas.'); return; }
      await exportarCIARP(lista, [], sesion.acta_label);
      success('Excel generado correctamente');
    } catch (err) {
      showError('Error al generar Excel: ' + err.message);
    } finally {
      setDescargando(false);
    }
  }

  async function handleEliminar() {
    setEliminando(true);
    try {
      await deleteSesionCiarp(sesion.id);
      success('Sesión eliminada');
      onRecargar();
    } catch (err) {
      showError('Error al eliminar: ' + err.message);
    } finally {
      setEliminando(false);
      setConfirmEliminar(false);
    }
  }

  return (
    <>
      <div style={{
        background: '#fff', border: `1px solid ${esAbierta ? 'var(--uq-green)' : 'var(--border)'}`,
        borderRadius: 14, overflow: 'hidden',
        boxShadow: esAbierta ? '0 0 0 2px rgba(0,107,63,0.10)' : 'var(--shadow-xs)',
        transition: 'box-shadow .2s'
      }}>
        {/* Fila principal */}
        <div
          onClick={() => setExpandida(v => !v)}
          style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', cursor: 'pointer', gap: 16 }}
          onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
          onMouseLeave={e => e.currentTarget.style.background = ''}>

          {/* Icono */}
          <div style={{ width: 44, height: 44, borderRadius: 12, background: esAbierta ? 'var(--uq-green)' : '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Scale size={20} color={esAbierta ? '#fff' : '#888'} />
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
                CIARP {sesion.numero} — {sesion.anio}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
                background: esAbierta ? '#dcfce7' : '#f1f5f9',
                color: esAbierta ? '#15803d' : '#64748b',
                border: `1px solid ${esAbierta ? '#86efac' : '#e2e8f0'}`
              }}>{esAbierta ? 'abierta' : 'cerrada'}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={12} />
              {sesion.fecha ? new Date(sesion.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }) : 'Sin fecha'}
              {' · '}Acta: {sesion.acta_label}
            </div>
          </div>

          {/* Estadísticas */}
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexShrink: 0 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#15803d' }}>{aprobadas.length}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>Aprobadas</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: negadas.length > 0 ? '#dc2626' : 'var(--muted)' }}>{negadas.length}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>Negadas</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: totalPts > 0 ? 'var(--uq-blue)' : 'var(--muted)' }}>{totalPts.toFixed(1)}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>Puntos</div>
            </div>
          </div>

          {/* Acciones */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            <button
              onClick={handleDescargar}
              disabled={descargando}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--uq-green)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'var(--uq-green)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
              <Download size={13} /> {descargando ? 'Generando...' : 'Descargar Excel'}
            </button>
            {puedeEditar && (
              <button
                onClick={() => setConfirmEliminar(true)}
                style={{ padding: 7, borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all .15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626'; }}
                title="Eliminar sesión">
                <Trash2 size={14} />
              </button>
            )}
            <div style={{ color: 'var(--muted)', display: 'flex', transition: 'transform .2s', transform: expandida ? 'rotate(90deg)' : 'rotate(0deg)' }}>
              <ChevronRight size={18} />
            </div>
          </div>
        </div>

        {/* Panel expandido */}
        {expandida && (
          <div style={{ borderTop: '1px solid var(--border)', background: '#fafafa' }}>
            <div style={{ padding: '14px 20px', fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ClipboardList size={14} />
              Solicitudes en esta sesión
              <span style={{ marginLeft: 4, fontSize: 12, fontWeight: 500, color: 'var(--muted)' }}>({solDeSesion.length})</span>
            </div>
            <TablaProductos lista={solDeSesion} onSelect={onSelect} onEliminar={onEliminar} user={user} />
          </div>
        )}
      </div>

      {/* Confirmar eliminar */}
      <ConfirmDialog
        open={confirmEliminar}
        title="Eliminar Sesión CIARP"
        message={`¿Seguro que deseas eliminar la sesión CIARP ${sesion.numero} — ${sesion.anio} (Acta: ${sesion.acta_label})? Las solicitudes vinculadas NO se eliminarán.`}
        confirmLabel={eliminando ? 'Eliminando...' : 'Sí, eliminar'}
        cancelLabel="Cancelar"
        onConfirm={handleEliminar}
        onCancel={() => setConfirmEliminar(false)}
      />
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────
   VISTA: PRÓXIMO CIARP (cola de solicitudes listas)
───────────────────────────────────────────────────────────────── */
function VistaProximoCiarp({ solicitudes, onSelect, onEliminar, user }) {
  const listosProductividad = solicitudes.filter(s =>
    s.tipo !== 'ascenso' && s.etapa === 'informe' && !s.acta_ciarp
  );
  const ascensosAprobadosCEI = solicitudes.filter(s =>
    s.tipo === 'ascenso' &&
    s.estado === 'aprobado_cei' &&
    !(s.estado === 'aprobado' && s.pts_asig != null)
  );
  const enciarp = solicitudes.filter(s => s.etapa === 'ciarp' && !s.acta_ciarp);

  const listos = [...listosProductividad, ...ascensosAprobadosCEI];
  const [sub, setSub] = useState('listos');
  const total = listos.length + enciarp.length;
  const current = sub === 'listos' ? listos : enciarp;

  return (
    <div style={{ padding: '24px 32px' }}>
      <div style={{ background: 'linear-gradient(135deg,#1a5fa8,#0d3d6e)', borderRadius: 16, padding: '24px 32px', color: '#fff', marginBottom: 24, boxShadow: 'var(--shadow-md)' }}>
        <div style={{ fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}><ClipboardList size={22} /> Productos en cola para el Próximo CIARP</div>
        <div style={{ fontSize: 13, opacity: 0.9, marginTop: 6, fontWeight: 500 }}>Productividad con informe listo + Ascensos aprobados por CEI · Decreto 1279 de 2002</div>
        <div style={{ display: 'flex', gap: 32, marginTop: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 28, fontWeight: 700 }}>{total}</span>
            <span style={{ fontSize: 12, opacity: 0.9, fontWeight: 500, lineHeight: 1.2 }}>Total en<br/>cola</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: '#86efac' }}>{listosProductividad.length}</span>
            <span style={{ fontSize: 12, opacity: 0.9, fontWeight: 500, lineHeight: 1.2 }}>Productividad<br/>lista</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: '#fbbf24' }}>{ascensosAprobadosCEI.length}</span>
            <span style={{ fontSize: 12, opacity: 0.9, fontWeight: 500, lineHeight: 1.2 }}>Ascensos<br/>aprobados CEI</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: '#fde68a' }}>{enciarp.length}</span>
            <span style={{ fontSize: 12, opacity: 0.9, fontWeight: 500, lineHeight: 1.2 }}>En sesión<br/>CIARP</span>
          </div>
        </div>
      </div>

      {total === 0 ? (
        <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', padding: '64px 20px', textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><CheckCircle size={48} color="var(--uq-green)" opacity={0.8} /></div>
          <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--text)' }}>No hay productos en cola para el próximo CIARP</div>
          <div style={{ fontSize: 14, marginTop: 8 }}>Todos los productos evaluados ya tienen acta asignada.</div>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
            {[
              { key: 'listos',  label: `Listos para CIARP (${listos.length})`, color: '#006B3F', icon: <Landmark size={16}/> },
              { key: 'enciarp',label: `En sesión CIARP (${enciarp.length})`,  color: '#b45309', icon: <Scale size={16}/> },
            ].map(t => (
              <button key={t.key} onClick={() => setSub(t.key)} style={{
                padding: '12px 24px', border: 'none',
                borderBottom: sub === t.key ? `2px solid ${t.color}` : '2px solid transparent',
                background: sub === t.key ? 'var(--surface)' : 'transparent',
                color: sub === t.key ? t.color : 'var(--muted)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all .2s'
              }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          {sub === 'listos' && ascensosAprobadosCEI.length > 0 && (
            <div style={{ padding: '10px 20px', background: '#fefce8', borderBottom: '1px solid #fde68a', fontSize: 12, color: '#92400e', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
              <GraduationCap size={14} /> {ascensosAprobadosCEI.length} ascenso{ascensosAprobadosCEI.length !== 1 ? 's' : ''} aprobado{ascensosAprobadosCEI.length !== 1 ? 's' : ''} por el CEI esperando aprobación de puntos en el CIARP
            </div>
          )}
          <TablaProductos lista={current} onSelect={onSelect} onEliminar={onEliminar} user={user} />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   VISTA: SESIONES CIARP (nuevo diseño igual al CEI)
───────────────────────────────────────────────────────────────── */
function VistaSesionesCiarp({ solicitudes, onSelect, onEliminar, user }) {
  const [sesiones, setSesiones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { error: showError } = useNotification();

  const puedeEditar = user?.rol === 'admin' || user?.rol === 'tecnico';

  const cargarSesiones = useCallback(async () => {
    setCargando(true);
    try {
      const data = await fetchSesionesCiarp();
      // Ordenar: abiertas primero, luego por año desc y número desc
      const ordenadas = [...(data || [])].sort((a, b) => {
        if (a.estado === 'abierta' && b.estado !== 'abierta') return -1;
        if (b.estado === 'abierta' && a.estado !== 'abierta') return 1;
        if (b.anio !== a.anio) return b.anio - a.anio;
        return b.numero - a.numero;
      });
      setSesiones(ordenadas);
    } catch (err) {
      showError('Error al cargar sesiones CIARP');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarSesiones(); }, [cargarSesiones]);

  const totalSesiones = sesiones.length;
  const sesionAbierta = sesiones.find(s => s.estado === 'abierta');

  if (cargando) return (
    <div style={{ padding: '64px 20px', textAlign: 'center', color: 'var(--muted)' }}>
      <div style={{ fontWeight: 600 }}>Cargando sesiones...</div>
    </div>
  );

  return (
    <div style={{ padding: '24px 32px' }}>
      {/* Cabecera con botón nueva sesión */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>Historial de Sesiones CIARP</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            {totalSesiones} sesión{totalSesiones !== 1 ? 'es' : ''} registrada{totalSesiones !== 1 ? 's' : ''}
            {sesionAbierta && (
              <span style={{ marginLeft: 12, fontWeight: 600, color: 'var(--uq-green)' }}>
                · Abierta: CIARP {sesionAbierta.numero} — {sesionAbierta.anio}
              </span>
            )}
          </div>
        </div>
        {puedeEditar && (
          <button
            onClick={() => setShowModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, border: 'none', background: 'var(--uq-blue)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 12px rgba(26,95,168,0.25)', transition: 'all .2s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#1551a0'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--uq-blue)'}
          >
            <Plus size={16} /> Nueva Sesión CIARP
          </button>
        )}
      </div>

      {/* Lista de tarjetas */}
      {sesiones.length === 0 ? (
        <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', padding: '64px 20px', textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><Archive size={48} opacity={0.5} /></div>
          <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--text)' }}>No hay sesiones CIARP registradas</div>
          <div style={{ fontSize: 14, marginTop: 8 }}>Crea la primera sesión con el botón de arriba.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sesiones.map(sesion => (
            <TarjetaSesion
              key={sesion.id}
              sesion={sesion}
              solicitudes={solicitudes}
              onSelect={onSelect}
              onEliminar={onEliminar}
              user={user}
              onRecargar={cargarSesiones}
            />
          ))}
        </div>
      )}

      {/* Modal nueva sesión */}
      {showModal && (
        <ModalNuevaSesion
          onClose={() => setShowModal(false)}
          onCreated={cargarSesiones}
          user={user}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   COMPONENTE PRINCIPAL
───────────────────────────────────────────────────────────────── */
export default function GestorCiarp({ user, solicitudes, onSelect, setNav }) {
  const { eliminar } = useSolicitudes();
  const { success, error: showError } = useNotification();
  const [activeTab, setActiveTab] = useState('proximo');
  const [solicitudAEliminar, setSolicitudAEliminar] = useState(null);

  const solProd = solicitudes;

  const proximoCount = solProd.filter(s =>
    (['informe','ciarp'].includes(s.etapa) || (s.tipo === 'ascenso' && s.estado === 'aprobado_cei')) && !s.acta_ciarp
  ).length;
  const histCount = solProd.filter(s => s.acta_ciarp || s.sesion_ciarp_id).length;

  const TABS = [
    { key: 'proximo',  label: 'Próximo CIARP',    icon: <ClipboardList size={18}/>, count: proximoCount, color: '#1a5fa8' },
    { key: 'sesiones', label: 'Sesiones CIARP',   icon: <FolderOpen size={18}/>,    count: histCount,    color: '#006B3F' },
  ];

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>

      {/* Cabecera */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10, letterSpacing: '-0.02em' }}>
          <Landmark size={28} color="var(--uq-green)" /> CIARP — Comité de Asignación y Reconocimiento de Puntaje
        </h2>
        <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: 13, fontWeight: 500 }}>
          Universidad del Quindío · Decreto 1279 de 2002 · Gestión de productos académicos
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { icon: <ClipboardList size={22}/>, label: 'Total solicitudes',  val: solProd.length,                                      color: '#1a5fa8' },
          { icon: <Landmark size={22}/>,      label: 'Próximo CIARP',      val: proximoCount,                                        color: '#1a5fa8' },
          { icon: <CheckCircle size={22}/>,   label: 'Historial aprobados',val: solProd.filter(s => s.estado === 'aprobado').length,  color: '#15803d' },
          { icon: <XCircle size={22}/>,       label: 'No aprobados',       val: solProd.filter(s => s.estado === 'rechazado').length, color: '#dc2626' },
          { icon: <FolderOpen size={22}/>,    label: 'Con acta CIARP',     val: histCount,                                           color: '#006B3F' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: 'var(--shadow-xs)' }}>
            <div style={{ color: s.color, marginBottom: 8, background: `${s.color}15`, padding: 8, borderRadius: 10 }}>{s.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textAlign: 'center', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Pestañas */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            padding: '12px 24px', borderRadius: '12px 12px 0 0',
            border: '1px solid transparent', borderBottom: 'none',
            background: activeTab === t.key ? 'var(--surface)' : 'transparent',
            color: activeTab === t.key ? t.color : 'var(--muted)',
            fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: activeTab === t.key ? '0 -4px 12px rgba(0,0,0,.03)' : 'none',
            borderColor: activeTab === t.key ? 'var(--border)' : 'transparent',
            position: 'relative', top: 1, transition: 'all .2s'
          }}>
            {t.icon} {t.label}
            <span style={{
              background: activeTab === t.key ? t.color : 'var(--border)',
              color: activeTab === t.key ? '#fff' : 'var(--muted)',
              borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700, marginLeft: 4
            }}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div style={{ background: 'var(--surface)', borderRadius: '0 16px 16px 16px', border: '1px solid var(--border)', minHeight: 400, boxShadow: 'var(--shadow-xs)', overflow: 'hidden' }}>
        {activeTab === 'proximo'  && <VistaProximoCiarp solicitudes={solProd} onSelect={onSelect} onEliminar={setSolicitudAEliminar} user={user} />}
        {activeTab === 'sesiones' && <VistaSesionesCiarp solicitudes={solProd} onSelect={onSelect} onEliminar={setSolicitudAEliminar} user={user} />}
      </div>

      {/* CONFIRM DELETE SOLICITUD */}
      <ConfirmDialog
        open={!!solicitudAEliminar}
        title="Eliminar Solicitud"
        message={`¿Estás seguro de eliminar permanentemente la solicitud ${solicitudAEliminar?.id} de ${solicitudAEliminar?.docente}? Esta acción es irreversible.`}
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        onConfirm={async () => {
          if (solicitudAEliminar) {
            const res = await eliminar(solicitudAEliminar.id);
            if (res?.success) {
              success('Solicitud eliminada');
              setSolicitudAEliminar(null);
            } else {
              showError('No se pudo eliminar el producto.');
            }
          }
        }}
        onCancel={() => setSolicitudAEliminar(null)}
      />
    </div>
  );
}
