"""
diagnostico_resultcard_estrutura.py

Mostra a estrutura do componente ResultCard:
  - Assinatura (quais props recebe)
  - Props/variaveis relacionadas a 'resultado', 'hbAtual', 'color', 'sexo'
  - Onde 'color' e usado (para saber o nome correto da propriedade)
  - Contexto da expressao 'precisaFerroEV' completa
"""

from pathlib import Path

ARQ = Path("src/components/ResultCard.jsx")
src = ARQ.read_text(encoding="utf-8")
linhas = src.splitlines()

# 1. Assinatura da funcao ResultCard
print("=" * 70)
print("1. ASSINATURA DO COMPONENTE (primeiras 30 linhas)")
print("=" * 70)
for i in range(min(30, len(linhas))):
    print(f"  {i+1:5d}: {linhas[i][:240]}")

# 2. Expressao precisaFerroEV completa (da linha 889 ate o ;)
print("\n\n" + "=" * 70)
print("2. EXPRESSAO precisaFerroEV COMPLETA")
print("=" * 70)
for i, l in enumerate(linhas):
    if "const precisaFerroEV" in l:
        for j in range(i, min(i+15, len(linhas))):
            print(f"  {j+1:5d}: {linhas[j]}")
            if linhas[j].strip().endswith(";"):
                break
        break

# 3. Como hbAtual e extraida (linha 36 faz referencia a hbAtual mas como parametro)
# Vamos ver onde calcularFerroEV eh chamada
print("\n\n" + "=" * 70)
print("3. CHAMADAS de calcularFerroEV (saber de onde vem hbAtual)")
print("=" * 70)
for i, l in enumerate(linhas):
    if "calcularFerroEV(" in l:
        ini = max(0, i-2)
        fim = min(len(linhas), i+3)
        print(f"\n--- linha {i+1} ---")
        for j in range(ini, fim):
            print(f"  {j+1:5d}: {linhas[j][:240]}")

# 4. Como o 'color' do diagnostico eh acessado
print("\n\n" + "=" * 70)
print("4. USO de 'color' (resultado.color ou outra propriedade?)")
print("=" * 70)
for i, l in enumerate(linhas):
    if "resultado.color" in l or "resultado?.color" in l:
        print(f"  {i+1:5d}: {linhas[i][:240]}")

# 5. Uso de 'resultado.sexo' ou 'inputs.sexo' ou apenas 'sexo'
print("\n\n" + "=" * 70)
print("5. USO de 'sexo' (resultado.sexo, inputs.sexo, ou prop sexo?)")
print("=" * 70)
for termo in ["resultado.sexo", "resultado?.sexo", "inputs.sexo", "inputs?.sexo", "props.sexo"]:
    contador = sum(1 for l in linhas if termo in l)
    if contador > 0:
        print(f"  '{termo}' aparece {contador} vez(es)")
        for i, l in enumerate(linhas):
            if termo in l:
                print(f"    linha {i+1}: {l.strip()[:200]}")
                break

# 6. Onde 'hemoglobina' e acessada
print("\n\n" + "=" * 70)
print("6. USO de 'hemoglobina' (resultado.hemoglobina, inputs.hemoglobina...)")
print("=" * 70)
for termo in ["resultado.hemoglobina", "resultado?.hemoglobina", "inputs.hemoglobina", "inputs?.hemoglobina"]:
    contador = sum(1 for l in linhas if termo in l)
    if contador > 0:
        print(f"  '{termo}' aparece {contador} vez(es)")

print("\n" + "=" * 70)
print("Cole TUDO no chat.")
print("=" * 70)
