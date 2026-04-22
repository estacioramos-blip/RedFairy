"""
diagnostico_oba_consumo.py

Revisao critica — PARTE 3: verifica consumo efetivo dos campos.

Para cada campo do form:
  - Aparece em obaEngine.js? (se nao, dado esta coletado mas nunca usado)
  - Em qual(is) modulo(s)?

Tambem mapeia:
  - quais modulos sao gerados incondicionalmente
  - quais so aparecem se certa condicao for atendida
"""

from pathlib import Path
import re
import sys

ENG = Path("src/engine/obaEngine.js")
OBA = Path("src/components/OBAModal.jsx")

if not ENG.exists() or not OBA.exists():
    print("ERRO: arquivos nao encontrados."); sys.exit(1)

eng_src = ENG.read_text(encoding="utf-8")
oba_src = OBA.read_text(encoding="utf-8")

# ═══════════════════════════════════════════════════════════════════════
# 1. Extrair todos os campos do state inicial (form) do OBAModal
# ═══════════════════════════════════════════════════════════════════════
# Padrao: 'nome:' dentro do useState({...}) do form
state_block = re.search(
    r'const \[form, setForm\] = useState\(\{(.*?)\}\)',
    oba_src, re.DOTALL
)
campos_form = []
if state_block:
    bloco = state_block.group(1)
    for m in re.finditer(r'(\w+)\s*:', bloco):
        nome = m.group(1)
        if nome not in campos_form:
            campos_form.append(nome)

print("=" * 70)
print(f"1. CAMPOS DO FORM (state inicial): {len(campos_form)}")
print("=" * 70)

# ═══════════════════════════════════════════════════════════════════════
# 2. Verificar se cada campo aparece no obaEngine.js
# ═══════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print("2. CONSUMO DE CADA CAMPO NO OBA-ENGINE")
print("=" * 70)

# Ler as funcoes do engine e identificar em qual bloco cada campo aparece
# Detectamos 'buildMod*' como separadores
modulos_engine = []
match_iter = list(re.finditer(r'function (buildMod\w+)\(', eng_src))
for i, m in enumerate(match_iter):
    nome = m.group(1)
    inicio = m.start()
    fim = match_iter[i+1].start() if i+1 < len(match_iter) else len(eng_src)
    modulos_engine.append({
        'nome': nome,
        'inicio': inicio,
        'fim': fim,
        'conteudo': eng_src[inicio:fim]
    })

# Agora verificar consumo
nao_consumidos = []
para_cada_campo = {}
for campo in campos_form:
    # procurar 'dados.CAMPO' ou 'form.CAMPO' ou apenas a string do campo
    pattern = re.compile(r'\b(dados|form)\.' + re.escape(campo) + r'\b')
    total = len(pattern.findall(eng_src))
    modulos_que_usam = []
    for mod in modulos_engine:
        if pattern.search(mod['conteudo']):
            modulos_que_usam.append(mod['nome'])
    para_cada_campo[campo] = {
        'total': total,
        'modulos': modulos_que_usam
    }
    if total == 0:
        nao_consumidos.append(campo)

# Imprimir campos consumidos e por quem
print("\n  CAMPOS CONSUMIDOS NO ENGINE:")
for campo, info in sorted(para_cada_campo.items(), key=lambda x: -x[1]['total']):
    if info['total'] > 0:
        mods = ', '.join(m.replace('buildMod', '') for m in info['modulos'])
        print(f"    {campo:35s}  {info['total']:3d} uso(s)  [{mods}]")

print("\n  CAMPOS NAO CONSUMIDOS (coletados mas nunca processados!):")
if nao_consumidos:
    for campo in nao_consumidos:
        print(f"    ⚠️  {campo}")
else:
    print("    (nenhum)")

# ═══════════════════════════════════════════════════════════════════════
# 3. Para cada modulo, mostrar a condicao de geracao (onde eh adicionado a modulos[])
# ═══════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print("3. CONDICOES DE GERACAO DOS MODULOS (onde sao chamados)")
print("=" * 70)

# A funcao avaliarOBA() chama os buildMod. Vamos extrair o corpo dela
match_avaliar = re.search(
    r'export function avaliarOBA\(.*?\)\s*\{(.*?)^}',
    eng_src, re.DOTALL | re.MULTILINE
)
if match_avaliar:
    corpo = match_avaliar.group(1)
    linhas = corpo.split('\n')
    for i, l in enumerate(linhas):
        if "buildMod" in l or "modulos.push" in l or "modulos.unshift" in l:
            print(f"  {l.strip()[:240]}")

# ═══════════════════════════════════════════════════════════════════════
# 4. Mapa grauDisabsorcao (importante)
# ═══════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print("4. LOGICA DE grauDisabsorcao (disabsorcao por tipo de cirurgia)")
print("=" * 70)
for i, l in enumerate(eng_src.splitlines()):
    if "grauDisabsorcao" in l or "grau disabsor" in l.lower():
        print(f"  linha {i+1}: {l.strip()[:240]}")

# ═══════════════════════════════════════════════════════════════════════
# 5. Amostrar uma funcao pesada para entender o padrao (buildModPonderal, buildModGestacional)
# ═══════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print("5. AMOSTRA DE UM MODULO — buildModPonderal (linha 787)")
print("=" * 70)
match_pond = re.search(r'function buildModPonderal.*?(?=\nfunction |\nexport )', eng_src, re.DOTALL)
if match_pond:
    bloco = match_pond.group(0)
    for i, l in enumerate(bloco.split('\n')[:80]):
        print(f"  {l[:240]}")

print("\n" + "=" * 70)
print("Cole TUDO no chat.")
print("=" * 70)
