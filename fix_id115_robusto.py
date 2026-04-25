# -*- coding: utf-8 -*-
"""
fix_id115_robusto.py

Aplica APENAS o ID 115 (mulher bariatrica com sideropenia incipiente)
no femaleMatrix.js, com validacao robusta de sintaxe antes e depois.

Decisao: ID 115 INCLUI gestante (sem gestante: false).
- Hb min = 11.0 (alvo gestacional)
- Hb max = 15.5
- Texto menciona contexto gestacional quando aplicavel
"""
from pathlib import Path
import re
import sys

FEMALE = Path("src/engine/femaleMatrix.js")

if not FEMALE.exists():
    print("ERRO: femaleMatrix.js nao existe.")
    sys.exit(1)


def validar(src, nome):
    erros = []
    abre_c = src.count("{")
    fecha_c = src.count("}")
    abre_b = src.count("[")
    fecha_b = src.count("]")
    if abre_c != fecha_c:
        erros.append(f"Chaves: {abre_c}/{fecha_c}")
    if abre_b != fecha_b:
        erros.append(f"Colchetes: {abre_b}/{fecha_b}")
    ids = re.findall(r"^\s*id:\s*(\d+)\s*,", src, re.MULTILINE)
    duplicados = set([x for x in ids if ids.count(x) > 1])
    if duplicados:
        erros.append(f"IDs duplicados: {duplicados}")
    # Virgula faltante apos comentarioFerro (bug que vimos antes)
    if re.search(r'comentarioFerro:\s*"[^"]*"\s*\n\s*proximosExames:', src):
        erros.append("Virgula ausente apos comentarioFerro")
    if erros:
        return False, f"{nome}: " + "; ".join(erros)
    return True, f"{nome}: OK (IDs: {len(ids)}, chaves: {abre_c}, colchetes: {abre_b})"


# ID 115 com acentos UTF-8 e contexto gestacional
ID_115 = """  {
    id: 115,
    label: "BARIÁTRICA COM SIDEROPENIA INCIPIENTE PRÉ-ANÊMICA",
    color: "yellow",
    conditions: {
      ferritina:   { min: 0,    max: 23   },
      hemoglobina: { min: 11.0, max: 15.5 },
      vcm:         { min: 75,   max: 100  },
      rdw:         { min: 14.0, max: 999  },
      satTransf:   { min: 0,    max: 19   },
      bariatrica:  true,
      vegetariano: false,
      perda:       false,
      hipermenorreia: false,
      alcoolista:  false,
      transfundido: false,
    },
    diagnostico: "SIDEROPENIA INCIPIENTE PRÉ-ANÊMICA EM PACIENTE BARIÁTRICA. FERRITINA BAIXA E SATURAÇÃO DA TRANSFERRINA REDUZIDA INDICAM QUE A RESERVA DE FERRO E O COMPARTIMENTO CIRCULANTE JÁ ESTÃO ESGOTADOS. RDW ELEVADO É SINAL PRECOCE DE ERITROPOESE DEFICIENTE. A HEMOGLOBINA AINDA ESTÁ NO LIMITE INFERIOR, MAS SEM INTERVENÇÃO A PROGRESSÃO PARA ANEMIA FERROPRIVA OU DIMÓRFICA É PROVÁVEL. EM GESTANTE BARIÁTRICA ESSE PADRÃO É AINDA MAIS PREOCUPANTE — A DEMANDA FETAL E A ABSORÇÃO INTESTINAL COMPROMETIDA SOMADAS PODEM PRECIPITAR ANEMIA NO 3º TRIMESTRE. ESTE É O MOMENTO IDEAL DE INTERVIR.",
    recomendacaoAge1: "PROCURE ORIENTAÇÃO DE HEMATOLOGISTA. NA BARIÁTRICA A REPOSIÇÃO ORAL DE FERRO TEM ABSORÇÃO COMPROMETIDA. FERRO PARENTERAL (ENDOVENOSO OU INTRAMUSCULAR) É FREQUENTEMENTE NECESSÁRIO. NÃO FAÇA DOAÇÕES DE SANGUE. EM IDADE FÉRTIL, AVALIAR IMPACTO DO FLUXO MENSTRUAL. SE ESTIVER GESTANTE, A INTERVENÇÃO PRECOCE É PRIORITÁRIA — A GESTAÇÃO E A LACTAÇÃO CONSOMEM CERCA DE 1 g DE FERRO DAS RESERVAS.",
    recomendacaoAge2: "PROCURE ORIENTAÇÃO DE HEMATOLOGISTA. NESSA FAIXA ETÁRIA A REPOSIÇÃO PRECOCE É ESSENCIAL. FERRO PARENTERAL É A REGRA. INVESTIGAR CAUSAS GASTROINTESTINAIS.",
    comentarioAspirina: "ASPIRINA PRODUZ PEQUENA PERDA CRÔNICA DE SANGUE. NA BARIÁTRICA COM SIDEROPENIA, PODE ACELERAR A PROGRESSÃO PARA ANEMIA.",
    comentarioB12: "A REPOSIÇÃO DE VITAMINA B12 NA BARIÁTRICA DEVE SER SUBLINGUAL OU PARENTERAL.",
    comentarioFerro: "NA BARIÁTRICA A VIA ORAL DE FERRO FREQUENTEMENTE FALHA. FERRO PARENTERAL É GERALMENTE NECESSÁRIO, SOB ORIENTAÇÃO DO HEMATOLOGISTA. EM GESTANTE, O FERRO PARENTERAL PODE SER USADO A PARTIR DO 2º TRIMESTRE COM SEGURANÇA.",
    proximosExames: ["HEMOGRAMA","RETICULÓCITOS","FERRITINA","SATURAÇÃO DA TRANSFERRINA","VITAMINA B12","FOLATOS","TSH","SANGUE NAS FEZES","ANTI-H. PYLORI IgG/IgM","ENDOSCOPIA DIGESTIVA","COLONOSCOPIA","USG PÉLVICO TRANSVAGINAL"],
  },"""


