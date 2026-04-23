"""
diagnostico_estruturas_complementar.py

Complementa o anterior. Objetivos:
  1. Ver dadosAnamnese completo (o que REALMENTE vai para oba_anamnese)
  2. Localizar tabela de perfis/usuarios com data_nascimento
  3. Ver AuthPage.jsx estrutura de signup (para adicionar CEP)
  4. Ver calcularIdade no PatientDashboard (para reuso)
"""

from pathlib import Path
import re

# ═════════════════════════════════════════════════════════════════════
# 1. dadosAnamnese no OBAModal (o que realmente se persiste)
# ═════════════════════════════════════════════════════════════════════
print("=" * 70)
print("1. dadosAnamnese NO OBAModal (payload completo do insert)")
print("=" * 70)
OBA = Path("src/components/OBAModal.jsx")
if OBA.exists():
    src = OBA.read_text(encoding="utf-8")
    linhas = src.splitlines()

    # Localizar 'const dadosAnamnese = {' e mostrar ate fechar
    for i, l in enumerate(linhas):
        if "dadosAnamnese" in l and ("=" in l or "{" in l):
            # Mostrar 45 linhas
            for j in range(i, min(len(linhas), i + 50)):
                print(f"  {j+1:5d}: {linhas[j][:260]}")
                if j > i + 3 and linhas[j].strip() == "}":
                    break
            print()

# ═════════════════════════════════════════════════════════════════════
# 2. Tabela 'perfis' ou 'profiles' — procurar em TODO o src
# ═════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("2. TABELAS relacionadas a PERFIL/USUARIO no codigo")
print("=" * 70)
achados_tabelas = {}
for path in Path("src").rglob("*.jsx"):
    if not path.exists():
        continue
    s = path.read_text(encoding="utf-8")
    # Buscar qualquer .from('NOME')
    for m in re.finditer(r"\.from\(['\"](\w+)['\"]\)", s):
        tabela = m.group(1)
        achados_tabelas.setdefault(tabela, set()).add(str(path))

for path in Path("src").rglob("*.js"):
    if not path.exists():
        continue
    s = path.read_text(encoding="utf-8")
    for m in re.finditer(r"\.from\(['\"](\w+)['\"]\)", s):
        tabela = m.group(1)
        achados_tabelas.setdefault(tabela, set()).add(str(path))

print("\n  TABELAS SUPABASE USADAS NO FRONTEND:")
for tabela, arquivos in sorted(achados_tabelas.items()):
    print(f"    {tabela}: em {len(arquivos)} arquivo(s)")
    for a in arquivos:
        print(f"      - {a}")

# ═════════════════════════════════════════════════════════════════════
# 3. Estrutura do AuthPage (signup + campos)
# ═════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print("3. AuthPage.jsx — estrutura do signUp")
print("=" * 70)
AUTH = Path("src/components/AuthPage.jsx")
if AUTH.exists():
    src = AUTH.read_text(encoding="utf-8")
    linhas = src.splitlines()
    total = len(linhas)
    print(f"  Total de linhas: {total}")

    # Mostrar as linhas em torno de signUp (linha 173)
    for i, l in enumerate(linhas):
        if "signUp" in l:
            ini = max(0, i-5)
            fim = min(total, i+25)
            print(f"\n  --- linha {i+1} ---")
            for j in range(ini, fim):
                marca = ">>" if j == i else "  "
                print(f"  {marca} {j+1:5d}: {linhas[j][:240]}")
            break

    # Tambem procurar state de cadastro
    print("\n  useState do form de cadastro:")
    for i, l in enumerate(linhas):
        if "useState" in l and ("nome" in l.lower() or "form" in l.lower() or "cadastro" in l.lower()):
            print(f"    linha {i+1}: {l.strip()[:200]}")

# ═════════════════════════════════════════════════════════════════════
# 4. Funcao calcularIdade no PatientDashboard
# ═════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print("4. calcularIdade no PatientDashboard")
print("=" * 70)
DASH = Path("src/components/PatientDashboard.jsx")
if DASH.exists():
    linhas = DASH.read_text(encoding="utf-8").splitlines()
    for i, l in enumerate(linhas):
        if "function calcularIdade" in l:
            fim = min(len(linhas), i + 20)
            for j in range(i, fim):
                print(f"  {j+1:5d}: {linhas[j][:240]}")
                if j > i + 2 and linhas[j].strip() == "}":
                    break
            break

# Tambem olhar como profile.data_nascimento eh usado
print("\n  Contexto de 'profile.data_nascimento':")
if DASH.exists():
    linhas = DASH.read_text(encoding="utf-8").splitlines()
    for i, l in enumerate(linhas):
        if "data_nascimento" in l:
            print(f"    linha {i+1}: {l.strip()[:240]}")

print("\n" + "=" * 70)
print("Cole TUDO no chat.")
print("=" * 70)
