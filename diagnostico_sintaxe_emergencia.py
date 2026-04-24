"""
diagnostico_sintaxe_emergencia.py

Emergencia: site quebrado com ReferenceError no bundle.
Causa provavel: erro de sintaxe em maleMatrix.js ou femaleMatrix.js
apos as ultimas edicoes manuais.

Estrategia:
  1. Contar chaves { } e colchetes [ ] para ver desbalanceamento
  2. Verificar a estrutura das ultimas entradas (id: 104 e id: 115)
  3. Procurar trailing commas estranhas
  4. Verificar se o arquivo termina com '];' corretamente
"""
from pathlib import Path
import re

for nome, path in [
    ("maleMatrix", Path("src/engine/maleMatrix.js")),
    ("femaleMatrix", Path("src/engine/femaleMatrix.js")),
]:
    print("=" * 70)
    print(f"ARQUIVO: {nome}")
    print("=" * 70)

    if not path.exists():
        print(f"  {path} nao existe.")
        continue

    src = path.read_text(encoding="utf-8")
    linhas = src.splitlines()

    # 1. Contagem de caracteres estruturais
    abre_chave = src.count("{")
    fecha_chave = src.count("}")
    abre_colchete = src.count("[")
    fecha_colchete = src.count("]")

    print(f"  Linhas totais: {len(linhas)}")
    print(f"  Chaves   {{ }}: abrem {abre_chave}, fecham {fecha_chave} (diff: {abre_chave - fecha_chave})")
    print(f"  Colchetes [ ]: abrem {abre_colchete}, fecham {fecha_colchete} (diff: {abre_colchete - fecha_colchete})")

    # 2. Ultimas 30 linhas (ver se o fim esta correto)
    print(f"\n  ULTIMAS 30 LINHAS:")
    for i in range(max(0, len(linhas) - 30), len(linhas)):
        print(f"    {i+1:5d}: {linhas[i][:240]}")

    # 3. Procurar padroes suspeitos
    print(f"\n  SINAIS DE ALERTA:")

    # - Vírgula seguida de fechamento sem próximo elemento
    padrao_virgula_fim = re.search(r',\s*\]\s*;?\s*$', src)
    if padrao_virgula_fim:
        print(f"    - Trailing comma no final? {padrao_virgula_fim.group(0)!r}")

    # - Entradas com ID duplicado
    ids = re.findall(r"^\s*id:\s*(\d+)\s*,", src, re.MULTILINE)
    ids_duplicados = set([x for x in ids if ids.count(x) > 1])
    if ids_duplicados:
        print(f"    - IDs DUPLICADOS: {ids_duplicados}")

    # - Alguma linha terminando com `};` em vez de `},`?
    linhas_suspeitas = []
    for i, l in enumerate(linhas):
        if re.match(r'^\s*\}\s*;\s*$', l) and i < len(linhas) - 2:
            linhas_suspeitas.append(i+1)
    if linhas_suspeitas:
        print(f"    - Linhas com };  (possivel erro): {linhas_suspeitas[:5]}")

    # 4. Tentar localizar entrada ID 104 / 115 para inspecao visual
    print()

print("=" * 70)
print("Cole TUDO no chat.")
print("=" * 70)
