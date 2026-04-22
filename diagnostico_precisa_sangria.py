"""
diagnostico_precisa_sangria.py

Ver todo o bloco 'precisaSangria' em ResultCard.jsx + contexto do
botao pra aplicar a mudanca com ancora exata.
"""

from pathlib import Path

ARQ = Path("src/components/ResultCard.jsx")
linhas = ARQ.read_text(encoding="utf-8").splitlines()

print("=" * 70)
print("LINHAS 940-1060 do ResultCard.jsx (bloco precisaSangria + botao)")
print("=" * 70)
for i in range(940, min(1060, len(linhas))):
    print(f"  {i+1:5d}: {linhas[i][:260]}")

# Ver tambem onde 'ferritina', 'satTransf', 'hbAtual', 'sexo' sao declarados (no resultCard)
print("\n\n" + "=" * 70)
print("VARIAVEIS ferritina, satTransf, hbAtual, sexo, isPolicitemiaVera (consts no componente)")
print("=" * 70)
for i, l in enumerate(linhas):
    if any(f"const {n} =" in l for n in ["ferritina", "satTransf", "hbAtual", "sexo", "isPolicitemiaVera"]):
        print(f"  linha {i+1}: {l.strip()[:240]}")

print("\n" + "=" * 70)
print("Cole no chat.")
print("=" * 70)
