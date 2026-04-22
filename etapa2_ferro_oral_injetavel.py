"""
etapa2_ferro_oral_injetavel.py

Etapa 2 completa da separacao ferro oral x ferro injetavel:

  1. Calculator.jsx
     - state: ferroOral -> ferro_oral + ferro_injetavel
     - 2 presets demo (F + M): adicionar ferro_injetavel: false
     - Array de flags para OBA (linha 782): adicionar FERRO INJETAVEL
     - Payload do insert: ferro_oral + ferro_injetavel
     - handleLimpar: adicionar ferro_injetavel
     - CheckboxCard: 1 label 'Ferro Oral / Injetavel' -> 2 cards separados

  2. PatientDashboard.jsx
     - state: mesmas mudancas
     - Payload: mesmas mudancas
     - Array de checkboxes: 'Ferro Oral/Injetavel' vira 2 cards separados

  3. decisionEngine.js
     - if (inputs.ferroOral && comentarioFerro) vira logica dupla com fallback:
       * se ferro_injetavel marcado E tem comentarioFerroInjetavel -> usa ele
       * senao, se ferro_oral marcado E tem comentarioFerro -> usa comentarioFerro
       * senao, se qualquer um marcado E tem comentarioFerro -> usa comentarioFerro (fallback generico)

  4. achadosParalelos.js
     - usaFerro ja aceita ambas as flags (linha 19) — adicionar ferro_injetavel
"""

from pathlib import Path
import sys

problemas = []

# ═════════════════════════════════════════════════════════════════════
# 1. Calculator.jsx
# ═════════════════════════════════════════════════════════════════════
CALC = Path("src/components/Calculator.jsx")
if not CALC.exists():
    print(f"ERRO: {CALC} nao existe."); sys.exit(1)

calc_src = CALC.read_text(encoding="utf-8")

# 1a. state principal (linha 487): 'ferroOral: false,' -> 'ferro_oral: false, ferro_injetavel: false,'
antigo_1a = "transfundido: false, aspirina: false, vitaminaB12: false, ferroOral: false,"
novo_1a   = "transfundido: false, aspirina: false, vitaminaB12: false, ferro_oral: false, ferro_injetavel: false,"
if "ferro_injetavel: false" in calc_src and "ferroOral: false" not in calc_src:
    print("AVISO 1a: state principal ja migrado.")
elif antigo_1a in calc_src:
    calc_src = calc_src.replace(antigo_1a, novo_1a, 1)
    print("OK 1a: Calculator state principal migrado.")
else:
    problemas.append("1a: ancora do state principal nao encontrada")
    print("ERRO 1a: ancora do state principal nao encontrada.")

# 1b. preset demo F (linha 548) e M (linha 550) — adicionar ferro_injetavel: false apos ferroOral: false
# Estrategia: procurar 'ferroOral: false' e trocar pelos dois novos campos em cada preset
# Mas os presets tambem tem 'ferroOral: false' — precisamos renomear
# Vou procurar ocorrencia exata nas linhas dos presets:
# Os presets tem formato 'ferroOral: true' ou 'ferroOral: false' em contexto setInputs
# Como nao sabemos se tem 'true' ou 'false', vamos procurar todas ocorrencias restantes
count_ferroOral = calc_src.count("ferroOral")
print(f"  (info) Ainda restam {count_ferroOral} ocorrencias de 'ferroOral' para processar.")

# 1c. Array de flags OBA (linha 782): adicionar FERRO INJETAVEL
antigo_1c = "...(inputs.ferroOral   ? ['FERRO ORAL']          : []),"
novo_1c   = "...(inputs.ferro_oral  ? ['FERRO ORAL']          : []),\n            ...(inputs.ferro_injetavel ? ['FERRO INJETÁVEL'] : []),"
if "ferro_injetavel ? ['FERRO INJETÁVEL']" in calc_src:
    print("AVISO 1c: array OBA ja migrado.")
elif antigo_1c in calc_src:
    calc_src = calc_src.replace(antigo_1c, novo_1c, 1)
    print("OK 1c: Calculator array de flags OBA atualizado.")
