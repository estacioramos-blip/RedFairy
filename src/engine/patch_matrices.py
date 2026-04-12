#!/usr/bin/env python3
"""
RedFairy — Patch das matrizes clínicas
Execute em: C:\\Users\\Estacio\\Desktop\\redfairy\\src\\engine\\

python patch_matrices.py
"""

import re, os, sys

BASE = os.path.dirname(os.path.abspath(__file__))
FEM  = os.path.join(BASE, 'femaleMatrix.js')
MAL  = os.path.join(BASE, 'maleMatrix.js')
OBA  = os.path.join(BASE, 'obaEngine.js')
DEC  = os.path.join(BASE, 'decisionEngine.js')

errors = []

def patch_file(path, replacements, label):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    original = content
    for old, new, desc in replacements:
        if old in content:
            content = content.replace(old, new)
            print(f"  ✅ {label}: {desc}")
        else:
            print(f"  ⚠️  {label}: NÃO ENCONTRADO — {desc}")
            errors.append(f"{label}: {desc}")
    if content != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  💾 {label} salvo.")
    return content

# ─── FEMALE MATRIX ────────────────────────────────────────────────────────────
print("\n🔧 Corrigindo femaleMatrix.js...")

fem_patches = [
    # ID 61 — Talassemia minor: RDW max 16 → 14.5
    (
        '      rdw:         { min: 13,  max: 16   },\n      satTransf:   { min: 20,  max: 100  },\n      bariatrica:  false,\n      vegetariano: false,\n      perda:       false,\n      alcoolista:  false,\n      transfundido: false,\n      transfundido: false,\n      transfundido: false,\n    },\n    diagnostico: "MODERADA ANEMIA MICROCÍTICA, COM LEVE ANISOCITOSE, SEM SIDEROPENIA. SE NÃO HÁ COMORBIDADES, ESSE PADRÃO É COMPATÍVEL COM TALASSEMIA MINOR.',
        '      rdw:         { min: 13,  max: 14.5 },\n      satTransf:   { min: 20,  max: 100  },\n      bariatrica:  false,\n      vegetariano: false,\n      perda:       false,\n      alcoolista:  false,\n      transfundido: false,\n    },\n    diagnostico: "MODERADA ANEMIA MICROCÍTICA, COM LEVE ANISOCITOSE, SEM SIDEROPENIA. SE NÃO HÁ COMORBIDADES, ESSE PADRÃO É COMPATÍVEL COM TALASSEMIA MINOR. NA AUSÊNCIA DE SIDEROPENIA CONFIRMADA, A SUPLEMENTAÇÃO DE FERRO É GERALMENTE DESNECESSÁRIA E PODE SER NOCIVA — INVESTIGAR ANTES DE PRESCREVER.',
        'ID 61 rdw.max 16→14.5 + comentário ferro mais preciso'
    ),
    # ID 62 — Anemia inflamação: Hb max 13.4 → 11.9
    (
        '      hemoglobina: { min: 10.0,max: 13.4 },\n      vcm:         { min: 80,  max: 100  },\n      rdw:         { min: 15.1,max: 16   },\n      satTransf:   { min: 20,  max: 100  },\n      bariatrica:  false,\n      vegetariano: false,\n      perda:       false,\n      alcoolista:  false,\n      transfundido: false,\n      transfundido: false,\n      transfundido: false,\n    },\n    diagnostico: "ANEMIA NORMOCRÔMICA LEVE A MODERADA, COM ANISOCITOSE E FERRITINA NORMAL OU AUMENTADA COM SATURAÇÃO DA TRANSFERRINA NORMAL É UM PADRÃO OBSERVADO NA DOENÇA INFLAMATÓRIA SISTÊMICA',
        '      hemoglobina: { min: 10.0,max: 11.9 },\n      vcm:         { min: 80,  max: 100  },\n      rdw:         { min: 15.1,max: 16   },\n      satTransf:   { min: 20,  max: 100  },\n      bariatrica:  false,\n      vegetariano: false,\n      perda:       false,\n      alcoolista:  false,\n      transfundido: false,\n    },\n    diagnostico: "ANEMIA NORMOCRÔMICA LEVE A MODERADA, COM ANISOCITOSE E FERRITINA NORMAL OU AUMENTADA COM SATURAÇÃO DA TRANSFERRINA NORMAL É UM PADRÃO OBSERVADO NA DOENÇA INFLAMATÓRIA SISTÊMICA',
        'ID 62 Hb.max 13.4→11.9 (só anemia real)'
    ),
    # ID 63 — ferritina min 40 → 25
    (
        '      ferritina:   { min: 40,  max: 400  },\n      hemoglobina: { min: 8.0, max: 9.9  },\n      vcm:         { min: 80,  max: 100  },\n      rdw:         { min: 15.1,max: 17.9 },',
        '      ferritina:   { min: 25,  max: 400  },\n      hemoglobina: { min: 8.0, max: 9.9  },\n      vcm:         { min: 80,  max: 100  },\n      rdw:         { min: 15.1,max: 17.9 },',
        'ID 63 ferritina.min 40→25'
    ),
    # ID 64 — ferritina min 100 → 25
    (
        '      ferritina:   { min: 100, max: 400  },\n      hemoglobina: { min: 3.0, max: 6.9  },\n      vcm:         { min: 75,  max: 100  },\n      rdw:         { min: 15.1,max: 20   },',
        '      ferritina:   { min: 25,  max: 400  },\n      hemoglobina: { min: 3.0, max: 6.9  },\n      vcm:         { min: 75,  max: 100  },\n      rdw:         { min: 15.1,max: 20   },',
        'ID 64 ferritina.min 100→25'
    ),
]

