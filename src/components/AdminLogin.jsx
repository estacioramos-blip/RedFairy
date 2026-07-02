import { useState } from 'react'
import { supabase } from '../lib/supabase'
import obaLogo from '../assets/oba-logo.png'

/**
 * AdminLogin — card de acesso ao painel ADMIN (CRM/UF + senha).
 * Substitui o antigo beco "Acesso restrito": quem chega ao modo admin sem sessão
 * de administrador loga AQUI (reusa o RPC login_medico; só entra se is_admin).
 * Porta de entrada: ícone discreto (sem letra) no rodapé do hero da LandingPage.
 */
export default function AdminLogin({ onOk, onVoltar }) {
  const [crm, setCrm] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [busy, setBusy] = useState(false)

  async function entrar() {
    const crmLimpo = crm.trim().toUpperCase()
    if (!/^\d+\s*\/\s*[A-Z]{2}$/.test(crmLimpo)) { setErro('Informe o CRM no formato 6302/BA.'); return }
    if (!senha) { setErro('Informe a senha.'); return }
    setBusy(true); setErro('')
    try {
      const { data: resp, error } = await supabase.rpc('login_medico', { p_crm: crmLimpo.replace(/\s/g, ''), p_senha: senha })
      if (error) { setErro('Erro de conexão. Tente de novo.'); setBusy(false); return }
      if (!resp || !resp.ok) { setErro(resp?.erro === 'Senha incorreta' ? 'Senha incorreta.' : (resp?.erro || 'Falha no login.')); setBusy(false); return }
      if (!resp.is_admin) {
        // Conta válida mas NÃO-admin: não grava sessão por esta porta (é porta de admin).
        setErro('Esta conta não é de administrador.')
        setBusy(false); return
      }
      try {
        localStorage.setItem('medico_crm', resp.crm || crmLimpo.replace(/\s/g, ''))
        localStorage.setItem('medico_nome', resp.nome || '')
        localStorage.setItem('medico_login_at', Date.now().toString())
        localStorage.setItem('medico_is_admin', '1')
        if (resp.token) localStorage.setItem('medico_token', resp.token)
      } catch (e) {}
      onOk && onOk()
    } catch (e) { setErro('Erro de conexão. Tente de novo.') }
    setBusy(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-6">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center space-y-4">
        <img src={obaLogo} alt="" style={{ width: 56, height: 56, objectFit: 'contain', margin: '0 auto' }} />
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">{"Painel ADMIN"}</h1>
          <p className="text-xs text-gray-500 mt-1">{"Acesso exclusivo do administrador"}</p>
        </div>
        <input value={crm} onChange={e => { setCrm(e.target.value); setErro('') }}
          placeholder="CRM (ex.: 6302/BA)" autoFocus autoCapitalize="characters"
          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-center" />
        <input type="password" value={senha} onChange={e => { setSenha(e.target.value); setErro('') }}
          onKeyDown={e => { if (e.key === 'Enter') entrar() }}
          placeholder="Senha"
          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-center" />
        {erro && <p className="text-xs font-bold text-red-600">{erro}</p>}
        <button onClick={entrar} disabled={busy || !crm || !senha}
          className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50">
          {busy ? '...' : 'ENTRAR'}
        </button>
        <button onClick={onVoltar} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium py-2 rounded-xl text-xs">
          {"← Voltar"}
        </button>
      </div>
    </div>
  )
}
