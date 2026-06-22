import { useState, useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import obaLogo from '../assets/oba-logo.png'
import PlayButton from './PlayButton'

// =============================================================================
// IndicadorPage — 3º perfil do sistema (INDICADOR).
// Qualquer pessoa (enfermeiro, fisio, leigo) indica bariátricos e ganha US$10
// quando o indicado PAGA. Auth própria (CPF + senha) via RPCs SECURITY DEFINER.
// Estrutura COPIADA do AuthPage (paciente): CPF/celular formatados, e-mail com
// validade + confirmação, senha + confirmação, salto automático de foco,
// checkbox de Termos e o PlayButton circular. Visual igual aos outros cards.
// =============================================================================

const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
const labelClass = "block text-sm font-medium text-gray-600 mb-1"
const btnPrimary = "w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60"

function soDigitos(s) { return String(s || '').replace(/\D/g, '') }
function emailValido(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '')) }
function formatarCPF(v) {
  const d = soDigitos(v).slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return d.slice(0,3) + '.' + d.slice(3)
  if (d.length <= 9) return d.slice(0,3) + '.' + d.slice(3,6) + '.' + d.slice(6)
  return d.slice(0,3) + '.' + d.slice(3,6) + '.' + d.slice(6,9) + '-' + d.slice(9)
}
function formatarCelular(v) {
  const d = soDigitos(v).slice(0, 11)
  if (d.length <= 2) return `(${d}`
  if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
}

function TermosIndicadorModal({ onFechar }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onFechar}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <p className="font-bold text-red-700 text-sm">Termos de Indicação — Indicadores</p>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 text-xl font-bold">{"✕"}</button>
        </div>
        <div className="overflow-y-auto p-5 text-xs text-gray-700 leading-relaxed space-y-3">
          <p><strong>1.</strong> Você indica, de forma voluntária e independente, pessoas que fizeram cirurgia bariátrica para o Projeto OBA®. Não há vínculo empregatício.</p>
          <p><strong>2.</strong> Você recebe US$10 (ou equivalente) por cada pessoa indicada que se cadastrar e <strong>pagar</strong> a avaliação, sob a sua indicação vigente no momento do pagamento.</p>
          <p><strong>3.</strong> O crédito é único por paciente. Se a pessoa já fizer parte do projeto (já paga), não gera novo crédito.</p>
          <p><strong>4.</strong> O pagamento é feito pela chave PIX (ou carteira USDC) que você informar, conforme a apuração da plataforma.</p>
          <p><strong>5.</strong> Seus dados são tratados conforme a LGPD e não são vendidos a terceiros.</p>
        </div>
        <div className="p-4 border-t border-gray-100">
          <button onClick={onFechar} className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-2.5 rounded-xl text-sm">Fechar</button>
        </div>
      </div>
    </div>
  )
}

