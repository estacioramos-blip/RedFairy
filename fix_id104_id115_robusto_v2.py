# -*- coding: utf-8 -*-
"""
fix_id104_id115_robusto_v2.py

Adiciona IDs 104 (male) e 115 (female) COM ACENTOS.

Estrategia:
  1. Le arquivos atuais em UTF-8
  2. Valida sintaxe ANTES (chaves, colchetes, IDs unicos, virgulas)
  3. Aborta se detectar problema
  4. Insere as entradas com virgulas corretas
  5. Revalida sintaxe DEPOIS
  6. So salva se passar em todas as validacoes
"""
from pathlib import Path
import re
import sys

MALE = Path("src/engine/maleMatrix.js")
FEMALE = Path("src/engine/femaleMatrix.js")


def validar(src, nome):
    """Retorna (ok: bool, mensagem: str)"""
    erros = []

    abre_c = src.count("{")
    fecha_c = src.count("}")
    abre_b = src.count("[")
    fecha_b = src.count("]")

    if abre_c != fecha_c:
        erros.append(f"Chaves desbalanceadas: abrem={abre_c}, fecham={fecha_c}")
    if abre_b != fecha_b:
        erros.append(f"Colchetes desbalanceados: abrem={abre_b}, fecham={fecha_b}")

    ids = re.findall(r"^\s*id:\s*(\d+)\s*,", src, re.MULTILINE)
    duplicados = set([x for x in ids if ids.count(x) > 1])
    if duplicados:
        erros.append(f"IDs duplicados: {duplicados}")

    if not re.search(r"\];\s*$", src):
        erros.append("Arquivo nao termina com '];'")

    # Virgula faltante antes de proximosExames (bug que vimos antes)
    m = re.search(r'comentarioFerro:\s*"[^"]*"\s*\n\s*proximosExames:', src)
    if m:
        erros.append("Virgula ausente apos comentarioFerro antes de proximosExames")

    if erros:
        return False, f"{nome}:\n    " + "\n    ".join(erros)
    return True, f"{nome}: OK (IDs: {len(ids)}, chaves: {abre_c}, colchetes: {abre_b})"


# ============================================================
# ENTRADAS COM ACENTOS CORRETOS
# ============================================================

ID_104 = """  {
    id: 104,
    label: "BARIÁTRICO COM SIDEROPENIA INCIPIENTE PRÉ-ANÊMICA",
    color: "yellow",
    conditions: {
      ferritina:   { min: 0,    max: 23   },
      hemoglobina: { min: 13.0, max: 17.5 },
      vcm:         { min: 75,   max: 100  },
      rdw:         { min: 14.0, max: 999  },
      satTransf:   { min: 0,    max: 19   },
      bariatrica:  true,
      vegetariano: false,
      perda:       false,
      alcoolista:  false,
      transfundido: false,
    },
    diagnostico: "SIDEROPENIA INCIPIENTE PRÉ-ANÊMICA EM PACIENTE BARIÁTRICO. FERRITINA BAIXA E SATURAÇÃO DA TRANSFERRINA REDUZIDA INDICAM QUE A RESERVA DE FERRO E O COMPARTIMENTO CIRCULANTE JÁ ESTÃO ESGOTADOS. RDW ELEVADO É SINAL PRECOCE DE ERITROPOESE DEFICIENTE. A HEMOGLOBINA AINDA ESTÁ NO LIMITE INFERIOR, MAS SEM INTERVENÇÃO A PROGRESSÃO PARA ANEMIA FERROPRIVA OU DIMÓRFICA É PROVÁVEL. ESTE É O MOMENTO IDEAL DE INTERVIR.",
    recomendacaoAge1: "PROCURE ORIENTAÇÃO DE HEMATOLOGISTA. NO BARIÁTRICO A REPOSIÇÃO ORAL DE FERRO TEM ABSORÇÃO COMPROMETIDA. FREQUENTEMENTE É NECESSÁRIO FERRO PARENTERAL (ENDOVENOSO OU INTRAMUSCULAR). NÃO FAÇA DOAÇÕES DE SANGUE ENQUANTO AS RESERVAS NÃO FOREM RESTAURADAS.",
    recomendacaoAge2: "PROCURE ORIENTAÇÃO DE HEMATOLOGISTA. NESSA FAIXA ETÁRIA A REPOSIÇÃO PRECOCE É ESSENCIAL. FERRO PARENTERAL É A REGRA NO BARIÁTRICO. INVESTIGAR TAMBÉM CAUSAS GASTROINTESTINAIS DE PERDA, COMUNS NESSA IDADE.",
    comentarioAspirina: "ASPIRINA PRODUZ PEQUENA PERDA CRÔNICA DE SANGUE. NO BARIÁTRICO COM SIDEROPENIA JÁ INSTALADA, PODE ACELERAR A PROGRESSÃO PARA ANEMIA. DISCUTA COM O MÉDICO.",
    comentarioB12: "A REPOSIÇÃO DE VITAMINA B12 NO BARIÁTRICO DEVE SER SUBLINGUAL OU PARENTERAL. MANTENHA DOSAGEM SÉRICA ANUAL.",
    comentarioFerro: "NO BARIÁTRICO A VIA ORAL DE FERRO FREQUENTEMENTE FALHA. FERRO PARENTERAL É GERALMENTE NECESSÁRIO, SEMPRE SOB ORIENTAÇÃO DO HEMATOLOGISTA. CUIDADO COM DOSES EXCESSIVAS.",
    proximosExames: ["HEMOGRAMA","RETICULÓCITOS","FERRITINA","SATURAÇÃO DA TRANSFERRINA","VITAMINA B12","FOLATOS","SANGUE NAS FEZES","ANTI-H. PYLORI IgG/IgM","ENDOSCOPIA DIGESTIVA","COLONOSCOPIA","PSA","CEA"],
  },"""

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


