"""
diagnostico_matcher_gestante.py

Descobre por que entradas com 'gestante: true' estao casando em
pacientes NAO gestantes. Suspeita: matchesConditions() nao esta
verificando a flag gestante (so verifica bariatrica, vegetariano,
perda, alcoolista, transfundido).

Se confirmado, vamos adicionar a checagem no matcher.
"""

from pathlib import Path

ARQ = Path("src/engine/decisionEngine.js")
src = ARQ.read_text(encoding="utf-8")
linhas = src.splitlines()

# Mostrar matchesConditions inteira
print("=" * 70)
print("FUNCAO matchesConditions COMPLETA")
print("=" * 70)
for i, l in enumerate(linhas):
    if "function matchesConditions" in l or "matchesConditions =" in l or "const matchesConditions" in l:
        for j in range(i, min(i+40, len(linhas))):
            print(f"  {j+1:5d}: {linhas[j][:240]}")
            # para no primeiro '}' sozinho (fim da funcao)
            if j > i and linhas[j].rstrip() == "}":
                break
        break

# Tambem verificar as linhas onde flags sao testadas
print("\n\n" + "=" * 70)
print("LINHAS QUE VERIFICAM FLAGS DE CONTEXTO")
print("=" * 70)
for flag in ["bariatrica", "vegetariano", "vegetarian", "perda", "alcoolista", "transfundido", "gestante", "hipermenorreia"]:
    for i, l in enumerate(linhas):
        if f"c.{flag}" in l and "!==" in l and "undefined" in l:
            print(f"  [{flag}] linha {i+1}: {l.strip()[:220]}")

print("\n" + "=" * 70)
print("Cole no chat.")
print("=" * 70)
