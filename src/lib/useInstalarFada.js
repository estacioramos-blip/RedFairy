import { useState, useEffect } from 'react'

// Hook do "instalar a fadinha" (PWA — Add to Home Screen), usado no checkbox da
// tela de boas-vindas. Android/Chrome: prompt nativo (beforeinstallprompt,
// capturado em index.html). iPhone/Safari: instrução manual + embute o token de
// sessão na URL p/ o atalho abrir passwordless (mesmo com storage separado do iOS).

function ehStandalone() {
  try { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true } catch (e) { return false }
}
function ehIOS() {
  try { const ua = navigator.userAgent || ''; return /iphone|ipad|ipod/i.test(ua) && !window.MSStream } catch (e) { return false }
}

export function useInstalarFada() {
  const [prompt, setPrompt] = useState(null)
  const [ios, setIos] = useState(false)
  const standalone = ehStandalone()

  useEffect(() => {
    if (standalone) return
    if (ehIOS()) { setIos(true); return }
    if (window.__rfInstall) setPrompt(window.__rfInstall)
    const on = () => { if (window.__rfInstall) setPrompt(window.__rfInstall) }
    window.addEventListener('rf-installable', on)
    window.addEventListener('beforeinstallprompt', on)
    return () => {
      window.removeEventListener('rf-installable', on)
      window.removeEventListener('beforeinstallprompt', on)
    }
  }, [])

  // Retorna: 'instalado' | 'recusado' | 'ios' | 'indisponivel'
  async function instalar() {
    if (prompt) {
      try {
        prompt.prompt()
        const res = await prompt.userChoice
        setPrompt(null); window.__rfInstall = null
        return res && res.outcome === 'accepted' ? 'instalado' : 'recusado'
      } catch (e) { return 'indisponivel' }
    }
    if (ios) {
      // iPhone: embute o token na URL p/ o atalho capturar a sessão (passwordless).
      try {
        const tok = localStorage.getItem('paciente_token')
        const cpf = localStorage.getItem('paciente_cpf')
        if (tok && cpf) window.history.replaceState({}, '', `/?p=${encodeURIComponent(tok)}&c=${encodeURIComponent(cpf)}`)
      } catch (e) {}
      return 'ios'
    }
    return 'indisponivel'
  }

  return { instalar, ios, standalone }
}
