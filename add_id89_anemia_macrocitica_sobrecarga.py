"""
add_id89_anemia_macrocitica_sobrecarga.py

Cobre a 2a LACUNA identificada pelo Dr. Ramos:
  M 50a, Hb 12.8, VCM 106, Ferr 600, RDW 18.5, Sat 60%, sem flags
  -> matriz nao reconhecia

Criterios da nova entrada (Dr. Ramos):
  - Ferritina: 300-5000 ng/mL
  - VCM: > 100 fL (macrocitose)
  - Sat. Transferrina: > 50%
  - Hemoglobina: at\u00e9 limite inferior (anemia)

Entrada ID 89 criada em ambas as matrizes (diferenca: Hb min/max por sexo).

Contexto clinico: padrao classico de
  - Alcoolismo cronico (macrocitose + sobrecarga hepatica)
  - Mielodisplasia (principalmente em idosos)
  - Anemias eritroides ineficazes (talassemia, anemia sideroblastica)
  - Hepatopatia cronica (cirrose, hemocromatose hereditaria)
"""

from pathlib import Path
import sys

# ═════════════════════════════════════════════════════════════════════
# 1. femaleMatrix.js — ID 89
# ═════════════════════════════════════════════════════════════════════
FEM = Path("src/engine/femaleMatrix.js")
if not FEM.exists():
    print(f"ERRO: {FEM} nao existe.")
    sys.exit(1)

fem_src = FEM.read_text(encoding="utf-8")

if "id: 89" in fem_src:
    print("AVISO 1: ID 89 ja existe em femaleMatrix.")
else:
    idx = fem_src.rfind("];")
    if idx < 0:
        print("ERRO 1: fim do array femaleMatrix nao encontrado.")
        sys.exit(1)

    nova_fem = '''
  // ─── ID 89 — ANEMIA MACROCÍTICA COM SOBRECARGA DE FERRO ────────────────────
  {
    id: 89,
    label: "ANEMIA MACROCÍTICA COM SOBRECARGA DE FERRO",
    color: "red",
    conditions: {
      ferritina:   { min: 300, max: 5000 },
      hemoglobina: { min: 7.0, max: 12.4 },
      vcm:         { min: 101, max: 999  },
      rdw:         { min: 11.5,max: 999  },
      satTransf:   { min: 51,  max: 100  },
      bariatrica:  false,
      vegetariano: false,
      perda:       false,
      alcoolista:  false,
      transfundido: false,
    },
    diagnostico: "ANEMIA MACROCÍTICA ASSOCIADA A SOBRECARGA DE FERRO (FERRITINA E SATURAÇÃO DA TRANSFERRINA ELEVADAS). ESSE PADRÃO É INCOMUM E ALTAMENTE SUGESTIVO DE: (1) ALCOOLISMO CRÔNICO COM HEPATOPATIA E SOBRECARGA HEPÁTICA DE FERRO; (2) SÍNDROME MIELODISPLÁSICA (SMD), ESPECIALMENTE EM PACIENTES ACIMA DE 50 ANOS — A MACROCITOSE ACOMPANHADA DE ANEMIA E ANISOCITOSE MARCADA É UM DOS PRINCIPAIS SINAIS DE ALERTA; (3) ANEMIAS ERITROIDES INEFICAZES COMO TALASSEMIAS E ANEMIA SIDEROBLÁSTICA; (4) HEPATOPATIA CRÔNICA (CIRROSE, HEPATITES CRÔNICAS); (5) HEMOCROMATOSE HEREDITÁRIA COM COMPONENTE ANÊMICO. O PADRÃO IMPÕE AVALIAÇÃO HEMATOLÓGICA IMEDIATA E PROVÁVEL NECESSIDADE DE MIELOGRAMA.",
    recomendacaoAge1: "AVALIAÇÃO URGENTE COM HEMATOLOGISTA. O PADRÃO ANEMIA MACROCÍTICA + SOBRECARGA DE FERRO EXIGE INVESTIGAÇÃO COMPLETA: DOSAGEM DE VITAMINA B12, ÁCIDO FÓLICO, FUNÇÃO HEPÁTICA COMPLETA (AST/ALT/GGT/BILIRRUBINAS/ALBUMINA/TP), RETICULÓCITOS, LDH, HAPTOGLOBINA, ELETROFORESE DE HEMOGLOBINA, PESQUISA DE MUTAÇÃO HFE (C282Y, H63D), E MIELOGRAMA. NÃO FAÇA DOAÇÃO DE SANGUE. AVALIAR HISTÓRICO DE CONSUMO DE ÁLCOOL.",
    recomendacaoAge2: "AVALIAÇÃO URGENTE COM HEMATOLOGISTA. NESSA FAIXA ETÁRIA, A SÍNDROME MIELODISPLÁSICA TORNA-SE HIPÓTESE DIAGNÓSTICA DE PRIMEIRA LINHA — MIELOGRAMA É FUNDAMENTAL. INVESTIGAÇÃO COMPLETA: VITAMINA B12, ÁCIDO FÓLICO, FUNÇÃO HEPÁTICA, RETICULÓCITOS, LDH, HAPTOGLOBINA, ELETROFORESE DE HEMOGLOBINA, PESQUISA DE MUTAÇÃO HFE. NÃO FAÇA DOAÇÃO DE SANGUE. REVISAR HISTÓRICO DE CONSUMO DE ÁLCOOL E MEDICAMENTOS EM USO.",
    comentarioAspirina: "ASPIRINA PRODUZ PEQUENA PERDA CRÔNICA DE SANGUE, MAS AQUI HÁ SOBRECARGA DE FERRO — NÃO ESTÁ CONTRIBUINDO PARA O QUADRO ANÊMICO DESTA FORMA.",
    comentarioB12: "A B12 PODE ESTAR EM CURSO — AVALIAR DOSE, VIA E ADESÃO. A ANEMIA MACROCÍTICA COM SOBRECARGA DE FERRO NÃO SE EXPLICA APENAS POR DÉFICIT DE B12; ALCOOLISMO, MIELODISPLASIA OU HEPATOPATIA DEVEM SER INVESTIGADAS.",
    comentarioFerro: "O FERRO É CONTRAINDICADO NESTE CONTEXTO — A FERRITINA ESTÁ ELEVADA E HÁ SOBRECARGA CIRCULANTE (SAT > 50%). REPOR FERRO, ESPECIALMENTE PARENTERAL, PIORARIA A SOBRECARGA. SUSPENDER IMEDIATAMENTE QUALQUER REPOSIÇÃO DE FERRO EM CURSO.",
    proximosExames: ["HEMOGRAMA","RETICULÓCITOS","FERRITINA","SATURAÇÃO DA TRANSFERRINA","VITAMINA B12","ÁCIDO FÓLICO","TSH","T4 LIVRE","AST","ALT","GAMA-GT","BILIRRUBINAS","ALBUMINA","TEMPO DE PROTROMBINA","LDH","HAPTOGLOBINA","COOMBS DIRETO","ELETROFORESE DE HEMOGLOBINA","PESQUISA MUTAÇÃO HFE","MIELOGRAMA","USG ABDOME","ENDOSCOPIA DIGESTIVA","COLONOSCOPIA DE ROTINA","CEA","CA 15.3","CA 125"],
  },
'''

    fem_src = fem_src[:idx] + nova_fem + fem_src[idx:]
    FEM.write_text(fem_src, encoding="utf-8")
    print("OK 1: ID 89 (Anemia macrocitica + sobrecarga) adicionado a femaleMatrix.")

