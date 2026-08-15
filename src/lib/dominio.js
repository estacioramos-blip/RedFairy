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

// Desde 15/08/2026 o index.html/manifest JÁ NASCEM com identidade Projeto OBA
// (decisão do Estácio: RedFairy sem divulgação nem aplicação). Esta função ficou
// quase redundante — o que ela ainda faz de útil no domínio bariátrico é trocar
// o manifest pelo manifest-oba (start_url ?oba=1 → entra direto no fluxo OBA).
export function aplicarBrandingOBA() {
  if (!ehDominioBariatrico() || typeof document === 'undefined') return
  try {
    document.title = 'Projeto OBA®'
    const desc = document.querySelector('meta[name="description"]')
    if (desc) desc.setAttribute('content', 'Projeto OBA®: plataforma inteligente de acompanhamento e triagem para pacientes bariátricos.')
    const at = document.querySelector('meta[name="apple-mobile-web-app-title"]')
    if (at) at.setAttribute('content', 'Projeto OBA')
    const ai = document.querySelector('link[rel="apple-touch-icon"]')
    if (ai) ai.setAttribute('href', '/oba-fairy-v2.png')
    const m = document.querySelector('link[rel="manifest"]')
    if (m) m.setAttribute('href', '/manifest-oba.webmanifest')
  } catch (e) {}
}