# ============================================================
# EXECUCAO
# ============================================================
print("=" * 60)
print("APLICANDO ID 115 (mulher bariatrica + sideropenia incipiente)")
print("=" * 60)

src = FEMALE.read_text(encoding="utf-8")

# Validacao ANTES
ok, msg = validar(src, "femaleMatrix ANTES")
print(f"  {msg}")
if not ok:
    print("  ABORT: arquivo invalido antes de editar.")
    sys.exit(1)

# Verificar se ID ja existe
if "id: 115," in src:
    print("  AVISO: ID 115 ja existe. Pulando.")
    sys.exit(0)

# Localizar '];' final (regex permissivo)
m = re.search(r"\]\s*;", src)
if not m:
    print("  ABORT: '];' final nao encontrado.")
    sys.exit(1)

idx_fim = m.start()
antes_fim = src[:idx_fim]

# Garantir virgula apos ultima entrada
if antes_fim.rstrip().endswith("}"):
    antes_fim = antes_fim.rstrip() + ","
    print("  (virgula adicionada apos ultima entrada)")

nova_src = antes_fim.rstrip() + "\n" + ID_115 + "\n];\n"

# Validacao APOS
ok, msg = validar(nova_src, "femaleMatrix APOS")
print(f"  {msg}")
if not ok:
    print("  ABORT: arquivo ficaria invalido.")
    sys.exit(1)

if "id: 115," not in nova_src:
    print("  ABORT: ID 115 nao foi inserido.")
    sys.exit(1)

# Salvar
FEMALE.write_text(nova_src, encoding="utf-8")
print("  OK: ID 115 salvo em femaleMatrix.js.")

print()
print("=" * 60)
print("SUCESSO!")
print("=" * 60)
print()
print("Proximos passos (fluxo testado e robusto):")
print()
print("  1. npm run build           # gera bundle com source maps")
print("  2. npm run preview          # serve localhost:4173")
print("  3. Janela ANONIMA -> http://localhost:4173/")
print("  4. F12 -> Console")
print("  5. Modo Medico:")
print("     - F, 30a, gestante 20sem")
print("     - Hb 12.5, Ferr 15, VCM 82, RDW 15, Sat 17")
print("     - Bariatrica")
print("     - Avaliar -> OBAModal -> Concluir")
print("  6. Esperado: ID 115 aparece, console limpo")
print()
print("Se OK localmente:")
print('  git add . && git commit -m "feat: ID 115 - mulher bariatrica com sideropenia incipiente (inclui gestante)" && git push origin main')
