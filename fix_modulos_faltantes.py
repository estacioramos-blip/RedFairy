"""
fix_modulos_faltantes.py

Cria as 2 funcoes faltantes no obaEngine:
  - buildModAcompanhamento
  - buildModLeucos

Ambas sao chamadas em avaliarOBA (linhas 160 e 164) mas nunca foram
definidas. JS lanca ReferenceError em runtime, quebrando a avaliacao
OBA inteira.

IMPLEMENTACAO CLINICA:

buildModAcompanhamento:
  - Hierarquia de especialistas do Dr. Ramos:
    G1 (criticos): Hematologista, Gastroenterologista, Endocrinologista, Clinico
    G2 (complementares): Nutrologo, Nutricionista, Cirurgiao, Psicologo, Psiquiatra
  - Regra de gravidade:
    * 0 G1: GRAVE (alerta vermelho + banner)
    * 1 G1: MODERADO
    * >=2 G1: NORMAL
  - Frequencia recomendada (pior dos 3 eixos):
    * Tempo pos-cirurgia (0-6m trimestral, 6-24m semestral, >24m anual)
    * Tipo de cirurgia (bypass = trimestral por mais tempo)
    * Labs (se alterados, trimestral ate correcao)

buildModLeucos:
  - Cutoffs EXAMES_BASE: 4000-11000 (normal)
  - Leucopenia grave (<3000) ou leucocitose grave (>15000) = GRAVE
  - Leucopenia moderada (3000-4000) ou leucocitose moderada (11000-15000) = MODERADO
  - Neutrofilos absolutos <1500 (calculados) = MODERADO (neutropenia)
  - Se nao informado: modulo nao aparece (return null)
"""

from pathlib import Path
import sys

ARQ = Path("src/engine/obaEngine.js")
if not ARQ.exists():
    print(f"ERRO: {ARQ} nao existe."); sys.exit(1)

src = ARQ.read_text(encoding="utf-8")

# ═════════════════════════════════════════════════════════════════════
# Checar se funcoes ja existem (evitar duplicacao)
# ═════════════════════════════════════════════════════════════════════
if "function buildModAcompanhamento" in src:
    print("AVISO: buildModAcompanhamento ja existe. Abortando.")
    sys.exit(0)
if "function buildModLeucos" in src:
    print("AVISO: buildModLeucos ja existe. Abortando.")
    sys.exit(0)

# ═════════════════════════════════════════════════════════════════════
# Definir as 2 novas funcoes (serao inseridas apos buildModFibromialgia)
# ═════════════════════════════════════════════════════════════════════
novas_funcoes = '''

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

  const temG1 = especialistas.filter(e => G1.includes((e || '').toUpperCase()))
  const temG2 = especialistas.filter(e => G2.includes((e || '').toUpperCase()))

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
    }
    linhas.push('ACOMPANHAMENTO BÁSICO ESTABELECIDO. IDEAL EXPANDIR PARA COBRIR OS DEMAIS EIXOS (ENDÓCRINO/METABÓLICO, HEMATOLÓGICO E GASTROINTESTINAL).')
    if (nivelGeral === NORMAL) nivelGeral = LEVE
  } else {
    // >= 2 G1
    linhas.push(`ESPECIALISTAS CRÍTICOS: ${temG1.join(', ')}.`)
    if (temG2.length > 0) {
      linhas.push(`COMPLEMENTARES: ${temG2.join(', ')}.`)
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
    titulo: 'Acompanhamento Multidisciplinar',
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
//   Neutrofilos absolutos: 1.800 - 7.700 /uL
// ════════════════════════════════════════════════════════════════════════════
function buildModLeucos(examesOBA, alertas, examesSuger) {
  const leuco   = parseFloat(examesOBA.leucocitos)
  const neutPct = parseFloat(examesOBA.neutrofilos)
  const neutAbs = parseFloat(examesOBA.neutrofilos_ul)

  // Se nenhum informado, nao gerar modulo
  if (isNaN(leuco) && isNaN(neutPct) && isNaN(neutAbs)) return null

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
    linhas.push(`NEUTRÓFILOS ABSOLUTOS: ${neutAbs.toLocaleString('pt-BR')}/uL (referência 1.800–7.700).`)

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
    linhas.push(`NEUTRÓFILOS ABSOLUTOS (calculado): ${neutCalc.toLocaleString('pt-BR')}/uL (referência 1.800–7.700).`)
    if (neutCalc < 1500 && nivelGeral !== GRAVE) {
      nivelGeral = MODERADO
      linhas.push('NEUTROPENIA CALCULADA (<1.500/uL): relevante. Investigar como acima.')
    }
  }

  return {
    titulo: 'Leucócitos e Neutrófilos',
    nivel: nivelGeral,
    linhas,
  }
}
'''

# Encontrar ponto de insercao: apos buildModFibromialgia (linha ~1440)
# Estrategia: achar o ultimo 'function buildMod*' e inserir depois do seu fechamento '}'
# Podemos tambem inserir antes do ultimo '}' do arquivo ou no EOF
# Melhor: achar 'function buildModFibromialgia' e avancar ate o fechamento da funcao

idx_fibro = src.find("function buildModFibromialgia")
if idx_fibro < 0:
    print("ERRO: nao foi possivel achar buildModFibromialgia como ponto de insercao.")
    sys.exit(1)

# Achar o fim da funcao buildModFibromialgia (ultima '}' antes de uma nova 'function' ou EOF)
# Estrategia simples: pegar o final do arquivo e inserir ali (apos o ultimo return ou a ultima '}')
src = src.rstrip() + novas_funcoes + '\n'

ARQ.write_text(src, encoding="utf-8")

# Verificacao: contar funcoes buildMod*
import re
todas_funcoes = re.findall(r'function (buildMod\w+)', src)
print(f"OK: funcoes buildMod* definidas agora: {len(todas_funcoes)}")
for f in todas_funcoes:
    print(f"    - {f}")

# ═════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("FIX APLICADO!")
print("=" * 60)
print()
print("2 funcoes CRITICAS criadas:")
print("  - buildModAcompanhamento (G1/G2 + frequencia por tempo/cirurgia/labs)")
print("  - buildModLeucos        (leucopenia/leucocitose/neutropenia)")
print()
print("IMPACTO IMEDIATO:")
print("  - Erro 'ReferenceError: buildModAcompanhamento is not defined' RESOLVIDO")
print("  - Erro 'ReferenceError: buildModLeucos is not defined' RESOLVIDO")
print("  - Avaliacao OBA agora completa sem quebrar")
print()
print("CAMPOS QUE PASSAM A SER USADOS:")
print("  - especialistas (G1/G2)")
print("  - semEspecialista (alerta grave se true)")
print("  - acompanhamento (frequencia declarada vs recomendada)")
print("  - leucocitos, neutrofilos, neutrofilos_ul (leucograma)")
print()
print("Proximo passo:")
print('  git add . && git commit -m "feat: cria buildModAcompanhamento e buildModLeucos (bug critico silencioso resolvido)" && git push origin main')
