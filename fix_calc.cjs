const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'components', 'DetalleSolicitud.jsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Replace calcPuntajePromedio
const calcOld = `  // Guardar puntaje consolidado calculado de pares
  function calcPuntajePromedio() {
    const pares = sol.pares_ext || [];
    const conPts = pares.filter(p => p.puntaje_par != null && p.puntaje_par !== '');
    if (!conPts.length) return null;
    return (conPts.reduce((s, p) => s + Number(p.puntaje_par), 0) / conPts.length).toFixed(1);
  }`;

const calcNew = `  // Calcular puntaje final según fórmula Decreto 1279
  const calculo1279 = React.useMemo(() => {
    const pares = sol.pares_ext || [];
    const conCalificacion = pares.filter(p => p.calificacion != null && p.calificacion !== '');
    if (!conCalificacion.length) return null;

    const promedio = conCalificacion.reduce((s, p) => s + Number(p.calificacion), 0) / conCalificacion.length;
    const factorCalidad = promedio / 5;
    let techo = t.pts || 0;

    // Modificadores por subtipo (artículos)
    if (datosProd.subtipo_articulo === 'comunicacion_corta') techo = techo * 0.6;
    if (datosProd.subtipo_articulo === 'reporte_caso') techo = techo * 0.3;

    let ptsBase = techo * factorCalidad;

    // Factor autores
    let numAutores = Number(datosProd.num_autores) || 1;
    let factorAutor = 1;
    if (numAutores >= 4 && numAutores <= 5) factorAutor = 0.5;
    if (numAutores >= 6) factorAutor = 1 / (numAutores / 2);

    let ptsSugeridos = ptsBase * factorAutor;

    return {
      promedio: promedio.toFixed(2),
      techo: techo.toFixed(1),
      autores: numAutores,
      factorAutor: factorAutor,
      ptsSugeridos: ptsSugeridos.toFixed(2)
    };
  }, [sol.pares_ext, datosProd, t.pts]);`;

content = content.replace(calcOld, calcNew);

// 2. Replace puntaje_par input with calificacion
const inputOld = `                        <div>
                          <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:3}}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><Award size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Puntaje sugerido (pts)</label>
                          <input className="input" type="number" min="0" max="40" step="0.1" placeholder="0" defaultValue={par.puntaje_par || ''} onBlur={e => handleRegistrarEvalPar(i, 'puntaje_par', e.target.value)} style={{fontWeight:700,textAlign:'center'}} />
                        </div>`;
const inputNew = `                        <div>
                          <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:3}}><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><Award size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Calificación (1 a 5)</label>
                          <input className="input" type="number" min="1" max="5" step="0.1" placeholder="Ej: 4.5" defaultValue={par.calificacion || ''} onBlur={e => handleRegistrarEvalPar(i, 'calificacion', e.target.value)} style={{fontWeight:700,textAlign:'center'}} />
                        </div>`;
content = content.replace(inputOld, inputNew);

// 3. Replace display for admin
content = content.replace(`{!isTecnico && (par.nota_evaluativa || par.puntaje_par) && (`, `{!isTecnico && (par.nota_evaluativa || par.calificacion) && (`);
content = content.replace(`{par.puntaje_par    && <span><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><Award size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> {par.puntaje_par} pts</span>}`, `{par.calificacion    && <span><span style={{display:"inline-flex", alignItems:"center", gap: 6}}><Award size={14} style={{display:"inline-block", verticalAlign:"middle"}}/></span> Calificación: {par.calificacion}</span>}`);

// 4. Replace calcPuntajePromedio render
const renderOld = `{calcPuntajePromedio() && <div style={{marginTop:8,padding:'8px 12px',background:'#fff',borderRadius:8,border:'1px solid #b7dfb9',fontSize:13}}>📊 Promedio pares: <strong>{calcPuntajePromedio()} pts</strong></div>}`;
const renderNew = `          {calculo1279 && (
            <div style={{marginTop:8,padding:'12px 16px',background:'#f0faf2',borderRadius:8,border:'1px solid #b7dfb9',fontSize:13}}>
              <div style={{fontWeight:700,color:'var(--g)',marginBottom:6}}>📊 Cálculo Automático D.1279</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                <div><span style={{color:'var(--muted)'}}>Promedio Pares:</span> <strong>{calculo1279.promedio}</strong></div>
                <div><span style={{color:'var(--muted)'}}>Techo Aplicable:</span> <strong>{calculo1279.techo} pts</strong></div>
                <div><span style={{color:'var(--muted)'}}>Autores ({calculo1279.autores}):</span> <strong>x{calculo1279.factorAutor.toFixed(2)}</strong></div>
              </div>
              <div style={{marginTop:8,borderTop:'1px dashed #b7dfb9',paddingTop:8,fontWeight:800,fontSize:14}}>
                Puntaje Final Sugerido: <span style={{color:'#1a6e2e'}}>{calculo1279.ptsSugeridos} pts</span>
              </div>
            </div>
          )}`;
content = content.replace(renderOld, renderNew);

// 5. Replace ptsEdit panel
const ptsOld = `                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>Puntaje máximo sugerido:</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--g)' }}>{ptsSugReal} pts</div>
                </div>`;
const ptsNew = `                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>Puntaje máximo sugerido:</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--g)' }}>{calculo1279 ? calculo1279.ptsSugeridos : ptsSugReal} pts</div>
                  {calculo1279 && (
                    <button className="btn btn-o btn-sm" onClick={() => { setPtsEdit(calculo1279.ptsSugeridos); setSaved(false); }} style={{padding:'2px 6px',fontSize:10,marginTop:4}}>Usar cálculo</button>
                  )}
                </div>`;
content = content.replace(ptsOld, ptsNew);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed calculation logic');
