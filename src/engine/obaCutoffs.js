// src/engine/obaCutoffs.js
// Cutoffs clinicos para classificacao automatica de exames no OBAModal.
//
// REGRAS (calibradas pelo Dr. Ramos):
//   - Bariatrica tem alvo especifico em B12 e Vit D (mais exigente)
//   - Exames dimorficos de verdade (testosterona/prolactina) usam CUTOFFS_POR_SEXO
//     quando o sexo e' informado; sem sexo, cai no envelope largo (mais permissivo)
//     do OBA_CUTOFFS generico so' pra nao travar a classificacao
//   - Classificacao em 3 niveis: normal / limitrofe (<=10% fora) / alterado (>10% fora)

export const OBA_CUTOFFS = {
  // Hemograma
  leucocitos:     { min: 4000,  max: 11000 },
  neutrofilos:    { min: 40,    max: 70    },  // %
  plaquetas:      { min: 150,   max: 400   },  // x1000

  // Ferro/vitaminas criticos em bariatrica
  ferritina_oba:  { min: 25,    max: 300   },  // permissivo (H ate 300)
  vitamina_b12:   { min: 200,   max: 900   },  // 200 ja e normal (Dr. Ramos)
  vitamina_d:     { min: 30,    max: 100   },

  // Tireoide
  tsh:            { min: 0.4,   max: 4.5   },

  // Metabolismo glicemico
  hb_glicada:     { min: 0,     max: 5.7   },
  glicemia:       { min: 70,    max: 99    },
  insulina:       { min: 2,     max: 15    },

  // Lipideos
  triglicerides:  { min: 0,     max: 150   },

  // Coagulacao
  d_dimero:       { min: 0,     max: 500   },  // ng/mL FEU

  // Imuno/atopia
  ige_total:      { min: 0,     max: 100   },  // UI/mL (adulto)

  // Hepaticas (permissivo dimorfico - valor H)
  ast:            { min: 0,     max: 40    },
  alt:            { min: 0,     max: 56    },
  gama_gt:        { min: 0,     max: 61    },

  // Renal (permissivo dimorfico - valor H)
  creatinina:     { min: 0.5,   max: 1.2   },
  acido_urico:    { min: 2.4,   max: 7.0   },

  // Vitaminas/minerais
  folatos:        { min: 4.0,   max: 20.0  },
  zinco:          { min: 70,    max: 120   },
  vitamina_a:     { min: 20,    max: 77    },
  vitamina_e:     { min: 5,     max: 18    },
  tiamina:        { min: 70,    max: 180   },
  selenio:        { min: 63,    max: 160   },
  vitamina_c:     { min: 0.4,   max: 2.0   },
  vitamina_k:     { min: 0.2,   max: 3.2   },
  niacina:        { min: 0.5,   max: 8.9   },

  // Hormonios — fallback SEXO-CEGO (usado só quando contexto.sexo nao e' informado).
  // Envelope permissivo (H+F somados) so' pra nao travar sem sexo; a classificacao
  // de verdade e' por CUTOFFS_POR_SEXO (abaixo), que e' o caso normal no OBAModal.
  testosterona:   { min: 15,    max: 1000  },
  prolactina:     { min: 0,     max: 25    },  // ng/mL — <15(H)/<25(F); sem sexo usa o teto mais permissivo (F)

  // Homens >= 40
  psa_total:      { min: 0,     max: 4.0   },
  ca199:          { min: 0,     max: 37    },
  cea:            { min: 0,     max: 5.0   },

  // Eixo osseo-mineral
  pth:            { min: 15,    max: 65    },  // PTH intacto (pg/mL)
  calcio_ionico:  { min: 1.15,  max: 1.32  },  // mmol/L
  magnesio:       { min: 1.7,   max: 2.4   },  // mg/dL

  // Renal (ureia)
  ureia:          { min: 15,    max: 40    },  // mg/dL

  // Proteinas (idade >= 45) — globulina = proteina_total - albumina (calculada)
  proteina_total: { min: 6.0,   max: 8.0   },  // g/dL
  albumina:       { min: 3.5,   max: 5.2   },  // g/dL
  globulina:      { min: 2.0,   max: 3.5   },  // g/dL

  // Outros
  estradiol:      { min: 5,     max: 400   },  // permissivo (nao-gestante)
}

