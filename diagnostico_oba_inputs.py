"""
diagnostico_oba_inputs.py

Revisao critica do OBAModal — PARTE 1: mapa dos INPUTS.

Objetivo: listar todos os campos que o OBAModal coleta do usuario
  - State inicial (form e outros)
  - Campos do payload que vai para Supabase
  - Checkboxes, selects, inputs
  - Flags de contexto
"""

from pathlib import Path
import re
import sys

ARQ = Path("src/components/OBAModal.jsx")
if not ARQ.exists():
    print(f"ERRO: {ARQ} nao existe.")
    sys.exit(1)

src = ARQ.read_text(encoding="utf-8")
linhas = src.splitlines()

# ═══════════════════════════════════════════════════════════════════════
# 1. Estado inicial do form (useState do form)
# ═══════════════════════════════════════════════════════════════════════
print("=" * 70)
print("1. ESTADO INICIAL (useState do form)")
print("=" * 70)
# Procurar o useState principal — linhas ~217
dentro = False
for i, l in enumerate(linhas):
    if "const [form, setForm] = useState({" in l or ("setForm" in l and "useState({" in l):
        dentro = True
    if dentro:
        print(f"  {i+1:5d}: {l[:240]}")
        if "})" in l:
            dentro = False
            break

# ═══════════════════════════════════════════════════════════════════════
# 2. Outros useState (estados locais)
# ═══════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print("2. OUTROS useState (estados locais)")
print("=" * 70)
for i, l in enumerate(linhas):
    # useState simples como: const [x, setX] = useState(valor)
    m = re.search(r'const \[(\w+), set\w+\] = useState\((.*?)\)', l)
    if m and "form" not in m.group(1):
        print(f"  {i+1:5d}: const [{m.group(1)}, ...] = useState({m.group(2)[:80]})")

# ═══════════════════════════════════════════════════════════════════════
# 3. Campos form.X usados no render (indica o que realmente e coletado)
# ═══════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print("3. CAMPOS form.X USADOS NO RENDER")
print("=" * 70)
# Capturar todos os 'form.xxx' no codigo
padrao = re.compile(r'form\.(\w+)')
campos = {}
for i, l in enumerate(linhas):
    for m in padrao.finditer(l):
        nome = m.group(1)
        campos[nome] = campos.get(nome, 0) + 1

# Ordenar por uso
ordenados = sorted(campos.items(), key=lambda x: -x[1])
print(f"  Total de campos unicos de form: {len(ordenados)}")
print()
for nome, count in ordenados:
    print(f"    form.{nome:35s}  {count:3d} ocorrencias")

# ═══════════════════════════════════════════════════════════════════════
# 4. Payload que vai ao Supabase (o que efetivamente e persistido)
# ═══════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print("4. PAYLOAD PERSISTIDO NO SUPABASE (supabase.from('oba_anamneses')...)")
print("=" * 70)
dentro = False
for i, l in enumerate(linhas):
    if "oba_anamneses" in l and ("insert" in l or "upsert" in l):
        dentro = True
    if dentro:
        print(f"  {i+1:5d}: {l[:240]}")
        if dentro and ("})" in l or "]) " in l or ".select()" in l):
            break

# ═══════════════════════════════════════════════════════════════════════
# 5. CheckRow e CheckboxCard usados (contar opcoes binarias)
# ═══════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print("5. CHECKBOXES (CheckRow / CheckboxCard / type='checkbox')")
print("=" * 70)
for i, l in enumerate(linhas):
    if "type=\"checkbox\"" in l or "CheckRow" in l or "CheckboxCard" in l:
        # mostrar so primeira ocorrencia por linha (evitar ruido)
        print(f"  {i+1:5d}: {l.strip()[:240]}")

# ═══════════════════════════════════════════════════════════════════════
# 6. Selects e radios
# ═══════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print("6. SELECTS E RADIO BUTTONS")
print("=" * 70)
for i, l in enumerate(linhas):
    if "<select" in l or "type=\"radio\"" in l or "<option" in l.lower():
        trecho = l.strip()[:200]
        if trecho:
            print(f"  {i+1:5d}: {trecho}")

# ═══════════════════════════════════════════════════════════════════════
# 7. Tamanho total do arquivo
# ═══════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print(f"Total de linhas em OBAModal.jsx: {len(linhas)}")
print("=" * 70)
print("\nCole TUDO no chat.")
print("Apos esse diagnostico, rodaremos um segundo script para ver os OUTPUTS.")
print("=" * 70)
