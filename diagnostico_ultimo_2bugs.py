"""
diagnostico_ultimo_2bugs.py

Diagnostico super-focado:
  1. Flags completas da entrada ID 85 (ANEMIA FERROPRIVA INCIPIENTE)
     e vizinhas, para ver se ha entrada especifica para bariatrico
     masculino com sideropenia incipiente.
  2. Confirma nome exato do campo de ferro no Calculator.
"""
from pathlib import Path
import re

# ═════════════════════════════════════════════════════════════════════
# 1. ID 85 completa + entradas proximas no maleMatrix
# ═════════════════════════════════════════════════════════════════════
MALE = Path("src/engine/maleMatrix.js")
src = MALE.read_text(encoding="utf-8")
linhas = src.splitlines()

print("=" * 70)
print("BUG 2 — ENTRADA ID 85 COMPLETA + entradas proximas")
print("=" * 70)

# Achar e mostrar ID 85 inteiro (100 linhas a partir de 'id: 85')
for i, l in enumerate(linhas):
    if re.search(r"^\s*id:\s*85\s*,", l):
        # 60 linhas a partir daqui
        for j in range(max(0, i-3), min(len(linhas), i+60)):
            print(f"  {j+1:5d}: {linhas[j][:260]}")
        break

# Tambem mostrar vizinhas (ID 84, 85, 86, 87, 88 se existirem)
print("\n\n" + "=" * 70)
print("MAPA DE IDs PROXIMOS a 85 com conditions (resumo)")
print("=" * 70)
for i, l in enumerate(linhas):
    m = re.match(r"^\s*id:\s*(\d+)\s*,", l)
    if m:
        id_num = int(m.group(1))
        if 75 <= id_num <= 95:
            # Mostrar id, label, ferritina, hb, vcm, bariatrica
            bloco = {}
            for k in range(i, min(len(linhas), i+25)):
                for chave in ["id:", "label:", "ferritina:", "hemoglobina:", "vcm:", "bariatrica:", "vegetariano:", "perda:", "aspirina:", "transfundido:", "alcoolista:"]:
                    if chave in linhas[k]:
                        bloco[chave] = linhas[k].strip()[:180]
            print(f"\n  ID {id_num}:")
            for chave in ["label:", "ferritina:", "hemoglobina:", "vcm:", "bariatrica:", "vegetariano:", "perda:", "aspirina:"]:
                if chave in bloco:
                    print(f"    {bloco[chave]}")

# ═════════════════════════════════════════════════════════════════════
# 2. Nome exato do campo de ferro no Calculator
# ═════════════════════════════════════════════════════════════════════
CALC = Path("src/components/Calculator.jsx")
calc_src = CALC.read_text(encoding="utf-8")
calc_linhas = calc_src.splitlines()

print("\n\n" + "=" * 70)
print("BUG 1 — CAMPO DE FERRO NO STATE DO CALCULATOR")
print("=" * 70)

# State inicial de inputs
for i, l in enumerate(calc_linhas):
    if "useState(" in l and "sexo" in l.lower() and "{" in l:
        for j in range(i, min(len(calc_linhas), i+30)):
            print(f"  {j+1:5d}: {calc_linhas[j][:240]}")
            if "})" in calc_linhas[j] and j > i:
                break
        break

# Ocorrencias
print("\n  OCORRENCIAS:")
for termo in ["ferroOral", "ferro_oral", "ferroInjetavel", "ferro_injetavel"]:
    count = calc_src.count(termo)
    print(f"    '{termo}': {count}x")

# Bloco do dadosRedFairy atual
print("\n  dadosRedFairy NO CALCULATOR ATUAL:")
for i, l in enumerate(calc_linhas):
    if "dadosRedFairy={{" in l:
        for j in range(i, min(len(calc_linhas), i+12)):
            print(f"  {j+1:5d}: {calc_linhas[j][:240]}")
            if "}}" in calc_linhas[j] and j > i:
                break
        break

# ═════════════════════════════════════════════════════════════════════
# 3. useEffect do OBAModal — mostrar de novo, pode ter bug na chave
# ═════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print("useEffect DO OBAModal (verificar logica)")
print("=" * 70)
OBA = Path("src/components/OBAModal.jsx")
oba_src = OBA.read_text(encoding="utf-8")
oba_linhas = oba_src.splitlines()
for i, l in enumerate(oba_linhas):
    if "Pre-marca ferro" in l or ("useEffect" in l and i > 200):
        for j in range(max(0, i-1), min(len(oba_linhas), i+18)):
            print(f"  {j+1:5d}: {oba_linhas[j][:240]}")
            if "}, [dadosRedFairy])" in oba_linhas[j]:
                break
        break

# Tambem ver se 'FERRO INJETÁVEL (EV/IM)' existe exatamente assim em MEDICAMENTOS
print("\n\n  VALOR EXATO de FERRO em MEDICAMENTOS:")
m = re.search(r"const MEDICAMENTOS\s*=\s*\[(.*?)\]", oba_src, re.DOTALL)
if m:
    for match_fe in re.finditer(r"'[^']*FERRO[^']*'", m.group(1)):
        valor = match_fe.group(0)
        print(f"    {valor}")
        # Verificar bytes dos acentos
        print(f"    (bytes: {valor.encode('utf-8')[:80]})")

print("\n" + "=" * 70)
print("Cole no chat.")
print("=" * 70)
