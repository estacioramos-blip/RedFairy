engine_path = 'C:/Users/Estacio/Desktop/redfairy/src/engine/obaEngine.js'
result_path = 'C:/Users/Estacio/Desktop/redfairy/src/components/ResultCard.jsx'

fixed = []

# ── obaEngine: adicionar chamadas e funções ───────────────────────────────────
with open(engine_path, encoding='utf-8') as f:
    eng = f.read()

# Adicionar chamadas após módulo 15
old_call = """  // ── 15. MÓDULO LEUCÓCITOS E NEUTRÓFILOS ──────────────────────────────────
  const modLeucos = buildModLeucos(examesOBA, alertas, examesSuger)
  if (modLeucos) modulos.push(modLeucos)"""

new_call = """  // ── 15. MÓDULO LEUCÓCITOS E NEUTRÓFILOS ──────────────────────────────────
  const modLeucos = buildModLeucos(examesOBA, alertas, examesSuger)
  if (modLeucos) modulos.push(modLeucos)

  // ── 16. MÓDULO STATUS INTESTINAL ─────────────────────────────────────────
  const modIntestinal = buildModIntestinal(dadosOBA, alertas, examesSuger)
  if (modIntestinal) modulos.push(modIntestinal)

  // ── 17. MÓDULO STATUS FIBROMIÁLGICO ──────────────────────────────────────
  const modFibro = buildModFibromialgia(dadosOBA, examesOBA, alertas, examesSuger)
  if (modFibro) modulos.push(modFibro)"""

if old_call in eng:
    eng = eng.replace(old_call, new_call)
    fixed.append('OK: chamadas módulos 16 e 17 adicionadas')
else:
    fixed.append('ERRO: âncora módulo 15 não encontrada')

# Adicionar funções no final
MODULO_INTESTINAL = """
// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 16 — STATUS INTESTINAL
// ─────────────────────────────────────────────────────────────────────────────
function buildModIntestinal(dados, alertas, suger) {
  const intestinal = dados.status_intestinal || ''
  if (!intestinal || intestinal === 'INTESTINO FUNCIONA BEM') return null

  const linhas = []
  let nivelGeral = NORMAL
  const meds = dados.medicamentos || []
  const usaFerroEV  = meds.some(m => m.includes('FERRO VENOSO'))
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

  return {
    id:     'intestinal',
    titulo: 'STATUS INTESTINAL',
    nivel:  nivelGeral,
    linhas,
  }
}
"""

MODULO_FIBRO = """
// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 17 — STATUS FIBROMIÁLGICO
// ─────────────────────────────────────────────────────────────────────────────
function buildModFibromialgia(dados, ex, alertas, suger) {
  const sintomas = dados.status_fibromialgia || []
  if (!sintomas || sintomas.length === 0) return null

  const linhas = []
  let nivelGeral = NORMAL

  const temDiagnostico  = sintomas.includes('FUI DIAGNOSTICADO COM FIBROMIALGIA')
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

  const qtdSintomas = sintomas.filter(s => s !== 'FUI DIAGNOSTICADO COM FIBROMIALGIA').length

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
    linhas.push(`${qtdSintomas} SINTOMAS FIBROMIÁLGICOS RELATADOS: A CONSTELAÇÃO DE SINTOMAS APRESENTADA (${sintomas.filter(s => s !== 'FUI DIAGNOSTICADO COM FIBROMIALGIA').join(', ')}) É COMPATÍVEL COM SÍNDROME FIBROMIÁLGICA SECUNDÁRIA ÀS DEFICIÊNCIAS NUTRICIONAIS DO PÓS-BARIÁTRICO. PRIORIZAR A CORREÇÃO DAS DEFICIÊNCIAS ANTES DE DIAGNÓSTICO DEFINITIVO.`)
    alertas.push({ nivel: LEVE, texto: `${qtdSintomas} SINTOMAS FIBROMIÁLGICOS — INVESTIGAR DEFICIÊNCIAS NUTRICIONAIS COMO CAUSA PRIMÁRIA.` })
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
"""