else:
    problemas.append("1c: ancora do array OBA nao encontrada")
    print("ERRO 1c: ancora do array OBA nao encontrada.")

# 1d. Payload insert: 'ferro_oral: inputs.ferroOral,' -> 'ferro_oral: inputs.ferro_oral, ferro_injetavel: inputs.ferro_injetavel,'
antigo_1d = "ferro_oral: inputs.ferroOral,"
novo_1d   = "ferro_oral: inputs.ferro_oral,\n        ferro_injetavel: inputs.ferro_injetavel,"
if "ferro_injetavel: inputs.ferro_injetavel" in calc_src:
    print("AVISO 1d: payload ja migrado.")
elif antigo_1d in calc_src:
    calc_src = calc_src.replace(antigo_1d, novo_1d, 1)
    print("OK 1d: Calculator payload insert atualizado.")
else:
    problemas.append("1d: ancora do payload nao encontrada")
    print("ERRO 1d: ancora do payload nao encontrada.")

# 1e. CheckboxCard (linha 1244) — 1 cartao vira 2
antigo_1e = '<CheckboxCard name="ferroOral" label="Ferro Oral / Injetável" sublabel="Nos últimos 2 anos" checked={inputs.ferroOral} onChange={handleChange} color="orange" />'
novo_1e   = '<CheckboxCard name="ferro_oral" label="Ferro Oral" sublabel="Nos últimos 2 anos" checked={inputs.ferro_oral} onChange={handleChange} color="orange" />\n              <CheckboxCard name="ferro_injetavel" label="Ferro Injetável" sublabel="Nos últimos 2 anos" checked={inputs.ferro_injetavel} onChange={handleChange} color="orange" />'
if 'name="ferro_injetavel"' in calc_src:
    print("AVISO 1e: CheckboxCard ja migrado.")
elif antigo_1e in calc_src:
    calc_src = calc_src.replace(antigo_1e, novo_1e, 1)
    print("OK 1e: Calculator CheckboxCard dividido em 2 (Oral + Injetavel).")
else:
    problemas.append("1e: ancora do CheckboxCard nao encontrada")
    print("ERRO 1e: ancora do CheckboxCard nao encontrada.")

# 1f. handleLimpar (linha 852) — pode conter 'ferroOral: false'
# Vamos checar e substituir se encontrar
# Tambem vamos tratar presets demo F/M (linha 548/550) que contem ferroOral
# Estrategia safa: replace global restante
# Mas deve ser cuidadoso com tokens como 'ferroOral:'
# Vamos trocar 'ferroOral: false' por 'ferro_oral: false, ferro_injetavel: false' em todas ocorrencias restantes
antigo_1f = "ferroOral: false"
novo_1f   = "ferro_oral: false, ferro_injetavel: false"
count_1f = calc_src.count(antigo_1f)
if count_1f > 0:
    calc_src = calc_src.replace(antigo_1f, novo_1f)
    print(f"OK 1f: {count_1f}x 'ferroOral: false' migrado para 'ferro_oral: false, ferro_injetavel: false' (presets demo + handleLimpar).")
else:
    print("AVISO 1f: nenhuma ocorrencia adicional de 'ferroOral: false' — ou ja migrado.")

# Tambem tratar 'ferroOral: true' caso exista
count_true = calc_src.count("ferroOral: true")
if count_true > 0:
    calc_src = calc_src.replace("ferroOral: true", "ferro_oral: true")
    print(f"OK 1f-bis: {count_true}x 'ferroOral: true' renomeado para 'ferro_oral: true'.")

# Confirmar que ferroOral nao sobra
if "ferroOral" in calc_src:
    # Deve sobrar zero. Se sobrou, listar linhas:
    linhas = calc_src.splitlines()
    print("\n  ATENCAO: 'ferroOral' ainda aparece em:")
    for i, l in enumerate(linhas):
        if "ferroOral" in l:
            print(f"    linha {i+1}: {l.strip()[:180]}")

CALC.write_text(calc_src, encoding="utf-8")

