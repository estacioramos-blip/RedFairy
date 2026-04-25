# -*- coding: utf-8 -*-
"""
auditoria_obamodal_completa.py

AUDITORIA em 7 secoes. NAO modifica codigo.

Secao 1: Inputs declarados no OBAModal (useState + setForm)
Secao 2: Inputs consumidos pelo engine (buildMod*)
Secao 3: Inputs orfaos (declarados mas nao consumidos)
Secao 4: Campos usados no engine sem declaracao no OBAModal (undefined?)
Secao 5: Ordem de declaracao em cada componente (TDZ candidatos)
Secao 6: Cross-reference entre arquivos
Secao 7: Potenciais TDZ (variavel usada antes de declarar)
"""
from pathlib import Path
import re

# Arquivos alvo
OBAMODAL = Path("src/components/OBAModal.jsx")
OBAENGINE = Path("src/engine/obaEngine.js")
DECISION  = Path("src/engine/decisionEngine.js")
RESULTCARD = Path("src/components/ResultCard.jsx")
CALCULATOR = Path("src/components/Calculator.jsx")

relatorio = []
def p(*args):
    linha = " ".join(str(a) for a in args)
    relatorio.append(linha)
    print(linha)

# ============================================================
# SECAO 1: Inputs declarados no OBAModal
# ============================================================
p("=" * 70)
p("SECAO 1: INPUTS DECLARADOS NO OBAMODAL")
p("=" * 70)

oba_src = OBAMODAL.read_text(encoding="utf-8")
oba_linhas = oba_src.splitlines()

# State inicial do form: procurar o useState(...)
# E tambem procurar setForm(prev => ({ ...prev, X: Y }))

# 1a) Keys do state inicial (useState({...}))
p()
p("1a) Keys no useState inicial:")
# Procurar "useState({" e pegar ate o primeiro "}" sem abrir outro
m = re.search(r"useState\(\{(.*?)\}\)", oba_src, re.DOTALL)
keys_state_inicial = set()
if m:
    bloco = m.group(1)
    for km in re.finditer(r"^\s*(\w+):\s*", bloco, re.MULTILINE):
        keys_state_inicial.add(km.group(1))
    for k in sorted(keys_state_inicial):
        p(f"    - {k}")
    p(f"  Total: {len(keys_state_inicial)}")

# 1b) Keys setadas em setForm
p()
p("1b) Keys alteradas via setForm (`prev => ({ ...prev, X: ... })`):")
keys_setform = set()
for km in re.finditer(r"\.\.\.prev,\s*(\w+):", oba_src):
    keys_setform.add(km.group(1))
# Tambem capturar { X: value } em qualquer setForm mais direto
for km in re.finditer(r"setForm\([^)]*?(\w+):\s*[^,}]+", oba_src):
    if km.group(1) not in ('prev', 'value'):
        keys_setform.add(km.group(1))
for k in sorted(keys_setform):
    p(f"    - {k}")
p(f"  Total: {len(keys_setform)}")

# 1c) Todos os form.X referenciados
p()
p("1c) Todos os `form.X` referenciados:")
keys_form_uso = set()
for km in re.finditer(r"\bform\.(\w+)\b", oba_src):
    keys_form_uso.add(km.group(1))
for k in sorted(keys_form_uso):
    p(f"    - {k}")
p(f"  Total: {len(keys_form_uso)}")

# 1d) Outros useState (nao form)
p()
p("1d) Outros useState (locais do componente):")
outros_states = []
for km in re.finditer(r"const\s*\[(\w+)\s*,\s*set\w+\]\s*=\s*useState", oba_src):
    outros_states.append(km.group(1))
for k in outros_states:
    p(f"    - {k}")
p(f"  Total: {len(outros_states)}")

# ============================================================
# SECAO 2: Inputs consumidos pelo engine
# ============================================================
p()
p("=" * 70)
p("SECAO 2: INPUTS CONSUMIDOS PELO ENGINE")
p("=" * 70)
engine_src = OBAENGINE.read_text(encoding="utf-8")

# dados.X usado no engine (como parametro padrao de build* funcoes)
p()
p("2a) Referencias a `dados.X` no obaEngine.js:")
keys_engine = set()
for km in re.finditer(r"\bdados\.(\w+)\b", engine_src):
    keys_engine.add(km.group(1))
for k in sorted(keys_engine):
    p(f"    - {k}")
p(f"  Total: {len(keys_engine)}")

# Funcoes buildMod*
p()
p("2b) Funcoes buildMod* declaradas:")
buildmods = re.findall(r"function\s+(buildMod\w+)\s*\(", engine_src)
for fn in buildmods:
    p(f"    - {fn}")
p(f"  Total: {len(buildmods)}")

# Funcoes buildMod* chamadas no processOBAEngine
p()
p("2c) Funcoes buildMod* CHAMADAS:")
chamadas = set()
for km in re.finditer(r"\b(buildMod\w+)\s*\(", engine_src):
    chamadas.add(km.group(1))
for fn in sorted(chamadas):
    status = "OK" if fn in buildmods else "NAO DECLARADA!"
    p(f"    - {fn} [{status}]")

# ============================================================
# SECAO 3: Inputs ORFAOS (declarados mas nunca usados)
# ============================================================
p()
p("=" * 70)
p("SECAO 3: INPUTS ORFAOS (estao no form mas nao sao usados no engine)")
p("=" * 70)

