import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import obaLogo from '../assets/oba-logo.png'
import obaFairyIcon from '../assets/oba-fairy-icon.png'
import PlayButton from './PlayButton'
import PacienteIndicaModal from './PacienteIndicaModal'
import { useInstalarFada } from '../lib/useInstalarFada'

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
// Valida o CPF pelo dígito verificador (não só o tamanho) — detecta CPF inválido cedo.
function validarCPF(cpf) {
  const c = soDigitos(cpf)
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false
  let s = 0
  for (let i = 0; i < 9; i++) s += parseInt(c[i], 10) * (10 - i)
  let d1 = 11 - (s % 11); if (d1 >= 10) d1 = 0
  if (d1 !== parseInt(c[9], 10)) return false
  s = 0
  for (let i = 0; i < 10; i++) s += parseInt(c[i], 10) * (11 - i)
  let d2 = 11 - (s % 11); if (d2 >= 10) d2 = 0
  return d2 === parseInt(c[10], 10)
}
function formatarCPF(v) {
  const d = soDigitos(v).slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return d.slice(0,3) + '.' + d.slice(3)
  if (d.length <= 9) return d.slice(0,3) + '.' + d.slice(3,6) + '.' + d.slice(6)
  return d.slice(0,3) + '.' + d.slice(3,6) + '.' + d.slice(6,9) + '-' + d.slice(9)
}

