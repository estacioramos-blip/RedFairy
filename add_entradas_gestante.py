"""
add_entradas_gestante.py

Adiciona 5 entradas especificas para gestantes na femaleMatrix:

  ID 110 - GESTANTE SAUDAVEL (verde)
  ID 111 - GESTANTE COM SIDEROPENIA INCIPIENTE (amarelo)
  ID 112 - GESTANTE COM ANEMIA FERROPRIVA LEVE (amarelo)
  ID 113 - GESTANTE COM ANEMIA FERROPRIVA MODERADA (laranja)
  ID 114 - GESTANTE COM ANEMIA FERROPRIVA GRAVE (vermelho)

Cobre a lacuna identificada pelo Dr. Ramos:
  Gestante normal com Hb 11.8 -> cai em 'Combinacao nao reconhecida'

Calibracao clinica:
  - Hb alvo gestacional = 11.0 (OMS), anemia = Hb < 11.0
  - Hemodilucao fisiologica aceita faixa ate 10.5 ainda sem ser 'leve'
    mas aqui adotamos limite de 11.0 por rigor pre-natal
  - Ferritina alvo >= 30 (gestacao consome reservas rapidamente)
  - Sat transferrina na gestacao tende a baixar mesmo sem anemia
"""

from pathlib import Path
import sys

FEM = Path("src/engine/femaleMatrix.js")
if not FEM.exists():
    print(f"ERRO: {FEM} nao existe.")
    sys.exit(1)

fem_src = FEM.read_text(encoding="utf-8")

