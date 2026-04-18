import re

engine  = 'C:/Users/Estacio/Desktop/redfairy/src/engine/obaEngine.js'
result  = 'C:/Users/Estacio/Desktop/redfairy/src/components/ResultCard.jsx'
lp      = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

fixed = []
WA_NUM = '5571997110804'

# ── 1. Atualizar número WhatsApp em todos os arquivos ─────────────────────────
for fpath, label in [(result, 'ResultCard'), (lp, 'LandingPage')]:
    with open(fpath, encoding='utf-8') as f:
        txt = f.read()
    old_nums = ['5571999230288', '5573991012332', '5571999230288']
    changed = False
    for old in old_nums:
        if old in txt:
            txt = txt.replace(old, WA_NUM)
            changed = True
    if changed:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(txt)
        fixed.append(f'OK: número WhatsApp atualizado em {label}')
    else:
        fixed.append(f'AVISO: número não encontrado em {label}')

# ── 2. Leucócitos e neutrófilos no obaEngine ──────────────────────────────────
with open(engine, encoding='utf-8') as f:
    eng = f.read()

# Adicionar módulo leucócitos após módulo 14
MODULO_LEUCOS = """
// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 15 — LEUCÓCITOS E NEUTRÓFILOS
// ─────────────────────────────────────────────────────────────────────────────
function buildModLeucos(ex, alertas, suger) {
  const leuco  = parseFloat(ex.leucocitos)
  const neutPct = parseFloat(ex.neutrofilos)
  const neutAbs = parseFloat(ex.neutrofilos_ul)

  if (isNaN(leuco) && isNaN(neutAbs)) return null

  const linhas = []
  let nivelGeral = NORMAL
  let temAlgo = false

  if (!isNaN(leuco)) {
    temAlgo = true
    linhas.push(`LEUCÓCITOS: ${leuco.toLocaleString('pt-BR')} /uL`)
    if (leuco < 2500) {
      nivelGeral = GRAVE
      linhas.push('LEUCOPENIA GRAVE (< 2.500 /uL): RISCO AUMENTADO DE INFECÇÕES GRAVES. NO BARIÁTRICO, PODE INDICAR DEFICIÊNCIA DE ZINCO, COBRE OU FOLATOS, EFEITO DE MEDICAMENTOS (METOTREXATO, ARV) OU DOENÇA HEMATOLÓGICA. AVALIAÇÃO COM HEMATOLOGISTA NECESSÁRIA.')
      alertas.push({ nivel: GRAVE, texto: `LEUCOPENIA: ${leuco.toLocaleString('pt-BR')} /uL — AVALIAÇÃO HEMATOLÓGICA NECESSÁRIA.` })
      suger.push('ESFREGAÇO DE SANGUE PERIFÉRICO')
      suger.push('AVALIAÇÃO COM HEMATOLOGISTA')
    } else if (leuco < 3500) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push('LEUCOPENIA LEVE (2.500–3.500 /uL): MONITORAR. INVESTIGAR CAUSAS NUTRICIONAIS (ZINCO, COBRE, FOLATOS) E MEDICAMENTOSAS.')
      alertas.push({ nivel: MODERADO, texto: `LEUCÓCITOS BAIXOS: ${leuco.toLocaleString('pt-BR')} /uL — MONITORAR.` })
    } else if (leuco > 12000) {
      if (nivelGeral === NORMAL) nivelGeral = LEVE
      linhas.push('LEUCOCITOSE (> 12.000 /uL): SUGERE PROCESSO INFECCIOSO OU INFLAMATÓRIO ATIVO. CORRELACIONAR COM CLÍNICA. SE PERSISTENTE, AVALIAR COM HEMATOLOGISTA.')
      alertas.push({ nivel: LEVE, texto: `LEUCOCITOSE: ${leuco.toLocaleString('pt-BR')} /uL — INVESTIGAR PROCESSO INFECCIOSO.` })
    } else {
      linhas.push('LEUCÓCITOS DENTRO DA NORMALIDADE.')
    }
  }

  if (!isNaN(neutAbs)) {
    temAlgo = true
    linhas.push(`NEUTRÓFILOS (ABSOLUTO CALCULADO): ${neutAbs.toLocaleString('pt-BR')} /uL`)
    if (neutAbs <= 1300) {
      nivelGeral = GRAVE
      linhas.push('NEUTROPENIA SIGNIFICATIVA (≤ 1.300 /uL): SE ESSE ACHADO JÁ VEM SENDO OBSERVADO HÁ ALGUM TEMPO, E SE HÁ ESTOMATITES (AFTAS) QUE SE REPETEM PERIODICAMENTE, SOLICITE UMA AVALIAÇÃO HEMATOLÓGICA SUBSIDIADA PELA PLATAFORMA. PODEMOS EVITAR QUE VOCÊ SEJA SUBMETIDO A EXAMES DESNECESSÁRIOS.')
      alertas.push({ nivel: GRAVE, texto: `NEUTROPENIA: ${neutAbs.toLocaleString('pt-BR')} /uL — AVALIAÇÃO HEMATOLÓGICA INDICADA.` })
      suger.push('AVALIAÇÃO HEMATOLÓGICA SUBSIDIADA PELA PLATAFORMA (NEUTROPENIA RECORRENTE)')
    } else if (neutAbs < 1800) {
      if (nivelGeral !== GRAVE) nivelGeral = MODERADO
      linhas.push('NEUTROPENIA LEVE (1.300–1.800 /uL): RISCO AUMENTADO DE INFECÇÕES. MONITORAR. INVESTIGAR CAUSAS NUTRICIONAIS E MEDICAMENTOSAS.')
      alertas.push({ nivel: MODERADO, texto: `NEUTRÓFILOS BAIXOS: ${neutAbs.toLocaleString('pt-BR')} /uL — MONITORAR.` })
    } else {
      linhas.push('NEUTRÓFILOS DENTRO DA FAIXA NORMAL.')
    }
  }

  if (!temAlgo) return null

  return {
    id:     'leucos',
    titulo: 'LEUCÓCITOS E NEUTRÓFILOS',
    nivel:  nivelGeral,
    linhas,
  }
}
"""

