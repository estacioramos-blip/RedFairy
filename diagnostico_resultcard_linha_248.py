"""
diagnostico_resultcard_linha_248.py

Le ResultCard.jsx em volta da linha 248 para identificar
a variavel TDZ.
"""
from pathlib import Path

RC = Path("src/components/ResultCard.jsx")
src = RC.read_text(encoding="utf-8")
linhas = src.splitlines()

print("=" * 70)
print(f"ResultCard.jsx ({len(linhas)} linhas total)")
print("=" * 70)
print()

# Mostrar contexto: linhas 220-280 (foco no 248)
inicio = 220
fim = 280
print(f"Contexto (linhas {inicio}-{fim}):")
print()
for i in range(max(0, inicio-1), min(len(linhas), fim)):
    marca = ">>> " if (i+1) == 248 else "    "
    print(f"{marca}{i+1:5d}: {linhas[i][:240]}")

print()
print("=" * 70)
print("Procurar declaracoes da variavel possivelmente envolvida")
print("=" * 70)

# A coluna 25 sugere que a variavel comeca aproximadamente nessa posicao
linha_248 = linhas[247] if len(linhas) > 247 else ""
print(f"\nLinha 248 completa: {linha_248!r}")
print(f"Coluna 25 chega em: ...{linha_248[20:60]}...")
