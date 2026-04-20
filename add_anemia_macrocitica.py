"""
add_anemia_macrocitica.py

Cobre a LACUNA identificada pelo Dr. Ramos:
  F 20a, Hb 9.2, VCM 106, Ferr 300, RDW 20, Sat 33, sem flags
  -> matrix nao reconhecia, caia em 'Combinacao nao reconhecida'

Solucao em 3 partes:

  1. achadosParalelos.js: ACHADO 8 (Anemia Macrocitica)
     - Dispara com Hb baixa OU limite + VCM > 100
     - Cor graduada: amarelo (Hb>10), laranja (Hb<=10), vermelho (Hb<8)
     - Lista causas + conduta + exames
     - Alerta mielodisplasia se idade >= 65

  2. femaleMatrix.js: nova entrada ID 88
     ANEMIA MACROCITICA COM RESERVAS DE FERRO PRESERVADAS
     - Ferritina 25-400 (normal a normal-alta)
     - Hb 7.0-11.9 (anemia)
     - VCM 101-999 (macrocitica)
     - Nao vegetariana, nao bariatrica

  3. maleMatrix.js: entrada equivalente para homens
"""

from pathlib import Path
import sys

# ═════════════════════════════════════════════════════════════════════
# PARTE 1 — Achado Paralelo 8 (Anemia Macrocitica)
# ═════════════════════════════════════════════════════════════════════
ACH = Path("src/engine/achadosParalelos.js")
if not ACH.exists():
    print(f"ERRO: {ACH} nao existe.")
    sys.exit(1)

ach_src = ACH.read_text(encoding="utf-8")

if "ACHADO 8" in ach_src or "anemia-macrocitica" in ach_src:
    print("AVISO 1: Achado 8 ja existe.")
else:
    ancora_ach = """  // ─────────────────────────────────────────────────────────────
  // ACHADO 7 — SATURAÇÃO DA TRANSFERRINA ELEVADA (> 50%)"""

    if ancora_ach not in ach_src:
        print("ERRO 1: ancora do Achado 7 nao encontrada em achadosParalelos.js.")
        sys.exit(1)

    novo_ach = """  // ─────────────────────────────────────────────────────────────
  // ACHADO 8 — ANEMIA MACROCITICA (Hb baixa/limite + VCM > 100)
  //
  // Dispara quando ha anemia (ou Hb no limite inferior) associada a
  // macrocitose. Gravidade graduada pela Hb. Lista causas e conduta.
  // ─────────────────────────────────────────────────────────────
  {
    const hbLimiteInferior = sexo === 'M' ? 14.0 : 12.5;
    const hbBaixaOuLimite = hemoglobina < hbLimiteInferior;

    if (hbBaixaOuLimite && vcm > 100) {
      const idade = Number(inputs.idade) || 0;
      let cor = 'yellow';
      let gravidade = 'LEVE';

      if (hemoglobina < 8) {
        cor = 'red';
        gravidade = 'GRAVE';
      } else if (hemoglobina <= 10) {
        cor = 'orange';
        gravidade = 'SIGNIFICATIVA';
      }

      let texto = `Hemoglobina de ${hemoglobina} g/dL e VCM de ${vcm} fL caracterizam ANEMIA MACROCÍTICA (${gravidade}). `;

      texto += 'As causas mais comuns são: deficiência de VITAMINA B12 (gastrite atrófica, anemia perniciosa, uso de IBP, metformina, dieta pobre em proteína animal), deficiência de ÁCIDO FÓLICO (dieta inadequada, alcoolismo, gestação), HIPOTIREOIDISMO, DOENÇA HEPÁTICA (etilismo, hepatite, cirrose), MEDICAMENTOS (metotrexato, hidroxiureia, antirretrovirais, anticonvulsivantes) e SÍNDROME MIELODISPLÁSICA. ';

      if (usaB12) {
        texto += 'O uso de B12 está em curso — se recente, a macrocitose pode estar em regressão; se antiga, sugere dose/via inadequada ou má absorção. ';
      }
      if (alcoolista) {
        texto += 'O alcoolismo crônico é causa frequente e reversível — abstinência é essencial. ';
      }

      texto += 'CONDUTA: solicitar DOSAGEM SÉRICA DE VITAMINA B12, FOLATOS, TSH/T4 LIVRE, FUNÇÃO HEPÁTICA (AST/ALT/GGT/bilirrubinas), RETICULÓCITOS e LDH. ';

      if (idade >= 65) {
        texto += 'Em pacientes com 65 anos ou mais, considerar também pesquisa de SÍNDROME MIELODISPLÁSICA — encaminhar ao hematologista para avaliação com possível mielograma. ';
      }

      if (hemoglobina < 8) {
        texto += 'Com Hb < 8 g/dL, encaminhamento URGENTE ao hematologista. Avaliar necessidade de transfusão conforme sintomatologia.';
      } else if (hemoglobina <= 10) {
        texto += 'Avaliação com hematologista em curto prazo (2-4 semanas) é recomendada, sobretudo se sintomática.';
      } else {
        texto += 'Avaliar com hematologista se persistir após correção das causas reversíveis (B12, folato, tireoide).';
      }

      achados.push({
        id: 'anemia-macrocitica',
        label: `ANEMIA MACROCÍTICA ${gravidade} (Hb ${hemoglobina} · VCM ${vcm})`,
        color: cor,
        texto,
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // ACHADO 7 — SATURAÇÃO DA TRANSFERRINA ELEVADA (> 50%)"""

    ach_src = ach_src.replace(ancora_ach, novo_ach, 1)
    ACH.write_text(ach_src, encoding="utf-8")
    print("OK 1: Achado 8 (Anemia Macrocitica) adicionado a achadosParalelos.js")

