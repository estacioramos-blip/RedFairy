"""
diagnostico_oba_outputs.py

Revisao critica do OBAModal — PARTE 2: mapa dos OUTPUTS.

  1. Nome exato da tabela Supabase onde o form e salvo
  2. Payload efetivo do insert
  3. Arquivo obaEngine.js: quais funcoes existem, o que retorna
  4. ResultCard.jsx: como os dados do OBA sao renderizados (OBASection)
"""

from pathlib import Path
import re
import sys

# ═══════════════════════════════════════════════════════════════════════
# 1. Achar onde o supabase.from eh chamado no OBAModal
# ═══════════════════════════════════════════════════════════════════════
ARQ = Path("src/components/OBAModal.jsx")
if not ARQ.exists():
    print(f"ERRO: {ARQ} nao existe."); sys.exit(1)
src = ARQ.read_text(encoding="utf-8")
linhas = src.splitlines()

print("=" * 70)
print("1. CHAMADAS AO SUPABASE NO OBAModal")
print("=" * 70)
for i, l in enumerate(linhas):
    if "supabase" in l.lower() and ("from(" in l or ".insert" in l or ".upsert" in l or ".update" in l):
        ini = max(0, i-1)
        fim = min(len(linhas), i+3)
        print(f"\n  --- linha {i+1} ---")
        for j in range(ini, fim):
            marca = ">>" if j == i else "  "
            print(f"  {marca} {j+1:5d}: {linhas[j][:240]}")

# Achar a funcao 'salvarExames' ou 'pularExames' que deve ter o insert completo
print("\n\n" + "=" * 70)
print("2. FUNCAO DE SALVAR/INSERIR (procurando o payload completo)")
print("=" * 70)
for nome_fn in ["salvarExames", "salvar", "pularExames", "handleSalvar", "handleConcluir", "salvarAnamnese"]:
    for i, l in enumerate(linhas):
        if (f"function {nome_fn}" in l or f"const {nome_fn}" in l) and "(" in l:
            # Mostrar 30 linhas da funcao
            print(f"\n--- {nome_fn} (linha {i+1}) ---")
            fim = min(len(linhas), i + 40)
            for j in range(i, fim):
                print(f"  {j+1:5d}: {linhas[j][:240]}")
                # parar no fim da funcao (linha so com '}')
                if j > i and linhas[j].strip() == "}":
                    break
            break

# ═══════════════════════════════════════════════════════════════════════
# 3. Conteudo completo do obaEngine.js
# ═══════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print("3. obaEngine.js — funcoes e estrutura")
print("=" * 70)
ENG = Path("src/engine/obaEngine.js")
if ENG.exists():
    eng_src = ENG.read_text(encoding="utf-8")
    eng_linhas = eng_src.splitlines()
    print(f"  Total de linhas: {len(eng_linhas)}")
    print()

    # Listar todas as funcoes/exports
    for i, l in enumerate(eng_linhas):
        if l.startswith("export ") or l.startswith("function ") or "const " in l and "=" in l and "(" in l:
            if "function" in l or "=>" in l:
                print(f"  {i+1:5d}: {l.strip()[:240]}")

    # Olhar o corpo inteiro se for pequeno
    if len(eng_linhas) < 500:
        print("\n  --- CONTEUDO COMPLETO ---")
        for i, l in enumerate(eng_linhas):
            print(f"  {i+1:5d}: {l[:240]}")
else:
    print("  obaEngine.js nao existe!")

# ═══════════════════════════════════════════════════════════════════════
# 4. OBASection no ResultCard — como os dados OBA sao renderizados
# ═══════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print("4. ResultCard — funcao OBASection (renderizacao)")
print("=" * 70)
RC = Path("src/components/ResultCard.jsx")
if RC.exists():
    rc_src = RC.read_text(encoding="utf-8")
    rc_linhas = rc_src.splitlines()

    # Achar funcao OBASection
    for i, l in enumerate(rc_linhas):
        if "function OBASection" in l:
            print(f"  OBASection comeca na linha {i+1}")
            # Mostrar 100 linhas
            for j in range(i, min(len(rc_linhas), i+110)):
                print(f"  {j+1:5d}: {rc_linhas[j][:240]}")
                # parar quando encontrar funcao seguinte
                if j > i + 5 and rc_linhas[j].startswith("function "):
                    break
            break

# ═══════════════════════════════════════════════════════════════════════
# 5. Arquivos que importam obaEngine (quem usa as funcoes)
# ═══════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print("5. QUEM USA obaEngine (importacoes)")
print("=" * 70)
for path in Path("src").rglob("*.jsx"):
    if path.exists():
        s = path.read_text(encoding="utf-8")
        if "obaEngine" in s:
            # Mostrar a linha do import
            for i, l in enumerate(s.splitlines()):
                if "obaEngine" in l and "import" in l:
                    print(f"  {path}: linha {i+1}: {l.strip()[:200]}")
for path in Path("src").rglob("*.js"):
    if path.exists():
        s = path.read_text(encoding="utf-8")
        if "obaEngine" in s:
            for i, l in enumerate(s.splitlines()):
                if "obaEngine" in l and "import" in l:
                    print(f"  {path}: linha {i+1}: {l.strip()[:200]}")

print("\n" + "=" * 70)
print("Cole TUDO no chat.")
print("=" * 70)