# ═════════════════════════════════════════════════════════════════════
# 2. PatientDashboard.jsx
# ═════════════════════════════════════════════════════════════════════
DASH = Path("src/components/PatientDashboard.jsx")
if not DASH.exists():
    print(f"ERRO: {DASH} nao existe."); sys.exit(1)

dash_src = DASH.read_text(encoding="utf-8")

# 2a. state (linha 26): 'ferroOral: false,' -> 'ferro_oral: false, ferro_injetavel: false,'
antigo_2a = "aspirina: false, vitaminaB12: false, ferroOral: false,"
novo_2a   = "aspirina: false, vitaminaB12: false, ferro_oral: false, ferro_injetavel: false,"
if "ferro_injetavel: false" in dash_src and "ferroOral: false" not in dash_src:
    print("AVISO 2a: state Dashboard ja migrado.")
elif antigo_2a in dash_src:
    dash_src = dash_src.replace(antigo_2a, novo_2a, 1)
    print("OK 2a: Dashboard state migrado.")
else:
    problemas.append("2a: ancora do state Dashboard nao encontrada")
    print("ERRO 2a: ancora do state Dashboard nao encontrada.")

# 2b. Payload insert (linha 176): 'ferro_oral: inputs.ferroOral,' -> duas linhas
antigo_2b = "ferro_oral: inputs.ferroOral,"
novo_2b   = "ferro_oral: inputs.ferro_oral,\n        ferro_injetavel: inputs.ferro_injetavel,"
if "ferro_injetavel: inputs.ferro_injetavel" in dash_src:
    print("AVISO 2b: payload Dashboard ja migrado.")
elif antigo_2b in dash_src:
    dash_src = dash_src.replace(antigo_2b, novo_2b, 1)
    print("OK 2b: Dashboard payload insert atualizado.")
else:
    problemas.append("2b: ancora do payload Dashboard nao encontrada")
    print("ERRO 2b: ancora do payload Dashboard nao encontrada.")

# 2c. Array de checkboxes (linha 489) — dividir em 2
antigo_2c = "{ name: 'ferroOral', label: 'Ferro Oral/Injetável', sub: 'Últimos 2 anos', color: 'orange' },"
novo_2c   = "{ name: 'ferro_oral', label: 'Ferro Oral', sub: 'Últimos 2 anos', color: 'orange' },\n                  { name: 'ferro_injetavel', label: 'Ferro Injetável', sub: 'Últimos 2 anos', color: 'orange' },"
if "name: 'ferro_injetavel'" in dash_src:
    print("AVISO 2c: array de checkboxes Dashboard ja migrado.")
elif antigo_2c in dash_src:
    dash_src = dash_src.replace(antigo_2c, novo_2c, 1)
    print("OK 2c: Dashboard array de checkboxes dividido em 2.")
else:
    problemas.append("2c: ancora do array de checkboxes Dashboard nao encontrada")
    print("ERRO 2c: ancora do array de checkboxes Dashboard nao encontrada.")

# Verificar se ainda sobra 'ferroOral' no Dashboard
if "ferroOral" in dash_src:
    linhas = dash_src.splitlines()
    print("\n  ATENCAO: 'ferroOral' ainda aparece em Dashboard:")
    for i, l in enumerate(linhas):
        if "ferroOral" in l:
            print(f"    linha {i+1}: {l.strip()[:180]}")

DASH.write_text(dash_src, encoding="utf-8")

# ═════════════════════════════════════════════════════════════════════
# 3. decisionEngine.js
# ═════════════════════════════════════════════════════════════════════
ENG = Path("src/engine/decisionEngine.js")
if not ENG.exists():
    print(f"ERRO: {ENG} nao existe."); sys.exit(1)

eng_src = ENG.read_text(encoding="utf-8")

# 3a. substituir if (inputs.ferroOral && comentarioFerro) pela logica dupla
antigo_3a = """  if (inputs.ferroOral && resultado?.comentarioFerro) {
    comentarios.push({ titulo: 'FERRO ORAL / INJETÁVEL', texto: resultado.comentarioFerro });
  }"""
