"""
diagnostico_nova_doacao.py

Conta ocorrencias de 'NOVA DOACAO' / 'NOVA DOAÇÃO' / 'NOVA SANGRIA'
nas matrizes (femaleMatrix, maleMatrix) e mostra exemplos.

Objetivo: decidir entre 3 estrategias:
  A) editar cada texto manualmente
  B) usar placeholder e processar no decisionEngine
  C) pos-processamento no frontend (replace simples)
"""

from pathlib import Path
import re

def contar_e_amostrar(path: Path, termos: list, max_exemplos: int = 3):
    if not path.exists():
        return
    src = path.read_text(encoding="utf-8")
    linhas = src.splitlines()

    print(f"\n######### {path} #########")
    for termo in termos:
        pattern = re.compile(re.escape(termo), re.IGNORECASE)
        ocorrencias = [(i, l) for i, l in enumerate(linhas) if pattern.search(l)]
        if ocorrencias:
            print(f"\n  >>> '{termo}': {len(ocorrencias)} ocorrencias")
            for i, l in ocorrencias[:max_exemplos]:
                trecho = l.strip()
                if len(trecho) > 250:
                    trecho = trecho[:250] + "..."
                print(f"    linha {i+1}: {trecho}")
            if len(ocorrencias) > max_exemplos:
                print(f"    ... (mais {len(ocorrencias) - max_exemplos} omitidos)")

termos_busca = [
    "NOVA DOAÇÃO",
    "NOVA DOACAO",
    "NOVA SANGRIA",
    "nova doação",
    "nova doacao",
]

for path in [
    Path("src/engine/femaleMatrix.js"),
    Path("src/engine/maleMatrix.js"),
    Path("src/engine/decisionEngine.js"),
    Path("src/engine/achadosParalelos.js"),
]:
    contar_e_amostrar(path, termos_busca, max_exemplos=4)

# Totais gerais
print("\n\n" + "=" * 70)
print("TOTAIS GERAIS (em todos os arquivos .js de src/engine/)")
print("=" * 70)
for termo in termos_busca:
    total = 0
    for path in Path("src/engine").rglob("*.js"):
        if path.exists():
            total += path.read_text(encoding="utf-8").count(termo)
    if total > 0:
        print(f"  '{termo}': {total} ocorrencias totais")

print("\n" + "=" * 70)
print("Cole TUDO no chat.")
print("=" * 70)
