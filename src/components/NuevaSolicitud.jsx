import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TIPOS, PROGRAMAS, FACULTADES } from '../data.js';
import { rutaLabel, buildTimeline, formatName, matchDropdownOption } from '../helpers.js';
import { useDocentesIndex, fetchDocenteDetalle } from '../hooks/useDocentesData.js';
import { Search, CheckCircle, MapPin, Landmark, CircleDollarSign, User, AlertTriangle, Route, Mail, Save, Check } from 'lucide-react';

// ── Docente autocomplete suggestion ─────────────────────────────────────────
function DocenteSuggestion({ docente, onPick }) {
  return (
    <div
      onClick={() => onPick(docente)}
      style={{
        padding: '8px 12px', cursor: 'pointer', fontSize: 13,
        borderBottom: '1px solid var(--border)', background: '#fff',
        transition: 'background .1s',
      }}
      onMouseOver={e => e.currentTarget.style.background = 'var(--gp)'}
      onMouseOut={e  => e.currentTarget.style.background = '#fff'}
    >
      <div style={{ fontWeight: 700 }}>{formatName(docente.nombre)}</div>
      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
        C.C. {docente.cedula} · {docente.programa} · {docente.facultad}
        {docente.correo ? ` · ${docente.correo}` : ''}
      </div>
    </div>
  );
}

