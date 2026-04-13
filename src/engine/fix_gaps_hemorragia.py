# -*- coding: utf-8 -*-
# RedFairy — fix_gaps_hemorragia.py
# Corrige gaps nos IDs de hemorragia (perda=True)
# Execute em: C:\Users\Estacio\Desktop\redfairy\src\engine
# python fix_gaps_hemorragia.py

import os, re

dir_ = os.path.dirname(os.path.abspath(__file__))
fem  = os.path.join(dir_, 'femaleMatrix.js')
mal  = os.path.join(dir_, 'maleMatrix.js')

fixes = []

# ─────────────────────────────────────────────────────────────────────────────
# CORREÇÃO PRINCIPAL: ID 35 — ampliar satTransf de 0-19 para 0-50
# Clínica: hemorragia crônica com ferritina baixa e anemia importante
# A saturação pode estar em qualquer nível nesse contexto
# ─────────────────────────────────────────────────────────────────────────────

for path, label in [(fem, 'femaleMatrix'), (mal, 'maleMatrix')]:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # ID 35: satTransf 0-19 → 0-50
    old35 = """    id: 35,
    label: "ANEMIA IMPORTANTE COM HISTÓRICO DE HEMORRAGIA + SIDEROPENIA",
    color: "red",
    conditions: {
      ferritina:   { min: 0,   max: 23   },
      hemoglobina: { min: 8.0, max: 12.4 },
      vcm:         { min: 0,   max: 79   },
      rdw:         { min: 15.1,max: 999  },
      satTransf:   { min: 0,   max: 19   },"""

    new35 = """    id: 35,
    label: "ANEMIA IMPORTANTE COM HISTÓRICO DE HEMORRAGIA + SIDEROPENIA",
    color: "red",
    conditions: {
      ferritina:   { min: 0,   max: 23   },
      hemoglobina: { min: 8.0, max: 12.4 },
      vcm:         { min: 0,   max: 79   },
      rdw:         { min: 15.1,max: 999  },
      satTransf:   { min: 0,   max: 50   },"""

    if old35 in content:
        content = content.replace(old35, new35)
        fixes.append(f"✅ {label} ID 35: satTransf 0-19 → 0-50")
    else:
        fixes.append(f"❌ {label} ID 35: não encontrado")

    # ID 36: satTransf 0-19 → 0-50 (mesma lógica para anemia grave)
    old36 = """    id: 36,
    label: "ANEMIA GRAVE COM HISTÓRICO DE HEMORRAGIA + SIDEROPENIA",
    color: "red",
    conditions: {
      ferritina:   { min: 0,   max: 23   },
      hemoglobina: { min: 3.0, max: 7.9  },
      vcm:         { min: 0,   max: 79   },
      rdw:         { min: 17.1,max: 999  },
      satTransf:   { min: 0,   max: 19   },"""

    new36 = """    id: 36,
    label: "ANEMIA GRAVE COM HISTÓRICO DE HEMORRAGIA + SIDEROPENIA",
    color: "red",
    conditions: {
      ferritina:   { min: 0,   max: 23   },
      hemoglobina: { min: 3.0, max: 7.9  },
      vcm:         { min: 0,   max: 79   },
      rdw:         { min: 15.1,max: 999  },
      satTransf:   { min: 0,   max: 50   },"""

    if old36 in content:
        content = content.replace(old36, new36)
        fixes.append(f"✅ {label} ID 36: satTransf 0-19 → 0-50, rdw 17.1 → 15.1")
    else:
        fixes.append(f"❌ {label} ID 36: não encontrado")

    # ID 94: satTransf 0-19 → 0-50
    old94 = """      satTransf:   { min: 0,   max: 19   },
      bariatrica:  false,
      vegetariano: false,
      perda:       true,
      alcoolista:  false,
      transfundido: false,
    },
    diagnostico: "MODERADA ANEMIA MICROCÍTICA COM SIDEROPENIA ACENTUADA"""

    new94 = """      satTransf:   { min: 0,   max: 50   },
      bariatrica:  false,
      vegetariano: false,
      perda:       true,
      alcoolista:  false,
      transfundido: false,
    },
    diagnostico: "MODERADA ANEMIA MICROCÍTICA COM SIDEROPENIA ACENTUADA"""

    if old94 in content:
        content = content.replace(old94, new94)
        fixes.append(f"✅ {label} ID 94: satTransf 0-19 → 0-50")
    else:
        fixes.append(f"⚠️  {label} ID 94: não encontrado (pode não existir)")

    # ID 95: satTransf 0-19 → 0-50
    old95 = """      satTransf:   { min: 0,   max: 19   },
      bariatrica:  false,
      vegetariano: false,
      perda:       true,
      alcoolista:  false,
      transfundido: false,
    },
    diagnostico: "ANEMIA COM VCM NORMAL, ANISOCITOSE E SIDEROPENIA"""

    new95 = """      satTransf:   { min: 0,   max: 50   },
      bariatrica:  false,
      vegetariano: false,
      perda:       true,
      alcoolista:  false,
      transfundido: false,
    },
    diagnostico: "ANEMIA COM VCM NORMAL, ANISOCITOSE E SIDEROPENIA"""

    if old95 in content:
        content = content.replace(old95, new95)
        fixes.append(f"✅ {label} ID 95: satTransf 0-19 → 0-50")
    else:
        fixes.append(f"⚠️  {label} ID 95: não encontrado (pode não existir)")

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

