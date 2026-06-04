import React from 'react';
import { BookOpen, FileText, Monitor, Lightbulb, Trophy, Star, PenTool, Database } from 'lucide-react';

/**
 * DatosProductoPanel
 * Componente que renderiza formularios dinámicos según el tipo de producto
 * para recopilar todos los metadatos necesarios en la exportación al CIARP.
 */
const InputField = ({ label, name, type = 'text', placeholder = '', datos, onChange, fallback = '' }) => (
  <div style={{ marginBottom: 12 }}>
    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>
    <input
      type={type}
      name={name}
      value={datos[name] !== undefined ? datos[name] : fallback}
      onChange={onChange}
      placeholder={placeholder}
      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}
    />
  </div>
);

export default function DatosProductoPanel({ sol = {}, tipo, datos = {}, onChange }) {
  // Manejador para campos individuales
  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange({ ...datos, [name]: value });
  };

  // Manejador para lista de coautores
  const handleAddCoautor = () => {
    const coautores = datos.coautores_uq || [];
    onChange({ ...datos, coautores_uq: [...coautores, { cedula: '', nombre: '', universidad: 'Universidad del Quindío' }] });
  };
  const handleCoautorChange = (idx, field, val) => {
    const coautores = [...(datos.coautores_uq || [])];
    coautores[idx] = { ...coautores[idx], [field]: val };
    onChange({ ...datos, coautores_uq: coautores });
  };
  const handleRemoveCoautor = (idx) => {
    const coautores = datos.coautores_uq.filter((_, i) => i !== idx);
    onChange({ ...datos, coautores_uq: coautores });
  };

  // Helper para renderizar un campo de texto genérico
  

  const renderFormulario = () => {
    const cat = (tipo || '').toLowerCase();

    // ── ARTÍCULOS EN REVISTAS ──
    if (cat.includes('revista') || cat.includes('articulo')) {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <InputField datos={datos} onChange={handleChange} label="Modalidad" name="modalidad" placeholder="Full paper, Short paper..." />
          <InputField datos={datos} onChange={handleChange} label="Tipo" name="tipo_pub" placeholder="Nacional / Internacional" />
          <InputField datos={datos} onChange={handleChange} label="País de la Revista" name="pais_revista" placeholder="País" />
          <InputField datos={datos} onChange={handleChange} label="ISSN de la Revista" name="issn" placeholder="Ej: 1234-5678" />
          <InputField datos={datos} onChange={handleChange} label="URL Publindex / Indexación" name="url_publindex" />
          <InputField datos={datos} onChange={handleChange} label="Categoría de Revista" name="categoria_revista" placeholder="A1, A2, B, C, No Indexada" />
          <InputField datos={datos} onChange={handleChange} label="Editorial o Institución" name="editorial" />
          <InputField datos={datos} onChange={handleChange} label="Total Autores del Artículo" name="num_autores" type="number" />
          <InputField datos={datos} onChange={handleChange} label="Fecha Recibido" name="fecha_recibido" type="date" />
          <InputField datos={datos} onChange={handleChange} label="Fecha Aprobado" name="fecha_aprobado" type="date" />
          <InputField datos={datos} onChange={handleChange} label="Fecha de Publicación" name="fecha_publicacion" type="date" />
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Subtipo de Artículo (Para Cálculo)</label>
            <select
              name="subtipo_articulo"
              value={datos.subtipo_articulo || 'completo'}
              onChange={handleChange}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: '#fff' }}
            >
              <option value="completo">Artículo Completo (100% pts)</option>
              <option value="comunicacion_corta">Comunicación Corta (60% pts)</option>
              <option value="reporte_caso">Reporte de Caso / Carta al Editor (30% pts)</option>
            </select>
          </div>
        </div>
      );
    }

    // ── LIBROS (Ensayo, Resultado Inv, Texto) ──
    if (cat.includes('libro') || cat === 'ensayo') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <InputField datos={datos} onChange={handleChange} label="Título Exacto del Libro" name="titulo_libro" />
          </div>
          <InputField datos={datos} onChange={handleChange} label="ISBN" name="isbn" placeholder="Ej: 978-3-16-148410-0" />
          <InputField datos={datos} onChange={handleChange} label="Editorial" name="editorial" />
          <InputField datos={datos} onChange={handleChange} label="Fecha de Publicación" name="fecha_publicacion" type="date" />
          <InputField datos={datos} onChange={handleChange} label="Total Autores" name="num_autores" type="number" />
          {cat === 'libro_texto' && (
            <div style={{ gridColumn: '1 / -1' }}>
              <InputField datos={datos} onChange={handleChange} label="Espacio Académico (Asignatura)" name="espacio_academico" />
            </div>
          )}
          {cat === 'libro_investigacion' && (
            <div style={{ gridColumn: '1 / -1' }}>
              <InputField datos={datos} onChange={handleChange} label="Observaciones Adicionales" name="observaciones" placeholder="Ej. Puntos pendientes por comisión..." />
            </div>
          )}
        </div>
      );
    }

    // ── PATENTES ──
    if (cat === 'patente') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <InputField datos={datos} onChange={handleChange} label="Nombre Exacto del Producto Patentado" name="nombre_producto" />
          </div>
          <InputField datos={datos} onChange={handleChange} label="Tipo de Producto" name="tipo_producto" placeholder="Patente de Invención, Modelo de Utilidad..." />
          <InputField datos={datos} onChange={handleChange} label="Tipo de Patente" name="tipo_patente" placeholder="De producto / De proceso" />
          <InputField datos={datos} onChange={handleChange} label="Número de Registro / Resolución" name="numero_registro" />
          <InputField datos={datos} onChange={handleChange} label="Entidad Registradora (ej. SIC)" name="entidad_registro" />
          <InputField datos={datos} onChange={handleChange} label="Fecha de Concesión / Aprobación" name="fecha_aprobacion" type="date" />
          <InputField datos={datos} onChange={handleChange} label="Vigencia (Años)" name="vigencia_anios" type="number" />
          <InputField datos={datos} onChange={handleChange} label="Total Inventores (Autores)" name="num_autores" type="number" />
        </div>
      );
    }

    // ── OBRAS ARTÍSTICAS ──
    if (cat === 'obra_artistica') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <InputField datos={datos} onChange={handleChange} label="Título de la Obra" name="nombre_obra" />
          </div>
          <InputField datos={datos} onChange={handleChange} label="Tipo de Obra" name="tipo_obra" placeholder="Artes plásticas, música, teatro..." />
          <InputField datos={datos} onChange={handleChange} label="Reconocimiento" name="reconocimiento" placeholder="Creación original individual/colectiva..." />
          <InputField datos={datos} onChange={handleChange} label="Impacto" name="impacto" placeholder="Local, regional, nacional, internacional" />
          <InputField datos={datos} onChange={handleChange} label="Técnica o Medio Utilizado" name="tecnica" />
          <InputField datos={datos} onChange={handleChange} label="Fecha de Creación" name="fecha_creacion" type="date" />
          <InputField datos={datos} onChange={handleChange} label="Fecha de Exposición Pública" name="fecha_exposicion" type="date" />
          <div style={{ gridColumn: '1 / -1' }}>
            <InputField datos={datos} onChange={handleChange} label="Observaciones (Topes o Restricciones)" name="observaciones" />
          </div>
        </div>
      );
    }

    // ── PRODUCCIÓN TÉCNICA ──
    if (cat === 'produccion_tecnica') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <InputField datos={datos} onChange={handleChange} label="Nombre Exacto de la Producción" name="nombre_produccion" />
          </div>
          <InputField datos={datos} onChange={handleChange} label="Tipo de Producción" name="tipo_produccion" placeholder="Adaptación tecnológica, diseño industrial..." />
          <InputField datos={datos} onChange={handleChange} label="Año de Publicación o Registro" name="anio_publicacion" type="number" />
          <div style={{ gridColumn: '1 / -1' }}>
            <InputField datos={datos} onChange={handleChange} label="Observaciones Adicionales" name="observaciones" />
          </div>
        </div>
      );
    }

    // ── SOFTWARE ──
    if (cat === 'software') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <InputField datos={datos} onChange={handleChange} label="Nombre Exacto del Software" name="nombre_software" />
          </div>
          <InputField datos={datos} onChange={handleChange} label="Registro DNDA" name="numero_registro_dnda" placeholder="Número de registro de derechos de autor" />
          <InputField datos={datos} onChange={handleChange} label="Año de Publicación/Registro" name="anio_publicacion" type="number" />
          <div style={{ gridColumn: '1 / -1' }}>
            <InputField datos={datos} onChange={handleChange} label="Observaciones (Tipo de software)" name="observaciones" />
          </div>
        </div>
      );
    }

    // ── PREMIOS Y DISTINCIONES ──
    if (cat === 'premio') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <InputField datos={datos} onChange={handleChange} label="Nombre del Trabajo Premiado" name="titulo_trabajo" />
          </div>
          <InputField datos={datos} onChange={handleChange} label="Nombre Exacto del Premio" name="nombre_premio" />
          <InputField datos={datos} onChange={handleChange} label="Institución que Concedió el Premio" name="entidad_otorga" />
          <InputField datos={datos} onChange={handleChange} label="Fecha del Premio" name="fecha_premio" type="date" />
          <div style={{ gridColumn: '1 / -1' }}>
            <InputField datos={datos} onChange={handleChange} label="Observaciones (Condiciones)" name="observaciones" />
          </div>
        </div>
      );
    }

    // ── PRODUCCIÓN AUDIOVISUAL / VIDEOS ──
    if (cat === 'video' || cat === 'audiovisual') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <InputField datos={datos} onChange={handleChange} label="Nombre del Producto Audiovisual" name="nombre_video" />
          </div>
          <InputField datos={datos} onChange={handleChange} label="Impacto" name="impacto" placeholder="Local, regional, nacional, internacional" />
        </div>
      );
    }

    // ── RECONOCIMIENTOS CIARP (DAA, DDD, Exp_Calificada) ──
    if (['daa', 'ddd', 'exp_calificada'].includes(cat)) {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <InputField datos={datos} onChange={handleChange} label="Calificación Última Evaluación" name="resultado_evaluacion" type="number" placeholder="Ej: 4.8" />
          <InputField datos={datos} onChange={handleChange} label="Período Evaluado" name="fecha_ultima_evaluacion" placeholder="Ej: II/2025" />
          <InputField datos={datos} onChange={handleChange} label="Estado" name="estado" placeholder="Activo / Académico-Administrativo" />
          {['daa', 'exp_calificada'].includes(cat) && (
            <div style={{ gridColumn: '1 / -1' }}>
              <InputField datos={datos} onChange={handleChange} label="Observaciones (Resolución, Fechas, Cargo)" name="observaciones" />
            </div>
          )}
        </div>
      );
    }

    // ── ASCENSO DE CATEGORÍA ──
    if (cat === 'ascenso') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <InputField datos={datos} onChange={handleChange} label="Resolución / Acta de Aprobación" name="res_aprobacion" />
          <InputField datos={datos} onChange={handleChange} label="Fecha de Ascenso" name="fecha_ascenso" type="date" />
          <InputField datos={datos} onChange={handleChange} label="Categoría Aprobada" name="categoria_aprobada" placeholder="Ej: Asociado, Titular" />
        </div>
      );
    }

    // ── NUEVOS TÍTULOS ACADÉMICOS ──
    if (cat.includes('titulo')) {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <InputField datos={datos} onChange={handleChange} label="Universidad que Otorga" name="universidad_otorga" />
          <InputField datos={datos} onChange={handleChange} label="Fecha de Grado" name="fecha_graduacion" type="date" />
          <div style={{ gridColumn: '1 / -1' }}>
            <InputField datos={datos} onChange={handleChange} label="Acto de Convalidación (Para Univ. Extranjeras)" name="acto_convalidacion" placeholder="N/A o número de resolución" />
          </div>
        </div>
      );
    }

    // ── PONENCIAS ──
    if (cat === 'ponencia') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <InputField datos={datos} onChange={handleChange} label="Número ISBN/ISSN" name="isbn_issn" placeholder="Ej: 978-3-16" />
          <InputField datos={datos} onChange={handleChange} label="Nombre del Evento" name="nombre_evento" />
          <InputField datos={datos} onChange={handleChange} label="Lugar y Fecha del Evento" name="lugar_fecha_evento" placeholder="Ej: Bogotá, 15 de Mayo 2026" />
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Tipo de Evento</label>
            <select
              name="tipo_evento"
              value={datos.tipo_evento || 'Nacional'}
              onChange={handleChange}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: '#fff' }}
            >
              <option value="Nacional">Nacional</option>
              <option value="Internacional">Internacional</option>
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <InputField datos={datos} onChange={handleChange} label="Universidades Participantes en la Ponencia" name="universidades_participantes" placeholder="Ej: U. Nacional, U. de Antioquia" />
          </div>
        </div>
      );
    }

    // ── DIRECCIÓN DE TESIS ──
    if (cat === 'direccion_tesis') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <InputField datos={datos} onChange={handleChange} label="Nombre del Trabajo Dirigido" name="titulo_trabajo" />
          </div>
          <InputField datos={datos} onChange={handleChange} label="Estudiante Dirigido" name="estudiante_dirigido" />
          <InputField datos={datos} onChange={handleChange} label="Título Optado por el Estudiante" name="titulo_estudiante" />
          <InputField datos={datos} onChange={handleChange} label="Programa / Universidad" name="programa_universidad" />
          <InputField datos={datos} onChange={handleChange} label="Fecha Sustentación" name="fecha_sustentacion" type="date" />
        </div>
      );
    }

    // ── ESTUDIOS POSDOCTORALES ──
    if (cat === 'postdoctorado') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <InputField datos={datos} onChange={handleChange} label="Categoría" name="categoria_docente" placeholder="Ej: Asociado, Titular" />
          <div style={{ gridColumn: '1 / -1' }}>
            <InputField datos={datos} onChange={handleChange} label="Título de Doctorado" name="titulo_doctorado" />
          </div>
          <InputField datos={datos} onChange={handleChange} label="Entidad que Certifica" name="entidad_certifica" />
          <InputField datos={datos} onChange={handleChange} label="Periodo de Duración (meses)" name="duracion_meses" type="number" />
          <InputField datos={datos} onChange={handleChange} label="Fechas de Inicio y Finalización" name="fechas_proyecto" placeholder="Ej: Ene 2025 - Mar 2026" />
        </div>
      );
    }

    return (
      <div style={{ padding: 12, background: '#f8f9fa', borderRadius: 8, fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
        No hay campos adicionales específicos configurados para este tipo de producto.
      </div>
    );
  };

  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 32, height: 32, background: 'var(--uq-blue-lt)', color: 'var(--uq-blue)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Database size={18} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Metadatos del Producto (CIARP)</h3>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>Estos datos se exportarán directamente al reporte de Excel.</p>
        </div>
      </div>

      {renderFormulario()}

      {/* ── SECCIÓN CO-AUTORES UQ ── */}
      <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px dashed var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Co-autores UQ (Generan fila adicional en Excel)</label>
          <button onClick={handleAddCoautor} style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            + Añadir Co-autor
          </button>
        </div>
        
        {(!datos.coautores_uq || datos.coautores_uq.length === 0) ? (
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>No hay co-autores adicionales registrados.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {datos.coautores_uq.map((co, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Cédula"
                  value={co.cedula || ''}
                  onChange={e => handleCoautorChange(idx, 'cedula', e.target.value)}
                  style={{ width: 120, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12 }}
                />
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={co.nombre || ''}
                  onChange={e => handleCoautorChange(idx, 'nombre', e.target.value)}
                  style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12 }}
                />
                <button onClick={() => handleRemoveCoautor(idx)} style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 6 }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
