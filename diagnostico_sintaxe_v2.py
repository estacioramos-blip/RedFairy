"""
diagnostico_sintaxe_v2.py

Verifica sintaxe das matrizes apos edicoes manuais.
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

    abre_chave = src.count("{")
    fecha_chave = src.count("}")
    abre_colchete = src.count("[")
    fecha_colchete = src.count("]")

    print(f"  Linhas totais: {len(linhas)}")
    print(f"  Chaves:    abrem {abre_chave}, fecham {fecha_chave}, diff {abre_chave - fecha_chave}")
    print(f"  Colchetes: abrem {abre_colchete}, fecham {fecha_colchete}, diff {abre_colchete - fecha_colchete}")

    # Ultimas 30 linhas
    print()
    print("  ULTIMAS 30 LINHAS:")
    for i in range(max(0, len(linhas) - 30), len(linhas)):
        print(f"    {i+1:5d}: {linhas[i][:240]}")

    # IDs duplicados
    ids = re.findall(r"^\s*id:\s*(\d+)\s*,", src, re.MULTILINE)
    print()
    print(f"  Total de IDs: {len(ids)}")
    ids_duplicados = set([x for x in ids if ids.count(x) > 1])
    if ids_duplicados:
        print(f"  IDs DUPLICADOS: {ids_duplicados}")
    else:
        print("  Nenhum ID duplicado.")

    # Linhas suspeitas (};)
    linhas_suspeitas = []
    for i, l in enumerate(linhas):
        if re.match(r"^\s*\}\s*;\s*$", l):
            linhas_suspeitas.append(i+1)
    print()
    fim_arquivo = len(linhas)
    suspeitas_meio = [x for x in linhas_suspeitas if x < fim_arquivo - 2]
    if suspeitas_meio:
        print(f"  Linhas suspeitas com chave-ponto-virgula no meio: {suspeitas_meio[:10]}")
    else:
        print("  Nenhuma linha suspeita no meio do arquivo.")

    # Procurar especificamente ID 104 e 115
    print()
    for id_alvo in ["104", "115"]:
        for i, l in enumerate(linhas):
            if re.match(rf"^\s*id:\s*{id_alvo}\s*,", l):
                print(f"  ID {id_alvo} encontrado na linha {i+1}")
                break
        else:
            print(f"  ID {id_alvo} NAO encontrado!")

    print()

print("=" * 70)
print("Cole TUDO no chat.")
print("=" * 70)
