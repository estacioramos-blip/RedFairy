// ─────────────────────────────────────────────────────────────────────────────
// Protocolo de reposição de FERRO ENDOVENOSO — Fórmula de Ganzoni
//
//   Déficit de ferro (mg) = peso (kg) × (Hb alvo − Hb atual) × 2,4 + ferro de reserva
//
// Definição clínica (Dr. Ramos, hematologista) — ver DOCS/90_DECISION_LOG DEC-006:
//   • Hb alvo:  ♂ 13,5 g/dL   ♀ 12,0 g/dL   (limite inferior do normal por sexo)
//   • Hb alvo na GESTANTE: 11,5 g/dL (carve-out clínico — caso distinto da ♀ não-gestante)
//   • Ferro de reserva: 500 mg fixo (adultos)
//   • Constante 2,4: fixa (embute volemia ≈70 mL/kg e o conteúdo de ferro da Hb)
//   • Clamp: se Hb atual ≥ Hb alvo, a parcela da Hb zera (repõe só os 500 mg)
//
// Este módulo é uma função PURA: não toca em UI, Supabase nem no decisionEngine.
// Quem decide SE deve disparar (diagnóstico com indicação de ferro EV, e nunca
// em sobrecarga) é o chamador — aqui só fazemos a conta quando pedida.
// ─────────────────────────────────────────────────────────────────────────────

export const HB_ALVO = { M: 13.5, F: 12.0 }; // g/dL, por sexo
export const HB_ALVO_GESTANTE = 11.5;        // g/dL, sobrepõe a Hb alvo feminina
export const FERRO_RESERVA_MG = 500;         // mg, adultos
export const CONSTANTE_GANZONI = 2.4;        // fixa

/**
 * Calcula o déficit total de ferro (mg) pela Fórmula de Ganzoni.
 *
 * @param {Object} p
 * @param {('M'|'F')} p.sexo  - sexo biológico (define a Hb alvo)
 * @param {number|string} p.peso - peso do paciente em kg
 * @param {number|string} p.hb   - hemoglobina atual em g/dL
 * @param {boolean} [p.gestante] - se true e sexo F, usa Hb alvo gestacional (11,5)
 * @returns {null | {
 *   deficitMg: number, termoHbMg: number, reservaMg: number,
 *   hbAlvo: number, hbAtual: number, peso: number, formula: string
 * }}  null quando faltam dados válidos (peso/Hb/sexo).
 */
export function calcularDeficitFerroGanzoni({ sexo, peso, hb, gestante = false }) {
  const p = Number(peso);
  const h = Number(hb);
  const alvo = (sexo === 'F' && gestante) ? HB_ALVO_GESTANTE : HB_ALVO[sexo];

  // Dados insuficientes/incoerentes → sem cálculo (o chamador trata o null).
  if (!Number.isFinite(p) || p <= 0) return null;
  if (!Number.isFinite(h) || h <= 0) return null;
  if (!Number.isFinite(alvo)) return null;

  // Parcela da Hb: nunca negativa (Hb já acima do alvo → 0; repõe só a reserva).
  const termoHb = Math.max(0, alvo - h) * p * CONSTANTE_GANZONI;
  const total = Math.round(termoHb + FERRO_RESERVA_MG);

  return {
    deficitMg: total,
    termoHbMg: Math.round(termoHb),
    reservaMg: FERRO_RESERVA_MG,
    hbAlvo: alvo,
    hbAtual: h,
    peso: p,
    formula: `${p} × (${alvo} − ${h}) × ${CONSTANTE_GANZONI} + ${FERRO_RESERVA_MG} = ${total} mg`,
  };
}

// Extrai o primeiro número de um texto livre (ex.: "500, 1000" → 500).
export function primeiroNumero(txt) {
  const m = String(txt ?? '').match(/\d+/);
  return m ? Number(m[0]) : null;
}

/**
 * A partir da dose total (mg) e dos parâmetros de uma droga do catálogo
 * (campos `frascos_mg` e `dose_max_sessao_mg`), calcula quantos frascos e
 * quantas sessões. Tolerante a campos vazios.
 */
export function calcReceita(doseTotal, med) {
  const frasco = primeiroNumero(med.frascos_mg) || med.dose_max_sessao_mg || 100;
  const maxSessao = med.dose_max_sessao_mg || frasco;
  const frascos = Math.max(1, Math.ceil(doseTotal / frasco));
  const sessoes = Math.max(1, Math.ceil(doseTotal / maxSessao));
  return { frasco, maxSessao, frascos, sessoes };
}
