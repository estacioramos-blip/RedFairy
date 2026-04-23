"""
ajustes_finais_obamodal.py

APLICA 6 AJUSTES FINAIS (fim do escopo de inputs do OBAModal):

  1. Indicacao da cirurgia: expandir METABOLICA com texto explicativo.
  2. Remover checkbox "PERDI MAS GANHEI PESO NOVAMENTE" (calculado
     automaticamente via peso_minimo_pos).
  3. ESPECIALISTAS: OUTRO por ultimo.
  4. COMPULSOES: OUTRA por ultima.
  5. MEDICAMENTOS: 'FERRO VENOSO' -> 'FERRO INJETAVEL (EV/IM)' e
     adicionar 'FERRO ORAL'; pre-marcacao se ja marcado no Calculator.
  6. EXAMES_BASE: adicionar COLESTEROL TOTAL, HDL, LDL, VLDL,
     LIPOPROTEINA A (LpA) e APOLIPOPROTEINA B.

Modifica 3 arquivos:
  - src/components/OBAModal.jsx (ajustes principais)
  - src/components/Calculator.jsx (passar ferro_oral/ferro_injetavel)
  - src/components/PatientDashboard.jsx (idem)
"""

from pathlib import Path
import re
import sys

OBA  = Path("src/components/OBAModal.jsx")
CALC = Path("src/components/Calculator.jsx")
DASH = Path("src/components/PatientDashboard.jsx")

for p in [OBA, CALC, DASH]:
    if not p.exists():
        print(f"ERRO: {p} nao existe."); sys.exit(1)

oba_src  = OBA.read_text(encoding="utf-8")
calc_src = CALC.read_text(encoding="utf-8")
dash_src = DASH.read_text(encoding="utf-8")

problemas = []

# ═════════════════════════════════════════════════════════════════════
# AJUSTE 1 — Indicacao da cirurgia: expandir METABOLICA
# ═════════════════════════════════════════════════════════════════════
ancora1 = "options={['OBESIDADE','METABÓLICA','OBESIDADE + DIABETES','HEMOCROMATOSE','GASTRECTOMIA POR OUTRAS CAUSAS']}"
novo1   = "options={['OBESIDADE','METABÓLICA (SÍNDROME METABÓLICA, DISLIPIDEMIA, HIPERTENSÃO, APNEIA DO SONO)','OBESIDADE + DIABETES','HEMOCROMATOSE','GASTRECTOMIA POR OUTRAS CAUSAS']}"

if "SÍNDROME METABÓLICA, DISLIPIDEMIA" in oba_src:
    print("AVISO 1: METABOLICA ja expandida.")
elif ancora1 in oba_src:
    oba_src = oba_src.replace(ancora1, novo1, 1)
    print("OK 1: METABOLICA expandida com subclinicas.")
else:
    problemas.append("1")
    print("ERRO 1: ancora do radio de indicacao nao encontrada.")

# ═════════════════════════════════════════════════════════════════════
# AJUSTE 2 — Remover checkbox "PERDI MAS GANHEI PESO NOVAMENTE"
# (mantemos o campo no state — calculado automatico via peso_minimo_pos)
# ═════════════════════════════════════════════════════════════════════
ancora2 = """            {!(kgGanhou !== null && kgGanhou > 0) && (
              <CheckRow label="PERDI MAS GANHEI PESO NOVAMENTE" checked={form.ganhou_peso_apos} onClick={() => sf('ganhou_peso_apos', !form.ganhou_peso_apos)} />
            )}
            """
novo2 = "            "  # remove o bloco inteiro (3 linhas)

if 'label="PERDI MAS GANHEI PESO NOVAMENTE"' in oba_src:
    if ancora2 in oba_src:
        oba_src = oba_src.replace(ancora2, novo2, 1)
        print("OK 2: checkbox 'PERDI MAS GANHEI PESO NOVAMENTE' removido.")
    else:
        problemas.append("2")
        print("ERRO 2: ancora do checkbox nao casou (formatting pode ter mudado).")
else:
    print("AVISO 2: checkbox ja foi removido.")

