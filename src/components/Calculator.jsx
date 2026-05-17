import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { avaliarPaciente, triagemEritron, formatarParaCopiar } from '../engine/decisionEngine';
import { avaliarOBA } from '../engine/obaEngine';
import OBAModal from './OBAModal';
import TriagemModal from './TriagemModal';
import TriagemResultadoModal from './TriagemResultadoModal';
import ResultCard from './ResultCard';
import heroImg from '../assets/redfairy-hero.png';
import fairyChatImg from '../assets/fairy-chat.png';
import welcomeImg from '../assets/welcome.png';
import chatphone2Img from '../assets/chatphone2.png';
import telefonista2Img from '../assets/telefonista2.png';
import telefonista3Img from '../assets/telefonista3.png';
import logo from '../assets/logo.png';

const IconPaciente = () => (
  <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
    <circle cx="10" cy="6" r="3.5" stroke="#dc2626" strokeWidth="1.6"/>
    <path d="M3 18C3 14.134 6.134 11 10 11C13.866 11 17 14.134 17 18" stroke="#dc2626" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
)

const IconExames = () => (
  <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
    <path d="M7 2H13V11L15.5 15.5C16.1 16.6 15.3 18 14 18H6C4.7 18 3.9 16.6 4.5 15.5L7 11V2Z" stroke="#dc2626" strokeWidth="1.6" strokeLinejoin="round"/>
    <path d="M7 8H13" stroke="#dc2626" strokeWidth="1.4" strokeLinecap="round"/>
    <circle cx="8.5" cy="14" r="1" fill="#dc2626"/>
    <circle cx="11.5" cy="14" r="1" fill="#dc2626"/>
  </svg>
)

const IconHistorico = () => (
  <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
    <rect x="4" y="2" width="12" height="16" rx="2" stroke="#dc2626" strokeWidth="1.6"/>
    <path d="M7 7H13" stroke="#dc2626" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M7 10H13" stroke="#dc2626" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M7 13H10" stroke="#dc2626" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)

const IconMedicamentos = () => (
  <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
    <rect x="3" y="8" width="14" height="8" rx="4" stroke="#dc2626" strokeWidth="1.6"/>
    <path d="M10 8V16" stroke="#dc2626" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M7 5C7 3.9 8.1 3 9.5 3H10.5C11.9 3 13 3.9 13 5V8H7V5Z" stroke="#dc2626" strokeWidth="1.6"/>
  </svg>
)



function TermosModal({ onFechar }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onFechar}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight:'85vh' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <p className="font-bold text-red-700 text-sm">Termos e Condições de Uso — Profissionais de Saúde</p>
            <p className="text-gray-400 text-xs">RedFairy — Versão 1.0 — Abril de 2026</p>
          </div>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
        </div>
        <div className="overflow-y-auto p-5 text-xs text-gray-700 leading-relaxed space-y-4">
          <p className="font-bold text-red-700 uppercase tracking-wide mb-1">Termos e Condições de Uso — Profissionais de Saúde</p>
          <p><strong>1. Natureza da Plataforma.</strong> O RedFairy é uma ferramenta digital de apoio à decisão clínica. NÃO substitui o julgamento clínico do profissional de saúde, o exame físico nem a anamnese detalhada. Os resultados gerados são orientativos e não constituem laudos médicos.</p>
          <p><strong>2. Elegibilidade.</strong> O acesso ao módulo profissional é restrito a profissionais de saúde com registro ativo em conselho de classe (CRM, COREN, CRN, CRF ou equivalente). Ao se cadastrar, o profissional declara possuir habilitação legal para exercício da profissão, sendo legalmente responsável por esta informação.</p>
          <p><strong>3. Responsabilidade Clínica.</strong> Médicos serão integralmente responsáveis pelas decisões clínicas tomadas com base nos resultados gerados. A plataforma mantém um canal de comunicação aberto para dúvidas ou esclarecimentos. O RedFairy é uma ferramenta auxiliar — a responsabilidade diagnóstica e terapêutica é exclusivamente do médico. Profissionais de saúde não médicos que utilizem a plataforma não devem fazer prescrições nem recomendações terapêuticas quando recomendado pelo algoritmo, e devem orientar os pacientes a consultarem os seus médicos, ou os médicos da plataforma.</p>
          <p><strong>4. Consentimento dos Pacientes.</strong> Ao inserir dados de pacientes, o profissional declara ter obtido o consentimento informado do titular dos dados, em conformidade com a legislação vigente e com o Código de Ética Profissional. De preferência, as avaliações devem ser feitas na presença dos pacientes, ou quando os pacientes encaminhem os seus resultados diretamente para o médico, por qualquer meio.</p>
          <p><strong>5. Programa de Afiliados.</strong> Ao avaliar pacientes na plataforma, o profissional integra automaticamente o Programa de Afiliados RedFairy, com suporte dos patrocinadores da Operadora. As regras e benefícios são estabelecidos em documento próprio que será enviado aos profissionais, e podem ser alterados com aviso prévio de 30 dias.</p>
          <p><strong>6. Proteção de Dados — LGPD.</strong> Os dados inseridos são tratados em conformidade com a Lei nº 13.709/2018. O profissional é corresponsável pelo tratamento adequado dos dados dos seus pacientes inseridos na plataforma.</p>
          <p><strong>7. Propriedade Intelectual.</strong> Todo o conteúdo da plataforma, incluindo o algoritmo, as matrizes de decisão e as orientações terapêuticas, é de propriedade exclusiva da Cytomica. É vedada reprodução, cópia ou distribuição sem autorização expressa.</p>
          <p><strong>8. Limitação de Responsabilidade.</strong> A Cytomica não se responsabiliza por danos decorrentes do uso inadequado da plataforma ou de decisões clínicas baseadas exclusivamente nos resultados gerados, sem a devida avaliação profissional.</p>
          <p><strong>9. Foro.</strong> Comarca de Salvador, Estado da Bahia. Lei aplicável: legislação brasileira vigente, especialmente a LGPD e o Código de Ética Profissional.</p>
          <p className="text-gray-400 text-center text-xs">cytomica.com | redfairy.bio | contato@redfairy.bio</p>
        </div>
        <div className="p-4 border-t border-gray-100">
          <button onClick={onFechar} className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">Fechar</button>
        </div>
      </div>
    </div>
  )
}


// ─── Tela de login/cadastro do médico ────────────────────────────────────────
// __TELA5_TELEFONISTA__
// Tela apos cadastro: imagem telefonista2 com typewriter sobreposto.
// Apos 4s chama onConcluir() automaticamente.
function CadastroConcluidoTela({ nomeMedico, crmMedico, onConcluir }) {
  const fullText = 'Vamos ao programa de afiliados...';
  const [displayed, setDisplayed] = React.useState('');

  React.useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(fullText.slice(0, i));
      if (i >= fullText.length) clearInterval(interval);
    }, 60);
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    const t = setTimeout(() => onConcluir(), 4000);
    return () => clearTimeout(t);
  }, [onConcluir]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Imagem telefonista2 no topo com gradiente */}
        <div style={{ position: 'relative' }}>
          <img src={telefonista2Img} alt="Vamos ao programa de afiliados"
            style={{ width: '100%', height: 'auto', display: 'block' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.92), rgba(0,0,0,0.55) 50%, transparent)', padding: '40px 24px 18px' }}>
            <p style={{ color: '#ffffff', fontSize: '20px', fontWeight: 700, lineHeight: 1.2, margin: 0, textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}>
              {displayed}
              <span style={{ opacity: 0.6, animation: 'blink 1s step-end infinite' }}>|</span>
            </p>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '10px', fontWeight: 600, letterSpacing: '1.5px', margin: '8px 0 0', textTransform: 'uppercase', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
              Após a próxima página você estará automaticamente logado
            </p>
          </div>
          <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
        </div>
        {/* Subtexto abaixo da imagem */}
        <div className="px-6 py-3 text-center">
          <p className="text-xs text-gray-400">Cadastro concluído</p>
        </div>
      </div>
    </div>
  );
}

