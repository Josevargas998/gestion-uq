import React, { useMemo, useState } from 'react';

export default function BancoPares({ solicitudes }) {
  const [busqueda, setBusqueda] = useState('');
  
  // Extraer todos los pares de todas las solicitudes
  const paresData = useMemo(() => {
    const map = new Map(); // key: nombre (normalizado), value: objeto consolidado

    solicitudes.forEach(sol => {
      if (!sol.pares_ext || !Array.isArray(sol.pares_ext)) return;
      
      sol.pares_ext.forEach((par, idx) => {
        if (!par.nombre || par.nombre.trim() === '') return;
        
        const nombreNorm = par.nombre.trim().toUpperCase();
        
        if (!map.has(nombreNorm)) {
          map.set(nombreNorm, {
            nombre: par.nombre.trim().toUpperCase(),
            perfil: par.perfil || '',
            institucion: par.univ || '',
            cvlac_url: par.cvlac_url || '',
            evaluaciones: []
          });
        }
        
        // Agregar esta evaluación al historial de este par
        const dataPar = map.get(nombreNorm);
        
        // Actualizar perfil si el nuevo tiene más información
        if (par.perfil && par.perfil.length > dataPar.perfil.length) dataPar.perfil = par.perfil;
        if (par.univ && par.univ.length > dataPar.institucion.length) dataPar.institucion = par.univ;
        if (par.cvlac_url && !dataPar.cvlac_url) dataPar.cvlac_url = par.cvlac_url;

        let dias = null;
        if (par.fecha_envio) {
            const fDate = new Date(par.fecha_envio);
            if (!isNaN(fDate)) {
                dias = Math.floor((Date.now() - fDate.getTime()) / 86400000);
            }
        }
        
        dataPar.evaluaciones.push({
          id_solicitud: sol.id,
          par_idx: idx,
          docente: sol.docente,
          titulo: sol.titulo,
          tipo: sol.tipo,
          estado: par.estado || 'pendiente',
          documentos_financieros: par.documentos_financieros || false,
          fecha_envio: par.fecha_envio || '',
          dias: dias,
          nota: par.nota_evaluativa || '',
          puntaje: par.puntaje_par || '',
          concepto_url: par.concepto_url || '',
          cvlac_url: par.cvlac_url || '',
        });
      });
    });
    
    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [solicitudes]);

  // Extraer agrupado por producto (titulo) – consolida co-autores y pares
  const productosData = useMemo(() => {
    const map = new Map(); // titulo normalizado → producto consolidado

    solicitudes.forEach(sol => {
      const tituloKey = (sol.titulo || '').trim().toUpperCase();
      if (!tituloKey || tituloKey === 'SIN TÍTULO') return;

      if (!map.has(tituloKey)) {
        map.set(tituloKey, {
          // Usamos el ID del primer registro del grupo como referencia
          id: sol.id,
          titulo: sol.titulo,
          tipo: sol.tipo,
          fecha: sol.fecha,
          etapa: sol.etapa,
          // Co-autores: set para evitar duplicados
          docentes: new Set(),
          // Pares: mapa por nombre para evitar duplicados
          paresMap: new Map(),
        });
      }

      const prod = map.get(tituloKey);

      // Agregar co-autor
      if (sol.docente) prod.docentes.add(sol.docente.trim());

      // Agregar pares de esta solicitud
      if (sol.pares_ext && Array.isArray(sol.pares_ext)) {
        sol.pares_ext.forEach(par => {
          const nombrePar = (par.nombre || '').trim();
          if (!nombrePar || nombrePar.toUpperCase() === 'BUSCANDO PARES') return;

          const keyPar = nombrePar.toUpperCase();
          if (!prod.paresMap.has(keyPar)) {
            let dias = null;
            if (par.fecha_envio) {
              const fDate = new Date(par.fecha_envio);
              if (!isNaN(fDate)) dias = Math.floor((Date.now() - fDate.getTime()) / 86400000);
            }
            prod.paresMap.set(keyPar, {
              nombre: nombrePar,
              par_idx: sol.pares_ext.indexOf(par),
              perfil: par.perfil || '',
              institucion: par.univ || '',
              cvlac_url: par.cvlac_url || '',
              estado: par.estado || 'pendiente',
              documentos_financieros: par.documentos_financieros || false,
              fecha_envio: par.fecha_envio || '',
              fecha_verificacion: par.fecha_verificacion || '',
              fecha_invitacion: par.fecha_invitacion || '',
              radicado: par.radicado || '',
              notif_recibido: par.notif_recibido || '',
              dias_evaluando: par.dias_evaluando || dias,
              entrego: par.entrego || '',
              nota: par.nota_evaluativa || '',
              puntaje: par.puntaje_par || '',
              concepto_url: par.concepto_url || '',
              dias,
            });
          } else {
            // Actualizar si hay más datos (ej. si actualizaron un co-autor y no los demás)
            const existing = prod.paresMap.get(keyPar);
            if (par.perfil && par.perfil.length > existing.perfil.length) existing.perfil = par.perfil;
            if (par.univ) existing.institucion = par.univ;
            if (par.estado && par.estado !== 'pendiente') existing.estado = par.estado;
            if (par.puntaje_par) existing.puntaje = par.puntaje_par;
            if (par.nota_evaluativa) existing.nota = par.nota_evaluativa;
            if (par.concepto_url) existing.concepto_url = par.concepto_url;
            if (par.cvlac_url) existing.cvlac_url = par.cvlac_url;
          }
        });
      }
    });

    // Convertir a array, completar hasta 2 slots de pares
    return Array.from(map.values())
      .map(prod => {
        const pares = Array.from(prod.paresMap.values());
        // Completar hasta 2 slots vacíos
        while (pares.length < 2) pares.push(null);
        return {
          id: prod.id,
          titulo: prod.titulo,
          tipo: prod.tipo,
          fecha: prod.fecha,
          etapa: prod.etapa,
          docentes: Array.from(prod.docentes),
          pares,
        };
      })
      .sort((a, b) => b.id.localeCompare(a.id));
  }, [solicitudes]);


  const [modoAgrupacion, setModoAgrupacion] = useState('producto'); // 'producto' | 'par' | 'pagos'

  const filtradosPares = paresData.filter(p => 
    p.nombre.includes(busqueda.toUpperCase()) || 
    p.institucion.toUpperCase().includes(busqueda.toUpperCase()) ||
    p.perfil.toUpperCase().includes(busqueda.toUpperCase())
  );

  const filtradosProductos = productosData.filter(p => 
    p.titulo.toUpperCase().includes(busqueda.toUpperCase()) ||
    p.docentes.some(d => d.toUpperCase().includes(busqueda.toUpperCase())) ||
    p.id.toUpperCase().includes(busqueda.toUpperCase()) ||
    p.pares.some(par => par && par.nombre.toUpperCase().includes(busqueda.toUpperCase()))
  );

  // Filtro de pares listos para pago (recibidos y con documentos financieros cargados)
  const filtradosPagos = useMemo(() => {
    return paresData
      .map(par => ({
        ...par,
        evaluaciones: par.evaluaciones.filter(ev => ev.estado === 'recibido' && ev.documentos_financieros)
      }))
      .filter(par => par.evaluaciones.length > 0)
      .filter(par => par.nombre.includes(busqueda.toUpperCase()) || par.institucion.toUpperCase().includes(busqueda.toUpperCase()));
  }, [paresData, busqueda]);

  const totalCount = modoAgrupacion === 'par' ? paresData.length : modoAgrupacion === 'pagos' ? filtradosPagos.length : productosData.length;
  const totalLabel = modoAgrupacion === 'par' ? 'Pares Registrados' : modoAgrupacion === 'pagos' ? 'Listos para Pago' : 'Productos con Pares';

  const copyToClipboard = (link) => {
    navigator.clipboard.writeText(link);
    alert('Enlace copiado al portapapeles:\n' + link);
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', marginBottom: 8, display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:32 }}>👥</span> Banco de Pares Evaluadores
          </h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 600, lineHeight: 1.5 }}>
            Consolidado histórico de pares evaluadores externos Minciencias que han participado o están participando en procesos de evaluación de productos intelectuales en la Universidad del Quindío.
          </p>
        </div>
        <div style={{ background: '#fff', padding: '6px 14px', borderRadius: 12, boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--g)', textAlign: 'center' }}>
            {totalCount}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .5 }}>
            {totalLabel}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <input 
          className="input" 
          placeholder={modoAgrupacion === 'par' ? "🔍 Buscar por nombre del par, institución..." : "🔍 Buscar por producto, docente o par..."} 
          value={busqueda} 
          onChange={e => setBusqueda(e.target.value)} 
          style={{ flex: 1, maxWidth: 500, fontSize: 14, padding: '10px 16px', borderRadius: 24 }}
        />
        <div style={{ display: 'flex', background: '#f1f3f5', borderRadius: 24, padding: 4, flexWrap: 'wrap' }}>
          <button 
            onClick={() => setModoAgrupacion('producto')}
            style={{ padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700, background: modoAgrupacion === 'producto' ? '#fff' : 'transparent', color: modoAgrupacion === 'producto' ? 'var(--text)' : 'var(--muted)', boxShadow: modoAgrupacion === 'producto' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
            📚 Agrupar por Producto
          </button>
          <button 
            onClick={() => setModoAgrupacion('par')}
            style={{ padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700, background: modoAgrupacion === 'par' ? '#fff' : 'transparent', color: modoAgrupacion === 'par' ? 'var(--text)' : 'var(--muted)', boxShadow: modoAgrupacion === 'par' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
            👥 Agrupar por Par Evaluador
          </button>
          <button 
            onClick={() => setModoAgrupacion('pagos')}
            style={{ padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700, background: modoAgrupacion === 'pagos' ? '#15803d' : 'transparent', color: modoAgrupacion === 'pagos' ? '#fff' : 'var(--muted)', boxShadow: modoAgrupacion === 'pagos' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
            💰 Listado Pagos
          </button>
        </div>
      </div>

      {(modoAgrupacion === 'par' ? filtradosPares.length === 0 : modoAgrupacion === 'pagos' ? filtradosPagos.length === 0 : filtradosProductos.length === 0) ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8f9fa', borderRadius: 12, border: '1px dashed #ccc' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🕵️‍♂️</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--muted)' }}>No se encontraron pares evaluadores</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Intenta con otro término de búsqueda o asegúrate de que haya solicitudes con pares asignados.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 20 }}>
          {modoAgrupacion === 'par' && filtradosPares.map((par, i) => (
            <div key={i} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, var(--g) 0%, var(--gp) 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, flexShrink: 0 }}>
                  {par.nombre.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)', lineHeight: 1.2, marginBottom: 4 }}>{par.nombre}</div>
                  {par.institucion && <div style={{ fontSize: 12, color: '#1a5fa8', fontWeight: 700, marginBottom: 2 }}>🎓 {par.institucion}</div>}
                  {par.cvlac_url && <a href={par.cvlac_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--info)' }}>🔗 Ver Hoja de Vida (CVLAC) PDF ↗</a>}
                </div>
              </div>
              
              {par.perfil && (
                <div style={{ background: '#f8f9fa', padding: 12, borderRadius: 8, fontSize: 12, color: 'var(--text2)', marginBottom: 16, border: '1px solid var(--border)', flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>Perfil / Especialidad</div>
                  <div style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={par.perfil}>
                    {par.perfil}
                  </div>
                </div>
              )}

              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>Historial de Evaluaciones ({par.evaluaciones.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {par.evaluaciones.map((ev, j) => {
                    const entregado = ev.estado === 'recibido';
                    return (
                      <div key={j} style={{ background: '#fff', border: '1px solid var(--border)', padding: 10, borderRadius: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--g)', maxWidth: '70%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.id_solicitud}</span>
                          <span className={`badge ${entregado ? 'bg' : 'ba'}`} style={{ fontSize: 9, padding: '2px 6px' }}>
                            {entregado ? '✅ Recibido' : '⏳ Pendiente'}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={ev.titulo}>
                          📘 {ev.titulo}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, alignItems: 'center' }}>
                          <span style={{ fontSize: 10, color: 'var(--muted)' }}>👤 {ev.docente.split(' ')[0]} {ev.docente.split(' ')[1] || ''}</span>
                          
                          {!entregado && ev.dias !== null && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: ev.dias > 30 ? 'var(--danger)' : '#1a5fa8' }}>
                              ⏱ {ev.dias} días
                            </span>
                          )}
                          {entregado && ev.puntaje && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--g)' }}>⭐ {ev.puntaje} pts</span>
                          )}
                          {entregado && ev.concepto_url && (
                            <a href={ev.concepto_url} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: 'var(--info)', fontWeight: 700 }}>📥 Ver Evaluación</a>
                          )}
                        </div>
                        <div style={{ marginTop: 8 }}>
                          {ev.cvlac_url ? (
                            <a href={ev.cvlac_url} target="_blank" rel="noreferrer"
                              style={{ display: 'block', textAlign: 'center', width: '100%', background: '#e7f1fb', border: '1px solid #1a5fa8', color: '#1a5fa8', padding: '4px', borderRadius: 6, fontSize: 10, fontWeight: 800, textDecoration: 'none' }}>
                              📄 PDF del Par Evaluador
                            </a>
                          ) : (
                            <span style={{ display: 'block', textAlign: 'center', width: '100%', background: '#f5f5f5', border: '1px dashed #ccc', color: '#999', padding: '4px', borderRadius: 6, fontSize: 10, fontWeight: 800 }}>
                              Sin PDF
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}

          {modoAgrupacion === 'producto' && filtradosProductos.map((prod, i) => {
            const paresReales = prod.pares.filter(Boolean).length;
            return (
            <div key={i} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', background: 'linear-gradient(to bottom,#fff,#fdfdfd)' }}>
              {/* Cabecera */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--g)', background: 'var(--bg)', padding: '2px 8px', borderRadius: 12 }}>{prod.id}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>📅 {prod.fecha}</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)', lineHeight: 1.3, marginBottom: 8 }} title={prod.titulo}>
                  📘 {prod.titulo}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {prod.docentes.map((d, di) => (
                    <div key={di} style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ color: 'var(--muted)' }}>👤</span>
                      <span style={{ fontWeight: di === 0 ? 700 : 500 }}>{d}</span>
                      {di === 0 && prod.docentes.length > 1 && <span style={{ fontSize: 10, color: 'var(--muted)' }}>(principal)</span>}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                  Pares Asignados ({paresReales} / 2)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {prod.pares.map((par, j) => {
                    if (!par) return (
                      <div key={j} style={{ background: '#f8f9fa', border: '1px dashed #ccc', padding: 12, borderRadius: 8, display: 'flex', gap: 10, alignItems: 'center', opacity: 0.55 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🔍</div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Por asignar — Par {j + 1}</div>
                          <div style={{ fontSize: 10, color: 'var(--muted)' }}>El asistente ingresará la información del par evaluador</div>
                        </div>
                      </div>
                    );
                    const entregado = par.estado === 'recibido';
                    const diasNum = par.dias_evaluando || par.dias;
                    return (
                      <div key={j} style={{ background: entregado ? '#f0fdf4' : '#f8f9fa', border: `1px solid ${entregado ? '#86efac' : 'var(--border)'}`, padding: 12, borderRadius: 8 }}>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: entregado ? 'var(--g)' : '#6c757d', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>
                            {par.nombre.charAt(0)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>{par.nombre}</div>
                            {par.institucion && <div style={{ fontSize: 10, color: '#1a5fa8', fontWeight: 600, marginBottom: 4 }}>🎓 {par.institucion}</div>}
                            {par.perfil && (
                              <div style={{ fontSize: 10, color: 'var(--muted)', background: '#fff', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={par.perfil}>
                                {par.perfil}
                              </div>
                            )}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 10px', fontSize: 10, color: 'var(--muted)', marginBottom: 6 }}>
                              {par.fecha_invitacion   && <span>📨 Invitado: {par.fecha_invitacion}</span>}
                              {par.radicado           && <span>📋 Rad: {par.radicado}</span>}
                              {par.notif_recibido     && <span>✉️ Notif: {par.notif_recibido}</span>}
                              {par.fecha_verificacion && <span>🔍 Verif: {par.fecha_verificacion}</span>}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <span className={`badge ${entregado ? 'bg' : 'ba'}`} style={{ fontSize: 9, padding: '2px 6px' }}>
                                {entregado ? '✅ Recibido' : '⏳ Pendiente'}
                              </span>
                              {diasNum != null && <span style={{ fontSize: 10, fontWeight: 700, color: diasNum > 30 ? 'var(--danger)' : '#1a5fa8' }}>⏱ {diasNum} días</span>}
                              {entregado && par.puntaje && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--g)' }}>⭐ {par.puntaje} pts</span>}
                              {entregado && par.concepto_url && <a href={par.concepto_url} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: 'var(--info)', fontWeight: 700 }}>📥 Ver Evaluación</a>}
                            </div>
                            <div>
                              {par.cvlac_url ? (
                                <a href={par.cvlac_url} target="_blank" rel="noreferrer"
                                  style={{ color: '#1a5fa8', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>
                                  📄 PDF del Par Evaluador
                                </a>
                              ) : (
                                <span style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 700 }}>
                                  Sin PDF
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            );
          })}

          {modoAgrupacion === 'pagos' && filtradosPagos.map((par, i) => (
            <div key={i} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', border: '1px solid #15803d' }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'flex-start' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#15803d', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, flexShrink: 0 }}>
                  {par.nombre.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: '#1a1a1a', lineHeight: 1.2 }}>{par.nombre}</div>
                  <div style={{ fontSize: 11, color: '#15803d', fontWeight: 800, marginTop: 4 }}>✅ Documentos Financieros Cargados</div>
                </div>
              </div>
              <div style={{ background: '#f0fdf4', padding: 12, borderRadius: 8, border: '1px solid #86efac' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#166534', textTransform: 'uppercase', marginBottom: 8 }}>Productos Evaluados Listos</div>
                {par.evaluaciones.map((ev, j) => (
                  <div key={j} style={{ background: '#fff', padding: 8, borderRadius: 6, marginBottom: j < par.evaluaciones.length -1 ? 6 : 0, border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: 10, color: '#15803d', fontWeight: 800 }}>{ev.id_solicitud}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.titulo}</div>
                  </div>
                ))}
                <button style={{ marginTop: 12, width: '100%', background: '#15803d', color: '#fff', border: 'none', padding: '8px', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}>
                  Proyectar Resolución de Pago
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
