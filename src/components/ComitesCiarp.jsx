import React, { useState, useEffect, useCallback } from 'react';
import { exportarCIARP } from '../utils/exportCiarp.js';
import { TIPOS } from '../data.js';
import { badgeEtapa, labelEtapa, normalizeActaKey } from '../helpers.js';
import {
  fetchSesionesCiarp, createSesionCiarp, getSiguienteNumeroCiarp,
  getInformeSesionCiarp, cerrarYAbrirSesionCiarp
} from '../utils/api.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

function agruparPorCAP(solicitudes) {
  const capEtapas = ['informe','ciarp','proyectar_resoluciones','archivada'];
  // En etapa 'informe', solo se muestran en CIARP si ya tienen acta_ciarp asignada
  const candidatos = solicitudes.filter(s =>
    capEtapas.includes(s.etapa) &&
    (s.etapa !== 'informe' || (s.acta_ciarp && s.acta_ciarp.trim()))
  );
  const grupos = {};
  candidatos.forEach(s => {
    const rawActa = (s.acta_ciarp || '').trim();
    if (!rawActa) {
      const key = '__proximo__';
      if (!grupos[key]) grupos[key] = { label: 'Próximo CAP (sin número asignado)', aprobados: [], listos: [] };
      grupos[key].listos.push(s);
      return;
    }
    const key = normalizeActaKey(rawActa);
    if (!grupos[key]) {
      const m = key.match(/(\d+)\/(\d{4})/);
      const label = m ? `CAP N° ${m[1]} — ${m[2]}` : `CAP N° ${key}`;
      grupos[key] = { label, aprobados: [], listos: [] };
    }
    if (['archivada', 'proyectar_resoluciones'].includes(s.etapa)) {
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

// ── Sub-component: product row in CAP ───────────────────────────────────────

function CapRow({ s, onSelect }) {
  const t = TIPOS[s.tipo] || {};
  return (
    <div
      onClick={() => onSelect(s)}
      style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 16,
        borderBottom: '1px solid #f0f0f0', cursor: 'pointer', transition: 'background .15s' }}
      onMouseOver={e => e.currentTarget.style.background = '#fafafa'}
      onMouseOut={e  => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: s.pts_asig != null ? 'var(--g)' : 'var(--warning)' }}
           title={s.pts_asig != null ? 'Puntaje asignado' : 'Pendiente puntaje'} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {s.titulo}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
          {s.docente} · {t.icon} {t.label || s.tipo} · <span style={{ color: 'var(--text2)' }}>{s.programa}</span>
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--g)' }}>
          {s.pts_asig != null ? `${s.pts_asig} pts` : '? pts'}
        </div>
        <div style={{ fontSize: 10, color: 'var(--muted)' }}>{labelEtapa(s.etapa)}</div>
      </div>
    </div>
  );
}

// ── Modal Nueva Sesión CIARP ─────────────────────────────────────────────────

