// test_matrix.cjs
// Rodar na raiz do projeto: node test_matrix.cjs
// Testa casos conhecidos contra femaleMatrix e maleMatrix

const fs = require('fs');
const path = require('path');

// ─── Carrega as matrizes via eval (são ES modules exportados como const) ──────
function loadMatrix(filePath) {
  let src = fs.readFileSync(filePath, 'utf8');
  src = src.replace(/^export const \w+ = /, 'module.exports = ');
  const tmpPath = filePath.replace('.js', '_tmp.cjs');
  fs.writeFileSync(tmpPath, src);
  const m = require(tmpPath);
  fs.unlinkSync(tmpPath);
  return m;
}

const femaleMatrix = loadMatrix(path.join(__dirname, 'src/engine/femaleMatrix.js'));
const maleMatrix   = loadMatrix(path.join(__dirname, 'src/engine/maleMatrix.js'));

// ─── Engine de matching (igual ao decisionEngine) ────────────────────────────
function inRange(value, range) {
  if (!range) return true;
  return value >= range.min && value <= range.max;
}

function matchesConditions(item, inputs) {
  const c = item.conditions;
  if (!inRange(inputs.ferritina,   c.ferritina))   return false;
  if (!inRange(inputs.hemoglobina, c.hemoglobina)) return false;
  if (!inRange(inputs.vcm,         c.vcm))         return false;
  if (!inRange(inputs.rdw,         c.rdw))         return false;
  if (!inRange(inputs.satTransf,   c.satTransf))   return false;
  if (c.bariatrica   !== undefined && (inputs.bariatrica   ?? false) !== c.bariatrica)   return false;
  if (c.vegetariano  !== undefined && (inputs.vegetariano  ?? false) !== c.vegetariano)  return false;
  if (c.perda        !== undefined && (inputs.perda        ?? false) !== c.perda)        return false;
  if (c.alcoolista   !== undefined && (inputs.alcoolista   ?? false) !== c.alcoolista)   return false;
  if (c.transfundido !== undefined && (inputs.transfundido ?? false) !== c.transfundido) return false;
  return true;
}

function avaliar(matrix, inputs) {
  const result = matrix.find(item => matchesConditions(item, inputs));
  return result ? { encontrado: true, id: result.id, label: result.label, color: result.color } : { encontrado: false };
}

