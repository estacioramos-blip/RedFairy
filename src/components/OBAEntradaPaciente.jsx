import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import obaLogo from '../assets/oba-logo.png'
import PlayButton from './PlayButton'
import TermosModal from './TermosModal'

// =============================================================================
// OBAEntradaPaciente — tela PRÓPRIA do paciente bariátrico (vindo do bariatrico.net).
// Nunca passa pela landing do RedFairy. Fases: intro (popup do Projeto OBA) →
// CPF → senha (login/cadastro). Reusa os RPCs canônicos do paciente
// (lookup_cpf_triagem, login_paciente, register_paciente) e carrega o flag
// bariátrico. Visual alinhado aos cards de médico/indicador.
// =============================================================================

const inputClass = "w-full border-2 rounded-lg px-3 py-2.5 text-sm text-center font-bold outline-none"
const inpStyle = { borderColor: '#facc15', background: '#fefce8', color: '#1e3a8a' }

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

export default function OBAEntradaPaciente({ onVoltar, onConcluir }) {
  const [fase, setFase] = useState('intro')     // intro | cpf | senha
  const [cpf, setCpf] = useState('')
  const [senha, setSenha] = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [modo, setModo] = useState(null)        // login | cadastro
  const [aceitoTC, setAceitoTC] = useState(true)
  const [busy, setBusy] = useState(false)
  const [erro, setErro] = useState('')
  const [showTC, setShowTC] = useState(false)   // modal de Termos e Condições

  // Flag bariátrico desde a entrada (o algoritmo/OBA trata o paciente como bariátrico).
  // rf_dom_bari persistente: saída/F5 (inclusive pelo ÍCONE em redfairy.bio) → bariatrico.net,
  // nunca a landing do RedFairy. Só o ?reset limpa.
  useEffect(() => { try { localStorage.setItem('rf_flag', 'bariatrica'); localStorage.setItem('rf_dom_bari', '1') } catch (e) {} }, [])

  const cpfDigits = soDigitos(cpf)
  const cpfOk = cpfDigits.length === 11 && validarCPF(cpfDigits)   // só avança com CPF válido
  const cpfInvalido = cpfDigits.length === 11 && !validarCPF(cpfDigits)
  const senhaOk = senha.length >= 6
  const podeConcluir = cpfOk && senhaOk && (modo !== 'cadastro' || aceitoTC)

  async function avancarCpf() {
    if (!cpfOk || busy) return
    setErro(''); setBusy(true)
    let existe = false
    try {
      const { data } = await supabase.rpc('lookup_cpf_triagem', { cpf_input: cpfDigits })
      existe = !!(data?.find?.(r => r.origem === 'profile'))
    } catch (e) {}
    setBusy(false)
    setModo(existe ? 'login' : 'cadastro')
    setSenha(''); setAceitoTC(true)
    setFase('senha')
  }

  async function concluir() {
    if (!podeConcluir || busy) return
    setErro('')
    // Encaminhador (médico/indicador via ?ref) → preserva pra atribuição do crédito.
    if (modo === 'cadastro') {
      try { localStorage.setItem('rf_medico_encaminhador', localStorage.getItem('rf_ref_encaminhador') || '') } catch (e) {}
    }
    setBusy(true)
    const rpcName = modo === 'login' ? 'login_paciente' : 'register_paciente'
    try {
      const { data, error } = await supabase.rpc(rpcName, { p_cpf: cpfDigits, p_senha: senha })
      if (error) { setBusy(false); setErro('ERRO DE CONEXÃO. TENTE NOVAMENTE.'); return }
      if (!data || !data.ok) { setBusy(false); setErro((data?.erro || 'FALHA NO ACESSO').toString().toUpperCase()); return }
      try {
        localStorage.setItem('paciente_id', data.id || '')
        localStorage.setItem('paciente_cpf', cpfDigits)
        localStorage.setItem('paciente_nome', data.nome || '')
        localStorage.setItem('paciente_login_at', Date.now().toString())
        if (data.token) localStorage.setItem('paciente_token', data.token)
        // (ÍCONE) credencial PERSISTENTE de reentrada passwordless — sobrevive a TODOS os
        // logouts (não é limpa pelos clears de sessão; só pelo ?reset). O ícone reentra com ela.
        localStorage.setItem('rf_reentry_cpf', cpfDigits)
        if (data.token) localStorage.setItem('rf_reentry_token', data.token)
        localStorage.setItem('rf_flag', 'bariatrica')
      } catch (e) {}
      // Entrou por SOU BARIÁTRICO → marca o perfil como bariátrico JÁ no cadastro (fonte
      // confiável, não depende do rf_flag sobreviver até o dashboard). RLS off em profiles.
      try { if (data.id) await supabase.from('profiles').update({ bariatrica: true }).eq('id', data.id) } catch (e) {}
      onConcluir && onConcluir()
    } catch (e) { setBusy(false); setErro('ERRO DE CONEXÃO. TENTE NOVAMENTE.') }
  }

  const VoltarBtn = onVoltar ? (
    <button onClick={onVoltar}
      className="absolute top-4 left-4 px-3 py-1 rounded-lg text-xs font-bold shadow transition-colors"
      style={{ backgroundColor: '#E3AE37', color: '#14100E' }}>
      Voltar
    </button>
  ) : null

  const Cabecalho = (
    <div className="mb-5 text-center">
      <img src={obaLogo} alt="Projeto OBA®" style={{ height: 160, objectFit: 'contain', display: 'block', margin: '0 auto' }} />
      <p className="text-gray-500 text-sm" style={{ marginTop: 4 }}>Otimizar o Bariátrico</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-900 flex items-start sm:items-center justify-center p-4 sm:p-6 pt-6 relative">
      {VoltarBtn}
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        {Cabecalho}

        {fase === 'intro' && (
          <>
            <p className="text-center text-gray-700 leading-relaxed font-medium">
              {"Para participar do "}<strong style={{ color: '#E3AE37' }}>Projeto OBA®</strong>{" você precisa criar um "}<strong>ACESSO e SENHA</strong>{", e se cadastrar na plataforma."}
            </p>
            <div className="flex justify-center mt-6">
              <PlayButton onClick={() => setFase('cpf')} label="VAMOS!..." ariaLabel="Começar"
                playColor="#E3AE37" labelColor="#000000" ringColor="rgba(227,174,55,0.65)" />
            </div>
          </>
        )}

        {fase === 'cpf' && (
          <>
            <p className="text-center text-xs font-bold text-gray-500 tracking-widest mb-2">DIGITE O SEU CPF</p>
            <input autoFocus className={inputClass} style={inpStyle} inputMode="numeric" maxLength={14}
              value={cpf} onChange={e => { setCpf(formatarCPF(e.target.value)); setErro('') }}
              onKeyDown={e => { if (e.key === 'Enter' && cpfOk) avancarCpf() }}
              placeholder="000.000.000-00" />
            <p className="text-center text-[11px] font-bold text-gray-400 tracking-widest mt-2">LOGIN DO PACIENTE</p>
            {erro && <p className="text-center text-red-600 text-xs font-bold mt-2">{erro}</p>}
            {cpfInvalido && !erro && <p className="text-center text-red-600 text-xs font-bold mt-2">CPF inválido</p>}
            {cpfOk && (
              <div className="flex justify-end mt-3">
                <PlayButton onClick={avancarCpf} loading={busy} ariaLabel="Continuar"
                  playColor="#E3AE37" labelColor="#000000" ringColor="rgba(227,174,55,0.65)" />
              </div>
            )}
          </>
        )}

        {fase === 'senha' && (
          <>
            <p className="text-center text-xs font-bold text-gray-500 tracking-widest mb-2">
              {modo === 'cadastro' ? 'CRIE AGORA A SUA SENHA' : 'DIGITE A SUA SENHA'}
            </p>
            <div className="relative">
              <input autoFocus type={showSenha ? 'text' : 'password'} className={inputClass} style={inpStyle}
                value={senha} onChange={e => { setSenha(e.target.value); setErro('') }}
                onKeyDown={e => { if (e.key === 'Enter' && podeConcluir) concluir() }}
                placeholder="MÍNIMO SEIS CARACTERES" />
              <button type="button" onClick={() => setShowSenha(s => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 p-1" aria-label="Mostrar/ocultar senha">
                {showSenha ? '🙈' : '👁'}
              </button>
            </div>
            <p className="text-center text-[11px] font-bold text-gray-400 tracking-widest mt-2">LOGIN DO PACIENTE</p>

            {modo === 'cadastro' && (
              <label className="flex items-start gap-2 mt-3 cursor-pointer">
                <input type="checkbox" checked={aceitoTC} onChange={e => setAceitoTC(e.target.checked)} className="mt-0.5 w-4 h-4 flex-shrink-0" />
                <span className="text-xs text-gray-600">Li e aceito os{" "}
                  <button type="button"
                    onClick={e => { e.preventDefault(); e.stopPropagation(); setShowTC(true) }}
                    className="text-red-700 font-bold underline hover:text-red-800">
                    {"Termos e Condições de Uso"}
                  </button>.
                </span>
              </label>
            )}

            {erro && (
              <div className="text-center mt-2">
                <p className="text-red-600 text-xs font-bold">{erro}</p>
                {modo === 'login' && (
                  <a href="https://wa.me/5571997110804" target="_blank" rel="noopener noreferrer" className="text-red-800 text-[11px] font-bold underline">Recuperar senha</a>
                )}
              </div>
            )}

            <div className="flex justify-between items-end mt-3">
              <button onClick={() => { setFase('cpf'); setErro('') }} className="text-gray-400 text-xs hover:text-gray-600">{"← Voltar"}</button>
              {podeConcluir && (
                <PlayButton onClick={concluir} loading={busy} ariaLabel="Entrar"
                  playColor="#E3AE37" labelColor="#000000" ringColor="rgba(227,174,55,0.65)" />
              )}
            </div>
          </>
        )}
      </div>

      {showTC && <TermosModal tipo="paciente" onFechar={() => setShowTC(false)} />}
    </div>
  )
}