# ═════════════════════════════════════════════════════════════════════
# AJUSTE 3 — ESPECIALISTAS: OUTRO por ultimo
# ═════════════════════════════════════════════════════════════════════
m = re.search(r"const ESPECIALISTAS\s*=\s*\[(.*?)\]", oba_src, re.DOTALL)
if m:
    ini, fim = m.span(1)
    conteudo = m.group(1)
    # Extrair todos os elementos (strings entre aspas)
    items = re.findall(r"'([^']+)'", conteudo)
    # Remover OUTRO e colocar no fim
    items_sem_outro = [x for x in items if x.upper() != 'OUTRO']
    items_reordenados = items_sem_outro + (['OUTRO'] if 'OUTRO' in [x.upper() for x in items] else [])
    # Reconstruir
    novo_bloco = "\n    " + ", ".join(f"'{x}'" for x in items_reordenados) + "\n  "
    oba_src = oba_src[:ini] + novo_bloco + oba_src[fim:]
    if items[-1].upper() == 'OUTRO':
        print("AVISO 3: OUTRO ja era o ultimo em ESPECIALISTAS.")
    else:
        print(f"OK 3: ESPECIALISTAS reordenado ({len(items_reordenados)} itens, OUTRO ao final).")
else:
    problemas.append("3")
    print("ERRO 3: array ESPECIALISTAS nao encontrado.")

# ═════════════════════════════════════════════════════════════════════
# AJUSTE 4 — COMPULSOES: OUTRA por ultima
# ═════════════════════════════════════════════════════════════════════
m = re.search(r"const COMPULSOES\s*=\s*\[(.*?)\]", oba_src, re.DOTALL)
if m:
    ini, fim = m.span(1)
    conteudo = m.group(1)
    items = re.findall(r"'([^']+)'", conteudo)
    items_sem_outra = [x for x in items if x.upper() != 'OUTRA']
    items_reordenados = items_sem_outra + (['OUTRA'] if 'OUTRA' in [x.upper() for x in items] else [])
    novo_bloco = "\n    " + ", ".join(f"'{x}'" for x in items_reordenados) + "\n  "
    oba_src = oba_src[:ini] + novo_bloco + oba_src[fim:]
    if items[-1].upper() == 'OUTRA':
        print("AVISO 4: OUTRA ja era a ultima em COMPULSOES.")
    else:
        print(f"OK 4: COMPULSOES reordenado ({len(items_reordenados)} itens, OUTRA ao final).")
else:
    problemas.append("4")
    print("ERRO 4: array COMPULSOES nao encontrado.")

# ═════════════════════════════════════════════════════════════════════
# AJUSTE 5a — MEDICAMENTOS: 'FERRO VENOSO' -> 'FERRO INJETAVEL (EV/IM)'
# ═════════════════════════════════════════════════════════════════════
if "'FERRO INJETÁVEL (EV/IM)'" in oba_src:
    print("AVISO 5a: FERRO INJETAVEL (EV/IM) ja existe.")
elif "'FERRO VENOSO'" in oba_src:
    oba_src = oba_src.replace("'FERRO VENOSO'", "'FERRO INJETÁVEL (EV/IM)'", 1)
    print("OK 5a: 'FERRO VENOSO' -> 'FERRO INJETAVEL (EV/IM)'.")
else:
    problemas.append("5a")
    print("ERRO 5a: 'FERRO VENOSO' nao encontrado em MEDICAMENTOS.")

# ═════════════════════════════════════════════════════════════════════
# AJUSTE 5b — Adicionar 'FERRO ORAL' no inicio da lista MEDICAMENTOS
# ═════════════════════════════════════════════════════════════════════
if "'FERRO ORAL'" in oba_src:
    print("AVISO 5b: 'FERRO ORAL' ja existe.")
else:
    # Adicionar antes de 'FERRO INJETAVEL (EV/IM)' (ja trocado acima)
    ancora5b = "'FERRO INJETÁVEL (EV/IM)'"
    if ancora5b in oba_src:
        oba_src = oba_src.replace(ancora5b, "'FERRO ORAL', 'FERRO INJETÁVEL (EV/IM)'", 1)
        print("OK 5b: 'FERRO ORAL' adicionado antes de FERRO INJETAVEL.")
    else:
        problemas.append("5b")
        print("ERRO 5b: ancora para inserir FERRO ORAL nao encontrada.")

# ═════════════════════════════════════════════════════════════════════
# AJUSTE 5c — Pre-marcar via dadosRedFairy (useEffect no OBAModal)
# ═════════════════════════════════════════════════════════════════════
# O OBAModal ja recebe dadosRedFairy. Precisamos de um useEffect que,
# na montagem, adicione 'FERRO ORAL' e/ou 'FERRO INJETAVEL (EV/IM)' ao
# state 'form.medicamentos' se ja marcados.

