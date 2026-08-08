// ============================================================
// limitesInput.js — FONTE ÚNICA das faixas de entrada de dados.
//
// Existiam duas tabelas soltas (LIMITES_ABERRANTE no Calculator e LIMITES_OBA
// no OBAModal), e vários campos sem tabela nenhuma — altura, peso atual,
// fração de ejeção, o hemograma de follow-up do OBA (hb_novo/vcm_novo/...).
// Era assim que uma altura de 1789 cm passava e produzia IMC 0,2 no relatório.
//
// DOIS NÍVEIS (decisão do Estácio, jul/2026):
//   • poss = faixa FISIOLOGICAMENTE POSSÍVEL. Fora dela é erro de digitação,
//     não é paciente — BLOQUEIA (não deixa avançar).
//   • prov = faixa PROVÁVEL. Fora dela, mas dentro de `poss`, é o extremo
//     clínico de verdade — só AVISA (⚠ ABERRANTE) e deixa passar.
// O rigor é o mesmo para médico e para paciente: valor impossível é erro de
// digitação venha de quem vier.
//
// ATENÇÃO: `min`/`max` no <input type="number"> do HTML NÃO impedem digitação
// (só mexem na setinha). Toda a proteção real tem que passar por aqui.
// ============================================================

// Faixas do eritron — reaproveitadas pelo hemograma da triagem, pelo do médico
// e pelo hemograma de follow-up do OBA (as chaves *_novo).
const ERITRON = {
  hemoglobina:  { poss: [1, 25],    prov: [4, 22],    label: 'Hemoglobina',              un: 'g/dL' },
  vcm:          { poss: [40, 160],  prov: [50, 140],  label: 'VCM',                      un: 'fL' },
  rdw:          { poss: [5, 60],    prov: [8, 30],    label: 'RDW-CV',                   un: '%' },
  ferritina:    { poss: [0, 20000], prov: [1, 5000],  label: 'Ferritina',                un: 'ng/mL' },
  satTransf:    { poss: [0, 100],   prov: [1, 99],    label: 'Saturação da transferrina', un: '%' },
}

