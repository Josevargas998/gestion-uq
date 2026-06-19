import React, { useState, useEffect } from 'react';
import { fetchSolicitudes } from '../utils/api.js';
import { cleanText } from '../helpers.js';

/* ─── Estilos de impresión ─────────────────────────────────────────── */
const PRINT_CSS = `
@media print {
  body { background: #fff; margin: 0; padding: 0; }
  .hv-no-print, .sidebar, .topbar { display: none !important; }
  .shell-layout { display: block !important; height: auto !important; }
  .main-area { margin: 0 !important; padding: 0 !important; overflow: visible !important; height: auto !important; }
  #root { overflow: visible !important; height: auto !important; }
  @page { margin: 15mm 20mm; size: A4; }
}
`;

/* ─── Colores institucionales ──────────────────────────────────────── */
const UQ_GREEN   = '#006B3F';
const UQ_GREEN_H = '#5a7a3a'; /* cabecera tabla */
const GRAY_H     = '#b0b0b0'; /* cabecera sección */

/* ─── Logo SVG simplificado Universidad del Quindío ───────────────── */
const LogoUQ = () => (
  <div style={{ textAlign: 'center', lineHeight: 1 }}>
    <div style={{
      width: 70, height: 70, background: UQ_GREEN,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 4, margin: '0 auto',
    }}>
      <span style={{ color: '#fff', fontSize: 36, fontWeight: 900, fontFamily: 'serif' }}>Q</span>
    </div>
    <div style={{ fontSize: 8, color: UQ_GREEN, fontWeight: 800, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>UNIVERSIDAD<br />DEL QUINDÍO®</div>
    <div style={{ fontSize: 6, color: '#555', marginTop: 2 }}>Res.MEN 014915 – 02 AGO 2023<br />RENOVACIÓN ACREDITACIÓN</div>
  </div>
);

/* ─── Helpers ──────────────────────────────────────────────────────── */
function fmt(n) { return Number(n || 0).toFixed(1); }

const TIPO_LABEL = {
  articulo_indexado: 'ARTÍCULO INDEXADO (A1, A2, B, C)', articulo_no_indexado: 'ARTÍCULO NO INDEXADO',
  libro_texto: 'LIBRO DE TEXTO', libro_investigacion: 'LIBRO INVESTIGACIÓN',
  libro_ensayo: 'LIBRO ENSAYO', ponencia: 'PONENCIA', software: 'SOFTWARE',
  tesis: 'TESIS DIRIGIDA', obra_artistica: 'OBRA ARTÍSTICA', premio: 'PREMIO',
  produccion_tecnica: 'PRODUCCIÓN TÉCNICA', titulo: 'TÍTULO', patente: 'PATENTE',
  daa: 'DAA — DESEMPEÑO ACAD.-ADMVO.', ddd: 'DDD — DESEMPEÑO DESTACADO',
  exp_calificada: 'EXPERIENCIA CALIFICADA',
};

/* ─── Componente principal ─────────────────────────────────────────── */
export default function HojaVidaDocente({ doc, onBack }) {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchSolicitudes({ cedula: doc.cedula, paginar: false }).then(async (res) => {
      const filtered = Array.isArray(res.data) ? res.data : [];

      // Cargar archivo JSON estático de la hoja de vida para obtener los productos históricos
      try {
        const hvRes = await fetch(`/data/hv/${doc.cedula}.json`);
        if (hvRes.ok) {
          const hvData = await hvRes.json();
          if (hvData.productividad) {
            Object.entries(hvData.productividad).forEach(([cat, items]) => {
              if (Array.isArray(items)) {
                items.forEach(item => {
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
        console.error("Error cargando el JSON de productividad histórica en HojaVidaDocente:", err);
      }

      filtered.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
      setSolicitudes(filtered);
      setLoading(false);
    });
  }, [doc.cedula]);

  /* — Separar por categoría — */
  const titulosExp = solicitudes.filter(s =>
    ['titulo', 'experiencia_docente', 'experiencia_calificada', 'categoria_academica'].includes(s.tipo)
    || (s.tipo && s.tipo.startsWith('exp'))
  );
  const produccion = solicitudes.filter(s =>
    (s.estado === 'aprobado' || s.estado === 'rechazado' || s.estado === 'negado') &&
    !['titulo', 'experiencia_docente', 'experiencia_calificada', 'categoria_academica', 'ascenso'].includes(s.tipo) &&
    s.tipo && !s.tipo.startsWith('exp')
  );

  /* — Puntajes resumen — */
  const ptsTitulosExp  = Number(doc.ptsTitulosExp  || doc.pts_titulos_exp  || 0);
  const ptsProductividad = Number(doc.ptsAcumulados || doc.pts_acumulados  || 0);
  const ptsTotal       = Number(doc.ptsTotalSalarial || doc.pts_total_salarial || ptsTitulosExp + ptsProductividad);
  const tope           = Number(doc.tope || 0);
  const disponibles    = Math.max(0, tope - ptsProductividad);

  /* — Fecha y código — */
  const ahora    = new Date();
  const fechaStr = ahora.toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric' })
                        .replace(' de ', ' de ').replace(/^\w/, c => c.toUpperCase());
  const horaStr  = ahora.toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
  const codigo   = 'URLF31';

  const nombre    = doc.nombre || '';
  const cedula    = doc.cedula || '';
  const facultad  = doc.facultad || '';
  const programa  = doc.programa || '';
  const dedicacion = doc.dedicacion || '';
  const categoria  = doc.categoria || '';
  const fechaIngreso = doc.fechaIngreso || doc.fecha_ingreso || '';

  /* ── Estilos reutilizables ── */
  const st = {
    page:   { fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 11, color: '#1a1a1a', background: '#fff', maxWidth: 800, margin: '0 auto', padding: '24px 32px' },
    secHdr: { background: GRAY_H, textAlign: 'center', fontWeight: 800, fontSize: 11, padding: '6px 12px', border: '1px solid #999', textTransform: 'uppercase', letterSpacing: 0.5 },
    tblHdr: { background: UQ_GREEN_H, color: '#fff', fontWeight: 700, fontSize: 11, padding: '6px 8px', border: '1px solid #aaa', textAlign: 'left' },
    tblHdrC:{ background: UQ_GREEN_H, color: '#fff', fontWeight: 700, fontSize: 11, padding: '6px 8px', border: '1px solid #aaa', textAlign: 'center' },
    tblHdrR:{ background: UQ_GREEN_H, color: '#fff', fontWeight: 700, fontSize: 11, padding: '6px 8px', border: '1px solid #aaa', textAlign: 'right' },
    cell:   { padding: '4px 8px', border: '1px solid #ccc', fontSize: 10, verticalAlign: 'top' },
    cellR:  { padding: '4px 8px', border: '1px solid #ccc', fontSize: 10, verticalAlign: 'top', textAlign: 'right' },
    total:  { padding: '5px 8px', border: '1px solid #ccc', fontSize: 10, fontWeight: 800, textAlign: 'right', background: '#f5f5f5' },
    totalL: { padding: '5px 8px', border: '1px solid #ccc', fontSize: 10, fontWeight: 800, background: '#f5f5f5', textAlign: 'right' },
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      <style>{PRINT_CSS}</style>

      {/* ── Barra de acciones (solo pantalla) ── */}
      <div className="hv-no-print" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 24px', background: '#f5f5f5', borderBottom: '1px solid #ddd', alignItems: 'center' }}>
        <button onClick={onBack} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #ddd', background: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>
          ← Volver al listado
        </button>
        <div style={{ fontWeight: 800, fontSize: 14, color: UQ_GREEN }}>📄 Vista previa — Hoja de Vida Puntos Docentes</div>
        <button onClick={() => window.print()} style={{
          padding: '8px 22px', borderRadius: 8, border: 'none', background: UQ_GREEN, color: '#fff',
          fontSize: 13, cursor: 'pointer', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6,
          boxShadow: '0 2px 8px rgba(0,107,63,.35)'
        }}>
          🖨️ Imprimir / Guardar PDF
        </button>
      </div>

      {/* ══════════════════════ DOCUMENTO IMPRIMIBLE ══════════════════════ */}
      <div id="hv-print-root" style={{ background: '#fff', padding: '0 0 40px' }}>
        <div style={st.page}>

          {/* ── ENCABEZADO ── */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            {/* Logo */}
            <div style={{ minWidth: 90 }}><LogoUQ /></div>

            {/* Título centrado */}
            <div style={{ flex: 1, textAlign: 'center', paddingTop: 10 }}>
              <div style={{ fontSize: 16, fontWeight: 900, textTransform: 'uppercase' }}>UNIVERSIDAD DEL QUINDÍO</div>
              <div style={{ fontSize: 14, fontWeight: 900, textTransform: 'uppercase' }}>HOJA DE VIDA PUNTOS DOCENTES</div>
            </div>

            {/* Código y fecha */}
            <div style={{ textAlign: 'right', fontSize: 10, minWidth: 150, paddingTop: 10 }}>
              <div style={{ fontWeight: 700 }}>{codigo}</div>
              <div>{`${fechaStr} ${horaStr}`}</div>
            </div>
          </div>

          <div style={{ borderTop: '2px solid #ccc', marginBottom: 16 }} />

          {/* ── DATOS GENERALES ── */}
          <div style={st.secHdr}>DATOS GENERALES</div>
          <div style={{ border: '1px solid #ccc', borderTop: 'none', padding: '10px 14px', marginBottom: 20 }}>
            {[
              ['Identificación:',  cedula],
              ['Nombre:',          nombre],
              ['Institución:',     'UNIVERSIDAD DEL QUINDÍO'],
              ['Dependencia:',     facultad],
              ['Programa:',        programa],
              ['Clasificación:',   'DOCENTE DE PLANTA'],
              ['Dedicación:',      dedicacion],
              ['Categoría Actual:', categoria],
              ['Fecha Inicio:',    fechaIngreso],
            ].map(([lbl, val]) => (
              <div key={lbl} style={{ display: 'flex', marginBottom: 3, lineHeight: 1.5 }}>
                <span style={{ fontWeight: 800, minWidth: 140, fontSize: 11 }}>{lbl}</span>
                <span style={{ fontSize: 11 }}>{val || '—'}</span>
              </div>
            ))}
          </div>

          {/* ── TÍTULOS, CATEGORIZACIÓN Y EXPERIENCIA ── */}
          <div style={st.secHdr}>TÍTULOS, CATEGORIZACIÓN Y EXPERIENCIA DOCENTE</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
            <thead>
              <tr>
                <th style={{ ...st.tblHdr, width: '22%' }}>Tipo</th>
                <th style={{ ...st.tblHdr, width: '42%' }}>Descripción</th>
                <th style={{ ...st.tblHdrC, width: '22%' }}>Resolución</th>
                <th style={{ ...st.tblHdrR, width: '14%' }}>Puntos</th>
              </tr>
            </thead>
            <tbody>
              {titulosExp.length > 0 ? titulosExp.map((s, i) => (
                <tr key={s.id || i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={st.cell}>{(TIPO_LABEL[s.tipo] || (s.tipo||'').replace(/_/g,' ')).toUpperCase()}</td>
                  <td style={st.cell}>{(s.titulo || '').toUpperCase()}</td>
                  <td style={{ ...st.cell, textAlign: 'center' }}>{s.resolucion || s.acta_ciarp || '—'}</td>
                  <td style={st.cellR}>{fmt(s.pts_asig)}</td>
                </tr>
              )) : (
                /* Si no hay registros individuales, mostramos los títulos registrados en la base de datos */
                <>
                  {doc.titulosAcademicos && doc.titulosAcademicos.length > 0 ? (
                    doc.titulosAcademicos.map((t, i) => (
                      <tr key={i}>
                        <td style={st.cell}>TÍTULO ACADÉMICO</td>
                        <td style={st.cell}>{t.toUpperCase()}</td>
                        <td style={{ ...st.cell, textAlign: 'center' }}>—</td>
                        <td style={st.cellR}>—</td>
                      </tr>
                    ))
                  ) : doc.escolaridad ? (
                    <tr>
                      <td style={st.cell}>TÍTULO ACADÉMICO</td>
                      <td style={st.cell}>{doc.escolaridad.toUpperCase()}</td>
                      <td style={{ ...st.cell, textAlign: 'center' }}>—</td>
                      <td style={st.cellR}>—</td>
                    </tr>
                  ) : (
                    <tr><td colSpan={4} style={{ ...st.cell, color: '#aaa', textAlign: 'center' }}>Sin registros de títulos y experiencia</td></tr>
                  )}
                </>
              )}
              <tr>
                <td colSpan={3} style={st.totalL}>Total Puntos</td>
                <td style={st.total}>{fmt(ptsTitulosExp)}</td>
              </tr>
            </tbody>
          </table>

          {/* ── PRODUCCIÓN ACADÉMICA ── */}
          <div style={st.secHdr}>PRODUCCIÓN ACADÉMICA</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
            <thead>
              <tr>
                <th style={{ ...st.tblHdr, width: '20%' }}>Tipo</th>
                <th style={{ ...st.tblHdr, width: '46%' }}>Título del Proyecto</th>
                <th style={{ ...st.tblHdrC, width: '20%' }}>Resolución</th>
                <th style={{ ...st.tblHdrR, width: '14%' }}>Puntos</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ ...st.cell, textAlign: 'center', color: '#888' }}>Cargando...</td></tr>
              ) : produccion.length > 0 ? produccion.map((s, i) => {
                const isRechazado = s.estado === 'rechazado' || s.estado === 'negado';
                return (
                  <tr key={s.id || i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', color: isRechazado ? '#777' : '#1a1a1a' }}>
                    <td style={st.cell}>{(TIPO_LABEL[s.tipo] || (s.tipo||'').replace(/_/g,' ')).toUpperCase()}</td>
                    <td style={st.cell}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ textDecoration: isRechazado ? 'line-through' : 'none' }}>
                          {(s.titulo || '').toUpperCase()}
                        </span>
                        {isRechazado && (
                          <span style={{
                            background: '#fee2e2', color: '#991b1b', fontSize: 8, fontWeight: 800,
                            padding: '1px 4px', borderRadius: 3, border: '1px solid #fca5a5',
                            textTransform: 'uppercase', verticalAlign: 'middle', display: 'inline-block'
                          }}>
                            Rechazado
                          </span>
                        )}
                      </div>
                      {s.revista && <div style={{ fontSize: 9, color: isRechazado ? '#999' : '#666', marginTop: 1 }}>{s.revista}</div>}
                    </td>
                    <td style={{ ...st.cell, textAlign: 'center' }}>{s.resolucion || s.acta_ciarp || '—'}</td>
                    <td style={{ ...st.cellR, color: isRechazado ? '#b91c1c' : '#1a1a1a', fontWeight: isRechazado ? 'normal' : 'bold' }}>
                      {isRechazado ? '0.0' : fmt(s.pts_asig)}
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={4} style={{ ...st.cell, color: '#aaa', textAlign: 'center' }}>Sin registros de producción académica aprobada</td></tr>
              )}
              <tr>
                <td colSpan={3} style={st.totalL}>Total Puntos</td>
                <td style={st.total}>{fmt(ptsProductividad)}</td>
              </tr>
            </tbody>
          </table>

          {/* ── BARRA OSCURA ── */}
          <div style={{ background: '#3a3a3a', height: 18, marginBottom: 20, borderRadius: 2 }} />

          {/* ── RESUMEN ── */}
          <div style={{ border: '2px solid #555', borderRadius: 2, overflow: 'hidden', marginBottom: 28 }}>
            <div style={{ ...st.secHdr, background: '#d0d0d0', border: 'none', padding: '8px 12px' }}>
              RESUMEN HOJA DE VIDA PUNTOS DOCENTES
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  ['PUNTOS ACUMULADOS POR TÍTULOS, CATEGORIZACIÓN Y EXPERIENCIA DOCENTE', fmt(ptsTitulosExp)],
                  ['PUNTOS ACUMULADOS POR PRODUCCIÓN ACADÉMICA',                           fmt(ptsProductividad)],
                  ['TOTAL PUNTOS SALARIALES',                                              fmt(ptsTotal)],
                ].map(([lbl, val], i) => (
                  <tr key={i} style={{ borderTop: i > 0 ? '1px solid #ccc' : 'none' }}>
                    <td style={{ padding: '6px 14px', fontWeight: 800, fontSize: 11 }}>{lbl}</td>
                    <td style={{ padding: '6px 14px', fontWeight: 800, fontSize: 12, textAlign: 'right', whiteSpace: 'nowrap' }}>{val}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid #888' }}>
                  <td style={{ padding: '6px 14px', fontWeight: 800, fontSize: 11 }}>TOPE POR CATEGORÍA</td>
                  <td style={{ padding: '6px 14px', fontWeight: 800, fontSize: 12, textAlign: 'right' }}>{tope}</td>
                </tr>
                <tr style={{ borderTop: '1px solid #ccc' }}>
                  <td style={{ padding: '6px 14px', fontWeight: 800, fontSize: 11 }}>PUNTOS DISPONIBLES</td>
                  <td style={{ padding: '6px 14px', fontWeight: 800, fontSize: 12, textAlign: 'right', color: disponibles <= 0 ? '#dc2626' : UQ_GREEN }}>{fmt(disponibles)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── FIRMA ── */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
            <div style={{ textAlign: 'center', minWidth: 280 }}>
              <div style={{ borderTop: '1.5px solid #333', marginBottom: 6 }} />
              <div style={{ fontWeight: 800, fontSize: 12 }}>Jefe Oficina de Asuntos Profesorales</div>
              <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>Universidad del Quindío</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
