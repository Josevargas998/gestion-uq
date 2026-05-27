const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'components', 'DetalleSolicitud.jsx');
let lines = fs.readFileSync(file, 'utf8').split('\n');

// 1. Add import
let idx = lines.findIndex(l => l.includes('import Decreto1279Panel'));
if (idx !== -1 && !lines.some(l => l.includes('import DatosProductoPanel'))) {
  lines.splice(idx + 1, 0, "import DatosProductoPanel from './DatosProductoPanel.jsx';");
}

// 2. Add datosProd state
idx = lines.findIndex(l => l.includes('const [actaCiarp, setActaCiarp]'));
if (idx !== -1 && !lines.some(l => l.includes('const [datosProd, setDatosProd]'))) {
  lines.splice(idx + 1, 0, `  const [datosProd, setDatosProd] = React.useState(() => {
    try { return typeof sol.datos_prod === 'string' ? JSON.parse(sol.datos_prod) : (sol.datos_prod || {}); } catch { return {}; }
  });`);
}

// 3. Add to avanzar
idx = lines.findIndex(l => l.includes('etapa: nuevaEtapa,'));
if (idx !== -1 && !lines.some(l => l.includes('datos_prod: datosProd,') && lines.indexOf(l) < idx && lines.indexOf(l) > idx - 5)) {
  lines.splice(idx, 0, "      datos_prod: datosProd,");
}

// 4. Add to handleGuardarPuntaje
idx = lines.findIndex(l => l.includes('acta_ciarp: actaCiarp,'));
if (idx !== -1 && lines[idx - 1].includes('pts_asig:') && !lines[idx + 1].includes('datos_prod: datosProd,')) {
  lines.splice(idx + 1, 0, "      datos_prod: datosProd,");
}

// 5. Insert DatosProductoPanel rendering
idx = lines.findIndex(l => l.includes('{/* PANELES DE EDICIÓN DE PUNTAJE Y AVANCE */}'));
if (idx !== -1) {
  for (let j = idx; j < idx + 5; j++) {
    if (lines[j].includes('<div className="card"') && lines[j].includes('var(--info)')) {
      if (lines[j - 1].includes('&& (')) {
        lines[j - 1] = lines[j - 1].replace('&& (', `&& (
        <>
          <DatosProductoPanel 
            tipo={sol.tipo} 
            datos={datosProd} 
            onChange={(nuevosDatos) => { setDatosProd(nuevosDatos); setSaved(false); }} 
          />`);
        
        // Find closing brace
        for (let k = j + 1; k < lines.length; k++) {
          if (lines[k].includes('      )}') && lines[k - 1].includes('        </div>') && lines[k + 2] && lines[k + 2].includes("{sol.etapa === 'ciarp'")) {
            lines.splice(k, 0, "        </>");
            break;
          }
        }
      }
      break;
    }
  }
}

fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log('Fixed');
