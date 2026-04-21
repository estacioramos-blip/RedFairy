"""
diagnostico_obamodal_chamada.py

Mostra como OBAModal eh invocado em cada lugar para eu estender
as props sem quebrar o que ja existe.
"""

from pathlib import Path

def buscar(path: Path, termo: str, antes: int = 2, depois: int = 20):
    if not path.exists():
        print(f"[pular] {path}")
        return
    src = path.read_text(encoding="utf-8")
    linhas = src.splitlines()
    print(f"\n######### {path} #########")
    for i, l in enumerate(linhas):
        if termo in l:
            ini = max(0, i - antes)
            fim = min(len(linhas), i + depois)
            print(f"\n--- linha {i+1} ---")
            for j in range(ini, fim):
                marca = ">>" if j == i else "  "
                trecho = linhas[j][:240]
                print(f"{marca} {j+1:5d}: {trecho}")

# 1. OBAModal.jsx - assinatura da funcao e desestruturacao de props
print("=" * 70)
print("1. OBAModal.jsx - assinatura da funcao/props")
print("=" * 70)
buscar(Path("src/components/OBAModal.jsx"), "export default function OBAModal", antes=0, depois=3)

# 2. Onde OBAModal eh chamado (<OBAModal ... />)
print("\n\n" + "=" * 70)
print("2. Invocacoes de <OBAModal em todos os arquivos .jsx")
print("=" * 70)
for path in [
    Path("src/App.jsx"),
    Path("src/components/Calculator.jsx"),
    Path("src/components/PatientDashboard.jsx"),
]:
    if not path.exists():
        continue
    src = path.read_text(encoding="utf-8")
    linhas = src.splitlines()
    print(f"\n######### {path} #########")
    for i, l in enumerate(linhas):
        if "<OBAModal" in l:
            ini = max(0, i - 2)
            fim = min(len(linhas), i + 15)
            print(f"\n--- linha {i+1} ---")
            for j in range(ini, fim):
                marca = ">>" if j == i else "  "
                trecho = linhas[j][:240]
                print(f"{marca} {j+1:5d}: {trecho}")

# 3. onde ficam os campos 'gestante' marcados no Calculator (para renderizar input de semanas embaixo)
print("\n\n" + "=" * 70)
print("3. Calculator.jsx - renderizacao do checkbox 'gestante'")
print("=" * 70)
buscar(Path("src/components/Calculator.jsx"), 'name="gestante"', antes=2, depois=10)
buscar(Path("src/components/Calculator.jsx"), "'gestante'", antes=2, depois=8)

print("\n" + "=" * 70)
print("Cole TUDO no chat.")
print("=" * 70)
