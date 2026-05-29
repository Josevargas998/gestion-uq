import React, { useState, useMemo, useEffect } from 'react';
import { useDocentesConNuevos } from '../hooks/useDocentesData.js';
import { fetchSolicitudes } from '../utils/api.js';
import HojaVidaDocente from './HojaVidaDocente.jsx';
import { getSemaforo, cleanText } from '../helpers.js';

const VALOR_PUNTO_2026 = 23924; // Valor del punto salarial 2026

const TIPO_LABEL = {
  articulo_indexado: 'Artículo Indexado (A1, A2, B, C)',
  articulo_no_indexado: 'Artículo No Indexado',
  libro_texto: 'Libro de Texto', libro_investigacion: 'Libro Investigación',
  libro_ensayo: 'Libro Ensayo', ponencia: 'Ponencia', software: 'Software',
  tesis: 'Tesis Dirigida', obra_artistica: 'Obra Artística', premio: 'Premio',
  produccion_tecnica: 'Producción Técnica', patente: 'Patente',
  daa: 'DAA — Desempeño Acad.-Admvo.', ddd: 'DDD — Desempeño Destacado',
  exp_calificada: 'Experiencia Calificada', titulo: 'Título Académico', ascenso: 'Ascenso de Categoría',
};

const CATS = ['Todas', 'Auxiliar', 'Asistente', 'Asociado', 'Titular'];
const FACS = ['Todas', 'Ciencias Básicas', 'Ciencias Económicas', 'Ciencias Humanas',
              'Ciencias de la Educación', 'Ingeniería', 'Ciencias de la Salud', 'C. Agroindustriales'];

