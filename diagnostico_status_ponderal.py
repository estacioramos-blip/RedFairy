"""
diagnostico_status_ponderal.py

Mapeia o modulo STATUS PONDERAL em:
  - src/engine/obaEngine.js (algoritmo)
  - src/components/OBAModal.jsx (formulario)

Para eu entender como esta estruturado antes de adicionar
IMC pre-cirurgia e IMC atual.
"""

from pathlib import Path

def dump_range(path: Path, busca: str, contexto_antes: int = 3, contexto_depois: int = 60, max_matches: int = 5):
    if not path.exists():
        print(f"\n[pular] {path} nao existe")
        return
    src = path.read_text(encoding="utf-8")
    linhas = src.splitlines()
    print(f"\n######### {path} — busca: '{busca}' #########")
    n = 0
    for i, linha in enumerate(linhas):
        if busca.lower() in linha.lower():
            n += 1
            if n > max_matches:
                print(f"  ... (mais {len([x for x in linhas if busca.lower() in x.lower()]) - max_matches} ocorrencias omitidas)")
                break
            ini = max(0, i - contexto_antes)
            fim = min(len(linhas), i + contexto_depois)
            print(f"\n--- linha {i+1} ---")
            for j in range(ini, fim):
                marca = ">>" if j == i else "  "
                # Truncar linhas muito longas
                trecho = linhas[j][:220]
                if len(linhas[j]) > 220:
                    trecho += "..."
                print(f"{marca} {j+1:5d}: {trecho}")
            print(f"--- fim trecho ---")

print("=" * 70)
print("1. obaEngine.js — modulo Status Ponderal (algoritmo)")
print("=" * 70)
dump_range(
    Path("src/engine/obaEngine.js"),
    "ponderal",
    contexto_antes=2,
    contexto_depois=80,
    max_matches=3,
)

print("\n\n" + "=" * 70)
print("2. obaEngine.js — buscar 'reganho'")
print("=" * 70)
dump_range(
    Path("src/engine/obaEngine.js"),
    "reganho",
    contexto_antes=2,
    contexto_depois=20,
    max_matches=3,
)

print("\n\n" + "=" * 70)
print("3. OBAModal.jsx — formulario do Status Ponderal")
print("=" * 70)
dump_range(
    Path("src/components/OBAModal.jsx"),
    "ponderal",
    contexto_antes=3,
    contexto_depois=60,
    max_matches=5,
)

print("\n\n" + "=" * 70)
print("4. OBAModal.jsx — buscar 'peso' / 'IMC'")
print("=" * 70)
dump_range(
    Path("src/components/OBAModal.jsx"),
    "peso",
    contexto_antes=2,
    contexto_depois=8,
    max_matches=6,
)

print("\n" + "=" * 70)
print("Cole o output completo no chat.")
print("=" * 70)
