import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from 'recharts';

const COLORS = ['#2563eb','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899','#14b8a6','#a855f7'];
const OTROS = 'Otros';

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (Number(p.value) || 0), 0);
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', padding: '8px 12px', borderRadius: 8, fontSize: 12, boxShadow: '0 4px 14px rgba(0,0,0,.08)' }}>
      <strong>{label || payload[0].name}</strong>
      {payload.filter(p => p.value).map((p, i) => (
        <div key={i} style={{ color: p.color || p.fill }}>{p.name}: <strong>{Number(p.value).toLocaleString()}</strong></div>
      ))}
      {payload.length > 1 && <div style={{ borderTop: '1px solid #eee', marginTop: 4, paddingTop: 4 }}>Total: <strong>{total.toLocaleString()}</strong></div>}
    </div>
  );
};

/**
 * Explorador de productividad histórica por Programa × Producto × Año.
 * @param {Array} rows  Filas de productividad histórica (ya filtradas por rango de años)
 * @param {Object} catLabels  Mapa categoria → etiqueta legible
 */
export default function ExploradorProductividad({ rows, catLabels }) {
  const [programa, setPrograma] = useState('');
  const [producto, setProducto] = useState('');
  const [metrica, setMetrica]   = useState('cantidad'); // cantidad | puntos
  const [detAnio, setDetAnio]   = useState('');   // filtro de detalle por año
  const [detCat, setDetCat]     = useState('');   // filtro de detalle por etiqueta de producto
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina]     = useState(0);
  const POR_PAG = 25;

  const labelCat = c => catLabels[c] || c || 'Sin tipo';
  const valor = r => metrica === 'puntos' ? (Number(r.puntos) || 0) : 1;
  const unidad = metrica === 'puntos' ? 'Puntos' : 'Productos';

  const programas = useMemo(() => {
    const s = new Set(rows.map(r => (r.programa || '').trim()).filter(Boolean));
    return [...s].sort((a, b) => a.localeCompare(b, 'es'));
  }, [rows]);

  const productos = useMemo(() => {
    const s = new Set(rows.map(r => r.categoria).filter(Boolean));
    return [...s].sort((a, b) => labelCat(a).localeCompare(labelCat(b), 'es'));
  }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const sel = useMemo(() => rows.filter(r =>
    (!programa || (r.programa || '').trim() === programa) &&
    (!producto || r.categoria === producto)
  ), [rows, programa, producto]);

  // Listado detallado de productos
  const detalle = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return sel.filter(r =>
      (!detAnio || String(r.anio) === detAnio) &&
      (!detCat || labelCat(r.categoria) === detCat) &&
      (!q || [r.titulo, r.docente, r.revista, r.cedula, r.numero_resolucion].some(v => String(v || '').toLowerCase().includes(q)))
    ).sort((a, b) => (b.anio || 0) - (a.anio || 0));
  }, [sel, detAnio, detCat, busqueda]); // eslint-disable-line react-hooks/exhaustive-deps
  const totalPag = Math.max(1, Math.ceil(detalle.length / POR_PAG));
  const pagActual = Math.min(pagina, totalPag - 1);
  const verDetalle = (anio, cat) => {
    setDetAnio(anio || ''); setDetCat(cat && cat !== OTROS ? cat : ''); setPagina(0);
    setTimeout(() => document.getElementById('exp-detalle')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  // Ranking de tipos de producto (dentro del programa seleccionado)
  const rankingProductos = useMemo(() => {
    const m = {};
    sel.forEach(r => { const k = labelCat(r.categoria); m[k] = (m[k] || 0) + valor(r); });
    return Object.entries(m).map(([name, v]) => ({ name, [unidad]: Math.round(v * 10) / 10 }))
      .sort((a, b) => b[unidad] - a[unidad]);
  }, [sel, metrica]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ranking de programas (para el producto seleccionado)
  const rankingProgramas = useMemo(() => {
    const m = {};
    sel.forEach(r => { const k = (r.programa || '').trim() || 'Sin programa'; m[k] = (m[k] || 0) + valor(r); });
    return Object.entries(m).map(([name, v]) => ({ name, [unidad]: Math.round(v * 10) / 10 }))
      .sort((a, b) => b[unidad] - a[unidad]).slice(0, 15);
  }, [sel, metrica]); // eslint-disable-line react-hooks/exhaustive-deps

  // Evolución por año apilada por tipo de producto (top 6 + Otros)
  const { evolucion, series } = useMemo(() => {
    const top = rankingProductos.slice(0, 6).map(d => d.name);
    const m = {};
    sel.forEach(r => {
      if (!r.anio) return;
      const cat = labelCat(r.categoria);
      const k = top.includes(cat) ? cat : OTROS;
      m[r.anio] = m[r.anio] || { anio: String(r.anio) };
      m[r.anio][k] = Math.round(((m[r.anio][k] || 0) + valor(r)) * 10) / 10;
    });
    const data = Object.values(m).sort((a, b) => a.anio - b.anio);
    const hasOtros = data.some(d => d[OTROS]);
    return { evolucion: data, series: hasOtros ? [...top, OTROS] : top };
  }, [sel, rankingProductos, metrica]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tabla año × producto
  const aniosTabla = evolucion.map(d => d.anio);
  const total = sel.reduce((s, r) => s + valor(r), 0);
  const docentes = new Set(sel.map(r => r.cedula).filter(Boolean)).size;
  const mejorAnio = evolucion.reduce((best, d) => {
    const t = series.reduce((s, k) => s + (d[k] || 0), 0);
    return t > best.t ? { anio: d.anio, t } : best;
  }, { anio: '—', t: 0 });

  const cardStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, boxShadow: 'var(--shadow-xs)' };
  const h3Style  = { fontSize: 14, fontWeight: 800, color: 'var(--uq-green-dk)', marginBottom: 14 };
  const selStyle = { padding: '7px 10px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 13, fontWeight: 700, background: '#fff', minWidth: 200 };
  const chip = active => ({
    padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 800, cursor: 'pointer', transition: 'all .15s',
    border: `1.5px solid ${active ? 'var(--uq-green)' : 'var(--border)'}`,
    background: active ? 'var(--uq-green)' : '#fff', color: active ? '#fff' : 'var(--muted)',
  });

  return (
    <section id="explorador-productividad" style={{ ...cardStyle, marginTop: 20, padding: 0, overflow: 'hidden' }}>
      {/* Encabezado + filtros */}
      <div style={{ padding: '18px 20px', background: 'linear-gradient(135deg, var(--uq-green-pale), #fff)', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: 17, fontWeight: 900, color: 'var(--uq-green-dk)', margin: 0 }}>🔎 Explorador por Programa, Producto y Año</h3>
        <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '4px 0 14px' }}>
          Cuántos productos ha presentado cada programa a lo largo de los años y cuáles son los más frecuentes. Usa el filtro de período superior para acotar los años.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <select id="exp-programa" value={programa} onChange={e => { setPrograma(e.target.value); setPagina(0); }} style={selStyle}>
            <option value="">🏫 Todos los programas</option>
            {programas.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select id="exp-producto" value={producto} onChange={e => { setProducto(e.target.value); setDetCat(''); setPagina(0); }} style={selStyle}>
            <option value="">📦 Todos los productos</option>
            {productos.map(c => <option key={c} value={c}>{labelCat(c)}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 6 }}>
            <button id="exp-metrica-cantidad" style={chip(metrica === 'cantidad')} onClick={() => setMetrica('cantidad')}># Cantidad</button>
            <button id="exp-metrica-puntos" style={chip(metrica === 'puntos')} onClick={() => setMetrica('puntos')}>⭐ Puntos</button>
          </div>
          {(programa || producto) && (
            <button id="exp-limpiar" onClick={() => { setPrograma(''); setProducto(''); setDetAnio(''); setDetCat(''); setBusqueda(''); setPagina(0); }}
              style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
              ✕ Limpiar
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: 20 }}>
        {/* Mini KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { label: `Total ${unidad.toLowerCase()}`, value: Math.round(total).toLocaleString() },
            { label: 'Docentes', value: docentes.toLocaleString() },
            { label: 'Producto más frecuente', value: rankingProductos[0]?.name || '—' },
            { label: 'Año con más producción', value: mejorAnio.anio },
          ].map(k => (
            <div key={k.label} style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--uq-green-pale)', border: '1px solid var(--uq-green-lt)' }}>
              <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--uq-green-dk)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.value}</div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .4 }}>{k.label}</div>
            </div>
          ))}
        </div>

        {sel.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: 40 }}>No hay productos para los filtros seleccionados.</p>
        ) : (
          <>
            {/* Evolución apilada */}
            <div style={{ marginBottom: 24 }}>
              <div style={h3Style}>📅 {unidad} por año {programa ? `· ${programa}` : ''} {producto ? `· ${labelCat(producto)}` : ''}</div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={evolucion} margin={{ left: -10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="anio" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<Tip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {series.map((s, i) => (
                    <Bar key={s} dataKey={s} stackId="a" fill={COLORS[i % COLORS.length]}
                      radius={i === series.length - 1 ? [4, 4, 0, 0] : 0} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Rankings */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20, marginBottom: 24 }}>
              <div>
                <div style={h3Style}>🏅 Productos más presentados</div>
                <ResponsiveContainer width="100%" height={Math.max(200, rankingProductos.length * 28)}>
                  <BarChart layout="vertical" data={rankingProductos} margin={{ left: 0, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10 }} />
                    <Tooltip content={<Tip />} />
                    <Bar dataKey={unidad} radius={[0, 6, 6, 0]} barSize={16} style={{ cursor: 'pointer' }}
                      onClick={d => d?.name && verDetalle('', d.name)}>
                      {rankingProductos.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <div style={h3Style}>🏫 Programas con más {unidad.toLowerCase()} (Top 15)</div>
                <ResponsiveContainer width="100%" height={Math.max(200, rankingProgramas.length * 28)}>
                  <BarChart layout="vertical" data={rankingProgramas} margin={{ left: 0, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" width={190} tick={{ fontSize: 9.5 }} />
                    <Tooltip content={<Tip />} />
                    <Bar dataKey={unidad} radius={[0, 6, 6, 0]} barSize={16} fill="var(--uq-blue)"
                      onClick={d => d?.name && d.name !== 'Sin programa' && setPrograma(d.name)} style={{ cursor: 'pointer' }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tabla año × producto */}
            <div style={h3Style}>🧮 Detalle año × tipo de producto</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--uq-green-pale)', borderBottom: '2px solid var(--uq-green-lt)' }}>
                    <th style={{ padding: '7px 10px', textAlign: 'left', fontSize: 10.5, fontWeight: 800, color: 'var(--uq-green-dk)' }}>AÑO</th>
                    {series.map(s => <th key={s} style={{ padding: '7px 10px', textAlign: 'right', fontSize: 10.5, fontWeight: 800, color: 'var(--uq-green-dk)', whiteSpace: 'nowrap' }}>{s}</th>)}
                    <th style={{ padding: '7px 10px', textAlign: 'right', fontSize: 10.5, fontWeight: 900, color: 'var(--uq-green-dk)' }}>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {[...evolucion].reverse().map(d => {
                    const t = series.reduce((s, k) => s + (d[k] || 0), 0);
                    return (
                      <tr key={d.anio} style={{ borderBottom: '1px solid var(--border)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--uq-green-pale)'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                        <td style={{ padding: '6px 10px', fontWeight: 800, cursor: 'pointer', color: 'var(--uq-blue)' }} title="Ver productos de este año" onClick={() => verDetalle(d.anio, '')}>{d.anio}</td>
                        {series.map(s => <td key={s} onClick={() => d[s] && verDetalle(d.anio, s)} title={d[s] ? `Ver ${s} de ${d.anio}` : ''}
                          style={{ padding: '6px 10px', textAlign: 'right', color: d[s] ? 'var(--uq-blue)' : 'var(--muted)', cursor: d[s] ? 'pointer' : 'default', textDecoration: d[s] ? 'underline dotted' : 'none' }}>{d[s] ? d[s].toLocaleString() : '·'}</td>)}
                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 900, color: 'var(--uq-green-dk)' }}>{(Math.round(t * 10) / 10).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {aniosTabla.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 12 }}>Sin años registrados.</p>}
            </div>

            {/* Listado detallado de productos */}
            <div id="exp-detalle" style={{ marginTop: 28, scrollMarginTop: 80 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                <div style={{ ...h3Style, marginBottom: 0 }}>
                  📚 Listado de productos <span style={{ color: 'var(--muted)', fontWeight: 700 }}>({detalle.length.toLocaleString()})</span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {detAnio && <span style={{ ...chip(true), cursor: 'pointer' }} onClick={() => setDetAnio('')}>📅 {detAnio} ✕</span>}
                  {detCat && <span style={{ ...chip(true), cursor: 'pointer' }} onClick={() => setDetCat('')}>📦 {detCat} ✕</span>}
                  <input id="exp-busqueda" value={busqueda} onChange={e => { setBusqueda(e.target.value); setPagina(0); }}
                    placeholder="Buscar título, docente, revista, resolución…"
                    style={{ ...selStyle, minWidth: 280, fontWeight: 500 }} />
                </div>
              </div>
              <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: '0 0 10px' }}>
                Tip: haz clic en un número de la tabla de arriba o en una barra de “Productos más presentados” para ver solo esos productos.
              </p>
              <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'var(--uq-green-pale)', borderBottom: '2px solid var(--uq-green-lt)' }}>
                      {['Año', 'Producto', 'Título', 'Docente', 'Programa', 'Revista / Editorial', 'Cat.', 'Pts', 'Resolución'].map(h => (
                        <th key={h} style={{ padding: '7px 10px', textAlign: h === 'Pts' ? 'right' : 'left', fontSize: 10.5, fontWeight: 800, color: 'var(--uq-green-dk)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detalle.slice(pagActual * POR_PAG, (pagActual + 1) * POR_PAG).map((r, i) => (
                      <tr key={r.id || i} style={{ borderBottom: '1px solid var(--border)', verticalAlign: 'top' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--uq-green-pale)'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                        <td style={{ padding: '7px 10px', fontWeight: 800 }}>{r.anio || '—'}</td>
                        <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 999, background: 'var(--uq-green-lt)', color: 'var(--uq-green-dk)', fontSize: 10.5, fontWeight: 800 }}>{labelCat(r.categoria)}</span>
                        </td>
                        <td style={{ padding: '7px 10px', fontWeight: 600, minWidth: 260 }}>{r.titulo || '—'}</td>
                        <td style={{ padding: '7px 10px', minWidth: 160 }}>
                          <div style={{ fontWeight: 700 }}>{r.docente || '—'}</div>
                          <div style={{ fontFamily: 'monospace', fontSize: 10.5, color: 'var(--muted)' }}>{r.cedula}</div>
                        </td>
                        <td style={{ padding: '7px 10px', color: 'var(--muted)', fontSize: 11, minWidth: 140 }}>{r.programa || '—'}</td>
                        <td style={{ padding: '7px 10px', color: 'var(--muted)', fontSize: 11, minWidth: 140 }}>{r.revista || '—'}</td>
                        <td style={{ padding: '7px 10px', fontWeight: 700 }}>{r.categoria_revista || '—'}</td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 900, color: 'var(--uq-green-dk)' }}>{r.puntos != null ? Number(r.puntos).toLocaleString() : '—'}</td>
                        <td style={{ padding: '7px 10px', fontSize: 11, whiteSpace: 'nowrap' }}>
                          {r.numero_resolucion || '—'}
                          {r.fecha_resolucion && <div style={{ color: 'var(--muted)', fontSize: 10.5 }}>{String(r.fecha_resolucion).slice(0, 10)}</div>}
                        </td>
                      </tr>
                    ))}
                    {detalle.length === 0 && (
                      <tr><td colSpan={9} style={{ padding: 30, textAlign: 'center', color: 'var(--muted)' }}>Sin productos para estos filtros.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {totalPag > 1 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 12 }}>
                  <button id="exp-pag-ant" disabled={pagActual === 0} onClick={() => setPagina(pagActual - 1)} style={{ ...chip(false), opacity: pagActual === 0 ? .4 : 1 }}>‹ Anterior</button>
                  <span style={{ fontWeight: 700, color: 'var(--muted)' }}>Página {pagActual + 1} de {totalPag}</span>
                  <button id="exp-pag-sig" disabled={pagActual >= totalPag - 1} onClick={() => setPagina(pagActual + 1)} style={{ ...chip(false), opacity: pagActual >= totalPag - 1 ? .4 : 1 }}>Siguiente ›</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