export const FAIXAS = {
  // ── Eritron (nomes usados no Calculator e na TriagemModal) ──
  ...ERITRON,
  // Mesmos analitos com os nomes usados dentro do OBA.
  hb_novo:        { ...ERITRON.hemoglobina },
  vcm_novo:       { ...ERITRON.vcm },
  rdw_novo:       { ...ERITRON.rdw },
  ferritina_novo: { ...ERITRON.ferritina },
  sat_novo:       { ...ERITRON.satTransf },
  ferritina_oba:  { ...ERITRON.ferritina },
  // Apelidos usados no Calculator / PatientDashboard (macrocitose: VCM > 100).
  b12_valor:      { poss: [10, 30000], prov: [50, 2000], label: 'Vitamina B12', un: 'pg/mL' },
  folato_valor:   { poss: [0.1, 200],  prov: [1, 50],    label: 'Folato',       un: 'ng/mL' },
  // Peso usado nos cálculos de dose (ferro EV) e de volume (sangria).
  peso:           { poss: [25, 400],   prov: [35, 250],  label: 'Peso',         un: 'kg' },

  // ── Antropometria (Status Ponderal do OBA) ──
  altura:          { poss: [120, 230], prov: [140, 200], label: 'Altura',            un: 'cm' },
  peso_antes:      { poss: [30, 400],  prov: [50, 250],  label: 'Peso antes',        un: 'kg' },
  peso_minimo_pos: { poss: [25, 400],  prov: [35, 200],  label: 'Menor peso pós',    un: 'kg' },
  peso_atual:      { poss: [25, 400],  prov: [35, 250],  label: 'Peso atual',        un: 'kg' },
  meta_kg:         { poss: [1, 200],   prov: [1, 80],    label: 'Meta de perda',     un: 'kg' },

  // ── Gineco / obstétrico ──
  semanas_gestacao:    { poss: [1, 45], prov: [1, 42], label: 'Semanas de gestação',    un: 'sem' },
  gestacoes_previas:   { poss: [0, 25], prov: [0, 15], label: 'Gestações anteriores',   un: '' },
  abortamentos_numero: { poss: [0, 25], prov: [0, 10], label: 'Abortamentos',           un: '' },

  // ── Cardiovascular ──
  fracao_ejecao:    { poss: [5, 90],    prov: [20, 75],   label: 'Fração de ejeção', un: '%' },
  score_calcio:     { poss: [0, 10000], prov: [0, 2000],  label: 'Escore de cálcio', un: '' },
  estenose_maxima:  { poss: [0, 100],   prov: [0, 100],   label: 'Estenose máxima',  un: '%' },

  // ── Hemograma / bioquímica do OBA ──
  leucocitos:      { poss: [100, 500000], prov: [500, 20000], label: 'Leucócitos',   un: '/µL' },
  neutrofilos:     { poss: [0, 100],      prov: [1, 99],      label: 'Neutrófilos',  un: '%' },
  plaquetas:       { poss: [1, 3000],     prov: [10, 1000],   label: 'Plaquetas',    un: 'mil/µL' },
  vitamina_b12:    { poss: [10, 30000],   prov: [50, 2000],   label: 'Vitamina B12', un: 'pg/mL' },
  vitamina_d:      { poss: [1, 500],      prov: [1, 200],     label: 'Vitamina D',   un: 'ng/mL' },
  tsh:             { poss: [0.001, 500],  prov: [0.01, 50],   label: 'TSH',          un: 'µUI/mL' },
  t4_livre:        { poss: [0.05, 12],    prov: [0.4, 3],     label: 'T4 livre',     un: 'ng/dL' },
  hb_glicada:      { poss: [2, 25],       prov: [3, 20],      label: 'Hb glicada',   un: '%' },
  glicemia:        { poss: [10, 1500],    prov: [30, 600],    label: 'Glicemia',     un: 'mg/dL' },
  insulina:        { poss: [0.1, 1000],   prov: [0.5, 200],   label: 'Insulina',     un: 'µUI/mL' },
  triglicerides:   { poss: [10, 10000],   prov: [20, 3000],   label: 'Triglicérides', un: 'mg/dL' },
  ast:             { poss: [1, 20000],    prov: [5, 1000],    label: 'AST',          un: 'U/L' },
  alt:             { poss: [1, 20000],    prov: [5, 1000],    label: 'ALT',          un: 'U/L' },
  gama_gt:         { poss: [1, 20000],    prov: [5, 1000],    label: 'Gama-GT',      un: 'U/L' },
  creatinina:      { poss: [0.1, 40],     prov: [0.3, 15],    label: 'Creatinina',   un: 'mg/dL' },
  ureia:           { poss: [2, 500],      prov: [10, 100],    label: 'Ureia',        un: 'mg/dL' },
  acido_urico:     { poss: [0.2, 40],     prov: [1, 20],      label: 'Ácido úrico',  un: 'mg/dL' },
  d_dimero:        { poss: [0, 100000],   prov: [0, 50000],   label: 'D-dímero',     un: 'ng/mL' },
  ige_total:       { poss: [0, 200000],   prov: [0, 50000],   label: 'IgE total',    un: 'UI/mL' },
  folatos:         { poss: [0.1, 200],    prov: [1, 50],      label: 'Folatos',      un: 'ng/mL' },
  zinco:           { poss: [5, 1000],     prov: [20, 300],    label: 'Zinco',        un: 'µg/dL' },
  pth:             { poss: [0.5, 10000],  prov: [1, 2000],    label: 'PTH',          un: 'pg/mL' },
  calcio_ionico:   { poss: [0.2, 5],      prov: [0.5, 3],     label: 'Cálcio iônico', un: 'mmol/L' },
  magnesio:        { poss: [0.1, 20],     prov: [0.5, 10],    label: 'Magnésio',     un: 'mg/dL' },
  proteina_total:  { poss: [1, 15],       prov: [5, 9],       label: 'Proteína total', un: 'g/dL' },
  albumina:        { poss: [0.5, 8],      prov: [3, 5.5],     label: 'Albumina',     un: 'g/dL' },
  colesterol_total: { poss: [20, 2000],   prov: [50, 700],    label: 'Colesterol total', un: 'mg/dL' },
  ldl_c:           { poss: [1, 1500],     prov: [10, 500],    label: 'LDL-c',        un: 'mg/dL' },
  hdl_c:           { poss: [1, 500],      prov: [5, 200],     label: 'HDL-c',        un: 'mg/dL' },
  lpa:             { poss: [0, 1000],     prov: [0, 300],     label: 'Lp(a)',        un: 'nmol/L' },
  apob:            { poss: [1, 1000],     prov: [10, 300],    label: 'ApoB',         un: 'mg/dL' },
  apoa:            { poss: [1, 1000],     prov: [30, 300],    label: 'ApoA',         un: 'mg/dL' },
  sdldl:           { poss: [0, 500],      prov: [0, 100],     label: 'sdLDL',        un: 'mg/dL' },
  vitamina_a:      { poss: [1, 1000],     prov: [5, 200],     label: 'Vitamina A',   un: 'µg/dL' },
  vitamina_e:      { poss: [0.1, 200],    prov: [1, 50],      label: 'Vitamina E',   un: 'mg/L' },
  tiamina:         { poss: [1, 2000],     prov: [10, 500],    label: 'Tiamina',      un: 'nmol/L' },
  selenio:         { poss: [1, 2000],     prov: [10, 400],    label: 'Selênio',      un: 'µg/L' },
  vitamina_c:      { poss: [0.01, 50],    prov: [0.1, 10],    label: 'Vitamina C',   un: 'mg/dL' },
  vitamina_k:      { poss: [0.01, 50],    prov: [0.05, 15],   label: 'Vitamina K',   un: 'ng/mL' },
  niacina:         { poss: [0.01, 100],   prov: [0.1, 30],    label: 'Niacina',      un: 'µg/mL' },
  testosterona:    { poss: [1, 10000],    prov: [5, 2000],    label: 'Testosterona', un: 'ng/dL' },
  psa_total:       { poss: [0, 5000],     prov: [0, 100],     label: 'PSA total',    un: 'ng/mL' },
  prolactina:      { poss: [0.1, 20000],  prov: [1, 200],     label: 'Prolactina',   un: 'ng/mL' },
  estradiol:       { poss: [1, 30000],    prov: [5, 5000],    label: 'Estradiol',    un: 'pg/mL' },
  beta_hcg:        { poss: [0, 1000000],  prov: [0, 200000],  label: 'Beta-hCG',     un: 'mUI/mL' },
  ca125:           { poss: [0, 50000],    prov: [0, 500],     label: 'CA-125',       un: 'U/mL' },
  ca153:           { poss: [0, 50000],    prov: [0, 500],     label: 'CA-15.3',      un: 'U/mL' },
  ca199:           { poss: [0, 50000],    prov: [0, 500],     label: 'CA-19.9',      un: 'U/mL' },
  cea:             { poss: [0, 10000],    prov: [0, 100],     label: 'CEA',          un: 'ng/mL' },
  calprotectina:   { poss: [0, 50000],    prov: [0, 500],     label: 'Calprotectina fecal', un: 'µg/g' },
}