function ModalNuevaSesion({ onClose, onCreated }) {
  const anioActual = new Date().getFullYear();
  const [anio, setAnio]         = useState(anioActual);
  const [numero, setNumero]     = useState('');
  const [fecha, setFecha]       = useState('');
  const [notas, setNotas]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [cargandoSig, setCargandoSig] = useState(false);

  useEffect(() => {
    setCargandoSig(true);
    getSiguienteNumeroCiarp(anio)
      .then(r => setNumero(String(r.siguiente)))
      .catch(() => {})
      .finally(() => setCargandoSig(false));
  }, [anio]);

  function onFechaChange(v) {
    setFecha(v);
    if (v) {
      const y = parseInt(v.substring(0, 4), 10);
      if (!isNaN(y) && y !== anio) setAnio(y);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!numero) { setError('El número de sesión es obligatorio'); return; }
    setLoading(true); setError('');
    try {
      await createSesionCiarp({ numero: parseInt(numero, 10), fecha: fecha || null, notas: notas || null });
      onCreated();
      onClose();
    } catch (err) {
      setError(err.message || 'Error al crear la sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:2100,
                  display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}
         onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:16, padding:'28px 32px', maxWidth:460, width:'100%',
                    boxShadow:'0 8px 40px rgba(0,0,0,0.22)' }}
           onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div style={{ fontWeight:800, fontSize:17 }}>🏛️ Nueva Sesión CIARP</div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'var(--muted)' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
            <div>
              <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:4 }}>Número de sesión</label>
              <input className="input" type="number" min="1" value={cargandoSig ? '' : numero}
                onChange={e => setNumero(e.target.value)} required placeholder="Ej: 2" />
              <div style={{ fontSize:10, color:'var(--muted)', marginTop:2 }}>Auto-sugerido para {anio}</div>
            </div>
            <div>
              <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:4 }}>Fecha de reunión</label>
              <input className="input" type="date" value={fecha} onChange={e => onFechaChange(e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:4 }}>Notas / Observaciones</label>
            <textarea className="input" rows={3} value={notas} onChange={e => setNotas(e.target.value)}
              placeholder="Ej: Sesión ordinaria, quórum completo..." style={{ resize:'vertical' }} />
          </div>
          {error && (
            <div style={{ padding:'8px 12px', background:'#ffebee', borderRadius:8, fontSize:12, color:'#c62828', marginBottom:12 }}>
              ❌ {error}
            </div>
          )}
          <div style={{ display:'flex', gap:10 }}>
            <button type="button" className="btn btn-gh" style={{ flex:1 }} onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-p" style={{ flex:2 }} disabled={loading}>
              {loading ? '⏳ Guardando...' : '✅ Crear sesión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Panel de Sesiones CIARP ──────────────────────────────────────────────────

function PanelSesionesCiarp({ user }) {
  const [sesiones, setSesiones]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [descargando, setDescargando] = useState({});

  const cargarSesiones = useCallback(() => {
    setLoading(true);
    fetchSesionesCiarp()
      .then(data => setSesiones(data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { cargarSesiones(); }, [cargarSesiones]);

  async function handleCerrarYAbrir(sesion) {
    if (!window.confirm(`¿Estás seguro de cerrar la sesión CIARP ${sesion.acta_label}? Esta acción cerrará la sesión actual y creará automáticamente la siguiente.`)) return;
    try {
      setLoading(true);
      await cerrarYAbrirSesionCiarp(sesion.id);
      cargarSesiones();
    } catch (err) {
      alert('Error: ' + err.message);
      setLoading(false);
    }
  }

  async function descargarInforme(sesion) {
    setDescargando(prev => ({ ...prev, [sesion.id]: true }));
    try {
      const data = await getInformeSesionCiarp(sesion.id);
      if (!data?.solicitudes?.length) {
        alert('Esta sesión no tiene solicitudes registradas.');
        return;
      }
      exportarCIARP(data.solicitudes, [], sesion.acta_label);
    } catch (err) {
      alert('Error al descargar: ' + err.message);
    } finally {
      setDescargando(prev => ({ ...prev, [sesion.id]: false }));
    }
  }

  const puedeCrear = user?.rol === 'admin' || user?.rol === 'tecnico';

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h3 style={{ fontWeight:700, fontSize:16, marginBottom:2 }}>Historial de Sesiones CIARP</h3>
          <p style={{ fontSize:12, color:'var(--muted)' }}>
            {sesiones.length} sesión{sesiones.length !== 1 ? 'es' : ''} registrada{sesiones.length !== 1 ? 's' : ''}
          </p>
        </div>
        {puedeCrear && (
          <button className="btn btn-p" id="btn-nueva-sesion-ciarp" onClick={() => setShowModal(true)}>
            + Nueva Sesión CIARP
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:32, color:'var(--muted)' }}>⏳ Cargando sesiones...</div>
      ) : sesiones.length === 0 ? (
        <div style={{ textAlign:'center', padding:40, color:'var(--muted)' }}>
          <div style={{ fontSize:40, marginBottom:10 }}>🏛️</div>
          <div style={{ fontWeight:700 }}>Sin sesiones registradas</div>
          <div style={{ fontSize:12, marginTop:4 }}>Crea la primera sesión CIARP con el botón de arriba.</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {sesiones.map(s => {
            const fechaStr = s.fecha
              ? new Date(s.fecha).toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric', timeZone:'UTC' })
              : 'Fecha no registrada';
            const estadoColor = s.estado === 'abierta' ? '#22c55e' : '#6b7280';
            const isLoad = descargando[s.id];
            return (
              <div key={s.id} className="card" style={{ padding:'14px 20px', display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
                <div style={{ width:44, height:44, borderRadius:10, background:'var(--g)',
                              display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
                  🏛️
                </div>
                <div style={{ flex:1, minWidth:200 }}>
                  <div style={{ fontWeight:700, fontSize:15 }}>
                    CIARP {s.numero} — {s.anio}
                    <span style={{ marginLeft:8, fontSize:11, fontWeight:600, color:estadoColor,
                      background: s.estado === 'abierta' ? '#dcfce7' : '#f3f4f6',
                      padding:'2px 7px', borderRadius:99 }}>
                      {s.estado}
                    </span>
                  </div>
                  <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>
                    📅 {fechaStr} · Acta: {s.acta_label}
                  </div>
                  {s.notas && (
                    <div style={{ fontSize:11, color:'var(--text2)', marginTop:2, fontStyle:'italic' }}>{s.notas}</div>
                  )}
                </div>
                <div style={{ display:'flex', gap:20, textAlign:'center', fontSize:12 }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:16, color:'var(--g)' }}>{s.aprobadas || 0}</div>
                    <div style={{ color:'var(--muted)' }}>Aprobadas</div>
                  </div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:16 }}>{s.rechazadas || 0}</div>
                    <div style={{ color:'var(--muted)' }}>Rechazadas</div>
                  </div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:16, color:'#2563eb' }}>{parseFloat(s.pts_totales || 0).toFixed(1)}</div>
                    <div style={{ color:'var(--muted)' }}>Puntos</div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  {s.estado === 'abierta' && puedeCrear && (
                    <button className="btn btn-p" onClick={() => handleCerrarYAbrir(s)} disabled={isLoad}
                      title="Cerrar esta sesión y abrir la siguiente automáticamente" style={{ padding: '6px 12px', fontSize: 12 }}>
                      🔄 Cerrar CIARP
                    </button>
                  )}
                  <button className="btn btn-gh" onClick={() => descargarInforme(s)} disabled={isLoad}
                    title={`Descargar informe Excel de ${s.acta_label}`} style={{ padding: '6px 12px', fontSize: 12 }}>
                    {isLoad ? '⏳' : '📥'} Excel
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <ModalNuevaSesion onClose={() => setShowModal(false)} onCreated={cargarSesiones} />
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function ComitesCiarp({ user, solicitudes, onSelect, setNav }) {
  const grupos = agruparPorCAP(solicitudes);
  const [tab, setTab]         = useState('sesiones');
  const [openCap, setOpenCap] = useState(grupos[0]?.key || null);
  const [showMailModal, setShowMailModal]     = useState(false);
  const [mailPrueba, setMailPrueba]           = useState('');
  const [mailEstado, setMailEstado]           = useState(null);
  const [notifLoading, setNotifLoading]       = useState(false);
  const [docentesAEnviar, setDocentesAEnviar] = useState([]);

  function prepararNotificaciones(aprobados) {
    const agrupados = {};
    aprobados.forEach(s => {
      const clave = s.correo || s.docente;
      if (!agrupados[clave]) agrupados[clave] = [];
      agrupados[clave].push(s);
    });
    setDocentesAEnviar(Object.values(agrupados));
    setMailEstado(null);
    setShowMailModal(true);
  }

  async function ejecutarEnvio() {
    setNotifLoading(true); setMailEstado(null); let ok = 0;
    try {
      const { enviarNotificacionCIARP } = await import('../utils/emailNotificacion.js');
      for (const grupoSol of docentesAEnviar) {
        try { await enviarNotificacionCIARP({ sol: grupoSol, correoPrueba: mailPrueba }); ok++; }
        catch(e) { console.error('Error al notificar:', e); }
      }
      setMailEstado({ ok: true, msg: `Correos enviados a ${ok} docentes (redirigidos a ${mailPrueba}).` });
    } catch(e) {
      setMailEstado({ ok: false, msg: `Error global: ${e.message}` });
    } finally { setNotifLoading(false); }
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1060, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--g)', marginBottom: 4 }}>
          Comités de Asignación de Puntaje
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>
          Gestión de sesiones CIARP y vista de productos evaluados por comité
        </p>
      </div>

      {/* TABS PRINCIPALES */}
      <div style={{ display:'flex', gap:4, marginBottom:24, borderBottom:'2px solid var(--border)' }}>
        {[{ id:'sesiones', label:'🏛️ Sesiones CIARP' }, { id:'cap', label:'📊 CAP por Productos' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding:'8px 20px', fontSize:13,
              fontWeight: tab === t.id ? 700 : 500,
              background: tab === t.id ? 'var(--g)' : 'transparent',
              color: tab === t.id ? '#fff' : 'var(--text2)',
              border: 'none',
              borderBottom: tab === t.id ? '3px solid var(--g)' : '3px solid transparent',
              cursor:'pointer', borderRadius:'6px 6px 0 0', transition:'all .15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: SESIONES */}
      {tab === 'sesiones' && <PanelSesionesCiarp user={user} />}

      {/* TAB: CAP POR PRODUCTOS */}
      {tab === 'cap' && (
        <div>
          {grupos.length === 0 ? (
            <div style={{ padding: '40px 28px', color: 'var(--muted)', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🏛️</div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>Sin productos en CAP</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>
                Aparecerán aquí cuando los productos lleguen a la etapa de Informe CIARP o superior.
              </div>
            </div>
          ) : (
            <>
              <div style={{ display:'flex', gap:4, marginBottom:24, flexWrap:'wrap', borderBottom:'2px solid var(--border)' }}>
                {grupos.map((g, idx) => (
                  <button key={g.key} onClick={() => setOpenCap(openCap === g.key ? null : g.key)}
                    style={{ padding:'8px 18px', fontSize:13,
                      fontWeight: openCap === g.key ? 700 : 500,
                      background: openCap === g.key ? 'var(--g)' : 'transparent',
                      color: openCap === g.key ? '#fff' : 'var(--text2)',
                      border:'none',
                      borderBottom: openCap === g.key ? '3px solid var(--g)' : '3px solid transparent',
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
                  <div key={g.key}>
                    <div className="card" style={{ marginBottom:20, padding:0, overflow:'hidden' }}>
                      <div style={{ background: esCapPrincipal ? 'var(--g)' : '#f0f4ff',
                        color: esCapPrincipal ? '#fff' : 'var(--text)',
                        padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div>
                          <div style={{ fontSize:17, fontWeight:700 }}>{g.label}</div>
                          <div style={{ fontSize:12, opacity:0.8, marginTop:2 }}>
                            {esCapPrincipal
                              ? `Informe completo · ${g.aprobados.length} productos aprobados`
                              : `${g.listos.length} listos · ${g.aprobados.length} ya aprobados`}
                          </div>
                        </div>
                        <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'flex-end' }}>
                          {g.aprobados.length > 0 && (
                            <button className={`btn ${esCapPrincipal ? 'btn-gh' : 'btn-p'}`}
                              onClick={() => exportarCIARP(g.aprobados, [], g.label)}>
                              📥 Exportar Informe CAP
                            </button>
                          )}
                          {g.aprobados.length > 0 && (
                            <button className="btn btn-blue" onClick={() => prepararNotificaciones(g.aprobados)}>
                              📧 Notificar Docentes
                            </button>
                          )}
                        </div>
                      </div>

                      {g.aprobados.length > 0 && (
                        <div>
                          <div style={{ padding:'10px 20px', background:'#e8f5e9', fontSize:11, fontWeight:700, color:'var(--g)', textTransform:'uppercase', letterSpacing:.5 }}>
                            ✅ Productos Aprobados ({g.aprobados.length})
                          </div>
                          {g.aprobados.map(s => <CapRow key={s.id} s={s} onSelect={onSelect} />)}
                        </div>
                      )}
                      {g.listos.length > 0 && (
                        <div>
                          <div style={{ padding:'10px 20px', background:'#fff3e0', fontSize:11, fontWeight:700, color:'#b36200', textTransform:'uppercase', letterSpacing:.5 }}>
                            📊 Listos para presentar ({g.listos.length})
                          </div>
                          {g.listos.map(s => <CapRow key={s.id} s={s} onSelect={onSelect} />)}
                        </div>
                      )}
                      {(g.aprobados.length + g.listos.length) === 0 && (
                        <div style={{ padding:32, textAlign:'center', color:'var(--muted)', fontSize:13 }}>Sin productos en este CAP.</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* MODAL NOTIFICACIÓN MASIVA */}
      {showMailModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:2000,
                      display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}
             onClick={() => setShowMailModal(false)}>
          <div style={{ background:'#fff', borderRadius:16, padding:'28px 32px', maxWidth:520, width:'100%',
                        boxShadow:'0 8px 40px rgba(0,0,0,0.25)' }}
               onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div style={{ fontWeight:800, fontSize:16 }}>📧 Notificación CIARP Masiva</div>
              <button onClick={() => setShowMailModal(false)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'var(--muted)' }}>✕</button>
            </div>
            <p style={{ fontSize:13, marginBottom:16 }}>
              Se enviarán notificaciones agrupadas a <strong>{docentesAEnviar.length} docentes</strong> con los productos aprobados.
            </p>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:14, color:'#c62828', fontWeight:700,
                cursor:'pointer', background:'#ffebee', padding:'10px 14px', borderRadius:8, border:'1px solid #ffcdd2' }}>
                <input type="checkbox" checked={true} readOnly style={{ width:16, height:16 }} />
                ☑ MODO PRUEBA ACTIVADO
              </label>
            </div>
            <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:4 }}>¿A qué correo enviamos la prueba?</label>
            <input className="input" type="email" placeholder="Tu correo..."
              value={mailPrueba} onChange={e => setMailPrueba(e.target.value)} style={{ marginBottom:16 }} />
            {mailEstado && (
              <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:14, fontSize:13,
                background: mailEstado.ok ? '#e8f5e9' : '#ffebee',
                color: mailEstado.ok ? '#1b5e20' : '#c62828',
                border: `1px solid ${mailEstado.ok ? '#b7dfb9' : '#ffcdd2'}` }}>
                {mailEstado.ok ? '✅ ' : '❌ '}{mailEstado.msg}
              </div>
            )}
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-p" style={{ flex:1 }} disabled={!mailPrueba || notifLoading} onClick={ejecutarEnvio}>
                {notifLoading ? '⏳ Enviando...' : '📤 Enviar correos de prueba'}
              </button>
            </div>
            <p style={{ fontSize:11, color:'var(--muted)', marginTop:14 }}>
              Para envío real masivo, configura EmailJS en <code>src/utils/emailNotificacion.js</code>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
