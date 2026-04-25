# -*- coding: utf-8 -*-
"""
fix_E_conjuncao_v2.py

Item 1 corrigido: padrao real e 'MÉDICA É PROVAVELMENTE'
(sem ponto entre MÉDICA e É).

Substitui por 'MÉDICA E PROVAVELMENTE' (E como conjuncao).
"""
from pathlib import Path
import re

ARQUIVOS = [
    Path("src/engine/maleMatrix.js"),
    Path("src/engine/femaleMatrix.js"),
]


def validar(src, nome):
    erros = []
    if src.count("{") != src.count("}"):
        erros.append(f"Chaves: {src.count('{')}/{src.count('}')}")
    if src.count("[") != src.count("]"):
        erros.append(f"Colchetes: {src.count('[')}/{src.count(']')}")
    ids = re.findall(r"^\s*id:\s*(\d+)\s*,", src, re.MULTILINE)
    duplicados = set([x for x in ids if ids.count(x) > 1])
    if duplicados:
        erros.append(f"IDs duplicados: {duplicados}")
    if erros:
        return False, f"{nome}: " + "; ".join(erros)
    return True, f"{nome}: OK (IDs: {len(ids)})"


# ============================================================
# FASE 1 - LISTAR
# ============================================================
print("=" * 70)
print("FASE 1: LISTAR ocorrencias de 'MÉDICA É '")
print("=" * 70)

contextos = []
for path in ARQUIVOS:
    if not path.exists():
        continue
    src = path.read_text(encoding="utf-8")
    linhas = src.splitlines()
    for i, l in enumerate(linhas):
        if "MÉDICA É " in l:
            contextos.append((path.name, i + 1, l.strip()))

print(f"\nEncontradas {len(contextos)} ocorrencias:")
for nome, lin, txt in contextos:
    idx = txt.find("MÉDICA É")
    ini = max(0, idx - 50)
    fim = min(len(txt), idx + 200)
    print(f"  {nome} linha {lin}:")
    print(f"    ...{txt[ini:fim]}...")
    print()

# ============================================================
# FASE 2 - SUBSTITUIR
# ============================================================
print("=" * 70)
print("FASE 2: SUBSTITUIR 'MÉDICA É ' -> 'MÉDICA E '")
print("=" * 70)

# Substituicoes mais especificas (na ordem)
substituicoes = [
    # Variantes maiusculas comuns
    ("AVALIAÇÃO MÉDICA É PROVAVELMENTE", "AVALIAÇÃO MÉDICA E PROVAVELMENTE"),
    ("ORIENTAÇÃO MÉDICA É PROVAVELMENTE", "ORIENTAÇÃO MÉDICA E PROVAVELMENTE"),
    # Generico (caso exista outro contexto)
    ("MÉDICA É PROVAVELMENTE", "MÉDICA E PROVAVELMENTE"),
]

total = 0
for path in ARQUIVOS:
    if not path.exists():
        continue
    src = path.read_text(encoding="utf-8")
    ok, msg = validar(src, f"{path.name} ANTES")
    print(f"\n  {msg}")
    if not ok:
        print(f"  ABORT")
        continue

    mudancas = 0
    for antigo, novo in substituicoes:
        c = src.count(antigo)
        if c > 0:
            src = src.replace(antigo, novo)
            mudancas += c
            print(f"    {antigo!r} -> {novo!r} ({c}x)")

    if mudancas > 0:
        ok, msg = validar(src, f"{path.name} APOS")
        print(f"  {msg}")
        if not ok:
            print(f"  ABORT - nao salvar")
            continue
        path.write_text(src, encoding="utf-8")
        print(f"  OK: {mudancas} substituicoes salvas em {path.name}")
        total += mudancas
    else:
        print(f"  Nenhuma substituicao em {path.name}")

print()
print("=" * 70)
print(f"TOTAL: {total} substituicoes")
print("=" * 70)

if total > 0:
    print()
    print("Proximos passos:")
    print("  1. npm run build")
    print("  2. npm run preview")
    print("  3. Testar em http://localhost:4173/ com caso F 35a Hb 12 Ferr 15 + bariatrica")
    print("  4. Verificar texto no card amarelo: 'AVALIAÇÃO MÉDICA E PROVAVELMENTE FERRO...'")
    print()
    print("  Se OK:")
    print('    git add . && git commit -m "fix: AVALIACAO MEDICA E PROVAVELMENTE (E como conjuncao)" && git push origin main')
