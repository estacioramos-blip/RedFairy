"""
diagnostico_tabelas_supabase.py

Mapa das tabelas Supabase a partir dos INSERTs/UPDATEs no codigo.
Objetivo: antes de criar SQL para novas colunas, ver o que ja existe.

Tabelas alvo:
  - oba_anamnese (anamnese bariatrica)
  - avaliacoes (hemograma principal)
  - Outras (usuarios/perfis, se houver)
"""

from pathlib import Path
import re

def extrair_colunas(path: Path, tabela: str):
    """
    Extrai todas as colunas que aparecem em INSERT/UPDATE/UPSERT
    de uma dada tabela.
    """
    if not path.exists():
        return set()
    src = path.read_text(encoding="utf-8")
    colunas = set()

    # Padrao 1: supabase.from('tabela').insert({col: val, col2: val2, ...})
    # ou .upsert / .update
    # Vamos achar todos os blocos apos 'from('tabela')'
    pattern = re.compile(
        r"from\(['\"]" + re.escape(tabela) + r"['\"]\)\s*\.(insert|upsert|update)\(",
        re.IGNORECASE
    )

    for m in pattern.finditer(src):
        # Pegar bloco ate o ')' matching
        start = m.end()
        depth = 1
        i = start
        while i < len(src) and depth > 0:
            if src[i] == '(':
                depth += 1
            elif src[i] == ')':
                depth -= 1
            i += 1
        bloco = src[start:i]
        # Extrair nomes de chaves (padrao 'nome:' ou 'nome_col:')
        for km in re.finditer(r'(\w+)\s*:', bloco):
            colunas.add(km.group(1))

    # Padrao 2: build objects que claramente sao dessa tabela
    # (ex: dadosAnamnese, dadosAvaliacao com nomes contendo a tabela)

    return colunas

# Arquivos relevantes
arquivos = [
    Path("src/components/OBAModal.jsx"),
    Path("src/components/Calculator.jsx"),
    Path("src/components/PatientDashboard.jsx"),
]

# ═════════════════════════════════════════════════════════════════════
# 1. TABELA oba_anamnese
# ═════════════════════════════════════════════════════════════════════
print("=" * 70)
print("1. TABELA: oba_anamnese")
print("=" * 70)
todas_colunas = set()
for path in arquivos:
    cols = extrair_colunas(path, "oba_anamnese")
    if cols:
        print(f"\n  De {path}: {len(cols)} colunas")
        todas_colunas |= cols

print(f"\n  TOTAL (union): {len(todas_colunas)} colunas")
for c in sorted(todas_colunas):
    print(f"    - {c}")

# ═════════════════════════════════════════════════════════════════════
# 2. TABELA avaliacoes
# ═════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print("2. TABELA: avaliacoes")
print("=" * 70)
todas_colunas_av = set()
for path in arquivos:
    cols = extrair_colunas(path, "avaliacoes")
    if cols:
        print(f"\n  De {path}: {len(cols)} colunas")
        todas_colunas_av |= cols

print(f"\n  TOTAL: {len(todas_colunas_av)} colunas")
for c in sorted(todas_colunas_av):
    print(f"    - {c}")

# ═════════════════════════════════════════════════════════════════════
# 3. Onde fica o CADASTRO do paciente (Grupo C pede CEP)
# ═════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print("3. CADASTRO DO PACIENTE — onde esta e qual tabela usa")
print("=" * 70)
# Procurar termos relacionados a cadastro
for path in list(arquivos) + list(Path("src").rglob("*.jsx")):
    if not path.exists():
        continue
    src = path.read_text(encoding="utf-8")
    if ("cadastro" in src.lower() or "signup" in src.lower() or "signUp" in src):
        if "supabase" in src or "auth." in src:
            print(f"\n  POSSIVELMENTE EM: {path}")
            # Mostrar termo relevante
            for i, l in enumerate(src.splitlines()):
                if ("supabase.auth" in l or "auth.signUp" in l or
                    "insert({" in l and "cpf" in l.lower()):
                    print(f"    linha {i+1}: {l.strip()[:200]}")

# Tambem buscar um componente de Cadastro/Signup/Register
print("\n\n  ARQUIVOS COM NOMES RELEVANTES:")
for path in list(Path("src").rglob("*.jsx")) + list(Path("src").rglob("*.js")):
    nome = path.name.lower()
    if any(t in nome for t in ["cadastro", "signup", "register", "perfil", "profile"]):
        print(f"    - {path}")

# ═════════════════════════════════════════════════════════════════════
# 4. Verificar se existe modo paciente vs medico para ver contexto
# ═════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print("4. CAMPO 'data_nascimento' ou 'dataNasc' ja existe?")
print("=" * 70)
for path in arquivos:
    if not path.exists():
        continue
    src = path.read_text(encoding="utf-8")
    for termo in ["data_nascimento", "dataNasc", "dataNascimento", "birth"]:
        count = src.count(termo)
        if count > 0:
            print(f"  {path}: '{termo}' aparece {count} vez(es)")
            # Mostrar primeira ocorrencia
            for i, l in enumerate(src.splitlines()):
                if termo in l:
                    print(f"    linha {i+1}: {l.strip()[:200]}")
                    break

print("\n" + "=" * 70)
print("Cole TUDO no chat.")
print("=" * 70)
