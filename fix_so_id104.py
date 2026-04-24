# -*- coding: utf-8 -*-
"""
fix_so_id104.py

Aplica APENAS o ID 104 em maleMatrix.js para isolar qual das
entradas (104 ou 115) quebrou o bundle.
"""
from pathlib import Path
import re
import sys

MALE = Path("src/engine/maleMatrix.js")

if not MALE.exists():
    print("ERRO: maleMatrix.js nao existe.")
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
    if erros:
        return False, f"{nome}: " + "; ".join(erros)
    return True, f"{nome}: OK (IDs: {len(ids)}, chaves: {abre_c}, colchetes: {abre_b})"


# ID 104 com acentos UTF-8
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


print("=" * 60)
print("APLICANDO SOMENTE ID 104 (bisect)")
print("=" * 60)

src = MALE.read_text(encoding="utf-8")

# Validacao antes
ok, msg = validar(src, "maleMatrix ANTES")
print(f"  {msg}")
if not ok:
    print("ABORT: arquivo invalido antes de editar.")
    sys.exit(1)

if "id: 104," in src:
    print("AVISO: ID 104 ja existe. Pulando.")
    sys.exit(0)

# Localizar fim do array (regex permissivo)
m = re.search(r"\]\s*;", src)
if not m:
    print("ABORT: '];' final nao encontrado.")
    sys.exit(1)

idx_fim = m.start()
antes_fim = src[:idx_fim]
if antes_fim.rstrip().endswith("}"):
    antes_fim = antes_fim.rstrip() + ","

nova_src = antes_fim.rstrip() + "\n" + ID_104 + "\n];\n"

# Validacao apos
ok, msg = validar(nova_src, "maleMatrix APOS")
print(f"  {msg}")
if not ok:
    print("ABORT: arquivo ficaria invalido.")
    sys.exit(1)

if "id: 104," not in nova_src:
    print("ABORT: ID 104 nao foi inserido.")
    sys.exit(1)

MALE.write_text(nova_src, encoding="utf-8")
print("  OK: ID 104 inserido em maleMatrix.js.")
print()
print("=" * 60)
print("SUCESSO - somente ID 104 aplicado")
print("=" * 60)
print()
print("Proximo passo:")
print('  git add . && git commit -m "feat: so ID 104 (bisect de bug)" && git push origin main')
print()
print("Depois do deploy, testar em JANELA ANONIMA:")
print("  Caso: M 55a Hb 13 Ferr 15 VCM 80 RDW 16 Sat 17 + bariatrica")
print()
print("  Se site carregar OK -> culpado eh ID 115 (vamos analisar caracteres especiais)")
print("  Se site quebrar    -> culpado eh ID 104 (revertemos e analisamos conteudo)")
