"""
diagnostico_bugs_ferro_sideropenia.py

Bug 1: pre-marcacao de ferro nao funciona em Modo Medico.
  - Nome exato dos campos no state do Calculator (ferroOral vs ferro_oral?)
  - Valor exato da prop dadosRedFairy no Calculator
  - useEffect no OBAModal

Bug 2: sideropenia incipiente em homem bariatrico nao reconhecida.
  - Caso: M 55a, Hb 13, Ferr 15, VCM 80, RDW 16, Sat 17, bariatrico
  - Listar entradas matriciais masculinas para Hb 13 / Ferr baixa
  - Ver se ha gap matricial ou se o calculo cai em entrada generica
"""

from pathlib import Path
import re
import sys

# ═════════════════════════════════════════════════════════════════════
# BUG 1a — Campos de ferro no Calculator
# ═════════════════════════════════════════════════════════════════════
CALC = Path("src/components/Calculator.jsx")
if not CALC.exists():
    print(f"ERRO: {CALC} nao existe."); sys.exit(1)

src = CALC.read_text(encoding="utf-8")
linhas = src.splitlines()

print("=" * 70)
print("BUG 1a — CAMPOS DE FERRO NO STATE DO CALCULATOR")
print("=" * 70)

# Procurar pelo state inicial de inputs
for i, l in enumerate(linhas):
    if "useState(" in l and "sexo" in l.lower() and "{" in l:
        # Mostrar ate fechar
        fim = min(len(linhas), i + 20)
        print(f"\n  State inicial na linha {i+1}:")
        for j in range(i, fim):
            print(f"  {j+1:5d}: {linhas[j][:240]}")
            if "})" in linhas[j] and j > i:
                break
        break

# Procurar ocorrencias de 'ferroOral' e 'ferro_oral' no Calculator
print("\n  OCORRENCIAS no Calculator:")
for termo in ["ferroOral", "ferro_oral", "ferro_injetavel", "ferroInjetavel"]:
    count = src.count(termo)
    print(f"    '{termo}': {count} ocorrencia(s)")

# ═════════════════════════════════════════════════════════════════════
# BUG 1b — Chamada <OBAModal com dadosRedFairy (atual)
# ═════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print("BUG 1b — PROP dadosRedFairy NO CALCULATOR (estado atual)")
print("=" * 70)
for i, l in enumerate(linhas):
    if "dadosRedFairy={{" in l:
        fim = min(len(linhas), i + 10)
        for j in range(i, fim):
            print(f"  {j+1:5d}: {linhas[j][:240]}")
            if "}}" in linhas[j] and j > i:
                break
        break

# ═════════════════════════════════════════════════════════════════════
# BUG 1c — useEffect no OBAModal
# ═════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print("BUG 1c — useEffect DE PRE-MARCACAO NO OBAModal")
print("=" * 70)
OBA = Path("src/components/OBAModal.jsx")
oba_src = OBA.read_text(encoding="utf-8")
oba_linhas = oba_src.splitlines()
for i, l in enumerate(oba_linhas):
    if "Pre-marca ferro" in l or "pre-marcar ferro" in l.lower():
        fim = min(len(oba_linhas), i + 15)
        for j in range(i, fim):
            print(f"  {j+1:5d}: {oba_linhas[j][:240]}")
            if "}, [dadosRedFairy])" in oba_linhas[j]:
                break
        break

# Verificar valor exato na lista MEDICAMENTOS
print("\n  VALOR EXATO na const MEDICAMENTOS (aspas corretas?):")
m = re.search(r"const MEDICAMENTOS\s*=\s*\[(.*?)\]", oba_src, re.DOTALL)
if m:
    for match_fe in re.finditer(r"'[^']*FERRO[^']*'", m.group(1)):
        print(f"    {match_fe.group(0)}")

# ═════════════════════════════════════════════════════════════════════
# BUG 2 — Entradas matriciais masculinas para sideropenia incipiente
# ═════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print("BUG 2 — ENTRADAS MATRICIAIS PARA CASO MASCULINO Hb 13 / Ferr 15 / Sat 17")
print("=" * 70)
MALE = Path("src/engine/maleMatrix.js")
if MALE.exists():
    m_src = MALE.read_text(encoding="utf-8")
    m_linhas = m_src.splitlines()
    print(f"  Total de linhas em maleMatrix: {len(m_linhas)}")

    # Listar entradas onde ferritina max <= 30 (carencia) — sao as relevantes
    # Estrutura tipica: { id, sexo, hb: [min,max], ferritina: [min,max], vcm: [min,max], rdw: [min,max], sat: [min,max], flags, label, ... }
    # Vamos procurar entradas com label contendo SIDEROPENIA ou CARENCIA
    palavras_chave = ["SIDEROPENIA", "CARÊNCIA", "CARENCIA", "FERROPRIVA", "DEFICI"]
    print("\n  ENTRADAS COM PALAVRA-CHAVE DE SIDEROPENIA:")
    for i, l in enumerate(m_linhas):
        for termo in palavras_chave:
            if termo in l.upper():
                # Mostrar 5 linhas de contexto
                ini = max(0, i-3)
                fim = min(len(m_linhas), i+6)
                print(f"\n    --- linha {i+1} (termo: {termo}) ---")
                for j in range(ini, fim):
                    marca = ">>" if j == i else "  "
                    print(f"    {marca} {j+1:5d}: {m_linhas[j][:220]}")
                break  # nao imprimir varias vezes para a mesma linha

# Tambem ver o decisionEngine para entender o matching
print("\n\n" + "=" * 70)
print("BUG 2 — COMO decisionEngine FAZ O MATCH")
print("=" * 70)
DE = Path("src/engine/decisionEngine.js")
if DE.exists():
    de_src = DE.read_text(encoding="utf-8")
    de_linhas = de_src.splitlines()
    # Mostrar primeiras 60 linhas (onde ta a logica de matching)
    print(f"  Total de linhas em decisionEngine: {len(de_linhas)}")
    # Ver funcao de matching principal
    for i, l in enumerate(de_linhas):
        if ("export function" in l or "function " in l) and ("aval" in l.lower() or "match" in l.lower() or "decis" in l.lower()):
            print(f"  linha {i+1}: {l.strip()[:220]}")

print("\n" + "=" * 70)
print("Cole TUDO no chat.")
print("=" * 70)
