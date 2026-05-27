/**
 * ProductividadHistorica.jsx
 *
 * Módulo de consulta del histórico de productividad 1994-2025.
 * Permite filtrar por docente (cédula/nombre), año, categoría y programa.
 * Muestra gráficas de evolución y tabla de resultados paginada.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { deleteProductividadHistorica } from '../utils/api.js';
import { useNotification } from '../context/NotificationContext.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import { Trash2 } from 'lucide-react';

import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell
} from 'recharts';

// ─── Constantes ────────────────────────────────────────────────────────────────
const CATEGORIAS = {
  revista_indexada:    { label: 'Revista Indexada',     color: '#2563eb', icon: '📄' },
  libro_texto:         { label: 'Libro Texto',           color: '#7c3aed', icon: '📚' },
  libro_ensayo:        { label: 'Libro Ensayo',          color: '#6d28d9', icon: '✍️' },
  libro_investigacion: { label: 'Libro Investigación',   color: '#4f46e5', icon: '🔬' },
  software:            { label: 'Software',              color: '#0891b2', icon: '💻' },
  titulo_academico:    { label: 'Título Académico',      color: '#059669', icon: '🎓' },
  cambio_categoria:    { label: 'Cambio de Categoría',   color: '#d97706', icon: '⬆️' },
  premio:              { label: 'Premio',                color: '#dc2626', icon: '🏆' },
  obra_artistica:      { label: 'Obra Artística',        color: '#db2777', icon: '🎨' },
  prod_tecnica:        { label: 'Prod. Técnica',         color: '#65a30d', icon: '⚙️' },
};

const AÑOS_RANGO = Array.from({ length: 2025 - 1994 + 1 }, (_, i) => 1994 + i);

const PAGE_SIZE = 25;

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, color = 'var(--uq-blue)' }) {
  return (
    <div className="ph-kpi-card">
      <div className="ph-kpi-icon" style={{ background: `${color}22`, color }}>
        {icon}
      </div>
      <div className="ph-kpi-body">
        <div className="ph-kpi-value">{value}</div>
        <div className="ph-kpi-label">{label}</div>
        {sub && <div className="ph-kpi-sub">{sub}</div>}
      </div>
    </div>
  );
}

// ─── Badge categoría ──────────────────────────────────────────────────────────
function CategoriaBadge({ cat }) {
  const info = CATEGORIAS[cat] || { label: cat, color: '#64748b', icon: '📋' };
  return (
    <span className="ph-badge" style={{ background: info.color + '22', color: info.color }}>
      {info.icon} {info.label}
    </span>
  );
}

// ─── Tooltip personalizado para gráficas ──────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="ph-tooltip">
      <strong>{label}</strong>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </div>
      ))}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ProductividadHistorica({ user }) {
  const { success, error: showError } = useNotification();
  const [registroAEliminar, setRegistroAEliminar] = useState(null);

  // Filtros
  const [busqueda, setBusqueda]   = useState('');
  const [anioDesde, setAnioDesde] = useState('');
  const [anioHasta, setAnioHasta] = useState('');
  const [catFiltro, setCatFiltro] = useState('');
  const [progFiltro, setProgFiltro] = useState('');

  // Datos
  const [datos, setDatos]             = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [totalCount, setTotalCount]   = useState(0);
  const [page, setPage]               = useState(0);

  // Estadísticas generales (una sola vez)
  const [stats, setStats]             = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Vista
  const [activeTab, setActiveTab]     = useState('tabla'); // tabla | graficas
  const [chartData, setChartData]     = useState([]);

  // ── Cargar estadísticas generales ────────────────────────────────────────
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res  = await fetch('/api/productividad-historica?campos=categoria,puntos,anio,cedula');
      const data = res.ok ? await res.json() : [];

      const totalRegistros = data.length;
      const docentesUnicos = new Set(data.map(r => r.cedula).filter(Boolean)).size;
      const totalPuntos    = data.reduce((s, r) => s + (Number(r.puntos) || 0), 0);

      const porCat = {};
      data.forEach(r => { porCat[r.categoria] = (porCat[r.categoria] || 0) + 1; });

      const porAnio = {};
      data.forEach(r => {
        if (r.anio) {
          if (!porAnio[r.anio]) porAnio[r.anio] = { anio: r.anio, productos: 0, puntos: 0 };
          porAnio[r.anio].productos++;
          porAnio[r.anio].puntos += Number(r.puntos) || 0;
        }
      });
      const evolucion = Object.values(porAnio).sort((a, b) => a.anio - b.anio);
      setStats({ totalRegistros, docentesUnicos, totalPuntos, porCat, evolucion });
      setChartData(evolucion);
    } catch (e) {
      console.error('Error cargando stats:', e);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // ── Consulta filtrada ─────────────────────────────────────────────────────
  const buscar = useCallback(async (pageNum = 0) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (catFiltro)       params.set('categoria', catFiltro);
      if (progFiltro)      params.set('programa',  progFiltro);
      if (anioDesde)       params.set('desde',     anioDesde);
      if (anioHasta)       params.set('hasta',     anioHasta);
      if (busqueda.trim()) params.set('q',         busqueda.trim());
      params.set('limit',  PAGE_SIZE);
      params.set('offset', pageNum * PAGE_SIZE);

      const res  = await fetch(`/api/productividad-historica/buscar?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      setDatos(json.rows || []);
      setTotalCount(json.total || 0);
      setPage(pageNum);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [busqueda, catFiltro, progFiltro, anioDesde, anioHasta]);

  // Cargar al montar y cuando cambian filtros
  useEffect(() => { buscar(0); }, [catFiltro, progFiltro, anioDesde, anioHasta]);

  const handleBuscar = (e) => { e.preventDefault(); buscar(0); };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Programas únicos para el select (derivados de datos cargados + estadísticas)
  const programasUnicos = useMemo(() => {
    const set = new Set(datos.map(d => d.programa).filter(Boolean));
    return [...set].sort();
  }, [datos]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="ph-container">
      {/* ── Header ── */}
      <div className="ph-header">
        <div className="ph-header-left">
          <h1 className="ph-title">
            <span className="ph-title-icon">📊</span>
            Productividad Histórica
          </h1>
          <p className="ph-subtitle">
            Registro completo de la producción académica docente 1994–2025
          </p>
        </div>
        <div className="ph-header-badge">UQ · 31 años</div>
      </div>

      {/* ── KPIs ── */}
      {statsLoading ? (
        <div className="ph-kpi-grid">
          {[1,2,3,4].map(i => <div key={i} className="ph-kpi-skeleton" />)}
        </div>
      ) : stats && (
        <div className="ph-kpi-grid">
          <KpiCard
            icon="📋" label="Total registros" color="var(--uq-blue)"
            value={stats.totalRegistros.toLocaleString()}
            sub="1994–2025"
          />
          <KpiCard
            icon="👤" label="Docentes únicos" color="#7c3aed"
            value={stats.docentesUnicos.toLocaleString()}
            sub="con al menos 1 producto"
          />
          <KpiCard
            icon="⭐" label="Puntos acumulados" color="#d97706"
            value={stats.totalPuntos.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            sub="total histórico"
          />
          <KpiCard
            icon="📄" label="Revistas indexadas" color="#2563eb"
            value={(stats.porCat['revista_indexada'] || 0).toLocaleString()}
            sub={`de ${stats.totalRegistros.toLocaleString()} productos`}
          />
        </div>
      )}

      {/* ── Filtros ── */}
      <div className="ph-filtros-card">
        <form onSubmit={handleBuscar} className="ph-filtros-form">
          <div className="ph-filtros-row">
            <div className="ph-filtro-group ph-filtro-search">
              <label>🔍 Buscar docente</label>
              <input
                type="text"
                placeholder="Nombre o cédula..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="ph-input"
              />
            </div>

            <div className="ph-filtro-group">
              <label>📂 Categoría</label>
              <select value={catFiltro} onChange={e => setCatFiltro(e.target.value)} className="ph-select">
                <option value="">Todas</option>
                {Object.entries(CATEGORIAS).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
            </div>

            <div className="ph-filtro-group ph-filtro-anio">
              <label>📅 Año</label>
              <div className="ph-anio-row">
                <select value={anioDesde} onChange={e => setAnioDesde(e.target.value)} className="ph-select">
                  <option value="">Desde</option>
                  {AÑOS_RANGO.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <span className="ph-anio-sep">—</span>
                <select value={anioHasta} onChange={e => setAnioHasta(e.target.value)} className="ph-select">
                  <option value="">Hasta</option>
                  {AÑOS_RANGO.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <button type="submit" className="ph-btn-buscar" disabled={loading}>
              {loading ? '⏳' : '🔍'} Buscar
            </button>
          </div>
        </form>
      </div>

      {/* ── Tabs ── */}
      <div className="ph-tabs">
        <button
          className={`ph-tab ${activeTab === 'tabla' ? 'ph-tab-active' : ''}`}
          onClick={() => setActiveTab('tabla')}
        >
          📋 Tabla de resultados
          {totalCount > 0 && <span className="ph-tab-count">{totalCount.toLocaleString()}</span>}
        </button>
        <button
          className={`ph-tab ${activeTab === 'graficas' ? 'ph-tab-active' : ''}`}
          onClick={() => setActiveTab('graficas')}
        >
          📈 Gráficas históricas
        </button>
      </div>

      {/* ── TABLA ── */}
      {activeTab === 'tabla' && (
        <div className="ph-tabla-section">
          {error && (
            <div className="ph-error">
              ⚠️ Error: {error}
              <button onClick={() => buscar(page)} className="ph-btn-retry">Reintentar</button>
            </div>
          )}

          {loading ? (
            <div className="ph-loading">
              <div className="ph-spinner" />
              <span>Consultando base de datos...</span>
            </div>
          ) : datos.length === 0 ? (
            <div className="ph-empty">
              <span>🔎</span>
              <p>No se encontraron registros con los filtros aplicados.</p>
            </div>
          ) : (
            <>
              <div className="ph-tabla-info">
                Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} de{' '}
                <strong>{totalCount.toLocaleString()}</strong> registros
              </div>

              <div className="ph-tabla-wrapper">
                <table className="ph-tabla">
                  <thead>
                    <tr>
                      <th>Año</th>
                      <th>Docente</th>
                      <th>Cédula</th>
                      <th>Categoría</th>
                      <th>Título / Producto</th>
                      <th>Programa</th>
                      <th>Puntos</th>
                      <th>Resolución</th>
                      {user?.rol !== 'lectura' && <th style={{ textAlign: 'center' }}>Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {datos.map(r => (
                      <tr key={r.id} className="ph-tabla-row">
                        <td><span className="ph-anio-pill">{r.anio || '—'}</span></td>
                        <td className="ph-docente-cell">{r.docente || '—'}</td>
                        <td className="ph-cedula-cell">{r.cedula || '—'}</td>
                        <td><CategoriaBadge cat={r.categoria} /></td>
                        <td className="ph-titulo-cell" title={r.titulo}>
                          {r.titulo
                            ? r.titulo.length > 55 ? r.titulo.slice(0, 55) + '…' : r.titulo
                            : '—'}
                          {r.revista && (
                            <span className="ph-revista-sub">{r.revista}</span>
                          )}
                          {r.categoria_revista && (
                            <span className="ph-cat-rev-badge">{r.categoria_revista}</span>
                          )}
                        </td>
                        <td className="ph-prog-cell">{r.programa || '—'}</td>
                         <td>
                           <span className={`ph-puntos ${Number(r.puntos) > 0 ? 'ph-puntos-pos' : ''}`}>
                             {Number(r.puntos) > 0 ? Number(r.puntos).toLocaleString() : '—'}
                           </span>
                         </td>
                        <td className="ph-res-cell">
                          {r.numero_resolucion
                            ? <span className="ph-res-num">No. {r.numero_resolucion}</span>
                            : '—'}
                          {r.fecha_resolucion && (
                            <span className="ph-res-fecha">{r.fecha_resolucion}</span>
                          )}
                        </td>
                        {user?.rol !== 'lectura' && (
                          <td style={{ textAlign: 'center' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRegistroAEliminar(r);
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
                              title="Eliminar del histórico"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="ph-pagination">
                  <button
                    className="ph-page-btn"
                    onClick={() => buscar(0)}
                    disabled={page === 0}
                  >⏮</button>
                  <button
                    className="ph-page-btn"
                    onClick={() => buscar(page - 1)}
                    disabled={page === 0}
                  >◀</button>
                  <span className="ph-page-info">
                    Página {page + 1} de {totalPages}
                  </span>
                  <button
                    className="ph-page-btn"
                    onClick={() => buscar(page + 1)}
                    disabled={page >= totalPages - 1}
                  >▶</button>
                  <button
                    className="ph-page-btn"
                    onClick={() => buscar(totalPages - 1)}
                    disabled={page >= totalPages - 1}
                  >⏭</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── GRÁFICAS ── */}
      {activeTab === 'graficas' && stats && (
        <div className="ph-graficas-section">
          {/* Evolución anual de productos */}
          <div className="ph-grafica-card">
            <h3>📈 Evolución anual de productos aprobados (1994–2025)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.evolucion} margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="anio" tick={{ fontSize: 11 }} interval={2} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="productos" name="Productos" fill="var(--uq-blue)" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Puntos por año */}
          <div className="ph-grafica-card">
            <h3>⭐ Puntos acumulados por año</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={stats.evolucion} margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="anio" tick={{ fontSize: 11 }} interval={2} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone" dataKey="puntos" name="Puntos"
                  stroke="#d97706" strokeWidth={2} dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Distribución por categoría */}
          <div className="ph-grafica-card">
            <h3>📊 Distribución por categoría de producto</h3>
            <div className="ph-cat-grid">
              {Object.entries(stats.porCat)
                .sort(([,a],[,b]) => b - a)
                .map(([cat, count]) => {
                  const info = CATEGORIAS[cat] || { label: cat, color: '#64748b', icon: '📋' };
                  const pct  = Math.round((count / stats.totalRegistros) * 100);
                  return (
                    <div key={cat} className="ph-cat-item">
                      <div className="ph-cat-header">
                        <span>{info.icon} {info.label}</span>
                        <span className="ph-cat-count">{count.toLocaleString()}</span>
                      </div>
                      <div className="ph-cat-bar-bg">
                        <div
                          className="ph-cat-bar-fill"
                          style={{ width: `${pct}%`, background: info.color }}
                        />
                      </div>
                      <div className="ph-cat-pct">{pct}%</div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!registroAEliminar}
        title="Eliminar Registro Histórico"
        message={`¿Estás seguro de eliminar permanentemente el registro de ${registroAEliminar?.docente} (${registroAEliminar?.titulo}) del histórico 1994-2025? Esta acción es irreversible y afectará las estadísticas.`}
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        onConfirm={async () => {
          if (registroAEliminar) {
            const res = await deleteProductividadHistorica(registroAEliminar.id);
            if (res?.success) {
              success('Registro eliminado del histórico');
              setRegistroAEliminar(null);
              buscar(page);
              loadStats();
            } else {
              showError("No se pudo eliminar el registro del histórico.");
            }
          }
        }}
        onCancel={() => setRegistroAEliminar(null)}
      />
    </div>
  );
}
