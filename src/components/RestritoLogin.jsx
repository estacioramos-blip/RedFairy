import { useState } from 'react'
import { supabase } from '../lib/supabase'
import obaLogo from '../assets/oba-logo.png'

/**
 * RestritoLogin — porta única do "Acesso Restrito" (chapéu do rodapé do bariatrico.net).
 * NÃO revela que existe um "tesoureiro" (o Estácio achava mercantilista). Mostra só um
 * campo de senha: se for a senha do CAIXA (validada no servidor por caixa_login), entra
 * direto no caixa. O administrador tem uma entrada discreta separada (CRM/UF, como hoje).
 */
const DARK = '#14100E'

export default function RestritoLogin({ onCaixa, onAdmin, onVoltar }) {
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [busy, setBusy] = useState(false)

  async function entrar() {
    if (!senha || busy) return
    setBusy(true); setErro('')
    try {
      // Senha do CAIXA (tesoureiro) — validada no servidor. Se casar, entra direto.
      const { data } = await supabase.rpc('caixa_login', { p_senha: senha })
      if (data && data.ok && data.token) {
        try { localStorage.setItem('caixa_token', data.token) } catch (e) {}
        setBusy(false); onCaixa(); return
      }
      setErro('Senha incorreta.')
    } catch (e) { setErro('Erro de conexão. Tente de novo.') }
    setBusy(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: DARK }}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center space-y-4">
        <img src={obaLogo} alt="OBA" style={{ width: 56, height: 56, objectFit: 'contain', margin: '0 auto' }} />
        <div>
          <h1 className="text-xl font-extrabold" style={{ color: DARK }}>{"Acesso Restrito"}</h1>
          <p className="text-xs text-gray-500 mt-1">{"Informe a sua senha."}</p>
        </div>
        <input type="password" value={senha} onChange={e => { setSenha(e.target.value); setErro('') }}
          onKeyDown={e => { if (e.key === 'Enter') entrar() }}
          placeholder="Senha" autoFocus
          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-center" />
        {erro && <p className="text-xs font-bold text-red-600">{erro}</p>}
        <button onClick={entrar} disabled={busy || !senha}
          className="w-full font-bold py-2.5 rounded-xl text-sm disabled:opacity-50" style={{ background: '#E3AE37', color: DARK }}>
          {busy ? 'Entrando...' : 'Entrar'}
        </button>
        <div className="pt-2 border-t border-gray-100">
          <button onClick={onAdmin} className="text-xs text-gray-400 hover:text-gray-600 font-medium">{"Sou administrador (CRM/UF)"}</button>
        </div>
        {onVoltar && (
          <button onClick={onVoltar} className="block w-full text-[11px] text-gray-300 hover:text-gray-500">{"voltar"}</button>
        )}
      </div>
    </div>
  )
}
