// Troca o MANIFESTO + o apple-touch-icon + o título do PWA conforme o fluxo (papel),
// pra o ÍCONE instalado sair com a letra do papel (p/m/i) e abrir o fluxo certo.
//
// - iOS ("Adicionar à Tela de Início"): usa apple-touch-icon + apple-mobile-web-app-title
//   no momento do "Adicionar" → funciona de forma confiável se trocarmos ANTES.
// - Android/Chrome: usa o <link rel="manifest"> (short_name/icons/start_url). Trocamos o
//   href cedo (ao entrar no fluxo) pra o beforeinstallprompt capturar o manifesto certo.
//
// Chamado no App conforme o `modo`. Sem letra válida (ex.: 'home') não mexe.

const MAP = {
  p: { manifest: '/manifest-p.webmanifest', icon: '/oba-fairy-p.png', title: 'OBA p' },
  m: { manifest: '/manifest-m.webmanifest', icon: '/oba-fairy-m.png', title: 'OBA m' },
  i: { manifest: '/manifest-i.webmanifest', icon: '/oba-fairy-i.png', title: 'OBA i' },
}

export function setManifestFluxo(letra) {
  const cfg = MAP[letra]
  if (!cfg || typeof document === 'undefined') return
  try {
    const m = document.querySelector('link[rel="manifest"]')
    if (m && m.getAttribute('href') !== cfg.manifest) m.setAttribute('href', cfg.manifest)
    const ai = document.querySelector('link[rel="apple-touch-icon"]')
    if (ai) ai.setAttribute('href', cfg.icon)
    const t = document.querySelector('meta[name="apple-mobile-web-app-title"]')
    if (t) t.setAttribute('content', cfg.title)
  } catch (e) {}
}
