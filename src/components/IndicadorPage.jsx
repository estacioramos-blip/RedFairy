import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import obaLogo from '../assets/oba-logo.png'
import PlayButton from './PlayButton'

// =============================================================================
// IndicadorPage — 3º perfil (INDICADOR). Entrada igual à do paciente bariátrico:
// CPF → senha, com botões dourados piscantes. lookup_indicador decide login
// (CPF já existe) x cadastro (não existe) — sem formulário extra. Painel mostra
// link/QR, pré-cadastro por CPF e contadores de créditos.
// =============================================================================

const inputClass = "w-full border-2 rounded-lg px-3 py-2.5 text-sm text-center font-bold outline-none"
const inpStyle = { borderColor: '#facc15', background: '#fefce8', color: '#1e3a8a' }
const PLAY = { playColor: '#E3AE37', labelColor: '#000000', ringColor: 'rgba(227,174,55,0.65)' }

function soDigitos(s) { return String(s || '').replace(/\D/g, '') }
function formatarCPF(v) {
  const d = soDigitos(v).slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return d.slice(0,3) + '.' + d.slice(3)
  if (d.length <= 9) return d.slice(0,3) + '.' + d.slice(3,6) + '.' + d.slice(6)
  return d.slice(0,3) + '.' + d.slice(3,6) + '.' + d.slice(6,9) + '-' + d.slice(9)
}

