"""
fix_comentarios_medicamentos_dimorficos.py

Transforma os comentarios fixos de Metformina, IBP, Hidroxiureia e
Metotrexato em decisionEngine.js em comentarios CONDICIONAIS que
reinterpretam o padrao clinico conforme o laboratorio.

Regra clinica (Dr. Ramos): dispara mensagem mais intensa quando
medicamento + sinal lab suspeito; mensagem preventiva quando lab
ainda normal. Nunca usa 'urgente' (tom calibrado).

Alteracoes:
  - Bloco 'if (inputs.metformina) {...}' vira dimorfico por VCM
  - Bloco 'if (inputs.ibp) {...}' vira dimorfico por VCM e Ferritina
  - Bloco 'if (inputs.hidroxiureia) {...}' vira dimorfico por VCM
  - Bloco 'if (inputs.methotrexato) {...}' vira dimorfico por VCM

Nao remove o comentario anticonvulsivante — mantido como esta.
"""

from pathlib import Path
import sys

ARQ = Path("src/engine/decisionEngine.js")

if not ARQ.exists():
    print(f"ERRO: {ARQ} nao existe.")
    sys.exit(1)

src = ARQ.read_text(encoding="utf-8")

# ═════════════════════════════════════════════════════════════════════
# 1. METFORMINA
# ═════════════════════════════════════════════════════════════════════
ancora_metformina = """  if (inputs.metformina) {
    comentarios.push({ titulo: 'METFORMINA', texto: 'A METFORMINA REDUZ A ABSORÇÃO DE VITAMINA B12 NO ÍLEO TERMINAL. USO PROLONGADO PODE PRODUZIR DÉFICIT DE B12 E MACROCITOSE. RECOMENDA-SE DOSAR A VITAMINA B12 ANUALMENTE E SUPLEMENTAR SE NECESSÁRIO."""

if "METFORMINA + MACROCITOSE" in src:
    print("AVISO 1: comentario metformina ja eh dimorfico.")
elif ancora_metformina in src:
    # Encontra o fim do bloco (ate o } do if)
    idx = src.find(ancora_metformina)
    # Acha o proximo '}\n' a partir dali
    fim = src.find("}", idx)
    # Pega a linha completa onde esta o fechamento do objeto e a linha do }
    bloco_antigo_fim = src.find("})", idx) + 2
    # Encontra o } do if depois disso
    fim_if = src.find("}", bloco_antigo_fim) + 1

    bloco_antigo = src[idx:fim_if]

    novo = """  if (inputs.metformina) {
    const temMacrocitose = Number(inputs.vcm) >= 100
    if (temMacrocitose) {
      comentarios.push({
        titulo: 'METFORMINA + MACROCITOSE',
        texto: `METFORMINA EM USO COM MACROCITOSE (VCM ${inputs.vcm}): padrão provavelmente iatrogênico — a metformina reduz a absorção de vitamina B12 no íleo terminal. Recomendável dosar B12 sérica e avaliar consulta com hematologista. A suplementação sublingual de 1000 mcg/dia costuma corrigir o quadro; se persistir, considerar B12 injetável.`
      })
    } else {
      comentarios.push({
        titulo: 'METFORMINA',
        texto: 'METFORMINA EM USO. A medicação reduz a absorção de vitamina B12 no íleo terminal. Uso prolongado pode produzir déficit de B12 e macrocitose. Recomendável dosagem sérica anual de B12 e suplementação preventiva se houver sinais de depleção.'
      })
    }
  }"""

    src = src.replace(bloco_antigo, novo, 1)
    print("OK 1: metformina agora tem coment\u00e1rio dim\u00f3rfico (VCM \u2265 100).")
else:
    print("ERRO 1: ancora da metformina nao encontrada.")
    sys.exit(1)

# ═════════════════════════════════════════════════════════════════════
# 2. IBP
# ═════════════════════════════════════════════════════════════════════
ancora_ibp_prefix = "  if (inputs.ibp) {"

if "IBP + padrão suspeito" in src or "IBP + PADRÃO SUSPEITO" in src:
    print("AVISO 2: comentario IBP ja eh dimorfico.")
elif ancora_ibp_prefix in src:
    idx = src.find(ancora_ibp_prefix)
    # Encontra o } do if
    depth = 0
    pos = idx
    started = False
    while pos < len(src):
        if src[pos] == '{':
            depth += 1
            started = True
        elif src[pos] == '}':
            depth -= 1
            if started and depth == 0:
                break
        pos += 1
    fim_if = pos + 1
    bloco_antigo = src[idx:fim_if]

    novo = """  if (inputs.ibp) {
    const vcmNum = Number(inputs.vcm)
    const ferrNum = Number(inputs.ferritina)
    const temMacrocitose = vcmNum >= 100
    const temSideropenia = ferrNum < 50
    if (temMacrocitose || temSideropenia) {
      const labs = []
      if (temMacrocitose) labs.push(`VCM ${inputs.vcm}`)
      if (temSideropenia) labs.push(`Ferritina ${inputs.ferritina}`)
      comentarios.push({
        titulo: 'IBP + PADRÃO SUSPEITO',
        texto: `IBP (OMEPRAZOL/PANTOPRAZOL) COM ${labs.join(' e ')}: o uso crônico de inibidores da bomba de prótons reduz a acidez gástrica, comprometendo a absorção de vitamina B12 e de ferro heme. Recomendável dosar B12 sérica, revisar a indicação do IBP com o médico assistente e considerar suplementação enquanto o uso for necessário.`
      })
    } else {
      comentarios.push({
        titulo: 'IBP (OMEPRAZOL / PANTOPRAZOL)',
        texto: 'IBP EM USO PROLONGADO. Reduz a absorção de vitamina B12 e de ferro heme ao diminuir a acidez gástrica. Pode contribuir para macrocitose e sideropenia ao longo do tempo. Recomendável dosagem sérica anual de B12 e revisão periódica da indicação.'
      })
    }
  }"""

    src = src.replace(bloco_antigo, novo, 1)
    print("OK 2: IBP agora tem coment\u00e1rio dim\u00f3rfico (VCM \u2265 100 ou Ferr < 50).")