# Precisamos inserir esse useEffect depois da declaracao do state form.
# Ancora: linha 'const saudacao = sexo === "F" ? "Bem-vinda" : "Bem-vindo"'
ancora5c = '  const saudacao = sexo === \'F\' ? \'Bem-vinda\' : \'Bem-vindo\''
novo5c   = '''  const saudacao = sexo === 'F' ? 'Bem-vinda' : 'Bem-vindo'

  // Pre-marca ferro oral/injetavel se ja selecionado no Calculator
  React.useEffect(() => {
    if (!dadosRedFairy) return
    const novosMeds = []
    if (dadosRedFairy.ferro_oral)      novosMeds.push('FERRO ORAL')
    if (dadosRedFairy.ferro_injetavel) novosMeds.push('FERRO INJETÁVEL (EV/IM)')
    if (novosMeds.length > 0) {
      setForm(prev => ({
        ...prev,
        medicamentos: [...new Set([...(prev.medicamentos || []), ...novosMeds])],
      }))
    }
  }, [dadosRedFairy])'''

if "Pre-marca ferro oral/injetavel" in oba_src:
    print("AVISO 5c: useEffect de pre-marcacao ja existe.")
elif ancora5c in oba_src:
    oba_src = oba_src.replace(ancora5c, novo5c, 1)
    print("OK 5c: useEffect para pre-marcar ferro adicionado.")
    # Verificar se React eh importado
    if "import React" not in oba_src and "from 'react'" in oba_src:
        # Adicionar React no primeiro import de react
        oba_src = oba_src.replace(
            "from 'react'", "from 'react'", 1
        )
        # O React.useEffect tb funciona com useEffect importado — vamos usar useEffect
        oba_src = oba_src.replace("React.useEffect", "useEffect", 1)
        # Garantir que useEffect esta importado
        if "useEffect" not in oba_src[:oba_src.find("from 'react'")+30]:
            # Adicionar ao import
            m_imp = re.search(r"import\s*\{([^}]*)\}\s*from\s*'react'", oba_src)
            if m_imp:
                imports_atuais = m_imp.group(1)
                if "useEffect" not in imports_atuais:
                    novos_imports = imports_atuais.rstrip() + ", useEffect"
                    oba_src = oba_src.replace(m_imp.group(0), f"import {{{novos_imports}}} from 'react'", 1)
                    print("   + useEffect adicionado aos imports do React.")
else:
    problemas.append("5c")
    print("ERRO 5c: ancora do 'const saudacao' nao encontrada para inserir useEffect.")

# ═════════════════════════════════════════════════════════════════════
# AJUSTE 5d — Calculator: passar ferro_oral e ferro_injetavel em dadosRedFairy
# ═════════════════════════════════════════════════════════════════════
ancora5d = """          dadosRedFairy={{
            gestante: inputs.gestante,
            semanas_gestacao: inputs.semanas_gestacao ? Number(inputs.semanas_gestacao) : null,
            dum: inputs.dum || null,
          }}"""
novo5d = """          dadosRedFairy={{
            gestante: inputs.gestante,
            semanas_gestacao: inputs.semanas_gestacao ? Number(inputs.semanas_gestacao) : null,
            dum: inputs.dum || null,
            ferro_oral: inputs.ferro_oral || inputs.ferroOral || false,
            ferro_injetavel: inputs.ferro_injetavel || false,
          }}"""

if "ferro_oral: inputs.ferro_oral" in calc_src:
    print("AVISO 5d: Calculator ja passa ferro_oral.")
elif ancora5d in calc_src:
    calc_src = calc_src.replace(ancora5d, novo5d, 1)
    print("OK 5d: Calculator agora passa ferro_oral/ferro_injetavel para OBAModal.")
else:
    problemas.append("5d")
    print("ERRO 5d: ancora do dadosRedFairy no Calculator nao encontrada.")

# ═════════════════════════════════════════════════════════════════════
# AJUSTE 5e — PatientDashboard: passar ferro_oral e ferro_injetavel
# ═════════════════════════════════════════════════════════════════════
ancora5e = """          dadosRedFairy={{
            gestante: inputs.gestante,
            semanas_gestacao: inputs.semanas_gestacao ? Number(inputs.semanas_gestacao) : null,
            dum: inputs.dum || null,
          }}"""