export default function IndicadorPage({ onVoltar }) {
  const [etapa, setEtapa] = useState('cpf')   // cpf | senha | painel
  const [cpf, setCpf] = useState('')
  const [senha, setSenha] = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [modo, setModo] = useState(null)       // login | cadastro
  const [busy, setBusy] = useState(false)
  const [erro, setErro] = useState('')

  // sessão
  const [codigo, setCodigo] = useState('')
  const [nome, setNome] = useState('')

  // painel
  const [cpfPac, setCpfPac] = useState('')
  const [preMsg, setPreMsg] = useState('')
  const [preErro, setPreErro] = useState('')
  const [preBusy, setPreBusy] = useState(false)
  const [dados, setDados] = useState(null)
  const [copiado, setCopiado] = useState(false)
  // sessão + PIX
  const [token, setToken] = useState('')
  const [pixVal, setPixVal] = useState('')
  const [pixMsg, setPixMsg] = useState('')
  const [pixBusy, setPixBusy] = useState(false)
  const [pixTipo, setPixTipo] = useState('')        // cpf | celular | outra | ''
  const [contatoCpf, setContatoCpf] = useState('')
  const [contatoCel, setContatoCel] = useState('')

  const cpfDigits = soDigitos(cpf)
  const cpfOk = cpfDigits.length === 11
  const senhaOk = senha.length >= 6

  useEffect(() => {
    // (logout efemero) NAO restaura a sessao do indicador no refresh: limpa qualquer
    // residuo e comeca no CPF. Assim o indicador desloga ao Voltar/fechar e tambem no
    // Ctrl-Shift-R (antes a sessao ficava grudada no localStorage e nunca deslogava).
    try {
      ['indicador_id','indicador_codigo','indicador_nome','indicador_token','indicador_pix']
        .forEach(k => localStorage.removeItem(k))
    } catch (e) {}
  }, [])

  const link = codigo ? `${window.location.origin}/?ref=${codigo}` : ''

  async function carregarPainel(cod) {
    try {
      const { data } = await supabase.rpc('listar_creditos_indicador', { p_codigo: cod || codigo })
      if (data && data.ok) setDados(data)
    } catch (e) {}
  }
  async function carregarContato() {
    try {
      const t = token || localStorage.getItem('indicador_token') || ''
      const { data } = await supabase.rpc('contato_indicador', { p_codigo: codigo, p_token: t })
      if (data && data.ok) { setContatoCpf(data.cpf || ''); setContatoCel(data.celular || '') }
    } catch (e) {}
  }
  useEffect(() => { if (etapa === 'painel' && codigo) { carregarPainel(codigo); carregarContato() } }, [etapa, codigo])

  function salvarSessao(data) {
    try {
      localStorage.setItem('indicador_id', data.id || '')
      localStorage.setItem('indicador_codigo', data.codigo || '')
      localStorage.setItem('indicador_nome', data.nome || '')
      localStorage.setItem('indicador_token', data.token || '')
      localStorage.setItem('indicador_pix', data.pix || '')
    } catch (e) {}
    setCodigo(data.codigo || ''); setNome(data.nome || ''); setToken(data.token || '')
    setPixVal(data.pix || ''); setEtapa('painel')
  }

  async function salvarPix() {
    setPixMsg(''); setPixBusy(true)
    try {
      const { data, error } = await supabase.rpc('salvar_pix_indicador', { p_codigo: codigo, p_token: token, p_pix: pixVal })
      if (error) throw error
      if (!data?.ok) { setPixMsg(data?.erro || 'Não foi possível salvar.'); return }
      try { localStorage.setItem('indicador_pix', pixVal || '') } catch (e) {}
      setPixMsg('Chave PIX salva! ✓')
    } catch (e) { setPixMsg('Erro de conexão. Tente de novo.') }
    finally { setPixBusy(false) }
  }

  async function avancarCpf() {
    if (!cpfOk || busy) return
    setErro(''); setBusy(true)
    let existe = false
    try {
      const { data } = await supabase.rpc('lookup_indicador', { p_cpf: cpfDigits })
      existe = !!(data && data.existe)
    } catch (e) {}
    setBusy(false)
    setModo(existe ? 'login' : 'cadastro')
    setSenha('')
    setEtapa('senha')
  }

  async function concluir() {
    if (!cpfOk || !senhaOk || busy) return
    setBusy(true); setErro('')
    try {
      const rpc = modo === 'login' ? 'login_indicador' : 'register_indicador'
      const { data, error } = await supabase.rpc(rpc, { p_cpf: cpfDigits, p_senha: senha })
      if (error) { setErro('ERRO DE CONEXÃO. TENTE NOVAMENTE.'); return }
      if (!data || !data.ok) { setErro((data?.erro || 'FALHA NO ACESSO').toString().toUpperCase()); return }
      salvarSessao(data)
    } catch (e) { setErro('ERRO DE CONEXÃO. TENTE NOVAMENTE.') }
    finally { setBusy(false) }
  }

  function sair() {
    try {
      localStorage.removeItem('indicador_id'); localStorage.removeItem('indicador_codigo'); localStorage.removeItem('indicador_nome')
      localStorage.removeItem('indicador_token'); localStorage.removeItem('indicador_pix')
    } catch (e) {}
    setCodigo(''); setNome(''); setCpf(''); setSenha(''); setModo(null); setDados(null)
    setToken(''); setPixVal(''); setPixMsg(''); setEtapa('cpf')
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
      setCpfPac(''); carregarPainel(codigo)
    } catch (e) { setPreErro('Erro de conexão. Tente de novo.') }
    finally { setPreBusy(false) }
  }

  const VoltarBtn = onVoltar ? (
    <button onClick={() => { sair(); onVoltar(); }}
      className="absolute top-4 left-4 px-3 py-1 rounded-lg text-xs font-bold shadow transition-colors"
      style={{ backgroundColor: '#E3AE37', color: '#14100E' }}>
      Voltar
    </button>
  ) : null

  const Cabecalho = (
    <div className="mb-5 text-center">
      <img src={obaLogo} alt="Projeto OBA®" style={{ height: 160, objectFit: 'contain', display: 'block', margin: '0 auto' }} />
      <p className="text-gray-500 text-sm" style={{ marginTop: 4 }}>Modo Indicador</p>
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
            <p className="text-sm text-gray-600 mt-2 leading-relaxed text-left">
              Aqui você cadastra a sua <b>chave PIX</b> e acompanha os seus <b>INDICADOS</b>: os{' '}
              <b>CADASTRADOS</b> (crédito gerado) e os <b>RESERVADOS</b> (crédito após o cadastro).
              Você acompanha também os <b>CRÉDITOS RECEBIDOS</b> e os <b>PENDENTES</b>.
            </p>
            <p className="text-sm text-gray-600 mt-2 leading-relaxed text-left">
              Mostre o <b>QR-CODE</b> abaixo para um bariátrico fotografar e entrar no projeto sob a sua
              indicação, ou <b>copie o LINK</b> e envie pelo WhatsApp/Telegram. Cada indicado que <b>pagar</b>{' '}
              gera <b>US$10</b> para você.
            </p>
            <div className="flex justify-center my-4">
              <div className="bg-white p-3 rounded-xl border-2 border-red-700">
                {link ? <QRCodeSVG value={link} size={160} fgColor="#b91c1c" /> : null}
              </div>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-gray-700 break-all">{link}</div>
            <button onClick={copiarLink} className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors mt-3">
              {copiado ? 'LINK COPIADO ✓' : 'COPIAR LINK'}
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <p className="text-sm font-bold text-gray-700 mb-1">Pré-cadastrar paciente</p>
            <p className="text-xs text-gray-500 mb-3">Conhece um bariátrico? Reserve-o pelo <b>CPF</b>. Você ganha quando ele pagar.</p>
            <div className="flex gap-2">
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" inputMode="numeric" value={cpfPac}
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
            <p className="text-sm font-bold text-gray-700 mb-1">Sua chave PIX (para receber)</p>
            <p className="text-xs text-gray-500 mb-3">É por aqui que você recebe os US$10 de cada indicado que paga.</p>
            <div className="space-y-1.5 mb-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input type="checkbox" checked={pixTipo === 'cpf'} style={{ accentColor: '#b91c1c' }}
                  onChange={() => { if (pixTipo === 'cpf') { setPixTipo(''); setPixVal('') } else { setPixTipo('cpf'); setPixVal(contatoCpf || '') } setPixMsg('') }} />
                <span className="text-gray-700 font-medium tracking-wide">MEU CPF É O MEU PIX</span>
              </label>
              {contatoCel && (
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input type="checkbox" checked={pixTipo === 'celular'} style={{ accentColor: '#b91c1c' }}
                    onChange={() => { if (pixTipo === 'celular') { setPixTipo(''); setPixVal('') } else { setPixTipo('celular'); setPixVal(contatoCel) } setPixMsg('') }} />
                  <span className="text-gray-700 font-medium tracking-wide">MEU CELULAR É O MEU PIX</span>
                </label>
              )}
            </div>
            <div className="flex gap-2">
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={pixVal}
                onChange={e => { setPixVal(e.target.value); setPixTipo('outra'); setPixMsg('') }} placeholder="CPF, telefone ou chave aleatória" />
              <button onClick={salvarPix} disabled={pixBusy}
                className="bg-red-700 hover:bg-red-800 text-white font-bold px-4 rounded-lg text-sm transition-colors disabled:opacity-60 whitespace-nowrap">
                {pixBusy ? '…' : 'Salvar'}
              </button>
            </div>
            {pixMsg && <p className={`text-xs font-semibold mt-2 ${pixMsg.includes('✓') ? 'text-green-600' : 'text-red-600'}`}>{pixMsg}</p>}
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <p className="text-sm font-bold text-gray-700 mb-3">Seus indicados</p>
            {!dados ? (
              <p className="text-xs text-gray-400">Carregando…</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2.5 mb-3">
                  {[
                    { n: (dados.creditos || []).length, t: 'CADASTRADOS', sub: 'crédito gerado' },
                    { n: (dados.precadastros || []).length, t: 'RESERVADOS', sub: 'crédito após cadastro' },
                    { n: (dados.creditos || []).filter(c => c.pago).length, t: 'CRÉD. RECEBIDOS', sub: '' },
                    { n: (dados.creditos || []).filter(c => !c.pago).length, t: 'CRÉD. PENDENTES', sub: '' },
                  ].map((b, i) => (
                    <div key={i} className="bg-red-50 border border-red-100 rounded-lg py-2 px-2 text-center">
                      <p className="text-2xl font-extrabold text-red-700">{b.n}</p>
                      <p className="text-[10px] text-gray-500 font-semibold leading-tight">{b.t}</p>
                      {b.sub && <p className="text-[9px] text-gray-400 leading-tight mt-0.5">{b.sub}</p>}
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

  // ── ENTRADA (CPF → SENHA), igual ao paciente ─────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6 relative">
      {VoltarBtn}
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        {Cabecalho}

        {etapa === 'cpf' && (
          <>
            <p className="text-center text-xs font-bold text-gray-500 tracking-widest mb-2">DIGITE O SEU CPF</p>
            <input autoFocus className={inputClass} style={inpStyle} inputMode="numeric" maxLength={14}
              value={cpf} onChange={e => { setCpf(formatarCPF(e.target.value)); setErro('') }}
              onKeyDown={e => { if (e.key === 'Enter' && cpfOk) avancarCpf() }}
              placeholder="000.000.000-00" />
            <p className="text-center text-[11px] font-bold text-gray-400 tracking-widest mt-2">LOGIN DO INDICADOR</p>
            {erro && <p className="text-center text-red-600 text-xs font-bold mt-2">{erro}</p>}
            {cpfOk && (
              <div className="flex justify-end mt-3">
                <PlayButton onClick={avancarCpf} loading={busy} ariaLabel="Continuar" {...PLAY} />
              </div>
            )}
          </>
        )}

        {etapa === 'senha' && (
          <>
            <p className="text-center text-xs font-bold text-gray-500 tracking-widest mb-2">
              {modo === 'cadastro' ? 'CRIE AGORA A SUA SENHA' : 'DIGITE A SUA SENHA'}
            </p>
            <div className="relative">
              <input autoFocus type={showSenha ? 'text' : 'password'} className={inputClass} style={inpStyle}
                value={senha} onChange={e => { setSenha(e.target.value); setErro('') }}
                onKeyDown={e => { if (e.key === 'Enter' && senhaOk) concluir() }}
                placeholder="MÍNIMO SEIS CARACTERES" />
              <button type="button" onClick={() => setShowSenha(s => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 p-1" aria-label="Mostrar/ocultar senha">
                {showSenha ? '🙈' : '👁'}
              </button>
            </div>
            <p className="text-center text-[11px] font-bold text-gray-400 tracking-widest mt-2">LOGIN DO INDICADOR</p>
            {erro && <p className="text-center text-red-600 text-xs font-bold mt-2">{erro}</p>}
            <div className="flex justify-between items-end mt-3">
              <button onClick={() => { setEtapa('cpf'); setErro('') }} className="text-gray-400 text-xs hover:text-gray-600">{"← Voltar"}</button>
              {senhaOk && (
                <PlayButton onClick={concluir} loading={busy} ariaLabel="Entrar" {...PLAY} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