export default function NuevaSolicitud({ onSave, onCancel, solicitudesExistentes = [] }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    docente: '', cedula: '', programa: '', facultad: '', correo: '',
    tipo: '', titulo: '', revista: '', notas: '',
    fecha: new Date().toISOString().split('T')[0],
    metadatos: {}
  });
  const [query,       setQuery]       = useState('');
  const [showSuggest, setShowSuggest] = useState(false);
  const [docenteCargado, setDocenteCargado] = useState(false);
  const [docenteLimite, setDocenteLimite] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const tipo = TIPOS[form.tipo];

  const { data: docentesDB } = useDocentesIndex();

  // Cálculo de consumos anuales para validar reglas
  const limitStatus = useMemo(() => {
    if (!form.cedula) return null;
    const year = new Date().getFullYear().toString();
    const reqs = solicitudesExistentes.filter(s => s.cedula === form.cedula && (s.fecha || s.created_at || '').startsWith(year) && s.estado !== 'rechazado');
    
    let librosPts = 0, softwarePts = 0, videoCount = 0, ponenciasCount = 0, artNICount = 0;
    reqs.forEach(s => {
      const t = TIPOS[s.tipo];
      if (!t) return;
      const pts = Number(s.pts_asig || s.pts_sug) || 0;
      if (t.grupoLimite === 'libros') librosPts += pts;
      if (s.tipo === 'software') softwarePts += pts;
      if (s.tipo === 'video') videoCount++;
      if (s.tipo === 'ponencia') ponenciasCount++;
      if (s.tipo === 'articulo_no_indexado') artNICount++;
    });

    let limitWarning = null;
    if (tipo) {
      if (tipo.grupoLimite === 'libros' && librosPts >= tipo.limitePtsAnual) {
        limitWarning = `El docente ha alcanzado el límite anual de ${tipo.limitePtsAnual} pts para Libros (actual: ${librosPts} pts).`;
      } else if (form.tipo === 'software' && softwarePts >= tipo.limitePtsAnual) {
        limitWarning = `El docente ha alcanzado el límite anual de ${tipo.limitePtsAnual} pts para Software (actual: ${softwarePts} pts).`;
      } else if (form.tipo === 'video' && videoCount >= tipo.limiteAnualCount) {
        limitWarning = `El docente ha alcanzado el límite anual de ${tipo.limiteAnualCount} videos (actual: ${videoCount}).`;
      } else if (form.tipo === 'ponencia' && ponenciasCount >= tipo.limiteAnualCount) {
        limitWarning = `El docente ha alcanzado el límite anual de ${tipo.limiteAnualCount} ponencias (actual: ${ponenciasCount}).`;
      } else if (form.tipo === 'articulo_no_indexado' && artNICount >= tipo.limiteAnualCount) {
        limitWarning = `El docente ha alcanzado el límite anual de ${tipo.limiteAnualCount} artículos no indexados (actual: ${artNICount}).`;
      }
    }

    let isTopeWarning = false;
    if (tipo && docenteLimite && docenteLimite.diferencia <= 0 && !tipo.esBonificacion && !tipo.esExcepcion && form.tipo !== 'ascenso') {
      isTopeWarning = true;
    }

    return { limitWarning, isTopeWarning };
  }, [form.cedula, form.tipo, tipo, solicitudesExistentes, docenteLimite]);

  // Ref para cerrar el dropdown al hacer clic fuera
  const suggestRef = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (suggestRef.current && !suggestRef.current.contains(e.target)) {
        setShowSuggest(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Filter suggestions
  const suggestions = query.length >= 2
    ? docentesDB.filter(d =>
        d.nombre.toLowerCase().includes(query.toLowerCase()) ||
        d.cedula.includes(query)
      ).slice(0, 8)
    : [];

  async function pickDocente(d) {
    setForm(f => ({
      ...f,
      docente:  formatName(d.nombre),
      cedula:   d.cedula,
      programa: matchDropdownOption(d.programa, PROGRAMAS),
      facultad: matchDropdownOption(d.facultad, FACULTADES),
      correo:   d.correo || '',
    }));
    setQuery(formatName(d.nombre));
    setShowSuggest(false);
    setDocenteCargado(true);
    setDocenteLimite(null);
    try {
      const deta = await fetchDocenteDetalle(d.cedula);
      setDocenteLimite(deta);
    } catch (e) {
      console.error('Error fetching docente detalle:', e);
    }
  }

  function clearDocente() {
    setForm(f => ({ ...f, docente: '', cedula: '', programa: '', facultad: '', correo: '' }));
    setQuery('');
    setDocenteCargado(false);
    setDocenteLimite(null);
  }

  function handleGuardar() {
    const uid  = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)).replace(/-/g,'').slice(0, 8).toUpperCase();
    const id   = `SOL-TEMP-${uid}`;
    const sol = {
      ...form, id,
      etapa:   'clasificada',
      pts_sug: tipo?.pts || 0,
      pts_asig: null,
      estado:  'en_proceso',
      timeline: buildTimeline(form, tipo),
    };
    if (tipo?.ruta === 'internos') sol.pares_int = { estado: 'pendiente', consejo: tipo.consejo, vence: '30 días' };
    if (tipo?.ruta === 'externos' || tipo?.ruta === 'cei') sol.pares_ext = [];
    onSave(sol);
  }

  const STEPS = ['Datos del Docente', 'Tipo de Producto', 'Revisión'];

  return (
    <div style={{ padding: '24px 28px', maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Nueva Solicitud</h2>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>Registrar producto de productividad docente</p>
        </div>
        <button className="btn btn-gh" onClick={onCancel}>← Cancelar</button>
      </div>

      {/* STEP INDICATOR */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
              background: step > i + 1 ? 'var(--g)' : step === i + 1 ? 'var(--g)' : 'var(--border)',
              color: step >= i + 1 ? '#fff' : 'var(--muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
            }}>
              {step > i + 1 ? '✓' : i + 1}
            </div>
            <span style={{ fontSize: 12, fontWeight: step === i + 1 ? 700 : 400, color: step === i + 1 ? 'var(--g)' : 'var(--muted)' }}>{s}</span>
            {i < 2 && <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />}
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 24 }}>

        {/* ── STEP 1: Datos del Docente ── */}
        {step === 1 && (
          <div>
            {/* Autocomplete search box */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)' }}>
                <Search size={16} /> Buscar docente en la base de datos
              </label>
              <div style={{ position: 'relative' }} ref={suggestRef}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={query}
                    onChange={e => { setQuery(e.target.value); setShowSuggest(true); setDocenteCargado(false); }}
                    onFocus={() => setShowSuggest(true)}
                    placeholder="Escriba el nombre o cédula del docente..."
                    style={{ flex: 1 }}
                  />
                  {docenteCargado && (
                    <button className="btn btn-gh btn-sm" onClick={clearDocente}>✕ Limpiar</button>
                  )}
                </div>

                {showSuggest && suggestions.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                    border: '1px solid var(--border)', borderRadius: 8, background: '#fff',
                    boxShadow: '0 4px 20px rgba(0,0,0,.12)', maxHeight: 280, overflowY: 'auto',
                  }}>
                    {suggestions.map((d, i) => (
                      <DocenteSuggestion key={i} docente={d} onPick={pickDocente} />
                    ))}
                  </div>
                )}
              </div>

              {docenteCargado && (
                <div style={{ marginTop: 8, padding: '10px 14px', background: 'var(--gp)', border: '1px solid var(--g)', borderRadius: 10, fontSize: 13, color: 'var(--g)', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
                  <CheckCircle size={16} /> Datos del docente cargados automáticamente desde la base de datos
                </div>
              )}
              {docenteLimite && docenteLimite.diferencia <= 0 && (
                <div style={{ marginTop: 8, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, fontSize: 13, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
                  <AlertTriangle size={16} /> ⚠️ Advertencia: El docente ha alcanzado su tope máximo de productividad académica ({docenteLimite.tope} pts). Puede continuar con la radicación, pero este producto no sumará puntos adicionales en el CIARP.
                </div>
              )}
              {query.length >= 2 && suggestions.length === 0 && !docenteCargado && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
                  No encontrado en la base de datos. Complete los datos manualmente abajo.
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5 }}>
                Datos del Docente {docenteCargado ? '(cargados automáticamente — puede editar)' : '(ingrese manualmente si no está en la base de datos)'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label>Nombre completo *</label>
                  <input value={form.docente} onChange={e => set('docente', e.target.value)} placeholder="Ej: Juan Carlos Pérez Mora" />
                </div>
                <div>
                  <label>Cédula de ciudadanía</label>
                  <input value={form.cedula} onChange={e => set('cedula', e.target.value)} placeholder="Número de identificación" />
                </div>
                <div>
                  <label>Programa académico *</label>
                  <select value={form.programa} onChange={e => set('programa', e.target.value)}>
                    <option value="">Seleccionar programa...</option>
                    {PROGRAMAS.map(p => <option key={p}>{p}</option>)}
                  </select>
                  {/* Allow manual input if not in list */}
                  {form.programa && !PROGRAMAS.includes(form.programa) && (
                    <input value={form.programa} onChange={e => set('programa', e.target.value)} style={{ marginTop: 6 }} placeholder="Programa (texto libre)" />
                  )}
                </div>
                <div>
                  <label>Facultad *</label>
                  <select value={form.facultad} onChange={e => set('facultad', e.target.value)}>
                    <option value="">Seleccionar facultad...</option>
                    {FACULTADES.map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label>Correo electrónico</label>
                  <input type="email" value={form.correo} onChange={e => set('correo', e.target.value)} placeholder="docente@uniquindio.edu.co" />
                </div>
                <div>
                  <label>Fecha de radicación</label>
                  <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
                </div>
              </div>
            </div>

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-p" onClick={() => setStep(2)} disabled={!form.docente || !form.programa}>
                Siguiente →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Tipo de Producto ── */}
        {step === 2 && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <label>Tipo de producto *</label>
              <select value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                <option value="">Seleccionar tipo de producto...</option>
                <optgroup label="Artículos Científicos">
                  {['articulo_indexado','articulo_no_indexado'].map(k => <option key={k} value={k}>{TIPOS[k]?.label || k} — {TIPOS[k]?.pts || 0} pts</option>)}
                </optgroup>
                <optgroup label="Libros con evaluación interna">
                  {['libro_texto','libro_ensayo','software'].map(k => <option key={k} value={k}>{TIPOS[k].label} — {TIPOS[k].pts} pts</option>)}
                </optgroup>
                <optgroup label="Productos con pares externos">
                  {['libro_investigacion','produccion_tecnica','obra_artistica','video','traduccion'].map(k => <option key={k} value={k}>{TIPOS[k].label} — {TIPOS[k].pts} pts</option>)}
                </optgroup>
                <optgroup label="Otros Productos y Trámites">
                  {['patente','premio','ponencia','direccion_tesis','ascenso'].map(k => <option key={k} value={k}>{TIPOS[k].label} — {TIPOS[k].pts} pts</option>)}
                </optgroup>
                <optgroup label="Reconocimientos Decreto 1279">
                  {['daa','ddd','exp_calificada'].map(k => <option key={k} value={k}>{TIPOS[k].label} — {TIPOS[k].pts} pts</option>)}
                </optgroup>
              </select>
            </div>

            {tipo && (
              <div style={{ background: 'var(--gp)', border: '1px solid var(--g)', borderRadius: 12, padding: '16px 20px', marginBottom: 20, boxShadow: 'var(--shadow-xs)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--g)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Ruta automática determinada:</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>{tipo.icon && <span style={{fontSize: 18}}>{tipo.icon}</span>} {tipo.label}</div>
                <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={14} color="var(--g)"/> {rutaLabel(tipo.ruta)}</div>
                {tipo.consejo && <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}><Landmark size={14} color="var(--g)"/> Memorando para: <strong>{tipo.consejo}</strong></div>}
                <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CircleDollarSign size={14} color="var(--g)"/> 
                  Puntos Decreto 1279: <strong>{tipo.pts} puntos</strong> 
                  {tipo.esBonificacion && <span style={{ fontSize: 11, background: '#e0e7ff', color: '#3730a3', padding: '2px 6px', borderRadius: 4, marginLeft: 4 }}>Pago único (Bonificación)</span>}
                  {tipo.esExcepcion && <span style={{ fontSize: 11, background: '#fce7f3', color: '#9d174d', padding: '2px 6px', borderRadius: 4, marginLeft: 4 }}>Excepción al tope</span>}
                </div>
              </div>
            )}

            {limitStatus?.limitWarning && (
              <div style={{ marginBottom: 20, padding: '14px 18px', background: '#fef2f2', border: '1px solid #ef4444', borderRadius: 12, color: '#991b1b', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <AlertTriangle size={20} color="#dc2626" style={{ marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Límite anual alcanzado</div>
                  <div style={{ fontSize: 13 }}>{limitStatus.limitWarning} <br/><strong>Advertencia:</strong> El sistema permite continuar el trámite, pero es probable que el CIARP no otorgue los puntos.</div>
                </div>
              </div>
            )}

            {limitStatus?.isTopeWarning && (
              <div style={{ marginBottom: 20, padding: '14px 18px', background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: 12, color: '#92400e', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <AlertTriangle size={20} color="#d97706" style={{ marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Docente en tope salarial</div>
                  <div style={{ fontSize: 13 }}>Este docente ya alcanzó su tope máximo ({docenteLimite.tope} pts). <strong>Los puntos de esta solicitud se perderán</strong>. Si aplica, el docente debería solicitar un ascenso en el escalafón primero.</div>
                </div>
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label>Título del producto *</label>
              <input value={form.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Título completo del producto académico" />
            </div>
            {['articulo_indexado'].includes(form.tipo) && (
              <div style={{ marginBottom: 14 }}>
                <label>Nombre de la revista / DOI</label>
                <input value={form.revista} onChange={e => set('revista', e.target.value)} placeholder="Ej: Nature Ecology (Q1) / DOI: 10.xxxx" />
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <label>Observaciones / soportes</label>
              <textarea rows={3} value={form.notas} onChange={e => set('notas', e.target.value)} placeholder="Describir soportes entregados y observaciones relevantes..." />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-gh" onClick={() => setStep(1)}>← Anterior</button>
              <button className="btn btn-p" onClick={() => setStep(3)} disabled={!form.tipo || !form.titulo}>Siguiente →</button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Revisión ── */}
        {step === 3 && (
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: 'var(--g)', display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle size={20}/> Resumen de la solicitud</h3>

            {/* Teacher data summary */}
            <div style={{ background: 'var(--gp)', border: '1px solid var(--g)', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--g)', fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', letterSpacing: .5, display: 'flex', alignItems: 'center', gap: 6 }}><User size={14}/> Datos del Docente</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  ['Nombre',   form.docente],
                  ['Cédula',   form.cedula   || '—'],
                  ['Programa', form.programa],
                  ['Facultad', form.facultad  || '—'],
                  ['Correo',   form.correo    || '—'],
                  ['Fecha',    form.fecha],
                ].map(([l, v]) => (
                  <div key={l} style={{ background: '#fff', borderRadius: 6, padding: '6px 10px' }}>
                    <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase' }}>{l}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 1, wordBreak: 'break-all' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Product summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              {[
                ['Tipo de producto', tipo?.label || '—'],
                ['Puntos sugeridos', `${tipo?.pts || 0} puntos`],
              ].map(([l, v]) => (
                <div key={l} style={{ background: 'var(--gp)', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .4 }}>{l}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ background: 'var(--gp)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .4 }}>Título</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{form.titulo}</div>
            </div>

            {/* Advertencia de posible duplicado */}
            {(() => {
              const dupes = solicitudesExistentes.filter(
                s => s.cedula && s.cedula === form.cedula && s.tipo === form.tipo && s.estado !== 'rechazado'
              );
              return dupes.length > 0 ? (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#b45309', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}><AlertTriangle size={18}/> Posible duplicado detectado</div>
                  <div style={{ fontSize: 13, color: '#92400e', marginBottom: 8 }}>
                    Este docente ya tiene {dupes.length} solicitud(es) activa(s) del mismo tipo:
                  </div>
                  {dupes.slice(0, 3).map(d => (
                    <div key={d.id} style={{ fontSize: 12, color: '#78350f', marginTop: 4, fontFamily: 'monospace' }}>
                      {d.id} — {d.titulo?.slice(0, 50)}{d.titulo?.length > 50 ? '…' : ''}
                    </div>
                  ))}
                </div>
              ) : null;
            })()}

            <div style={{ background: 'var(--uq-blue-lt)', border: '1px solid var(--uq-blue)', borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--uq-blue)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}><Route size={18}/> Ruta asignada automáticamente:</div>
              <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{rutaLabel(tipo?.ruta || '')}</div>
              {tipo?.consejo && <div style={{ fontSize: 13, marginTop: 6, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={14}/> Memorando automático para: <strong>{tipo.consejo}</strong></div>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-gh" onClick={() => setStep(2)}>← Anterior</button>
              <button className="btn btn-p" onClick={handleGuardar} style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Save size={16}/> Guardar Solicitud</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