eng = eng + MODULO_INTESTINAL + MODULO_FIBRO
fixed.append('OK: módulos 16 e 17 adicionados ao engine')

with open(engine_path, 'w', encoding='utf-8') as f:
    f.write(eng)

# ── ResultCard: ajustar trigger WhatsApp fibromialgia ────────────────────────
with open(result_path, encoding='utf-8') as f:
    rc = f.read()

# Atualizar lógica de detecção de fibromialgia no OBAWhatsAppButtons
old_fibro_detect = """  // Verificar fibromialgia
  const temFibromialgia = oba?.modulos?.some(m =>
    m.linhas?.some(l => l.includes('FIBROMIALGIA') || l.includes('FIBROMIÁLGIC'))
  )"""

new_fibro_detect = """  // Verificar fibromialgia — trigger: diagnostico OU obstipacao + 2 sintomas
  const modFibroData = oba?.modulos?.find(m => m.id === 'fibromialgia')
  const temFibromialgia = !!modFibroData && (modFibroData.nivel === 'moderado' || modFibroData.nivel === 'grave' ||
    (modFibroData.nivel === 'leve' && modFibroData.linhas?.some(l => l.includes('SINTOMAS FIBROMIÁLGICOS'))))

  // Verificar obstipação no módulo intestinal
  const modIntestData = oba?.modulos?.find(m => m.id === 'intestinal')
  const temObstipacaoModulo = !!modIntestData && modIntestData.linhas?.some(l => l.includes('OBSTIPAÇÃO'))"""

if old_fibro_detect in rc:
    rc = rc.replace(old_fibro_detect, new_fibro_detect)
    fixed.append('OK: trigger fibromialgia atualizado no ResultCard')
else:
    fixed.append('ERRO: trigger fibromialgia não encontrado')

# Atualizar detecção de obstipação para usar módulo
old_obs_detect = """  // Verificar obstipação
  const temObstipacao = oba?.modulos?.some(m =>
    m.linhas?.some(l => l.includes('OBSTIPAÇÃO') || l.includes('PRISÃO DE VENTRE'))
  )"""

new_obs_detect = """  // Verificar obstipação via módulo intestinal
  const temObstipacao = !!modIntestData && modIntestData.linhas?.some(l => l.includes('OBSTIPAÇÃO'))"""

if old_obs_detect in rc:
    rc = rc.replace(old_obs_detect, new_obs_detect)
    fixed.append('OK: detecção obstipação atualizada')
else:
    # tentar ordem inversa (fibro primeiro)
    old_obs2 = """  // Verificar obstipação
  const temObstipacao = oba?.modulos?.some(m =>
    m.linhas?.some(l => l.includes('OBSTIPAÇÃO') || l.includes('PRISÃO DE VENTRE'))
  )

  // Verificar fibromialgia"""
    if old_obs2 in rc:
        new_obs2 = """  // Verificar fibromialgia — trigger: diagnostico OU obstipacao + 2 sintomas
  const modFibroData = oba?.modulos?.find(m => m.id === 'fibromialgia')
  const temFibromialgia = !!modFibroData && (modFibroData.nivel === 'moderado' || modFibroData.nivel === 'grave' ||
    (modFibroData.nivel === 'leve' && modFibroData.linhas?.some(l => l.includes('SINTOMAS FIBROMIÁLGICOS'))))
  const modIntestData = oba?.modulos?.find(m => m.id === 'intestinal')
  const temObstipacao = !!modIntestData && modIntestData.linhas?.some(l => l.includes('OBSTIPAÇÃO'))

  // Verificar fibromialgia"""
        rc = rc.replace(old_obs2, new_obs2)
        fixed.append('OK: detecção obstipação e fibromialgia atualizadas (alternativa)')
    else:
        fixed.append('ERRO: detecção obstipação não encontrada')

with open(result_path, 'w', encoding='utf-8') as f:
    f.write(rc)

for msg in fixed:
    print(msg)
print('Concluído.')
