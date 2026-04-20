import { maleMatrix } from './maleMatrix.js';
import { femaleMatrix } from './femaleMatrix.js';
import { detectarAchadosParalelos } from './achadosParalelos.js';

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

  if (c.bariatrica   !== undefined && (inputs.bariatrica   ?? false) !== c.bariatrica)   return false;
  if (c.vegetariano  !== undefined && (inputs.vegetariano  ?? false) !== c.vegetariano)  return false;
  if (c.perda        !== undefined && (inputs.perda        ?? false) !== c.perda)        return false;
  if (c.alcoolista   !== undefined && (inputs.alcoolista   ?? false) !== c.alcoolista)   return false;
  if (c.transfundido !== undefined && (inputs.transfundido ?? false) !== c.transfundido) return false;

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
  if (inputs.ferroOral && resultado?.comentarioFerro) {
    comentarios.push({ titulo: 'FERRO ORAL / INJETÁVEL', texto: resultado.comentarioFerro });
  }
  // ── Medicamentos que podem causar macrocitose ──────────────────────────────
  if (inputs.metformina) {
    comentarios.push({ titulo: 'METFORMINA', texto: 'A METFORMINA REDUZ A ABSORÇÃO DE VITAMINA B12 NO ÍLEO TERMINAL. USO PROLONGADO PODE PRODUZIR DÉFICIT DE B12 E MACROCITOSE. RECOMENDA-SE DOSAR A VITAMINA B12 ANUALMENTE E SUPLEMENTAR SE NECESSÁRIO.' });
  }
  if (inputs.ibp) {
    comentarios.push({ titulo: 'IBP (OMEPRAZOL / PANTOPRAZOL)', texto: 'O USO PROLONGADO DE INIBIDORES DA BOMBA DE PRÓTONS REDUZ A ABSORÇÃO DE VITAMINA B12 AO DIMINUIR A ACIDEZ GÁSTRICA. PODE CONTRIBUIR PARA MACROCITOSE E DEFICIT NEUROLÓGICO. AVALIAR A NECESSIDADE DE SUPLEMENTAÇÃO.' });
  }
  if (inputs.tiroxina) {
    comentarios.push({ titulo: 'TIROXINA / T4', texto: 'O HIPOTIREOIDISMO PODE CAUSAR ANEMIA NORMOCÍTICA OU MACROCÍTICA. A REPOSIÇÃO COM TIROXINA COSTUMA CORRIGIR A ANEMIA GRADUALMENTE. MONITORAR TSH E HEMOGRAMA A CADA 6 MESES.' });
  }
  if (inputs.hidroxiureia) {
    comentarios.push({ titulo: 'HIDROXIUREIA', texto: 'A HIDROXIUREIA INIBE A SÍNTESE DE DNA E PRODUZ MACROCITOSE DOSE-DEPENDENTE. ESSE ACHADO É ESPERADO E NÃO INDICA DÉFICIT NUTRICIONAL. NÃO SUSPENDER SEM ORIENTAÇÃO DO HEMATOLOGISTA.' });
  }
  if (inputs.anticonvulsivante) {
    comentarios.push({ titulo: 'ANTICONVULSIVANTE', texto: 'FENITOÍNA, ÁCIDO VALPROICO E CARBAMAZEPINA PODEM INTERFERIR NO METABOLISMO DO ÁCIDO FÓLICO E PRODUZIR MACROCITOSE. AVALIAR DOSAGEM DE FOLATOS E VITAMINA B12. SUPLEMENTAÇÃO PROFILÁTICA DE ÁCIDO FÓLICO PODE SER INDICADA.' });
  }
  if (inputs.methotrexato) {
    comentarios.push({ titulo: 'METOTREXATO', texto: 'O METOTREXATO É UM ANTAGONISTA DO ÁCIDO FÓLICO E PRODUZ MACROCITOSE E ANEMIA MEGALOBLÁSTICA. A SUPLEMENTAÇÃO COM ÁCIDO FÓLICO (5 mg/semana) É PADRÃO DE CUIDADO E REDUZ A TOXICIDADE SEM COMPROMETER A EFICÁCIA.' });
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
    return {
      encontrado: false,
      mensagem: `Combinação não encontrada na base de dados. Valores: Ferritina=${inputs.ferritina}, Hb=${inputs.hemoglobina}, VCM=${inputs.vcm}, RDW=${inputs.rdw}, Sat=${inputs.satTransf} Flags: Bar=${inputs.bariatrica}, Veg=${inputs.vegetariano}, Perda=${inputs.perda}, Alc=${inputs.alcoolista}, Transf=${inputs.transfundido}`,
    };
  }

  let diagnosticoFinal = resultado.diagnostico.replace('FRASE DATA', '').trim();

  const temQualquerFlag = inputs.aspirina || inputs.vitaminaB12 || inputs.ferroOral ||
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
