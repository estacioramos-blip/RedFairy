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
{
  desc: 'M: Anemia moderada hemorragia sat baixa',
  sexo: 'M', esperado: { encontrado: true, id: 94 },
  inputs: { ferritina: 18, hemoglobina: 12.6, vcm: 78, rdw: 21, satTransf: 14,
    bariatrica: false, vegetariano: false, perda: true, alcoolista: false, transfundido: false,
    aspirina: true, ferroOral: true },
},
]

// ─── Execução dos testes ──────────────────────────────────────────────────────
let pass = 0, fail = 0, notFound = 0;
const fails = [// ─── ID 94 — ANEMIA MODERADA COM HEMORRAGIA, SIDEROPENIA E SAT BAIXA (M) ────
  {
    id: 94,
    label: "ANEMIA MODERADA COM HEMORRAGIA E SIDEROPENIA GRAVE",
    color: "orange",
    conditions: {
      ferritina:   { min: 0,   max: 24   },
      hemoglobina: { min: 10.0,max: 13.4 },
      vcm:         { min: 0,   max: 79   },
      rdw:         { min: 15.1,max: 999  },
      satTransf:   { min: 0,   max: 19   },
      bariatrica:  false,
      vegetariano: false,
      perda:       true,
      alcoolista:  false,
      transfundido: false,
    },
    diagnostico: "MODERADA ANEMIA MICROCÍTICA COM SIDEROPENIA ACENTUADA POSSIVELMENTE CAUSADA PELA HEMORRAGIA INFORMADA, SEM REPOSIÇÃO OU COM REPOSIÇÃO INADEQUADA. A BAIXA SATURAÇÃO DA TRANSFERRINA INDICA ESGOTAMENTO DAS RESERVAS DE FERRO. REQUER INTERVENÇÃO MÉDICA IMEDIATA. INDEPENDENTEMENTE SE A PERDA DE SANGUE FOI CONTROLADA OU INTERROMPIDA, A REPOSIÇÃO DO FERRO DEVE SER POR VIA ENDOVENOSA PARA RESULTADOS MAIS RÁPIDOS. PERSISTINDO A HEMORRAGIA, A REPOSIÇÃO DE FERRO DEVERÁ SER ESTENDIDA. FRASE DATA.",
    recomendacaoAge1: "AVALIAÇÃO COM HEMATOLOGISTA ASSIM QUE POSSÍVEL. VOCÊ NÃO PODERIA DOAR SANGUE. SE VOCÊ CONSEGUIU DOAR SANGUE NOS ÚLTIMOS MESES DEVE TER SIDO MUITO PREJUDICIAL. NO FUTURO, PARA PODER VOLTAR A DOAR, VOCÊ PRECISARÁ SER AVALIADO POR MÉDICO.",
    recomendacaoAge2: "AVALIAÇÃO COM HEMATOLOGISTA ASSIM QUE POSSÍVEL. NESSA FAIXA ETÁRIA, A ANEMIA IMPÕE MAIOR IMPACTO METABÓLICO. VOCÊ NÃO PODERIA DOAR SANGUE. SE VOCÊ CONSEGUIU DOAR SANGUE NOS ÚLTIMOS MESES DEVE TER SIDO MUITO PREJUDICIAL.",
    comentarioAspirina: "ASPIRINA PRODUZ PEQUENA PERDA CRÔNICA DE SANGUE EM MUITOS USUÁRIOS. PODE REDUZIR A RESERVA DE FERRO E AGRAVAR A ANEMIA. ASPIRINA PODE AGRAVAR OUTRAS HEMORRAGIAS. CONSIDERE REVER A PRESCRIÇÃO.",
    comentarioB12: "A REPOSIÇÃO DE VITAMINA B12 DEVE TER SIDO DESNECESSÁRIA. EM GERAL É BENÉFICA E O FÍGADO ARMAZENA O EXCESSO. NA VIGÊNCIA DE HEMORRAGIA, A NECESSIDADE BIOLÓGICA ESTARÁ AUMENTADA.",
    comentarioFerro: "A DOSE DE FERRO FOI INSUFICIENTE PARA IMPEDIR A ANEMIA. A SATURAÇÃO DA TRANSFERRINA MUITO BAIXA INDICA ESGOTAMENTO DO COMPARTIMENTO CIRCULANTE DE FERRO. NECESSÁRIO FERRO ENDOVENOSO. MAS CUIDADO AO REPOR FERRO, ESPECIALMENTE SE PARENTERAL: O EXCESSO É NOCIVO.",
    proximosExames: ["HEMOGRAMA","RETICULÓCITOS","FERRITINA","SATURAÇÃO DA TRANSFERRINA","VITAMINA B12","HAPTOGLOBINA","LDH","COOMBS DIRETO","CEA","SANGUE NAS FEZES","CREATININA","ENDOSCOPIA DIGESTIVA","COLONOSCOPIA DE ROTINA","CA 19.9"],
  },
  // ─── ID 95 — ANEMIA COM HEMORRAGIA, VCM NORMOCÍTICO E SAT BAIXA (M) ─────────
  {
    id: 95,
    label: "ANEMIA COM HEMORRAGIA, VCM NORMAL E SIDEROPENIA",
    color: "orange",
    conditions: {
      ferritina:   { min: 0,   max: 24   },
      hemoglobina: { min: 10.0,max: 13.4 },
      vcm:         { min: 80,  max: 105  },
      rdw:         { min: 15.1,max: 999  },
      satTransf:   { min: 0,   max: 19   },
      bariatrica:  false,
      vegetariano: false,
      perda:       true,
      alcoolista:  false,
      transfundido: false,
    },
    diagnostico: "ANEMIA COM VCM NORMAL, ANISOCITOSE E SIDEROPENIA EM CONTEXTO DE HEMORRAGIA SUGERE FASE INICIAL OU INTERMEDIÁRIA DE DEFICIÊNCIA DE FERRO POR PERDA SANGUÍNEA, ANTES QUE A MICROCITOSE SE ESTABELEÇA. A BAIXA SATURAÇÃO DA TRANSFERRINA CONFIRMA DEPLEÇÃO DO FERRO CIRCULANTE. CONTROLADA A HEMORRAGIA, A REPOSIÇÃO DE FERRO ORAL PODE SER SUFICIENTE; SE PERSISTIR, FERRO ENDOVENOSO SERÁ NECESSÁRIO. FRASE DATA.",
    recomendacaoAge1: "AVALIAÇÃO COM HEMATOLOGISTA ASSIM QUE POSSÍVEL. COM HISTÓRICO DE HEMORRAGIA VOCÊ NÃO DEVERIA DOAR SANGUE. A FERRITINA BAIXA CONFIRMA QUE A DOAÇÃO FOI PREJUDICIAL. SÓ VOLTE A DOAR SANGUE SE AUTORIZADO PELO SEU MÉDICO.",
    recomendacaoAge2: "AVALIAÇÃO COM HEMATOLOGISTA ASSIM QUE POSSÍVEL. NESSA FAIXA ETÁRIA, HAVENDO HISTÓRICO DE HEMORRAGIA A SIDEROPENIA IMPÕE MAIOR RISCO SOBRE A ECONOMIA DO CORPO. O MÉDICO VAI ESTABELECER UM CALENDÁRIO DE TRATAMENTO E REVISÕES. COM HISTÓRICO DE HEMORRAGIA VOCÊ NÃO DEVERIA DOAR SANGUE.",
    comentarioAspirina: "ASPIRINA PRODUZ PEQUENA PERDA CRÔNICA DE SANGUE EM MUITOS USUÁRIOS. PODE REDUZIR A RESERVA DE FERRO E AGRAVAR A ANEMIA. ASPIRINA PODE AGRAVAR OUTRAS HEMORRAGIAS. CONSIDERE REVER A PRESCRIÇÃO.",
    comentarioB12: "A REPOSIÇÃO DE VITAMINA B12 DEVE TER SIDO DESNECESSÁRIA. EM GERAL É BENÉFICA E O FÍGADO ARMAZENA O EXCESSO. NA VIGÊNCIA DE HEMORRAGIA, A NECESSIDADE BIOLÓGICA ESTARÁ AUMENTADA.",
    comentarioFerro: "O FERRO FOI IMPORTANTE MAS INSUFICIENTE PARA IMPEDIR A ANEMIA E FORMAR RESERVA. A DEPENDER DA INTENSIDADE E DURAÇÃO DA HEMORRAGIA, PODE SER NECESSÁRIO FERRO ENDOVENOSO. MAS CUIDADO AO REPOR FERRO, ESPECIALMENTE SE PARENTERAL: O EXCESSO É NOCIVO.",
    proximosExames: ["HEMOGRAMA","RETICULÓCITOS","FERRITINA","SATURAÇÃO DA TRANSFERRINA","VITAMINA B12","AST/ALT","SANGUE NAS FEZES","ANTI-H. PYLORI IgG/IgM","CEA","CREATININA","ENDOSCOPIA DIGESTIVA","COLONOSCOPIA DE ROTINA","CA 19.9"],
  },
];

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
