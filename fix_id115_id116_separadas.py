# -*- coding: utf-8 -*-
"""
fix_id115_id116_separadas.py

ESTRATEGIA:
  1. Remove ID 115 atual (mistura gestante e nao-gestante)
  2. Adiciona ID 115 (bariatrica NAO-gestante)
  3. Adiciona ID 116 (bariatrica GESTANTE)
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
    if re.search(r'comentarioFerro:\s*"[^"]*"\s*\n\s*proximosExames:', src):
        erros.append("Virgula ausente apos comentarioFerro")
    if erros:
        return False, f"{nome}: " + "; ".join(erros)
    return True, f"{nome}: OK (IDs: {len(ids)}, chaves: {abre_c}, colchetes: {abre_b})"


# ============================================================
# ID 115 - Bariatrica NAO-gestante
# ============================================================
ID_115 = """  {
    id: 115,
    label: "BARIÁTRICA COM SIDEROPENIA INCIPIENTE PRÉ-ANÊMICA",
    color: "yellow",
    conditions: {
      ferritina:   { min: 0,    max: 23   },
      hemoglobina: { min: 12.0, max: 15.5 },
      vcm:         { min: 75,   max: 100  },
      rdw:         { min: 14.0, max: 999  },
      satTransf:   { min: 0,    max: 19   },
      bariatrica:  true,
      vegetariano: false,
      perda:       false,
      hipermenorreia: false,
      alcoolista:  false,
      transfundido: false,
      gestante:    false,
    },
    diagnostico: "SIDEROPENIA INCIPIENTE PRÉ-ANÊMICA EM PACIENTE BARIÁTRICA. FERRITINA BAIXA E SATURAÇÃO DA TRANSFERRINA REDUZIDA INDICAM QUE A RESERVA DE FERRO E O COMPARTIMENTO CIRCULANTE JÁ ESTÃO ESGOTADOS. RDW ELEVADO É SINAL PRECOCE DE ERITROPOESE DEFICIENTE. A HEMOGLOBINA AINDA ESTÁ NO LIMITE INFERIOR, MAS SEM INTERVENÇÃO A PROGRESSÃO PARA ANEMIA FERROPRIVA OU DIMÓRFICA É PROVÁVEL. ESTE É O MOMENTO IDEAL DE INTERVIR — ANTES QUE A ANEMIA SE INSTALE.",
    recomendacaoAge1: "PROCURE ORIENTAÇÃO DE HEMATOLOGISTA. NA BARIÁTRICA A REPOSIÇÃO ORAL DE FERRO TEM ABSORÇÃO COMPROMETIDA. FERRO PARENTERAL (ENDOVENOSO OU INTRAMUSCULAR) É FREQUENTEMENTE NECESSÁRIO. NÃO FAÇA DOAÇÕES DE SANGUE ENQUANTO AS RESERVAS NÃO FOREM RESTAURADAS. EM IDADE FÉRTIL, AVALIAR TAMBÉM IMPACTO DO FLUXO MENSTRUAL.",
    recomendacaoAge2: "PROCURE ORIENTAÇÃO DE HEMATOLOGISTA. NESSA FAIXA ETÁRIA A REPOSIÇÃO PRECOCE É ESSENCIAL. FERRO PARENTERAL É A REGRA NA BARIÁTRICA. INVESTIGAR TAMBÉM CAUSAS GASTROINTESTINAIS DE PERDA, COMUNS NESSA IDADE.",
    comentarioAspirina: "ASPIRINA PRODUZ PEQUENA PERDA CRÔNICA DE SANGUE. NA BARIÁTRICA COM SIDEROPENIA JÁ INSTALADA, PODE ACELERAR A PROGRESSÃO PARA ANEMIA. DISCUTA COM O MÉDICO.",
    comentarioB12: "A REPOSIÇÃO DE VITAMINA B12 NA BARIÁTRICA DEVE SER SUBLINGUAL OU PARENTERAL. MANTENHA DOSAGEM SÉRICA ANUAL.",
    comentarioFerro: "NA BARIÁTRICA A VIA ORAL DE FERRO FREQUENTEMENTE FALHA. FERRO PARENTERAL É GERALMENTE NECESSÁRIO, SOB ORIENTAÇÃO DO HEMATOLOGISTA. CUIDADO COM DOSES EXCESSIVAS.",
    proximosExames: ["HEMOGRAMA","RETICULÓCITOS","FERRITINA","SATURAÇÃO DA TRANSFERRINA","VITAMINA B12","FOLATOS","TSH","SANGUE NAS FEZES","ANTI-H. PYLORI IgG/IgM","ENDOSCOPIA DIGESTIVA","COLONOSCOPIA","USG PÉLVICO TRANSVAGINAL"],
  },"""

# ============================================================
# ID 116 - Bariatrica GESTANTE
# ============================================================
ID_116 = """  {
    id: 116,
    label: "GESTANTE BARIÁTRICA COM SIDEROPENIA INCIPIENTE",
    color: "yellow",
    conditions: {
      ferritina:   { min: 0,    max: 23   },
      hemoglobina: { min: 11.0, max: 14.0 },
      vcm:         { min: 75,   max: 100  },
      rdw:         { min: 14.0, max: 999  },
      satTransf:   { min: 0,    max: 19   },
      bariatrica:  true,
      vegetariano: false,
      perda:       false,
      hipermenorreia: false,
      alcoolista:  false,
      transfundido: false,
      gestante:    true,
    },
    diagnostico: "SIDEROPENIA INCIPIENTE EM GESTANTE BARIÁTRICA — COMBINAÇÃO DE ALTO RISCO. A FERRITINA BAIXA E A SATURAÇÃO DA TRANSFERRINA REDUZIDA INDICAM RESERVAS DE FERRO E COMPARTIMENTO CIRCULANTE JÁ ESGOTADOS. NESSA PACIENTE, DOIS FATORES SE SOMAM E SE POTENCIALIZAM: A ABSORÇÃO INTESTINAL DE FERRO COMPROMETIDA PELA CIRURGIA BARIÁTRICA E A DEMANDA FETAL CRESCENTE PELA GESTAÇÃO. SEM INTERVENÇÃO, A PROGRESSÃO PARA ANEMIA NO 3º TRIMESTRE É PROVÁVEL, COM RISCO DE PARTO PREMATURO, BAIXO PESO AO NASCER E FADIGA MATERNA INCAPACITANTE. ESTE É O MOMENTO CRÍTICO DE INTERVIR.",
    recomendacaoAge1: "AVALIAÇÃO COM HEMATOLOGISTA E OBSTETRA EM REGIME DE PRIORIDADE. A SUPLEMENTAÇÃO ORAL HABITUAL DA GESTAÇÃO É INSUFICIENTE NA PACIENTE BARIÁTRICA — A ABSORÇÃO ESTÁ COMPROMETIDA. FERRO PARENTERAL (ENDOVENOSO OU INTRAMUSCULAR) PODE SER USADO COM SEGURANÇA A PARTIR DO 2º TRIMESTRE. NÃO FAÇA DOAÇÕES DE SANGUE. A GESTAÇÃO E A LACTAÇÃO CONSOMEM CERCA DE 1 g DE FERRO DAS RESERVAS — O QUE JÁ ESTÁ ESGOTADO PRECISA SER REPOSTO ANTES.",
    recomendacaoAge2: "AVALIAÇÃO COM HEMATOLOGISTA E OBSTETRA EM REGIME DE PRIORIDADE. FERRO PARENTERAL É A REGRA NESSA SITUAÇÃO. INVESTIGAR TAMBÉM CAUSAS GASTROINTESTINAIS DE PERDA. A INTERVENÇÃO PRECOCE É ESSENCIAL PARA A SAÚDE MATERNO-FETAL.",
    comentarioAspirina: "ASPIRINA EM BAIXA DOSE PODE SER PRESCRITA EM ALGUMAS GESTANTES COM RISCO DE PRÉ-ECLÂMPSIA, MAS DEVE SER DISCUTIDA COM O OBSTETRA EM CONTEXTO DE SIDEROPENIA. EM OUTRAS SITUAÇÕES, PODE ACELERAR A PROGRESSÃO PARA ANEMIA.",
    comentarioB12: "A REPOSIÇÃO DE VITAMINA B12 NA GESTANTE BARIÁTRICA É OBRIGATÓRIA E DEVE SER SUBLINGUAL OU PARENTERAL — A VIA ORAL FALHA NA BARIÁTRICA. MANTENHA DOSAGEM SÉRICA TRIMESTRAL.",
    comentarioFerro: "NA GESTANTE BARIÁTRICA A VIA ORAL DE FERRO É INSUFICIENTE PARA SUPRIR A DEMANDA. FERRO PARENTERAL É A INDICAÇÃO PRIORITÁRIA, A PARTIR DO 2º TRIMESTRE, SOB ORIENTAÇÃO CONJUNTA DO HEMATOLOGISTA E OBSTETRA.",
    proximosExames: ["HEMOGRAMA","RETICULÓCITOS","FERRITINA","SATURAÇÃO DA TRANSFERRINA","VITAMINA B12","FOLATOS","TSH","T4 LIVRE","HOMOCISTEÍNA","USG OBSTÉTRICO"],
  },"""


# ============================================================
# EXECUCAO
# ============================================================
print("=" * 60)
print("ID 115 (nao-gestante) + ID 116 (gestante)")
print("=" * 60)

src = FEMALE.read_text(encoding="utf-8")

# Validacao ANTES
ok, msg = validar(src, "femaleMatrix ANTES")
print(f"  {msg}")
if not ok:
    print("  ABORT: arquivo invalido antes de editar.")
    sys.exit(1)

# ETAPA 1: Remover ID 115 atual (que captura ambos)
print()
print("ETAPA 1: Removendo ID 115 atual (mistura gestante/nao-gestante)")

# Achar o bloco completo da ID 115 atual
# Vai do '{' que abre o objeto ate o '},' que fecha
m_id = re.search(r"^\s*\{\s*\n\s*id:\s*115,", src, re.MULTILINE)
if not m_id:
    print("  AVISO: ID 115 nao encontrado para remover.")
else:
    # Achar inicio do '{' (subir ate antes do '{' inclusive um '\n  // ...' opcional)
    inicio = m_id.start()
    # Subir para incluir comentario anterior (// ID 115 ...) se existir
    while inicio > 0 and src[inicio - 1] in (' ', '\t'):
        inicio -= 1
    if inicio > 0 and src[inicio - 1] == '\n':
        # Verificar se a linha anterior eh um comentario
        prev_line_start = src.rfind('\n', 0, inicio - 1) + 1
        prev_line = src[prev_line_start:inicio - 1]
        if prev_line.strip().startswith('//') and 'ID 115' in prev_line:
            inicio = prev_line_start

    # Achar o fim: '},\n' apos o objeto
    # Procurar a partir de inicio o proximo '},\n'
    nivel = 0
    fim = m_id.start()
    for i in range(m_id.start(), len(src)):
        if src[i] == '{':
            nivel += 1
        elif src[i] == '}':
            nivel -= 1
            if nivel == 0:
                # Encontrou o '}' que fecha o objeto principal
                # Pegar ate o ',' apos
                fim = i + 1
                if fim < len(src) and src[fim] == ',':
                    fim += 1
                if fim < len(src) and src[fim] == '\n':
                    fim += 1
                break

    bloco_removido = src[inicio:fim]
    print(f"  Bloco removido ({len(bloco_removido)} chars):")
    primeiras_linhas = bloco_removido.split('\n')[:3]
    for l in primeiras_linhas:
        print(f"    {l[:100]}")
    src = src[:inicio] + src[fim:]
    print("  OK: ID 115 antiga removida.")

# ETAPA 2: Inserir ID 115 e ID 116 antes do '];' final
print()
print("ETAPA 2: Inserindo ID 115 (nao-gestante) e ID 116 (gestante)")

m_fim = re.search(r"\]\s*;", src)
if not m_fim:
    print("  ABORT: '];' final nao encontrado.")
    sys.exit(1)

idx_fim = m_fim.start()
antes_fim = src[:idx_fim]

# Garantir virgula apos ultimo objeto
if antes_fim.rstrip().endswith("}"):
    antes_fim = antes_fim.rstrip() + ","

nova_src = antes_fim.rstrip() + "\n" + ID_115 + "\n" + ID_116 + "\n];\n"

# Validacao APOS
ok, msg = validar(nova_src, "femaleMatrix APOS")
print(f"  {msg}")
if not ok:
    print("  ABORT: arquivo ficaria invalido.")
    sys.exit(1)

if "id: 115," not in nova_src or "id: 116," not in nova_src:
    print("  ABORT: ID 115 ou 116 nao foi inserida corretamente.")
    sys.exit(1)

# Salvar
FEMALE.write_text(nova_src, encoding="utf-8")
print("  OK: ID 115 e ID 116 inseridas.")

# ============================================================
print()
print("=" * 60)
print("SUCESSO!")
print("=" * 60)
print()
print("Resumo das entradas:")
print()
print("  ID 115 - BARIATRICA NAO-GESTANTE")
print("    Hb 12.0-15.5  |  Ferr 0-23  |  bariatrica:true  gestante:false")
print()
print("  ID 116 - BARIATRICA GESTANTE")
print("    Hb 11.0-14.0  |  Ferr 0-23  |  bariatrica:true  gestante:true")
print()
print("Proximos passos (fluxo testado):")
print()
print("  1. npm run build")
print("  2. npm run preview")
print("  3. Janela ANONIMA -> http://localhost:4173/")
print()
print("  Caso 1 (ID 115 - nao-gestante):")
print("    F 35a, Hb 13, Ferr 15, VCM 82, RDW 15, Sat 17 + bariatrica")
print("    Esperado: BARIATRICA COM SIDEROPENIA INCIPIENTE PRE-ANEMICA")
print()
print("  Caso 2 (ID 116 - gestante):")
print("    F 30a, Hb 12, Ferr 15, VCM 82, RDW 15, Sat 17 + bariatrica + gestante 20sem")
print("    Esperado: GESTANTE BARIATRICA COM SIDEROPENIA INCIPIENTE")
print()
print("Se OK localmente:")
print('  git add . && git commit -m "feat: ID 115 nao-gestante + ID 116 gestante (separadas)" && git push origin main')