# ═════════════════════════════════════════════════════════════════════
# PARTE 2 — Nova entrada ID 88 na femaleMatrix
# ═════════════════════════════════════════════════════════════════════
FEM = Path("src/engine/femaleMatrix.js")
if not FEM.exists():
    print(f"ERRO: {FEM} nao existe.")
    sys.exit(1)

fem_src = FEM.read_text(encoding="utf-8")

if "id: 88" in fem_src:
    print("AVISO 2: ID 88 ja existe em femaleMatrix.")
else:
    # Adicionar antes do fechamento do array (ultimos caracteres: '];')
    ancora_fem = "];"

    # Ultima ocorrencia de '];' no arquivo
    idx = fem_src.rfind(ancora_fem)
    if idx < 0:
        print("ERRO 2: nao foi possivel encontrar o final do array femaleMatrix.")
        sys.exit(1)

    nova_entrada_fem = '''
  // ─── ID 88 — ANEMIA MACROCÍTICA COM RESERVAS DE FERRO PRESERVADAS ───────────
  {
    id: 88,
    label: "ANEMIA MACROCÍTICA COM RESERVAS DE FERRO PRESERVADAS",
    color: "orange",
    conditions: {
      ferritina:   { min: 25,  max: 400  },
      hemoglobina: { min: 7.0, max: 11.9 },
      vcm:         { min: 101, max: 999  },
      rdw:         { min: 14,  max: 999  },
      satTransf:   { min: 20,  max: 50   },
      bariatrica:  false,
      vegetariano: false,
      perda:       false,
      alcoolista:  false,
      transfundido: false,
    },
    diagnostico: "ANEMIA MACROCÍTICA COM RESERVAS DE FERRO NORMAIS OU AUMENTADAS. O PADRÃO SUGERE DÉFICIT DE VITAMINA B12 E/OU ÁCIDO FÓLICO, HIPOTIREOIDISMO, DOENÇA HEPÁTICA, USO DE MEDICAMENTOS COMO METFORMINA, INIBIDORES DA BOMBA DE PRÓTONS (OMEPRAZOL/PANTOPRAZOL), METOTREXATO, ANTICONVULSIVANTES, ANTIRRETROVIRAIS, HIDROXIUREIA. EM IDOSOS, INVESTIGAR SÍNDROME MIELODISPLÁSICA. A FERRITINA NORMAL OU ELEVADA AFASTA DÉFICIT DE FERRO COMO CAUSA PRIMÁRIA DA ANEMIA.",
    recomendacaoAge1: "AVALIAÇÃO COM HEMATOLOGISTA. SOLICITAR DOSAGEM SÉRICA DE VITAMINA B12, ÁCIDO FÓLICO, TSH E T4 LIVRE, FUNÇÃO HEPÁTICA COMPLETA, RETICULÓCITOS E LDH. NÃO FAÇA NOVA DOAÇÃO DE SANGUE ENQUANTO NÃO ESCLARECER A ORIGEM DA ANEMIA. SE EM REGIME DE SANGRIAS, CERTIFIQUE-SE DE QUE A FERRITINA É SUPERIOR A 100 ng/mL E QUE A SATURAÇÃO DA TRANSFERRINA É IGUAL OU SUPERIOR A 30%. ENTRE 16 E 17 ANOS DE IDADE É PRECISO AUTORIZAÇÃO DOS RESPONSÁVEIS.",
    recomendacaoAge2: "AVALIAÇÃO COM HEMATOLOGISTA. SOLICITAR DOSAGEM SÉRICA DE VITAMINA B12, ÁCIDO FÓLICO, TSH E T4 LIVRE, FUNÇÃO HEPÁTICA COMPLETA, RETICULÓCITOS E LDH. NESSA FAIXA ETÁRIA TAMBÉM É IMPORTANTE PESQUISAR SÍNDROME MIELODISPLÁSICA — PODE SER NECESSÁRIO MIELOGRAMA. REVISAR TODAS AS MEDICAÇÕES DE USO CONTÍNUO (IBP, METFORMINA, METOTREXATO, ETC.). NÃO FAÇA DOAÇÃO DE SANGUE.",
    comentarioAspirina: "ASPIRINA PRODUZ PEQUENA PERDA CRÔNICA DE SANGUE, MAS AQUI A FERRITINA ESTÁ PRESERVADA, INDICANDO QUE NÃO ESTÁ CONTRIBUINDO SIGNIFICATIVAMENTE PARA A ANEMIA.",
    comentarioB12: "A B12 PODE ESTAR EM CURSO MAS INSUFICIENTE — AVALIAR DOSE, VIA E ADESÃO. SE A MACROCITOSE NÃO CORRIGIR COM PREPARAÇÕES ORAIS, USE VITAMINA B12 SUBLINGUAL OU INJETÁVEL. A DOSAGEM NO SANGUE DEVE SER USADA PARA AJUSTES.",
    comentarioFerro: "O FERRO ERA DESNECESSÁRIO — A FERRITINA ESTÁ NORMAL OU ELEVADA. CUIDADO AO REPOR FERRO, ESPECIALMENTE SE PARENTERAL: O EXCESSO É NOCIVO E PODE GERAR SIDEROSE.",
    proximosExames: ["HEMOGRAMA","RETICULÓCITOS","FERRITINA","SATURAÇÃO DA TRANSFERRINA","VITAMINA B12","ÁCIDO FÓLICO","TSH","T4 LIVRE","AST","ALT","GAMA-GT","BILIRRUBINAS","LDH","HAPTOGLOBINA","COOMBS DIRETO","ANTI-FATOR INTRÍNSECO","ANTI CÉLULA-PARIETAL","ENDOSCOPIA DIGESTIVA","COLONOSCOPIA DE ROTINA","CEA","CA 15.3","CA 125"],
  },
'''

    fem_src = fem_src[:idx] + nova_entrada_fem + fem_src[idx:]
    FEM.write_text(fem_src, encoding="utf-8")
    print("OK 2: ID 88 (Anemia Macrocitica + reservas preservadas) adicionado a femaleMatrix.")

