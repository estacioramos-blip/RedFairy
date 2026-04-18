engine_path = 'C:/Users/Estacio/Desktop/redfairy/src/engine/obaEngine.js'

with open(engine_path, encoding='utf-8') as f:
    txt = f.read()

fixed = []

# ── 1. vitamina_c e vitamina_k no módulo vitaminas ───────────────────────────
old_sel = """  if (!temAlgo) return null

  return {
    id:     'vitaminas',"""

new_sel = """  // Vitamina C
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

  if (!temAlgo) return null

  return {
    id:     'vitaminas',"""

if old_sel in txt:
    txt = txt.replace(old_sel, new_sel)
    fixed.append('OK: vitamina_c e vitamina_k adicionados')
else:
    fixed.append('ERRO: âncora vitaminas não encontrada')

# ── 2. metformina + IBP no módulo B12 ────────────────────────────────────────
old_b12 = "  // Via de reposição\n  if (disab.grau >= 2) {"
new_b12 = """  // Metformina e IBP agravam deficiência de B12
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
  if (disab.grau >= 2) {"""

if old_b12 in txt:
    txt = txt.replace(old_b12, new_b12)
    fixed.append('OK: metformina e IBP adicionados ao módulo B12')
else:
    fixed.append('ERRO: âncora B12 via reposição não encontrada')

# ── 3. HIV/ARV no módulo eritron ─────────────────────────────────────────────
old_hiv = "  // Plasma de argônio\n  if (dadosOBA.fez_plasma_argonio) {"
new_hiv = """  // HIV/ARV — macrocitose e anemia
  if (dadosOBA.hivTratamento) {
    linhas.push('TRATAMENTO PARA HIV/ARV: ANTIRRETROVIRAIS (ESPECIALMENTE AZT/ZIDOVUDINA) PODEM CAUSAR MACROCITOSE E ANEMIA. NO BARIÁTRICO, ESSE EFEITO SE SOMA À SÍNDROME DISABSORTIVA. MONITORAR HEMOGRAMA COM ATENÇÃO AO VCM E RETICULÓCITOS. COMUNICAR AO INFECTOLOGISTA O CONTEXTO BARIÁTRICO.')
    alertas.push({ nivel: MODERADO, texto: 'TRATAMENTO ARV: RISCO DE MACROCITOSE E ANEMIA — CORRELACIONAR COM HEMOGRAMA.' })
  }

  // Plasma de argônio
  if (dadosOBA.fez_plasma_argonio) {"""

if old_hiv in txt:
    txt = txt.replace(old_hiv, new_hiv)
    fixed.append('OK: HIV/ARV adicionado ao módulo eritron')
else:
    fixed.append('ERRO: âncora plasma argônio não encontrada')

# ── 4. tiroxina no módulo hormonal ───────────────────────────────────────────
old_tir = "  } else suger.push('TSH')\n\n  // Testosterona masculina"
new_tir = """  } else suger.push('TSH')

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

  // Testosterona masculina"""

if old_tir in txt:
    txt = txt.replace(old_tir, new_tir)
    fixed.append('OK: tiroxina adicionada ao módulo hormonal')
else:
    fixed.append('ERRO: âncora TSH/testosterona não encontrada')

# ── 5. metotrexato no módulo folatos ─────────────────────────────────────────
old_fol = "  } else {\n    suger.push('FOLATOS SÉRICOS')\n  }"
new_fol = """  } else {
    suger.push('FOLATOS SÉRICOS')
    if (dados.methotrexato) {
      linhas.push('USO DE METOTREXATO SEM FOLATOS DOSADOS: METOTREXATO É ANTAGONISTA DO ÁCIDO FÓLICO. SOLICITAR FOLATOS URGENTE E INICIAR SUPLEMENTAÇÃO PREVENTIVA COM ÁCIDO FÓLICO 5 MG/DIA.')
      alertas.push({ nivel: MODERADO, texto: 'METOTREXATO EM USO — DOSEAR FOLATOS E SUPLEMENTAR ÁCIDO FÓLICO.' })
    }
  }"""

