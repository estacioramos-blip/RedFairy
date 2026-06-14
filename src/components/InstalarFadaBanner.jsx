import { useState, useEffect } from 'react'

// Banner "Instale a fadinha na tela inicial" (PWA — Add to Home Screen).
// Android/Chrome: usa o prompt nativo (beforeinstallprompt, capturado em index.html).
// iPhone/Safari: não há prompt programático → mostra instrução manual.
// Não aparece se o app já está instalado (display-mode standalone) ou se foi dispensado.

function ehStandalone() {
  try {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  } catch (e) { return false }
}
function ehIOS() {
  try {
    const ua = navigator.userAgent || ''
    return /iphone|ipad|ipod/i.test(ua) && !window.MSStream
  } catch (e) { return false }
}

export default function InstalarFadaBanner() {
  const [prompt, setPrompt] = useState(null)   // evento beforeinstallprompt (Android)
  const [mostrar, setMostrar] = useState(false)
  const [fechado, setFechado] = useState(false)
  const [showIOS, setShowIOS] = useState(false)

  useEffect(() => {
    if (ehStandalone()) return                 // já instalado
    try { if (localStorage.getItem('rf_fada_dismiss') === '1') return } catch (e) {}

    const ios = ehIOS()
    if (ios) { setMostrar(true); return }      // iPhone: instrução manual

    // Android: já capturado em index.html?
    if (window.__rfInstall) { setPrompt(window.__rfInstall); setMostrar(true) }
    const onInstallable = () => {
      if (window.__rfInstall) { setPrompt(window.__rfInstall); setMostrar(true) }
    }
    window.addEventListener('rf-installable', onInstallable)
    window.addEventListener('beforeinstallprompt', onInstallable)
    return () => {
      window.removeEventListener('rf-installable', onInstallable)
      window.removeEventListener('beforeinstallprompt', onInstallable)
    }
  }, [])

  if (!mostrar || fechado) return null

  async function instalar() {
    if (prompt) {
      try {
        prompt.prompt()
        const res = await prompt.userChoice
        setPrompt(null)
        window.__rfInstall = null
        if (res && res.outcome === 'accepted') setFechado(true)
      } catch (e) {}
    } else {
      // iPhone: o "Adicionar à Tela de Início" captura a URL ATUAL. Embutimos o
      // token de sessão (?p=TOKEN&c=CPF) p/ o atalho abrir passwordless mesmo com o
      // storage separado do iOS. (Android usa o storage compartilhado, não precisa.)
      try {
        const tok = localStorage.getItem('paciente_token')
        const cpf = localStorage.getItem('paciente_cpf')
        if (tok && cpf) {
          window.history.replaceState({}, '', `/?p=${encodeURIComponent(tok)}&c=${encodeURIComponent(cpf)}`)
        }
      } catch (e) {}
      setShowIOS(true)
    }
  }
  function dispensar() {
    setFechado(true)
    try { localStorage.setItem('rf_fada_dismiss', '1') } catch (e) {}
  }

  return (
    <div className="max-w-3xl mx-auto px-4 mt-4">
      <div className="rounded-xl border-2 p-4 flex items-start gap-3" style={{ background: '#FDF2F8', borderColor: '#F9A8D4' }}>
        <div className="text-2xl">{"🧚"}</div>
        <div className="flex-1">
          <p className="text-sm font-bold" style={{ color: '#9D174D', margin: 0 }}>
            {"Instale a fadinha na sua tela inicial"}
          </p>
          <p className="text-xs leading-relaxed" style={{ color: '#831843', margin: '0.3rem 0 0' }}>
            {"Assim você volta com 1 toque — sem digitar nada — sempre que quiser avaliar um novo hemograma."}
          </p>

          {showIOS ? (
            <div className="mt-2 rounded-lg bg-white border border-pink-200 px-3 py-2">
              <p className="text-xs" style={{ color: '#831843', margin: 0, lineHeight: 1.5 }}>
                {"No iPhone: toque em "}<strong>{"Compartilhar"}</strong>{" (o quadradinho com a seta ↑) e depois em "}
                <strong>{"\"Adicionar à Tela de Início\""}</strong>{"."}
              </p>
            </div>
          ) : (
            <button onClick={instalar}
              className="mt-3 inline-block text-white font-bold text-xs rounded-lg px-4 py-2"
              style={{ background: '#DB2777', border: 'none', cursor: 'pointer' }}>
              {"Instalar a fadinha →"}
            </button>
          )}
        </div>
        <button onClick={dispensar} aria-label="Fechar"
          className="text-gray-400 hover:text-gray-600 font-bold text-lg leading-none"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          {"×"}
        </button>
      </div>
    </div>
  )
}