# Adicionar chamada ao módulo 15
old_gest = """  // ── 14. MÓDULO ACOMPANHAMENTO ────────────────────────────────────────────
  const modAcomp = buildModAcompanhamento(dadosOBA, alertas)
  if (modAcomp) modulos.push(modAcomp)"""

new_gest = """  // ── 14. MÓDULO ACOMPANHAMENTO ────────────────────────────────────────────
  const modAcomp = buildModAcompanhamento(dadosOBA, alertas)
  if (modAcomp) modulos.push(modAcomp)

  // ── 15. MÓDULO LEUCÓCITOS E NEUTRÓFILOS ──────────────────────────────────
  const modLeucos = buildModLeucos(examesOBA, alertas, examesSuger)
  if (modLeucos) modulos.push(modLeucos)"""

if old_gest in eng:
    eng = eng.replace(old_gest, new_gest)
    fixed.append('OK: chamada módulo leucócitos adicionada')
else:
    fixed.append('ERRO: âncora módulo 14 não encontrada')

if 'buildModLeucos' not in eng:
    eng = eng + MODULO_LEUCOS
    fixed.append('OK: função buildModLeucos adicionada')
else:
    fixed.append('OK: buildModLeucos já existe')

with open(engine, 'w', encoding='utf-8') as f:
    f.write(eng)

# ── 3. Botões WhatsApp obstipação/fibromialgia no ResultCard ──────────────────
with open(result, encoding='utf-8') as f:
    rc = f.read()