// Cutoffs especiais para pacientes bariatricas
// Bariatrica precisa de alvo mais rigoroso em B12 e Vit D
// Exportado (alem de usado por classificarValor aqui) para o obaComparador.js
// poder resolver o mesmo cutoff-ajustado-por-bariatrica ao comparar ciclos.
export const CUTOFFS_BARIATRICA = {
  vitamina_b12:   { min: 200,   max: 2000  },  // 200 ja e normal (Dr. Ramos)
  vitamina_d:     { min: 30,    max: 200   },  // alvo pos-bariatrica
}

// Cutoffs DIMORFICOS de verdade (H/F tem faixas clinicamente diferentes, nao so'
// um envelope permissivo). Prioridade MAXIMA em classificarValor quando
// contexto.sexo vem preenchido — sem isso, testosterona/prolactina caiam sempre
// no fallback sexo-cego acima (ex.: testosterona masculina de 50 ng/dL, bem
// abaixo do normal H de 300-1000, entrava no envelope largo 15-1000 e saia
// "normal"/verde). Mesmos numeros do ref exibido no OBAModal (obaExamesRef.js).
export const CUTOFFS_POR_SEXO = {
  M: {
    testosterona: { min: 300, max: 1000 },
    prolactina:   { min: 0,   max: 15   },
  },
  F: {
    testosterona: { min: 15,  max: 70   },
    prolactina:   { min: 0,   max: 25   },
  },
}

/**
 * Classifica um valor laboratorial como normal, limitrofe ou alterado.
 *
 * @param {string} chave - Chave do exame (ex: 'vitamina_b12')
 * @param {number|string} valor - Valor digitado pelo usuario
 * @param {object} contexto - { bariatrica: boolean, sexo: 'M'|'F' }
 * @returns {object|null} { nivel, direcao, faixa } ou null se nao classificavel
 *
 * Niveis:
 *   - 'normal'    → dentro da faixa
 *   - 'limitrofe' → <= 10% fora da faixa (amarelo)
 *   - 'alterado'  → > 10% fora da faixa (laranja/vermelho)
 *
 * Direcao:
 *   - 'alto'  → valor acima do max
 *   - 'baixo' → valor abaixo do min
 *   - null    → dentro da faixa
 */
export function classificarValor(chave, valor, contexto = {}) {
  // Vírgula decimal: '12,5' virava NaN e a função devolvia `null` em silêncio —
  // o exame simplesmente não era classificado (nem verde, nem vermelho), sem
  // nenhum aviso. Os campos numéricos do OBA normalmente entregam ponto, mas
  // valor colado de outra tela ou de um relatório vem com vírgula.
  // `true`/`false`/`[]`/' ' também viravam 0 e saíam como "baixo": só número ou
  // texto numérico é aceito.
  if (typeof valor === 'boolean' || Array.isArray(valor)) return null
  const bruto = typeof valor === 'string' ? valor.trim().replace(',', '.') : valor
  if (bruto === '' || bruto === null || bruto === undefined) return null
  const valorNum = Number(bruto)
  if (!Number.isFinite(valorNum)) {
    return null
  }

  // Pega cutoff especifico ou generico. Prioridade: DIMORFICO por sexo (o mais
  // clinicamente correto pra quem tem, ex. testosterona/prolactina) > bariatrica
  // (alvo pos-cirurgia, ex. B12/vit D) > generico sexo-cego (fallback).
  let cutoff = OBA_CUTOFFS[chave]
  if (contexto.bariatrica && CUTOFFS_BARIATRICA[chave]) {
    cutoff = CUTOFFS_BARIATRICA[chave]
  }
  if (contexto.sexo && CUTOFFS_POR_SEXO[contexto.sexo]?.[chave]) {
    cutoff = CUTOFFS_POR_SEXO[contexto.sexo][chave]
  }
  if (!cutoff) return null

  const { min, max } = cutoff
  const faixa = `${min}–${max}`

  // Dentro da faixa
  if (valorNum >= min && valorNum <= max) {
    return { nivel: 'normal', direcao: null, faixa }
  }

  // Fora da faixa — calcular distancia percentual
  let distanciaPct
  let direcao
  if (valorNum < min) {
    distanciaPct = ((min - valorNum) / min) * 100
    direcao = 'baixo'
  } else {
    distanciaPct = ((valorNum - max) / max) * 100
    direcao = 'alto'
  }

  const nivel = distanciaPct <= 10 ? 'limitrofe' : 'alterado'
  return { nivel, direcao, faixa }
}
