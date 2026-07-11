import { useState } from 'react'
import { supabase } from '../lib/supabase'
import obaLogo from '../assets/oba-logo.png'

/**
 * RestritoLogin — porta única do "Acesso Restrito" (chapéu do rodapé do bariatrico.net).
 * UM campo de senha, subtexto ACESSO RESTRITO. A senha decide o destino, sem revelar que
 * existe um "tesoureiro" (o Estácio achava mercantilista):
 *   - senha do CAIXA  (caixa_login)          → entra no caixa
 *   - senha do ADMIN  (restrito_admin_login)  → entra no painel admin
 * Ambas validadas NO SERVIDOR (senha nunca fica no cliente). Senha errada = genérico.
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
      // 1) Senha do CAIXA (tesoureiro)?
      const { data: c } = await supabase.rpc('caixa_login', { p_senha: senha })
      if (c && c.ok && c.token) {
        try { localStorage.setItem('caixa_token', c.token) } catch (e) {}
        setBusy(false); onCaixa(); return
      }
      // 2) Senha do ADMIN? (mesma sessão que o login_medico gera)
      const { data: a } = await supabase.rpc('restrito_admin_login', { p_senha: senha })
      if (a && a.ok && a.is_admin && a.token) {
        try {
          localStorage.setItem('medico_crm', a.crm || '')
          localStorage.setItem('medico_nome', a.nome || '')
          localStorage.setItem('medico_login_at', Date.now().toString())
          localStorage.setItem('medico_is_admin', '1')
          localStorage.setItem('medico_token', a.token)
        } catch (e) {}
        setBusy(false); onAdmin(); return
      }
      setErro('Senha incorreta.')
    } catch (e) { setErro('Erro de conexão. Tente de novo.') }
    setBusy(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: DARK }}>
      <div className="w-full max-w-xs text-center space-y-4">
        <img src={obaLogo} alt="" style={{ width: 48, height: 48, objectFit: 'contain', margin: '0 auto', opacity: 0.9 }} />
        <input type="password" value={senha} onChange={e => { setSenha(e.target.value); setErro('') }}
          onKeyDown={e => { if (e.key === 'Enter') entrar() }}
          placeholder="Senha" autoFocus
          className="w-full rounded-xl px-3 py-3 text-sm text-center bg-white border border-gray-300 focus:outline-none" />
        <p style={{ color: '#E3AE37', fontSize: '11px', letterSpacing: '2.5px', fontWeight: 700, margin: 0 }}>{"ACESSO RESTRITO"}</p>
        {erro && <p className="text-xs font-bold" style={{ color: '#f87171' }}>{erro}</p>}
        <button onClick={entrar} disabled={busy || !senha}
          className="w-full font-bold py-2.5 rounded-xl text-sm disabled:opacity-50" style={{ background: '#E3AE37', color: DARK }}>
          {busy ? 'Entrando...' : 'Entrar'}
        </button>
        {onVoltar && (
          <button onClick={onVoltar} className="block w-full text-[11px]" style={{ color: '#5a5048' }}>{"voltar"}</button>
        )}
      </div>
    </div>
  )
}