novo5e = """          dadosRedFairy={{
            gestante: inputs.gestante,
            semanas_gestacao: inputs.semanas_gestacao ? Number(inputs.semanas_gestacao) : null,
            dum: inputs.dum || null,
            ferro_oral: inputs.ferro_oral || false,
            ferro_injetavel: inputs.ferro_injetavel || false,
          }}"""

if "ferro_oral: inputs.ferro_oral" in dash_src:
    print("AVISO 5e: PatientDashboard ja passa ferro_oral.")
elif ancora5e in dash_src:
    dash_src = dash_src.replace(ancora5e, novo5e, 1)
    print("OK 5e: PatientDashboard agora passa ferro_oral/ferro_injetavel.")
else:
    problemas.append("5e")
    print("ERRO 5e: ancora do dadosRedFairy no PatientDashboard nao encontrada.")

# ═════════════════════════════════════════════════════════════════════
# AJUSTE 6 — EXAMES_BASE: adicionar COLESTEROL + LpA + ApoB
# ═════════════════════════════════════════════════════════════════════
# Vamos inserir antes de triglicerides (que ja existe)
ancora6 = "  { key: 'triglicerides',  label: 'Triglicérides',            unit: 'mg/dL',  ref: '<150' },"
novo6 = """  { key: 'colesterol_total', label: 'Colesterol Total',         unit: 'mg/dL',  ref: '<190' },
  { key: 'hdl',             label: 'HDL Colesterol',            unit: 'mg/dL',  ref: 'H: >40 / F: >50' },
  { key: 'ldl',             label: 'LDL Colesterol',            unit: 'mg/dL',  ref: '<130 (ideal <100)' },
  { key: 'vldl',            label: 'VLDL Colesterol',           unit: 'mg/dL',  ref: '<30' },
  { key: 'lipoproteina_a',  label: 'Lipoproteína A (LpA)',      unit: 'mg/dL',  ref: '<30 (ótimo <14)' },
  { key: 'apolipoproteina_b', label: 'Apolipoproteína B',       unit: 'mg/dL',  ref: '<100 (alto risco: >130)' },
  { key: 'triglicerides',  label: 'Triglicérides',            unit: 'mg/dL',  ref: '<150' },"""

if "colesterol_total" in oba_src:
    print("AVISO 6: colesterol_total ja existe em EXAMES_BASE.")
elif ancora6 in oba_src:
    oba_src = oba_src.replace(ancora6, novo6, 1)
    print("OK 6: EXAMES_BASE +6 exames (Col Total, HDL, LDL, VLDL, LpA, ApoB).")
else:
    problemas.append("6")
    print("ERRO 6: ancora de triglicerides em EXAMES_BASE nao encontrada.")

# ═════════════════════════════════════════════════════════════════════
# SALVAR
# ═════════════════════════════════════════════════════════════════════
OBA.write_text(oba_src, encoding="utf-8")
CALC.write_text(calc_src, encoding="utf-8")
DASH.write_text(dash_src, encoding="utf-8")

# ═════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
if problemas:
    print(f"ATENCAO: {len(problemas)} problema(s): {', '.join(problemas)}")
else:
    print("TODOS OS 6 AJUSTES APLICADOS COM SUCESSO!")
print("=" * 60)
print()
print("RESUMO:")
print("  1. METABOLICA ganhou subclinicas (sindrome metab/disl/HAS/apneia)")
print("  2. Checkbox 'PERDI MAS GANHEI PESO' removido (calculo automatico)")
print("  3. ESPECIALISTAS: OUTRO reordenado como ultimo")
print("  4. COMPULSOES: OUTRA reordenada como ultima")
print("  5. MEDICAMENTOS: FERRO ORAL + FERRO INJETAVEL (EV/IM); pre-marca")
print("     do Calculator/PatientDashboard")
print("  6. EXAMES_BASE: +6 campos (Col Total, HDL, LDL, VLDL, LpA, ApoB)")
print()
print("Arquivos modificados:")
print(f"  - {OBA}")
print(f"  - {CALC}")
print(f"  - {DASH}")
print()
print("Proximo passo:")
print('  git add . && git commit -m "feat: ajustes finais OBAModal (6 items) - inputs concluidos" && git push origin main')