# ═════════════════════════════════════════════════════════════════════
# Bloco com as 5 entradas
# ═════════════════════════════════════════════════════════════════════
entradas = '''
  // ─── ID 110 — GESTANTE SAUDÁVEL ────────────────────────────────────────────
  {
    id: 110,
    label: "GESTANTE SAUDÁVEL",
    color: "green",
    conditions: {
      ferritina:   { min: 25,  max: 400  },
      hemoglobina: { min: 11.0,max: 14.0 },
      vcm:         { min: 80,  max: 100  },
      rdw:         { min: 11.5,max: 15   },
      satTransf:   { min: 15,  max: 50   },
      bariatrica:  false,
      vegetariano: false,
      perda:       false,
      alcoolista:  false,
      transfundido: false,
      gestante:    true,
    },
    diagnostico: "GESTAÇÃO SAUDÁVEL DO PONTO DE VISTA HEMATOLÓGICO. HEMOGLOBINA ADEQUADA PARA A IDADE GESTACIONAL (ACIMA DE 11 g/dL, REFERÊNCIA DA OMS), RESERVAS DE FERRO NORMAIS E AUSÊNCIA DE SINAIS DE ANEMIA OU DEFICIÊNCIA NUTRICIONAL. A HEMODILUIÇÃO FISIOLÓGICA DA GESTAÇÃO É ESPERADA — O VOLUME PLASMÁTICO AUMENTA MAIS QUE A MASSA ERITROCITÁRIA. MANTER A SUPLEMENTAÇÃO PROFILÁTICA DE FERRO E ÁCIDO FÓLICO CONFORME PRESCRIÇÃO DO OBSTETRA, ESSENCIAL ATÉ O FINAL DA GESTAÇÃO E DURANTE A LACTAÇÃO.",
    recomendacaoAge1: "ACOMPANHAMENTO PRÉ-NATAL DE ROTINA. MANTER A SUPLEMENTAÇÃO PROFILÁTICA DE FERRO (40-60 mg de ferro elementar por dia) E ÁCIDO FÓLICO (400-800 mcg/dia) CONFORME PRESCRIÇÃO DO OBSTETRA. REPETIR HEMOGRAMA E FERRITINA NO SEGUNDO E TERCEIRO TRIMESTRES. NÃO FAÇA DOAÇÃO DE SANGUE — GESTANTES NÃO PODEM DOAR. LEMBRE-SE QUE A LACTAÇÃO APÓS O PARTO CONTINUARÁ A CONSUMIR FERRO, A SUPLEMENTAÇÃO DEVERÁ SER MANTIDA NOS PRIMEIROS 6 MESES DO PÓS-PARTO.",
    recomendacaoAge2: "ACOMPANHAMENTO PRÉ-NATAL DE ALTO RISCO (NESSA FAIXA ETÁRIA, A GESTAÇÃO EXIGE VIGILÂNCIA MAIOR). MANTER A SUPLEMENTAÇÃO PROFILÁTICA DE FERRO E ÁCIDO FÓLICO. REPETIR HEMOGRAMA E FERRITINA MENSALMENTE NO SEGUNDO E TERCEIRO TRIMESTRES. NÃO FAÇA DOAÇÃO DE SANGUE. A LACTAÇÃO APÓS O PARTO CONTINUARÁ CONSUMINDO FERRO — MANTER SUPLEMENTAÇÃO POR PELO MENOS 6 MESES PÓS-PARTO.",
    comentarioAspirina: "A ASPIRINA EM DOSE BAIXA (100 mg/dia) É USADA EM ALGUMAS GESTANTES COM RISCO DE PRÉ-ECLÂMPSIA. AQUI NÃO HÁ IMPACTO HEMATOLÓGICO OBSERVÁVEL. NÃO SUSPENDER SEM ORIENTAÇÃO DO OBSTETRA.",
    comentarioB12: "A VITAMINA B12 É FUNDAMENTAL NA GESTAÇÃO PARA A FORMAÇÃO DO TUBO NEURAL FETAL E HEMATOPOESE MATERNA. O USO ATUAL ESTÁ ADEQUADO.",
    comentarioFerro: "O FERRO PROFILÁTICO NA GESTAÇÃO É PADRÃO. MANTER A DOSE CONFORME PRESCRIÇÃO DO OBSTETRA. EVITAR FERRO PARENTERAL SEM INDICAÇÃO ESPECÍFICA.",
    proximosExames: ["HEMOGRAMA","FERRITINA","SATURAÇÃO DA TRANSFERRINA","GLICEMIA DE JEJUM","TOTG","VITAMINA D 25-OH","SOROLOGIAS PRÉ-NATAIS","TSH","T4 LIVRE","USG OBSTÉTRICA"],
  },

  // ─── ID 111 — GESTANTE COM SIDEROPENIA INCIPIENTE ──────────────────────────
  {
    id: 111,
    label: "GESTANTE COM SIDEROPENIA INCIPIENTE",
    color: "yellow",
    conditions: {
      ferritina:   { min: 0,   max: 24   },
      hemoglobina: { min: 11.0,max: 14.0 },
      vcm:         { min: 80,  max: 100  },
      rdw:         { min: 11.5,max: 999  },
      satTransf:   { min: 0,   max: 50   },
      bariatrica:  false,
      vegetariano: false,
      perda:       false,
      alcoolista:  false,
      transfundido: false,
      gestante:    true,
    },
    diagnostico: "SIDEROPENIA INCIPIENTE NA GESTAÇÃO — A HEMOGLOBINA AINDA ESTÁ ADEQUADA, MAS AS RESERVAS DE FERRO (FERRITINA) JÁ ESTÃO DEPLETADAS. NA GESTAÇÃO, ISSO SINALIZA QUE A OFERTA ALIMENTAR E A SUPLEMENTAÇÃO PROFILÁTICA PODEM NÃO ESTAR DANDO CONTA DA DEMANDA CRESCENTE. INTERVIR AGORA EVITA A EVOLUÇÃO PARA ANEMIA FERROPRIVA NO SEGUNDO OU TERCEIRO TRIMESTRE, QUANDO A DEMANDA FETAL DE FERRO SE INTENSIFICA MUITO.",
    recomendacaoAge1: "CONSULTAR O OBSTETRA PARA AJUSTE DA SUPLEMENTAÇÃO DE FERRO (AUMENTAR PARA 60-100 mg de ferro elementar por dia, PREFERENCIALMENTE EM JEJUM, COM VITAMINA C). MANTER ÁCIDO FÓLICO. REPETIR FERRITINA E HEMOGRAMA EM 4-6 SEMANAS. NÃO FAÇA DOAÇÃO DE SANGUE. ATENÇÃO À LACTAÇÃO APÓS O PARTO — SUPLEMENTAÇÃO DEVE CONTINUAR.",
    recomendacaoAge2: "CONSULTAR O OBSTETRA (IDEALMENTE COM PRÉ-NATAL DE ALTO RISCO). AUMENTAR A SUPLEMENTAÇÃO DE FERRO. REPETIR FERRITINA E HEMOGRAMA EM 4 SEMANAS. NESSA FAIXA ETÁRIA A RESERVA DE FERRO É MENOS EFICIENTE — A INTERVENÇÃO PRECOCE É ESSENCIAL. NÃO FAÇA DOAÇÃO DE SANGUE.",
    comentarioAspirina: "ASPIRINA EM DOSE BAIXA (100 mg/dia) EM GESTANTE NÃO COMPROMETE SIGNIFICATIVAMENTE AS RESERVAS DE FERRO. MANTER CONFORME PRESCRIÇÃO DO OBSTETRA.",
    comentarioB12: "A VITAMINA B12 ESTÁ ADEQUADA PARA O QUADRO. NÃO SUSPENDER.",
    comentarioFerro: "O FERRO EM USO PODE ESTAR INSUFICIENTE PARA A DEMANDA GESTACIONAL. CONVERSAR COM O OBSTETRA PARA AJUSTE DE DOSE OU TROCA DE FORMULAÇÃO (FERRO QUELADO SE HOUVER INTOLERÂNCIA GÁSTRICA).",
    proximosExames: ["HEMOGRAMA","RETICULÓCITOS","FERRITINA","SATURAÇÃO DA TRANSFERRINA","GLICEMIA DE JEJUM","TOTG","VITAMINA D 25-OH","TSH","USG OBSTÉTRICA"],
  },

  // ─── ID 112 — GESTANTE COM ANEMIA FERROPRIVA LEVE ──────────────────────────
  {
    id: 112,
    label: "GESTANTE COM ANEMIA FERROPRIVA LEVE",
    color: "yellow",
    conditions: {
      ferritina:   { min: 0,   max: 30   },
      hemoglobina: { min: 10.0,max: 10.9 },
      vcm:         { min: 70,  max: 95   },
      rdw:         { min: 15.1,max: 999  },
      satTransf:   { min: 0,   max: 20   },
      bariatrica:  false,
      vegetariano: false,
      perda:       false,
      alcoolista:  false,
      transfundido: false,
      gestante:    true,
    },
    diagnostico: "ANEMIA FERROPRIVA LEVE NA GESTAÇÃO. A HEMOGLOBINA ESTÁ LIGEIRAMENTE ABAIXO DO LIMITE INFERIOR GESTACIONAL (11 g/dL), COM SIDEROPENIA JÁ INSTALADA. A MICROCITOSE DISCRETA E A ANISOCITOSE SUGEREM UMA POPULAÇÃO HETEROGÊNEA DE HEMÁCIAS — ALGUMAS JÁ FORMADAS ANTES DA FALTA DE FERRO, OUTRAS EM FORMAÇÃO COM FERRO INSUFICIENTE. INTERVENÇÃO COM SUPLEMENTAÇÃO PLENA DEVE CORRIGIR O QUADRO EM POUCAS SEMANAS.",
    recomendacaoAge1: "CONSULTAR O OBSTETRA PARA INICIAR DOSE TERAPÊUTICA DE FERRO (120-180 mg DE FERRO ELEMENTAR POR DIA, FRACIONADO EM 2-3 TOMADAS, PREFERENCIALMENTE EM JEJUM COM VITAMINA C). MANTER ÁCIDO FÓLICO. REPETIR HEMOGRAMA, RETICULÓCITOS E FERRITINA EM 4 SEMANAS. SE A HEMOGLOBINA NÃO MELHORAR OU CAIR, CONSIDERAR FERRO PARENTERAL (SACARATO OU CARBOXIMALTOSE) SOB ORIENTAÇÃO MÉDICA. NÃO FAÇA DOAÇÃO DE SANGUE.",
    recomendacaoAge2: "CONSULTAR O OBSTETRA — IDEALMENTE EM PRÉ-NATAL DE ALTO RISCO. INICIAR DOSE TERAPÊUTICA DE FERRO ORAL. SE NÃO HOUVER RESPOSTA EM 4 SEMANAS OU SE HOUVER INTOLERÂNCIA GÁSTRICA, CONSIDERAR FERRO PARENTERAL. MONITORAMENTO MENSAL DO HEMOGRAMA E DA FERRITINA. NÃO FAÇA DOAÇÃO DE SANGUE.",
    comentarioAspirina: "ASPIRINA EM DOSE BAIXA EM GESTANTE PODE AGRAVAR DISCRETAMENTE A PERDA — REAVALIAR COM O OBSTETRA A RELAÇÃO RISCO-BENEFÍCIO DO USO ATUAL.",
    comentarioB12: "A VITAMINA B12 PARECE ADEQUADA. O FOCO AQUI É O FERRO.",
    comentarioFerro: "O FERRO EM USO ESTÁ INSUFICIENTE PARA A GESTAÇÃO. CONVERSAR COM O OBSTETRA PARA DOSE TERAPÊUTICA.",
    proximosExames: ["HEMOGRAMA","RETICULÓCITOS","FERRITINA","SATURAÇÃO DA TRANSFERRINA","GLICEMIA DE JEJUM","TOTG","VITAMINA D 25-OH","TSH","USG OBSTÉTRICA","PARASITOLÓGICO DE FEZES"],
  },

  // ─── ID 113 — GESTANTE COM ANEMIA FERROPRIVA MODERADA ──────────────────────
  {
    id: 113,
    label: "GESTANTE COM ANEMIA FERROPRIVA MODERADA",
    color: "orange",
    conditions: {
      ferritina:   { min: 0,   max: 24   },
      hemoglobina: { min: 8.0, max: 9.9  },
      vcm:         { min: 60,  max: 85   },
      rdw:         { min: 15.1,max: 999  },
      satTransf:   { min: 0,   max: 15   },
      bariatrica:  false,
      vegetariano: false,
      perda:       false,
      alcoolista:  false,
      transfundido: false,
      gestante:    true,
    },
    diagnostico: "ANEMIA FERROPRIVA MODERADA NA GESTAÇÃO. ESSE GRAU DE ANEMIA (HB ENTRE 8 E 10 g/dL) AUMENTA OS RISCOS DE PARTO PREMATURO, BAIXO PESO AO NASCER E MORBIDADE MATERNA (FADIGA INCAPACITANTE, DISPNEIA, ASTENIA). A MICROCITOSE E ANISOCITOSE MARCADAS CONFIRMAM O PADRÃO FERROPRIVO. REQUER INTERVENÇÃO MÉDICA RÁPIDA — A FERRITINA E A SATURAÇÃO DA TRANSFERRINA CONFIRMAM ESGOTAMENTO DAS RESERVAS.",
    recomendacaoAge1: "AVALIAÇÃO COM OBSTETRA E HEMATOLOGISTA EM CURTO PRAZO. AVALIAR INDICAÇÃO DE FERRO PARENTERAL (SACARATO OU CARBOXIMALTOSE) — É SEGURO E RECOMENDADO NO SEGUNDO E TERCEIRO TRIMESTRES. ALTERNATIVA: FERRO ORAL EM DOSE PLENA (180 mg DE FERRO ELEMENTAR POR DIA). MONITORAR HEMOGRAMA SEMANALMENTE ATÉ ESTABILIZAÇÃO. NÃO FAÇA DOAÇÃO DE SANGUE.",
    recomendacaoAge2: "AVALIAÇÃO COM OBSTETRA DE ALTO RISCO E HEMATOLOGISTA SEM DEMORA. O FERRO PARENTERAL É FREQUENTEMENTE PREFERIDO NESSA FAIXA ETÁRIA COM ANEMIA MODERADA. MONITORAMENTO SEMANAL DO HEMOGRAMA. NÃO FAÇA DOAÇÃO DE SANGUE.",
    comentarioAspirina: "A ASPIRINA PODE ESTAR CONTRIBUINDO PARA O QUADRO. AVALIAR COM O OBSTETRA SE A INDICAÇÃO DEVE SER MANTIDA.",
    comentarioB12: "A VITAMINA B12 NÃO EXPLICA O QUADRO. O FOCO É O FERRO.",
    comentarioFerro: "O FERRO EM USO É INSUFICIENTE. A ORIENTAÇÃO AGORA DEVE PARTIR DO HEMATOLOGISTA E DO OBSTETRA — PROVÁVEL INDICAÇÃO DE FERRO PARENTERAL.",
    proximosExames: ["HEMOGRAMA","RETICULÓCITOS","FERRITINA","SATURAÇÃO DA TRANSFERRINA","VITAMINA B12","ÁCIDO FÓLICO","GLICEMIA DE JEJUM","TOTG","VITAMINA D 25-OH","TSH","USG OBSTÉTRICA","PARASITOLÓGICO DE FEZES","SANGUE OCULTO NAS FEZES"],
  },

  // ─── ID 114 — GESTANTE COM ANEMIA FERROPRIVA GRAVE ─────────────────────────
  {
    id: 114,
    label: "GESTANTE COM ANEMIA FERROPRIVA GRAVE",
    color: "red",
    conditions: {
      ferritina:   { min: 0,   max: 24   },
      hemoglobina: { min: 3.0, max: 7.9  },
      vcm:         { min: 0,   max: 79   },
      rdw:         { min: 15.1,max: 999  },
      satTransf:   { min: 0,   max: 15   },
      bariatrica:  false,
      vegetariano: false,
      perda:       false,
      alcoolista:  false,
      transfundido: false,
      gestante:    true,
    },
    diagnostico: "ANEMIA FERROPRIVA GRAVE NA GESTAÇÃO — SITUAÇÃO DE RISCO PARA A MÃE E PARA O FETO. HB ABAIXO DE 8 g/dL NA GESTANTE ASSOCIA-SE A MAIOR RISCO DE PARTO PREMATURO, RESTRIÇÃO DE CRESCIMENTO INTRAUTERINO, BAIXO PESO AO NASCER, MORTALIDADE PERINATAL E MORBIDADE MATERNA SIGNIFICATIVA (INSUFICIÊNCIA CARDÍACA EM HIPERDÉBITO, HEMORRAGIA PÓS-PARTO COM MENOR TOLERÂNCIA). AVALIAÇÃO IMEDIATA NECESSÁRIA.",
    recomendacaoAge1: "AVALIAÇÃO IMEDIATA COM OBSTETRA E HEMATOLOGISTA. PODE SER NECESSÁRIA HOSPITALIZAÇÃO PARA REPOSIÇÃO DE FERRO PARENTERAL COM MONITORAMENTO. EM CASOS EXTREMOS (HB < 7 g/dL COM DESCOMPENSAÇÃO), TRANSFUSÃO DE CONCENTRADO DE HEMÁCIAS PODE SER NECESSÁRIA. NÃO FAÇA DOAÇÃO DE SANGUE. ACOMPANHAR DE PERTO ATÉ O PARTO E NO PUERPÉRIO.",
    recomendacaoAge2: "AVALIAÇÃO IMEDIATA EM PRÉ-NATAL DE ALTO RISCO. HOSPITALIZAÇÃO FREQUENTEMENTE NECESSÁRIA. FERRO PARENTERAL É MANDATÓRIO. CONSIDERAR TRANSFUSÃO DE CONCENTRADO DE HEMÁCIAS SE DESCOMPENSAÇÃO CLÍNICA OU HB < 7 g/dL. MONITORAMENTO CARDIOLÓGICO E OBSTÉTRICO ESTREITO. NÃO FAÇA DOAÇÃO DE SANGUE.",
    comentarioAspirina: "A ASPIRINA PODE TER CONTRIBUÍDO. AVALIAR COM OBSTETRA A SUSPENSÃO TEMPORÁRIA OU SUBSTITUIÇÃO.",
    comentarioB12: "A B12 NÃO EXPLICA A GRAVIDADE DESTE QUADRO. O FOCO É O FERRO E POSSIVELMENTE A CAUSA DA ANEMIA (INVESTIGAR PERDA OCULTA).",
    comentarioFerro: "O FERRO EM USO FOI INSUFICIENTE. HOSPITALIZAÇÃO E FERRO PARENTERAL SÃO PROVAVELMENTE NECESSÁRIOS.",
    proximosExames: ["HEMOGRAMA","RETICULÓCITOS","FERRITINA","SATURAÇÃO DA TRANSFERRINA","VITAMINA B12","ÁCIDO FÓLICO","FUNÇÃO HEPÁTICA","FUNÇÃO RENAL","TSH","USG OBSTÉTRICA COM DOPPLER","ELETROCARDIOGRAMA","ECOCARDIOGRAMA","SANGUE OCULTO NAS FEZES","PARASITOLÓGICO DE FEZES","ENDOSCOPIA DIGESTIVA (EM PÓS-PARTO)","COLONOSCOPIA (EM PÓS-PARTO SE INDICADO)"],
  },
'''

