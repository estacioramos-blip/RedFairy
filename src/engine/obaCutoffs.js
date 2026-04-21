// src/engine/obaCutoffs.js
// Cutoffs clinicos para classificacao automatica de exames no OBAModal.
//
// REGRAS (calibradas pelo Dr. Ramos):
//   - Bariatrica tem alvo especifico em B12 e Vit D (mais exigente)
//   - Exames com cutoff dimorfico usam o valor mais permissivo (envelope amplo)
//   - Classificacao em 3 niveis: normal / limitrofe (<=10% fora) / alterado (>10% fora)

export const OBA_CUTOFFS = {
  // Hemograma
  leucocitos:     { min: 4000,  max: 11000 },
  neutrofilos:    { min: 40,    max: 70    },  // %
  plaquetas:      { min: 150,   max: 400   },  // x1000

  // Ferro/vitaminas criticos em bariatrica
  ferritina_oba:  { min: 25,    max: 336   },  // permissivo (H ate 336)
  vitamina_b12:   { min: 300,   max: 900   },
  vitamina_d:     { min: 30,    max: 100   },

  // Tireoide
  tsh:            { min: 0.4,   max: 4.5   },

  // Metabolismo glicemico
  hb_glicada:     { min: 0,     max: 5.7   },
  glicemia:       { min: 70,    max: 99    },
  insulina:       { min: 2,     max: 15    },

  // Lipideos
  triglicerides:  { min: 0,     max: 150   },

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

  // Hormonios (permissivo dimorfico - valor H)
  testosterona:   { min: 15,    max: 1000  },

  // Homens >= 40
  psa_total:      { min: 0,     max: 4.0   },
  ca199:          { min: 0,     max: 37    },
  cea:            { min: 0,     max: 5.0   },

  // Outros
  estradiol:      { min: 5,     max: 400   },  // permissivo (nao-gestante)
}

// Cutoffs especiais para pacientes bariatricas
// Bariatrica precisa de alvo mais rigoroso em B12 e Vit D
const CUTOFFS_BARIATRICA = {
  vitamina_b12:   { min: 300,   max: 2000  },  // alvo pos-bariatrica
  vitamina_d:     { min: 30,    max: 200   },  // alvo pos-bariatrica
}

/**
 * Classifica um valor laboratorial como normal, limitrofe ou alterado.
 *
 * @param {string} chave - Chave do exame (ex: 'vitamina_b12')
 * @param {number|string} valor - Valor digitado pelo usuario
 * @param {object} contexto - { bariatrica: boolean }
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
  const valorNum = Number(valor)
  if (!Number.isFinite(valorNum) || valor === '' || valor === null) {
    return null
  }

  // Pega cutoff especifico ou generico
  let cutoff = OBA_CUTOFFS[chave]
  if (contexto.bariatrica && CUTOFFS_BARIATRICA[chave]) {
    cutoff = CUTOFFS_BARIATRICA[chave]
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
