# -*- coding: utf-8 -*-
"""
check_gestante_matching.py

Verifica:
  1. Como decisionEngine valida o flag 'gestante'
  2. Quais entradas femaleMatrix usam gestante: true
  3. Quais usam gestante: false
  Para garantir que a nova entrada ID 116 vai funcionar.
"""
from pathlib import Path
import re

DE = Path("src/engine/decisionEngine.js")
FEMALE = Path("src/engine/femaleMatrix.js")

print("=" * 70)
print("1. decisionEngine.js - como matcheia 'gestante'")
print("=" * 70)
de_src = DE.read_text(encoding="utf-8")
de_linhas = de_src.splitlines()

# Procurar referencias a 'gestante' no decisionEngine
for i, l in enumerate(de_linhas):
    if "gestante" in l.lower():
        ini = max(0, i-2)
        fim = min(len(de_linhas), i+3)
        print(f"\n--- linha {i+1} ---")
        for j in range(ini, fim):
            marca = ">>" if j == i else "  "
            print(f"  {marca} {j+1:5d}: {de_linhas[j][:200]}")

# ============================================================
print()
print("=" * 70)
print("2. femaleMatrix.js - entradas que usam 'gestante: true'")
print("=" * 70)
f_src = FEMALE.read_text(encoding="utf-8")
f_linhas = f_src.splitlines()

# Procurar entradas com gestante: true e capturar o ID
gestante_true_ids = []
for i, l in enumerate(f_linhas):
    if re.match(r"\s*gestante:\s*true", l):
        # Voltar e achar o id desta entrada
        for j in range(i, max(-1, i-30), -1):
            m = re.match(r"\s*id:\s*(\d+),", f_linhas[j])
            if m:
                gestante_true_ids.append((m.group(1), i+1, l.strip()))
                break

print(f"\nEntradas com gestante: true (total: {len(gestante_true_ids)}):")
for id_n, linha_n, txt in gestante_true_ids[:20]:
    print(f"  ID {id_n} (linha {linha_n}): {txt}")

# ============================================================
print()
print("=" * 70)
print("3. femaleMatrix.js - entradas que usam 'gestante: false'")
print("=" * 70)
gestante_false_ids = []
for i, l in enumerate(f_linhas):
    if re.match(r"\s*gestante:\s*false", l):
        for j in range(i, max(-1, i-30), -1):
            m = re.match(r"\s*id:\s*(\d+),", f_linhas[j])
            if m:
                gestante_false_ids.append((m.group(1), i+1, l.strip()))
                break

print(f"\nEntradas com gestante: false (total: {len(gestante_false_ids)}):")
for id_n, linha_n, txt in gestante_false_ids[:10]:
    print(f"  ID {id_n} (linha {linha_n}): {txt}")

# ============================================================
print()
print("=" * 70)
print("4. ID 115 atual (que vamos remover)")
print("=" * 70)
for i, l in enumerate(f_linhas):
    if re.match(r"\s*id:\s*115\s*,", l):
        ini = max(0, i-2)
        fim = min(len(f_linhas), i+22)
        for j in range(ini, fim):
            print(f"  {j+1:5d}: {f_linhas[j][:240]}")
        break
