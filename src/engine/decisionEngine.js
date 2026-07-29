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
      texto: `O EXAME FOI REALIZADO HÁ ${dias} ${dias === 1 ? 'DIA' : 'DIAS'} E DEVE REPRESENTAR A SUA REALIDADE ATUAL.`
    };
  } else if (dias <= 30) {
    return {
      tipo: 'B',
      texto: `O EXAME FOI REALIZADO HÁ ${dias} DIAS E AINDA DEVE REPRESENTAR A SUA REALIDADE ATUAL.`
    };
  } else if (dias <= 60) {
    return {
      tipo: 'B',
      texto: `O EXAME FOI REALIZADO HÁ ${dias} DIAS E PODE NÃO REPRESENTAR A SUA REALIDADE ATUAL.`
    };
  } else {
    return {
      tipo: 'C',
      texto: `O EXAME FOI REALIZADO HÁ ${dias} DIAS E PROVAVELMENTE NÃO REPRESENTA A SUA REALIDADE ATUAL.`
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

// ── INVESTIGAÇÃO DA MACROCITOSE (VCM > 100) ───────────────────────────────────
// Interpretação simplificada (cortes confirmados pelo Dr. Ramos): B12 < 200 =
// deficiência; 200–300 = limítrofe; Folato < 4 = deficiência. Sem os valores,
// recomenda dosá-los. Ambos normais + macrocitose → outras causas (hematologista).
// Retorna { linhas:[], exames:[] } ou null.
function interpretarMacrocitose(inputs) {
  const vcm = Number(inputs.vcm)
  if (!Number.isFinite(vcm) || vcm <= 100) return null
  const b12 = Number(inputs.b12_valor)
  const folato = Number(inputs.folato_valor)
  const temB12 = Number.isFinite(b12) && b12 > 0
  const temFolato = Number.isFinite(folato) && folato > 0
  const bari = !!inputs.bariatrica
  const linhas = []
  const exames = []

  if (!temB12 && !temFolato) {
    linhas.push('MACROCITOSE (VCM > 100): dosar VITAMINA B12 e FOLATOS (ÁCIDO FÓLICO) para investigar a causa.')
    exames.push('VITAMINA B12', 'ÁCIDO FÓLICO (FOLATOS)')
    return { linhas, exames }
  }
  if (temB12) {
    if (b12 < 200) linhas.push('VITAMINA B12 BAIXA (< 200 pg/mL): deficiência de B12 — repor' + (bari ? ' (no bariátrico, preferir via IM/parenteral).' : '.'))
    else if (b12 <= 300) linhas.push('VITAMINA B12 LIMÍTROFE (200–300 pg/mL): possível deficiência' + (bari ? ', sobretudo no bariátrico' : '') + ' — considerar homocisteína / ácido metilmalônico ou tratar empiricamente.')
  }
  if (temFolato && folato < 4) linhas.push('FOLATO BAIXO (< 4 ng/mL): deficiência de folato — repor ácido fólico.')
  const b12Normal = temB12 && b12 > 300
  const folatoNormal = temFolato && folato >= 4
  if (b12Normal && folatoNormal) {
    linhas.push('B12 e Folato normais com macrocitose: investigar outras causas (álcool, hipotireoidismo, hepatopatia, mielodisplasia) — avaliação com hematologista.')
    exames.push('AVALIAÇÃO COM HEMATOLOGISTA')
  }
  return linhas.length ? { linhas, exames } : null
}

// Regras pos-matching baseadas SO nos INPUTS (nao dependem da entrada casada). Muta
// proximosExames/comentarios. Vale tanto p/ match quanto p/ FALLBACK (senao os casos
// que caem no fallback — ex.: traco talassemico — perdiam essas recomendacoes).
function aplicarRegrasPosMatching(inputs, proximosExames, comentarios, resultado) {
  // TODO paciente: garantir HEMOGRAMA nos proximos exames (reavaliacao do eritron). Vai
  // no inicio da lista; dedup evita repetir quando a entrada ja pede hemograma.
  if (!proximosExames.some(e => /HEMOGRAMA/i.test(String(e)))) proximosExames.unshift('HEMOGRAMA');

  // Regra 1: Sat > 50% E Ferritina > 1000 -> RNM do abdome com protocolo de ferro.
  if (Number(inputs.satTransf) > 50 && Number(inputs.ferritina) > 1000) {
    if (!proximosExames.some(e => /RESSON/i.test(String(e)))) proximosExames.push('RESSONANCIA NUCLEAR MAGNETICA DO ABDOME SUPERIOR COM PROTOCOLO DE FERRO');
  }
  // Regra 2: bariatrica feminina 45+ -> densitometria ossea.
  if (inputs.bariatrica && inputs.sexo === 'F' && Number(inputs.idade) >= 45) {
    if (!proximosExames.some(e => /DENSITOMETR/i.test(String(e)))) proximosExames.push('DENSITOMETRIA OSSEA');
  }
  // Regra 3: macrocitose (VCM > 100) -> interpreta B12/folato + exames.
  const macro = interpretarMacrocitose(inputs);
  if (macro) {
    // O comentario so aparece quando ha VALORES de B12/folato para interpretar (contribuicao
    // UNICA da regra — interpretacao graduada). Sem valores, o texto de causas fica por conta
    // do achado paralelo (macrocitose sem/com anemia), evitando repetir "dosar B12/folato".
    const _temValoresMacro = Number(inputs.b12_valor) > 0 || Number(inputs.folato_valor) > 0;
    if (_temValoresMacro) comentarios.push({ titulo: 'MACROCITOSE — INVESTIGAÇÃO', texto: macro.linhas.join(' ') });
    macro.exames.forEach(ex => { if (!proximosExames.some(e => String(e).toUpperCase() === ex.toUpperCase())) proximosExames.push(ex); });
  }
  // Regra 4: microcitose (VCM 60-74) com ferro normal/alto -> talassemia/hemoglobinopatia.
  const vcm = Number(inputs.vcm);
  if (vcm >= 60 && vcm <= 74 && Number(inputs.ferritina) >= 30 && Number(inputs.satTransf) >= 20) {
    if (!proximosExames.some(e => /ELETROFORESE/i.test(String(e)))) proximosExames.push('ELETROFORESE DE HEMOGLOBINAS');
    // Se a entrada casada JÁ é talassemia/hemoglobinopatia (ex.: id 61), o diagnóstico já
    // cobre o tema — não repetir o comentário (o exame acima já foi garantido/deduplicado).
    const _jaCobreTal = resultado && /TALASSEMIA|HEMOGLOBINOPATIA/i.test((resultado.label || '') + ' ' + (resultado.diagnostico || ''));
    if (!_jaCobreTal) comentarios.push({
      titulo: 'MICROCITOSE COM FERRO NORMAL — INVESTIGAR TALASSEMIA / HEMOGLOBINOPATIA',
      texto: `MICROCITOSE (VCM ${inputs.vcm}) COM FERRITINA E SATURAÇÃO DA TRANSFERRINA NORMAIS OU ELEVADAS: o ferro adequado torna a deficiência de ferro improvável como causa da microcitose — o padrão sugere TALASSEMIA (traço talassêmico) OU OUTRA HEMOGLOBINOPATIA (ex.: HEMOGLOBINA C HOMOZIGÓTICA). RECOMENDA-SE ELETROFORESE DE HEMOGLOBINAS. Na BETA-TALASSEMIA (MINOR OU INTERMÉDIA) a HEMOGLOBINA A2 está AUMENTADA; na ALFA-TALASSEMIA a A2 é NORMAL. ATENÇÃO: uma eletroforese NORMAL NÃO EXCLUI a alfa-talassemia, que costuma ser silenciosa — a confirmação exige estudo molecular/DNA. DIFERENCIAIS: INFLAMAÇÃO OU DOENÇA CRÔNICA (a ferritina é reagente de fase aguda e pode subir) — a saturação normal ajuda a afastar; um RDW normal (microcitose homogênea) reforça a talassemia. Se houve uso recente de ferro (últimos ~40 dias), os índices de ferro podem refletir o tratamento, mas a suspeita de talassemia/hemoglobinopatia permanece de qualquer forma.`
    });
  }
}

// Separa a lista de exames em LAB / IMAGEM / ENDOSCOPIA / BIOIMAGEM (usado no match e no fallback).
function splitExames(proximosExames) {
  // \bUSG\b: 8 entradas das matrizes escrevem o ultrassom ABREVIADO ("USG
  // OBSTÉTRICA", "USG ABDOME", "USG PÉLVICO TRANSVAGINAL") e não casavam com
  // ULTRASSON — caíam em `lab`. Enquanto a separação era só visual isso passava;
  // agora que cada grupo é um PEDIDO FÍSICO, a gestante do id 114 receberia
  // "USG OBSTÉTRICA COM DOPPLER" no papel do laboratório.
  const PADROES_IMAGEM = /ULTRASSON|\bUSG\b|COLONOSCOP|ENDOSCOP|RESSON|RNM|DENSITOMETR/i;
  const PADROES_ENDOSCOPIA = /COLONOSCOP|ENDOSCOP/i;
  // CARDIOLÓGICO é um SERVIÇO próprio (decisão do Estácio, jul/2026): não se faz
  // ECG no laboratório. Antes o ELETROCARDIOGRAMA caía em `lab` por exclusão e o
  // paciente levava o pedido ao lugar errado.
  // Hoje só o ELETROCARDIOGRAMA aparece nas matrizes (varredura de 71 exames
  // distintos) — os outros padrões estão aqui para que, se vierem a ser
  // sugeridos, já nasçam no serviço certo.
  // ANGIOTOMOGRAFIA aparece QUALIFICADA de propósito: sem "CORONARIANA", uma
  // futura "ANGIOTOMOGRAFIA DE ABDOME" viraria pedido cardiológico por engano.
  const PADROES_CARDIO = /ELETROCARDIOGRAMA|ECOCARDIOGRAMA|ERGOM[ÉE]TRIC|HOLTER|\bMAPA\b|ANGIOTOMOGRAFIA CORONARIAN|SCORE DE C[ÁA]LCIO|ESCORE DE C[ÁA]LCIO|CINTILOGRAFIA MIOC/i;
  // AVALIAÇÃO/CONSULTA com especialista NÃO é exame de laboratório, mas GERA
  // COBRANÇA (decisão do Estácio, jul/2026) — então vira serviço próprio, em vez
  // de ficar escondida dentro do pedido do laboratório, onde o paciente levaria
  // ao balcão um papel dizendo "procure um hematologista".
  const PADROES_AVALIACAO = /^AVALIA[ÇC][ÃA]O COM|^CONSULTA COM|ENCAMINHAMENTO/i;
  const imagem = proximosExames.filter(e => PADROES_IMAGEM.test(String(e)));
  // A ordem importa: imagem tem precedência (ex.: uma futura "RESSONÂNCIA
  // CARDÍACA" é bioimagem, feita no mesmo serviço de imagem), e o cardiológico
  // é retirado do que sobraria como laboratório.
  const naoImagem = (e) => !PADROES_IMAGEM.test(String(e));
  const cardiologico = proximosExames.filter(e => naoImagem(e) && PADROES_CARDIO.test(String(e)));
  const avaliacao = proximosExames.filter(e => naoImagem(e) && !PADROES_CARDIO.test(String(e)) && PADROES_AVALIACAO.test(String(e)));
  const lab = proximosExames.filter(e => naoImagem(e) && !PADROES_CARDIO.test(String(e)) && !PADROES_AVALIACAO.test(String(e)));
  return {
    imagem, lab, cardiologico, avaliacao,
    endoscopia: imagem.filter(e => PADROES_ENDOSCOPIA.test(String(e))),
    bioimagem: imagem.filter(e => !PADROES_ENDOSCOPIA.test(String(e))),
  };
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

  // CLONA a entrada casada. O codigo abaixo reatribui resultado.diagnostico/
  // recomendacaoAge1/Age2 (limparNova, frase 16-17, placeholders T3/T4) e `resultado`
  // e' REFERENCIA a constante da matriz (maleMatrix/femaleMatrix, viva entre chamadas).
  // Sem clonar, essas edicoes de texto CONTAMINAM a matriz para os proximos pacientes
  // da sessao. Clone raso basta: proximosExames e' copiado a parte (mais abaixo).
  const _entradaMatriz = matrix.find(item => matchesConditions(item, inputsAjustados));
  const resultado = _entradaMatriz ? { ..._entradaMatriz } : _entradaMatriz;

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
    const usouAmbas = inputs.ferro_injetavel && inputs.ferro_oral;
    const titulo = usouAmbas
      ? 'FERRO ORAL + INJETÁVEL'
      : inputs.ferro_injetavel
        ? 'FERRO INJETÁVEL'
        : 'FERRO ORAL';
    // Ajuste de via: alguns textos genericos acoplam as duas vias
    // ("FERRO ORAL OU INJETAVEL") para DESCREVER o que o paciente usou. Se so
    // uma via foi marcada, colapsa a expressao para a via efetivamente usada.
    // NAO toca em frases de ORIENTACAO (ex.: "CUIDADO ... SE PARENTERAL" ou
    // "A REPOSICAO PODE SER POR VIA ORAL OU INTRAVENOSA"), corretas para
    // qualquer via — por isso o alvo e estritamente "ORAL OU INJETAVEL".
    let textoFerro = resultado.comentarioFerro;
    if (!usouAmbas) {
      const via    = inputs.ferro_injetavel ? 'INJETÁVEL' : 'ORAL';
      const viaMin = inputs.ferro_injetavel ? 'injetável' : 'oral';
      textoFerro = textoFerro
        .replace(/ORAL OU INJET[ÁA]VEL/g, via)
        .replace(/oral ou injet[áa]vel/g, viaMin);
    }
    comentarios.push({ titulo, texto: textoFerro });
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
  // Quando a Hb está ELEVADA, o achado paralelo "eritrocitose por testosterona" (mais
  // específico ao dado) é o dono do texto — aqui o comentário só aparece com Hb normal
  // (contexto de que a testosterona pode elevar o eritron), evitando repetição.
  if (inputs.testosterona && !(Number(inputs.hemoglobina) > (inputs.sexo === 'M' ? 17.5 : 15.5))) {
    comentarios.push({ titulo: 'TESTOSTERONA / ANABOLIZANTE', texto: 'O USO EXÓGENO DE TESTOSTERONA OU ANABOLIZANTES ESTIMULA A ERITROPOESE E PODE PRODUZIR ERITROCITOSE (HEMOGLOBINA E HEMATÓCRITO ELEVADOS), AUMENTANDO O RISCO DE TROMBOSE, AVC E INFARTO. SE A HEMOGLOBINA SE ELEVAR, A TESTOSTERONA EXÓGENA É A CAUSA MAIS PROVÁVEL. MONITORAR HEMOGRAMA, HEMATÓCRITO E PSA A CADA 3-6 MESES.' });
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
    // Fallback clínico — resposta útil quando não há match nas matrizes. As regras baseadas
    // nos INPUTS (talassemia, macrocitose, RNM, densitometria) e os ACHADOS PARALELOS valem
    // AQUI TAMBÉM — senão casos que caem no fallback (ex.: traço talassêmico) perderiam essas
    // recomendações. Herda também os comentários de histórico clínico (flags) já montados.
    const fallback = gerarFallbackClinico(inputsAjustados);
    // PRESERVA os comentários próprios do fallback (a orientação de reavaliação
    // clínica saiu de `proximosExames` para cá, para não virar item cobrável) e
    // acrescenta os de histórico clínico. Antes era atribuição direta, que
    // descartava os do fallback.
    fallback.comentarios = [...(fallback.comentarios || []), ...comentarios];
    aplicarRegrasPosMatching(inputsAjustados, fallback.proximosExames, fallback.comentarios);
    fallback.achadosParalelos = detectarAchadosParalelos(inputsAjustados);
    const sp = splitExames(fallback.proximosExames);
    fallback.proximosExamesLab = sp.lab;
    fallback.proximosExamesImagem = sp.imagem;
    fallback.proximosExamesEndoscopia = sp.endoscopia;
    fallback.proximosExamesBioimagem = sp.bioimagem;
    fallback.proximosExamesCardio = sp.cardiologico;
    fallback.proximosExamesAvaliacao = sp.avaliacao;
    fallback.diasDesdeColeta = calcularDias(inputs.dataColeta);
    fallback.fraseData = getFraseData(fallback.diasDesdeColeta);
    // A frase de hipermenorreia vale AQUI TAMBÉM — sem ela, a paciente que caía no
    // fallback justamente POR ter marcado hipermenorreia perdia o comentário sobre isso.
    fallback.fraseHipermenorreia = fraseHiper;
    // Mesmo motivo do match normal (l.525): o obaEngine lê resultadoEritron.inputs.
    fallback.inputs = inputsAjustados;
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

  // ── Frase dinâmica: autorização de doação para 16-17 anos ──────────────
  // Removida do texto FIXO das matrizes (era boilerplate em ~20 entradas femininas,
  // 0 masculinas). Agora só aparece quando o paciente TEM 16 ou 17 anos E a recomendação
  // realmente fala de doação de sangue (não injeta fora de contexto).
  const _idade1617 = parseInt(inputs.idade) || 0;
  if ((_idade1617 === 16 || _idade1617 === 17) && recomendacaoFinal && /DOA[RÇ]/i.test(recomendacaoFinal)) {
    recomendacaoFinal = recomendacaoFinal.trimEnd() +
      ' ENTRE 16 E 17 ANOS DE IDADE É PRECISO AUTORIZAÇÃO DOS RESPONSÁVEIS LEGAIS PARA DOAR SANGUE.';
  }


  // ── Modificador G-6-PD pós-matching ────────────────────────────────────
  let g6pdAlerta = null
  if (inputs.g6pd) {
    const idsHemoliticos = [77, 78, 79, 62, 63, 64]
    if (idsHemoliticos.includes(resultado.id)) {
      g6pdAlerta = 'DEFICIÊNCIA DE G-6-PD: O PADRÃO LABORATORIAL ATUAL É COMPATÍVEL COM CRISE HEMOLÍTICA. A G-6-PD É A CAUSA MAIS PROVÁVEL. IDENTIFICAR E ELIMINAR O GATILHO (MEDICAMENTO, INFECÇÃO OU ALIMENTO). MONITORAR LDH, BILIRRUBINAS E RETICULÓCITOS.'
    } else if (['green', 'yellow'].includes(resultado.color)) {
      g6pdAlerta = 'DEFICIÊNCIA DE G-6-PD: O ERITRON ESTÁ COMPENSADO NO MOMENTO, MAS O RISCO DE CRISE HEMOLÍTICA PERMANECE — EVITE OS GATILHOS OXIDANTES (MEDICAMENTOS, INFECÇÕES E FAVA).'
    }
  }

  const achadosParalelos = detectarAchadosParalelos(inputs);

  // ── Enriquecimento da lista de PROXIMOS EXAMES com regras pos-matching ──
  // Comeca com o array original da matriz (clonado pra nao mutar).
  let proximosExames = Array.isArray(resultado.proximosExames) ? [...resultado.proximosExames] : [];

  // Regras pos-matching baseadas nos INPUTS (RNM, densitometria, macrocitose, talassemia)
  // — extraidas p/ helper e aplicadas tambem no fallback.
  aplicarRegrasPosMatching(inputs, proximosExames, comentarios, resultado);

  // Split LAB / IMAGEM / ENDOSCOPIA / BIOIMAGEM.
  const { imagem: proximosExamesImagem, lab: proximosExamesLab, endoscopia: proximosExamesEndoscopia, bioimagem: proximosExamesBioimagem, cardiologico: proximosExamesCardio, avaliacao: proximosExamesAvaliacao } = splitExames(proximosExames);

  return {
    encontrado: true,
    id: resultado.id,
    label: resultado.label,
    color: resultado.color,
    // inputs: os labs numéricos do eritron. SEM esta chave, o obaEngine (que lê
    // resultadoEritron.inputs.{ferritina,satTransf,vcm,rdw,hemoglobina}) ficava cego
    // no fluxo do médico (Calculator passa este retorno cru a avaliarOBA) — talassemia,
    // dimórfico, ferritina do ginecológico, ferropenia da IC e mascaramento pela
    // testosterona não disparavam a menos que o médico relançasse o hemograma no OBA.
    inputs: inputsAjustados,
    diagnostico: diagnosticoFinal,
    recomendacao: recomendacaoFinal,
    comentarios,
    proximosExames,
    proximosExamesLab,
    proximosExamesImagem,
    proximosExamesEndoscopia,
    proximosExamesBioimagem,
    proximosExamesCardio,
    proximosExamesAvaliacao,
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

  // Crítica de exames antigos — calculada ANTES dos branches para que tanto
  // ERITRON NORMAL quanto ERITRON ANORMAL recebam a fraseData.
  const dias = calcularDias(inputs.dataColeta);
  const fraseData = getFraseData(dias);

  // ────── ERITRON NORMAL ──────
  if (classificacaoHb === 'NORMAL' && classificacaoVCM === 'NORMOCÍTICA' && !isAnisocitica) {
    return {
      encontrado: true,
      triagem: true,
      label: 'HEMOGLOBINA NORMAL + HEMÁCIAS NORMOCÍTICAS',
      color: 'green',
      diagnostico: 'Eritrograma dentro dos limites normais para idade e sexo. Hemoglobina, VCM e RDW estão na faixa esperada.',
      recomendacao: 'Manter estilo de vida saudável e controle anual rotineiro.',
      recomendacaoAge1: 'Manter estilo de vida saudável e controle anual rotineiro.',
      recomendacaoAge2: 'Manter estilo de vida saudável e controle anual rotineiro.',
      classificacaoHb: 'NORMAL',
      classificacaoVCM: 'NORMOCÍTICA',
      isAnisocitica: false,
      proximosExames: [],
      proximosExamesLab: [],
      proximosExamesImagem: [],
      proximosExamesEndoscopia: [],
      proximosExamesBioimagem: [],
      proximosExamesCardio: [],
      proximosExamesAvaliacao: [],
      comentarios: [],
      achadosParalelos: [],
      g6pdAlerta: null,
      fraseData,
      diasDesdeColeta: dias,
      obsoleto: dias > 730,
      _inputs: inputs,
      inputs,   // o obaEngine lê resultadoEritron.inputs (VCM/RDW/Hb da triagem parcial)
    };
  }

  // ────── ERITRON ANORMAL ──────
  // Construir label sindromico + hematimetrico
  // __LABEL_SINDROMICO_HEMATIMETRICO_V1__
  let sindromico = '';
  if (classificacaoHb === 'BAIXA') sindromico = 'ANEMIA';
  else if (classificacaoHb === 'ALTA') sindromico = 'POLIGLOBULIA';
  else sindromico = 'HEMOGLOBINA NORMAL';

  let hematimetrico = '';
  if (classificacaoVCM === 'NORMOCÍTICA') {
    hematimetrico = isAnisocitica ? 'ANISOCITOSE' : 'HEMÁCIAS NORMOCÍTICAS';
  } else if (classificacaoVCM === 'MICROCÍTICA') {
    hematimetrico = isAnisocitica ? 'MICROCITOSE + ANISOCITOSE' : 'MICROCITOSE';
  } else if (classificacaoVCM === 'MACROCÍTICA') {
    hematimetrico = isAnisocitica ? 'MACROCITOSE + ANISOCITOSE' : 'MACROCITOSE';
  }

  let label = sindromico + ' + ' + hematimetrico;
  if (gravidadeHb) label += ' — ' + gravidadeHb;

  // descricao: mantida apenas para compatibilidade (UI nova usa tabela)
  let descricao = label + '.';


  // Recomendação base + CTA
  const recomendacao = 'PARA UM DIAGNÓSTICO MAIS PRECISO, PRECISA-SE NO MÍNIMO DE FERRITINA E SATURAÇÃO DA TRANSFERRINA.';
  const recomendacaoFull = recomendacao + ' Esses exames são de baixo custo, com resultados rápidos, e normalmente cobertos por planos de saúde.';

  // dias e fraseData já foram calculados antes dos branches (ERITRON NORMAL/ANORMAL).

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
    proximosExames: ['HEMOGRAMA', 'FERRITINA', 'SATURAÇÃO DA TRANSFERRINA'],
    proximosExamesLab: ['HEMOGRAMA', 'FERRITINA', 'SATURAÇÃO DA TRANSFERRINA'],
    proximosExamesImagem: [],
    proximosExamesEndoscopia: [],
    proximosExamesBioimagem: [],
    proximosExamesCardio: [],
    proximosExamesAvaliacao: [],
    comentarios: [],
    achadosParalelos: [],
    g6pdAlerta: null,
    fraseData,
    diasDesdeColeta: dias,
    obsoleto: dias > 730,
    _inputs: inputs,
  };
}

export function formatarParaCopiar(resultado, inputs) {
  const hoje = new Date().toLocaleDateString('pt-BR');
  const sexoLabel = inputs.sexo === 'M' ? 'Masc' : 'Fem';
  const idPaciente = inputs.cpf
    ? 'CPF: ***.' + inputs.cpf.replace(/\D/g, '').slice(3, 6) + '.***.** '
    : 'Anônimo';

  let texto = 'Projeto OBA® - Avaliação em ' + hoje + '\n';
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

  texto += '\nGerado pelo Projeto OBA®';
  return texto;
}