# Remover transfundido duplicado em todas as entradas da femaleMatrix
with open(FEM, 'r', encoding='utf-8') as f:
    fem_content = f.read()

# Conta duplicatas antes
before = fem_content.count('      transfundido: false,\n      transfundido: false,')
# Remove sequências duplicadas (mantém apenas 1)
fem_content_clean = re.sub(
    r'(      transfundido: false,\n)(      transfundido: false,\n)+(      transfundido: false,\n)',
    r'\1',
    fem_content
)
fem_content_clean = re.sub(
    r'(      transfundido: false,\n)(      transfundido: false,\n)',
    r'\1',
    fem_content_clean
)
after = fem_content_clean.count('      transfundido: false,\n      transfundido: false,')
print(f"  ✅ femaleMatrix: transfundido duplicado removido ({before} ocorrências → {after})")

with open(FEM, 'w', encoding='utf-8') as f:
    f.write(fem_content_clean)

# Aplicar outros patches
patch_file(FEM, fem_patches, 'femaleMatrix')

# Remover entradas duplicadas (IDs 37-54 que aparecem 2x)
with open(FEM, 'r', encoding='utf-8') as f:
    fem_content = f.read()

# Detectar e remover segunda ocorrência dos IDs 37-54
# O padrão é: depois do ID 79 (ANEMIA HEMOLÍTICA GRAVE), aparece novamente ID 37
# Vamos encontrar o ponto onde começa a duplicação
marker_first  = "// ─── ID 37 — BARIÁTRICA VEGETARIANA SEM ANEMIA ───────────"
marker_second = "// ─── ID 37 — BARIÁTRICA VEGETARIANA SEM ANEMIA OU SIDEROPENIA ─────────────"

# Estratégia: encontrar a SEGUNDA ocorrência de id: 37 e cortar tudo
# entre o começo da segunda ocorrência e o começo do ID 55 (que continua correto após 54)
# ou até o ID 80 (ERITROCITOSE)

# Contar ocorrências de id: 37 com label "BARIÁTRICA VEGETARIANA"
pattern = r'  \{\s*\n    id: 37,'
matches = list(re.finditer(pattern, fem_content))
print(f"  🔍 femaleMatrix: {len(matches)} ocorrência(s) de id: 37")

