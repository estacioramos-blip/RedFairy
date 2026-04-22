"""
diagnostico_ferro_oral.py

Etapa 1: diagnostico completo da conversao 'ferroOral' -> 'ferro_oral' + 'ferro_injetavel'.

Conta:
  1. Ocorrencias da flag 'ferroOral' em todos os arquivos
  2. Ocorrencias do campo 'comentarioFerro' nas matrizes
  3. Amostras de alguns textos do comentarioFerro (pra gerar versoes para injetavel)
  4. Linhas onde 'ferroOral' aparece nas conditions das matrizes
  5. Onde o checkbox 'Ferro oral' aparece no frontend
"""

from pathlib import Path

def buscar(path: Path, termo: str, antes: int = 0, depois: int = 0, max_exemplos: int = 5):
    if not path.exists():
        return 0, []
    src = path.read_text(encoding="utf-8")
    linhas = src.splitlines()
    ocorrencias = [(i, l) for i, l in enumerate(linhas) if termo in l]
    amostras = []
    for i, l in ocorrencias[:max_exemplos]:
        ini = max(0, i - antes)
        fim = min(len(linhas), i + depois + 1)
        bloco = []
        for j in range(ini, fim):
            marca = ">>" if j == i else "  "
            bloco.append(f"    {marca} {j+1:5d}: {linhas[j][:230]}")
        amostras.append("\n".join(bloco))
    return len(ocorrencias), amostras


# ═══════════════════════════════════════════════════════════════════════
# 1. Onde 'ferroOral' aparece (flag no codigo, toda conversao)
# ═══════════════════════════════════════════════════════════════════════
print("=" * 70)
print("1. FLAG 'ferroOral' — ocorrencias por arquivo")
print("=" * 70)
total_flag = 0
arquivos_relevantes = [
    Path("src/components/Calculator.jsx"),
    Path("src/components/PatientDashboard.jsx"),
    Path("src/engine/decisionEngine.js"),
    Path("src/engine/femaleMatrix.js"),
    Path("src/engine/maleMatrix.js"),
    Path("src/engine/achadosParalelos.js"),
]
for path in arquivos_relevantes:
    count, _ = buscar(path, "ferroOral")
    if count > 0:
        print(f"  {path}: {count} ocorrencias")
        total_flag += count
print(f"  TOTAL: {total_flag} ocorrencias de 'ferroOral' no codigo")

# Amostras do Calculator (UI)
print("\n--- Amostras em Calculator.jsx ---")
_, amostras = buscar(Path("src/components/Calculator.jsx"), "ferroOral", antes=1, depois=2, max_exemplos=5)
for i, a in enumerate(amostras, 1):
    print(f"\n  [amostra {i}]")
    print(a)

print("\n--- Amostras em PatientDashboard.jsx ---")
_, amostras = buscar(Path("src/components/PatientDashboard.jsx"), "ferroOral", antes=1, depois=2, max_exemplos=5)
for i, a in enumerate(amostras, 1):
    print(f"\n  [amostra {i}]")
    print(a)

# ═══════════════════════════════════════════════════════════════════════
# 2. Campo 'comentarioFerro' nas matrizes
# ═══════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print("2. CAMPO 'comentarioFerro:' nas matrizes (quantos precisam de injetavel)")
print("=" * 70)
total_com = 0
for path in [Path("src/engine/femaleMatrix.js"), Path("src/engine/maleMatrix.js")]:
    count, _ = buscar(path, "comentarioFerro:")
    print(f"  {path}: {count} entradas com comentarioFerro")
    total_com += count
print(f"  TOTAL: {total_com} entradas (em ambas as matrizes)")

# Amostras de textos — 5 de cada matriz
print("\n--- Amostras de textos comentarioFerro (5 da matriz feminina) ---")
_, amostras = buscar(Path("src/engine/femaleMatrix.js"), "comentarioFerro:", antes=0, depois=0, max_exemplos=5)
for i, a in enumerate(amostras, 1):
    print(f"\n  [amostra {i}]")
    print(a)

print("\n--- Amostras de textos comentarioFerro (5 da matriz masculina) ---")
_, amostras = buscar(Path("src/engine/maleMatrix.js"), "comentarioFerro:", antes=0, depois=0, max_exemplos=5)
for i, a in enumerate(amostras, 1):
    print(f"\n  [amostra {i}]")
    print(a)

# ═══════════════════════════════════════════════════════════════════════
# 3. Flag 'ferroOral' em conditions: das matrizes (true ou false)
# ═══════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print("3. 'ferroOral: true' ou 'ferroOral: false' nas conditions (quantos casos)")
print("=" * 70)
for path in [Path("src/engine/femaleMatrix.js"), Path("src/engine/maleMatrix.js")]:
    if path.exists():
        src = path.read_text(encoding="utf-8")
        t = src.count("ferroOral: true")
        f = src.count("ferroOral: false")
        print(f"  {path}: 'ferroOral: true'={t}, 'ferroOral: false'={f}")

# ═══════════════════════════════════════════════════════════════════════
# 4. Nome exato do checkbox no UI (label 'Ferro oral')
# ═══════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print("4. LABEL do checkbox 'Ferro' no frontend")
print("=" * 70)
for path in [Path("src/components/Calculator.jsx"), Path("src/components/PatientDashboard.jsx")]:
    count, amostras = buscar(path, "Ferro", antes=1, depois=2, max_exemplos=5)
    print(f"\n  {path}: {count} ocorrencias de 'Ferro'")
    for i, a in enumerate(amostras, 1):
        if "checkbox" in a.lower() or "label" in a.lower() or "key:" in a.lower():
            print(f"\n  [relevante {i}]")
            print(a)

print("\n" + "=" * 70)
print("Cole TUDO no chat.")
print("=" * 70)
