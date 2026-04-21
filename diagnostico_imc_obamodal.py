"""
diagnostico_imc_obamodal.py

Verifica como os campos 'IMC Previo' (imc_antes) e 'IMC Atual' (imc_atual)
estao renderizados no OBAModal, para adicionar subtexto 'Normal: 18.5 a 24.9'
com formatacao consistente.
"""

from pathlib import Path

ARQ = Path("src/components/OBAModal.jsx")
src = ARQ.read_text(encoding="utf-8")
linhas = src.splitlines()

# Buscar imc_antes e imc_atual no render
print("=" * 70)
print("CAMPOS IMC EM OBAModal.jsx")
print("=" * 70)
for termo in ["imc_antes", "imc_atual", "IMC"]:
    print(f"\n>>> '{termo}':")
    ocorrencias = [i for i, l in enumerate(linhas) if termo in l]
    for n, i in enumerate(ocorrencias[:5]):
        ini = max(0, i-2)
        fim = min(len(linhas), i+8)
        print(f"\n  --- linha {i+1} ---")
        for j in range(ini, fim):
            marca = ">>" if j == i else "  "
            trecho = linhas[j][:220]
            if len(linhas[j]) > 220:
                trecho += "..."
            print(f"  {marca} {j+1:5d}: {trecho}")
    if len(ocorrencias) > 5:
        print(f"  ... (mais {len(ocorrencias)-5} ocorrencias)")

# Tambem ver se ja existe algum padrao de subtexto/label informativo nos campos
print("\n\n" + "=" * 70)
print("PADROES DE SUBTEXTO JA USADOS (ex: 'Referencia', 'Normal', 'ref')")
print("=" * 70)
for termo in ["ref:", "Referência", "Normal:", "tinyText", "text-xs text-gray"]:
    count = sum(1 for l in linhas if termo in l)
    if count > 0:
        print(f"\n  '{termo}' aparece {count} vez(es)")
        for i, l in enumerate(linhas):
            if termo in l:
                print(f"    linha {i+1}: {l.strip()[:200]}")
                break

print("\n" + "=" * 70)
print("Cole TUDO no chat.")
print("=" * 70)