if old_fol in txt:
    txt = txt.replace(old_fol, new_fol, 1)
    fixed.append('OK: metotrexato adicionado ao módulo folatos')
else:
    fixed.append('ERRO: âncora folatos séricos não encontrada')

# ── 6. Módulo acompanhamento — adicionar chamada e função ────────────────────
old_gest_call = """  // ── 13. MÓDULO GESTACIONAL ───────────────────────────────────────────────
  const modGest = buildModGestacional(dadosOBA, mesesPos, alertas, examesSuger)
  if (modGest) modulos.push(modGest)"""

new_gest_call = """  // ── 13. MÓDULO GESTACIONAL ───────────────────────────────────────────────
  const modGest = buildModGestacional(dadosOBA, mesesPos, alertas, examesSuger)
  if (modGest) modulos.push(modGest)

  // ── 14. MÓDULO ACOMPANHAMENTO ────────────────────────────────────────────
  const modAcomp = buildModAcompanhamento(dadosOBA, alertas)
  if (modAcomp) modulos.push(modAcomp)"""

if old_gest_call in txt:
    txt = txt.replace(old_gest_call, new_gest_call)
    fixed.append('OK: chamada módulo acompanhamento adicionada')
else:
    fixed.append('ERRO: âncora módulo gestacional não encontrada')

# Adicionar função no final
FUNC_ACOMP = """
// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 14 — ACOMPANHAMENTO MÉDICO
// ─────────────────────────────────────────────────────────────────────────────
function buildModAcompanhamento(dados, alertas) {
  const acomp        = dados.acompanhamento || ''
  const especialistas = dados.especialistas || []
  const semEsp       = dados.semEspecialista || false
  const mesesPos     = parseInt(dados.meses_pos_cirurgia) || 0

  const linhas = []
  let nivelGeral = NORMAL
  let temAlgo = false

  if (acomp === 'NÃO FAÇO ACOMPANHAMENTO MÉDICO' || acomp === 'NÃO FIZ ACOMPANHAMENTO NEM REPOSIÇÕES') {
    temAlgo = true
    nivelGeral = GRAVE
    linhas.push('SEM ACOMPANHAMENTO MÉDICO PÓS-BARIÁTRICO: ESTA É A PRINCIPAL CAUSA DE COMPLICAÇÕES NUTRICIONAIS, METABÓLICAS E ÓSSEAS TARDIAS. O ABANDONO DO SEGUIMENTO AUMENTA SIGNIFICATIVAMENTE O RISCO DE DEFICIÊNCIAS GRAVES, REGANHO DE PESO E COMPLICAÇÕES CIRÚRGICAS. RETOMAR ACOMPANHAMENTO COM URGÊNCIA.')
    alertas.push({ nivel: GRAVE, texto: 'SEM ACOMPANHAMENTO MÉDICO PÓS-BARIÁTRICO — RISCO MUITO AUMENTADO DE COMPLICAÇÕES.' })
  } else if (acomp === 'FIZ ACOMPANHAMENTO MAS PAREI') {
    temAlgo = true
    nivelGeral = MODERADO
    linhas.push('ACOMPANHAMENTO MÉDICO INTERROMPIDO: O SEGUIMENTO PÓS-BARIÁTRICO É PERMANENTE E NÃO DEVE SER SUSPENSO. RETOMAR COM MÉDICO DE REFERÊNCIA, NUTRÓLOGO OU CIRURGIÃO BARIÁTRICO.')
    alertas.push({ nivel: MODERADO, texto: 'ACOMPANHAMENTO INTERROMPIDO — RETOMAR COM URGÊNCIA.' })
  } else if (acomp === 'FAÇO ACOMPANHAMENTO MÉDICO E REPOSIÇÕES') {
    temAlgo = true
    linhas.push('ACOMPANHAMENTO MÉDICO EM DIA COM REPOSIÇÕES: EXCELENTE ADESÃO. MANTER SEGUIMENTO REGULAR E LABORATORIAL SEMESTRAL.')
  }

  if (semEsp) {
    temAlgo = true
    if (nivelGeral === NORMAL) nivelGeral = LEVE
    linhas.push('SEM ACOMPANHAMENTO COM ESPECIALISTAS: BARIÁTRICOS NECESSITAM DE EQUIPE MULTIDISCIPLINAR — AO MENOS CIRURGIÃO E/OU CLÍNICO E NUTRÓLOGO. CONSIDERAR INCLUIR ESPECIALISTAS CONFORME COMORBIDADES PRESENTES.')
    alertas.push({ nivel: LEVE, texto: 'SEM ESPECIALISTAS — EQUIPE MULTIDISCIPLINAR RECOMENDADA.' })
  } else if (especialistas.length > 0) {
    temAlgo = true
    linhas.push(`ESPECIALISTAS QUE ACOMPANHAM: ${especialistas.join(', ')}.`)
    const temNutrologo = especialistas.some(e => e.includes('NUTRÓLOG'))
    const temCirurgiao = especialistas.some(e => e.includes('CIRURGIÃO'))
    const temClinico   = especialistas.some(e => e.includes('CLÍNICO'))
    if (!temNutrologo) {
      linhas.push('AUSÊNCIA DE NUTRÓLOGO: O ACOMPANHAMENTO NUTRICIONAL É FUNDAMENTAL NO PÓS-BARIÁTRICO PARA ADEQUAÇÃO DA SUPLEMENTAÇÃO E PADRÃO ALIMENTAR.')
      if (nivelGeral === NORMAL) nivelGeral = LEVE
    }
    if (!temCirurgiao && !temClinico && mesesPos <= 24) {
      linhas.push('AUSÊNCIA DE CIRURGIÃO OU CLÍNICO NOS PRIMEIROS 2 ANOS: O SEGUIMENTO COM CIRURGIÃO BARIÁTRICO É RECOMENDADO PARA AVALIAÇÃO DE POSSÍVEIS COMPLICAÇÕES CIRÚRGICAS.')
      if (nivelGeral === NORMAL) nivelGeral = LEVE
    }
  }

  if (!temAlgo) return null

  return {
    id:     'acompanhamento',
    titulo: 'ACOMPANHAMENTO MÉDICO E EQUIPE',
    nivel:  nivelGeral,
    linhas,
  }
}
"""

