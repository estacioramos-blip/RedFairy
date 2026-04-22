"""
diagnostico_achados_paralelos.py

Mapeia a estrutura de achadosParalelos.js para ver:
  - Padrao dos achados existentes (1 a 8)
  - Como e construido o objeto de achado
  - Onde inserir o achado 9
  - Como 'inputs.ferro_injetavel' e propagado (ja fizemos a mudanca antes)
"""

from pathlib import Path
import sys

ARQ = Path("src/engine/achadosParalelos.js")
if not ARQ.exists():
    print(f"ERRO: {ARQ} nao existe."); sys.exit(1)

linhas = ARQ.read_text(encoding="utf-8").splitlines()

# 1. Primeiras 50 linhas (imports + declaracoes + inicio do algoritmo)
print("=" * 70)
print("LINHAS 1-50 (imports + declaracoes + vars iniciais)")
print("=" * 70)
for i in range(min(50, len(linhas))):
    print(f"  {i+1:5d}: {linhas[i][:240]}")

# 2. Ver todos os 'achados.push' ou 'achados.push({' (cada achado)
print("\n\n" + "=" * 70)
print("CADA ACHADO (procurando 'achados.push' ou 'push({')")
print("=" * 70)
for i, l in enumerate(linhas):
    if "push({" in l or "achados.push" in l:
        ini = max(0, i-1)
        fim = min(len(linhas), i+12)
        print(f"\n--- linha {i+1} ---")
        for j in range(ini, fim):
            marca = ">>" if j == i else "  "
            print(f"  {marca} {j+1:5d}: {linhas[j][:240]}")

# 3. Final do arquivo (como e retornado)
print("\n\n" + "=" * 70)
print("ULTIMAS 30 LINHAS (estrutura final)")
print("=" * 70)
total = len(linhas)
for i in range(max(0, total-30), total):
    print(f"  {i+1:5d}: {linhas[i][:240]}")

# 4. Ver se tem 'severity' / 'cor' / 'title' como padrao dos objetos
print("\n\n" + "=" * 70)
print("ESTRUTURA DE UM ACHADO (chaves tipicas)")
print("=" * 70)
src = ARQ.read_text(encoding="utf-8")
for chave in ["id:", "severity:", "cor:", "color:", "titulo:", "title:", "texto:", "nivel:", "importancia:"]:
    count = src.count(chave)
    print(f"  '{chave}': {count} ocorrencias")

print(f"\nTotal de linhas: {len(linhas)}")
print("\n" + "=" * 70)
print("Cole TUDO no chat.")
print("=" * 70)
