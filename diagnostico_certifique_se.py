"""
diagnostico_certifique_se.py

Localiza em quais arquivos e linhas esta a frase
'CERTIFIQUE-SE DE QUE A FERRITINA E SUPERIOR A 100'
para que possamos inserir 'SE EM REGIME DE SANGRIAS ' antes dela.
"""

from pathlib import Path

alvos = [
    Path("src/engine/maleMatrix.js"),
    Path("src/engine/femaleMatrix.js"),
    Path("src/engine/decisionEngine.js"),
    Path("src/engine/achadosParalelos.js"),
]

padrao = "CERTIFIQUE-SE DE QUE A FERRITINA"

print("=" * 70)
print("BUSCA POR: 'CERTIFIQUE-SE DE QUE A FERRITINA'")
print("=" * 70)

for path in alvos:
    if not path.exists():
        print(f"\n[pular] {path} nao existe")
        continue
    src = path.read_text(encoding="utf-8")
    linhas = src.splitlines()
    ocorrencias = [(i+1, linha) for i, linha in enumerate(linhas) if padrao in linha]

    print(f"\n--- {path} ---")
    if not ocorrencias:
        print("  (nao encontrado)")
    else:
        print(f"  {len(ocorrencias)} ocorrencia(s):")
        for num, linha in ocorrencias:
            # Mostra +/- 1 linha de contexto
            ini = max(0, num - 2)
            fim = min(len(linhas), num + 1)
            print(f"\n  >>> linha {num}:")
            for j in range(ini, fim):
                marca = "  >>" if j == num - 1 else "    "
                trecho = linhas[j][:200] + "..." if len(linhas[j]) > 200 else linhas[j]
                print(f"{marca} {j+1:5d}: {trecho}")

print("\n" + "=" * 70)
print("Cole o output completo no chat para eu gerar o script de correcao.")
print("=" * 70)