if 'buildModAcompanhamento' not in txt:
    txt = txt + FUNC_ACOMP
    fixed.append('OK: função buildModAcompanhamento adicionada')
else:
    fixed.append('OK: função buildModAcompanhamento já existe')

# ── 7. metotrexato dentro do bloco de folatos dosados ───────────────────────
old_fol2 = """    } else {
      linhas.push('FOLATOS DENTRO DA FAIXA NORMAL.')
    }
  } else {
    suger.push('FOLATOS SÉRICOS')"""

new_fol2 = """    } else {
      linhas.push('FOLATOS DENTRO DA FAIXA NORMAL.')
    }
    if (dados.methotrexato) {
      linhas.push('USO DE METOTREXATO: ANTAGONISTA DO ÁCIDO FÓLICO. CAUSA DEPLEÇÃO PROGRESSIVA DE FOLATOS — EFEITO SOMADO À DISABSORÇÃO BARIÁTRICA. SUPLEMENTAÇÃO COM ÁCIDO FÓLICO 5 MG/DIA É OBRIGATÓRIA. MONITORAR FOLATOS E HEMOGRAMA REGULARMENTE.')
      alertas.push({ nivel: MODERADO, texto: 'METOTREXATO + BARIÁTRICA: ALTO RISCO DE DEFICIÊNCIA DE FOLATOS — SUPLEMENTAR OBRIGATORIAMENTE.' })
    }
  } else {
    suger.push('FOLATOS SÉRICOS')"""

if old_fol2 in txt:
    txt = txt.replace(old_fol2, new_fol2)
    fixed.append('OK: metotrexato adicionado dentro do bloco folatos dosados')
else:
    fixed.append('AVISO: bloco folatos dosados não encontrado (pode já ter sido tratado)')

with open(engine_path, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print('Concluído.')
