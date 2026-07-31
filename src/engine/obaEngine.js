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

  // TODO paciente OBA: HEMOGRAMA e FÓSFORO SÉRICO sempre. O fósforo é obrigatório porque a
  // reposição de FERRO ENDOVENOSO (comum no bariátrico) pode causar HIPOFOSFATEMIA — é preciso
  // conhecer o fósforo basal antes/durante a reposição. Fica no painel fundamental.
  if (!examesSuger.some(e => /HEMOGRAMA/i.test(e))) examesSuger.push('HEMOGRAMA')
  if (!examesSuger.some(e => /F[ÓO]SFORO/i.test(e))) examesSuger.push('FÓSFORO SÉRICO')

  // GESTANTE + SANGRAMENTO MENSTRUAL: contradicao clinica -> sangramento na gravidez e'
  // emergencia. Alerta GRAVE no relatorio (o aviso inline na anamnese ja avisa na hora).
  if (dadosOBA.status_gestacional === 'GRÁVIDA' && (dadosOBA.status_ginecologico || []).includes('SANGRAMENTO MENSTRUAL')) {
    alertas.push({ codigo: 'avaliarOBA.gestantes_nao_menstruam_se_voce_esta_gravida', nivel: GRAVE, texto: 'GESTANTES NÃO MENSTRUAM. SE VOCÊ ESTÁ GRÁVIDA E APRESENTA SANGRAMENTO, PROCURE UMA UNIDADE DE EMERGÊNCIA IMEDIATAMENTE.' })
  }

  // ── 0. IDEAÇÃO SUICIDA (queixa) — situação crítica, tem prioridade sobre tudo ──
  const modIdeacao = buildModIdeacao(dadosOBA, alertas, examesSuger)
  if (modIdeacao) modulos.push(modIdeacao)

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
  // resultadoEritron entra aqui por causa da REPOSIÇÃO DE TESTOSTERONA: ela eleva a
  // hemoglobina (eritrocitose) e pode MASCARAR a anemia do bariátrico.
  const modHormonal = buildModHormonal(examesOBA, dadosOBA, sexo, idade, alertas, examesSuger, resultadoEritron)
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

  // ── 12c. MÓDULO INFECÇÕES CRÔNICAS (módulo; HTLV ativo e EBV crônico geram alerta) ──
  const modInfeccoes = buildModInfeccoes(dadosOBA, alertas)
  if (modInfeccoes) modulos.push(modInfeccoes)

  // ── 13. MÓDULO GESTACIONAL ───────────────────────────────────────────────
  const modGest = buildModGestacional(dadosOBA, mesesPos, alertas, examesSuger)
  if (modGest) modulos.push(modGest)

  // ── 13b. MÓDULO HISTÓRIA OBSTÉTRICA (gestações prévias / abortamentos) ────
  const modObst = buildModObstetrico(dadosOBA, alertas, examesSuger)
  if (modObst) modulos.push(modObst)

  // ── 13c. MÓDULO GINECOLÓGICO (por ora só o SANGRAMENTO MENSTRUAL) ─────────
  const modGineco = buildModGinecologico(dadosOBA, resultadoEritron, examesOBA, alertas, examesSuger)
  if (modGineco) modulos.push(modGineco)

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

  // ── 15b. MÓDULO CARDIOVASCULAR (história DECLARADA — vizinho do lipidograma,
  //         que calcula o risco pelos EXAMES; aqui é o que a paciente relata) ──
  const modCardio = buildModCardiovascular(dadosOBA, resultadoEritron, examesOBA, alertas, examesSuger)
  if (modCardio) modulos.push(modCardio)

  // ── 15c. MÓDULO RESPIRATÓRIO / TABAGISMO ────────────────────────────────
  const modResp = buildModRespiratorio(dadosOBA, examesOBA, alertas, examesSuger)
  if (modResp) modulos.push(modResp)

  // ── 15d. MÓDULO SAÚDE PROSTÁTICA (declarada; o PSA é lido no oncológico) ──
  const modProst = buildModProstatico(dadosOBA, alertas, examesSuger)
  if (modProst) modulos.push(modProst)

  // ── 15e. MÓDULO STATUS ALÉRGICO (eixo forte: alimentar × nutrição) ───────
  const modAlerg = buildModAlergico(dadosOBA, alertas, examesSuger)
  if (modAlerg) modulos.push(modAlerg)

  // ── 15f. MÓDULO STATUS ARTICULAR + FAN (artrite→autoimune/eritron; título) ──
  const modArtic = buildModArticular(dadosOBA, resultadoEritron, alertas, examesSuger)
  if (modArtic) modulos.push(modArtic)

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
      alertas.push({ codigo: 'avaliarOBA.inversao_albumina_globulina_globulina', nivel: GRAVE, texto: `INVERSÃO ALBUMINA/GLOBULINA (globulina ${globAG} ≥ albumina ${albAG} g/dL) — É IMPORTANTE A AVALIAÇÃO COM HEMATOLOGISTA.` })
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

  // ── FERRO EM USO + RDW ALARGADO: quadro possivelmente DIMÓRFICO ──────────
  // Levantado pelo Dr. Ramos (jul/2026). Num sistema ferropênico que RECEBEU ferro,
  // convivem duas populações de hemácias — as velhas, microcíticas, e as novas,
  // normais. O RDW alarga por causa DISSO: é a assinatura da RESPOSTA, não
  // necessariamente da carência ativa. Ler esse RDW como ferropenia pura leva a
  // repor ferro em quem já está respondendo.
  // O sistema sabe SE usa ferro (medicamentos), mas não HÁ QUANTO TEMPO nem QUE
  // DOSE — sem isso não dá para estimar a reação hematopoética, então o motor não
  // conclui: sinaliza e manda medir a resposta (reticulócitos).
  const _usaFerroOralDim = (dadosOBA.medicamentos || []).some(m => /FERRO ORAL/i.test(m))
  const _usaFerroEVDim   = (dadosOBA.medicamentos || []).some(m => /FERRO INJET|FERRO VENOSO/i.test(m))
  const _usaFerroDim     = _usaFerroOralDim || _usaFerroEVDim
  const _rdwDim = Number(resultadoEritron?.inputs?.rdw ?? examesOBA?.rdw_novo)
  if (_usaFerroDim && Number.isFinite(_rdwDim) && _rdwDim > 15) {
    alertas.push({ codigo: 'avaliarOBA.rdw_alargado', nivel: MODERADO, texto: `RDW ALARGADO (${_rdwDim}%) EM PACIENTE JÁ EM USO DE FERRO — QUADRO POSSIVELMENTE DIMÓRFICO: O ALARGAMENTO PODE SER A RESPOSTA AO TRATAMENTO (HEMÁCIAS NOVAS NORMAIS CONVIVENDO COM AS ANTIGAS MICROCÍTICAS), NÃO CARÊNCIA ATIVA. NÃO LER COMO FERROPENIA PURA: SOLICITAR RETICULÓCITOS PARA MEDIR A RESPOSTA E CONSIDERAR A DOSE JÁ REPOSTA ANTES DE CALCULAR NOVA DOSE (A FÓRMULA DE GANZONI NÃO DESCONTA O QUE JÁ ENTROU).` })
    examesSuger.push('RETICULÓCITOS (MEDIR A RESPOSTA AO FERRO JÁ EM USO)')
  }

  // ── COOMBS DIRETO (teste de antiglobulina direto) — exame SUGERIDO quando há
  //    ANEMIA (eritron), ARTRITE ou FAN REAGENTE. Rastreia componente hemolítico/
  //    autoimune. Não gera alerta, só entra na lista de exames complementares. ──
  const _labelEritron = resultadoEritron?.label || ''
  const _temAnemia    = /ANEMIA|ANÊMIC/i.test(_labelEritron) || resultadoEritron?.color === 'red'
  const _temArtrite   = (dadosOBA.status_articular || []).includes('ARTRITE')
  const _fanReagente  = dadosOBA.fan === 'REAGENTE'
  if (_temAnemia || _temArtrite || _fanReagente) {
    examesSuger.push('COOMBS DIRETO (TESTE DE ANTIGLOBULINA DIRETO)')
  }

  // ── MICROCITOSE (VCM 60-74) com FERRITINA e SATURAÇÃO normais/altas — o ferro
  //    adequado afasta a ferropenia; suspeitar TALASSEMIA ou outra HEMOGLOBINOPATIA.
  //    Vale com ou sem uso de ferro. VCM/ferritina/sat do eritron, com fallback p/ os
  //    valores relançados no OBA (coleta de novo hemograma na etapa de exames). ──
  const _vcmTal = Number(resultadoEritron?.inputs?.vcm ?? examesOBA?.vcm_novo)
  const _ferTal = Number(resultadoEritron?.inputs?.ferritina ?? examesOBA?.ferritina_novo ?? examesOBA?.ferritina_oba)
  const _satTal = Number(resultadoEritron?.inputs?.satTransf ?? examesOBA?.sat_novo)
  if (_vcmTal >= 60 && _vcmTal <= 74 && _ferTal >= 30 && _satTal >= 20) {
    examesSuger.push('ELETROFORESE DE HEMOGLOBINAS')
    alertas.push({ codigo: 'avaliarOBA.microcitose_vcm', nivel: MODERADO, texto: `MICROCITOSE (VCM ${_vcmTal}) COM FERRITINA E SATURAÇÃO DA TRANSFERRINA NORMAIS OU ELEVADAS — O FERRO ADEQUADO TORNA A FERROPENIA IMPROVÁVEL COMO CAUSA. SUSPEITAR DE TALASSEMIA (TRAÇO) OU OUTRA HEMOGLOBINOPATIA (EX.: HEMOGLOBINA C HOMOZIGÓTICA). SOLICITAR ELETROFORESE DE HEMOGLOBINAS: A HEMOGLOBINA A2 ESTÁ AUMENTADA NA BETA-TALASSEMIA (MINOR OU INTERMÉDIA) E NORMAL NA ALFA-TALASSEMIA. ATENÇÃO: ELETROFORESE NORMAL NÃO EXCLUI A ALFA-TALASSEMIA (SILENCIOSA — CONFIRMAR POR ESTUDO MOLECULAR/DNA). DIFERENCIAL: INFLAMAÇÃO OU DOENÇA CRÔNICA (A FERRITINA É REAGENTE DE FASE AGUDA); UM RDW NORMAL REFORÇA A TALASSEMIA.` })
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

  // Anemia moderada a grave (eritron laranja/vermelho) no bariátrico MERECE avaliação
  // hematológica. Antes só havia o texto "intervenção urgente" — o hematologista não era
  // sugerido, então sumia do card de teleconsulta. Entra como especialista (o card já o
  // prioriza no topo, selo ★). Ferropenia flagrante, dimórfico, hemólise etc. caem aqui.
  if (color === 'orange' || color === 'red') {
    examesSuger.push('AVALIAÇÃO COM HEMATOLOGISTA')
  }

  // HIV/ARV — macrocitose e anemia
  if (dadosOBA.hivTratamento) {
    linhas.push('TRATAMENTO PARA HIV/ARV: ANTIRRETROVIRAIS (ESPECIALMENTE AZT/ZIDOVUDINA) PODEM CAUSAR MACROCITOSE E ANEMIA. NO BARIÁTRICO, ESSE EFEITO SE SOMA À SÍNDROME DISABSORTIVA. MONITORAR HEMOGRAMA COM ATENÇÃO AO VCM E RETICULÓCITOS. COMUNICAR AO INFECTOLOGISTA O CONTEXTO BARIÁTRICO.')
    alertas.push({ codigo: 'eritron.tratamento_arv_risco_de_macrocitose_e_anemia', nivel: MODERADO, texto: 'TRATAMENTO ARV: RISCO DE MACROCITOSE E ANEMIA — CORRELACIONAR COM HEMOGRAMA.' })
  }

  // Plasma de argônio
  if (dadosOBA.fez_plasma_argonio) {
    linhas.push('FEZ PLASMA DE ARGÔNIO: PROCEDIMENTO PARA TRATAMENTO DE ECTASIA VASCULAR GÁSTRICA (WATERMELON STOMACH), FREQUENTEMENTE RELACIONADO À SANGRIA OCULTA CRÔNICA PÓS-BARIÁTRICA. INVESTIGAR SE HÁ SANGRAMENTO RECORRENTE, ESPECIALMENTE SE A ANEMIA NÃO RESPONDE À SUPLEMENTAÇÃO DE FERRO.')
  }

  // ── Sobrecarga de ferro ───────────────────────────────────────────────────
  const ferrOBA = parseFloat(examesOBA?.ferritina_oba)
  if (!isNaN(ferrOBA) && ferrOBA > 400) {
    linhas.push(`FERRITINA ELEVADA NO CONTEXTO BARIÁTRICO: ${ferrOBA} ng/mL. FERRITINA MUITO ACIMA DE 400 ng/mL PODE INDICAR SIDEROSE HEPÁTICA, INFLAMAÇÃO CRÔNICA OU SÍNDROME DE SOBRECARGA DE FERRO. NO BARIÁTRICO, A REPOSIÇÃO PARENTERAL DE FERRO SEM MONITORAMENTO ADEQUADO É UMA CAUSA FREQUENTE. AVALIAR SATURAÇÃO DA TRANSFERRINA — SE > 45%, INVESTIGAR HEMOCROMATOSE.`)
    alertas.push({ codigo: 'eritron.ferritina_muito_elevada', nivel: MODERADO, texto: `FERRITINA MUITO ELEVADA: ${ferrOBA} ng/mL — AVALIAR SOBRECARGA DE FERRO E INFLAMAÇÃO CRÔNICA.` })
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
    alertas.push({ codigo: 'indicacao.cirurgia_por_hemocromatose_contexto_de_ferro', nivel: MODERADO, texto: 'CIRURGIA POR HEMOCROMATOSE: contexto de ferro invertido — suplementação de ferro contraindicada.' })
  } else if (indic.includes('METÁBOLICA') || indic.includes('METABÓLICA') || indic.includes('DIABETES')) {
    linhas.push('É IMPORTANTE AVALIAR QUANTO DO OBJETIVO DA CIRURGIA FOI ATINGIDO, COMPARANDO OS EXAMES ANTERIORES AO PROCEDIMENTO COM OS POSTERIORES. ORGANIZE OS EXAMES PRÉ E PÓS-CIRÚRGICOS POR DATA PARA SER ADEQUADAMENTE ORIENTADO NA AVALIAÇÃO MÉDICA. SE OS EXAMES TÊM MAIS DE 90 DIAS, SOLICITE AO MÉDICO O PEDIDO PARA NOVOS EXAMES.')
    nivel = LEVE
    alertas.push({ codigo: 'indicacao.indicacao_metabolica_diabetes_avaliar_quanto', nivel: LEVE, texto: 'INDICAÇÃO METABÓLICA/DIABETES: avaliar quanto do objetivo da cirurgia foi atingido — comparar exames pré e pós na avaliação médica.' })
  } else if (indic.includes('GASTRECTOMIA')) {
    linhas.push('CIRURGIA POR GASTRECTOMIA DE OUTRA CAUSA: É FUNDAMENTAL QUE UM MÉDICO REVISE OS EXAMES E INVESTIGUE A ENFERMIDADE QUE LEVOU À CIRURGIA, CONSIDERADA A POSSIBILIDADE DE RECIDIVA E EVENTUAL PERDA DE CONTROLE SOBRE A DOENÇA.')
    nivel = MODERADO
    alertas.push({ codigo: 'indicacao.gastrectomia_por_outra_causa_revisar_exames_e', nivel: MODERADO, texto: 'GASTRECTOMIA POR OUTRA CAUSA: revisar exames e investigar recidiva da doença de base — avaliação médica indicada.' })
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

  alertas.push({ codigo: 'neurologico.sintomas_neurologicos', nivel: MODERADO, texto: `SINTOMAS NEUROLÓGICOS (${sintomas.length}): investigar B12/B1/cobre e avaliação neurológica.` })
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
  const alergias = Array.isArray(dadosOBA.alergia_medicamentosa) ? dadosOBA.alergia_medicamentosa : []
  const alergiaPenicilina = alergias.includes('PENICILINAS')
  const alergiaCefalosporina = alergias.includes('CEFALOSPORINAS')
  if (achados.length === 0 && !igmReag && !iggReag) return null

  const ordem = { [NORMAL]: 0, [LEVE]: 1, [MODERADO]: 2, [GRAVE]: 3 }
  let nivel = NORMAL
  const bump = (alvo) => { if (ordem[alvo] > ordem[nivel]) nivel = alvo }
  const has = (x) => achados.includes(x)

  const linhas = []

  if (has('DIVERTÍCULOS')) {
    linhas.push('DIVERTÍCULOS: A DIVERTICULITE É FONTE DE SANGRAMENTO QUE AGRAVA A SIDEROPENIA E PODE EXIGIR MAIOR REPOSIÇÃO DE FERRO ENDOVENOSO. INVESTIGAR SANGRAMENTO ATIVO E ACOMPANHAR COM GASTROENTEROLOGISTA/COLOPROCTOLOGISTA.')
    alertas.push({ codigo: 'endoscopico.diverticulos_fonte_de_sangramento_agrava_side', nivel: MODERADO, texto: 'DIVERTÍCULOS: fonte de sangramento — agrava sideropenia, pode exigir ferro endovenoso.' })
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
    alertas.push({ codigo: 'endoscopico.h_pylori_igm_reagente_infeccao_ativa_erradica', nivel: MODERADO, texto: igmReag
      ? 'H. PYLORI — IgM reagente (infecção ativa): erradicar e confirmar cura por teste não sorológico.'
      : 'H. PYLORI — verificar se foi tratada; se não, erradicar. Sorologia não confirma cura (anticorpos persistem).' })
    suger.push('PESQUISA DE H. PYLORI POR ANTÍGENO FECAL OU TESTE RESPIRATÓRIO DA UREIA (confirmar status / controle pós-tratamento)')
    bump(MODERADO)

    // SEGURANÇA — ALERGIA A PENICILINAS × ERRADICAÇÃO DO H. PYLORI:
    // o esquema padrão (IBP + AMOXICILINA + claritromicina) usa amoxicilina, que É
    // penicilina. A plataforma OFERECE a receita da erradicação na conclusão do OBA
    // (OBAModal), então esse cruzamento não é informativo — é barreira de segurança.
    // Lê o array cru de propósito (sem exigir status_alergico='MEDICAMENTOSA'): um
    // aviso a mais custa uma conferência do prescritor; um a menos custa anafilaxia.
    if (alergiaPenicilina) {
      linhas.push('⚠ ATENÇÃO — VOCÊ DECLAROU ALERGIA A PENICILINAS: O ESQUEMA PADRÃO DE ERRADICAÇÃO DO H. PYLORI USA AMOXICILINA, QUE É UMA PENICILINA — ESTÁ CONTRAINDICADO PARA VOCÊ. EXISTEM ESQUEMAS ALTERNATIVOS EFICAZES SEM PENICILINA (POR EXEMPLO, O ESQUEMA QUÁDRUPLO COM BISMUTO: IBP + BISMUTO + TETRACICLINA + METRONIDAZOL). NÃO ACEITE NEM INICIE NENHUMA RECEITA DE ERRADICAÇÃO SEM QUE O MÉDICO SAIBA DESSA ALERGIA — INFORME-A SEMPRE, EM TODA CONSULTA.')
      alertas.push({ codigo: 'endoscopico.alergia_a_penicilinas_h_pylori_a_erradicar_o', nivel: GRAVE, texto: 'ALERGIA A PENICILINAS + H. PYLORI A ERRADICAR — O ESQUEMA PADRÃO (COM AMOXICILINA) É CONTRAINDICADO. EXIGIR ESQUEMA ALTERNATIVO SEM PENICILINA (EX.: QUÁDRUPLO COM BISMUTO). INFORME A ALERGIA AO MÉDICO PRESCRITOR.' })
      bump(GRAVE)
    } else if (alergiaCefalosporina) {
      // Reatividade cruzada penicilina×cefalosporina existe, mas é baixa (~1-2%) e
      // NÃO contraindica a amoxicilina por si — por isso é nota, não bloqueio.
      linhas.push('VOCÊ DECLAROU ALERGIA A CEFALOSPORINAS: O ESQUEMA PADRÃO DE ERRADICAÇÃO DO H. PYLORI USA AMOXICILINA (PENICILINA). A REATIVIDADE CRUZADA ENTRE CEFALOSPORINAS E PENICILINAS É BAIXA E NÃO CONTRAINDICA O ESQUEMA POR SI, MAS INFORME ESSA ALERGIA AO MÉDICO PRESCRITOR ANTES DE INICIAR O TRATAMENTO.')
    }
  }
  if (has('BARRETT')) {
    linhas.push('BARRETT: LESÃO PRÉ-MALIGNA — EXIGE VIGILÂNCIA ENDOSCÓPICA PERIÓDICA COM GASTROENTEROLOGISTA.')
    alertas.push({ codigo: 'endoscopico.esofago_de_barrett_lesao_pre_maligna_vigilanc', nivel: MODERADO, texto: 'ESÔFAGO DE BARRETT: lesão pré-maligna — vigilância endoscópica periódica.' })
    suger.push('ENDOSCOPIA DIGESTIVA ALTA')
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
    alertas.push({ codigo: 'b12.b12_critica', nivel: GRAVE, texto: `B12 CRÍTICA: ${b12} pg/mL — RISCO DE NEUROPATIA. REPOSIÇÃO PARENTERAL URGENTE.` })
    suger.push('AVALIAÇÃO NEUROLÓGICA')
  } else if (b12 < REF.b12.baixo) {
    nivel = MODERADO
    linhas.push('DÉFICIT MODERADO DE VITAMINA B12 (100–200 pg/mL). PODE PRODUZIR MACROCITOSE, ANEMIA MACROCÍTICA E ALTERAÇÕES NEUROLÓGICAS SUBCLÍNICAS. REPOSIÇÃO SUBLINGUAL OU PARENTERAL OBRIGATÓRIA.')
    alertas.push({ codigo: 'b12.b12_baixa', nivel: MODERADO, texto: `B12 BAIXA: ${b12} pg/mL — DÉFICIT MODERADO. REPOSIÇÃO SUBLINGUAL OU IM NECESSÁRIA.` })
  } else if (b12 > REF.b12.alto) {
    // B12 alta: no bariátrico é MUITO comum por suplementação (sublingual/IM em altas
    // doses) — nesse caso é esperada/benigna. SEM suplementação, B12 persistentemente
    // alta (> 1.000) pede investigação (hepatopatia, mieloproliferativa, neoplasia oculta).
    if (usaB12IM || usaB12Sub) {
      linhas.push(`VITAMINA B12 ELEVADA (${b12} pg/mL): ESPERADA PELO USO DE B12 SUPLEMENTAR (SUBLINGUAL/INTRAMUSCULAR) NO BARIÁTRICO — ACHADO BENIGNO. PODE-SE REDUZIR OU ESPAÇAR A DOSE SE MUITO ALTA.`)
    } else {
      nivel = MODERADO
      linhas.push(`VITAMINA B12 ELEVADA (> 1.000 pg/mL: ${b12}) SEM SUPLEMENTAÇÃO REGISTRADA: EMBORA POSSA SER BENIGNA/GENÉTICA, A B12 PERSISTENTEMENTE ALTA SEM CAUSA EXÓGENA PEDE INVESTIGAÇÃO — HEPATOPATIA, DOENÇA MIELOPROLIFERATIVA (HEMOGRAMA COM DIFERENCIAL) OU NEOPLASIA OCULTA.`)
      alertas.push({ codigo: 'b12.b12_elevada', nivel: MODERADO, texto: `B12 ELEVADA (${b12} pg/mL) SEM SUPLEMENTAÇÃO — INVESTIGAR (HEPATOPATIA, MIELOPROLIFERATIVA, NEOPLASIA).` })
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
    if (nivel === NORMAL) alertas.push({ codigo: 'b12.metformina_bariatrica_risco_aumentado_de_defi', nivel: LEVE, texto: 'METFORMINA + BARIÁTRICA: RISCO AUMENTADO DE DÉFICIT DE B12 — MONITORAR.' })
  }
  if (usaIBP) {
    linhas.push('USO DE IBP (OMEPRAZOL/PANTOPRAZOL): SUPRIME ÁCIDO GÁSTRICO NECESSÁRIO PARA ABSORÇÃO DE B12. NO BARIÁTRICO, O USO CRÔNICO DE IBP AGRAVA O RISCO DE DEFICIÊNCIA DE B12 E FERRO. AVALIAR REAL NECESSIDADE DE MANUTENÇÃO.')
    if (nivel === NORMAL) alertas.push({ codigo: 'b12.ibp_cronico_reduz_absorcao_de_b12_e_ferro_ava', nivel: LEVE, texto: 'IBP CRÔNICO: REDUZ ABSORÇÃO DE B12 E FERRO — AVALIAR NECESSIDADE.' })
  }

  // Via de reposição
  if (disab.grau >= 2) {
    if (!usaB12IM && !usaB12Sub) {
      linhas.push('ATENÇÃO: NÃO HÁ REGISTRO DE USO DE B12 SUBLINGUAL OU INTRAMUSCULAR. NO BARIÁTRICO, A REPOSIÇÃO ORAL NÃO É EFICAZ. A SUPLEMENTAÇÃO SUBLINGUAL OU PARENTERAL É MANDATÓRIA.')
      if (nivel === NORMAL) alertas.push({ codigo: 'b12.sem_b12_sublingual_im_via_oral_insuficiente_n', nivel: LEVE, texto: 'SEM B12 SUBLINGUAL/IM: VIA ORAL INSUFICIENTE NO BARIÁTRICO.' })
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
    alertas.push({ codigo: 'vitD.vitamina_d_critica', nivel: GRAVE, texto: `VITAMINA D CRÍTICA: ${vd} ng/mL — DEFICIÊNCIA GRAVE. REPOSIÇÃO DE ATAQUE URGENTE.` })
    suger.push('PTH INTACTO')
    suger.push('CÁLCIO SÉRICO E URINÁRIO')
  } else if (vd < REF.vitD.baixo) {
    nivel = MODERADO
    linhas.push('INSUFICIÊNCIA DE VITAMINA D (10–20 ng/mL). NO BARIÁTRICO, A META É ≥ 30 ng/mL. AUMENTAR DOSE SUPLEMENTAR. VERIFICAR SE USA VITAMINA D3 (COLECALCIFEROL) — PREFERENCIAL EM RELAÇÃO À D2 (ERGOCALCIFEROL).')
    alertas.push({ codigo: 'vitD.vitamina_d_insuficiente', nivel: MODERADO, texto: `VITAMINA D INSUFICIENTE: ${vd} ng/mL — AUMENTAR DOSE SUPLEMENTAR.` })
  } else if (vd < REF.vitD.normal) {
    nivel = LEVE
    linhas.push('VITAMINA D ABAIXO DA META BARIÁTRICA (20–30 ng/mL). A META PARA BARIÁTRICOS É ≥ 30 ng/mL. OTIMIZAR SUPLEMENTAÇÃO COM D3.')
    alertas.push({ codigo: 'vitD.vitamina_d_abaixo_da_meta', nivel: LEVE, texto: `VITAMINA D ABAIXO DA META: ${vd} ng/mL (meta ≥ 30 ng/mL).` })
  } else if (vd > REF.vitD.alto) {
    nivel = LEVE
    linhas.push('VITAMINA D ELEVADA (> 100 ng/mL). RISCO DE HIPERVITAMINOSE D E HIPERCALCEMIA. REDUZIR DOSE SUPLEMENTAR E VERIFICAR CÁLCIO SÉRICO.')
    alertas.push({ codigo: 'vitD.vitamina_d_elevada', nivel: LEVE, texto: `VITAMINA D ELEVADA: ${vd} ng/mL — VERIFICAR HIPERCALCEMIA.` })
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
      alertas.push({ codigo: 'vitaminas.zinco_critico', nivel: GRAVE, texto: `ZINCO CRÍTICO: ${zinco} mcg/dL — SUPLEMENTAÇÃO URGENTE.` })
    } else if (zinco < REF.zinco.baixo) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push('ZINCO BAIXO (50–60 mcg/dL). SUPLEMENTAÇÃO NECESSÁRIA: 15–30 mg DE ZINCO ELEMENTAR/DIA. SEPARAR DA SUPLEMENTAÇÃO DE FERRO EM 2 HORAS (COMPETIÇÃO ABSORTIVA).')
      alertas.push({ codigo: 'vitaminas.zinco_baixo', nivel: MODERADO, texto: `ZINCO BAIXO: ${zinco} mcg/dL — SUPLEMENTAÇÃO NECESSÁRIA.` })
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
      alertas.push({ codigo: 'vitaminas.vitamina_a_critica', nivel: GRAVE, texto: `VITAMINA A CRÍTICA: ${vitA} mcg/dL — RISCO DE XEROFTALMIA.` })
      suger.push('AVALIAÇÃO OFTALMOLÓGICA')
    } else if (vitA < REF.vitA.baixo) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push('VITAMINA A BAIXA (15–20 mcg/dL). SUPLEMENTAÇÃO NECESSÁRIA. PREFERIR POLIVITAMÍNICO COM BETACAROTENO. ATENÇÃO: EXCESSO DE VITAMINA A PURA (RETINOL) É HEPATOTÓXICO E TERATOGÊNICO.')
      alertas.push({ codigo: 'vitaminas.vitamina_a_baixa', nivel: MODERADO, texto: `VITAMINA A BAIXA: ${vitA} mcg/dL — SUPLEMENTAÇÃO NECESSÁRIA.` })
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
      alertas.push({ codigo: 'vitaminas.tiamina_critica', nivel: GRAVE, texto: `TIAMINA CRÍTICA: ${tiamina} nmol/L — RISCO DE WERNICKE. TIAMINA IV URGENTE.` })
      suger.push('AVALIAÇÃO NEUROLÓGICA URGENTE')
    } else if (tiamina < REF.tiamina.baixo) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push('TIAMINA BAIXA (50–70 nmol/L). SUPLEMENTAÇÃO VO OU IM NECESSÁRIA. A DEFICIÊNCIA DE TIAMINA É PARTICULARMENTE GRAVE NO BARIÁTRICO, ESPECIALMENTE COM VÔMITOS FREQUENTES OU DIETA MUITO RESTRITIVA.')
      alertas.push({ codigo: 'vitaminas.tiamina_baixa', nivel: MODERADO, texto: `TIAMINA BAIXA: ${tiamina} nmol/L — SUPLEMENTAÇÃO IM/VO NECESSÁRIA.` })
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
      alertas.push({ codigo: 'vitaminas.vitamina_e_baixa', nivel: LEVE, texto: `VITAMINA E BAIXA: ${vitE} mg/L.` })
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
      alertas.push({ codigo: 'vitaminas.folatos_criticos', nivel: MODERADO, texto: `FOLATOS CRÍTICOS: ${folatos} ng/mL — SUPLEMENTAR URGENTE.` })
    } else if (folatos < REF.folatos.baixo) {
      if (nivelGeral === NORMAL) nivelGeral = LEVE
      linhas.push('FOLATOS BAIXOS (2–4 ng/mL). SUPLEMENTAR COM ÁCIDO FÓLICO. NO BARIÁTRICO, O POLIVITAMÍNICO DEVE CONTER FOLATO.')
      alertas.push({ codigo: 'vitaminas.folatos_baixos', nivel: LEVE, texto: `FOLATOS BAIXOS: ${folatos} ng/mL.` })
    } else {
      linhas.push('FOLATOS DENTRO DA FAIXA NORMAL.')
    }
    if (dados.methotrexato) {
      linhas.push('USO DE METOTREXATO: ANTAGONISTA DO ÁCIDO FÓLICO. CAUSA DEPLEÇÃO PROGRESSIVA DE FOLATOS — EFEITO SOMADO À DISABSORÇÃO BARIÁTRICA. SUPLEMENTAÇÃO COM ÁCIDO FÓLICO 5 MG/DIA É OBRIGATÓRIA. MONITORAR FOLATOS E HEMOGRAMA REGULARMENTE.')
      alertas.push({ codigo: 'vitaminas.metotrexato_bariatrica_alto_risco_de_deficien', nivel: MODERADO, texto: 'METOTREXATO + BARIÁTRICA: ALTO RISCO DE DEFICIÊNCIA DE FOLATOS — SUPLEMENTAR OBRIGATORIAMENTE.' })
    }
  } else {
    suger.push('FOLATOS SÉRICOS')
    if (dados.methotrexato) {
      linhas.push('USO DE METOTREXATO SEM FOLATOS DOSADOS: METOTREXATO É ANTAGONISTA DO ÁCIDO FÓLICO. SOLICITAR FOLATOS URGENTE E INICIAR SUPLEMENTAÇÃO PREVENTIVA COM ÁCIDO FÓLICO 5 MG/DIA.')
      alertas.push({ codigo: 'vitaminas.metotrexato_em_uso_dosear_folatos_e_suplement', nivel: MODERADO, texto: 'METOTREXATO EM USO — DOSEAR FOLATOS E SUPLEMENTAR ÁCIDO FÓLICO.' })
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
      alertas.push({ codigo: 'vitaminas.selenio_baixo', nivel: LEVE, texto: `SELÊNIO BAIXO: ${selenio} mcg/L.` })
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
      alertas.push({ codigo: 'vitaminas.vitamina_c_critica', nivel: MODERADO, texto: `VITAMINA C CRÍTICA: ${vitC} mg/dL — RISCO DE ESCORBUTO E COMPROMETIMENTO ABSORTIVO DE FERRO.` })
    } else if (vitC < REF.vitC.baixo) {
      if (nivelGeral === NORMAL) nivelGeral = LEVE
      linhas.push('VITAMINA C BAIXA (0,2–0,4 mg/dL). SUPLEMENTAR 200–500 MG/DIA. A VITAMINA C POTENCIALIZA A ABSORÇÃO DO FERRO NÃO-HEME — IMPORTANTE NO BARIÁTRICO COM DEFICIÊNCIA DE FERRO.')
      alertas.push({ codigo: 'vitaminas.vitamina_c_baixa', nivel: LEVE, texto: `VITAMINA C BAIXA: ${vitC} mg/dL — SUPLEMENTAR.` })
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
      alertas.push({ codigo: 'vitaminas.vitamina_k_critica', nivel: MODERADO, texto: `VITAMINA K CRÍTICA: ${vitK} ng/mL — RISCO DE COAGULOPATIA.` })
      suger.push('TEMPO DE PROTROMBINA (TP/INR)')
    } else if (vitK < REF.vitK.baixo) {
      if (nivelGeral === NORMAL) nivelGeral = LEVE
      linhas.push('VITAMINA K BAIXA (0,1–0,2 ng/mL). IMPORTANTE PARA COAGULAÇÃO E SAÚDE ÓSSEA. SUPLEMENTAR VIA POLIVITAMÍNICO COM MK-7 (MENAQUINONA).')
      alertas.push({ codigo: 'vitaminas.vitamina_k_baixa', nivel: LEVE, texto: `VITAMINA K BAIXA: ${vitK} ng/mL — SUPLEMENTAR.` })
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
      alertas.push({ codigo: 'glico.glicemia_elevada', nivel: GRAVE, texto: `GLICEMIA ELEVADA: ${gli} mg/dL — POSSÍVEL DIABETES EM ATIVIDADE.` })
      suger.push('AVALIAÇÃO COM ENDOCRINOLOGISTA')
    } else if (gli >= REF.glicemia.preD) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push('GLICEMIA ELEVADA (126–199 mg/dL): COMPATÍVEL COM DIABETES NÃO CONTROLADO OU EM REMISSÃO INCOMPLETA. INVESTIGAR COM HBA1C E INSULINEMIA.')
      // Dedup (auditoria): glicemia e HbA1c descrevem o MESMO diabetes. Se a HbA1c
      // (marcador crônico, melhor) já vai alertar diabetes, não empurrar um 2º
      // moderado do mesmo eixo (2 moderados = estado RUIM). O texto/linha fica; só
      // o alerta é suprimido quando a HbA1c o cobre.
      const hbaCobre = !isNaN(hba) && hba >= REF.hbA1c.diabetes
      if (!hbaCobre) alertas.push({ codigo: 'glico.glicemia_aumentada', nivel: MODERADO, texto: `GLICEMIA AUMENTADA: ${gli} mg/dL — AVALIAR COM HBA1C.` })
    } else if (gli >= REF.glicemia.otimo) {
      if (nivelGeral === NORMAL) nivelGeral = LEVE
      linhas.push('GLICEMIA LIMÍTROFE (100–125 mg/dL): PRÉ-DIABETES OU RESISTÊNCIA INSULÍNICA. AVALIAR HBA1C E INSULINEMIA EM JEJUM.')
      alertas.push({ codigo: 'glico.glicemia_limitrofe', nivel: LEVE, texto: `GLICEMIA LIMÍTROFE: ${gli} mg/dL — PRÉ-DIABETES OU RESISTÊNCIA INSULÍNICA.` })
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
      alertas.push({ codigo: 'glico.hba1c_muito_alta', nivel: GRAVE, texto: `HBA1C MUITO ALTA: ${hba}% — CONTROLE GLICÊMICO RUIM.` })
    } else if (hba >= REF.hbA1c.diabetes) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push('HBA1C NO NÍVEL DE DIABETES (≥ 6.5%): DIABETES EM ATIVIDADE OU REMISSÃO INCOMPLETA PÓS-BARIÁTRICA. AVALIAÇÃO COM ENDOCRINOLOGISTA.')
      alertas.push({ codigo: 'glico.hba1c_elevada', nivel: MODERADO, texto: `HBA1C ELEVADA: ${hba}% — DIABETES EM ATIVIDADE.` })
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
        alertas.push({ codigo: 'glico.homa_ir', nivel: LEVE, texto: `HOMA-IR: ${homa.toFixed(1)} — RESISTÊNCIA INSULÍNICA.` })
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
      alertas.push({ codigo: 'glico.triglicerides_muito_altos', nivel: MODERADO, texto: `TRIGLICÉRIDES MUITO ALTOS: ${tg} mg/dL — RISCO DE PANCREATITE.` })
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
    alertas.push({ codigo: 'glico.dumping_relatado_ajustar_dieta_e_avaliar_com', nivel: MODERADO, texto: 'DUMPING RELATADO: AJUSTAR DIETA E AVALIAR COM ESPECIALISTA — intervenção médica reduz o risco.' })
    suger.push('AVALIAÇÃO COM CIRURGIÃO BARIÁTRICO OU NUTRÓLOGO ESPECIALIZADO')
    suger.push('GLICEMIA PÓS-PRANDIAL 1H E 2H')
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
      alertas.push({ codigo: 'orgaos.transaminases_muito_elevadas_avaliacao_hepati', nivel: GRAVE, texto: 'TRANSAMINASES MUITO ELEVADAS — AVALIAÇÃO HEPÁTICA URGENTE.' })
      suger.push('ECOGRAFIA HEPÁTICA')
      suger.push('ANTI-HCV, HBsAg, ANTI-HBS')
      suger.push('AVALIAÇÃO COM HEPATOLOGISTA')
    } else if ((!isNaN(ast) && ast > REF.ast.normal) || (!isNaN(alt) && alt > REF.alt.normal)) {
      if (nivelGeral === NORMAL) nivelGeral = LEVE
      linhas.push('TRANSAMINASES LEVEMENTE ELEVADAS: ESTEATOSE HEPÁTICA NÃO ALCOÓLICA (ESTEATO-HEPATITE) É FREQUENTE NO BARIÁTRICO COM REGANHO DE PESO OU RESISTÊNCIA INSULÍNICA. MONITORAR E CONTROLAR FATORES METABÓLICOS.')
      alertas.push({ codigo: 'orgaos.transaminases_levemente_elevadas_investigar_e', nivel: LEVE, texto: 'TRANSAMINASES LEVEMENTE ELEVADAS — INVESTIGAR ESTEATOSE HEPÁTICA.' })
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
      alertas.push({ codigo: 'orgaos.gama_gt_muito_elevada', nivel: MODERADO, texto: `GAMA-GT MUITO ELEVADA: ${ggt} U/L.` })
    } else if (ggt > limAlt) {
      if (nivelGeral === NORMAL) nivelGeral = LEVE
      linhas.push('GAMA-GT LEVEMENTE ELEVADA: MONITORAR. ÁLCOOL, MEDICAMENTOS E ESTEATOSE SÃO CAUSAS COMUNS.')
    } else {
      linhas.push('GAMA-GT NORMAL.')
    }
  }

  // Creatinina. `creAlertou` deixa a ureia (mesmo eixo renal) NÃO empurrar um 2º
  // alerta quando a creatinina já falou (dedup da auditoria — a ureia alta com
  // creatinina alta é o MESMO quadro; a linha da ureia manda "correlacionar").
  let creAlertou = false
  if (!isNaN(cre)) {
    temAlgo = true
    linhas.push(`CREATININA: ${cre} mg/dL`)
    if (cre > limCre * 2) {
      nivelGeral = GRAVE
      creAlertou = true
      linhas.push('CREATININA MUITO ELEVADA: INSUFICIÊNCIA RENAL SIGNIFICATIVA. AVALIAÇÃO COM NEFROLOGISTA URGENTE. AJUSTAR DOSES DE MEDICAMENTOS DE EXCREÇÃO RENAL.')
      alertas.push({ codigo: 'orgaos.creatinina_muito_alta', nivel: GRAVE, texto: `CREATININA MUITO ALTA: ${cre} mg/dL — AVALIAÇÃO NEFROLÓGICA URGENTE.` })
      suger.push('TAXA DE FILTRAÇÃO GLOMERULAR (TFG)')
      suger.push('UREIA')
      suger.push('SUMÁRIO DE URINA')
      suger.push('AVALIAÇÃO COM NEFROLOGISTA')
    } else if (cre > limCre) {
      if (nivelGeral === NORMAL) nivelGeral = LEVE
      creAlertou = true
      linhas.push('CREATININA ACIMA DO LIMITE SUPERIOR: MONITORAR FUNÇÃO RENAL. HIDRATAÇÃO ADEQUADA É FUNDAMENTAL NO BARIÁTRICO.')
      alertas.push({ codigo: 'orgaos.creatinina_elevada', nivel: LEVE, texto: `CREATININA ELEVADA: ${cre} mg/dL — MONITORAR.` })
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
      alertas.push({ codigo: 'orgaos.acido_urico_elevado', nivel: LEVE, texto: `ÁCIDO ÚRICO ELEVADO: ${au} mg/dL — RISCO DE GOTA.` })
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
      // Só alerta próprio se a creatinina NÃO alertou — senão é o mesmo eixo renal.
      if (!creAlertou) alertas.push({ codigo: 'orgaos.ureia_muito_elevada', nivel: MODERADO, texto: `UREIA MUITO ELEVADA: ${ure} mg/dL.` })
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
          alertas.push({ codigo: 'ponderal.perda_de_imc_parcial', nivel: LEVE, texto: `PERDA DE IMC PARCIAL: ${pctIMC.toFixed(0)}% — INSUFICIENTE.` })
        } else {
          if (nivelGeral !== GRAVE) nivelGeral = MODERADO
          linhas.push('PERDA DE IMC MUITO AQUÉM DO ESPERADO (< 10% do IMC inicial): RESULTADO INSATISFATÓRIO DA CIRURGIA. INVESTIGAR ADESÃO, TÉCNICA CIRÚRGICA OU NECESSIDADE DE CIRURGIA REVISIONAL.')
          alertas.push({ codigo: 'ponderal.perda_de_imc_aquem_apenas', nivel: MODERADO, texto: `PERDA DE IMC AQUÉM: apenas ${pctIMC.toFixed(0)}%.` })
        }
      } else if (deltaIMC < 0) {
        const ganhoAbs = Math.abs(deltaIMC)
        const ganhoPct = Math.abs(pctIMC)
        linhas.push(`GANHO DE IMC APÓS A CIRURGIA: ${ganhoAbs.toFixed(1)} unidades (${ganhoPct.toFixed(1)}% a mais que o IMC inicial).`)
        if (ganhoPct > 10) {
          nivelGeral = GRAVE
          linhas.push('REGANHO EXPRESSIVO DO IMC (> 10% acima do IMC pré-cirúrgico): FALHA BARIÁTRICA SIGNIFICATIVA. AVALIAÇÃO PARA REVISÃO CIRÚRGICA, ACOMPANHAMENTO PSICOLÓGICO E TERAPIA FARMACOLÓGICA ADJUVANTE.')
          alertas.push({ codigo: 'ponderal.reganho_de_imc_expressivo', nivel: GRAVE, texto: `REGANHO DE IMC EXPRESSIVO: +${ganhoPct.toFixed(0)}%.` })
        } else if (ganhoPct > 5) {
          if (nivelGeral !== GRAVE) nivelGeral = MODERADO
          linhas.push('REGANHO MODERADO DO IMC (5–10% acima do IMC inicial): INTERVENÇÃO NECESSÁRIA. REAVALIAR PADRÃO ALIMENTAR, ATIVIDADE FÍSICA E CONSIDERAR FARMACOTERAPIA.')
          alertas.push({ codigo: 'ponderal.reganho_de_imc', nivel: MODERADO, texto: `REGANHO DE IMC: +${ganhoPct.toFixed(0)}%.` })
        } else {
          if (nivelGeral === NORMAL) nivelGeral = LEVE
          linhas.push('REGANHO LEVE DO IMC (até 5% acima do IMC inicial): MONITORAR. ATENÇÃO AO PADRÃO ALIMENTAR E ROTINA DE EXERCÍCIOS.')
          alertas.push({ codigo: 'ponderal.reganho_leve_de_imc', nivel: LEVE, texto: `REGANHO LEVE DE IMC: +${ganhoPct.toFixed(0)}%.` })
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
        alertas.push({ codigo: 'ponderal.baixo_peso_imc_20_meta_ganhar_buscar_cirurgia', nivel: MODERADO, texto: 'BAIXO PESO (IMC < 20) + META GANHAR: buscar cirurgião e endocrinologista/metabologista.' })
      } else if (meta === 'MANTER') {
        linhas.push('SEU IMC ESTÁ ABAIXO DO IDEAL E VOCÊ DESEJA MANTER O PESO. BUSQUE AVALIAÇÃO DE ENDOCRINOLOGISTA/NUTRÓLOGO — NESSE NÍVEL DE IMC A MANUTENÇÃO PODE NÃO SER SEGURA.')
        alertas.push({ codigo: 'ponderal.baixo_peso_imc_20_meta_manter_avaliacao_de_en', nivel: MODERADO, texto: 'BAIXO PESO (IMC < 20) + META MANTER: avaliação de endocrinologista/nutrólogo.' })
      } else {
        linhas.push('ATENÇÃO: SEU IMC JÁ ESTÁ ABAIXO DO IDEAL E VOCÊ DESEJA PERDER MAIS PESO — ISSO PODE SER PERIGOSO. BUSQUE AVALIAÇÃO MÉDICA (ENDOCRINOLOGISTA/METABOLOGISTA).')
        alertas.push({ codigo: 'ponderal.baixo_peso_imc_20_meta_perder_avaliacao_medic', nivel: MODERADO, texto: 'BAIXO PESO (IMC < 20) + META PERDER: avaliação médica — pode ser perigoso.' })
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
      alertas.push({ codigo: 'ponderal.reganho_15_sobre_o_menor_peso_meta', nivel: MODERADO, texto: `REGANHO > 15% SOBRE O MENOR PESO + META ${metaLabel}: orientação de nutrólogo.` })
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
      alertas.push({ codigo: 'ponderal.baixo_peso_imc_20_avaliacao_medica_para_recup', nivel: MODERADO, texto: 'BAIXO PESO (IMC < 20): avaliação médica para recuperação ponderal.' })
    } else if (pctSobreNadir !== null && pctSobreNadir > 15) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push('REGANHO SIGNIFICATIVO (MAIS DE 15% SOBRE O MENOR PESO PÓS-CIRURGIA): PROCURE ORIENTAÇÃO DE NUTRÓLOGO PARA AVALIAR A TENDÊNCIA DE GANHO.')
      alertas.push({ codigo: 'ponderal.reganho_15_sobre_o_menor_peso_orientacao_de_n', nivel: MODERADO, texto: 'REGANHO > 15% SOBRE O MENOR PESO: orientação de nutrólogo.' })
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
      linhas.push('MESMO QUE VOCÊ TENHA INTERROMPIDO O ANTICOAGULANTE COM ORIENTAÇÃO MÉDICA, VOCÊ PODE ESTAR EM RISCO DE NOVA TROMBOSE: ISSO MERECE AVALIAÇÃO MÉDICA O MAIS RÁPIDO POSSÍVEL.')
      alertas.push({ codigo: 'vascular.trombose_previa_com_anticoagulante_ja_interro', nivel: MODERADO, texto: 'TROMBOSE PRÉVIA COM ANTICOAGULANTE JÁ INTERROMPIDO — risco de nova trombose; avaliação médica o quanto antes.' })
    }
    linhas.push('NA INVESTIGAÇÃO DA TROMBOSE COM HEMATOLOGISTA, O D-DÍMERO PODE AUXILIAR (POR EXEMPLO, NA DEFINIÇÃO DA DURAÇÃO DA ANTICOAGULAÇÃO E NA AVALIAÇÃO DE TROMBOFILIA). HISTÓRICO DE COVID-19 REFORÇA ESSA INVESTIGAÇÃO.')
    suger.push('D-DÍMERO (NA AVALIAÇÃO COM HEMATOLOGISTA)')
    alertas.push({ codigo: 'vascular.historico_de_trombose_com_risco_aumentado_de', nivel: GRAVE, texto: 'HISTÓRICO DE TROMBOSE COM RISCO AUMENTADO DE TEV NO BARIÁTRICO.' })
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
    alertas.push({ codigo: 'vascular.varizes_de_esofago_investigar_hipertensao_por', nivel: GRAVE, texto: 'VARIZES DE ESÔFAGO — INVESTIGAR HIPERTENSÃO PORTAL E HEPATOPATIA (INCL. ESQUISTOSSOMOSE).' })
    suger.push('ENDOSCOPIA DIGESTIVA ALTA')
    suger.push('ECOGRAFIA ABDOMINAL COM DOPPLER PORTAL')
    suger.push('AVALIAÇÃO COM HEPATOLOGISTA')
    suger.push('IMUNOFLUORESCÊNCIA PARA S. MANSONI')
    if (opeVarizes) {
      linhas.push('JÁ OPEROU VARIZES DE ESÔFAGO: SEGUIMENTO ENDOSCÓPICO PERIÓDICO OBRIGATÓRIO.')
      suger.push('ENDOSCOPIA DIGESTIVA ALTA')
    }
  }

  // Pressão arterial
  if (pressao === 'HIPERTENSO') {
    temAlgo = true
    if (nivelGeral === NORMAL) nivelGeral = LEVE
    linhas.push('HIPERTENSÃO ARTERIAL SISTÊMICA: AVALIAR SE HOUVE MELHORA COM A PERDA DE PESO. MUITOS BARIÁTRICOS ENTRAM EM REMISSÃO DA HAS. SE AINDA HIPERTENSO, REVISAR MEDICAÇÃO COM CARDIOLOGISTA.')
    alertas.push({ codigo: 'vascular.hipertensao_arterial_avaliar_necessidade_de_a', nivel: LEVE, texto: 'HIPERTENSÃO ARTERIAL — AVALIAR NECESSIDADE DE AJUSTE MEDICAMENTOSO.' })
  } else if (pressao === 'HIPOTENSÃO') {
    temAlgo = true
    if (nivelGeral === NORMAL) nivelGeral = LEVE
    linhas.push('HIPOTENSÃO ARTERIAL: COMUM NO PÓS-BARIÁTRICO POR DESHIDRATAÇÃO, DESNUTRIÇÃO PROTEICA OU AJUSTE EXCESSIVO DE ANTI-HIPERTENSIVOS. REVISÃO MEDICAMENTOSA INDICADA.')
    alertas.push({ codigo: 'vascular.hipotensao_revisar_medicacao_e_hidratacao', nivel: LEVE, texto: 'HIPOTENSÃO — REVISAR MEDICAÇÃO E HIDRATAÇÃO.' })
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
      alertas.push({ codigo: 'vascular.possivel_sindrome_pos_covid_proteina_spike_co', nivel: MODERADO, texto: 'POSSÍVEL SÍNDROME PÓS-COVID (PROTEÍNA SPIKE / COVID-LONGA) — IMPORTANTE AFASTAR ESSA POSSIBILIDADE.' })
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
    alertas.push({ codigo: 'osseo.osteoporose_tratamento_especifico_necessario', nivel: GRAVE, texto: 'OSTEOPOROSE — TRATAMENTO ESPECÍFICO NECESSÁRIO. AVALIAR VIA DE REPOSIÇÃO DE CÁLCIO E VITAMINA D.' })
    suger.push('DENSITOMETRIA ÓSSEA (SE NÃO RECENTE)')
    suger.push('PTH INTACTO')
    suger.push('CÁLCIO SÉRICO')
    suger.push('VITAMINA K')
  } else if (osseo === 'OSTEOPENIA') {
    nivelGeral = MODERADO
    linhas.push('OSTEOPENIA: ESTÁGIO INICIAL DE PERDA ÓSSEA. NO BARIÁTRICO, A PROGRESSÃO PARA OSTEOPOROSE É RISCO REAL SEM SUPLEMENTAÇÃO ADEQUADA. CITRATO DE CÁLCIO 1.200–1.500 MG/DIA + VITAMINA D PARA META ≥ 30 NG/ML. MONITORAR COM DENSITOMETRIA ANUALMENTE.')
    alertas.push({ codigo: 'osseo.osteopenia_suplementacao_de_calcio_e_vitamina', nivel: MODERADO, texto: 'OSTEOPENIA — SUPLEMENTAÇÃO DE CÁLCIO E VITAMINA D OBRIGATÓRIA.' })
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
    alertas.push({ codigo: 'osseo.perda_dentaria_significativa_investigar_defic', nivel: MODERADO, texto: 'PERDA DENTÁRIA SIGNIFICATIVA — INVESTIGAR DEFICIÊNCIAS NUTRICIONAIS.' })
  } else if (dental === 'PRECISO TRATAMENTO ODONTOLÓGICO') {
    if (nivelGeral === NORMAL) nivelGeral = LEVE
    linhas.push('PROBLEMAS DENTÁRIOS FREQUENTES: ASSOCIADOS À ACIDEZ BUCAL (REFLUXO), DEFICIÊNCIA DE CÁLCIO E VITAMINA D, E VÔMITOS FREQUENTES. AVALIAÇÃO ODONTOLÓGICA E CONTROLE DO REFLUXO INDICADOS.')
  }

  // ── Bloco bioquímico ósseo-mineral: Vitamina D / PTH / Cálcio iônico / Magnésio ──
  const vitDBaixa   = !isNaN(vitD) && vitD < 30
  const vitDCritica = !isNaN(vitD) && vitD < 20

  // CASCATA MINERAL (hipomagnesemia + hipocalcemia + hiperpara secundário) é UMA
  // fisiopatologia só — a deficiência de vit.D/cálcio no bariátrico. As linhas
  // educativas de cada componente ficam; a COR do card sobe por componente; mas o
  // ALERTA é UM só no fim (dedup da auditoria: 3 pushes jogavam o estado a RUIM/
  // CRÍTICO sozinhos). Hiperpara PRIMÁRIO (cálcio alto) é entidade DIFERENTE → alerta
  // próprio. Reaproveita o padrão da FE/TRT/articular.
  const cascata = []          // componentes da cascata da deficiência
  let cascataGrave = false

  // Magnésio — pré-requisito para a ação do PTH e da vitamina D
  if (!isNaN(mg)) {
    if (mg < cMg.min) {
      linhas.push(`MAGNÉSIO BAIXO (${mg} MG/DL): A HIPOMAGNESEMIA É FREQUENTE NO BARIÁTRICO E PREJUDICA A SECREÇÃO E A AÇÃO DO PTH, ALÉM DA ATIVAÇÃO DA VITAMINA D. CORRIGIR O MAGNÉSIO É PRÉ-REQUISITO PARA QUE A REPOSIÇÃO DE CÁLCIO E VITAMINA D FUNCIONE.`)
      cascata.push('HIPOMAGNESEMIA')
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
      cascata.push('HIPOCALCEMIA')
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
        // Entidade DIFERENTE da cascata da deficiência — alerta próprio.
        linhas.push(`PTH ELEVADO (${pth} PG/ML) COM CÁLCIO ALTO: PADRÃO SUGESTIVO DE HIPERPARATIREOIDISMO PRIMÁRIO. INVESTIGAÇÃO ENDOCRINOLÓGICA INDICADA.`)
        alertas.push({ codigo: 'osseo.pth_e_calcio_elevados_investigar_hiperparatir', nivel: GRAVE, texto: 'PTH E CÁLCIO ELEVADOS — INVESTIGAR HIPERPARATIREOIDISMO PRIMÁRIO.' })
        subirNivel(GRAVE)
      } else {
        const grave = vitDCritica || caBaixo
        linhas.push(`PTH ELEVADO (${pth} PG/ML) COM CÁLCIO NORMAL OU BAIXO: HIPERPARATIREOIDISMO SECUNDÁRIO — RESPOSTA CLÁSSICA À DEFICIÊNCIA DE VITAMINA D E CÁLCIO NO BARIÁTRICO, COM ESTÍMULO CONTÍNUO À REABSORÇÃO ÓSSEA. OTIMIZAR VITAMINA D (META ≥ 30 NG/ML), CITRATO DE CÁLCIO E MAGNÉSIO; REAVALIAR O PTH APÓS A CORREÇÃO.`)
        cascata.push('HIPERPARATIREOIDISMO SECUNDÁRIO')
        if (grave) cascataGrave = true
        subirNivel(grave ? GRAVE : MODERADO)
        suger.push('PTH INTACTO')
      }
    } else if (pth < cPth.min) {
      linhas.push(`PTH BAIXO (${pth} PG/ML): AVALIAR HIPERCALCEMIA, HIPOPARATIREOIDISMO OU EXCESSO DE VITAMINA D E CÁLCIO.`)
      subirNivel(LEVE)
    }
  } else if (vitDBaixa) {
    // Vitamina D baixa sem PTH medido → dosar para flagrar hiperparatireoidismo secundário
    suger.push('PTH INTACTO')
  }

  // UM alerta para toda a cascata da deficiência (não um por componente).
  if (cascata.length) {
    alertas.push({ codigo: 'osseo.cascata_osseo_mineral_da_deficiencia', nivel: cascataGrave ? GRAVE : MODERADO, texto:
      `CASCATA ÓSSEO-MINERAL DA DEFICIÊNCIA (${cascata.join(' + ')}) — UMA MESMA CAUSA (DEFICIÊNCIA DE VITAMINA D E CÁLCIO NO BARIÁTRICO). CORRIGIR NA ORDEM: MAGNÉSIO PRIMEIRO, DEPOIS CITRATO DE CÁLCIO E VITAMINA D (META ≥ 30 NG/ML); REAVALIAR O PTH APÓS A CORREÇÃO.` })
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
// Movido por EXAMES (TSH/testosterona/estradiol) + a flag `tiroxina`. O
// `status_hormonal` (a doença DECLARADA) era órfão — o motor sabia que a paciente
// toma o remédio e não sabia do que ela tem. Ligado em jul/2026.
// ─────────────────────────────────────────────────────────────────────────────
function buildModHormonal(ex, dados, sexo, idade, alertas, suger, resultadoEritron) {
  const linhas = []
  let nivelGeral = NORMAL
  let temAlgo = false

  const tsh  = parseFloat(ex.tsh)
  const testo = parseFloat(ex.testosterona)
  const estr  = parseFloat(ex.estradiol)

  // ── Doença DECLARADA (status_hormonal) ────────────────────────────────────
  const hormonal = Array.isArray(dados.status_hormonal) ? dados.status_hormonal : []
  const temHashimoto = hormonal.includes('TIREOIDITE (HASHIMOTO)')
  const declaraHipo  = hormonal.includes('HIPOTIREOIDISMO') || temHashimoto
  const declaraHiper = hormonal.includes('HIPERTIREOIDISMO')
  const usaTiroxinaDecl = dados.tiroxina || false
  // Nem 'REPOSIÇÃO HORMONAL' nem 'REPOSIÇÃO DE TESTOSTERONA' estão em
  // STATUS_HORMONAL_OPS: são injetadas na tela por sexo/idade (OBAModal ~l.3119 e
  // ~l.3123) e caem no mesmo array — igual à MENOPAUSA no ginecológico.
  const fazTRH = hormonal.includes('REPOSIÇÃO HORMONAL')
  const fazTRT = hormonal.includes('REPOSIÇÃO DE TESTOSTERONA')

  if (declaraHipo) {
    temAlgo = true
    if (nivelGeral === NORMAL) nivelGeral = LEVE
    linhas.push(`VOCÊ DECLAROU ${temHashimoto ? 'TIREOIDITE DE HASHIMOTO' : 'HIPOTIREOIDISMO'}: NO PÓS-BARIÁTRICO ISSO EXIGE UMA ATENÇÃO QUE MUITA GENTE NÃO SABE — A CIRURGIA ALTERA A ABSORÇÃO DA LEVOTIROXINA, E A DOSE QUE FUNCIONAVA ANTES PODE NÃO SERVIR MAIS. O CONTROLE PRECISA SER REFEITO APÓS A CIRURGIA E A CADA MUDANÇA IMPORTANTE DE PESO.`)
    // "cálcio" genérico de propósito: outro módulo manda trocar carbonato por CITRATO
    // no bariátrico — dizer "carbonato" aqui faria quem seguiu aquela orientação achar
    // que o citrato não interfere. Interfere igual.
    linhas.push('DUAS COISAS QUE ATRAPALHAM A ABSORÇÃO DA LEVOTIROXINA E SÃO COMUNS NO BARIÁTRICO: O CÁLCIO (CITRATO OU CARBONATO, TANTO FAZ) E O FERRO. TOME A LEVOTIROXINA EM JEJUM E DEIXE UM INTERVALO DE PELO MENOS 4 HORAS PARA O CÁLCIO E PARA O FERRO — SE VOCÊ TOMA TUDO JUNTO DE MANHÃ, ESTÁ PERDENDO PARTE DOS TRÊS.')
    // Item plano (sem parêntese): o motivo já está na linha acima. Variantes com texto
    // diferente (aqui/hiper/tiroxina) não se fundiam no dedup (que é por string exata) —
    // TSH aparecia 2-3x no pedido de laboratório. Mantendo 'TSH' puro em todos os pontos,
    // o dedup natural (Set) colapsa em 1 item só.
    if (isNaN(tsh)) suger.push('TSH')

    if (!usaTiroxinaDecl) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push('VOCÊ DECLAROU HIPOTIREOIDISMO MAS NÃO MARCOU LEVOTIROXINA (TIROXINA) ENTRE OS SEUS MEDICAMENTOS. SE VOCÊ USA, VOLTE E MARQUE — ISSO MUDA A LEITURA DO SEU CASO. SE REALMENTE NÃO USA, CONFIRME COM O ENDOCRINOLOGISTA SE A REPOSIÇÃO ESTÁ INDICADA: O HIPOTIREOIDISMO NÃO TRATADO DIFICULTA A PERDA DE PESO, AGRAVA A ANEMIA E O CANSAÇO QUE VOCÊ PODE ESTAR ATRIBUINDO SÓ À CIRURGIA.')
      // Só alerta se o TSH NÃO for alertar por conta própria mais abaixo: com TSH
      // elevado dosado, o alerta de lá já diz "hipotireoidismo — avaliar" e este
      // seria um 2º moderado pelo MESMO diagnóstico (2 moderados = estado RUIM).
      if (!(!isNaN(tsh) && tsh > REF.tsh.hipotireoidismo)) {
        alertas.push({ codigo: 'hormonal.hipotireoidismo_declarado_sem_levotiroxina_re', nivel: MODERADO, texto: 'HIPOTIREOIDISMO DECLARADO SEM LEVOTIROXINA REGISTRADA — CONFIRMAR SE HÁ REPOSIÇÃO EM CURSO. NÃO TRATADO, DIFICULTA A PERDA DE PESO E AGRAVA ANEMIA E FADIGA.' })
      }
    }
  }

  // Hashimoto é AUTOIMUNE — e é aqui que mora o achado que o bariátrico esconde.
  if (temHashimoto) {
    temAlgo = true
    const b12Hash = parseFloat(ex.vitamina_b12)
    const b12Baixa = !isNaN(b12Hash) && b12Hash < REF.b12.baixo
    linhas.push('A TIREOIDITE DE HASHIMOTO É UMA DOENÇA AUTOIMUNE, E DOENÇAS AUTOIMUNES ANDAM EM GRUPO: QUEM TEM HASHIMOTO TEM MAIS CHANCE DE TER TAMBÉM GASTRITE ATRÓFICA AUTOIMUNE (QUE CAUSA ANEMIA PERNICIOSA) E DOENÇA CELÍACA. AS DUAS PREJUDICAM A ABSORÇÃO — E NO SEU CASO SERIAM SOMADAS À DA CIRURGIA.')
    if (b12Baixa) {
      // NÃO consolidar com o alerta do módulo de B12 (que já diz "B12 baixa,
      // reponha"). Decisão do Dr. Ramos (jul/2026): este é um achado DISTINTO —
      // gera investigação própria (anti-fator intrínseco, anti-célula parietal) e
      // conduta diferente (parenteral vitalício + vigilância gástrica). Os 2
      // moderados levando o estado a RUIM aqui são resultado clínico, não a
      // armadilha de contagem que assombra o resto do arquivo.
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push(`ATENÇÃO — A SUA VITAMINA B12 ESTÁ BAIXA (${b12Hash} pg/mL) E VOCÊ TEM HASHIMOTO: NÃO ATRIBUA ISSO AUTOMATICAMENTE À CIRURGIA. A COMBINAÇÃO DAS DUAS COISAS LEVANTA A SUSPEITA DE GASTRITE ATRÓFICA AUTOIMUNE / ANEMIA PERNICIOSA, QUE É UMA CAUSA DIFERENTE, VITALÍCIA, E QUE EXIGE VIGILÂNCIA PRÓPRIA DO ESTÔMAGO. VALE INVESTIGAR COM ANTICORPOS ANTI-CÉLULA PARIETAL E ANTI-FATOR INTRÍNSECO E COM A GASTRINA SÉRICA — O TRATAMENTO É PARENTERAL E PARA A VIDA TODA.`)
      alertas.push({ codigo: 'hormonal.hashimoto_b12_baixa', nivel: MODERADO, texto: `HASHIMOTO + B12 BAIXA (${b12Hash} pg/mL) — NÃO ATRIBUIR SÓ À CIRURGIA: INVESTIGAR GASTRITE ATRÓFICA AUTOIMUNE / ANEMIA PERNICIOSA (ANTI-CÉLULA PARIETAL, ANTI-FATOR INTRÍNSECO, GASTRINA). CAUSA VITALÍCIA, COM VIGILÂNCIA GÁSTRICA PRÓPRIA.` })
      suger.push('ANTICORPO ANTI-CÉLULA PARIETAL')
      suger.push('ANTICORPO ANTI-FATOR INTRÍNSECO')
      suger.push('GASTRINA SÉRICA')
    }
    if (dados.fan === 'REAGENTE') {
      linhas.push('O SEU FAN REAGENTE COMBINA COM O CONTEXTO AUTOIMUNE DO HASHIMOTO — LEVE OS DOIS JUNTOS AO SEU MÉDICO; ISOLADAMENTE CADA UM DIZ MENOS DO QUE OS DOIS SOMADOS.')
    }
    suger.push('ANTI-TPO')
  }

  // TERAPIA DE REPOSIÇÃO HORMONAL — cruzamento de SEGURANÇA com o histórico de
  // trombose: o estrogênio ORAL aumenta o risco de tromboembolismo; a via
  // transdérmica não passa pelo fígado e é a preferida nesse cenário.
  if (fazTRH) {
    temAlgo = true
    const teveTrombose = !!dados.trombose
    if (teveTrombose) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push('ATENÇÃO — VOCÊ FAZ REPOSIÇÃO HORMONAL E TEM HISTÓRICO DE TROMBOSE: O ESTROGÊNIO POR VIA ORAL AUMENTA O RISCO DE UM NOVO EVENTO TROMBÓTICO, PORQUE PASSA PELO FÍGADO E ALTERA A COAGULAÇÃO. ISSO NÃO SIGNIFICA PARAR NADA POR CONTA PRÓPRIA — SIGNIFICA LEVAR ESSA COMBINAÇÃO AO SEU MÉDICO COM PRIORIDADE. A VIA TRANSDÉRMICA (ADESIVO OU GEL) NÃO TEM ESSE EFEITO DE PRIMEIRA PASSAGEM E COSTUMA SER A PREFERIDA PARA QUEM JÁ TROMBOSOU.')
      alertas.push({ codigo: 'hormonal.reposicao_hormonal_historico_de_trombose_o_es', nivel: MODERADO, texto: 'REPOSIÇÃO HORMONAL + HISTÓRICO DE TROMBOSE — O ESTROGÊNIO ORAL ELEVA O RISCO DE NOVO EVENTO. REVER VIA (TRANSDÉRMICA NÃO TEM 1ª PASSAGEM HEPÁTICA) E INDICAÇÃO COM O MÉDICO. NÃO SUSPENDER POR CONTA PRÓPRIA.' })
    } else {
      if (nivelGeral === NORMAL) nivelGeral = LEVE
      linhas.push('VOCÊ FAZ REPOSIÇÃO HORMONAL: NO PÓS-BARIÁTRICO ELA TEM UM BENEFÍCIO EXTRA — PROTEGE O OSSO, QUE JÁ PERDE MASSA POR CONTA DA CIRURGIA. MANTENHA O ACOMPANHAMENTO E INFORME AO SEU MÉDICO QUALQUER HISTÓRICO DE TROMBOSE, SEU OU DA FAMÍLIA, PORQUE ISSO MUDA A VIA RECOMENDADA (ORAL × ADESIVO/GEL).')
    }
  }

  // REPOSIÇÃO DE TESTOSTERONA (homem) — é o achado hormonal mais HEMATOLÓGICO que
  // existe aqui: a testosterona exógena estimula a eritropoese, eleva a hemoglobina
  // (eritrocitose) e, com isso, pode MASCARAR a anemia/ferropenia do bariátrico —
  // mesma lógica do CO no fumante. E há o ponto que só o contexto bariátrico dá: a
  // obesidade CAUSA hipogonadismo (o tecido adiposo aromatiza testosterona em
  // estrogênio); perdendo peso, a produção própria costuma voltar — e a dose que
  // era necessária antes pode ficar excessiva depois.
  if (fazTRT) {
    temAlgo = true
    if (nivelGeral === NORMAL) nivelGeral = LEVE
    const hb = Number(resultadoEritron?.inputs?.hemoglobina ?? ex?.hb_novo)
    // MESMO corte do motor principal p/ ESTE achado: achadosParalelos.js:27/148 usa
    // hbNormalMax (M 17.5 / F 15.5) e marca "eritrocitose secundária a testosterona"
    // em vermelho. Um corte próprio aqui (era 18) fazia o Hb 17.8 sair vermelho na
    // triagem e leve no OBA — o mesmo dado com duas leituras.
    const hbMax = sexo === 'M' ? 17.5 : 15.5
    const hbAlta = Number.isFinite(hb) && hb > hbMax

    linhas.push('VOCÊ FAZ REPOSIÇÃO DE TESTOSTERONA: ISSO PRECISA SER LIDO JUNTO COM O SEU HEMOGRAMA, PORQUE A TESTOSTERONA ESTIMULA A MEDULA A PRODUZIR MAIS GLÓBULOS VERMELHOS. O EFEITO TEM DOIS LADOS NO SEU CASO. O PRIMEIRO: A HEMOGLOBINA PODE SUBIR DEMAIS (ERITROCITOSE), ENGROSSANDO O SANGUE E AUMENTANDO O RISCO DE TROMBOSE — POR ISSO O HEMATÓCRITO PRECISA SER MONITORADO NA REPOSIÇÃO, E NÃO SÓ A TESTOSTERONA.')
    linhas.push('O SEGUNDO LADO É O QUE MAIS IMPORTA AQUI: A TESTOSTERONA PODE MASCARAR A SUA ANEMIA. ELA EMPURRA A HEMOGLOBINA PARA CIMA MESMO COM O FERRO BAIXO — ENTÃO UM HEMOGRAMA "NORMAL" NÃO GARANTE QUE O SEU FERRO ESTEJA BOM. NO SEU CASO, A FERRITINA E A SATURAÇÃO DA TRANSFERRINA VALEM MAIS QUE A HEMOGLOBINA PARA DIZER COMO ESTÁ O SEU ESTOQUE DE FERRO.')
    linhas.push('E UM PONTO QUE POUCA GENTE LEVANTA: A PRÓPRIA OBESIDADE CAUSA TESTOSTERONA BAIXA — A GORDURA CORPORAL CONVERTE TESTOSTERONA EM ESTROGÊNIO. COM A PERDA DE PESO DA CIRURGIA, A SUA PRODUÇÃO NATURAL TENDE A MELHORAR, E A DOSE QUE VOCÊ PRECISAVA ANTES PODE ESTAR SOBRANDO AGORA. VALE REAVALIAR A INDICAÇÃO E A DOSE COM O ENDOCRINOLOGISTA/UROLOGISTA — SE VOCÊ PRETENDE TER FILHOS, ISSO É AINDA MAIS IMPORTANTE: A TESTOSTERONA DE FORA DESLIGA A PRODUÇÃO DE ESPERMATOZOIDES.')
    suger.push('HEMATÓCRITO (MONITORAMENTO DA REPOSIÇÃO DE TESTOSTERONA)')
    suger.push('FERRITINA E SATURAÇÃO DA TRANSFERRINA')

    if (hbAlta) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push(`A SUA HEMOGLOBINA JÁ ESTÁ ALTA (${hb} g/dL) EM USO DE TESTOSTERONA: ISSO É O EFEITO ESPERADO DA MEDICAÇÃO LEVADO LONGE DEMAIS. LEVE ESTE RESULTADO AO MÉDICO QUE PRESCREVEU — A CONDUTA HABITUAL É REDUZIR A DOSE OU ESPAÇAR AS APLICAÇÕES, E O HEMATÓCRITO GUIA ESSA DECISÃO. NÃO INTERROMPA POR CONTA PRÓPRIA.`)
    }
    if (dados.trombose) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push('ATENÇÃO — VOCÊ TEM HISTÓRICO DE TROMBOSE E FAZ REPOSIÇÃO DE TESTOSTERONA: A ERITROCITOSE QUE ELA PODE CAUSAR SOMA-SE AO SEU RISCO TROMBÓTICO. ESSA COMBINAÇÃO PRECISA SER DISCUTIDA COM O SEU MÉDICO COM PRIORIDADE — NÃO SUSPENDA NADA POR CONTA PRÓPRIA.')
    }

    // UM alerta para o contexto TRT (não um por sub-achado). Empurrar 3 — eritrocitose,
    // trombose e dose excessiva — somava 3 moderados de UM único contexto clínico e
    // jogava o estado p/ RUIM sozinho. Mesma armadilha já corrigida na FE (l.~2700).
    const trtFatos = []
    if (hbAlta) trtFatos.push(`HEMOGLOBINA ${hb} g/dL (ACIMA DE ${hbMax}) — ERITROCITOSE INDUZIDA: REVER DOSE/INTERVALO COM O PRESCRITOR`)
    if (dados.trombose) trtFatos.push('HISTÓRICO DE TROMBOSE: A ERITROCITOSE SOMA-SE AO RISCO TROMBÓTICO')
    // A dosagem da testosterona é criticada mais abaixo (bloco do exame), mas o FATO
    // entra aqui: fora/dentro do alvo em reposição é o MESMO contexto clínico, não
    // um segundo achado. Lá, com fazTRT, o bloco só escreve linha — não alerta.
    if (!isNaN(testo) && testo > 900) trtFatos.push(`TESTOSTERONA ${testo} ng/dL — DOSE EXCESSIVA (ALIMENTA A ERITROCITOSE)`)
    else if (!isNaN(testo) && testo < REF.testoM.baixo) trtFatos.push(`TESTOSTERONA ${testo} ng/dL APESAR DA REPOSIÇÃO — REVER DOSE/INTERVALO E CONFERIR O MOMENTO DA COLETA NO CICLO`)
    const trtGrave = hbAlta || dados.trombose || (!isNaN(testo) && (testo > 900 || testo < REF.testoM.baixo))
    alertas.push({ codigo: 'hormonal.reposicao_de_testosterona_monitorar_hematocri', nivel: trtGrave ? MODERADO : LEVE, texto:
      `REPOSIÇÃO DE TESTOSTERONA — MONITORAR HEMATÓCRITO E NÃO USAR A HEMOGLOBINA PARA AVALIAR O FERRO (ELA MASCARA A ANEMIA: USAR FERRITINA/SATURAÇÃO). REAVALIAR INDICAÇÃO E DOSE APÓS A PERDA DE PESO (A OBESIDADE CAUSAVA PARTE DO HIPOGONADISMO).${trtFatos.length ? ' ' + trtFatos.join('. ') + '.' : ''}` })
  }

  if (declaraHiper) {
    temAlgo = true
    if (nivelGeral === NORMAL) nivelGeral = LEVE
    linhas.push('VOCÊ DECLAROU HIPERTIREOIDISMO: DUAS ARMADILHAS NO PÓS-BARIÁTRICO. A PRIMEIRA É CONFUNDIR O EMAGRECIMENTO DA TIREOIDE ACELERADA COM O SUCESSO DA CIRURGIA — SÃO COISAS DIFERENTES E A PRIMEIRA PRECISA DE TRATAMENTO. A SEGUNDA É O OSSO: O EXCESSO DE HORMÔNIO TIREOIDIANO ACELERA A PERDA DE MASSA ÓSSEA, QUE JÁ É UM PONTO FRÁGIL DEPOIS DA CIRURGIA — OS DOIS EFEITOS SE SOMAM. MANTENHA O ACOMPANHAMENTO ENDOCRINOLÓGICO.')
    alertas.push({ codigo: 'hormonal.hipertireoidismo_declarado_o_emagrecimento_po', nivel: LEVE, texto: 'HIPERTIREOIDISMO DECLARADO — O EMAGRECIMENTO PODE NÃO SER SÓ DA CIRURGIA; E A PERDA ÓSSEA SOMA-SE À DO PÓS-BARIÁTRICO. ACOMPANHAMENTO ENDOCRINOLÓGICO.' })
    if (isNaN(tsh)) suger.push('TSH')
  }

  // TSH
  if (!isNaN(tsh)) {
    temAlgo = true
    linhas.push(`TSH: ${tsh} mcUI/mL`)
    if (tsh > REF.tsh.hipotireoidismo) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push('TSH ELEVADO: COMPATÍVEL COM HIPOTIREOIDISMO. NO BARIÁTRICO, O HIPOTIREOIDISMO PODE DIFICULTAR A PERDA DE PESO E AGRAVAR A ANEMIA. AVALIAÇÃO COM ENDOCRINOLOGISTA.')
      alertas.push({ codigo: 'hormonal.tsh_elevado', nivel: MODERADO, texto: `TSH ELEVADO: ${tsh} mcUI/mL — HIPOTIREOIDISMO. AVALIAR COM ENDOCRINOLOGISTA.` })
      suger.push('T4 LIVRE')
      suger.push('ANTI-TPO')
    } else if (tsh < REF.tsh.hipertireoidismo) {
      if (nivelGeral === NORMAL) nivelGeral = LEVE
      linhas.push('TSH SUPRIMIDO: COMPATÍVEL COM HIPERTIREOIDISMO OU USO DE LEVOTIROXINA EM DOSE EXCESSIVA. AVALIAÇÃO COM ENDOCRINOLOGISTA.')
      alertas.push({ codigo: 'hormonal.tsh_suprimido', nivel: LEVE, texto: `TSH SUPRIMIDO: ${tsh} mcUI/mL — AVALIAR HIPERTIREOIDISMO.` })
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
        alertas.push({ codigo: 'hormonal.tiroxina_em_uso_mas_tsh_ainda_alto_ajuste_de', nivel: MODERADO, texto: 'TIROXINA EM USO MAS TSH AINDA ALTO — AJUSTE DE DOSE NECESSÁRIO.' })
      } else if (tsh < REF.tsh.hipertireoidismo) {
        linhas.push('EM USO DE TIROXINA COM TSH SUPRIMIDO: DOSE EXCESSIVA. RISCO DE FIBRILAÇÃO ATRIAL E PERDA ÓSSEA. REDUZIR DOSE COM ENDOCRINOLOGISTA.')
        alertas.push({ codigo: 'hormonal.tiroxina_em_dose_excessiva_tsh_suprimido_ajus', nivel: MODERADO, texto: 'TIROXINA EM DOSE EXCESSIVA — TSH SUPRIMIDO. AJUSTAR.' })
      } else {
        linhas.push('EM USO DE TIROXINA COM TSH CONTROLADO: DOSE ADEQUADA. MANTER MONITORAMENTO SEMESTRAL.')
      }
    } else {
      linhas.push('EM USO DE TIROXINA SEM TSH DOSADO: SOLICITAR TSH PARA AJUSTE DE DOSE. NO BARIÁTRICO, A ABSORÇÃO PODE VARIAR E A DOSE PRÉ-CIRURGIA PODE SER INSUFICIENTE.')
      suger.push('TSH')
      alertas.push({ codigo: 'hormonal.tiroxina_em_uso_solicitar_tsh_para_controle', nivel: LEVE, texto: 'TIROXINA EM USO — SOLICITAR TSH PARA CONTROLE.' })
    }
  }

  // Testosterona masculina
  if (sexo === 'M' && !isNaN(testo)) {
    temAlgo = true
    linhas.push(`TESTOSTERONA TOTAL: ${testo} ng/dL`)
    if (testo < REF.testoM.baixo) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      if (fazTRT) {
        // Quem JÁ repõe não precisa "avaliar suplementação" — o achado é que a
        // reposição não está alcançando o alvo. SEM alerta próprio: o fato já foi
        // embutido no alerta único do contexto TRT (acima).
        linhas.push('TESTOSTERONA BAIXA APESAR DA REPOSIÇÃO: A DOSE OU O INTERVALO PODEM NÃO ESTAR ADEQUADOS — OU A COLETA FOI FEITA NO FIM DO CICLO (O NÍVEL CAI ANTES DA PRÓXIMA APLICAÇÃO). LEVE O RESULTADO AO PRESCRITOR E CONFIRME EM QUE MOMENTO DO CICLO O SANGUE FOI COLHIDO — ISSO MUDA A INTERPRETAÇÃO.')
      } else {
        linhas.push('TESTOSTERONA BAIXA (HIPOGONADISMO MASCULINO): CAUSA FREQUENTE EM BARIÁTRICOS. PODE RESULTAR DE DEFICIÊNCIA DE ZINCO, VITAMINA D E OBESIDADE RESIDUAL. SUPLEMENTAÇÃO DE TESTOSTERONA PODE AGRAVAR ERITROCITOSE E HAS — AVALIAÇÃO COM UROLOGISTA OU ENDOCRINOLOGISTA.')
        alertas.push({ codigo: 'hormonal.testosterona_baixa', nivel: MODERADO, texto: `TESTOSTERONA BAIXA: ${testo} ng/dL — AVALIAR HIPOGONADISMO.` })
        suger.push('LH, FSH, PROLACTINA')
      }
    } else if (testo > 900) {
      if (nivelGeral === NORMAL) nivelGeral = LEVE
      if (fazTRT) {
        // Não faz sentido "verificar uso de testosterona exógena" em quem já declarou
        // que repõe: aqui o achado é dose excessiva. SEM alerta próprio — o fato já
        // está no alerta único do contexto TRT (acima).
        linhas.push('TESTOSTERONA ACIMA DE 900 ng/dL EM USO DE REPOSIÇÃO: A DOSE ESTÁ ALTA. ISSO AUMENTA O RISCO DE ERITROCITOSE (SANGUE MAIS ESPESSO) — REVER DOSE E INTERVALO COM O PRESCRITOR, DE PREFERÊNCIA COM O HEMATÓCRITO EM MÃOS.')
        if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      } else {
        linhas.push('TESTOSTERONA ELEVADA (> 900 ng/dL): VERIFICAR USO DE ANABOLIZANTES OU TESTOSTERONA EXÓGENA. PODE PRODUZIR ERITROCITOSE.')
        alertas.push({ codigo: 'hormonal.testosterona_elevada_verificar_uso_de_anaboli', nivel: LEVE, texto: 'TESTOSTERONA ELEVADA — VERIFICAR USO DE ANABOLIZANTES.' })
      }
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
      if (fazTRH) {
        // Quem JÁ faz reposição não precisa "avaliar a indicação" — o achado aqui é
        // outro: a reposição não está alcançando o alvo (e no bariátrico a absorção
        // do comprimido é uma causa provável disso).
        linhas.push('ESTRADIOL BAIXO EM QUEM JÁ FAZ REPOSIÇÃO HORMONAL: A DOSE PODE NÃO ESTAR SENDO SUFICIENTE OU NÃO ESTAR SENDO BEM ABSORVIDA — E NO PÓS-BARIÁTRICO A ABSORÇÃO DO COMPRIMIDO É UMA CAUSA PROVÁVEL. LEVE ESTE RESULTADO AO SEU MÉDICO PARA REVER DOSE E VIA (O ADESIVO OU GEL NÃO DEPENDEM DO INTESTINO).')
        alertas.push({ codigo: 'hormonal.estradiol_baixo_apesar_da_reposicao_hormonal', nivel: LEVE, texto: 'ESTRADIOL BAIXO APESAR DA REPOSIÇÃO HORMONAL — REVER DOSE E VIA (A ABSORÇÃO ORAL É REDUZIDA NO PÓS-BARIÁTRICO; VIA TRANSDÉRMICA NÃO DEPENDE DO INTESTINO).' })
      } else {
        linhas.push('ESTRADIOL BAIXO EM MULHER ≥ 40 ANOS: COMPATÍVEL COM MENOPAUSA OU INSUFICIÊNCIA OVARIANA. AVALIAR INDICAÇÃO DE TERAPIA HORMONAL — IMPORTANTE PARA PREVENÇÃO DA OSTEOPOROSE NO CONTEXTO BARIÁTRICO.')
        alertas.push({ codigo: 'hormonal.estradiol_baixo_avaliar_indicacao_de_terapia', nivel: LEVE, texto: 'ESTRADIOL BAIXO — AVALIAR INDICAÇÃO DE TERAPIA HORMONAL NA MENOPAUSA.' })
        suger.push('FSH, LH (SE NÃO MENOPAUSA CONFIRMADA)')
      }
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
    // O corte "normal < 4" NÃO vale para todo homem. Quem fez PROSTATECTOMIA não tem
    // próstata para produzir PSA: o alvo é indetectável, e ≥0.2 é recidiva bioquímica.
    // Sem ler o status declarado, o motor dizia "PSA DENTRO DA NORMALIDADE" para um
    // operado com PSA 2 — falsa segurança em paciente oncológico.
    const trats = Array.isArray(dados.prostata_cancer_tratamentos) ? dados.prostata_cancer_tratamentos : []
    const temCaProstata = (dados.status_prostatico || []).includes('CÂNCER')
    const operado = temCaProstata && trats.includes('OPERADO')
    const radioterapia = temCaProstata && trats.includes('RADIOTERAPIA')

    if (!isNaN(psa)) {
      temAlgo = true
      linhas.push(`PSA TOTAL: ${psa} ng/mL`)
      if (operado) {
        if (psa >= 0.2) {
          nivelGeral = GRAVE
          linhas.push(`PSA ${psa} ng/mL DEPOIS DA CIRURGIA DE PRÓSTATA: ATENÇÃO — ESTE VALOR NÃO PODE SER LIDO PELA TABELA NORMAL. QUEM RETIROU A PRÓSTATA NÃO TEM DE ONDE PRODUZIR PSA, ENTÃO O ESPERADO É QUE ELE SEJA INDETECTÁVEL. QUALQUER VALOR A PARTIR DE 0,2 CARACTERIZA RECIDIVA BIOQUÍMICA E EXIGE AVALIAÇÃO UROLÓGICA/ONCOLÓGICA SEM DEMORA — MESMO PARECENDO "BAIXO" NUMA TABELA COMUM.`)
          alertas.push({ codigo: 'oncologico.ng_ml_em_paciente_prostatectomizado_recidiva', nivel: GRAVE, texto: `PSA ${psa} ng/mL EM PACIENTE PROSTATECTOMIZADO — RECIDIVA BIOQUÍMICA (O ALVO É INDETECTÁVEL, ≥0,2 JÁ É RECIDIVA). AVALIAÇÃO UROLÓGICA/ONCOLÓGICA SEM DEMORA. NÃO LER PELO CORTE DE 4 ng/mL.` })
          suger.push('AVALIAÇÃO COM UROLOGISTA/ONCOLOGISTA (RECIDIVA BIOQUÍMICA PÓS-PROSTATECTOMIA)')
        } else {
          linhas.push(`PSA ${psa} ng/mL DEPOIS DA CIRURGIA DE PRÓSTATA: INDETECTÁVEL OU MUITO BAIXO, QUE É EXATAMENTE O ESPERADO PARA QUEM RETIROU A PRÓSTATA. MANTENHA O SEGUIMENTO NA PERIODICIDADE COMBINADA COM O SEU UROLOGISTA — O QUE IMPORTA AQUI É A TENDÊNCIA AO LONGO DO TEMPO, NÃO UM VALOR ISOLADO.`)
        }
      } else if (radioterapia) {
        // Critério de Phoenix (nadir + 2) exige o nadir, que não coletamos — não dá
        // para decidir aqui; o que NÃO se pode é aplicar o corte de 4.
        linhas.push(`PSA ${psa} ng/mL APÓS RADIOTERAPIA DE PRÓSTATA: ESTE VALOR NÃO DEVE SER LIDO PELA TABELA COMUM (< 4). DEPOIS DA RADIOTERAPIA A PRÓSTATA CONTINUA NO LUGAR E O PSA NÃO ZERA — O CONTROLE É FEITO COMPARANDO COM O SEU MENOR VALOR JÁ ATINGIDO (O "NADIR"): UMA SUBIDA DE 2 PONTOS ACIMA DELE INDICA RECIDIVA. LEVE O HISTÓRICO DOS SEUS PSAs AO UROLOGISTA — SEM OS VALORES ANTERIORES, NENHUM PSA ISOLADO DIZ SE ESTÁ TUDO BEM.`)
        if (nivelGeral !== GRAVE) nivelGeral = MODERADO
        alertas.push({ codigo: 'oncologico.ng_ml_apos_radioterapia_nao_aplicar_o_corte_d', nivel: MODERADO, texto: `PSA ${psa} ng/mL APÓS RADIOTERAPIA — NÃO APLICAR O CORTE DE 4. O CONTROLE É PELO NADIR + 2 (CRITÉRIO DE PHOENIX): LEVAR O HISTÓRICO DE PSAs AO UROLOGISTA.` })
        suger.push('AVALIAÇÃO COM UROLOGISTA')
      } else if (psa > REF.psa.alto) {
        nivelGeral = GRAVE
        // Com câncer JÁ diagnosticado, mandar "biópsia" é fora de lugar: ele não
        // precisa de diagnóstico, precisa que a equipe dele veja este valor.
        linhas.push(temCaProstata
          ? 'PSA MUITO ELEVADO (> 10 ng/mL) COM CÂNCER DE PRÓSTATA JÁ DIAGNOSTICADO: ESTE VALOR PRECISA CHEGAR À SUA EQUIPE ONCOLÓGICA/UROLÓGICA SEM DEMORA — PODE INDICAR DOENÇA EM ATIVIDADE OU PROGRESSÃO.'
          : 'PSA MUITO ELEVADO (> 10 ng/mL): RISCO AUMENTADO DE CÂNCER DE PRÓSTATA. AVALIAÇÃO UROLÓGICA URGENTE COM BIÓPSIA.')
        alertas.push({ codigo: 'oncologico.psa_muito_elevado', nivel: GRAVE, texto: `PSA MUITO ELEVADO: ${psa} ng/mL — AVALIAÇÃO UROLÓGICA URGENTE.${temCaProstata ? ' CÂNCER JÁ DIAGNOSTICADO: LEVAR À EQUIPE (POSSÍVEL ATIVIDADE/PROGRESSÃO).' : ''}` })
        suger.push('AVALIAÇÃO COM UROLOGISTA')
        if (!temCaProstata) suger.push('PSA LIVRE / PSA TOTAL RATIO')
      } else if (psa > REF.psa.normal) {
        if (nivelGeral !== GRAVE) nivelGeral = MODERADO
        linhas.push(temCaProstata
          ? 'PSA ENTRE 4 E 10 ng/mL COM CÂNCER DE PRÓSTATA JÁ DIAGNOSTICADO: LEVE ESTE VALOR AO SEU UROLOGISTA/ONCOLOGISTA — EM QUEM JÁ TEM O DIAGNÓSTICO, O QUE IMPORTA É A COMPARAÇÃO COM OS SEUS EXAMES ANTERIORES, NÃO A TABELA.'
          : 'PSA ELEVADO (4–10 ng/mL): ZONA CINZENTA. AVALIAÇÃO COM UROLOGISTA E CONSIDERAR PSA LIVRE, RESSONÂNCIA DE PRÓSTATA E BIÓPSIA.')
        alertas.push({ codigo: 'oncologico.psa_elevado', nivel: MODERADO, texto: `PSA ELEVADO: ${psa} ng/mL — AVALIAÇÃO UROLÓGICA NECESSÁRIA.` })
        suger.push('AVALIAÇÃO COM UROLOGISTA')
        if (!temCaProstata) suger.push('PSA LIVRE')
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
        alertas.push({ codigo: 'oncologico.ca_19_9_elevado', nivel: MODERADO, texto: `CA 19-9 ELEVADO: ${ca199} U/mL — INVESTIGAR NEOPLASIA ABDOMINAL.` })
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
        alertas.push({ codigo: 'oncologico.cea_elevado', nivel: MODERADO, texto: `CEA ELEVADO: ${cea} ng/mL — INVESTIGAR NEOPLASIA.` })
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
// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO — IDEAÇÃO SUICIDA (queixa)
// Situação crítica: alerta GRAVE (leva o Estado Geral a CRÍTICO) + módulo acolhedor
// com recursos de crise e encaminhamento. Texto visível ao paciente — tom de apoio.
// ─────────────────────────────────────────────────────────────────────────────
function buildModIdeacao(dados, alertas, suger) {
  const qs = [dados.queixa_principal, ...(dados.queixas_secundarias || [])]
  if (!qs.includes('IDEAÇÃO SUICIDA')) return null
  alertas.push({ codigo: 'ideacao.ideacao_suicida_relatada_situacao_critica_aju', nivel: GRAVE, texto: 'IDEAÇÃO SUICIDA RELATADA — SITUAÇÃO CRÍTICA. AJUDA IMEDIATA: CVV 188 (24H) / EMERGÊNCIA 192. ENCAMINHAMENTO URGENTE A PSIQUIATRA/PSICÓLOGO.' })
  suger.push('AVALIAÇÃO PSIQUIÁTRICA URGENTE')
  return {
    id: 'ideacao',
    titulo: 'SAÚDE MENTAL — IDEAÇÃO SUICIDA',
    nivel: GRAVE,
    // Texto de apoio em caixa NORMAL (de propósito) — tom acolhedor num tema sensível,
    // destacado dos demais módulos (que são em caixa alta clínica).
    linhas: [
      'Você relatou pensamentos de morte ou de se machucar — obrigado pela coragem de registrar. Isso é levado a sério e tem tratamento.',
      'No pós-bariátrico, o risco de depressão e de ideação suicida é maior. Não é fraqueza: é uma condição que precisa de cuidado.',
      'Procure ajuda agora se precisar: CVV 188 (ligação gratuita, 24h) ou emergência 192. Recomendamos fortemente uma avaliação com psiquiatra ou psicólogo o quanto antes.',
    ],
  }
}

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

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO — INFECÇÕES CRÔNICAS
// Em regra é só módulo; DUAS excecoes geram ALERTA (entram no Estado Geral):
// HTLV I/II ativo (GRAVE) e Epstein-Barr crônico ativo (MODERADO). O nível do card
// é o pior item. Os sub-estados (em tratamento/resolvido/crônica/ativa) vêm do form.
// ─────────────────────────────────────────────────────────────────────────────
function buildModInfeccoes(dados, alertas) {
  const inf = dados.infeccoes_cronicas || []
  if (!inf.length) return null
  const has = (x) => inf.includes(x)

  const RANK = { [GRAVE]: 3, [MODERADO]: 2, [LEVE]: 1, [NORMAL]: 0 }
  let nivel = NORMAL
  const bump = (n) => { if (RANK[n] > RANK[nivel]) nivel = n }

  const linhas = []

  // Nota geral (anemia de doença crônica confunde a leitura do eritron)
  linhas.push('INFECÇÕES CRÔNICAS PODEM CAUSAR ANEMIA DE DOENÇA CRÔNICA (INFLAMATÓRIA), QUE ÀS VEZES MASCARA A DEFICIÊNCIA DE FERRO — IMPORTANTE INTERPRETAR O ERITRON NESSE CONTEXTO.')

  if (has('HEPATITE B')) {
    if (dados.hepb_status === 'RESOLVIDO') {
      bump(LEVE)
      linhas.push('HEPATITE B (RESOLVIDA): MANTENHA VIGILÂNCIA — PODE REATIVAR EM IMUNOSSUPRESSÃO.')
    } else {
      bump(MODERADO)
      linhas.push('HEPATITE B' + (dados.hepb_status === 'EM TRATAMENTO' ? ' (EM TRATAMENTO)' : '') + ': MANTENHA O ACOMPANHAMENTO HEPATOLÓGICO E O ANTIVIRAL; MONITORE A FUNÇÃO HEPÁTICA E O HEMOGRAMA (A HEPATITE E ALGUNS ANTIVIRAIS AFETAM O ERITRON).')
    }
  }

  if (has('HEPATITE C')) {
    if (dados.hepc_status === 'RESOLVIDO') {
      bump(LEVE)
      linhas.push('HEPATITE C (RESOLVIDA/CURADA): MANTENHA O SEGUIMENTO.')
    } else {
      bump(MODERADO)
      linhas.push('HEPATITE C' + (dados.hepc_status === 'EM TRATAMENTO' ? ' (EM TRATAMENTO)' : '') + ': A HEPATITE C HOJE É CURÁVEL COM ANTIVIRAIS DE AÇÃO DIRETA — GARANTA O TRATAMENTO. MONITORE FÍGADO E HEMOGRAMA (ASSOCIAÇÃO COM CRIOGLOBULINEMIA, CITOPENIAS E LINFOMA).')
    }
  }

  if (has('HIV')) {
    bump(MODERADO)
    linhas.push('HIV' + (dados.hiv_tratamento ? ' (EM TRATAMENTO)' : '') + ': MANTENHA A TARV E A CARGA VIRAL INDETECTÁVEL. VÁRIOS ANTIRRETROVIRAIS CAUSAM MACROCITOSE/ANEMIA — CORRELACIONE COM O ERITRON E COM AS CARÊNCIAS DO BARIÁTRICO.')
  }

  if (has('HERPES SIMPLES')) {
    bump(LEVE)
    linhas.push('HERPES SIMPLES' + (dados.herpes_simples_aciclovir ? ' (ACICLOVIR SUPRESSIVO)' : '') + ': O ACICLOVIR SUPRESSIVO É ADEQUADO PARA RECORRÊNCIAS FREQUENTES; SEM IMPLICAÇÃO NUTRICIONAL RELEVANTE.')
  }

  if (has('HERPES-ZÓSTER')) {
    const hz = dados.herpes_zoster || []
    if (hz.includes('MAIS DE UM EPISÓDIO')) {
      bump(MODERADO)
      linhas.push('HERPES-ZÓSTER RECORRENTE (MAIS DE UM EPISÓDIO): INCOMUM — SUGERE IMUNIDADE COMPROMETIDA. INVESTIGAR CAUSAS (INCLUINDO HIV E NEOPLASIAS) E CORRELACIONAR COM DEFICIÊNCIAS DO BARIÁTRICO. VACINA (SHINGRIX) RECOMENDADA.')
    } else {
      bump(LEVE)
      linhas.push('HERPES-ZÓSTER: ' + (hz.includes('TOMEI VACINA') ? 'VACINAÇÃO EM DIA. ' : 'CONSIDERAR A VACINA (SHINGRIX). ') + 'MANTENHA O ACOMPANHAMENTO.')
    }
  }

  if (has('DOENÇA DE LYME (BORRELIOSE)')) {
    if (dados.borreliose_status === 'CRÔNICA') {
      bump(MODERADO)
      linhas.push('DOENÇA DE LYME (BORRELIOSE) CRÔNICA: CURSA COM FADIGA E DORES QUE SE CONFUNDEM COM FIBROMIALGIA E COM AS CARÊNCIAS DO BARIÁTRICO — CORRELACIONE; SIGA COM INFECTOLOGISTA.')
    } else {
      bump(LEVE)
      linhas.push('DOENÇA DE LYME (BORRELIOSE)' + (dados.borreliose_status === 'RESOLVIDA' ? ' (RESOLVIDA)' : '') + ': MANTENHA O SEGUIMENTO.')
    }
  }

  if (has('HPV')) {
    const hpv = dados.hpv_estado || []
    if (hpv.includes('DOENÇA ATIVA')) {
      bump(MODERADO)
      linhas.push('HPV (DOENÇA ATIVA): EXIGE RASTREIO CONFORME O SÍTIO (COLPOCITOLOGIA ETC.) PELO RISCO ONCOLÓGICO. VACINA RECOMENDADA.')
    } else {
      bump(LEVE)
      linhas.push('HPV' + (hpv.includes('RESOLVIDO') ? ' (RESOLVIDO)' : (hpv.includes('TOMEI VACINA | ESTOU MELHOR') ? ' (VACINADO / EM MELHORA)' : '')) + ': MANTENHA O RASTREIO PREVENTIVO.')
    }
  }

  if (has('PAPILOMATOSE DO LARINGE')) {
    bump(MODERADO)
    linhas.push('PAPILOMATOSE DO LARINGE: REQUER ACOMPANHAMENTO COM OTORRINOLARINGOLOGISTA (RISCO DE OBSTRUÇÃO DE VIA AÉREA E DE TRANSFORMAÇÃO); RELACIONADA AO HPV.')
  }

  if (has('MOLUSCO CONTAGIOSO')) {
    bump(LEVE)
    linhas.push('MOLUSCO CONTAGIOSO: BENIGNO; SE EXTENSO OU PERSISTENTE NO ADULTO, INVESTIGAR IMUNIDADE (INCLUI HIV).')
  }

  if (has('EPSTEIN-BARR')) {
    if (dados.ebv_status === 'CRÔNICA') {
      bump(MODERADO)
      linhas.push('EPSTEIN-BARR CRÔNICO ATIVO: RARO E RELEVANTE (ASSOCIAÇÃO COM SÍNDROMES LINFOPROLIFERATIVAS) — AVALIAÇÃO COM HEMATOLOGISTA/INFECTOLOGISTA.')
      alertas.push({ codigo: 'infeccoes.epstein_barr_cronico_ativo_avaliacao_com_hema', nivel: MODERADO, texto: 'EPSTEIN-BARR CRÔNICO ATIVO — AVALIAÇÃO COM HEMATOLOGISTA/INFECTOLOGISTA (RISCO LINFOPROLIFERATIVO).' })
    } else {
      bump(LEVE)
      linhas.push('EPSTEIN-BARR' + (dados.ebv_status === 'RESOLVIDA' ? ' (RESOLVIDA)' : '') + ': MONONUCLEOSE PRÉVIA — SEM IMPLICAÇÃO ATUAL.')
    }
  }

  if (has('HTLV I/II')) {
    if (dados.htlv_ativa) {
      bump(GRAVE)
      linhas.push('HTLV I/II (DOENÇA ATIVA): RELEVÂNCIA HEMATOLÓGICA DIRETA — ASSOCIAÇÃO COM LEUCEMIA/LINFOMA DE CÉLULAS T DO ADULTO E COM MIELOPATIA (HAM/TSP). SEGUIMENTO COM HEMATOLOGISTA E INFECTOLOGISTA. NÃO DOE SANGUE NEM ÓRGÃOS; ATENÇÃO À TRANSMISSÃO PELA AMAMENTAÇÃO.')
      alertas.push({ codigo: 'infeccoes.htlv_i_ii_ativo_avaliacao_hematologica_risco', nivel: GRAVE, texto: 'HTLV I/II ATIVO — AVALIAÇÃO HEMATOLÓGICA (RISCO DE LEUCEMIA/LINFOMA T E MIELOPATIA).' })
    } else {
      bump(MODERADO)
      linhas.push('HTLV I/II: RELEVÂNCIA HEMATOLÓGICA — SEGUIMENTO COM HEMATOLOGISTA/INFECTOLOGISTA; NÃO DOAR SANGUE NEM ÓRGÃOS.')
    }
  }

  // Cruzamento com os hábitos: doador de sangue + infecção transmissível
  const doador = (dados.habitos_sociais || []).includes('SOU DOADOR DE SANGUE')
  const transmissivel = has('HEPATITE B') || has('HEPATITE C') || has('HIV') || has('HTLV I/II')
  if (doador && transmissivel) {
    bump(MODERADO)
    linhas.push('VOCÊ SE DECLAROU DOADOR DE SANGUE E TEM INFECÇÃO TRANSMISSÍVEL (HEPATITE B/C, HIV OU HTLV) — ESSAS CONDIÇÕES CONTRAINDICAM A DOAÇÃO DE SANGUE.')
  }

  return { id: 'infeccoes', titulo: 'INFECÇÕES CRÔNICAS', nivel, linhas }
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
    alertas.push({ codigo: 'comportamental.compulsao_por_alcool_no_pos_bariatrico_transf', nivel: GRAVE, texto: 'COMPULSÃO POR ÁLCOOL no pós-bariátrico (transferência de adição) — avaliação com psiquiatra e grupo de apoio.' })
    suger.push('AVALIAÇÃO COM PSIQUIATRA (compulsão por álcool)')
  }

  // CANNABIS como COMPULSÃO — era órfã (este módulo tratava álcool/doces/comida/gelo/
  // compras/jogo, nunca cannabis nem cigarro). MODERADO por decisão do Dr. Ramos, mesmo
  // peso do tabagismo. Cuidado: cannabis MEDICINAL é outra coisa e a plataforma até
  // oferece prescritor (status_fibromialgia) — o texto separa uso de perda de controle.
  if (compulsoes.includes('CANNABIS')) {
    temAlgo = true
    if (nivelGeral !== GRAVE) nivelGeral = MODERADO
    const usaMedicinal = (dados.status_fibromialgia || []).includes('EM USO DE CANNABIS MEDICINAL')
    linhas.push('COMPULSÃO POR CANNABIS: NO PÓS-BARIÁTRICO, ISSO PODE SER TRANSFERÊNCIA DE ADIÇÃO — O MESMO MECANISMO DO ÁLCOOL, EM QUE O COMPORTAMENTO COMPULSIVO COM A COMIDA MIGRA PARA OUTRA SUBSTÂNCIA. AVALIAÇÃO COM PSIQUIATRA/PSICÓLOGO.')
    linhas.push('DOIS PONTOS ESPECÍFICOS DO SEU CASO: (1) A CANNABIS AUMENTA O APETITE — É FATOR DE RISCO DIRETO PARA REGANHO DE PESO; (2) SE VOCÊ TEM VÔMITOS CÍCLICOS OU NÁUSEAS QUE VÃO E VOLTAM, SAIBA QUE O USO CRÔNICO PODE CAUSAR A SÍNDROME DE HIPEREMESE CANABINOIDE — QUE NO BARIÁTRICO É FACILMENTE CONFUNDIDA COM DUMPING OU COM ESTENOSE DA ANASTOMOSE, E LEVA A INVESTIGAÇÃO E TRATAMENTO ERRADOS. INFORME O SEU MÉDICO SOBRE O USO.')
    if (usaMedicinal) {
      // Evita a contradição com a linha "os canabinóides são os medicamentos mais
      // poderosos..." do módulo fibromiálgico, que ela lê no mesmo relatório.
      linhas.push('VOCÊ TAMBÉM REGISTROU USO DE CANNABIS MEDICINAL: AS DUAS COISAS NÃO SE ANULAM. O CANABINOIDE PRESCRITO E ACOMPANHADO TEM PAPEL TERAPÊUTICO RECONHECIDO (VEJA O CARD DO STATUS FIBROMIÁLGICO) — O QUE ESTÁ EM QUESTÃO AQUI NÃO É A SUBSTÂNCIA, É A PERDA DE CONTROLE SOBRE O USO. LEVE ESSE PONTO AO MÉDICO QUE ACOMPANHA A SUA PRESCRIÇÃO: DOSE, VIA E FINALIDADE PRECISAM SER REVISTAS COM ELE, NÃO AJUSTADAS POR CONTA PRÓPRIA.')
    }
    alertas.push({ codigo: 'comportamental.compulsao_por_cannabis_no_pos_bariatrico_poss', nivel: MODERADO, texto: `COMPULSÃO POR CANNABIS no pós-bariátrico (possível transferência de adição) — aumenta o apetite (risco de reganho) e o uso crônico pode causar hiperemese canabinoide, confundível com dumping/estenose.${usaMedicinal ? ' Paciente também em uso MEDICINAL: revisar dose/finalidade com o prescritor (o problema é a perda de controle, não a substância).' : ''}` })
    suger.push('AVALIAÇÃO COM PSIQUIATRA (compulsão por cannabis)')
  }

  if (compulsoes.includes('DOCES') || compulsoes.includes('COMIDA')) {
    temAlgo = true
    if (nivelGeral !== GRAVE) nivelGeral = MODERADO
    linhas.push('COMPULSÃO ALIMENTAR POR DOCES OU COMIDA: FATOR DE RISCO PARA REGANHO DE PESO. AVALIAÇÃO COM PSICÓLOGO/PSIQUIATRA ESPECIALIZADO EM COMPULSÃO ALIMENTAR. SÍNDROME DE DUMPING TARDIA PODE MIMETIZAR COMPULSÃO POR DOCES.')
    alertas.push({ codigo: 'comportamental.compulsao_alimentar_doces_comida_fator_de_ris', nivel: MODERADO, texto: 'COMPULSÃO ALIMENTAR (doces/comida) — fator de risco para reganho de peso; avaliação especializada.' })
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
    alertas.push({ codigo: 'comportamental.compulsao_por_compras_oniomania_possivel_tran', nivel: MODERADO, texto: 'COMPULSÃO POR COMPRAS (oniomania) — possível transferência de adição; impacto sobre finanças pessoais, risco de endividamento e do orçamento familiar; avaliação psicológica/psiquiátrica.' })
    suger.push('AVALIAÇÃO COM PSICÓLOGO/PSIQUIATRA (compulsão por compras)')
  }

  if (compulsoes.includes('JOGO')) {
    temAlgo = true
    if (nivelGeral !== GRAVE) nivelGeral = MODERADO
    linhas.push('COMPULSÃO POR JOGO (JOGO PATOLÓGICO / LUDOMANIA): PODE REPRESENTAR TRANSFERÊNCIA DE ADIÇÃO NO PÓS-BARIÁTRICO, EM QUE O COMPORTAMENTO ALIMENTAR COMPULSIVO É SUBSTITUÍDO POR OUTRO COMPORTAMENTO COMPULSIVO. ALÉM DO SOFRIMENTO PSÍQUICO, TEM IMPACTO NEGATIVO SOBRE AS FINANÇAS PESSOAIS, COM RISCO DE ENDIVIDAMENTO EXCESSIVO, COMPROMETIMENTO DOS RECURSOS NECESSÁRIOS AO INVESTIMENTO NA PRÓPRIA SAÚDE (CONSULTAS, EXAMES E SUPLEMENTAÇÃO) E IMPACTO DELETÉRIO SOBRE O ORÇAMENTO FAMILIAR. AVALIAÇÃO COM PSICÓLOGO/PSIQUIATRA E ENCAMINHAMENTO PARA GRUPO DE APOIO (JOGADORES ANÔNIMOS).')
    alertas.push({ codigo: 'comportamental.compulsao_por_jogo_ludomania_possivel_transfe', nivel: MODERADO, texto: 'COMPULSÃO POR JOGO (ludomania) — possível transferência de adição; impacto sobre finanças pessoais, risco de endividamento e do orçamento familiar; avaliação psicológica/psiquiátrica.' })
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
      alertas.push({ codigo: 'comportamental.topiramato_em_gestante_teratogenico_suspender', nivel: GRAVE, texto: 'TOPIRAMATO EM GESTANTE — TERATOGÊNICO. SUSPENDER IMEDIATAMENTE.' })
    }
    suger.push('FUNÇÃO RENAL E BICARBONATO SÉRICO (TOPIRAMATO)')
    suger.push('ULTRASSONOGRAFIA RENAL (RASTREIO DE LITÍASE — TOPIRAMATO)')
  }

  // Cirurgia plástica pós-bariátrica — reformado (pedido do Dr. Ramos): 1 status
  // (fiz/desejo/preciso muito/programada) em vez do checkbox booleano antigo,
  // porque a necessidade de reservas de ferro/B12, bom estado metabólico-
  // cardiovascular e boa hemostasia varia MUITO conforme a situação. FIZ abre
  // "há quanto tempo" (o corpo pode ainda estar se recuperando de um porte
  // grande); PROGRAMADA abre "já está preparado(a)?" — o cenário mais urgente
  // de todos é ter data marcada e reservas ainda não repostas.
  const statusPlastica = dados.status_cirurgia_plastica || ''
  if (statusPlastica === 'FIZ') {
    temAlgo = true
    const tempoPlastica = dados.cirurgia_plastica_tempo || ''
    linhas.push('CIRURGIA PLÁSTICA PÓS-BARIÁTRICA: O DESEJO DE REALIZÁ-LA REFLETE AUTOESTIMA PRESERVADA E DEVE SER VALORIZADO. SÃO PROCEDIMENTOS DE GRANDE PORTE — ÀS VEZES MAIS DE UMA INTERVENÇÃO, COM RISCOS ACUMULADOS —, QUE DEMANDAM BOAS RESERVAS DE FERRO E VITAMINA B12, BOM ESTADO METABÓLICO, CARDIOVASCULAR E BOA HEMOSTASIA.')
    if (tempoPlastica === '<6M') {
      nivelGeral = GRAVE
      linhas.push('CIRURGIA REALIZADA HÁ MENOS DE 6 MESES: É IMPERATIVO CONHECER O SEU ESTADO METABÓLICO, HEMATOLÓGICO E DE RESERVAS ATUAL — O ORGANISMO PODE AINDA ESTAR SE RECUPERANDO DE UM PROCEDIMENTO DE GRANDE PORTE.')
      alertas.push({ codigo: 'comportamental.cirurgia_plastica_feita_menos_6m_imperativo', nivel: GRAVE, texto: 'CIRURGIA PLÁSTICA PÓS-BARIÁTRICA há menos de 6 meses — imperativo conhecer o estado metabólico, hematológico e de reservas.' })
      suger.push('FERRITINA E SATURAÇÃO DA TRANSFERRINA')
      suger.push('VITAMINA B12 SÉRICA')
      suger.push('ALBUMINA SÉRICA (MONITORAMENTO PROTEICO)')
      suger.push('AVALIAÇÃO CARDIOLÓGICA')
      suger.push('TEMPO DE PROTROMBINA (TP/INR)')
    } else if (tempoPlastica === '6M_1A') {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push('CIRURGIA REALIZADA ENTRE 6 MESES E 1 ANO ATRÁS: É IMPORTANTE AVALIAR A SUA SITUAÇÃO CLÍNICA ATUAL.')
      alertas.push({ codigo: 'comportamental.cirurgia_plastica_feita_6m_a_1a_importante', nivel: MODERADO, texto: 'CIRURGIA PLÁSTICA PÓS-BARIÁTRICA entre 6 meses e 1 ano atrás — importante avaliar a situação clínica atual.' })
      suger.push('FERRITINA E SATURAÇÃO DA TRANSFERRINA')
      suger.push('VITAMINA B12 SÉRICA')
    } else if (tempoPlastica === '>1A') {
      if (nivelGeral === NORMAL) nivelGeral = LEVE
      linhas.push('CIRURGIA REALIZADA HÁ MAIS DE 1 ANO: VOCÊ JÁ DEVE ESTAR ADAPTADO(A), MAS É RECOMENDÁVEL CHECAR O SEU ESTADO ATUAL.')
    } else if (nivelGeral === NORMAL) {
      nivelGeral = LEVE
    }
  } else if (statusPlastica === 'DESEJO') {
    temAlgo = true
    if (nivelGeral === NORMAL) nivelGeral = LEVE
    linhas.push('DESEJO DE FAZER CIRURGIA PLÁSTICA PÓS-BARIÁTRICA: O DESEJO REFLETE AUTOESTIMA PRESERVADA E DEVE SER VALORIZADO. É PRECISO UM PREPARO PRÉ-CIRÚRGICO: 3 MESES ANTES DA CIRURGIA VOCÊ DEVE SER AVALIADO(A) E FAZER AS REPOSIÇÕES NECESSÁRIAS (FERRO, B12, VITAMINA D, PROTEÍNAS); 2 SEMANAS ANTES DA CIRURGIA, FAZER OS EXAMES PRÉ-OPERATÓRIOS.')
  } else if (statusPlastica === 'PRECISO_MUITO') {
    temAlgo = true
    if (nivelGeral !== GRAVE) nivelGeral = MODERADO
    linhas.push('NECESSIDADE IMPORTANTE DE CIRURGIA PLÁSTICA PÓS-BARIÁTRICA: PODE REFLETIR DESCONFORTO FÍSICO (INTERTRIGO, DIFICULDADE DE HIGIENE, DOR) OU SOFRIMENTO PSICOLÓGICO RELEVANTE COM O EXCESSO DE PELE — MERECE ACOLHIMENTO E ENCAMINHAMENTO. É PRECISO GARANTIR AS REPOSIÇÕES DE FERRO, B12, VITAMINA D E PROTEÍNAS ANTES DE UM PROCEDIMENTO DE GRANDE PORTE.')
    alertas.push({ codigo: 'comportamental.cirurgia_plastica_precisa_muito_reposicoes', nivel: MODERADO, texto: 'PACIENTE RELATA NECESSIDADE IMPORTANTE de cirurgia plástica pós-bariátrica — garantir reposições (ferro/B12/vit D/proteínas) antes do procedimento.' })
    suger.push('FERRITINA E SATURAÇÃO DA TRANSFERRINA')
    suger.push('VITAMINA B12 SÉRICA')
  } else if (statusPlastica === 'PROGRAMADA') {
    temAlgo = true
    const preparado = dados.cirurgia_plastica_preparado || ''
    linhas.push('CIRURGIA PLÁSTICA PÓS-BARIÁTRICA JÁ PROGRAMADA: É PRECISO UM PREPARO PRÉ-CIRÚRGICO: 3 MESES ANTES DA CIRURGIA VOCÊ DEVE SER AVALIADO(A) E FAZER AS REPOSIÇÕES NECESSÁRIAS (FERRO, B12, VITAMINA D, PROTEÍNAS); 2 SEMANAS ANTES DA CIRURGIA, FAZER OS EXAMES PRÉ-OPERATÓRIOS.')
    if (preparado === 'NAO') {
      nivelGeral = GRAVE
      linhas.push('VOCÊ INFORMOU QUE AINDA NÃO ESTÁ PREPARADO(A): COM A CIRURGIA JÁ PROGRAMADA, É IMPERATIVO ACERTAR O PASSO O QUANTO ANTES — AS RESERVAS PRECISAM ESTAR RECUPERADAS/ESTABELECIDAS ANTES DE UM PROCEDIMENTO DE GRANDE PORTE.')
      alertas.push({ codigo: 'comportamental.cirurgia_plastica_programada_sem_preparo', nivel: GRAVE, texto: 'CIRURGIA PLÁSTICA PÓS-BARIÁTRICA JÁ PROGRAMADA e paciente relata NÃO estar preparado(a) — acertar reposições com urgência.' })
      suger.push('FERRITINA E SATURAÇÃO DA TRANSFERRINA')
      suger.push('VITAMINA B12 SÉRICA')
      suger.push('ALBUMINA SÉRICA (MONITORAMENTO PROTEICO)')
      suger.push('AVALIAÇÃO CARDIOLÓGICA')
      suger.push('TEMPO DE PROTROMBINA (TP/INR)')
    } else if (preparado === 'SIM') {
      if (nivelGeral === NORMAL) nivelGeral = LEVE
      linhas.push('VOCÊ INFORMOU QUE JÁ ESTÁ PREPARADO(A), COM AS RESERVAS RECUPERADAS/ESTABELECIDAS — ÓTIMO. MANTENHA O ACOMPANHAMENTO ATÉ A DATA DA CIRURGIA.')
    } else {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push('CONFIRME COM O SEU MÉDICO SE JÁ ESTÁ PREPARADO(A), COM AS RESERVAS RECUPERADAS/ESTABELECIDAS PARA A CIRURGIA JÁ PROGRAMADA.')
      alertas.push({ codigo: 'comportamental.cirurgia_plastica_programada_preparo_nao_infor', nivel: MODERADO, texto: 'CIRURGIA PLÁSTICA PÓS-BARIÁTRICA JÁ PROGRAMADA — confirmar com o paciente se as reservas já estão recuperadas/estabelecidas.' })
    }
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
    alertas.push({ codigo: 'gestacional.engravidou_antes_de_18_meses_da_cirurgia_reco', nivel: GRAVE, texto: 'ENGRAVIDOU ANTES DE 18 MESES DA CIRURGIA — RECOMENDAÇÃO CRÍTICA INFRINGIDA. ALERTE O SEU OBSTETRA.' })
  } else {
    linhas.push('GRAVIDEZ APÓS 18 MESES DA CIRURGIA: RISCO RELATIVO MENOR, MAS ACOMPANHAMENTO ESPECIALIZADO AINDA NECESSÁRIO. GRAVIDEZ PÓS-BARIÁTRICA É CONSIDERADA DE ALTO RISCO OBSTÉTRICO.')
    alertas.push({ codigo: 'gestacional.gravidez_pos_bariatrica_pre_natal_de_alto_ris', nivel: GRAVE, texto: 'GRAVIDEZ PÓS-BARIÁTRICA — PRÉ-NATAL DE ALTO RISCO OBRIGATÓRIO.' })
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
      alertas.push({ codigo: 'obstetrico.grande_multipara', nivel: MODERADO, texto: `GRANDE MULTÍPARA (${n} gestações): depleção cumulativa de ferro — reforçar reposição.` })
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
    alertas.push({ codigo: 'obstetrico.abortamentos_espontaneos_de_repeticao_2_infor', nivel: repeticao ? GRAVE : MODERADO, texto: repeticao
      ? 'ABORTAMENTOS ESPONTÂNEOS DE REPETIÇÃO (≥2) — INFORMAÇÃO CRÍTICA. INFORME O SEU OBSTETRA; INDICADA AVALIAÇÃO COM HEMATOLOGISTA.'
      : 'ABORTAMENTO ESPONTÂNEO — INFORME O SEU OBSTETRA; CONSIDERE AVALIAÇÃO COM HEMATOLOGISTA.' })
    suger.push('AVALIAÇÃO PARA TROMBOFILIA (SE ABORTAMENTOS DE REPETIÇÃO)')
    suger.push('AVALIAÇÃO COM HEMATOLOGISTA')   // era 'TELECONSULTA COM...' — caía no card errado (não casa ^AVALIA)
  }

  return { id: 'obstetrico', titulo: 'HISTÓRIA OBSTÉTRICA', nivel, linhas }
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO — GINECOLÓGICO
// Duas partes: (A) SANGRAMENTO MENSTRUAL — a perda de ferro que soma à disabsorção
// bariátrica, eixo central do algoritmo; (B) os demais achados do Status
// Ginecológico (endometriose, miomas, SOP, cistos/câncer de mama, mola), que em
// grande parte são CAUSA do sangramento de (A) — por isso convivem no mesmo card.
//
// RÉGUA DO SANGRAMENTO (Dr. Ramos, jul/2026): a perda de ferro é intensidade ×
// duração × persistência × frequência — quem decide o CRÍTICO é o TEMPO, não o tipo.
//   ≥1 fator de perda (fluxo intenso | duração >7 dias | ciclos <21 dias)
//     PERSISTINDO há ≥4 meses                → GRAVE (Estado Geral → CRÍTICO)
//   ≥2 fatores com persistência NÃO informada → GRAVE (conservador — não rebaixar
//     o que a régua antiga já tratava como grave só porque falta o dado)
//   qualquer outro caso (inclusive intenso mas RECENTE, <4 meses) → MODERADO
//   + anemia OU ferritina baixa → escala (MODERADO vira GRAVE)
// Dois ramos SUBSTITUEM essa régua (não é menstruação): GRÁVIDA (emergência, alerta
// próprio no topo do avaliarOBA) e MENOPAUSA (red flag de endométrio, GRAVE sempre).
// As strings abaixo têm que bater 1:1 com as *_OPS do OBAModal.
// ─────────────────────────────────────────────────────────────────────────────
const GINECO_DURACAO_LONGA = ['DE 8 A 10 DIAS', 'MAIS DE 10 DIAS']
const GINECO_PERSISTENTE   = ['DE 4 A 8 MESES', 'MAIS DE 8 MESES']
const GINECO_RECENTE       = ['MENOS DE 2 MESES', 'DE 2 A 4 MESES']
const GINECO_CICLO_CURTO   = 'MENOS DE 21 DIAS'

function buildModGinecologico(dados, resultadoEritron, examesOBA, alertas, suger) {
  if ((dados.sexo || 'F') !== 'F') return null
  const gin = dados.status_ginecologico || []
  if (!gin.length) return null
  const tem = (x) => gin.includes(x)

  const RANK = { [GRAVE]: 3, [MODERADO]: 2, [LEVE]: 1, [NORMAL]: 0 }
  let nivel = NORMAL
  const bump = (n) => { if (RANK[n] > RANK[nivel]) nivel = n }
  const linhas = []

  // Cruzamento com o ferro (mesma cadeia de fallback do resto do motor: eritron
  // primeiro, depois os valores relançados na etapa de exames do OBA).
  const ferr = Number(resultadoEritron?.inputs?.ferritina ?? examesOBA?.ferritina_novo ?? examesOBA?.ferritina_oba)
  const ferrBaixa = Number.isFinite(ferr) && ferr > 0 && ferr < OBA_CUTOFFS.ferritina_oba.min
  const temAnemia = /ANEMIA|ANÊMIC/i.test(resultadoEritron?.label || '') || resultadoEritron?.color === 'red'
  const somaFerro = ferrBaixa || temAnemia
  const textoFerro = temAnemia ? 'ANEMIA NO ERITRON' : `FERRITINA ${ferr} ng/mL, ABAIXO DE ${OBA_CUTOFFS.ferritina_oba.min}`

  // Exames: as seções só REGISTRAM o que precisam; a consolidação é feita uma vez no
  // fim. Empurrar direto de cada seção gerava até 4 linhas ginecológicas quase
  // iguais no mesmo relatório ("por que dois ultrassons pélvicos?").
  const need = { motivos: [], usPelvico: false, usTransvaginal: false, betaHcg: false, prioritaria: false }

  // ── (A) SANGRAMENTO ────────────────────────────────────────────────────────
  // Grávida: o alerta de emergência do topo do avaliarOBA já cobre; falar de perda
  // menstrual aqui seria contraditório. Os achados de (B) seguem normalmente.
  const sangramento = tem('SANGRAMENTO MENSTRUAL') && dados.status_gestacional !== 'GRÁVIDA'

  if (sangramento && tem('MENOPAUSA')) {
    // Sangramento pós-menopausa: red flag de câncer de endométrio. A gravidade não
    // depende de intensidade nem de persistência — GRAVE sempre.
    bump(GRAVE)
    linhas.push('VOCÊ MARCOU MENOPAUSA E SANGRAMENTO AO MESMO TEMPO. SANGRAMENTO DEPOIS DA MENOPAUSA NÃO É MENSTRUAÇÃO — É UM SINAL DE ALERTA QUE EXIGE INVESTIGAÇÃO GINECOLÓGICA PRIORITÁRIA, PRINCIPALMENTE PARA DESCARTAR CÂNCER DE ENDOMÉTRIO. NA MAIORIA DOS CASOS A CAUSA É BENIGNA (ATROFIA, PÓLIPO, EFEITO DE TERAPIA HORMONAL), MAS ISSO SÓ A INVESTIGAÇÃO PODE DIZER — NÃO ADIE.')
    linhas.push('A INVESTIGAÇÃO COMEÇA PELA ULTRASSONOGRAFIA TRANSVAGINAL (MEDIDA DA ESPESSURA DO ENDOMÉTRIO); CONFORME O RESULTADO, HISTEROSCOPIA COM BIÓPSIA.')
    linhas.push('SE VOCÊ AINDA ESTÁ NA TRANSIÇÃO PARA A MENOPAUSA (MENSTRUAÇÕES ESPAÇANDO, MAS AINDA OCORRENDO), INFORME AO GINECOLOGISTA HÁ QUANTO TEMPO ESTÁ SEM MENSTRUAR — SANGRAMENTO SÓ É "PÓS-MENOPAUSA" APÓS 12 MESES SEM CICLOS, MAS A IRREGULARIDADE DA TRANSIÇÃO TAMBÉM MERECE AVALIAÇÃO.')
    if (somaFerro) {
      linhas.push(`ESTE SANGRAMENTO JÁ SE REFLETE NO SEU FERRO (${textoFerro}) — TRATE A REPOSIÇÃO EM PARALELO À INVESTIGAÇÃO GINECOLÓGICA, SEM ESPERAR POR ELA. NO PÓS-BARIÁTRICO A VIA ORAL É LIMITADA; DISCUTA FERRO PARENTERAL.`)
    }
    alertas.push({ codigo: 'ginecologico.sangramento_apos_a_menopausa_investigacao_gin', nivel: GRAVE, texto: 'SANGRAMENTO APÓS A MENOPAUSA — INVESTIGAÇÃO GINECOLÓGICA PRIORITÁRIA PARA DESCARTAR CÂNCER DE ENDOMÉTRIO. ULTRASSONOGRAFIA TRANSVAGINAL INDICADA.' })
    need.prioritaria = true
    need.motivos.push('SANGRAMENTO PÓS-MENOPAUSA')
    need.usTransvaginal = true
  } else if (sangramento) {
    // Endometriose/miomas são causa estrutural de perda menstrual: se ela já os
    // declarou, a seção do sangramento NÃO manda "investigar a causa" (a seção B
    // logo abaixo diria que a causa já está identificada — soaria contraditório).
    const causaConhecida = tem('ENDOMETRIOSE') || tem('MIOMAS | MIOMATOSE')
    buildSecaoSangramento(dados, { somaFerro, textoFerro, causaConhecida }, linhas, alertas, need, bump)
  }

  // ── (B) DEMAIS ACHADOS ─────────────────────────────────────────────────────
  buildSecaoAchadosGineco(dados, { sangramento, somaFerro }, linhas, alertas, need, bump)

  if (!linhas.length) return null

  // Consolidação dos exames: uma linha de avaliação ginecológica (com todos os
  // motivos) e UM ultrassom — o transvaginal é mais específico e cobre o pélvico.
  if (need.motivos.length) {
    suger.push(`AVALIAÇÃO GINECOLÓGICA${need.prioritaria ? ' PRIORITÁRIA' : ''} (${need.motivos.join('; ')})`)
  }
  if (need.usTransvaginal) suger.push('ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL (ESPESSURA DO ENDOMÉTRIO)')
  else if (need.usPelvico) suger.push('ULTRASSONOGRAFIA PÉLVICA')
  if (need.betaHcg) suger.push('BETA-HCG QUANTITATIVO SERIADO (CONTROLE DE MOLA HIDATIFORME — REPETIR CONFORME ORIENTAÇÃO MÉDICA)')

  return { id: 'ginecologico', titulo: 'SAÚDE GINECOLÓGICA', nivel, linhas }
}

// (A) Régua do TEMPO — só chamada quando há sangramento menstrual de fato
// (não grávida, não pós-menopausa).
function buildSecaoSangramento(dados, { somaFerro, textoFerro, causaConhecida }, linhas, alertas, need, bump) {
  const tipo = dados.sangramento_menstrual_tipo || ''
  const duracao = dados.sangramento_duracao || ''
  const persistencia = dados.sangramento_persistencia || ''
  const frequencia = dados.sangramento_frequencia || ''

  // Fatores de perda (quanto ferro sai por ciclo × quantos ciclos por ano)
  const fatores = []
  if (tipo.includes('EXCESSIVO')) fatores.push('FLUXO INTENSO')
  if (tipo.includes('PROLONGADO') || GINECO_DURACAO_LONGA.includes(duracao)) fatores.push('DURAÇÃO AUMENTADA')
  if (frequencia === GINECO_CICLO_CURTO) fatores.push('CICLOS CURTOS (MAIS MENSTRUAÇÕES POR ANO)')

  const persistente = GINECO_PERSISTENTE.includes(persistencia)
  const recente     = GINECO_RECENTE.includes(persistencia)

  let nivel = MODERADO
  if (fatores.length >= 1 && persistente) nivel = GRAVE
  else if (fatores.length >= 2 && !recente) nivel = GRAVE
  if (somaFerro && nivel === MODERADO) nivel = GRAVE
  bump(nivel)

  // "NÃO INFORMADAS" só quando NADA foi respondido — com respostas dadas (ainda que
  // sem fator de perda), dizer "não informadas" contradiz as linhas seguintes.
  const nadaInformado = !tipo && !duracao && !persistencia && !frequencia
  const comoTexto = fatores.length
    ? `SANGRAMENTO MENSTRUAL COM ${fatores.join(' + ')}`
    : nadaInformado
      ? 'SANGRAMENTO MENSTRUAL (CARACTERÍSTICAS NÃO INFORMADAS — CONSIDERADO RELEVANTE ATÉ ESCLARECIMENTO)'
      : 'SANGRAMENTO MENSTRUAL RELATADO (SEM FATOR DE PERDA AUMENTADA IDENTIFICADO NAS RESPOSTAS)'
  linhas.push(`${comoTexto}: A PERDA DE SANGUE PELA MENSTRUAÇÃO É A PRINCIPAL CAUSA DE FERROPENIA NA MULHER EM IDADE FÉRTIL. NO BARIÁTRICO, ELA SE SOMA À DISABSORÇÃO: A CIRURGIA REDUZ A ABSORÇÃO DE FERRO JUSTAMENTE ENQUANTO A MENSTRUAÇÃO O CONSOME. AS DUAS CAUSAS JUNTAS EXPLICAM ANEMIA QUE NÃO RESPONDE À SUPLEMENTAÇÃO ORAL HABITUAL.`)

  // O TEMPO é o que agrava: perda persistente drena o estoque mês após mês.
  if (persistente) {
    const quanto = persistencia === 'MAIS DE 8 MESES' ? 'MAIS DE 8 MESES' : '4 A 8 MESES'
    linhas.push(`ESTE PADRÃO PERSISTE HÁ ${quanto}: PERDA CONTINUADA DE FERRO POR VÁRIOS CICLOS SEGUIDOS — MESMO UM FLUXO SÓ MODERADAMENTE AUMENTADO, MANTIDO POR MESES, ESGOTA A RESERVA. ${causaConhecida
      ? 'A AVALIAÇÃO GINECOLÓGICA AQUI É PARA TRATAR A CAUSA QUE VOCÊ JÁ CONHECE (VEJA ABAIXO) — CONTROLAR O SANGRAMENTO É PARTE DO TRATAMENTO DA ANEMIA, NÃO APENAS REPOR FERRO.'
      : 'AVALIAÇÃO GINECOLÓGICA É NECESSÁRIA PARA INVESTIGAR A CAUSA (MIOMAS, ADENOMIOSE, PÓLIPOS, DISTÚRBIO DE COAGULAÇÃO) E TRATAR — CONTROLAR O SANGRAMENTO É PARTE DO TRATAMENTO DA ANEMIA, NÃO APENAS REPOR FERRO.'}`)
  } else if (recente) {
    linhas.push('PADRÃO RECENTE (MENOS DE 4 MESES): AINDA ASSIM MERECE INVESTIGAÇÃO — MUDANÇA RECENTE NO PADRÃO MENSTRUAL TEM CAUSA (HORMONAL, ESTRUTURAL OU MEDICAMENTOSA) E, NO BARIÁTRICO, NÃO HÁ FOLGA DE FERRO PARA ABSORVER MESES DE PERDA ATÉ "VER NO QUE DÁ".')
  } else {
    linhas.push('HÁ QUANTO TEMPO ESSE PADRÃO PERSISTE NÃO FOI INFORMADO — ESSA É A INFORMAÇÃO QUE DEFINE A GRAVIDADE. OBSERVE E REGISTRE: SE JÁ DURA 4 MESES OU MAIS, TRATE COMO PRIORIDADE.')
  }

  if (frequencia === GINECO_CICLO_CURTO) {
    linhas.push('CICLOS COM MENOS DE 21 DIAS: MAIS MENSTRUAÇÕES POR ANO SIGNIFICA MAIS FERRO PERDIDO NO ANO, MESMO QUE CADA CICLO PAREÇA NORMAL. CICLOS CURTOS TAMBÉM PEDEM AVALIAÇÃO HORMONAL.')
  } else if (frequencia === 'IRREGULAR') {
    // Não é fator de perda na régua (não muda o nível), mas o dado não pode sumir:
    // a paciente respondeu e o relatório precisa ecoar.
    linhas.push('CICLOS IRREGULARES: A IRREGULARIDADE MENSTRUAL NÃO AUMENTA POR SI A PERDA DE FERRO, MAS TEM CAUSA (HORMONAL, SOP, PERIMENOPAUSA) — INCLUA NA AVALIAÇÃO GINECOLÓGICA.')
  }

  if (duracao === 'MAIS DE 10 DIAS') {
    linhas.push('MENSTRUAÇÃO COM MAIS DE 10 DIAS DE DURAÇÃO É SEMPRE ANORMAL — INVESTIGAÇÃO GINECOLÓGICA INDEPENDENTE DO FLUXO.')
  }

  if (somaFerro) {
    linhas.push(`ESTE SANGRAMENTO JÁ SE REFLETE NO SEU FERRO (${textoFerro}) — OS DOIS ACHADOS SE EXPLICAM. A REPOSIÇÃO DE FERRO TENDE A FALHAR ENQUANTO A PERDA CONTINUAR; TRATE A CAUSA DO SANGRAMENTO EM PARALELO. SE A VIA ORAL NÃO CORRIGIR, DISCUTA FERRO PARENTERAL (A ABSORÇÃO ORAL É LIMITADA NO PÓS-BARIÁTRICO).`)
  } else {
    linhas.push('MESMO SEM ANEMIA AGORA, MANTENHA FERRITINA E HEMOGRAMA MONITORADOS — NO BARIÁTRICO COM PERDA MENSTRUAL, O ESTOQUE DE FERRO SE ESGOTA ANTES DE A HEMOGLOBINA CAIR.')
  }

  // Dedup (auditoria): sangramento + endometriose/miomas é UMA história (a doença é
  // a causa do sangramento). Este alerta carrega tudo quando a causa é conhecida; o
  // alerta da seção B (achados) é suprimido nesse caso — senão 2 alertas do mesmo eixo.
  const sufixoCausa = causaConhecida ? ' A CAUSA PROVÁVEL JÁ FOI IDENTIFICADA (VER CARD) — TRATAR A DOENÇA DE BASE É PARTE DO TRATAMENTO DA ANEMIA.' : ''
  alertas.push({ codigo: 'secaoSangramento.com_repercussao_no_ferro_avaliacao_ginecologi', nivel, texto: (somaFerro
    ? `${comoTexto} COM REPERCUSSÃO NO FERRO — AVALIAÇÃO GINECOLÓGICA PARA TRATAR A CAUSA DA PERDA; SÓ REPOR FERRO NÃO RESOLVE.`
    : `${comoTexto} — PERDA DE FERRO QUE SOMA À DISABSORÇÃO BARIÁTRICA. AVALIAÇÃO GINECOLÓGICA E MONITORAMENTO DA FERRITINA.`) + sufixoCausa })

  // Com causa conhecida, o motivo do exame vem da seção B ("acompanhamento de
  // endometriose/miomas") — pedir "investigar a causa" ao lado seria redundante.
  if (!causaConhecida) need.motivos.push('INVESTIGAR A CAUSA DO SANGRAMENTO')
  need.usPelvico = true
}

// ─────────────────────────────────────────────────────────────────────────────
// (B) DEMAIS ACHADOS DO STATUS GINECOLÓGICO
// Vários são CAUSA do sangramento de (A) — quando os dois aparecem, o texto conecta
// ("a causa provável do seu sangramento pode estar identificada") em vez de repetir
// "investigue a causa". Níveis: MOLA e CÂNCER DE MAMA em tratamento = GRAVE; achados
// que sangram (endometriose/miomas) = MODERADO, ou GRAVE se já há repercussão no
// ferro; SOP/cistos = LEVE. Régua a revisar com o Dr. Ramos.
// ─────────────────────────────────────────────────────────────────────────────
function buildSecaoAchadosGineco(dados, { sangramento, somaFerro }, linhas, alertas, need, bump) {
  const gin = dados.status_ginecologico || []
  const tem = (x) => gin.includes(x)

  // Endometriose e miomas: as duas causas estruturais clássicas de perda menstrual.
  const sangrantes = []
  if (tem('ENDOMETRIOSE')) sangrantes.push('ENDOMETRIOSE')
  if (tem('MIOMAS | MIOMATOSE')) sangrantes.push('MIOMAS')
  if (sangrantes.length) {
    const nivelS = somaFerro ? GRAVE : MODERADO
    bump(nivelS)
    const nomes = sangrantes.join(' E ')
    linhas.push(`${nomes}: CAUSA FREQUENTE DE SANGRAMENTO AUMENTADO E DE FERROPENIA NA MULHER. NO BARIÁTRICO O EFEITO É DOBRADO — A PERDA PELO ÚTERO SOMA-SE À ABSORÇÃO REDUZIDA PELA CIRURGIA. SEM CONTROLAR A DOENÇA DE BASE, A REPOSIÇÃO DE FERRO SERÁ SEMPRE INSUFICIENTE: TRATAR ${sangrantes.length > 1 ? 'ESSAS CONDIÇÕES' : 'ESSA CONDIÇÃO'} É PARTE DO TRATAMENTO DA ANEMIA.`)
    if (sangramento) {
      linhas.push(`A CAUSA PROVÁVEL DO SEU SANGRAMENTO PODE JÁ ESTAR IDENTIFICADA (${nomes}) — LEVE ESSA INFORMAÇÃO AO GINECOLOGISTA JUNTO COM O PADRÃO QUE VOCÊ DESCREVEU AQUI.`)
    }
    if (tem('ENDOMETRIOSE')) {
      linhas.push('A ENDOMETRIOSE TAMBÉM CURSA COM DOR PÉLVICA E FADIGA QUE SE CONFUNDEM COM AS CARÊNCIAS DO PÓS-BARIÁTRICO — NÃO ATRIBUA TUDO À CIRURGIA SEM AVALIAR.')
      // Teleconsulta independe do estado (Dr. Ramos): a endometriose merece conversa
      // médica mesmo com o resto da avaliação bem. O CTA vive no OBAModal; a linha
      // aqui garante que o relatório SALVO carregue a recomendação.
      linhas.push('A ENDOMETRIOSE MERECE ACOMPANHAMENTO MÉDICO NO SEU CONTEXTO BARIÁTRICO — MESMO QUE O RESTO DA SUA AVALIAÇÃO ESTEJA BEM. O CONTROLE DA DOENÇA E O DA SUA ANEMIA ANDAM JUNTOS.')
    }
    // Só alerta próprio quando NÃO há sangramento — se há, o alerta do sangramento
    // (seção A) já carrega "a causa provável foi identificada" (dedup da auditoria).
    if (!sangramento) {
      alertas.push({ codigo: 'secaoAchadosGineco.causa_de_perda_menstrual_que_soma_a_disabsorc', nivel: nivelS, texto: `${nomes}${somaFerro ? ' COM REPERCUSSÃO NO FERRO' : ''} — CAUSA DE PERDA MENSTRUAL QUE SOMA À DISABSORÇÃO BARIÁTRICA. ACOMPANHAMENTO GINECOLÓGICO; TRATAR A DOENÇA DE BASE É PARTE DO TRATAMENTO DA ANEMIA.` })
    }
    need.motivos.push(`ACOMPANHAMENTO DE ${nomes}`)
    need.usPelvico = true
  }

  // SOP: eixo metabólico, não hemorrágico — o vínculo com o bariátrico é a
  // resistência insulínica (e o reganho de peso), não a perda de ferro.
  // Alerta LEVE (não só a cor do card): sem ele o achado não aparecia no topo do
  // card do médico, que lista os alertas. LEVE não escala sozinho o Estado Geral
  // (a régua só sobe p/ RAZOÁVEL com ≥3 leves).
  if (tem('OVÁRIOS POLICÍSTICOS')) {
    bump(LEVE)
    linhas.push('OVÁRIOS POLICÍSTICOS (SOP): ASSOCIADA À RESISTÊNCIA INSULÍNICA E AO GANHO DE PESO — A CIRURGIA BARIÁTRICA COSTUMA MELHORAR A SOP E PODE RESTAURAR A FERTILIDADE (ATENÇÃO À CONTRACEPÇÃO NOS PRIMEIROS 18 MESES, QUANDO A GESTAÇÃO É DESACONSELHADA). A ANOVULAÇÃO DA SOP TAMBÉM CAUSA CICLOS IRREGULARES E, ÀS VEZES, SANGRAMENTO AUMENTADO. MANTENHA ACOMPANHAMENTO GINECOLÓGICO E CONTROLE METABÓLICO.')
    alertas.push({ codigo: 'secaoAchadosGineco.ovarios_policisticos_sop_resistencia_insulini', nivel: LEVE, texto: 'OVÁRIOS POLICÍSTICOS (SOP) — RESISTÊNCIA INSULÍNICA; A CIRURGIA PODE RESTAURAR A FERTILIDADE (ATENÇÃO À CONTRACEPÇÃO NOS PRIMEIROS 18 MESES). ACOMPANHAMENTO GINECOLÓGICO E METABÓLICO.' })
    need.motivos.push('ACOMPANHAMENTO DE SOP')
  }

  if (tem('CISTOS NAS MAMAS')) {
    bump(LEVE)
    linhas.push('CISTOS NAS MAMAS: NA GRANDE MAIORIA DAS VEZES SÃO BENIGNOS. MANTENHA O RASTREIO MAMOGRÁFICO/ULTRASSONOGRÁFICO NA PERIODICIDADE ORIENTADA PELO SEU GINECOLOGISTA.')
    alertas.push({ codigo: 'secaoAchadosGineco.cistos_nas_mamas_em_regra_benignos_manter_o_r', nivel: LEVE, texto: 'CISTOS NAS MAMAS — EM REGRA BENIGNOS; MANTER O RASTREIO MAMOGRÁFICO/ULTRASSONOGRÁFICO NA PERIODICIDADE ORIENTADA.' })
  }

  if (tem('CÂNCER DE MAMA')) {
    const st = dados.cancer_mama_status || ''
    if (st === 'EM TRATAMENTO') {
      bump(GRAVE)
      linhas.push('CÂNCER DE MAMA EM TRATAMENTO: A QUIMIOTERAPIA DEPRIME A MEDULA ÓSSEA (ANEMIA, LEUCOPENIA, PLAQUETOPENIA) E ESSE EFEITO SE SOMA ÀS CARÊNCIAS DO PÓS-BARIÁTRICO — O SEU ERITRON PRECISA SER LIDO NESSE CONTEXTO, E O HEMOGRAMA MONITORADO DE PERTO. INFORME AO ONCOLOGISTA QUE VOCÊ É BARIÁTRICA: A ABSORÇÃO DE MEDICAMENTOS ORAIS E DE NUTRIENTES ESTÁ REDUZIDA. NÃO INICIE REPOSIÇÃO DE FERRO POR CONTA PRÓPRIA DURANTE O TRATAMENTO ONCOLÓGICO — ALINHE COM A EQUIPE.')
      alertas.push({ codigo: 'secaoAchadosGineco.cancer_de_mama_em_tratamento_quimioterapia_de', nivel: GRAVE, texto: 'CÂNCER DE MAMA EM TRATAMENTO — QUIMIOTERAPIA DEPRIME A MEDULA E SOMA-SE ÀS CARÊNCIAS BARIÁTRICAS. LER O ERITRON NESSE CONTEXTO; ALINHAR REPOSIÇÃO COM O ONCOLOGISTA.' })
    } else if (st === 'RESOLVIDO') {
      bump(MODERADO)
      linhas.push('CÂNCER DE MAMA (RESOLVIDO): MANTENHA O SEGUIMENTO ONCOLÓGICO E O RASTREIO. SE VOCÊ USA OU USOU TAMOXIFENO, SAIBA QUE ELE AUMENTA O RISCO DE ESPESSAMENTO E DE CÂNCER DO ENDOMÉTRIO E TAMBÉM DE TROMBOSE — QUALQUER SANGRAMENTO VAGINAL ANORMAL DEVE SER INVESTIGADO SEM DEMORA.')
      // Alerta MODERADO: antes o card ficava moderado mas NADA entrava no Estado
      // Geral nem no topo do card do médico — assimetria com endometriose/miomas,
      // que já alertavam no mesmo nível.
      alertas.push({ codigo: 'secaoAchadosGineco.cancer_de_mama_resolvido_manter_seguimento_on', nivel: MODERADO, texto: 'CÂNCER DE MAMA (RESOLVIDO) — MANTER SEGUIMENTO ONCOLÓGICO E RASTREIO. SE USOU/USA TAMOXIFENO: RISCO DE CÂNCER DE ENDOMÉTRIO E DE TROMBOSE — INVESTIGAR QUALQUER SANGRAMENTO VAGINAL ANORMAL.' })
    } else {
      // Status não respondido (o rádio não é obrigatório). Em tratamento e resolvido
      // pedem condutas MUITO diferentes — não presumir qual é: pedir o dado.
      bump(MODERADO)
      linhas.push('CÂNCER DE MAMA: VOCÊ NÃO INFORMOU SE O TRATAMENTO ESTÁ EM CURSO OU JÁ FOI CONCLUÍDO — ESSA INFORMAÇÃO MUDA A LEITURA DO SEU ERITRON (A QUIMIOTERAPIA DEPRIME A MEDULA ÓSSEA E ESSE EFEITO SE SOMA ÀS CARÊNCIAS DO PÓS-BARIÁTRICO). INFORME-A NA SUA PRÓXIMA AVALIAÇÃO OBA OU AO SEU MÉDICO. DE TODA FORMA: MANTENHA O SEGUIMENTO ONCOLÓGICO E O RASTREIO, E SE USA OU USOU TAMOXIFENO, SAIBA QUE ELE AUMENTA O RISCO DE CÂNCER DO ENDOMÉTRIO E DE TROMBOSE — QUALQUER SANGRAMENTO VAGINAL ANORMAL DEVE SER INVESTIGADO SEM DEMORA.')
      alertas.push({ codigo: 'secaoAchadosGineco.cancer_de_mama_status_em_tratamento_resolvido', nivel: MODERADO, texto: 'CÂNCER DE MAMA — STATUS (EM TRATAMENTO / RESOLVIDO) NÃO INFORMADO. CONFIRMAR: SE HÁ QUIMIOTERAPIA EM CURSO, O ERITRON PRECISA SER LIDO NESSE CONTEXTO.' })
    }
  }

  if (tem('MOLA HIDATIFORME')) {
    bump(GRAVE)
    linhas.push('MOLA HIDATIFORME: DOENÇA TROFOBLÁSTICA GESTACIONAL — EXIGE SEGUIMENTO COM BETA-HCG SERIADO ATÉ A NEGATIVAÇÃO E POR TODO O PERÍODO ORIENTADO PELO SEU MÉDICO, PELO RISCO DE NEOPLASIA TROFOBLÁSTICA (CORIOCARCINOMA). ENQUANTO O SEGUIMENTO ESTIVER EM CURSO, A GESTAÇÃO É CONTRAINDICADA (UMA NOVA GRAVIDEZ ELEVA O BETA-HCG E IMPEDE A INTERPRETAÇÃO DO CONTROLE). CONFIRME COM O SEU GINECOLOGISTA SE O SEU SEGUIMENTO FOI CONCLUÍDO.')
    alertas.push({ codigo: 'secaoAchadosGineco.mola_hidatiforme_confirmar_se_o_seguimento_co', nivel: GRAVE, texto: 'MOLA HIDATIFORME — CONFIRMAR SE O SEGUIMENTO COM BETA-HCG SERIADO FOI CONCLUÍDO (RISCO DE NEOPLASIA TROFOBLÁSTICA). GESTAÇÃO CONTRAINDICADA ENQUANTO EM SEGUIMENTO.' })
    need.motivos.push('SEGUIMENTO DE DOENÇA TROFOBLÁSTICA')
    need.betaHcg = true
    need.prioritaria = true
  }
}

// O fumo entra por DUAS portas da anamnese. Helper único para que qualquer módulo
// possa perguntar "esta paciente fuma?" — o cardiovascular usa isso para deixar de
// citar tabagismo genericamente na crítica da aterosclerose.
function pacienteFuma(dados) {
  const resp = Array.isArray(dados.status_respiratorio) ? dados.status_respiratorio : []
  const comp = Array.isArray(dados.compulsoes) ? dados.compulsoes : []
  return resp.includes('TABAGISTA | DPOC') || comp.includes('CIGARRO / TABACO')
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO — STATUS ARTICULAR + FAN
// status_articular (ARTRITE/ARTROSE/TENDINITE/PROBLEMAS DE COLUNA) era órfão — só
// ARTRITE e FAN REAGENTE disparavam o COOMBS (sugestão de exame, l.288). O FAN
// reagente também já cruza com o Hashimoto (módulo hormonal). Aqui: crítica da
// seção + graduação do FAN pelo TÍTULO (era ignorado).
//   ARTRITE = inflamatória/autoimune → anemia de doença crônica (mascara ferro) +
//     o eixo autoimune (FAN). ARTROSE/TENDINITE/COLUNA = mecânica → dor, mobilidade,
//     e a armadilha do AINE (sangra, agrava ferropenia).
// TÍTULO do FAN: 1/80 é comum e pouco específico (até em saudáveis); ≥1/320 é
// significativo; 1/640+ reforça bastante a suspeita de doença autoimune.
// ─────────────────────────────────────────────────────────────────────────────
const FAN_TITULO_FORTE = ['1/320', '1/640+']

function buildModArticular(dados, resultadoEritron, alertas, suger) {
  const art = Array.isArray(dados.status_articular) ? dados.status_articular : []
  const fanReagente = dados.fan === 'REAGENTE'
  if (!art.length && !fanReagente) return null
  const tem = (x) => art.includes(x)

  const RANK = { [GRAVE]: 3, [MODERADO]: 2, [LEVE]: 1, [NORMAL]: 0 }
  let nivel = NORMAL
  const bump = (n) => { if (RANK[n] > RANK[nivel]) nivel = n }
  const linhas = []

  const temAnemia = /ANEMIA|ANÊMIC/i.test(resultadoEritron?.label || '') || resultadoEritron?.color === 'red'
  const temArtrite = tem('ARTRITE')
  const fanForte = fanReagente && FAN_TITULO_FORTE.includes(dados.fan_titulo || '')

  // ── ARTRITE — eixo inflamatório/autoimune (o que toca o eritron) ───────────
  if (temArtrite) {
    bump(MODERADO)
    linhas.push('ARTRITE: DIFERENTE DA ARTROSE (QUE É DESGASTE), A ARTRITE É INFLAMAÇÃO DA ARTICULAÇÃO E MUITAS VEZES TEM FUNDO AUTOIMUNE (ARTRITE REUMATOIDE, LÚPUS). ISSO IMPORTA PARA O SEU SANGUE: A INFLAMAÇÃO CRÔNICA CAUSA A "ANEMIA DE DOENÇA CRÔNICA", QUE PODE MASCARAR A FALTA DE FERRO — A FERRITINA SOBE COM A INFLAMAÇÃO E PARECE NORMAL MESMO COM O ESTOQUE VAZIO. NO SEU CASO, A SATURAÇÃO DA TRANSFERRINA VALE MAIS QUE A FERRITINA PARA JULGAR O FERRO.')
    suger.push('SATURAÇÃO DA TRANSFERRINA (A FERRITINA ENGANA NA INFLAMAÇÃO)')
    suger.push('PCR E VHS (ATIVIDADE INFLAMATÓRIA)')
    if (temAnemia) {
      bump(GRAVE)
      linhas.push('VOCÊ TEM ARTRITE E ANEMIA AO MESMO TEMPO: SÃO DOIS PROCESSOS QUE SE MISTURAM (A CARÊNCIA DE FERRO DA CIRURGIA E A INFLAMAÇÃO DA ARTRITE). SEPARAR AS DUAS CAUSAS EXIGE UM HEMATOLOGISTA — NÃO É PARA TRATAR SÓ COM FERRO SEM ENTENDER O QUANTO CADA UMA PESA.')
      alertas.push({ codigo: 'articular.artrite_anemia_quadro_misto_ferropenia_bariat', nivel: GRAVE, texto: 'ARTRITE + ANEMIA — QUADRO MISTO (FERROPENIA BARIÁTRICA + ANEMIA DE DOENÇA CRÔNICA). AVALIAÇÃO HEMATOLÓGICA; A SATURAÇÃO DA TRANSFERRINA DISTINGUE MELHOR QUE A FERRITINA.' })
    } else if (!fanForte) {
      // O alerta da artrite sem anemia sai aqui — MAS se há FAN forte, ele é
      // consolidado no bloco do FAN abaixo (o FAN reforça, não duplica).
      alertas.push({ codigo: 'articular.artrite_inflamatoria_autoimune_a_inflamacao_c', nivel: MODERADO, texto: 'ARTRITE (INFLAMATÓRIA/AUTOIMUNE) — A INFLAMAÇÃO CRÔNICA CAUSA ANEMIA DE DOENÇA CRÔNICA E ELEVA A FERRITINA (MASCARA A FERROPENIA). USAR A SATURAÇÃO DA TRANSFERRINA PARA JULGAR O FERRO.' })
    }
    suger.push('AVALIAÇÃO COM REUMATOLOGISTA')
  }

  // ── FAN + TÍTULO — graduação da suspeita autoimune ─────────────────────────
  // Consolidação (Dr. Ramos): FAN alto + artrite são o MESMO quadro autoimune visto
  // por dois ângulos — o FAN reforça o alerta da artrite, não cria um segundo (2
  // moderados jogariam o estado a RUIM sozinhos). Só empurra alerta próprio quando
  // NÃO há artrite empurrando o dela. O alerta da artrite sem anemia sai aqui, já
  // fundido com o texto do FAN quando ele é forte.
  if (fanReagente) {
    const titulo = dados.fan_titulo || ''
    const forte = FAN_TITULO_FORTE.includes(titulo)
    if (forte) {
      bump(MODERADO)
      linhas.push(`FAN REAGENTE COM TÍTULO ${titulo}: ESTE É UM TÍTULO ALTO, QUE REFORÇA A SUSPEITA DE DOENÇA AUTOIMUNE (COMO LÚPUS OU ARTRITE REUMATOIDE) E PEDE INVESTIGAÇÃO REUMATOLÓGICA. AUTOIMUNIDADE E O SEU CONTEXTO BARIÁTRICO SE SOMAM NA LEITURA DO SANGUE — LEVE ESTE RESULTADO AO MÉDICO.`)
      // Sem anemia: um alerta MODERADO cobre o quadro autoimune (artrite + FAN
      // juntos, se houver artrite). Com anemia, o GRAVE da artrite já domina.
      if (!temAnemia) {
        alertas.push({ codigo: 'articular.fan_reagente', nivel: MODERADO, texto: `${temArtrite ? 'ARTRITE + ' : ''}FAN REAGENTE ${titulo} (TÍTULO ALTO) — ${temArtrite ? 'QUADRO AUTOIMUNE (A INFLAMAÇÃO CAUSA ANEMIA DE DOENÇA CRÔNICA E MASCARA A FERROPENIA; USAR A SATURAÇÃO). ' : ''}REFORÇA A SUSPEITA DE DOENÇA AUTOIMUNE — AVALIAÇÃO REUMATOLÓGICA.` })
      }
      suger.push('AVALIAÇÃO COM REUMATOLOGISTA')
      suger.push('ANTI-DNA, ANTI-ENA E COMPLEMENTO (C3/C4) SE INDICADO PELO REUMATOLOGISTA')
    } else if (titulo === '1/160') {
      bump(LEVE)
      linhas.push('FAN REAGENTE COM TÍTULO 1/160: É UM TÍTULO INTERMEDIÁRIO — PODE TER SIGNIFICADO OU NÃO, DEPENDENDO DOS SEUS SINTOMAS. NÃO É PARA ALARMAR, MAS TAMBÉM NÃO É PARA IGNORAR: LEVE AO MÉDICO PARA ELE DECIDIR SE VALE INVESTIGAR.')
    } else {
      // 1/80 ou título não informado.
      linhas.push(`FAN REAGENTE${titulo ? ` COM TÍTULO ${titulo}` : ''}: ${titulo === '1/80' ? 'ESTE É UM TÍTULO BAIXO, MUITO COMUM E POUCO ESPECÍFICO — APARECE ATÉ EM PESSOAS SAUDÁVEIS. ' : ''}O FAN SOZINHO NÃO FAZ DIAGNÓSTICO: ELE SÓ TEM VALOR JUNTO COM SINTOMAS. INFORME-O AO MÉDICO PARA QUE ELE DECIDA SE HÁ O QUE INVESTIGAR.`)
      bump(LEVE)
    }
  }

  // ── ARTROSE / TENDINITE / COLUNA — eixo mecânico ───────────────────────────
  const mecanicas = []
  if (tem('ARTROSE')) mecanicas.push('ARTROSE')
  if (tem('TENDINITE')) mecanicas.push('TENDINITE')
  if (tem('PROBLEMAS DE COLUNA')) mecanicas.push('PROBLEMAS DE COLUNA')
  if (mecanicas.length) {
    bump(LEVE)
    linhas.push(`${mecanicas.join(', ')}: SÃO CONDIÇÕES MECÂNICAS (DE DESGASTE OU ESFORÇO), NÃO INFLAMATÓRIAS — NÃO MEXEM NO SEU SANGUE. DOIS PONTOS ÚTEIS NO PÓS-BARIÁTRICO: (1) A PERDA DE PESO ALIVIA A CARGA SOBRE JOELHOS, QUADRIS E COLUNA, ENTÃO A TENDÊNCIA É MELHORAR; (2) EVITE ANTI-INFLAMATÓRIOS (AINEs) PARA A DOR — ELES CAUSAM ÚLCERA E SANGRAMENTO, QUE AGRAVAM A FALTA DE FERRO. PEÇA AO MÉDICO ANALGÉSICOS SEGUROS E CONSIDERE FISIOTERAPIA E FORTALECIMENTO MUSCULAR.`)
  }

  if (!linhas.length) return null
  return { id: 'articular', titulo: 'SAÚDE ARTICULAR', nivel, linhas }
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO — STATUS ALÉRGICO
// status_alergico (RESPIRATÓRIA/DERMATITE/ALIMENTAR/MEDICAMENTOSA) + as sublistas
// eram órfãos (só PENICILINAS/CEFALOSPORINAS eram lidas, no cruzamento com H. pylori
// do módulo endoscópico — NÃO repetir aqui). O eixo forte é a ALERGIA ALIMENTAR:
// restrição somada à disabsorção bariátrica = risco nutricional dobrado, e cada
// alimento tira um nutriente específico (leite→cálcio/osso, ovo/leite→proteína).
// ─────────────────────────────────────────────────────────────────────────────
function buildModAlergico(dados, alertas, suger) {
  const st = Array.isArray(dados.status_alergico) ? dados.status_alergico : []
  if (!st.length) return null
  const tem = (x) => st.includes(x)
  const alim = Array.isArray(dados.alergias_alimentares) ? dados.alergias_alimentares : []
  const med = Array.isArray(dados.alergia_medicamentosa) ? dados.alergia_medicamentosa : []
  const temAlim = (x) => alim.includes(x)
  const temMed = (x) => med.includes(x)

  const RANK = { [GRAVE]: 3, [MODERADO]: 2, [LEVE]: 1, [NORMAL]: 0 }
  let nivel = NORMAL
  const bump = (n) => { if (RANK[n] > RANK[nivel]) nivel = n }
  const linhas = []

  // ── ALIMENTAR — o eixo nutricional (o ponto forte da seção) ────────────────
  if (tem('ALIMENTAR')) {
    bump(LEVE)
    const nomes = alim.filter(a => a !== 'OUTRA')
    const outra = (dados.alergias_alimentares_outra || '').trim()
    const listaTxt = [...nomes, ...(outra ? [outra.toUpperCase()] : [])].join(', ') || 'NÃO ESPECIFICADA(S)'
    linhas.push(`ALERGIA ALIMENTAR (${listaTxt}): NO PÓS-BARIÁTRICO ISSO PESA MAIS DO QUE NA POPULAÇÃO GERAL — VOCÊ JÁ ABSORVE MENOS PELA CIRURGIA, E CADA ALIMENTO QUE PRECISA CORTAR ESTREITA AINDA MAIS AS SUAS FONTES DE NUTRIENTES. NÃO BASTA EVITAR O ALIMENTO: É PRECISO REPOR, POR OUTRA VIA, O QUE ELE FORNECERIA.`)

    // Leite → cálcio e vitamina D → osso (já frágil no bariátrico).
    const semLeite = temAlim('LEITE (TODOS)') || temAlim('LEITE DE VACA')
    if (semLeite) {
      bump(MODERADO)
      linhas.push('SEM LEITE E DERIVADOS: O LATICÍNIO É A PRINCIPAL FONTE DE CÁLCIO DA DIETA. NO BARIÁTRICO, QUE JÁ PERDE MASSA ÓSSEA, CORTAR O LEITE SEM COMPENSAR É FATOR DE RISCO DIRETO PARA OSTEOPOROSE. GARANTA CÁLCIO (DE PREFERÊNCIA CITRATO, MELHOR ABSORVIDO APÓS A CIRURGIA) E VITAMINA D, E MONITORE O OSSO.')
      // Strings idênticas às dos outros módulos (vitD/ósseo) p/ o dedup por Set pegar.
      suger.push('CÁLCIO SÉRICO E URINÁRIO')
      suger.push('VITAMINA D 25-OH')
      // O módulo ósseo já sugere densitometria com sufixo próprio ("(SE NÃO RECENTE)"
      // / "(ANUAL)") que o dedup por Set NÃO reconhece como a mesma — só empurrar a
      // nossa quando o ósseo não vai empurrar a dele, senão aparecem duas.
      const osseoDecl = dados.status_osseo || ''
      if (!/OSTEOPOROSE|OSTEOPENIA/.test(osseoDecl)) suger.push('DENSITOMETRIA ÓSSEA')
      alertas.push({ codigo: 'alergico.alergia_a_leite_bariatrico_perda_da_principal', nivel: MODERADO, texto: 'ALERGIA A LEITE + BARIÁTRICO — PERDA DA PRINCIPAL FONTE DE CÁLCIO NUM PACIENTE QUE JÁ PERDE OSSO. GARANTIR CÁLCIO (CITRATO) E VIT. D; DENSITOMETRIA.' })
    }

    // Proteína: ovo, leite e (se vier no campo livre) carne/peixe são fontes-chave.
    const fontesProteina = []
    if (temAlim('OVO')) fontesProteina.push('OVO')
    if (semLeite) fontesProteina.push('LEITE')
    if (/CARNE|FRANGO|PEIXE|BOI|SOJA/i.test(outra)) fontesProteina.push('PROTEÍNA ANIMAL DECLARADA')
    if (fontesProteina.length) {
      bump(MODERADO)
      linhas.push(`ATENÇÃO À PROTEÍNA: OS ALIMENTOS QUE VOCÊ EVITA (${fontesProteina.join(', ')}) SÃO FONTES IMPORTANTES DE PROTEÍNA. BATER A META PROTEICA JÁ É UM DESAFIO DEPOIS DA CIRURGIA — COM ESSA RESTRIÇÃO, FICA MAIS DIFÍCIL. TRABALHE COM O NUTRICIONISTA FONTES ALTERNATIVAS (E, SE PRECISAR, SUPLEMENTO PROTEICO ADEQUADO À SUA ALERGIA) E ACOMPANHE A ALBUMINA.`)
      suger.push('ALBUMINA SÉRICA (MONITORAMENTO PROTEICO)')
    }

    // Crustáceos/frutos do mar: menos nutricional, mais risco de reação grave.
    if (temAlim('CRUSTÁCEOS (CAMARÃO E OUTROS)')) {
      linhas.push('ALERGIA A CRUSTÁCEOS: COSTUMA SER VITALÍCIA E PODE CAUSAR REAÇÕES GRAVES (ANAFILAXIA). NÃO É UM PROBLEMA NUTRICIONAL RELEVANTE (HÁ OUTRAS FONTES), MAS INFORME-A SEMPRE — INCLUSIVE ANTES DE EXAMES COM CONTRASTE IODADO, POR PRECAUÇÃO.')
    }

    if (!nomes.length && !outra) {
      linhas.push('VOCÊ MARCOU ALERGIA ALIMENTAR MAS NÃO ESPECIFICOU QUAL — INFORME NA PRÓXIMA AVALIAÇÃO, PORQUE O ALIMENTO EVITADO DEFINE QUAL NUTRIENTE PRECISA SER REPOSTO.')
    }

    suger.push('ACOMPANHAMENTO NUTRICIONAL (RESTRIÇÃO ALIMENTAR NO PÓS-BARIÁTRICO)')
  }

  // ── MEDICAMENTOSA — o resto (penicilina/cefalosporina são tratadas no H. pylori) ──
  if (tem('MEDICAMENTOSA')) {
    bump(LEVE)
    // AINEs e aspirina: a alergia aqui é PROTETORA — são causa de úlcera e sangria
    // oculta (fonte de ferropenia). Reforçar que não devem ser usados.
    const semAINE = temMed('ANTI-INFLAMATÓRIOS') || temMed('ASPIRINA')
    if (semAINE) {
      linhas.push('ALERGIA A ANTI-INFLAMATÓRIOS / ASPIRINA: AQUI A ALERGIA ATÉ JOGA A SEU FAVOR — ESSES REMÉDIOS SÃO CAUSA COMUM DE ÚLCERA E DE SANGRAMENTO DIGESTIVO OCULTO, QUE AGRAVA A FALTA DE FERRO NO BARIÁTRICO. NÃO OS USE E MANTENHA ESSA ALERGIA REGISTRADA EM TODA CONSULTA. PARA DOR OU FEBRE, PEÇA AO MÉDICO UMA ALTERNATIVA SEGURA PARA VOCÊ.')
    }
    if (temMed('DIPIRONA')) {
      linhas.push('ALERGIA A DIPIRONA: A DIPIRONA PODE, RARAMENTE, CAUSAR QUEDA GRAVE DOS GLÓBULOS BRANCOS (AGRANULOCITOSE) — MAIS UM MOTIVO PARA EVITÁ-LA NO SEU CASO. INFORME ESSA ALERGIA SEMPRE E TENHA COM O SEU MÉDICO UMA OPÇÃO ALTERNATIVA PARA DOR E FEBRE.')
    }
    const outroMed = (dados.alergia_outra_texto || '').trim()
    if (temMed('OUTRA') && outroMed) {
      linhas.push(`ALERGIA MEDICAMENTOSA A "${outroMed.toUpperCase()}": MANTENHA-A REGISTRADA E INFORME EM TODA CONSULTA E ANTES DE QUALQUER PRESCRIÇÃO — INCLUSIVE AS QUE ESTA PLATAFORMA POSSA OFERECER.`)
    }
    // Só empurra um alerta se há substância concreta a evitar (não pela categoria solta).
    if (semAINE || temMed('DIPIRONA') || (temMed('OUTRA') && outroMed)) {
      alertas.push({ codigo: 'alergico.alergia_medicamentosa_declarada', nivel: LEVE, texto: `ALERGIA MEDICAMENTOSA DECLARADA (${med.filter(m => m !== 'PENICILINAS' && m !== 'CEFALOSPORINAS').join(', ') || 'ver anamnese'}) — CONSIDERAR ANTES DE QUALQUER PRESCRIÇÃO. ${semAINE ? 'AINEs/ASPIRINA JÁ SÃO DESACONSELHADOS NO BARIÁTRICO (SANGRAMENTO).' : ''}`.trim() })
    }
  }

  // ── RESPIRATÓRIA / DERMATITE — ligação fraca, crítica enxuta ───────────────
  if (tem('RESPIRATÓRIA')) {
    bump(LEVE)
    linhas.push('ALERGIA RESPIRATÓRIA: SE VOCÊ USA CORTICOIDE ORAL COM FREQUÊNCIA PARA CONTROLÁ-LA, INFORME AO MÉDICO — O CORTICOIDE ORAL REPETIDO PREJUDICA O OSSO, QUE JÁ É FRÁGIL NO PÓS-BARIÁTRICO. O CONTROLE AMBIENTAL E OS SPRAYS NASAIS REDUZEM ESSA NECESSIDADE.')
  }
  if (tem('DERMATITE')) {
    bump(LEVE)
    linhas.push('DERMATITE / ALERGIA DE PELE: EM GERAL BENIGNA. SE ELA PIOROU DEPOIS DA CIRURGIA OU VEM COM QUEDA DE CABELO E UNHAS FRACAS, PODE HAVER UM COMPONENTE NUTRICIONAL POR TRÁS (ZINCO, BIOTINA, ÁCIDOS GRAXOS) — VALE COMENTAR COM O NUTRICIONISTA.')
  }

  if (!linhas.length) return null
  return { id: 'alergico', titulo: 'STATUS ALÉRGICO', nivel, linhas }
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO — SAÚDE PROSTÁTICA (declarada na anamnese)
// O `status_prostatico` e os `prostata_cancer_tratamentos` eram órfãos. O PSA (exame)
// é criticado no módulo oncológico — que agora também lê estes campos para não usar
// o corte de 4 ng/mL em quem operou (o alvo lá é indetectável) ou irradiou.
// Aqui ficam as implicações do que ele DECLARA — e o cruzamento que motivou a frente:
// reposição de testosterona é contraindicada no câncer de próstata em atividade.
// ─────────────────────────────────────────────────────────────────────────────
function buildModProstatico(dados, alertas, suger) {
  if ((dados.sexo || 'F') !== 'M') return null
  const prost = Array.isArray(dados.status_prostatico) ? dados.status_prostatico : []
  if (!prost.length) return null
  const tem = (x) => prost.includes(x)
  const trats = Array.isArray(dados.prostata_cancer_tratamentos) ? dados.prostata_cancer_tratamentos : []

  const RANK = { [GRAVE]: 3, [MODERADO]: 2, [LEVE]: 1, [NORMAL]: 0 }
  let nivel = NORMAL
  const bump = (n) => { if (RANK[n] > RANK[nivel]) nivel = n }
  const linhas = []

  if (tem('CÂNCER')) {
    // 'EM TRATAMENTO' foi desmembrado (Dr. Ramos): agora o motor SABE qual é o
    // tratamento em vez de assumir bloqueio hormonal. Isso importa porque cada um
    // bate diferente no eritron — e o eritron é o eixo deste app.
    const hormonal = trats.includes('EM TRATAMENTO HORMONAL (BLOQUEIO)')
    const quimio = trats.includes('EM QUIMIOTERAPIA')
    const vigilancia = trats.includes('EM VIGILÂNCIA ATIVA')
    const emTratamento = hormonal || quimio
    const curado = trats.includes('CURADO')
    const operado = trats.includes('OPERADO')
    const radio = trats.includes('RADIOTERAPIA')

    bump(emTratamento ? GRAVE : MODERADO)
    const comoTrat = trats.length ? ` (${trats.join(', ')})` : ' (TRATAMENTO NÃO INFORMADO)'
    linhas.push(`CÂNCER DE PRÓSTATA${comoTrat}: MANTENHA O SEGUIMENTO UROLÓGICO/ONCOLÓGICO. INFORME À SUA EQUIPE QUE VOCÊ É BARIÁTRICO — A ABSORÇÃO DE MEDICAMENTOS ORAIS ESTÁ REDUZIDA E ISSO PODE AFETAR AS DOSES.`)

    // ── SEGURANÇA: testosterona × câncer de próstata ──
    // A plataforma coleta 'REPOSIÇÃO DE TESTOSTERONA' (status_hormonal) e critica no
    // módulo hormonal. Sem este cruzamento, os dois viviam no mesmo relatório sem
    // ninguém conectar — e a testosterona alimenta o tumor androgênio-dependente.
    // Os alertas desta seção NÃO são consolidados de propósito (diferente da FE e da
    // TRT, onde a soma inflava o estado): aqui a régua já satura em GRAVE com um só,
    // e os três pedem AÇÕES distintas — revisar a reposição, tratar o efeito do
    // bloqueio hormonal, escalar o PSA à equipe. Consolidar perderia conduta.
    if ((dados.status_hormonal || []).includes('REPOSIÇÃO DE TESTOSTERONA')) {
      bump(GRAVE)
      linhas.push('⚠ ATENÇÃO — VOCÊ DECLAROU CÂNCER DE PRÓSTATA E REPOSIÇÃO DE TESTOSTERONA AO MESMO TEMPO. O CÂNCER DE PRÓSTATA É, EM REGRA, ALIMENTADO PELA TESTOSTERONA: TANTO É ASSIM QUE UM DOS TRATAMENTOS CONSISTE JUSTAMENTE EM BLOQUEAR ESSE HORMÔNIO. REPOR TESTOSTERONA NESSE CONTEXTO É UMA DECISÃO DELICADA, QUE SÓ PODE SER TOMADA PELO UROLOGISTA/ONCOLOGISTA QUE ACOMPANHA O SEU CASO — E QUE PRECISA SABER DAS DUAS COISAS. NÃO SUSPENDA NADA POR CONTA PRÓPRIA: LEVE ESTA INFORMAÇÃO A ELE COM PRIORIDADE.')
      alertas.push({ codigo: 'prostatico.cancer_de_prostata_reposicao_de_testosterona', nivel: GRAVE, texto: 'CÂNCER DE PRÓSTATA + REPOSIÇÃO DE TESTOSTERONA DECLARADOS JUNTOS — O TUMOR PROSTÁTICO É ANDROGÊNIO-DEPENDENTE (O BLOQUEIO HORMONAL É TRATAMENTO). CONFIRMAR COM O UROLOGISTA/ONCOLOGISTA SE A REPOSIÇÃO ESTÁ MESMO INDICADA. NÃO SUSPENDER POR CONTA PRÓPRIA.' })
      suger.push('AVALIAÇÃO COM UROLOGISTA/ONCOLOGISTA (REPOSIÇÃO DE TESTOSTERONA EM CÂNCER DE PRÓSTATA)')
    }

    // Bloqueio hormonal (privação de androgênio): bate nos DOIS eixos deste app.
    if (hormonal) {
      linhas.push('O SEU TRATAMENTO É O BLOQUEIO HORMONAL (PRIVAÇÃO DE ANDROGÊNIO), E ELE SOMA DOIS EFEITOS AO SEU CONTEXTO BARIÁTRICO. O PRIMEIRO É NO SANGUE: O BLOQUEIO CAUSA ANEMIA POR SI — ENTÃO A SUA ANEMIA PODE TER DUAS CAUSAS SOMADAS, E CORRIGIR SÓ O FERRO PODE NÃO RESOLVER TUDO. O SEGUNDO É NO OSSO: ELE ACELERA A PERDA DE MASSA ÓSSEA, QUE JÁ É UM PONTO FRÁGIL DEPOIS DA CIRURGIA — OS DOIS JUNTOS PEDEM DENSITOMETRIA E ATENÇÃO REDOBRADA A CÁLCIO E VITAMINA D.')
      alertas.push({ codigo: 'prostatico.cancer_de_prostata_em_bloqueio_hormonal_causa', nivel: GRAVE, texto: 'CÂNCER DE PRÓSTATA EM BLOQUEIO HORMONAL — CAUSA ANEMIA (SOMA-SE À CARÊNCIA BARIÁTRICA) E ACELERA A PERDA ÓSSEA (SOMA-SE À DA CIRURGIA). LER O ERITRON NESSE CONTEXTO; DENSITOMETRIA E ATENÇÃO A CÁLCIO/VIT. D.' })
      // O módulo ósseo já sugere densitometria com sufixo próprio ("(SE NÃO RECENTE)"/
      // "(ANUAL)") quando status_osseo é OSTEOPOROSE/OSTEOPENIA — o dedup por Set não
      // reconhece como a mesma. Mesma guarda já usada no módulo alérgico (~l.2761).
      const osseoDeclProst = dados.status_osseo || ''
      if (!/OSTEOPOROSE|OSTEOPENIA/.test(osseoDeclProst)) suger.push('DENSITOMETRIA ÓSSEA')
    }

    if (quimio) {
      linhas.push('VOCÊ ESTÁ EM QUIMIOTERAPIA: ELA DEPRIME A MEDULA ÓSSEA (ANEMIA, QUEDA DE LEUCÓCITOS E DE PLAQUETAS), E ESSE EFEITO SE SOMA ÀS CARÊNCIAS DO PÓS-BARIÁTRICO — O SEU HEMOGRAMA PRECISA SER LIDO NESSE CONTEXTO E MONITORADO DE PERTO PELA SUA EQUIPE. NÃO INICIE REPOSIÇÃO DE FERRO POR CONTA PRÓPRIA DURANTE O TRATAMENTO: ALINHE COM O ONCOLOGISTA.')
      alertas.push({ codigo: 'prostatico.cancer_de_prostata_em_quimioterapia_deprime_a', nivel: GRAVE, texto: 'CÂNCER DE PRÓSTATA EM QUIMIOTERAPIA — DEPRIME A MEDULA E SOMA-SE ÀS CARÊNCIAS BARIÁTRICAS. LER O ERITRON NESSE CONTEXTO; ALINHAR QUALQUER REPOSIÇÃO COM O ONCOLOGISTA.' })
    }

    if (vigilancia && !emTratamento) {
      linhas.push('VOCÊ ESTÁ EM VIGILÂNCIA ATIVA: ISSO SIGNIFICA ACOMPANHAR DE PERTO SEM TRATAR AGORA — UMA CONDUTA LEGÍTIMA E BEM ESTABELECIDA PARA TUMORES DE BAIXO RISCO. O QUE ELA EXIGE DE VOCÊ É DISCIPLINA COM O CALENDÁRIO: PSA E CONSULTAS NA PERIODICIDADE COMBINADA. A BOA NOTÍCIA PARA O SEU CASO É QUE, SEM BLOQUEIO HORMONAL NEM QUIMIOTERAPIA, O SEU ERITRON NÃO SOFRE INTERFERÊNCIA DO TRATAMENTO — O QUE APARECER NO HEMOGRAMA É DA CIRURGIA OU DE OUTRA CAUSA, E DEVE SER INVESTIGADO COMO TAL.')
    }

    if (radio) {
      linhas.push('RADIOTERAPIA DE PRÓSTATA: A IRRADIAÇÃO DA PELVE PODE CAUSAR, ANOS DEPOIS, UMA INFLAMAÇÃO CRÔNICA DO RETO (PROCTITE ACTÍNICA) QUE SANGRA POUCO E DE FORMA CONTÍNUA. NO BARIÁTRICO ISSO É PARTICULARMENTE TRAIÇOEIRO: É MAIS UMA FONTE DE PERDA DE FERRO SOMADA À ABSORÇÃO JÁ REDUZIDA. SE VOCÊ NOTA SANGUE NAS FEZES OU TEM ANEMIA QUE NÃO MELHORA COM FERRO, INVESTIGUE ISSO — NÃO ASSUMA QUE É SÓ DA CIRURGIA.')
      suger.push('SANGUE OCULTO NAS FEZES')
    }

    if (operado) {
      // A remissão ao card oncológico só vale se ele existir: o bloco do PSA lá é
      // fechado por idade >= 40 (l.~1740), enquanto ESTA seção abre aos 38 na tela.
      // Sem a guarda, o homem de 38-39 seria mandado a um card inexistente.
      const temCardOncol = Number(dados.idade) >= 40
      linhas.push(`CIRURGIA DE PRÓSTATA REALIZADA: O SEU PSA PASSA A SER LIDO DE OUTRA FORMA${temCardOncol ? ' — VEJA O CARD DE RASTREAMENTO ONCOLÓGICO' : ''}. SEM PRÓSTATA NÃO HÁ DE ONDE PRODUZIR PSA, ENTÃO O ALVO É INDETECTÁVEL, E NÃO "ABAIXO DE 4": A PARTIR DE 0,2 JÁ SE FALA EM RECIDIVA. LEVE ISSO AO SEU UROLOGISTA.`)
    }

    if (curado && !emTratamento) {
      linhas.push('VOCÊ MARCOU O CÂNCER COMO CURADO: ÓTIMO — MANTENHA MESMO ASSIM O SEGUIMENTO COM PSA NA PERIODICIDADE COMBINADA COM O UROLOGISTA. É A TENDÊNCIA DO PSA AO LONGO DO TEMPO QUE MOSTRA UMA RECIDIVA PRECOCE, E ELA APARECE ANTES DE QUALQUER SINTOMA.')
    }
    if (!trats.length) {
      linhas.push('VOCÊ NÃO INFORMOU QUAL FOI (OU É) O SEU TRATAMENTO. ESSA INFORMAÇÃO MUDA A LEITURA DO SEU PSA E DO SEU HEMOGRAMA — INFORME-A NA PRÓXIMA AVALIAÇÃO.')
    }
  }

  if (tem('HIPERPLASIA BENIGNA')) {
    bump(LEVE)
    linhas.push('HIPERPLASIA BENIGNA DA PRÓSTATA: CONDIÇÃO COMUM COM A IDADE E NÃO É CÂNCER. DOIS PONTOS ÚTEIS: ELA PODE ELEVAR O PSA SEM QUE HAJA TUMOR (POR ISSO O VALOR SEMPRE SE INTERPRETA COM O UROLOGISTA, NUNCA SOZINHO); E SE VOCÊ USA FINASTERIDA OU DUTASTERIDA, SAIBA QUE ESSES REMÉDIOS REDUZEM O PSA PELA METADE — O SEU UROLOGISTA PRECISA SABER PARA DOBRAR O VALOR NA HORA DE INTERPRETAR, SENÃO UM PSA "NORMAL" PODE ESCONDER UM PROBLEMA.')
    alertas.push({ codigo: 'prostatico.hiperplasia_benigna_da_prostata_eleva_o_psa_s', nivel: LEVE, texto: 'HIPERPLASIA BENIGNA DA PRÓSTATA — ELEVA O PSA SEM TUMOR; E FINASTERIDA/DUTASTERIDA REDUZEM O PSA PELA METADE (INFORMAR AO UROLOGISTA PARA A CORRETA INTERPRETAÇÃO).' })
  }

  if (tem('OK. AVALIADO POR MÉDICO') && !tem('CÂNCER') && !tem('HIPERPLASIA BENIGNA')) {
    // Sem bump: o nível já nasce NORMAL e não há nada a agravar — é reforço positivo.
    linhas.push('PRÓSTATA JÁ AVALIADA POR MÉDICO E SEM ACHADOS: MANTENHA O RASTREIO NA PERIODICIDADE ORIENTADA PELO SEU UROLOGISTA.')
  }

  if (!linhas.length) return null
  if (tem('CÂNCER') || tem('HIPERPLASIA BENIGNA')) suger.push('AVALIAÇÃO COM UROLOGISTA')
  return { id: 'prostatico', titulo: 'SAÚDE PROSTÁTICA', nivel, linhas }
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO — RESPIRATÓRIO / TABAGISMO
// O fumo era coletado em DOIS lugares e ignorado nos dois: 'TABAGISTA | DPOC'
// (status_respiratorio) e 'CIGARRO / TABACO' (compulsoes — buildModComportamental
// só trata álcool/doces/comida/gelo/compras/jogo). Aqui os dois viram UM achado.
// Antes disso o motor já FALAVA de tabagismo sem saber se a paciente fuma: a
// crítica do CEA elevado ("tabagismo também eleva CEA") e a da aterosclerose.
// ─────────────────────────────────────────────────────────────────────────────
function buildModRespiratorio(dados, examesOBA, alertas, suger) {
  const resp = Array.isArray(dados.status_respiratorio) ? dados.status_respiratorio : []
  const comp = Array.isArray(dados.compulsoes) ? dados.compulsoes : []
  const temResp = (x) => resp.includes(x)

  const tabagista = pacienteFuma(dados)
  const compulsaoCigarro = comp.includes('CIGARRO / TABACO')

  const RANK = { [GRAVE]: 3, [MODERADO]: 2, [LEVE]: 1, [NORMAL]: 0 }
  let nivel = NORMAL
  const bump = (n) => { if (RANK[n] > RANK[nivel]) nivel = n }
  const linhas = []

  if (tabagista) {
    // MODERADO por decisão do Dr. Ramos (jul/2026): o risco do cigarro é CRÔNICO, não
    // agudo. Como GRAVE, todo fumante viraria CRÍTICO sozinho (a régua faz graves>=1 →
    // CRÍTICO) — e fumar é comum: gastaria o rótulo e diluiria o alarme dos casos
    // realmente agudos. Quem fuma E tem outro achado sobe pela régua naturalmente.
    bump(MODERADO)
    linhas.push('TABAGISMO: É O FATOR DE RISCO EVITÁVEL MAIS IMPORTANTE QUE VOCÊ PODE TRATAR HOJE. NO PÓS-BARIÁTRICO ELE PESA AINDA MAIS: O CIGARRO MULTIPLICA O RISCO DE ÚLCERA NA ANASTOMOSE (A EMENDA CIRÚRGICA), QUE PODE SANGRAR, PERFURAR E EXIGIR NOVA CIRURGIA. É A COMPLICAÇÃO TARDIA MAIS ASSOCIADA AO FUMO NESSE GRUPO.')
    linhas.push('O CIGARRO TAMBÉM ATACA O SEU FERRO POR DOIS CAMINHOS: A ÚLCERA E A GASTRITE SANGRAM DE FORMA OCULTA E CRÔNICA, E O MONÓXIDO DE CARBONO OCUPA O LUGAR DO OXIGÊNIO NA HEMOGLOBINA — O QUE PODE MASCARAR UMA ANEMIA, PORQUE O CORPO PRODUZ MAIS GLÓBULOS PARA COMPENSAR E A HEMOGLOBINA "PARECE" MELHOR DO QUE A SUA OXIGENAÇÃO REAL.')
    linhas.push('SOMANDO: TABAGISMO É FATOR DE RISCO PARA ATEROSCLEROSE, INFARTO, AVC E PARA VÁRIOS CÂNCERES (PULMÃO, ESÔFAGO, ESTÔMAGO, BEXIGA). PARAR DE FUMAR TEM BENEFÍCIO EM QUALQUER IDADE E EM QUALQUER TEMPO DE CIRURGIA — PEÇA AJUDA, EXISTE TRATAMENTO (O SUS OFERECE O PROGRAMA DE CESSAÇÃO GRATUITO).')
    // O checkbox junta TABAGISTA e DPOC numa opção só: quem tem DPOC e JÁ PAROU
    // receberia uma ordem de parar de fumar deslocada. Enquanto o dado for ambíguo,
    // o texto cobre os dois cenários em vez de presumir fumo ativo.
    if (temResp('TABAGISTA | DPOC')) {
      linhas.push('SE VOCÊ JÁ PAROU DE FUMAR E MARCOU ESSA OPÇÃO POR CAUSA DO DPOC: PARABÉNS, A DECISÃO MAIS IMPORTANTE JÁ FOI TOMADA. O DPOC AINDA ASSIM PEDE ACOMPANHAMENTO PNEUMOLÓGICO, VACINAÇÃO EM DIA (GRIPE E PNEUMOCOCO) E ATENÇÃO AO CORTICOIDE ORAL REPETIDO, QUE PREJUDICA O OSSO — JÁ FRÁGIL NO PÓS-BARIÁTRICO.')
      suger.push('AVALIAÇÃO PNEUMOLÓGICA')
    }
    alertas.push({ codigo: 'respiratorio.tabagismo_no_pos_bariatrico_risco_muito_aumen', nivel: MODERADO, texto: 'TABAGISMO NO PÓS-BARIÁTRICO — RISCO MUITO AUMENTADO DE ÚLCERA DE ANASTOMOSE (SANGRAMENTO/PERFURAÇÃO) E DE SANGRIA OCULTA QUE AGRAVA A FERROPENIA; O CO MASCARA A ANEMIA. FATOR DE RISCO EVITÁVEL — ENCAMINHAR PARA CESSAÇÃO DO TABAGISMO.' })
    suger.push('AVALIAÇÃO PARA CESSAÇÃO DO TABAGISMO')
    suger.push('SANGUE OCULTO NAS FEZES')

    if (compulsaoCigarro) {
      linhas.push('VOCÊ MARCOU O CIGARRO COMO COMPULSÃO: NO PÓS-BARIÁTRICO ISSO PODE SER TRANSFERÊNCIA DE ADIÇÃO (O COMPORTAMENTO COMPULSIVO COM A COMIDA MIGRA PARA OUTRA SUBSTÂNCIA) — O MESMO MECANISMO DO ÁLCOOL. TRATAR SÓ A NICOTINA SEM OLHAR O COMPORTAMENTO TENDE A FALHAR: AVALIAÇÃO COM PSIQUIATRA/PSICÓLOGO JUNTO COM A CESSAÇÃO.')
      suger.push('AVALIAÇÃO COM PSIQUIATRA (compulsão por cigarro — transferência de adição)')
    }

    // O CEA já é explicado no módulo oncológico (que cita tabagismo genericamente,
    // sem saber se ela fuma). Aqui só se acrescenta o que ELE não pode dizer — sem
    // repetir o valor nem a explicação, que a paciente já leu no card de lá.
    // Corte DIMÓRFICO, o mesmo do oncológico (l.1620): M 5 / F 3.8. O gate de idade
    // também é o de lá (l.1608): sem ele, um CEA em <40 remeteria a um card que não
    // existe. Hoje inalcançável (a UI só oferece CEA a partir dos 40), mas a remissão
    // não pode depender de um detalhe da tela para não mentir.
    const cea = Number(examesOBA?.cea)
    const limCea = dados.sexo === 'M' ? 5 : 3.8
    if (Number(dados.idade) >= 40 && Number.isFinite(cea) && cea > limCea) {
      linhas.push('SOBRE O SEU CEA ELEVADO (VEJA O CARD DE RASTREAMENTO ONCOLÓGICO): O CIGARRO REALMENTE ELEVA ESSE MARCADOR, MAS NÃO USE ISSO COMO EXPLICAÇÃO PARA DEIXAR DE INVESTIGAR — SÓ O ONCOLOGISTA PODE CONCLUIR QUE A CAUSA É BENIGNA, DEPOIS DE AFASTAR AS OUTRAS.')
    }
  }

  if (temResp('ASMA | BRONCOESPASMOS')) {
    bump(LEVE)
    linhas.push('ASMA / BRONCOESPASMOS: A PERDA DE PESO COSTUMA MELHORAR MUITO O CONTROLE DA ASMA. SE VOCÊ USA CORTICOIDE ORAL COM FREQUÊNCIA, INFORME AO SEU MÉDICO — O USO REPETIDO PREJUDICA O OSSO, QUE JÁ É UM PONTO FRÁGIL NO PÓS-BARIÁTRICO. MANTENHA O ACOMPANHAMENTO PNEUMOLÓGICO E A VACINAÇÃO EM DIA.')
    alertas.push({ codigo: 'respiratorio.asma_broncoespasmos_a_perda_de_peso_tende_a_m', nivel: LEVE, texto: 'ASMA / BRONCOESPASMOS — A PERDA DE PESO TENDE A MELHORAR O CONTROLE; ATENÇÃO AO CORTICOIDE ORAL REPETIDO (RISCO ÓSSEO SOMADO AO DO PÓS-BARIÁTRICO).' })
  }

  if (temResp('RINITE | SINUSITE')) {
    bump(LEVE)
    linhas.push('RINITE / SINUSITE: CONDIÇÃO COMUM E EM GERAL BENIGNA. SE HÁ ALERGIA ENVOLVIDA, O CONTROLE AMBIENTAL AJUDA. A RESPIRAÇÃO PELA BOCA QUE ELA CAUSA PIORA O RONCO E A QUALIDADE DO SONO — RELEVANTE SE VOCÊ TAMBÉM TEM APNEIA.')
    // Alerta LEVE pelo mesmo motivo de SOP/cistos (f5352d0): sem ele o achado não
    // aparece no topo do card do médico, que lista os alertas.
    alertas.push({ codigo: 'respiratorio.rinite_sinusite_em_geral_benigna_a_respiracao', nivel: LEVE, texto: 'RINITE / SINUSITE — EM GERAL BENIGNA; A RESPIRAÇÃO BUCAL PIORA RONCO E SONO (RELEVANTE SE HOUVER APNEIA).' })
  }

  if (!linhas.length) return null
  return { id: 'respiratorio', titulo: 'SAÚDE RESPIRATÓRIA', nivel, linhas }
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO — CARDIOVASCULAR (declarado na anamnese)
// Crítica SIMPLIFICADA por decisão do Dr. Ramos (jul/2026): reconhecer os achados
// e DIRECIONAR PARA AVALIAÇÃO CARDIOLÓGICA — não tentar interpretar cada número
// (fração de ejeção, score de cálcio, grau de estenose) dentro do OBA.
//
// Três eixos que ele pediu para considerar:
//   1. SOBREPESO PREGRESSO — todo bariátrico teve sobrecarga cardíaca e pulmonar;
//      é contexto universal (linha sem alerta, para não virar ruído em massa).
//   2. DISLIPIDEMIA / ATEROSCLEROSE — fatores de risco. O RISCO POR LIPÍDIOS JÁ É
//      CALCULADO em buildModLipidico (score + alerta próprio); aqui só se conecta
//      com a doença aterosclerótica DECLARADA (carótidas, arterial periférica).
//   3. ANGINA / ANGIOPLASTIA / REVASCULARIZAÇÃO — doença coronariana estabelecida,
//      não pode ser negligenciada → GRAVE.
// ─────────────────────────────────────────────────────────────────────────────
// Fração de ejeção: cortes de consenso (ESC/AHA) — ≤40 reduzida, 41-49 levemente
// reduzida, ≥50 preservada. Faixa PLAUSÍVEL para não interpretar erro de digitação
// (quem digita "0.55" querendo 55% não pode disparar um alerta GRAVE falso).
const FE_REDUZIDA = 40
const FE_LEVE_REDUZIDA = 49
const FE_MIN_PLAUSIVEL = 10
const FE_MAX_PLAUSIVEL = 80

function buildModCardiovascular(dados, resultadoEritron, examesOBA, alertas, suger) {
  const cv = dados.status_cardiovascular || []
  const temCv = (x) => cv.includes(x)

  const RANK = { [GRAVE]: 3, [MODERADO]: 2, [LEVE]: 1, [NORMAL]: 0 }
  let nivel = NORMAL
  const bump = (n) => { if (RANK[n] > RANK[nivel]) nivel = n }
  const linhas = []
  let precisaCardio = false

  // ── 1. Contexto universal: sobrepeso pregresso ─────────────────────────────
  const imcAntes = Number(dados.imc_antes)
  if (Number.isFinite(imcAntes) && imcAntes >= 35) {
    bump(LEVE)
    linhas.push(`SEU IMC ANTES DA CIRURGIA ERA ${imcAntes.toFixed(1)}: A OBESIDADE IMPÔS ANOS DE SOBRECARGA AO CORAÇÃO E AOS PULMÕES (HIPERTROFIA DO VENTRÍCULO, MAIOR TRABALHO CARDÍACO, APNEIA DO SONO E MENOR CAPACIDADE RESPIRATÓRIA). A CIRURGIA REDUZ ESSA CARGA E MELHORA MUITO O PROGNÓSTICO, MAS O QUE JÁ FOI IMPOSTO AO CORAÇÃO NÃO SE APAGA SOZINHO — O SOBREPESO PREGRESSO CONTINUA SENDO FATOR DE RISCO E JUSTIFICA ACOMPANHAMENTO CARDIOLÓGICO PERIÓDICO MESMO QUE VOCÊ ESTEJA SE SENTINDO BEM.`)
  }

  // ── 2. Doença coronariana estabelecida — o eixo que não pode ser negligenciado ──
  const coronarianas = []
  if (temCv('TENHO ANGINA')) coronarianas.push('ANGINA')
  if (temCv('FIZ CATETERISMO + ANGIOPLASTIA')) coronarianas.push('ANGIOPLASTIA (CATETERISMO)')
  if (temCv('FIZ CIRURGIA | REVASCULARIZAÇÃO')) coronarianas.push('CIRURGIA DE REVASCULARIZAÇÃO')
  if (coronarianas.length) {
    bump(GRAVE)
    precisaCardio = true
    linhas.push(`${coronarianas.join(' + ')}: VOCÊ TEM DOENÇA CORONARIANA ESTABELECIDA — ISSO NÃO PODE SER NEGLIGENCIADO E MUDA A PRIORIDADE DE TUDO O QUE VEM A SEGUIR. MANTENHA O ACOMPANHAMENTO CARDIOLÓGICO REGULAR E A MEDICAÇÃO EM DIA.`)
    if (temCv('TENHO ANGINA')) {
      linhas.push('A ANGINA É UM SINTOMA ATIVO: DOR OU APERTO NO PEITO QUE PIORA COM ESFORÇO OU NÃO PASSA EM REPOUSO EXIGE ATENDIMENTO DE EMERGÊNCIA IMEDIATO (192) — NÃO ESPERE A PRÓXIMA CONSULTA.')
    }
    linhas.push('DOIS PONTOS QUE LIGAM O SEU CORAÇÃO À BARIÁTRICA: (1) A ANEMIA SOBRECARREGA O CORAÇÃO E PIORA A ANGINA — CORRIGIR O ERITRON É PARTE DO SEU CUIDADO CARDÍACO; (2) A ABSORÇÃO DE MEDICAMENTOS ORAIS ESTÁ REDUZIDA APÓS A CIRURGIA — INFORME O SEU CARDIOLOGISTA QUE VOCÊ É BARIÁTRICO(A) PARA QUE ELE REAVALIE AS DOSES.')
    alertas.push({ codigo: 'cardiovascular.doenca_coronariana_estabelecida_acompanhament', nivel: GRAVE, texto: `${coronarianas.join(' + ')} — DOENÇA CORONARIANA ESTABELECIDA. ACOMPANHAMENTO CARDIOLÓGICO REGULAR; A ANEMIA AGRAVA A ISQUEMIA E A ABSORÇÃO DE MEDICAMENTOS ORAIS ESTÁ REDUZIDA NO PÓS-BARIÁTRICO (REAVALIAR DOSES).` })
  }

  // ── 3. Aterosclerose declarada em outros territórios ───────────────────────
  const ateros = []
  if (dados.doppler_carotidas === 'ANORMAL') {
    const est = Number(dados.estenose_maxima)
    ateros.push(Number.isFinite(est) && est > 0 ? `DOPPLER DE CARÓTIDAS ANORMAL (ESTENOSE MÁXIMA ${est}%)` : 'DOPPLER DE CARÓTIDAS ANORMAL')
  }
  if (dados.doenca_arterial_periferica) ateros.push('DOENÇA ARTERIAL PERIFÉRICA')
  if (ateros.length) {
    bump(GRAVE)
    precisaCardio = true
    // Agora o motor SABE se ela fuma (pacienteFuma) — não citar tabagismo às cegas
    // numa lista genérica de fatores de risco: ou é o fator dela, ou não se menciona.
    const fuma = pacienteFuma(dados)
    linhas.push(`${ateros.join(' + ')}: A ATEROSCLEROSE NÃO É UMA DOENÇA DE UM VASO SÓ — QUEM TEM PLACA NA CARÓTIDA OU NAS PERNAS TEM RISCO AUMENTADO NAS CORONÁRIAS E NO CÉREBRO TAMBÉM. ISSO PEDE AVALIAÇÃO CARDIOLÓGICA E CONTROLE RIGOROSO DOS FATORES DE RISCO (LÍPIDES, PRESSÃO E GLICEMIA).${fuma ? ' E, NO SEU CASO, O FATOR MAIS URGENTE É O CIGARRO: FUMAR COM ATEROSCLEROSE JÁ INSTALADA ACELERA A PLACA E MULTIPLICA O RISCO DE INFARTO E AVC — VEJA O CARD DE SAÚDE RESPIRATÓRIA.' : ''}`)
    alertas.push({ codigo: 'cardiovascular.doenca_aterosclerotica_estabelecida_risco_sis', nivel: GRAVE, texto: `${ateros.join(' + ')} — DOENÇA ATEROSCLERÓTICA ESTABELECIDA (RISCO SISTÊMICO, NÃO LOCAL). AVALIAÇÃO CARDIOLÓGICA E CONTROLE DOS FATORES DE RISCO.` })
  }

  // ── 4. Exames cardíacos alterados — reconhecer e encaminhar, sem interpretar ──
  // Number(null) é 0 — distinguir "não informada" de um "0" digitado, senão o zero
  // escaparia sem crítica E sem aviso de valor implausível.
  const feInformada = dados.fracao_ejecao !== null && dados.fracao_ejecao !== undefined && dados.fracao_ejecao !== ''
  const fe = Number(dados.fracao_ejecao)
  const fePlausivel = feInformada && Number.isFinite(fe) && fe >= FE_MIN_PLAUSIVEL && fe <= FE_MAX_PLAUSIVEL
  const feBaixa = fePlausivel && fe <= FE_LEVE_REDUZIDA

  const alterados = []
  if (dados.ecg === 'ALTERADO') alterados.push('ECG ALTERADO')
  if (dados.ecg_arritmia) alterados.push('ARRITMIA')
  if (dados.ecocardiograma === 'ANORMAL') {
    // FE baixa tem crítica PRÓPRIA abaixo — aqui só entra como achado a esclarecer
    // se a fração estiver preservada (eco anormal por outro motivo) ou não informada.
    if (!feBaixa) {
      alterados.push(Number.isFinite(fe) && fe > 0 ? `ECOCARDIOGRAMA ANORMAL (FRAÇÃO DE EJEÇÃO ${fe}%)` : 'ECOCARDIOGRAMA ANORMAL')
    }
  }
  if (dados.angiotomografia_coronariana) {
    // Sem o score, o exame não pode sumir do relatório: ela declarou que fez.
    const sc = Number(dados.score_calcio)
    alterados.push(Number.isFinite(sc) && sc > 0
      ? `ANGIOTOMOGRAFIA CORONARIANA COM SCORE DE CÁLCIO ${sc}`
      : 'ANGIOTOMOGRAFIA CORONARIANA REALIZADA (SCORE DE CÁLCIO NÃO INFORMADO — LEVE O LAUDO)')
  }
  if (alterados.length) {
    bump(MODERADO)
    precisaCardio = true
    linhas.push(`ACHADOS QUE VOCÊ REGISTROU: ${alterados.join('; ')}. ESTES EXAMES PRECISAM SER INTERPRETADOS POR UM CARDIOLOGISTA, COM OS LAUDOS EM MÃOS E NO SEU CONTEXTO CLÍNICO — ESTA AVALIAÇÃO NÃO SUBSTITUI ISSO. LEVE OS EXAMES NA CONSULTA.`)
    // Dedup (auditoria): ECG alterado e arritmia são ESPERADOS em quem usa marcapasso.
    // Se os achados forem SÓ esses e há marcapasso, o alerta do marcapasso (abaixo) já
    // manda ao cardiologista — não empurrar um 2º moderado do mesmo eixo. Eco/score
    // alterados são achados independentes e mantêm o alerta.
    const soExplicavelPeloMarcapasso = dados.ecg_marcapasso &&
      alterados.every(a => a === 'ECG ALTERADO' || a === 'ARRITMIA')
    if (!soExplicavelPeloMarcapasso) {
      alertas.push({ codigo: 'cardiovascular.achados_cardiovasculares_a_esclarecer', nivel: MODERADO, texto: `ACHADOS CARDIOVASCULARES A ESCLARECER (${alterados.join('; ')}) — AVALIAÇÃO CARDIOLÓGICA COM OS LAUDOS.` })
    }
  }

  // ── 4b. FRAÇÃO DE EJEÇÃO BAIXA — crítica própria (Dr. Ramos, jul/2026) ─────
  // Exceção deliberada ao "simplificada": a FE reduzida não é só mais um exame a
  // esclarecer, é insuficiência cardíaca — e conecta DIRETO com o eixo do OBA:
  // na IC o corte de ferropenia é OUTRO (ferritina <100, ou 100-299 com sat <20%),
  // muito acima dos 25 do obaCutoffs, e ferro EV melhora sintomas e internação
  // MESMO SEM ANEMIA. Uma paciente com FE 35 e ferritina 60 passa "normal" pela
  // nossa régua e é carente pela régua cardíaca — é isso que este bloco pega.
  if (feBaixa) {
    const reduzida = fe <= FE_REDUZIDA
    bump(reduzida ? GRAVE : MODERADO)
    precisaCardio = true
    linhas.push(`FRAÇÃO DE EJEÇÃO ${fe}% — ${reduzida ? 'REDUZIDA' : 'LEVEMENTE REDUZIDA'} (O NORMAL É 50% OU MAIS): ${reduzida
      ? 'ISSO CARACTERIZA INSUFICIÊNCIA CARDÍACA COM FRAÇÃO DE EJEÇÃO REDUZIDA — O CORAÇÃO ESTÁ BOMBEANDO MENOS SANGUE DO QUE DEVERIA A CADA BATIDA. É UMA CONDIÇÃO SÉRIA, MAS COM TRATAMENTO BEM ESTABELECIDO QUE MUDA O PROGNÓSTICO. ACOMPANHAMENTO CARDIOLÓGICO REGULAR É INDISPENSÁVEL — NÃO ADIE.'
      : 'É UMA REDUÇÃO DISCRETA, MAS MERECE ACOMPANHAMENTO CARDIOLÓGICO PARA DEFINIR A CAUSA E EVITAR PROGRESSÃO.'}`)
    linhas.push('COM O CORAÇÃO BOMBEANDO MENOS, A ANEMIA PESA MUITO MAIS: PARA COMPENSAR A FALTA DE OXIGÊNIO NO SANGUE, O CORAÇÃO PRECISA TRABALHAR AINDA MAIS — JUSTAMENTE O QUE ELE NÃO PODE FAZER. CORRIGIR O SEU FERRO E A SUA ANEMIA É PARTE DO TRATAMENTO CARDÍACO, NÃO UM ASSUNTO SEPARADO.')

    // Ferropenia pela régua da INSUFICIÊNCIA CARDÍACA (≠ da régua geral do OBA).
    const ferrCv = Number(resultadoEritron?.inputs?.ferritina ?? examesOBA?.ferritina_novo ?? examesOBA?.ferritina_oba)
    const satCv  = Number(resultadoEritron?.inputs?.satTransf ?? examesOBA?.sat_novo)
    const ferrConhecida = Number.isFinite(ferrCv) && ferrCv > 0
    const carenteIC = ferrConhecida && (ferrCv < 100 || (ferrCv < 300 && Number.isFinite(satCv) && satCv > 0 && satCv < 20))
    if (carenteIC) {
      // O nível ACOMPANHA a gravidade da FE (não escala por cima): a carência de
      // ferro é um achado a tratar, não uma emergência — FE levemente reduzida com
      // ferritina 80 não faz um paciente CRÍTICO.
      linhas.push(`ATENÇÃO — A SUA FERRITINA (${ferrCv} ng/mL${Number.isFinite(satCv) && satCv > 0 ? `, SATURAÇÃO ${satCv}%` : ''}) PODE ESTAR "NORMAL" PARA A POPULAÇÃO GERAL E AINDA ASSIM SER INSUFICIENTE PARA VOCÊ: NA INSUFICIÊNCIA CARDÍACA CONSIDERA-SE DEFICIÊNCIA DE FERRO COM FERRITINA ABAIXO DE 100, OU ENTRE 100 E 299 COM SATURAÇÃO DA TRANSFERRINA ABAIXO DE 20%. A REPOSIÇÃO DE FERRO ENDOVENOSO NESSE CENÁRIO MELHORA OS SINTOMAS E REDUZ INTERNAÇÕES MESMO QUANDO NÃO HÁ ANEMIA. LEVE ESTA INFORMAÇÃO AO SEU CARDIOLOGISTA — NO PÓS-BARIÁTRICO, A VIA ORAL AINDA POR CIMA ABSORVE MAL.`)
      suger.push('FERRITINA E SATURAÇÃO DA TRANSFERRINA')
    } else if (!ferrConhecida) {
      linhas.push('DOSE A FERRITINA E A SATURAÇÃO DA TRANSFERRINA: NA INSUFICIÊNCIA CARDÍACA O ALVO DE FERRO É MAIS EXIGENTE QUE O DA POPULAÇÃO GERAL (FERRITINA ABAIXO DE 100 JÁ É CONSIDERADA DEFICIÊNCIA), E A REPOSIÇÃO ENDOVENOSA TRAZ BENEFÍCIO MESMO SEM ANEMIA.')
      suger.push('FERRITINA E SATURAÇÃO DA TRANSFERRINA')
    }

    // UM alerta só para o achado (FE), com o ferro embutido quando houver. Dois pushes
    // aqui inflavam a contagem de `classificarEstadoClinico` (que conta alertas, sem
    // dedup): 1 achado virava 2 moderados e jogava a paciente de RAZOÁVEL p/ RUIM.
    alertas.push({ codigo: 'cardiovascular.fracao_de_ejecao', nivel: reduzida ? GRAVE : MODERADO, texto:
      `FRAÇÃO DE EJEÇÃO ${fe}% (${reduzida ? 'REDUZIDA — INSUFICIÊNCIA CARDÍACA' : 'LEVEMENTE REDUZIDA'}) — ACOMPANHAMENTO CARDIOLÓGICO. A ANEMIA DESCOMPENSA O CORAÇÃO QUE JÁ BOMBEIA MENOS: CORRIGIR O ERITRON É PARTE DO TRATAMENTO CARDÍACO.` +
      (carenteIC ? ` FERRITINA ${ferrCv} ng/mL É DEFICIÊNCIA PELO CRITÉRIO DA INSUFICIÊNCIA CARDÍACA (<100, OU 100-299 COM SAT <20%), AINDA QUE ACIMA DO CORTE GERAL — FERRO ENDOVENOSO MELHORA SINTOMAS E INTERNAÇÕES MESMO SEM ANEMIA; DISCUTIR COM O CARDIOLOGISTA.` : '') })
  } else if (feInformada && !fePlausivel) {
    // Valor fora da faixa plausível (ex.: "0.55" em vez de 55): não interpretar.
    linhas.push(`A FRAÇÃO DE EJEÇÃO REGISTRADA (${fe}) ESTÁ FORA DA FAIXA ESPERADA E NÃO FOI INTERPRETADA — CONFIRA O VALOR NO LAUDO DO ECOCARDIOGRAMA (É UMA PORCENTAGEM, EM GERAL ENTRE 20% E 70%).`)
  }

  // ── 5. Marcapasso × ressonância (segurança) ────────────────────────────────
  // O motor pode sugerir RNM com protocolo de ferro (Sat>50 e Ferritina>1000).
  // Marcapasso é contraindicação/cautela para ressonância — não deixar passar.
  if (dados.ecg_marcapasso) {
    bump(MODERADO)
    precisaCardio = true
    linhas.push('VOCÊ USA MARCAPASSO: INFORME ISSO ANTES DE QUALQUER RESSONÂNCIA MAGNÉTICA — INCLUSIVE A RESSONÂNCIA COM PROTOCOLO DE FERRO, QUE ESTA PLATAFORMA PODE VIR A SUGERIR SE A SUA FERRITINA E A SATURAÇÃO ESTIVEREM MUITO ALTAS. MUITOS MARCAPASSOS MODERNOS SÃO COMPATÍVEIS COM RESSONÂNCIA, MAS SÓ O SEU CARDIOLOGISTA E O SERVIÇO DE IMAGEM PODEM LIBERAR O EXAME, COM O APARELHO PROGRAMADO PARA ISSO. LEVE SEMPRE A CARTEIRINHA DO SEU DISPOSITIVO.')
    alertas.push({ codigo: 'cardiovascular.portador_a_de_marcapasso_confirmar_compatibil', nivel: MODERADO, texto: 'PORTADOR(A) DE MARCAPASSO — CONFIRMAR COMPATIBILIDADE ANTES DE QUALQUER RESSONÂNCIA (INCLUSIVE A DE PROTOCOLO DE FERRO). LIBERAÇÃO PELO CARDIOLOGISTA E PELO SERVIÇO DE IMAGEM.' })
  }

  if (!linhas.length) return null
  if (precisaCardio) suger.push('AVALIAÇÃO CARDIOLÓGICA')
  return { id: 'cardiovascular', titulo: 'SAÚDE CARDIOVASCULAR', nivel, linhas }
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 16 — STATUS INTESTINAL
// ─────────────────────────────────────────────────────────────────────────────
function buildModIntestinal(dados, alertas, suger) {
  const intestinal = dados.status_intestinal || ''
  // Dor abdominal é uma QUEIXA própria no checklist ('CÓLICAS / DOR ABDOMINAL RECORRENTE').
  // Sem ela marcada, a obstipação isolada NÃO justifica encaminhar ao cirurgião.
  const queixas = [dados.queixa_principal, ...(dados.queixas_secundarias || [])]
  const temDorAbdominal = queixas.includes('CÓLICAS / DOR ABDOMINAL RECORRENTE')

  const linhas = []
  let nivelGeral = NORMAL
  const meds = dados.medicamentos || []
  const usaFerroEV  = meds.some(m => (m.includes('FERRO INJET') || m.includes('FERRO VENOSO')))
  const usaFerroOral = meds.some(m => m.includes('FERRO ORAL') || (dados.medicamentos || []).includes('FERRO ORAL'))

  if (intestinal === 'OBSTIPAÇÃO CRÔNICA (PRISÃO DE VENTRE)') {
    nivelGeral = MODERADO
    linhas.push('OBSTIPAÇÃO CRÔNICA NO PÓS-BARIÁTRICO: CONDIÇÃO MULTIFATORIAL FREQUENTE. AS PRINCIPAIS CAUSAS INCLUEM: BAIXA INGESTÃO HÍDRICA (ABAIXO DE 2L/DIA), FERRO ORAL (CAUSA MUITO COMUM — CONSIDERAR SUBSTITUIÇÃO POR FERRO ENDOVENOSO), DISMOTILIDADE INTESTINAL PÓS-CIRÚRGICA, DISBIOSE E BAIXA INGESTÃO DE FIBRAS.')
    linhas.push('ORIENTAÇÕES GERAIS: HIDRATAÇÃO MÍNIMA DE 2L/DIA (FORA DAS REFEIÇÕES). FIBRAS SOLÚVEIS — PSYLLIUM 5–10G/DIA DILUÍDO EM ÁGUA. PROBIÓTICOS (LACTOBACILLUS E BIFIDOBACTERIUM). ATIVIDADE FÍSICA REGULAR. EVITAR LAXANTES ESTIMULANTES CRÔNICOS (SENE, BISACODIL) — CAUSAM DEPENDÊNCIA E DANIFICAM A MUCOSA INTESTINAL.')
    alertas.push({ codigo: 'intestinal.obstipacao_cronica_revisar_ferro_oral_hidrata', nivel: MODERADO, texto: 'OBSTIPAÇÃO CRÔNICA — REVISAR FERRO ORAL, HIDRATAÇÃO E FIBRAS.' })

    // Ferro oral como causa
    if (usaFerroOral && !usaFerroEV) {
      linhas.push('FERRO ORAL EM USO: O FERRO ORAL É A CAUSA MAIS FREQUENTE DE OBSTIPAÇÃO E INTOLERÂNCIA GASTROINTESTINAL NO BARIÁTRICO. CONSIDERAR MIGRAÇÃO PARA FERRO ENDOVENOSO, QUE ALÉM DE NÃO CAUSAR OBSTIPAÇÃO, TEM ABSORÇÃO MUITO SUPERIOR NO PÓS-BARIÁTRICO.')
      alertas.push({ codigo: 'intestinal.ferro_oral_principal_causa_de_obstipacao_no_b', nivel: MODERADO, texto: 'FERRO ORAL: PRINCIPAL CAUSA DE OBSTIPAÇÃO NO BARIÁTRICO — CONSIDERAR FERRO EV.' })
      suger.push('AVALIAÇÃO PARA FERRO ENDOVENOSO (SUBSTITUIÇÃO DO FERRO ORAL)')
    }

    // Alerta cirúrgico — o texto educativo sai sempre (ensina o "se doer, procure"), mas o
    // ALERTA e o encaminhamento ao CIRURGIÃO só quando há DOR ABDOMINAL de fato marcada.
    // Antes eram incondicionais: obstipação sozinha já pedia cirurgião (falso-positivo).
    linhas.push('ATENÇÃO IMPORTANTE: OBSTIPAÇÃO CRÔNICA NO BARIÁTRICO PODE MASCARAR SUBOCLUSÃO INTESTINAL POR BRIDA OU HÉRNIA INTERNA — COMPLICAÇÕES CIRÚRGICAS TARDIAS QUE PODEM SER GRAVES. SE HOUVER DOR ABDOMINAL ASSOCIADA À OBSTIPAÇÃO, PROCURE AVALIAÇÃO CIRÚRGICA COM URGÊNCIA.')
    if (temDorAbdominal) {
      alertas.push({ codigo: 'intestinal.obstipacao_dor_abdominal_descartar_hernia_int', nivel: LEVE, texto: 'OBSTIPAÇÃO + DOR ABDOMINAL: DESCARTAR HÉRNIA INTERNA OU BRIDA — AVALIAÇÃO CIRÚRGICA.' })
      suger.push('AVALIAÇÃO COM CIRURGIÃO BARIÁTRICO (OBSTIPAÇÃO COM DOR ABDOMINAL — DESCARTAR SUBOCLUSÃO)')
    }
    suger.push('TESTE RESPIRATÓRIO PARA SIBO')

  } else if (intestinal === 'INTESTINO IRRITÁVEL (DIARREIA FREQUENTE)') {
    nivelGeral = MODERADO
    linhas.push('DIARREIA CRÔNICA NO PÓS-BARIÁTRICO: AGRAVA DRAMATICAMENTE A SÍNDROME DISABSORTIVA. TODOS OS DÉFICITS NUTRICIONAIS JÁ PRESENTES NO BARIÁTRICO SÃO POTENCIALIZADOS PELA DIARREIA CRÔNICA — FERRO, B12, VITAMINAS LIPOSSOLÚVEIS, ZINCO E PROTEÍNAS SÃO PERDIDOS EM EXCESSO.')
    linhas.push('PRINCIPAIS CAUSAS A INVESTIGAR: (1) SIBO — SUPERCRESCIMENTO BACTERIANO DO INTESTINO DELGADO: MUITO FREQUENTE APÓS BYPASS GÁSTRICO. SINTOMAS: DISTENSÃO, GASES, DIARREIA GORDUROSA. TRATAMENTO: RIFAXIMINA 550MG 2X/DIA POR 14 DIAS. (2) DUMPING TARDIO: DIARREIA 1–3 HORAS APÓS REFEIÇÕES RICAS EM AÇÚCAR. (3) INTOLERÂNCIA À LACTOSE: COMUM NO PÓS-BARIÁTRICO. TESTE DE EXCLUSÃO POR 2 SEMANAS. (4) DOENÇA CELÍACA: INVESTIGAR SE HÁ HISTÓRICO FAMILIAR OU ANEMIA REFRATÁRIA.')
    linhas.push('ORIENTAÇÕES: DIETA COM BAIXO TEOR DE GORDURA E AÇÚCARES SIMPLES. FRACIONAR AS REFEIÇÕES (6X/DIA). PROBIÓTICOS. EVITAR LACTOSE TEMPORARIAMENTE. SE SUSPEITA DE SIBO, INICIAR ANTIBIOTICOTERAPIA ESPECÍFICA COM MÉDICO.')
    alertas.push({ codigo: 'intestinal.diarreia_cronica_agrava_disabsorcao_investiga', nivel: MODERADO, texto: 'DIARREIA CRÔNICA: AGRAVA DISABSORÇÃO — INVESTIGAR SIBO, DUMPING E INTOLERÂNCIAS.' })
    suger.push('TESTE RESPIRATÓRIO PARA SIBO')
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
      alertas.push({ codigo: 'intestinal.calprotectina_elevada', nivel: MODERADO, texto: `CALPROTECTINA ELEVADA: ${calpro} µg/g — inflamação intestinal, investigar.` })
      suger.push('AVALIAÇÃO COM GASTROENTEROLOGISTA')
    } else {
      if (nivelGeral === NORMAL) nivelGeral = LEVE
      linhas.push(`CALPROTECTINA FECAL LEVEMENTE ELEVADA (${calpro} µg/g): INFLAMAÇÃO INTESTINAL DISCRETA. REPETIR O EXAME E CORRELACIONAR COM OS SINTOMAS.`)
      alertas.push({ codigo: 'intestinal.calprotectina_levemente_elevada', nivel: LEVE, texto: `CALPROTECTINA LEVEMENTE ELEVADA: ${calpro} µg/g — repetir e correlacionar.` })
    }
  }

  const indican = (dados.indican || '').toString()
  if (/POSITIVO/i.test(indican)) {
    if (nivelGeral === NORMAL) nivelGeral = LEVE
    linhas.push('INDICAN PLASMÁTICO POSITIVO: SUGERE MÁ DIGESTÃO DE PROTEÍNAS / PUTREFAÇÃO INTESTINAL, FREQUENTEMENTE ASSOCIADA A SUPERCRESCIMENTO BACTERIANO (SIBO). INVESTIGAR SIBO E OTIMIZAR A DIGESTÃO.')
    alertas.push({ codigo: 'intestinal.indican_positivo_possivel_sibo_ma_digestao_pr', nivel: LEVE, texto: 'INDICAN POSITIVO: possível SIBO / má digestão proteica — investigar.' })
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
    alertas.push({ codigo: 'fibromialgia.fibromialgia_confirmada_correlacionar_com_def', nivel: MODERADO, texto: 'FIBROMIALGIA CONFIRMADA — CORRELACIONAR COM DEFICIÊNCIAS NUTRICIONAIS DO BARIÁTRICO.' })
    suger.push('AVALIAÇÃO COM REUMATOLOGISTA')
  } else if (qtdSintomas >= 2) {
    nivelGeral = LEVE
    linhas.push(`${qtdSintomas} SINTOMAS FIBROMIÁLGICOS RELATADOS: A CONSTELAÇÃO DE SINTOMAS APRESENTADA (${sintomasClinicos.join(', ')}) É COMPATÍVEL COM SÍNDROME FIBROMIÁLGICA SECUNDÁRIA ÀS DEFICIÊNCIAS NUTRICIONAIS DO PÓS-BARIÁTRICO. PRIORIZAR A CORREÇÃO DAS DEFICIÊNCIAS ANTES DE DIAGNÓSTICO DEFINITIVO.`)
    alertas.push({ codigo: 'fibromialgia.sintomas_fibromialgicos_investigar_deficienci', nivel: LEVE, texto: `${qtdSintomas} SINTOMAS FIBROMIÁLGICOS — INVESTIGAR DEFICIÊNCIAS NUTRICIONAIS COMO CAUSA PRIMÁRIA.` })
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
    suger.push('MAGNÉSIO SÉRICO')
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
    suger.push('TSH')
    suger.push('GLICEMIA PÓS-PRANDIAL 1H E 2H')
  }

  if (temZumbido || temDesequilib) {
    linhas.push('• ZUMBIDOS E DESEQUILÍBRIO: FORTEMENTE ASSOCIADOS A DEFICIÊNCIAS DE TIAMINA (B1) E VITAMINA B12. A TIAMINA BAIXA PODE CAUSAR DISFUNÇÃO VESTIBULAR E NEUROPATIA. INVESTIGAR E CORRIGIR COM URGÊNCIA.')
    if (!isNaN(tiamina) && tiamina < 70) {
      linhas.push(`  → TIAMINA ATUAL: ${tiamina} nmol/L — BAIXA. SUPLEMENTAR COM URGÊNCIA.`)
    }
    suger.push('TIAMINA (VITAMINA B1)')
    suger.push('AVALIAÇÃO OTORRINOLARINGOLÓGICA (ZUMBIDO/VESTIBULOPATIA)')
  }

  if (temCabeca) {
    linhas.push('• DOR DE CABEÇA E ENXAQUECAS: NO BARIÁTRICO, FREQUENTEMENTE ASSOCIADAS A DESIDRATAÇÃO, HIPOGLICEMIA REATIVA, CAFEÍNA CONCENTRADA E DEFICIÊNCIA DE MAGNÉSIO. HIDRATAÇÃO ADEQUADA E CONTROLE GLICÊMICO SÃO PRIMORDIAIS.')
  }

  if (temTermo) {
    linhas.push('• INTOLERÂNCIA AO FRIO OU CALOR: INVESTIGAR HIPOTIREOIDISMO (INTOLERÂNCIA AO FRIO) E DISFUNÇÃO AUTONÔMICA. NO BARIÁTRICO, A PERDA DE MASSA CORPORAL REDUZ O ISOLAMENTO TÉRMICO, MAS INTOLERÂNCIA PERSISTENTE DEVE SER INVESTIGADA.')
    suger.push('TSH')
    suger.push('T4 LIVRE')
  }

  // Recomendação geral
  linhas.push('ABORDAGEM RECOMENDADA: (1) CORRIGIR TODAS AS DEFICIÊNCIAS NUTRICIONAIS IDENTIFICADAS — MUITOS SINTOMAS FIBROMIÁLGICOS MELHORAM OU DESAPARECEM COM A REPOSIÇÃO ADEQUADA. (2) TRATAR A APNEIA DO SONO SE PRESENTE. (3) REGULAR O PADRÃO GLICÊMICO. (4) APENAS SE OS SINTOMAS PERSISTIREM APÓS CORREÇÃO NUTRICIONAL, ENCAMINHAR PARA REUMATOLOGISTA. A PLATAFORMA PODE OFERECER UMA SOLUÇÃO COMPLEMENTAR — CONSULTE O BOTÃO ABAIXO.')

  if (temDiagnostico || qtdSintomas >= 2) {
    suger.push('MAGNÉSIO SÉRICO')
    suger.push('AVALIAÇÃO COM REUMATOLOGISTA')
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
    alertas.push({ codigo: 'acompanhamento.sem_acompanhamento_especializado_retomar_imed', nivel: GRAVE, texto: 'SEM ACOMPANHAMENTO ESPECIALIZADO — retomar imediatamente.' })
  } else if (temG1.length === 0) {
    // Tem G2 mas sem G1 critico
    linhas.push(`ESPECIALISTAS DECLARADOS: ${especialistas.join(', ')}.`)
    linhas.push('NENHUM ESPECIALISTA DO GRUPO CRÍTICO (HEMATOLOGISTA, GASTROENTEROLOGISTA, ENDOCRINOLOGISTA OU CLÍNICO) NO SEU ACOMPANHAMENTO.')
    linhas.push('OS PROFISSIONAIS COMPLEMENTARES (NUTRICIONISTA, PSICÓLOGO, CIRURGIÃO) SÃO IMPORTANTES, MAS A VIGILÂNCIA CLÍNICA DE DEFICIÊNCIAS NUTRICIONAIS E COMPLICAÇÕES ORGÂNICAS EXIGE AVALIAÇÃO MÉDICA REGULAR.')
    linhas.push('RECOMENDAÇÃO: incluir ao menos um profissional do grupo crítico no acompanhamento.')
    nivelGeral = MODERADO
    alertas.push({ codigo: 'acompanhamento.sem_especialista_critico_hemato_gastro_endo_c', nivel: MODERADO, texto: 'SEM ESPECIALISTA CRÍTICO (hemato/gastro/endo/clínico) no acompanhamento.' })
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

  // acompFreq vem da tela como um dos 4 status de ACOMPANHAMENTO_OPS (ex.: "FAÇO
  // ACOMPANHAMENTO MÉDICO E REPOSIÇÕES", "FIZ ACOMPANHAMENTO MAS PAREI"...), nunca
  // um valor de frequência (TRIMESTRAL/SEMESTRAL/ANUAL) — não há campo na anamnese
  // que colete a periodicidade real. Por isso, a comparação ordemAtual x ordemIdeal
  // nunca podia ser calculada (ordem[acompFreq] sempre virava 0) e o alerta de
  // "frequência insuficiente" disparava para todo paciente. A adequação real do
  // acompanhamento (tem/não tem especialista, cobre o grupo crítico) já é avaliada
  // acima por especialistas/semEspecialista — aqui fica só o dado informativo.
  if (acompFreq) {
    linhas.push(`FREQUÊNCIA ATUAL DECLARADA: ${acompFreq}.`)
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
    alertas.push({ codigo: 'lipidico.risco_cardiovascular_critico_score', nivel: GRAVE, texto: `Risco cardiovascular CRÍTICO (score ${score}${lpaCritica ? ', Lp(a) >50' : ''})` })
  } else if (score >= 4) {
    categoria = 'RISCO ELEVADO'
    nivel = MODERADO
    conduta = 'Considerar terapia farmacológica (estatina). Encaminhar à avaliação cardiológica.'
    alertas.push({ codigo: 'lipidico.risco_cardiovascular_elevado_score', nivel: MODERADO, texto: `Risco cardiovascular elevado (score ${score})` })
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
      alertas.push({ codigo: 'leucos.leucopenia_grave', nivel: GRAVE, texto: `LEUCOPENIA GRAVE: ${leuco}/uL. Avaliação hematológica imediata.` })
      // MIELOGRAMA saiu da lista de exames sugeridos (decisão do Estácio,
      // jul/2026): é procedimento, não exame de rotina — a eventual necessidade
      // fica INFORMADA no texto acima, a critério do hematologista, em vez de
      // virar item de pedido (e cobrança).
      linhas.push('O MIELOGRAMA PODE SER NECESSÁRIO NESSA INVESTIGAÇÃO, A CRITÉRIO DO HEMATOLOGISTA.')
      examesSuger.push('SOROLOGIAS PARA HIV, HEPATITES B/C, PARVOVÍRUS B19', 'ELETROFORESE DE PROTEÍNAS')
    } else if (leuco < 4000) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push('LEUCOPENIA MODERADA: investigar causa. Pode estar associada a pós-bariátrica com deficiências nutricionais profundas (B12, folato, cobre), infecções crônicas ou autoimunidade.')
      alertas.push({ codigo: 'leucos.leucopenia', nivel: MODERADO, texto: `LEUCOPENIA: ${leuco}/uL.` })
    } else if (leuco > 15000) {
      nivelGeral = GRAVE
      linhas.push('LEUCOCITOSE GRAVE: acima de 15.000/uL sugere processo infeccioso/inflamatório significativo ou, mais raramente, distúrbio mieloproliferativo. Requer avaliação clínica imediata.')
      alertas.push({ codigo: 'leucos.leucocitose', nivel: GRAVE, texto: `LEUCOCITOSE: ${leuco}/uL. Investigar foco infeccioso ou hematológico.` })
      examesSuger.push('PCR', 'VHS', 'ESFREGAÇO DE SANGUE PERIFÉRICO')
    } else if (leuco > 11000) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push('LEUCOCITOSE LEVE A MODERADA: frequentemente reativa (infecção, inflamação, estresse). Correlacionar clinicamente.')
      alertas.push({ codigo: 'leucos.leucocitose_2', nivel: MODERADO, texto: `LEUCOCITOSE: ${leuco}/uL.` })
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
      alertas.push({ codigo: 'leucos.neutropenia_grave', nivel: GRAVE, texto: `NEUTROPENIA GRAVE: ${neutAbs}/uL.` })
    } else if (neutAbs < 1500) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push('NEUTROPENIA RELEVANTE: valores entre 500 e 1.500/uL exigem investigação causal — deficiências nutricionais (B12/folato/cobre), medicamentos, infecções virais, autoimunidade.')
      alertas.push({ codigo: 'leucos.neutropenia', nivel: MODERADO, texto: `NEUTROPENIA: ${neutAbs}/uL.` })
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
      alertas.push({ codigo: 'leucos.possivel_linfocitose_absoluta_linfocitos_esti', nivel: MODERADO, texto: `POSSÍVEL LINFOCITOSE ABSOLUTA (linfócitos estimados ~${linfEst.toLocaleString('pt-BR')}/uL) — esclarecer.` })
      examesSuger.push('HEMOGRAMA COM CONTAGEM DIFERENCIAL (linfócitos)')
    }
  }

  // ─── Plaquetas (cortes a validar pelo médico) ───────────────────────
  if (!isNaN(plaq)) {
    linhas.push(`PLAQUETAS: ${plaq.toLocaleString('pt-BR')} mil/uL (referência 150–400).`)
    if (plaq < 100) {
      nivelGeral = GRAVE
      linhas.push('PLAQUETOPENIA IMPORTANTE (<100 mil/uL): risco de sangramento. Avaliação hematológica. Investigar deficiência nutricional grave (B12/folato), hepatopatia, hiperesplenismo, medicamentos ou PTI.')
      alertas.push({ codigo: 'leucos.plaquetopenia', nivel: GRAVE, texto: `PLAQUETOPENIA: ${plaq} mil/uL — avaliação hematológica.` })
    } else if (plaq < 150) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push('PLAQUETOPENIA LEVE (100–149 mil/uL): investigar causa (nutricional, hepática, medicamentosa).')
      alertas.push({ codigo: 'leucos.plaquetopenia_leve', nivel: MODERADO, texto: `PLAQUETOPENIA LEVE: ${plaq} mil/uL.` })
    } else if (plaq > 450) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push('TROMBOCITOSE (>450 mil/uL): frequentemente reativa (inflamação, ferropenia, infecção). Se persistente, avaliação hematológica.')
      alertas.push({ codigo: 'leucos.trombocitose', nivel: MODERADO, texto: `TROMBOCITOSE: ${plaq} mil/uL.` })
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
  // Dúvidas do paciente NÃO mudam o nível (grave/ruim/...); só marcam o retrato como
  // provisório (o algoritmo se ajusta quando as respostas forem esclarecidas).
  const temDuvidas = !!contexto.temDuvidas

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
    provisorio: !temExames || temDuvidas,   // sem exames OU com pontos em dúvida
    motivo,
    resumo: { graves, moderados, leves },
  }
}

