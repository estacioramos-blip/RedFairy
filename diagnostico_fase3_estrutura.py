"""
diagnostico_fase3_estrutura.py

Mapeia como a Fase 3 deve ser implementada:

1. Estrutura dos campos de exames complementares (LAB_FIELDS ou similar)
2. Ranges de referencia usados para classificacao automatica (LIMITES_OBA)
3. Se ja existe data de coleta OBA no form
4. Onde renderiza a secao de exames para saber onde inserir texto educativo
5. Se ha padrao de card de 'teleconsulta' ou similar
"""

from pathlib import Path

ARQ = Path("src/components/OBAModal.jsx")
src = ARQ.read_text(encoding="utf-8")
linhas = src.splitlines()

# 1. Estrutura dos campos de labs — procurar arrays/objetos
print("=" * 70)
print("1. CAMPOS DE EXAMES (chave 'key' com labels e refs)")
print("=" * 70)
# Procurar linhas com { key: 'xxx', label: 'yyy', unit: 'zzz', ref: 'www' }
inicio = None
for i, l in enumerate(linhas):
    if "label: 'Leucócitos" in l or "key: 'leucocitos'" in l:
        inicio = i
        break

if inicio is not None:
    # Mostra 30 linhas a partir dali (pra pegar todos os campos)
    for j in range(max(0, inicio-3), min(len(linhas), inicio+35)):
        print(f"  {j+1:5d}: {linhas[j][:240]}")

# 2. LIMITES_OBA
print("\n\n" + "=" * 70)
print("2. LIMITES_OBA (ranges numericos para validacao)")
print("=" * 70)
for i, l in enumerate(linhas):
    if "const LIMITES_OBA" in l or "LIMITES_OBA = {" in l:
        for j in range(i, min(i+35, len(linhas))):
            print(f"  {j+1:5d}: {linhas[j][:240]}")
            if j > i and linhas[j].strip() == "}":
                break
        break

# 3. Data de coleta OBA
print("\n\n" + "=" * 70)
print("3. DATA DE COLETA NO FORM OBA")
print("=" * 70)
for termo in ["data_coleta_oba", "dataColetaOBA", "data_exames"]:
    for i, l in enumerate(linhas):
        if termo in l:
            print(f"  [{termo}] linha {i+1}: {l.strip()[:200]}")

# Tambem procurar o examesRedFairy para ver quando eh usado
print("\n>>> 'examesRedFairy' no OBAModal:")
for i, l in enumerate(linhas):
    if "examesRedFairy" in l:
        print(f"  linha {i+1}: {l.strip()[:200]}")

# 4. Como renderiza a secao de exames complementares
print("\n\n" + "=" * 70)
print("4. SECAO DE EXAMES COMPLEMENTARES (render)")
print("=" * 70)
# Procurar SectionTitle com "Exames" ou similar
for i, l in enumerate(linhas):
    if "SectionTitle>Exames" in l or "Exames complementares" in l.lower() or "Exames laboratoriais" in l.lower():
        ini = max(0, i-2)
        fim = min(len(linhas), i+20)
        print(f"\n--- linha {i+1} ---")
        for j in range(ini, fim):
            marca = ">>" if j == i else "  "
            print(f"  {marca} {j+1:5d}: {linhas[j][:220]}")
        break

# 5. Onde sf() e SectionTitle sao definidos (pra reutilizar padrao)
print("\n\n" + "=" * 70)
print("5. PADROES REUTILIZAVEIS (SectionTitle, CheckRow, inp)")
print("=" * 70)
for termo in ["const SectionTitle", "const inp =", "const CheckRow"]:
    for i, l in enumerate(linhas):
        if termo in l:
            print(f"\n  [{termo}] linha {i+1}:")
            for j in range(i, min(i+4, len(linhas))):
                print(f"    {j+1:5d}: {linhas[j][:240]}")
            break

# 6. Render de campos de lab especificos
print("\n\n" + "=" * 70)
print("6. RENDER DE UM CAMPO DE LAB (ver como input+label sao agrupados)")
print("=" * 70)
for i, l in enumerate(linhas):
    if "form.vitamina_b12" in l:
        ini = max(0, i-3)
        fim = min(len(linhas), i+8)
        print(f"\n--- contexto da linha {i+1} ---")
        for j in range(ini, fim):
            marca = ">>" if j == i else "  "
            print(f"  {marca} {j+1:5d}: {linhas[j][:220]}")
        break

# 7. Tamanho total do arquivo
print("\n\n" + "=" * 70)
print(f"Total de linhas em OBAModal.jsx: {len(linhas)}")
print("=" * 70)

print("\nCole TUDO no chat.")
print("=" * 70)
