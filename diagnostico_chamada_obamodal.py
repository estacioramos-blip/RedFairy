"""
diagnostico_chamada_obamodal.py

Mini-diagnostico: ver o JSX completo da chamada <OBAModal ... />
no Calculator e no PatientDashboard para saber se dadosRedFairy /
examesRedFairy ja sao passados.
"""
from pathlib import Path

for nome, path in [
    ("Calculator", Path("src/components/Calculator.jsx")),
    ("PatientDashboard", Path("src/components/PatientDashboard.jsx")),
]:
    if not path.exists():
        print(f"  {path} nao existe."); continue
    linhas = path.read_text(encoding="utf-8").splitlines()

    print("=" * 70)
    print(f"CHAMADAS <OBAModal /> em {nome}")
    print("=" * 70)

    for i, l in enumerate(linhas):
        if "<OBAModal" in l:
            # Mostrar ate encontrar o fechamento ('/>' ou '</OBAModal>')
            ini = max(0, i-2)
            j = i
            while j < len(linhas) and "/>" not in linhas[j] and "</OBAModal>" not in linhas[j]:
                j += 1
            fim = min(len(linhas), j+3)
            print(f"\n  --- bloco inicia linha {i+1} ---")
            for k in range(ini, fim):
                marca = ">>" if i <= k <= j else "  "
                print(f"  {marca} {k+1:5d}: {linhas[k][:240]}")

print("\nCole TUDO no chat.")
