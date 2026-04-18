// ─────────────────────────────────────────────────────────────────────────────
// obaEngine.js — Extensão bariátrica do RedFairy
// Recebe: resultadoEritron (decisionEngine), dadosOBA (anamnese), examesOBA
// Retorna: relatório OBA com alertas, módulos e orientações
// ─────────────────────────────────────────────────────────────────────────────

// ── Valores de referência pós-bariátrica (ASMBS/IFSO/literatura) ─────────────
const REF = {
  // Vitamina B12 (pg/mL)
  b12:          { critico: 100, baixo: 200, normal: 300, alto: 900 },
  // Vitamina D 25-OH (ng/mL)
  vitD:         { critico: 10,  baixo: 20,  normal: 30,  alto: 100 },
  // Zinco sérico (mcg/dL)
  zinco:        { critico: 50,  baixo: 60,  normal: 100, alto: 130 },
  // Vitamina A (mcg/dL)
  vitA:         { critico: 15,  baixo: 20,  normal: 65,  alto: 77  },
  // Tiamina / B1 (nmol/L)
  tiamina:      { critico: 50,  baixo: 70,  normal: 200, alto: 450 },
  // Vitamina E (mg/dL)
  vitE:         { critico: 0.5, baixo: 0.8, normal: 1.5, alto: 3.5 },
  // Vitamina K (ng/mL)
  vitK:         { critico: 0.1, baixo: 0.2, normal: 1.0, alto: 2.2 },
  // Folatos (ng/mL)
  folatos:      { critico: 2,   baixo: 4,   normal: 6,   alto: 20  },
  // Selênio (mcg/L)
  selenio:      { critico: 40,  baixo: 60,  normal: 120, alto: 200 },
  // Vitamina C (mg/dL)
  vitC:         { critico: 0.2, baixo: 0.4, normal: 0.7, alto: 2.0 },
  // Niacina / B3 (mcg/dL) — como ácido nicotínico
  niacina:      { critico: 20,  baixo: 50,  normal: 90,  alto: 200 },
  // Glicemia jejum (mg/dL)
  glicemia:     { otimo: 100, preD: 126, diabetes: 200 },
  // Insulina jejum (mcUI/mL)
  insulina:     { normal: 15, resistencia: 25 },
  // HbA1c (%)
  hbA1c:        { otimo: 5.7, preD: 6.5, diabetes: 7.0, ruim: 8.0 },
  // TSH (mcUI/mL)
  tsh:          { hipotireoidismo: 4.5, hipertireoidismo: 0.4 },
  // Triglicérides (mg/dL)
  tg:           { otimo: 150, alto: 200, muitoAlto: 500 },
  // AST/ALT (U/L) — limite superior da normalidade
  ast:          { normal: 40 },
  alt:          { normal: 56 },
  gamaGt:       { normal_m: 61, normal_f: 36 },
  // Creatinina (mg/dL)
  creatinina:   { normal_m: 1.2, normal_f: 1.0 },
  // Ácido úrico (mg/dL)
  acidoUrico:   { normal_m: 7.0, normal_f: 6.0 },
  // PSA total (ng/mL)
  psa:          { normal: 4.0, alto: 10.0 },
  // Neutrófilos % e absolutos
  neutrofilos:  { baixoPct: 40, baixoAbs: 1500, criticoAbs: 1000 },
  // Plaquetas (mil/mm3)
  plaquetas:    { baixo: 100, normal: 150, alto: 450 },
  // Testosterona masculina (ng/dL)
  testoM:       { baixo: 300, normal: 700 },
  // Estradiol feminino (pg/mL)
  estradiolF:   { baixo: 20, alto: 200 },
}

// ── Classificação de gravidade ─────────────────────────────────────────────
const GRAVE    = 'grave'
const MODERADO = 'moderado'
const LEVE     = 'leve'
const NORMAL   = 'normal'
const ALTO     = 'alto'

// ── Tipo de cirurgia e seu grau de disabsorção ─────────────────────────────
const DISAB = {
  'Y DE ROUX':              { grau: 3, nomeCurto: 'Y de Roux'        },
  'FOBI-CAPELLA':           { grau: 3, nomeCurto: 'Fobi-Capella'     },
  'SLEEVE':                 { grau: 2, nomeCurto: 'Sleeve'           },
  'BANDA GÁSTRICA AJUSTÁVEL':{ grau: 1, nomeCurto: 'Banda Gástrica'  },
  'NÃO SEI':                { grau: 2, nomeCurto: 'Bariátrica'       },
}

