"""
diagnostico_p1_3_tipo_cirurgia.py

Investigacao P1.3: propagacao de tipo_cirurgia.

Queremos verificar:
  1. O form.tipo_cirurgia eh efetivamente enviado em dadosOBA?
  2. Quais valores ele pode ter (opcoes do select/radio)?
  3. Como normalizarCirurgia trata cada valor?
  4. Qual grauDisabsorcao cada cirurgia gera?
"""

from pathlib import Path
import re
import sys

# ═════════════════════════════════════════════════════════════════════
# 1. Como tipo_cirurgia eh coletado no OBAModal (UI)
# ═════════════════════════════════════════════════════════════════════
OBA = Path("src/components/OBAModal.jsx")
if not OBA.exists():
    print(f"ERRO: {OBA} nao existe."); sys.exit(1)

src = OBA.read_text(encoding="utf-8")
linhas = src.splitlines()

print("=" * 70)
print("1. COMO tipo_cirurgia EH COLETADO NO UI (OBAModal)")
print("=" * 70)
for i, l in enumerate(linhas):
    if "tipo_cirurgia" in l:
        ini = max(0, i-1)
        fim = min(len(linhas), i+4)
        print(f"\n--- linha {i+1} ---")
        for j in range(ini, fim):
            marca = ">>" if j == i else "  "
            print(f"  {marca} {j+1:5d}: {linhas[j][:240]}")

# ═════════════════════════════════════════════════════════════════════
# 2. Como tipo_cirurgia eh enviado a avaliarOBA (buildDadosOBA ou payload)
# ═════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print("2. buildDadosOBA / payload para engine")
print("=" * 70)
# Procurar funcao buildDadosOBA
m = re.search(r'function buildDadosOBA.*?\n(.*?)(?=\nfunction |\n\n  [a-z])', src, re.DOTALL)
if m:
    bloco = m.group(0)
    for i, l in enumerate(bloco.split('\n')[:50]):
        print(f"  {l[:240]}")
else:
    # Procurar buildDadosOBA de outra forma
    for i, l in enumerate(linhas):
        if "buildDadosOBA" in l and ("function" in l or "const" in l) and "=" in l:
            fim = min(len(linhas), i + 35)
            for j in range(i, fim):
                print(f"  {j+1:5d}: {linhas[j][:240]}")
                if j > i + 3 and linhas[j].strip() == "}":
                    break
            break

# ═════════════════════════════════════════════════════════════════════
# 3. Funcao normalizarCirurgia no engine
# ═════════════════════════════════════════════════════════════════════
ENG = Path("src/engine/obaEngine.js")
if not ENG.exists():
    print(f"ERRO: {ENG} nao existe."); sys.exit(1)

eng_src = ENG.read_text(encoding="utf-8")
eng_linhas = eng_src.splitlines()

print("\n\n" + "=" * 70)
print("3. FUNCAO normalizarCirurgia")
print("=" * 70)
for i, l in enumerate(eng_linhas):
    if "function normalizarCirurgia" in l:
        fim = min(len(eng_linhas), i + 40)
        for j in range(i, fim):
            print(f"  {j+1:5d}: {eng_linhas[j][:240]}")
            if j > i + 3 and eng_linhas[j].strip() == "}":
                break
        break

# ═════════════════════════════════════════════════════════════════════
# 4. Como grauDisabsorcao eh calculado (funcao calcDisabsorcao ou similar)
# ═════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print("4. COMO grauDisabsorcao EH CALCULADO")
print("=" * 70)
# Procurar onde 'disab' eh atribuido em avaliarOBA
for i, l in enumerate(eng_linhas):
    if "const disab" in l or "calcDisabsorcao" in l.lower() or "getDisab" in l.lower():
        ini = max(0, i-1)
        fim = min(len(eng_linhas), i+6)
        print(f"\n  --- linha {i+1} ---")
        for j in range(ini, fim):
            marca = ">>" if j == i else "  "
            print(f"  {marca} {j+1:5d}: {eng_linhas[j][:240]}")

# Tambem buscar definicao de funcao que retorna o grau
for i, l in enumerate(eng_linhas):
    if "function " in l and ("disab" in l.lower() or "grau" in l.lower()):
        fim = min(len(eng_linhas), i + 30)
        print(f"\n--- linha {i+1} (possivel definicao) ---")
        for j in range(i, fim):
            print(f"  {j+1:5d}: {eng_linhas[j][:240]}")
            if j > i + 3 and eng_linhas[j].strip() == "}":
                break
        break

print("\n" + "=" * 70)
print("Cole TUDO no chat.")
print("=" * 70)
