"""
diagnostico_validacao_data.py

Mapeia onde a dataColeta eh validada hoje em:
  - Calculator.jsx
  - PatientDashboard.jsx
  - decisionEngine.js (calcular dias desde coleta)
  - ResultCard.jsx (renderizar a frase de dias desde coleta)

Para saber onde inserir as 2 regras novas:
  - Data futura: bloqueia
  - Data > 2 anos: mostra 'EXAMES OBSOLETOS'
"""

from pathlib import Path
import re

def buscar_termos(path: Path, termos: list, antes: int = 2, depois: int = 8, max_per_term: int = 3):
    if not path.exists():
        print(f"\n[pular] {path}")
        return
    src = path.read_text(encoding="utf-8")
    linhas = src.splitlines()
    print(f"\n######### {path} #########")
    for termo in termos:
        ocorrencias = [i for i, l in enumerate(linhas) if termo in l]
        if not ocorrencias:
            continue
        print(f"\n  >>> '{termo}' ({len(ocorrencias)} ocorrencias)")
        for i in ocorrencias[:max_per_term]:
            ini = max(0, i-antes)
            fim = min(len(linhas), i+depois)
            print(f"\n  --- linha {i+1} ---")
            for j in range(ini, fim):
                marca = ">>" if j == i else "  "
                trecho = linhas[j][:240]
                print(f"  {marca} {j+1:5d}: {trecho}")

# 1. Calculator.jsx - validacoes ja existentes
buscar_termos(
    Path("src/components/Calculator.jsx"),
    ["dataColeta", "validar", "data_coleta", "erros.dataColeta"],
    antes=1, depois=4, max_per_term=4
)

# 2. PatientDashboard.jsx
buscar_termos(
    Path("src/components/PatientDashboard.jsx"),
    ["dataColeta", "data_coleta"],
    antes=1, depois=4, max_per_term=4
)

# 3. decisionEngine.js - como calcula dias e gera fraseData
buscar_termos(
    Path("src/engine/decisionEngine.js"),
    ["calcularDias", "dataColeta", "fraseData", "dias"],
    antes=1, depois=10, max_per_term=3
)

# 4. ResultCard.jsx - frase de dias desde coleta
buscar_termos(
    Path("src/components/ResultCard.jsx"),
    ["fraseData", "dias)", "desde a coleta", "OBSOLETOS"],
    antes=1, depois=4, max_per_term=2
)

print("\n" + "=" * 70)
print("Cole TUDO no chat.")
print("=" * 70)
