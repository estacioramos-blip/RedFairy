"""
diagnostico_flags_medicamentos.py

Mapeia todos os flags de medicamentos disponiveis nos formularios
(Calculator.jsx, PatientDashboard.jsx, OBAModal.jsx) e no algoritmo
(decisionEngine.js) para confirmar nomes exatos antes de criar os
Achados medicamento-centrados.

Objetivo: saber quais flags existem, como estao grafadas, e se precisam
ser criadas.
"""

from pathlib import Path
import re

def buscar(path: Path, termos: list):
    if not path.exists():
        return []
    src = path.read_text(encoding="utf-8")
    linhas = src.splitlines()
    achados = []
    for termo in termos:
        for i, l in enumerate(linhas):
            if termo in l.lower():
                achados.append((i+1, termo, l.strip()[:180]))
    return achados

medicamentos = [
    "metformina",
    "ibp",
    "omeprazol",
    "pantoprazol",
    "aspirina",
    "aas",
    "anticoagulante",
    "varfarina",
    "warfarin",
    "rivaroxaban",
    "apixaban",
    "dabigatran",
    "hidroxiureia",
    "hidroxiuréia",
    "metotrexato",
    "methotrexato",
    "tiroxina",
    "levotiroxina",
    "ferrooral",
    "ferro_oral",
    "ferro oral",
    "ferro injetavel",
    "vitaminab12",
    "vitamina_b12",
    "vitamina b12",
    "b12",
    "testosterona",
    "alcoolista",
]

arquivos = [
    Path("src/components/Calculator.jsx"),
    Path("src/components/PatientDashboard.jsx"),
    Path("src/components/OBAModal.jsx"),
    Path("src/engine/decisionEngine.js"),
    Path("src/engine/achadosParalelos.js"),
]

print("=" * 70)
print("BUSCA DE FLAGS DE MEDICAMENTOS (minusculo)")
print("=" * 70)

# Agrupar por arquivo
for arq in arquivos:
    print(f"\n\n######### {arq} #########")
    resultados = buscar(arq, medicamentos)
    # Reagrupar por termo
    por_termo = {}
    for linha, termo, texto in resultados:
        if termo not in por_termo:
            por_termo[termo] = []
        por_termo[termo].append((linha, texto))

    if not por_termo:
        print("  (nenhum dos medicamentos encontrado)")
        continue

    for termo in sorted(por_termo.keys()):
        linhas = por_termo[termo]
        print(f"\n  [{termo}] - {len(linhas)} ocorrencia(s):")
        for ln, tx in linhas[:5]:  # no maximo 5 ocorrencias por termo
            print(f"    linha {ln:5d}: {tx}")
        if len(linhas) > 5:
            print(f"    ... (mais {len(linhas)-5})")

print("\n" + "=" * 70)
print("Cole TUDO no chat. Vou identificar os nomes EXATOS das flags")
print("pra criar os Achados medicamento-centrados com precisao.")
print("=" * 70)