if len(matches) >= 2:
    # Pegar o início da segunda ocorrência
    start_dup = matches[1].start()
    # Encontrar onde a segunda sequência de duplicados termina
    # (antes do ID 55, 61, 62, etc. que não são duplicados)
    # Vamos procurar pelo ID 55 que vem logo após os duplicados
    pattern_55 = r'  \{\s*\n    id: 55,'
    matches_55 = list(re.finditer(pattern_55, fem_content))
    
    if len(matches_55) >= 2:
        end_dup = matches_55[1].start()
    else:
        # Fallback: usar ID 80
        pattern_80 = r'  \{\s*\n    id: 80,'
        matches_80 = list(re.finditer(pattern_80, fem_content))
        end_dup = matches_80[0].start() if matches_80 else len(fem_content)
    
    chars_removed = end_dup - start_dup
    fem_content = fem_content[:start_dup] + fem_content[end_dup:]
    print(f"  ✅ femaleMatrix: {chars_removed} chars de duplicatas removidos (IDs 37-54)")
    
    with open(FEM, 'w', encoding='utf-8') as f:
        f.write(fem_content)
else:
    print("  ℹ️  femaleMatrix: duplicatas de ID 37 não detectadas (já corrigido?)")

# Adicionar novos IDs no final (antes do fechamento ]
print("\n  ➕ femaleMatrix: adicionando IDs 96F e 97F...")
new_entries_fem = '''
  // ─── ID 96 — ALCOOLISTA SAUDÁVEL ───────────────────────────────────────────
  {
    id: 96,
    label: "ALCOOLISTA COM ERITRON PRESERVADO",
    color: "yellow",
    conditions: {
      ferritina:   { min: 25,  max: 150  },
      hemoglobina: { min: 12.0,max: 15.5 },
      vcm:         { min: 80,  max: 100  },
      rdw:         { min: 11.5,max: 15.0 },
      satTransf:   { min: 20,  max: 50   },
      bariatrica:  false,
      vegetariano: false,
      perda:       false,
      alcoolista:  true,
      transfundido: false,
    },
    diagnostico: "ERITRON PRESERVADO EM ALCOOLISTA. O ÁLCOOL INTERFERE NO METABOLISMO DO FOLATO E DA VITAMINA B12, E A DIETA DO ALCOOLISTA COSTUMA SER DEFICIENTE NESSES NUTRIENTES. MESMO COM HEMOGRAMA NORMAL, HÁ RISCO PROGRESSIVO DE ANEMIA MACROCÍTICA, DANO HEPÁTICO E DÉFICIT NEUROLÓGICO. FERRITINA ELEVADA EM ALCOOLISTA PODE REFLETIR HEPATOPATIA E NÃO EXCESSO DE FERRO REAL. FRASE DATA.",
    recomendacaoAge1: "AVALIAÇÃO COM HEMATOLOGISTA. DOSAGEM DE FOLATOS, VITAMINA B12, GAMA-GT, AST/ALT E VITAMINA D É INDISPENSÁVEL. O ÁLCOOL DEVE SER SUSPENSO OU REDUZIDO. SUPLEMENTAÇÃO DE ÁCIDO FÓLICO É RECOMENDÁVEL.",
    recomendacaoAge2: "AVALIAÇÃO COM HEMATOLOGISTA. NESSA FAIXA ETÁRIA O USO CRÔNICO DE ÁLCOOL IMPÕE MAIOR RISCO DE DANO HEPÁTICO, NEUROLÓGICO E CARDIOVASCULAR. DOSAGEM DE FOLATOS, VITAMINA B12, GAMA-GT E AST/ALT É INDISPENSÁVEL.",
    comentarioAspirina: "ASPIRINA PRODUZ PEQUENA PERDA CRÔNICA DE SANGUE EM MUITAS USUÁRIAS. EM ALCOOLISTA, O RISCO DE SANGRAMENTO GASTROINTESTINAL ESTÁ AUMENTADO. AVALIAR BENEFÍCIO/RISCO.",
    comentarioB12: "A REPOSIÇÃO DE VITAMINA B12 PODE TER SIDO BENÉFICA. A ALCOOLISTA FREQUENTEMENTE TEM DÉFICIT COMBINADO DE FOLATOS E B12. A DOSAGEM NO SANGUE DEVE SER USADA PARA AJUSTES.",
    comentarioFerro: "O FERRO FOI PROVAVELMENTE DESNECESSÁRIO. A FERRITINA PODE ESTAR ELEVADA POR HEPATOPATIA ALCOÓLICA SEM EXCESSO REAL DE FERRO. CUIDADO AO REPOR FERRO, ESPECIALMENTE SE PARENTERAL: O EXCESSO É NOCIVO.",
    proximosExames: ["HEMOGRAMA","RETICULÓCITOS","FERRITINA","SATURAÇÃO DA TRANSFERRINA","FOLATOS","VITAMINA B12","LDH","AST/ALT","GAMA-GT","TSH","BILIRRUBINAS","COLONOSCOPIA DE ROTINA","CEA","CA 15.3","CA 125"],
  },
  // ─── ID 97 — BARIÁTRICA COM MACROCITOSE SEM ANEMIA ─────────────────────────
  {
    id: 97,
    label: "BARIÁTRICA COM MACROCITOSE SEM ANEMIA",
    color: "yellow",
    conditions: {
      ferritina:   { min: 25,  max: 9999 },
      hemoglobina: { min: 12.0,max: 15.5 },
      vcm:         { min: 101, max: 999  },
      rdw:         { min: 15.1,max: 999  },
      satTransf:   { min: 20,  max: 50   },
      bariatrica:  true,
      vegetariano: false,
      perda:       false,
      alcoolista:  false,
      transfundido: false,
    },
    diagnostico: "MACROCITOSE SEM ANEMIA EM PACIENTE BARIÁTRICA. A FERRITINA ESTÁ NORMAL E HÁ RESERVA DE FERRO. A MACROCITOSE INDICA DÉFICIT INCIPIENTE DE VITAMINA B12 DECORRENTE DO DÉFICIT ABSORTIVO DA CIRURGIA, OU USO DE METFORMINA OU INIBIDORES DA BOMBA DE PRÓTONS. TAMBÉM PODE OCORRER POR DÉFICIT DE FOLATOS. ESSE PADRÃO PRECEDE A ANEMIA MACROCÍTICA — INTERVENÇÃO AGORA PREVINE DANO NEUROLÓGICO. A REPOSIÇÃO DE VITAMINA B12 POR VIA ORAL NÃO FUNCIONA NA BARIÁTRICA. FRASE DATA.",
    recomendacaoAge1: "AVALIAÇÃO COM HEMATOLOGISTA. A REPOSIÇÃO DE VITAMINA B12 POR VIA SUBLINGUAL OU PARENTERAL É OBRIGATÓRIA. DOSAR VITAMINA B12 E FOLATOS NO SANGUE PARA AJUSTAR A DOSE. SE VOCÊ DOOU SANGUE NOS ÚLTIMOS MESES, PODE TER SIDO PREJUDICIAL.",
    recomendacaoAge2: "AVALIAÇÃO COM HEMATOLOGISTA. NESSA FAIXA ETÁRIA, MACROCITOSE EM BARIÁTRICA PODE TER IMPACTO NEUROLÓGICO SILENCIOSO. DOSAR VITAMINA B12 E FOLATOS. VITAMINA B12 SUBLINGUAL OU PARENTERAL É OBRIGATÓRIA.",
    comentarioAspirina: "ASPIRINA PRODUZ PEQUENA PERDA CRÔNICA DE SANGUE EM MUITAS USUÁRIAS. NO CONTEXTO BARIÁTRICO, PODE AGRAVAR A DEPLEÇÃO DE FERRO A MÉDIO PRAZO.",
    comentarioB12: "A REPOSIÇÃO DE VITAMINA B12 ORAL NÃO FUNCIONA NA BARIÁTRICA. SE A MACROCITOSE NÃO CORRIGIR COM VIA SUBLINGUAL, USE VIA PARENTERAL. A DOSAGEM NO SANGUE DEVE SER USADA PARA AJUSTES.",
    comentarioFerro: "A FERRITINA E A SATURAÇÃO DA TRANSFERRINA NORMAIS SINALIZAM QUE A REPOSIÇÃO FOI ADEQUADA PARA O FERRO. O PROBLEMA AQUI É A VITAMINA B12, NÃO O FERRO. CUIDADO AO REPOR FERRO, ESPECIALMENTE SE PARENTERAL: O EXCESSO É NOCIVO.",
    proximosExames: ["HEMOGRAMA","RETICULÓCITOS","FERRITINA","SATURAÇÃO DA TRANSFERRINA","VITAMINA B12","FOLATOS","ZINCO","ANTI-FATOR INTRÍNSECO","ANTI-CÉLULAS PARIETAIS","COLONOSCOPIA DE ROTINA","CEA","CA 15.3","CA 125"],
  },
'''