// Normaliza o FORMATO do número digitado. FONTE ÚNICA — use esta, não escreva
// outra (ver o histórico abaixo).
//
// Faz, nesta ordem:
//   1. tira o separador de MILHAR:  '1.200' → '1200'
//   2. vírgula decimal vira ponto:  '13,5'  → '13.5'
//   3. descarta o que não for dígito ou ponto
//
// ⚠ A ORDEM DE 1 E 2 NÃO É ARBITRÁRIA. Em '1.234,56', se a vírgula virasse
// ponto primeiro, o número teria dois pontos e a regex de milhar não saberia
// qual é qual. Tirando o milhar antes, sobra '1234,56' → '1234.56'.
//
// ⚠ A regex do milhar exige EXATAMENTE 3 dígitos depois do ponto e nenhum a
// mais (`(?!\d)`), então '13.5' e '100.45' passam intactos. É o ponto de milhar
// que some, não o decimal.
//
// ⚠ NÃO ARREDONDA. Até 06/08/2026 a versão do Calculator terminava em
// `Math.round` e o motor recebia 14 quando o médico digitava 13,5 — mudava
// diagnóstico em ~28% das combinações com decimal (commit `6e94bd8`).
//
// HISTÓRICO: esta função existia desde sempre mas NINGUÉM fora deste arquivo a
// usava; o Calculator tinha a própria (`sanitizarNumero`), que tratava o milhar
// enquanto esta não. Resultado: ferritina '1.200' valia 1200 para o motor e 1,2
// para a crítica de aberrantes, que acusava "⚠ ABERRANTE" num valor correto.
// Unificado em 08/08/2026 por decisão do Estácio.
export function normalizarNumero(v) {
  if (v == null) return ''
  const bruto = String(v).trim()
  // '1.200' é ambíguo (mil e duzentos × um vírgula dois) e a regra escolhe
  // MILHAR — exceto quando a parte inteira é 0: '0.500' nunca é "zero mil e
  // quinhentos", é meio. Sem esta exceção, creatinina/magnésio/cálcio iônico
  // (valores abaixo de 1, comuns com 3 casas) virariam centenas.
  const semMilhar = /^0\./.test(bruto) ? bruto : bruto.replace(/\.(?=\d{3}(?!\d))/g, '')
  return semMilhar.replace(',', '.').replace(/[^0-9.]/g, '')
}

