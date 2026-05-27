/**
 * ModuloReconocimientos.jsx
 * Módulo de Reconocimientos Anuales — DAA, DDD, Experiencia Calificada
 *
 * Flujo interno (los docentes NO presentan solicitud):
 * 1. La técnica recibe el informe de evaluación docente de otra dependencia
 * 2. Con base en ese informe, selecciona los docentes mejor evaluados
 * 3. Los agrega a la lista de reconocimiento (DAA, DDD o Exp. Calificada)
 * 4. Al finalizar, los envía al CIARP para aprobación como solicitudes individuales
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Award, Star, Briefcase, PlusCircle, Search, CheckCircle,
  Trash2, Send, ChevronDown, ChevronRight, AlertCircle,
  Users, Calendar, X, CheckSquare, Square, RotateCcw,
  ClipboardList, Info
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { useDocentesIndex } from '../hooks/useDocentesData';
import { buscarSolicitudes, updateSolicitud, getSiguienteNumeroCiarp, fetchSesionesCiarp } from '../utils/api';

// ── Configuración de tipos de reconocimiento ────────────────────
const RECONOCIMIENTOS = {
  ddd: {
    label: 'Desempeño Destacado Docente (DDD)',
    short: 'DDD',
    icon: <Star size={20} />,
    color: '#7c3aed',
    colorLight: '#f5f3ff',
    colorBorder: '#c4b5fd',
    desc: 'Art. 10 D.1279 — Se otorga a docentes con evaluación de desempeño sobresaliente. 1 vez al año.',
    pts: 0,
    criterio: 'Evaluación docente con calificación sobresaliente en el período académico',
  },
  daa: {
    label: 'Desempeño Académico Administrativo (DAA)',
    short: 'DAA',
    icon: <Award size={20} />,
    color: '#0369a1',
    colorLight: '#f0f9ff',
    colorBorder: '#7dd3fc',
    desc: 'Art. 10 D.1279 — Se otorga a docentes que ejercieron cargo académico-administrativo. 1 vez al año.',
    pts: 0,
    criterio: 'Ejercicio de cargo académico-administrativo durante el año académico (Decano, Director, Coordinador, etc.)',
  },
  exp_calificada: {
    label: 'Experiencia Calificada',
    short: 'Exp. Cal.',
    icon: <Briefcase size={20} />,
    color: '#0f766e',
    colorLight: '#f0fdfa',
    colorBorder: '#5eead4',
    desc: 'Art. 12 D.1279 — Experiencia profesional externa antes de la vinculación. 1 vez al año.',
    pts: 0,
    criterio: 'Experiencia profesional calificada previa a la vinculación universitaria',
  },
};

// ── Sub-componente: Tarjeta de tipo ────────────────────────────
function TipoCard({ tipo, count, active, onClick }) {
  const cfg = RECONOCIMIENTOS[tipo];
  return (
    <div
      onClick={onClick}
      style={{
        cursor: 'pointer',
        border: `2px solid ${active ? cfg.color : 'var(--border)'}`,
        borderRadius: 14,
        padding: '18px 20px',
        background: active ? cfg.colorLight : '#fff',
        transition: 'all .18s',
        boxShadow: active ? `0 0 0 3px ${cfg.colorBorder}55` : 'var(--shadow-xs)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ color: cfg.color }}>{cfg.icon}</span>
        <span style={{ fontWeight: 700, fontSize: 14, color: cfg.color }}>{cfg.short}</span>
        {count > 0 && (
          <span style={{
            marginLeft: 'auto', background: cfg.color, color: '#fff',
            borderRadius: 20, padding: '1px 10px', fontSize: 12, fontWeight: 700,
          }}>{count}</span>
        )}
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{cfg.criterio}</div>
    </div>
  );
}

// ── Sub-componente: Chip de docente seleccionado ───────────────
function DocenteChip({ docente, año, observacion, onRemove, onObservacion }) {
  const [editing, setEditing] = useState(false);
  const [obs, setObs] = useState(observacion || '');
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '10px 14px', background: '#f8fafc',
      border: '1px solid var(--border)', borderRadius: 10, marginBottom: 8,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{docente.nombre}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
          C.C. {docente.cedula} · {docente.programa} · {docente.facultad}
        </div>
        {editing ? (
          <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
            <input
              value={obs}
              onChange={e => setObs(e.target.value)}
              placeholder="Observación / justificación..."
              style={{ flex: 1, fontSize: 12, padding: '4px 8px', borderRadius: 6 }}
              autoFocus
            />
            <button
              className="btn btn-p btn-sm"
              style={{ fontSize: 11 }}
              onClick={() => { onObservacion(docente.cedula, obs); setEditing(false); }}
            >✓</button>
            <button className="btn btn-gh btn-sm" style={{ fontSize: 11 }} onClick={() => setEditing(false)}>✕</button>
          </div>
        ) : (
          obs
            ? <div style={{ fontSize: 11, color: 'var(--g)', marginTop: 4, fontStyle: 'italic' }}>📝 {obs}</div>
            : <button
                onClick={() => setEditing(true)}
                style={{ fontSize: 11, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 4 }}
              >+ Agregar observación</button>
        )}
      </div>
      <button
        onClick={() => onRemove(docente.cedula)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4, marginTop: -2 }}
        title="Quitar docente"
      ><Trash2 size={15} /></button>
    </div>
  );
}

// ── Componente principal ────────────────────────────────────────
export default function ModuloReconocimientos({ user }) {
  const { success, error: showError } = useNotification();

  // Carga de docentes de base de datos
  const { data: docentesDB, loading: loadingDocentes } = useDocentesIndex();

  // Estado principal
  const [tipoActivo, setTipoActivo]   = useState('ddd');
  const [año, setAño]                 = useState(new Date().getFullYear());
  const [seleccionados, setSeleccionados] = useState({ ddd: [], daa: [], exp_calificada: [] });
  const [observaciones, setObservaciones] = useState({}); // cedula → texto

  // Búsqueda de docentes
  const [query, setQuery]             = useState('');
  const suggestRef                    = useRef(null);

  // Solicitudes ya generadas para este año
  const [solicitudesGeneradas, setSolicitudesGeneradas] = useState([]);
  const [cargandoSols, setCargandoSols]                 = useState(false);

  // Siguiente sesión CIARP
  const [sigCiarpNum, setSigCiarpNum] = useState(null);

  // Control de envío
  const [enviando, setEnviando]       = useState(false);
  const [confirmandoEnvio, setConfirmandoEnvio] = useState(false);

  // Sesiones de CIARP
  const [sesiones, setSesiones] = useState([]);
  const [sesionSeleccionada, setSesionSeleccionada] = useState('cola');

  const cfg = RECONOCIMIENTOS[tipoActivo];
  const listActual = seleccionados[tipoActivo];

  // Cargar lista de sesiones
  useEffect(() => {
    fetchSesionesCiarp()
      .then(data => {
        setSesiones(data || []);
        const abierta = data?.find(s => s.estado === 'abierta');
        if (abierta) {
          setSesionSeleccionada(abierta.id);
        }
      })
      .catch(e => console.error("Error cargando sesiones CIARP:", e));
  }, []);

  // ── Cargar solicitudes ya generadas para el año ──────────────
  const cargarSolicitudesGeneradas = useCallback(async () => {
    setCargandoSols(true);
    try {
      const res = await buscarSolicitudes({
        tipo: tipoActivo,
        fechaDesde: `${año}-01-01`,
        fechaHasta: `${año}-12-31`,
        limit: 200,
      });
      setSolicitudesGeneradas(res.data || []);
    } catch (e) {
      setSolicitudesGeneradas([]);
    } finally {
      setCargandoSols(false);
    }
  }, [tipoActivo, año]);

  // Cargar número de siguiente CIARP
  const cargarSiguienteCiarp = useCallback(async () => {
    try {
      const data = await getSiguienteNumeroCiarp(año);
      setSigCiarpNum(data?.numero || 1);
    } catch (e) {
      setSigCiarpNum(1);
    }
  }, [año]);

  useEffect(() => {
    cargarSolicitudesGeneradas();
  }, [cargarSolicitudesGeneradas]);

  useEffect(() => {
    cargarSiguienteCiarp();
  }, [cargarSiguienteCiarp]);

  // Filtrar sugerencias localmente a partir de docentesDB
  const sugerencias = useMemo(() => {
    if (query.trim().length < 2) return [];
    return docentesDB.filter(d =>
      d.nombre?.toLowerCase().includes(query.toLowerCase()) ||
      d.cedula?.includes(query)
    ).slice(0, 8);
  }, [query, docentesDB]);

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    const fn = e => { if (suggestRef.current && !suggestRef.current.contains(e.target)) setQuery(''); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // ── Agregar docente ──────────────────────────────────────────
  function agregarDocente(d) {
    if (listActual.some(x => x.cedula === d.cedula)) {
      showError(`${d.nombre} ya está en la lista de ${cfg.short}`);
      return;
    }
    setSeleccionados(prev => ({
      ...prev,
      [tipoActivo]: [...prev[tipoActivo], d],
    }));
    setQuery('');
    success(`${d.nombre} agregado a ${cfg.short}`);
  }

  // ── Guardar observación ─────────────────────────────────────
  function guardarObservacion(cedula, texto) {
    setObservaciones(prev => ({
      ...prev,
      [tipoActivo + '_' + cedula]: texto,
    }));
  }

    // ── Quitar docente ──────────────────────────────────────────
  function quitarDocente(cedula) {
    setSeleccionados(prev => ({
      ...prev,
      [tipoActivo]: prev[tipoActivo].filter(x => x.cedula !== cedula),
    }));
  }

  // ── Enviar al CIARP ──────────────────────────────────────────
  async function enviarAlCiarp() {
    setEnviando(true);
    setConfirmandoEnvio(false);
    const lista = seleccionados[tipoActivo];
    let ok = 0, fail = 0;
    const sSel = sesionSeleccionada === 'cola' ? null : sesiones.find(s => s.id === sesionSeleccionada);
    for (const doc of lista) {
      try {
        const obs = observaciones[tipoActivo + '_' + doc.cedula] || '';
        const sol = {
          cedula:  doc.cedula,
          docente: doc.nombre,
          programa: doc.programa,
          facultad: doc.facultad,
          correo:  doc.correo || '',
          tipo:    tipoActivo,
          titulo:  cfg.short + ' ' + año + ' — ' + doc.nombre,
          notas:   obs || ('Reconocimiento ' + cfg.short + ' período ' + año + '. ' + cfg.criterio + '.'),
          fecha:   año + '-01-01',
          etapa:   'ciarp',
          estado:  sSel ? 'aprobado' : 'en_proceso',
          acta_ciarp: sSel ? sSel.acta_label : null,
          sesion_ciarp_id: sSel ? sSel.id : null,
          pts_sug: 0,
          pts_asig: null,
          timeline: [
            { f: '' + año, a: 'Seleccionado para ' + cfg.short + ' ' + año, p: user?.nombre || 'Técnico' },
            { f: '' + año, a: sSel ? ('Enviado a sesión ' + sSel.acta_label) : 'Enviado a cola de Próximo CIARP', p: user?.nombre || 'Técnico' },
          ],
        };
        const res = await updateSolicitud(sol);
        if (!res.success) throw new Error('No se pudo guardar la solicitud');
        ok++;
      } catch (e) {
        fail++;
        console.error('Error al enviar docente:', doc.nombre, e);
      }
    }
    setEnviando(false);
    if (ok > 0) {
      success('✅ ' + ok + ' reconocimientos enviados al CIARP');
      setSeleccionados(prev => {
        const copy = { ...prev };
        copy[tipoActivo] = [];
        return copy;
      });
      cargarSolicitudesGeneradas();
    }
    if (fail > 0) showError('⚠️ ' + fail + ' no pudieron enviarse. Revisa la consola.');
  }

  const totalSeleccionados = Object.values(seleccionados).reduce((s, a) => s + a.length, 0);

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100 }}>

      {/* ── ENCABEZADO ────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: 'linear-gradient(135deg,#7c3aed,#0369a1)',
          }}>
            <Award size={22} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Reconocimientos Anuales</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
              DAA · DDD · Experiencia Calificada — Decreto 1279 Arts. 10 y 12
            </p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Año:</label>
            <select
              value={año}
              onChange={e => setAño(Number(e.target.value))}
              style={{ fontWeight: 700, fontSize: 14, padding: '6px 12px', borderRadius: 8 }}
            >
              {[2024, 2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Banner informativo */}
        <div style={{
          background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10,
          padding: '12px 16px', fontSize: 13, color: '#92400e',
          display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 12,
        }}>
          <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>Proceso interno — los docentes NO radican solicitud.</strong>{' '}
            La técnica recibe el informe de evaluación docente de otra dependencia y, con base en los mejores puntajes,
            selecciona los docentes para <strong>DDD</strong>, <strong>DAA</strong> o <strong>Experiencia Calificada</strong> del año <strong>{año}</strong>.
            Al finalizar la selección, haz clic en <em>"Enviar al CIARP"</em> para que sean aprobados en el próximo comité.
            {sigCiarpNum && (
              <div style={{ marginTop: 6, fontWeight: 600, color: '#1a5fa8' }}>
                ℹ️ Los docentes ingresarán en la cola para el próximo comité del año {año} (Sesión sugerida: CIARP {sigCiarpNum} — {año}).
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── SELECTOR DE TIPO (3 tarjetas) ────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {Object.keys(RECONOCIMIENTOS).map(tipo => (
          <TipoCard
            key={tipo}
            tipo={tipo}
            count={seleccionados[tipo].length}
            active={tipoActivo === tipo}
            onClick={() => setTipoActivo(tipo)}
          />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>

        {/* ── PANEL IZQUIERDO: Lista de seleccionados + buscador ── */}
        <div>
          {/* Encabezado del panel */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
            padding: '14px 18px',
            background: cfg.colorLight,
            border: `1px solid ${cfg.colorBorder}`,
            borderRadius: 12,
          }}>
            <span style={{ color: cfg.color }}>{cfg.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: cfg.color, fontSize: 14 }}>{cfg.label}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{cfg.desc}</div>
            </div>
            <div style={{
              background: cfg.color, color: '#fff', borderRadius: 20,
              padding: '3px 14px', fontSize: 13, fontWeight: 700,
            }}>
              {listActual.length} seleccionados
            </div>
          </div>

          {/* Buscador de docentes */}
          <div style={{ position: 'relative', marginBottom: 16 }} ref={suggestRef}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Buscar docente por nombre o cédula..."
                  style={{ paddingLeft: 34, width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              {query && (
                <button className="btn btn-gh btn-sm" onClick={() => setQuery('')}>✕</button>
              )}
            </div>

            {sugerencias.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
                background: '#fff', border: '1px solid var(--border)', borderRadius: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,.12)', maxHeight: 320, overflowY: 'auto',
                marginTop: 4,
              }}>
                {sugerencias.map((d, i) => {
                  const yaAgregado = listActual.some(x => x.cedula === d.cedula);
                  return (
                    <div
                      key={i}
                      onClick={() => !yaAgregado && agregarDocente(d)}
                      style={{
                        padding: '10px 14px',
                        cursor: yaAgregado ? 'not-allowed' : 'pointer',
                        opacity: yaAgregado ? 0.5 : 1,
                        borderBottom: '1px solid var(--border)',
                        transition: 'background .1s',
                        background: yaAgregado ? '#f8fafc' : '#fff',
                      }}
                      onMouseOver={e => { if (!yaAgregado) e.currentTarget.style.background = cfg.colorLight; }}
                      onMouseOut={e => { e.currentTarget.style.background = yaAgregado ? '#f8fafc' : '#fff'; }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {yaAgregado ? <CheckCircle size={14} color={cfg.color} /> : <PlusCircle size={14} color={cfg.color} />}
                        {d.nombre}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                        C.C. {d.cedula} · {d.programa}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {loadingDocentes && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>Cargando índice de docentes...</div>
            )}
          </div>

          {/* Lista de docentes seleccionados */}
          {listActual.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '40px 20px',
              background: '#f8fafc', borderRadius: 12,
              border: '2px dashed var(--border)', color: 'var(--muted)',
            }}>
              <Users size={36} style={{ marginBottom: 10, opacity: .4 }} />
              <div style={{ fontWeight: 600 }}>Ningún docente seleccionado</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                Usa el buscador de arriba para agregar docentes a esta lista
              </div>
            </div>
          ) : (
            <div>
              {listActual.map(doc => (
                <DocenteChip
                  key={doc.cedula}
                  docente={doc}
                  año={año}
                  observacion={observaciones[`${tipoActivo}_${doc.cedula}`]}
                  onRemove={quitarDocente}
                  onObservacion={guardarObservacion}
                />
              ))}

              {/* Selector de Sesión CIARP de Destino */}
              <div style={{
                marginTop: 16, marginBottom: 12, padding: '12px 14px', background: '#f8fafc',
                border: '1px solid var(--border)', borderRadius: 10
              }}>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6, color: 'var(--text)' }}>
                  🎯 Sesión del CIARP de Destino:
                </label>
                <select
                  value={sesionSeleccionada}
                  onChange={e => setSesionSeleccionada(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 13, border: '1px solid var(--border)', background: '#fff' }}
                >
                  <option value="cola">📥 En cola para el Próximo CIARP (Sin acta aún)</option>
                  {sesiones.map(s => (
                    <option key={s.id} value={s.id}>
                      🏛️ {s.acta_label} ({s.estado === 'abierta' ? 'Abierta' : 'Finalizada'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Botón de enviar */}
              <div style={{ marginTop: 12 }}>
                {!confirmandoEnvio ? (
                  <button
                    className="btn btn-p"
                    style={{
                      width: '100%', justifyContent: 'center', gap: 8,
                      background: cfg.color,
                      fontSize: 14, padding: '12px 0',
                    }}
                    onClick={() => setConfirmandoEnvio(true)}
                    disabled={enviando}
                  >
                    <Send size={16} />
                    Enviar {listActual.length} {cfg.short} al CIARP {año}
                  </button>
                ) : (
                  <div style={{
                    background: '#fff7ed', border: '1px solid #fed7aa',
                    borderRadius: 12, padding: 16,
                  }}>
                    <div style={{ fontWeight: 700, color: '#c2410c', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AlertCircle size={16} /> ¿Confirmar envío?
                    </div>
                    <div style={{ fontSize: 13, color: '#7c2d12', marginBottom: 12 }}>
                      Se crearán <strong>{listActual.length} solicitudes</strong> de tipo <strong>{cfg.short}</strong> para el año <strong>{año}</strong>,
                      todas en etapa <strong>CIARP</strong>. Esta acción no se puede deshacer.
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-p"
                        style={{ flex: 1, justifyContent: 'center', background: cfg.color }}
                        onClick={enviarAlCiarp}
                        disabled={enviando}
                      >
                        {enviando ? '⏳ Enviando...' : '✓ Confirmar y Enviar'}
                      </button>
                      <button
                        className="btn btn-gh"
                        onClick={() => setConfirmandoEnvio(false)}
                        disabled={enviando}
                      >Cancelar</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── PANEL DERECHO: Solicitudes ya generadas ────────── */}
        <div>
          <div style={{
            background: '#fff', border: '1px solid var(--border)',
            borderRadius: 14, overflow: 'hidden',
            boxShadow: 'var(--shadow-xs)',
          }}>
            <div style={{
              padding: '14px 18px', background: 'var(--gp)',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <ClipboardList size={16} color="var(--g)" />
              <span style={{ fontWeight: 700, fontSize: 14 }}>
                {cfg.short} ya generados — {año}
              </span>
              <button
                onClick={cargarSolicitudesGeneradas}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
              >
                <RotateCcw size={13} /> Recargar
              </button>
            </div>

            <div style={{ maxHeight: 520, overflowY: 'auto', padding: 12 }}>
              {cargandoSols ? (
                <div style={{ textAlign: 'center', padding: 30, color: 'var(--muted)', fontSize: 13 }}>
                  Cargando...
                </div>
              ) : solicitudesGeneradas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 30, color: 'var(--muted)', fontSize: 13 }}>
                  <Calendar size={28} style={{ marginBottom: 8, opacity: .4 }} />
                  <div>Sin reconocimientos generados para {año}</div>
                </div>
              ) : (
                solicitudesGeneradas.map(s => {
                  const estadoColor = s.estado === 'aprobado' ? '#16a34a' : s.estado === 'rechazado' ? '#dc2626' : '#0369a1';
                  const estadoBg = s.estado === 'aprobado' ? '#f0fdf4' : s.estado === 'rechazado' ? '#fef2f2' : '#eff6ff';
                  return (
                    <div
                      key={s.id}
                      style={{
                        padding: '10px 12px', borderRadius: 8, marginBottom: 8,
                        border: '1px solid var(--border)', background: '#fafafa',
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>
                        {s.docente}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>
                        {s.cedula} · {s.programa}
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px',
                          borderRadius: 20, background: estadoBg, color: estadoColor,
                        }}>
                          {s.estado === 'aprobado' ? '✓ Aprobado' : s.estado === 'rechazado' ? '✗ Rechazado' : '⏳ En proceso'}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'monospace' }}>
                          {s.id}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {solicitudesGeneradas.length > 0 && (
              <div style={{
                padding: '10px 16px', borderTop: '1px solid var(--border)',
                background: 'var(--gp)', fontSize: 12, color: 'var(--muted)',
                display: 'flex', justifyContent: 'space-between',
              }}>
                <span><strong>{solicitudesGeneradas.length}</strong> registros</span>
                <span style={{ color: '#16a34a', fontWeight: 600 }}>
                  {solicitudesGeneradas.filter(s => s.estado === 'aprobado').length} aprobados
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