with open(FEM, 'r', encoding='utf-8') as f:
    fem_content = f.read()

# Inserir antes do fechamento ];
if new_entries_fem.strip().split('\n')[2].strip() not in fem_content:
    fem_content = fem_content.rstrip()
    if fem_content.endswith('];'):
        fem_content = fem_content[:-2] + new_entries_fem + '\n];\n'
    with open(FEM, 'w', encoding='utf-8') as f:
        f.write(fem_content)
    print("  ✅ femaleMatrix: IDs 96 e 97 adicionados")
else:
    print("  ℹ️  femaleMatrix: IDs 96/97 já presentes")

# ─── MALE MATRIX ──────────────────────────────────────────────────────────────
print("\n🔧 Corrigindo maleMatrix.js...")

mal_patches = [
    # ID 61 — Talassemia minor: RDW max 16 → 14.5
    (
        '      rdw:         { min: 13,  max: 16   },\n      satTransf:   { min: 20,  max: 100  },\n      bariatrica:  false,\n      vegetariano: false,\n      perda:       false,\n      alcoolista:  false,\n      transfundido: false,\n    },\n    diagnostico: "MODERADA ANEMIA MICROCÍTICA, COM LEVE ANISOCITOSE, SEM SIDEROPENIA.\nSE NÃO HÁ COMORBIDADES, ESSE PADRÃO É COMPATÍVEL COM TALASSEMIA MINOR.',
        '      rdw:         { min: 13,  max: 14.5 },\n      satTransf:   { min: 20,  max: 100  },\n      bariatrica:  false,\n      vegetariano: false,\n      perda:       false,\n      alcoolista:  false,\n      transfundido: false,\n    },\n    diagnostico: "MODERADA ANEMIA MICROCÍTICA, COM LEVE ANISOCITOSE, SEM SIDEROPENIA.\nSE NÃO HÁ COMORBIDADES, ESSE PADRÃO É COMPATÍVEL COM TALASSEMIA MINOR. NA AUSÊNCIA DE SIDEROPENIA CONFIRMADA, A SUPLEMENTAÇÃO DE FERRO É GERALMENTE DESNECESSÁRIA E PODE SER NOCIVA — INVESTIGAR ANTES DE PRESCREVER.',
        'ID 61 rdw.max 16→14.5'
    ),
]
patch_file(MAL, mal_patches, 'maleMatrix')

