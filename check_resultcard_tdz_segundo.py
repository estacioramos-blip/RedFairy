"""
check_resultcard_tdz_segundo.py

1. Verifica linhas 240-260 (onde estava o bug modIntestData) para confirmar fix
2. Verifica linhas 950-990 (novo TDZ potencial sexo/ferritina/satTransf)
"""
from pathlib import Path

RC = Path("src/components/ResultCard.jsx")
src = RC.read_text(encoding="utf-8")
linhas = src.splitlines()

print(f"ResultCard.jsx tem {len(linhas)} linhas")
print()

# Bloco 1: linhas 240-260 (fix anterior)
print("=" * 70)
print("BLOCO 1: linhas 240-260 (verificar fix do modIntestData)")
print("=" * 70)
for i in range(240, min(len(linhas), 261)):
    print(f"  {i+1:5d}: {linhas[i][:220]}")

# Bloco 2: linhas 950-990 (novo TDZ)
print()
print("=" * 70)
print("BLOCO 2: linhas 950-990 (sexo/ferritina/satTransf TDZ)")
print("=" * 70)
for i in range(950, min(len(linhas), 990)):
    print(f"  {i+1:5d}: {linhas[i][:220]}")

# Analise adicional: achar o inicio da funcao que contem essas variaveis
print()
print("=" * 70)
print("ANALISE: achar inicio da funcao que contem linhas 958-982")
print("=" * 70)
# Voltar da linha 958 procurando 'function' ou '=> {' ou 'const X = () =>' ou 'const X = (' 
for i in range(957, 800, -1):
    l = linhas[i].strip()
    if l.startswith('function ') or ' function(' in l or '=> {' in l or 'export function' in l:
        print(f"  Funcao comeca perto da linha {i+1}: {l[:180]}")
        break
