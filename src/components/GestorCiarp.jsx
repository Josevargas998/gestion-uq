import React, { useState, useMemo } from 'react';
import { TIPOS } from '../data.js';
import { exportarCIARP } from '../utils/exportCiarp.js';
import { normalizeActaKey } from '../helpers.js';
import { useSolicitudes } from '../context/SolicitudesContext.jsx';
import { useNotification } from '../context/NotificationContext.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import { 
  FileText, BookOpen, Monitor, PenTool, Lightbulb, Trophy, 
  Mic, GraduationCap, Landmark, Star, Briefcase, Search, 
  CheckCircle, XCircle, Clock, Scale, ClipboardList, FolderOpen, 
  Download, FileX, Archive, Trash2
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────
   HELPERS
 ───────────────────────────────────────────────────────────────── */

// Categorías de productos según Decreto 1279 de 2002
const CATEGORIAS_D1279 = [
  { key: 'articulos',     label: 'Artículos Indexados',           icon: <FileText size={16}/>, tipos: ['articulo_indexado','articulo_no_indexado'] },
  { key: 'libros',        label: 'Libros',                        icon: <BookOpen size={16}/>, tipos: ['libro_texto','libro_ensayo','libro_investigacion'] },
  { key: 'software',      label: 'Software',                      icon: <Monitor size={16}/>, tipos: ['software'] },
  { key: 'obras',         label: 'Obras / Producción Técnica',    icon: <PenTool size={16}/>, tipos: ['obra_artistica','produccion_tecnica','video','traduccion'] },
  { key: 'patentes',      label: 'Patentes',                      icon: <Lightbulb size={16}/>, tipos: ['patente'] },
  { key: 'premios',       label: 'Premios',                       icon: <Trophy size={16}/>, tipos: ['premio'] },
  { key: 'ponencias',     label: 'Ponencias',                     icon: <Mic size={16}/>, tipos: ['ponencia'] },
  { key: 'tesis',         label: 'Dirección de Tesis',            icon: <GraduationCap size={16}/>, tipos: ['direccion_tesis'] },
  // Reconocimientos Decreto 1279
  { key: 'daa',           label: 'DAA — Desempeño Acad.-Admvo.',  icon: <Landmark size={16}/>, tipos: ['daa'] },
  { key: 'ddd',           label: 'DDD — Desempeño Destacado',     icon: <Star size={16}/>,    tipos: ['ddd'] },
  { key: 'exp_calificada',label: 'Experiencia Calificada',        icon: <Briefcase size={16}/>, tipos: ['exp_calificada'] },
];

function getCategoriaKey(tipo) {
  for (const cat of CATEGORIAS_D1279) {
    if (cat.tipos.includes(tipo)) return cat.key;
  }
  return 'otros';
}

function agruparPorActa(solicitudes) {
  const conActa = solicitudes.filter(s => s.acta_ciarp && s.tipo !== 'ascenso');
  const grupos = {}; // key = canonical "NUM/YEAR"
  conActa.forEach(s => {
    const key = normalizeActaKey(s.acta_ciarp);
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push(s);
  });
  return grupos;
}

function parseActaLabel(canonicalKey) {
  const m = canonicalKey.match(/(\d+)\/(\d{4})/);
  if (m) return { num: parseInt(m[1]), year: parseInt(m[2]), label: `CIARP ${m[1]} — ${m[2]}` };
  return { num: 0, year: 0, label: canonicalKey };
}

