import { maleMatrix } from './maleMatrix.js';
import { femaleMatrix } from './femaleMatrix.js';

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
      texto: `OS EXAMES FORAM REALIZADOS HA ${dias} DIA(S), E DEVEM REPRESENTAR O ATUAL ESTADO DO SEU ERITRON.`
    };
  } else if (dias <= 40) {
    return {
      tipo: 'B',
      texto: `CONSIDERE QUE OS EXAMES FORAM REALIZADOS HA ${dias} DIAS E PODEM NAO REPRESENTAR CORRETAMENTE A REALIDADE ATUAL DO SEU ERITRON. REPITA-OS QUANDO POSSIVEL E FACA NOVA AVALIACAO NESSE ALGORITMO.`
    };
  } else {
    return {
      tipo: 'C',
      texto: `OS EXAMES FORAM REALIZADOS HA ${dias} DIAS E NAO SAO CONFIAVEIS PARA ESTABELECER A SITUACAO ATUAL DO SEU ERITRON. REPITA-OS ASSIM QUE POSSIVEL E FACA NOVA AVALIACAO NESSE ALGORITMO.`
    };
  }
}

export function getFraseHipermenorreia(idade) {
  if (idade < 15) {
    return 'HIPERMENORREIA NESSA FAIXA E GERALMENTE DISFUNCIONAL, MAS PODE HAVER DISTURBIO DA HEMOSTASE. PODE LEVAR A DEFICIENCIA DE FERRO E ANEMIA, OU AGRAVAR ESSAS CONDICOES. RECOMENDAVEL AVALIACAO COM GINECOLOGISTA E HEMATOLOGISTA.';
  } else if (idade <= 18) {
    return 'HIPERMENORREIA NESSA FAIXA E GERALMENTE DISFUNCIONAL, MAS E PRECISO AFASTAR DISTURBIO DA HEMOSTASE E ENDOMETRIOSE. PODE LEVAR A DEFICIENCIA DE FERRO E ANEMIA. RECOMENDAVEL AVALIACAO COM GINECOLOGISTA E HEMATOLOGISTA.';
  } else if (idade <= 35) {
    return 'HIPERMENORREIA NESSA FAIXA PODE RESULTAR DE USO DE DIU, ENDOMETRIOSE, DISTURBIO HORMONAL, MIOMATOSE. PODE LEVAR A DEFICIENCIA DE FERRO E ANEMIA. RECOMENDAVEL AVALIACAO COM MEDICO GINECOLOGISTA.';
  } else if (idade <= 39) {
    return 'HIPERMENORREIA NESSA FAIXA PODE RESULTAR DE USO DE DIU, LIGADURA DE TROMPAS, ENDOMETRIOSE, DISTURBIO HORMONAL, MIOMATOSE E OUTRAS DOENCAS. RECOMENDAVEL AVALIACAO COM MEDICO GINECOLOGISTA.';
  } else if (idade <= 55) {
    return 'HIPERMENORREIA NESSA FAIXA PODE RESULTAR DE USO DE DIU, LIGADURA DE TROMPAS, ENDOMETRIOSE, PRE-MENOPAUSA, MIOMATOSE E OUTRAS DOENCAS. RECOMENDAVEL AVALIACAO GINECOLOGICA.';
  } else {
    return 'SANGRAMENTO GENITAL PODE OCORRER NA PRE-MENOPAUSA. NO CLIMATERIO PODE RESULTAR DE REPOSICAO HORMONAL, MIOMATOSE E OUTRAS DOENCAS. RECOMENDAVEL AVALIACAO GINECOLOGICA.';
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
  if (c.bariatrica   !== undefined && inputs.bariatrica   !== c.bariatrica)   return false;
  if (c.vegetariano  !== undefined && inputs.vegetariano  !== c.vegetariano)  return false;
  if (c.perda        !== undefined && inputs.perda        !== c.perda)        return false;
  if (c.alcoolista   !== undefined && inputs.alcoolista   !== c.alcoolista)   return false;
  if (c.transfundido !== undefined && inputs.transfundido !== c.transfundido) return false;
  return true;
}

export function avaliarPaciente(inputs) {
  const inputsAjustados = { ...inputs };
  if (inputs.sexo === 'F' && inputs.gestante) {
    if (inputs.hemoglobina >= 11 && inputs.hemoglobina <= 11.9) {
      inputsAjustados.hemoglobina = 12.0;
    }
  }

  const matrix = inputsAjustados.sexo === 'M' ? maleMatrix : femaleMatrix;

  const isAge2 = inputsAjustados.sexo === 'M'
  const isAge2 = inputsAjustados.sexo === 'M'
  ? inputsAjustados.idade >= 41
  : inputsAjustados.idade >= 40;

console.log('DEBUG:', { idade: inputsAjustados.idade, sexo: inputsAjustados.sexo, isAge2 });
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
    comentarios.push({ titulo: 'FERRO ORAL / INJETAVEL', texto: resultado.comentarioFerro });
  }

  if (!resultado) {
    return {
      encontrado: false,
      mensagem: `Combinacao nao encontrada na base de dados. Valores: Ferritina=${inputs.ferritina}, Hb=${inputs.hemoglobina}, VCM=${inputs.vcm}, RDW=${inputs.rdw}, Sat=${inputs.satTransf} Flags: Bar=${inputs.bariatrica}, Veg=${inputs.vegetariano}, Perda=${inputs.perda}`,
    };
  }

  let diagnosticoFinal = resultado.diagnostico.replace('FRASE DATA', fraseData.texto);
  if (inputs.aspirina || inputs.vitaminaB12 || inputs.ferroOral) {
    diagnosticoFinal = diagnosticoFinal.replace(
      'SEM SUPLEMENTACAO OU MEDICAMENTOS, SUGERE BOM ESTADO DE SAUDE, COM ESTILO DE VIDA E DIETA SAUDAVEIS.',
      'SUGERE BOM ESTADO DE SAUDE, COM ESTILO DE VIDA E DIETA SAUDAVEIS.'
    );
  }

  return {
    encontrado: true,
    id: resultado.id,
    label: resultado.label,
    color: resultado.color,
    diagnostico: diagnosticoFinal,
    recomendacao: isAge2 ? resultado.recomendacaoAge2 : resultado.recomendacaoAge1,
    comentarios,
    proximosExames: resultado.proximosExames,
    fraseData,
    fraseHipermenorreia: fraseHiper,
    isAge2,
    diasDesdeColeta: dias,
  };
}

export function formatarParaCopiar(resultado, inputs) {
  const hoje = new Date().toLocaleDateString('pt-BR');
  const sexoLabel = inputs.sexo === 'M' ? 'Masc' : 'Fem';

  let texto = 'RedFairy - Avaliacao em ' + hoje + '\n';
  texto += 'Paciente: ' + inputs.iniciais + ' | Sexo: ' + sexoLabel + ' | Idade: ' + inputs.idade + ' anos\n\n';
  texto += 'EXAMES (' + resultado.diasDesdeColeta + ' dia(s) atras)\n';
  texto += resultado.fraseData.texto + '\n\n';
  texto += 'DIAGNOSTICO\n';
  texto += resultado.label + '\n\n';
  texto += resultado.diagnostico + '\n\n';
  texto += 'RECOMENDACAO\n';
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

  texto += 'PROXIMOS EXAMES SUGERIDOS\n';
  resultado.proximosExames.forEach(e => {
    texto += '- ' + e + '\n';
  });

  texto += '\nGerado pelo RedFairy';
  return texto;
}