# Adicionar ID 98M (Alcoolista saudável masculino) e 99M (Bariátrico macrocitose) na maleMatrix
new_entries_mal = '''
  // ─── ID 98 — ALCOOLISTA SAUDÁVEL ────────────────────────────────────────────
  {
    id: 98,
    label: "ALCOOLISTA COM ERITRON PRESERVADO",
    color: "yellow",
    conditions: {
      ferritina:   { min: 24,  max: 336  },
      hemoglobina: { min: 13.5,max: 17.5 },
      vcm:         { min: 80,  max: 100  },
      rdw:         { min: 11.5,max: 15.0 },
      satTransf:   { min: 20,  max: 50   },
      bariatrica:  false,
      vegetariano: false,
      perda:       false,
      alcoolista:  true,
      transfundido: false,
    },
    diagnostico: "ERITRON PRESERVADO EM ALCOOLISTA. O ÁLCOOL INTERFERE NO METABOLISMO DO FOLATO E DA VITAMINA B12, E A DIETA DO ALCOOLISTA COSTUMA SER DEFICIENTE NESSES NUTRIENTES. MESMO COM HEMOGRAMA NORMAL, HÁ RISCO PROGRESSIVO DE ANEMIA MACROCÍTICA, DANO HEPÁTICO E DÉFICIT NEUROLÓGICO. FERRITINA ELEVADA EM ALCOOLISTA PODE REFLETIR HEPATOPATIA, NÃO EXCESSO DE FERRO REAL. FRASE DATA.",
    recomendacaoAge1: "AVALIAÇÃO COM HEMATOLOGISTA. DOSAGEM DE FOLATOS, VITAMINA B12, GAMA-GT, AST/ALT E VITAMINA D É INDISPENSÁVEL. O ÁLCOOL DEVE SER SUSPENSO OU REDUZIDO. SUPLEMENTAÇÃO DE ÁCIDO FÓLICO É RECOMENDÁVEL.",
    recomendacaoAge2: "AVALIAÇÃO COM HEMATOLOGISTA. NESSA FAIXA ETÁRIA O USO CRÔNICO DE ÁLCOOL IMPÕE MAIOR RISCO DE DANO HEPÁTICO, NEUROLÓGICO E CARDIOVASCULAR. DOSAGEM DE FOLATOS, VITAMINA B12, GAMA-GT E AST/ALT É INDISPENSÁVEL.",
    comentarioAspirina: "ASPIRINA PRODUZ PEQUENA PERDA CRÔNICA DE SANGUE EM MUITOS USUÁRIOS. EM ALCOOLISTA, O RISCO DE SANGRAMENTO GASTROINTESTINAL ESTÁ AUMENTADO. AVALIAR BENEFÍCIO/RISCO.",
    comentarioB12: "A REPOSIÇÃO DE VITAMINA B12 PODE TER SIDO BENÉFICA. O ALCOOLISTA FREQUENTEMENTE TEM DÉFICIT COMBINADO DE FOLATOS E B12. A DOSAGEM NO SANGUE DEVE SER USADA PARA AJUSTES.",
    comentarioFerro: "O FERRO FOI PROVAVELMENTE DESNECESSÁRIO. A FERRITINA PODE ESTAR ELEVADA POR HEPATOPATIA ALCOÓLICA SEM EXCESSO REAL DE FERRO. CUIDADO AO REPOR FERRO, ESPECIALMENTE SE PARENTERAL: O EXCESSO É NOCIVO.",
    proximosExames: ["HEMOGRAMA","RETICULÓCITOS","FERRITINA","SATURAÇÃO DA TRANSFERRINA","FOLATOS","VITAMINA B12","LDH","AST/ALT","GAMA-GT","TSH","BILIRRUBINAS","PSA","COLONOSCOPIA DE ROTINA"],
  },
  // ─── ID 99 — BARIÁTRICO COM MACROCITOSE SEM ANEMIA ──────────────────────────
  {
    id: 99,
    label: "BARIÁTRICO COM MACROCITOSE SEM ANEMIA",
    color: "yellow",
    conditions: {
      ferritina:   { min: 24,  max: 9999 },
      hemoglobina: { min: 13.5,max: 17.5 },
      vcm:         { min: 101, max: 999  },
      rdw:         { min: 15.1,max: 999  },
      satTransf:   { min: 20,  max: 50   },
      bariatrica:  true,
      vegetariano: false,
      perda:       false,
      alcoolista:  false,
      transfundido: false,
    },
    diagnostico: "MACROCITOSE SEM ANEMIA EM PACIENTE BARIÁTRICO. A FERRITINA ESTÁ NORMAL E HÁ RESERVA DE FERRO. A MACROCITOSE INDICA DÉFICIT INCIPIENTE DE VITAMINA B12 DECORRENTE DO DÉFICIT ABSORTIVO DA CIRURGIA, OU USO DE METFORMINA OU INIBIDORES DA BOMBA DE PRÓTONS. TAMBÉM PODE OCORRER POR DÉFICIT DE FOLATOS. ESSE PADRÃO PRECEDE A ANEMIA MACROCÍTICA — INTERVENÇÃO AGORA PREVINE DANO NEUROLÓGICO. A REPOSIÇÃO DE VITAMINA B12 POR VIA ORAL NÃO FUNCIONA NO BARIÁTRICO. FRASE DATA.",
    recomendacaoAge1: "AVALIAÇÃO COM HEMATOLOGISTA. A REPOSIÇÃO DE VITAMINA B12 POR VIA SUBLINGUAL OU PARENTERAL É OBRIGATÓRIA. DOSAR VITAMINA B12 E FOLATOS NO SANGUE PARA AJUSTAR A DOSE. SE VOCÊ DOOU SANGUE NOS ÚLTIMOS MESES, PODE TER SIDO PREJUDICIAL.",
    recomendacaoAge2: "AVALIAÇÃO COM HEMATOLOGISTA. NESSA FAIXA ETÁRIA, MACROCITOSE EM BARIÁTRICO PODE TER IMPACTO NEUROLÓGICO SILENCIOSO. DOSAR VITAMINA B12 E FOLATOS. VITAMINA B12 SUBLINGUAL OU PARENTERAL É OBRIGATÓRIA.",
    comentarioAspirina: "ASPIRINA PRODUZ PEQUENA PERDA CRÔNICA DE SANGUE EM MUITOS USUÁRIOS. NO CONTEXTO BARIÁTRICO, PODE AGRAVAR A DEPLEÇÃO DE FERRO A MÉDIO PRAZO.",
    comentarioB12: "A REPOSIÇÃO DE VITAMINA B12 ORAL NÃO FUNCIONA NO BARIÁTRICO. SE A MACROCITOSE NÃO CORRIGIR COM VIA SUBLINGUAL, USE VIA PARENTERAL. A DOSAGEM NO SANGUE DEVE SER USADA PARA AJUSTES.",
    comentarioFerro: "A FERRITINA E A SATURAÇÃO DA TRANSFERRINA NORMAIS SINALIZAM QUE A REPOSIÇÃO FOI ADEQUADA PARA O FERRO. O PROBLEMA AQUI É A VITAMINA B12, NÃO O FERRO. CUIDADO AO REPOR FERRO, ESPECIALMENTE SE PARENTERAL: O EXCESSO É NOCIVO.",
    proximosExames: ["HEMOGRAMA","RETICULÓCITOS","FERRITINA","SATURAÇÃO DA TRANSFERRINA","VITAMINA B12","FOLATOS","ZINCO","ANTI-FATOR INTRÍNSECO","ANTI-CÉLULAS PARIETAIS","PSA","COLONOSCOPIA DE ROTINA"],
  },
'''