export default function IndicadorPage({ onVoltar }) {
  const [etapa, setEtapa] = useState('login') // login | cadastro | painel
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  // sessão do indicador
  const [codigo, setCodigo] = useState('')
  const [nome, setNome] = useState('')

  // campos
  const [cpf, setCpf] = useState('')
  const [senha, setSenha] = useState('')
  const [senhaConfirm, setSenhaConfirm] = useState('')
  const [fNome, setFNome] = useState('')
  const [celular, setCelular] = useState('')
  const [email, setEmail] = useState('')
  const [emailConfirm, setEmailConfirm] = useState('')
  const [tipo, setTipo] = useState('')
  const [pix, setPix] = useState('')
  const [usarUsdc, setUsarUsdc] = useState(false)
  const [usdc, setUsdc] = useState('')
  const [aceitoTC, setAceitoTC] = useState(false)
  const [showTC, setShowTC] = useState(false)
  const [copiado, setCopiado] = useState(false)

  // painel: pré-cadastro + lista
  const [cpfPac, setCpfPac] = useState('')
  const [preMsg, setPreMsg] = useState('')
  const [preErro, setPreErro] = useState('')
  const [preBusy, setPreBusy] = useState(false)
  const [dados, setDados] = useState(null)

  // refs para salto automático de foco
  const refNome = useRef(null)
  const refSenha = useRef(null)
  const refCheck = useRef(null)

  // derivados (espelham o AuthPage)
  const cpfDigits = soDigitos(cpf)
  const cpfOk = cpfDigits.length === 11
  const emailOk = emailConfirm && email === emailConfirm && emailValido(email)
  const emailErro = emailConfirm && email !== emailConfirm
  const senhaOk = senhaConfirm && senha === senhaConfirm && senha.length >= 6
  const senhaErro = senhaConfirm && senha !== senhaConfirm
  const pagamentoOk = !!pix.trim() || (usarUsdc && !!usdc.trim())
  const cadastroOk = cpfOk && fNome.trim() && emailOk && senhaOk && pagamentoOk && aceitoTC

  // Já logado? (localStorage)
  useEffect(() => {
    try {
      const c = localStorage.getItem('indicador_codigo')
      if (c) { setCodigo(c); setNome(localStorage.getItem('indicador_nome') || ''); setEtapa('painel') }
    } catch (e) {}
  }, [])

  // Saltos automáticos (mesmo padrão do AuthPage): CPF completo → nome; e-mail ok →
  // senha; senha ok → checkbox dos Termos.
  useEffect(() => { if (etapa === 'cadastro' && cpfOk) refNome.current?.focus() }, [cpfOk, etapa])
  useEffect(() => { if (etapa === 'cadastro' && emailOk) refSenha.current?.focus() }, [emailOk, etapa])
  useEffect(() => { if (etapa === 'cadastro' && senhaOk) refCheck.current?.focus() }, [senhaOk, etapa])

  const link = codigo ? `${window.location.origin}/?ref=${codigo}` : ''

  async function carregarPainel(cod) {
    try {
      const { data } = await supabase.rpc('listar_creditos_indicador', { p_codigo: cod || codigo })
      if (data && data.ok) setDados(data)
    } catch (e) {}
  }
  useEffect(() => { if (etapa === 'painel' && codigo) carregarPainel(codigo) }, [etapa, codigo])

  function salvarSessao(data) {
    try {
      localStorage.setItem('indicador_id', data.id || '')
      localStorage.setItem('indicador_codigo', data.codigo || '')
      localStorage.setItem('indicador_nome', data.nome || fNome || '')
    } catch (e) {}
    setCodigo(data.codigo || '')
    setNome(data.nome || fNome || '')
    setEtapa('painel')
  }

  async function handleLogin() {
    setErro('')
    if (!cpfOk) { setErro('CPF inválido.'); return }
    if (senha.length < 6) { setErro('Senha muito curta.'); return }
    setCarregando(true)
    try {
      const { data, error } = await supabase.rpc('login_indicador', { p_cpf: cpf, p_senha: senha })
      if (error) throw error
      if (!data || !data.ok) { setErro(data?.erro || 'Não foi possível entrar.'); return }
      salvarSessao(data)
    } catch (e) {
      setErro('Erro de conexão. Tente de novo.')
    } finally { setCarregando(false) }
  }

  async function handleCadastro() {
    setErro('')
    if (!cpfOk) { setErro('CPF inválido.'); return }
    if (!fNome.trim()) { setErro('Informe seu nome.'); return }
    if (!emailOk) { setErro('Verifique o e-mail (válido e confirmado).'); return }
    if (!senhaOk) { setErro('Verifique a senha (mín. 6 e confirmada).'); return }
    if (!pagamentoOk) { setErro('Informe uma chave PIX (ou carteira USDC) para receber.'); return }
    if (!aceitoTC) { setErro('Você precisa aceitar os Termos de Indicação.'); return }
    setCarregando(true)
    try {
      const { data, error } = await supabase.rpc('register_indicador', {
        p_cpf: cpf, p_senha: senha, p_nome: fNome, p_celular: celular,
        p_email: email, p_pix: pix, p_usdc: usarUsdc ? usdc : null, p_tipo: tipo,
      })
      if (error) throw error
      if (!data || !data.ok) { setErro(data?.erro || 'Não foi possível cadastrar.'); return }
      salvarSessao(data)
    } catch (e) {
      setErro('Erro de conexão. Tente de novo.')
    } finally { setCarregando(false) }
  }

  function sair() {
    try {
      localStorage.removeItem('indicador_id')
      localStorage.removeItem('indicador_codigo')
      localStorage.removeItem('indicador_nome')
    } catch (e) {}
    setCodigo(''); setNome(''); setCpf(''); setSenha(''); setSenhaConfirm(''); setDados(null); setEtapa('login')
  }

  function copiarLink() {
    try { navigator.clipboard.writeText(link); setCopiado(true); setTimeout(() => setCopiado(false), 1800) } catch (e) {}
  }

  async function preCadastrar() {
    setPreMsg(''); setPreErro('')
    if (soDigitos(cpfPac).length !== 11) { setPreErro('CPF inválido (11 dígitos).'); return }
    setPreBusy(true)
    try {
      const { data, error } = await supabase.rpc('precadastrar_indicacao', { p_codigo: codigo, p_cpf: cpfPac })
      if (error) throw error
      if (data?.ja_no_projeto) { setPreErro('ESSE PACIENTE JÁ FAZ PARTE DO PROJETO'); return }
      if (!data?.ok) { setPreErro(data?.erro || 'Não foi possível reservar.'); return }
      setPreMsg('Paciente reservado! Você ganha quando ele pagar.')
      setCpfPac('')
      carregarPainel(codigo)
    } catch (e) { setPreErro('Erro de conexão. Tente de novo.') }
    finally { setPreBusy(false) }
  }

  const VoltarBtn = onVoltar ? (
    <button onClick={onVoltar}
      className="absolute top-4 left-4 text-white px-3 py-1 rounded-lg text-xs font-medium shadow transition-colors"
      style={{ backgroundColor: '#991b1b' }}>
      Voltar
    </button>
  ) : null

  const Cabecalho = (
    <div className="mb-6">
      <div style={{ background: '#B8B7B8', borderRadius: 14, padding: '8px 16px', display: 'flex', justifyContent: 'center' }}>
        <img src={obaLogo} alt="Projeto OBA®" style={{ height: 112, objectFit: 'contain', display: 'block' }} />
      </div>
      <p className="text-gray-500 text-sm text-center" style={{ marginTop: 10 }}>Modo Indicador</p>
    </div>
  )

  // ── PAINEL ──────────────────────────────────────────────────────────────────
  if (etapa === 'painel') {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center p-6 relative">
        {VoltarBtn}
        <div className="w-full max-w-md space-y-4 mt-8">

          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            {Cabecalho}
            <h3 className="text-lg font-bold text-gray-800">Olá{nome ? `, ${nome.split(' ')[0]}` : ''}! 👋</h3>
            <p className="text-sm text-gray-500 mt-1">
              Compartilhe seu <b>link</b> ou mostre o <b>QR-CODE</b> a bariátricos que você conhece.
              Quando a pessoa indicada <b>pagar</b>, você ganha <b>US$10</b>.
            </p>
            <div className="flex justify-center my-4">
              <div className="bg-white p-3 rounded-xl border-2 border-red-700">
                {link ? <QRCodeSVG value={link} size={160} fgColor="#b91c1c" /> : null}
              </div>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-gray-700 break-all">{link}</div>
            <button onClick={copiarLink} className={`${btnPrimary} mt-3`}>
              {copiado ? 'LINK COPIADO ✓' : 'COPIAR LINK'}
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <p className="text-sm font-bold text-gray-700 mb-1">Pré-cadastrar paciente</p>
            <p className="text-xs text-gray-500 mb-3">Conhece um bariátrico? Reserve-o pelo <b>CPF</b>. Você ganha quando ele pagar.</p>
            <div className="flex gap-2">
              <input className={inputClass} inputMode="numeric" value={cpfPac}
                onChange={e => setCpfPac(formatarCPF(e.target.value))} placeholder="CPF do paciente" maxLength={14} />
              <button onClick={preCadastrar} disabled={preBusy}
                className="bg-red-700 hover:bg-red-800 text-white font-bold px-4 rounded-lg text-sm transition-colors disabled:opacity-60 whitespace-nowrap">
                {preBusy ? '…' : 'Reservar'}
              </button>
            </div>
            {preMsg && <p className="text-green-600 text-xs font-semibold mt-2">{preMsg}</p>}
            {preErro && <p className="text-red-600 text-xs font-bold mt-2">{preErro}</p>}
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <p className="text-sm font-bold text-gray-700 mb-3">Seus indicados</p>
            {!dados ? (
              <p className="text-xs text-gray-400">Carregando…</p>
            ) : (
              <>
                <div className="flex gap-3 mb-3">
                  {[
                    { n: (dados.creditos || []).filter(c => c.pago).length, t: 'PAGOS' },
                    { n: (dados.creditos || []).filter(c => !c.pago).length, t: 'A RECEBER' },
                    { n: (dados.precadastros || []).length, t: 'RESERVADOS' },
                  ].map((b, i) => (
                    <div key={i} className="flex-1 bg-red-50 border border-red-100 rounded-lg py-2 text-center">
                      <p className="text-2xl font-extrabold text-red-700">{b.n}</p>
                      <p className="text-[11px] text-gray-500 font-semibold">{b.t}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 text-center">Cada indicado que paga vale US$ {dados.comissao_usd || 10}.</p>
              </>
            )}
          </div>

          <button onClick={sair} className="w-full text-gray-300 text-sm hover:text-white transition-colors">Sair</button>
        </div>
      </div>
    )
  }

  // ── LOGIN ───────────────────────────────────────────────────────────────────
  if (etapa === 'login') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6 relative">
        {VoltarBtn}
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
          {Cabecalho}
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center mb-4">
            <p className="text-red-700 text-sm font-medium">Entrar como indicador</p>
            <p className="text-gray-500 text-xs mt-1">Acesse seu link de indicação e acompanhe seus créditos.</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>CPF</label>
              <input className={inputClass} inputMode="numeric" value={cpf} maxLength={14}
                onChange={e => { setCpf(formatarCPF(e.target.value)); setErro('') }} placeholder="000.000.000-00" autoComplete="off" />
            </div>
            <div>
              <label className={labelClass}>Senha</label>
              <input className={inputClass} type="password" value={senha} onChange={e => setSenha(e.target.value)} autoComplete="current-password" />
            </div>
            {erro && <p className="text-red-500 text-sm">{erro}</p>}
            <button onClick={handleLogin} disabled={carregando} className={btnPrimary}>
              {carregando ? 'Aguarde…' : 'Entrar'}
            </button>
            <button onClick={() => { setErro(''); setEtapa('cadastro') }}
              className="w-full text-gray-400 text-sm hover:text-gray-600 transition-colors">
              Não tenho cadastro — quero indicar
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── CADASTRO (estrutura copiada do AuthPage) ─────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6 relative">
      {VoltarBtn}
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        {Cabecalho}
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center mb-4">
          <p className="text-red-700 text-sm font-medium">Indique bariátricos e ganhe US$10</p>
          <p className="text-gray-500 text-xs mt-1">Cadastre-se para receber US$10 por cada bariátrico indicado que pagar.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className={labelClass}>CPF</label>
            <input className={inputClass} inputMode="numeric" value={cpf} maxLength={14}
              onChange={e => { setCpf(formatarCPF(e.target.value)); setErro('') }} placeholder="000.000.000-00" autoComplete="off" />
          </div>
          <div>
            <label className={labelClass}>Nome completo</label>
            <input ref={refNome} className={inputClass} value={fNome} onChange={e => setFNome(e.target.value.toUpperCase())} style={{ textTransform: 'uppercase' }} autoComplete="off" />
          </div>
          <div>
            <label className={labelClass}>WhatsApp</label>
            <input className={inputClass} inputMode="numeric" value={celular} maxLength={15}
              onChange={e => setCelular(formatarCelular(e.target.value))} placeholder="(00) 00000-0000" autoComplete="off" />
          </div>
          <div>
            <label className={labelClass}>Você é</label>
            <select className={inputClass} value={tipo} onChange={e => setTipo(e.target.value)}>
              <option value="">Selecione…</option>
              <option value="enfermeiro">Enfermeiro(a)</option>
              <option value="fisio">Fisioterapeuta</option>
              <option value="nutri">Nutricionista</option>
              <option value="outro_saude">Outro profissional de saúde</option>
              <option value="leigo">Não sou da saúde</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>E-mail</label>
            <input className={inputClass} type="email" value={email} onChange={e => setEmail(e.target.value.toLowerCase())} autoComplete="off" />
          </div>
          {email && (
            <div>
              <label className={labelClass}>Confirme o e-mail</label>
              <input type="email" value={emailConfirm} onChange={e => setEmailConfirm(e.target.value.toLowerCase())} autoComplete="off"
                className={`${inputClass} ${emailErro ? 'border-red-400' : emailOk ? 'border-green-400' : ''}`} />
              {emailErro && <p className="text-red-500 text-xs mt-1">Os e-mails não coincidem.</p>}
              {emailOk && <p className="text-green-500 text-xs mt-1">{"✓ E-mails conferem."}</p>}
              {emailConfirm && !emailErro && !emailValido(email) && <p className="text-orange-500 text-xs mt-1">E-mail inválido.</p>}
            </div>
          )}

          <div>
            <label className={labelClass}>Senha</label>
            <input ref={refSenha} className={inputClass} type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" autoComplete="new-password" />
          </div>
          {senha && (
            <div>
              <label className={labelClass}>Confirme a senha</label>
              <input type="password" value={senhaConfirm} onChange={e => setSenhaConfirm(e.target.value)} autoComplete="new-password"
                className={`${inputClass} ${senhaErro ? 'border-red-400' : senhaOk ? 'border-green-400' : ''}`} />
              {senhaErro && <p className="text-red-500 text-xs mt-1">As senhas não coincidem.</p>}
              {senhaOk && <p className="text-green-500 text-xs mt-1">{"✓ Senhas conferem."}</p>}
            </div>
          )}

          <div>
            <label className={labelClass}>Chave PIX (para receber)</label>
            <input className={inputClass} value={pix} onChange={e => setPix(e.target.value)} placeholder="CPF, e-mail, telefone ou aleatória" autoComplete="off" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={usarUsdc} onChange={e => setUsarUsdc(e.target.checked)} className="w-4 h-4" />
            Quero receber em USDC (dólar digital)
          </label>
          {usarUsdc && (
            <div>
              <label className={labelClass}>Carteira USDC</label>
              <input className={inputClass} value={usdc} onChange={e => setUsdc(e.target.value)} placeholder="Endereço da wallet" autoComplete="off" />
            </div>
          )}

          {showTC && <TermosIndicadorModal onFechar={() => setShowTC(false)} />}
          <label className="flex items-start gap-2 cursor-pointer">
            <input ref={refCheck} type="checkbox" checked={aceitoTC} onChange={e => setAceitoTC(e.target.checked)} className="mt-0.5 w-4 h-4 cursor-pointer flex-shrink-0" />
            <span className="text-xs text-gray-600">Li e aceito os{' '}
              <button type="button" onClick={() => setShowTC(true)} className="text-red-700 font-semibold hover:underline">Termos de Indicação</button>
            </span>
          </label>

          {erro && <p className="text-red-500 text-sm">{erro}</p>}

          <div className="flex justify-end pt-1">
            <PlayButton
              onClick={handleCadastro}
              loading={carregando}
              disabled={!cadastroOk}
              label="CADASTRAR"
              ariaLabel="Cadastrar"
              playColor="#b91c1c"
              labelColor="#b91c1c"
              ringColor="rgba(185,28,28,0.55)"
            />
          </div>

          <button onClick={() => { setErro(''); setEtapa('login') }}
            className="w-full text-gray-400 text-sm hover:text-gray-600 transition-colors">
            Já tenho cadastro — entrar
          </button>
        </div>
      </div>
    </div>
  )
}
