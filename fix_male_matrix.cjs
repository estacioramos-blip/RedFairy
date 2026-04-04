const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'engine', 'maleMatrix.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove transfundido triplicado — mantém só a primeira ocorrência
content = content.replace(/(transfundido:\s*false,[\r\n]+)([\s]*transfundido:\s*false,[\r\n]+)+/g, '$1');
content = content.replace(/(transfundido:\s*true,[\r\n]+)([\s]*transfundido:\s*true,[\r\n]+)+/g, '$1');

// 2. Remove ID 82 duplicado — mantém só a primeira ocorrência
const seen = new Set();
const blocks = content.split(/(?=\s*\/\/ ─── ID \d)/);
const filtered = blocks.filter(block => {
  const match = block.match(/\bid:\s*(\d+)/);
  if (!match) return true;
  const id = match[1];
  if (seen.has(id)) {
    console.log('Removendo duplicata ID', id);
    return false;
  }
  seen.add(id);
  return true;
});

const result = filtered.join('');
fs.writeFileSync(filePath, result, 'utf8');
console.log('Feito! IDs únicos:', seen.size);