// Converte pra número respeitando o campo vazio.
// ARMADILHA: Number('') === 0 — por isso o teste de vazio vem antes.
export function paraNumero(v) {
  const s = normalizarNumero(v)
  if (s === '') return null
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
}

/**
 * Checa um valor contra a faixa da chave.
 * Devolve { status, msg }:
 *   'ok'       — dentro do provável (ou chave sem faixa cadastrada)
 *   'aviso'    — possível, porém improvável → mostra ⚠ ABERRANTE, deixa passar
 *   'bloqueio' — fisiologicamente impossível → impede avançar
 *   'invalido' — texto que não vira número
 * Campo vazio devolve 'ok' (a obrigatoriedade é checada em outro lugar).
 */
export function checarValor(chave, valor) {
  const f = FAIXAS[chave]
  const s = normalizarNumero(valor)
  if (s === '') return { status: 'ok', msg: null }
  if (!f) return { status: 'ok', msg: null }
  const n = parseFloat(s)
  if (!Number.isFinite(n)) return { status: 'invalido', msg: 'Valor inválido.' }
  const un = f.un ? ' ' + f.un : ''
  if (n < f.poss[0] || n > f.poss[1]) {
    return {
      status: 'bloqueio',
      msg: `${f.label} deve ficar entre ${f.poss[0]} e ${f.poss[1]}${un}. Confira o valor digitado.`,
    }
  }
  if (n < f.prov[0] || n > f.prov[1]) {
    return { status: 'aviso', msg: `Valor fora do habitual para ${f.label.toLowerCase()} — confirme.` }
  }
  return { status: 'ok', msg: null }
}

// Atalhos de leitura.
export const ehBloqueio = (chave, valor) => checarValor(chave, valor).status === 'bloqueio'
export const ehAviso    = (chave, valor) => checarValor(chave, valor).status === 'aviso'

/**
 * Roda checarValor num objeto inteiro { chave: valor }.
 * Devolve só os campos bloqueados: { chave: mensagem }. Vazio = pode avançar.
 */
export function bloqueiosDe(obj) {
  const out = {}
  Object.keys(obj || {}).forEach(k => {
    const r = checarValor(k, obj[k])
    if (r.status === 'bloqueio' || r.status === 'invalido') out[k] = r.msg
  })
  return out
}