# ═════════════════════════════════════════════════════════════════════
# 2. maleMatrix.js — ID 89 (Hb limite superior ajustada: 13.9)
# ═════════════════════════════════════════════════════════════════════
MAS = Path("src/engine/maleMatrix.js")
if not MAS.exists():
    print(f"ERRO: {MAS} nao existe.")
    sys.exit(1)

mas_src = MAS.read_text(encoding="utf-8")

if "id: 89" in mas_src:
    print("AVISO 2: ID 89 ja existe em maleMatrix.")
else:
    idx_m = mas_src.rfind("];")
    if idx_m < 0:
        print("ERRO 2: fim do array maleMatrix nao encontrado.")
        sys.exit(1)

    nova_mas = '''
  // ─── ID 89 — ANEMIA MACROCÍTICA COM SOBRECARGA DE FERRO ────────────────────
  {
    id: 89,
    label: "ANEMIA MACROCÍTICA COM SOBRECARGA DE FERRO",
    color: "red",
    conditions: {
      ferritina:   { min: 300, max: 5000 },
      hemoglobina: { min: 7.0, max: 13.9 },
      vcm:         { min: 101, max: 999  },
      rdw:         { min: 11.5,max: 999  },
      satTransf:   { min: 51,  max: 100  },
      bariatrica:  false,
      vegetariano: false,
      perda:       false,
      alcoolista:  false,
      transfundido: false,
    },
    diagnostico: "ANEMIA MACROCÍTICA ASSOCIADA A SOBRECARGA DE FERRO (FERRITINA E SATURAÇÃO DA TRANSFERRINA ELEVADAS). ESSE PADRÃO É INCOMUM E ALTAMENTE SUGESTIVO DE: (1) ALCOOLISMO CRÔNICO COM HEPATOPATIA E SOBRECARGA HEPÁTICA DE FERRO; (2) SÍNDROME MIELODISPLÁSICA (SMD), ESPECIALMENTE EM PACIENTES ACIMA DE 50 ANOS — A MACROCITOSE ACOMPANHADA DE ANEMIA E ANISOCITOSE MARCADA É UM DOS PRINCIPAIS SINAIS DE ALERTA; (3) ANEMIAS ERITROIDES INEFICAZES COMO TALASSEMIAS E ANEMIA SIDEROBLÁSTICA; (4) HEPATOPATIA CRÔNICA (CIRROSE, HEPATITES CRÔNICAS); (5) HEMOCROMATOSE HEREDITÁRIA COM COMPONENTE ANÊMICO. O PADRÃO IMPÕE AVALIAÇÃO HEMATOLÓGICA IMEDIATA E PROVÁVEL NECESSIDADE DE MIELOGRAMA.",
    recomendacaoAge1: "AVALIAÇÃO URGENTE COM HEMATOLOGISTA. O PADRÃO ANEMIA MACROCÍTICA + SOBRECARGA DE FERRO EXIGE INVESTIGAÇÃO COMPLETA: DOSAGEM DE VITAMINA B12, ÁCIDO FÓLICO, FUNÇÃO HEPÁTICA COMPLETA (AST/ALT/GGT/BILIRRUBINAS/ALBUMINA/TP), RETICULÓCITOS, LDH, HAPTOGLOBINA, ELETROFORESE DE HEMOGLOBINA, PESQUISA DE MUTAÇÃO HFE (C282Y, H63D), E MIELOGRAMA. NÃO FAÇA DOAÇÃO DE SANGUE. AVALIAR HISTÓRICO DE CONSUMO DE ÁLCOOL.",
    recomendacaoAge2: "AVALIAÇÃO URGENTE COM HEMATOLOGISTA. NESSA FAIXA ETÁRIA, A SÍNDROME MIELODISPLÁSICA TORNA-SE HIPÓTESE DIAGNÓSTICA DE PRIMEIRA LINHA — MIELOGRAMA É FUNDAMENTAL. INVESTIGAÇÃO COMPLETA: VITAMINA B12, ÁCIDO FÓLICO, FUNÇÃO HEPÁTICA, RETICULÓCITOS, LDH, HAPTOGLOBINA, ELETROFORESE DE HEMOGLOBINA, PESQUISA DE MUTAÇÃO HFE. NÃO FAÇA DOAÇÃO DE SANGUE. REVISAR HISTÓRICO DE CONSUMO DE ÁLCOOL E MEDICAMENTOS EM USO.",
    comentarioAspirina: "ASPIRINA PRODUZ PEQUENA PERDA CRÔNICA DE SANGUE, MAS AQUI HÁ SOBRECARGA DE FERRO — NÃO ESTÁ CONTRIBUINDO PARA O QUADRO ANÊMICO DESTA FORMA.",
    comentarioB12: "A B12 PODE ESTAR EM CURSO — AVALIAR DOSE, VIA E ADESÃO. A ANEMIA MACROCÍTICA COM SOBRECARGA DE FERRO NÃO SE EXPLICA APENAS POR DÉFICIT DE B12; ALCOOLISMO, MIELODISPLASIA OU HEPATOPATIA DEVEM SER INVESTIGADAS.",
    comentarioFerro: "O FERRO É CONTRAINDICADO NESTE CONTEXTO — A FERRITINA ESTÁ ELEVADA E HÁ SOBRECARGA CIRCULANTE (SAT > 50%). REPOR FERRO, ESPECIALMENTE PARENTERAL, PIORARIA A SOBRECARGA. SUSPENDER IMEDIATAMENTE QUALQUER REPOSIÇÃO DE FERRO EM CURSO.",
    proximosExames: ["HEMOGRAMA","RETICULÓCITOS","FERRITINA","SATURAÇÃO DA TRANSFERRINA","VITAMINA B12","ÁCIDO FÓLICO","TSH","T4 LIVRE","AST","ALT","GAMA-GT","BILIRRUBINAS","ALBUMINA","TEMPO DE PROTROMBINA","LDH","HAPTOGLOBINA","COOMBS DIRETO","ELETROFORESE DE HEMOGLOBINA","PESQUISA MUTAÇÃO HFE","MIELOGRAMA","USG ABDOME","ENDOSCOPIA DIGESTIVA","COLONOSCOPIA DE ROTINA","CEA","PSA"],
  },
'''

    mas_src = mas_src[:idx_m] + nova_mas + mas_src[idx_m:]
    MAS.write_text(mas_src, encoding="utf-8")
    print("OK 2: ID 89 (equivalente masculino) adicionado a maleMatrix.")

# ═════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("TUDO OK! Arquivos modificados:")
print(f"  - {FEM}   (nova entrada ID 89)")
print(f"  - {MAS}   (nova entrada ID 89)")
print()
print("Criterios da entrada:")
print("  - Ferritina: 300-5000 ng/mL")
print("  - VCM: > 100 fL (macrocitose)")
print("  - Sat. Transferrina: > 50%")
print("  - Hemoglobina ate limite inferior")
print("    . Feminino: 7.0-12.4 g/dL")
print("    . Masculino: 7.0-13.9 g/dL")
print()
print("Caso do Dr. Ramos agora coberto:")
print("  M 50a, Hb 12.8, VCM 106, Ferr 600, RDW 18.5, Sat 60")
print("  -> MATRIZ: 'ANEMIA MACROCITICA COM SOBRECARGA DE FERRO' (vermelho)")
print("  -> ACHADOS PARALELOS: Sat > 50 + Macrocitose + Hiperferritinemia")
print()
print("Proximo passo:")
print('  git add . && git commit -m "feat: ID 89 anemia macrocitica com sobrecarga (F+M)" && git push origin main')
