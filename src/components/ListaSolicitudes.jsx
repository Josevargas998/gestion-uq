import React, { useState } from 'react';
import { ETAPAS, TIPOS } from '../data.js';
import { SolRow } from './shared.jsx';
import { generarDocumento } from '../utils/docGenerator.jsx';
import { useSolicitudes } from '../context/SolicitudesContext.jsx';
import { useNotification } from '../context/NotificationContext.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';

// Normaliza tipos viejos de BD a tipos nuevos unificados
const TIPO_NORMALIZE = {
  'revista_a1':         'articulo_indexado',
  'revista_a2':         'articulo_indexado',
  'revista_b':          'articulo_indexado',
  'revista_indexada':   'articulo_indexado',
  'revista_no_indexada':'articulo_no_indexado',
  'titulo':             'titulo_academico',
  'tesis':              'direccion_tesis',
  'postdoctorado':      'posdoctorado',
};

function normTipo(tipo) {
  return TIPO_NORMALIZE[tipo] || tipo;
}

// Derive unique product-type tabs from live solicitudes
function getTipoTabs(solicitudes) {
  const seen = new Set();
  const tabs = [{ key: '', label: 'Todos' }];
  solicitudes.forEach(s => {
    const tipoKey = normTipo(s.tipo);
    if (tipoKey && !seen.has(tipoKey)) {
      seen.add(tipoKey);
      const tipo = TIPOS[tipoKey];
      tabs.push({ key: tipoKey, label: tipo ? (tipo.icon ? `${tipo.icon} ${tipo.label}` : tipo.label) : tipoKey });
    }
  });
  return tabs;
}

export default function ListaSolicitudes({ solicitudes, onSelect, user, setNav, titulo = 'Solicitudes' }) {
  const { solicitudesProductividad, eliminar } = useSolicitudes();
  const { success, error: showError } = useNotification ? useNotification() : { success: console.log, error: console.error }; // fallback if needed, but App handles notifications
  const [filtro,      setFiltro]      = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState('');
  const [tabTipo,     setTabTipo]     = useState('');   // '' = all
  const [currentPage, setCurrentPage] = useState(1);
  const [solicitudAEliminar, setSolicitudAEliminar] = useState(null);
  const itemsPerPage = 50;

  const tipoTabs = getTipoTabs(solicitudesProductividad && solicitudesProductividad.length > 0 ? solicitudesProductividad : solicitudes);

  const filtered = solicitudes.filter(s => {
    const q = filtro.toLowerCase();
    // Filtro especial CIARP: archivadas aprobadas con acta de CIARP
    const matchEtapa = !filtroEtapa
      || (filtroEtapa === '__ciarp_aprobado__'
          ? (s.etapa === 'archivada' && s.estado === 'aprobado' && s.acta_ciarp)
          : s.etapa === filtroEtapa);
    return (
      (!q || s.docente.toLowerCase().includes(q) || s.titulo.toLowerCase().includes(q) || s.id.toLowerCase().includes(q))
      && matchEtapa
      && (!tabTipo || normTipo(s.tipo) === tabTipo)
    );
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginatedItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleFiltroChange = (val) => {
    setFiltro(val);
    setCurrentPage(1);
  };

  const handleFiltroEtapaChange = (val) => {
    setFiltroEtapa(val);
    setCurrentPage(1);
  };

  const handleTabTipoChange = (val) => {
    setTabTipo(val);
    setCurrentPage(1);
  };

  const handleGenerarResoluciones = () => {
    const validas = filtered.filter(s => ['resolucion', 'juridica', 'rectoria', 'archivada', 'acta', 'ciarp'].includes(s.etapa));
    const agrupadas = validas.reduce((acc, s) => {
      const p = s.programa || 'Sin Programa';
      if (!acc[p]) acc[p] = [];
      acc[p].push(s);
      return acc;
    }, {});
    const grupos = Object.keys(agrupadas).map(programa => ({ programa, solicitudes: agrupadas[programa] }));
    if (grupos.length === 0) return alert("No hay solicitudes válidas para generar resoluciones.");
    generarDocumento('resolucion_programa', grupos);
  };

  const showingStart = filtered.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const showingEnd = Math.min(currentPage * itemsPerPage, filtered.length);

  return (
    <div style={{ padding: '24px 28px', fontFamily: "'Nunito',sans-serif" }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1a1a1a', margin: 0 }}>{titulo}</h2>
          <p style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
            Mostrando {showingStart} - {showingEnd} de {filtered.length} (Total: {solicitudes.length}) ·
            {solicitudes.filter(s => s.estado === 'en_proceso').length} en proceso ·
            {solicitudes.filter(s => s.estado === 'aprobado').length} aprobadas
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {titulo === 'Resoluciones' && (
            <button className="btn btn-blue" onClick={handleGenerarResoluciones}>📄 Generar Resoluciones</button>
          )}
          {(user?.rol === 'admin' || user?.rol === 'asistente' || user?.rol === 'lectura') && (
            <button className="btn btn-p" onClick={() => setNav('nueva')}>➕ Nueva Solicitud</button>
          )}
        </div>
      </div>

      {/* TABS BY PRODUCT TYPE */}
      {tipoTabs.length > 2 && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap', borderBottom: '2px solid var(--border)', paddingBottom: 0 }}>
          {tipoTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleTabTipoChange(tab.key)}
              style={{
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: tabTipo === tab.key ? 700 : 400,
                background: tabTipo === tab.key ? 'var(--g)' : 'transparent',
                color: tabTipo === tab.key ? '#fff' : 'var(--text2)',
                border: 'none',
                borderBottom: tabTipo === tab.key ? '3px solid var(--g)' : '3px solid transparent',
                cursor: 'pointer',
                borderRadius: '6px 6px 0 0',
                transition: 'all .15s',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* FILTERS */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input placeholder="Buscar por docente, título, número..."
          value={filtro} onChange={e => handleFiltroChange(e.target.value)} style={{ maxWidth: 360 }} />
        <select value={filtroEtapa} onChange={e => handleFiltroEtapaChange(e.target.value)} style={{ width: 220 }}>
          <option value="">Todas las etapas</option>
          <option value="__ciarp_aprobado__">✅ Aprobadas (con Acta CIARP)</option>
          {ETAPAS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
        </select>
      </div>

      {/* TABLE */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'linear-gradient(135deg,#006B3F,#004d2d)', color: '#fff' }}>
              {['N° Solicitud', 'Docente', 'Producto', 'Etapa', 'Puntos', user?.rol !== 'lectura' ? 'Acciones' : null].filter(Boolean).map((c, i) => (
                <th key={c} style={{ padding: '11px 12px', textAlign: i === 4 ? 'right' : (c === 'Acciones' ? 'center' : 'left'), fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap' }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>{paginatedItems.map(s => <SolRow key={s.id} s={s} onClick={() => onSelect(s)} onEliminar={setSolicitudAEliminar} user={user} />)}</tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: '#aaa' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>No se encontraron solicitudes</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Intenta cambiar los filtros o la búsqueda</div>
          </div>
        )}
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
              setSolicitudAEliminar(null);
            } else {
              alert("No se pudo eliminar el producto.");
            }
          }
        }}
        onCancel={() => setSolicitudAEliminar(null)}
      />

      {/* PAGINATION CONTROLS */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 15, marginTop: 20 }}>
          <button 
            className="btn btn-secondary" 
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            ← Anterior
          </button>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#444' }}>
            Página {currentPage} de {totalPages}
          </span>
          <button 
            className="btn btn-secondary" 
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
