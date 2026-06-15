// Detecção do domínio BARIÁTRICO (bariatrico.net) — "porta de entrada exclusiva
// para bariátricos". Liga o MODO BARIÁTRICO: o paciente já entra com o flag
// bariátrico (rf_flag) e o checkbox bariátrico do médico vem pré-marcado.
// O resto é o RedFairy normal (mesmo algoritmo, mesmo crédito, mesmo QR).
//
// Dev/teste (hostname não é bariatrico.net): ?bari=1 liga (persiste no
// localStorage), ?bari=0 desliga.
export function ehDominioBariatrico() {
  try {
    const h = (window.location.hostname || '').toLowerCase()
    if (h === 'bariatrico.net' || h.endsWith('.bariatrico.net')) return true
    const bari = new URLSearchParams(window.location.search).get('bari')
    if (bari === '1') return true
    if (bari === '0') return false
    if (localStorage.getItem('rf_dom_bari') === '1') return true
  } catch (e) {}
  return false
}