/* ─────────────────────────────────────────────────────────────────
   TABLA GENÉRICA DE PRODUCTOS
───────────────────────────────────────────────────────────────── */
function TablaProductos({ lista, onSelect, onEliminar, user }) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    if (!q.trim()) return lista;
    const lq = q.toLowerCase();
    return lista.filter(r =>
      (r.docente && r.docente.toLowerCase().includes(lq)) ||
      (r.cedula && String(r.cedula).includes(lq)) ||
      (r.titulo && r.titulo.toLowerCase().includes(lq)) ||
      (r.programa && r.programa.toLowerCase().includes(lq))
    );
  }, [q, lista]);

  if (!lista.length) return (
    <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--muted)' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><FileX size={40} opacity={0.5} /></div>
      <div style={{ fontWeight: 600, fontSize: 14 }}>Sin productos en esta categoría</div>
    </div>
  );

  return (
    <div>
      <div style={{ padding: '12px 20px', display: 'flex', gap: 12, alignItems: 'center', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Buscar nombre, cédula, título..."
            style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} />
        </div>
        <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', fontWeight: 500 }}>{filtered.length} registros</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg)', color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
              {['Cédula','Nombre','Programa','Tipo','Producto','Estado','Pts', user?.rol !== 'lectura' && onEliminar ? 'Acciones' : null].filter(Boolean).map((h, i) => (
                <th key={i} style={{ padding: '12px 20px', textAlign: h === 'Acciones' ? 'center' : 'left', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, idx) => {
              const tipo = TIPOS[r.tipo] || { label: r.tipo, icon: '📄' };
              const aprobado = r.estado === 'aprobado';
              const rechazado = r.estado === 'rechazado';
              return (
                <tr key={r.id} onClick={() => onSelect(r)}
                  style={{ background: 'var(--surface)', cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'background .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}>
                  <td style={{ padding: '12px 20px', fontFamily: 'monospace', fontSize: 12, color: 'var(--muted)' }}>{r.cedula}</td>
                  <td style={{ padding: '12px 20px', fontWeight: 600, minWidth: 150, color: 'var(--text)' }}>
                    <div>{r.docente}</div>
                    {r.coautor && <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>+ {r.coautor}</div>}
                  </td>
                  <td style={{ padding: '12px 20px', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--muted)', fontSize: 12 }}>{r.programa}</td>
                  <td style={{ padding: '12px 20px', fontSize: 12, color: 'var(--text)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {typeof tipo.icon === 'string' ? <FileText size={14}/> : tipo.icon} {tipo.label}
                    </div>
                  </td>
                  <td style={{ padding: '12px 20px', maxWidth: 220 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--text)' }} title={r.titulo}>{r.titulo}</div>
                    {r.revista && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{r.revista}</div>}
                  </td>
                  <td style={{ padding: '12px 20px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      background: aprobado ? '#f0fdf4' : rechazado ? '#fef2f2' : '#fffbeb',
                      color: aprobado ? '#15803d' : rechazado ? '#dc2626' : '#d97706',
                      border: `1px solid ${aprobado ? '#bbf7d0' : rechazado ? '#fecaca' : '#fde68a'}`,
                      borderRadius: 20, padding: '4px 10px', fontSize: 11, fontWeight: 600,
                    }}>
                      {aprobado ? <CheckCircle size={12}/> : rechazado ? <XCircle size={12}/> : <Clock size={12}/>}
                      {aprobado ? 'Aprobado' : rechazado ? 'Negado' : 'En proceso'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 20px', fontWeight: 700, color: r.pts_asig != null ? 'var(--text)' : 'var(--muted)' }}>
                    {r.pts_asig != null ? `${r.pts_asig} pts` : '—'}
                  </td>
                  {user?.rol !== 'lectura' && onEliminar && (
                    <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onEliminar(r);
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
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   VISTA: HISTÓRICO DE UNA SESIÓN CIARP
───────────────────────────────────────────────────────────────── */
function VistaSesionCiarp({ acta, productos, onSelect, onEliminar, user }) {
  const parsed = parseActaLabel(acta);
  const [catTab, setCatTab] = useState('todos');

  const aprobados   = productos.filter(s => s.estado === 'aprobado');
  const rechazados  = productos.filter(s => s.estado === 'rechazado');
  const totalPts    = aprobados.reduce((a, s) => a + (s.pts_asig || 0), 0);

  // Categorías con productos
  const catsConProductos = useMemo(() => {
    const result = [{ key: 'todos', label: `Todos (${productos.length})`, icon: <ClipboardList size={14}/> }];
    CATEGORIAS_D1279.forEach(cat => {
      const p = productos.filter(s => cat.tipos.includes(s.tipo));
      if (p.length > 0) result.push({ ...cat, label: `${cat.label} (${p.length})` });
    });
    const otros = productos.filter(s => !CATEGORIAS_D1279.some(c => c.tipos.includes(s.tipo)));
    if (otros.length > 0) result.push({ key: 'otros', label: `Otros (${otros.length})`, icon: <FileText size={14}/> });
    return result;
  }, [productos]);

  const listaActual = useMemo(() => {
    if (catTab === 'todos') return productos;
    const cat = CATEGORIAS_D1279.find(c => c.key === catTab);
    if (cat) return productos.filter(s => cat.tipos.includes(s.tipo));
    return productos.filter(s => !CATEGORIAS_D1279.some(c => c.tipos.includes(s.tipo)));
  }, [catTab, productos]);

  return (
    <div>
      {/* Banner de la sesión */}
      <div style={{ background: 'var(--uq-green)', color: '#fff', padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><Scale size={24} /> {parsed.label}</div>
          <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4, fontWeight: 500 }}>
            Decreto 1279 de 2002 · Todas las categorías evaluadas
          </div>
        </div>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{productos.length}</div>
            <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 500 }}>Productos</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#86efac' }}>{aprobados.length}</div>
            <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 500 }}>Aprobados</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#fca5a5' }}>{rechazados.length}</div>
            <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 500 }}>Negados</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#fde68a' }}>{totalPts.toFixed(1)}</div>
            <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 500 }}>Puntos asig.</div>
          </div>
        </div>
        {aprobados.length > 0 && (
          <button onClick={() => exportarCIARP(aprobados, [], parsed.label)}
            style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'background .2s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}>
            <Download size={16} /> Exportar Informe
          </button>
        )}
      </div>

      {/* Tabs por categoría Decreto 1279 */}
      <div style={{ display: 'flex', gap: 0, overflowX: 'auto', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        {catsConProductos.map(cat => (
          <button key={cat.key} onClick={() => setCatTab(cat.key)} style={{
            padding: '12px 16px', border: 'none',
            borderBottom: catTab === cat.key ? '2px solid var(--uq-green)' : '2px solid transparent',
            background: 'transparent',
            color: catTab === cat.key ? 'var(--uq-green)' : 'var(--muted)',
            fontSize: 13, fontWeight: 600,
            cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6,
            transition: 'color .2s'
          }}>
            {React.cloneElement(cat.icon, { size: 14 })} {cat.label}
          </button>
        ))}
      </div>

      <TablaProductos lista={listaActual} onSelect={onSelect} onEliminar={onEliminar} user={user} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   VISTA: PRÓXIMO CIARP
───────────────────────────────────────────────────────────────── */
function VistaProximoCiarp({ solicitudes, onSelect, onEliminar, user }) {
  const listos  = solicitudes.filter(s => s.etapa === 'informe' && !s.acta_ciarp);
  const enciarp = solicitudes.filter(s => s.etapa === 'ciarp' && !s.acta_ciarp);
  const [sub, setSub] = useState('listos');

  const total = listos.length + enciarp.length;
  const current = sub === 'listos' ? listos : enciarp;

  return (
    <div style={{ padding: '24px 32px' }}>
      {/* Banner */}
      <div style={{ background: 'linear-gradient(135deg,#1a5fa8,#0d3d6e)', borderRadius: 16, padding: '24px 32px', color: '#fff', marginBottom: 24, boxShadow: 'var(--shadow-md)' }}>
        <div style={{ fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}><ClipboardList size={24} /> Productos en cola para el Próximo CIARP</div>
        <div style={{ fontSize: 13, opacity: 0.9, marginTop: 6, fontWeight: 500 }}>
          Productos con evaluación completa, sin acta asignada aún · Decreto 1279 de 2002
        </div>
        <div style={{ display: 'flex', gap: 32, marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 28, fontWeight: 700 }}>{total}</span>
            <span style={{ fontSize: 12, opacity: 0.9, fontWeight: 500, lineHeight: 1.2 }}>Total en<br/>cola</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: '#86efac' }}>{listos.length}</span>
            <span style={{ fontSize: 12, opacity: 0.9, fontWeight: 500, lineHeight: 1.2 }}>Con informe<br/>listo</span>
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
              { key: 'listos',  label: `Informe CIARP (${listos.length})`,  color: '#006B3F', icon: <Landmark size={16}/> },
              { key: 'enciarp', label: `En sesión CIARP (${enciarp.length})`, color: '#b45309', icon: <Scale size={16}/> },
            ].map(t => (
              <button key={t.key} onClick={() => setSub(t.key)} style={{
                padding: '12px 24px', border: 'none',
                borderBottom: sub === t.key ? `2px solid ${t.color}` : '2px solid transparent',
                background: sub === t.key ? 'var(--surface)' : 'transparent',
                color: sub === t.key ? t.color : 'var(--muted)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8, transition: 'all .2s'
              }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          <TablaProductos lista={current} onSelect={onSelect} onEliminar={onEliminar} user={user} />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   VISTA: HISTÓRICO CIARP
───────────────────────────────────────────────────────────────── */
function VistaHistorico({ solicitudes, onSelect, onEliminar, user }) {
  const grupos = useMemo(() => agruparPorActa(solicitudes), [solicitudes]);

  // Ordenar sesiones: más reciente primero
  const sesiones = Object.keys(grupos).map(acta => ({
    acta,
    ...parseActaLabel(acta),
    productos: grupos[acta],
  })).sort((a, b) => b.year - a.year || b.num - a.num);

  // Años disponibles
  const years = [...new Set(sesiones.map(s => s.year))].sort((a, b) => b - a);
  const [selYear, setSelYear] = useState(years[0] || new Date().getFullYear());
  const [selActa, setSelActa] = useState(null);

  const sesionesFiltradas = sesiones.filter(s => s.year === selYear);

  // Auto-select first session of selected year
  const actaActual = selActa && sesionesFiltradas.find(s => s.acta === selActa)
    ? selActa
    : sesionesFiltradas[0]?.acta || null;

  const sesionActual = sesionesFiltradas.find(s => s.acta === actaActual);

  if (sesiones.length === 0) return (
    <div style={{ padding: '64px 20px', textAlign: 'center', color: 'var(--muted)' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><Archive size={48} opacity={0.6} /></div>
      <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--text)' }}>No hay histórico de sesiones CIARP</div>
      <div style={{ fontSize: 14, marginTop: 8 }}>Los productos archivados con acta aparecerán aquí.</div>
    </div>
  );

  return (
    <div style={{ padding: '24px 32px' }}>
      {/* Selector de año */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Año de sesión</span>
        {years.map(y => (
          <button key={y} onClick={() => { setSelYear(y); setSelActa(null); }} style={{
            padding: '6px 16px', borderRadius: 20, border: '1px solid',
            borderColor: selYear === y ? 'var(--uq-green)' : 'var(--border)',
            background: selYear === y ? 'var(--uq-green)' : 'var(--surface)',
            color: selYear === y ? '#fff' : 'var(--text)',
            fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all .2s'
          }}>{y}</button>
        ))}
      </div>

      {/* Selector de sesión dentro del año */}
      {sesionesFiltradas.length > 1 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          {sesionesFiltradas.map(s => (
            <button key={s.acta} onClick={() => setSelActa(s.acta)} style={{
              padding: '8px 20px', borderRadius: 10, border: '1px solid',
              borderColor: actaActual === s.acta ? 'var(--uq-blue)' : 'var(--border)',
              background: actaActual === s.acta ? 'var(--uq-blue-lt)' : 'var(--surface)',
              color: actaActual === s.acta ? 'var(--uq-blue-dk)' : 'var(--text)',
              fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              transition: 'all .2s'
            }}>
              <Scale size={14} /> {s.label}
              <span style={{ fontSize: 12, opacity: 0.7, background: actaActual === s.acta ? 'rgba(26,95,168,0.1)' : 'var(--bg)', padding: '2px 8px', borderRadius: 10 }}>{s.productos.length}</span>
            </button>
          ))}
        </div>
      )}

      {/* Contenido de la sesión seleccionada */}
      {sesionActual ? (
        <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
          <VistaSesionCiarp acta={sesionActual.acta} productos={sesionActual.productos} onSelect={onSelect} onEliminar={onEliminar} user={user} />
        </div>
      ) : (
        <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontWeight: 600 }}>Selecciona una sesión</div>
        </div>
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

  const solProd = useMemo(() => solicitudes.filter(s => s.tipo !== 'ascenso'), [solicitudes]);

  const proximoCount = solProd.filter(s => ['informe','ciarp'].includes(s.etapa) && !s.acta_ciarp).length;
  const histCount    = solProd.filter(s => s.acta_ciarp).length;

  const TABS = [
    { key: 'proximo',  label: 'Próximo CIARP', icon: <ClipboardList size={18}/>, count: proximoCount, color: '#1a5fa8' },
    { key: 'historico',label: 'Histórico CIARP', icon: <FolderOpen size={18}/>, count: histCount,   color: '#006B3F' },
  ];

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>

      {/* Cabecera */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10, letterSpacing: '-0.02em' }}>
          <Landmark size={28} color="var(--uq-green)" /> CIARP — Comité de Asignación y Reconocimiento de Puntaje
        </h2>
        <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: 13, fontWeight: 500 }}>
          Universidad del Quindío · Decreto 1279 de 2002 · Gestión de productos académicos
        </p>
      </div>

      {/* KPIs rápidos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 16, marginBottom: 32 }}>
        {[
          { icon: <ClipboardList size={22}/>, label: 'Total solicitudes',  val: solProd.length,                                                       color: '#1a5fa8' },
          { icon: <Landmark size={22}/>, label: 'Próximo CIARP',       val: proximoCount,                                                         color: '#1a5fa8' },
          { icon: <CheckCircle size={22}/>, label: 'Historial aprobados', val: solProd.filter(s => s.estado === 'aprobado').length,                   color: '#15803d' },
          { icon: <XCircle size={22}/>, label: 'No aprobados',        val: solProd.filter(s => s.estado === 'rechazado').length,                  color: '#dc2626' },
          { icon: <FolderOpen size={22}/>, label: 'Con acta CIARP',      val: histCount,                                                            color: '#006B3F' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--surface)', border: `1px solid var(--border)`, borderRadius: 16, padding: '16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: 'var(--shadow-xs)' }}>
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
            position: 'relative', top: 1,
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
        {activeTab === 'proximo' && <VistaProximoCiarp solicitudes={solProd} onSelect={onSelect} onEliminar={setSolicitudAEliminar} user={user} />}
        {activeTab === 'historico' && <VistaHistorico solicitudes={solProd} onSelect={onSelect} onEliminar={setSolicitudAEliminar} user={user} />}
      </div>

      {/* CONFIRM DELETE MODAL */}
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
              showError("No se pudo eliminar el producto.");
            }
          }
        }}
        onCancel={() => setSolicitudAEliminar(null)}
      />
    </div>
  );
}