export default function IndicadorPage({ onVoltar }) {
  // 'restaurando' = sessão salva sendo validada (ícone PWA reabrindo já logado)
  const [etapa, setEtapa] = useState(() => {
    try { return (localStorage.getItem('indicador_token') || localStorage.getItem('indicador_cpf')) ? 'restaurando' : 'cpf' } catch (e) { return 'cpf' }
  })   // restaurando | cpf | senha | painel
  const [cpf, setCpf] = useState('')
  const [senha, setSenha] = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [modo, setModo] = useState(null)       // login | cadastro
  const [busy, setBusy] = useState(false)
  const [erro, setErro] = useState('')

  // sessão
  const [codigo, setCodigo] = useState('')
  const [nome, setNome] = useState('')

  // (instalar icone) checkbox que instala o icone do Projeto + copia o link.
  const [iconeMarcado, setIconeMarcado] = useState(false)
  const [linkCopiado, setLinkCopiado] = useState(false)
  const [iosInstr, setIosInstr] = useState(false)
  const [instFalhou, setInstFalhou] = useState(false)
  const [mostrarQR, setMostrarQR] = useState(false)
  const [indView, setIndView] = useState('gate')   // 'gate' | 'indicar' | 'creditos' (sem ENTRAR)
  const { instalar } = useInstalarFada()

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
  const [contatoEmail, setContatoEmail] = useState('')

  const cpfDigits = soDigitos(cpf)
  const cpfOk = cpfDigits.length === 11 && validarCPF(cpfDigits)   // só avança com CPF válido
  const cpfInvalido = cpfDigits.length === 11 && !validarCPF(cpfDigits)
  const senhaOk = senha.length >= 6

  useEffect(() => {
    // Restaura a sessão salva — o ícone PWA (start_url ?modo=indicador) deve abrir
    // já logado. Token ainda válido → painel direto; token vencido mas CPF lembrado
    // → só a senha (CPF já carregado). Deslogar de verdade é pelo X/Voltar (sair()).
    let vivo = true
    ;(async () => {
      let cpfSalvo = '', cod = '', tok = ''
      try {
        cpfSalvo = localStorage.getItem('indicador_cpf') || ''
        cod = localStorage.getItem('indicador_codigo') || ''
        tok = localStorage.getItem('indicador_token') || ''
      } catch (e) {}
      if (cod && tok && cpfSalvo) {
        try {
          // Valida o token no banco (mesma RPC do painel) antes de considerar logado.
          const { data } = await supabase.rpc('listar_creditos_indicador', { p_codigo: cod, p_token: tok })
          if (!vivo) return
          if (data && data.ok) {
            setCpf(formatarCPF(cpfSalvo))
            setCodigo(cod); setToken(tok); setDados(data)
            try {
              setNome(localStorage.getItem('indicador_nome') || '')
              setPixVal(localStorage.getItem('indicador_pix') || '')
            } catch (e) {}
            setEtapa('painel')
            return
          }
        } catch (e) {}
      }
      if (!vivo) return
      if (cpfSalvo && validarCPF(cpfSalvo)) { setCpf(formatarCPF(cpfSalvo)); setModo('login'); setEtapa('senha') }
      else setEtapa('cpf')
    })()
    return () => { vivo = false }
  }, [])

  // ?ind= (param PRÓPRIO do indicador — ?ref é do médico) + ?oba=1: o bariátrico
  // indicado cai direto na entrada do Projeto OBA, não na landing do RedFairy.
  const link = codigo ? `${window.location.origin}/?oba=1&ind=${codigo}` : ''

  async function carregarPainel(cod) {
    try {
      // Token-protegido: só o próprio indicador logado vê os créditos (o código é público no link).
      const t = token || localStorage.getItem('indicador_token') || ''
      const { data } = await supabase.rpc('listar_creditos_indicador', { p_codigo: cod || codigo, p_token: t })
      if (data && data.ok) setDados(data)
    } catch (e) {}
  }
  async function carregarContato() {
    try {
      const t = token || localStorage.getItem('indicador_token') || ''
      const { data } = await supabase.rpc('contato_indicador', { p_codigo: codigo, p_token: t })
      if (data && data.ok) { setContatoCpf(data.cpf || ''); setContatoCel(data.celular || ''); setContatoEmail(data.email || '') }
    } catch (e) {}
  }
  useEffect(() => { if (etapa === 'painel' && codigo) { carregarPainel(codigo); carregarContato() } }, [etapa, codigo])

  function salvarSessao(data) {
    try {
      localStorage.setItem('indicador_cpf', cpfDigits)
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

  // Saída do painel SEMPRE por navegação REAL pro bariatrico.net — nunca ficar
  // preso na landing do redfairy (e a página nova recarrega o manifesto certo).
  function irParaBariatrico() {
    try { window.location.replace('https://bariatrico.net') } catch (e) { if (onVoltar) onVoltar() }
  }

  function copiarLink() {
    try { navigator.clipboard.writeText(link); setCopiado(true); setTimeout(() => setCopiado(false), 1800) } catch (e) {}
  }

  // Instalar o ICONE do Projeto na tela + copiar o LINK (dentro do gesto do clique).
  async function aoInstalarIcone(e) {
    const marcado = e.target.checked
    setIconeMarcado(marcado)
    if (!marcado) { setIosInstr(false); setLinkCopiado(false); setInstFalhou(false); return }
    try { await navigator.clipboard.writeText(link); setLinkCopiado(true) } catch (er) {}
    const r = await instalar()
    if (r === 'ios') setIosInstr(true)
    else if (r === 'indisponivel') setInstFalhou(true)   // prompt não disponível agora — avisa em vez de falhar mudo
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
    <button onClick={() => { sair(); irParaBariatrico(); }}
      className="absolute top-4 left-4 px-3 py-1 rounded-lg text-xs font-bold shadow transition-colors"
      style={{ backgroundColor: '#E3AE37', color: '#14100E' }}>
      Voltar
    </button>
  ) : null

  const Cabecalho = (
    <div className="mb-5 text-center">
      <img src={obaLogo} alt="Projeto OBA®" style={{ height: 128, objectFit: 'contain', display: 'block', margin: '0 auto' }} />
      <p className="text-gray-500 text-sm" style={{ marginTop: 4 }}>Modo Indicador</p>
    </div>
  )

  // ── PAINEL ──────────────────────────────────────────────────────────────────
  if (etapa === 'painel') {
    // Submodais reutilizam o PacienteIndicaModal (idempotente pelo CPF do indicador):
    // mesmos modais do paciente, mas SEM "ENTRAR" (indicador não faz avaliação clínica).
    if (indView === 'indicar' || indView === 'creditos') {
      return <PacienteIndicaModal cpf={cpf} celular={contatoCel} email={contatoEmail} view={indView} onFechar={() => setIndView('gate')} />
    }
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center p-6">
        <div className="w-full max-w-sm mt-10">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden relative">
            {/* X fechar — sai pro bariatrico.net MANTENDO o login (equivale ao SAIR);
                deslogar de verdade é pelo botão DESLOGAR abaixo. */}
            <button onClick={irParaBariatrico} aria-label="Fechar"
              style={{ position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: '50%', background: '#7B1E1E', color: '#fff', border: '2px solid #fff', cursor: 'pointer', fontSize: '12px', fontWeight: 700, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
              {"✕"}
            </button>
            <div className="p-5 pt-7">
              <img src={obaLogo} alt="Projeto OBA" className="h-24 object-contain mx-auto" />
              <p className="text-center text-[11px] text-gray-400 mt-1 mb-3">{nome ? nome : 'Modo Indicador'}</p>
              <div className="divide-y divide-gray-100">
                <div className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-lg font-extrabold text-red-800 leading-tight">{"INDICAR"}</p>
                    <p className="text-xs text-gray-500">{"Indicar paciente"}</p>
                  </div>
                  <PlayButton onClick={() => setIndView('indicar')} ariaLabel="Indicar"
                    circleClass="bg-gray-700 hover:bg-gray-800" playColor="#facc15" ringColor="rgba(250,204,21,0.65)" />
                </div>
                <div className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-base font-extrabold text-red-800 leading-tight">{"VER MEUS CRÉDITOS"}</p>
                    <p className="text-xs text-gray-500">{"Cadastrados, recebidos e a receber"}</p>
                  </div>
                  <PlayButton onClick={() => setIndView('creditos')} ariaLabel="Ver meus créditos"
                    circleClass="bg-gray-700 hover:bg-gray-800" playColor="#facc15" ringColor="rgba(250,204,21,0.65)" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={iconeMarcado} onChange={aoInstalarIcone} className="w-4 h-4 flex-shrink-0" style={{ accentColor: '#7B1E1E' }} />
                  <span className="text-xs font-bold text-gray-700 leading-tight">{"Instalar o ÍCONE do Projeto OBA na minha tela"}</span>
                  <img src={obaFairyIcon} alt="" className="ml-auto w-10 h-10 rounded-lg flex-shrink-0" style={{ objectFit: 'contain' }} />
                </label>
                {linkCopiado && <p className="text-[11px] mt-2 text-green-700 font-bold">{"✓ LINK copiado! Cole no WhatsApp, Telegram ou nas suas redes."}</p>}
                {iosInstr && <p className="text-[11px] mt-1 text-gray-500 leading-snug">{"No iPhone: toque em Compartilhar (↑) e depois em \"Adicionar à Tela de Início\"."}</p>}
                {instFalhou && <p className="text-[11px] mt-1 text-orange-600 font-bold leading-snug">{"Não deu pra instalar agora — feche e abra o link de novo, aí marque esta caixa."}</p>}
                {/* Duas saídas com o efeito dito na cara (mesmo padrão do paciente):
                    DESLOGAR apaga a credencial inteira; SAIR mantém o login e o
                    ícone entra direto. O X equivale ao SAIR. */}
                <div className="mt-4 flex items-start justify-center gap-8">
                  <div className="text-center">
                    <button onClick={() => { sair(); try { localStorage.removeItem('indicador_cpf') } catch (e) {}; irParaBariatrico() }}
                      className="text-[11px] font-extrabold tracking-widest text-gray-500 uppercase hover:text-red-700">
                      {"DESLOGAR"}
                    </button>
                    <p className="text-[10px] text-gray-400 mt-1 leading-snug">{"Retorna "}<b>{"com"}</b>{" CPF/SENHA"}</p>
                  </div>
                  <div className="text-center">
                    <button onClick={irParaBariatrico}
                      className="text-[11px] font-extrabold tracking-widest text-gray-500 uppercase hover:text-red-700">
                      {"SAIR"}
                    </button>
                    <p className="text-[10px] text-gray-400 mt-1 leading-snug">{"Retorna "}<b>{"sem"}</b>{" CPF/SENHA"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
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

        {etapa === 'restaurando' && (
          <p className="text-center text-xs font-bold text-gray-400 tracking-widest animate-pulse py-4">{"ENTRANDO..."}</p>
        )}

        {etapa === 'cpf' && (
          <>
            <p className="text-center text-xs font-bold text-gray-500 tracking-widest mb-2">DIGITE O SEU CPF</p>
            <input autoFocus className={inputClass} style={inpStyle} inputMode="numeric" maxLength={14}
              value={cpf} onChange={e => { setCpf(formatarCPF(e.target.value)); setErro('') }}
              onKeyDown={e => { if (e.key === 'Enter' && cpfOk) avancarCpf() }}
              placeholder="000.000.000-00" />
            <p className="text-center text-[11px] font-bold text-gray-400 tracking-widest mt-2">LOGIN DO INDICADOR</p>
            {erro && <p className="text-center text-red-600 text-xs font-bold mt-2">{erro}</p>}
            {cpfInvalido && !erro && <p className="text-center text-red-600 text-xs font-bold mt-2">CPF inválido</p>}
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
