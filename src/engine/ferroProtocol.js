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

// Custo de ferro da GESTAÇÃO (mg) que o conceptus consome das reservas maternas
// ao longo da gravidez. Literatura (AJCN 2023; total ≈ 1000 mg): feto+placenta
// ~360 mg, expansão da massa eritrocitária materna ~450 mg, perdas basais ~240 mg,
// perda no parto ~150 mg. A maior parte acumula no 3º TRIMESTRE — por isso o
// acréscimo é escalado pelas semanas com peso QUADRÁTICO (carga exponencial tardia).
// Valor TUNÁVEL pelo médico (Dr. Ramos).
export const FERRO_GESTACAO_TERMO_MG = 1000;

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
export function calcularDeficitFerroGanzoni({ sexo, peso, hb, gestante = false, semanasGestacao = null }) {
  const p = Number(peso);
  const h = Number(hb);
  const alvo = (sexo === 'F' && gestante) ? HB_ALVO_GESTANTE : HB_ALVO[sexo];

  // Dados insuficientes/incoerentes → sem cálculo (o chamador trata o null).
  if (!Number.isFinite(p) || p <= 0) return null;
  if (!Number.isFinite(h) || h <= 0) return null;
  if (!Number.isFinite(alvo)) return null;

  // Parcela da Hb: nunca negativa (Hb já acima do alvo → 0; repõe só a reserva).
  const termoHb = Math.max(0, alvo - h) * p * CONSTANTE_GANZONI;

  // Acréscimo GESTACIONAL (só F + gestante): ferro que o conceptus consome das
  // reservas maternas, escalado pelas SEMANAS com peso quadrático — reflete o
  // consumo exponencial concentrado no 3º trimestre. Sem semanas válidas → 0.
  const sem = Number(semanasGestacao);
  const temSemanas = (sexo === 'F' && gestante) && Number.isFinite(sem) && sem > 0;
  const fracGestacao = temSemanas ? Math.min(1, (Math.min(sem, 42) / 40) ** 2) : 0;
  const ferroGestacaoMg = Math.round(FERRO_GESTACAO_TERMO_MG * fracGestacao);

  const total = Math.round(termoHb + FERRO_RESERVA_MG + ferroGestacaoMg);

  return {
    deficitMg: total,
    termoHbMg: Math.round(termoHb),
    reservaMg: FERRO_RESERVA_MG,
    ferroGestacaoMg,
    semanasGestacao: temSemanas ? sem : null,
    hbAlvo: alvo,
    hbAtual: h,
    peso: p,
    formula: `${p} × (${alvo} − ${h}) × ${CONSTANTE_GANZONI} + ${FERRO_RESERVA_MG}${ferroGestacaoMg > 0 ? ` + ${ferroGestacaoMg} (gestação)` : ''} = ${total} mg`,
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
