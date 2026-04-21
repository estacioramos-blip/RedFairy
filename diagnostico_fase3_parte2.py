"""
diagnostico_fase3_parte2.py

Localiza o render dos inputs de lab (linha 572 do diagnostico anterior)
e o contexto em torno para a Parte 2 da Fase 3.
"""

from pathlib import Path

ARQ = Path("src/components/OBAModal.jsx")
src = ARQ.read_text(encoding="utf-8")
linhas = src.splitlines()

# 1. Contexto antes e dentro do .filter(...).map(...) dos exames
print("=" * 70)
print("1. RENDER DOS INPUTS DE LAB (linhas ~565-625)")
print("=" * 70)
for i, l in enumerate(linhas):
    if "todosExames.filter" in l:
        ini = max(0, i-10)
        fim = min(len(linhas), i+50)
        for j in range(ini, fim):
            marca = ">>" if j == i else "  "
            trecho = linhas[j][:240]
            print(f"  {marca} {j+1:5d}: {trecho}")
        break

# 2. Onde eh definido 'todosExames'
print("\n\n" + "=" * 70)
print("2. DEFINICAO DE 'todosExames'")
print("=" * 70)
for i, l in enumerate(linhas):
    if "todosExames" in l and "=" in l:
        ini = max(0, i-2)
        fim = min(len(linhas), i+10)
        print(f"\n--- linha {i+1} ---")
        for j in range(ini, fim):
            marca = ">>" if j == i else "  "
            print(f"  {marca} {j+1:5d}: {linhas[j][:240]}")
        break

# 3. Onde eh renderizado examesRedFairy (bloco antes dos exames OBA)
print("\n\n" + "=" * 70)
print("3. RENDER DE examesRedFairy (bloco antes)")
print("=" * 70)
for i, l in enumerate(linhas):
    if "examesRedFairy && (examesRedFairy.ferritina" in l:
        ini = max(0, i-3)
        fim = min(len(linhas), i+30)
        print(f"\n--- linha {i+1} ---")
        for j in range(ini, fim):
            marca = ">>" if j == i else "  "
            trecho = linhas[j][:220]
            print(f"  {marca} {j+1:5d}: {trecho}")
        break

# 4. SectionTitle onde aparece Exames
print("\n\n" + "=" * 70)
print("4. SectionTitle que contem 'exame' ou 'laboratorial'")
print("=" * 70)
for i, l in enumerate(linhas):
    if "<SectionTitle>" in l and ("exam" in l.lower() or "lab" in l.lower() or "resultados" in l.lower()):
        ini = max(0, i-2)
        fim = min(len(linhas), i+4)
        print(f"\n--- linha {i+1} ---")
        for j in range(ini, fim):
            marca = ">>" if j == i else "  "
            print(f"  {marca} {j+1:5d}: {linhas[j][:200]}")

# 5. Busca pela etapa 'exames' ou botao 'Avancar'
print("\n\n" + "=" * 70)
print("5. NAVEGACAO DO MODAL (botoes Avancar, etapas)")
print("=" * 70)
for i, l in enumerate(linhas):
    if "Avancar" in l or "Avançar" in l or "setEtapa" in l:
        if "<" in l or "onClick" in l:
            print(f"  linha {i+1}: {l.strip()[:200]}")

# 6. Data de coleta no form
print("\n\n" + "=" * 70)
print("6. CAMPO 'data_exames' no form e no render")
print("=" * 70)
for i, l in enumerate(linhas):
    if "data_exames" in l:
        print(f"  linha {i+1}: {l.strip()[:200]}")

# 7. Campo 'hemoglobina_oba' se existir (sera repetido na nova coleta)
print("\n\n" + "=" * 70)
print("7. Campos 'hemoglobina_oba' ou 'vcm_oba' (se existirem)")
print("=" * 70)
for termo in ["hemoglobina_oba", "vcm_oba", "rdw_oba", "hemograma_oba"]:
    count = sum(1 for l in linhas if termo in l)
    if count > 0:
        print(f"  '{termo}' aparece {count} vez(es)")

print("\n" + "=" * 70)
print("Cole TUDO no chat.")
print("=" * 70)