export default function GestorDocentes({ user, setNav }) {
  // Hook enriquecido: ptsAcumulados, ptsTotalSalarial, diferencia ya incluyen
  // las nuevas aprobaciones SOL-* del sistema (no solo datos historicos)
  const { data: docentesConNuevos, loading } = useDocentesConNuevos();
  const [search,   setSearch]   = useState('');
  const [catFil,   setCatFil]   = useState('Todas');
  const [facFil,   setFacFil]   = useState('Todas');
  const [semaFil,  setSemaFil]  = useState('Todas');
  const [selected, setSelected] = useState(null);
  const [sortBy,   setSortBy]   = useState('diferencia');
  const [sortDir,  setSortDir]  = useState('asc');
  const [view,     setView]     = useState('table');
  const [hvMode,   setHvMode]   = useState(false);

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
  };

  const filtered = useMemo(() => {
    let list = docentesConNuevos;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(d => d.nombre.toLowerCase().includes(q) || d.cedula.includes(q) || d.programa.toLowerCase().includes(q));
    }
    if (catFil !== 'Todas') list = list.filter(d => d.categoria.toLowerCase().includes(catFil.toLowerCase()));
    if (facFil !== 'Todas') list = list.filter(d => d.facultad.toLowerCase().includes(facFil.toLowerCase()));
    if (semaFil !== 'Todas') {
      list = list.filter(d => {
        const s = getSemaforo(d.diferencia, d.tope, d.estado);
        return s.label === semaFil;
      });
    }
    return [...list].sort((a, b) => {
      let valA, valB;
      switch (sortBy) {
        case 'nombre':
          valA = a.nombre;
          valB = b.nombre;
          break;
        case 'programa':
          valA = a.programa;
          valB = b.programa;
          break;
        case 'categoria':
          valA = a.categoria;
          valB = b.categoria;
          break;
        case 'ptsAcumulados':
          valA = a.ptsAcumulados;
          valB = b.ptsAcumulados;
          break;
        case 'tope':
          valA = a.tope;
          valB = b.tope;
          break;
        case 'diferencia':
          valA = a.diferencia;
          valB = b.diferencia;
          break;
        case 'pctUsado':
          valA = a.tope > 0 ? (a.ptsAcumulados / a.tope) : 0;
          valB = b.tope > 0 ? (b.ptsAcumulados / b.tope) : 0;
          break;
        case 'ptsTotalSalarial':
          valA = a.ptsTotalSalarial || a.ptsAcumulados || 0;
          valB = b.ptsTotalSalarial || b.ptsAcumulados || 0;
          break;
        case 'ptsCiarp1_2026':
          valA = a.ptsCiarp1_2026 || 0;
          valB = b.ptsCiarp1_2026 || 0;
          break;
        default:
          return 0;
      }
      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';
      if (typeof valA === 'string') {
        return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else {
        return sortDir === 'asc' ? valA - valB : valB - valA;
      }
    });
  }, [search, catFil, facFil, semaFil, sortBy, sortDir, docentesConNuevos]);

  const stats = useMemo(() => ({
    total:   docentesConNuevos.length,
    enTope:  docentesConNuevos.filter(d => d.diferencia <= 0).length,
    cerca:   docentesConNuevos.filter(d => d.diferencia > 0 && d.diferencia <= 20).length,
    ok:      docentesConNuevos.filter(d => d.diferencia > 20).length,
  }), [docentesConNuevos]);

  const pct = (d) => d.tope > 0 ? Math.min(100, Math.round((d.ptsAcumulados / d.tope) * 100)) : 0;

  if (hvMode && selected) return <HojaVidaDocente doc={selected} onBack={() => { setHvMode(false); }} />;
  if (selected) return <DetalleDocente doc={selected} onBack={() => setSelected(null)} setNav={setNav} onVerHV={() => setHvMode(true)} />;

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '80px 20px', fontFamily: "'Nunito',sans-serif", color: '#006B3F' }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>Cargando base de datos docentes...</div>
      <div style={{ color: '#888', fontSize: 13 }}>Cargando docentes activos desde la base de datos de la universidad</div>
    </div>
  );

  return (
    <div style={{ padding: '24px 28px', fontFamily: "'Nunito',sans-serif", maxWidth: 1400, margin: '0 auto' }}>

      {/* ── CABECERA ── */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#1a1a1a' }}>
            👨‍🏫 Gestión Central de Docentes
          </h2>
          <p style={{ margin: '4px 0 0', color: '#666', fontSize: 13 }}>
            Base de datos de planta docente · Control de topes por productividad académica (Decreto 1279/2002)
          </p>
        </div>
        <div style={{ display: 'flex', background: '#f5f5f5', borderRadius: 8, padding: 4, border: '1px solid #e5e7eb' }}>
          <button onClick={() => setView('table')} style={{
            padding: '6px 16px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all .2s',
            background: view === 'table' ? '#fff' : 'transparent', color: view === 'table' ? '#006B3F' : '#666',
            boxShadow: view === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
          }}>📄 Tabla de Datos</button>
          <button onClick={() => setView('dashboard')} style={{
            padding: '6px 16px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all .2s',
            background: view === 'dashboard' ? '#fff' : 'transparent', color: view === 'dashboard' ? '#006B3F' : '#666',
            boxShadow: view === 'dashboard' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
          }}>📊 Panel Estadístico</button>
        </div>
      </div>

      {/* ── SEMÁFORO STATS ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Total docentes',      val: stats.total,  color: '#1a5fa8', bg: '#e7f1fb', icon: '👥' },
          { label: 'En tope o superado',  val: stats.enTope, color: '#dc2626', bg: '#fef2f2', icon: '🔴' },
          { label: 'Cerca del tope',      val: stats.cerca,  color: '#d97706', bg: '#fffbeb', icon: '🟡' },
          { label: 'Con espacio',         val: stats.ok,     color: '#16a34a', bg: '#f0fdf4', icon: '🟢' },
        ].map((s, i) => (
          <div key={i} style={{
            background: s.bg, border: `1.5px solid ${s.color}33`,
            borderRadius: 12, padding: '14px 20px', flex: 1, minWidth: 130,
            display: 'flex', alignItems: 'center', gap: 12,
            cursor: i > 0 ? 'pointer' : 'default',
          }} onClick={() => i > 0 && setSemaFil(s.label)}>
            <span style={{ fontSize: 24 }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 11, color: '#555', fontWeight: 600 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── FILTROS ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Buscar por nombre, cédula o programa..."
          style={{ flex: 1, minWidth: 220, padding: '8px 12px', borderRadius: 8, border: '1.5px solid #ddd', fontSize: 13 }}
        />
        {[
          { label: 'Categoría', val: catFil, set: setCatFil, opts: CATS },
          { label: 'Facultad',  val: facFil, set: setFacFil, opts: FACS },
          { label: 'Semáforo',  val: semaFil, set: setSemaFil, opts: ['Todas','Tope alcanzado','Cerca del tope','Con espacio'] },
          { label: 'Ordenar',   val: `${sortBy}_${sortDir}`, set: (val) => {
              const parts = val.split('_');
              setSortBy(parts[0]);
              setSortDir(parts[1]);
            },  opts: [
              { v:'diferencia_asc', l:'Menor espacio primero' },
              { v:'diferencia_desc', l:'Mayor espacio primero' },
              { v:'nombre_asc', l:'Nombre A-Z' },
              { v:'ptsAcumulados_desc', l:'Mayor puntaje prod.' },
              { v:'ptsTotalSalarial_desc', l:'Mayor sueldo primero' },
              { v:'pctUsado_desc', l:'Mayor % usado primero' },
            ]},
        ].map((f, i) => (
          <select key={i} value={f.val} onChange={e => f.set(e.target.value)}
            style={{ padding: '8px 10px', borderRadius: 8, border: '1.5px solid #ddd', fontSize: 12, background: '#fff' }}>
            {f.opts.map(o => typeof o === 'string'
              ? <option key={o} value={o}>{f.label}: {o}</option>
              : <option key={o.v} value={o.v}>{o.l}</option>
            )}
          </select>
        ))}
        {(search || catFil !== 'Todas' || facFil !== 'Todas' || semaFil !== 'Todas') && (
          <button onClick={() => { setSearch(''); setCatFil('Todas'); setFacFil('Todas'); setSemaFil('Todas'); }}
            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #ddd', background: '#f5f5f5', fontSize: 12, cursor: 'pointer' }}>
            ✕ Limpiar
          </button>
        )}
        <span style={{ fontSize: 12, color: '#888', marginLeft: 4 }}>{filtered.length} docentes</span>
      </div>

      {/* ── CONTENIDO PRINCIPAL ── */}
      <div style={{ display: view === 'table' ? 'block' : 'none', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#006B3F', color: '#fff' }}>
                {[
                  { label: '#',                   key: null },
                  { label: 'Estado',               key: null },
                  { label: 'Nombre / Cédula',      key: 'nombre' },
                  { label: 'Programa',             key: 'programa' },
                  { label: 'Categoría',           key: 'categoria' },
                  { label: 'Pts Producción',       key: 'ptsAcumulados' },
                  { label: 'Tope Prod.',           key: 'tope' },
                  { label: 'Pts Disponibles',      key: 'diferencia' },
                  { label: '% Usado',              key: 'pctUsado' },
                  { label: 'Total Salarial',       key: 'ptsTotalSalarial' },
                  { label: 'CIARP1-26',            key: 'ptsCiarp1_2026' },
                ].map((col, i) => (
                  <th key={i}
                    onClick={() => col.key && handleSort(col.key)}
                    style={{
                      padding: '10px 12px',
                      textAlign: i === 0 ? 'center' : 'left',
                      whiteSpace: 'nowrap',
                      fontWeight: 700,
                      cursor: col.key ? 'pointer' : 'default',
                      userSelect: 'none',
                      background: sortBy === col.key ? '#004d2c' : '#006B3F',
                      transition: 'background .15s',
                    }}
                  >
                    {col.label}
                    {col.key && (
                      <span style={{ marginLeft: 4, opacity: 0.7, fontSize: 10 }}>
                        {sortBy === col.key ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((d, idx) => {
                const sem  = getSemaforo(d.diferencia, d.tope, d.estado);
                const used = pct(d);
                return (
                  <tr key={d.cedula} onClick={() => setSelected(d)}
                    style={{ background: idx % 2 === 0 ? '#fff' : '#f9fafb', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', transition: 'background .15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                    onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#f9fafb'}>
                    <td style={{ padding: '8px 12px', textAlign: 'center', color: '#888' }}>{d.no}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <span title={sem.label} style={{ fontSize: 16 }}>{sem.icon}</span>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ fontWeight: 700, color: '#1a1a1a', fontSize: 12 }}>{d.nombre}</div>
                      <div style={{ color: '#888', fontSize: 10, fontFamily: 'monospace', marginBottom: 2 }}>{d.cedula}</div>
                      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        {d.especializacion && (
                          <span title={d.especializacion} style={{ background: '#fef9ec', border: '1px solid #fcd34d', borderRadius: 4, padding: '1px 5px', fontSize: 9, fontWeight: 700, color: '#92400e' }}>E</span>
                        )}
                        {d.maestria && (
                          <span title={d.maestria} style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 4, padding: '1px 5px', fontSize: 9, fontWeight: 700, color: '#1e40af' }}>M</span>
                        )}
                        {d.doctorado && (
                          <span title={d.doctorado} style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 4, padding: '1px 5px', fontSize: 9, fontWeight: 700, color: '#15803d' }}>D</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '8px 12px', color: '#555', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.programa}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{
                        background: d.categoria.includes('Titular') ? '#1565c0' : d.categoria.includes('Asociado') ? '#006B3F' : d.categoria.includes('Asistente') ? '#6366f1' : '#f59e0b',
                        color: '#fff', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap'
                      }}>{d.categoria}</span>
                    </td>
                    <td style={{ padding: '8px 12px', fontWeight: 700, color: '#1a1a1a', textAlign: 'right' }}>
                      <div style={{ fontSize: 12, fontWeight: 800 }}>{d.ptsAcumulados.toFixed(1)}</div>
                      <div style={{ fontSize: 9, color: '#888', fontWeight: 400 }}>de producción</div>
                    </td>
                    <td style={{ padding: '8px 12px', color: '#555', textAlign: 'right' }}>{d.tope}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                      <span style={{ fontWeight: 700, color: sem.color }}>
                        {d.diferencia >= 0 ? d.diferencia.toFixed(1) : d.diferencia.toFixed(1)}
                      </span>
                    </td>
                    <td style={{ padding: '8px 16px', minWidth: 100 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1, background: '#e5e7eb', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                          <div style={{ width: `${used}%`, height: '100%', background: sem.color, borderRadius: 4, transition: 'width .3s' }} />
                        </div>
                        <span style={{ fontSize: 10, color: sem.color, fontWeight: 700, minWidth: 30 }}>{used}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, color: '#1565c0', fontSize: 13 }}>
                        {d.ptsTotalSalarial > 0 ? d.ptsTotalSalarial.toFixed(1) : '—'}
                      </div>
                      {d.ptsTitulosExp > 0 && (
                        <div style={{ fontSize: 9, color: '#888' }}>+ {d.ptsTitulosExp.toFixed(1)} exp/tít</div>
                      )}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: d.ptsCiarp1_2026 > 0 ? '#006B3F' : '#ccc' }}>
                      {d.ptsCiarp1_2026 > 0 ? `+${d.ptsCiarp1_2026}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length > 200 && (
          <div style={{ padding: '10px 16px', textAlign: 'center', color: '#888', fontSize: 12, borderTop: '1px solid #e5e7eb' }}>
            Mostrando 200 de {filtered.length} resultados. Usa los filtros para refinar.
          </div>
        )}
      </div>

      {view === 'dashboard' && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: '24px', marginTop: 4 }}>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 16, color: '#1a1a1a' }}>📊 Distribución por categoría</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
            {['PROFESOR TITULAR','PROFESOR ASOCIADO','PROFESOR ASISTENTE','PROFESOR AUXILIAR'].map(cat => {
              const cnt = docentesConNuevos.filter(d => d.categoria === cat).length;
              const pct = docentesConNuevos.length > 0 ? Math.round(cnt/docentesConNuevos.length*100) : 0;
              const colors = { TITULAR:'#1565c0', ASOCIADO:'#006B3F', ASISTENTE:'#7c3aed', AUXILIAR:'#b45309' };
              const key = Object.keys(colors).find(k => cat.includes(k)) || 'TITULAR';
              return (
                <div key={cat} style={{ background: '#f9fafb', borderRadius: 12, padding: '16px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: 10, color: '#888', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>{cat.replace('PROFESOR ','')}</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: colors[key] }}>{cnt}</div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{pct}% de la planta</div>
                  <div style={{ background: '#e5e7eb', borderRadius: 4, height: 5, marginTop: 8 }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: colors[key], borderRadius: 4 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   DETALLE DOCENTE
   ══════════════════════════════════════════════ */
function DetalleDocente({ doc, onBack, setNav, onVerHV }) {
  const sem  = getSemaforo(doc.diferencia, doc.tope, doc.estado);
  const used = doc.tope > 0 ? Math.min(100, Math.round((doc.ptsAcumulados / doc.tope) * 100)) : 0;
  const salario = ((doc.ptsTotalSalarial || doc.ptsAcumulados) * VALOR_PUNTO_2026).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

  const anios = Object.entries(doc.historial || {}).sort((a,b) => a[0]-b[0]);

  const [detalles, setDetalles] = useState([]);
  const [loadingDetalles, setLoadingDetalles] = useState(true);

  useEffect(() => {
    setLoadingDetalles(true);
    fetchSolicitudes({ cedula: doc.cedula, paginar: false }).then(async (res) => {
      const filtered = (res?.data || []).filter(s => 
        String(s.cedula) === String(doc.cedula) && 
        !['titulo', 'experiencia_docente', 'experiencia_calificada', 'categoria_academica', 'ascenso'].includes(s.tipo) &&
        s.tipo && !s.tipo.startsWith('exp')
      );

      // Cargar archivo JSON estático de la hoja de vida para obtener los productos históricos
      try {
        const hvRes = await fetch(`/data/hv/${doc.cedula}.json`);
        if (hvRes.ok) {
          const hvData = await hvRes.json();
          if (hvData.productividad) {
            const dbTitulos = new Set(filtered.map(s => (s.titulo || '').toLowerCase().trim()));
            Object.entries(hvData.productividad).forEach(([cat, items]) => {
              if (Array.isArray(items)) {
                items.forEach(item => {
                  const tit = cleanText(item.titulo);
                  if (tit && dbTitulos.has(tit.toLowerCase().trim())) return; // Deduplicar con la BD

                  filtered.push({
                    id: `hist_${Math.random()}`,
                    fecha: item.año ? `${item.año}-01-01` : '',
                    tipo: item.tipo || cat,
                    titulo: cleanText(item.titulo),
                    pts_asig: item.puntos,
                    estado: 'aprobado',
                    resolucion: cleanText(item.resolucion),
                    revista: cleanText(item.revista)
                  });
                });
              }
            });
          }
        }
      } catch (err) {
        console.error("Error cargando el JSON de productividad histórica:", err);
      }

      filtered.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
      setDetalles(filtered);
      setLoadingDetalles(false);
    });
  }, [doc.cedula]);

  // Función auxiliar para determinar si realmente está aprobado en CIARP
  const isRealAprobado = (d) => {
    if (d.estado !== 'aprobado') return false;
    if (d.id && d.id.startsWith('SOL-')) {
      const etapasValidas = ['ciarp', 'acta', 'rectoria', 'juridica', 'resolucion', 'archivada'];
      return etapasValidas.includes(d.etapa);
    }
    return true; // históricos
  };

  // Topes de subcategoría calculados por año (regla 35 puntos MAX por año)
  const currentYear = new Date().getFullYear().toString();
  
  const topeLibrosCalc = useMemo(
    () => detalles
          .filter(d => isRealAprobado(d) && ['libro_texto','libro_ensayo','libro_investigacion'].includes(d.tipo) && (d.fecha || d.created_at || '').startsWith(currentYear))
          .reduce((s, d) => s + (d.pts_asig || 0), 0),
    [detalles, currentYear]
  );
  
  const topeSoftwareCalc = useMemo(
    () => detalles
          .filter(d => isRealAprobado(d) && d.tipo === 'software' && (d.fecha || d.created_at || '').startsWith(currentYear))
          .reduce((s, d) => s + (d.pts_asig || 0), 0),
    [detalles, currentYear]
  );

  const topeVideosCount = useMemo(
    () => detalles.filter(d => isRealAprobado(d) && d.tipo === 'video' && (d.fecha || d.created_at || '').startsWith(currentYear)).length,
    [detalles, currentYear]
  );

  const topePonenciasCount = useMemo(
    () => detalles.filter(d => isRealAprobado(d) && d.tipo === 'ponencia' && (d.fecha || d.created_at || '').startsWith(currentYear)).length,
    [detalles, currentYear]
  );

  const topeArtNICount = useMemo(
    () => detalles.filter(d => isRealAprobado(d) && d.tipo === 'articulo_no_indexado' && (d.fecha || d.created_at || '').startsWith(currentYear)).length,
    [detalles, currentYear]
  );


  // Agrupar aprobaciones por sesión CIARP
  const porCiarp = useMemo(() => {
    const groups = {};
    detalles.filter(d => d.acta_ciarp && isRealAprobado(d) && (d.pts_asig || 0) > 0).forEach(d => {
      groups[d.acta_ciarp] = (groups[d.acta_ciarp] || 0) + (d.pts_asig || 0);
    });
    const parseActa = (acta) => {
      if (!acta) return { year: 0, num: 0 };
      let yearMatch = acta.match(/\b(20\d{2})\b/);
      let year = yearMatch ? parseInt(yearMatch[1], 10) : 0;
      let numMatch = acta.match(/^(\d+)/);
      let num = numMatch ? parseInt(numMatch[1], 10) : 0;
      return { year, num };
    };
    return Object.entries(groups).sort((a, b) => {
      const parsedA = parseActa(a[0]);
      const parsedB = parseActa(b[0]);
      if (parsedA.year !== parsedB.year) {
        return parsedB.year - parsedA.year;
      }
      return parsedB.num - parsedA.num;
    });
  }, [detalles]);

  return (
    <div style={{ padding: '24px 28px', fontFamily: "'Nunito',sans-serif", maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <button onClick={onBack} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
          borderRadius: 8, border: '1.5px solid #ddd', background: '#fff',
          fontSize: 12, cursor: 'pointer', fontWeight: 700
        }}>← Volver al listado</button>
        <button onClick={onVerHV} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
          borderRadius: 8, border: 'none', background: '#006B3F', color: '#fff',
          fontSize: 12, cursor: 'pointer', fontWeight: 700, boxShadow: '0 2px 8px rgba(0,107,63,.25)'
        }}>🎓 Ver Hoja de Vida Completa & Imprimir →</button>
      </div>

      {/* Cabecera */}
      <div style={{ background: 'linear-gradient(135deg, #006B3F 0%, #004d2c 100%)', borderRadius: 16, padding: '24px 28px', color: '#fff', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ flex: '1 1 0%', minWidth: 'min(100%, 400px)' }}>
            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>{doc.nombre}</div>
            <div style={{ fontSize: 13, opacity: .85 }}>C.C. {doc.cedula} · {doc.dedicacion} · Ingreso: {doc.fechaIngreso}</div>
            <div style={{ fontSize: 13, opacity: .85, marginTop: 2 }}>{doc.programa} · {doc.facultad}</div>
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <span style={{ background: 'rgba(255,255,255,.2)', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>
                {doc.categoria}
              </span>
              {doc.titulosAcademicos && doc.titulosAcademicos.length > 0
                ? doc.titulosAcademicos.map((t, i) => (
                    <span key={i} style={{
                      background: i === doc.titulosAcademicos.length - 1 ? 'rgba(255,215,0,.3)' : 'rgba(255,255,255,.12)',
                      borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 600,
                      border: i === doc.titulosAcademicos.length - 1 ? '1px solid rgba(255,215,0,.6)' : 'none'
                    }}>
                      {i === 0 && doc.especializacion ? '🎖️ ' : i === 1 && doc.maestria ? '🎓 ' : '🏆 '}{t}
                    </span>
                  ))
                : <span style={{ background: 'rgba(255,255,255,.15)', borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 600 }}>{doc.escolaridad}</span>
              }
            </div>
          </div>
          <div style={{ textAlign: 'right', marginLeft: 'auto', flexShrink: 0 }}>
            <div style={{ fontSize: 11, opacity: .7 }}>Salario mensual estimado</div>
            <div style={{ fontSize: 20, fontWeight: 900 }}>{salario}</div>
            <div style={{ fontSize: 10, opacity: .6 }}>El valor del punto salarial para el 2026 es de ${VALOR_PUNTO_2026.toLocaleString('es-CO')}</div>
          </div>
        </div>
      </div>

      {/* Tope visual */}
      <div style={{ background: sem.bg || '#fff', border: `2px solid ${sem.color}`, borderRadius: 14, padding: '18px 22px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: sem.color }}>{sem.icon} {sem.label}</span>
          <span style={{ fontSize: 13, color: '#555' }}>
            {/* doc.ptsAcumulados ya incluye SOL-* aprobados (enriquecido en el hook) */}
            <strong>{doc.ptsAcumulados.toFixed(1)}</strong> / {doc.tope} pts
            {doc.ptsSolNuevos > 0 && (
              <span style={{ fontSize: 11, color: '#006B3F', marginLeft: 8, fontWeight: 700 }}>
                (+{doc.ptsSolNuevos.toFixed(1)} nuevos aprobados)
              </span>
            )}
            {' '}· Diferencia: <strong style={{ color: sem.color }}>{doc.diferencia.toFixed(1)} pts</strong>
          </span>
        </div>
        <div style={{ background: '#e5e7eb', borderRadius: 8, height: 16, overflow: 'hidden' }}>
          <div style={{ width: `${used}%`, height: '100%', background: sem.color, borderRadius: 8, transition: 'width .5s', position: 'relative' }}>
            <span style={{ position: 'absolute', right: 6, top: 0, fontSize: 10, color: '#fff', fontWeight: 800, lineHeight: '16px' }}>{used}%</span>
          </div>
        </div>
        {doc.diferencia <= 0 && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#dc2626', fontWeight: 700 }}>
            ⚠️ Este docente ha alcanzado o superado su tope máximo de productividad académica. No recibirá nuevos puntos por este concepto.
          </div>
        )}
        {doc.diferencia > 0 && doc.diferencia <= 20 && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#d97706', fontWeight: 700 }}>
            ⚠️ Solo quedan {doc.diferencia.toFixed(1)} puntos disponibles antes de alcanzar el tope.
          </div>
        )}
      </div>

      {/* Títulos Académicos detalle */}
      {doc.titulosAcademicos && doc.titulosAcademicos.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#1a1a1a', marginBottom: 12 }}>🎓 Títulos Académicos</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {doc.especializacion && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ background: '#fef9ec', border: '1.5px solid #fcd34d', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#92400e', whiteSpace: 'nowrap' }}>🎖️ Especialización</span>
                <span style={{ fontSize: 13, color: '#333' }}>{doc.especializacion}</span>
              </div>
            )}
            {doc.maestria && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ background: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#1e40af', whiteSpace: 'nowrap' }}>🎓 Maestría</span>
                <span style={{ fontSize: 13, color: '#333' }}>{doc.maestria}</span>
              </div>
            )}
            {doc.doctorado && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#15803d', whiteSpace: 'nowrap' }}>🏆 Doctorado</span>
                <span style={{ fontSize: 13, color: '#333' }}>{doc.doctorado}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info CIARP dinámico + caps especiales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {/* Sesiones CIARP con puntos aprobados */}
        {loadingDetalles ? (
          <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '12px 16px', border: '1px solid #86efac' }}>
            <div style={{ fontSize: 10, color: '#888', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Cargando CIARP...</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#aaa' }}>...</div>
          </div>
        ) : porCiarp.length === 0 ? (
          <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 16px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 10, color: '#888', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Sin CIARP registrados</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#aaa' }}>—</div>
          </div>
        ) : (
          porCiarp.map(([acta, pts]) => (
            <div key={acta} style={{ background: '#f0fdf4', borderRadius: 10, padding: '12px 16px', border: '1px solid #86efac' }}>
              <div style={{ fontSize: 10, color: '#388e3c', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>CIARP {acta}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#006B3F' }}>+{pts.toFixed(1)} pts</div>
            </div>
          ))
        )}
        {/* Nuevos puntos sistema (SOL-* aprobados, del hook enriquecido) */}
        <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 16px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 10, color: '#888', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Nuevos puntos sistema</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: doc.ptsSolNuevos > 0 ? '#1a5fa8' : '#aaa' }}>
            {doc.ptsSolNuevos > 0 ? `+${doc.ptsSolNuevos.toFixed(1)} pts` : '—'}
          </div>
        </div>
        {/* Topes subcategoría libros */}
        <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 16px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 10, color: '#888', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Libros {currentYear} (máx 35)</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: topeLibrosCalc >= 35 ? '#dc2626' : topeLibrosCalc > 0 ? '#6366f1' : '#aaa' }}>
            {topeLibrosCalc > 0 ? `${topeLibrosCalc.toFixed(1)} pts` : '0 pts'}
          </div>
        </div>
        {/* Topes subcategoría software */}
        <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 16px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 10, color: '#888', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Software {currentYear} (máx 35)</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: topeSoftwareCalc >= 35 ? '#dc2626' : topeSoftwareCalc > 0 ? '#f59e0b' : '#aaa' }}>
            {topeSoftwareCalc > 0 ? `${topeSoftwareCalc.toFixed(1)} pts` : '0 pts'}
          </div>
        </div>
        {/* Topes Audiovisuales */}
        <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 16px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 10, color: '#888', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Videos {currentYear} (máx 5)</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: topeVideosCount >= 5 ? '#dc2626' : topeVideosCount > 0 ? '#10b981' : '#aaa' }}>
            {topeVideosCount} un.
          </div>
        </div>
        {/* Topes Ponencias */}
        <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 16px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 10, color: '#888', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Ponencias {currentYear} (máx 3)</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: topePonenciasCount >= 3 ? '#dc2626' : topePonenciasCount > 0 ? '#8b5cf6' : '#aaa' }}>
            {topePonenciasCount} un.
          </div>
        </div>
        {/* Topes Art. No Index */}
        <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 16px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 10, color: '#888', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Art. No Index. {currentYear} (máx 5)</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: topeArtNICount >= 5 ? '#dc2626' : topeArtNICount > 0 ? '#ec4899' : '#aaa' }}>
            {topeArtNICount} un.
          </div>
        </div>
      </div>

      {/* Historial de puntos por año */}
      {anios.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '18px 20px', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#1a1a1a', marginBottom: 12 }}>📅 Historial de Productividad Académica (Resumen Anual)</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {anios.map(([year, pts]) => (
              <div key={year} style={{
                background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8,
                padding: '6px 12px', textAlign: 'center', minWidth: 70
              }}>
                <div style={{ fontSize: 10, color: '#888', fontWeight: 600 }}>{year}</div>
                <div style={{ fontSize: 15, fontWeight: 900, color: '#16a34a' }}>{pts}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detalle de Productos (Artículos, Libros, etc) */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '18px 20px', marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#1a1a1a', marginBottom: 12 }}>📄 Historial de Productos Evaluados</div>
        {loadingDetalles ? (
          <div style={{ fontSize: 12, color: '#888', padding: '10px 0' }}>Cargando detalles...</div>
        ) : detalles.length === 0 ? (
          <div style={{ fontSize: 12, color: '#888', padding: '10px 0' }}>No hay registros detallados de productividad disponibles.</div>
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid #f0f0f0', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#f9fafb', color: '#555' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid #e5e7eb' }}>Año</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid #e5e7eb' }}>Tipo</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid #e5e7eb' }}>Título del Producto</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, borderBottom: '1px solid #e5e7eb' }}>Pts.</th>
                </tr>
              </thead>
              <tbody>
                {detalles.map((item, idx) => {
                  const isRejected = item.estado === 'rechazado' || item.estado === 'negado';
                  const isEnProceso = item.estado === 'en_proceso';
                  const titleStyle = isRejected ? { fontWeight: 600, textDecoration: 'line-through', color: '#888' } : { fontWeight: 600 };
                  
                  return (
                    <tr key={item.id} style={{ borderBottom: idx === detalles.length - 1 ? 'none' : '1px solid #f0f0f0', background: idx % 2 === 0 ? '#fff' : '#fcfcfc' }}>
                      <td style={{ padding: '8px 12px', color: '#888', width: '60px' }}>{(item.fecha || '').substring(0, 4) || '—'}</td>
                      <td style={{ padding: '8px 12px', color: '#555', width: '130px', fontSize: 10.5 }}>{TIPO_LABEL[item.tipo] || (item.tipo || '').replace(/_/g, ' ')}</td>
                      <td style={{ padding: '8px 12px', color: '#1a1a1a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                          <span style={titleStyle}>{item.titulo}</span>
                          {isRejected && (
                            <span style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 4, padding: '2px 6px', fontSize: 9, fontWeight: 700 }}>
                              ❌ Negado
                            </span>
                          )}
                          {isEnProceso && (
                            <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: 4, padding: '2px 6px', fontSize: 9, fontWeight: 700 }}>
                              ⏳ En Proceso
                            </span>
                          )}
                        </div>
                        {item.revista && <div style={{ fontSize: 9, color: '#888', marginTop: 2 }}>{item.revista}</div>}
                        {item.acta_ciarp && <div style={{ fontSize: 9, color: '#006B3F', marginTop: 2 }}>CIARP: {item.acta_ciarp}</div>}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: isRealAprobado(item) ? '#006B3F' : isRejected ? '#dc2626' : '#d97706', width: '50px' }}>
                        {isRealAprobado(item) && item.pts_asig !== null && item.pts_asig !== undefined ? Number(item.pts_asig).toFixed(1) : '0.0'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Comisión y observaciones */}
      {(doc.comision || doc.observacion) && (
        <div style={{ background: '#fffbeb', borderRadius: 12, border: '1px solid #fcd34d', padding: '14px 18px' }}>
          {doc.comision && <div style={{ fontSize: 12, color: '#92400e', marginBottom: 4 }}><strong>📌 Comisión:</strong> {doc.comision}</div>}
          {doc.observacion && <div style={{ fontSize: 12, color: '#92400e' }}><strong>📝 Observación:</strong> {doc.observacion}</div>}
        </div>
      )}
    </div>
  );
}
