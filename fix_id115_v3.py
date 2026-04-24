# -*- coding: utf-8 -*-
"""
fix_id115_v3.py

Diagnostica os ultimos bytes do femaleMatrix e aplica o ID 115
com busca mais permissiva.
"""
from pathlib import Path
import re
import sys

FEMALE = Path("src/engine/femaleMatrix.js")

if not FEMALE.exists():
    print("ERRO: femaleMatrix.js nao existe.")
    sys.exit(1)

src = FEMALE.read_text(encoding="utf-8")

# 1. Diagnostico: ultimos 300 caracteres
print("=" * 60)
print("DIAGNOSTICO: ultimos 300 caracteres do femaleMatrix")
print("=" * 60)
ultimos = src[-300:]
print(f"Repr (mostra caracteres especiais):")
print(repr(ultimos))
print()
print("Texto legivel:")
print(ultimos)

# 2. Localizar o '];' usando abordagem mais permissiva
print()
print("=" * 60)
print("LOCALIZANDO FIM DO ARRAY")
print("=" * 60)

# Tentativa 1: regex multi-linha com tudo opcional
padroes = [
    (r"\n\]\s*;\s*$", "original do script"),
    (r"\]\s*;", "so '];'"),
    (r"^\s*\]\s*;", "'];' com indentacao"),
    (r"\]\s*;\s*\Z", "'];' no fim absoluto (\\Z)"),
]

idx_fim = None
for pat, desc in padroes:
    m = re.search(pat, src, re.MULTILINE)
    if m:
        print(f"  OK ({desc}): idx {m.start()}-{m.end()}")
        print(f"    match: {src[m.start():m.end()]!r}")
        if idx_fim is None:
            idx_fim = m.start()
    else:
        print(f"  FALHA ({desc})")

if idx_fim is None:
    # Fallback: rfind
    idx_fim = src.rfind("];")
    if idx_fim > 0:
        print(f"  Fallback rfind('];') funcionou no idx {idx_fim}")

if idx_fim is None or idx_fim < 0:
    print()
    print("ERRO: nao foi possivel localizar '];' final.")
    sys.exit(1)

# 3. Preparar nova entrada
print()
print("=" * 60)
print("INSERINDO ID 115")
print("=" * 60)

if "id: 115," in src:
    print("  AVISO: ID 115 ja existe. Pulando.")
    sys.exit(0)

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

# Pegar o que vem antes do '];'
antes_fim = src[:idx_fim]

# Garantir que termina com ',' apos o ultimo '}'
antes_fim_stripped = antes_fim.rstrip()
if antes_fim_stripped.endswith("}"):
    antes_fim_stripped = antes_fim_stripped + ","
    print("  (adicionada virgula no fechamento da entrada anterior)")

# Construir nova versao
nova_src = antes_fim_stripped + "\n" + ID_115 + "\n];\n"

# Validacao final
abre_c = nova_src.count("{")
fecha_c = nova_src.count("}")
abre_b = nova_src.count("[")
fecha_b = nova_src.count("]")
ids = re.findall(r"^\s*id:\s*(\d+)\s*,", nova_src, re.MULTILINE)
duplicados = set([x for x in ids if ids.count(x) > 1])

print(f"  Validacao APOS: chaves {abre_c}/{fecha_c}, colchetes {abre_b}/{fecha_b}, IDs {len(ids)}")
if abre_c != fecha_c:
    print(f"  ABORT: chaves desbalanceadas."); sys.exit(1)
if abre_b != fecha_b:
    print(f"  ABORT: colchetes desbalanceados."); sys.exit(1)
if duplicados:
    print(f"  ABORT: IDs duplicados: {duplicados}"); sys.exit(1)
if "id: 115," not in nova_src:
    print(f"  ABORT: ID 115 nao foi inserido."); sys.exit(1)

# Salvar
FEMALE.write_text(nova_src, encoding="utf-8")
print(f"  OK: femaleMatrix salvo com ID 115.")
print()
print("=" * 60)
print("SUCESSO")
print("=" * 60)
print()
print("Proximo passo:")
print('  git add . && git commit -m "feat: IDs 104 e 115 bariatrico sideropenia incipiente" && git push origin main')
