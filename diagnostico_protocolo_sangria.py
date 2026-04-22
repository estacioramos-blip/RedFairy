"""
diagnostico_protocolo_sangria.py

Localiza e mapeia o PROTOCOLO DE SANGRIAS TERAPEUTICAS existente:
  - Onde o componente esta definido
  - Quais variaveis/labels disparam sua exibicao
  - Como ele se relaciona ao ModalFerroEV (se existe componente irmao)
  - Quais criterios clinicos ele usa
"""

from pathlib import Path

def buscar(path: Path, termo: str, antes: int = 1, depois: int = 8, max_ex: int = 5):
    if not path.exists():
        return 0, []
    src = path.read_text(encoding="utf-8")
    linhas = src.splitlines()
    ocorrencias = [i for i, l in enumerate(linhas) if termo.lower() in l.lower()]
    amostras = []
    for i in ocorrencias[:max_ex]:
        ini = max(0, i - antes)
        fim = min(len(linhas), i + depois + 1)
        bloco = []
        for j in range(ini, fim):
            marca = ">>" if j == i else "  "
            bloco.append(f"    {marca} {j+1:5d}: {linhas[j][:260]}")
        amostras.append("\n".join(bloco))
    return len(ocorrencias), amostras


arquivos_alvo = [
    Path("src/components/ResultCard.jsx"),
    Path("src/components/Calculator.jsx"),
    Path("src/components/PatientDashboard.jsx"),
    Path("src/engine/decisionEngine.js"),
    Path("src/engine/maleMatrix.js"),
    Path("src/engine/femaleMatrix.js"),
]

# ═════════════════════════════════════════════════════════════════════
# 1. Buscar 'PROTOCOLO DE SANGRIA' / 'ModalSangria' / 'showSangria'
# ═════════════════════════════════════════════════════════════════════
print("=" * 70)
print("1. BUSCA POR 'PROTOCOLO DE SANGRIA' / 'ModalSangria' / 'showSangria'")
print("=" * 70)
for termo in ["PROTOCOLO DE SANGRIA", "ModalSangria", "showSangria", "calcularSangria"]:
    print(f"\n>>> '{termo}'")
    total = 0
    for path in arquivos_alvo:
        count, amostras = buscar(path, termo, antes=2, depois=6, max_ex=3)
        if count > 0:
            total += count
            print(f"\n  {path} ({count} ocorrencias):")
            for i, a in enumerate(amostras, 1):
                print(f"\n  [amostra {i}]")
                print(a)
    if total == 0:
        print("  (nenhuma ocorrencia)")

# ═════════════════════════════════════════════════════════════════════
# 2. Buscar 'sangria' em geral (case-insensitive) para achar mencoes
# ═════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print("2. MENCOES A 'sangria' NO RESULTCARD (componente principal)")
print("=" * 70)
count, amostras = buscar(
    Path("src/components/ResultCard.jsx"),
    "sangria",
    antes=1, depois=3, max_ex=15
)
print(f"\n  Total: {count} ocorrencias")
for i, a in enumerate(amostras, 1):
    print(f"\n  [amostra {i}]")
    print(a)

# ═════════════════════════════════════════════════════════════════════
# 3. Estrutura do ResultCard: quais modais e botões existem
# ═════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print("3. MODAIS/BOTOES NO RESULTCARD (useState de show*)")
print("=" * 70)
rc = Path("src/components/ResultCard.jsx")
if rc.exists():
    linhas = rc.read_text(encoding="utf-8").splitlines()
    for i, l in enumerate(linhas):
        if "useState" in l and ("show" in l.lower() or "modal" in l.lower() or "open" in l.lower()):
            print(f"  linha {i+1}: {l.strip()[:240]}")

# ═════════════════════════════════════════════════════════════════════
# 4. Lista de componentes definidos no ResultCard (function XYZ / const XYZ = )
# ═════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print("4. COMPONENTES DEFINIDOS NO RESULTCARD (function XYZ(...))")
print("=" * 70)
if rc.exists():
    linhas = rc.read_text(encoding="utf-8").splitlines()
    for i, l in enumerate(linhas):
        if (l.startswith("function ") or "export default function" in l) and "{" in l:
            print(f"  linha {i+1}: {l.strip()[:200]}")

print("\n" + "=" * 70)
print("Cole TUDO no chat.")
print("=" * 70)
