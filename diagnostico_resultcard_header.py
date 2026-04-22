"""
diagnostico_resultcard_header.py

Localiza o cabecalho do card de diagnostico em ResultCard.jsx
(onde aparece o titulo 'DIAGNOSTICO' e o label colorido).
"""

from pathlib import Path

ARQ = Path("src/components/ResultCard.jsx")
src = ARQ.read_text(encoding="utf-8")
linhas = src.splitlines()

print("=" * 70)
print("BUSCA POR CABECALHOS RELEVANTES")
print("=" * 70)

# Buscar elementos que provavelmente sao o cabeçalho
for termo in [
    'DIAGNÓSTICO',
    "label className",
    "resultado.label",
    "scheme.badge",
    "Copiar",
    "uppercase tracking",
]:
    print(f"\n>>> '{termo}'")
    encontrados = 0
    for i, l in enumerate(linhas):
        if termo in l:
            encontrados += 1
            if encontrados > 3:
                break
            ini = max(0, i - 1)
            fim = min(len(linhas), i + 6)
            print(f"\n  --- linha {i+1} ---")
            for j in range(ini, fim):
                marca = ">>" if j == i else "  "
                trecho = linhas[j][:240]
                print(f"  {marca} {j+1:5d}: {trecho}")

# Tambem ver como _inputs eh acessado no JSX
print("\n\n" + "=" * 70)
print("USO DE _inputs NO JSX (linhas 480-520, parte alta do componente)")
print("=" * 70)
for j in range(485, min(525, len(linhas))):
    print(f"  {j+1:5d}: {linhas[j][:240]}")

print("\n" + "=" * 70)
print("Cole TUDO no chat.")
print("=" * 70)
