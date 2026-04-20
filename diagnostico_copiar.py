"""
diagnostico_copiar.py

Mapeia o fluxo do botao 'Copiar Resultado para WhatsApp':
  - O que a funcao formatarParaCopiar (decisionEngine.js) monta
  - Como onCopiar eh chamado em Calculator.jsx
  - Como onCopiar eh chamado em PatientDashboard.jsx
  - Se Achados Paralelos e OBA estao sendo incluidos no texto copiado
"""

from pathlib import Path

def dump_range(path: Path, busca: str, contexto_antes: int = 2, contexto_depois: int = 40):
    if not path.exists():
        print(f"\n[pular] {path} nao existe")
        return
    src = path.read_text(encoding="utf-8")
    linhas = src.splitlines()
    print(f"\n######### {path} — busca: '{busca}' #########")
    for i, linha in enumerate(linhas):
        if busca in linha:
            ini = max(0, i - contexto_antes)
            fim = min(len(linhas), i + contexto_depois)
            print(f"\n--- linha {i+1} ---")
            for j in range(ini, fim):
                marca = ">>" if j == i else "  "
                print(f"{marca} {j+1:4d}: {linhas[j]}")
            print(f"--- fim trecho ---")
            break  # so o primeiro match

# 1. formatarParaCopiar (completa)
print("=" * 70)
print("1. formatarParaCopiar no decisionEngine.js")
print("=" * 70)
dump_range(
    Path("src/engine/decisionEngine.js"),
    "export function formatarParaCopiar",
    contexto_antes=0,
    contexto_depois=55,
)

# 2. onCopiar no Calculator.jsx
print("\n\n" + "=" * 70)
print("2. Calculator.jsx — funcao que chama onCopiar (handler de copia)")
print("=" * 70)
dump_range(
    Path("src/components/Calculator.jsx"),
    "formatarParaCopiar",
    contexto_antes=3,
    contexto_depois=15,
)

# 3. onCopiar no PatientDashboard
print("\n\n" + "=" * 70)
print("3. PatientDashboard.jsx — handler onCopiar")
print("=" * 70)
dump_range(
    Path("src/components/PatientDashboard.jsx"),
    "onCopiar",
    contexto_antes=2,
    contexto_depois=10,
)

# 4. Onde o botao aparece no ResultCard
print("\n\n" + "=" * 70)
print("4. ResultCard.jsx — posicao do botao 'Copiar Resultado para WhatsApp'")
print("=" * 70)
dump_range(
    Path("src/components/ResultCard.jsx"),
    "Copiar Resultado para WhatsApp",
    contexto_antes=5,
    contexto_depois=8,
)

print("\n" + "=" * 70)
print("Cole o output completo no chat.")
print("=" * 70)
