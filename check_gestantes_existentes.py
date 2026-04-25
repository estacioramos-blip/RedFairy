# -*- coding: utf-8 -*-
"""
check_gestantes_existentes.py

Mostra os criterios completos das entradas gestacionais existentes
(IDs 110-114) para evitar sobreposicao com ID 116 nova.
"""
from pathlib import Path
import re

FEMALE = Path("src/engine/femaleMatrix.js")
src = FEMALE.read_text(encoding="utf-8")
linhas = src.splitlines()

print("=" * 70)
print("ENTRADAS GESTACIONAIS EXISTENTES (IDs 110-114)")
print("=" * 70)

for id_alvo in ["110", "111", "112", "113", "114"]:
    for i, l in enumerate(linhas):
        m = re.match(rf"\s*id:\s*{id_alvo}\s*,", l)
        if m:
            # Mostrar do { ate o ),
            ini = max(0, i - 2)
            # Achar o final do bloco (proxima ocorrencia de "},")
            fim = i
            for j in range(i + 5, min(len(linhas), i + 30)):
                if "diagnostico:" in linhas[j]:
                    fim = j
                    break
            print()
            print(f"--- ID {id_alvo} ---")
            for k in range(ini, fim + 1):
                print(f"  {k+1:5d}: {linhas[k][:240]}")
            break

# Tambem listar ID 115 atual para comparacao
print()
print("=" * 70)
print("ID 115 ATUAL (para comparacao)")
print("=" * 70)
for i, l in enumerate(linhas):
    if re.match(r"\s*id:\s*115\s*,", l):
        ini = max(0, i - 2)
        fim = i
        for j in range(i + 5, min(len(linhas), i + 30)):
            if "diagnostico:" in linhas[j]:
                fim = j
                break
        for k in range(ini, fim + 1):
            print(f"  {k+1:5d}: {linhas[k][:240]}")
        break