function AuthMedico({ onConcluir, onVoltar, sessaoExpirada, modoInicial = 'cadastro', onVoltarParaConvite }) {
  const [modo, setModo] = useState(modoInicial) // 'login' | 'cadastro' (hub removido)
  const refCrmLogin = useRef(null);
  const [vamosTxt, setVamosTxt] = useState('');
  useEffect(() => {
    const full = 'Vamos! ...';
    let i = 0;
    const iv = setInterval(() => {
      i++; setVamosTxt(full.slice(0, i));
      if (i >= full.length) clearInterval(iv);
    }, 55);
    return () => clearInterval(iv);
  }, []);
  useEffect(() => {
    if (modo === 'login') {
      const t = setTimeout(() => { if (refCrmLogin.current) refCrmLogin.current.focus(); }, 200);
      return () => clearTimeout(t);
    }
  }, [modo]);

  // Login
  const [loginConselho, setLoginConselho] = useState('')
  const [loginSenha, setLoginSenha] = useState('')
  const [loginErro, setLoginErro] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // Cadastro
  const [nome, setNome] = useState('')
  const [tipoConselho, setTipoConselho] = useState('CRM')
  const [conselho, setConselho] = useState('')
  const [celular, setCelular] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [cadErro, setCadErro] = useState('')
  const [cadLoading, setCadLoading] = useState(false)
  const [cadSucesso, setCadSucesso] = useState(false)
  const [aceitoTC, setAceitoTC] = useState(false)
  const [showTC, setShowTC] = useState(false)
  const [showSenha, setShowSenha] = useState(false)
  const [showLoginSenha, setShowLoginSenha] = useState(false)
  const [showEsqueciSenha, setShowEsqueciSenha] = useState(false)
  const refSenhaLogin = useRef(null);
  const [etapaLogin, setEtapaLogin] = useState(1); // 1=CRM, 2=Senha
  useEffect(() => {
    if (modo !== 'login') return;
    if (etapaLogin !== 1) return;
    const v = (loginConselho || '').trim().toUpperCase();
    if (/^\d+\/[A-Z]{2}$/.test(v)) {
      const t = setTimeout(() => {
        setEtapaLogin(2);
        if (refSenhaLogin.current) refSenhaLogin.current.focus();
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [loginConselho, modo, etapaLogin]);

  function formatarCelular(valor) {
    const digits = valor.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 2) return `(${digits}`
    if (digits.length <= 7) return `(${digits.slice(0,2)}) ${digits.slice(2)}`
    return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`
  }

  function formatarConselho(valor) {
    return valor.toUpperCase().replace(/[^0-9/A-Z]/g, '').slice(0, 12)
  }

  async function handleLogin() {
    setLoginErro('')
    const conselhoLimpo = loginConselho.trim().toUpperCase()
    if (!conselhoLimpo) { setLoginErro('Informe o número do conselho de classe.'); return }
    if (!loginSenha) { setLoginErro('Informe a senha.'); return }

    setLoginLoading(true)
    const { data: medico } = await supabase
      .from('medicos')
      .select('id, nome, crm, senha_klipbit')
      .eq('crm', conselhoLimpo)
      .single()

    setLoginLoading(false)

    if (!medico) { setLoginErro('Conselho não encontrado. Verifique ou cadastre-se.'); return }
    if (medico.senha_klipbit !== loginSenha) { setLoginErro('Senha incorreta.'); return }

    localStorage.setItem('medico_crm', medico.crm)
    localStorage.setItem('medico_nome', medico.nome || '')
    localStorage.setItem('medico_login_at', Date.now().toString())
    onConcluir(medico.nome || '', medico.crm)
  }

  async function handleCadastro() {
    setCadErro('')
    if (!aceitoTC) { setCadErro('Você deve aceitar os Termos e Condições para criar acesso.'); return }
    const conselhoLimpo = conselho.trim().toUpperCase()
    const celularDigits = celular.replace(/\D/g, '')

    if (!nome.trim() || nome.trim().length < 5) { setCadErro('Informe seu nome completo.'); return }
    if (!conselhoLimpo) { setCadErro('Informe o número do conselho de classe/UF.'); return }
    if (celularDigits.length < 10) { setCadErro('Informe um celular válido com DDD.'); return }
    if (!email || !email.includes('@')) { setCadErro('Informe um e-mail válido.'); return }
    if (!senha || senha.length < 6) { setCadErro('A senha deve ter pelo menos 6 caracteres.'); return }

    setCadLoading(true)

    // Verifica se já existe
    const { data: existing } = await supabase
      .from('medicos')
      .select('id, nome, crm')
      .eq('crm', conselhoLimpo)
      .single()

    if (existing) {
      setCadLoading(false)
      setCadErro('Este conselho já está cadastrado. Faça login.')
      return
    }

    const partes = conselhoLimpo.split('/')
    const uf = partes[1] || ''

    const { error } = await supabase.from('medicos').insert({
      nome: nome.trim(),
      crm: conselhoLimpo,
      uf,
      celular: celularDigits,
      email: email.trim().toLowerCase(),
      senha_klipbit: senha,
    })

    setCadLoading(false)

    if (error) { setCadErro('Erro ao salvar. Tente novamente.'); return }

    localStorage.setItem('medico_crm', conselhoLimpo)
    localStorage.setItem('medico_nome', nome.trim())
    localStorage.setItem('medico_login_at', Date.now().toString())
    setCadSucesso(true)
  }

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"

  // __FATIA1B_SEM_TELA6__ TELA 6 (CadastroConcluidoTela) eliminada.
  // Ao concluir o cadastro, segue direto para a proxima etapa.
  useEffect(() => {
    if (cadSucesso) {
      setCadSucesso(false);
      if (typeof onConcluir === 'function') {
        onConcluir(nome, conselho);
      }
    }
  }, [cadSucesso]);

  return (
    <div className="bg-gray-900 relative" style={{ minHeight: '100vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px', overflowY: 'auto' }}> {/* __B2_SCROLL__ */}
      {onVoltar && (
        <button onClick={onVoltar}
          className="absolute top-4 left-4 text-white px-3 py-1 rounded-lg text-xs font-medium shadow transition-colors"
          style={{ backgroundColor: '#991b1b' }}>
          ← Voltar
        </button>
      )}
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md space-y-5" style={{ overflow: 'hidden' }}>
        {/* __TELEFONISTA3_TOPO__ */}
        <div style={{ position: 'relative' }}>
          <img src={telefonista3Img} alt="Vamos!" style={{ width: '100%', height: 'auto', display: 'block' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.92), rgba(0,0,0,0.55) 50%, transparent)', padding: '40px 24px 34px' }}>
            <p style={{ color: '#ffffff', fontSize: '26px', fontWeight: 800, lineHeight: 1.15, margin: 0, textAlign: 'center', textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}>{vamosTxt}</p>
          </div>
        </div>
        <div className="px-8 pb-8 pt-2 space-y-5">
        <div className="text-center">
          <img src={logo} alt="RedFairy"
            className="w-16 h-16 object-contain mx-auto mb-3" />
          <h2 className="text-xl font-bold text-red-700">
            {modo === 'login' ? 'Acesso Médico' : 'Primeiro Acesso'}
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            {modo === 'login' ? 'Entre com seu conselho e senha' : 'Crie seu acesso ao RedFairy'}
          </p>
        </div>

        {sessaoExpirada && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 mb-2 text-center">
            <p className="text-amber-800 text-sm font-semibold">⏱ Sua sessão expirou.</p>
            <p className="text-amber-700 text-xs mt-0.5">Faça login novamente para continuar.</p>
          </div>
        )}


        {/* LOGIN */}
        {modo === 'login' && (
          <div className="space-y-3">
            <button
              onClick={() => { setLoginErro(''); setCadErro(''); onVoltar?.() }}
              className="text-gray-400 hover:text-gray-600 text-xs font-medium">
              ← Voltar
            </button>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Número do CRM/UF</label>
              <input ref={refCrmLogin} type="text" value={loginConselho}
                onChange={e => setLoginConselho(formatarConselho(e.target.value))}
                placeholder="Ex: 6302/BA"
                autoComplete="off"
                name="rf-crm-login"
                className={`${inputClass} ${etapaLogin === 1 ? 'border-yellow-400 bg-yellow-50' : 'bg-yellow-50 border-yellow-300'}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Senha</label>
              <div style={{ position: 'relative' }}>
                <input ref={refSenhaLogin} type={showLoginSenha ? 'text' : 'password'} value={loginSenha}
                  onChange={e => setLoginSenha(e.target.value)}
                  onFocus={() => setEtapaLogin(2)}
                  placeholder="Sua senha"
                  className={`${inputClass} ${etapaLogin === 2 ? 'border-yellow-400 bg-yellow-50' : ''}`}
                  style={{ paddingRight: '40px' }}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                <button type="button" onClick={() => setShowLoginSenha(!showLoginSenha)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#9ca3af' }}
                  aria-label={showLoginSenha ? 'Ocultar senha' : 'Mostrar senha'}>
                  {showLoginSenha ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>
            {loginErro && <p className="text-red-500 text-sm">{loginErro}</p>}
            {/* __LOGIN_CONFIRMO__ */}
            {loginConselho.trim() && loginSenha.trim() && (
              <div className="flex flex-col items-center gap-1 pt-1">
                <button onClick={handleLogin} disabled={loginLoading}
                  aria-label="Confirmar login"
                  className="w-14 h-14 rounded-full bg-gray-400 hover:bg-gray-500 text-red-700 font-bold flex items-center justify-center transition-colors shadow-md disabled:opacity-50">
                  <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>▶</span>
                </button>
                <span className="text-xs font-bold text-red-800 tracking-wide">{loginLoading ? '...' : 'CONFIRMO'}</span>
              </div>
            )}
            <p className="text-center text-xs">
              <button type="button" onClick={() => setShowEsqueciSenha(true)} className="text-gray-400 hover:text-red-700 hover:underline">
                Esqueci a senha
              </button>
            </p>
          </div>
        )}

        {/* CADASTRO */}
        {modo === 'cadastro' && (
          <div className="space-y-3">
            <button
              onClick={() => { setLoginErro(''); setCadErro(''); onVoltarParaConvite?.() }}
              className="text-gray-400 hover:text-gray-600 text-xs font-medium">
              ← Voltar
            </button>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Nome completo</label>
              <input type="text" value={nome} onChange={e => setNome(e.target.value.toUpperCase())} style={{ textTransform: 'uppercase' }}
                placeholder="Dr. João da Silva" className={inputClass} autoComplete="off" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Número do CRM/UF</label>
              <input type="text" value={conselho} onChange={e => setConselho(formatarConselho(e.target.value))}
                placeholder="Ex: 6302/BA" className={inputClass} autoComplete="off" />
              <p className="text-xs text-red-800 font-medium mt-0.5">Este será seu login permanente</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Celular / WhatsApp</label>
              <input type="tel" value={celular} onChange={e => setCelular(formatarCelular(e.target.value))}
                placeholder="(00) 00000-0000" inputMode="numeric" maxLength={15} className={inputClass} autoComplete="off" />
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-blue-800 text-xs font-bold mb-1">⚡ Programa de Afiliados</p>
              <p className="text-blue-700 text-xs leading-relaxed">
                Ao avaliar pacientes você passa a integrar o nosso Programa de Afiliados, com suporte dos nossos patrocinadores. Ao beneficiar pacientes, você também passa a auferir benefícios.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value.toLowerCase())}
                placeholder="seu@email.com" className={inputClass} autoComplete="off" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Senha</label>
              <div style={{ position: 'relative' }}>
                <input type={showSenha ? 'text' : 'password'} value={senha} onChange={e => setSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres" className={inputClass} autoComplete="new-password"
                  style={{ paddingRight: '40px' }} />
                <button type="button" onClick={() => setShowSenha(!showSenha)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#9ca3af' }}
                  aria-label={showSenha ? 'Ocultar senha' : 'Mostrar senha'}>
                  {showSenha ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              <p className="text-xs text-red-800 font-medium mt-0.5">Será sua senha de acesso ao RedFairy.</p>
            </div>
            {cadErro && <p className="text-red-500 text-sm">{cadErro}</p>}
            {showTC && <TermosModal onFechar={() => setShowTC(false)} />}
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={aceitoTC} onChange={e => setAceitoTC(e.target.checked)} className="mt-0.5 w-4 h-4 cursor-pointer flex-shrink-0" />
              <span className="text-xs text-gray-600">Li e aceito os{' '}
                <button type="button" onClick={() => setShowTC(true)} className="text-red-700 font-semibold hover:underline">
                  Termos e Condições de Uso
                </button>
              </span>
            </label>
            <button onClick={handleCadastro} disabled={cadLoading || !aceitoTC}
              className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50">
              {cadLoading ? 'Cadastrando...' : 'Continue →'}
            </button>
          </div>
        )}


        {/* Modal Esqueci a senha */}
        {showEsqueciSenha && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setShowEsqueciSenha(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="bg-red-700 px-5 py-4">
                <h3 className="text-white font-bold text-base">Recuperação de senha</h3>
              </div>
              <div className="p-5 space-y-4 text-center">
                <p className="text-gray-700 text-sm leading-relaxed">
                  Fale conosco por WhatsApp para recuperar seu acesso.
                </p>
                <a
                  href="https://wa.me/5571997110804"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl text-sm transition-colors no-underline">
                  Falar pelo WhatsApp
                </a>
                <button
                  onClick={() => setShowEsqueciSenha(false)}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-xl text-sm transition-colors">
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
        </div>{/* __FECHA_DIV_INTERNA__ */}
      </div>
    </div>
  )
}

// ─── AdminConfigModal ──────────────────────────────────────────────────────
function AdminConfigModal({ onFechar }) {
  const [valor, setValor] = useState('');
  const [valorDoc, setValorDoc] = useState('');
  const [pixChave, setPixChave] = useState('');
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState('');

  useEffect(() => {
    async function carregar() {
      const { data: v1 } = await supabase.from('config').select('valor').eq('chave', 'valor_solicitacao_medica').single();
      const { data: v2 } = await supabase.from('config').select('valor').eq('chave', 'valor_documento_medico').single();
      const { data: v3 } = await supabase.from('config').select('valor').eq('chave', 'pix_chave').single();
      setValor(v1?.valor || '');
      setValorDoc(v2?.valor || '');
      setPixChave(v3?.valor || '');
      setLoading(false);
    }
    carregar();
  }, []);

  async function salvar() {
    setSalvando(true);
    await supabase.from('config').upsert({ chave: 'valor_solicitacao_medica', valor, descricao: 'Valor R$ solicitação médica' }, { onConflict: 'chave' });
    await supabase.from('config').upsert({ chave: 'valor_documento_medico', valor: valorDoc, descricao: 'Valor R$ documento médico' }, { onConflict: 'chave' });
    await supabase.from('config').upsert({ chave: 'pix_chave', valor: pixChave, descricao: 'Chave Pix' }, { onConflict: 'chave' });
    setSalvando(false);
    setSucesso('Salvo!');
    setTimeout(() => { setSucesso(''); onFechar(); }, 1500);
  }

  const inp = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onFechar}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="font-bold text-gray-700 text-sm">⚙️ Configurações</p>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>
        {loading ? <p className="text-gray-400 text-sm text-center">Carregando...</p> : (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Valor Solicitação Médica (R$)</label>
              <input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} placeholder="Ex: 50.00" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Valor Documento Médico (R$)</label>
              <input type="number" step="0.01" value={valorDoc} onChange={e => setValorDoc(e.target.value)} placeholder="Ex: 29.90" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Chave Pix</label>
              <input type="text" value={pixChave} onChange={e => setPixChave(e.target.value)} placeholder="E-mail, CPF ou código" className={inp} />
            </div>
            {sucesso && <p className="text-green-600 text-sm text-center font-bold">✅ {sucesso}</p>}
            <button onClick={salvar} disabled={salvando} className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-2.5 rounded-xl transition-colors disabled:opacity-50 text-sm">
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function Calculator({ onVoltar, modoDemo }) {
  const [cadastrado, setCadastrado] = useState(null)
  const [preFlag, setPreFlag] = useState(null)
  const [preDemoDados, setPreDemoDados] = useState(null)
  const [medicoNome, setMedicoNome] = useState('')
  const [sessaoExpirada, setSessaoExpirada] = useState(false)
  const [medicoCRM, setMedicoCRM] = useState('')

  useEffect(() => {
    if (modoDemo) {
      setCadastrado(true)
      setMedicoNome('Dr. Demo RedFairy')
      setMedicoCRM('DEMO/BA')
      return
    }
    const crm = localStorage.getItem('medico_crm')
    const nome = localStorage.getItem('medico_nome')
    setCadastrado(!!crm)
    setMedicoNome(nome || '')
    setMedicoCRM(crm || '')
    const flag = localStorage.getItem('rf_flag'); if (flag) { setPreFlag(flag); localStorage.removeItem('rf_flag') }
    const demoDados = localStorage.getItem('rf_demo_dados')
    if (demoDados) {
      try {
        const d = JSON.parse(demoDados)
        setPreDemoDados(d)
        localStorage.removeItem('rf_demo_dados')
      } catch(e) {}
    }
  }, [modoDemo])

  function handleLogout() {
    localStorage.removeItem('medico_crm')
    localStorage.removeItem('medico_nome')
    setCadastrado(false)
    setMedicoNome('')
    setMedicoCRM('')
  }

  if (cadastrado === null) return null
  // Medico nao cadastrado: deixa avaliar livre. Se showAuthMedicoOverlay=true (apos convite),
  // o AuthMedico sera renderizado como overlay (no fim do JSX, junto com outros modais).
  // OBS: o bloqueio antigo `if (!cadastrado) return <AuthMedico>` foi removido para
  // permitir que o medico avalie SEM cadastro previo. O cadastro e oferecido apos a avaliacao.

  return <CalculatorForm onVoltar={onVoltar} medicoNome={medicoNome} medicoCRM={medicoCRM} setMedicoNome={setMedicoNome} setMedicoCRM={setMedicoCRM} cadastrado={cadastrado} setCadastrado={setCadastrado} onLogout={handleLogout} preFlag={preFlag} preDemoDados={preDemoDados} />
}

// ─── Formulário da calculadora ───────────────────────────────────────────────
function CalculatorForm({ onVoltar, medicoNome, medicoCRM, setMedicoNome, setMedicoCRM, cadastrado, setCadastrado, onLogout, preFlag, preDemoDados }) {
  const _demo = (() => { try { const d = localStorage.getItem('rf_demo_dados'); if (d) { localStorage.removeItem('rf_demo_dados'); return JSON.parse(d) } } catch(e) {} return null })()
  const _hoje = new Date().toISOString().split('T')[0]

  const [inputs, setInputs] = useState({
    cpf: '', sexo: _demo?.sexo || 'M', idade: _demo?.idade || '', dataNascimento: '', dataColeta: _demo ? new Date().toISOString().split('T')[0] : '',
    ferritina: _demo?.ferr || '', hemoglobina: _demo?.hb || '', vcm: _demo?.vcm || '', rdw: _demo?.rdw || '', satTransf: _demo?.sat || '',
    bariatrica: _demo?.bariatrica || preFlag === 'bariatrica' || localStorage.getItem('rf_flag') === 'bariatrica',
    bariatrica_medico: _demo?.bariatrica || false, vegetariano: false, perda: false,
    hipermenorreia: false, gestante: false, semanas_gestacao: '', dum: '', alcoolista: false,
    transfundido: false, aspirina: false, vitaminaB12: false, vitB12_SL: false, vitB12_IM: false, ferro_oral: false, ferro_injetavel: false,
    tiroxina: false, hidroxiureia: false, anticonvulsivante: false, testosterona: false, anemiaPrevia: false, sideropenia: false, sobrecargaFerro: false, hbAlta: false, celiaco: false, g6pd: false, endometriose: false, doadorSangue: false, anemiaPrevia: false, sideropenia: false, sobrecargaFerro: false, hbAlta: false, celiaco: false, g6pd: false, endometriose: false, doadorSangue: false,
    methotrexato: false, hivTratamento: false, metformina: false, ibp: false,
  });

  const [resultado, setResultado] = useState(null);
  const [mostrarExamesExtras, setMostrarExamesExtras] = useState(false);

  // Estados de triagem (popup inicial)
  const [showTriagem, setShowTriagem] = useState(true);
  const [triagemResultado, setTriagemResultado] = useState(null);
  const [triagemInputs, setTriagemInputs] = useState(null);
  const [showAfiliados, setShowAfiliados] = useState(false);
  const [showAfiliadosBanner, setShowAfiliadosBanner] = useState(false);
  const [afiliadoEndereco, setAfiliadoEndereco] = useState('');
  const [afiliadoPix, setAfiliadoPix] = useState('');
  const [afiliadoSalvando, setAfiliadoSalvando] = useState(false);
  const [afiliadoSalvo, setAfiliadoSalvo] = useState(false);
  const [afiliadoCEP, setAfiliadoCEP] = useState('');
  const [afiliadoCPF, setAfiliadoCPF] = useState('');
  const refAfilCEP = useRef(null);
  const refAfilCPF = useRef(null);
  const [etapaAfil, setEtapaAfil] = useState(1); // 1=CEP, 2=CPF
  useEffect(() => {
    if (showAfiliados) {
      setEtapaAfil(1);
      const t = setTimeout(() => { if (refAfilCEP.current) refAfilCEP.current.focus(); }, 250);
      return () => clearTimeout(t);
    }
  }, [showAfiliados]);
  useEffect(() => {
    if (!showAfiliados) return;
    if (etapaAfil !== 1) return;
    const d = (afiliadoCEP || '').replace(/\D/g, '');
    if (d.length === 8) {
      const t = setTimeout(() => {
        setEtapaAfil(2);
        if (refAfilCPF.current) refAfilCPF.current.focus();
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [afiliadoCEP, showAfiliados, etapaAfil]);
  const [pixTipo, setPixTipo] = useState(''); // '' | 'telefone' | 'cpf' | 'email' | 'outra'
  // Fluxo convite afiliado pos-primeira-avaliacao
  const [showConviteAfiliado, setShowConviteAfiliado] = useState(false);
  // Destino apos completar/recusar convite afiliado: 'aprofundar' | 'landing'
  const [destinoAposConvite, setDestinoAposConvite] = useState(null);
  // Dados vieram da triagem -> campos travados ate clicar Editar
  const [dadosVieramDaTriagem, setDadosVieramDaTriagem] = useState(false);
  const [editandoDadosPaciente, setEditandoDadosPaciente] = useState(false);
  const refDataColetaForm = useRef(null);
  const refHbForm = useRef(null);
  const refVcmForm = useRef(null);
  const refRdwForm = useRef(null);
  const [conviteRecusado, setConviteRecusado] = useState(false);
  // __B4_PODE_CONVITE__ convite afiliado so para medico realmente nao cadastrado
  function podeConvite() {
    try { if (localStorage.getItem('medico_crm')) return false; } catch(e) {}
    return !cadastrado;
  }
  const [showAuthMedicoOverlay, setShowAuthMedicoOverlay] = useState(false);
  const [showFelicitacoes, setShowFelicitacoes] = useState(false);
  const [showBeneficios, setShowBeneficios] = useState(false);

  useEffect(() => {
    if (preFlag === 'bariatrica') {
      setInputs(prev => ({ ...prev, bariatrica: true }))
    }
  }, [preFlag]);

  // __ABRIR_LOGIN_MEDICO__ Se a landing pediu login (MEDICO AFILIADO/LOGIN),
  // abre o AuthMedico em modo 'login' ao montar.
  useEffect(() => {
    let pedirLogin = false;
    try { pedirLogin = localStorage.getItem('rf_open_login') === '1'; } catch(e) {}
    if (pedirLogin) {
      try { localStorage.removeItem('rf_open_login'); } catch(e) {}
      setShowAuthMedicoOverlay('login');
    }
  }, []);
  const [copiado, setCopiado] = useState(false);
  const [showOBA, setShowOBA] = useState(false);
  const [dadosOBAColetados, setDadosOBAColetados] = useState(null);
  const [erros, setErros] = useState({});
  const [aberrantes, setAberrantes] = useState({});
  const [showSobre, setShowSobre] = useState(false);
  const [showSaibaMais, setShowSaibaMais] = useState(false);
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [showAdminConfig, setShowAdminConfig] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);
  const logoClickTimer = useRef(null);
  const dadosOBARef = useRef(null);

  // Dados do médico para uso no resultado (nome, crm, celular)
  const [medicoDados, setMedicoDados] = useState(null);

  useEffect(() => {
    async function carregarMedico() {
      // Verificar timeout de sessão (8 horas)
      const loginAt = localStorage.getItem('medico_login_at')
      const OITO_HORAS = 8 * 60 * 60 * 1000
      if (loginAt && Date.now() - parseInt(loginAt) > OITO_HORAS) {
        localStorage.removeItem('medico_crm')
        localStorage.removeItem('medico_nome')
        localStorage.removeItem('medico_login_at')
        setSessaoExpirada(true)
        return
      }
      if (!medicoCRM) return;
      const { data } = await supabase
        .from('medicos')
        .select('nome, crm, celular, email')
        .eq('crm', medicoCRM)
        .maybeSingle();
      if (data) setMedicoDados(data);
    }
    carregarMedico();
  }, [medicoCRM]);

  function carregarDemo(sexo) {
    const hoje = new Date().toISOString().split('T')[0];
    if (sexo === 'F') {
      setInputs({ cpf: '', sexo: 'F', idade: '35', dataColeta: hoje, ferritina: '8', hemoglobina: '10.5', vcm: '72', rdw: '16.5', satTransf: '8', bariatrica: false, vegetariano: false, perda: true, hipermenorreia: false, gestante: false, alcoolista: false, transfundido: false, aspirina: false, vitaminaB12: false, ferro_oral: true });
    } else {
      setInputs({ cpf: '', sexo: 'M', idade: '42', dataColeta: hoje, ferritina: '12', hemoglobina: '11.5', vcm: '75', rdw: '17', satTransf: '10', bariatrica: false, vegetariano: false, perda: true, hipermenorreia: false, gestante: false, alcoolista: false, transfundido: false, aspirina: false, vitaminaB12: false, ferro_oral: true });
    }
    setResultado(null); setErros({});
    setShowDemoMenu(false);
  }

  function handleLogoTripleClick() {
    // Demo por cliques na fada desativado — use Ctrl+M/N/F/G
    setLogoClicks(prev => {
      const next = prev + 1;
      if (logoClickTimer.current) clearTimeout(logoClickTimer.current);
      if (next >= 5) {
        logoClickTimer.current = null;
        setShowAdminConfig(true);
        return 0;
      }
      logoClickTimer.current = setTimeout(() => setLogoClicks(0), 1500);
      return next;
    });
  }

  useEffect(() => {
    function handleKeyDown(e) {
      if (!e.ctrlKey || !e.shiftKey) return;
      if (e.key === 'F' || e.key === 'f') { e.preventDefault(); carregarDemo('F'); }
      if (e.key === 'M' || e.key === 'm') { e.preventDefault(); carregarDemo('M'); }
    }
    function handleDemoKey(e) {
      if (!e.ctrlKey || e.shiftKey || e.altKey) return;
      const hoje = new Date().toISOString().split('T')[0];
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setInputs(p => ({ ...p, sexo:'M', idade:'20', dataColeta:hoje, ferritina:'', hemoglobina:'', vcm:'', rdw:'', satTransf:'' }));
        setResultado(null); setErros({});
      }
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        setInputs(p => ({ ...p, sexo:'M', idade:'50', dataColeta:hoje, ferritina:'', hemoglobina:'', vcm:'', rdw:'', satTransf:'' }));
        setResultado(null); setErros({});
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setInputs(p => ({ ...p, sexo:'F', idade:'20', dataColeta:hoje, ferritina:'', hemoglobina:'', vcm:'', rdw:'', satTransf:'' }));
        setResultado(null); setErros({});
      }
      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        setInputs(p => ({ ...p, sexo:'F', idade:'50', dataColeta:hoje, ferritina:'', hemoglobina:'', vcm:'', rdw:'', satTransf:'' }));
        setResultado(null); setErros({});
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keydown', handleDemoKey);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keydown', handleDemoKey);
    };
  }, []);

  function formatarCPF(valor) {
    const digits = valor.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return digits.slice(0,3) + '.' + digits.slice(3);
    if (digits.length <= 9) return digits.slice(0,3) + '.' + digits.slice(3,6) + '.' + digits.slice(6);
    return digits.slice(0,3) + '.' + digits.slice(3,6) + '.' + digits.slice(6,9) + '-' + digits.slice(9);
  }

  const LIMITES_ABERRANTE = {
    ferritina:   { min: 1,   max: 5000 },
    hemoglobina: { min: 4,   max: 22   },
    vcm:         { min: 50,  max: 140  },
    rdw:         { min: 8,   max: 30   },
    satTransf:   { min: 1,   max: 99   },
  };

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    // __MASCARA_DATACOLETA__ aplica mascara DD/MM/AAAA na data da coleta
    if (name === 'dataColeta' && typeof value === 'string') {
      const digits = value.replace(/\D/g, '').slice(0, 8);
      let v = digits;
      if (digits.length > 4) v = digits.slice(0,2) + '/' + digits.slice(2,4) + '/' + digits.slice(4);
      else if (digits.length > 2) v = digits.slice(0,2) + '/' + digits.slice(2);
      setInputs(prev => ({ ...prev, dataColeta: v }));
      if (erros.dataColeta) setErros(prev => ({ ...prev, dataColeta: null }));
      return;
    }
    // Caso especial: dataNascimento -> aplica mascara, calcula idade, seta ambos
    if (name === 'dataNascimento') {
      const digits = String(value).replace(/\D/g, '').slice(0, 8);
      let dn = digits;
      if (digits.length > 2 && digits.length <= 4) dn = digits.slice(0,2) + '/' + digits.slice(2);
      else if (digits.length > 4) dn = digits.slice(0,2) + '/' + digits.slice(2,4) + '/' + digits.slice(4);
      // Calcula idade se DN completa e valida
      let idadeCalc = '';
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dn)) {
        const [d, m, a] = dn.split('/').map(Number);
        const dt = new Date(a, m - 1, d);
        const valida = dt.getFullYear() === a && dt.getMonth() === m - 1 && dt.getDate() === d;
        if (valida && a >= 1900 && dt <= new Date()) {
          const hoje = new Date();
          let idade = hoje.getFullYear() - a;
          const mDiff = hoje.getMonth() - (m - 1);
          if (mDiff < 0 || (mDiff === 0 && hoje.getDate() < d)) idade--;
          idadeCalc = String(idade);
        }
      }
      setInputs(prev => ({ ...prev, dataNascimento: dn, idade: idadeCalc }));
      if (erros.dataNascimento) setErros(prev => ({ ...prev, dataNascimento: null }));
      if (erros.idade) setErros(prev => ({ ...prev, idade: null }));
      return;
    }
    // Decimais clinicos: aceita virgula, salva com ponto
    let valorAjustado = (type === 'checkbox') ? checked : value;
    if (['hemoglobina', 'vcm', 'rdw', 'ferritina', 'satTransf'].includes(name) && typeof valorAjustado === 'string') {
      valorAjustado = valorAjustado.replace(',', '.');
    }
    const novoValor = name === 'cpf' ? formatarCPF(valorAjustado) : valorAjustado;
    setInputs(prev => ({ ...prev, [name]: novoValor }));
    if (erros[name]) setErros(prev => ({ ...prev, [name]: null }));
    if (name === 'bariatrica') {
      if (!checked) setDadosOBAColetados(null);
    }
    if (name === 'bariatrica_medico') {
      if (checked) setInputs(prev => ({ ...prev, bariatrica: true, bariatrica_medico: true }));
      else setInputs(prev => ({ ...prev, bariatrica_medico: false }));
    }
    // Crítica de valor aberrante
    if (LIMITES_ABERRANTE[name] && value !== '') {
      const num = parseFloat(String(value).replace(',', '.'));
      const lim = LIMITES_ABERRANTE[name];
      if (!isNaN(num) && (num < lim.min || num > lim.max)) {
        setAberrantes(prev => ({ ...prev, [name]: true }));
      } else {
        setAberrantes(prev => ({ ...prev, [name]: false }));
      }
    }
  }

  function validarCPF(cpf) {
    const c = String(cpf || '').replace(/\D/g, '');
    if (c.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(c)) return false; // todos iguais
    let s = 0;
    for (let i = 0; i < 9; i++) s += parseInt(c[i]) * (10 - i);
    let d1 = (s * 10) % 11;
    if (d1 === 10) d1 = 0;
    if (d1 !== parseInt(c[9])) return false;
    s = 0;
    for (let i = 0; i < 10; i++) s += parseInt(c[i]) * (11 - i);
    let d2 = (s * 10) % 11;
    if (d2 === 10) d2 = 0;
    return d2 === parseInt(c[10]);
  }

  function validar() {
    const novosErros = {};
    if (!inputs.cpf || !inputs.cpf.trim()) novosErros.cpf = 'Informe o CPF do paciente';
    else if (!validarCPF(inputs.cpf)) novosErros.cpf = 'CPF inválido';
    // Validacao: Data de Nascimento (UI) -> idade calculada (interna)
    {
      const dn = String(inputs.dataNascimento || '').trim();
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dn)) {
        novosErros.dataNascimento = 'Use o formato DD/MM/AAAA';
      } else {
        const [d, m, a] = dn.split('/').map(Number);
        const dt = new Date(a, m - 1, d);
        const valida = dt.getFullYear() === a && dt.getMonth() === m - 1 && dt.getDate() === d;
        if (!valida) {
          novosErros.dataNascimento = 'Data invalida';
        } else if (a < 1900) {
          novosErros.dataNascimento = 'Verifique o ano de nascimento';
        } else if (dt > new Date()) {
          novosErros.dataNascimento = 'Data nao pode ser no futuro';
        } else {
          const hoje = new Date();
          let idade = hoje.getFullYear() - a;
          const mDiff = hoje.getMonth() - (m - 1);
          if (mDiff < 0 || (mDiff === 0 && hoje.getDate() < d)) idade--;
          if (idade < 12) {
            novosErros.dataNascimento = 'O RedFairy ainda nao atende criancas menores de 12 anos. Em breve teremos um modulo pediatrico especifico!';
          } else if (idade > 100) {
            novosErros.dataNascimento = 'Verifique a data de nascimento';
          }
        }
      }
    }
    if (!inputs.dataColeta) novosErros.dataColeta = 'Informe a data da coleta';
    else {
      const hojeStr = new Date().toISOString().split('T')[0];
      if (inputs.dataColeta > hojeStr) novosErros.dataColeta = 'Data da coleta não pode ser no futuro';
    }
    // Triagem (sempre obrigatorios): Hb, VCM, RDW
    if (!inputs.hemoglobina) novosErros.hemoglobina = 'Campo obrigatório';
    if (!inputs.vcm)         novosErros.vcm = 'Campo obrigatório';
    if (!inputs.rdw)         novosErros.rdw = 'Campo obrigatório';
    // Avaliacao completa (so se mostrarExamesExtras): Ferritina e Sat. Transferrina
    if (mostrarExamesExtras && !inputs.ferritina) novosErros.ferritina = 'Campo obrigatório';
    if (mostrarExamesExtras && !inputs.satTransf) novosErros.satTransf = 'Campo obrigatório';
    return novosErros;
  }

  function sanitizarNumero(valor) {
    if (!valor && valor !== 0) return valor;
    const str = String(valor).trim();
    const semMilhar = str.replace(/\.(?=\d{3}(?!\d))/g, '');
    const comPontoDecimal = semMilhar.replace(',', '.');
    const num = parseFloat(comPontoDecimal);
    if (!isNaN(num)) return String(Math.round(num));
    return comPontoDecimal;
  }


  async function handleSubmit(e) {
    e.preventDefault();
    const novosErros = validar();
    if (Object.keys(novosErros).length > 0) { setErros(novosErros); return; }

    const inputsNumericos = {
      ...inputs,
      idade: Number(inputs.idade),
      data_nascimento: (() => {
        const dn = String(inputs.dataNascimento || '').trim();
        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dn)) return null;
        const [d, m, a] = dn.split('/').map(Number);
        return `${a}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      })(),
      ferritina:   Number(sanitizarNumero(inputs.ferritina)),
      hemoglobina: Number(sanitizarNumero(inputs.hemoglobina)),
      vcm:         Number(sanitizarNumero(inputs.vcm)),
      rdw:         Number(sanitizarNumero(inputs.rdw)),
      satTransf:   Number(sanitizarNumero(inputs.satTransf)),
    };

    // Roteamento: triagem (Hb/VCM/RDW) ou avaliacao completa (5 valores)
    const res = mostrarExamesExtras
      ? avaliarPaciente(inputsNumericos)
      : triagemEritron(inputsNumericos);

    let obaResult = null;
    // OBA só é processado se o paciente já preencheu a anamnese (Modo Paciente).
    // No Modo Médico, a flag bariatrica é apenas registrada — paciente preenche depois.
    const obaDisponivel = dadosOBAColetados || dadosOBARef.current;
    if (inputs.bariatrica && obaDisponivel) {
      let dadosOBA = null;
      let examesOBA = null;
      if (obaDisponivel) {
        dadosOBA  = obaDisponivel.dadosOBA;
        examesOBA = obaDisponivel.examesOBA;
      } else if (inputs.cpf.trim()) {
        const cpfLimpo = inputs.cpf.replace(/\D/g, '');
        const { data: obaRow } = await supabase
          .from('oba_anamnese')
          .select('*')
          .eq('cpf', cpfLimpo)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (obaRow) {
          dadosOBA = {
            sexo: obaRow.sexo, idade: inputs.idade,
            tipo_cirurgia: obaRow.tipo_cirurgia,
            meses_pos_cirurgia: obaRow.meses_pos_cirurgia,
            peso_antes: obaRow.peso_antes, peso_atual: obaRow.peso_atual,
            peso_minimo_pos: obaRow.peso_minimo_pos,
            ganhou_peso_apos: obaRow.ganhou_peso_apos,
            fez_plasma_argonio: obaRow.fez_plasma_argonio,
            status_glicemico: obaRow.status_glicemico,
            status_pressorico: obaRow.status_pressorico,
            status_osseo: obaRow.status_osseo,
            status_dental: obaRow.status_dental,
            status_gestacional: obaRow.status_gestacional,
            semanas_gestacao: obaRow.semanas_gestacao,
            compulsoes: obaRow.compulsoes || [],
            medicamentos: obaRow.medicamentos || [],
            atividade_fisica: obaRow.atividade_fisica || [],
            emagrecedores: obaRow.emagrecedores || {},
            trombose: obaRow.trombose,
            investigou_trombose: obaRow.investigou_trombose,
            usa_anticoagulante: obaRow.usa_anticoagulante,
            usou_anticoagulante: obaRow.usou_anticoagulante,
            varizes: obaRow.varizes, varizes_grau: obaRow.varizes_grau,
            varizes_esofago: obaRow.varizes_esofago,
            operou_varizes_esofago: obaRow.operou_varizes_esofago,
            meta_peso: obaRow.meta_peso, meta_kg: obaRow.meta_kg,
            projetos_vida: obaRow.projetos_vida || [],
          };
          examesOBA = {
            vitamina_b12: obaRow.vitamina_b12, vitamina_d: obaRow.vitamina_d,
            zinco: obaRow.zinco, vitamina_a: obaRow.vitamina_a,
            vitamina_e: obaRow.vitamina_e, tiamina: obaRow.tiamina,
            selenio: obaRow.selenio, folatos: obaRow.folatos,
            hb_glicada: obaRow.hb_glicada, glicemia: obaRow.glicemia,
            insulina: obaRow.insulina, triglicerides: obaRow.triglicerides,
            ast: obaRow.ast, alt: obaRow.alt, gama_gt: obaRow.gama_gt,
            creatinina: obaRow.creatinina, acido_urico: obaRow.acido_urico,
            tsh: obaRow.tsh, testosterona: obaRow.testosterona,
            estradiol: obaRow.estradiol, psa_total: obaRow.psa_total,
            ca199: obaRow.ca199, cea: obaRow.cea,
          };
        }
      }

      if (!dadosOBA) {
        dadosOBA = {
          sexo: inputs.sexo, idade: inputs.idade,
          tipo_cirurgia: 'NÃO SEI', meses_pos_cirurgia: 0,
          status_gestacional: inputs.gestante ? 'GRÁVIDA' : null,
          compulsoes: inputs.alcoolista ? ['ÁLCOOL'] : [],
          medicamentos: [
            ...(inputs.vitaminaB12 ? ['VIT. B12 SUBLINGUAL'] : []),
            ...(inputs.ferro_oral  ? ['FERRO ORAL']          : []),
            ...(inputs.ferro_injetavel ? ['FERRO INJETÁVEL'] : []),
          ],
          atividade_fisica: [], emagrecedores: {},
        };
        examesOBA = {};
      }

      obaResult = avaliarOBA(res, dadosOBA, examesOBA);
    }

    setResultado({ ...res, _inputs: inputsNumericos, _oba: obaResult, _medicoDados: medicoDados });
    setCopiado(false);

    if (inputs.cpf.trim() && res.encontrado) {
      // Verificar se é primeira avaliação do médico
      const { count: totalAvals } = await supabase
        .from('avaliacoes')
        .select('*', { count: 'exact', head: true })
        .eq('medico_crm', medicoCRM)
      // Verificar se já tem endereco e pix cadastrados
      const { data: medDados } = await supabase
        .from('medicos')
        .select('cep, cpf, pix_chave')
        .eq('crm', medicoCRM)
        .maybeSingle()
      if (!medDados?.cep || !medDados?.cpf || !medDados?.pix_chave) {
        if ((totalAvals || 0) === 0) {
          // Primeira avaliação — modal completo
          setTimeout(() => setShowAfiliados(true), 1200)
        } else {
          // Avaliações seguintes — banner menor
          setTimeout(() => setShowAfiliadosBanner(true), 1200)
        }
      }

      await supabase.from('avaliacoes').insert({
        cpf: inputs.cpf.replace(/\D/g, ''),
        data_coleta: inputs.dataColeta,
        ferritina: Number(inputs.ferritina),
        hemoglobina: Number(inputs.hemoglobina),
        vcm: Number(inputs.vcm),
        rdw: Number(inputs.rdw),
        sat_transf: Number(inputs.satTransf),
        bariatrica: inputs.bariatrica || inputs.bariatrica_medico,
        bariatrica_medico: inputs.bariatrica_medico || false,
        vegetariano: inputs.vegetariano,
        perda: inputs.perda,
        hipermenorreia: inputs.hipermenorreia,
        gestante: inputs.gestante,
        semanas_gestacao: inputs.gestante && inputs.semanas_gestacao ? Number(inputs.semanas_gestacao) : null,
        dum: inputs.gestante && inputs.dum ? inputs.dum : null,
        aspirina: inputs.aspirina,
        vitamina_b12: inputs.vitaminaB12,
        vitb12_sl: inputs.vitB12_SL,
        vitb12_im: inputs.vitB12_IM,
        ferro_oral: inputs.ferro_oral,
        ferro_injetavel: inputs.ferro_injetavel,
        diagnostico_label: res.label,
        diagnostico_color: res.color,
        medico_crm: medicoCRM || null,
      });
    }

    setTimeout(() => { document.getElementById('resultado')?.scrollIntoView({ behavior: 'smooth' }); }, 100);
  }

  function handleCopiar() {
    if (!resultado) return;
    const texto = formatarParaCopiar(resultado, resultado._inputs);
    navigator.clipboard.writeText(texto).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 3000); });
  }

  function handleLimpar() {
    setInputs({ cpf: '', sexo: 'M', idade: '', dataNascimento: '', dataColeta: '', ferritina: '', hemoglobina: '', vcm: '', rdw: '', satTransf: '', bariatrica: false, vegetariano: false, perda: false, hipermenorreia: false, gestante: false, alcoolista: false, transfundido: false, aspirina: false, vitaminaB12: false, vitB12_SL: false, vitB12_IM: false, ferro_oral: false, ferro_injetavel: false, tiroxina: false, hidroxiureia: false, anticonvulsivante: false, testosterona: false, anemiaPrevia: false, sideropenia: false, sobrecargaFerro: false, hbAlta: false, celiaco: false, g6pd: false, endometriose: false, doadorSangue: false, anemiaPrevia: false, sideropenia: false, sobrecargaFerro: false, hbAlta: false, celiaco: false, g6pd: false, endometriose: false, doadorSangue: false, methotrexato: false, hivTratamento: false, metformina: false, ibp: false });
    setResultado(null); setErros({}); setDadosOBAColetados(null); setMostrarExamesExtras(false);
  }

  return (
    <>
      {showTriagem && (
        <TriagemModal
          modoMedico={true}
          onConcluir={(resultado, novosInputs) => {
            setTriagemResultado(resultado);
            setTriagemInputs(novosInputs);
            setDadosVieramDaTriagem(true);
            setEditandoDadosPaciente(false);
            // pre-preenche o form principal
            setInputs(prev => ({
              ...prev,
              cpf: novosInputs.cpf || prev.cpf,
              sexo: novosInputs.sexo || prev.sexo,
              idade: String(novosInputs.idade || prev.idade || ''),
              gestante: novosInputs.gestante || prev.gestante || false,
              semanas_gestacao: novosInputs.semanas_gestacao ? String(novosInputs.semanas_gestacao) : prev.semanas_gestacao,
              hemoglobina: String(novosInputs.hemoglobina || prev.hemoglobina || ''),
              vcm: String(novosInputs.vcm || prev.vcm || ''),
              rdw: String(novosInputs.rdw || prev.rdw || ''),
            }));
          }}
          onFechar={() => {
            // Usuario optou por ir direto ao form completo
            setShowTriagem(false);
            setTriagemResultado(null);
          }}
        />
      )}
      {triagemResultado && (
        <TriagemResultadoModal
          resultado={triagemResultado}
          inputs={triagemInputs}
          modoMedico={true}
          isDemo={false}
          medicoCRM={medicoCRM}
          onVoltarInicio={() => {
            setTriagemResultado(null);
            setShowTriagem(false);
            // Se medico ainda nao cadastrado, abre convite em vez de voltar a home
            if (podeConvite()) {
              setDestinoAposConvite('landing');
              setShowConviteAfiliado(true);
            } else {
              if (onVoltar) onVoltar();
            }
          }}
          onCadastrar={() => {
            setTriagemResultado(null);
            setShowTriagem(false);
            // Se medico ainda nao cadastrado, abre convite em vez de voltar a home
            if (podeConvite()) {
              setDestinoAposConvite('landing');
              setShowConviteAfiliado(true);
            } else {
              if (onVoltar) onVoltar();
            }
          }}
          onAprofundar={() => {
            // Medico clicou 'Aprofundar agora': fecha popup
            setTriagemResultado(null);
            setShowTriagem(false);
            // Se medico nao cadastrado, mostra convite antes de seguir
            if (podeConvite()) {
              setDestinoAposConvite('aprofundar');
              setShowConviteAfiliado(true);
              return;
            }
            // Se ja cadastrado: dados ficam no form (comportamento original)
          }}
        />
      )}
    <div className="min-h-screen bg-gray-50">

      {/* ── BANNER AFILIADOS (avaliações seguintes) ── */}
      {showAfiliadosBanner && !showAfiliados && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-red-700 px-5 py-3 flex items-center justify-between">
              <p className="text-white font-bold text-sm">🎯 Programa de Afiliados RedFairy</p>
              <button onClick={() => setShowAfiliadosBanner(false)} className="text-red-200 hover:text-white text-lg font-bold">✕</button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-gray-700 text-sm leading-relaxed">
                Você ainda não faz parte do <strong>Programa de Afiliados Patrocinado</strong>. Gostaria de entrar agora e receber os benefícios previstos?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowAfiliadosBanner(false); setShowAfiliados(true) }}
                  className="flex-1 bg-red-700 hover:bg-red-800 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
                  Sim, quero participar →
                </button>
                <button
                  onClick={() => setShowAfiliadosBanner(false)}
                  className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm rounded-xl transition-colors">
                  Agora não
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL PROGRAMA DE AFILIADOS ── */}
      {showAfiliados && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" style={{ maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
            {/* Imagem welcome no topo com header overlay (estilo do convite fairy-chat) */}
            <div style={{ position: 'relative', width: '100%', height: '320px', overflow: 'hidden', flexShrink: 0 }}>
              <img src={welcomeImg} alt="Bem-vindo ao Programa de Afiliados"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.92), rgba(0,0,0,0.55) 50%, transparent)', padding: '24px 24px 16px' }}>
                <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '2px', margin: 0, fontWeight: 600, textShadow: '0 2px 6px rgba(0,0,0,0.6)' }}>Bem-vindo ao</p>
                <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 800, margin: '2px 0 0', textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}>Programa de Afiliados Patrocinado</h2>
              </div>
            </div>

            {/* Corpo scrollavel */}
            <div className="p-6 space-y-4" style={{ overflowY: 'auto', flex: 1 }}>
              <p className="text-gray-700 text-sm leading-relaxed">
                Para concluir a sua inscrição no <strong>Programa de Afiliados Patrocinado</strong> de RedFairy e receber os benefícios previstos, precisamos do seu <strong>CEP</strong>, <strong>CPF</strong> e da sua <strong>chave Pix</strong>.
              </p>
              <p className="text-xs text-red-800 text-center leading-relaxed font-medium">
                🔒 Entre seus dados tranquilamente. Você está em um servidor seguro, e não existe a possibilidade de uso inadequado dessas informações.
              </p>
              <div className="space-y-3">
<div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">CEP</label>
                  <input
                    ref={refAfilCEP}
                    type="text"
                    value={afiliadoCEP}
                    onChange={e => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
                      const fmt = digits.length > 5 ? digits.slice(0,5) + '-' + digits.slice(5) : digits;
                      setAfiliadoCEP(fmt);
                    }}
                    placeholder="00000-000"
                    inputMode="numeric"
                    className={`w-full border-2 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${etapaAfil === 1 ? 'border-yellow-400 bg-yellow-50 focus:ring-yellow-400' : 'border-gray-200 focus:ring-red-400'}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">CPF</label>
                  <input
                    ref={refAfilCPF}
                    type="text"
                    value={afiliadoCPF}
                    onFocus={() => setEtapaAfil(2)}
                    onChange={e => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                      let fmt = digits;
                      if (digits.length > 9) fmt = digits.slice(0,3) + '.' + digits.slice(3,6) + '.' + digits.slice(6,9) + '-' + digits.slice(9);
                      else if (digits.length > 6) fmt = digits.slice(0,3) + '.' + digits.slice(3,6) + '.' + digits.slice(6);
                      else if (digits.length > 3) fmt = digits.slice(0,3) + '.' + digits.slice(3);
                      setAfiliadoCPF(fmt);
                      if (pixTipo === 'cpf') setAfiliadoPix(fmt);
                    }}
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    className={`w-full border-2 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${etapaAfil === 2 ? 'border-yellow-400 bg-yellow-50 focus:ring-yellow-400' : 'border-gray-200 focus:ring-red-400'}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Chave Pix</label>
                  <div className="space-y-1.5 mb-3">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="checkbox" checked={pixTipo === 'telefone'}
                        onChange={() => {
                          if (pixTipo === 'telefone') { setPixTipo(''); setAfiliadoPix(''); }
                          else { setPixTipo('telefone'); setAfiliadoPix(medicoDados?.celular || ''); }
                        }}
                        style={{ accentColor: '#7B1E1E' }} />
                      <span className="text-gray-700 font-medium" style={{ fontSize: '12px', letterSpacing: '0.3px' }}>MEU TELEFONE É O MEU PIX</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="checkbox" checked={pixTipo === 'cpf'}
                        onChange={() => {
                          if (pixTipo === 'cpf') { setPixTipo(''); setAfiliadoPix(''); }
                          else { setPixTipo('cpf'); setAfiliadoPix(afiliadoCPF); }
                        }}
                        style={{ accentColor: '#7B1E1E' }} />
                      <span className="text-gray-700 font-medium" style={{ fontSize: '12px', letterSpacing: '0.3px' }}>MEU CPF É O MEU PIX</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="checkbox" checked={pixTipo === 'email'}
                        onChange={() => {
                          if (pixTipo === 'email') { setPixTipo(''); setAfiliadoPix(''); }
                          else { setPixTipo('email'); setAfiliadoPix(medicoDados?.email || ''); }
                        }}
                        style={{ accentColor: '#7B1E1E' }} />
                      <span className="text-gray-700 font-medium" style={{ fontSize: '12px', letterSpacing: '0.3px' }}>MEU E-MAIL É O MEU PIX</span>
                    </label>
                  </div>
                  <p className="text-xs text-red-800 font-semibold mb-1">DIGITE ou marque um check-box acima</p>
                  <input
                    type="text"
                    value={afiliadoPix}
                    onChange={e => { setAfiliadoPix(e.target.value); if (pixTipo) setPixTipo('outra'); }}
                    placeholder="Chave aleatória ou outra chave PIX"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
              </div>
              {afiliadoSalvo ? (
                <p className="text-green-600 text-sm font-bold text-center">✅ Dados salvos! Bem-vindo ao Programa de Afiliados!</p>
              ) : (
                <div className="space-y-2">
                  {/* __AFIL_COND__ */}
                {afiliadoCEP.trim() && afiliadoCPF.trim() && afiliadoPix.trim() && (
                  <button
                    disabled={afiliadoSalvando || !afiliadoCEP.trim() || !afiliadoCPF.trim() || !afiliadoPix.trim()}
                    onClick={async () => {
                      setAfiliadoSalvando(true);
                      const { error } = await supabase
                        .from('medicos')
                        .update({
                          endereco: '',
                          cep: afiliadoCEP.trim(),
                          cpf: afiliadoCPF.replace(/\D/g, ''),
                          pix_chave: afiliadoPix.trim(),
                        })
                        .eq('crm', medicoCRM);
                      setAfiliadoSalvando(false);
                      if (error) {
                        alert('Erro ao salvar. Tente novamente.');
                        return;
                      }
                      setAfiliadoSalvo(true); setTimeout(() => { setShowAfiliados(false); setShowFelicitacoes(true); }, 1500);
                    }}
                    className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    {afiliadoSalvando ? 'Salvando...' : 'Confirmar dados →'}
                  </button>
                )}
                  <button
                    onClick={() => setShowAfiliados(false)}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-xl text-sm transition-colors">
                    Preencher depois
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showOBA && (
        <OBAModal
          sexo={inputs.sexo}
          cpf={inputs.cpf}
          idade={inputs.idade || '0'}
          examesRedFairy={{
            ferritina: inputs.ferritina,
            hemoglobina: inputs.hemoglobina,
            vcm: inputs.vcm,
            rdw: inputs.rdw,
            satTransf: inputs.satTransf,
            dataColeta: inputs.dataColeta,
          }}
          dadosRedFairy={{
            gestante: inputs.gestante,
            semanas_gestacao: inputs.semanas_gestacao ? Number(inputs.semanas_gestacao) : null,
            dum: inputs.dum || null,
          }}
          onConcluir={(dadosOBA, examesOBA) => {
            const dados = { dadosOBA, examesOBA };
            dadosOBARef.current = dados;
            setDadosOBAColetados(dados);
            setShowOBA(false);
            // Chamar avaliação automaticamente com os dados OBA recém coletados
            setTimeout(() => {
              document.getElementById('btn-avaliar-paciente')?.click();
            }, 100);
          }}
          onFechar={() => setShowOBA(false)}
        />
      )}

      <header className="bg-red-900 text-white py-4 px-4 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={onVoltar}
              className="bg-gray-200 hover:bg-gray-300 text-red-800 rounded-lg px-3 py-1 text-xs font-bold whitespace-nowrap transition-colors">
              Voltar
            </button>
          </div>
          <div className="flex items-center gap-3">
            <img src={logo} alt="RedFairy" className="w-8 h-8 object-contain"
              style={{ filter: 'brightness(10)', cursor: 'pointer' }}
              onClick={handleLogoTripleClick} />
            <div>
              <h1 className="text-xl font-bold tracking-wide leading-tight">RedFairy</h1>
              <p className="text-red-200 text-xs">Calculadora Clínica | Eritron</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {medicoNome && (
              <div title={`${medicoNome} | ${medicoCRM}`}
                className="w-9 h-9 rounded-full bg-white flex items-center justify-center flex-shrink-0 cursor-default"
                style={{ border: '2px solid rgba(255,255,255,0.4)' }}>
                <span className="text-red-700 font-black text-xs">
                  {medicoNome.split(' ').slice(0,2).map(p => p[0]).join('').toUpperCase()}
                </span>
              </div>
            )}
            <button onClick={() => setShowLogoutConfirm(true)}
              className="bg-gray-200 hover:bg-gray-300 text-red-800 rounded-lg px-3 py-1 text-xs font-bold whitespace-nowrap transition-colors">
              Sair
            </button>
            <button onClick={() => setShowSobre(true)}
              className="bg-gray-200 hover:bg-gray-300 text-red-800 rounded-lg px-3 py-1 text-xs font-bold whitespace-nowrap transition-colors">
              Sobre
            </button>
          </div>
        </div>
      </header>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setShowLogoutConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-72 space-y-4" onClick={e => e.stopPropagation()}>
            <p className="text-center text-base font-bold text-gray-700">Trocar médico?</p>
            <p className="text-center text-sm text-gray-500">Você será desconectado e voltará à tela de login.</p>
            <button onClick={() => { setShowLogoutConfirm(false); onLogout(); }}
              className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors">
              Sim, sair
            </button>
            <button onClick={() => setShowLogoutConfirm(false)}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm py-2 rounded-xl transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {showAdminConfig && <AdminConfigModal onFechar={() => setShowAdminConfig(false)} />}

      {showDemoMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setShowDemoMenu(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-64 space-y-4" onClick={e => e.stopPropagation()}>
            <p className="text-center text-sm font-bold text-gray-700">🎭 Modo Demo</p>
            <p className="text-center text-xs text-gray-400">Escolha o perfil de teste</p>
            <button onClick={() => carregarDemo('F')} className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 rounded-xl transition-colors">👩 Paciente Feminina</button>
            <button onClick={() => carregarDemo('M')} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors">👨 Paciente Masculino</button>
            <button onClick={() => setShowDemoMenu(false)} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm py-2 rounded-xl transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      {showSobre && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => { setShowSobre(false); setShowSaibaMais(false); }}>
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl" style={{ maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ position: 'relative', width: '100%', height: '320px', overflow: 'hidden', borderRadius: '16px 16px 0 0' }}>
              <img src={heroImg} alt="RedFairy" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', padding: '20px' }}>
                <p style={{ color: '#fca5a5', fontSize: '14px', lineHeight: '1.8', fontStyle: 'italic', margin: 0, textAlign: 'center' }}>
                  Eu sou a sua fada vermelha, a sua <span style={{ fontWeight: 'bold' }}>HEMOGLOBINA</span>.<br />
                  Eu uso a poeira das estrelas para te entregar o ar.<br />
                  <span style={{ fontWeight: '600' }}>Quanto tempo você vive sem ar?</span>
                </p>
              </div>
            </div>
            <div style={{ padding: '20px' }}>
              {!showSaibaMais && (
                <button onClick={() => setShowSaibaMais(true)} className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl text-sm transition-colors mb-4">Saiba Mais</button>
              )}
              {showSaibaMais && (
                <div style={{ marginBottom: '16px' }}>
                  <h3 className="text-red-700 font-bold text-base text-center mb-4">Vida é ventilação e perfusão</h3>
                  <p className="text-gray-700 text-sm leading-relaxed mb-3">O Ferro em você veio das estrelas, e dele o vermelho do seu sangue - a sua potência. Com Ferro, a Natureza faz a <strong>Hemoglobina</strong>, a proteína vermelha e mais importante da sua vida.</p>
                  <p className="text-gray-700 text-sm leading-relaxed mb-3">Ela sustenta a ventilação e realiza a perfusão: capta o oxigênio do ar que ventila os pulmões e o entrega a todas as suas células - vinte vezes por minuto.</p>
                  <p className="text-gray-700 text-sm leading-relaxed mb-3">Ao mesmo tempo, a Hemoglobina captura o CO2 produzido pela queima do alimento em suas células, e o leva aos seus pulmões para que você o expire no ar do mundo.</p>
                  <p className="text-gray-700 text-sm leading-relaxed mb-3">No ambiente, uma proteína verde - a <strong>clorofila</strong>, mãe da Hemoglobina - usa a luz do sol para partir o CO2 e fazer açúcar a partir de luz, carbono e água, devolvendo o oxigênio ao ar do planeta, em um ciclo virtuoso perfeito.</p>
                  <div className="mt-4 bg-pink-50 border-2 border-red-400 rounded-xl p-4 text-center">
                    <p className="text-black font-bold text-sm">Portanto, é importante que você cuide da sua Hemoglobina.</p>
                    <p className="text-black font-bold text-sm mt-2">Nós ajudamos.</p>
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-gray-500 text-xs font-medium">RT | E.F. Ramos, M.D.</p>
                    <p className="text-red-700 text-xs mt-1">drestacioramos.com.br</p>
                  </div>
                </div>
              )}
              <button onClick={() => { setShowSobre(false); setShowSaibaMais(false); }} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-xl text-sm transition-colors">Fechar</button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-3 py-5">
        <form onSubmit={handleSubmit} className="space-y-4">

          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-700 flex items-center gap-2">
                <IconPaciente /> Dados do Paciente
              </h2>
              {dadosVieramDaTriagem && !editandoDadosPaciente && (
                <button type="button" onClick={() => setEditandoDadosPaciente(true)}
                  className="flex items-center gap-1 text-xs font-bold text-red-700 hover:text-red-800 transition-colors">
                  <span style={{ fontSize: '0.9rem' }}>✏️</span> EDITAR
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">CPF</label>
                <input type="text" name="cpf" value={inputs.cpf} onChange={handleChange} disabled={dadosVieramDaTriagem && !editandoDadosPaciente} placeholder="000.000.000-00" maxLength={14} inputMode="numeric" className={`input ${dadosVieramDaTriagem && !editandoDadosPaciente ? 'bg-gray-100 text-gray-500' : ''}`} />
                <p className="text-xs text-gray-400 mt-0.5">Vincula ao paciente</p>
                <p className="text-xs text-orange-500 mt-0.5">Digite apenas os números, sem pontos ou hífen</p>
                {erros.cpf && <p className="text-red-500 text-xs mt-1">{erros.cpf}</p>}
              </div>
              <div>
                <label className="label">Sexo</label>
                <select name="sexo" value={inputs.sexo} onChange={handleChange} disabled={dadosVieramDaTriagem && !editandoDadosPaciente} className={`input ${dadosVieramDaTriagem && !editandoDadosPaciente ? 'bg-gray-100 text-gray-500' : ''}`}>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </select>
              </div>
              <div>
                <label className="label">Data de Nascimento</label>
                <input type="text" name="dataNascimento" value={inputs.dataNascimento} onChange={handleChange} disabled={dadosVieramDaTriagem && !editandoDadosPaciente} placeholder="DD/MM/AAAA" inputMode="numeric" maxLength={10} autoComplete="off" className={`input ${erros.dataNascimento ? 'border-red-500' : ''} ${dadosVieramDaTriagem && !editandoDadosPaciente ? 'bg-gray-100 text-gray-500' : ''}`} />
                {inputs.idade && !erros.dataNascimento && <p className="text-red-600 text-xs mt-1 font-semibold">Idade: {inputs.idade} anos</p>}
                {erros.dataNascimento && <p className="text-red-500 text-xs mt-1">{erros.dataNascimento}</p>}
              </div>
              <div className="col-span-2">
                <label className={`flex items-start gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${inputs.bariatrica_medico ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                  <input type="checkbox" name="bariatrica_medico" checked={inputs.bariatrica_medico} onChange={handleChange} disabled={dadosVieramDaTriagem && !editandoDadosPaciente} className="mt-0.5 w-4 h-4 cursor-pointer flex-shrink-0 disabled:opacity-50" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm leading-tight">
                      {inputs.sexo === 'F' ? 'Paciente Bariátrica' : 'Paciente Bariátrico'}
                    </p>
                    <p className="text-xs opacity-70 leading-tight mt-0.5">
                      {inputs.sexo === 'F'
                        ? 'Se a paciente avaliada é BARIÁTRICA ela receberá a ANAMNESE do Projeto OBA, e passará a ter o acompanhamento dinâmico para a melhor qualidade de vida.'
                        : 'Se o paciente avaliado é BARIÁTRICO ele receberá a ANAMNESE do Projeto OBA, e passará a ter o acompanhamento dinâmico para a melhor qualidade de vida.'}
                    </p>
                  </div>
                </label>
                
              </div>
            </div>
          </section>

          {/* __DATA_COLETA_SEAMLESS__ Data da Coleta - fora do quadro, amarelo, seamless */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <label className="label">Data da Coleta</label>
            <input
              ref={refDataColetaForm}
              type="text"
              name="dataColeta"
              value={inputs.dataColeta}
              onChange={handleChange}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (refHbForm.current) refHbForm.current.focus();
                }
              }}
              inputMode="numeric"
              maxLength={10}
              placeholder="DD/MM/AAAA"
              className={`w-full border-2 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                erros.dataColeta ? 'border-red-500' : 'border-yellow-400 bg-yellow-50 focus:ring-yellow-400'
              }`}
            />
            {erros.dataColeta && <p className="text-red-500 text-xs mt-1">{erros.dataColeta}</p>}
            <p className="text-xs text-gray-400 mt-1">Digite a data e tecle ENTER</p>
          </div>

          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <IconExames /> Exames Laboratoriais
            </h2>
            {/* TRIAGEM: Hb, VCM, RDW (sempre habilitados) - 3 colunas */}
            <div className="grid grid-cols-3 gap-3">
              <LabInput ref={refHbForm} onEnter={() => refVcmForm.current && refVcmForm.current.focus()} label="Hemoglobina" unit="g/dL" name="hemoglobina" reference={inputs.sexo === 'M' ? '13.5-17.5' : '12-15.5'} value={inputs.hemoglobina} onChange={handleChange} error={erros.hemoglobina} aberrante={!!aberrantes["hemoglobina"]} borderColor="red" />
              <LabInput ref={refVcmForm} onEnter={() => refRdwForm.current && refRdwForm.current.focus()} label="VCM" unit="fL" name="vcm" reference="80-100" value={inputs.vcm} onChange={handleChange} error={erros.vcm} aberrante={!!aberrantes["vcm"]} borderColor="red" />
              <LabInput ref={refRdwForm} onEnter={() => refRdwForm.current && refRdwForm.current.blur()} label="RDW-CV" unit="%" name="rdw" reference="11.5-15" value={inputs.rdw} onChange={handleChange} error={erros.rdw} aberrante={!!aberrantes["rdw"]} borderColor="red" />
            </div>

            {/* CTA: botao para liberar exames extras */}
            {!mostrarExamesExtras && (
              <button
                type="button"
                onClick={() => setMostrarExamesExtras(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 px-4 rounded-xl transition-colors text-sm flex flex-col items-center mt-3"
              >
                <span>📋 JÁ TENHO A FERRITINA E A SATURAÇÃO DA TRANSFERRINA</span>
                <span className="text-xs font-normal opacity-90 mt-1">Aprofundar o diagnóstico</span>
              </button>
            )}

            {/* APROFUNDAMENTO: Ferritina e Sat - 2 colunas */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <LabInput
                label="Ferritina"
                unit="ng/mL"
                name="ferritina"
                reference={inputs.sexo === 'M' ? '24-336' : '25-150'}
                value={inputs.ferritina}
                onChange={handleChange}
                error={erros.ferritina}
                hint={mostrarExamesExtras ? "Não use ponto para valores superiores a 1000. Ex: 1140" : "Clique no botão azul para liberar"}
                aberrante={!!aberrantes["ferritina"]}
                disabled={!mostrarExamesExtras}
                borderColor="blue"
              />
              <LabInput
                label="Sat. Transferrina"
                unit="%"
                name="satTransf"
                reference="20-50"
                value={inputs.satTransf}
                onChange={handleChange}
                error={erros.satTransf}
                hint={mostrarExamesExtras ? null : "Clique no botão azul para liberar"}
                aberrante={!!aberrantes["satTransf"]}
                disabled={!mostrarExamesExtras}
                borderColor="blue"
              />
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <IconHistorico /> Histórico Clínico
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {!inputs.bariatrica_medico && <CheckboxCard name="bariatrica" label="Bariátrica" sublabel="By-pass / Gastrectomia" checked={inputs.bariatrica} onChange={handleChange} color="amber" highlight={preFlag === 'bariatrica'} />}
              <CheckboxCard name="vegetariano" label="Vegetariano/Vegano" sublabel="Dieta sem carne" checked={inputs.vegetariano} onChange={handleChange} color="green" />
              <CheckboxCard name="perda" label="Hemorragia" sublabel="Inclui doação de sangue, sangria, ou sangramento" checked={inputs.perda} onChange={handleChange} color="red" />
              <CheckboxCard name="alcoolista" label="Alcoolista" sublabel="Uso crônico de álcool" checked={inputs.alcoolista} onChange={handleChange} color="amber" />
              <CheckboxCard name="transfundido" label="Transfundido" sublabel="Transfusão de hemácias" checked={inputs.transfundido} onChange={handleChange} color="red" />
              <CheckboxCard name="anemiaPrevia" label="Anemia Crônica / Prévia" sublabel="Diagnóstico anterior de anemia" checked={inputs.anemiaPrevia} onChange={handleChange} color="red" />
              <CheckboxCard name="sideropenia" label="Deficiência de Ferro" sublabel="Histórico de ferritina baixa" checked={inputs.sideropenia} onChange={handleChange} color="orange" />
              <CheckboxCard name="sobrecargaFerro" label="Excesso de Ferro / Hemocromatose" sublabel="Histórico de ferritina alta" checked={inputs.sobrecargaFerro} onChange={handleChange} color="orange" />
              <CheckboxCard name="hbAlta" label="Hemoglobina Alta / Policitemia" sublabel="Histórico de Hb elevada ou sangrias" checked={inputs.hbAlta} onChange={handleChange} color="red" />
              <CheckboxCard name="doadorSangue" label="Doador de Sangue" sublabel="Doações frequentes" checked={inputs.doadorSangue} onChange={handleChange} color="red" />
              <CheckboxCard name="celiaco" label="Celíaco" sublabel="Doença celíaca — má absorção" checked={inputs.celiaco} onChange={handleChange} color="yellow" />
              <CheckboxCard name="g6pd" label="Deficiência de G-6-PD" sublabel="Favismo — risco de hemólise" checked={inputs.g6pd} onChange={handleChange} color="purple" />
              {inputs.sexo === 'F' && (
                <>
                  <CheckboxCard name="hipermenorreia" label="Hipermenorreia" sublabel="Fluxo excessivo" checked={inputs.hipermenorreia} onChange={handleChange} color="pink" />
                  <CheckboxCard name="gestante" label="Gestante" sublabel="Gravidez atual" checked={inputs.gestante} onChange={handleChange} color="pink" />
                </>
              )}
            </div>

            {/* Fase 1: dados de gestacao */}
            {inputs.gestante && inputs.sexo === 'F' && (
              <div className="mt-3 p-3 rounded-xl border border-pink-200 bg-pink-50">
                <p className="text-xs font-bold text-pink-700 uppercase tracking-wide mb-2">📋 Dados da Gestação</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Semanas de gestação <span className="text-red-500">*</span></label>
                    <input type="number" name="semanas_gestacao" value={inputs.semanas_gestacao} onChange={handleChange}
                      min="1" max="42" placeholder="Ex: 24"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">DUM <span className="text-gray-400 font-normal">(opcional)</span></label>
                    <input type="date" name="dum" value={inputs.dum} onChange={handleChange}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
                  </div>
                </div>
                {inputs.semanas_gestacao && inputs.dum && (() => {
                  const hoje = new Date()
                  const dumDate = new Date(inputs.dum)
                  const diasDesdeDUM = Math.floor((hoje - dumDate) / (1000 * 60 * 60 * 24))
                  const semanasCalc = diasDesdeDUM / 7
                  const diff = Math.abs(semanasCalc - Number(inputs.semanas_gestacao))
                  if (diff > 2) {
                    return <p className="text-xs text-orange-600 font-medium mt-2">⚠️ DUM sugere ~{semanasCalc.toFixed(1)} semanas, mas você informou {inputs.semanas_gestacao}. Revise os dados.</p>
                  }
                  return null
                })()}
              </div>
            )}

          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <IconMedicamentos /> Medicamentos / Suplementos
            </h2>
            <p className="text-xs text-gray-400 mb-2">Marque os que o paciente usa ou usou recentemente</p>
            <div className="grid grid-cols-2 gap-2">
              <CheckboxCard name="aspirina" label="Aspirina" sublabel="Uso contínuo" checked={inputs.aspirina} onChange={handleChange} color="orange" />
              <CheckboxCard name="vitaminaB12" label="Vitamina B12" sublabel="Últimos 3 meses" checked={inputs.vitaminaB12} onChange={handleChange} color="purple" />
              <CheckboxCard name="vitB12_SL" label="Vit. B12 SL" sublabel="Sublingual — em uso" checked={inputs.vitB12_SL} onChange={handleChange} color="purple" />
              <CheckboxCard name="vitB12_IM" label="Vit. B12 IM" sublabel="Intramuscular — em uso" checked={inputs.vitB12_IM} onChange={handleChange} color="purple" />
              <CheckboxCard name="ferro_oral" label="Ferro Oral" sublabel="Nos últimos 2 anos" checked={inputs.ferro_oral} onChange={handleChange} color="orange" />
              <CheckboxCard name="ferro_injetavel" label="Ferro Injetável" sublabel="Nos últimos 2 anos" checked={inputs.ferro_injetavel} onChange={handleChange} color="orange" />
              <CheckboxCard name="testosterona" label="Testosterona / Anabolizante" sublabel="Uso exógeno — causa eritrocitose" checked={inputs.testosterona} onChange={handleChange} color="orange" />
                            <CheckboxCard name="tiroxina" label="Tiroxina / T4" sublabel="Tratamento tireoidiano" checked={inputs.tiroxina} onChange={handleChange} color="teal" />
                            <CheckboxCard name="methotrexato" label="Metotrexato" sublabel="Antagonista do folato" checked={inputs.methotrexato} onChange={handleChange} color="purple" />
                            <CheckboxCard name="hivTratamento" label="Trat. HIV / ARV" sublabel="Antirretrovirais" checked={inputs.hivTratamento} onChange={handleChange} color="purple" />
              <CheckboxCard name="hidroxiureia" label="Hidroxiureia" sublabel="Pode causar macrocitose" checked={inputs.hidroxiureia} onChange={handleChange} color="purple" />
              <CheckboxCard name="anticonvulsivante" label="Anticonvulsivante" sublabel="Fenitoína, VPA etc." checked={inputs.anticonvulsivante} onChange={handleChange} color="purple" />
            </div>
          </section>

          <div className="flex gap-3">
            <button id="btn-avaliar-paciente" type="submit" className="flex-1 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-bold py-4 px-6 rounded-xl transition-colors shadow-md text-base">
              Avaliar Paciente
            </button>
            <button type="button" onClick={handleLimpar} className="bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-700 font-medium py-4 px-5 rounded-xl transition-colors">
              Limpar
            </button>
          </div>

          {Object.values(erros).some(v => v) && (
            <div className="mt-4 rounded-xl border-2 border-red-400 bg-red-50 p-3">
              <p className="text-red-700 text-sm font-bold mb-1">⚠️ Preencha os campos obrigatórios antes de avaliar:</p>
              <ul className="text-red-700 text-xs leading-snug list-disc list-inside">
                {Object.entries(erros).filter(([_, v]) => v).map(([k, v]) => {
                  const nomes = {
                    cpf: 'CPF',
                    dataNascimento: 'Data de Nascimento',
                    idade: 'Idade',
                    dataColeta: 'Data da Coleta',
                    ferritina: 'Ferritina',
                    hemoglobina: 'Hemoglobina',
                    vcm: 'VCM',
                    rdw: 'RDW',
                    satTransf: 'Sat. Transferrina',
                  };
                  return <li key={k}>{nomes[k] || k}: {v}</li>;
                })}
              </ul>
            </div>
          )}

        </form>

        {resultado && (
          <div id="resultado" className="mt-6">
            {/* modoPaciente=false — modo médico nunca exibe módulo de documentos */}
            <ResultCard
              resultado={resultado}
              onCopiar={handleCopiar}
              copiado={copiado}
              modoPaciente={false}
              medicoNome={medicoNome}
              medicoCRM={medicoCRM}
              medicoDados={medicoDados}
            />
          </div>
        )}

      {/* CONVITE AFILIADO - imagem fairy-chat + texto persuasivo */}
      {showConviteAfiliado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Imagem com hover (gradiente preto na parte inferior) */}
            <div style={{ position: 'relative', width: '100%', height: '440px', overflow: 'hidden' }}>
              <img src={fairyChatImg} alt="Programa de Afiliados RedFairy"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
              {/* Hover gradiente preto translucido na parte inferior */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.92), rgba(0,0,0,0.5) 40%, transparent)', padding: '24px 24px 18px' }}>
                {!conviteRecusado ? (
                  <>
                    <p style={{ color: '#ffffff', fontSize: '22px', fontWeight: 800, lineHeight: '1.25', margin: 0, textAlign: 'center', textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
                      Participe do nosso <span style={{ color: '#ef4444' }}>PROGRAMA DE AFILIADOS</span>, é rápido e não custa nada.
                    </p>
                    <p style={{ color: '#ffffff', fontSize: '14px', fontWeight: 600, lineHeight: '1.3', margin: '8px 0 0', textAlign: 'center', textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
                      Somente benefícios para você.
                    </p>
                    <p style={{ color: '#fca5a5', fontSize: '14px', fontWeight: 600, lineHeight: '1.4', margin: '10px 0 0', textAlign: 'center' }}>
                      Um cadastro simples e você saberá porque é bom estar conosco.
                    </p>
                  </>
                ) : (
                  <p style={{ color: '#ffffff', fontSize: '14px', fontWeight: 500, lineHeight: '1.5', margin: '0 auto', maxWidth: '90%', textAlign: 'center', textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
                    Você inseriu um paciente no sistema pela triagem, mas não se afiliou no seguimento. É uma pena. Os dados do paciente estão salvos para eventual aprofundamento diagnóstico; porém, se ele se cadastrar sem que você esteja afiliado, você não participará do sistema de benefícios. Esperamos que seu paciente conclua o cadastro — e que você volte. Estaremos sempre abertos a ter você conosco. Até breve!...
                  </p>
                )}
              </div>
            </div>
            {/* Botao + checkbox (apenas se nao recusado) */}
            {!conviteRecusado && (
              <div className="p-5 space-y-3">
                <button
                  onClick={() => {
                    setShowConviteAfiliado(false);
                    setShowAuthMedicoOverlay('cadastro');
                  }}
                  className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl text-sm transition-colors">
                  Continue
                </button>
                <label className="flex items-center justify-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    onChange={() => {
                      setConviteRecusado(true);
                      setTimeout(() => {
                        setShowConviteAfiliado(false);
                        setConviteRecusado(false);
                        // Se destino era 'aprofundar', nao volta pra landing - fica no form
                        if (destinoAposConvite === 'aprofundar') {
                          setDestinoAposConvite(null);
                          // Form ja esta visivel com os dados da triagem
                          return;
                        }
                        // Caso contrario (landing ou null), volta como antes
                        setDestinoAposConvite(null);
                        if (onVoltar) onVoltar();
                      }, 6000);
                    }}
                    className="w-3 h-3 cursor-pointer"
                    style={{ accentColor: '#9ca3af' }}
                  />
                  <span style={{ color: '#9ca3af', fontSize: '11px', letterSpacing: '0.5px' }}>AGORA NÃO, OBRIGADO</span>
                </label>
                <button
                  onClick={() => {
                    setShowConviteAfiliado(false);
                    setShowAuthMedicoOverlay('login');
                  }}
                  className="w-full text-center mt-1"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <span style={{ color: '#9ca3af', fontSize: '11px' }}>Já sou afiliado? </span>
                  <span style={{ color: '#7B1E1E', fontSize: '11px', fontWeight: 600, textDecoration: 'underline' }}>Entrar</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AUTH MEDICO OVERLAY - aparece apos convite aceito */}
      {showAuthMedicoOverlay && (
        <div className="fixed inset-0 z-50" style={{ background: '#111827', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <AuthMedico
            sessaoExpirada={false}
            modoInicial={typeof showAuthMedicoOverlay === 'string' ? showAuthMedicoOverlay : 'cadastro'}
            onVoltarParaConvite={() => {
              setShowAuthMedicoOverlay(false);
              setShowConviteAfiliado(true);
            }}
            onVoltar={() => {
              setShowAuthMedicoOverlay(false);
              if (onVoltar) onVoltar();
            }}
            onConcluir={async (nome, crm) => {
              setMedicoNome(nome);
              setMedicoCRM(crm);
              setCadastrado(true);
              setShowAuthMedicoOverlay(false);
              // So abre afiliados se o medico AINDA NAO for afiliado completo
              // (afiliado completo = tem cep + cpf + pix_chave no banco).
              try {
                const { data: md } = await supabase
                  .from('medicos')
                  .select('cep, cpf, pix_chave')
                  .eq('crm', crm)
                  .maybeSingle();
                if (!md?.cep || !md?.cpf || !md?.pix_chave) {
                  setShowAfiliados(true);
                }
              } catch (e) {
                // Em caso de erro de consulta, nao bloqueia: abre afiliados
                setShowAfiliados(true);
              }
            }}
          />
        </div>
      )}

      {/* __FELICITACOES_V2__ */}
      {/* FELICITACOES - apos cadastro de endereco/pix */}
      {showFelicitacoes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            {/* Imagem chatphone2 no topo, limpa, sem overlay */}
            <div style={{ width: '100%', background: '#fff' }}>
              <img src={chatphone2Img} alt="RedFairy"
                style={{ display: 'block', width: '100%', height: 'auto', objectFit: 'contain' }} />
            </div>
            {/* Card bordo abaixo */}
            <div className="bg-red-700 px-6 py-6 text-center">
              <h2 className="text-white text-xl font-bold leading-tight">
                Estamos felizes de ter você no RedFairy<sup style={{ fontSize: '0.55em', verticalAlign: 'super', marginLeft: '1px' }}>®</sup>
              </h2>
              <div className="mt-5 space-y-3">
                <button
                  onClick={() => setShowBeneficios(true)}
                  className="text-white hover:text-red-100 font-semibold text-sm underline block w-full">
                  Conheça os benefícios
                </button>
                <button
                  onClick={() => {
                    setShowFelicitacoes(false);
                    if (onVoltar) onVoltar();
                  }}
                  className="w-full bg-white text-red-700 hover:bg-red-50 font-bold py-3 rounded-xl text-sm transition-colors">
                  Ir para o início
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BENEFICIOS - placeholder */}
      {showBeneficios && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-red-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-white text-lg font-bold">Beneficios do Programa</h2>
              <button onClick={() => setShowBeneficios(false)} className="text-red-200 hover:text-white text-xl font-bold">x</button>
            </div>
            <div className="p-6 text-center space-y-4">
              <p className="text-gray-600 text-sm leading-relaxed">
                Em breve: lista detalhada dos beneficios do Programa de Afiliados Patrocinado RedFairy.
              </p>
              <p className="text-gray-400 text-xs">
                Conteudo em desenvolvimento.
              </p>
              <button
                onClick={() => setShowBeneficios(false)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl text-sm transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      </main>
    </div>
    </>
  );
}

const LabInput = React.forwardRef(function LabInput({ label, unit, name, reference, value, onChange, error, hint, aberrante, disabled, borderColor, onEnter }, ref) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">
        {label} <span className="text-xs text-gray-400">({unit})</span>
      </label>
      <input ref={ref} type="text" inputMode="decimal" name={name} value={value} onChange={onChange} disabled={disabled} placeholder={disabled && hint ? hint : "0"}
        onKeyDown={e => { if (e.key === 'Enter' && onEnter) { e.preventDefault(); onEnter(); } }}
        className={`w-full border-2 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400 disabled:placeholder:text-gray-400 disabled:placeholder:italic ${error ? 'border-red-500' : aberrante ? 'border-yellow-400' : (!value && !disabled) ? 'border-yellow-400 bg-yellow-50' : borderColor === 'red' ? 'border-red-500' : borderColor === 'blue' ? 'border-blue-500' : 'border-gray-200'}`} />
      <p className="text-xs text-gray-400 mt-0.5">Ref: {reference}</p>
      {hint && !disabled && <p className="text-xs text-orange-500 mt-0.5">{hint}</p>}
      {aberrante && <p className="text-xs font-bold text-yellow-600 mt-0.5">⚠ VALOR ABERRANTE — CONFIRME</p>}
      {error && <p className="text-red-500 text-xs">{error}</p>}


    </div>
  );
})

const colorMap = {
  amber:  'border-amber-400  bg-amber-50  text-amber-700',
  green:  'border-green-400  bg-green-50  text-green-700',
  red:    'border-red-400    bg-red-50    text-red-700',
  pink:   'border-pink-400   bg-pink-50   text-pink-700',
  orange: 'border-orange-400 bg-orange-50 text-orange-700',
  purple: 'border-purple-400 bg-purple-50 text-purple-700',
  blue:   'border-blue-400   bg-blue-50   text-blue-700',
  teal:   'border-teal-400   bg-teal-50   text-teal-700',
};

function CheckboxCard({ name, label, sublabel, checked, onChange, color, highlight }) {
  return (
    <label className={`flex items-start gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${checked ? colorMap[color] : 'border-gray-200 bg-gray-50 text-gray-600'}`}
      style={highlight && !checked ? { borderColor:'#7B1E1E', boxShadow:'0 0 0 2px rgba(123,30,30,0.3)' } : highlight && checked ? { borderColor:'#7B1E1E', boxShadow:'0 0 0 3px rgba(123,30,30,0.4)' } : {}}>
      <input type="checkbox" name={name} checked={checked} onChange={onChange} className="mt-0.5 w-4 h-4 cursor-pointer flex-shrink-0" />
      <div className="min-w-0">
        <p className="font-medium text-sm leading-tight">{label}</p>
        <p className="text-xs opacity-70 leading-tight mt-0.5">{sublabel}</p>
      </div>
    </label>
  );
}
