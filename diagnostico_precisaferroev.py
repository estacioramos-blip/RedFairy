"""
diagnostico_precisaferroev.py

Encontra onde 'precisaFerroEV' e 'precisaSangria' sao definidos
em ResultCard.jsx para saber a regra exata de disparo.
"""

from pathlib import Path

arq = Path("src/components/ResultCard.jsx")
src = arq.read_text(encoding="utf-8")
linhas = src.splitlines()

print("=" * 70)
print("TODAS AS OCORRENCIAS DE 'precisaFerroEV' e 'precisaSangria'")
print("=" * 70)
for termo in ["precisaFerroEV", "precisaSangria"]:
    print(f"\n>>> '{termo}':")
    for i, l in enumerate(linhas):
        if termo in l:
            ini = max(0, i-1)
            fim = min(len(linhas), i+3)
            print(f"\n  --- linha {i+1} ---")
            for j in range(ini, fim):
                marca = ">>" if j == i else "  "
                print(f"  {marca} {j+1:5d}: {linhas[j][:220]}")

# Tambem a funcao calcularFerroEV completa
print("\n\n" + "=" * 70)
print("FUNCAO calcularFerroEV COMPLETA")
print("=" * 70)
for i, l in enumerate(linhas):
    if "function calcularFerroEV" in l or "const calcularFerroEV" in l:
        for j in range(i, min(i+15, len(linhas))):
            print(f"  {j+1:5d}: {linhas[j]}")
        break

print("\n" + "=" * 70)
print("Cole no chat.")
print("=" * 70)
