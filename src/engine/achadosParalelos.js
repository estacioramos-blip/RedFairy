// src/engine/achadosParalelos.js
//
// ACHADOS PARALELOS — Camada de deteccao que roda em paralelo ao
// diagnostico principal (matrix.find no decisionEngine.js).
//
// Retorna um ARRAY de achados exibidos abaixo do diagnostico principal
// no ResultCard. Cada achado: { id, label, color, texto }
//   - color: 'red' (grave) | 'orange' (importante) | 'yellow' (atencao)

export function detectarAchadosParalelos(inputs) {
  const achados = [];

  const ferritina   = Number(inputs.ferritina);
  const hemoglobina = Number(inputs.hemoglobina);
  const vcm         = Number(inputs.vcm);
  const rdw         = Number(inputs.rdw);
  const satTransf   = Number(inputs.satTransf);
  const sexo        = inputs.sexo;
  const usaFerro    = inputs.ferroOral || inputs.ferro_oral;
  const usaTesto    = inputs.testosterona;
  const alcoolista  = inputs.alcoolista;
  const usaB12      = inputs.vitaminaB12 || inputs.vitamina_b12 || inputs.b12;

  // Limites de Hb normal por sexo
  const hbNormalMin = sexo === 'M' ? 13.5 : 12.0;
  const hbNormalMax = sexo === 'M' ? 17.5 : 15.5;
  const hbNormal = hemoglobina >= hbNormalMin && hemoglobina <= hbNormalMax;

  // ─────────────────────────────────────────────────────────────
  // ACHADO 1 — SIDEROSE SEVERA (Ferritina >= 1000)
  // ─────────────────────────────────────────────────────────────
  if (ferritina >= 1000) {
    let texto = `Ferritina de ${ferritina} ng/mL caracteriza SIDEROSE SEVERA (sobrecarga marcada de ferro). `;

    if (usaFerro) {
      texto += 'O uso recente ou em curso de FERRO ORAL OU INJETÁVEL (especialmente ferro parenteral em altas doses) pode explicar a elevação observada. Nesse caso, a siderose tende a ser iatrogênica e reversível após suspensão do ferro e reavaliação em 3-6 meses. Suspenda o ferro e refaça ferritina. Se persistir elevada, investigar hemocromatose hereditária (gene HFE).';
    } else if (usaTesto) {
      texto += 'O uso de testosterona ou anabolizantes pode aumentar a ferritina indiretamente via estímulo eritroide e inflamação crônica, mas raramente atinge esses níveis isoladamente. Avaliar pesquisa de HFE.';
    } else if (alcoolista) {
      texto += 'O alcoolismo crônico é causa reconhecida de hiperferritinemia por dano hepatocelular e sobrecarga hepática de ferro. Investigar função hepática (AST/ALT/GGT) e considerar HFE. Abstinência alcoólica é fundamental.';
    } else {
      texto += 'Na ausência de história de ferro exógeno ou alcoolismo, esse nível é COMPATÍVEL COM HEMOCROMATOSE HEREDITÁRIA. Avaliação urgente com hematologista para pesquisa de mutação HFE (C282Y, H63D) e avaliação da saturação da transferrina. Sangrias terapêuticas costumam ser indicadas.';
    }

    achados.push({
      id: 'siderose-severa',
      label: 'SIDEROSE SEVERA — FERRITINA ≥ 1000',
      color: 'red',
      texto,
    });
  }
  // ─────────────────────────────────────────────────────────────
  // ACHADO 2 — HIPERFERRITINEMIA MODERADA (400-999) com Hb normal
  // ─────────────────────────────────────────────────────────────
  else if (ferritina >= 400 && ferritina < 1000 && hbNormal) {
    let texto = `Ferritina de ${ferritina} ng/mL (400-999) indica HIPERFERRITINEMIA MODERADA. `;

    if (satTransf <= 45) {
      texto += 'Com saturação da transferrina normal ou baixa, as causas mais frequentes são: processo inflamatório sistêmico (PCR/VHS), obesidade, síndrome metabólica, esteatose hepática (NAFLD/NASH) e doenças crônicas. Investigar PCR, função hepática, perfil lipídico e USG de abdome.';
    } else {
      texto += 'Com saturação da transferrina elevada, considerar SIDEROSE INICIAL por sobrecarga de ferro. Avaliar necessidade de sangrias terapêuticas e pesquisa de hemocromatose se persistir.';
    }

    if (usaFerro) {
      texto += ' O uso de ferro oral/injetável pode contribuir — considerar suspensão e reavaliação.';
    }

    achados.push({
      id: 'hiperferritinemia-moderada',
      label: 'HIPERFERRITINEMIA MODERADA (400-999)',
      color: 'orange',
      texto,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // ACHADO 3 — MICROCITOSE SEM ANEMIA (VCM < 80, Hb normal)
  // ─────────────────────────────────────────────────────────────
  if (vcm < 80 && hbNormal) {
    let texto = `VCM de ${vcm} fL caracteriza MICROCITOSE, mas sem anemia (Hb normal). `;

    if (rdw <= 15) {
      texto += 'Microcitose com RDW normal (homogênea) sugere TALASSEMIA MENOR (traço talassêmico alfa ou beta). Solicitar eletroforese de hemoglobina para confirmação. Não requer tratamento, apenas aconselhamento genético se planeja gestação.';
    } else {
      texto += 'Microcitose com RDW elevado (heterogênea) sugere SIDEROPENIA INCIPIENTE, mesmo com Hb ainda normal. Avaliar ferritina e saturação da transferrina. Investigar causa (dieta, sangramento oculto).';
    }

    achados.push({
      id: 'microcitose-sem-anemia',
      label: 'MICROCITOSE SEM ANEMIA (VCM < 80)',
      color: 'yellow',
      texto,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // ACHADO 4 — MACROCITOSE SEM ANEMIA (VCM > 100, Hb normal)
  // ─────────────────────────────────────────────────────────────
  if (vcm > 100 && hbNormal) {
    let texto = `VCM de ${vcm} fL caracteriza MACROCITOSE, mas sem anemia (Hb normal). `;

    if (usaB12) {
      texto += 'O uso de B12 pode justificar parcialmente — se iniciada recentemente, a macrocitose tende a regredir. ';
    }
    if (alcoolista) {
      texto += 'O alcoolismo é causa frequente de macrocitose por efeito tóxico direto sobre a medula. Abstinência reverte. ';
    }

    texto += 'Causas a investigar: deficiência de VITAMINA B12, deficiência de FOLATOS, HIPOTIREOIDISMO (solicitar TSH/T4L), uso de medicamentos (metformina, IBP, metotrexato, anticonvulsivantes, hidroxiureia, antirretrovirais), doença hepática e síndrome mielodisplásica (se idoso).';

    achados.push({
      id: 'macrocitose-sem-anemia',
      label: 'MACROCITOSE SEM ANEMIA (VCM > 100)',
      color: 'yellow',
      texto,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // ACHADO 5 — RDW ALTO COM HB E VCM NORMAIS
  // ─────────────────────────────────────────────────────────────
  if (rdw > 15 && hbNormal && vcm >= 80 && vcm <= 100) {
    achados.push({
      id: 'rdw-alto-sem-anemia',
      label: 'ANISOCITOSE PRECOCE (RDW alto, Hb e VCM normais)',
      color: 'yellow',
      texto: `RDW de ${rdw}% indica ANISOCITOSE (heterogeneidade do tamanho das hemácias) em um momento em que a Hb e o VCM ainda estão normais. Pode ser o primeiro sinal de um processo em evolução — sideropenia incipiente, déficit de B12/folato, doença inflamatória ou resposta medular a estresse. Avaliar ferritina, saturação da transferrina, B12, folatos e reticulócitos. Reavaliar em 1-2 meses.`,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // ACHADO 6 — ERITROCITOSE + TESTOSTERONA
  // ─────────────────────────────────────────────────────────────
  const hbAlta = hemoglobina > hbNormalMax;
  if (hbAlta && usaTesto) {
    achados.push({
      id: 'eritrocitose-testosterona',
      label: 'ERITROCITOSE PROVAVELMENTE SECUNDÁRIA A TESTOSTERONA',
      color: 'red',
      texto: `Hemoglobina de ${hemoglobina} g/dL (acima do normal) em uso de TESTOSTERONA ou ANABOLIZANTES. A testosterona exógena é causa comum e reversível de eritrocitose secundária, aumentando o risco de trombose, AVC e infarto. Conduta: avaliar suspensão ou redução da dose com o médico prescritor, considerar sangrias terapêuticas até hemoglobina < ${hbNormalMax} g/dL, monitorar hematócrito e PSA a cada 3-6 meses.`,
    });
  }

  return achados;
}
