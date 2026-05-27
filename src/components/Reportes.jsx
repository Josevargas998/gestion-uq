import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';

const COLORS = ['#2563eb','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899','#14b8a6','#a855f7'];

// Mapa programa → facultad (basado en programas de la UQ)
const PROG_FAC = {
  // Ciencias de la Salud
  'MEDICINA': 'Ciencias de la Salud',
  'ENFERMERIA': 'Ciencias de la Salud',
  'REGENCIA EN FARMACIA': 'Ciencias de la Salud',
  'GERONTOLOGIA': 'Ciencias de la Salud',
  'FISIOTERAPIA': 'Ciencias de la Salud',
  'OPTOMETRIA': 'Ciencias de la Salud',
  'NUTRICION Y DIETETICA': 'Ciencias de la Salud',
  'BACTERIOLOGIA': 'Ciencias de la Salud',
  // Ciencias Básicas y Tecnologías
  'FISICA': 'Ciencias Básicas y Tecnologías',
  'QUIMICA': 'Ciencias Básicas y Tecnologías',
  'BIOLOGIA': 'Ciencias Básicas y Tecnologías',
  'MATEMATICAS': 'Ciencias Básicas y Tecnologías',
  'LICENCIATURA EN MATEMATICAS': 'Ciencias Básicas y Tecnologías',
  'LICENCIATURA EN FISICA': 'Ciencias Básicas y Tecnologías',
  // Ingenierías
  'INGENIERIA ELECTRONICA': 'Ingenierías',
  'INGENIERIA FISICA': 'Ingenierías',
  'INGENIERIA INDUSTRIAL': 'Ingenierías',
  'INGENIERIA DE SISTEMAS': 'Ingenierías',
  'INGENIERIA CIVIL': 'Ingenierías',
  'INGENIERIA AMBIENTAL': 'Ingenierías',
  'TECNOLOGIA EN INSTRUMENTACION ELECTRONICA DIURNA': 'Ingenierías',
  'TECNOLOGIA EN TOPOGRAFIA': 'Ingenierías',
  // Ciencias Económicas
  'ECONOMIA': 'Ciencias Económicas, Admvas. y Contables',
  'CONTADURIA PUBLICA': 'Ciencias Económicas, Admvas. y Contables',
  'ADMINISTRACION DE NEGOCIOS': 'Ciencias Económicas, Admvas. y Contables',
  'ADMINISTRACION DEL MEDIO AMBIENTE': 'Ciencias Económicas, Admvas. y Contables',
  'COMERCIO INTERNACIONAL': 'Ciencias Económicas, Admvas. y Contables',
  // Ciencias Humanas y Bellas Artes
  'FILOSOFIA': 'Ciencias Humanas y Bellas Artes',
  'HISTORIA': 'Ciencias Humanas y Bellas Artes',
  'IDIOMAS': 'Ciencias Humanas y Bellas Artes',
  'ARTES PLASTICAS': 'Ciencias Humanas y Bellas Artes',
  'MUSICA': 'Ciencias Humanas y Bellas Artes',
  // Ciencias de la Educación
  'EDUCACION': 'Ciencias de la Educación',
  'PEDAGOGIA REEDUCATIVA': 'Ciencias de la Educación',
  'LICENCIATURA EN EDUCACION': 'Ciencias de la Educación',
  'EDUCACION FISICA': 'Ciencias de la Educación',
};

function getFacultad(programa) {
  if (!programa) return 'Sin Facultad';
  const p = programa.toUpperCase().trim();
  // Búsqueda exacta
  if (PROG_FAC[p]) return PROG_FAC[p];
  // Búsqueda parcial
  for (const [key, fac] of Object.entries(PROG_FAC)) {
    if (p.includes(key) || key.includes(p)) return fac;
  }
  // Heurísticas por palabras clave
  if (p.includes('MEDIC') || p.includes('ENFERME') || p.includes('SALUD') || p.includes('FARMA') || p.includes('FISIO') || p.includes('OPTO') || p.includes('NUTRI') || p.includes('BACTER') || p.includes('GERONTOL')) return 'Ciencias de la Salud';
  if (p.includes('INGENI') || p.includes('TECNOLOG') || p.includes('ELECTR') || p.includes('TOPOGRA') || p.includes('SISTEM') || p.includes('CIVIL') || p.includes('AMBIENTAL') || p.includes('INDUSTRI')) return 'Ingenierías';
  if (p.includes('CONTAD') || p.includes('ECONOM') || p.includes('ADMIN') || p.includes('COMERC') || p.includes('FINANC') || p.includes('NEGOC')) return 'Ciencias Económicas, Admvas. y Contables';
  if (p.includes('LICENCI') || p.includes('PEDAGOG') || p.includes('EDUCAC')) return 'Ciencias de la Educación';
  if (p.includes('FISICA') || p.includes('QUIMIC') || p.includes('BIOLOG') || p.includes('MATEMAT')) return 'Ciencias Básicas y Tecnologías';
  if (p.includes('FILOSO') || p.includes('HISTOR') || p.includes('IDIOM') || p.includes('ARTE') || p.includes('MUSIC') || p.includes('HUMAN')) return 'Ciencias Humanas y Bellas Artes';
  return 'Otras';
}