// Normaliza tipo de cirurgia — aceita variações de nome do OBAModal
function normalizarCirurgia(tipo) {
  if (!tipo) return 'NÃO SEI'
  const t = tipo.toUpperCase()
  if (t.includes('ROUX') || t.includes('BYPASS') || t.includes('FOBI') || t.includes('CAPELLA')) {
    return t.includes('FOBI') || t.includes('CAPELLA') ? 'FOBI-CAPELLA' : 'Y DE ROUX'
  }
  if (t.includes('SLEEVE') || t.includes('GASTRECTOMIA') || t.includes('VERTICAL')) return 'SLEEVE'
  if (t.includes('BANDA')) return 'BANDA GÁSTRICA AJUSTÁVEL'
  return DISAB[tipo] ? tipo : 'NÃO SEI'
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export function avaliarOBA(resultadoEritron, dadosOBA, examesOBA) {
  if (!resultadoEritron || !dadosOBA) return null
  // examesOBA pode ser {} (vazio) — normalizar
  examesOBA = examesOBA || {}

  const sexo       = dadosOBA.sexo        || 'F'
  const idade      = parseInt(dadosOBA.idade) || 0
  const tipoCir    = normalizarCirurgia(dadosOBA.tipo_cirurgia)
  const mesesPos   = parseInt(dadosOBA.meses_pos_cirurgia) || 0
  const disab      = DISAB[tipoCir] || DISAB['NÃO SEI']

  const alertas     = []
  const modulos     = []
  const examesSuger = []

  // ── 1. MÓDULO ERITRON BARIÁTRICO ────────────────────────────────────────
  const modEritron = buildModEritron(resultadoEritron, dadosOBA, examesOBA, mesesPos, disab, tipoCir, alertas, examesSuger)
  modulos.push(modEritron)

  // ── 2. MÓDULO B12 ────────────────────────────────────────────────────────
  const modB12 = buildModB12(examesOBA, dadosOBA, disab, alertas, examesSuger)
  if (modB12) modulos.push(modB12)

  // ── 3. MÓDULO VITAMINA D ─────────────────────────────────────────────────
  const modVitD = buildModVitD(examesOBA, dadosOBA, alertas, examesSuger)
  if (modVitD) modulos.push(modVitD)

  // ── 4. MÓDULO VITAMINAS LIPOSSOLÚVEIS E TIAMINA ─────────────────────────
  const modVitaminas = buildModVitaminas(examesOBA, dadosOBA, disab, alertas, examesSuger)
  if (modVitaminas) modulos.push(modVitaminas)

  // ── 5. MÓDULO GLICOMETABÓLICO ────────────────────────────────────────────
  const modGlico = buildModGlico(examesOBA, dadosOBA, alertas, examesSuger)
  if (modGlico) modulos.push(modGlico)

  // ── 6. MÓDULO HEPÁTICO E RENAL ───────────────────────────────────────────
  const modOrgaos = buildModOrgaos(examesOBA, dadosOBA, sexo, alertas, examesSuger)
  if (modOrgaos) modulos.push(modOrgaos)

  // ── 7. MÓDULO PONDERAL ───────────────────────────────────────────────────
  const modPonderal = buildModPonderal(dadosOBA, alertas)
  if (modPonderal) modulos.push(modPonderal)

  // ── 8. MÓDULO VASCULAR ───────────────────────────────────────────────────
  const modVascular = buildModVascular(dadosOBA, alertas, examesSuger)
  if (modVascular) modulos.push(modVascular)

  // ── 9. MÓDULO ÓSSEO ─────────────────────────────────────────────────────
  const modOsseo = buildModOsseo(dadosOBA, examesOBA, alertas, examesSuger)
  if (modOsseo) modulos.push(modOsseo)

  // ── 10. MÓDULO HORMONAL ─────────────────────────────────────────────────
  const modHormonal = buildModHormonal(examesOBA, dadosOBA, sexo, idade, alertas, examesSuger)
  if (modHormonal) modulos.push(modHormonal)

  // ── 11. MÓDULO ONCOLÓGICO ────────────────────────────────────────────────
  const modOncol = buildModOncologico(examesOBA, dadosOBA, sexo, idade, alertas, examesSuger)
  if (modOncol) modulos.push(modOncol)

  // ── 12. MÓDULO COMPORTAMENTAL E QUALIDADE DE VIDA ───────────────────────
  const modComport = buildModComportamental(dadosOBA)
  if (modComport) modulos.push(modComport)

  // ── 13. MÓDULO GESTACIONAL ───────────────────────────────────────────────
  const modGest = buildModGestacional(dadosOBA, mesesPos, alertas, examesSuger)
  if (modGest) modulos.push(modGest)

  // ── Ordenar alertas por prioridade ──────────────────────────────────────
  const prioridade = { [GRAVE]: 0, [MODERADO]: 1, [LEVE]: 2 }
  alertas.sort((a, b) => prioridade[a.nivel] - prioridade[b.nivel])

  // ── Deduplicar exames sugeridos ──────────────────────────────────────────
  const examesFinal = [...new Set([...examesSuger])]

  return {
    tipoCirurgia:       disab.nomeCurto,
    mesesPosCirurgia:   mesesPos,
    grauDisabsorcao:    disab.grau,
    alertas,
    modulos,
    examesComplementares: examesFinal,
    dataAvaliacao:      new Date().toLocaleDateString('pt-BR'),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 1 — ERITRON BARIÁTRICO
// ─────────────────────────────────────────────────────────────────────────────
function buildModEritron(eritron, dadosOBA, examesOBA, mesesPos, disab, tipoCir, alertas, examesSuger) {
  const linhas = []
  const label  = eritron.label || ''
  const color  = eritron.color || 'green'

  // Contexto da cirurgia
  if (mesesPos > 0 && mesesPos <= 6) {
    linhas.push('PERÍODO CRÍTICO PÓS-OPERATÓRIO IMEDIATO (ATÉ 6 MESES): AS DEFICIÊNCIAS NUTRICIONAIS INSTALAM-SE RAPIDAMENTE NESSA FASE. A SUPLEMENTAÇÃO DEVE SER INICIADA IMEDIATAMENTE APÓS A CIRURGIA E MANTIDA DE FORMA CONTÍNUA.')
  } else if (mesesPos > 6 && mesesPos <= 24) {
    linhas.push('PRIMEIRO ANO E MEIO PÓS-CIRURGIA: FASE DE MAIOR RISCO PARA DEFICIÊNCIAS PROGRESSIVAS. A SÍNDROME DISABSORTIVA ESTÁ NO PICO E AS RESERVAS NUTRICIONAIS DEPLETEM-SE RAPIDAMENTE SEM SUPLEMENTAÇÃO ADEQUADA.')
  } else if (mesesPos > 24 && mesesPos <= 60) {
    linhas.push('ENTRE 2 E 5 ANOS PÓS-CIRURGIA: FASE TARDIA COM RISCOS CUMULATIVOS. DEFICIÊNCIAS ESTABELECIDAS HÁ MAIS TEMPO PODEM TER IMPACTO NEUROLÓGICO, ÓSSEO E CARDIOVASCULAR. A MANUTENÇÃO DA SUPLEMENTAÇÃO É FUNDAMENTAL.')
  } else if (mesesPos > 60) {
    linhas.push(`MAIS DE ${Math.round(mesesPos/12)} ANOS PÓS-CIRURGIA: DEFICIÊNCIAS CRÔNICAS ACUMULADAS. O SEGUIMENTO LABORATORIAL PERMANENTE É INDISPENSÁVEL. O ABANDONO DO ACOMPANHAMENTO É A PRINCIPAL CAUSA DE COMPLICAÇÕES TARDIAS.`)
  }

  // Grau de disabsorção
  if (disab.grau === 3) {
    linhas.push(`${tipoCir.toUpperCase()}: CIRURGIA COM ALTO GRAU DE DISABSORÇÃO. A ABSORÇÃO DE FERRO, VITAMINA B12, VITAMINAS LIPOSSOLÚVEIS (A, D, E, K) E ZINCO ESTÁ SIGNIFICATIVAMENTE COMPROMETIDA. A REPOSIÇÃO PARENTERAL OU SUBLINGUAL É OBRIGATÓRIA PARA A MAIORIA DOS NUTRIENTES ESSENCIAIS.`)
  } else if (disab.grau === 2) {
    linhas.push(`${tipoCir.toUpperCase()}: CIRURGIA COM GRAU MODERADO DE DISABSORÇÃO. A ABSORÇÃO DE VITAMINA B12 E FERRO PODE ESTAR COMPROMETIDA. A SUPLEMENTAÇÃO DIRIGIDA E O MONITORAMENTO LABORATORIAL SÃO ESSENCIAIS.`)
  } else if (disab.grau === 1) {
    linhas.push(`${tipoCir.toUpperCase()}: CIRURGIA COM MENOR IMPACTO ABSORTIVO. NO ENTANTO, O ACOMPANHAMENTO NUTRICIONAL E A SUPLEMENTAÇÃO PREVENTIVA SÃO RECOMENDADOS, ESPECIALMENTE SE HÁ RESTRIÇÃO ALIMENTAR SIGNIFICATIVA.`)
  }

  // Relação com o resultado do eritron
  if (color === 'green') {
    linhas.push('O ERITRON ESTÁ COMPENSADO. CONSIDERANDO O CONTEXTO BARIÁTRICO, ESSE RESULTADO REFLETE SUPLEMENTAÇÃO ADEQUADA OU FASE AINDA PRECOCE ANTES DA DEPLEÇÃO DAS RESERVAS. MANTER MONITORAMENTO LABORATORIAL SEMESTRAL.')
  } else if (color === 'yellow') {
    linhas.push('O ERITRON APRESENTA ALTERAÇÕES INCIPIENTES. NO CONTEXTO BARIÁTRICO, ISSO INDICA QUE A SUPLEMENTAÇÃO ATUAL É INSUFICIENTE OU QUE A SÍNDROME DISABSORTIVA ESTÁ PRODUZINDO IMPACTO. AJUSTE DA SUPLEMENTAÇÃO NECESSÁRIO.')
  } else if (color === 'orange') {
    linhas.push('O ERITRON ESTÁ COMPROMETIDO DE FORMA MODERADA A IMPORTANTE. A SÍNDROME DISABSORTIVA BARIÁTRICA ESTÁ CLARAMENTE IMPACTANDO A ERITROPOESE. REAVALIAÇÃO URGENTE DA SUPLEMENTAÇÃO E INVESTIGAÇÃO DE OUTRAS CAUSAS.')
  } else if (color === 'red') {
    linhas.push('O ERITRON ESTÁ GRAVEMENTE COMPROMETIDO. A COMBINAÇÃO DE SÍNDROME DISABSORTIVA BARIÁTRICA COM SUPLEMENTAÇÃO INSUFICIENTE OU AUSENTE PRODUZIU ANEMIA SIGNIFICATIVA. INTERVENÇÃO MÉDICA URGENTE É NECESSÁRIA.')
  }

  // Plasma de argônio
  if (dadosOBA.fez_plasma_argonio) {
    linhas.push('FEZ PLASMA DE ARGÔNIO: PROCEDIMENTO PARA TRATAMENTO DE ECTASIA VASCULAR GÁSTRICA (WATERMELON STOMACH), FREQUENTEMENTE RELACIONADO À SANGRIA OCULTA CRÔNICA PÓS-BARIÁTRICA. INVESTIGAR SE HÁ SANGRAMENTO RECORRENTE, ESPECIALMENTE SE A ANEMIA NÃO RESPONDE À SUPLEMENTAÇÃO DE FERRO.')
  }

  // ── Sobrecarga de ferro ───────────────────────────────────────────────────
  const ferrOBA = parseFloat(examesOBA?.ferritina_oba)
  if (!isNaN(ferrOBA) && ferrOBA > 400) {
    linhas.push(`FERRITINA ELEVADA NO CONTEXTO BARIÁTRICO: ${ferrOBA} ng/mL. FERRITINA MUITO ACIMA DE 400 ng/mL PODE INDICAR SIDEROSE HEPÁTICA, INFLAMAÇÃO CRÔNICA OU SÍNDROME DE SOBRECARGA DE FERRO. NO BARIÁTRICO, A REPOSIÇÃO PARENTERAL DE FERRO SEM MONITORAMENTO ADEQUADO É UMA CAUSA FREQUENTE. AVALIAR SATURAÇÃO DA TRANSFERRINA — SE > 45%, INVESTIGAR HEMOCROMATOSE.`)
    alertas.push({ nivel: MODERADO, texto: `FERRITINA MUITO ELEVADA: ${ferrOBA} ng/mL — AVALIAR SOBRECARGA DE FERRO E INFLAMAÇÃO CRÔNICA.` })
    examesSuger.push('SATURAÇÃO DA TRANSFERRINA (AVALIAR SOBRECARGA DE FERRO)')
    examesSuger.push('AVALIAÇÃO COM HEPATOLOGISTA')
    examesSuger.push('SATURAÇÃO DA TRANSFERRINA (AVALIAR SOBRECARGA DE FERRO)')
    examesSuger.push('AVALIAÇÃO COM HEPATOLOGISTA')
  }

  return {
    id:     'eritron',
    titulo: 'ERITRON NO CONTEXTO BARIÁTRICO',
    nivel:  color === 'green' ? NORMAL : color === 'yellow' ? LEVE : color === 'orange' ? MODERADO : GRAVE,
    linhas,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 2 — VITAMINA B12
// ─────────────────────────────────────────────────────────────────────────────
function buildModB12(ex, dados, disab, alertas, suger) {
  const b12 = parseFloat(ex.vitamina_b12)
  if (isNaN(b12)) {
    suger.push('VITAMINA B12 SÉRICA')
    return null
  }

  const linhas = []
  let nivel = NORMAL
  const meds = dados.medicamentos || []
  const usaB12IM  = meds.some(m => m.includes('B12') && (m.includes('INTRAMUSCULAR') || m.includes(' IM')))
  const usaB12Sub = meds.some(m => m.includes('B12') && m.includes('SUBLINGUAL'))

  linhas.push(`VITAMINA B12: ${b12} pg/mL`)

  if (b12 < REF.b12.critico) {
    nivel = GRAVE
    linhas.push('DÉFICIT GRAVE DE VITAMINA B12 (< 100 pg/mL). RISCO ELEVADO DE NEUROPATIA PERIFÉRICA E DEGENERAÇÃO SUBAGUDA DA MEDULA ESPINHAL. REPOSIÇÃO PARENTERAL URGENTE E EM DOSES DE ATAQUE. AVALIAÇÃO NEUROLÓGICA INDICADA.')
    alertas.push({ nivel: GRAVE, texto: `B12 CRÍTICA: ${b12} pg/mL — RISCO DE NEUROPATIA. REPOSIÇÃO PARENTERAL URGENTE.` })
    suger.push('AVALIAÇÃO NEUROLÓGICA')
  } else if (b12 < REF.b12.baixo) {
    nivel = MODERADO
    linhas.push('DÉFICIT MODERADO DE VITAMINA B12 (100–200 pg/mL). PODE PRODUZIR MACROCITOSE, ANEMIA MACROCÍTICA E ALTERAÇÕES NEUROLÓGICAS SUBCLÍNICAS. REPOSIÇÃO SUBLINGUAL OU PARENTERAL OBRIGATÓRIA.')
    alertas.push({ nivel: MODERADO, texto: `B12 BAIXA: ${b12} pg/mL — DÉFICIT MODERADO. REPOSIÇÃO SUBLINGUAL OU IM NECESSÁRIA.` })
  } else if (b12 < REF.b12.normal) {
    nivel = LEVE
    linhas.push('VITAMINA B12 EM ZONA LIMÍTROFE (200–300 pg/mL). NO BARIÁTRICO, ESSE NÍVEL É INSUFICIENTE. AUMENTAR A FREQUÊNCIA OU DOSE DA SUPLEMENTAÇÃO SUBLINGUAL OU PARENTERAL.')
    alertas.push({ nivel: LEVE, texto: `B12 LIMÍTROFE: ${b12} pg/mL — AUMENTAR SUPLEMENTAÇÃO.` })
  } else {
    linhas.push('VITAMINA B12 DENTRO DA FAIXA ADEQUADA PARA O CONTEXTO BARIÁTRICO. MANTER SUPLEMENTAÇÃO ATUAL E REMONITORAR EM 6 MESES.')
  }

  // Via de reposição
  if (disab.grau >= 2) {
    if (!usaB12IM && !usaB12Sub) {
      linhas.push('ATENÇÃO: NÃO HÁ REGISTRO DE USO DE B12 SUBLINGUAL OU INTRAMUSCULAR. NO BARIÁTRICO, A REPOSIÇÃO ORAL NÃO É EFICAZ. A SUPLEMENTAÇÃO SUBLINGUAL OU PARENTERAL É MANDATÓRIA.')
      if (nivel === NORMAL) alertas.push({ nivel: LEVE, texto: 'SEM B12 SUBLINGUAL/IM: VIA ORAL INSUFICIENTE NO BARIÁTRICO.' })
    } else if (usaB12Sub && !usaB12IM && b12 < REF.b12.normal) {
      linhas.push('O USO DE B12 SUBLINGUAL NÃO ESTÁ CORRIGINDO O DÉFICIT. CONSIDERAR MIGRAR PARA B12 INTRAMUSCULAR (CIANOCOBALAMINA 1.000 mcg/mês OU HIDROXICOBALAMINA).')
    }
  }

  return { id: 'b12', titulo: 'VITAMINA B12', nivel, linhas }
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 3 — VITAMINA D
// ─────────────────────────────────────────────────────────────────────────────
function buildModVitD(ex, dados, alertas, suger) {
  const vd = parseFloat(ex.vitamina_d)
  if (isNaN(vd)) {
    suger.push('VITAMINA D 25-OH')
    return null
  }

  const linhas = []
  let nivel = NORMAL
  const osseo = dados.status_osseo || ''

  linhas.push(`VITAMINA D 25-OH: ${vd} ng/mL`)

  if (vd < REF.vitD.critico) {
    nivel = GRAVE
    linhas.push('DEFICIÊNCIA GRAVE DE VITAMINA D (< 10 ng/mL). RISCO ELEVADO DE OSTEOPOROSE, MIOPATIA, HIPERPARATIREOIDISMO SECUNDÁRIO E COMPROMETIMENTO IMUNOLÓGICO. REPOSIÇÃO EM DOSES DE ATAQUE (50.000 UI/semana POR 8–12 SEMANAS) COM SUPERVISÃO MÉDICA.')
    alertas.push({ nivel: GRAVE, texto: `VITAMINA D CRÍTICA: ${vd} ng/mL — DEFICIÊNCIA GRAVE. REPOSIÇÃO DE ATAQUE URGENTE.` })
    suger.push('PTH INTACTO')
    suger.push('CÁLCIO SÉRICO E URINÁRIO')
  } else if (vd < REF.vitD.baixo) {
    nivel = MODERADO
    linhas.push('INSUFICIÊNCIA DE VITAMINA D (10–20 ng/mL). NO BARIÁTRICO, A META É ≥ 30 ng/mL. AUMENTAR DOSE SUPLEMENTAR. VERIFICAR SE USA VITAMINA D3 (COLECALCIFEROL) — PREFERENCIAL EM RELAÇÃO À D2 (ERGOCALCIFEROL).')
    alertas.push({ nivel: MODERADO, texto: `VITAMINA D INSUFICIENTE: ${vd} ng/mL — AUMENTAR DOSE SUPLEMENTAR.` })
  } else if (vd < REF.vitD.normal) {
    nivel = LEVE
    linhas.push('VITAMINA D ABAIXO DA META BARIÁTRICA (20–30 ng/mL). A META PARA BARIÁTRICOS É ≥ 30 ng/mL. OTIMIZAR SUPLEMENTAÇÃO COM D3.')
    alertas.push({ nivel: LEVE, texto: `VITAMINA D ABAIXO DA META: ${vd} ng/mL (meta ≥ 30 ng/mL).` })
  } else if (vd > REF.vitD.alto) {
    nivel = LEVE
    linhas.push('VITAMINA D ELEVADA (> 100 ng/mL). RISCO DE HIPERVITAMINOSE D E HIPERCALCEMIA. REDUZIR DOSE SUPLEMENTAR E VERIFICAR CÁLCIO SÉRICO.')
    alertas.push({ nivel: LEVE, texto: `VITAMINA D ELEVADA: ${vd} ng/mL — VERIFICAR HIPERCALCEMIA.` })
    suger.push('CÁLCIO SÉRICO')
  } else {
    linhas.push('VITAMINA D DENTRO DA META BARIÁTRICA (≥ 30 ng/mL). MANTER SUPLEMENTAÇÃO E REMONITORAR EM 6 MESES.')
  }

  // Relação com status ósseo
  if (osseo === 'OSTEOPOROSE' && vd < REF.vitD.normal) {
    linhas.push('OSTEOPOROSE COM DÉFICIT DE VITAMINA D: COMBINAÇÃO DE ALTO RISCO. A CORREÇÃO DA VITAMINA D É PRIORITÁRIA. ASSOCIAR CÁLCIO (CITRATO DE CÁLCIO — PREFERENCIAL NO BARIÁTRICO) E AVALIAR INDICAÇÃO DE BIFOSFONATO.')
    if (!suger.includes('PTH INTACTO')) suger.push('PTH INTACTO')
  } else if (osseo === 'OSTEOPENIA' && vd < REF.vitD.normal) {
    linhas.push('OSTEOPENIA COM DÉFICIT DE VITAMINA D: RISCO DE PROGRESSÃO PARA OSTEOPOROSE. PRIORIZAR CORREÇÃO DA VITAMINA D E AVALIAÇÃO COM CITRATO DE CÁLCIO.')
  }

  return { id: 'vitD', titulo: 'VITAMINA D', nivel, linhas }
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 4 — VITAMINAS LIPOSSOLÚVEIS E TIAMINA
// ─────────────────────────────────────────────────────────────────────────────
function buildModVitaminas(ex, dados, disab, alertas, suger) {
  const linhas = []
  let nivelGeral = NORMAL
  let temAlgo = false

  // Zinco
  const zinco = parseFloat(ex.zinco)
  if (!isNaN(zinco)) {
    temAlgo = true
    linhas.push(`ZINCO SÉRICO: ${zinco} mcg/dL`)
    if (zinco < REF.zinco.critico) {
      nivelGeral = GRAVE
      linhas.push('ZINCO GRAVEMENTE BAIXO (< 50 mcg/dL). RISCO DE ALOPECIA SEVERA, CICATRIZAÇÃO COMPROMETIDA, DISFUNÇÃO IMUNOLÓGICA E HIPOGONADISMO. SUPLEMENTAÇÃO URGENTE: 60–220 mg DE ZINCO ELEMENTAR/DIA.')
      alertas.push({ nivel: GRAVE, texto: `ZINCO CRÍTICO: ${zinco} mcg/dL — SUPLEMENTAÇÃO URGENTE.` })
    } else if (zinco < REF.zinco.baixo) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push('ZINCO BAIXO (50–60 mcg/dL). SUPLEMENTAÇÃO NECESSÁRIA: 15–30 mg DE ZINCO ELEMENTAR/DIA. SEPARAR DA SUPLEMENTAÇÃO DE FERRO EM 2 HORAS (COMPETIÇÃO ABSORTIVA).')
      alertas.push({ nivel: MODERADO, texto: `ZINCO BAIXO: ${zinco} mcg/dL — SUPLEMENTAÇÃO NECESSÁRIA.` })
    } else if (zinco < REF.zinco.normal) {
      if (nivelGeral === NORMAL) nivelGeral = LEVE
      linhas.push('ZINCO EM ZONA LIMÍTROFE (60–100 mcg/dL). MONITORAR. MANTER SUPLEMENTAÇÃO COM POLIVITAMÍNICO CONTENDO ZINCO.')
    } else {
      linhas.push('ZINCO DENTRO DA FAIXA NORMAL.')
    }
  } else {
    suger.push('ZINCO SÉRICO')
  }

  // Vitamina A
  const vitA = parseFloat(ex.vitamina_a)
  if (!isNaN(vitA)) {
    temAlgo = true
    linhas.push(`VITAMINA A: ${vitA} mcg/dL`)
    if (vitA < REF.vitA.critico) {
      nivelGeral = GRAVE
      linhas.push('VITAMINA A GRAVEMENTE BAIXA (< 15 mcg/dL). RISCO DE XEROFTALMIA, CEGUEIRA NOTURNA E COMPROMETIMENTO IMUNOLÓGICO GRAVE. REPOSIÇÃO URGENTE SOB SUPERVISÃO MÉDICA.')
      alertas.push({ nivel: GRAVE, texto: `VITAMINA A CRÍTICA: ${vitA} mcg/dL — RISCO DE XEROFTALMIA.` })
      suger.push('AVALIAÇÃO OFTALMOLÓGICA')
    } else if (vitA < REF.vitA.baixo) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push('VITAMINA A BAIXA (15–20 mcg/dL). SUPLEMENTAÇÃO NECESSÁRIA. PREFERIR POLIVITAMÍNICO COM BETACAROTENO. ATENÇÃO: EXCESSO DE VITAMINA A PURA (RETINOL) É HEPATOTÓXICO E TERATOGÊNICO.')
      alertas.push({ nivel: MODERADO, texto: `VITAMINA A BAIXA: ${vitA} mcg/dL — SUPLEMENTAÇÃO NECESSÁRIA.` })
    } else {
      linhas.push('VITAMINA A DENTRO DA FAIXA NORMAL.')
    }
  } else {
    suger.push('VITAMINA A')
  }

  // Tiamina (B1)
  const tiamina = parseFloat(ex.tiamina)
  if (!isNaN(tiamina)) {
    temAlgo = true
    linhas.push(`TIAMINA (B1): ${tiamina} nmol/L`)
    if (tiamina < REF.tiamina.critico) {
      nivelGeral = GRAVE
      linhas.push('TIAMINA GRAVEMENTE BAIXA (< 50 nmol/L). RISCO DE ENCEFALOPATIA DE WERNICKE (CONFUSÃO, ATAXIA, NISTAGMO), NEUROPATIA PERIFÉRICA E INSUFICIÊNCIA CARDÍACA DE ALTO DÉBITO (BERIBÉRI). EMERGÊNCIA NUTRICIONAL. TIAMINA IV URGENTE.')
      alertas.push({ nivel: GRAVE, texto: `TIAMINA CRÍTICA: ${tiamina} nmol/L — RISCO DE WERNICKE. TIAMINA IV URGENTE.` })
      suger.push('AVALIAÇÃO NEUROLÓGICA URGENTE')
    } else if (tiamina < REF.tiamina.baixo) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push('TIAMINA BAIXA (50–70 nmol/L). SUPLEMENTAÇÃO VO OU IM NECESSÁRIA. A DEFICIÊNCIA DE TIAMINA É PARTICULARMENTE GRAVE NO BARIÁTRICO, ESPECIALMENTE COM VÔMITOS FREQUENTES OU DIETA MUITO RESTRITIVA.')
      alertas.push({ nivel: MODERADO, texto: `TIAMINA BAIXA: ${tiamina} nmol/L — SUPLEMENTAÇÃO IM/VO NECESSÁRIA.` })
    } else {
      linhas.push('TIAMINA DENTRO DA FAIXA NORMAL.')
    }
  } else {
    suger.push('TIAMINA (VITAMINA B1)')
  }

  // Vitamina E
  const vitE = parseFloat(ex.vitamina_e)
  if (!isNaN(vitE)) {
    temAlgo = true
    linhas.push(`VITAMINA E: ${vitE} mg/dL`)
    if (vitE < REF.vitE.baixo) {
      if (nivelGeral === NORMAL) nivelGeral = LEVE
      linhas.push('VITAMINA E ABAIXO DO NORMAL (< 0.8 mg/dL). ANTIOXIDANTE ESSENCIAL. SUPLEMENTAR VIA POLIVITAMÍNICO COM TOCOFEROL.')
      alertas.push({ nivel: LEVE, texto: `VITAMINA E BAIXA: ${vitE} mg/dL.` })
    } else {
      linhas.push('VITAMINA E DENTRO DA FAIXA NORMAL.')
    }
  }

  // Folatos
  const folatos = parseFloat(ex.folatos)
  if (!isNaN(folatos)) {
    temAlgo = true
    linhas.push(`FOLATOS SÉRICOS: ${folatos} ng/mL`)
    if (folatos < REF.folatos.critico) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push('DÉFICIT GRAVE DE FOLATOS (< 2 ng/mL). RISCO DE ANEMIA MEGALOBLÁSTICA E, EM MULHERES GRÁVIDAS, DE DEFEITOS DO TUBO NEURAL. SUPLEMENTAR COM ÁCIDO FÓLICO 1–5 MG/DIA.')
      alertas.push({ nivel: MODERADO, texto: `FOLATOS CRÍTICOS: ${folatos} ng/mL — SUPLEMENTAR URGENTE.` })
    } else if (folatos < REF.folatos.baixo) {
      if (nivelGeral === NORMAL) nivelGeral = LEVE
      linhas.push('FOLATOS BAIXOS (2–4 ng/mL). SUPLEMENTAR COM ÁCIDO FÓLICO. NO BARIÁTRICO, O POLIVITAMÍNICO DEVE CONTER FOLATO.')
      alertas.push({ nivel: LEVE, texto: `FOLATOS BAIXOS: ${folatos} ng/mL.` })
    } else {
      linhas.push('FOLATOS DENTRO DA FAIXA NORMAL.')
    }
  } else {
    suger.push('FOLATOS SÉRICOS')
  }

  // Selênio
  const selenio = parseFloat(ex.selenio)
  if (!isNaN(selenio)) {
    temAlgo = true
    linhas.push(`SELÊNIO: ${selenio} mcg/L`)
    if (selenio < REF.selenio.baixo) {
      if (nivelGeral === NORMAL) nivelGeral = LEVE
      linhas.push('SELÊNIO BAIXO (< 60 mcg/L). ANTIOXIDANTE ESSENCIAL, ENVOLVIDO NA FUNÇÃO TIREOIDIANA E IMUNOLÓGICA. SUPLEMENTAR VIA POLIVITAMÍNICO COM SELÊNIO.')
      alertas.push({ nivel: LEVE, texto: `SELÊNIO BAIXO: ${selenio} mcg/L.` })
    } else {
      linhas.push('SELÊNIO DENTRO DA FAIXA NORMAL.')
    }
  }

  if (!temAlgo) return null

  return {
    id:     'vitaminas',
    titulo: 'MICRONUTRIENTES E VITAMINAS',
    nivel:  nivelGeral,
    linhas,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 5 — GLICOMETABÓLICO
// ─────────────────────────────────────────────────────────────────────────────
function buildModGlico(ex, dados, alertas, suger) {
  const linhas = []
  let nivelGeral = NORMAL
  let temAlgo = false

  const gli  = parseFloat(ex.glicemia)
  const ins  = parseFloat(ex.insulina)
  const hba  = parseFloat(ex.hb_glicada)
  const tg   = parseFloat(ex.triglicerides)
  const ast  = parseFloat(ex.ast)
  const alt  = parseFloat(ex.alt)
  const ggt  = parseFloat(ex.gama_gt)
  const stGli = dados.status_glicemico || ''
  const temDumping = stGli.includes('DUMPING')
  const meds  = dados.medicamentos || []
  const emag  = dados.emagrecedores || {}

  // Glicemia
  if (!isNaN(gli)) {
    temAlgo = true
    linhas.push(`GLICEMIA EM JEJUM: ${gli} mg/dL`)
    if (gli >= REF.glicemia.diabetes) {
      nivelGeral = GRAVE
      linhas.push('GLICEMIA ELEVADA NO NÍVEL DIAGNÓSTICO DE DIABETES (≥ 200 mg/dL). NO BARIÁTRICO, ISSO PODE INDICAR RECIDIVA DO DIABETES OU INEFICÁCIA DA CIRURGIA PARA CONTROLE GLICÊMICO. AVALIAÇÃO COM ENDOCRINOLOGISTA URGENTE.')
      alertas.push({ nivel: GRAVE, texto: `GLICEMIA ELEVADA: ${gli} mg/dL — POSSÍVEL DIABETES EM ATIVIDADE.` })
      suger.push('AVALIAÇÃO COM ENDOCRINOLOGISTA')
    } else if (gli >= REF.glicemia.preD) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push('GLICEMIA ELEVADA (126–199 mg/dL): COMPATÍVEL COM DIABETES NÃO CONTROLADO OU EM REMISSÃO INCOMPLETA. INVESTIGAR COM HBA1C E INSULINEMIA.')
      alertas.push({ nivel: MODERADO, texto: `GLICEMIA AUMENTADA: ${gli} mg/dL — AVALIAR COM HBA1C.` })
    } else if (gli >= REF.glicemia.otimo) {
      if (nivelGeral === NORMAL) nivelGeral = LEVE
      linhas.push('GLICEMIA LIMÍTROFE (100–125 mg/dL): PRÉ-DIABETES OU RESISTÊNCIA INSULÍNICA. AVALIAR HBA1C E INSULINEMIA EM JEJUM.')
      alertas.push({ nivel: LEVE, texto: `GLICEMIA LIMÍTROFE: ${gli} mg/dL — PRÉ-DIABETES OU RESISTÊNCIA INSULÍNICA.` })
    } else {
      linhas.push('GLICEMIA NORMAL (< 100 mg/dL).')
    }
  } else suger.push('GLICEMIA EM JEJUM')

  // HbA1c
  if (!isNaN(hba)) {
    temAlgo = true
    linhas.push(`HEMOGLOBINA GLICADA (HBA1C): ${hba}%`)
    if (hba >= REF.hbA1c.ruim) {
      if (nivelGeral !== GRAVE) nivelGeral = GRAVE
      linhas.push('HBA1C MUITO ELEVADA (≥ 8%): CONTROLE GLICÊMICO RUIM. RISCO ELEVADO DE COMPLICAÇÕES MICRO E MACROVASCULARES. AJUSTE URGENTE DO ESQUEMA TERAPÊUTICO.')
      alertas.push({ nivel: GRAVE, texto: `HBA1C MUITO ALTA: ${hba}% — CONTROLE GLICÊMICO RUIM.` })
    } else if (hba >= REF.hbA1c.diabetes) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push('HBA1C NO NÍVEL DE DIABETES (≥ 6.5%): DIABETES EM ATIVIDADE OU REMISSÃO INCOMPLETA PÓS-BARIÁTRICA. AVALIAÇÃO COM ENDOCRINOLOGISTA.')
      alertas.push({ nivel: MODERADO, texto: `HBA1C ELEVADA: ${hba}% — DIABETES EM ATIVIDADE.` })
    } else if (hba >= REF.hbA1c.preD) {
      if (nivelGeral === NORMAL) nivelGeral = LEVE
      linhas.push('HBA1C NO NÍVEL DE PRÉ-DIABETES (5.7–6.4%): RISCO AUMENTADO DE PROGRESSÃO PARA DIABETES. MONITORAMENTO E INTERVENÇÃO DIETÉTICA.')
    } else {
      linhas.push('HBA1C DENTRO DA META (< 5.7%): BOM CONTROLE GLICÊMICO.')
    }
  } else suger.push('HEMOGLOBINA GLICADA (HBA1C)')

  // Insulina e HOMA (se tiver glicemia e insulina)
  if (!isNaN(ins)) {
    temAlgo = true
    linhas.push(`INSULINA EM JEJUM: ${ins} mcUI/mL`)
    if (!isNaN(gli)) {
      const homa = (gli * ins) / 405
      linhas.push(`HOMA-IR ESTIMADO: ${homa.toFixed(1)} (resistência insulínica se > 2.5)`)
      if (homa > 2.5) {
        if (nivelGeral === NORMAL) nivelGeral = LEVE
        linhas.push('HOMA-IR ELEVADO: RESISTÊNCIA INSULÍNICA PRESENTE. NO BARIÁTRICO, PODE INDICAR REGANHO DE PESO COM PERDA DO EFEITO METABÓLICO DA CIRURGIA. CONSIDERAR INTERVENÇÃO DIETÉTICA E ATIVIDADE FÍSICA REGULAR.')
        alertas.push({ nivel: LEVE, texto: `HOMA-IR: ${homa.toFixed(1)} — RESISTÊNCIA INSULÍNICA.` })
      }
    }
    if (ins > REF.insulina.resistencia) {
      if (nivelGeral === NORMAL) nivelGeral = LEVE
      linhas.push('HIPERINSULINEMIA EM JEJUM (> 25 mcUI/mL): SINAL DE RESISTÊNCIA INSULÍNICA. AVALIAR COM ENDOCRINOLOGISTA.')
    }
  }

  // Triglicérides
  if (!isNaN(tg)) {
    temAlgo = true
    linhas.push(`TRIGLICÉRIDES: ${tg} mg/dL`)
    if (tg >= REF.tg.muitoAlto) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push('HIPERTRIGLICERIDEMIA GRAVE (≥ 500 mg/dL). RISCO DE PANCREATITE AGUDA. TRATAMENTO MEDICAMENTOSO URGENTE (FIBRATOS) E RESTRIÇÃO DE CARBOIDRATOS E ÁLCOOL.')
      alertas.push({ nivel: MODERADO, texto: `TRIGLICÉRIDES MUITO ALTOS: ${tg} mg/dL — RISCO DE PANCREATITE.` })
      suger.push('AMILASE E LIPASE SÉRICAS')
    } else if (tg >= REF.tg.alto) {
      if (nivelGeral === NORMAL) nivelGeral = LEVE
      linhas.push('TRIGLICÉRIDES ELEVADOS (200–499 mg/dL). AVALIAR PADRÃO ALIMENTAR, USO DE ÁLCOOL E RESISTÊNCIA INSULÍNICA.')
      alertas.push({ nivel: LEVE, texto: `TRIGLICÉRIDES ELEVADOS: ${tg} mg/dL.` })
    } else if (tg >= REF.tg.otimo) {
      linhas.push('TRIGLICÉRIDES LIMÍTROFES (150–199 mg/dL). ATENÇÃO À DIETA E ATIVIDADE FÍSICA.')
    } else {
      linhas.push('TRIGLICÉRIDES NORMAIS (< 150 mg/dL).')
    }
  } else suger.push('TRIGLICÉRIDES')

  // Emagrecedores GLP-1
  const emagAtivos = Object.entries(emag || {}).filter(([, v]) => v === 'ESTOU USANDO').map(([k]) => k)
  if (emagAtivos.length > 0) {
    linhas.push(`USO ATUAL DE MEDICAMENTOS EMAGRECEDORES: ${emagAtivos.join(', ').toUpperCase()}. OS AGONISTAS DE GLP-1 PODEM PRODUZIR NÁUSEAS E VÔMITOS, AGRAVANDO DEFICIÊNCIAS NUTRICIONAIS JÁ EXISTENTES NO BARIÁTRICO. MONITORAMENTO NUTRICIONAL REFORÇADO NECESSÁRIO.`)
  }

  // ── Síndrome de Dumping ──────────────────────────────────────────────────
  if (temDumping) {
    temAlgo = true
    if (nivelGeral === NORMAL) nivelGeral = MODERADO
    linhas.push('EPISÓDIOS DE DUMPING RELATADOS: A SÍNDROME DE DUMPING É FREQUENTE APÓS BYPASS GÁSTRICO E PODE SE APRESENTAR COMO DUMPING PRECOCE (SUDORESE, TAQUICARDIA, NÁUSEAS E DIARREIA LOGO APÓS AS REFEIÇÕES) OU TARDIO (HIPOGLICEMIA REATIVA 1-3 HORAS APÓS COMER). PODE CAUSAR DESNUTRIÇÃO PROGRESSIVA SE NÃO TRATADO.')
    linhas.push('ORIENTAÇÕES PARA CONTROLE: EVITAR AÇÚCARES SIMPLES E ULTRAPROCESSADOS. PREFERIR REFEIÇÕES PEQUENAS E FREQUENTES (5-6/DIA). NÃO BEBER DURANTE AS REFEIÇÕES — AGUARDAR 30 MIN APÓS. PRIORIZAR PROTEÍNAS E GORDURAS BOAS. DEITAR 20-30 MIN APÓS COMER REDUZ OS SINTOMAS DO DUMPING PRECOCE.')
    linhas.push('EM CASOS GRAVES: OCTREOTIDE OU REVISÃO CIRÚRGICA PODEM SER INDICADOS. AVALIAÇÃO COM CIRURGIÃO BARIÁTRICO OU NUTRÓLOGO ESPECIALIZADO É FORTEMENTE RECOMENDADA.')
    alertas.push({ nivel: MODERADO, texto: 'DUMPING RELATADO: AJUSTAR DIETA E AVALIAR COM ESPECIALISTA.' })
    suger.push('AVALIAÇÃO COM CIRURGIÃO BARIÁTRICO OU NUTRÓLOGO ESPECIALIZADO')
    suger.push('GLICEMIA PÓS-PRANDIAL 1H E 2H (PESQUISA DE HIPOGLICEMIA REATIVA)')
    suger.push('TESTE DE TOLERÂNCIA À GLICOSE 75G (DUMPING TARDIO)')
  }

  if (!temAlgo) return null

  return {
    id:     'glico',
    titulo: 'PERFIL GLICOMETABÓLICO',
    nivel:  nivelGeral,
    linhas,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 6 — FUNÇÃO HEPÁTICA E RENAL
// ─────────────────────────────────────────────────────────────────────────────
function buildModOrgaos(ex, dados, sexo, alertas, suger) {
  const linhas = []
  let nivelGeral = NORMAL
  let temAlgo = false

  const ast  = parseFloat(ex.ast)
  const alt  = parseFloat(ex.alt)
  const ggt  = parseFloat(ex.gama_gt)
  const cre  = parseFloat(ex.creatinina)
  const au   = parseFloat(ex.acido_urico)
  const limAlt = sexo === 'M' ? REF.gamaGt.normal_m : REF.gamaGt.normal_f
  const limCre = sexo === 'M' ? REF.creatinina.normal_m : REF.creatinina.normal_f
  const limAU  = sexo === 'M' ? REF.acidoUrico.normal_m : REF.acidoUrico.normal_f

  // AST / ALT
  if (!isNaN(ast) || !isNaN(alt)) {
    temAlgo = true
    if (!isNaN(ast)) linhas.push(`AST: ${ast} U/L`)
    if (!isNaN(alt)) linhas.push(`ALT: ${alt} U/L`)

    const astAlto = !isNaN(ast) && ast > REF.ast.normal * 3
    const altAlto = !isNaN(alt) && alt > REF.alt.normal * 3

    if (astAlto || altAlto) {
      nivelGeral = GRAVE
      linhas.push('TRANSAMINASES MUITO ELEVADAS (> 3× LIMITE SUPERIOR): HEPATITE AGUDA, ESTEATOHEPATITE GRAVE OU TOXICIDADE HEPÁTICA. AVALIAÇÃO COM HEPATOLOGISTA URGENTE. SUSPENDER MEDICAMENTOS HEPATOTÓXICOS SE POSSÍVEL.')
      alertas.push({ nivel: GRAVE, texto: 'TRANSAMINASES MUITO ELEVADAS — AVALIAÇÃO HEPÁTICA URGENTE.' })
      suger.push('ECOGRAFIA HEPÁTICA')
      suger.push('ANTI-HCV, HBsAg, ANTI-HBS')
      suger.push('AVALIAÇÃO COM HEPATOLOGISTA')
    } else if ((!isNaN(ast) && ast > REF.ast.normal) || (!isNaN(alt) && alt > REF.alt.normal)) {
      if (nivelGeral === NORMAL) nivelGeral = LEVE
      linhas.push('TRANSAMINASES LEVEMENTE ELEVADAS: ESTEATOSE HEPÁTICA NÃO ALCOÓLICA (ESTEATO-HEPATITE) É FREQUENTE NO BARIÁTRICO COM REGANHO DE PESO OU RESISTÊNCIA INSULÍNICA. MONITORAR E CONTROLAR FATORES METABÓLICOS.')
      alertas.push({ nivel: LEVE, texto: 'TRANSAMINASES LEVEMENTE ELEVADAS — INVESTIGAR ESTEATOSE HEPÁTICA.' })
    } else {
      linhas.push('TRANSAMINASES DENTRO DA NORMALIDADE.')
    }
  } else suger.push('AST/ALT')

  // Gama-GT
  if (!isNaN(ggt)) {
    temAlgo = true
    linhas.push(`GAMA-GT: ${ggt} U/L`)
    if (ggt > limAlt * 3) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push('GAMA-GT MUITO ELEVADA: SUGESTIVO DE DOENÇA HEPÁTICA, COLESTASE, OU USO DE ÁLCOOL. INVESTIGAR CAUSA.')
      alertas.push({ nivel: MODERADO, texto: `GAMA-GT MUITO ELEVADA: ${ggt} U/L.` })
    } else if (ggt > limAlt) {
      if (nivelGeral === NORMAL) nivelGeral = LEVE
      linhas.push('GAMA-GT LEVEMENTE ELEVADA: MONITORAR. ÁLCOOL, MEDICAMENTOS E ESTEATOSE SÃO CAUSAS COMUNS.')
    } else {
      linhas.push('GAMA-GT NORMAL.')
    }
  }

  // Creatinina
  if (!isNaN(cre)) {
    temAlgo = true
    linhas.push(`CREATININA: ${cre} mg/dL`)
    if (cre > limCre * 2) {
      nivelGeral = GRAVE
      linhas.push('CREATININA MUITO ELEVADA: INSUFICIÊNCIA RENAL SIGNIFICATIVA. AVALIAÇÃO COM NEFROLOGISTA URGENTE. AJUSTAR DOSES DE MEDICAMENTOS DE EXCREÇÃO RENAL.')
      alertas.push({ nivel: GRAVE, texto: `CREATININA MUITO ALTA: ${cre} mg/dL — AVALIAÇÃO NEFROLÓGICA URGENTE.` })
      suger.push('TAXA DE FILTRAÇÃO GLOMERULAR (TFG)')
      suger.push('UREIA')
      suger.push('SUMÁRIO DE URINA')
      suger.push('AVALIAÇÃO COM NEFROLOGISTA')
    } else if (cre > limCre) {
      if (nivelGeral === NORMAL) nivelGeral = LEVE
      linhas.push('CREATININA ACIMA DO LIMITE SUPERIOR: MONITORAR FUNÇÃO RENAL. HIDRATAÇÃO ADEQUADA É FUNDAMENTAL NO BARIÁTRICO.')
      alertas.push({ nivel: LEVE, texto: `CREATININA ELEVADA: ${cre} mg/dL — MONITORAR.` })
    } else {
      linhas.push('CREATININA NORMAL.')
    }
  } else suger.push('CREATININA')

  // Ácido úrico
  if (!isNaN(au)) {
    temAlgo = true
    linhas.push(`ÁCIDO ÚRICO: ${au} mg/dL`)
    if (au > limAU) {
      if (nivelGeral === NORMAL) nivelGeral = LEVE
      linhas.push(`HIPERURICEMIA (> ${limAU} mg/dL): RISCO DE GOTA E NEFROLITÍASE. NO BARIÁTRICO, A HIPERURICEMIA PODE PIORAR NO PERÍODO INICIAL DE PERDA DE PESO RÁPIDA. HIDRATAÇÃO ABUNDANTE E AVALIAÇÃO DIETÉTICA.`)
      alertas.push({ nivel: LEVE, texto: `ÁCIDO ÚRICO ELEVADO: ${au} mg/dL — RISCO DE GOTA.` })
    } else {
      linhas.push('ÁCIDO ÚRICO NORMAL.')
    }
  }

  if (!temAlgo) return null

  return {
    id:     'orgaos',
    titulo: 'FUNÇÃO HEPÁTICA E RENAL',
    nivel:  nivelGeral,
    linhas,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 7 — STATUS PONDERAL
// ─────────────────────────────────────────────────────────────────────────────
function buildModPonderal(dados, alertas) {
  const linhas = []
  let nivelGeral = NORMAL

  const pesoAntes  = parseFloat(dados.peso_antes)
  const pesoAtual  = parseFloat(dados.peso_atual)
  const pesoMin    = parseFloat(dados.peso_minimo_pos)
  const ganhouPeso = dados.ganhou_peso_apos
  const mesesPos   = parseInt(dados.meses_pos_cirurgia) || 0
  const meta       = dados.meta_peso
  const metaKg     = parseFloat(dados.meta_kg)

  if (isNaN(pesoAntes) && isNaN(pesoAtual)) return null

  if (!isNaN(pesoAntes) && !isNaN(pesoAtual)) {
    const perdido = pesoAntes - pesoAtual
    linhas.push(`PESO ANTES DA CIRURGIA: ${pesoAntes} kg`)
    linhas.push(`PESO ATUAL: ${pesoAtual} kg`)
    linhas.push(`TOTAL PERDIDO: ${perdido.toFixed(1)} kg`)

    if (!isNaN(pesoMin) && pesoMin < pesoAtual) {
      const reganho = pesoAtual - pesoMin
      linhas.push(`MENOR PESO ALCANÇADO: ${pesoMin} kg`)
      linhas.push(`REGANHO DESDE O NADIR: ${reganho.toFixed(1)} kg`)
      const pctReganho = (reganho / (pesoAntes - pesoMin)) * 100

      if (pctReganho > 50) {
        nivelGeral = GRAVE
        linhas.push('REGANHO DE PESO EXPRESSIVO (> 50% DO PESO PERDIDO). FALHA BARIÁTRICA SIGNIFICATIVA. INVESTIGAR CAUSA (COMPORTAMENTAL, HORMONAL, ESTRUTURAL) E CONSIDERAR REVISÃO CIRÚRGICA OU TERAPIA ADJUVANTE.')
        alertas.push({ nivel: GRAVE, texto: `REGANHO EXPRESSIVO: ${reganho.toFixed(1)} kg (${pctReganho.toFixed(0)}% do peso perdido).` })
      } else if (pctReganho > 20) {
        nivelGeral = MODERADO
        linhas.push('REGANHO DE PESO MODERADO (20–50% DO PESO PERDIDO). INTERVENÇÃO NECESSÁRIA: AVALIAÇÃO NUTRICIONAL INTENSIVA, PSICOLÓGICA E CONSIDERAR FARMACOTERAPIA ADJUVANTE.')
        alertas.push({ nivel: MODERADO, texto: `REGANHO MODERADO: ${reganho.toFixed(1)} kg (${pctReganho.toFixed(0)}% do peso perdido).` })
      } else if (reganho > 5) {
        if (nivelGeral === NORMAL) nivelGeral = LEVE
        linhas.push(`REGANHO DE PESO LEVE (${reganho.toFixed(1)} kg). ATENÇÃO AO PADRÃO ALIMENTAR E ATIVIDADE FÍSICA PARA EVITAR PROGRESSÃO.`)
        alertas.push({ nivel: LEVE, texto: `REGANHO: ${reganho.toFixed(1)} kg — ATENÇÃO.` })
      }
    }

    // Velocidade de perda
    if (mesesPos > 0) {
      const perdaMensal = perdido / mesesPos
      if (mesesPos <= 12 && perdaMensal < 3) {
        if (nivelGeral === NORMAL) nivelGeral = LEVE
        linhas.push('VELOCIDADE DE PERDA DE PESO ABAIXO DO ESPERADO NO PRIMEIRO ANO (< 3 kg/mês). INVESTIGAR ADESÃO À DIETA, ATIVIDADE FÍSICA E POSSÍVEIS COMPLICAÇÕES CIRÚRGICAS.')
      }
    }
  }

  // Meta
  if (meta === 'PERDER' && !isNaN(metaKg) && metaKg > 0) {
    linhas.push(`META DO PACIENTE: PERDER MAIS ${metaKg} kg. PLANEJAR COM EQUIPE MULTIDISCIPLINAR.`)
  } else if (meta === 'MANTER') {
    linhas.push('META DO PACIENTE: MANTER O PESO ATUAL. FOCO NA CONSOLIDAÇÃO DOS HÁBITOS ADQUIRIDOS.')
  } else if (meta === 'GANHAR' && !isNaN(metaKg)) {
    if (nivelGeral === NORMAL) nivelGeral = LEVE
    linhas.push(`META DO PACIENTE: GANHAR ${metaKg} kg. NO CONTEXTO BARIÁTRICO, GANHO DE PESO INTENCIONAL DEVE SER ACOMPANHADO POR NUTRICIONISTA PARA GARANTIR QUE SEJA MASSA MUSCULAR E NÃO GORDURA.`)
  }

  return {
    id:     'ponderal',
    titulo: 'STATUS PONDERAL',
    nivel:  nivelGeral,
    linhas,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 8 — STATUS VASCULAR
// ─────────────────────────────────────────────────────────────────────────────
function buildModVascular(dados, alertas, suger) {
  const linhas = []
  let nivelGeral = NORMAL

  const trombose  = dados.trombose
  const investTromb = dados.investigou_trombose
  const usaAnticoa = dados.usa_anticoagulante
  const usouAnticoa = dados.usou_anticoagulante
  const varizes   = dados.varizes
  const variGrau  = dados.varizes_grau
  const variEsof  = dados.varizes_esofago
  const opeVarizes = dados.operou_varizes_esofago
  const pressao   = dados.status_pressorico

  let temAlgo = false

  if (trombose) {
    temAlgo = true
    nivelGeral = GRAVE
    linhas.push('HISTÓRICO DE TROMBOSE: FATOR DE RISCO TROMBÓTICO RELEVANTE. O BARIÁTRICO JÁ TEM RISCO AUMENTADO DE TROMBOEMBOLISMO VENOSO (TEV).')
    if (!investTromb) {
      linhas.push('TROMBOSE NÃO INVESTIGADA: INDICADA INVESTIGAÇÃO DE TROMBOFILIAS (FATOR V DE LEIDEN, PROTROMBINA G20210A, DEFICIÊNCIA DE PROTEÍNA C, S E ANTITROMBINA III, ANTICORPOS ANTIFOSFOLIPÍDEOS).')
      suger.push('PESQUISA DE TROMBOFILIAS')
      suger.push('ANTICOAGULANTE LÚPICO, ANTICARDIOLIPINA')
    }
    if (usaAnticoa) {
      linhas.push('EM USO ATUAL DE ANTICOAGULANTE: VERIFICAR ADESÃO, NÍVEL TERAPÊUTICO (SE WARFARINA, VERIFICAR INR) E RISCO DE SANGRAMENTO NO CONTEXTO BARIÁTRICO.')
      suger.push('INR (SE EM USO DE WARFARINA)')
    } else {
      linhas.push('SEM USO ATUAL DE ANTICOAGULANTE: AVALIAR SE HÁ INDICAÇÃO DE PROFILAXIA OU TRATAMENTO ANTICOAGULANTE.')
    }
    alertas.push({ nivel: GRAVE, texto: 'HISTÓRICO DE TROMBOSE COM RISCO AUMENTADO DE TEV NO BARIÁTRICO.' })
  }

  if (varizes) {
    temAlgo = true
    if (nivelGeral !== GRAVE) nivelGeral = MODERADO
    linhas.push(`VARIZES DE MEMBROS INFERIORES${variGrau ? ' — GRAU: ' + variGrau : ''}. NO BARIÁTRICO, VARIZES PODEM INDICAR INSUFICIÊNCIA VENOSA CRÔNICA AGRAVADA PELO EXCESSO DE PESO PREGRESSO.`)
    if (variEsof) {
      nivelGeral = GRAVE
      linhas.push('VARIZES DE ESÔFAGO: INDICAM HIPERTENSÃO PORTAL, FREQUENTEMENTE ASSOCIADA A CIRROSE HEPÁTICA OU OUTRAS HEPATOPATIAS. AVALIAÇÃO GASTROENTEROLÓGICA E HEPATOLÓGICA URGENTE.')
      alertas.push({ nivel: GRAVE, texto: 'VARIZES DE ESÔFAGO — INVESTIGAR HIPERTENSÃO PORTAL E HEPATOPATIA.' })
      suger.push('ENDOSCOPIA DIGESTIVA ALTA')
      suger.push('ECOGRAFIA ABDOMINAL COM DOPPLER PORTAL')
      suger.push('AVALIAÇÃO COM HEPATOLOGISTA')
      if (opeVarizes) {
        linhas.push('JÁ OPEROU VARIZES DE ESÔFAGO: SEGUIMENTO ENDOSCÓPICO PERIÓDICO OBRIGATÓRIO.')
        suger.push('ENDOSCOPIA DIGESTIVA ALTA (CONTROLE)')
      }
    }
  }

  // Pressão arterial
  if (pressao === 'HIPERTENSO') {
    temAlgo = true
    if (nivelGeral === NORMAL) nivelGeral = LEVE
    linhas.push('HIPERTENSÃO ARTERIAL SISTÊMICA: AVALIAR SE HOUVE MELHORA COM A PERDA DE PESO. MUITOS BARIÁTRICOS ENTRAM EM REMISSÃO DA HAS. SE AINDA HIPERTENSO, REVISAR MEDICAÇÃO COM CARDIOLOGISTA.')
    alertas.push({ nivel: LEVE, texto: 'HIPERTENSÃO ARTERIAL — AVALIAR NECESSIDADE DE AJUSTE MEDICAMENTOSO.' })
  } else if (pressao === 'HIPOTENSÃO') {
    temAlgo = true
    if (nivelGeral === NORMAL) nivelGeral = LEVE
    linhas.push('HIPOTENSÃO ARTERIAL: COMUM NO PÓS-BARIÁTRICO POR DESHIDRATAÇÃO, DESNUTRIÇÃO PROTEICA OU AJUSTE EXCESSIVO DE ANTI-HIPERTENSIVOS. REVISÃO MEDICAMENTOSA INDICADA.')
    alertas.push({ nivel: LEVE, texto: 'HIPOTENSÃO — REVISAR MEDICAÇÃO E HIDRATAÇÃO.' })
  }

  if (!temAlgo) return null

  return {
    id:     'vascular',
    titulo: 'STATUS VASCULAR E PRESSÓRICO',
    nivel:  nivelGeral,
    linhas,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 9 — STATUS ÓSSEO
// ─────────────────────────────────────────────────────────────────────────────
function buildModOsseo(dados, ex, alertas, suger) {
  const osseo = dados.status_osseo || ''
  const dental = dados.status_dental || ''
  const vitD = parseFloat(ex.vitamina_d)
  const ca = parseFloat(ex.calcio_ionico || ex.calcio || NaN)

  if (!osseo && !dental) return null

  const linhas = []
  let nivelGeral = NORMAL

  if (osseo === 'OSTEOPOROSE') {
    nivelGeral = GRAVE
    linhas.push('OSTEOPOROSE CONFIRMADA: A SÍNDROME DISABSORTIVA BARIÁTRICA, SOMADA À DEFICIÊNCIA DE VITAMINA D, CÁLCIO E VITAMINA K, PODE ACELERAR A PERDA ÓSSEA. TRATAMENTO ESPECÍFICO NECESSÁRIO (BIFOSFONATOS, DENOSUMAB OU TERIPARATIDA CONFORME AVALIAÇÃO). ATENÇÃO: BIFOSFONATOS ORAIS PODEM CAUSAR ÚLCERAS ESOFÁGICAS — PREFERIR VIA ENDOVENOSA NO BARIÁTRICO.')
    alertas.push({ nivel: GRAVE, texto: 'OSTEOPOROSE — TRATAMENTO ESPECÍFICO NECESSÁRIO. AVALIAR VIA DE REPOSIÇÃO DE CÁLCIO E VITAMINA D.' })
    suger.push('DENSITOMETRIA ÓSSEA (SE NÃO RECENTE)')
    suger.push('PTH INTACTO')
    suger.push('CÁLCIO SÉRICO')
    suger.push('VITAMINA K')
  } else if (osseo === 'OSTEOPENIA') {
    nivelGeral = MODERADO
    linhas.push('OSTEOPENIA: ESTÁGIO INICIAL DE PERDA ÓSSEA. NO BARIÁTRICO, A PROGRESSÃO PARA OSTEOPOROSE É RISCO REAL SEM SUPLEMENTAÇÃO ADEQUADA. CITRATO DE CÁLCIO 1.200–1.500 MG/DIA + VITAMINA D PARA META ≥ 30 NG/ML. MONITORAR COM DENSITOMETRIA ANUALMENTE.')
    alertas.push({ nivel: MODERADO, texto: 'OSTEOPENIA — SUPLEMENTAÇÃO DE CÁLCIO E VITAMINA D OBRIGATÓRIA.' })
    suger.push('DENSITOMETRIA ÓSSEA (ANUAL)')
  } else if (osseo === 'DENSITOMETRIA NORMAL') {
    linhas.push('DENSITOMETRIA ÓSSEA NORMAL: MANTER SUPLEMENTAÇÃO PREVENTIVA DE CÁLCIO E VITAMINA D. REPETIR DENSITOMETRIA EM 2 ANOS.')
  } else if (osseo === 'NÃO FIZ') {
    linhas.push('DENSITOMETRIA ÓSSEA NÃO REALIZADA: SOLICITADA PARA TODOS OS PACIENTES BARIÁTRICOS, ESPECIALMENTE APÓS 2 ANOS DE CIRURGIA E EM MULHERES NO PERÍODO PÓS-MENOPAUSA.')
    if (nivelGeral === NORMAL) nivelGeral = LEVE
    suger.push('DENSITOMETRIA ÓSSEA')
    suger.push('PTH INTACTO')
  }

  // Nota sobre tipo de cálcio
  if (osseo === 'OSTEOPOROSE' || osseo === 'OSTEOPENIA') {
    linhas.push('IMPORTANTE: NO BARIÁTRICO, O CARBONATO DE CÁLCIO NECESSITA DE AMBIENTE ÁCIDO PARA ABSORÇÃO E NÃO É EFICAZ. O CITRATO DE CÁLCIO É A FORMA PREFERENCIALMENTE ABSORVIDA E DEVE SER A PRIMEIRA ESCOLHA.')
  }

  // Status dental
  if (dental === 'PERDI MUITOS DENTES') {
    if (nivelGeral !== GRAVE) nivelGeral = MODERADO
    linhas.push('PERDA DE DENTES SIGNIFICATIVA: PODE SER MANIFESTAÇÃO DE DEFICIÊNCIA DE VITAMINA D, CÁLCIO E VITAMINA C CRÔNICA, ALÉM DE REFLUXO ÁCIDO E HÁBITOS ALIMENTARES PÓS-BARIÁTRICOS. AVALIAÇÃO ODONTOLÓGICA E INVESTIGAÇÃO NUTRICIONAL.')
    alertas.push({ nivel: MODERADO, texto: 'PERDA DENTÁRIA SIGNIFICATIVA — INVESTIGAR DEFICIÊNCIAS NUTRICIONAIS.' })
  } else if (dental === 'FREQUENTES PROBLEMAS DENTÁRIOS') {
    if (nivelGeral === NORMAL) nivelGeral = LEVE
    linhas.push('PROBLEMAS DENTÁRIOS FREQUENTES: ASSOCIADOS À ACIDEZ BUCAL (REFLUXO), DEFICIÊNCIA DE CÁLCIO E VITAMINA D, E VÔMITOS FREQUENTES. AVALIAÇÃO ODONTOLÓGICA E CONTROLE DO REFLUXO INDICADOS.')
  }

  return {
    id:     'osseo',
    titulo: 'SAÚDE ÓSSEA E DENTAL',
    nivel:  nivelGeral,
    linhas,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 10 — HORMONAL
// ─────────────────────────────────────────────────────────────────────────────
function buildModHormonal(ex, dados, sexo, idade, alertas, suger) {
  const linhas = []
  let nivelGeral = NORMAL
  let temAlgo = false

  const tsh  = parseFloat(ex.tsh)
  const testo = parseFloat(ex.testosterona)
  const estr  = parseFloat(ex.estradiol)

  // TSH
  if (!isNaN(tsh)) {
    temAlgo = true
    linhas.push(`TSH: ${tsh} mcUI/mL`)
    if (tsh > REF.tsh.hipotireoidismo) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push('TSH ELEVADO: COMPATÍVEL COM HIPOTIREOIDISMO. NO BARIÁTRICO, O HIPOTIREOIDISMO PODE DIFICULTAR A PERDA DE PESO E AGRAVAR A ANEMIA. AVALIAÇÃO COM ENDOCRINOLOGISTA.')
      alertas.push({ nivel: MODERADO, texto: `TSH ELEVADO: ${tsh} mcUI/mL — HIPOTIREOIDISMO. AVALIAR COM ENDOCRINOLOGISTA.` })
      suger.push('T4 LIVRE')
      suger.push('ANTI-TPO')
    } else if (tsh < REF.tsh.hipertireoidismo) {
      if (nivelGeral === NORMAL) nivelGeral = LEVE
      linhas.push('TSH SUPRIMIDO: COMPATÍVEL COM HIPERTIREOIDISMO OU USO DE LEVOTIROXINA EM DOSE EXCESSIVA. AVALIAÇÃO COM ENDOCRINOLOGISTA.')
      alertas.push({ nivel: LEVE, texto: `TSH SUPRIMIDO: ${tsh} mcUI/mL — AVALIAR HIPERTIREOIDISMO.` })
      suger.push('T4 LIVRE')
      suger.push('T3 TOTAL')
    } else {
      linhas.push('TSH DENTRO DA NORMALIDADE.')
    }
  } else suger.push('TSH')

  // Testosterona masculina
  if (sexo === 'M' && !isNaN(testo)) {
    temAlgo = true
    linhas.push(`TESTOSTERONA TOTAL: ${testo} ng/dL`)
    if (testo < REF.testoM.baixo) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push('TESTOSTERONA BAIXA (HIPOGONADISMO MASCULINO): CAUSA FREQUENTE EM BARIÁTRICOS. PODE RESULTAR DE DEFICIÊNCIA DE ZINCO, VITAMINA D E OBESIDADE RESIDUAL. SUPLEMENTAÇÃO DE TESTOSTERONA PODE AGRAVAR ERITROCITOSE E HAS — AVALIAÇÃO COM UROLOGISTA OU ENDOCRINOLOGISTA.')
      alertas.push({ nivel: MODERADO, texto: `TESTOSTERONA BAIXA: ${testo} ng/dL — AVALIAR HIPOGONADISMO.` })
      suger.push('LH, FSH, PROLACTINA')
    } else if (testo > 900) {
      if (nivelGeral === NORMAL) nivelGeral = LEVE
      linhas.push('TESTOSTERONA ELEVADA (> 900 ng/dL): VERIFICAR USO DE ANABOLIZANTES OU TESTOSTERONA EXÓGENA. PODE PRODUZIR ERITROCITOSE.')
      alertas.push({ nivel: LEVE, texto: 'TESTOSTERONA ELEVADA — VERIFICAR USO DE ANABOLIZANTES.' })
    } else {
      linhas.push('TESTOSTERONA DENTRO DA FAIXA NORMAL MASCULINA.')
    }
  }

  // Estradiol feminino
  if (sexo === 'F' && !isNaN(estr)) {
    temAlgo = true
    linhas.push(`ESTRADIOL: ${estr} pg/mL`)
    if (estr < REF.estradiolF.baixo && idade >= 40) {
      if (nivelGeral === NORMAL) nivelGeral = LEVE
      linhas.push('ESTRADIOL BAIXO EM MULHER ≥ 40 ANOS: COMPATÍVEL COM MENOPAUSA OU INSUFICIÊNCIA OVARIANA. AVALIAR INDICAÇÃO DE TERAPIA HORMONAL — IMPORTANTE PARA PREVENÇÃO DA OSTEOPOROSE NO CONTEXTO BARIÁTRICO.')
      alertas.push({ nivel: LEVE, texto: 'ESTRADIOL BAIXO — AVALIAR INDICAÇÃO DE TERAPIA HORMONAL NA MENOPAUSA.' })
      suger.push('FSH, LH (SE NÃO MENOPAUSA CONFIRMADA)')
    } else {
      linhas.push('ESTRADIOL DENTRO DO ESPERADO.')
    }
  }

  if (!temAlgo) return null

  return {
    id:     'hormonal',
    titulo: 'PERFIL HORMONAL',
    nivel:  nivelGeral,
    linhas,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 11 — ONCOLÓGICO
// ─────────────────────────────────────────────────────────────────────────────
function buildModOncologico(ex, dados, sexo, idade, alertas, suger) {
  const linhas = []
  let nivelGeral = NORMAL
  let temAlgo = false

  const psa   = parseFloat(ex.psa_total)
  const ca199 = parseFloat(ex.ca199)
  const cea   = parseFloat(ex.cea)
  const estr  = parseFloat(ex.estradiol)

  if (sexo === 'M' && idade >= 40) {
    if (!isNaN(psa)) {
      temAlgo = true
      linhas.push(`PSA TOTAL: ${psa} ng/mL`)
      if (psa > REF.psa.alto) {
        nivelGeral = GRAVE
        linhas.push('PSA MUITO ELEVADO (> 10 ng/mL): RISCO AUMENTADO DE CÂNCER DE PRÓSTATA. AVALIAÇÃO UROLÓGICA URGENTE COM BIÓPSIA.')
        alertas.push({ nivel: GRAVE, texto: `PSA MUITO ELEVADO: ${psa} ng/mL — AVALIAÇÃO UROLÓGICA URGENTE.` })
        suger.push('AVALIAÇÃO COM UROLOGISTA')
        suger.push('PSA LIVRE / PSA TOTAL RATIO')
      } else if (psa > REF.psa.normal) {
        if (nivelGeral !== GRAVE) nivelGeral = MODERADO
        linhas.push('PSA ELEVADO (4–10 ng/mL): ZONA CINZENTA. AVALIAÇÃO COM UROLOGISTA E CONSIDERAR PSA LIVRE, RESSONÂNCIA DE PRÓSTATA E BIÓPSIA.')
        alertas.push({ nivel: MODERADO, texto: `PSA ELEVADO: ${psa} ng/mL — AVALIAÇÃO UROLÓGICA NECESSÁRIA.` })
        suger.push('AVALIAÇÃO COM UROLOGISTA')
        suger.push('PSA LIVRE')
      } else {
        linhas.push('PSA DENTRO DA NORMALIDADE.')
      }
    } else suger.push('PSA TOTAL')
  }

  // CA 19-9 (para homens ≥40 e mulheres ≥40)
  if (idade >= 40) {
    if (!isNaN(ca199)) {
      temAlgo = true
      linhas.push(`CA 19-9: ${ca199} U/mL`)
      if (ca199 > 37) {
        if (nivelGeral !== GRAVE) nivelGeral = MODERADO
        linhas.push('CA 19-9 ELEVADO (> 37 U/mL): MARCADOR DE NEOPLASIAS DO TRATO GASTROINTESTINAL (PÂNCREAS, VIAS BILIARES). AVALIAÇÃO COM ONCOLOGISTA. TAMBÉM PODE ESTAR ELEVADO EM PANCREATITES E COLANGITES — CORRELACIONAR COM CLÍNICA E IMAGEM.')
        alertas.push({ nivel: MODERADO, texto: `CA 19-9 ELEVADO: ${ca199} U/mL — INVESTIGAR NEOPLASIA ABDOMINAL.` })
        suger.push('ECOGRAFIA ABDOMINAL')
        suger.push('TOMOGRAFIA DE ABDOME COM CONTRASTE')
        suger.push('AVALIAÇÃO COM ONCOLOGISTA')
      } else {
        linhas.push('CA 19-9 DENTRO DA NORMALIDADE.')
      }
    } else suger.push('CA 19-9')
  }

  // CEA
  if (idade >= 40) {
    if (!isNaN(cea)) {
      temAlgo = true
      linhas.push(`CEA: ${cea} ng/mL`)
      const limCea = dados.sexo === 'M' ? 5 : 3.8
      if (cea > limCea) {
        if (nivelGeral !== GRAVE) nivelGeral = MODERADO
        linhas.push(`CEA ELEVADO (> ${limCea} ng/mL): MARCADOR ASSOCIADO A CÂNCER COLORRETAL, GÁSTRICO E PULMONAR. TABAGISMO TAMBÉM ELEVA CEA. AVALIAR COM ONCOLOGISTA. COLONOSCOPIA INDICADA SE NÃO RECENTE.`)
        alertas.push({ nivel: MODERADO, texto: `CEA ELEVADO: ${cea} ng/mL — INVESTIGAR NEOPLASIA.` })
        suger.push('COLONOSCOPIA')
        suger.push('AVALIAÇÃO COM ONCOLOGISTA')
      } else {
        linhas.push('CEA DENTRO DA NORMALIDADE.')
      }
    } else suger.push('CEA')
  if (sexo === 'F') suger.push('CA 125 (RASTREIO DE NEOPLASIA OVARIANA)')
  }

  if (!temAlgo) return null

  return {
    id:     'oncol',
    titulo: 'RASTREAMENTO ONCOLÓGICO',
    nivel:  nivelGeral,
    linhas,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 12 — COMPORTAMENTAL E QUALIDADE DE VIDA
// ─────────────────────────────────────────────────────────────────────────────
function buildModComportamental(dados) {
  const linhas = []
  let nivelGeral = NORMAL
  let temAlgo = false

  const compulsoes = dados.compulsoes || []
  const atividade  = dados.atividade_fisica || []
  const projetos   = dados.projetos_vida || []
  const meds       = dados.medicamentos || []

  // Compulsões
  const sedentario = atividade.includes('SEDENTÁRIO')
  const compFoodAlc = compulsoes.filter(c =>
    ['DOCES', 'COMIDA', 'ÁLCOOL'].includes(c)
  )
  const compOther = compulsoes.filter(c =>
    ['GELO', 'JOGO', 'TRABALHO', 'OUTRA'].includes(c)
  )

  if (compulsoes.includes('ÁLCOOL')) {
    temAlgo = true
    nivelGeral = GRAVE
    linhas.push('COMPULSÃO POR ÁLCOOL: A SÍNDROME DE TRANSFERÊNCIA DE ADIÇÃO (ADDICTION TRANSFER) É RECONHECIDA NO PÓS-BARIÁTRICO. O ÁLCOOL É ABSORVIDO MAIS RÁPIDO E PRODUZ PICOS MAIORES DE ALCOOLEMIA NO BARIÁTRICO. AVALIAÇÃO COM PSIQUIATRA E ENCAMINHAMENTO PARA GRUPO DE APOIO (ALCOÓLICOS ANÔNIMOS). O ÁLCOOL AGRAVA DEFICIÊNCIAS DE TIAMINA, FOLATOS E PRODUZ DANO HEPÁTICO ACELERADO.')
    linhas.push('ALERTA: USO DE ÁLCOOL NO BARIÁTRICO ELEVA RISCO DE CÂNCER DE ESÔFAGO, CIRROSE E VARIZES ESOFAGIANAS.')
  }

  if (compulsoes.includes('DOCES') || compulsoes.includes('COMIDA')) {
    temAlgo = true
    if (nivelGeral !== GRAVE) nivelGeral = MODERADO
    linhas.push('COMPULSÃO ALIMENTAR POR DOCES OU COMIDA: FATOR DE RISCO PARA REGANHO DE PESO. AVALIAÇÃO COM PSICÓLOGO/PSIQUIATRA ESPECIALIZADO EM COMPULSÃO ALIMENTAR. SÍNDROME DE DUMPING TARDIA PODE MIMETIZAR COMPULSÃO POR DOCES.')
  }

  if (compulsoes.includes('GELO')) {
    temAlgo = true
    if (nivelGeral === NORMAL) nivelGeral = LEVE
    linhas.push('COMPULSÃO POR GELO (PAGOFAGIA): FORTEMENTE ASSOCIADA À DEFICIÊNCIA DE FERRO. INVESTIGAR E CORRIGIR SIDEROPENIA. A PAGOFAGIA GERALMENTE RESOLVE COM A REPOSIÇÃO DE FERRO.')
    linhas.push('ALERTA PAGOFAGIA: SE FERRO NORMAL E COMPULSÃO PERSISTE, INVESTIGAR OUTRAS CAUSAS (ANEMIA PERNICIOSA, DISTÚRBIO COMPULSIVO).')
  }

  // Sedentarismo
  if (sedentario) {
    temAlgo = true
    if (nivelGeral === NORMAL) nivelGeral = LEVE
    linhas.push('SEDENTARISMO: A ATIVIDADE FÍSICA É FUNDAMENTAL PARA MANUTENÇÃO DO PESO, PRESERVAÇÃO DA MASSA MUSCULAR, CONTROLE GLICÊMICO E SAÚDE ÓSSEA NO PÓS-BARIÁTRICO. INICIAR COM CAMINHADA E PROGRESSIVAMENTE INCLUIR RESISTÊNCIA MUSCULAR (MUSCULAÇÃO).')
  }

  // Antidepressivos e remédios para dormir
  if (meds.includes('ANTIDEPRESSIVO')) {
    temAlgo = true
    linhas.push('USO DE ANTIDEPRESSIVO: ALGUNS ANTIDEPRESSIVOS (ESPECIALMENTE TRICÍCLICOS E MIRTAZAPINA) PODEM ESTIMULAR APETITE E DIFICULTAR CONTROLE DO PESO. REVISAR MEDICAMENTO COM PSIQUIATRA.')
  }

  if (meds.includes('REMÉDIO PARA DORMIR')) {
    temAlgo = true
    linhas.push('USO DE MEDICAMENTOS PARA DORMIR: INVESTIGAR APNEIA DO SONO, ANSIEDADE E HÁBITOS DE SONO. A PERDA DE PESO FREQUENTEMENTE MELHORA OU RESOLVE A APNEIA OBSTRUTIVA DO SONO.')
  }

  if (meds.includes('LAXANTES')) {
    temAlgo = true
    if (nivelGeral === NORMAL) nivelGeral = LEVE
    linhas.push('USO DE LAXANTES: RISCO DE DESEQUILÍBRIO ELETROLÍTICO E COMPROMETIMENTO ABSORTIVO. INVESTIGAR CONSTIPAÇÃO E TRATAR CAUSA (HIDRATAÇÃO, FIBRAS, PROBIÓTICOS). USO CRÔNICO DE LAXANTES ESTIMULANTES É PREJUDICIAL.')
  }

  if (meds.some(m => m.includes('DOMPERIDONA') || m.includes('BROMOPRIDA'))) {
    temAlgo = true
    linhas.push('USO DE PROCINÉTICO (DOMPERIDONA OU BROMOPRIDA): SUGERE DISMOTILIDADE GÁSTRICA OU NÁUSEAS PERSISTENTES. NO BARIÁTRICO, PODE INDICAR DUMPING, ESTENOSE DA ANASTOMOSE OU INTOLERÂNCIA ALIMENTAR. AVALIAÇÃO COM CIRURGIÃO BARIÁTRICO.')
  }

  if (meds.some(m => m.includes('FERRO VENOSO'))) {
    temAlgo = true
    linhas.push('USO DE FERRO ENDOVENOSO: INDICA ABSORÇÃO ORAL INSUFICIENTE OU INTOLERÂNCIA AO FERRO ORAL. IMPORTANTE MONITORAR FERRITINA E SATURAÇÃO DA TRANSFERRINA PERIODICAMENTE PARA EVITAR SOBRECARGA.')
  }

  if (meds.some(m => m.includes('TOPIRAMATO'))) {
    temAlgo = true
    if (nivelGeral === NORMAL) nivelGeral = LEVE
    linhas.push('USO DE TOPIRAMATO: PODE SER UMA BOA OPÇÃO NO PÓS-BARIÁTRICO QUANDO HÁ REGANHO DE PESO, PERDA INSUFICIENTE, COMPULSÃO ALIMENTAR OU APETITE AUMENTADO. ENTRE OS FÁRMACOS ESTUDADOS NO PÓS-OPERATÓRIO, O TOPIRAMATO APARECE COM BOM SINAL DE BENEFÍCIO, EMBORA A MAIOR PARTE DA EVIDÊNCIA VENHA DE ESTUDOS OBSERVACIONAIS.')
    linhas.push('PONTOS DE CAUTELA NO BARIÁTRICO: O TOPIRAMATO AUMENTA O RISCO DE DESIDRATAÇÃO, ACIDOSE METABÓLICA, CÁLCULO RENAL, LENTIFICAÇÃO COGNITIVA E PARESTESIAS — RISCOS QUE PESAM AINDA MAIS EM QUEM JÁ TEM MENOR INGESTÃO HÍDRICA, EPISÓDIOS DE VÔMITO OU DIARREIA FREQUENTES.')
    linhas.push('MONITORAMENTO RECOMENDADO: HIDRATAÇÃO DIÁRIA (MÍNIMO 2L), FUNÇÃO RENAL, BICARBONATO SÉRICO, SINTOMAS NEUROCOGNITIVOS E LITÍASE RENAL. NÃO É INDICADO COMO SUBSTITUTO DA INVESTIGAÇÃO DA CAUSA DO REGANHO (COMPORTAMENTAL, ANATÔMICA, NUTRICIONAL OU HORMONAL) — DEVE ENTRAR COMO COADJUVANTE.')
    if (dados.status_gestacional === 'GRÁVIDA' || dados.status_gestacional?.includes('GRÁVIDA')) {
      linhas.push('ATENÇÃO: TOPIRAMATO TEM ALERTA IMPORTANTE DE TERATOGENICIDADE. NÃO DEVE SER USADO NA GESTAÇÃO. SUSPENDER IMEDIATAMENTE SE GRAVIDEZ CONFIRMADA.')
      alertas.push({ nivel: GRAVE, texto: 'TOPIRAMATO EM GESTANTE — TERATOGÊNICO. SUSPENDER IMEDIATAMENTE.' })
    }
    suger.push('FUNÇÃO RENAL E BICARBONATO SÉRICO (TOPIRAMATO)')
    suger.push('ULTRASSONOGRAFIA RENAL (RASTREIO DE LITÍASE — TOPIRAMATO)')
  }

  if (!temAlgo) return null

  return {
    id:     'comportamental',
    titulo: 'ASPECTOS COMPORTAMENTAIS E QUALIDADE DE VIDA',
    nivel:  nivelGeral,
    linhas,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 13 — GESTACIONAL
// ─────────────────────────────────────────────────────────────────────────────
function buildModGestacional(dados, mesesPos, alertas, suger) {
  const gravida  = dados.status_gestacional
  const semanas  = parseInt(dados.semanas_gestacao) || 0
  const sexo     = dados.sexo || 'F'

  if (sexo !== 'F' || !gravida) return null

  const linhas = []
  let nivelGeral = GRAVE

  linhas.push(`GRAVIDEZ CONFIRMADA — ${semanas > 0 ? semanas + ' SEMANAS' : 'TEMPO GESTACIONAL NÃO INFORMADO'}.`)

  // Risco por tempo pós-cirurgia
  if (mesesPos < 18) {
    linhas.push('GRAVIDEZ DENTRO DE 18 MESES DA CIRURGIA BARIÁTRICA: PERÍODO DE MAIOR RISCO NUTRICIONAL. AS PRINCIPAIS SOCIEDADES (ASMBS, IFSO) RECOMENDAM AGUARDAR PELO MENOS 12–18 MESES APÓS A CIRURGIA PARA ENGRAVIDAR. RISCOS INCLUEM RESTRIÇÃO DE CRESCIMENTO INTRAUTERINO (RCIU), PREMATURIDADE E DEFICIÊNCIAS NUTRICIONAIS GRAVES PARA MÃE E BEBÊ.')
    alertas.push({ nivel: GRAVE, texto: 'GRAVIDEZ NO PERÍODO DE RISCO PÓS-BARIÁTRICO (< 18 MESES). ACOMPANHAMENTO DE ALTO RISCO.' })
  } else {
    linhas.push('GRAVIDEZ APÓS 18 MESES DA CIRURGIA: RISCO RELATIVO MENOR, MAS ACOMPANHAMENTO ESPECIALIZADO AINDA NECESSÁRIO. GRAVIDEZ PÓS-BARIÁTRICA É CONSIDERADA DE ALTO RISCO OBSTÉTRICO.')
    alertas.push({ nivel: GRAVE, texto: 'GRAVIDEZ PÓS-BARIÁTRICA — PRÉ-NATAL DE ALTO RISCO OBRIGATÓRIO.' })
  }

  // Recomendações gestacionais
  linhas.push('SUPLEMENTAÇÃO GESTACIONAL PÓS-BARIÁTRICA (OBRIGATÓRIA):')
  linhas.push('• ÁCIDO FÓLICO: 5 MG/DIA (DOSE ELEVADA) — INICIADO IDEALMENTE 3 MESES ANTES DA CONCEPÇÃO.')
  linhas.push('• FERRO ENDOVENOSO: PRÉ-NATAL E PÓS-PARTO (NÃO ORAL — ABSORÇÃO INSUFICIENTE).')
  linhas.push('• VITAMINA B12: SUBLINGUAL OU IM MENSAL — A DEFICIÊNCIA CAUSA DEFEITOS DO TUBO NEURAL.')
  linhas.push('• VITAMINA D: META ≥ 40 NG/ML NA GESTAÇÃO.')
  linhas.push('• CITRATO DE CÁLCIO: 1.200–1.500 MG/DIA.')
  linhas.push('• VITAMINA A: NÃO EXCEDER 10.000 UI/DIA (TERATOGÊNICO EM DOSES ALTAS).')

  // Exames gestacionais
  suger.push('PRÉ-NATAL COM OBSTETRA DE ALTO RISCO')
  suger.push('ULTRASSONOGRAFIA MORFOLÓGICA')
  suger.push('GLICEMIA EM JEJUM E TOTG 75G (DIABETES GESTACIONAL)')
  suger.push('FERRITINA, B12, VITAMINA D, FOLATOS (MENSAIS)')
  suger.push('PRESSÃO ARTERIAL SERIADA')

  if (semanas >= 14 && semanas <= 20) {
    linhas.push('ENTRE 14 E 20 SEMANAS: PERÍODO IDEAL PARA RASTREAMENTO DE ANOMALIAS FETAIS (ULTRASSOM MORFOLÓGICO) E INVESTIGAÇÃO LABORATORIAL COMPLETA.')
  }

  if (semanas > 28) {
    linhas.push('APÓS 28 SEMANAS: RASTREAMENTO DE PRÉ-ECLÂMPSIA, RESTRIÇÃO DE CRESCIMENTO E AVALIAÇÃO DE MOVIMENTO FETAL. PREPARAR PLANO DE PARTO COM EQUIPE MULTIDISCIPLINAR.')
  }

  return {
    id:     'gestacional',
    titulo: 'GRAVIDEZ PÓS-BARIÁTRICA',
    nivel:  nivelGeral,
    linhas,
  }
}
