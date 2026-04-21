"""
diagnostico_vegetarianos.py

Lista TODAS as entradas com 'vegetariano: true' em femaleMatrix.js
e maleMatrix.js, mostrando id, label e criterios numericos.

Objetivo: mapear quais entradas femininas precisam de equivalente
masculino, e identificar quais IDs usar para as novas entradas.
"""

from pathlib import Path
import re

def extrair_vegetarianos(path: Path):
    if not path.exists():
        return []
    src = path.read_text(encoding="utf-8")

    # Regex captura cada bloco { id: N, ... vegetariano: true ... }
    blocos = re.findall(
        r'\{\s*id:\s*(\d+)\s*,\s*label:\s*"([^"]+)",.*?vegetariano:\s*true.*?^\s*\},',
        src,
        re.DOTALL | re.MULTILINE
    )
    resultados = []
    for id_num, label in blocos:
        # Pega criterios numericos
        bloco_completo = re.search(
            r'\{\s*id:\s*' + id_num + r'\s*,.*?^\s*\},',
            src,
            re.DOTALL | re.MULTILINE
        )
        if bloco_completo:
            texto = bloco_completo.group()
            conditions = {}
            for campo in ['ferritina', 'hemoglobina', 'vcm', 'rdw', 'satTransf']:
                m = re.search(campo + r':\s*\{\s*min:\s*([\d.]+)\s*,\s*max:\s*([\d.]+)', texto)
                if m:
                    conditions[campo] = (m.group(1), m.group(2))
            cor = re.search(r'color:\s*"(\w+)"', texto)
            resultados.append({
                'id': id_num,
                'label': label,
                'color': cor.group(1) if cor else '?',
                'conditions': conditions,
            })
    return resultados

print("=" * 70)
print("ENTRADAS VEGETARIANO=TRUE EM femaleMatrix.js")
print("=" * 70)
fem = extrair_vegetarianos(Path("src/engine/femaleMatrix.js"))
for e in fem:
    print(f"\nID {e['id']} ({e['color']}): {e['label']}")
    for campo, (mn, mx) in e['conditions'].items():
        print(f"  {campo:12s}: {mn:>6s} - {mx:>6s}")

print(f"\n  TOTAL: {len(fem)} entradas femininas com vegetariana=true")

print("\n\n" + "=" * 70)
print("ENTRADAS VEGETARIANO=TRUE EM maleMatrix.js")
print("=" * 70)
mas = extrair_vegetarianos(Path("src/engine/maleMatrix.js"))
for e in mas:
    print(f"\nID {e['id']} ({e['color']}): {e['label']}")
    for campo, (mn, mx) in e['conditions'].items():
        print(f"  {campo:12s}: {mn:>6s} - {mx:>6s}")

print(f"\n  TOTAL: {len(mas)} entradas masculinas com vegetariano=true")

print("\n" + "=" * 70)
print("MAIOR ID atualmente usado em cada matriz:")
print("=" * 70)
for path in [Path("src/engine/femaleMatrix.js"), Path("src/engine/maleMatrix.js")]:
    if path.exists():
        src = path.read_text(encoding="utf-8")
        ids = [int(m) for m in re.findall(r'id:\s*(\d+)', src)]
        if ids:
            print(f"  {path}: max ID = {max(ids)} (total {len(ids)} entradas)")

print("\n" + "=" * 70)
print("Cole TUDO no chat. Com isso monto o script de paridade F->M.")
print("=" * 70)
