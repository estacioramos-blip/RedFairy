# -*- coding: utf-8 -*-
"""
fix_hb_id115_id116.py

Ajusta a faixa de hemoglobina nas entradas:
  ID 115 (nao-gestante): 12.0-15.5 -> 11.5-12.9
  ID 116 (gestante):      11.0-14.0 -> 11.0-11.9

Justificativa clinica (Dr. Ramos):
  Sideropenia eritropoetica pre-anemica = fase 2 da deficiencia de ferro
  - Sat baixa (compartimento esgotado)
  - RDW elevado (eritropoese deficiente comecando)
  - Hb caindo mas ainda no limite (nao atingiu anemia franca)

  Hb 13 + Sat 17 + RDW 16 NAO e o quadro classico - e atipico.
  O quadro classico tem Hb mais baixa (~11.5-12.9 nao-gest, 11-11.9 gest).
"""
from pathlib import Path
import re
import sys

FEMALE = Path("src/engine/femaleMatrix.js")

if not FEMALE.exists():
    print("ERRO: femaleMatrix.js nao existe.")
    sys.exit(1)


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


print("=" * 60)
print("AJUSTE FISIOLOGICO - faixas de Hb nas IDs 115 e 116")
print("=" * 60)

src = FEMALE.read_text(encoding="utf-8")

ok, msg = validar(src, "femaleMatrix ANTES")
print(f"  {msg}")
if not ok:
    print("ABORT")
    sys.exit(1)

# ============================================================
# Encontrar e ajustar ID 115
# ============================================================
print()
print("ID 115 (nao-gestante):")

# Pegar o bloco completo da ID 115 e dentro dele substituir hemoglobina
m115 = re.search(r"^\s*\{\s*\n\s*id:\s*115,", src, re.MULTILINE)
if not m115:
    print("  ABORT: ID 115 nao encontrada.")
    sys.exit(1)

# Achar o fechamento (proximo ',' apos o '}' que fecha o objeto)
nivel = 0
inicio_bloco = m115.start()
fim_bloco = inicio_bloco
for i in range(inicio_bloco, len(src)):
    if src[i] == '{':
        nivel += 1
    elif src[i] == '}':
        nivel -= 1
        if nivel == 0:
            fim_bloco = i + 1
            break

bloco_115 = src[inicio_bloco:fim_bloco]

# Substituir hemoglobina dentro do bloco
antigo_hb = "hemoglobina: { min: 12.0, max: 15.5 }"
novo_hb = "hemoglobina: { min: 11.5, max: 12.9 }"

if antigo_hb in bloco_115:
    bloco_115_novo = bloco_115.replace(antigo_hb, novo_hb, 1)
    src = src[:inicio_bloco] + bloco_115_novo + src[fim_bloco:]
    print(f"  OK: 12.0-15.5 -> 11.5-12.9")
else:
    print(f"  AVISO: padrao '{antigo_hb}' nao encontrado dentro do bloco ID 115.")
    print(f"  Conteudo atual da hemoglobina:")
    m_hb = re.search(r"hemoglobina:\s*\{[^}]*\}", bloco_115)
    if m_hb:
        print(f"    {m_hb.group(0)}")
    sys.exit(1)

# ============================================================
# Encontrar e ajustar ID 116
# ============================================================
print()
print("ID 116 (gestante):")

m116 = re.search(r"^\s*\{\s*\n\s*id:\s*116,", src, re.MULTILINE)
if not m116:
    print("  ABORT: ID 116 nao encontrada.")
    sys.exit(1)

nivel = 0
inicio_bloco = m116.start()
fim_bloco = inicio_bloco
for i in range(inicio_bloco, len(src)):
    if src[i] == '{':
        nivel += 1
    elif src[i] == '}':
        nivel -= 1
        if nivel == 0:
            fim_bloco = i + 1
            break

bloco_116 = src[inicio_bloco:fim_bloco]

antigo_hb = "hemoglobina: { min: 11.0, max: 14.0 }"
novo_hb = "hemoglobina: { min: 11.0, max: 11.9 }"

if antigo_hb in bloco_116:
    bloco_116_novo = bloco_116.replace(antigo_hb, novo_hb, 1)
    src = src[:inicio_bloco] + bloco_116_novo + src[fim_bloco:]
    print(f"  OK: 11.0-14.0 -> 11.0-11.9")
else:
    print(f"  AVISO: padrao '{antigo_hb}' nao encontrado dentro do bloco ID 116.")
    sys.exit(1)

# ============================================================
# Validacao APOS
# ============================================================
ok, msg = validar(src, "femaleMatrix APOS")
print()
print(f"  {msg}")
if not ok:
    print("  ABORT.")
    sys.exit(1)

# Salvar
FEMALE.write_text(src, encoding="utf-8")
print()
print("=" * 60)
print("SUCESSO")
print("=" * 60)
print()
print("Resumo das faixas atualizadas:")
print("  ID 115 (nao-gestante): Hb 11.5-12.9 (sideropenia eritropoetica)")
print("  ID 116 (gestante):     Hb 11.0-11.9 (sideropenia eritropoetica gestacional)")
print()
print("Proximos passos:")
print("  1. npm run build")
print("  2. npm run preview")
print("  3. Janela ANONIMA -> http://localhost:4173/")
print()
print("  Caso 1 (ID 115 - nao-gestante):")
print("    F 35a, Hb 12, Ferr 15, VCM 82, RDW 16, Sat 17 + bariatrica")
print("    Esperado: BARIATRICA COM SIDEROPENIA INCIPIENTE PRE-ANEMICA")
print()
print("  Caso 2 (ID 116 - gestante):")
print("    F 30a, Hb 11.5, Ferr 15, VCM 82, RDW 16, Sat 17 + bariatrica + gestante 20sem")
print("    Esperado: GESTANTE BARIATRICA COM SIDEROPENIA INCIPIENTE")
print()
print("Se OK localmente:")
print('  git add . && git commit -m "fix: ajusta Hb fisiologica em ID 115 e 116" && git push origin main')
