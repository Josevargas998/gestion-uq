const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'components', 'DetalleSolicitud.jsx');
let lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

// --- CHANGE 1: After the red "PASO PREVIO" warning div closes, insert DatosProductoPanel
// Find the line that ends the warning div and is followed by the pares map
const pasoIdx = lines.findIndex(l => l.includes('PASO PREVIO: Diligencie'));
if (pasoIdx !== -1) {
  // Find the closing </div> of the warning, then insert DatosProductoPanel before the map
  for (let i = pasoIdx; i < pasoIdx + 5; i++) {
    if (lines[i].includes('</div>') && lines[i+1].includes('sol.pares_ext.map')) {
      lines.splice(i + 1, 0,
        '          {/* ── Metadatos del producto (ISBN, ISSN, co-autores, etc.) ── */}',
        '          {isTecnico && (',
        '            <DatosProductoPanel',
        '              tipo={sol.tipo}',
        '              datos={datosProd}',
        '              onChange={(nuevosDatos) => { setDatosProd(nuevosDatos); setSaved(false); }}',
        '            />',
        '          )}'
      );
      console.log('✅ DatosProductoPanel inserted after PASO PREVIO at line', i);
      break;
    }
  }
}

// --- CHANGE 2: Inside the merged card section (after pares.map), verify calculo1279 block is present
// It should already be there from the commit, just verify
const calc1279Idx = lines.findIndex(l => l.includes('calculo1279 && ('));
if (calc1279Idx !== -1) {
  console.log('✅ calculo1279 block found at line', calc1279Idx + 1);
} else {
  console.log('❌ calculo1279 block NOT found!');
}

// --- CHANGE 3: The Confirmar Puntaje section should already be inside the card.
// Verify it exists
const confirmarIdx = lines.findIndex(l => l.includes('Confirmar Puntaje y Enviar al CIARP'));
if (confirmarIdx !== -1) {
  console.log('✅ Confirmar Puntaje section found at line', confirmarIdx + 1);
} else {
  console.log('❌ Confirmar Puntaje section NOT found!');
}

fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log('\nDone. Total lines:', lines.length);
