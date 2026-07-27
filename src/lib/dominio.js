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

// Aplica o branding "Projeto OBA" (título, descrição, manifest, ícone iOS) por
// cima do padrão RedFairy do index.html — só quando ehDominioBariatrico(). Sem
// isto, redfairy.bio (domínio geral, não-bariátrico) NÃO deve carregar identidade
// OBA — o index.html/manifest.webmanifest já nascem com o branding RedFairy.
export function aplicarBrandingOBA() {
  if (!ehDominioBariatrico() || typeof document === 'undefined') return
  try {
    document.title = 'RedFairy | Projeto OBA'
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