const CAT_LABELS = {
  revista_indexada: 'Revista Indexada', libro_texto: 'Libro Texto',
  libro_ensayo: 'Libro Ensayo', libro_investigacion: 'Libro Investigación',
  software: 'Software', titulo_academico: 'Título Académico',
  cambio_categoria: 'Cambio Categoría', premio: 'Premio',
  obra_artistica: 'Obra Artística', prod_tecnica: 'Prod. Técnica',
};

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', padding: '8px 12px', borderRadius: 8, fontSize: 12 }}>
      <strong>{label || payload[0].name}</strong>
      {payload.map((p, i) => <div key={i} style={{ color: p.color }}>{p.name}: <strong>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</strong></div>)}
    </div>
  );
};

export default function Reportes({ solicitudes }) {
  const [hist, setHist]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [anioDesde, setAnioDesde] = useState('');
  const [anioHasta, setAnioHasta] = useState('');

  // Cargar toda la tabla histórica (una vez)
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/productividad-historica');
        if (res.ok) {
          const all = await res.json();
          setHist(all || []);
        }
      } catch (e) {
        console.warn('No se pudo cargar productividad histórica:', e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Filtro por rango de años
  const filtrado = useMemo(() => {
    let d = hist;
    if (anioDesde) d = d.filter(r => r.anio >= parseInt(anioDesde));
    if (anioHasta) d = d.filter(r => r.anio <= parseInt(anioHasta));
    return d;
  }, [hist, anioDesde, anioHasta]);

  // KPIs
  const totalPuntos    = useMemo(() => filtrado.reduce((s, r) => s + (Number(r.puntos) || 0), 0), [filtrado]);
  const docentesUnicos = useMemo(() => new Set(filtrado.map(r => r.cedula).filter(Boolean)).size, [filtrado]);

  // Puntos por año (línea)
  const dataAnio = useMemo(() => {
    const m = {};
    filtrado.forEach(r => { if (r.anio) { m[r.anio] = (m[r.anio] || 0) + (Number(r.puntos) || 0); } });
    return Object.entries(m).map(([k, v]) => ({ anio: k, Puntos: Math.round(v) })).sort((a, b) => a.anio - b.anio);
  }, [filtrado]);

  // Productos por año (barra)
  const dataProductosAnio = useMemo(() => {
    const m = {};
    filtrado.forEach(r => { if (r.anio) { m[r.anio] = (m[r.anio] || 0) + 1; } });
    return Object.entries(m).map(([k, v]) => ({ anio: k, Productos: v })).sort((a, b) => a.anio - b.anio);
  }, [filtrado]);

  // Por facultad
  const dataFacultad = useMemo(() => {
    const m = {};
    filtrado.forEach(r => {
      const f = getFacultad(r.programa);
      m[f] = (m[f] || 0) + (Number(r.puntos) || 0);
    });
    return Object.entries(m).map(([k, v]) => ({ name: k, Puntos: Math.round(v) })).sort((a, b) => b.Puntos - a.Puntos);
  }, [filtrado]);

  // Por categoría
  const dataCat = useMemo(() => {
    const m = {};
    filtrado.forEach(r => { const c = CAT_LABELS[r.categoria] || r.categoria; m[c] = (m[c] || 0) + 1; });
    return Object.entries(m).map(([k, v]) => ({ name: k, Cantidad: v })).sort((a, b) => b.Cantidad - a.Cantidad);
  }, [filtrado]);

  // Top docentes histórico
  const topDocentes = useMemo(() => {
    const m = {};
    filtrado.filter(r => Number(r.puntos) > 0).forEach(r => {
      const key = r.cedula || r.docente;
      if (!m[key]) m[key] = { nombre: r.docente, cedula: r.cedula, pts: 0, prods: 0, facultad: getFacultad(r.programa) };
      m[key].pts += Number(r.puntos) || 0;
      m[key].prods += 1;
    });
    return Object.values(m).sort((a, b) => b.pts - a.pts).slice(0, 15);
  }, [filtrado]);

  const años = Array.from({ length: 2025 - 1994 + 1 }, (_, i) => 1994 + i);

  const cardStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, boxShadow: 'var(--shadow-xs)' };
  const h3Style  = { fontSize: 14, fontWeight: 800, color: 'var(--uq-green-dk)', marginBottom: 14 };

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1400, margin: '0 auto' }}>

      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--uq-green-dk)', margin: 0 }}>📈 Estadísticas y Reportes</h2>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4, marginBottom: 0 }}>
            Productividad académica histórica 1994–2025 · Universidad del Quindío
          </p>
        </div>
        {/* Filtro de años */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Período:</span>
          <select value={anioDesde} onChange={e => setAnioDesde(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 13, fontWeight: 700 }}>
            <option value="">Desde</option>
            {años.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <span style={{ color: 'var(--muted)' }}>—</span>
          <select value={anioHasta} onChange={e => setAnioHasta(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 13, fontWeight: 700 }}>
            <option value="">Hasta</option>
            {años.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {(anioDesde || anioHasta) && (
            <button onClick={() => { setAnioDesde(''); setAnioHasta(''); }}
              style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
              ✕ Limpiar
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, gap: 14, color: 'var(--muted)', fontSize: 15 }}>
          <div style={{ width: 32, height: 32, border: '3px solid var(--uq-green-lt)', borderTopColor: 'var(--uq-green)', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
          Cargando datos históricos 1994–2025...
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
            {[
              { icon: '📋', label: 'Total Productos', value: filtrado.length.toLocaleString(), sub: anioDesde || anioHasta ? `${anioDesde||1994}–${anioHasta||2025}` : 'Histórico 1994–2025' },
              { icon: '⭐', label: 'Puntos Acumulados', value: Math.round(totalPuntos).toLocaleString(), sub: 'Total Decreto 1279' },
              { icon: '👤', label: 'Docentes Únicos', value: docentesUnicos.toLocaleString(), sub: 'Con al menos 1 producto' },
              { icon: '📄', label: 'Revistas Indexadas', value: filtrado.filter(r => r.categoria === 'revista_indexada').length.toLocaleString(), sub: 'Artículos científicos' },
              { icon: '🏛️', label: 'Facultades', value: dataFacultad.filter(f => f.name !== 'Sin Facultad').length, sub: 'Con producción registrada' },
            ].map(k => (
              <div key={k.label} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 22, width: 40, height: 40, background: 'var(--uq-green-lt)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{k.icon}</div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 900 }}>{k.value}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .4 }}>{k.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{k.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Fila 1: Evolución por año (ancho completo) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div style={cardStyle}>
              <div style={h3Style}>📅 Productos aprobados por año (1994–2025)</div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={dataProductosAnio} margin={{ left: -10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="anio" tick={{ fontSize: 10 }} interval={2} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<Tip />} />
                  <Bar dataKey="Productos" fill="var(--uq-blue)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={cardStyle}>
              <div style={h3Style}>⭐ Puntos acumulados por año</div>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={dataAnio} margin={{ left: -10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="anio" tick={{ fontSize: 10 }} interval={2} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<Tip />} />
                  <Line type="monotone" dataKey="Puntos" stroke="#d97706" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Fila 2: Facultad + Categoría */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div style={cardStyle}>
              <div style={h3Style}>🏛️ Puntos por Facultad</div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart layout="vertical" data={dataFacultad} margin={{ left: 0, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={175} tick={{ fontSize: 10 }} />
                  <Tooltip content={<Tip />} />
                  <Bar dataKey="Puntos" radius={[0,6,6,0]} barSize={16}>
                    {dataFacultad.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={cardStyle}>
              <div style={h3Style}>📦 Distribución por Tipo de Producto</div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart layout="vertical" data={dataCat} margin={{ left: 0, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 10 }} />
                  <Tooltip content={<Tip />} />
                  <Bar dataKey="Cantidad" radius={[0,6,6,0]} barSize={16}>
                    {dataCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Fila 3: Top 15 docentes históricos */}
          <div style={cardStyle}>
            <div style={h3Style}>🏆 Top 15 Docentes — Puntos Históricos Acumulados</div>
            {topDocentes.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: 30 }}>Sin datos con puntos asignados</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ background: 'var(--uq-green-pale)', borderBottom: '2px solid var(--uq-green-lt)' }}>
                      {['#','Docente','Cédula','Facultad','Pts. Acum.','Productos'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Pts. Acum.' || h === 'Productos' ? 'right' : 'left', fontSize: 10.5, fontWeight: 800, color: 'var(--uq-green-dk)', textTransform: 'uppercase', letterSpacing: .4, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topDocentes.map((d, i) => (
                      <tr key={d.cedula || i} style={{ borderBottom: '1px solid var(--border)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--uq-green-pale)'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                        <td style={{ padding: '8px 10px', fontWeight: 800, color: i < 3 ? '#f59e0b' : 'var(--muted)' }}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 700 }}>{d.nombre || '—'}</td>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: 'var(--muted)', fontSize: 11.5 }}>{d.cedula || '—'}</td>
                        <td style={{ padding: '8px 10px', color: 'var(--muted)', fontSize: 11.5 }}>{d.facultad}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 900, color: 'var(--uq-green-dk)', fontSize: 14 }}>{Math.round(d.pts).toLocaleString()}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--muted)' }}>{d.prods}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
