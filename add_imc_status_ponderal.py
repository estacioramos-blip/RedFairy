"""
add_imc_status_ponderal.py

Adiciona IMC pre-cirurgia e IMC atual ao modulo Status Ponderal.

Regra de negocio (Dr. Ramos):
  - Se paciente NAO marca os campos -> 'desconhecido' no relatorio
  - Se marca, mostra valor e classificacao OMS
  - Se marca AMBOS, calcula diferenca absoluta e percentual,
    e dispara alertas clinicos conforme faixa

Faixas de perda de IMC (bariatria padrao):
  >=25%  : perda adequada/excelente (verde)
  10-25% : perda parcial/insuficiente (amarelo)
  <10%   : perda aquem do esperado (laranja)
  reganho 0-5% : leve
  reganho >5%  : moderado
  reganho >10% : grave

Alteracoes:
  1. OBAModal.jsx
     - Acrescenta imc_antes e imc_atual ao form state
     - Renderiza 2 inputs apos os campos de peso, dentro da secao Status Ponderal
  2. obaEngine.js
     - Funcao buildModPonderal recebe e analisa imc_antes/imc_atual
     - Adiciona linhas ao modulo ponderal relatando os dois IMCs
     - Se ambos preenchidos, calcula delta absoluto + percentual e classifica
     - Dispara alertas conforme faixa
"""

from pathlib import Path
import sys
import re

# ═════════════════════════════════════════════════════════════════════
# 1. OBAModal.jsx - adicionar imc_antes e imc_atual
# ═════════════════════════════════════════════════════════════════════
MODAL = Path("src/components/OBAModal.jsx")
if not MODAL.exists():
    print(f"ERRO: {MODAL} nao existe.")
    sys.exit(1)

modal_src = MODAL.read_text(encoding="utf-8")

# 1a - adicionar imc_antes/imc_atual ao form state inicial
ancora_state = "    peso_antes: '', peso_minimo_pos: '', peso_atual: '',"
novo_state   = "    peso_antes: '', peso_minimo_pos: '', peso_atual: '',\n    imc_antes: '', imc_atual: '',"

if ancora_state in modal_src and "imc_antes: ''" not in modal_src:
    modal_src = modal_src.replace(ancora_state, novo_state, 1)
    print("OK 1a: imc_antes e imc_atual adicionados ao form state.")
elif "imc_antes: ''" in modal_src:
    print("AVISO 1a: campos IMC ja existem no form state.")
else:
    print("ERRO 1a: ancora do form state nao encontrada.")
    sys.exit(1)

# 1b - adicionar inputs IMC logo apos o campo "Peso atual"
# Ancora: o bloco do peso_atual seguido do Condicional kgPerdidos
ancora_inputs = """          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem', marginTop:'0.8rem' }}>Peso atual (kg)</label>
          <input style={inp} type="number" placeholder="Ex: 78" value={form.peso_atual} onChange={e => sf('peso_atual', e.target.value)} />

          {kgPerdidos !== null && kgPerdidos > 0 && ("""

novo_inputs = """          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem', marginTop:'0.8rem' }}>Peso atual (kg)</label>
          <input style={inp} type="number" placeholder="Ex: 78" value={form.peso_atual} onChange={e => sf('peso_atual', e.target.value)} />

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.6rem', marginTop:'0.8rem' }}>
            <div>
              <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem' }}>IMC antes da cirurgia</label>
              <input style={inp} type="number" step="0.1" placeholder="Ex: 42" value={form.imc_antes} onChange={e => sf('imc_antes', e.target.value)} />
            </div>
            <div>
              <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem' }}>IMC atual</label>
              <input style={inp} type="number" step="0.1" placeholder="Ex: 28" value={form.imc_atual} onChange={e => sf('imc_atual', e.target.value)} />
            </div>
          </div>
          <p style={{ fontSize:'0.7rem', color:'#6B7280', marginTop:'0.3rem', fontStyle:'italic' }}>Opcional — se não souber, deixe em branco.</p>

          {kgPerdidos !== null && kgPerdidos > 0 && ("""

if ancora_inputs in modal_src and "IMC antes da cirurgia" not in modal_src:
    modal_src = modal_src.replace(ancora_inputs, novo_inputs, 1)
    print("OK 1b: inputs de IMC adicionados apos 'Peso atual'.")
elif "IMC antes da cirurgia" in modal_src:
    print("AVISO 1b: inputs IMC ja existem no form.")
else:
    print("ERRO 1b: ancora dos inputs nao encontrada.")
    sys.exit(1)

MODAL.write_text(modal_src, encoding="utf-8")

# ═════════════════════════════════════════════════════════════════════
# 2. obaEngine.js - ampliar buildModPonderal com logica de IMC
# ═════════════════════════════════════════════════════════════════════
ENGINE = Path("src/engine/obaEngine.js")
if not ENGINE.exists():
    print(f"ERRO: {ENGINE} nao existe.")
    sys.exit(1)

engine_src = ENGINE.read_text(encoding="utf-8")

# Idempotencia
if "classificaIMC" in engine_src:
    print("AVISO 2: logica de IMC ja presente no obaEngine. Nada a fazer.")
else:
    # Precisamos achar a declaracao de pesoMin na buildModPonderal.
    # A ancora eh a linha 'if (!isNaN(pesoMin) && pesoMin < pesoAtual) {'
    # (linha 807 do codigo original) — antes dela vamos adicionar as linhas
    # de IMC.
    ancora_engine = """    if (!isNaN(pesoMin) && pesoMin < pesoAtual) {
      const reganho = pesoAtual - pesoMin"""

    novo_engine = """    // ── IMC PRE-CIRURGIA E IMC ATUAL ──────────────────────────────────
    const imcAntes = parseFloat(dadosOBA.imc_antes)
    const imcAtual = parseFloat(dadosOBA.imc_atual)

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
      const reganho = pesoAtual - pesoMin"""

    if ancora_engine in engine_src:
        engine_src = engine_src.replace(ancora_engine, novo_engine, 1)
        ENGINE.write_text(engine_src, encoding="utf-8")
        print("OK 2: logica de IMC adicionada ao buildModPonderal no obaEngine.js.")
    else:
        print("ERRO 2: ancora no obaEngine (buildModPonderal) nao encontrada.")
        sys.exit(1)

# ═════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("TUDO OK! Arquivos modificados:")
print(f"  - {MODAL}   (2 novos campos)")
print(f"  - {ENGINE}  (logica de IMC no modulo ponderal)")
print()
print("Regras aplicadas:")
print("  - Campos IMC opcionais no formulario")
print("  - Se ambos vazios   -> 'IMC PREVIO: desconhecido . IMC ATUAL: desconhecido'")
print("  - Se um vazio       -> mostra o preenchido e 'desconhecido' no outro")
print("  - Se ambos presente -> calcula delta absoluto e percentual")
print()
print("Faixas de interpretacao (quando ambos preenchidos):")
print("  - Perda >= 25% do IMC    -> VERDE (sucesso)")
print("  - Perda 10-25%           -> AMARELO (parcial, alerta LEVE)")
print("  - Perda < 10%            -> LARANJA (aquem, alerta MODERADO)")
print("  - Reganho 0-5%           -> alerta LEVE")
print("  - Reganho 5-10%          -> alerta MODERADO")
print("  - Reganho > 10%          -> alerta GRAVE")
print()
print("Proximo passo:")
print('  git add . && git commit -m "feat: IMC pre/atual no modulo ponderal do OBA" && git push origin main')
