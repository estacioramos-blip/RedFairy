"""
diagnostico_funcao_acompanhamento.py

Investiga se buildModAcompanhamento existe (apenas com grep mais abrangente).
Tambem procura variantes: buildAcompanhamento, modAcompanhamento, etc.
"""

from pathlib import Path
import re
import sys

ENG = Path("src/engine/obaEngine.js")
src = ENG.read_text(encoding="utf-8")
linhas = src.splitlines()

print("=" * 70)
print("BUSCA POR TODAS AS DECLARACOES DE FUNCAO NO ENGINE")
print("=" * 70)
# Listar todas as declaracoes 'function XXX('
for i, l in enumerate(linhas):
    m = re.match(r'^\s*(?:export\s+)?function (\w+)\s*\(', l)
    if m:
        nome = m.group(1)
        print(f"  linha {i+1:5d}: function {nome}")

# Tambem procurar 'const' com function
print("\n\n" + "=" * 70)
print("BUSCA POR 'const NOME = function' ou arrow functions no engine")
print("=" * 70)
for i, l in enumerate(linhas):
    m = re.match(r'^\s*const (\w+)\s*=\s*(?:function|\()', l)
    if m:
        nome = m.group(1)
        print(f"  linha {i+1:5d}: const {nome} = ...")

# Verificar se buildModAcompanhamento eh chamado mas nao definido
print("\n\n" + "=" * 70)
print("'buildModAcompanhamento' NO CODIGO")
print("=" * 70)
for i, l in enumerate(linhas):
    if "buildModAcompanhamento" in l:
        ini = max(0, i-1)
        fim = min(len(linhas), i+3)
        print(f"\n--- linha {i+1} ---")
        for j in range(ini, fim):
            marca = ">>" if j == i else "  "
            print(f"  {marca} {j+1:5d}: {linhas[j][:240]}")

# Verificar 'buildModLeucos' que tambem estava na lista
print("\n\n" + "=" * 70)
print("'buildModLeucos' NO CODIGO (citada na linha 164 da avaliarOBA)")
print("=" * 70)
for i, l in enumerate(linhas):
    if "buildModLeucos" in l:
        ini = max(0, i-1)
        fim = min(len(linhas), i+3)
        print(f"\n--- linha {i+1} ---")
        for j in range(ini, fim):
            marca = ">>" if j == i else "  "
            print(f"  {marca} {j+1:5d}: {linhas[j][:240]}")

print("\n" + "=" * 70)
print("Cole no chat.")
print("=" * 70)