todos_form = keys_state_inicial | keys_setform | keys_form_uso
orfaos = todos_form - keys_engine
p()
p(f"Declarados no form: {len(todos_form)}")
p(f"Consumidos no engine: {len(keys_engine)}")
p(f"Orfaos: {len(orfaos)}")
p()
for k in sorted(orfaos):
    p(f"    - {k}")

# ============================================================
# SECAO 4: Campos usados no engine mas nao no form
# ============================================================
p()
p("=" * 70)
p("SECAO 4: USADOS NO ENGINE MAS NUNCA DECLARADOS NO FORM")
p("=" * 70)
fantasmas = keys_engine - todos_form
p(f"Fantasmas: {len(fantasmas)}")
p()
for k in sorted(fantasmas):
    p(f"    - {k}")

# ============================================================
# SECAO 5: Potenciais TDZ no OBAModal
# ============================================================
p()
p("=" * 70)
p("SECAO 5: POTENCIAIS TDZ NO OBAMODAL.JSX")
p("=" * 70)
# Procurar padrao: CONST X = alguma expressao contendo Y, onde Y e declarado DEPOIS
# No arquivo JSX, vamos listar todas declaracoes const/let dentro da funcao principal
p()
p("Listando const/let no OBAModal em ordem:")

# Pegar apenas const/let dentro de funcoes do componente
# Procurar identificadores em cada linha
declaracoes = []
for i, l in enumerate(oba_linhas):
    m = re.match(r"\s*(const|let)\s+(\w+)\s*=", l)
    if m:
        declaracoes.append((i+1, m.group(2), l.strip()[:180]))

p(f"  Total de const/let: {len(declaracoes)}")
p()
p("  Buscando potenciais TDZ (var usada ANTES da linha de declaracao):")

def achar_usos_antes(nome, linha_decl, linhas):
    """Retorna linhas onde 'nome' aparece antes da linha_decl"""
    usos = []
    padrao = re.compile(r"\b" + re.escape(nome) + r"\b")
    for i in range(linha_decl - 1):
        if padrao.search(linhas[i]):
            # ignorar comentarios
            ls = linhas[i].strip()
            if ls.startswith("//") or ls.startswith("*"):
                continue
            usos.append(i + 1)
    return usos

tdz_candidatos = 0
for linha, nome, txt in declaracoes:
    usos = achar_usos_antes(nome, linha, oba_linhas)
    if usos:
        # Filtrar usos que sao em outra funcao (fora do escopo) - heuristica simples
        tdz_candidatos += 1
        p(f"    TDZ? '{nome}' declarado linha {linha}, usado em linhas: {usos[:5]}")

p()
p(f"  Total TDZ candidatos: {tdz_candidatos}")

# ============================================================
# SECAO 6: Cross-reference
# ============================================================
p()
p("=" * 70)
p("SECAO 6: CROSS-REFERENCE entre arquivos")
p("=" * 70)
p()

# Ver quais keys do form sao passadas para o engine
# Procurar avaliarOBA ou processOBA chamadas no OBAModal
p("6a) Chamadas de engine no OBAModal:")
for km in re.finditer(r"\b(avaliarOBA|processOBA|buildOBA|processOBAEngine)\s*\(", oba_src):
    p(f"    {km.group(0)}")

# Props que OBAModal recebe
p()
p("6b) Props de OBAModal:")
m = re.search(r"function OBAModal\s*\(\s*\{([^}]+)\}\s*\)", oba_src)
if m:
    props = [p.strip() for p in m.group(1).split(",") if p.strip()]
    for prop in props:
        p(f"    - {prop}")

# ============================================================
# SECAO 7: TDZ em todos os componentes envolvidos
# ============================================================
p()
p("=" * 70)
p("SECAO 7: POTENCIAIS TDZ NOS OUTROS ARQUIVOS")
p("=" * 70)

for nome_arq, path in [("ResultCard", RESULTCARD), ("Calculator", CALCULATOR), ("obaEngine", OBAENGINE)]:
    src_arq = path.read_text(encoding="utf-8")
    linhas_arq = src_arq.splitlines()

    p()
    p(f"--- {nome_arq} ({len(linhas_arq)} linhas) ---")

    decls = []
    for i, l in enumerate(linhas_arq):
        m = re.match(r"\s*(const|let)\s+(\w+)\s*=", l)
        if m:
            decls.append((i+1, m.group(2)))

    tdz_encontrados = 0
    for linha, nome in decls:
        usos = achar_usos_antes(nome, linha, linhas_arq)
        # Filtrar: s usos na mesma funcao contam. Vamos so reportar se os usos estao PROXIMOS (dentro de 50 linhas)
        usos_proximos = [u for u in usos if 0 < linha - u < 50]
        if usos_proximos:
            tdz_encontrados += 1
            if tdz_encontrados <= 10:
                p(f"    TDZ? '{nome}' declarado linha {linha}, usado nas linhas: {usos_proximos}")

    p(f"  Total TDZ proximos: {tdz_encontrados}")

p()
p("=" * 70)
p("FIM DO RELATORIO")
p("=" * 70)

# Salvar relatorio em arquivo
relatorio_path = Path("relatorio_auditoria_obamodal.txt")
relatorio_path.write_text("\n".join(relatorio), encoding="utf-8")
print()
print(f"Relatorio tambem salvo em: {relatorio_path}")
