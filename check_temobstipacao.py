"""
check_temObstipacao_remanescente.py

Verifica onde esta a ocorrencia remanescente de 'temObstipacao '
no ResultCard.jsx.
"""
from pathlib import Path
import re

RC = Path("src/components/ResultCard.jsx")
src = RC.read_text(encoding="utf-8")
linhas = src.splitlines()

print("=" * 70)
print("Ocorrencias de 'temObstipacao' (com e sem espaco) no ResultCard.jsx")
print("=" * 70)

for i, l in enumerate(linhas):
    if "temObstipacao" in l:
        print(f"  Linha {i+1}: {l}")
