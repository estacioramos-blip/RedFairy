// ============================================================================
//  fallbackEngine.js — Rede de segurança clínica
// ----------------------------------------------------------------------------
//  Quando o decisionEngine não encontra match nas matrizes, esta função
//  é chamada para gerar uma resposta clinicamente útil baseada em:
//    1. Anormalidade da Hemoglobina (alta/baixa) com gravidade laboratorial
//    2. Discrepâncias entre os 5 parâmetros laboratoriais
//    3. Recomendação obrigatória de avaliação médica/hematológica
// ============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// FAIXAS DE NORMALIDADE DA HEMOGLOBINA (g/dL)
// ─────────────────────────────────────────────────────────────────────────────
function getHbRange(sexo, gestante) {
  if (sexo === 'M') return { min: 13.5, max: 17.5 }
  if (gestante)     return { min: 11.0, max: 15.5 }
  return { min: 12.0, max: 15.5 } // mulher não gestante
}

// ─────────────────────────────────────────────────────────────────────────────
// CLASSIFICAÇÃO DE GRAVIDADE — Hb BAIXA
// ─────────────────────────────────────────────────────────────────────────────
function classificarHbBaixa(hb, sexo, gestante) {
  if (sexo === 'M') {
    if (hb >= 13 && hb < 13.5)  return 'LEVE'
    if (hb >= 12.5 && hb < 13)  return 'MODERADA'
    if (hb >= 9 && hb < 12.5)   return 'IMPORTANTE'
    if (hb < 9)                 return 'GRAVE'
  } else if (gestante) {
    if (hb >= 10 && hb < 11)    return 'LEVE'
    if (hb >= 9 && hb < 10)     return 'MODERADA'
    if (hb >= 8 && hb < 9)      return 'IMPORTANTE'
    if (hb < 8)                 return 'GRAVE'
  } else {
    if (hb >= 10 && hb < 12)    return 'LEVE'
    if (hb >= 8 && hb < 10)     return 'MODERADA'
    if (hb >= 7 && hb < 8)      return 'IMPORTANTE'
    if (hb < 7)                 return 'GRAVE'
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// CLASSIFICAÇÃO DE GRAVIDADE — Hb ALTA
// ─────────────────────────────────────────────────────────────────────────────
function classificarHbAlta(hb, sexo, gestante) {
  if (sexo === 'M') {
    if (hb > 17.5 && hb <= 18.5) return 'LEVE'
    if (hb > 18.5 && hb <= 19.5) return 'MODERADA'
    if (hb > 19.5)               return 'GRAVE'
  } else if (gestante) {
    if (hb > 15 && hb <= 16)     return 'LEVE'
    if (hb > 16 && hb <= 17)     return 'MODERADA'
    if (hb > 17)                 return 'GRAVE'
  } else {
    if (hb > 15.5 && hb <= 16.5) return 'LEVE'
    if (hb > 16.5 && hb <= 17.5) return 'MODERADA'
    if (hb > 17.5)               return 'GRAVE'
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// FAIXAS NORMAIS DOS DEMAIS PARÂMETROS (referência genérica)
// ─────────────────────────────────────────────────────────────────────────────
function getRefs(sexo) {
  return {
    ferritinaMin: sexo === 'M' ? 24 : 25,
    ferritinaMax: sexo === 'M' ? 336 : 150,
    vcmMin: 80,
    vcmMax: 100,
    rdwMin: 11.5,
    rdwMax: 15,
    satMin: 20,
    satMax: 50,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MEDICAMENTOS QUE CAUSAM MACROCITOSE (iatrogenia)
// ─────────────────────────────────────────────────────────────────────────────
const MEDS_MACROCITOSE = [
  { flag: 'hidroxiureia',       nome: 'Hidroxiureia' },
  { flag: 'metformina',         nome: 'Metformina' },
  { flag: 'ibp',                nome: 'IBP (omeprazol/pantoprazol)' },
  { flag: 'methotrexato',       nome: 'Metotrexato' },
  { flag: 'anticonvulsivante',  nome: 'Anticonvulsivante' },
  { flag: 'hivTratamento',      nome: 'Antirretroviral (HIV)' },
]

// ─────────────────────────────────────────────────────────────────────────────
// DETECÇÃO DE DISCREPÂNCIAS — retorna array de strings explicativas
// ─────────────────────────────────────────────────────────────────────────────
function detectarDiscrepancias(inputs) {
  const refs = getRefs(inputs.sexo)
  const f = inputs.ferritina
  const v = inputs.vcm
  const r = inputs.rdw
  const s = inputs.satTransf
  const hb = inputs.hemoglobina

  const ferrAlta  = f > refs.ferritinaMax
  const ferrBaixa = f < refs.ferritinaMin
  const satAlta   = s > refs.satMax
  const satBaixa  = s < refs.satMin
  const vcmAlto   = v > refs.vcmMax
  const vcmBaixo  = v < refs.vcmMin
  const rdwAlto   = r > refs.rdwMax

  const range = getHbRange(inputs.sexo, inputs.gestante)
  const hbBaixa = hb < range.min
  const hbAlta  = hb > range.max

  const discrepancias = []

  // Regra 1 — Sat ↓ + Ferr ↑
  if (satBaixa && ferrAlta) {
    discrepancias.push(
      'Saturação baixa sugere deficiência de ferro, apesar da Ferritina elevada — ' +
      'provavelmente espúria, decorrente de processo inflamatório ou de natureza neoplásica subjacente.'
    )
  }

  // Regra 2 — Sat ↑ + Ferr ↑
  if (satAlta && ferrAlta) {
    discrepancias.push(
      'Saturação e Ferritina elevadas sugerem sobrecarga de ferro ' +
      '(siderose, hemocromatose, iatrogenia) ou hemólise.'
    )
  }

  // Regra 3 — VCM ↑ + Hb ↓ + Ferr ↓ + Sat ↓ (anemia dimórfica)
  if (vcmAlto && hbBaixa && ferrBaixa && satBaixa) {
    let txt = 'Macrocitose com sideropenia sugere anemia dimórfica — ' +
              'déficit simultâneo de B12/folato e ferro.'
    const medsAtivos = MEDS_MACROCITOSE
      .filter(m => inputs[m.flag])
      .map(m => m.nome)
    if (medsAtivos.length > 0) {
      txt += ' O uso de ' + medsAtivos.join(', ') +
             ' pode contribuir como fator iatrogênico para a macrocitose.'
    }
    discrepancias.push(txt)
  }

  // Regra 4 — VCM ↑ + Hb ↓ (sem sideropenia) → macrocitose isolada
  if (vcmAlto && hbBaixa && !ferrBaixa) {
    let txt = 'Macrocitose com anemia — investigar déficit de B12, folato, álcool, ' +
              'hepatopatia, hipotireoidismo, mielodisplasia.'
    const medsAtivos = MEDS_MACROCITOSE
      .filter(m => inputs[m.flag])
      .map(m => m.nome)
    if (medsAtivos.length > 0) {
      txt += ' O uso de ' + medsAtivos.join(', ') +
             ' pode contribuir como fator iatrogênico para a macrocitose.'
    }
    discrepancias.push(txt)
  }

  // Regra 5 — RDW > 20 (anisocitose marcada)
  if (r > 20) {
    discrepancias.push(
      'RDW muito elevado sinaliza anisocitose marcada — sugere mistura de populações ' +
      'eritroides ou eritropoese desordenada.'
    )
  }

  // Regra 6 — Hb ↑ + Sat ↓ + Ferr normal/↑
  if (hbAlta && satBaixa && !ferrBaixa) {
    discrepancias.push(
      'Hb elevada com sideropenia relativa pode refletir policitemia vera em regime ' +
      'de sangrias terapêuticas.'
    )
  }

  return discrepancias
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL DE FALLBACK
// ─────────────────────────────────────────────────────────────────────────────
export function gerarFallbackClinico(inputs) {
  const hb = inputs.hemoglobina
  const sexo = inputs.sexo
  const gestante = !!inputs.gestante

  const range = getHbRange(sexo, gestante)
  const hbBaixa = hb < range.min
  const hbAlta = hb > range.max

  // Classificação da Hb
  let hbStatus = 'NORMAL'
  let gravidade = null

  if (hbBaixa) {
    hbStatus = 'BAIXA'
    gravidade = classificarHbBaixa(hb, sexo, gestante)
  } else if (hbAlta) {
    hbStatus = 'ALTA'
    gravidade = classificarHbAlta(hb, sexo, gestante)
  }

  // Detecta discrepâncias
  const discrepancias = detectarDiscrepancias(inputs)

  // Constrói label
  let label = ''
  if (hbStatus === 'BAIXA') {
    label = 'HEMOGLOBINA BAIXA' + (gravidade ? ' ' + gravidade : '')
  } else if (hbStatus === 'ALTA') {
    label = 'HEMOGLOBINA ELEVADA' + (gravidade ? ' ' + gravidade : '')
  } else {
    label = 'PARÂMETROS LABORATORIAIS DISCREPANTES'
  }

  // Sempre marca como CRÍTICO se há Hb anormal OU discrepâncias
  const ehCritico = (hbStatus !== 'NORMAL') || discrepancias.length > 0
  if (ehCritico) {
    label += '. ACHADO CRÍTICO'
    if (discrepancias.length > 0) {
      label += '. PARÂMETROS DISCREPANTES'
    }
    label += '.'
  }

  // Constrói diagnóstico
  let diagnostico = ''

  if (hbStatus === 'BAIXA') {
    diagnostico = 'HEMOGLOBINA BAIXA (' + hb.toFixed(1) + ' g/dL) — anemia ' +
                  (gravidade ? gravidade.toLowerCase() : '') + '.'
  } else if (hbStatus === 'ALTA') {
    diagnostico = 'HEMOGLOBINA ELEVADA (' + hb.toFixed(1) + ' g/dL) — eritrocitose ' +
                  (gravidade ? gravidade.toLowerCase() : '') + '.'
  } else {
    diagnostico = 'Hemoglobina dentro da faixa de normalidade, mas há discrepâncias ' +
                  'entre os demais parâmetros laboratoriais.'
  }

  if (discrepancias.length > 0) {
    diagnostico += '\n\n' + discrepancias.join('\n\n')
  } else if (hbStatus !== 'NORMAL') {
    diagnostico += '\n\nA combinação de parâmetros laboratoriais informada não foi ' +
                   'reconhecida pelo algoritmo. Recomenda-se reavaliação clínica.'
  }

  // Recomendação
  const recomendacao = 'Necessária a intervenção do médico assistente ou de HEMATOLOGISTA. ' +
                       'O conjunto dos parâmetros laboratoriais informados não permite ' +
                       'diagnóstico automático preciso, mas indica achados que requerem ' +
                       'avaliação clínica direcionada.'

  // Retorna objeto compatível com ResultCard
  // Inclui TODOS os campos que ResultCard.jsx pode acessar para evitar TypeError
  return {
    encontrado: true,
    label,
    color: 'red',
    diagnostico,
    recomendacao,
    recomendacaoAge1: recomendacao,
    recomendacaoAge2: recomendacao,
    proximosExames: ['Reavaliação clínica com médico assistente ou hematologista'],
    comentarios: [],
    achadosParalelos: [],
    g6pdAlerta: null,
    obsoleto: false,
    _fallback: true, // marcador para diferenciar de match real
    _inputs: inputs,
  }
}
