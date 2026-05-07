import { maleMatrix } from './maleMatrix.js';
import { femaleMatrix } from './femaleMatrix.js';
import { detectarAchadosParalelos } from './achadosParalelos.js';
import { gerarFallbackClinico } from './fallbackEngine.js';

export function calcularDias(dataColeta) {
  const hoje = new Date();
  const coleta = new Date(dataColeta);
  const diffMs = hoje - coleta;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function getFraseData(dias) {
  if (dias <= 15) {
    return {
      tipo: 'A',
      texto: `OS EXAMES FORAM REALIZADOS HÁ ${dias} DIA(S), E DEVEM REPRESENTAR O ATUAL ESTADO DO SEU ERITRON.`
    };
  } else if (dias <= 30) {
    return {
      tipo: 'B',
      texto: `OS EXAMES FORAM REALIZADOS HÁ ${dias} DIAS. AINDA SÃO VÁLIDOS PARA A AVALIAÇÃO, MAS REPITA-OS EM BREVE E FAÇA NOVA AVALIAÇÃO NESTE ALGORITMO.`
    };
  } else if (dias <= 60) {
    return {
      tipo: 'B',
      texto: `OS EXAMES FORAM REALIZADOS HÁ ${dias} DIAS E PODEM NÃO REPRESENTAR CORRETAMENTE A REALIDADE ATUAL DO SEU ERITRON. REPITA-OS QUANDO POSSÍVEL E FAÇA NOVA AVALIAÇÃO NESTE ALGORITMO.`
    };
  } else {
    return {
      tipo: 'C',
      texto: `OS EXAMES FORAM REALIZADOS HÁ ${dias} DIAS E NÃO SÃO CONFIÁVEIS PARA ESTABELECER A SITUAÇÃO ATUAL DO SEU ERITRON. REPITA-OS ASSIM QUE POSSÍVEL E FAÇA NOVA AVALIAÇÃO NESTE ALGORITMO.`
    };
  }
}

export function getFraseHipermenorreia(idade) {
  if (idade < 15) {
    return 'HIPERMENORREIA NESSA FAIXA ETÁRIA É GERALMENTE DISFUNCIONAL, MAS PODE HAVER DISTÚRBIO DA HEMOSTASE. PODE LEVAR A DEFICIÊNCIA DE FERRO E ANEMIA, OU AGRAVAR ESSAS CONDIÇÕES. RECOMENDÁVEL AVALIAÇÃO COM GINECOLOGISTA E HEMATOLOGISTA.';
  } else if (idade <= 18) {
    return 'HIPERMENORREIA NESSA FAIXA ETÁRIA É GERALMENTE DISFUNCIONAL, MAS É PRECISO AFASTAR DISTÚRBIO DA HEMOSTASE E ENDOMETRIOSE. PODE LEVAR A DEFICIÊNCIA DE FERRO E ANEMIA. RECOMENDÁVEL AVALIAÇÃO COM GINECOLOGISTA E HEMATOLOGISTA.';
  } else if (idade <= 35) {
    return 'HIPERMENORREIA NESSA FAIXA ETÁRIA PODE RESULTAR DE USO DE DIU, ENDOMETRIOSE, DISTÚRBIO HORMONAL, MIOMATOSE. PODE LEVAR A DEFICIÊNCIA DE FERRO E ANEMIA. RECOMENDÁVEL AVALIAÇÃO COM MÉDICO GINECOLOGISTA.';
  } else if (idade <= 39) {
    return 'HIPERMENORREIA NESSA FAIXA ETÁRIA PODE RESULTAR DE USO DE DIU, LIGADURA DE TROMPAS, ENDOMETRIOSE, DISTÚRBIO HORMONAL, MIOMATOSE E OUTRAS DOENÇAS. RECOMENDÁVEL AVALIAÇÃO COM MÉDICO GINECOLOGISTA.';
  } else if (idade <= 55) {
    return 'HIPERMENORREIA NESSA FAIXA ETÁRIA PODE RESULTAR DE USO DE DIU, LIGADURA DE TROMPAS, ENDOMETRIOSE, PRÉ-MENOPAUSA, MIOMATOSE E OUTRAS DOENÇAS. RECOMENDÁVEL AVALIAÇÃO GINECOLÓGICA.';
  } else {
    // CORRIGIDO: sangramento pós-menopausa é sinal de alerta para neoplasia endometrial
    return 'SANGRAMENTO GENITAL APÓS A MENOPAUSA NÃO É NORMAL E EXIGE INVESTIGAÇÃO URGENTE. PODE INDICAR NEOPLASIA DO ENDOMÉTRIO, PÓLIPO, ATROFIA ENDOMETRIAL OU OUTRA DOENÇA GRAVE. AVALIAÇÃO GINECOLÓGICA URGENTE COM ULTRASSOM TRANSVAGINAL E AVALIAÇÃO DO ENDOMÉTRIO É MANDATÓRIA.';
  }
}

function inRange(value, range) {
  if (!range) return true;
  return value >= range.min && value <= range.max;
}

function matchesConditions(item, inputs) {
  const c = item.conditions;
  if (!inRange(inputs.ferritina,   c.ferritina))   return false;
  if (!inRange(inputs.hemoglobina, c.hemoglobina)) return false;
  if (!inRange(inputs.vcm,         c.vcm))         return false;
  if (!inRange(inputs.rdw,         c.rdw))         return false;
  if (!inRange(inputs.satTransf,   c.satTransf))   return false;

  if (c.bariatrica     !== undefined && (inputs.bariatrica     ?? false) !== c.bariatrica)     return false;
  if (c.vegetariano    !== undefined && (inputs.vegetariano    ?? false) !== c.vegetariano)    return false;
  if (c.perda          !== undefined && (inputs.perda          ?? false) !== c.perda)          return false;
  if (c.alcoolista     !== undefined && (inputs.alcoolista     ?? false) !== c.alcoolista)     return false;
  if (c.transfundido   !== undefined && (inputs.transfundido   ?? false) !== c.transfundido)   return false;
  if (c.gestante       !== undefined && (inputs.gestante       ?? false) !== c.gestante)       return false;
  if (c.hipermenorreia !== undefined && (inputs.hipermenorreia ?? false) !== c.hipermenorreia) return false;

  return true;
}

export function avaliarPaciente(inputs) {
  // CORREÇÃO: ajuste gestante simplificado — sem alteração artificial de Hb
  // A OMS define anemia na gestação como Hb < 11.0 g/dL
  // Mantemos o valor original e deixamos as matrizes tratarem
  const inputsAjustados = { ...inputs };

  const matrix = inputsAjustados.sexo === 'M' ? maleMatrix : femaleMatrix;

  const isAge2 = inputsAjustados.sexo === 'M'
    ? inputsAjustados.idade >= 41
    : inputsAjustados.idade >= 40;

  const resultado = matrix.find(item => matchesConditions(item, inputsAjustados));

  // Fix palavra 'NOVA': se paciente NAO tem historico de perda/sangria,
  // a palavra 'NOVA' antes de DOACAO/SANGRIA pressupoe antecedente inexistente.
  // Remover 'NOVA ' para manter o texto coerente.
  if (resultado && !inputs.perda) {
    const limparNova = (txt) => typeof txt === 'string'
      ? txt.replace(/NOVA DOA[ÇC][ÃA]O/g, 'DOAÇÃO')
           .replace(/nova doa[çc][ãa]o/g, 'doação')
           .replace(/NOVA SANGRIA/g, 'SANGRIA')
           .replace(/nova sangria/g, 'sangria')
      : txt;
    resultado.diagnostico      = limparNova(resultado.diagnostico);
    resultado.recomendacaoAge1 = limparNova(resultado.recomendacaoAge1);
    resultado.recomendacaoAge2 = limparNova(resultado.recomendacaoAge2);
  }

  // Fix frase '16-17 anos': so relevante para pacientes menores de 18 anos.
  // Em adultos (>= 18), a frase eh ruido e deve ser removida.
  if (resultado && Number(inputs.idade) >= 18) {
    const removerFraseMenor = (txt) => typeof txt === 'string'
      ? txt.replace(/\s*ENTRE 16 E 17 ANOS DE IDADE É PRECISO AUTORIZAÇÃO DOS RESPONSÁVEIS LEGAIS PARA DOAR SANGUE\./g, '')
           .replace(/\s*entre 16 e 17 anos de idade é preciso autorização dos responsáveis legais para doar sangue\./g, '')
      : txt;
    resultado.recomendacaoAge1 = removerFraseMenor(resultado.recomendacaoAge1);
    resultado.recomendacaoAge2 = removerFraseMenor(resultado.recomendacaoAge2);
  }
  const dias = calcularDias(inputs.dataColeta);
  const fraseData = getFraseData(dias);

  const fraseHiper = (inputs.sexo === 'F' && inputs.hipermenorreia)
    ? getFraseHipermenorreia(inputs.idade)
    : null;

  const comentarios = [];
  if (inputs.aspirina && resultado?.comentarioAspirina) {
    comentarios.push({ titulo: 'ASPIRINA', texto: resultado.comentarioAspirina });
  }
  if (inputs.vitaminaB12 && resultado?.comentarioB12) {
    comentarios.push({ titulo: 'VITAMINA B12', texto: resultado.comentarioB12 });
  }
  // Ferro oral vs injetavel: usa comentario especifico se existir, senao cai em comentarioFerro generico
  if (inputs.ferro_injetavel && resultado?.comentarioFerroInjetavel) {
    comentarios.push({ titulo: 'FERRO INJETÁVEL', texto: resultado.comentarioFerroInjetavel });
  } else if (inputs.ferro_oral && resultado?.comentarioFerroOral) {
    comentarios.push({ titulo: 'FERRO ORAL', texto: resultado.comentarioFerroOral });
  } else if ((inputs.ferro_oral || inputs.ferro_injetavel) && resultado?.comentarioFerro) {
    // Fallback: comentario generico quando nao ha especifico
    const titulo = inputs.ferro_injetavel && inputs.ferro_oral
      ? 'FERRO ORAL + INJETÁVEL'
      : inputs.ferro_injetavel
        ? 'FERRO INJETÁVEL'
        : 'FERRO ORAL';
    comentarios.push({ titulo, texto: resultado.comentarioFerro });
  }
  // ── Medicamentos que podem causar macrocitose ──────────────────────────────
  if (inputs.metformina) {
    const temMacrocitose = Number(inputs.vcm) >= 100
    if (temMacrocitose) {
      comentarios.push({
        titulo: 'METFORMINA + MACROCITOSE',
        texto: `METFORMINA EM USO COM MACROCITOSE (VCM ${inputs.vcm}): padrão provavelmente iatrogênico — a metformina reduz a absorção de vitamina B12 no íleo terminal. Recomendável dosar B12 sérica e avaliar consulta com hematologista. A suplementação sublingual de 1000 mcg/dia costuma corrigir o quadro; se persistir, considerar B12 injetável.`
      })
    } else {
      comentarios.push({
        titulo: 'METFORMINA',
        texto: 'METFORMINA EM USO. A medicação reduz a absorção de vitamina B12 no íleo terminal. Uso prolongado pode produzir déficit de B12 e macrocitose. Recomendável dosagem sérica anual de B12 e suplementação preventiva se houver sinais de depleção.'
      })
    }
  }
  if (inputs.ibp) {
    const vcmNum = Number(inputs.vcm)
    const ferrNum = Number(inputs.ferritina)
    const temMacrocitose = vcmNum >= 100
    const temSideropenia = ferrNum < 50
    if (temMacrocitose || temSideropenia) {
      const labs = []
      if (temMacrocitose) labs.push(`VCM ${inputs.vcm}`)
      if (temSideropenia) labs.push(`Ferritina ${inputs.ferritina}`)
      comentarios.push({
        titulo: 'IBP + PADRÃO SUSPEITO',
        texto: `IBP (OMEPRAZOL/PANTOPRAZOL) COM ${labs.join(' e ')}: o uso crônico de inibidores da bomba de prótons reduz a acidez gástrica, comprometendo a absorção de vitamina B12 e de ferro heme. Recomendável dosar B12 sérica, revisar a indicação do IBP com o médico assistente e considerar suplementação enquanto o uso for necessário.`
      })
    } else {
      comentarios.push({
        titulo: 'IBP (OMEPRAZOL / PANTOPRAZOL)',
        texto: 'IBP EM USO PROLONGADO. Reduz a absorção de vitamina B12 e de ferro heme ao diminuir a acidez gástrica. Pode contribuir para macrocitose e sideropenia ao longo do tempo. Recomendável dosagem sérica anual de B12 e revisão periódica da indicação.'
      })
    }
  }
  if (inputs.tiroxina) {
    comentarios.push({ titulo: 'TIROXINA / T4', texto: 'O HIPOTIREOIDISMO PODE CAUSAR ANEMIA NORMOCÍTICA OU MACROCÍTICA. A REPOSIÇÃO COM TIROXINA COSTUMA CORRIGIR A ANEMIA GRADUALMENTE. MONITORAR TSH E HEMOGRAMA A CADA 6 MESES.' });
  }
  if (inputs.hidroxiureia) {
    const temMacrocitose = Number(inputs.vcm) > 100
    if (temMacrocitose) {
      comentarios.push({
        titulo: 'HIDROXIUREIA + MACROCITOSE',
        texto: `HIDROXIUREIA EM USO COM MACROCITOSE (VCM ${inputs.vcm}): esse achado é ESPERADO — a hidroxiureia inibe a síntese de DNA e produz macrocitose dose-dependente. Não indica déficit nutricional nem requer suspensão. Manter acompanhamento pelo hematologista; a macrocitose pode ser marcador de aderência ao tratamento.`
      })
    } else {
      comentarios.push({
        titulo: 'HIDROXIUREIA',
        texto: 'HIDROXIUREIA EM USO. A medicação inibe a síntese de DNA e tipicamente produz macrocitose — sua ausência aqui pode significar dose abaixo do terapêutico ou início recente. Manter acompanhamento pelo hematologista.'
      })
    }
  }
  if (inputs.anticonvulsivante) {
    comentarios.push({ titulo: 'ANTICONVULSIVANTE', texto: 'FENITOÍNA, ÁCIDO VALPROICO E CARBAMAZEPINA PODEM INTERFERIR NO METABOLISMO DO ÁCIDO FÓLICO E PRODUZIR MACROCITOSE. AVALIAR DOSAGEM DE FOLATOS E VITAMINA B12. SUPLEMENTAÇÃO PROFILÁTICA DE ÁCIDO FÓLICO PODE SER INDICADA.' });
  }
  if (inputs.methotrexato) {
    const temMacrocitose = Number(inputs.vcm) >= 100
    if (temMacrocitose) {
      comentarios.push({
        titulo: 'METOTREXATO + MACROCITOSE',
        texto: `METOTREXATO EM USO COM MACROCITOSE (VCM ${inputs.vcm}): padrão compatível com antagonismo do folato. Recomendável otimizar a suplementação de ácido fólico (5 mg/semana, ou 1 mg/dia) e avaliar com o reumatologista/médico assistente se a dose do metotrexato está adequada. Não suspender sem orientação médica.`
      })
    } else {
      comentarios.push({
        titulo: 'METOTREXATO',
        texto: 'METOTREXATO EM USO. Antagonista do ácido fólico — pode produzir macrocitose e anemia megaloblástica ao longo do tempo. A suplementação profilática de ácido fólico (5 mg/semana) é fundamental para prevenir déficit. Manter monitoramento periódico de hemograma.'
      })
    }
  }
  if (inputs.hivTratamento) {
    comentarios.push({ titulo: 'ANTIRRETROVIRAIS (HIV)', texto: 'ALGUNS ANTIRRETROVIRAIS, ESPECIALMENTE ZIDOVUDINA (AZT), PRODUZEM MACROCITOSE E ANEMIA MEGALOBLÁSTICA POR INIBIÇÃO DA SÍNTESE DE DNA ERITROIDE. MONITORAR HEMOGRAMA E CONSIDERAR AJUSTE DO ESQUEMA COM O INFECTOLOGISTA.' });
  }

  // ── Histórico clínico — condições de base ──────────────────────────────
  if (inputs.testosterona) {
    comentarios.push({ titulo: 'TESTOSTERONA / ANABOLIZANTE', texto: 'O USO EXÓGENO DE TESTOSTERONA OU ANABOLIZANTES ESTIMULA A ERITROPOESE E PODE PRODUZIR ERITROCITOSE (HEMOGLOBINA E HEMATÓCRITO ELEVADOS), AUMENTANDO O RISCO DE TROMBOSE, AVC E INFARTO. SE A HEMOGLOBINA ESTIVER ELEVADA, A TESTOSTERONA EXÓGENA É A CAUSA MAIS PROVÁVEL. SANGRIAS PERIÓDICAS PODEM SER NECESSÁRIAS. MONITORAR HEMOGRAMA, HEMATÓCRITO E PSA A CADA 3-6 MESES.' });
  }
  if (inputs.anemiaPrevia) {
    comentarios.push({ titulo: 'ANEMIA CRÔNICA / PRÉVIA', texto: 'O HISTÓRICO DE ANEMIA CRÔNICA OU PRÉVIA É RELEVANTE PARA CONTEXTUALIZAR O RESULTADO ATUAL. SE O ERITRON ESTÁ COMPENSADO, A CAUSA FOI TRATADA OU CONTROLADA. SE HÁ ANEMIA PERSISTENTE, INVESTIGAR SE A CAUSA ORIGINAL FOI ADEQUADAMENTE TRATADA OU SE HÁ NOVA CAUSA SOBREPOSTA.' });
  }
  if (inputs.sideropenia) {
    comentarios.push({ titulo: 'DEFICIÊNCIA DE FERRO (HISTÓRICO)', texto: 'HISTÓRICO DE FERRITINA BAIXA. SE OS EXAMES ATUAIS MOSTRAM FERRITINA NORMALIZADA, O TRATAMENTO FOI EFICAZ. SE A SIDEROPENIA PERSISTE, INVESTIGAR CAUSA SUBJACENTE (SANGRAMENTO OCULTO, MÁ ABSORÇÃO, DIETA INSUFICIENTE) E INTENSIFICAR A REPOSIÇÃO.' });
  }
  if (inputs.sobrecargaFerro) {
    comentarios.push({ titulo: 'EXCESSO DE FERRO / HEMOCROMATOSE (HISTÓRICO)', texto: 'HISTÓRICO DE FERRITINA ELEVADA OU HEMOCROMATOSE. SE A FERRITINA ATUAL ESTÁ NORMALIZADA, AS SANGRIAS TERAPÊUTICAS OU TRATAMENTO FORAM EFICAZES. SE PERSISTIR ELEVADA, MANTER SEGUIMENTO COM HEMATOLOGISTA E AVALIAR FREQUÊNCIA DAS SANGRIAS. MONITORAR SATURAÇÃO DA TRANSFERRINA.' });
  }
  if (inputs.hbAlta) {
    comentarios.push({ titulo: 'HEMOGLOBINA ALTA / POLICITEMIA (HISTÓRICO)', texto: 'HISTÓRICO DE HEMOGLOBINA ELEVADA OU POLICITEMIA. SE A HEMOGLOBINA ATUAL ESTÁ NORMAL, O TRATAMENTO (SANGRIAS, HIDROXIUREIA) ESTÁ SENDO EFICAZ. SE AINDA ELEVADA, MANTER SEGUIMENTO COM HEMATOLOGISTA. PESQUISAR MUTAÇÃO JAK2 SE AINDA NÃO REALIZADO.' });
  }
  if (inputs.doadorSangue) {
    comentarios.push({ titulo: 'DOADOR DE SANGUE', texto: 'DOAÇÕES FREQUENTES DE SANGUE PODEM DEPLECIONAR AS RESERVAS DE FERRO AO LONGO DO TEMPO. CADA DOAÇÃO REMOVE APROXIMADAMENTE 200-250 MG DE FERRO. SE A FERRITINA ESTÁ BAIXA OU LIMÍTROFE, AGUARDAR RECUPERAÇÃO ANTES DE NOVA DOAÇÃO E CONSIDERAR SUPLEMENTAÇÃO DE FERRO. MONITORAR FERRITINA ANUALMENTE.' });
  }
  if (inputs.celiaco) {
    comentarios.push({ titulo: 'DOENÇA CELÍACA', texto: 'A DOENÇA CELÍACA CAUSA MÁ ABSORÇÃO DE FERRO, ÁCIDO FÓLICO E VITAMINA B12 NO INTESTINO DELGADO. MESMO COM DIETA SEM GLÚTEN, A ABSORÇÃO PODE ESTAR COMPROMETIDA. SE HÁ ANEMIA FERROPRIVA OU MACROCÍTICA REFRATÁRIA, INVESTIGAR ADESÃO À DIETA E CONSIDERAR ANTICORPOS ANTITRANSGLUTAMINASE. FERRO ENDOVENOSO PODE SER NECESSÁRIO.' });
  }
  if (inputs.endometriose) {
    comentarios.push({ titulo: 'ENDOMETRIOSE / MIOMAS', texto: 'ENDOMETRIOSE E MIOMAS UTERINOS SÃO CAUSAS FREQUENTES DE SANGRAMENTO EXCESSIVO E DEFICIÊNCIA DE FERRO NA MULHER. SE HÁ ANEMIA FERROPRIVA, INVESTIGAR SE O SANGRAMENTO GINECOLÓGICO É A CAUSA. O TRATAMENTO DA DOENÇA DE BASE É FUNDAMENTAL — SEM CONTROLE DO SANGRAMENTO, A REPOSIÇÃO DE FERRO SERÁ SEMPRE INSUFICIENTE.' });
  }
  if (inputs.g6pd) {
    comentarios.push({ titulo: 'DEFICIÊNCIA DE G-6-PD (FAVISMO)', texto: 'A DEFICIÊNCIA DE GLICOSE-6-FOSFATO DESIDROGENASE (G-6-PD) PREDISPÕE A CRISES HEMOLÍTICAS DESENCADEADAS POR MEDICAMENTOS OXIDANTES (PRIMAQUINA, DAPSONA, NITROFURANTOÍNA, SULFAS), INFECÇÕES E INGESTÃO DE FAVA. EVITAR ESSES GATILHOS. EM CRISE HEMOLÍTICA: ANEMIA COM VCM NORMAL A LEVEMENTE ELEVADO, RDW ALTO E FERRITINA NORMAL A ALTA.' });
  }

  if (!resultado) {
    // Fallback clínico — gera resposta útil quando não há match nas matrizes
    const fallback = gerarFallbackClinico(inputsAjustados);
    fallback.diasDesdeColeta = calcularDias(inputs.dataColeta);
    fallback.fraseData = getFraseData(fallback.diasDesdeColeta);
    return fallback;
  }


  // ── TEXTO 3 DINÂMICO: ineficácia de via oral em bariátricos ──
  // Substitui a frase estática (já removida das matrizes) por frase
  // dinâmica baseada nas flags do paciente.
  if (inputs.bariatrica) {
    const bariatricoTermo = inputs.sexo === 'M' ? 'NO BARIÁTRICO' : 'NA BARIÁTRICA';
    let fraseT3 = '';
    if (inputs.ferro_oral && inputs.vitaminaB12) {
      fraseT3 = `VITAMINA B12 E FERRO POR VIA ORAL NÃO FUNCIONAM ${bariatricoTermo}. `;
    } else if (inputs.vitaminaB12) {
      fraseT3 = `VITAMINA B12 POR VIA ORAL NÃO FUNCIONA ${bariatricoTermo}. `;
    } else if (inputs.ferro_oral) {
      fraseT3 = `FERRO POR VIA ORAL NÃO FUNCIONA ${bariatricoTermo}. `;
    }
    if (fraseT3 && resultado.diagnostico) {
      // Injetar antes da próxima frase relevante (REQUER AVALIAÇÃO MÉDICA...)
      // Ou no fim do diagnóstico se não houver tal âncora
      if (resultado.diagnostico.includes('REQUER AVALIAÇÃO MÉDICA')) {
        resultado.diagnostico = resultado.diagnostico.replace(
          'REQUER AVALIAÇÃO MÉDICA',
          fraseT3 + 'REQUER AVALIAÇÃO MÉDICA'
        );
      } else {
        resultado.diagnostico = resultado.diagnostico.trimEnd() + ' ' + fraseT3.trim();
      }
    }
  }


  // ── TEXTO 4 DINÂMICO: recomendação de reposição parenteral ──
  // Substitui [T4_PLACEHOLDER] (já injetado nas matrizes no lugar da
  // frase estática) pela frase dinâmica baseada nas flags do paciente.
  if (resultado.diagnostico && resultado.diagnostico.includes('[T4_PLACEHOLDER]')) {
    const usaB12Parenteral = inputs.vitB12_SL || inputs.vitB12_IM;
    const usaFerroParenteral = inputs.ferro_injetavel;
    let fraseT4 = '';
    if (!usaB12Parenteral && !usaFerroParenteral) {
      fraseT4 = 'REQUER AVALIAÇÃO MÉDICA. RECOMENDA-SE REPOSIÇÃO COM VITAMINA B12 SUBLINGUAL OU PARENTERAL, E FERRO ENDOVENOSO.';
    } else if (!usaB12Parenteral && usaFerroParenteral) {
      fraseT4 = 'REQUER AVALIAÇÃO MÉDICA. RECOMENDA-SE REPOSIÇÃO COM VITAMINA B12 SUBLINGUAL OU PARENTERAL.';
    } else if (usaB12Parenteral && !usaFerroParenteral) {
      fraseT4 = 'REQUER AVALIAÇÃO MÉDICA. RECOMENDA-SE REPOSIÇÃO COM FERRO ENDOVENOSO.';
    } else {
      fraseT4 = 'REQUER AVALIAÇÃO MÉDICA.';
    }
    resultado.diagnostico = resultado.diagnostico.replace(/\[T4_PLACEHOLDER\]/g, fraseT4);
  }
  // Mesmo tratamento para recomendacaoAge1/Age2 (se houver)
  if (resultado.recomendacaoAge1 && resultado.recomendacaoAge1.includes('[T4_PLACEHOLDER]')) {
    const usaB12Parenteral = inputs.vitB12_SL || inputs.vitB12_IM;
    const usaFerroParenteral = inputs.ferro_injetavel;
    let fraseT4 = '';
    if (!usaB12Parenteral && !usaFerroParenteral) {
      fraseT4 = 'REQUER AVALIAÇÃO MÉDICA. RECOMENDA-SE REPOSIÇÃO COM VITAMINA B12 SUBLINGUAL OU PARENTERAL, E FERRO ENDOVENOSO.';
    } else if (!usaB12Parenteral && usaFerroParenteral) {
      fraseT4 = 'REQUER AVALIAÇÃO MÉDICA. RECOMENDA-SE REPOSIÇÃO COM VITAMINA B12 SUBLINGUAL OU PARENTERAL.';
    } else if (usaB12Parenteral && !usaFerroParenteral) {
      fraseT4 = 'REQUER AVALIAÇÃO MÉDICA. RECOMENDA-SE REPOSIÇÃO COM FERRO ENDOVENOSO.';
    } else {
      fraseT4 = 'REQUER AVALIAÇÃO MÉDICA.';
    }
    resultado.recomendacaoAge1 = resultado.recomendacaoAge1.replace(/\[T4_PLACEHOLDER\]/g, fraseT4);
  }
  if (resultado.recomendacaoAge2 && resultado.recomendacaoAge2.includes('[T4_PLACEHOLDER]')) {
    const usaB12Parenteral = inputs.vitB12_SL || inputs.vitB12_IM;
    const usaFerroParenteral = inputs.ferro_injetavel;
    let fraseT4 = '';
    if (!usaB12Parenteral && !usaFerroParenteral) {
      fraseT4 = 'REQUER AVALIAÇÃO MÉDICA. RECOMENDA-SE REPOSIÇÃO COM VITAMINA B12 SUBLINGUAL OU PARENTERAL, E FERRO ENDOVENOSO.';
    } else if (!usaB12Parenteral && usaFerroParenteral) {
      fraseT4 = 'REQUER AVALIAÇÃO MÉDICA. RECOMENDA-SE REPOSIÇÃO COM VITAMINA B12 SUBLINGUAL OU PARENTERAL.';
    } else if (usaB12Parenteral && !usaFerroParenteral) {
      fraseT4 = 'REQUER AVALIAÇÃO MÉDICA. RECOMENDA-SE REPOSIÇÃO COM FERRO ENDOVENOSO.';
    } else {
      fraseT4 = 'REQUER AVALIAÇÃO MÉDICA.';
    }
    resultado.recomendacaoAge2 = resultado.recomendacaoAge2.replace(/\[T4_PLACEHOLDER\]/g, fraseT4);
  }

  let diagnosticoFinal = resultado.diagnostico.replace('FRASE DATA', '').trim();

  const temQualquerFlag = inputs.aspirina || inputs.vitaminaB12 || inputs.ferro_oral ||
    inputs.metformina || inputs.ibp || inputs.tiroxina || inputs.hidroxiureia ||
    inputs.anticonvulsivante || inputs.methotrexato || inputs.hivTratamento ||
    inputs.testosterona || inputs.anemiaPrevia || inputs.sideropenia ||
    inputs.sobrecargaFerro || inputs.hbAlta || inputs.celiaco || inputs.g6pd ||
    inputs.endometriose || inputs.doadorSangue || inputs.alcoolista ||
    inputs.vegetariano || inputs.perda || inputs.transfundido || inputs.bariatrica;
  if (temQualquerFlag) {
    diagnosticoFinal = diagnosticoFinal.replace(
      'SEM SUPLEMENTAÇÃO OU MEDICAMENTOS, SUGERE BOM ESTADO DE SAÚDE, COM ESTILO DE VIDA E DIETA SAUDÁVEIS.',
      'SUGERE BOM ESTADO DE SAÚDE, COM ESTILO DE VIDA E DIETA SAUDÁVEIS.'
    );
  }

  let recomendacaoFinal = isAge2 ? resultado.recomendacaoAge2 : resultado.recomendacaoAge1;

  if (inputs.perda) {
    recomendacaoFinal = recomendacaoFinal.replace(
      'VOCÊ NÃO PODERIA DOAR SANGUE.',
      'SE A HEMORRAGIA QUE VOCÊ MARCOU REFERE-SE A DOAÇÃO DE SANGUE OU SANGRIA, VOCÊ NÃO DEVIA TER FEITO.'
    );
  }


  // ── Modificador G-6-PD pós-matching ────────────────────────────────────
  let g6pdAlerta = null
  if (inputs.g6pd) {
    const idsHemoliticos = [77, 78, 79, 62, 63, 64]
    if (idsHemoliticos.includes(resultado.id)) {
      g6pdAlerta = 'DEFICIÊNCIA DE G-6-PD: O PADRÃO LABORATORIAL ATUAL É COMPATÍVEL COM CRISE HEMOLÍTICA. A G-6-PD É A CAUSA MAIS PROVÁVEL. IDENTIFICAR E ELIMINAR O GATILHO (MEDICAMENTO, INFECÇÃO OU ALIMENTO). MONITORAR LDH, BILIRRUBINAS E RETICULÓCITOS.'
    } else if (['green', 'yellow'].includes(resultado.color)) {
      g6pdAlerta = 'DEFICIÊNCIA DE G-6-PD: O ERITRON ESTÁ COMPENSADO NO MOMENTO, MAS O RISCO DE CRISE HEMOLÍTICA PERMANECE. EVITAR MEDICAMENTOS OXIDANTES (PRIMAQUINA, DAPSONA, NITROFURANTOÍNA, SULFAS) E INGESTÃO DE FAVA.'
    }
  }

  const achadosParalelos = detectarAchadosParalelos(inputs);

  return {
    encontrado: true,
    id: resultado.id,
    label: resultado.label,
    color: resultado.color,
    diagnostico: diagnosticoFinal,
    recomendacao: recomendacaoFinal,
    comentarios,
    proximosExames: resultado.proximosExames,
    fraseData,
    fraseHipermenorreia: fraseHiper,
    g6pdAlerta,
    isAge2,
    diasDesdeColeta: dias,
    achadosParalelos,
    obsoleto: dias > 730,
  };
}


// ─────────────────────────────────────────────────────────────────────
// TRIAGEM DO ERITRON — avaliação parcial sem Ferritina/Sat
// ─────────────────────────────────────────────────────────────────────
// Classifica morfologicamente a anemia/policitemia usando apenas:
//   - Hb (hemoglobina)
//   - VCM (volume corpuscular médio)
//   - RDW (red distribution width)
//   - Sexo, idade, gestante
//
// Retorna objeto compatível com ResultCard (com flag triagem: true).
// Se eritron normal, retorna resultado de "tudo ok" sem CTA.
// ─────────────────────────────────────────────────────────────────────
export function triagemEritron(inputs) {
  const hb = parseFloat(inputs.hemoglobina);
  const vcm = parseFloat(inputs.vcm);
  const rdw = parseFloat(inputs.rdw);
  const sexo = inputs.sexo;
  const gestante = !!inputs.gestante;

  // Faixas de Hb normal
  let hbMin, hbMax;
  if (sexo === 'M') { hbMin = 13.5; hbMax = 17.5; }
  else if (gestante) { hbMin = 11.0; hbMax = 15.5; }
  else { hbMin = 12.0; hbMax = 15.5; }

  // Classificação Hb
  let classificacaoHb = 'NORMAL';
  let gravidadeHb = null;
  if (hb < hbMin) {
    classificacaoHb = 'BAIXA';
    if (sexo === 'M') {
      if (hb >= 13 && hb < 13.5)  gravidadeHb = 'LEVE';
      else if (hb >= 12.5 && hb < 13)  gravidadeHb = 'MODERADA';
      else if (hb >= 9 && hb < 12.5)   gravidadeHb = 'IMPORTANTE';
      else if (hb < 9)                 gravidadeHb = 'GRAVE';
    } else if (gestante) {
      if (hb >= 10 && hb < 11)    gravidadeHb = 'LEVE';
      else if (hb >= 9 && hb < 10)     gravidadeHb = 'MODERADA';
      else if (hb >= 8 && hb < 9)      gravidadeHb = 'IMPORTANTE';
      else if (hb < 8)                 gravidadeHb = 'GRAVE';
    } else {
      if (hb >= 10 && hb < 12)    gravidadeHb = 'LEVE';
      else if (hb >= 8 && hb < 10)     gravidadeHb = 'MODERADA';
      else if (hb >= 7 && hb < 8)      gravidadeHb = 'IMPORTANTE';
      else if (hb < 7)                 gravidadeHb = 'GRAVE';
    }
  } else if (hb > hbMax) {
    classificacaoHb = 'ALTA';
    if (sexo === 'M') {
      if (hb > 17.5 && hb <= 18.5) gravidadeHb = 'LEVE';
      else if (hb > 18.5 && hb <= 19.5) gravidadeHb = 'MODERADA';
      else if (hb > 19.5)               gravidadeHb = 'GRAVE';
    } else if (gestante) {
      if (hb > 15 && hb <= 16)     gravidadeHb = 'LEVE';
      else if (hb > 16 && hb <= 17)     gravidadeHb = 'MODERADA';
      else if (hb > 17)                 gravidadeHb = 'GRAVE';
    } else {
      if (hb > 15.5 && hb <= 16.5) gravidadeHb = 'LEVE';
      else if (hb > 16.5 && hb <= 17.5) gravidadeHb = 'MODERADA';
      else if (hb > 17.5)               gravidadeHb = 'GRAVE';
    }
  }

  // Classificação VCM (morfologia eritrocitária)
  let classificacaoVCM = 'NORMOCÍTICA';
  if (vcm < 80) classificacaoVCM = 'MICROCÍTICA';
  else if (vcm > 100) classificacaoVCM = 'MACROCÍTICA';

  // Classificação RDW (anisocitose)
  const isAnisocitica = rdw > 15;

  // ────── ERITRON NORMAL ──────
  if (classificacaoHb === 'NORMAL' && classificacaoVCM === 'NORMOCÍTICA' && !isAnisocitica) {
    return {
      encontrado: true,
      triagem: true,
      label: 'ERITRON NORMAL',
      color: 'green',
      diagnostico: 'Eritrograma dentro dos limites normais para idade e sexo. Hemoglobina, VCM e RDW estão na faixa esperada.',
      recomendacao: 'Manter estilo de vida saudável e controle anual rotineiro.',
      recomendacaoAge1: 'Manter estilo de vida saudável e controle anual rotineiro.',
      recomendacaoAge2: 'Manter estilo de vida saudável e controle anual rotineiro.',
      classificacaoHb: 'NORMAL',
      classificacaoVCM: 'NORMOCÍTICA',
      isAnisocitica: false,
      proximosExames: [],
      comentarios: [],
      achadosParalelos: [],
      g6pdAlerta: null,
      obsoleto: false,
      _inputs: inputs,
    };
  }

  // ────── ERITRON ANORMAL ──────
  // Construir label
  let label = '';
  let descricao = '';

  if (classificacaoHb === 'BAIXA') {
    label = 'ANEMIA';
    if (classificacaoVCM === 'MICROCÍTICA') label += ' MICROCÍTICA';
    else if (classificacaoVCM === 'MACROCÍTICA') label += ' MACROCÍTICA';
    else label += ' NORMOCÍTICA';
    if (isAnisocitica) label += ' E ANISOCÍTICA';
    if (gravidadeHb) label += ` — ${gravidadeHb}`;
    descricao = `Hemoglobina ${hb.toFixed(1)} g/dL — anemia ${gravidadeHb ? gravidadeHb.toLowerCase() : ''} `;
    descricao += `com hemácias ${classificacaoVCM.toLowerCase()} (VCM ${vcm.toFixed(0)} fL)`;
    if (isAnisocitica) descricao += ` e anisocitose (RDW ${rdw.toFixed(1)}%)`;
    descricao += '.';
  } else if (classificacaoHb === 'ALTA') {
    label = 'POLIGLOBULIA / ERITROCITOSE';
    if (gravidadeHb) label += ` — ${gravidadeHb}`;
    descricao = `Hemoglobina ${hb.toFixed(1)} g/dL — eritrocitose ${gravidadeHb ? gravidadeHb.toLowerCase() : ''}.`;
    if (classificacaoVCM === 'MICROCÍTICA') {
      descricao += ` VCM baixo (${vcm.toFixed(0)} fL) sugere policitemia ferropriva ou talassemia.`;
    } else if (classificacaoVCM === 'MACROCÍTICA') {
      descricao += ` VCM elevado (${vcm.toFixed(0)} fL) sugere eritropoese aumentada.`;
    }
    if (isAnisocitica) descricao += ` Anisocitose (RDW ${rdw.toFixed(1)}%) sinaliza heterogeneidade eritrocitária.`;
  } else if (classificacaoHb === 'NORMAL') {
    if (classificacaoVCM === 'MICROCÍTICA') {
      label = 'MICROCITOSE SEM ANEMIA';
      descricao = `Hb normal (${hb.toFixed(1)} g/dL) com VCM baixo (${vcm.toFixed(0)} fL).`;
    } else if (classificacaoVCM === 'MACROCÍTICA') {
      label = 'MACROCITOSE SEM ANEMIA';
      descricao = `Hb normal (${hb.toFixed(1)} g/dL) com VCM alto (${vcm.toFixed(0)} fL).`;
    }
    if (isAnisocitica) {
      label = label || 'ANISOCITOSE ISOLADA';
      descricao += isAnisocitica ? ` Anisocitose marcada (RDW ${rdw.toFixed(1)}%).` : '';
    }
  }

  // Recomendação base + CTA
  const recomendacao = 'PARA UM DIAGNÓSTICO MAIS PRECISO, PRECISA-SE NO MÍNIMO DE FERRITINA E SATURAÇÃO DA TRANSFERRINA.';
  const recomendacaoFull = recomendacao + ' Esses exames são de baixo custo, com resultados rápidos, e normalmente cobertos por planos de saúde.';

  return {
    encontrado: true,
    triagem: true,
    label,
    color: classificacaoHb === 'BAIXA' && (gravidadeHb === 'IMPORTANTE' || gravidadeHb === 'GRAVE') ? 'red' : 'orange',
    diagnostico: descricao,
    recomendacao: recomendacaoFull,
    recomendacaoAge1: recomendacaoFull,
    recomendacaoAge2: recomendacaoFull,
    classificacaoHb,
    classificacaoVCM,
    isAnisocitica,
    gravidadeHb,
    proximosExames: ['FERRITINA', 'SATURAÇÃO DA TRANSFERRINA'],
    comentarios: [],
    achadosParalelos: [],
    g6pdAlerta: null,
    obsoleto: false,
    _inputs: inputs,
  };
}

export function formatarParaCopiar(resultado, inputs) {
  const hoje = new Date().toLocaleDateString('pt-BR');
  const sexoLabel = inputs.sexo === 'M' ? 'Masc' : 'Fem';
  const idPaciente = inputs.cpf
    ? 'CPF: ***.' + inputs.cpf.replace(/\D/g, '').slice(3, 6) + '.***.** '
    : 'Anônimo';

  let texto = 'RedFairy - Avaliação em ' + hoje + '\n';
  texto += 'Paciente: ' + idPaciente + ' | Sexo: ' + sexoLabel + ' | Idade: ' + inputs.idade + ' anos\n\n';
  texto += 'EXAMES (' + resultado.diasDesdeColeta + ' dia(s) atrás)\n';
  texto += resultado.fraseData.texto + '\n\n';
  texto += 'DIAGNÓSTICO\n';
  texto += resultado.label + '\n\n';
  texto += resultado.diagnostico + '\n\n';
  texto += 'RECOMENDAÇÃO\n';
  texto += resultado.recomendacao + '\n\n';

  if (resultado.fraseHipermenorreia) {
    texto += 'HIPERMENORREIA\n';
    texto += resultado.fraseHipermenorreia + '\n\n';
  }

  if (resultado.comentarios.length > 0) {
    texto += 'MEDICAMENTOS / SUPLEMENTOS\n';
    resultado.comentarios.forEach(c => {
      texto += '- ' + c.titulo + ': ' + c.texto + '\n';
    });
    texto += '\n';
  }

  // ACHADOS PARALELOS
  if (resultado.achadosParalelos && resultado.achadosParalelos.length > 0) {
    texto += 'OUTROS ACHADOS RELEVANTES\n';
    resultado.achadosParalelos.forEach(a => {
      texto += '- ' + a.label + ': ' + a.texto + '\n\n';
    });
  }

  // ALERTA G-6-PD
  if (resultado.g6pdAlerta) {
    texto += 'ALERTA G-6-PD\n';
    texto += resultado.g6pdAlerta + '\n\n';
  }

  // AVALIACAO OBA (resumida)
  if (resultado._oba) {
    const oba = resultado._oba;
    texto += 'AVALIACAO OBA (BARIATRICO)\n';
    texto += 'Cirurgia: ' + oba.tipoCirurgia + ' | ' + oba.mesesPosCirurgia + ' meses pos-cirurgia\n';
    texto += 'Grau de disabsorcao: ' + oba.grauDisabsorcao + '/3\n\n';

    if (oba.alertas && oba.alertas.length > 0) {
      texto += 'Alertas OBA:\n';
      oba.alertas.forEach(a => {
        texto += '- [' + (a.nivel || '').toUpperCase() + '] ' + a.texto + '\n';
      });
      texto += '\n';
    }

    if (oba.modulos && oba.modulos.length > 0) {
      texto += 'Modulos OBA:\n';
      oba.modulos.forEach(m => {
        if (m.nivel && m.nivel !== 'normal') {
          texto += '- ' + m.titulo + ' [' + m.nivel.toUpperCase() + ']\n';
          if (m.linhas) {
            m.linhas.forEach(l => { texto += '  ' + l + '\n'; });
          }
        }
      });
      texto += '\n';
    }

    if (oba.examesComplementares && oba.examesComplementares.length > 0) {
      texto += 'Exames complementares OBA:\n';
      oba.examesComplementares.forEach(e => {
        texto += '- ' + e + '\n';
      });
      texto += '\n';
    }
  }

  texto += 'PROXIMOS EXAMES SUGERIDOS\n';
  resultado.proximosExames.forEach(e => {
    texto += '- ' + e + '\n';
  });

  texto += '\nGerado pelo RedFairy';
  return texto;
}
