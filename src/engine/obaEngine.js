// ─────────────────────────────────────────────────────────────────────────────
// obaEngine.js — Extensão bariátrica do RedFairy
// Recebe: resultadoEritron (decisionEngine), dadosOBA (anamnese), examesOBA
// Retorna: relatório OBA com alertas, módulos e orientações
// ─────────────────────────────────────────────────────────────────────────────

import { OBA_CUTOFFS } from './obaCutoffs'

// ── Valores de referência pós-bariátrica (ASMBS/IFSO/literatura) ─────────────
const REF = {
  // Vitamina B12 (pg/mL) — ≥200 já é normal (Dr. Ramos); >1000 sem suplementação = investigar
  b12:          { critico: 100, baixo: 200, normal: 200, alto: 1000 },
  // Vitamina D 25-OH (ng/mL)
  vitD:         { critico: 10,  baixo: 20,  normal: 30,  alto: 100 },
  // Zinco sérico (mcg/dL)
  zinco:        { critico: 50,  baixo: 60,  normal: 70,  alto: 130 },
  // Vitamina A (mcg/dL)
  vitA:         { critico: 15,  baixo: 20,  normal: 65,  alto: 77  },
  // Tiamina / B1 (nmol/L)
  tiamina:      { critico: 50,  baixo: 70,  normal: 200, alto: 450 },
  // Vitamina E (mg/L) — alinhado à unidade coletada no exame (faixa 5–18 mg/L)
  vitE:         { critico: 3,   baixo: 5,   normal: 12,  alto: 18  },
  // Vitamina K (ng/mL)
  vitK:         { critico: 0.1, baixo: 0.2, normal: 1.0, alto: 2.2 },
  // Folatos (ng/mL)
  folatos:      { critico: 2,   baixo: 4,   normal: 6,   alto: 20  },
  // Selênio (mcg/L)
  selenio:      { critico: 40,  baixo: 63,  normal: 120, alto: 200 },
  // Vitamina C (mg/dL)
  vitC:         { critico: 0.2, baixo: 0.4, normal: 0.7, alto: 2.0 },
  // (niacina: o corte fica no obaCutoffs.js em mcg/mL; REF.niacina era código morto)
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
  'MINI-BYPASS (OAGB)':     { grau: 3, nomeCurto: 'Mini-Bypass (OAGB)' },
  'FOBI-CAPELLA':           { grau: 3, nomeCurto: 'Fobi-Capella'     },
  'SLEEVE':                 { grau: 2, nomeCurto: 'Sleeve'           },
  'BANDA GÁSTRICA AJUSTÁVEL':{ grau: 1, nomeCurto: 'Banda Gástrica'  },
  'NÃO SEI':                { grau: 2, nomeCurto: 'Bariátrica'       },
}

