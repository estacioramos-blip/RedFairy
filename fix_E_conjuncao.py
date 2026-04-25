# -*- coding: utf-8 -*-
"""
fix_E_conjuncao.py

Item 1: corrige '. É PROVAVELMENTE' para ' E PROVAVELMENTE'
nas matrizes (maleMatrix.js e femaleMatrix.js).

Estrategia conservadora:
  1. Lista todas ocorrencias do padrao com contexto
  2. Substitui apenas o padrao exato:
     'AVALIAÇÃO MÉDICA. É PROVAVELMENTE'
     -> 'AVALIAÇÃO MÉDICA E PROVAVELMENTE'
  3. Valida sintaxe antes/depois
"""
from pathlib import Path
import re
import sys

ARQUIVOS = [
    Path("src/engine/maleMatrix.js"),
    Path("src/engine/femaleMatrix.js"),
]


def validar(src, nome):
    erros = []
    abre_c = src.count("{")
    fecha_c = src.count("}")
    abre_b = src.count("[")
    fecha_b = src.count("]")
    if abre_c != fecha_c:
        erros.append(f"Chaves: {abre_c}/{fecha_c}")
    if abre_b != fecha_b:
        erros.append(f"Colchetes: {abre_b}/{fecha_b}")
    ids = re.findall(r"^\s*id:\s*(\d+)\s*,", src, re.MULTILINE)
    duplicados = set([x for x in ids if ids.count(x) > 1])
    if duplicados:
        erros.append(f"IDs duplicados: {duplicados}")
    if erros:
        return False, f"{nome}: " + "; ".join(erros)
    return True, f"{nome}: OK (IDs: {len(ids)}, chaves: {abre_c}, colchetes: {abre_b})"


# ============================================================
# FASE 1 - LISTAR ocorrencias do padrao
# ============================================================
print("=" * 70)
print("FASE 1: LISTAR OCORRENCIAS DE '. É PROVAVELMENTE'")
print("=" * 70)

# Padrao mais flexivel: '. É ' como inicio de frase
# Vamos ver todos contextos para confirmar antes
contextos_encontrados = []

for path in ARQUIVOS:
    if not path.exists():
        print(f"  AVISO: {path} nao existe.")
        continue

    src = path.read_text(encoding="utf-8")
    linhas = src.splitlines()

    for i, l in enumerate(linhas):
        # Procurar o padrao exato
        if "MÉDICA. É " in l:
            contextos_encontrados.append((path.name, i + 1, l.strip()))

print(f"\n  Encontradas {len(contextos_encontrados)} ocorrencias de 'MÉDICA. É ':")
for nome, lin, txt in contextos_encontrados[:30]:
    txt_curto = txt[:200]
    print(f"    {nome} linha {lin}:")
    print(f"      {txt_curto}")

if len(contextos_encontrados) > 30:
    print(f"    ... e mais {len(contextos_encontrados) - 30}")

# ============================================================
# FASE 2 - APLICAR substituicao
# ============================================================
print()
print("=" * 70)
print("FASE 2: APLICAR SUBSTITUICAO")
print("=" * 70)

# Padroes a substituir (na ordem):
# 1. 'AVALIAÇÃO MÉDICA. É PROVAVELMENTE' -> 'AVALIAÇÃO MÉDICA E PROVAVELMENTE'
# Mais conservador: so esse padrao especifico
substituicoes = [
    ("AVALIAÇÃO MÉDICA. É PROVAVELMENTE", "AVALIAÇÃO MÉDICA E PROVAVELMENTE"),
    # Variantes possiveis:
    ("MÉDICA. É PROVAVELMENTE", "MÉDICA E PROVAVELMENTE"),
]

total_substituicoes = 0

for path in ARQUIVOS:
    if not path.exists():
        continue

    src = path.read_text(encoding="utf-8")

    # Validar antes
    ok, msg = validar(src, f"{path.name} ANTES")
    print(f"\n  {msg}")
    if not ok:
        print(f"  ABORT: {path.name} invalido antes.")
        continue

    mudancas_arquivo = 0
    for antigo, novo in substituicoes:
        count = src.count(antigo)
        if count > 0:
            src = src.replace(antigo, novo)
            mudancas_arquivo += count
            print(f"    {antigo!r} -> {novo!r} ({count}x)")

    if mudancas_arquivo > 0:
        # Validar depois
        ok, msg = validar(src, f"{path.name} APOS")
        print(f"  {msg}")
        if not ok:
            print(f"  ABORT: nao salvar {path.name}.")
            continue
        path.write_text(src, encoding="utf-8")
        print(f"  OK: {mudancas_arquivo} substituicoes salvas em {path.name}.")
        total_substituicoes += mudancas_arquivo
    else:
        print(f"  Nenhuma substituicao em {path.name}.")

print()
print("=" * 70)
print(f"TOTAL: {total_substituicoes} substituicoes em todos os arquivos")
print("=" * 70)

if total_substituicoes > 0:
    print()
    print("Proximos passos:")
    print("  1. npm run build")
    print("  2. npm run preview")
    print("  3. Testar caso M 55a Hb 13 Ferr 15 + bariatrica em http://localhost:4173/")
    print("  4. Verificar texto: 'AVALIAÇÃO MÉDICA E PROVAVELMENTE FERRO...'")
    print()
    print("  Se OK:")
    print('    git add . && git commit -m "fix: AVALIACAO MEDICA. E -> AVALIACAO MEDICA E (conjuncao)" && git push origin main')
