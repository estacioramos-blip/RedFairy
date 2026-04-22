"""
diagnostico_etapa2_ferro.py

Diagnostico refinado pra planejar as alteracoes da Etapa 2:
  1. Render exato dos checkboxes 'Ferro Oral/Injetável' no Dashboard
  2. Como 'comentarioFerro' e' consumido no decisionEngine (pra fallback)
  3. Contexto de 'ferroOral' no achadosParalelos
  4. Render do checkbox no Calculator (pra duplicar)
"""

from pathlib import Path

def mostrar_contexto(path: Path, termo: str, antes: int, depois: int, max_exemplos: int = 5):
    if not path.exists():
        print(f"  [pular] {path}")
        return
    src = path.read_text(encoding="utf-8")
    linhas = src.splitlines()
    ocorrencias = [i for i, l in enumerate(linhas) if termo in l]
    print(f"\n  {path} — '{termo}': {len(ocorrencias)} ocorrencias")
    for i in ocorrencias[:max_exemplos]:
        ini = max(0, i - antes)
        fim = min(len(linhas), i + depois + 1)
        print(f"\n    --- linha {i+1} ---")
        for j in range(ini, fim):
            marca = ">>" if j == i else "  "
            print(f"    {marca} {j+1:5d}: {linhas[j][:240]}")

# ═══════════════════════════════════════════════════════════════════════
# 1. Render do checkbox 'Ferro Oral/Injetável' no Dashboard
# ═══════════════════════════════════════════════════════════════════════
print("=" * 70)
print("1. RENDER DO CHECKBOX 'Ferro' no Dashboard (contexto AMPLO)")
print("=" * 70)
mostrar_contexto(
    Path("src/components/PatientDashboard.jsx"),
    "ferroOral",
    antes=4, depois=8, max_exemplos=5
)

# ═══════════════════════════════════════════════════════════════════════
# 2. Como comentarioFerro e' consumido no engine
# ═══════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print("2. LEITURA DO 'comentarioFerro' NO ENGINE (logica que precisa do fallback)")
print("=" * 70)
mostrar_contexto(
    Path("src/engine/decisionEngine.js"),
    "comentarioFerro",
    antes=2, depois=8, max_exemplos=5
)

# ═══════════════════════════════════════════════════════════════════════
# 3. Contexto de ferroOral no achadosParalelos
# ═══════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print("3. CONTEXTO DE 'ferroOral' EM achadosParalelos.js")
print("=" * 70)
mostrar_contexto(
    Path("src/engine/achadosParalelos.js"),
    "ferroOral",
    antes=4, depois=8, max_exemplos=3
)

# ═══════════════════════════════════════════════════════════════════════
# 4. Render do checkbox ferroOral no Calculator (formato do CheckboxCard)
# ═══════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print("4. RENDER DO CHECKBOX 'Ferro' no Calculator (pra duplicar)")
print("=" * 70)
# Buscar pelo texto 'Ferro Oral' no Calculator
mostrar_contexto(
    Path("src/components/Calculator.jsx"),
    "Ferro Oral",
    antes=3, depois=5, max_exemplos=3
)

# Buscar pelo texto 'ferroOral' no Calculator (presente em 7 lugares)
print("\n--- Todas as ocorrencias de 'ferroOral' em Calculator.jsx (contexto pequeno) ---")
mostrar_contexto(
    Path("src/components/Calculator.jsx"),
    "ferroOral",
    antes=1, depois=2, max_exemplos=10
)

# ═══════════════════════════════════════════════════════════════════════
# 5. Ler o arquivo decisionEngine.js integral em linhas ~100-300 pra
#    entender como comentarios sao montados no resultado
# ═══════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print("5. CONSTRUCAO DO RESULTADO (linhas ~120-170 do decisionEngine)")
print("=" * 70)
eng = Path("src/engine/decisionEngine.js")
if eng.exists():
    linhas = eng.read_text(encoding="utf-8").splitlines()
    fim = min(175, len(linhas))
    for j in range(120, fim):
        print(f"    {j+1:5d}: {linhas[j][:240]}")

print("\n" + "=" * 70)
print("Cole TUDO no chat.")
print("=" * 70)