# Adicionar função OBAWhatsAppButtons e chamada na OBASection
WA_BTNS = '''
// ── Botões WhatsApp OBA (obstipação e fibromialgia) ───────────────────────────
function OBAWhatsAppButtons({ oba, pacienteNome, pacienteCelular }) {
  const [salvandoObs, setSalvandoObs] = useState(false)
  const [salvandoFib, setSalvandoFib] = useState(false)
  const [salvoObs, setSalvoObs] = useState(false)
  const [salvoFib, setSalvoFib] = useState(false)

  const WA_PLATAFORMA = '5571997110804'

  // Verificar obstipação
  const temObstipacao = oba?.modulos?.some(m =>
    m.linhas?.some(l => l.includes('OBSTIPAÇÃO') || l.includes('PRISÃO DE VENTRE'))
  )

  // Verificar fibromialgia
  const temFibromialgia = oba?.modulos?.some(m =>
    m.linhas?.some(l => l.includes('FIBROMIALGIA') || l.includes('FIBROMIÁLGIC'))
  )

  if (!temObstipacao && !temFibromialgia) return null

  async function registrar(tipo) {
    try {
      await supabase.from('leads_comerciais').insert({
        nome: pacienteNome || null,
        celular: pacienteCelular || null,
        tipo,
        status: 'pendente',
        created_at: new Date().toISOString(),
      })
    } catch(e) {}
  }

  function enviarObstipacao() {
    setSalvandoObs(true)
    registrar('obstipacao')
    const msg = `Olá! Desejo testar a solução de RedFairy para obstipação. Entendo que receberei uma amostra grátis (pagarei apenas o valor do SEDEX), e que se eu quiser continuar o uso, vocês me garantem a continuidade do fornecimento a custo muito baixo. Obrigado!`
    window.open(`https://wa.me/${WA_PLATAFORMA}?text=${encodeURIComponent(msg)}`, '_blank')
    setSalvandoObs(false)
    setSalvoObs(true)
  }

  function enviarFibromialgia() {
    setSalvandoFib(true)
    registrar('fibromialgia')
    const msg = `Olá! Desejo testar a solução de RedFairy para os sintomas da fibromialgia. Entendo que receberei uma amostra grátis (pagarei apenas o valor do SEDEX), e que se eu quiser continuar o uso, vocês me garantem a continuidade do fornecimento a custo muito baixo. Obrigado!`
    window.open(`https://wa.me/${WA_PLATAFORMA}?text=${encodeURIComponent(msg)}`, '_blank')
    setSalvandoFib(false)
    setSalvoFib(true)
  }

  return (
    <div className="px-4 pb-4 space-y-3">
      {temObstipacao && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-amber-800 text-xs font-bold uppercase tracking-wide mb-2">💊 Solução para Obstipação</p>
          <p className="text-amber-700 text-xs mb-3 leading-relaxed">
            Identificamos obstipação crônica no seu perfil. Temos uma solução inovadora — amostras grátis disponíveis (você paga apenas o SEDEX).
          </p>
          {salvoObs ? (
            <p className="text-green-700 text-xs font-bold">✅ Mensagem enviada! Aguarde o contato da plataforma.</p>
          ) : (
            <button onClick={enviarObstipacao} disabled={salvandoObs}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
              📲 Quero testar — Enviar mensagem
            </button>
          )}
        </div>
      )}
      {temFibromialgia && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <p className="text-purple-800 text-xs font-bold uppercase tracking-wide mb-2">🌿 Solução para Fibromialgia</p>
          <p className="text-purple-700 text-xs mb-3 leading-relaxed">
            Identificamos sintomas fibromiálgicos no seu perfil. Temos uma solução inovadora — amostras grátis disponíveis (você paga apenas o SEDEX).
          </p>
          {salvoFib ? (
            <p className="text-green-700 text-xs font-bold">✅ Mensagem enviada! Aguarde o contato da plataforma.</p>
          ) : (
            <button onClick={enviarFibromialgia} disabled={salvandoFib}
              className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
              📲 Quero testar — Enviar mensagem
            </button>
          )}
        </div>
      )}
    </div>
  )
}

'''

# Inserir antes de OBASection
old_oba_sec = "// ── Seção OBA ─────────────────────────────────────────────────────────────────\nfunction OBASection"
new_oba_sec = WA_BTNS + "// ── Seção OBA ─────────────────────────────────────────────────────────────────\nfunction OBASection"

if old_oba_sec in rc:
    rc = rc.replace(old_oba_sec, new_oba_sec)
    fixed.append('OK: OBAWhatsAppButtons adicionado ao ResultCard')
else:
    fixed.append('ERRO: âncora OBASection não encontrada')

# Adicionar chamada dos botões na OBASection, após os módulos
old_exames_oba = """      {oba.examesComplementares?.length > 0 && ("""
new_exames_oba = """      <OBAWhatsAppButtons oba={oba} pacienteNome={oba._pacienteNome} pacienteCelular={oba._pacienteCelular} />

      {oba.examesComplementares?.length > 0 && ("""

if old_exames_oba in rc:
    rc = rc.replace(old_exames_oba, new_exames_oba)
    fixed.append('OK: chamada OBAWhatsAppButtons adicionada na OBASection')
else:
    fixed.append('ERRO: âncora exames complementares não encontrada')

with open(result, 'w', encoding='utf-8') as f:
    f.write(rc)

for msg in fixed:
    print(msg)
print('Concluído.')
