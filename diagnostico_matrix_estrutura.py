"""
diagnostico_matrix_estrutura.py

Mostra 2 entradas completas da femaleMatrix.js para eu entender
a estrutura exata: campos obrigatorios, formato das condicoes
(Hb, VCM, ferr, RDW, sat, idade), e textos.

Tambem mostra como a busca matrix.find() eh feita em decisionEngine.js.
"""

from pathlib import Path

def dump(path: Path, busca: str, contexto_antes: int = 3, contexto_depois: int = 50, max_matches: int = 2):
    if not path.exists():
        print(f"\n[pular] {path} nao existe")
        return
    src = path.read_text(encoding="utf-8")
    linhas = src.splitlines()
    print(f"\n######### {path} -- busca: '{busca}' #########")
    n = 0
    for i, linha in enumerate(linhas):
        if busca in linha:
            n += 1
            if n > max_matches:
                break
            ini = max(0, i - contexto_antes)
            fim = min(len(linhas), i + contexto_depois)
            print(f"\n--- linha {i+1} ---")
            for j in range(ini, fim):
                marca = ">>" if j == i else "  "
                trecho = linhas[j][:240]
                if len(linhas[j]) > 240:
                    trecho += "..."
                print(f"{marca} {j+1:5d}: {trecho}")

print("=" * 70)
print("1. femaleMatrix.js — primeiras linhas do arquivo (estrutura geral)")
print("=" * 70)
dump(
    Path("src/engine/femaleMatrix.js"),
    "export const femaleMatrix",
    contexto_antes=0,
    contexto_depois=40,
    max_matches=1,
)

print("\n\n" + "=" * 70)
print("2. femaleMatrix.js — 2 entradas COMPLETAS com 'macroc' (busca por macrocitica/macrocitose)")
print("=" * 70)
dump(
    Path("src/engine/femaleMatrix.js"),
    "MACROC",
    contexto_antes=5,
    contexto_depois=45,
    max_matches=2,
)

print("\n\n" + "=" * 70)
print("3. femaleMatrix.js — entrada de 'ANEMIA' qualquer (para ver estrutura tipica)")
print("=" * 70)
dump(
    Path("src/engine/femaleMatrix.js"),
    "ANEMIA",
    contexto_antes=3,
    contexto_depois=40,
    max_matches=1,
)

print("\n\n" + "=" * 70)
print("4. decisionEngine.js — logica do matrix.find() (como condicoes sao testadas)")
print("=" * 70)
dump(
    Path("src/engine/decisionEngine.js"),
    "matrix.find",
    contexto_antes=5,
    contexto_depois=30,
    max_matches=1,
)

print("\n\n" + "=" * 70)
print("5. femaleMatrix.js — total de entradas (contagem de 'id:')")
print("=" * 70)
path = Path("src/engine/femaleMatrix.js")
if path.exists():
    src = path.read_text(encoding="utf-8")
    n_ids = src.count("id:")
    print(f"  Total de ocorrencias de 'id:' em femaleMatrix.js: {n_ids}")

print("\n" + "=" * 70)
print("Cole o output completo no chat.")
print("=" * 70)
