"""
diagnostico_ajustes_finais.py

Pre-diagnostico para os 6 ajustes finais do OBAModal:

1. Ver as props passadas pelo Calculator ao <OBAModal /> — para
   saber se ferroOral/ferro_injetavel ja chegam ou precisam ser
   adicionados.

2. Localizar o array MEDICAMENTOS no OBAModal — para trocar
   'FERRO VENOSO' por 'FERRO INJETAVEL (EV/IM)' e adicionar
   'FERRO ORAL'.

3. Localizar EXAMES_BASE (ou similar) no OBAModal — para
   adicionar COLESTEROL TOTAL, HDL, LDL, VLDL, LIPOPROTEINA A,
   APOLIPOPROTEINA B.

4. Localizar const TIPOS_CIRURGIA (onde METABOLICA deve ganhar
   parenteses).

5. Ver onde esta 'PERDI MAS GANHEI PESO NOVAMENTE' para remover.

6. Ver arrays OUTRO/OUTRA em ESPECIALISTAS e COMPULSOES para
   garantir que estao no final.
"""

from pathlib import Path
import re
import sys

OBA  = Path("src/components/OBAModal.jsx")
CALC = Path("src/components/Calculator.jsx")
DASH = Path("src/components/PatientDashboard.jsx")

if not OBA.exists() or not CALC.exists():
    print("ERRO: arquivos nao encontrados."); sys.exit(1)

oba_src  = OBA.read_text(encoding="utf-8")
calc_src = CALC.read_text(encoding="utf-8")
dash_src = DASH.read_text(encoding="utf-8") if DASH.exists() else ""

# ═════════════════════════════════════════════════════════════════════
# 1. Como OBAModal eh chamado (props)
# ═════════════════════════════════════════════════════════════════════
print("=" * 70)
print("1. COMO <OBAModal /> EH CHAMADO NO Calculator e PatientDashboard")
print("=" * 70)
for nome, src in [("Calculator", calc_src), ("PatientDashboard", dash_src)]:
    linhas = src.splitlines()
    for i, l in enumerate(linhas):
        if "<OBAModal" in l or "OBAModal" in l and "=>" not in l and "import" not in l:
            ini = max(0, i-1)
            fim = min(len(linhas), i+15)
            print(f"\n  --- {nome} linha {i+1} ---")
            for j in range(ini, fim):
                marca = ">>" if j == i else "  "
                print(f"  {marca} {j+1:5d}: {linhas[j][:240]}")
            break

# ═════════════════════════════════════════════════════════════════════
# 2. Signatura do OBAModal (props que aceita)
# ═════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print("2. SIGNATURA DO OBAModal (linhas iniciais)")
print("=" * 70)
linhas = oba_src.splitlines()
for i, l in enumerate(linhas):
    if "export default function OBAModal" in l or ("function OBAModal" in l and "(" in l):
        # mostrar 10 linhas
        fim = min(len(linhas), i+10)
        for j in range(i, fim):
            print(f"  {j+1:5d}: {linhas[j][:240]}")
        break

# ═════════════════════════════════════════════════════════════════════
# 3. Lista MEDICAMENTOS no OBAModal
# ═════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print("3. LISTA MEDICAMENTOS")
print("=" * 70)
m = re.search(r"const MEDICAMENTOS\s*=\s*\[(.*?)\]", oba_src, re.DOTALL)
if m:
    conteudo = m.group(1)
    linha_inicio = oba_src[:m.start()].count('\n') + 1
    print(f"  const MEDICAMENTOS encontrada na linha ~{linha_inicio}")
    print(f"  Conteudo:")
    for linha in conteudo.strip().split('\n'):
        print(f"    {linha.strip()[:240]}")
else:
    print("  MEDICAMENTOS nao encontrado (pode ter outro nome)")

# ═════════════════════════════════════════════════════════════════════
# 4. EXAMES_BASE ou similar (para adicionar colesterol etc)
# ═════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print("4. ESTRUTURA DE EXAMES NO OBAModal (EXAMES_BASE / todosExames)")
print("=" * 70)
# Procurar const com 'EXAME' no nome
for pattern in [r"const (EXAMES_?BASE)\s*=\s*\[", r"const (todosExames)\s*=", r"const (OBA_EXAMES)\s*="]:
    m = re.search(pattern, oba_src)
    if m:
        nome = m.group(1)
        idx = m.start()
        linha_inicio = oba_src[:idx].count('\n') + 1
        print(f"\n  Encontrado: const {nome} (linha {linha_inicio})")
        # Mostrar 40 linhas a partir dai
        for j in range(linha_inicio-1, min(len(linhas), linha_inicio+40)):
            print(f"    {j+1:5d}: {linhas[j][:240]}")
            # parar quando fechar
            if j > linha_inicio and linhas[j].strip() == "]":
                break
        break

# ═════════════════════════════════════════════════════════════════════
# 5. TIPOS_CIRURGIA ou onde Radio de indicacao esta
# ═════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print("5. onde estao definidos os radios de 'Indicacao da cirurgia' e TIPOS_CIRURGIA")
print("=" * 70)
# Procurar METABOLICA no codigo
for i, l in enumerate(linhas):
    if "METABÓLICA" in l or "METABOLICA" in l:
        ini = max(0, i-2)
        fim = min(len(linhas), i+4)
        print(f"\n  --- linha {i+1} ---")
        for j in range(ini, fim):
            marca = ">>" if j == i else "  "
            print(f"  {marca} {j+1:5d}: {linhas[j][:260]}")

# ═════════════════════════════════════════════════════════════════════
# 6. Onde esta 'PERDI MAS GANHEI PESO NOVAMENTE' (para remocao)
# ═════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print("6. LINHA DO 'PERDI MAS GANHEI PESO NOVAMENTE'")
print("=" * 70)
for i, l in enumerate(linhas):
    if "PERDI MAS GANHEI" in l or "GANHEI PESO NOVAMENTE" in l:
        ini = max(0, i-2)
        fim = min(len(linhas), i+3)
        print(f"\n  --- linha {i+1} ---")
        for j in range(ini, fim):
            marca = ">>" if j == i else "  "
            print(f"  {marca} {j+1:5d}: {linhas[j][:260]}")

# ═════════════════════════════════════════════════════════════════════
# 7. Posicao de 'OUTRO' em ESPECIALISTAS e 'OUTRA' em COMPULSOES
# ═════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print("7. ORDEM DOS 'OUTRO'/'OUTRA' em ESPECIALISTAS e COMPULSOES")
print("=" * 70)
for nome in ["ESPECIALISTAS", "COMPULSOES"]:
    m = re.search(rf"const {nome}\s*=\s*\[(.*?)\]", oba_src, re.DOTALL)
    if m:
        conteudo = m.group(1).strip()
        print(f"\n  {nome}:")
        for linha in conteudo.split('\n'):
            print(f"    {linha.strip()[:240]}")

print("\n" + "=" * 70)
print("Cole TUDO no chat.")
print("=" * 70)