with open(MAL, 'r', encoding='utf-8') as f:
    mal_content = f.read()

if 'id: 98,' not in mal_content:
    mal_content = mal_content.rstrip()
    if mal_content.endswith('];'):
        mal_content = mal_content[:-2] + new_entries_mal + '\n];\n'
    with open(MAL, 'w', encoding='utf-8') as f:
        f.write(mal_content)
    print("  ✅ maleMatrix: IDs 98 e 99 adicionados")
else:
    print("  ℹ️  maleMatrix: IDs 98/99 já presentes")

# ─── OBA ENGINE ───────────────────────────────────────────────────────────────
print("\n🔧 Corrigindo obaEngine.js...")
oba_patches = [
    # Bug string B12 IM
    (
        "const usaB12IM = meds.includes('VIT B12 IM')",
        "const usaB12IM  = meds.some(m => m.includes('B12') && (m.includes('INTRAMUSCULAR') || m.includes(' IM')))",
        "Bug string B12 IM corrigido"
    ),
    (
        "const usaB12Sub = meds.includes('VIT B12 SUBLINGUAL')",
        "const usaB12Sub = meds.some(m => m.includes('B12') && m.includes('SUBLINGUAL'))",
        "Bug string B12 SUBLINGUAL corrigido"
    ),
]
patch_file(OBA, oba_patches, 'obaEngine')

# ─── RESUMO ───────────────────────────────────────────────────────────────────
print("\n" + "="*60)
if errors:
    print(f"⚠️  {len(errors)} AVISOS (itens não encontrados — verifique manualmente):")
    for e in errors:
        print(f"   - {e}")
else:
    print("✅ TODAS AS CORREÇÕES APLICADAS COM SUCESSO!")

print("""
📋 PRÓXIMO PASSO:
   git add . && git commit -m "fix: correções clínicas nas matrizes — bugs B12 IM, thresholds, duplicatas, novos IDs" && git push origin main
""")