# ═════════════════════════════════════════════════════════════════════
# Aplicacao
# ═════════════════════════════════════════════════════════════════════
idx_final = fem_src.rfind("];")
if idx_final < 0:
    print("ERRO: fim do array femaleMatrix nao encontrado.")
    sys.exit(1)

# Checar se alguma das 5 entradas ja existe
adicionados = 0
ja_existentes = 0
for id_num in [110, 111, 112, 113, 114]:
    if f"id: {id_num}" in fem_src:
        ja_existentes += 1
        print(f"  AVISO: ID {id_num} ja existe.")
    else:
        adicionados += 1

if adicionados == 0:
    print("AVISO: todas as 5 entradas ja existem. Nada a fazer.")
    sys.exit(0)

if ja_existentes > 0:
    print(f"ERRO: {ja_existentes} entradas ja existem mas {adicionados} nao. Abortando para nao duplicar.")
    print("Remova as entradas existentes ou ajuste o script.")
    sys.exit(1)

fem_src = fem_src[:idx_final] + entradas + fem_src[idx_final:]
FEM.write_text(fem_src, encoding="utf-8")

print(f"OK: 5 entradas gestacionais adicionadas a femaleMatrix.")
print()
print("Entradas:")
print("  ID 110 - GESTANTE SAUDAVEL                              (verde)")
print("  ID 111 - GESTANTE COM SIDEROPENIA INCIPIENTE            (amarelo)")
print("  ID 112 - GESTANTE COM ANEMIA FERROPRIVA LEVE            (amarelo)")
print("  ID 113 - GESTANTE COM ANEMIA FERROPRIVA MODERADA        (laranja)")
print("  ID 114 - GESTANTE COM ANEMIA FERROPRIVA GRAVE           (vermelho)")

print()
print("Caso do Dr. Ramos agora coberto:")
print("  Gestante, Hb 11.8, Ferr 55, VCM 91, RDW 12, Sat 27")
print("  -> ID 110 GESTANTE SAUDAVEL (verde)")
print()
print("Proximo passo:")
print('  git add . && git commit -m "feat: 5 entradas gestacionais na matriz (IDs 110-114)" && git push origin main')
