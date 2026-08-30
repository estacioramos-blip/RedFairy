import { useState, useEffect } from 'react'
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
  const [recuperando, setRecuperando] = useState(false)

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

  if (recuperando) return <RecuperarAdmin onSair={() => { setRecuperando(false); setErro('') }} />

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
        {/* Discreto de propósito, como o resto desta porta: quem não precisa nem repara. */}
        <button onClick={() => setRecuperando(true)} className="block w-full text-[11px]" style={{ color: '#5a5048' }}>
          {"esqueci a senha"}
        </button>
        {onVoltar && (
          <button onClick={onVoltar} className="block w-full text-[11px]" style={{ color: '#5a5048' }}>{"voltar"}</button>
        )}
      </div>
    </div>
  )
}

/**
 * RecuperarAdmin — recuperação da senha do ADMIN por código no Telegram da ADM.
 * Recupera a porta de cima; com o admin de volta, ele redefine a senha do Caixa
 * pelo painel (Configurações). Por isso uma entrada só resolve as duas senhas.
 *
 * O servidor responde SEMPRE igual ao pedido de código — não dá para descobrir
 * daqui se existe admin ou se o pedido pegou. O texto da tela reflete isso.
 */
function RecuperarAdmin({ onSair }) {
  const [etapa, setEtapa] = useState('pedir')   // pedir → codigo → pronto
  const [codigo, setCodigo] = useState('')
  const [nova, setNova] = useState('')
  const [confirma, setConfirma] = useState('')
  const [erro, setErro] = useState('')
  const [busy, setBusy] = useState(false)
  const [espera, setEspera] = useState(0)   // segundos até poder pedir outro código

  // O servidor engole pedidos repetidos em menos de 2 min (freio anti-abuso) e
  // responde igual de qualquer jeito — de propósito, para não contar nada a quem
  // não devia. Quem clicou, porém, merece saber: a contagem aqui é do lado de cá,
  // sem perguntar nada ao servidor.
  useEffect(() => {
    if (espera <= 0) return
    const t = setTimeout(() => setEspera(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [espera])

  async function pedirCodigo() {
    if (busy || espera > 0) return
    setBusy(true); setErro('')
    try {
      // A RESPOSTA da função é genérica de propósito (não revela se existe admin),
      // mas a FALHA da chamada não é segredo nenhum: sem checar `error`, uma queda
      // de rede mandaria a tela adiante e você esperaria um código que ninguém enviou.
      const { error } = await supabase.rpc('admin_recuperar_iniciar')
      if (error) throw new Error('conexao')
      setEspera(120)
      setEtapa('codigo')
    } catch (e) { setErro("Erro de conexão. Tente de novo.") }
    setBusy(false)
  }

  async function concluir() {
    if (busy) return
    if (codigo.length < 8) { setErro("O código tem 8 caracteres."); return }
    if (nova.length < 8) { setErro("A senha nova precisa de pelo menos 8 caracteres."); return }
    if (nova !== confirma) { setErro("As duas senhas não são iguais."); return }
    setBusy(true); setErro('')
    try {
      const { data, error } = await supabase.rpc('admin_recuperar_concluir', { p_codigo: codigo.trim(), p_nova: nova })
      if (error) throw new Error('conexao')
      if (data && data.ok) { setCodigo(''); setNova(''); setConfirma(''); setEtapa('pronto') }
      else setErro((data && data.erro) || "Não foi possível concluir.")
    } catch (e) { setErro("Erro de conexão. Tente de novo.") }
    setBusy(false)
  }

  const inputCls = "w-full rounded-xl px-3 py-3 text-sm text-center bg-white border border-gray-300 focus:outline-none"
  const btnCls = "w-full font-bold py-2.5 rounded-xl text-sm disabled:opacity-50"

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: DARK }}>
      <div className="w-full max-w-xs text-center space-y-4">
        <img src={obaLogo} alt="" style={{ width: 48, height: 48, objectFit: 'contain', margin: '0 auto', opacity: 0.9 }} />
        <p style={{ color: '#E3AE37', fontSize: '11px', letterSpacing: '2.5px', fontWeight: 700, margin: 0 }}>
          {"RECUPERAR ACESSO"}
        </p>

        {etapa === 'pedir' && (
          <>
            <p className="text-xs" style={{ color: '#8a7f74', lineHeight: 1.6 }}>
              {"Um código de 8 caracteres será enviado para o Telegram da administração. Ele vale por 10 minutos."}
            </p>
            <button onClick={pedirCodigo} disabled={busy} className={btnCls} style={{ background: '#E3AE37', color: DARK }}>
              {busy ? 'Enviando...' : 'Enviar código'}
            </button>
          </>
        )}

        {etapa === 'codigo' && (
          <>
            <p className="text-xs" style={{ color: '#8a7f74', lineHeight: 1.6 }}>
              {"Se houver acesso configurado, o código chegou no Telegram. Digite-o abaixo com a senha nova."}
            </p>
            {/* O código tem letras e números (32^8 combinações — ver o cabeçalho da
                migration). Guardamos limpo e exibimos ABCD-EFGH, igual ao Telegram;
                o hífen é só enfeite, o servidor ignora pontuação e caixa. */}
            <input type="text" autoComplete="one-time-code" maxLength={9} spellCheck={false}
              value={codigo.length > 4 ? codigo.slice(0, 4) + '-' + codigo.slice(4) : codigo}
              onChange={e => {
                setCodigo(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 8))
                setErro('')
              }}
              onKeyDown={e => { if (e.key === 'Enter') concluir() }}
              placeholder={"Código de 8 caracteres"} autoFocus
              className={inputCls} style={{ letterSpacing: '0.25em' }} />
            <input type="password" value={nova} autoComplete="new-password"
              onChange={e => { setNova(e.target.value); setErro('') }}
              onKeyDown={e => { if (e.key === 'Enter') concluir() }}
              placeholder="Nova senha do admin" className={inputCls} />
            <input type="password" value={confirma} autoComplete="new-password"
              onChange={e => { setConfirma(e.target.value); setErro('') }}
              onKeyDown={e => { if (e.key === 'Enter') concluir() }}
              placeholder="Repita a nova senha" className={inputCls} />
            <button onClick={concluir} disabled={busy || !codigo || !nova || !confirma}
              className={btnCls} style={{ background: '#E3AE37', color: DARK }}>
              {busy ? 'Trocando...' : 'Trocar senha'}
            </button>
            <button onClick={pedirCodigo} disabled={busy || espera > 0}
              className="block w-full text-[11px]" style={{ color: '#5a5048' }}>
              {espera > 0
                ? `aguarde ${Math.floor(espera / 60)}:${String(espera % 60).padStart(2, '0')} para pedir outro código`
                : "reenviar código"}
            </button>
          </>
        )}

        {etapa === 'pronto' && (
          <>
            <p className="text-xs" style={{ color: '#9fd39f', lineHeight: 1.6 }}>
              {"Senha trocada. Entre com ela agora — as sessões antigas foram encerradas. Se você não reconhecer esta troca, peça a recuperação de novo e retome a senha."}
            </p>
            <button onClick={onSair} className={btnCls} style={{ background: '#E3AE37', color: DARK }}>
              {"Voltar ao acesso"}
            </button>
          </>
        )}

        {erro && <p className="text-xs font-bold" style={{ color: '#f87171' }}>{erro}</p>}

        {etapa !== 'pronto' && (
          <button onClick={onSair} className="block w-full text-[11px]" style={{ color: '#5a5048' }}>{"voltar"}</button>
        )}
      </div>
    </div>
  )
}