# ═════════════════════════════════════════════════════════════════════
# PARTE 3 — Entrada equivalente em maleMatrix
# ═════════════════════════════════════════════════════════════════════
MAS = Path("src/engine/maleMatrix.js")
if not MAS.exists():
    print(f"ERRO: {MAS} nao existe.")
    sys.exit(1)

mas_src = MAS.read_text(encoding="utf-8")

if "id: 88" in mas_src:
    print("AVISO 3: ID 88 ja existe em maleMatrix.")
else:
    idx_m = mas_src.rfind("];")
    if idx_m < 0:
        print("ERRO 3: nao foi possivel encontrar o final do array maleMatrix.")
        sys.exit(1)

    nova_entrada_mas = '''
  // ─── ID 88 — ANEMIA MACROCÍTICA COM RESERVAS DE FERRO PRESERVADAS ───────────
  {
    id: 88,
    label: "ANEMIA MACROCÍTICA COM RESERVAS DE FERRO PRESERVADAS",
    color: "orange",
    conditions: {
      ferritina:   { min: 30,  max: 400  },
      hemoglobina: { min: 7.0, max: 13.4 },
      vcm:         { min: 101, max: 999  },
      rdw:         { min: 14,  max: 999  },
      satTransf:   { min: 20,  max: 50   },
      bariatrica:  false,
      vegetariano: false,
      perda:       false,
      alcoolista:  false,
      transfundido: false,
    },
    diagnostico: "ANEMIA MACROCÍTICA COM RESERVAS DE FERRO NORMAIS OU AUMENTADAS. O PADRÃO SUGERE DÉFICIT DE VITAMINA B12 E/OU ÁCIDO FÓLICO, HIPOTIREOIDISMO, DOENÇA HEPÁTICA, USO DE MEDICAMENTOS COMO METFORMINA, INIBIDORES DA BOMBA DE PRÓTONS (OMEPRAZOL/PANTOPRAZOL), METOTREXATO, ANTICONVULSIVANTES, ANTIRRETROVIRAIS, HIDROXIUREIA. EM IDOSOS, INVESTIGAR SÍNDROME MIELODISPLÁSICA. A FERRITINA NORMAL OU ELEVADA AFASTA DÉFICIT DE FERRO COMO CAUSA PRIMÁRIA DA ANEMIA.",
    recomendacaoAge1: "AVALIAÇÃO COM HEMATOLOGISTA. SOLICITAR DOSAGEM SÉRICA DE VITAMINA B12, ÁCIDO FÓLICO, TSH E T4 LIVRE, FUNÇÃO HEPÁTICA COMPLETA, RETICULÓCITOS E LDH. NÃO FAÇA NOVA DOAÇÃO DE SANGUE ENQUANTO NÃO ESCLARECER A ORIGEM DA ANEMIA. SE INDICADA DOAÇÃO DE SANGUE OU SANGRIA, SE EM REGIME DE SANGRIAS, CERTIFIQUE-SE DE QUE A FERRITINA É SUPERIOR A 100 ng/mL E QUE A SATURAÇÃO DA TRANSFERRINA É IGUAL OU SUPERIOR A 30%.",
    recomendacaoAge2: "AVALIAÇÃO COM HEMATOLOGISTA. SOLICITAR DOSAGEM SÉRICA DE VITAMINA B12, ÁCIDO FÓLICO, TSH E T4 LIVRE, FUNÇÃO HEPÁTICA COMPLETA, RETICULÓCITOS E LDH. NESSA FAIXA ETÁRIA TAMBÉM É IMPORTANTE PESQUISAR SÍNDROME MIELODISPLÁSICA — PODE SER NECESSÁRIO MIELOGRAMA. REVISAR TODAS AS MEDICAÇÕES DE USO CONTÍNUO (IBP, METFORMINA, METOTREXATO, ETC.). NÃO FAÇA DOAÇÃO DE SANGUE.",
    comentarioAspirina: "ASPIRINA PRODUZ PEQUENA PERDA CRÔNICA DE SANGUE, MAS AQUI A FERRITINA ESTÁ PRESERVADA, INDICANDO QUE NÃO ESTÁ CONTRIBUINDO SIGNIFICATIVAMENTE PARA A ANEMIA.",
    comentarioB12: "A B12 PODE ESTAR EM CURSO MAS INSUFICIENTE — AVALIAR DOSE, VIA E ADESÃO. SE A MACROCITOSE NÃO CORRIGIR COM PREPARAÇÕES ORAIS, USE VITAMINA B12 SUBLINGUAL OU INJETÁVEL. A DOSAGEM NO SANGUE DEVE SER USADA PARA AJUSTES.",
    comentarioFerro: "O FERRO ERA DESNECESSÁRIO — A FERRITINA ESTÁ NORMAL OU ELEVADA. CUIDADO AO REPOR FERRO, ESPECIALMENTE SE PARENTERAL: O EXCESSO É NOCIVO E PODE GERAR SIDEROSE.",
    proximosExames: ["HEMOGRAMA","RETICULÓCITOS","FERRITINA","SATURAÇÃO DA TRANSFERRINA","VITAMINA B12","ÁCIDO FÓLICO","TSH","T4 LIVRE","AST","ALT","GAMA-GT","BILIRRUBINAS","LDH","HAPTOGLOBINA","COOMBS DIRETO","ANTI-FATOR INTRÍNSECO","ANTI CÉLULA-PARIETAL","ENDOSCOPIA DIGESTIVA","COLONOSCOPIA DE ROTINA","CEA","PSA"],
  },
'''

    mas_src = mas_src[:idx_m] + nova_entrada_mas + mas_src[idx_m:]
    MAS.write_text(mas_src, encoding="utf-8")
    print("OK 3: ID 88 (equivalente masculino) adicionado a maleMatrix.")

# ═════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("TUDO OK! Arquivos modificados:")
print(f"  - {ACH}   (Achado 8)")
print(f"  - {FEM}   (nova entrada ID 88)")
print(f"  - {MAS}   (nova entrada ID 88)")
print()
print("Caso do Dr. Ramos agora coberto:")
print("  F 20a, Hb 9.2, VCM 106, Ferr 300, RDW 20, Sat 33")
print("  -> MATRIZ: 'ANEMIA MACROCITICA COM RESERVAS DE FERRO PRESERVADAS'")
print("  -> ACHADO: 'ANEMIA MACROCITICA SIGNIFICATIVA' (laranja, Hb 9.2)")
print()
print("Proximo passo:")
print('  git add . && git commit -m "feat: cobre anemia macrocitica com reservas preservadas (F+M)" && git push origin main')