// ─── Casos de teste ───────────────────────────────────────────────────────────
const casos = [
  // ── FEMININO ──────────────────────────────────────────────────────────────
  {
    desc: 'F: Normal saudável',
    sexo: 'F', esperado: { encontrado: true },
    inputs: { ferritina: 60, hemoglobina: 13.5, vcm: 88, rdw: 13, satTransf: 30, bariatrica: false, vegetariano: false, perda: false, alcoolista: false, transfundido: false }
  },
  {
    desc: 'F: Anemia ferropriva importante por perda',
    sexo: 'F', esperado: { encontrado: true },
    inputs: { ferritina: 11, hemoglobina: 12.1, vcm: 90, rdw: 19, satTransf: 10, bariatrica: false, vegetariano: false, perda: true, alcoolista: false, transfundido: false }
  },
  {
    desc: 'F: Vegetariana déficit B12 importante (ex-ID75)',
    sexo: 'F', esperado: { encontrado: true, id: 22 },
    inputs: { ferritina: 80, hemoglobina: 8.5, vcm: 112, rdw: 16, satTransf: 30, bariatrica: false, vegetariano: true, perda: false, alcoolista: false, transfundido: false }
  },
  {
    desc: 'F: Bariátrica anemia dimórfica (ID 88)',
    sexo: 'F', esperado: { encontrado: true, id: 88 },
    inputs: { ferritina: 6, hemoglobina: 10.4, vcm: 86, rdw: 19, satTransf: 10, bariatrica: true, vegetariano: false, perda: false, alcoolista: false, transfundido: false }
  },
  {
    desc: 'F: Vegetariana anemia dimórfica (ID 89)',
    sexo: 'F', esperado: { encontrado: true, id: 89 },
    inputs: { ferritina: 10, hemoglobina: 9.5, vcm: 90, rdw: 17, satTransf: 12, bariatrica: false, vegetariano: true, perda: false, alcoolista: false, transfundido: false }
  },
  {
    desc: 'F: Bariátrica compensada',
    sexo: 'F', esperado: { encontrado: true },
    inputs: { ferritina: 60, hemoglobina: 13.5, vcm: 88, rdw: 13, satTransf: 30, bariatrica: true, vegetariano: false, perda: false, alcoolista: false, transfundido: false }
  },
  {
    desc: 'F: Eritrocitose',
    sexo: 'F', esperado: { encontrado: true },
    inputs: { ferritina: 80, hemoglobina: 16.5, vcm: 88, rdw: 13, satTransf: 35, bariatrica: false, vegetariano: false, perda: false, alcoolista: false, transfundido: false }
  },
  {
    desc: 'F: Policitemia vera',
    sexo: 'F', esperado: { encontrado: true, id: 81 },
    inputs: { ferritina: 10, hemoglobina: 17, vcm: 85, rdw: 13, satTransf: 10, bariatrica: false, vegetariano: false, perda: false, alcoolista: false, transfundido: false }
  },
  {
    desc: 'F: Anemia macrocítica importante vegetariana',
    sexo: 'F', esperado: { encontrado: true },
    inputs: { ferritina: 60, hemoglobina: 9, vcm: 115, rdw: 16, satTransf: 30, bariatrica: false, vegetariano: true, perda: false, alcoolista: false, transfundido: false }
  },
  {
    desc: 'F: Anemia ferropriva grave',
    sexo: 'F', esperado: { encontrado: true },
    inputs: { ferritina: 5, hemoglobina: 5, vcm: 68, rdw: 18, satTransf: 8, bariatrica: false, vegetariano: false, perda: false, alcoolista: false, transfundido: false }
  },
  {
    desc: 'F: Hipermenorreia (flags especiais femininos)',
    sexo: 'F', esperado: { encontrado: true },
    inputs: { ferritina: 8, hemoglobina: 10.5, vcm: 72, rdw: 16, satTransf: 8, bariatrica: false, vegetariano: false, perda: true, alcoolista: false, transfundido: false }
  },

  // ── MASCULINO ─────────────────────────────────────────────────────────────
  {
    desc: 'M: Normal saudável',
    sexo: 'M', esperado: { encontrado: true, id: 3 },
    inputs: { ferritina: 80, hemoglobina: 15, vcm: 88, rdw: 13, satTransf: 30, bariatrica: false, vegetariano: false, perda: false, alcoolista: false, transfundido: false }
  },
  {
    desc: 'M: Anemia ferropriva importante',
    sexo: 'M', esperado: { encontrado: true, id: 12 },
    inputs: { ferritina: 10, hemoglobina: 10, vcm: 70, rdw: 18, satTransf: 10, bariatrica: false, vegetariano: false, perda: false, alcoolista: false, transfundido: false }
  },
  {
    desc: 'M: Vegetariano déficit B12 importante',
    sexo: 'M', esperado: { encontrado: true, id: 22 },
    inputs: { ferritina: 80, hemoglobina: 9, vcm: 112, rdw: 16, satTransf: 30, bariatrica: false, vegetariano: true, perda: false, alcoolista: false, transfundido: false }
  },
  {
    desc: 'M: Bariátrico anemia dimórfica (ID 90)',
    sexo: 'M', esperado: { encontrado: true, id: 90 },
    inputs: { ferritina: 8, hemoglobina: 11, vcm: 88, rdw: 17, satTransf: 12, bariatrica: true, vegetariano: false, perda: false, alcoolista: false, transfundido: false }
  },
  {
    desc: 'M: Vegetariano anemia dimórfica (ID 91)',
    sexo: 'M', esperado: { encontrado: true, id: 91 },
    inputs: { ferritina: 12, hemoglobina: 10, vcm: 92, rdw: 17, satTransf: 14, bariatrica: false, vegetariano: true, perda: false, alcoolista: false, transfundido: false }
  },
  {
    desc: 'M: Hemocromatose',
    sexo: 'M', esperado: { encontrado: true, id: 8 },
    inputs: { ferritina: 2000, hemoglobina: 15, vcm: 88, rdw: 13, satTransf: 70, bariatrica: false, vegetariano: false, perda: false, alcoolista: false, transfundido: false }
  },
  {
    desc: 'M: Policitemia vera',
    sexo: 'M', esperado: { encontrado: true, id: 81 },
    inputs: { ferritina: 10, hemoglobina: 18, vcm: 85, rdw: 13, satTransf: 10, bariatrica: false, vegetariano: false, perda: false, alcoolista: false, transfundido: false }
  },
  {
    desc: 'M: Alcoolista anemia macrocítica (ID 82)',
    sexo: 'M', esperado: { encontrado: true, id: 82 },
    inputs: { ferritina: 80, hemoglobina: 10, vcm: 110, rdw: 16, satTransf: 30, bariatrica: false, vegetariano: false, perda: false, alcoolista: true, transfundido: false }
  },
  {
    desc: 'M: Anemia grave por hemorragia',
    sexo: 'M', esperado: { encontrado: true, id: 36 },
    inputs: { ferritina: 5, hemoglobina: 5, vcm: 65, rdw: 18, satTransf: 8, bariatrica: false, vegetariano: false, perda: true, alcoolista: false, transfundido: false }
  },
  {
    desc: 'M: Talassemia minor',
    sexo: 'M', esperado: { encontrado: true, id: 61 },
    inputs: { ferritina: 80, hemoglobina: 12, vcm: 68, rdw: 14, satTransf: 40, bariatrica: false, vegetariano: false, perda: false, alcoolista: false, transfundido: false }
  },
]

// ─── Execução dos testes ──────────────────────────────────────────────────────
let pass = 0, fail = 0, notFound = 0;
const fails = [];

for (const caso of casos) {
  const matrix = caso.sexo === 'F' ? femaleMatrix : maleMatrix;
  const result = avaliar(matrix, caso.inputs);

  const foundOk = result.encontrado === caso.esperado.encontrado;
  const idOk = caso.esperado.id === undefined || result.id === caso.esperado.id;
  const ok = foundOk && idOk;

  if (ok) {
    pass++;
    console.log(`✅ PASS  [${caso.sexo}] ${caso.desc}${result.encontrado ? ` → ID ${result.id}` : ''}`);
  } else {
    fail++;
    const motivo = !foundOk
      ? `esperado encontrado=${caso.esperado.encontrado}, got=${result.encontrado}`
      : `esperado ID ${caso.esperado.id}, got ID ${result.id} (${result.label})`;
    console.log(`❌ FAIL  [${caso.sexo}] ${caso.desc} — ${motivo}`);
    fails.push(caso.desc);
  }

  if (!result.encontrado) notFound++;
}

console.log('\n─────────────────────────────────────');
console.log(`Total: ${casos.length} | ✅ ${pass} pass | ❌ ${fail} fail | 🔍 ${notFound} não encontrados`);
if (fails.length > 0) {
  console.log('\nFalhas:');
  fails.forEach(f => console.log(' •', f));
}
