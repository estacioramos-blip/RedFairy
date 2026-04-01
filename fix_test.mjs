import { maleMatrix } from './src/engine/maleMatrix.js';
import { femaleMatrix } from './src/engine/femaleMatrix.js';

function inRange(value, range) {
  if (!range) return true;
  return value >= range.min && value <= range.max;
}

function match(item, inputs) {
  const c = item.conditions;
  if (!inRange(inputs.ferritina,   c.ferritina))   return false;
  if (!inRange(inputs.hemoglobina, c.hemoglobina)) return false;
  if (!inRange(inputs.vcm,         c.vcm))         return false;
  if (!inRange(inputs.rdw,         c.rdw))         return false;
  if (!inRange(inputs.satTransf,   c.satTransf))   return false;
  if (c.bariatrica   !== undefined && inputs.bariatrica   !== c.bariatrica)   return false;
  if (c.vegetariano  !== undefined && inputs.vegetariano  !== c.vegetariano)  return false;
  if (c.perda        !== undefined && inputs.perda        !== c.perda)        return false;
  if (c.alcoolista   !== undefined && inputs.alcoolista   !== c.alcoolista)   return false;
  if (c.transfundido !== undefined && inputs.transfundido !== c.transfundido) return false;
  return true;
}

const base = { bariatrica: false, vegetariano: false, perda: false, alcoolista: false, transfundido: false };
const bar   = { ...base, bariatrica: true };
const veg   = { ...base, vegetariano: true };
const perd  = { ...base, perda: true };
const alc   = { ...base, alcoolista: true };
const trans = { ...base, transfundido: true };

const casos = [
  // Normais
  { label: '[M] Saudavel tipico',              ferritina: 80,  hemoglobina: 15.0, vcm: 88,  rdw: 13,   satTransf: 30, ...base },
  { label: '[M] Ferritina alta sat normal',    ferritina: 200, hemoglobina: 15.0, vcm: 88,  rdw: 13,   satTransf: 30, ...base },
  { label: '[M] Ferritina alta sat alta',      ferritina: 200, hemoglobina: 15.0, vcm: 88,  rdw: 13,   satTransf: 55, ...base },
  { label: '[M] Ferritina muito alta',         ferritina: 900, hemoglobina: 15.0, vcm: 88,  rdw: 13,   satTransf: 55, ...base },
  // Sideropenia
  { label: '[M] Ferritina baixa Hb normal',    ferritina: 15,  hemoglobina: 15.0, vcm: 88,  rdw: 13,   satTransf: 25, ...base },
  { label: '[M] Ferritina baixa RDW alto',     ferritina: 15,  hemoglobina: 15.0, vcm: 88,  rdw: 16,   satTransf: 25, ...base },
  { label: '[M] Ferritina baixa sat baixa',    ferritina: 15,  hemoglobina: 15.0, vcm: 88,  rdw: 16,   satTransf: 15, ...base },
  // Anemias ferroprivas
  { label: '[M] Anemia leve ferropriva',       ferritina: 15,  hemoglobina: 12.0, vcm: 70,  rdw: 17,   satTransf: 15, ...base },
  { label: '[M] Anemia moderada ferropriva',   ferritina: 10,  hemoglobina: 10.0, vcm: 68,  rdw: 18,   satTransf: 10, ...base },
  { label: '[M] Anemia importante ferropriva', ferritina: 5,   hemoglobina: 8.0,  vcm: 65,  rdw: 19,   satTransf: 8,  ...base },
  { label: '[M] Anemia grave ferropriva',      ferritina: 3,   hemoglobina: 5.0,  vcm: 62,  rdw: 20,   satTransf: 5,  ...base },
  // Anemias normociticas
  { label: '[M] Anemia leve normocitica',      ferritina: 80,  hemoglobina: 12.0, vcm: 85,  rdw: 13,   satTransf: 25, ...base },
  { label: '[M] Anemia leve normocitica RDW+', ferritina: 80,  hemoglobina: 12.0, vcm: 85,  rdw: 16,   satTransf: 25, ...base },
  // Macrocitose
  { label: '[M] Macrocitose sem anemia',       ferritina: 80,  hemoglobina: 14.0, vcm: 105, rdw: 16,   satTransf: 30, ...base },
  { label: '[M] Macrocitose com anemia leve',  ferritina: 80,  hemoglobina: 12.0, vcm: 108, rdw: 17,   satTransf: 30, ...base },
  { label: '[M] Macrocitose anemia importante',ferritina: 80,  hemoglobina: 8.0,  vcm: 112, rdw: 18,   satTransf: 30, ...base },
  // Eritrocitose
  { label: '[M] Eritrocitose ferritina normal',ferritina: 80,  hemoglobina: 18.0, vcm: 88,  rdw: 13,   satTransf: 30, ...base },
  { label: '[M] Policitemia vera',             ferritina: 15,  hemoglobina: 18.0, vcm: 88,  rdw: 13,   satTransf: 15, ...base },
  // Flags
  { label: '[M] Bariatrica saudavel',          ferritina: 80,  hemoglobina: 15.0, vcm: 88,  rdw: 13,   satTransf: 30, ...bar },
  { label: '[M] Vegetariano saudavel',         ferritina: 80,  hemoglobina: 15.0, vcm: 88,  rdw: 13,   satTransf: 30, ...veg },
  { label: '[M] Alcoolista macrocitose',       ferritina: 80,  hemoglobina: 11.0, vcm: 105, rdw: 16,   satTransf: 30, ...alc },
  { label: '[M] Transfundido ferritina alta',  ferritina: 500, hemoglobina: 12.0, vcm: 85,  rdw: 13,   satTransf: 55, ...trans },
  // Feminino
  { label: '[F] Saudavel tipico',              ferritina: 80,  hemoglobina: 13.0, vcm: 88,  rdw: 13,   satTransf: 30, ...base },
  { label: '[F] Anemia leve normocitica',      ferritina: 80,  hemoglobina: 11.0, vcm: 85,  rdw: 13,   satTransf: 25, ...base },
  { label: '[F] Anemia leve ferropriva',       ferritina: 15,  hemoglobina: 11.0, vcm: 70,  rdw: 17,   satTransf: 15, ...base },
  { label: '[F] Macrocitose sem anemia',       ferritina: 80,  hemoglobina: 13.0, vcm: 105, rdw: 16,   satTransf: 30, ...base },
  { label: '[F] Policitemia vera',             ferritina: 15,  hemoglobina: 16.0, vcm: 88,  rdw: 13,   satTransf: 15, ...base },
  { label: '[F] Alcoolista macrocitose',       ferritina: 80,  hemoglobina: 10.0, vcm: 105, rdw: 16,   satTransf: 30, ...alc },
  { label: '[F] Transfundido ferritina alta',  ferritina: 500, hemoglobina: 11.0, vcm: 85,  rdw: 13,   satTransf: 55, ...trans },
];

let gaps = 0;
casos.forEach(caso => {
  const { label, ...inputs } = caso;
  const matrix = label.startsWith('[M]') ? maleMatrix : femaleMatrix;
  const resultado = matrix.find(item => match(item, inputs));
  const status = resultado ? `ID ${resultado.id} - ${resultado.label}` : 'NAO ENCONTRADO ❌';
  if (!resultado) gaps++;
  console.log(`${label}`);
  console.log(`  => ${status}`);
});

console.log(`\nTotal de gaps: ${gaps}`);