else:
    print("ERRO 2: ancora do IBP nao encontrada.")
    sys.exit(1)

# ═════════════════════════════════════════════════════════════════════
# 3. HIDROXIUREIA
# ═════════════════════════════════════════════════════════════════════
ancora_hu_prefix = "  if (inputs.hidroxiureia) {"

if "HIDROXIUREIA + MACROCITOSE" in src:
    print("AVISO 3: comentario hidroxiureia ja eh dimorfico.")
elif ancora_hu_prefix in src:
    idx = src.find(ancora_hu_prefix)
    depth = 0
    pos = idx
    started = False
    while pos < len(src):
        if src[pos] == '{':
            depth += 1
            started = True
        elif src[pos] == '}':
            depth -= 1
            if started and depth == 0:
                break
        pos += 1
    fim_if = pos + 1
    bloco_antigo = src[idx:fim_if]

    novo = """  if (inputs.hidroxiureia) {
    const temMacrocitose = Number(inputs.vcm) > 100
    if (temMacrocitose) {
      comentarios.push({
        titulo: 'HIDROXIUREIA + MACROCITOSE',
        texto: `HIDROXIUREIA EM USO COM MACROCITOSE (VCM ${inputs.vcm}): esse achado é ESPERADO — a hidroxiureia inibe a síntese de DNA e produz macrocitose dose-dependente. Não indica déficit nutricional nem requer suspensão. Manter acompanhamento pelo hematologista; a macrocitose pode ser marcador de aderência ao tratamento.`
      })
    } else {
      comentarios.push({
        titulo: 'HIDROXIUREIA',
        texto: 'HIDROXIUREIA EM USO. A medicação inibe a síntese de DNA e tipicamente produz macrocitose — sua ausência aqui pode significar dose abaixo do terapêutico ou início recente. Manter acompanhamento pelo hematologista.'
      })
    }
  }"""

    src = src.replace(bloco_antigo, novo, 1)
    print("OK 3: hidroxiureia agora tem coment\u00e1rio dim\u00f3rfico (VCM > 100).")
else:
    print("ERRO 3: ancora da hidroxiureia nao encontrada.")
    sys.exit(1)

# ═════════════════════════════════════════════════════════════════════
# 4. METOTREXATO (note: flag chamada 'methotrexato' com h)
# ═════════════════════════════════════════════════════════════════════
ancora_mtx_prefix = "  if (inputs.methotrexato) {"

if "METOTREXATO + MACROCITOSE" in src:
    print("AVISO 4: comentario metotrexato ja eh dimorfico.")
elif ancora_mtx_prefix in src:
    idx = src.find(ancora_mtx_prefix)
    depth = 0
    pos = idx
    started = False
    while pos < len(src):
        if src[pos] == '{':
            depth += 1
            started = True
        elif src[pos] == '}':
            depth -= 1
            if started and depth == 0:
                break
        pos += 1
    fim_if = pos + 1
    bloco_antigo = src[idx:fim_if]

    novo = """  if (inputs.methotrexato) {
    const temMacrocitose = Number(inputs.vcm) >= 100
    if (temMacrocitose) {
      comentarios.push({
        titulo: 'METOTREXATO + MACROCITOSE',
        texto: `METOTREXATO EM USO COM MACROCITOSE (VCM ${inputs.vcm}): padrão compatível com antagonismo do folato. Recomendável otimizar a suplementação de ácido fólico (5 mg/semana, ou 1 mg/dia) e avaliar com o reumatologista/médico assistente se a dose do metotrexato está adequada. Não suspender sem orientação médica.`
      })
    } else {
      comentarios.push({
        titulo: 'METOTREXATO',
        texto: 'METOTREXATO EM USO. Antagonista do ácido fólico — pode produzir macrocitose e anemia megaloblástica ao longo do tempo. A suplementação profilática de ácido fólico (5 mg/semana) é fundamental para prevenir déficit. Manter monitoramento periódico de hemograma.'
      })
    }
  }"""

    src = src.replace(bloco_antigo, novo, 1)
    print("OK 4: metotrexato agora tem coment\u00e1rio dim\u00f3rfico (VCM \u2265 100).")
else:
    print("ERRO 4: ancora do metotrexato nao encontrada.")
    sys.exit(1)

ARQ.write_text(src, encoding="utf-8")

# ═════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("TUDO OK!")
print(f"Arquivo salvo: {ARQ.resolve()}")
print()
print("4 comentarios medicamentosos agora sao DIMORFICOS:")
print("  - METFORMINA       -> reage a VCM >= 100")
print("  - IBP              -> reage a VCM >= 100 OU Ferritina < 50")
print("  - HIDROXIUREIA     -> reage a VCM > 100 (modula mensagem)")
print("  - METOTREXATO      -> reage a VCM >= 100")
print()
print("Tom calibrado:")
print("  - Sem 'urgente' ou 'imediato'")
print("  - 'Recomend\u00e1vel dosar...' / 'consulta com hematologista'")
print("  - Hidroxiureia: tranquilizador (achado esperado)")
print()
print("Proximo passo:")
print('  git add . && git commit -m "feat: comentarios medicamentos dimorficos por lab" && git push origin main')
