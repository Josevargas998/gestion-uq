const fs = require('fs');
const path = require('path');

const dir = './public/data/hv';
const files = fs.readdirSync(dir);

let changed = 0;

files.forEach(file => {
  if (!file.endsWith('.json')) return;
  const p = path.join(dir, file);
  let content = fs.readFileSync(p, 'utf8');
  const orig = content;
  
  // Replace missing titles / badly encoded ones
  content = content
    .replace(/Semiolog(.*?)respiratoria/g, 'Semiología respiratoria')
    .replace(/Cr(.*?)a de una pandemia(.*?)De la UniQuind(.*?)y el Quind(.*?)para el mundo/g, 'Crónica de una pandemia. De la UniQuindío y el Quindío para el mundo')
    .replace(/Especializaci(.*?)td>/g, 'Especialización');

  if (content !== orig) {
    fs.writeFileSync(p, content, 'utf8');
    changed++;
  }
});

console.log('Changed', changed, 'files');