# ─────────────────────────────────────────────────────────────────────────────
# NOVOS IDs para cobrir gaps restantes
# GAP 2: Hb 8-12.4 + VCM microcítico + Sat 20-50 + Ferr 24-336 (inflamação + hemorragia)
# Inserir nas duas matrizes
# ─────────────────────────────────────────────────────────────────────────────

novo_id_fem = """
  // ─── ID 100F — ANEMIA FERROPRIVA COM HEMORRAGIA E INFLAMAÇÃO ASSOCIADA ────
  {
    id: 100,
    label: "ANEMIA FERROPRIVA COM HEMORRAGIA E INFLAMAÇÃO ASSOCIADA",
    color: "red",
    conditions: {
      ferritina:   { min: 24,  max: 400  },
      hemoglobina: { min: 8.0, max: 12.4 },
      vcm:         { min: 0,   max: 79   },
      rdw:         { min: 15.1,max: 999  },
      satTransf:   { min: 0,   max: 50   },
      bariatrica:  false,
      vegetariano: false,
      perda:       true,
      alcoolista:  false,
      transfundido: false,
    },
    diagnostico: "ANEMIA MICROCÍTICA IMPORTANTE COM HISTÓRICO DE HEMORRAGIA E FERRITINA NORMAL OU ELEVADA. A FERRITINA PODE ESTAR FALSAMENTE ELEVADA COMO PROTEÍNA DE FASE AGUDA ASSOCIADA À INFLAMAÇÃO, MASCARANDO A DEPLEÇÃO REAL DE FERRO. A SATURAÇÃO DA TRANSFERRINA BAIXA OU NORMAL REFORÇA O COMPONENTE FERROPÊNICO. REQUERE INVESTIGAÇÃO E INTERVENÇÃO MÉDICA IMEDIATA.\\nFRASE DATA",
    recomendacaoAge1: "AVALIAÇÃO URGENTE COM HEMATOLOGISTA.\\nPARA EXAMES ENDOSCÓPICOS, A HEMOGLOBINA MÍNIMA É 10 g/dL, ABAIXO DESSE NÍVEL SERÁ NECESSÁRIO TRANSFUNDIR.\\nVOCÊ NÃO PODERIA DOAR SANGUE.",
    recomendacaoAge2: "AVALIAÇÃO URGENTE COM HEMATOLOGISTA.\\nNESSA FAIXA ETÁRIA, A ANEMIA IMPÕE MAIOR IMPACTO METABÓLICO.\\nVOCÊ NÃO PODERIA DOAR SANGUE.",
    comentarioAspirina: "ASPIRINA PRODUZ PEQUENA PERDA CRÔNICA DE SANGUE EM MUITOS USUÁRIOS. PODE REDUZIR A RESERVA DE FERRO E AGRAVAR A ANEMIA. ASPIRINA PODE AGRAVAR OUTRAS HEMORRAGIAS. CONSIDERE REVER A PRESCRIÇÃO.",
    comentarioB12: "A REPOSIÇÃO DE VITAMINA B12 DEVE TER SIDO DESNECESSÁRIA, MAS DIFICILMENTE PRODUZIRIA ALGUM DANO. NA VIGÊNCIA DE HEMORRAGIA, A NECESSIDADE BIOLÓGICA ESTARÁ AUMENTADA.",
    comentarioFerro: "A DOSE DE FERRO FOI INSUFICIENTE PARA CORRIGIR A ANEMIA. A FERRITINA ELEVADA NÃO EXCLUI DEFICIÊNCIA DE FERRO SE HÁ INFLAMAÇÃO — A SATURAÇÃO DA TRANSFERRINA É MAIS FIDEDIGNA NESSE CONTEXTO. MAS CUIDADO AO REPOR FERRO, ESPECIALMENTE SE PARENTERAL: O EXCESSO É NOCIVO.",
    proximosExames: ["HEMOGRAMA","RETICULÓCITOS","FERRITINA","SATURAÇÃO DA TRANSFERRINA","PCR","VHS","SANGUE NAS FEZES","VITAMINA B12","HAPTOGLOBINA","LDH","COOMBS DIRETO","CEA","CA 19.9","CREATININA","ENDOSCOPIA DIGESTIVA","COLONOSCOPIA","CA 125"],
  },
"""

