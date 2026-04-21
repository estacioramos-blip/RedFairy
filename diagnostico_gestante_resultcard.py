"""
diagnostico_gestante_resultcard.py

Verifica se 'gestante' esta disponivel como propriedade em
resultado._inputs, como ModalFerroEV recebe parametros, e se
precisa propagar a flag gestante atraves de props novas.
"""

from pathlib import Path

ARQ = Path("src/components/ResultCard.jsx")
src = ARQ.read_text(encoding="utf-8")
linhas = src.splitlines()

# 1. ModalFerroEV — assinatura (linha 54)
print("=" * 70)
print("1. ModalFerroEV - assinatura e primeiras linhas")
print("=" * 70)
for i, l in enumerate(linhas):
    if "function ModalFerroEV" in l or "const ModalFerroEV" in l:
        for j in range(i, min(i+10, len(linhas))):
            print(f"  {j+1:5d}: {linhas[j]}")
        break

# 2. Onde ModalFerroEV eh usado/renderizado
print("\n\n" + "=" * 70)
print("2. Render/uso de <ModalFerroEV ...>")
print("=" * 70)
for i, l in enumerate(linhas):
    if "<ModalFerroEV" in l:
        ini = max(0, i-1)
        fim = min(len(linhas), i+8)
        print(f"\n--- linha {i+1} ---")
        for j in range(ini, fim):
            marca = ">>" if j == i else "  "
            print(f"  {marca} {j+1:5d}: {linhas[j][:240]}")

# 3. Todas as propriedades de resultado._inputs
print("\n\n" + "=" * 70)
print("3. Propriedades de resultado._inputs (e variaveis locais relacionadas)")
print("=" * 70)
for i, l in enumerate(linhas):
    if "_inputs" in l:
        print(f"  {i+1:5d}: {l.strip()[:220]}")

# 4. Busca pela palavra 'gestante' em ResultCard
print("\n\n" + "=" * 70)
print("4. Ocorrencias de 'gestante' em ResultCard.jsx")
print("=" * 70)
for i, l in enumerate(linhas):
    if "gestante" in l.lower():
        print(f"  {i+1:5d}: {l.strip()[:220]}")

# 5. Como resultado eh construido em decisionEngine (para saber se _inputs contem gestante)
print("\n\n" + "=" * 70)
print("5. decisionEngine.js - como '_inputs' eh montado na saida")
print("=" * 70)
DE = Path("src/engine/decisionEngine.js")
if DE.exists():
    de_linhas = DE.read_text(encoding="utf-8").splitlines()
    for i, l in enumerate(de_linhas):
        if "_inputs" in l:
            ini = max(0, i-2)
            fim = min(len(de_linhas), i+5)
            print(f"\n--- decisionEngine linha {i+1} ---")
            for j in range(ini, fim):
                marca = ">>" if j == i else "  "
                print(f"  {marca} {j+1:5d}: {de_linhas[j][:220]}")
            break

print("\n" + "=" * 70)
print("Cole TUDO no chat.")
print("=" * 70)