// Normaliza tipo de cirurgia — aceita variações de nome do OBAModal
// BUG #8 corrigido: ordem dos testes — FOBI/CAPELLA antes de ROUX/BYPASS,
// para que "FOBI-CAPELLA" sem "ROUX" caia no ramo correto sem ambiguidade.
function normalizarCirurgia(tipo) {
  if (!tipo) return 'NÃO SEI'
  const t = tipo.toUpperCase()
  if (t.includes('FOBI') || t.includes('CAPELLA')) return 'FOBI-CAPELLA'
  // MINI-BYPASS/OAGB ANTES de ROUX/BYPASS: seu rótulo contém "BYPASS" e seria
  // capturado como Y de Roux; é uma cirurgia própria (mesmo grau 3 de disabsorção).
  if (t.includes('MINI') || t.includes('OAGB')) return 'MINI-BYPASS (OAGB)'
  if (t.includes('ROUX') || t.includes('BYPASS')) return 'Y DE ROUX'
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

  // ── 1b. MÓDULO CONTEXTO DA INDICAÇÃO CIRÚRGICA ──────────────────────────
  const modIndic = buildModIndicacao(dadosOBA, alertas)
  if (modIndic) modulos.push(modIndic)

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
  const modComport = buildModComportamental(dadosOBA, alertas, examesSuger)
  if (modComport) modulos.push(modComport)

  // ── 12b. MÓDULO HÁBITOS SOCIAIS E ESTILO DE VIDA (só módulo — não gera alerta) ──
  const modHabitos = buildModHabitos(dadosOBA)
  if (modHabitos) modulos.push(modHabitos)

  // ── 13. MÓDULO GESTACIONAL ───────────────────────────────────────────────
  const modGest = buildModGestacional(dadosOBA, mesesPos, alertas, examesSuger)
  if (modGest) modulos.push(modGest)

  // ── 13b. MÓDULO HISTÓRIA OBSTÉTRICA (gestações prévias / abortamentos) ────
  const modObst = buildModObstetrico(dadosOBA, alertas, examesSuger)
  if (modObst) modulos.push(modObst)

  // ── 14. MÓDULO ACOMPANHAMENTO ────────────────────────────────────────────
  const modAcomp = buildModAcompanhamento(dadosOBA, alertas)
  if (modAcomp) modulos.push(modAcomp)

  // ── 15. MÓDULO LEUCÓCITOS E NEUTRÓFILOS ──────────────────────────────────
  // BUG #6 corrigido: antes "if (modLeucos) modulos.push(modLipidico)" e
  // "modulos.push(modLeucos)" — invertia a lógica e empurrava sempre o
  // leucos mesmo null. Agora cada módulo é empurrado se existir.
  const modLipidico = buildModLipidico(examesOBA, dadosOBA, resultadoEritron?.inputs?.sexo, alertas, examesSuger)
  const modLeucos = buildModLeucos(examesOBA, alertas, examesSuger)
  if (modLipidico) modulos.push(modLipidico)
  if (modLeucos) modulos.push(modLeucos)

  // ── 16. MÓDULO STATUS INTESTINAL ─────────────────────────────────────────
  const modIntestinal = buildModIntestinal(dadosOBA, alertas, examesSuger)
  if (modIntestinal) modulos.push(modIntestinal)

  // ── 17. MÓDULO STATUS FIBROMIÁLGICO ──────────────────────────────────────
  const modFibro = buildModFibromialgia(dadosOBA, examesOBA, alertas, examesSuger)
  if (modFibro) modulos.push(modFibro)

  // ── 18. MÓDULO STATUS NEUROLÓGICO ────────────────────────────────────────
  const modNeuro = buildModNeurologico(dadosOBA, alertas, examesSuger)
  if (modNeuro) modulos.push(modNeuro)

  // ── 19. MÓDULO STATUS ENDOSCÓPICO ────────────────────────────────────────
  const modEndo = buildModEndoscopico(dadosOBA, alertas, examesSuger)
  if (modEndo) modulos.push(modEndo)

  // ── 20. PROTEÍNAS (idade ≥ 45): inversão albumina/globulina ──────────────
  // Globulina ≥ Albumina (relação A/G ≤ 1) sugere processo inflamatório crônico ou
  // gamopatia (ex.: mieloma) → ÊNFASE em avaliação com HEMATOLOGISTA + eletroforese.
  const ptAG = parseFloat(examesOBA.proteina_total)
  const albAG = parseFloat(examesOBA.albumina)
  if (Number.isFinite(ptAG) && Number.isFinite(albAG) && ptAG > 0 && albAG > 0) {
    const globAG = Math.round((ptAG - albAG) * 10) / 10
    if (globAG >= albAG) {
      alertas.push({ nivel: GRAVE, texto: `INVERSÃO ALBUMINA/GLOBULINA (globulina ${globAG} ≥ albumina ${albAG} g/dL) — É IMPORTANTE A AVALIAÇÃO COM HEMATOLOGISTA.` })
      examesSuger.push('AVALIAÇÃO COM HEMATOLOGISTA (inversão albumina/globulina)')
      examesSuger.push('ELETROFORESE DE PROTEÍNAS SÉRICAS')
      modulos.push({
        id: 'proteinas',
        titulo: 'PROTEÍNAS — RELAÇÃO ALBUMINA/GLOBULINA',
        nivel: GRAVE,
        linhas: [
          `PROTEÍNA TOTAL ${ptAG} g/dL · ALBUMINA ${albAG} g/dL · GLOBULINA ${globAG} g/dL.`,
          'A GLOBULINA ESTÁ MAIOR OU IGUAL À ALBUMINA (RELAÇÃO A/G ≤ 1). ISSO PODE REFLETIR PROCESSO INFLAMATÓRIO CRÔNICO OU UMA GAMOPATIA (PRODUÇÃO ANORMAL DE ANTICORPOS). É IMPORTANTE A AVALIAÇÃO COM HEMATOLOGISTA, COM ELETROFORESE DE PROTEÍNAS SÉRICAS.',
        ],
      })
    }
  }

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

  // HIV/ARV — macrocitose e anemia
  if (dadosOBA.hivTratamento) {
    linhas.push('TRATAMENTO PARA HIV/ARV: ANTIRRETROVIRAIS (ESPECIALMENTE AZT/ZIDOVUDINA) PODEM CAUSAR MACROCITOSE E ANEMIA. NO BARIÁTRICO, ESSE EFEITO SE SOMA À SÍNDROME DISABSORTIVA. MONITORAR HEMOGRAMA COM ATENÇÃO AO VCM E RETICULÓCITOS. COMUNICAR AO INFECTOLOGISTA O CONTEXTO BARIÁTRICO.')
    alertas.push({ nivel: MODERADO, texto: 'TRATAMENTO ARV: RISCO DE MACROCITOSE E ANEMIA — CORRELACIONAR COM HEMOGRAMA.' })
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
    // BUG #7 corrigido: antes, cada exame era empurrado 2x (dedup acontece
    // no fim, mas suja a fonte). Agora cada um aparece 1x.
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
// MÓDULO 1b — CONTEXTO DA INDICAÇÃO CIRÚRGICA
// Lê dadosOBA.indicacao_cirurgia. OBESIDADE pura = caso padrão (sem output).
// Valores possíveis (form): OBESIDADE | METÁBOLICA (...) | OBESIDADE + DIABETES |
// HEMOCROMATOSE | GASTRECTOMIA POR OUTRAS CAUSAS
// ─────────────────────────────────────────────────────────────────────────────
function buildModIndicacao(dadosOBA, alertas) {
  const indic = (dadosOBA.indicacao_cirurgia || '').toUpperCase()
  if (!indic || indic === 'OBESIDADE') return null

  const linhas = []
  let nivel = NORMAL

  if (indic.includes('HEMOCROMATOSE')) {
    linhas.push('CIRURGIA INDICADA POR HEMOCROMATOSE (INDICAÇÃO MUITO RARA): ATENÇÃO — O CONTEXTO DE FERRO ESTÁ INVERTIDO. A SUPLEMENTAÇÃO DE FERRO É CONTRAINDICADA. A DISABSORÇÃO PÓS-CIRÚRGICA PODE TER EFEITO PROTETOR AO REDUZIR A ABSORÇÃO DE FERRO. FERRITINA E SATURAÇÃO DA TRANSFERRINA DEVEM SER MANTIDAS NO LIMITE INFERIOR DA NORMALIDADE. CONFIRMAR MUTAÇÃO HFE E RASTREAR FAMILIARES. SANGRIAS TERAPÊUTICAS PODEM PERMANECER INDICADAS MESMO APÓS A CIRURGIA.')
    nivel = MODERADO
    alertas.push({ nivel: MODERADO, texto: 'CIRURGIA POR HEMOCROMATOSE: contexto de ferro invertido — suplementação de ferro contraindicada.' })
  } else if (indic.includes('METÁBOLICA') || indic.includes('METABÓLICA') || indic.includes('DIABETES')) {
    linhas.push('É IMPORTANTE AVALIAR QUANTO DO OBJETIVO DA CIRURGIA FOI ATINGIDO, COMPARANDO OS EXAMES ANTERIORES AO PROCEDIMENTO COM OS POSTERIORES. ORGANIZE OS EXAMES PRÉ E PÓS-CIRÚRGICOS POR DATA E MARQUE UMA TELECONSULTA MÉDICA VIA PLATAFORMA PARA SER ADEQUADAMENTE ORIENTADO. SE OS EXAMES TÊM MAIS DE 90 DIAS, SOLICITE AO MÉDICO O PEDIDO PARA NOVOS EXAMES.')
    nivel = LEVE
    alertas.push({ nivel: LEVE, texto: 'INDICAÇÃO METABÓLICA/DIABETES: avaliar quanto do objetivo da cirurgia foi atingido — comparar exames pré e pós e marcar teleconsulta.' })
  } else if (indic.includes('GASTRECTOMIA')) {
    linhas.push('CIRURGIA POR GASTRECTOMIA DE OUTRA CAUSA: É FUNDAMENTAL MARCAR UMA TELECONSULTA VIA PLATAFORMA PARA QUE UM MÉDICO REVISE OS EXAMES E INVESTIGUE A ENFERMIDADE QUE LEVOU À CIRURGIA, CONSIDERADA A POSSIBILIDADE DE RECIDIVA E EVENTUAL PERDA DE CONTROLE SOBRE A DOENÇA.')
    nivel = MODERADO
    alertas.push({ nivel: MODERADO, texto: 'GASTRECTOMIA POR OUTRA CAUSA: revisar exames e investigar recidiva da doença de base — marcar teleconsulta.' })
  } else {
    return null
  }

  return { id: 'indicacao', titulo: 'CONTEXTO DA INDICAÇÃO CIRÚRGICA', nivel, linhas }
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 18 — STATUS NEUROLÓGICO (sintomas → carências)
// Lê dadosOBA.status_neurologico (checklist). Dispara se houver qualquer sintoma
// diferente de "SEM QUEIXAS". Correlaciona sintomas neuro pós-bariátricos com
// carências de B12/B1(tiamina)/cobre — gatilho independente do laboratório.
// ─────────────────────────────────────────────────────────────────────────────
function buildModNeurologico(dadosOBA, alertas, suger) {
  const lista = Array.isArray(dadosOBA.status_neurologico) ? dadosOBA.status_neurologico : []
  const sintomas = lista.filter(s => s && s !== 'SEM QUEIXAS')
  if (sintomas.length === 0) return null

  const linhas = []
  linhas.push(`SINTOMAS NEUROLÓGICOS RELATADOS: ${sintomas.join(', ')}.`)
  linhas.push('NO PÓS-BARIÁTRICO, MANIFESTAÇÕES NEUROLÓGICAS SÃO SINAIS DE ALERTA PARA CARÊNCIAS NUTRICIONAIS — ESPECIALMENTE VITAMINA B12, TIAMINA (B1) E COBRE. RECOMENDA-SE DOSAR ESSES NUTRIENTES E AVALIAÇÃO NEUROLÓGICA. O TRATAMENTO PRECOCE PODE REVERTER OS SINTOMAS; A DEMORA PODE TORNÁ-LOS PERMANENTES.')

  alertas.push({ nivel: MODERADO, texto: `SINTOMAS NEUROLÓGICOS (${sintomas.length}): investigar B12/B1/cobre e avaliação neurológica.` })
  suger.push('VITAMINA B12 SÉRICA')
  suger.push('TIAMINA (VITAMINA B1)')
  suger.push('COBRE SÉRICO')
  suger.push('AVALIAÇÃO NEUROLÓGICA')

  return { id: 'neurologico', titulo: 'STATUS NEUROLÓGICO', nivel: MODERADO, linhas }
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 19 — STATUS ENDOSCÓPICO (achados → conduta)
// Lê dadosOBA.status_endoscopico (checklist). Cada achado != "NORMAL" gera sua
// conduta. DIVERTÍCULOS (colonoscopia) entra como fonte de sangramento que
// agrava a sideropenia. Cruza ESOFAGITE/DRGE com a armadilha do IBP crônico.
// ─────────────────────────────────────────────────────────────────────────────
function buildModEndoscopico(dadosOBA, alertas, suger) {
  const lista = Array.isArray(dadosOBA.status_endoscopico) ? dadosOBA.status_endoscopico : []
  const achados = lista.filter(s => s && s !== 'NORMAL')
  const igmReag = dadosOBA.anti_hp_igm === 'REAGENTE'
  const iggReag = dadosOBA.anti_hp_igg === 'REAGENTE'
  if (achados.length === 0 && !igmReag && !iggReag) return null

  const ordem = { [NORMAL]: 0, [LEVE]: 1, [MODERADO]: 2, [GRAVE]: 3 }
  let nivel = NORMAL
  const bump = (alvo) => { if (ordem[alvo] > ordem[nivel]) nivel = alvo }
  const has = (x) => achados.includes(x)

  const linhas = []

  if (has('DIVERTÍCULOS')) {
    linhas.push('DIVERTÍCULOS: A DIVERTICULITE É FONTE DE SANGRAMENTO QUE AGRAVA A SIDEROPENIA E PODE EXIGIR MAIOR REPOSIÇÃO DE FERRO ENDOVENOSO. INVESTIGAR SANGRAMENTO ATIVO E ACOMPANHAR COM GASTROENTEROLOGISTA/COLOPROCTOLOGISTA.')
    alertas.push({ nivel: MODERADO, texto: 'DIVERTÍCULOS: fonte de sangramento — agrava sideropenia, pode exigir ferro endovenoso.' })
    suger.push('SANGUE OCULTO NAS FEZES')
    suger.push('COLONOSCOPIA')
    bump(MODERADO)
  }
  if (has('H. PYLORI') || igmReag || iggReag) {
    const fonte = has('H. PYLORI') ? 'ACHADO ENDOSCÓPICO'
      : igmReag ? 'SOROLOGIA IgM REAGENTE (INFECÇÃO RECENTE/ATIVA)'
      : 'SOROLOGIA IgG REAGENTE'
    linhas.push(`H. PYLORI (${fonte}): CARCINÓGENO DO GRUPO 1 (IARC/OMS) — AUMENTA O RISCO DE CÂNCER GÁSTRICO E LINFOMA MALT, ALÉM DE COMPROMETER A ABSORÇÃO DE B12 E FERRO E CAUSAR GASTRITE.`)
    linhas.push('TRATADA OU NÃO? OS ANTICORPOS CONTRA O H. PYLORI NÃO SÃO PROTETORES E PERSISTEM APÓS O TRATAMENTO — A SOROLOGIA NÃO CONFIRMA CURA NEM IMUNIDADE. SE A INFECÇÃO NÃO FOI TRATADA, INDICA-SE A ERRADICAÇÃO. SE JÁ FOI TRATADA, CONFIRME A ERRADICAÇÃO POR TESTE NÃO SOROLÓGICO (ANTÍGENO FECAL, TESTE RESPIRATÓRIO DA UREIA OU BIÓPSIA) — NUNCA PELA SOROLOGIA.')
    alertas.push({ nivel: MODERADO, texto: igmReag
      ? 'H. PYLORI — IgM reagente (infecção ativa): erradicar e confirmar cura por teste não sorológico.'
      : 'H. PYLORI — verificar se foi tratada; se não, erradicar. Sorologia não confirma cura (anticorpos persistem).' })
    suger.push('PESQUISA DE H. PYLORI POR ANTÍGENO FECAL OU TESTE RESPIRATÓRIO DA UREIA (confirmar status / controle pós-tratamento)')
    bump(MODERADO)
  }
  if (has('BARRETT')) {
    linhas.push('BARRETT: LESÃO PRÉ-MALIGNA — EXIGE VIGILÂNCIA ENDOSCÓPICA PERIÓDICA COM GASTROENTEROLOGISTA.')
    alertas.push({ nivel: MODERADO, texto: 'ESÔFAGO DE BARRETT: lesão pré-maligna — vigilância endoscópica periódica.' })
    suger.push('ENDOSCOPIA DIGESTIVA ALTA (VIGILÂNCIA DE BARRETT)')
    bump(MODERADO)
  }
  if (has('GASTRITE')) {
    linhas.push('GASTRITE: PODE CAUSAR SANGRAMENTO OCULTO E CONTRIBUIR PARA ANEMIA FERROPRIVA. INVESTIGAR E TRATAR.')
    suger.push('SANGUE OCULTO NAS FEZES')
    bump(LEVE)
  }
  if (has('ESOFAGITE') || has('REFLUXO GASTRO ESOFÁGICO')) {
    linhas.push('ESOFAGITE / DRGE: REFLUXO COMUM NO PÓS-BARIÁTRICO; PODE SANGRAR. MANEJO COM GASTROENTEROLOGISTA. ATENÇÃO: O USO CRÔNICO DE IBP PARA O REFLUXO AGRAVA O DÉFICIT DE B12 E FERRO.')
    bump(LEVE)
  }

  return { id: 'endoscopico', titulo: 'STATUS ENDOSCÓPICO', nivel, linhas }
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
  const usaB12IM  = meds.some(m => m.includes('B12') && m.includes('INTRAMUSCULAR'))
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
  } else if (b12 > REF.b12.alto) {
    // B12 alta: no bariátrico é MUITO comum por suplementação (sublingual/IM em altas
    // doses) — nesse caso é esperada/benigna. SEM suplementação, B12 persistentemente
    // alta (> 1.000) pede investigação (hepatopatia, mieloproliferativa, neoplasia oculta).
    if (usaB12IM || usaB12Sub) {
      linhas.push(`VITAMINA B12 ELEVADA (${b12} pg/mL): ESPERADA PELO USO DE B12 SUPLEMENTAR (SUBLINGUAL/INTRAMUSCULAR) NO BARIÁTRICO — ACHADO BENIGNO. PODE-SE REDUZIR OU ESPAÇAR A DOSE SE MUITO ALTA.`)
    } else {
      nivel = MODERADO
      linhas.push(`VITAMINA B12 ELEVADA (> 1.000 pg/mL: ${b12}) SEM SUPLEMENTAÇÃO REGISTRADA: EMBORA POSSA SER BENIGNA/GENÉTICA, A B12 PERSISTENTEMENTE ALTA SEM CAUSA EXÓGENA PEDE INVESTIGAÇÃO — HEPATOPATIA, DOENÇA MIELOPROLIFERATIVA (HEMOGRAMA COM DIFERENCIAL) OU NEOPLASIA OCULTA.`)
      alertas.push({ nivel: MODERADO, texto: `B12 ELEVADA (${b12} pg/mL) SEM SUPLEMENTAÇÃO — INVESTIGAR (HEPATOPATIA, MIELOPROLIFERATIVA, NEOPLASIA).` })
      suger.push('HEMOGRAMA COM DIFERENCIAL + BIOQUÍMICA HEPÁTICA (B12 elevada sem suplementação)')
    }
  } else {
    linhas.push('VITAMINA B12 ADEQUADA (≥ 200 pg/mL) PARA O CONTEXTO BARIÁTRICO. MANTER SUPLEMENTAÇÃO ATUAL E REMONITORAR EM 6 MESES.')
  }

  // Metformina e IBP agravam deficiência de B12
  const usaMetformina = dados.metformina || false
  const usaIBP = dados.ibp || false
  if (usaMetformina) {
    linhas.push('USO DE METFORMINA: REDUZ SIGNIFICATIVAMENTE A ABSORÇÃO DE VITAMINA B12 — RISCO CUMULATIVO COM A SÍNDROME DISABSORTIVA BARIÁTRICA. MONITORAR B12 A CADA 6 MESES.')
    if (nivel === NORMAL) alertas.push({ nivel: LEVE, texto: 'METFORMINA + BARIÁTRICA: RISCO AUMENTADO DE DÉFICIT DE B12 — MONITORAR.' })
  }
  if (usaIBP) {
    linhas.push('USO DE IBP (OMEPRAZOL/PANTOPRAZOL): SUPRIME ÁCIDO GÁSTRICO NECESSÁRIO PARA ABSORÇÃO DE B12. NO BARIÁTRICO, O USO CRÔNICO DE IBP AGRAVA O RISCO DE DEFICIÊNCIA DE B12 E FERRO. AVALIAR REAL NECESSIDADE DE MANUTENÇÃO.')
    if (nivel === NORMAL) alertas.push({ nivel: LEVE, texto: 'IBP CRÔNICO: REDUZ ABSORÇÃO DE B12 E FERRO — AVALIAR NECESSIDADE.' })
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
      linhas.push('ZINCO EM ZONA LIMÍTROFE (60–70 mcg/dL). MONITORAR. MANTER SUPLEMENTAÇÃO COM POLIVITAMÍNICO CONTENDO ZINCO.')
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
    linhas.push(`VITAMINA E: ${vitE} mg/L`)
    if (vitE < REF.vitE.baixo) {
      if (nivelGeral === NORMAL) nivelGeral = LEVE
      linhas.push('VITAMINA E ABAIXO DO NORMAL (< 5 mg/L). ANTIOXIDANTE ESSENCIAL. SUPLEMENTAR VIA POLIVITAMÍNICO COM TOCOFEROL.')
      alertas.push({ nivel: LEVE, texto: `VITAMINA E BAIXA: ${vitE} mg/L.` })
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
    if (dados.methotrexato) {
      linhas.push('USO DE METOTREXATO: ANTAGONISTA DO ÁCIDO FÓLICO. CAUSA DEPLEÇÃO PROGRESSIVA DE FOLATOS — EFEITO SOMADO À DISABSORÇÃO BARIÁTRICA. SUPLEMENTAÇÃO COM ÁCIDO FÓLICO 5 MG/DIA É OBRIGATÓRIA. MONITORAR FOLATOS E HEMOGRAMA REGULARMENTE.')
      alertas.push({ nivel: MODERADO, texto: 'METOTREXATO + BARIÁTRICA: ALTO RISCO DE DEFICIÊNCIA DE FOLATOS — SUPLEMENTAR OBRIGATORIAMENTE.' })
    }
  } else {
    suger.push('FOLATOS SÉRICOS')
    if (dados.methotrexato) {
      linhas.push('USO DE METOTREXATO SEM FOLATOS DOSADOS: METOTREXATO É ANTAGONISTA DO ÁCIDO FÓLICO. SOLICITAR FOLATOS URGENTE E INICIAR SUPLEMENTAÇÃO PREVENTIVA COM ÁCIDO FÓLICO 5 MG/DIA.')
      alertas.push({ nivel: MODERADO, texto: 'METOTREXATO EM USO — DOSEAR FOLATOS E SUPLEMENTAR ÁCIDO FÓLICO.' })
    }
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

  // Vitamina C
  const vitC = parseFloat(ex.vitamina_c)
  if (!isNaN(vitC)) {
    temAlgo = true
    linhas.push(`VITAMINA C: ${vitC} mg/dL`)
    if (vitC < REF.vitC.critico) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push('VITAMINA C GRAVEMENTE BAIXA (< 0,2 mg/dL). RISCO DE ESCORBUTO: SANGRAMENTO GENGIVAL, PETÉQUIAS, COMPROMETIMENTO DE CICATRIZAÇÃO E FRAGILIDADE VASCULAR. A DEFICIÊNCIA DE VITAMINA C PREJUDICA TAMBÉM A ABSORÇÃO DE FERRO NÃO-HEME — AGRAVA ANEMIA FERROPRIVA. SUPLEMENTAÇÃO URGENTE: 500–1.000 MG/DIA.')
      alertas.push({ nivel: MODERADO, texto: `VITAMINA C CRÍTICA: ${vitC} mg/dL — RISCO DE ESCORBUTO E COMPROMETIMENTO ABSORTIVO DE FERRO.` })
    } else if (vitC < REF.vitC.baixo) {
      if (nivelGeral === NORMAL) nivelGeral = LEVE
      linhas.push('VITAMINA C BAIXA (0,2–0,4 mg/dL). SUPLEMENTAR 200–500 MG/DIA. A VITAMINA C POTENCIALIZA A ABSORÇÃO DO FERRO NÃO-HEME — IMPORTANTE NO BARIÁTRICO COM DEFICIÊNCIA DE FERRO.')
      alertas.push({ nivel: LEVE, texto: `VITAMINA C BAIXA: ${vitC} mg/dL — SUPLEMENTAR.` })
    } else {
      linhas.push('VITAMINA C DENTRO DA FAIXA NORMAL.')
    }
  } else {
    suger.push('VITAMINA C')
  }

  // Vitamina K
  const vitK = parseFloat(ex.vitamina_k)
  if (!isNaN(vitK)) {
    temAlgo = true
    linhas.push(`VITAMINA K: ${vitK} ng/mL`)
    if (vitK < REF.vitK.critico) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push('VITAMINA K GRAVEMENTE BAIXA (< 0,1 ng/mL). RISCO DE COAGULOPATIA E AGRAVAMENTO DA PERDA ÓSSEA. NO BARIÁTRICO COM VARIZES DE ESÔFAGO OU USO DE ANTICOAGULANTES, ESSE ACHADO É PARTICULARMENTE CRÍTICO. SUPLEMENTAÇÃO SUPERVISIONADA NECESSÁRIA.')
      alertas.push({ nivel: MODERADO, texto: `VITAMINA K CRÍTICA: ${vitK} ng/mL — RISCO DE COAGULOPATIA.` })
      suger.push('TEMPO DE PROTROMBINA (TP/INR)')
    } else if (vitK < REF.vitK.baixo) {
      if (nivelGeral === NORMAL) nivelGeral = LEVE
      linhas.push('VITAMINA K BAIXA (0,1–0,2 ng/mL). IMPORTANTE PARA COAGULAÇÃO E SAÚDE ÓSSEA. SUPLEMENTAR VIA POLIVITAMÍNICO COM MK-7 (MENAQUINONA).')
      alertas.push({ nivel: LEVE, texto: `VITAMINA K BAIXA: ${vitK} ng/mL — SUPLEMENTAR.` })
    } else {
      linhas.push('VITAMINA K DENTRO DA FAIXA NORMAL.')
    }
  } else {
    suger.push('VITAMINA K')
  }

  // Niacina (B3) — incomum no bariátrico; comentário simples quando baixa
  const niacina = parseFloat(ex.niacina)
  if (!isNaN(niacina) && niacina < 0.5) {
    temAlgo = true
    if (nivelGeral === NORMAL) nivelGeral = LEVE
    linhas.push(`NIACINA (B3) BAIXA (${niacina} mcg/mL): OS POLIVITAMÍNICOS DESENVOLVIDOS PARA PACIENTES BARIÁTRICOS NORMALMENTE SUPREM ESSA NECESSIDADE.`)
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
  const stGli = dados.status_glicemico || ''
  // DUMPING agora é um campo próprio (checkbox), independente do radio glicêmico.
  // Mantém compat. com dados antigos onde vinha dentro de status_glicemico.
  const temDumping = !!dados.dumping || stGli.includes('DUMPING')
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
      // 200–499: o risco CV é contado no módulo LIPIDOGRAMA (evita contar 2x no
      // estado). Aqui fica só informativo.
      linhas.push('TRIGLICÉRIDES ELEVADOS (200–499 mg/dL) — risco cardiovascular avaliado no LIPIDOGRAMA. Avaliar padrão alimentar, álcool e resistência insulínica.')
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
    linhas.push('A INTERVENÇÃO MÉDICA É NECESSÁRIA PARA REDUZIR ESSE RISCO — NÃO POSTERGUE A AVALIAÇÃO ESPECIALIZADA.')
    alertas.push({ nivel: MODERADO, texto: 'DUMPING RELATADO: AJUSTAR DIETA E AVALIAR COM ESPECIALISTA — intervenção médica reduz o risco.' })
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

  // Ureia (cortes a validar pelo médico)
  const ure = parseFloat(ex.ureia)
  if (!isNaN(ure)) {
    temAlgo = true
    linhas.push(`UREIA: ${ure} mg/dL`)
    if (ure > 100) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push('UREIA MUITO ELEVADA (> 100 mg/dL): avaliar função renal, desidratação ou sangramento gastrointestinal. Correlacionar com a creatinina.')
      alertas.push({ nivel: MODERADO, texto: `UREIA MUITO ELEVADA: ${ure} mg/dL.` })
    } else if (ure > 40) {
      if (nivelGeral === NORMAL) nivelGeral = LEVE
      linhas.push('UREIA ELEVADA (> 40 mg/dL): no bariátrico, causas comuns são desidratação e dieta hiperproteica; correlacionar com a creatinina e a hidratação.')
    } else {
      linhas.push('UREIA NORMAL.')
    }
  } else suger.push('UREIA')

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

    // ── IMC PRE-CIRURGIA E IMC ATUAL ──────────────────────────────────
    const imcAntes = parseFloat(dados.imc_antes)
    const imcAtual = parseFloat(dados.imc_atual)

    function classificaIMC(imc) {
      if (isNaN(imc)) return ''
      if (imc < 18.5)  return 'BAIXO PESO'
      if (imc < 25)    return 'EUTROFIA'
      if (imc < 30)    return 'SOBREPESO'
      if (imc < 35)    return 'OBESIDADE GRAU I'
      if (imc < 40)    return 'OBESIDADE GRAU II'
      return 'OBESIDADE GRAU III (MORBIDA)'
    }

    const strIMCAntes = isNaN(imcAntes) ? 'desconhecido' : `${imcAntes.toFixed(1)} (${classificaIMC(imcAntes)})`
    const strIMCAtual = isNaN(imcAtual) ? 'desconhecido' : `${imcAtual.toFixed(1)} (${classificaIMC(imcAtual)})`
    linhas.push(`IMC PRÉVIO: ${strIMCAntes} · IMC ATUAL: ${strIMCAtual}`)

    if (!isNaN(imcAntes) && !isNaN(imcAtual)) {
      const deltaIMC = imcAntes - imcAtual           // positivo = perdeu
      const pctIMC   = (deltaIMC / imcAntes) * 100

      if (deltaIMC > 0) {
        linhas.push(`REDUÇÃO DE IMC: ${deltaIMC.toFixed(1)} unidades (${pctIMC.toFixed(1)}% do IMC inicial).`)
        if (pctIMC >= 25) {
          linhas.push('PERDA DE IMC ADEQUADA/EXCELENTE (≥ 25% do IMC inicial): SUCESSO BARIÁTRICO CONSISTENTE. MANTER ACOMPANHAMENTO NUTRICIONAL E ATIVIDADE FÍSICA PARA SUSTENTAR O RESULTADO.')
        } else if (pctIMC >= 10) {
          if (nivelGeral === NORMAL) nivelGeral = LEVE
          linhas.push('PERDA DE IMC PARCIAL (10–25% do IMC inicial): RESULTADO INSUFICIENTE PARA O ESPERADO NA BARIÁTRICA. REAVALIAR ADESÃO À DIETA, ATIVIDADE FÍSICA E POSSÍVEL FALHA PARCIAL DA CIRURGIA.')
          alertas.push({ nivel: LEVE, texto: `PERDA DE IMC PARCIAL: ${pctIMC.toFixed(0)}% — INSUFICIENTE.` })
        } else {
          if (nivelGeral !== GRAVE) nivelGeral = MODERADO
          linhas.push('PERDA DE IMC MUITO AQUÉM DO ESPERADO (< 10% do IMC inicial): RESULTADO INSATISFATÓRIO DA CIRURGIA. INVESTIGAR ADESÃO, TÉCNICA CIRÚRGICA OU NECESSIDADE DE CIRURGIA REVISIONAL.')
          alertas.push({ nivel: MODERADO, texto: `PERDA DE IMC AQUÉM: apenas ${pctIMC.toFixed(0)}%.` })
        }
      } else if (deltaIMC < 0) {
        const ganhoAbs = Math.abs(deltaIMC)
        const ganhoPct = Math.abs(pctIMC)
        linhas.push(`GANHO DE IMC APÓS A CIRURGIA: ${ganhoAbs.toFixed(1)} unidades (${ganhoPct.toFixed(1)}% a mais que o IMC inicial).`)
        if (ganhoPct > 10) {
          nivelGeral = GRAVE
          linhas.push('REGANHO EXPRESSIVO DO IMC (> 10% acima do IMC pré-cirúrgico): FALHA BARIÁTRICA SIGNIFICATIVA. AVALIAÇÃO PARA REVISÃO CIRÚRGICA, ACOMPANHAMENTO PSICOLÓGICO E TERAPIA FARMACOLÓGICA ADJUVANTE.')
          alertas.push({ nivel: GRAVE, texto: `REGANHO DE IMC EXPRESSIVO: +${ganhoPct.toFixed(0)}%.` })
        } else if (ganhoPct > 5) {
          if (nivelGeral !== GRAVE) nivelGeral = MODERADO
          linhas.push('REGANHO MODERADO DO IMC (5–10% acima do IMC inicial): INTERVENÇÃO NECESSÁRIA. REAVALIAR PADRÃO ALIMENTAR, ATIVIDADE FÍSICA E CONSIDERAR FARMACOTERAPIA.')
          alertas.push({ nivel: MODERADO, texto: `REGANHO DE IMC: +${ganhoPct.toFixed(0)}%.` })
        } else {
          if (nivelGeral === NORMAL) nivelGeral = LEVE
          linhas.push('REGANHO LEVE DO IMC (até 5% acima do IMC inicial): MONITORAR. ATENÇÃO AO PADRÃO ALIMENTAR E ROTINA DE EXERCÍCIOS.')
          alertas.push({ nivel: LEVE, texto: `REGANHO LEVE DE IMC: +${ganhoPct.toFixed(0)}%.` })
        }
      } else {
        linhas.push('IMC ATUAL IGUAL AO PRÉ-CIRÚRGICO: AVALIAR SE HÁ OSCILAÇÃO RECENTE OU SE A CIRURGIA NÃO TEVE O IMPACTO PONDERAL ESPERADO.')
      }
    }

    if (!isNaN(pesoMin) && pesoMin < pesoAtual) {
      // Apenas dado bruto. O JULGAMENTO (gravidade/conduta) do reganho fica a
      // cargo do VEREDITO ao final (reganho % sobre o MENOR PESO × meta). O
      // antigo cálculo por "% do peso perdido" foi removido por contradizer o
      // veredito (mesmo paciente recebia "reganho leve" e "objetivo alcançado").
      const reganho = pesoAtual - pesoMin
      linhas.push(`MENOR PESO ALCANÇADO: ${pesoMin} kg`)
      linhas.push(`REGANHO DESDE O NADIR: ${reganho.toFixed(1)} kg`)
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

  // ── VEREDITO DO OBJETIVO DA CIRURGIA (baixo peso / reganho × meta) ──────────
  // Cruza o status pondéral atual com a meta declarada (projeto de vida).
  // Prioridade (1ª que casar vence): P1 baixo peso (IMC<20) > P2 reganho>15%
  // sobre o menor peso (nadir) > P3 controlado (reganho<=15% e IMC ok).
  const imcAtualVer  = parseFloat(dados.imc_atual)
  const pctSobreNadir = (!isNaN(pesoMin) && !isNaN(pesoAtual) && pesoMin > 0)
    ? ((pesoAtual - pesoMin) / pesoMin) * 100
    : null

  if (meta) {
    const metaLabel = meta === 'PERDER' ? 'PERDER PESO' : meta === 'GANHAR' ? 'GANHAR PESO' : 'MANTER O PESO'
    linhas.push(`META DO PACIENTE: ${metaLabel}${(meta !== 'MANTER' && !isNaN(metaKg) && metaKg > 0) ? ` (${metaKg} kg)` : ''}.`)

    if (!isNaN(imcAtualVer) && imcAtualVer < 20) {
      // P1 — baixo peso / perda excessiva
      if (meta === 'GANHAR') {
        linhas.push('PERDA DE PESO EXCESSIVA — IMC ATUAL ABAIXO DO IDEAL. COMO VOCÊ DESEJA GANHAR PESO, BUSQUE AVALIAÇÃO DO CIRURGIÃO E DE ENDOCRINOLOGISTA OU METABOLOGISTA PARA ORIENTAR A RECUPERAÇÃO PONDERAL COM SEGURANÇA.')
        alertas.push({ nivel: MODERADO, texto: 'BAIXO PESO (IMC < 20) + META GANHAR: buscar cirurgião e endocrinologista/metabologista.' })
      } else if (meta === 'MANTER') {
        linhas.push('SEU IMC ESTÁ ABAIXO DO IDEAL E VOCÊ DESEJA MANTER O PESO. BUSQUE AVALIAÇÃO DE ENDOCRINOLOGISTA/NUTRÓLOGO — NESSE NÍVEL DE IMC A MANUTENÇÃO PODE NÃO SER SEGURA.')
        alertas.push({ nivel: MODERADO, texto: 'BAIXO PESO (IMC < 20) + META MANTER: avaliação de endocrinologista/nutrólogo.' })
      } else {
        linhas.push('ATENÇÃO: SEU IMC JÁ ESTÁ ABAIXO DO IDEAL E VOCÊ DESEJA PERDER MAIS PESO — ISSO PODE SER PERIGOSO. BUSQUE AVALIAÇÃO MÉDICA (ENDOCRINOLOGISTA/METABOLOGISTA).')
        alertas.push({ nivel: MODERADO, texto: 'BAIXO PESO (IMC < 20) + META PERDER: avaliação médica — pode ser perigoso.' })
      }
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
    } else if (pctSobreNadir !== null && pctSobreNadir > 15) {
      // P2 — reganho > 15% sobre o menor peso pós-cirurgia
      if (meta === 'MANTER') {
        linhas.push('VOCÊ DESEJA MANTER O PESO, MAS HÁ REGANHO SIGNIFICATIVO (MAIS DE 15% SOBRE O MENOR PESO PÓS-CIRURGIA). PROCURE ORIENTAÇÃO DE NUTRÓLOGO PARA INTERROMPER A TENDÊNCIA DE GANHO.')
      } else if (meta === 'PERDER') {
        linhas.push('REGANHO SIGNIFICATIVO E META DE PERDER PESO: É NECESSÁRIA ORIENTAÇÃO DE NUTRÓLOGO PARA INTERROMPER A TENDÊNCIA E REVERTER O GANHO DE PESO.')
      } else {
        linhas.push('VOCÊ DESEJA GANHAR PESO, MAS HÁ REGANHO SIGNIFICATIVO (MAIS DE 15% SOBRE O MENOR PESO). O GANHO DEVE SER SUPERVISIONADO POR NUTRÓLOGO PARA NÃO COMPROMETER O RESULTADO DA CIRURGIA.')
      }
      alertas.push({ nivel: MODERADO, texto: `REGANHO > 15% SOBRE O MENOR PESO + META ${metaLabel}: orientação de nutrólogo.` })
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
    } else if (pctSobreNadir !== null) {
      // P3 — controlado (reganho <= 15%) e IMC ok (>= 20 ou desconhecido)
      if (meta === 'MANTER') {
        linhas.push('OBJETIVO DA CIRURGIA ALCANÇADO: O PESO ESTÁ CONTROLADO (REGANHO ATÉ 15% SOBRE O MENOR PESO) E ALINHADO À SUA META DE MANUTENÇÃO. MANTER OS HÁBITOS ADQUIRIDOS E O ACOMPANHAMENTO.')
      } else if (meta === 'PERDER') {
        linhas.push('PESO CONTROLADO. COMO VOCÊ DESEJA PERDER MAIS PESO, O ACOMPANHAMENTO COM NUTRICIONISTA AJUDA A ATINGIR A META COM SEGURANÇA.')
        if (nivelGeral === NORMAL) nivelGeral = LEVE
      } else {
        linhas.push('PESO CONTROLADO. COMO VOCÊ DESEJA GANHAR PESO, FAÇA-O SOB ORIENTAÇÃO DE NUTRICIONISTA PARA PRIORIZAR MASSA MAGRA E NÃO GORDURA.')
        if (nivelGeral === NORMAL) nivelGeral = LEVE
      }
    }
  } else {
    // Sem meta declarada: ainda assim sinaliza reganho/baixo peso com gravidade
    // própria — senão essas situações ficariam silenciosas só por falta da meta.
    if (!isNaN(imcAtualVer) && imcAtualVer < 20) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push('IMC ATUAL ABAIXO DO IDEAL (PERDA DE PESO POSSIVELMENTE EXCESSIVA): BUSQUE AVALIAÇÃO MÉDICA (ENDOCRINOLOGISTA/NUTRÓLOGO) PARA AVALIAR A RECUPERAÇÃO PONDERAL.')
      alertas.push({ nivel: MODERADO, texto: 'BAIXO PESO (IMC < 20): avaliação médica para recuperação ponderal.' })
    } else if (pctSobreNadir !== null && pctSobreNadir > 15) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push('REGANHO SIGNIFICATIVO (MAIS DE 15% SOBRE O MENOR PESO PÓS-CIRURGIA): PROCURE ORIENTAÇÃO DE NUTRÓLOGO PARA AVALIAR A TENDÊNCIA DE GANHO.')
      alertas.push({ nivel: MODERADO, texto: 'REGANHO > 15% SOBRE O MENOR PESO: orientação de nutrólogo.' })
    }
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
    if (usouAnticoa && !usaAnticoa) {
      linhas.push('MESMO QUE VOCÊ TENHA INTERROMPIDO O ANTICOAGULANTE COM ORIENTAÇÃO MÉDICA, VOCÊ PODE ESTAR EM RISCO DE NOVA TROMBOSE: RECOMENDO UMA TELECONSULTA O MAIS RÁPIDO POSSÍVEL.')
      alertas.push({ nivel: MODERADO, texto: 'TROMBOSE PRÉVIA COM ANTICOAGULANTE JÁ INTERROMPIDO — risco de nova trombose; recomenda-se TELECONSULTA o quanto antes.' })
    }
    linhas.push('NA INVESTIGAÇÃO DA TROMBOSE COM HEMATOLOGISTA, O D-DÍMERO PODE AUXILIAR (POR EXEMPLO, NA DEFINIÇÃO DA DURAÇÃO DA ANTICOAGULAÇÃO E NA AVALIAÇÃO DE TROMBOFILIA). HISTÓRICO DE COVID-19 REFORÇA ESSA INVESTIGAÇÃO.')
    suger.push('D-DÍMERO (NA AVALIAÇÃO COM HEMATOLOGISTA)')
    alertas.push({ nivel: GRAVE, texto: 'HISTÓRICO DE TROMBOSE COM RISCO AUMENTADO DE TEV NO BARIÁTRICO.' })
  }

  if (varizes) {
    temAlgo = true
    if (nivelGeral !== GRAVE) nivelGeral = MODERADO
    linhas.push(`VARIZES DE MEMBROS INFERIORES${variGrau ? ' — GRAU: ' + variGrau : ''}. NO BARIÁTRICO, VARIZES PODEM INDICAR INSUFICIÊNCIA VENOSA CRÔNICA AGRAVADA PELO EXCESSO DE PESO PREGRESSO.`)
  }

  // VARIZES DE ESÔFAGO agora é independente das varizes de membros (migrou para o
  // STATUS ENDOSCÓPICO no round 3) → bloco próprio.
  if (variEsof) {
    temAlgo = true
    nivelGeral = GRAVE
    linhas.push('VARIZES DE ESÔFAGO: INDICAM HIPERTENSÃO PORTAL, FREQUENTEMENTE ASSOCIADA A CIRROSE HEPÁTICA OU OUTRAS HEPATOPATIAS. NO BRASIL, A ESQUISTOSSOMOSE (S. MANSONI) É CAUSA IMPORTANTE DE HIPERTENSÃO PORTAL. AVALIAÇÃO GASTROENTEROLÓGICA E HEPATOLÓGICA URGENTE.')
    alertas.push({ nivel: GRAVE, texto: 'VARIZES DE ESÔFAGO — INVESTIGAR HIPERTENSÃO PORTAL E HEPATOPATIA (INCL. ESQUISTOSSOMOSE).' })
    suger.push('ENDOSCOPIA DIGESTIVA ALTA')
    suger.push('ECOGRAFIA ABDOMINAL COM DOPPLER PORTAL')
    suger.push('AVALIAÇÃO COM HEPATOLOGISTA')
    suger.push('IMUNOFLUORESCÊNCIA PARA S. MANSONI')
    if (opeVarizes) {
      linhas.push('JÁ OPEROU VARIZES DE ESÔFAGO: SEGUIMENTO ENDOSCÓPICO PERIÓDICO OBRIGATÓRIO.')
      suger.push('ENDOSCOPIA DIGESTIVA ALTA (CONTROLE)')
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

  // Sequelas trombóticas e síndrome pós-COVID
  if (dados.teve_covid) {
    temAlgo = true
    if (nivelGeral === NORMAL) nivelGeral = LEVE
    linhas.push('HISTÓRICO DE COVID-19: PARTE DOS PACIENTES EVOLUI COM SEQUELAS TROMBÓTICAS QUE PODEM COMPROMETER A QUALIDADE DE VIDA. AVALIAR SINTOMAS RESIDUAIS (DISPNEIA, FADIGA, DOR) E HISTÓRICO TROMBÓTICO.')

    // Tríade: COVID prévia + evento trombótico + múltiplos sintomas fibromiálgicos
    const fibroCount = (dados.status_fibromialgia || []).length
    if (dados.trombose === true && fibroCount >= 2) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push('SUSPEITA DE SÍNDROME PÓS-COVID: A COMBINAÇÃO DE COVID-19 PRÉVIA, EVENTO TROMBÓTICO E MÚLTIPLOS SINTOMAS (FADIGA, DORES, ALTERAÇÕES COGNITIVAS E DE HUMOR) LEVANTA A POSSIBILIDADE DE SÍNDROME PÓS-COVID — DOENÇA DA PROTEÍNA SPIKE E COVID-LONGA. IMPORTANTE AFASTAR ESSA HIPÓTESE COM AVALIAÇÃO MÉDICA ESPECÍFICA.')
      alertas.push({ nivel: MODERADO, texto: 'POSSÍVEL SÍNDROME PÓS-COVID (PROTEÍNA SPIKE / COVID-LONGA) — IMPORTANTE AFASTAR ESSA POSSIBILIDADE.' })
    }
  }

  // Imunização COVID-19 (interpretação simples a partir de vacina_covid)
  if (Array.isArray(dados.vacina_covid) && dados.vacina_covid.length > 0) {
    temAlgo = true
    const imunizado = dados.vacina_covid.some(v => v && v !== 'NÃO TOMEI VACINA')
    if (imunizado) {
      linhas.push('IMUNIZAÇÃO COVID-19: VACINADO(A) — PROVAVELMENTE IMUNIZADO(A). CONVERSE COM O SEU MÉDICO SOBRE A IMUNIZAÇÃO (REFORÇOS E ATUALIZAÇÃO DO ESQUEMA VACINAL).')
    } else {
      if (nivelGeral === NORMAL) nivelGeral = LEVE
      linhas.push('IMUNIZAÇÃO COVID-19: SEM REGISTRO DE VACINAÇÃO — PROVAVELMENTE NÃO IMUNIZADO(A). CONVERSE COM O SEU MÉDICO SOBRE A IMUNIZAÇÃO.')
    }
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
  const pth = parseFloat(ex.pth)
  const mg = parseFloat(ex.magnesio)
  // Cortes ósseo-minerais: fonte única em obaCutoffs.js (sem literais duplicados).
  const cMg = OBA_CUTOFFS.magnesio, cCa = OBA_CUTOFFS.calcio_ionico, cPth = OBA_CUTOFFS.pth
  const temLabOsseo = !isNaN(pth) || !isNaN(ca) || !isNaN(mg)

  if (!osseo && !dental && !temLabOsseo) return null

  const linhas = []
  let nivelGeral = NORMAL
  // Escalona a gravidade do modulo sem rebaixar
  const rankNivel = { normal: 0, leve: 1, moderado: 2, grave: 3 }
  const subirNivel = (n) => { if (rankNivel[n] > rankNivel[nivelGeral]) nivelGeral = n }

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
  } else if (osseo === 'DENSITOMETRIA ÓSSEA NORMAL') {
    linhas.push('DENSITOMETRIA ÓSSEA NORMAL: MANTER SUPLEMENTAÇÃO PREVENTIVA DE CÁLCIO E VITAMINA D. REPETIR DENSITOMETRIA EM 2 ANOS.')
  } else if (osseo === 'NÃO FIZ DENSITOMETRIA') {
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
  if (dental === 'PERDI MAIS DE UM DENTE APÓS A CIRURGIA') {
    if (nivelGeral !== GRAVE) nivelGeral = MODERADO
    linhas.push('PERDA DE DENTES SIGNIFICATIVA: PODE SER MANIFESTAÇÃO DE DEFICIÊNCIA DE VITAMINA D, CÁLCIO E VITAMINA C CRÔNICA, ALÉM DE REFLUXO ÁCIDO E HÁBITOS ALIMENTARES PÓS-BARIÁTRICOS. AVALIAÇÃO ODONTOLÓGICA E INVESTIGAÇÃO NUTRICIONAL.')
    alertas.push({ nivel: MODERADO, texto: 'PERDA DENTÁRIA SIGNIFICATIVA — INVESTIGAR DEFICIÊNCIAS NUTRICIONAIS.' })
  } else if (dental === 'PRECISO TRATAMENTO ODONTOLÓGICO') {
    if (nivelGeral === NORMAL) nivelGeral = LEVE
    linhas.push('PROBLEMAS DENTÁRIOS FREQUENTES: ASSOCIADOS À ACIDEZ BUCAL (REFLUXO), DEFICIÊNCIA DE CÁLCIO E VITAMINA D, E VÔMITOS FREQUENTES. AVALIAÇÃO ODONTOLÓGICA E CONTROLE DO REFLUXO INDICADOS.')
  }

  // ── Bloco bioquímico ósseo-mineral: Vitamina D / PTH / Cálcio iônico / Magnésio ──
  const vitDBaixa   = !isNaN(vitD) && vitD < 30
  const vitDCritica = !isNaN(vitD) && vitD < 20

  // Magnésio — pré-requisito para a ação do PTH e da vitamina D
  if (!isNaN(mg)) {
    if (mg < cMg.min) {
      linhas.push(`MAGNÉSIO BAIXO (${mg} MG/DL): A HIPOMAGNESEMIA É FREQUENTE NO BARIÁTRICO E PREJUDICA A SECREÇÃO E A AÇÃO DO PTH, ALÉM DA ATIVAÇÃO DA VITAMINA D. CORRIGIR O MAGNÉSIO É PRÉ-REQUISITO PARA QUE A REPOSIÇÃO DE CÁLCIO E VITAMINA D FUNCIONE.`)
      alertas.push({ nivel: MODERADO, texto: 'HIPOMAGNESEMIA — CORRIGIR ANTES DE OTIMIZAR CÁLCIO E VITAMINA D.' })
      subirNivel(MODERADO)
    } else if (mg > cMg.max) {
      linhas.push(`MAGNÉSIO ELEVADO (${mg} MG/DL): INVESTIGAR FUNÇÃO RENAL E EXCESSO DE SUPLEMENTAÇÃO.`)
      subirNivel(LEVE)
    }
  }

  // Cálcio iônico
  let caBaixo = false
  if (!isNaN(ca)) {
    if (ca < cCa.min) {
      caBaixo = true
      linhas.push(`CÁLCIO IÔNICO BAIXO (${ca} MMOL/L): HIPOCALCEMIA. NO BARIÁTRICO, COMUMENTE SECUNDÁRIA À DEFICIÊNCIA DE VITAMINA D E À MÁ ABSORÇÃO. REPOR CITRATO DE CÁLCIO E CORRIGIR VITAMINA D E MAGNÉSIO.`)
      alertas.push({ nivel: MODERADO, texto: 'HIPOCALCEMIA — REPOSIÇÃO DE CÁLCIO (CITRATO) E CORREÇÃO DE VITAMINA D.' })
      subirNivel(MODERADO)
    } else if (ca > cCa.max) {
      linhas.push(`CÁLCIO IÔNICO ELEVADO (${ca} MMOL/L): INVESTIGAR HIPERPARATIREOIDISMO PRIMÁRIO OU EXCESSO DE SUPLEMENTAÇÃO DE CÁLCIO E VITAMINA D.`)
      subirNivel(LEVE)
    }
  }

  // PTH intacto — eixo do hiperparatireoidismo secundário no bariátrico
  if (!isNaN(pth)) {
    if (pth > cPth.max) {
      if (!isNaN(ca) && ca > cCa.max) {
        linhas.push(`PTH ELEVADO (${pth} PG/ML) COM CÁLCIO ALTO: PADRÃO SUGESTIVO DE HIPERPARATIREOIDISMO PRIMÁRIO. INVESTIGAÇÃO ENDOCRINOLÓGICA INDICADA.`)
        alertas.push({ nivel: GRAVE, texto: 'PTH E CÁLCIO ELEVADOS — INVESTIGAR HIPERPARATIREOIDISMO PRIMÁRIO.' })
        subirNivel(GRAVE)
      } else {
        const grave = vitDCritica || caBaixo
        linhas.push(`PTH ELEVADO (${pth} PG/ML) COM CÁLCIO NORMAL OU BAIXO: HIPERPARATIREOIDISMO SECUNDÁRIO — RESPOSTA CLÁSSICA À DEFICIÊNCIA DE VITAMINA D E CÁLCIO NO BARIÁTRICO, COM ESTÍMULO CONTÍNUO À REABSORÇÃO ÓSSEA. OTIMIZAR VITAMINA D (META ≥ 30 NG/ML), CITRATO DE CÁLCIO E MAGNÉSIO; REAVALIAR O PTH APÓS A CORREÇÃO.`)
        alertas.push({ nivel: grave ? GRAVE : MODERADO, texto: 'HIPERPARATIREOIDISMO SECUNDÁRIO — OTIMIZAR VITAMINA D, CÁLCIO E MAGNÉSIO.' })
        subirNivel(grave ? GRAVE : MODERADO)
        suger.push('PTH INTACTO (REAVALIAR APÓS CORREÇÃO)')
      }
    } else if (pth < cPth.min) {
      linhas.push(`PTH BAIXO (${pth} PG/ML): AVALIAR HIPERCALCEMIA, HIPOPARATIREOIDISMO OU EXCESSO DE VITAMINA D E CÁLCIO.`)
      subirNivel(LEVE)
    }
  } else if (vitDBaixa) {
    // Vitamina D baixa sem PTH medido → dosar para flagrar hiperparatireoidismo secundário
    suger.push('PTH INTACTO')
  }

  if (linhas.length === 0) return null

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

  // Tiroxina exógena
  const usaTiroxina = dados.tiroxina || false
  if (usaTiroxina) {
    temAlgo = true
    if (!isNaN(tsh)) {
      if (tsh > REF.tsh.hipotireoidismo) {
        linhas.push('EM USO DE TIROXINA COM TSH AINDA ELEVADO: DOSE INSUFICIENTE OU ABSORÇÃO COMPROMETIDA PELA CIRURGIA BARIÁTRICA. CONSIDERAR AUMENTO DE DOSE OU FORMULAÇÃO LÍQUIDA/SUBLINGUAL. AVALIAÇÃO COM ENDOCRINOLOGISTA.')
        alertas.push({ nivel: MODERADO, texto: 'TIROXINA EM USO MAS TSH AINDA ALTO — AJUSTE DE DOSE NECESSÁRIO.' })
      } else if (tsh < REF.tsh.hipertireoidismo) {
        linhas.push('EM USO DE TIROXINA COM TSH SUPRIMIDO: DOSE EXCESSIVA. RISCO DE FIBRILAÇÃO ATRIAL E PERDA ÓSSEA. REDUZIR DOSE COM ENDOCRINOLOGISTA.')
        alertas.push({ nivel: MODERADO, texto: 'TIROXINA EM DOSE EXCESSIVA — TSH SUPRIMIDO. AJUSTAR.' })
      } else {
        linhas.push('EM USO DE TIROXINA COM TSH CONTROLADO: DOSE ADEQUADA. MANTER MONITORAMENTO SEMESTRAL.')
      }
    } else {
      linhas.push('EM USO DE TIROXINA SEM TSH DOSADO: SOLICITAR TSH PARA AJUSTE DE DOSE. NO BARIÁTRICO, A ABSORÇÃO PODE VARIAR E A DOSE PRÉ-CIRURGIA PODE SER INSUFICIENTE.')
      suger.push('TSH (AJUSTE DE DOSE DE TIROXINA)')
      alertas.push({ nivel: LEVE, texto: 'TIROXINA EM USO — SOLICITAR TSH PARA CONTROLE.' })
    }
  }

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
  if (temAlgo && sexo === 'F') suger.push('CA 125 (RASTREIO DE NEOPLASIA OVARIANA)')
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
// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO — HÁBITOS SOCIAIS E ESTILO DE VIDA
// Só MÓDULO (não empurra alerta), logo NÃO altera o Estado Geral Clínico — a régua
// (classificarEstadoClinico) conta apenas alertas. O nível aqui é só a cor do card:
// doador de sangue = MODERADO; demais atenções = LEVE; só positivos = NORMAL (verde).
// ─────────────────────────────────────────────────────────────────────────────
function buildModHabitos(dados) {
  const h = dados.habitos_sociais || []
  if (!h.length) return null
  const has = (x) => h.includes(x)
  const gestante = dados.status_gestacional === 'GRÁVIDA'

  const RANK = { [GRAVE]: 3, [MODERADO]: 2, [LEVE]: 1, [NORMAL]: 0 }
  let nivel = NORMAL
  const bump = (n) => { if (RANK[n] > RANK[nivel]) nivel = n }

  const linhas = []

  // ── Pontos de atenção ──
  if (has('SOU DOADOR DE SANGUE')) {
    bump(MODERADO)
    linhas.push('DOADOR DE SANGUE: CADA DOAÇÃO REMOVE 200-250 MG DE FERRO. NO BARIÁTRICO, QUE JÁ ABSORVE FERRO DE FORMA DEFICIENTE, ISSO PODE PRECIPITAR OU AGRAVAR ANEMIA FERROPÊNICA. SÓ DOE SANGUE COM AUTORIZAÇÃO MÉDICA E COM FERRITINA E HEMOGRAMA MONITORADOS.')
  }
  if (has('SOU DOADOR DE MEDULA ÓSSEA')) {
    bump(LEVE)
    linhas.push('DOADOR DE MEDULA ÓSSEA: SE FOR CONVOCADO, INFORME AO CENTRO COLETADOR A SUA CONDIÇÃO DE BARIÁTRICO. A COLETA DE MEDULA FRESCA (POR PUNÇÃO) PODE IMPOR PERDA DE FERRO ATÉ MAIOR QUE UMA DOAÇÃO DE SANGUE, PELO VOLUME E PELA CONCENTRAÇÃO CELULAR — EXIGE AVALIAÇÃO E PREPARO DO ESTOQUE DE FERRO.')
  }
  const temSol = has('TOMO SOL HABITUALMENTE') || has('FAÇO ATIVIDADES AO AR LIVRE') || has('COSTUMO IR A PRAIA')
  if (has('MORO EM APARTAMENTO') && !temSol) {
    bump(LEVE)
    linhas.push('MORAR EM APARTAMENTO COM POUCA EXPOSIÇÃO SOLAR AUMENTA O RISCO DE DEFICIÊNCIA DE VITAMINA D, JÁ FREQUENTE NO BARIÁTRICO. REFORCE A SUPLEMENTAÇÃO E BUSQUE LUZ SOLAR REGULAR.')
  }
  if (has('TENHO GATO') && gestante) {
    bump(LEVE)
    linhas.push('CONVÍVIO COM GATO NA GESTAÇÃO: AO CONTRÁRIO DO MITO, O GATO NÃO É A PRINCIPAL FONTE DE TOXOPLASMOSE — VERDURAS MAL LAVADAS E CARNE MALCOZIDA OFERECEM RISCO MAIOR, SOBRETUDO EM PAÍSES EM DESENVOLVIMENTO. AINDA ASSIM, LAVE BEM AS MÃOS APÓS MANIPULAR A CAIXA DE AREIA E HIGIENIZE BEM OS ALIMENTOS.')
  }

  // ── Reforço positivo ──
  const positivos = []
  if (temSol) positivos.push('a exposição ao sol favorece a síntese de vitamina D (mantenha a fotoproteção)')
  if (has('TENHO CACHORRO E PASSEIO COM ELE')) positivos.push('passear com o cão é gasto calórico e atividade física regular')
  if (has('TENHO PLANTAS EM CASA') || has('MORO EM CASA') || has('FAÇO ATIVIDADES AO AR LIVRE') || has('COSTUMO IR A PRAIA') || has('TENHO CACHORRO E PASSEIO COM ELE') || has('TENHO GATO')) {
    positivos.push('o contato com plantas, jardins, praças, praia e animais diversifica o microbioma (efeito probiótico natural)')
  }
  if (has('TENHO UM HOBBY') || has('AJUDO UM PROJETO SOCIAL')) {
    positivos.push('hobby e engajamento social melhoram a saúde mental, a adesão ao acompanhamento e reduzem o risco de reganho de peso')
  }
  if (positivos.length) {
    linhas.push('PONTOS POSITIVOS DO SEU ESTILO DE VIDA: ' + positivos.join('; ') + '.')
  }

  if (!linhas.length) return null
  return { id: 'habitos', titulo: 'HÁBITOS SOCIAIS E ESTILO DE VIDA', nivel, linhas }
}

function buildModComportamental(dados, alertas, suger) {
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
    alertas.push({ nivel: GRAVE, texto: 'COMPULSÃO POR ÁLCOOL no pós-bariátrico (transferência de adição) — avaliação com psiquiatra e grupo de apoio.' })
    suger.push('AVALIAÇÃO COM PSIQUIATRA (compulsão por álcool)')
  }

  if (compulsoes.includes('DOCES') || compulsoes.includes('COMIDA')) {
    temAlgo = true
    if (nivelGeral !== GRAVE) nivelGeral = MODERADO
    linhas.push('COMPULSÃO ALIMENTAR POR DOCES OU COMIDA: FATOR DE RISCO PARA REGANHO DE PESO. AVALIAÇÃO COM PSICÓLOGO/PSIQUIATRA ESPECIALIZADO EM COMPULSÃO ALIMENTAR. SÍNDROME DE DUMPING TARDIA PODE MIMETIZAR COMPULSÃO POR DOCES.')
    alertas.push({ nivel: MODERADO, texto: 'COMPULSÃO ALIMENTAR (doces/comida) — fator de risco para reganho de peso; avaliação especializada.' })
  }

  if (compulsoes.includes('GELO')) {
    temAlgo = true
    if (nivelGeral === NORMAL) nivelGeral = LEVE
    linhas.push('COMPULSÃO POR GELO (PAGOFAGIA): FORTEMENTE ASSOCIADA À DEFICIÊNCIA DE FERRO. INVESTIGAR E CORRIGIR SIDEROPENIA. A PAGOFAGIA GERALMENTE RESOLVE COM A REPOSIÇÃO DE FERRO.')
    linhas.push('ALERTA PAGOFAGIA: SE FERRO NORMAL E COMPULSÃO PERSISTE, INVESTIGAR OUTRAS CAUSAS (ANEMIA PERNICIOSA, DISTÚRBIO COMPULSIVO).')
  }

  if (compulsoes.includes('COMPRAS')) {
    temAlgo = true
    if (nivelGeral !== GRAVE) nivelGeral = MODERADO
    linhas.push('COMPULSÃO POR COMPRAS (ONIOMANIA): PODE REPRESENTAR TRANSFERÊNCIA DE ADIÇÃO NO PÓS-BARIÁTRICO, EM QUE O COMPORTAMENTO ALIMENTAR COMPULSIVO É SUBSTITUÍDO POR OUTRO COMPORTAMENTO COMPULSIVO. ALÉM DO SOFRIMENTO PSÍQUICO, TEM IMPACTO NEGATIVO SOBRE AS FINANÇAS PESSOAIS, COM RISCO DE ENDIVIDAMENTO EXCESSIVO, COMPROMETIMENTO DOS RECURSOS NECESSÁRIOS AO INVESTIMENTO NA PRÓPRIA SAÚDE (CONSULTAS, EXAMES E SUPLEMENTAÇÃO) E IMPACTO DELETÉRIO SOBRE O ORÇAMENTO FAMILIAR. AVALIAÇÃO COM PSICÓLOGO/PSIQUIATRA.')
    alertas.push({ nivel: MODERADO, texto: 'COMPULSÃO POR COMPRAS (oniomania) — possível transferência de adição; impacto sobre finanças pessoais, risco de endividamento e do orçamento familiar; avaliação psicológica/psiquiátrica.' })
    suger.push('AVALIAÇÃO COM PSICÓLOGO/PSIQUIATRA (compulsão por compras)')
  }

  if (compulsoes.includes('JOGO')) {
    temAlgo = true
    if (nivelGeral !== GRAVE) nivelGeral = MODERADO
    linhas.push('COMPULSÃO POR JOGO (JOGO PATOLÓGICO / LUDOMANIA): PODE REPRESENTAR TRANSFERÊNCIA DE ADIÇÃO NO PÓS-BARIÁTRICO, EM QUE O COMPORTAMENTO ALIMENTAR COMPULSIVO É SUBSTITUÍDO POR OUTRO COMPORTAMENTO COMPULSIVO. ALÉM DO SOFRIMENTO PSÍQUICO, TEM IMPACTO NEGATIVO SOBRE AS FINANÇAS PESSOAIS, COM RISCO DE ENDIVIDAMENTO EXCESSIVO, COMPROMETIMENTO DOS RECURSOS NECESSÁRIOS AO INVESTIMENTO NA PRÓPRIA SAÚDE (CONSULTAS, EXAMES E SUPLEMENTAÇÃO) E IMPACTO DELETÉRIO SOBRE O ORÇAMENTO FAMILIAR. AVALIAÇÃO COM PSICÓLOGO/PSIQUIATRA E ENCAMINHAMENTO PARA GRUPO DE APOIO (JOGADORES ANÔNIMOS).')
    alertas.push({ nivel: MODERADO, texto: 'COMPULSÃO POR JOGO (ludomania) — possível transferência de adição; impacto sobre finanças pessoais, risco de endividamento e do orçamento familiar; avaliação psicológica/psiquiátrica.' })
    suger.push('AVALIAÇÃO COM PSICÓLOGO/PSIQUIATRA (compulsão por jogo)')
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

  if (meds.some(m => (m.includes('FERRO INJET') || m.includes('FERRO VENOSO')))) {
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

  // Cirurgia plástica pós-bariátrica (projeto de vida + preparo pré-operatório)
  if (dados.cirurgia_plastica === true) {
    temAlgo = true
    if (nivelGeral === NORMAL) nivelGeral = LEVE
    linhas.push('CIRURGIA PLÁSTICA PÓS-BARIÁTRICA: O DESEJO DE REALIZÁ-LA REFLETE AUTOESTIMA PRESERVADA E DEVE SER VALORIZADO. COMO SÃO PROCEDIMENTOS ELETIVOS — ÀS VEZES MAIS DE UMA INTERVENÇÃO, COM RISCOS ACUMULADOS — A BOA REPOSIÇÃO DE FERRO, VITAMINA B12, FOLATOS, VITAMINA D E PROTEÍNAS DEVE PRECEDER A CIRURGIA E PODE PERMITIR A PROGRAMAÇÃO DE AUTO-TRANSFUSÕES.')
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

  // Risco por tempo até ENGRAVIDAR (cirurgia → concepção), não até hoje: subtrai a idade
  // gestacional atual do tempo pós-op. < 18 meses = recomendação crítica infringida.
  const mesesAoEngravidar = semanas > 0 ? Math.max(0, Math.round(mesesPos - semanas / 4.345)) : mesesPos
  if (mesesAoEngravidar < 18) {
    linhas.push('GRAVIDEZ INICIADA DENTRO DE 18 MESES DA CIRURGIA BARIÁTRICA: PERÍODO DE MAIOR RISCO NUTRICIONAL. AS PRINCIPAIS SOCIEDADES (ASMBS, IFSO) RECOMENDAM AGUARDAR PELO MENOS 12–18 MESES APÓS A CIRURGIA PARA ENGRAVIDAR. RISCOS INCLUEM RESTRIÇÃO DE CRESCIMENTO INTRAUTERINO (RCIU), PREMATURIDADE E DEFICIÊNCIAS NUTRICIONAIS GRAVES PARA MÃE E BEBÊ.')
    alertas.push({ nivel: GRAVE, texto: 'ENGRAVIDOU ANTES DE 18 MESES DA CIRURGIA — RECOMENDAÇÃO CRÍTICA INFRINGIDA. ALERTE O SEU OBSTETRA.' })
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
  suger.push('MAPA | MONITORAMENTO AMBULATORIAL DA PRESSÃO ARTERIAL')

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

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 13b — HISTÓRIA OBSTÉTRICA (gestações prévias / abortamentos)
// Sexo F. Diferente do gestacional (gravidez ATUAL), olha o HISTÓRICO: o angulo
// e o ferro — multiparidade deplecta reservas; abortamentos podem sinalizar
// trombofilia (conecta com o modulo vascular).
// ─────────────────────────────────────────────────────────────────────────────
function buildModObstetrico(dados, alertas, suger) {
  if ((dados.sexo || 'F') !== 'F') return null
  const n = parseInt(dados.gestacoes_previas)
  const aborto = dados.abortamentos_espontaneos === true
  const temGest = !isNaN(n) && n > 0
  if (!temGest && !aborto) return null

  const linhas = []
  let nivel = NORMAL

  if (temGest) {
    if (n >= 4) {
      nivel = MODERADO
      linhas.push(`GRANDE MULTÍPARA (${n} GESTAÇÕES): DEPLEÇÃO CUMULATIVA DE FERRO POR GESTAÇÕES E LACTAÇÕES SUCESSIVAS — REFORÇA A NECESSIDADE DE REPOSIÇÃO E MONITORAMENTO DA FERRITINA.`)
      alertas.push({ nivel: MODERADO, texto: `GRANDE MULTÍPARA (${n} gestações): depleção cumulativa de ferro — reforçar reposição.` })
    } else {
      nivel = LEVE
      linhas.push(`HISTÓRICO DE ${n} GESTAÇÃO(ÕES): CADA GESTAÇÃO E LACTAÇÃO CONSOME FERRO — CONSIDERAR NO BALANÇO DA SIDEROPENIA.`)
    }
  }

  if (aborto) {
    // 1 abortamento = MODERADO (destaque, sem forçar CRÍTICO); 2+ (repetição) = GRAVE.
    // Sem o número informado, assume ao menos 1 (MODERADO).
    const numAbortos = parseInt(dados.abortamentos_numero) || 1
    const repeticao = numAbortos >= 2
    nivel = repeticao ? GRAVE : MODERADO
    linhas.push(`HISTÓRICO DE ${numAbortos} ABORTAMENTO(S) ESPONTÂNEO(S): INFORMAÇÃO CRÍTICA. INVESTIGAR CAUSAS (TROMBOFILIA / SÍNDROME ANTIFOSFOLÍPIDE, DEFICIÊNCIAS NUTRICIONAIS), ESPECIALMENTE SE HOUVER HISTÓRICO DE TROMBOSE.`)
    alertas.push({ nivel: repeticao ? GRAVE : MODERADO, texto: repeticao
      ? 'ABORTAMENTOS ESPONTÂNEOS DE REPETIÇÃO (≥2) — INFORMAÇÃO CRÍTICA. INFORME O SEU OBSTETRA E MARQUE TELECONSULTA COM HEMATOLOGISTA.'
      : 'ABORTAMENTO ESPONTÂNEO — INFORME O SEU OBSTETRA E CONSIDERE TELECONSULTA COM HEMATOLOGISTA.' })
    suger.push('AVALIAÇÃO PARA TROMBOFILIA (SE ABORTAMENTOS DE REPETIÇÃO)')
    suger.push('TELECONSULTA COM HEMATOLOGISTA')
  }

  return { id: 'obstetrico', titulo: 'HISTÓRIA OBSTÉTRICA', nivel, linhas }
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 16 — STATUS INTESTINAL
// ─────────────────────────────────────────────────────────────────────────────
function buildModIntestinal(dados, alertas, suger) {
  const intestinal = dados.status_intestinal || ''

  const linhas = []
  let nivelGeral = NORMAL
  const meds = dados.medicamentos || []
  const usaFerroEV  = meds.some(m => (m.includes('FERRO INJET') || m.includes('FERRO VENOSO')))
  const usaFerroOral = meds.some(m => m.includes('FERRO ORAL') || (dados.medicamentos || []).includes('FERRO ORAL'))

  if (intestinal === 'OBSTIPAÇÃO CRÔNICA (PRISÃO DE VENTRE)') {
    nivelGeral = MODERADO
    linhas.push('OBSTIPAÇÃO CRÔNICA NO PÓS-BARIÁTRICO: CONDIÇÃO MULTIFATORIAL FREQUENTE. AS PRINCIPAIS CAUSAS INCLUEM: BAIXA INGESTÃO HÍDRICA (ABAIXO DE 2L/DIA), FERRO ORAL (CAUSA MUITO COMUM — CONSIDERAR SUBSTITUIÇÃO POR FERRO ENDOVENOSO), DISMOTILIDADE INTESTINAL PÓS-CIRÚRGICA, DISBIOSE E BAIXA INGESTÃO DE FIBRAS.')
    linhas.push('ORIENTAÇÕES GERAIS: HIDRATAÇÃO MÍNIMA DE 2L/DIA (FORA DAS REFEIÇÕES). FIBRAS SOLÚVEIS — PSYLLIUM 5–10G/DIA DILUÍDO EM ÁGUA. PROBIÓTICOS (LACTOBACILLUS E BIFIDOBACTERIUM). ATIVIDADE FÍSICA REGULAR. EVITAR LAXANTES ESTIMULANTES CRÔNICOS (SENE, BISACODIL) — CAUSAM DEPENDÊNCIA E DANIFICAM A MUCOSA INTESTINAL.')
    alertas.push({ nivel: MODERADO, texto: 'OBSTIPAÇÃO CRÔNICA — REVISAR FERRO ORAL, HIDRATAÇÃO E FIBRAS.' })

    // Ferro oral como causa
    if (usaFerroOral && !usaFerroEV) {
      linhas.push('FERRO ORAL EM USO: O FERRO ORAL É A CAUSA MAIS FREQUENTE DE OBSTIPAÇÃO E INTOLERÂNCIA GASTROINTESTINAL NO BARIÁTRICO. CONSIDERAR MIGRAÇÃO PARA FERRO ENDOVENOSO, QUE ALÉM DE NÃO CAUSAR OBSTIPAÇÃO, TEM ABSORÇÃO MUITO SUPERIOR NO PÓS-BARIÁTRICO.')
      alertas.push({ nivel: MODERADO, texto: 'FERRO ORAL: PRINCIPAL CAUSA DE OBSTIPAÇÃO NO BARIÁTRICO — CONSIDERAR FERRO EV.' })
      suger.push('AVALIAÇÃO PARA FERRO ENDOVENOSO (SUBSTITUIÇÃO DO FERRO ORAL)')
    }

    // Alerta cirúrgico
    linhas.push('ATENÇÃO IMPORTANTE: OBSTIPAÇÃO CRÔNICA NO BARIÁTRICO PODE MASCARAR SUBOCLUSÃO INTESTINAL POR BRIDA OU HÉRNIA INTERNA — COMPLICAÇÕES CIRÚRGICAS TARDIAS QUE PODEM SER GRAVES. SE HOUVER DOR ABDOMINAL ASSOCIADA À OBSTIPAÇÃO, PROCURE AVALIAÇÃO CIRÚRGICA COM URGÊNCIA.')
    alertas.push({ nivel: LEVE, texto: 'OBSTIPAÇÃO + DOR ABDOMINAL: DESCARTAR HÉRNIA INTERNA OU BRIDA — AVALIAÇÃO CIRÚRGICA.' })
    suger.push('AVALIAÇÃO COM CIRURGIÃO BARIÁTRICO (SE DOR ABDOMINAL ASSOCIADA)')
    suger.push('TESTE RESPIRATÓRIO PARA SIBO (SUPERCRESCIMENTO BACTERIANO)')

  } else if (intestinal === 'INTESTINO IRRITÁVEL (DIARREIA FREQUENTE)') {
    nivelGeral = MODERADO
    linhas.push('DIARREIA CRÔNICA NO PÓS-BARIÁTRICO: AGRAVA DRAMATICAMENTE A SÍNDROME DISABSORTIVA. TODOS OS DÉFICITS NUTRICIONAIS JÁ PRESENTES NO BARIÁTRICO SÃO POTENCIALIZADOS PELA DIARREIA CRÔNICA — FERRO, B12, VITAMINAS LIPOSSOLÚVEIS, ZINCO E PROTEÍNAS SÃO PERDIDOS EM EXCESSO.')
    linhas.push('PRINCIPAIS CAUSAS A INVESTIGAR: (1) SIBO — SUPERCRESCIMENTO BACTERIANO DO INTESTINO DELGADO: MUITO FREQUENTE APÓS BYPASS GÁSTRICO. SINTOMAS: DISTENSÃO, GASES, DIARREIA GORDUROSA. TRATAMENTO: RIFAXIMINA 550MG 2X/DIA POR 14 DIAS. (2) DUMPING TARDIO: DIARREIA 1–3 HORAS APÓS REFEIÇÕES RICAS EM AÇÚCAR. (3) INTOLERÂNCIA À LACTOSE: COMUM NO PÓS-BARIÁTRICO. TESTE DE EXCLUSÃO POR 2 SEMANAS. (4) DOENÇA CELÍACA: INVESTIGAR SE HÁ HISTÓRICO FAMILIAR OU ANEMIA REFRATÁRIA.')
    linhas.push('ORIENTAÇÕES: DIETA COM BAIXO TEOR DE GORDURA E AÇÚCARES SIMPLES. FRACIONAR AS REFEIÇÕES (6X/DIA). PROBIÓTICOS. EVITAR LACTOSE TEMPORARIAMENTE. SE SUSPEITA DE SIBO, INICIAR ANTIBIOTICOTERAPIA ESPECÍFICA COM MÉDICO.')
    alertas.push({ nivel: MODERADO, texto: 'DIARREIA CRÔNICA: AGRAVA DISABSORÇÃO — INVESTIGAR SIBO, DUMPING E INTOLERÂNCIAS.' })
    suger.push('TESTE RESPIRATÓRIO PARA SIBO (LACTULOSE OU GLICOSE)')
    suger.push('SOROLOGIA PARA DOENÇA CELÍACA (ANTI-TRANSGLUTAMINASE IgA)')
    suger.push('TESTE DE INTOLERÂNCIA À LACTOSE')
    suger.push('PESQUISA DE GORDURA FECAL (ESTEATORREIA)')
    suger.push('AVALIAÇÃO COM GASTROENTEROLOGISTA')
  }

  // ── Marcadores laboratoriais intestinais (independentes do status acima) ──
  const calpro = parseFloat(dados.calprotectina)
  if (!isNaN(calpro) && calpro > 50) {
    if (calpro > 150) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push(`CALPROTECTINA FECAL ELEVADA (${calpro} µg/g): MARCADOR DE INFLAMAÇÃO INTESTINAL. INVESTIGAR DOENÇA INFLAMATÓRIA INTESTINAL, INFECÇÃO/SIBO OU ENTEROPATIA. CORRELACIONAR COM DIARREIA E ANEMIA; ENCAMINHAR AO GASTROENTEROLOGISTA.`)
      alertas.push({ nivel: MODERADO, texto: `CALPROTECTINA ELEVADA: ${calpro} µg/g — inflamação intestinal, investigar.` })
      suger.push('AVALIAÇÃO COM GASTROENTEROLOGISTA')
    } else {
      if (nivelGeral === NORMAL) nivelGeral = LEVE
      linhas.push(`CALPROTECTINA FECAL LEVEMENTE ELEVADA (${calpro} µg/g): INFLAMAÇÃO INTESTINAL DISCRETA. REPETIR O EXAME E CORRELACIONAR COM OS SINTOMAS.`)
      alertas.push({ nivel: LEVE, texto: `CALPROTECTINA LEVEMENTE ELEVADA: ${calpro} µg/g — repetir e correlacionar.` })
    }
  }

  const indican = (dados.indican || '').toString()
  if (/POSITIVO/i.test(indican)) {
    if (nivelGeral === NORMAL) nivelGeral = LEVE
    linhas.push('INDICAN PLASMÁTICO POSITIVO: SUGERE MÁ DIGESTÃO DE PROTEÍNAS / PUTREFAÇÃO INTESTINAL, FREQUENTEMENTE ASSOCIADA A SUPERCRESCIMENTO BACTERIANO (SIBO). INVESTIGAR SIBO E OTIMIZAR A DIGESTÃO.')
    alertas.push({ nivel: LEVE, texto: 'INDICAN POSITIVO: possível SIBO / má digestão proteica — investigar.' })
    suger.push('TESTE RESPIRATÓRIO PARA SIBO')
  }

  if (linhas.length === 0) return null

  return {
    id:     'intestinal',
    titulo: 'STATUS INTESTINAL',
    nivel:  nivelGeral,
    linhas,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 17 — STATUS FIBROMIÁLGICO
// ─────────────────────────────────────────────────────────────────────────────
function buildModFibromialgia(dados, ex, alertas, suger) {
  const sintomas = dados.status_fibromialgia || []
  if (!sintomas || sintomas.length === 0) return null

  const linhas = []
  let nivelGeral = NORMAL

  const temDiagnostico  = sintomas.some(s => s.includes('FIBROMIALGIA DIAGNOSTICADA'))
  const temInsonia      = sintomas.includes('INSÔNIA')
  const temDores        = sintomas.includes('DORES NO CORPO')
  const temCabeca       = sintomas.includes('DOR DE CABEÇA / ENXAQUECAS')
  const temMemoria      = sintomas.includes('PROBLEMAS DE MEMÓRIA')
  const temConcentracao = sintomas.includes('DIFICULDADE DE CONCENTRAÇÃO')
  const temDepressao    = sintomas.includes('DEPRESSÃO OU MELANCOLIA')
  const temZumbido      = sintomas.includes('ZUMBIDOS')
  const temDesequilib   = sintomas.includes('DESEQUILÍBRIO')
  const temHumor        = sintomas.includes('VARIAÇÃO DO HUMOR')
  const temTermo        = sintomas.includes('SINTO FRIO OU CALOR EXCESSIVO')
  const usaCannabis     = sintomas.includes('EM USO DE CANNABIS MEDICINAL')

  // Só SINTOMAS contam para o nível/contagem clínica — os marcadores "EM USO DE ..."
  // são medicação em uso, não sintoma, e ficam de fora (senão "usando cannabis" viraria
  // "sintoma fibromiálgico"). O gatilho da tela (>3 checkbox) conta tudo à parte.
  const sintomasClinicos = sintomas.filter(s => !s.includes('FIBROMIALGIA DIAGNOSTICADA') && s.indexOf('EM USO DE') !== 0)
  const qtdSintomas = sintomasClinicos.length

  // B12, VitD, Zinco disponíveis para correlação
  const b12  = parseFloat(ex.vitamina_b12)
  const vitD = parseFloat(ex.vitamina_d)
  const zinco = parseFloat(ex.zinco)
  const tiamina = parseFloat(ex.tiamina)

  if (temDiagnostico) {
    nivelGeral = MODERADO
    linhas.push('DIAGNÓSTICO DE FIBROMIALGIA CONFIRMADO: NO CONTEXTO BARIÁTRICO, É FUNDAMENTAL CORRELACIONAR OS SINTOMAS FIBROMIÁLGICOS COM AS DEFICIÊNCIAS NUTRICIONAIS, QUE PODEM SER CAUSA OU AGRAVANTE IMPORTANTE. ANTES DE AJUSTAR MEDICAÇÃO ESPECÍFICA, CORRIGIR TODAS AS DEFICIÊNCIAS IDENTIFICADAS.')
    alertas.push({ nivel: MODERADO, texto: 'FIBROMIALGIA CONFIRMADA — CORRELACIONAR COM DEFICIÊNCIAS NUTRICIONAIS DO BARIÁTRICO.' })
    suger.push('AVALIAÇÃO COM REUMATOLOGISTA')
  } else if (qtdSintomas >= 2) {
    nivelGeral = LEVE
    linhas.push(`${qtdSintomas} SINTOMAS FIBROMIÁLGICOS RELATADOS: A CONSTELAÇÃO DE SINTOMAS APRESENTADA (${sintomasClinicos.join(', ')}) É COMPATÍVEL COM SÍNDROME FIBROMIÁLGICA SECUNDÁRIA ÀS DEFICIÊNCIAS NUTRICIONAIS DO PÓS-BARIÁTRICO. PRIORIZAR A CORREÇÃO DAS DEFICIÊNCIAS ANTES DE DIAGNÓSTICO DEFINITIVO.`)
    alertas.push({ nivel: LEVE, texto: `${qtdSintomas} SINTOMAS FIBROMIÁLGICOS — INVESTIGAR DEFICIÊNCIAS NUTRICIONAIS COMO CAUSA PRIMÁRIA.` })
  }

  // Canabinoides (quando em uso): menção educativa no relatório (os TIPOS de canabinoide
  // ficam só na anamnese, p/ uso de negócio — não entram aqui).
  if (usaCannabis) {
    linhas.push('OS CANABINÓIDES SÃO OS MEDICAMENTOS MAIS PODEROSOS PARA O TRATAMENTO DOS SINTOMAS DE FIBROMIALGIA, ENCEFALOMIELITE MIÁLGICA E FADIGA CRÔNICA (ME/CFS).')
  }

  // Correlações nutricionais específicas
  linhas.push('CORRELAÇÕES NUTRICIONAIS DOS SINTOMAS FIBROMIÁLGICOS NO BARIÁTRICO:')

  if (temDores || temDiagnostico) {
    linhas.push('• DORES MUSCULARES DIFUSAS: DEFICIÊNCIA DE VITAMINA D É A CAUSA MAIS FREQUENTE DE MIOPATIA E DORES MUSCULARES NO BARIÁTRICO. VITAMINA D ABAIXO DE 30 NG/ML PRODUZ DOR E FRAQUEZA MUSCULAR QUE FREQUENTEMENTE É MAL INTERPRETADA COMO FIBROMIALGIA. TAMBÉM INVESTIGAR DEFICIÊNCIA DE MAGNÉSIO (NÃO ROTINEIRAMENTE DOSADO, MAS MUITO PREVALENTE).')
    if (!isNaN(vitD) && vitD < 30) {
      linhas.push(`  → VITAMINA D ATUAL: ${vitD} ng/mL — ABAIXO DA META. A CORREÇÃO PODE MELHORAR SIGNIFICATIVAMENTE AS DORES.`)
    }
    suger.push('MAGNÉSIO SÉRICO (CORRELAÇÃO COM DORES E CÃIBRAS)')
  }

  if (temInsonia) {
    linhas.push('• INSÔNIA: INVESTIGAR APNEIA OBSTRUTIVA DO SONO — MUITO COMUM NO BARIÁTRICO, ESPECIALMENTE COM REGANHO DE PESO. A APNEIA NÃO TRATADA MANTÉM A INSÔNIA E AGRAVA A FADIGA. TAMBÉM CORRELACIONAR COM DEFICIÊNCIA DE MAGNÉSIO E EXCESSO DE CAFEÍNA PÓS-CIRURGIA (ABSORÇÃO ACELERADA).')
    suger.push('POLISSONOGRAFIA (APNEIA DO SONO)')
  }

  if (temMemoria || temConcentracao) {
    linhas.push('• PROBLEMAS COGNITIVOS (MEMÓRIA E CONCENTRAÇÃO): O "BRAIN FOG" NO BARIÁTRICO TEM CAUSAS NUTRICIONAIS FREQUENTES: DEFICIÊNCIA DE B12 (COMPROMETE A MIELINA DOS NERVOS), ZINCO BAIXO (NEUROTRANSMISSÃO), TIAMINA (ENCEFALOPATIA DE WERNICKE EM CASOS GRAVES) E GLICEMIA INSTÁVEL (HIPOGLICEMIA REATIVA).')
    if (!isNaN(b12) && b12 < 300) {
      linhas.push(`  → B12 ATUAL: ${b12} pg/mL — ABAIXO DO MÍNIMO PARA BARIÁTRICO. CORRIJA ANTES DE ATRIBUIR A CAUSA PSIQUIÁTRICA.`)
    }
    if (!isNaN(zinco) && zinco < 70) {
      linhas.push(`  → ZINCO ATUAL: ${zinco} mcg/dL — BAIXO. SUPLEMENTAR.`)
    }
  }

  if (temDepressao || temHumor) {
    linhas.push('• DEPRESSÃO E VARIAÇÃO DE HUMOR: ANTES DE INICIAR OU AJUSTAR ANTIDEPRESSIVO, EXCLUIR: DEFICIÊNCIA DE B12 (CAUSA DIRETA DE DEPRESSÃO E LABILIDADE EMOCIONAL), VITAMINA D BAIXA (ASSOCIADA A DEPRESSÃO SAZONAL), HIPOTIREOIDISMO (TSH ELEVADO) E HIPOGLICEMIA REATIVA. ANTIDEPRESSIVOS TRICÍCLICOS E MIRTAZAPINA PODEM ESTIMULAR APETITE E DIFICULTAR CONTROLE DO PESO NO BARIÁTRICO.')
    suger.push('TSH (HIPOTIREOIDISMO COMO CAUSA DE DEPRESSÃO)')
    suger.push('GLICEMIA PÓS-PRANDIAL (HIPOGLICEMIA REATIVA)')
  }

  if (temZumbido || temDesequilib) {
    linhas.push('• ZUMBIDOS E DESEQUILÍBRIO: FORTEMENTE ASSOCIADOS A DEFICIÊNCIAS DE TIAMINA (B1) E VITAMINA B12. A TIAMINA BAIXA PODE CAUSAR DISFUNÇÃO VESTIBULAR E NEUROPATIA. INVESTIGAR E CORRIGIR COM URGÊNCIA.')
    if (!isNaN(tiamina) && tiamina < 70) {
      linhas.push(`  → TIAMINA ATUAL: ${tiamina} nmol/L — BAIXA. SUPLEMENTAR COM URGÊNCIA.`)
    }
    suger.push('TIAMINA SÉRICA (SE NÃO DOSADA)')
    suger.push('AVALIAÇÃO OTORRINOLARINGOLÓGICA (ZUMBIDO/VESTIBULOPATIA)')
  }

  if (temCabeca) {
    linhas.push('• DOR DE CABEÇA E ENXAQUECAS: NO BARIÁTRICO, FREQUENTEMENTE ASSOCIADAS A DESIDRATAÇÃO, HIPOGLICEMIA REATIVA, CAFEÍNA CONCENTRADA E DEFICIÊNCIA DE MAGNÉSIO. HIDRATAÇÃO ADEQUADA E CONTROLE GLICÊMICO SÃO PRIMORDIAIS.')
  }

  if (temTermo) {
    linhas.push('• INTOLERÂNCIA AO FRIO OU CALOR: INVESTIGAR HIPOTIREOIDISMO (INTOLERÂNCIA AO FRIO) E DISFUNÇÃO AUTONÔMICA. NO BARIÁTRICO, A PERDA DE MASSA CORPORAL REDUZ O ISOLAMENTO TÉRMICO, MAS INTOLERÂNCIA PERSISTENTE DEVE SER INVESTIGADA.')
    suger.push('TSH E T4 LIVRE (DISFUNÇÃO TIREOIDIANA)')
  }

  // Recomendação geral
  linhas.push('ABORDAGEM RECOMENDADA: (1) CORRIGIR TODAS AS DEFICIÊNCIAS NUTRICIONAIS IDENTIFICADAS — MUITOS SINTOMAS FIBROMIÁLGICOS MELHORAM OU DESAPARECEM COM A REPOSIÇÃO ADEQUADA. (2) TRATAR A APNEIA DO SONO SE PRESENTE. (3) REGULAR O PADRÃO GLICÊMICO. (4) APENAS SE OS SINTOMAS PERSISTIREM APÓS CORREÇÃO NUTRICIONAL, ENCAMINHAR PARA REUMATOLOGISTA. A PLATAFORMA PODE OFERECER UMA SOLUÇÃO COMPLEMENTAR — CONSULTE O BOTÃO ABAIXO.')

  if (temDiagnostico || qtdSintomas >= 2) {
    suger.push('MAGNÉSIO SÉRICO')
    suger.push('AVALIAÇÃO COM REUMATOLOGISTA (SE SINTOMAS PERSISTIREM APÓS CORREÇÃO NUTRICIONAL)')
  }

  return {
    id:     'fibromialgia',
    titulo: 'STATUS FIBROMIÁLGICO',
    nivel:  nivelGeral,
    linhas,
  }
}

// ════════════════════════════════════════════════════════════════════════════
// buildModAcompanhamento
//
// Avalia se paciente tem especialistas minimos pos-bariatrica e se a
// frequencia do acompanhamento e adequada ao contexto clinico.
//
// Hierarquia de criticidade (Dr. Ramos):
//   G1 (criticos):        Hematologista, Gastroenterologista, Endocrinologista, Clinico
//   G2 (complementares):  Nutrologo, Nutricionista, Cirurgiao, Psicologo, Psiquiatra
//
// Frequencia recomendada = pior dos 3 eixos:
//   - Tempo pos-cirurgia
//   - Grau de disabsorcao (tipo de cirurgia)
//   - Labs alterados
// ════════════════════════════════════════════════════════════════════════════
function buildModAcompanhamento(dadosOBA, alertas) {
  const linhas = []
  let nivelGeral = NORMAL

  const especialistas  = Array.isArray(dadosOBA.especialistas) ? dadosOBA.especialistas : []
  const semEspecialista = Boolean(dadosOBA.semEspecialista)
  const acompFreq      = dadosOBA.acompanhamento || ''  // ex: 'ANUAL', 'BIANUAL', 'TRIANUAL', 'NUNCA'
  const mesesPos       = parseInt(dadosOBA.meses_pos_cirurgia) || 0
  const tipoCir        = (dadosOBA.tipo_cirurgia || '').toUpperCase()

  // ─── Grupo 1 (criticos) ─────────────────────────────────────────────
  const G1 = ['HEMATOLOGISTA', 'GASTROENTEROLOGISTA', 'ENDOCRINOLOGISTA', 'CLÍNICO', 'CLINICO']
  const G2 = ['NUTRÓLOGO', 'NUTROLOGO', 'NUTRICIONISTA', 'CIRURGIÃO', 'CIRURGIAO', 'PSICÓLOGO', 'PSICOLOGO', 'PSIQUIATRA']
  const G3 = ['PNEUMOLOGISTA', 'NEFROLOGISTA', 'UROLOGISTA', 'DERMATOLOGISTA']

  const temG1 = especialistas.filter(e => G1.includes((e || '').toUpperCase()))
  const temG2 = especialistas.filter(e => G2.includes((e || '').toUpperCase()))
  const temG3 = especialistas.filter(e => G3.includes((e || '').toUpperCase()))

  // ─── Avaliacao de adequacao dos especialistas ───────────────────────
  if (semEspecialista || (especialistas.length === 0 && !semEspecialista)) {
    // Nao tem ninguem
    linhas.push('NENHUM ESPECIALISTA DE ACOMPANHAMENTO DECLARADO.')
    linhas.push('O ACOMPANHAMENTO MULTIDISCIPLINAR VITALÍCIO É PADRÃO-OURO PÓS-BARIÁTRICA. A AUSÊNCIA DE SEGUIMENTO AUMENTA SIGNIFICATIVAMENTE O RISCO DE DEFICIÊNCIAS NUTRICIONAIS GRAVES, REGANHO PONDERAL E COMPLICAÇÕES DE LONGO PRAZO.')
    linhas.push('RECOMENDAÇÃO PRIORITÁRIA: estabelecer acompanhamento imediatamente — como mínimo HEMATOLOGISTA, GASTROENTEROLOGISTA, ENDOCRINOLOGISTA ou CLÍNICO GERAL.')
    nivelGeral = GRAVE
    alertas.push({ nivel: GRAVE, texto: 'SEM ACOMPANHAMENTO ESPECIALIZADO — retomar imediatamente.' })
  } else if (temG1.length === 0) {
    // Tem G2 mas sem G1 critico
    linhas.push(`ESPECIALISTAS DECLARADOS: ${especialistas.join(', ')}.`)
    linhas.push('NENHUM ESPECIALISTA DO GRUPO CRÍTICO (HEMATOLOGISTA, GASTROENTEROLOGISTA, ENDOCRINOLOGISTA OU CLÍNICO) NO SEU ACOMPANHAMENTO.')
    linhas.push('OS PROFISSIONAIS COMPLEMENTARES (NUTRICIONISTA, PSICÓLOGO, CIRURGIÃO) SÃO IMPORTANTES, MAS A VIGILÂNCIA CLÍNICA DE DEFICIÊNCIAS NUTRICIONAIS E COMPLICAÇÕES ORGÂNICAS EXIGE AVALIAÇÃO MÉDICA REGULAR.')
    linhas.push('RECOMENDAÇÃO: incluir ao menos um profissional do grupo crítico no acompanhamento.')
    nivelGeral = MODERADO
    alertas.push({ nivel: MODERADO, texto: 'SEM ESPECIALISTA CRÍTICO (hemato/gastro/endo/clínico) no acompanhamento.' })
  } else if (temG1.length === 1) {
    linhas.push(`ESPECIALISTA CRÍTICO: ${temG1.join(', ')}.`)
    if (temG2.length > 0) {
      linhas.push(`COMPLEMENTARES: ${temG2.join(', ')}.`)
      if (temG3.length > 0) linhas.push(`ESPECIALIZADOS DE APOIO: ${temG3.join(', ')}.`)
    }
    linhas.push('ACOMPANHAMENTO BÁSICO ESTABELECIDO. IDEAL EXPANDIR PARA COBRIR OS DEMAIS EIXOS (ENDÓCRINO/METABÓLICO, HEMATOLÓGICO E GASTROINTESTINAL).')
    if (nivelGeral === NORMAL) nivelGeral = LEVE
  } else {
    // >= 2 G1
    linhas.push(`ESPECIALISTAS CRÍTICOS: ${temG1.join(', ')}.`)
    if (temG2.length > 0) {
      linhas.push(`COMPLEMENTARES: ${temG2.join(', ')}.`)
      if (temG3.length > 0) linhas.push(`ESPECIALIZADOS DE APOIO: ${temG3.join(', ')}.`)
    }
    linhas.push('COBERTURA MULTIDISCIPLINAR ADEQUADA.')
  }

  // ─── Frequencia recomendada (pior dos 3 eixos) ──────────────────────
  // Eixo 1: tempo pos-cirurgia
  let freqPorTempo = 'ANUAL'
  if (mesesPos <= 6) freqPorTempo = 'TRIMESTRAL'
  else if (mesesPos <= 24) freqPorTempo = 'SEMESTRAL'

  // Eixo 2: grau de disabsorcao (bypass = trimestral por mais tempo)
  let freqPorCirurgia = 'ANUAL'
  if (tipoCir.includes('ROUX') || tipoCir.includes('FOBI') || tipoCir.includes('CAPELLA') || tipoCir.includes('BYPASS')) {
    if (mesesPos <= 24) freqPorCirurgia = 'TRIMESTRAL'
    else freqPorCirurgia = 'SEMESTRAL'
  } else if (tipoCir.includes('SLEEVE') || tipoCir.includes('VERTICAL') || tipoCir.includes('GÁSTRICA')) {
    if (mesesPos <= 12) freqPorCirurgia = 'SEMESTRAL'
  }

  // Pior dos 2 eixos (trimestral > semestral > anual)
  const ordem = { 'TRIMESTRAL': 3, 'SEMESTRAL': 2, 'ANUAL': 1 }
  const freqRec = ordem[freqPorTempo] >= ordem[freqPorCirurgia] ? freqPorTempo : freqPorCirurgia

  linhas.push(`FREQUÊNCIA DE ACOMPANHAMENTO RECOMENDADA PARA O SEU PERFIL ATUAL: ${freqRec}.`)

  if (acompFreq) {
    linhas.push(`FREQUÊNCIA ATUAL DECLARADA: ${acompFreq}.`)
    const ordemAtual = ordem[acompFreq.toUpperCase()] || 0
    const ordemIdeal = ordem[freqRec] || 0
    if (ordemAtual < ordemIdeal) {
      linhas.push('A FREQUÊNCIA ATUAL ESTÁ ABAIXO DO RECOMENDADO PARA O SEU PERFIL. AJUSTAR.')
      if (nivelGeral === NORMAL) nivelGeral = LEVE
      else if (nivelGeral === LEVE) nivelGeral = MODERADO
      alertas.push({ nivel: nivelGeral, texto: `FREQUÊNCIA DE ACOMPANHAMENTO (${acompFreq}) INSUFICIENTE — ideal: ${freqRec}.` })
    }
  }

  return {
    id:     'acompanhamento',
    titulo: 'ACOMPANHAMENTO MULTIDISCIPLINAR',
    nivel: nivelGeral,
    linhas,
  }
}

// ════════════════════════════════════════════════════════════════════════════
// buildModLeucos
//
// Avalia leucograma (leucocitos e neutrofilos).
// Cutoffs baseados em EXAMES_BASE:
//   Leucocitos normais: 4.000 - 11.000 /uL
//   Neutrofilos absolutos: 1.500 - 7.700 /uL (corte de alerta 1.500, validado pelo Dr. Ramos)
// ════════════════════════════════════════════════════════════════════════════
function buildModLipidico(ex, dados, sexo, alertas, suger) {
  // Coleta valores
  const colT = parseFloat(ex.colesterol_total)
  const ldl = parseFloat(ex.ldl_c)
  const hdl = parseFloat(ex.hdl_c)
  const tg = parseFloat(ex.triglicerides)
  const lpa = parseFloat(ex.lpa)
  const apob = parseFloat(ex.apob)
  const apoa = parseFloat(ex.apoa)
  const sdldl = parseFloat(ex.sdldl)

  const todos = [colT, ldl, hdl, tg, lpa, apob, apoa, sdldl]
  const todosVazios = todos.every(v => isNaN(v) || v === null || v === undefined)

  if (todosVazios) return null   // sem nenhum lipídeo preenchido → não exibe o módulo

  // Score por marcador
  let score = 0
  const achados = []

  // Lp(a)
  if (!isNaN(lpa)) {
    if (lpa > 50) { score += 5; achados.push(`Lp(a) ${lpa.toFixed(1)} mg/dL — RISCO GENÉTICO ELEVADO (>50)`) }
    else if (lpa >= 30) { score += 2; achados.push(`Lp(a) ${lpa.toFixed(1)} mg/dL — limite (30-50)`) }
  }

  // LDL-c
  if (!isNaN(ldl)) {
    if (ldl >= 160) { score += 3; achados.push(`LDL-c ${ldl.toFixed(0)} mg/dL — MUITO ALTO`) }
    else if (ldl >= 130) { score += 2; achados.push(`LDL-c ${ldl.toFixed(0)} mg/dL — alto`) }
    else if (ldl >= 100) { score += 1; achados.push(`LDL-c ${ldl.toFixed(0)} mg/dL — limítrofe`) }
  }

  // ApoB
  if (!isNaN(apob)) {
    if (apob > 130) { score += 3; achados.push(`ApoB ${apob.toFixed(0)} mg/dL — alto (>130)`) }
    else if (apob >= 90) { score += 2; achados.push(`ApoB ${apob.toFixed(0)} mg/dL — limite (90-130)`) }
  }

  // Triglicérides
  if (!isNaN(tg)) {
    if (tg >= 500) { score += 3; achados.push(`Triglicérides ${tg.toFixed(0)} mg/dL — MUITO ALTO (risco de pancreatite)`) }
    else if (tg >= 200) { score += 2; achados.push(`Triglicérides ${tg.toFixed(0)} mg/dL — alto`) }
    else if (tg >= 150) { score += 1; achados.push(`Triglicérides ${tg.toFixed(0)} mg/dL — limítrofe`) }
  }

  // HDL-c
  if (!isNaN(hdl)) {
    const limiteHdl = sexo === 'M' ? 40 : 50
    if (hdl < limiteHdl) { score += 2; achados.push(`HDL-c ${hdl.toFixed(0)} mg/dL — baixo (<${limiteHdl})`) }
  }

  // Colesterol Total
  if (!isNaN(colT)) {
    if (colT >= 240) { score += 2; achados.push(`Colesterol Total ${colT.toFixed(0)} mg/dL — alto`) }
    else if (colT >= 200) { score += 1; achados.push(`Colesterol Total ${colT.toFixed(0)} mg/dL — limítrofe`) }
  }

  // ApoA
  if (!isNaN(apoa)) {
    const limiteApoa = sexo === 'M' ? 120 : 140
    if (apoa < limiteApoa) { score += 1; achados.push(`ApoA ${apoa.toFixed(0)} mg/dL — baixo (<${limiteApoa})`) }
  }

  // sdLDL
  if (!isNaN(sdldl)) {
    if (sdldl >= 30) { score += 2; achados.push(`sdLDL ${sdldl.toFixed(1)} mg/dL — elevado (LDL pequena densa)`) }
  }

  // Classificação consolidada
  // Lp(a) > 50 → automaticamente CRÍTICO
  let categoria, nivel, conduta
  const lpaCritica = !isNaN(lpa) && lpa > 50

  if (score === 0) {
    categoria = 'NORMAL'
    nivel = NORMAL
    conduta = 'Manter estilo de vida saudável e controle anual.'
  } else if (lpaCritica || score >= 8) {
    categoria = 'RISCO CRÍTICO'
    nivel = GRAVE
    conduta = 'Avaliação cardiológica URGENTE. Considerar terapia hipolipemiante intensiva (estatinas, ezetimiba, iPCSK9 se Lp(a) elevada).'
    alertas.push({ nivel: GRAVE, texto: `Risco cardiovascular CRÍTICO (score ${score}${lpaCritica ? ', Lp(a) >50' : ''})` })
  } else if (score >= 4) {
    categoria = 'RISCO ELEVADO'
    nivel = MODERADO
    conduta = 'Considerar terapia farmacológica (estatina). Encaminhar à avaliação cardiológica.'
    alertas.push({ nivel: MODERADO, texto: `Risco cardiovascular elevado (score ${score})` })
  } else {
    categoria = 'ALTERAÇÃO LEVE'
    nivel = LEVE
    conduta = 'Reforçar dieta, atividade física e perda de peso. Reavaliar em 3-6 meses.'
  }

  // Sugestão de exames complementares
  const examesNaoFeitos = []
  if (isNaN(colT)) examesNaoFeitos.push('Colesterol Total')
  if (isNaN(ldl)) examesNaoFeitos.push('LDL-c')
  if (isNaN(hdl)) examesNaoFeitos.push('HDL-c')
  if (isNaN(tg)) examesNaoFeitos.push('Triglicérides')
  if (isNaN(lpa)) examesNaoFeitos.push('Lp(a)')
  if (isNaN(apob)) examesNaoFeitos.push('ApoB')
  if (isNaN(apoa)) examesNaoFeitos.push('ApoA')
  if (isNaN(sdldl)) examesNaoFeitos.push('sdLDL')

  if (examesNaoFeitos.length > 0) {
    suger.push(`Lipidograma incompleto — solicitar: ${examesNaoFeitos.join(', ')}`)
  }

  const linhas = [
    `Categoria consolidada: ${categoria} (score ${score})`,
    ...achados,
    `Conduta sugerida: ${conduta}`,
  ]
  if (examesNaoFeitos.length > 0) {
    linhas.push(`Marcadores não preenchidos: ${examesNaoFeitos.join(', ')}`)
  }

  return {
    id:     'lipidico',
    titulo: '🩸 LIPIDOGRAMA / RISCO CARDIOVASCULAR',
    nivel,
    linhas
  }
}

function buildModLeucos(examesOBA, alertas, examesSuger) {
  const leuco   = parseFloat(examesOBA.leucocitos)
  const neutPct = parseFloat(examesOBA.neutrofilos)
  const neutAbs = parseFloat(examesOBA.neutrofilos_ul)
  const plaq    = parseFloat(examesOBA.plaquetas)

  // Se nenhum informado, nao gerar modulo
  if (isNaN(leuco) && isNaN(neutPct) && isNaN(neutAbs) && isNaN(plaq)) return null

  const linhas = []
  let nivelGeral = NORMAL

  // ─── Leucocitos totais ──────────────────────────────────────────────
  if (!isNaN(leuco)) {
    linhas.push(`LEUCÓCITOS TOTAIS: ${leuco.toLocaleString('pt-BR')}/uL (referência 4.000–11.000).`)

    if (leuco < 3000) {
      nivelGeral = GRAVE
      linhas.push('LEUCOPENIA GRAVE: contagem abaixo de 3.000/uL representa risco aumentado de infecções oportunistas. Avaliação hematológica imediata é mandatória. Investigar causas como síndrome mielodisplásica, aplasia medular, medicamentos mielotóxicos, infecções virais (HIV, parvovírus).')
      alertas.push({ nivel: GRAVE, texto: `LEUCOPENIA GRAVE: ${leuco}/uL. Avaliação hematológica imediata.` })
      examesSuger.push('MIELOGRAMA', 'SOROLOGIAS PARA HIV, HEPATITES B/C, PARVOVÍRUS B19', 'ELETROFORESE DE PROTEÍNAS')
    } else if (leuco < 4000) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push('LEUCOPENIA MODERADA: investigar causa. Pode estar associada a pós-bariátrica com deficiências nutricionais profundas (B12, folato, cobre), infecções crônicas ou autoimunidade.')
      alertas.push({ nivel: MODERADO, texto: `LEUCOPENIA: ${leuco}/uL.` })
    } else if (leuco > 15000) {
      nivelGeral = GRAVE
      linhas.push('LEUCOCITOSE GRAVE: acima de 15.000/uL sugere processo infeccioso/inflamatório significativo ou, mais raramente, distúrbio mieloproliferativo. Requer avaliação clínica imediata.')
      alertas.push({ nivel: GRAVE, texto: `LEUCOCITOSE: ${leuco}/uL. Investigar foco infeccioso ou hematológico.` })
      examesSuger.push('PCR', 'VHS', 'ESFREGAÇO DE SANGUE PERIFÉRICO')
    } else if (leuco > 11000) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push('LEUCOCITOSE LEVE A MODERADA: frequentemente reativa (infecção, inflamação, estresse). Correlacionar clinicamente.')
      alertas.push({ nivel: MODERADO, texto: `LEUCOCITOSE: ${leuco}/uL.` })
    } else {
      linhas.push('Leucócitos totais dentro da faixa de normalidade.')
    }
  }

  // ─── Neutrofilos absolutos ──────────────────────────────────────────
  if (!isNaN(neutAbs)) {
    linhas.push(`NEUTRÓFILOS ABSOLUTOS: ${neutAbs.toLocaleString('pt-BR')}/uL (referência 1.500–7.700).`)

    if (neutAbs < 500) {
      nivelGeral = GRAVE
      linhas.push('NEUTROPENIA GRAVE (<500/uL): risco alto de infecção grave. Requer conduta imediata — avaliação em pronto atendimento se houver febre.')
      alertas.push({ nivel: GRAVE, texto: `NEUTROPENIA GRAVE: ${neutAbs}/uL.` })
    } else if (neutAbs < 1500) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push('NEUTROPENIA RELEVANTE: valores entre 500 e 1.500/uL exigem investigação causal — deficiências nutricionais (B12/folato/cobre), medicamentos, infecções virais, autoimunidade.')
      alertas.push({ nivel: MODERADO, texto: `NEUTROPENIA: ${neutAbs}/uL.` })
    }
  } else if (!isNaN(leuco) && !isNaN(neutPct)) {
    // Calcula neutrofilos absolutos a partir de leuco + %
    const neutCalc = Math.round(leuco * neutPct / 100)
    linhas.push(`NEUTRÓFILOS ABSOLUTOS (calculado): ${neutCalc.toLocaleString('pt-BR')}/uL (referência 1.500–7.700).`)
    if (neutCalc < 1500 && nivelGeral !== GRAVE) {
      nivelGeral = MODERADO
      linhas.push('NEUTROPENIA CALCULADA (<1.500/uL): relevante. Investigar como acima.')
    }
  }

  // ─── Linfócitos estimados — possível linfocitose absoluta ───────────
  // Linfócitos ≈ leucócitos − neutrófilos absolutos − ~10% (monócitos/eosinófilos/
  // basófilos). > 6.000/uL → possível linfocitose absoluta a esclarecer (corte a validar).
  const neutParaLinf = !isNaN(neutAbs) ? neutAbs : ((!isNaN(leuco) && !isNaN(neutPct)) ? Math.round(leuco * neutPct / 100) : NaN)
  if (!isNaN(leuco) && !isNaN(neutParaLinf)) {
    const linfEst = Math.round(leuco - neutParaLinf - leuco * 0.10)
    if (linfEst > 6000) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push(`LINFÓCITOS ESTIMADOS ~${linfEst.toLocaleString('pt-BR')}/uL (leucócitos − neutrófilos − 10%): POSSÍVEL LINFOCITOSE ABSOLUTA A ESCLARECER. Solicitar hemograma com contagem diferencial; investigar causas (infecções virais; em adultos, descartar síndrome linfoproliferativa).`)
      alertas.push({ nivel: MODERADO, texto: `POSSÍVEL LINFOCITOSE ABSOLUTA (linfócitos estimados ~${linfEst.toLocaleString('pt-BR')}/uL) — esclarecer.` })
      examesSuger.push('HEMOGRAMA COM CONTAGEM DIFERENCIAL (linfócitos)')
    }
  }

  // ─── Plaquetas (cortes a validar pelo médico) ───────────────────────
  if (!isNaN(plaq)) {
    linhas.push(`PLAQUETAS: ${plaq.toLocaleString('pt-BR')} mil/uL (referência 150–400).`)
    if (plaq < 100) {
      nivelGeral = GRAVE
      linhas.push('PLAQUETOPENIA IMPORTANTE (<100 mil/uL): risco de sangramento. Avaliação hematológica. Investigar deficiência nutricional grave (B12/folato), hepatopatia, hiperesplenismo, medicamentos ou PTI.')
      alertas.push({ nivel: GRAVE, texto: `PLAQUETOPENIA: ${plaq} mil/uL — avaliação hematológica.` })
    } else if (plaq < 150) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push('PLAQUETOPENIA LEVE (100–149 mil/uL): investigar causa (nutricional, hepática, medicamentosa).')
      alertas.push({ nivel: MODERADO, texto: `PLAQUETOPENIA LEVE: ${plaq} mil/uL.` })
    } else if (plaq > 450) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push('TROMBOCITOSE (>450 mil/uL): frequentemente reativa (inflamação, ferropenia, infecção). Se persistente, avaliação hematológica.')
      alertas.push({ nivel: MODERADO, texto: `TROMBOCITOSE: ${plaq} mil/uL.` })
    } else if (plaq > 400) {
      linhas.push('PLAQUETAS no limite superior (401–450 mil/uL). Correlacionar clinicamente.')
    } else {
      linhas.push('Plaquetas dentro da faixa de normalidade.')
    }
  }

  return {
    id:     'leucos',
    titulo: 'HEMOGRAMA — LEUCÓCITOS, NEUTRÓFILOS E PLAQUETAS',
    nivel: nivelGeral,
    linhas,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ESTADO GERAL CLÍNICO — classificação do BASELINE (e dos follow-ups)
// ─────────────────────────────────────────────────────────────────────────────
// Régua determinística (rascunho clínico — ajustável). Princípio: o PIOR
// componente domina (segurança primeiro). Agrega a saída de avaliarOBA:
//   - alertas[] com nível grave/moderado/leve
//   - cor do eritron (green/yellow/orange/red) vinda do decisionEngine
//   - presença de exames laboratoriais (sem exames ⇒ classificação PROVISÓRIA)
//
// Escala (do melhor ao pior): OTIMO → BOM → RAZOAVEL → RUIM → CRITICO
// ─────────────────────────────────────────────────────────────────────────────
export const ESTADOS_CLINICOS = ['CRITICO', 'RUIM', 'RAZOAVEL', 'BOM', 'OTIMO']

export function classificarEstadoClinico(relatorio, contexto = {}) {
  if (!relatorio) return null

  const alertas    = relatorio.alertas || []
  const graves     = alertas.filter(a => a.nivel === GRAVE).length
  const moderados  = alertas.filter(a => a.nivel === MODERADO).length
  const leves      = alertas.filter(a => a.nivel === LEVE).length
  const eritron    = String(contexto.eritronColor || '').toLowerCase()
  const temExames  = !!contexto.temExames

  let estado
  let motivo
  if (graves >= 1 || eritron === 'red') {
    estado = 'CRITICO'
    motivo = graves >= 1
      ? 'Há alerta(s) de gravidade ALTA que exigem conduta imediata.'
      : 'O eritron está gravemente comprometido (anemia importante).'
  } else if (eritron === 'orange' || moderados >= 2) {
    estado = 'RUIM'
    motivo = eritron === 'orange'
      ? 'O eritron está comprometido de forma moderada a importante.'
      : 'Há múltiplos alertas de gravidade moderada a corrigir.'
  } else if (eritron === 'yellow' || moderados === 1 || leves >= 3 || !temExames) {
    estado = 'RAZOAVEL'
    motivo = !temExames
      ? 'Ainda sem exames — classificação provisória; confirme com exames laboratoriais.'
      : 'Há alterações que pedem ajuste de suplementação e acompanhamento.'
  } else if (leves >= 1) {
    estado = 'BOM'
    motivo = 'Quadro estável, com pequenos pontos de atenção.'
  } else {
    estado = 'OTIMO'
    motivo = 'Eritron compensado, sem alertas e com acompanhamento — manter conduta.'
  }

  return {
    estado,                       // 'CRITICO' | 'RUIM' | 'RAZOAVEL' | 'BOM' | 'OTIMO'
    provisorio: !temExames,       // classificado só por anamnese + eritron mínimo
    motivo,
    resumo: { graves, moderados, leves },
  }
}