novo_id_mal = """
  // ─── ID 100M — ANEMIA FERROPRIVA COM HEMORRAGIA E INFLAMAÇÃO ASSOCIADA ────
  {
    id: 100,
    label: "ANEMIA FERROPRIVA COM HEMORRAGIA E INFLAMAÇÃO ASSOCIADA",
    color: "red",
    conditions: {
      ferritina:   { min: 24,  max: 400  },
      hemoglobina: { min: 8.0, max: 12.4 },
      vcm:         { min: 0,   max: 79   },
      rdw:         { min: 15.1,max: 999  },
      satTransf:   { min: 0,   max: 50   },
      bariatrica:  false,
      vegetariano: false,
      perda:       true,
      alcoolista:  false,
      transfundido: false,
    },
    diagnostico: "ANEMIA MICROCÍTICA IMPORTANTE COM HISTÓRICO DE HEMORRAGIA E FERRITINA NORMAL OU ELEVADA. A FERRITINA PODE ESTAR FALSAMENTE ELEVADA COMO PROTEÍNA DE FASE AGUDA ASSOCIADA À INFLAMAÇÃO, MASCARANDO A DEPLEÇÃO REAL DE FERRO. A SATURAÇÃO DA TRANSFERRINA BAIXA OU NORMAL REFORÇA O COMPONENTE FERROPÊNICO. REQUERE INVESTIGAÇÃO E INTERVENÇÃO MÉDICA IMEDIATA.\\nFRASE DATA",
    recomendacaoAge1: "AVALIAÇÃO URGENTE COM HEMATOLOGISTA.\\nPARA EXAMES ENDOSCÓPICOS, A HEMOGLOBINA MÍNIMA É 10 g/dL, ABAIXO DESSE NÍVEL SERÁ NECESSÁRIO TRANSFUNDIR.\\nVOCÊ NÃO PODERIA DOAR SANGUE.",
    recomendacaoAge2: "AVALIAÇÃO URGENTE COM HEMATOLOGISTA.\\nNESSA FAIXA ETÁRIA, A ANEMIA IMPÕE MAIOR IMPACTO METABÓLICO.\\nVOCÊ NÃO PODERIA DOAR SANGUE.",
    comentarioAspirina: "ASPIRINA PRODUZ PEQUENA PERDA CRÔNICA DE SANGUE EM MUITOS USUÁRIOS. PODE REDUZIR A RESERVA DE FERRO E AGRAVAR A ANEMIA. ASPIRINA PODE AGRAVAR OUTRAS HEMORRAGIAS. CONSIDERE REVER A PRESCRIÇÃO.",
    comentarioB12: "A REPOSIÇÃO DE VITAMINA B12 DEVE TER SIDO DESNECESSÁRIA, MAS DIFICILMENTE PRODUZIRIA ALGUM DANO. NA VIGÊNCIA DE HEMORRAGIA, A NECESSIDADE BIOLÓGICA ESTARÁ AUMENTADA.",
    comentarioFerro: "A DOSE DE FERRO FOI INSUFICIENTE PARA CORRIGIR A ANEMIA. A FERRITINA ELEVADA NÃO EXCLUI DEFICIÊNCIA DE FERRO SE HÁ INFLAMAÇÃO — A SATURAÇÃO DA TRANSFERRINA É MAIS FIDEDIGNA NESSE CONTEXTO. MAS CUIDADO AO REPOR FERRO, ESPECIALMENTE SE PARENTERAL: O EXCESSO É NOCIVO.",
    proximosExames: ["HEMOGRAMA","RETICULÓCITOS","FERRITINA","SATURAÇÃO DA TRANSFERRINA","PCR","VHS","SANGUE NAS FEZES","VITAMINA B12","HAPTOGLOBINA","LDH","COOMBS DIRETO","CEA","CA 19.9","CREATININA","ENDOSCOPIA DIGESTIVA","COLONOSCOPIA","PSA"],
  },
"""

for path, label, novo in [(fem,'femaleMatrix',novo_id_fem),(mal,'maleMatrix',novo_id_mal)]:
    with open(path,'r',encoding='utf-8') as f:
        content = f.read()
    if 'id: 100,' not in content:
        content = content.rstrip()
        if content.endswith('];'):
            content = content[:-2] + novo + '\n];\n'
        with open(path,'w',encoding='utf-8') as f:
            f.write(content)
        fixes.append(f"✅ {label}: ID 100 adicionado (hemorragia + inflamação)")
    else:
        fixes.append(f"ℹ️  {label}: ID 100 já existe")

print("=== CORREÇÕES APLICADAS ===")
for f in fixes: print(f"  {f}")
print("\nAgora rode:")
print('  git add . && git commit -m "fix: gaps hemorragia IDs 35/36/94/95 + novo ID 100" && git push origin main')
