"""
diagnostico_oba_dashboard.py

Mapeia o fluxo do OBAModal no PatientDashboard.jsx:
  - Onde showOBAModal eh declarado
  - Onde showOBAModal eh setado (true/false)
  - Onde o OBAModal eh renderizado
  - Onde a flag 'bariatrica' eh usada
  - Onde 'abrirOBA' (prop) eh usado

Objetivo: confirmar que setShowOBAModal(true) NUNCA eh chamado,
que eh a hipotese do Dr. Ramos sobre o bug.
"""

from pathlib import Path

ARQ = Path("src/components/PatientDashboard.jsx")

if not ARQ.exists():
    print(f"ERRO: {ARQ} nao existe.")
    exit(1)

src = ARQ.read_text(encoding="utf-8")
linhas = src.splitlines()

buscas = [
    "showOBAModal",
    "setShowOBAModal",
    "abrirOBA",
    "OBAModal",
    "bariatrica",
    "inputs.bariatrica",
]

for termo in buscas:
    print("=" * 70)
    print(f"BUSCA: '{termo}'")
    print("=" * 70)
    ocorrencias = [(i+1, l) for i, l in enumerate(linhas) if termo in l]
    if not ocorrencias:
        print("  (nenhuma)")
    else:
        for num, linha in ocorrencias:
            trecho = linha.strip()[:160]
            print(f"  linha {num:4d}: {trecho}")
    print()