def aplicar(path, entrada, id_esperado, nome):
    print()
    print("=" * 60)
    print(f"APLICANDO {nome}")
    print("=" * 60)

    src = path.read_text(encoding="utf-8")

    # Validacao 1 - BEFORE
    ok, msg = validar(src, f"{nome} ANTES")
    print(f"  {msg}")
    if not ok:
        print(f"  ABORT: arquivo invalido antes de editar.")
        return False

    # Verificar se ID ja existe
    if f"id: {id_esperado}," in src:
        print(f"  AVISO: ID {id_esperado} ja existe. Pulando.")
        return True

    # Localizar '];' final
    m = re.search(r"\n\]\s*;\s*$", src)
    if not m:
        print(f"  ABORT: '];' final nao encontrado.")
        return False

    idx = m.start()
    antes_fim = src[:idx]

    if not antes_fim.rstrip().endswith("},"):
        if antes_fim.rstrip().endswith("}"):
            antes_fim = antes_fim.rstrip() + ","
            print(f"  (adicionada virgula no fechamento da entrada anterior)")

    # Inserir nova entrada
    nova_src = antes_fim.rstrip() + "\n" + entrada + "\n];\n"

    # Validacao 2 - AFTER
    ok, msg = validar(nova_src, f"{nome} APOS")
    print(f"  {msg}")
    if not ok:
        print(f"  ABORT: arquivo ficaria invalido apos edicao.")
        return False

    # Checar que ID foi adicionado
    if f"id: {id_esperado}," not in nova_src:
        print(f"  ABORT: ID {id_esperado} nao foi inserido corretamente.")
        return False

    # Salvar
    path.write_text(nova_src, encoding="utf-8")
    print(f"  OK: {nome} salvo com ID {id_esperado}.")
    return True


# ============================================================
# EXECUCAO
# ============================================================
print("=" * 60)
print("FIX ROBUSTO v2: ID 104 (male) + ID 115 (female)")
print("Com acentos UTF-8 completos")
print("=" * 60)

if not MALE.exists() or not FEMALE.exists():
    print("ERRO: arquivos nao existem.")
    sys.exit(1)

ok_male = aplicar(MALE, ID_104, 104, "maleMatrix")
ok_female = aplicar(FEMALE, ID_115, 115, "femaleMatrix")

print()
print("=" * 60)
if ok_male and ok_female:
    print("SUCESSO TOTAL")
    print("=" * 60)
    print()
    print("Proximo passo:")
    print('  git add . && git commit -m "feat: IDs 104 e 115 bariatrico sideropenia incipiente" && git push origin main')
else:
    print("FALHA EM UM OU MAIS ARQUIVOS.")
    print(f"  maleMatrix: {'OK' if ok_male else 'FALHA'}")
    print(f"  femaleMatrix: {'OK' if ok_female else 'FALHA'}")
print("=" * 60)