novo_3a = """  // Ferro oral vs injetavel: usa comentario especifico se existir, senao cai em comentarioFerro generico
  if (inputs.ferro_injetavel && resultado?.comentarioFerroInjetavel) {
    comentarios.push({ titulo: 'FERRO INJETÁVEL', texto: resultado.comentarioFerroInjetavel });
  } else if (inputs.ferro_oral && resultado?.comentarioFerroOral) {
    comentarios.push({ titulo: 'FERRO ORAL', texto: resultado.comentarioFerroOral });
  } else if ((inputs.ferro_oral || inputs.ferro_injetavel) && resultado?.comentarioFerro) {
    // Fallback: comentario generico quando nao ha especifico
    const titulo = inputs.ferro_injetavel && inputs.ferro_oral
      ? 'FERRO ORAL + INJETÁVEL'
      : inputs.ferro_injetavel
        ? 'FERRO INJETÁVEL'
        : 'FERRO ORAL';
    comentarios.push({ titulo, texto: resultado.comentarioFerro });
  }"""

if "ferro_injetavel && resultado?.comentarioFerroInjetavel" in eng_src:
    print("AVISO 3a: engine ja migrado.")
elif antigo_3a in eng_src:
    eng_src = eng_src.replace(antigo_3a, novo_3a, 1)
    print("OK 3a: engine agora usa logica dupla oral/injetavel com fallback.")
else:
    problemas.append("3a: ancora do if (inputs.ferroOral ...) nao encontrada")
    print("ERRO 3a: ancora do if (inputs.ferroOral ...) nao encontrada.")

ENG.write_text(eng_src, encoding="utf-8")

# ═════════════════════════════════════════════════════════════════════
# 4. achadosParalelos.js — adicionar ferro_injetavel na clausula
# ═════════════════════════════════════════════════════════════════════
AP = Path("src/engine/achadosParalelos.js")
if not AP.exists():
    print(f"ERRO: {AP} nao existe."); sys.exit(1)

ap_src = AP.read_text(encoding="utf-8")

antigo_4 = "const usaFerro    = inputs.ferroOral || inputs.ferro_oral;"
novo_4   = "const usaFerro    = inputs.ferroOral || inputs.ferro_oral || inputs.ferro_injetavel;"

if "inputs.ferro_injetavel" in ap_src:
    print("AVISO 4: achadosParalelos ja migrado.")
elif antigo_4 in ap_src:
    ap_src = ap_src.replace(antigo_4, novo_4, 1)
    AP.write_text(ap_src, encoding="utf-8")
    print("OK 4: achadosParalelos agora aceita ferro_injetavel tambem.")
else:
    problemas.append("4: ancora do usaFerro nao encontrada")
    print("ERRO 4: ancora do usaFerro nao encontrada.")

# ═════════════════════════════════════════════════════════════════════
# RESUMO
# ═════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
if problemas:
    print(f"ATENCAO: {len(problemas)} problema(s) detectado(s):")
    for p in problemas:
        print(f"  - {p}")
    print("Revise o codigo manualmente.")
else:
    print("ETAPA 2 APLICADA COM SUCESSO!")
print("=" * 60)
print()
print("Arquivos modificados:")
print(f"  - {CALC}")
print(f"  - {DASH}")
print(f"  - {ENG}")
print(f"  - {AP}")
print()
print("COMPATIBILIDADE:")
print("  - achadosParalelos aceita 'ferroOral' (antigo) E 'ferro_oral'/'ferro_injetavel' (novos)")
print("  - Matrizes nao foram tocadas (194 comentarioFerro preservados)")
print("  - Engine usa novo comentario especifico se existir, senao cai em comentarioFerro")
print()
print("PROXIMOS PASSOS:")
print("  1. Rodar SQL no Supabase (adicionar coluna ferro_injetavel) - se ainda nao rodou")
print("  2. Commit + push:")
print('     git add . && git commit -m "feat: separa ferro_oral e ferro_injetavel com fallback" && git push origin main')
