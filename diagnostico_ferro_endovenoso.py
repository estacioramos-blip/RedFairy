"""
diagnostico_ferro_endovenoso.py

Localiza o codigo do Protocolo de Ferro Endovenoso (Formula de Ganzoni)
para eu entender onde esta a logica de disparo e o calculo de dose.

Busca por termos-chave do bug:
  - "Ganzoni"
  - "Ferro Endovenoso"
  - "Hb alvo"
  - "500 mg"
  - "reposicaoFerro" / "reposicao_ferro"
"""

from pathlib import Path

def buscar(path: Path, termo: str, antes: int = 3, depois: int = 20, max_per_file: int = 3):
    if not path.exists():
        return False
    src = path.read_text(encoding="utf-8")
    linhas = src.splitlines()
    ocorrencias = [i for i, l in enumerate(linhas) if termo.lower() in l.lower()]
    if not ocorrencias:
        return False
    print(f"\n######### {path} — '{termo}' ({len(ocorrencias)} ocorrencias) #########")
    for n, i in enumerate(ocorrencias[:max_per_file]):
        ini = max(0, i - antes)
        fim = min(len(linhas), i + depois)
        print(f"\n--- linha {i+1} ---")
        for j in range(ini, fim):
            marca = ">>" if j == i else "  "
            trecho = linhas[j][:240]
            if len(linhas[j]) > 240:
                trecho += "..."
            print(f"{marca} {j+1:5d}: {trecho}")
    if len(ocorrencias) > max_per_file:
        print(f"  ... (mais {len(ocorrencias)-max_per_file})")
    return True

# Varrer src/ inteiro em busca de Ganzoni
print("=" * 70)
print("BUSCA 1: 'Ganzoni' em todo src/")
print("=" * 70)
for path in Path("src").rglob("*.jsx"):
    buscar(path, "Ganzoni")
for path in Path("src").rglob("*.js"):
    buscar(path, "Ganzoni")

print("\n\n" + "=" * 70)
print("BUSCA 2: 'Hb alvo' em todo src/")
print("=" * 70)
for path in Path("src").rglob("*.jsx"):
    buscar(path, "Hb alvo")
for path in Path("src").rglob("*.js"):
    buscar(path, "Hb alvo")

print("\n\n" + "=" * 70)
print("BUSCA 3: 'Ferro Endovenoso' em componentes/engine")
print("=" * 70)
for path in Path("src").rglob("*.jsx"):
    buscar(path, "Ferro Endovenoso", antes=2, depois=6, max_per_file=2)

print("\n\n" + "=" * 70)
print("BUSCA 4: 'deficit' (variavel de calculo)")
print("=" * 70)
for path in Path("src").rglob("*.jsx"):
    buscar(path, "deficit", antes=2, depois=15, max_per_file=2)

print("\n\n" + "=" * 70)
print("BUSCA 5: 'Peso' como variavel em calculo")
print("=" * 70)
for path in Path("src").rglob("*.jsx"):
    src = path.read_text(encoding="utf-8")
    if "peso" in src.lower() and ("ganzoni" in src.lower() or "hb_alvo" in src.lower() or "hbAlvo" in src.lower()):
        print(f"\nArquivo relevante encontrado: {path}")

# Tambem buscar por botao "Como repor o Ferro Endovenoso"
print("\n\n" + "=" * 70)
print("BUSCA 6: 'Como repor'")
print("=" * 70)
for path in Path("src").rglob("*.jsx"):
    buscar(path, "Como repor", antes=2, depois=15, max_per_file=2)

print("\n" + "=" * 70)
print("Cole TUDO no chat.")
print("=" * 70)
