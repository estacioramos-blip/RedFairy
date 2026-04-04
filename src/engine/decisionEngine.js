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
      texto: `OS EXAMES FORAM REALIZADOS HÁ ${dias} DIA(S), E DEVEM REPRESENTAR O ATUAL ESTADO DO SEU ERITRON.`
    };
  } else if (dias <= 40) {
    return {
      tipo: 'B',
      texto: `CONSIDERE QUE OS EXAMES FORAM REALIZADOS HÁ ${dias} DIAS E PODEM NÃO REPRESENTAR CORRETAMENTE A REALIDADE ATUAL DO SEU ERITRON. REPITA-OS QUANDO POSSÍVEL E FAÇA NOVA AVALIAÇÃO NESSE ALGORITMO.`
    };
  } else {
    return {
      tipo: 'C',
      texto: `OS EXAMES FORAM REALIZADOS HÁ ${dias} DIAS E NÃO SÃO CONFIÁVEIS PARA ESTABELECER A SITUAÇÃO ATUAL DO SEU ERITRON. REPITA-OS ASSIM QUE POSSÍVEL E FAÇA NOVA AVALIAÇÃO NESSE ALGORITMO.`
    };
  }
}

export function getFraseHipermenorreia(idade) {
  if (idade < 15) {
    return 'HIPERMENORREIA NESSA FAIXA É GERALMENTE DISFUNCIONAL, MAS PODE HAVER DISTÚRBIO DA HEMOSTASE. PODE LEVAR A DEFICIÊNCIA DE FERRO E ANEMIA, OU AGRAVAR ESSAS CONDIÇÕES. RECOMENDÁVEL AVALIAÇÃO COM GINECOLOGISTA E HEMATOLOGISTA.';
  } else if (idade <= 18) {
    return 'HIPERMENORREIA NESSA FAIXA É GERALMENTE DISFUNCIONAL, MAS É PRECISO AFASTAR DISTÚRBIO DA HEMOSTASE E ENDOMETRIOSE. PODE LEVAR A DEFICIÊNCIA DE FERRO E ANEMIA. RECOMENDÁVEL AVALIAÇÃO COM GINECOLOGISTA E HEMATOLOGISTA.';
  } else if (idade <= 35) {
    return 'HIPERMENORREIA NESSA FAIXA PODE RESULTAR DE USO DE DIU, ENDOMETRIOSE, DISTÚRBIO HORMONAL, MIOMATOSE. PODE LEVAR A DEFICIÊNCIA DE FERRO E ANEMIA. RECOMENDÁVEL AVALIAÇÃO COM MÉDICO GINECOLOGISTA.';
  } else if (idade <= 39) {
    return 'HIPERMENORREIA NESSA FAIXA PODE RESULTAR DE USO DE DIU, LIGADURA DE TROMPAS, ENDOMETRIOSE, DISTÚRBIO HORMONAL, MIOMATOSE E OUTRAS DOENÇAS. RECOMENDÁVEL AVALIAÇÃO COM MÉDICO GINECOLOGISTA.';
  } else if (idade <= 55) {
    return 'HIPERMENORREIA NESSA FAIXA PODE RESULTAR DE USO DE DIU, LIGADURA DE TROMPAS, ENDOMETRIOSE, PRÉ-MENOPAUSA, MIOMATOSE E OUTRAS DOENÇAS. RECOMENDÁVEL AVALIAÇÃO GINECOLÓGICA.';
  } else {
    return 'SANGRAMENTO GENITAL PODE OCORRER NA PRÉ-MENOPAUSA. NO CLIMATÉRIO PODE RESULTAR DE REPOSIÇÃO HORMONAL, MIOMATOSE E OUTRAS DOENÇAS. RECOMENDÁVEL AVALIAÇÃO GINECOLÓGICA.';
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
  const inputsAjustados = { ...inputs };
  if (inputs.sexo === 'F' && inputs.gestante) {
    if (inputs.hemoglobina >= 11 && inputs.hemoglobina <= 11.9) {
      inputsAjustados.hemoglobina = 12.0;
    }
  }

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

  if (!resultado) {
    return {
      encontrado: false,
      mensagem: `Combinação não encontrada na base de dados. Valores: Ferritina=${inputs.ferritina}, Hb=${inputs.hemoglobina}, VCM=${inputs.vcm}, RDW=${inputs.rdw}, Sat=${inputs.satTransf} Flags: Bar=${inputs.bariatrica}, Veg=${inputs.vegetariano}, Perda=${inputs.perda}`,
    };
  }

  // Remove FRASE DATA do diagnóstico (já aparece separado no card)
  let diagnosticoFinal = resultado.diagnostico.replace('FRASE DATA', '').trim();

  if (inputs.aspirina || inputs.vitaminaB12 || inputs.ferroOral) {
    diagnosticoFinal = diagnosticoFinal.replace(
      'SEM SUPLEMENTAÇÃO OU MEDICAMENTOS, SUGERE BOM ESTADO DE SAÚDE, COM ESTILO DE VIDA E DIETA SAUDÁVEIS.',
      'SUGERE BOM ESTADO DE SAÚDE, COM ESTILO DE VIDA E DIETA SAUDÁVEIS.'
    );
  }

  // Monta recomendação e substitui frase de doação quando perda=true
  let recomendacaoFinal = isAge2 ? resultado.recomendacaoAge2 : resultado.recomendacaoAge1;

  if (inputs.perda) {
    recomendacaoFinal = recomendacaoFinal.replace(
      'VOCÊ NÃO PODERIA DOAR SANGUE.',
      'SE A HEMORRAGIA QUE VOCÊ MARCOU REFERE-SE A DOAÇÃO DE SANGUE OU SANGRIA, VOCÊ NÃO DEVIA TER FEITO.'
    );
  }

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
    isAge2,
    diasDesdeColeta: dias,
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

  texto += 'PRÓXIMOS EXAMES SUGERIDOS\n';
  resultado.proximosExames.forEach(e => {
    texto += '- ' + e + '\n';
  });

  texto += '\nGerado pelo RedFairy';
  return texto;
}