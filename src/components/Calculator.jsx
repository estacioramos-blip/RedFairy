import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { avaliarPaciente, triagemEritron, formatarParaCopiar } from '../engine/decisionEngine';
import { avaliarOBA } from '../engine/obaEngine';
import OBAModal from './OBAModal';
import TriagemModal from './TriagemModal';
import TriagemResultadoModal from './TriagemResultadoModal';
import TermosModalShared from './TermosModal';
import ResultCard from './ResultCard';
import PlayButton from './PlayButton';
import heroImg from '../assets/redfairy-hero.jpg';
import fairyChatImg from '../assets/fairy-chat.jpg';
import welcomeImg from '../assets/welcome.jpg';
import chatphone2Img from '../assets/chatphone2.jpg';
import telefonista2Img from '../assets/telefonista2.jpg';
import telefonista3Img from '../assets/telefonista3.jpg';
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
  return <TermosModalShared tipo="medico" onFechar={onFechar} />
}

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
        <div style={{ position: 'relative' }}>
          <img src={telefonista2Img} alt="Vamos ao programa de afiliados"
            style={{ width: '100%', height: 'auto', display: 'block' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.92), rgba(0,0,0,0.55) 50%, transparent)', padding: '40px 24px 18px' }}>
            <p style={{ color: '#ffffff', fontSize: '20px', fontWeight: 700, lineHeight: 1.2, margin: 0, textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}>
              {displayed}
              <span style={{ opacity: 0.6, animation: 'blink 1s step-end infinite' }}>|</span>
            </p>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '10px', fontWeight: 600, letterSpacing: '1.5px', margin: '8px 0 0', textTransform: 'uppercase', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
              {"Ap\u00f3s a pr\u00f3xima p\u00e1gina voc\u00ea estar\u00e1 automaticamente logado"}
            </p>
          </div>
          <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
        </div>
        <div className="px-6 py-3 text-center">
          <p className="text-xs text-gray-400">{"Cadastro conclu\u00eddo"}</p>
        </div>
      </div>
    </div>
  );
}

function AuthMedico({ onConcluir, onVoltar, sessaoExpirada, modoInicial = 'login', onVoltarParaConvite }) {
  const [showReversaoAdesao, setShowReversaoAdesao] = useState(false);
  const [modo, setModo] = useState(modoInicial)
  // Lista oficial das 27 UFs (estados + DF). Usada para validar a UF do conselho.
  const UFS_VALIDAS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
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
      const t = setTimeout(() => { if (refCrmNumLogin.current) refCrmNumLogin.current.focus(); }, 200);
      return () => clearTimeout(t);
    }
  }, [modo]);

  // Fluxo seamless: campos separados para n\u00famero (6 d\u00edgitos) e UF (2 letras).
  // O estado loginConselho continua existindo, derivado de loginCrmNum + loginCrmUF
  // ('123456/BA'), para n\u00e3o reescrever handleLogin/queries Supabase.
  const [loginCrmNum, setLoginCrmNum] = useState('')
  const [loginCrmUF, setLoginCrmUF] = useState('')
  const loginConselho = (loginCrmNum && loginCrmUF) ? `${loginCrmNum}/${loginCrmUF}` : '';
  const [loginSenha, setLoginSenha] = useState('')
  const [loginErro, setLoginErro] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const refCrmNumLogin = useRef(null);
  const refCrmUfLogin = useRef(null);

  const [nome, setNome] = useState('')
  const [tipoConselho, setTipoConselho] = useState('CRM')
  // Mesmo padr\u00e3o no cadastro: campos separados + derivado 'conselho' para o resto do c\u00f3digo.
  const [crmNum, setCrmNum] = useState(() => {
    try {
      const raw = localStorage.getItem('rf_crm_prefill') || '';
      const m = raw.match(/^(\d+)\/[A-Z]{2}$/i);
      return m ? m[1] : '';
    } catch(e) { return ''; }
  });
  const [crmUF, setCrmUF] = useState(() => {
    try {
      const raw = localStorage.getItem('rf_crm_prefill') || '';
      const m = raw.match(/^\d+\/([A-Z]{2})$/i);
      return m ? m[1].toUpperCase() : '';
    } catch(e) { return ''; }
  });
  const conselho = (crmNum && crmUF) ? `${crmNum}/${crmUF}` : '';
  const refCrmNum = useRef(null);
  const refCrmUf = useRef(null);
  const refCelular = useRef(null);
  const [celular, setCelular] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const jaLogadoSemSenha = (() => { try { return !!localStorage.getItem('medico_crm'); } catch(e) { return false; } })()
  const [cadErro, setCadErro] = useState('')
  const [cadLoading, setCadLoading] = useState(false)
  const [cadSucesso, setCadSucesso] = useState(false)
  const [aceitoTC, setAceitoTC] = useState(false)
  const [showTC, setShowTC] = useState(false)
  const [showSenha, setShowSenha] = useState(false)
  const [showLoginSenha, setShowLoginSenha] = useState(false)
  const [showEsqueciSenha, setShowEsqueciSenha] = useState(false)
  const refSenhaLogin = useRef(null);
  const [etapaLogin, setEtapaLogin] = useState(1);
  // Redesenho do cadastro: refs de nome/email + fundo-imagem revelavel.
  const refNomeCad = useRef(null);
  const refEmailCad = useRef(null);
  const [bgRevelado, setBgRevelado] = useState(false);
  const [splashAtivo, setSplashAtivo] = useState(true);

  // Timer 1300ms apos digitar no NUMERO do CRM (login): se >= 1 digito, espera 1300ms
  // ocioso e move o foco para o campo UF. Se atingir 6 digitos antes, avanca imediato.
  useEffect(() => {
    if (modo !== 'login') return;
    if (!loginCrmNum) return;
    if (loginCrmNum.length === 6) {
      if (refCrmUfLogin.current) refCrmUfLogin.current.focus();
      return;
    }
    const t = setTimeout(() => {
      if (refCrmUfLogin.current && document.activeElement === refCrmNumLogin.current) {
        refCrmUfLogin.current.focus();
      }
    }, 1300);
    return () => clearTimeout(t);
  }, [loginCrmNum, modo]);

  // UF do login completa (2 letras validas) -> foco automatico na Senha.
  useEffect(() => {
    if (modo !== 'login') return;
    if (loginCrmUF.length === 2 && UFS_VALIDAS.includes(loginCrmUF)) {
      setEtapaLogin(2);
      if (refSenhaLogin.current) refSenhaLogin.current.focus();
    }
  }, [loginCrmUF, modo]);

  // Mesmo padrao no CADASTRO. So' ativa apos o nome (o cursor comeca no nome).
  useEffect(() => {
    if (modo !== 'cadastro') return;
    if (!nome.trim()) return;
    if (!crmNum) return;
    if (crmNum.length === 6) {
      if (refCrmUf.current) refCrmUf.current.focus();
      return;
    }
    const t = setTimeout(() => {
      if (refCrmUf.current && document.activeElement === refCrmNum.current) {
        refCrmUf.current.focus();
      }
    }, 1300);
    return () => clearTimeout(t);
  }, [crmNum, modo]);

  useEffect(() => {
    if (modo !== 'cadastro') return;
    if (crmUF.length === 2 && UFS_VALIDAS.includes(crmUF) && nome.trim()) {
      if (refCelular.current) refCelular.current.focus();
    }
  }, [crmUF, modo]);

  // Splash de entrada: imagem inteira + "Vamos!..." por 2s; depois surgem os campos
  // e o cursor vai pro NOME (no cadastro).
  useEffect(() => {
    const t = setTimeout(() => {
      setSplashAtivo(false);
      if (modo === 'cadastro') setTimeout(() => { if (refNomeCad.current) refNomeCad.current.focus(); }, 50);
    }, 4000);
    return () => clearTimeout(t);
  }, []);
  // NOME -> CELULAR apos 2,5s ocioso (se o cursor ainda estiver no nome).
  useEffect(() => {
    if (modo !== 'cadastro' || !nome.trim()) return;
    const t = setTimeout(() => {
      if (refCelular.current && document.activeElement === refNomeCad.current) refCelular.current.focus();
    }, 2500);
    return () => clearTimeout(t);
  }, [nome, modo]);
  // CELULAR completo (11 digitos) -> EMAIL.
  useEffect(() => {
    if (modo !== 'cadastro') return;
    if (celular.replace(/\D/g, '').length >= 11 && refEmailCad.current && document.activeElement === refCelular.current) {
      refEmailCad.current.focus();
    }
  }, [celular, modo]);

  function formatarCelular(valor) {
    const digits = valor.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 2) return `(${digits}`
    if (digits.length <= 7) return `(${digits.slice(0,2)}) ${digits.slice(2)}`
    return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`
  }

  // Sanitizadores dos novos campos separados.
  // CRM nunca comeca com zero -> remove zeros a esquerda (ao contrario do CPF).
  function sanitizarCrmNum(valor) {
    return String(valor || '').replace(/\D/g, '').replace(/^0+/, '').slice(0, 6);
  }
  function sanitizarCrmUF(valor) {
    return String(valor || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
  }

  async function handleLogin() {
    setLoginErro('')
    if (!loginCrmNum) { setLoginErro("Informe o n\u00famero do CRM."); return }
    if (!loginCrmUF) { setLoginErro("Informe a UF."); return }
    if (!UFS_VALIDAS.includes(loginCrmUF)) { setLoginErro("UF inv\u00e1lida."); return }
    const conselhoLimpo = loginConselho.trim().toUpperCase()
    if (!loginSenha) { setLoginErro('Informe a senha.'); return }
    setLoginLoading(true)
    let resp = null
    try {
      const { data, error } = await supabase.rpc('login_medico', { p_crm: conselhoLimpo, p_senha: loginSenha })
      if (error) { setLoginLoading(false); setLoginErro('Erro de conex\u00e3o. Tente novamente.'); return }
      resp = data
    } catch (e) { setLoginLoading(false); setLoginErro('Erro de conex\u00e3o. Tente novamente.'); return }
    setLoginLoading(false)
    if (!resp || !resp.ok) {
      const e = resp && resp.erro
      setLoginErro(e === 'CRM nao encontrado' ? 'Conselho n\u00e3o encontrado. Verifique ou cadastre-se.'
        : e === 'Senha incorreta' ? 'Senha incorreta.'
        : (e || 'Falha no login.'))
      return
    }
    const _crm = resp.crm || conselhoLimpo
    localStorage.setItem('medico_crm', _crm)
    localStorage.setItem('medico_nome', resp.nome || '')
    localStorage.setItem('medico_login_at', Date.now().toString())
    if (resp.token) localStorage.setItem('medico_token', resp.token)
    try { resp.is_admin ? localStorage.setItem('medico_is_admin', '1') : localStorage.removeItem('medico_is_admin') } catch (e) {}
    onConcluir(resp.nome || '', _crm)
  }

  async function handleCadastro() {
    setCadErro('')
    const conselhoLimpo = conselho.trim().toUpperCase()
    const celularDigits = celular.replace(/\D/g, '')
    if (!nome.trim() || nome.trim().length < 5) { setCadErro('Informe seu nome completo.'); return }
    if (!crmNum) { setCadErro("Informe o n\u00famero do CRM."); return }
    if (!crmUF) { setCadErro("Informe a UF."); return }
    if (!UFS_VALIDAS.includes(crmUF)) { setCadErro("UF inv\u00e1lida."); return }
    if (celularDigits.length < 10) { setCadErro("Informe um celular v\u00e1lido com DDD."); return }
    if (!email || !email.includes('@')) { setCadErro("Informe um e-mail v\u00e1lido."); return }
    if (!jaLogadoSemSenha && (!senha || senha.length < 6)) { setCadErro('A senha deve ter pelo menos 6 caracteres.'); return }
    setCadLoading(true)
    // Médico já identificado em sessão anterior (cadastro mínimo pela caixa do
    // hero): aqui só completa o perfil (nome/celular/email), sem recriar a conta.
    if (jaLogadoSemSenha) {
      try {
        const { error } = await supabase.rpc('complete_medico', {
          p_crm: conselhoLimpo, p_nome: nome.trim(),
          p_celular: celularDigits, p_email: email.trim().toLowerCase(),
        })
        if (error) { setCadLoading(false); setCadErro('Erro ao salvar. Tente novamente.'); return }
      } catch (e) { setCadLoading(false); setCadErro('Erro ao salvar. Tente novamente.'); return }
      setCadLoading(false)
      localStorage.setItem('medico_crm', conselhoLimpo)
      localStorage.setItem('medico_nome', nome.trim())
      localStorage.setItem('medico_login_at', Date.now().toString())
      setCadSucesso(true)
      return
    }
    const uf = conselhoLimpo.split('/')[1] || ''
    let resp = null
    try {
      const { data, error } = await supabase.rpc('register_medico', {
        p_nome: nome.trim(), p_crm: conselhoLimpo, p_uf: uf,
        p_celular: celularDigits, p_email: email.trim().toLowerCase(), p_senha: senha,
      })
      if (error) { setCadLoading(false); setCadErro('Erro ao salvar. Tente novamente.'); return }
      resp = data
    } catch (e) { setCadLoading(false); setCadErro('Erro ao salvar. Tente novamente.'); return }
    setCadLoading(false)
    if (!resp || !resp.ok) {
      setCadErro(resp && resp.erro === 'CRM ja cadastrado'
        ? 'Este CRM já está cadastrado. Faça login.'
        : ((resp && resp.erro) || 'Erro ao salvar. Tente novamente.'))
      return
    }
    localStorage.setItem('medico_crm', resp.crm || conselhoLimpo)
    localStorage.setItem('medico_nome', resp.nome || nome.trim())
    localStorage.setItem('medico_login_at', Date.now().toString())
    if (resp.token) localStorage.setItem('medico_token', resp.token)
    try { if (resp.is_admin) localStorage.setItem('medico_is_admin', '1') } catch (e) {}
    setCadSucesso(true)
  }

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
  const inputAmarelo = "w-full border-2 border-yellow-400 bg-yellow-50 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"

  useEffect(() => {
    if (cadSucesso) {
      setCadSucesso(false);
      if (typeof onConcluir === 'function') { onConcluir(nome, conselho); }
    }
  }, [cadSucesso]);

  return (
    <div className="bg-gray-900 relative" style={{ minHeight: '100vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px', overflowY: 'auto' }}>
      {onVoltar && (
        <button onClick={onVoltar}
          className="absolute top-4 left-4 text-white px-3 py-1 rounded-lg text-xs font-medium shadow transition-colors"
          style={{ backgroundColor: '#991b1b' }}>
          {"\u2190 Voltar"}
        </button>
      )}
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md" style={{ overflow: 'hidden', position: 'relative' }}
        onMouseEnter={() => setBgRevelado(true)} onMouseLeave={() => setBgRevelado(false)} onTouchStart={() => setBgRevelado(true)}>
        {/* Imagem de fundo: inteira (contain) e afastada, esmaecida; revela no hover (igual a' hero) */}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, backgroundColor: '#FDF7F7', backgroundImage: `url(${telefonista3Img})`, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', filter: bgRevelado ? 'blur(0px)' : 'blur(10px)', opacity: bgRevelado ? 0.5 : 0.12, transition: 'filter 0.6s ease, opacity 0.6s ease', pointerEvents: 'none' }} />
        {/* SPLASH de entrada: imagem INTEIRA + "Vamos!..." por 2s, antes dos campos */}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 5, backgroundColor: '#FDF7F7', backgroundImage: `url(${telefonista3Img})`, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', opacity: splashAtivo ? 1 : 0, pointerEvents: splashAtivo ? 'auto' : 'none', transition: 'opacity 0.5s ease' }}>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: '28%', padding: '0 24px', textAlign: 'center' }}>
            <p style={{ color: '#ffffff', fontSize: '42px', fontWeight: 900, lineHeight: 1.1, margin: 0, textShadow: '0 2px 14px rgba(0,0,0,0.75), 0 1px 4px rgba(0,0,0,0.6)' }}>{vamosTxt}</p>
          </div>
        </div>
        {/* Header compacto estilo TriagemModal: logo-fada + RedFairy em dois tons.
            zIndex 10 (acima do splash zIndex 5) para o header ja aparecer durante a
            imagem nitida de entrada (3s), nao so' quando surgem os campos. */}
        <div style={{ position: 'relative', zIndex: 10, background: 'rgba(255,255,255,0.92)', borderBottom: '1px solid #f1f5f9', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src={logo} alt="RedFairy" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          <h2 style={{ fontFamily: "'Georgia', serif", fontWeight: 900, fontSize: '1.25rem', letterSpacing: '-0.02em', margin: 0 }}>
            <span style={{ color: '#b91c1c' }}>Red</span><span style={{ color: '#ef4444' }}>Fairy</span>
          </h2>
        </div>
        {/* Titulo do modo (Primeiro Acesso / Acesso Medico): zIndex 10 p/ aparecer JUNTO do header
            e da imagem desde o inicio (durante o splash), nao so' quando surgem os campos. */}
        <div style={{ position: 'relative', zIndex: 10, background: 'rgba(255,255,255,0.92)', padding: '6px 14px 10px', textAlign: 'center' }}>
          <h2 className="text-xl font-bold text-red-700" style={{ margin: 0 }}>
            {modo === 'login' ? "Acesso M\u00e9dico" : "Primeiro Acesso M\u00e9dico"}
          </h2>
          <p className="text-gray-500 text-sm" style={{ margin: '2px 0 0' }}>
            {modo === 'login' ? 'Entre com seu conselho e senha' : 'Crie seu acesso ao RedFairy'}
          </p>
        </div>
        <div className="px-8 pb-8 pt-3 space-y-5" style={{ position: 'relative', zIndex: 1 }}>

        {sessaoExpirada && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 mb-2 text-center">
            <p className="text-amber-800 text-sm font-semibold">{"\u23f1 Sua sess\u00e3o expirou."}</p>
            <p className="text-amber-700 text-xs mt-0.5">{"Fa\u00e7a login novamente para continuar."}</p>
          </div>
        )}

        {modo === 'login' && (
          <div className="space-y-3">
            <button onClick={() => { setLoginErro(''); setCadErro(''); onVoltar?.() }} className="text-gray-400 hover:text-gray-600 text-xs font-medium">
              {"\u2190 Voltar"}
            </button>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">{"N\u00famero do CRM e UF"}</label>
              <div className="grid grid-cols-3 gap-2">
                <input ref={refCrmNumLogin} type="text" value={loginCrmNum}
                  onChange={e => setLoginCrmNum(sanitizarCrmNum(e.target.value))}
                  placeholder="Ex: 6302" autoComplete="off" name="rf-crm-num-login"
                  inputMode="numeric" maxLength={6}
                  className={`col-span-2 ${inputClass} ${etapaLogin === 1 ? 'border-yellow-400 bg-yellow-50' : 'bg-yellow-50 border-yellow-300'}`} />
                <input ref={refCrmUfLogin} type="text" value={loginCrmUF}
                  onChange={e => setLoginCrmUF(sanitizarCrmUF(e.target.value))}
                  placeholder="UF" autoComplete="off" name="rf-crm-uf-login"
                  maxLength={2}
                  className={`${inputClass} text-center uppercase ${etapaLogin === 1 ? 'border-yellow-400 bg-yellow-50' : 'bg-yellow-50 border-yellow-300'} ${loginCrmUF.length === 2 && !UFS_VALIDAS.includes(loginCrmUF) ? 'border-red-500' : ''}`} />
              </div>
              {loginCrmUF.length === 2 && !UFS_VALIDAS.includes(loginCrmUF) && (
                <p className="text-red-500 text-xs mt-1">{"UF inv\u00e1lida"}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Senha</label>
              <div style={{ position: 'relative' }}>
                <input ref={refSenhaLogin} type={showLoginSenha ? 'text' : 'password'} value={loginSenha}
                  onChange={e => setLoginSenha(e.target.value)} onFocus={() => setEtapaLogin(2)}
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
            {loginConselho.trim() && loginSenha.trim() && (
              <div className="flex flex-col items-center gap-1 pt-1">
                <button onClick={handleLogin} disabled={loginLoading} aria-label="Confirmar login"
                  className="w-14 h-14 rounded-full bg-gray-400 hover:bg-gray-500 text-red-700 font-bold flex items-center justify-center transition-colors shadow-md disabled:opacity-50"
                  style={{ fontFamily: 'Apple Color Emoji, Segoe UI Symbol, sans-serif' }}>
                  <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{"\u2714"}</span>
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

        {modo === 'cadastro' && (
          <div className="space-y-3">
            <button onClick={() => { setLoginErro(''); setCadErro(''); onVoltarParaConvite?.() }} className="text-gray-400 hover:text-gray-600 text-xs font-medium">
              {"\u2190 Voltar"}
            </button>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Nome completo</label>
              <input ref={refNomeCad} type="text" value={nome} onChange={e => setNome(e.target.value.toUpperCase())} style={{ textTransform: 'uppercase' }}
                className={inputAmarelo} autoComplete="off" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">{"N\u00famero do CRM e UF"}</label>
              <div className="grid grid-cols-3 gap-2">
                <input ref={refCrmNum} type="text" value={crmNum}
                  onChange={e => setCrmNum(sanitizarCrmNum(e.target.value))}
                  placeholder="Ex: 6302" className={inputAmarelo} autoComplete="off"
                  inputMode="numeric" maxLength={6} />
                <input ref={refCrmUf} type="text" value={crmUF}
                  onChange={e => setCrmUF(sanitizarCrmUF(e.target.value))}
                  placeholder="UF" maxLength={2}
                  className={`${inputAmarelo} text-center uppercase ${crmUF.length === 2 && !UFS_VALIDAS.includes(crmUF) ? 'border-red-500' : ''}`} autoComplete="off" />
              </div>
              {crmUF.length === 2 && !UFS_VALIDAS.includes(crmUF) && (
                <p className="text-red-500 text-xs mt-1">{"UF inv\u00e1lida"}</p>
              )}
              <p className="text-xs text-red-800 font-medium mt-0.5">{"Este ser\u00e1 seu login permanente"}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Celular / WhatsApp</label>
              <input ref={refCelular} type="tel" value={celular} onChange={e => setCelular(formatarCelular(e.target.value))}
                placeholder="(00) 00000-0000" inputMode="numeric" maxLength={15} className={inputAmarelo} autoComplete="off" />
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-blue-800 text-xs font-bold mb-1">{"\u2728 Programa de Afiliados"}</p>
              <p className="text-blue-700 text-xs leading-relaxed">
                {"Ao avaliar pacientes voc\u00ea passa a integrar o nosso Programa de Afiliados, com suporte dos nossos patrocinadores. Ao beneficiar pacientes, voc\u00ea tamb\u00e9m passa a auferir benef\u00edcios."}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">E-mail</label>
              <input ref={refEmailCad} type="email" value={email} onChange={e => setEmail(e.target.value.toLowerCase())}
                placeholder="seu@email.com" className={inputAmarelo} autoComplete="off" />
            </div>
            <div>
              {!jaLogadoSemSenha && (<><label className="block text-sm font-medium text-gray-600 mb-1">Crie uma Senha</label>
              <div style={{ position: 'relative' }}>
                <input type={showSenha ? 'text' : 'password'} value={senha} onChange={e => setSenha(e.target.value)}
                  placeholder={"M\u00ednimo 6 caracteres"} className={inputAmarelo} autoComplete="new-password"
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
              <p className="text-xs text-red-800 font-medium mt-0.5">{"Ser\u00e1 sua senha de acesso ao RedFairy."}</p></>)}
            </div>
            {cadErro && <p className="text-red-500 text-sm">{cadErro}</p>}
            {showTC && <TermosModal onFechar={() => setShowTC(false)} />}
            <div className="flex justify-end pt-1">
              <PlayButton
                onClick={handleCadastro}
                loading={cadLoading}
                label="CONTINUAR"
                ariaLabel="Confirmar cadastro"
                circleClass="bg-red-700 hover:bg-red-800"
                playColor="#2563eb"
                labelColor="#991b1b"
                ringColor="rgba(220,38,38,0.55)"
              />
            </div>
            <button type="button" onClick={() => setShowReversaoAdesao(true)}
              className="w-full text-center text-gray-400 hover:text-gray-600 text-xs font-medium py-1">
              {"N\u00e3o quero fornecer esses dados agora"}
            </button>
          </div>
        )}

        {showReversaoAdesao && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="p-6 space-y-5">
                <p style={{ color: '#374151', fontSize: '15px', fontWeight: 600, lineHeight: 1.5, textAlign: 'center', margin: 0 }}>
                  {"RedFairy"}<sup style={{ fontSize: '0.6em', verticalAlign: 'super' }}>{"\u00ae"}</sup>{" precisa do seu WhatsApp + e-mail para que voc\u00ea possa operar a plataforma, conhecer o Projeto OBA, e os benef\u00edcios do 4DOC - Programa Patrocinado de M\u00e9dicos Afiliados."}
                </p>
                <div className="space-y-3">
                  <button onClick={() => setShowReversaoAdesao(false)}
                    className="w-full bg-red-700 hover:bg-gray-400 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                    <span>{"QUERO CONTINUAR"}</span>
                    <span style={{ fontSize: '15px' }}>{"\u25ba"}</span>
                  </button>
                  <div className="text-center">
                    <button onClick={() => { setShowReversaoAdesao(false); onVoltar?.(); }}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold py-2.5 px-5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 mx-auto">
                      <span style={{ color: '#dc2626', fontSize: '15px' }}>{"\u25c4"}</span>
                      <span>{"SAIR"}</span>
                    </button>
                    <p style={{ color: '#7B1E1E', fontSize: '11px', margin: '6px 0 0' }}>{"Se mudar de ideia \u00e9 s\u00f3 voltar"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showEsqueciSenha && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setShowEsqueciSenha(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="bg-red-700 px-5 py-4">
                <h3 className="text-white font-bold text-base">{"Recupera\u00e7\u00e3o de senha"}</h3>
              </div>
              <div className="p-5 space-y-4 text-center">
                <p className="text-gray-700 text-sm leading-relaxed">Fale conosco por WhatsApp para recuperar seu acesso.</p>
                <a href="https://wa.me/5571997110804" target="_blank" rel="noopener noreferrer"
                  className="block w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl text-sm transition-colors no-underline">
                  Falar pelo WhatsApp
                </a>
                <button onClick={() => setShowEsqueciSenha(false)}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-xl text-sm transition-colors">
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}

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
    await supabase.from('config').upsert({ chave: 'valor_solicitacao_medica', valor, descricao: "Valor R$ solicita\u00e7\u00e3o m\u00e9dica" }, { onConflict: 'chave' });
    await supabase.from('config').upsert({ chave: 'valor_documento_medico', valor: valorDoc, descricao: "Valor R$ documento m\u00e9dico" }, { onConflict: 'chave' });
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
          <p className="font-bold text-gray-700 text-sm">{"\u2699\ufe0f Configura\u00e7\u00f5es"}</p>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 text-lg"
            style={{ fontFamily: 'Apple Color Emoji, Segoe UI Symbol, Noto Sans Symbols, sans-serif', lineHeight: 1 }}>
            {"\u2715"}
          </button>
        </div>
        {loading ? <p className="text-gray-400 text-sm text-center">Carregando...</p> : (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{"Valor Solicita\u00e7\u00e3o M\u00e9dica (R$)"}</label>
              <input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} placeholder="Ex: 50.00" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{"Valor Documento M\u00e9dico (R$)"}</label>
              <input type="number" step="0.01" value={valorDoc} onChange={e => setValorDoc(e.target.value)} placeholder="Ex: 29.90" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Chave Pix</label>
              <input type="text" value={pixChave} onChange={e => setPixChave(e.target.value)} placeholder={"E-mail, CPF ou c\u00f3digo"} className={inp} />
            </div>
            {sucesso && <p className="text-green-600 text-sm text-center font-bold">{"\u2705 "}{sucesso}</p>}
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
      try { const d = JSON.parse(demoDados); setPreDemoDados(d); localStorage.removeItem('rf_demo_dados') } catch(e) {}
    }
  }, [modoDemo])

  function handleLogout() {
    localStorage.removeItem('medico_crm')
    localStorage.removeItem('medico_nome')
    localStorage.removeItem('medico_is_admin')
    localStorage.removeItem('medico_token')
    setCadastrado(false)
    setMedicoNome('')
    setMedicoCRM('')
  }

  if (cadastrado === null) return null

  return <CalculatorForm onVoltar={onVoltar} medicoNome={medicoNome} medicoCRM={medicoCRM} setMedicoNome={setMedicoNome} setMedicoCRM={setMedicoCRM} cadastrado={cadastrado} setCadastrado={setCadastrado} onLogout={handleLogout} preFlag={preFlag} preDemoDados={preDemoDados} />
}

function CalculatorForm({ onVoltar, medicoNome, medicoCRM, setMedicoNome, setMedicoCRM, cadastrado, setCadastrado, onLogout, preFlag, preDemoDados }) {
  const _demo = (() => { try { const d = localStorage.getItem('rf_demo_dados'); if (d) { localStorage.removeItem('rf_demo_dados'); return JSON.parse(d) } } catch(e) {} return null })()

  const [inputs, setInputs] = useState({
    cpf: '', sexo: _demo?.sexo || 'M', idade: _demo?.idade || '', peso: _demo?.peso || '', dataNascimento: '', dataColeta: _demo ? new Date().toISOString().split('T')[0] : '',
    ferritina: _demo?.ferr || '', hemoglobina: _demo?.hb || '', vcm: _demo?.vcm || '', rdw: _demo?.rdw || '', satTransf: _demo?.sat || '',
    bariatrica: !!(_demo?.bariatrica),
    bariatrica_medico: !!(_demo?.bariatrica), vegetariano: false, perda: false,
    hipermenorreia: false, gestante: false, semanas_gestacao: '', dum: '', alcoolista: false,
    transfundido: false, aspirina: false, vitaminaB12: false, vitB12_SL: false, vitB12_IM: false, ferro_oral: false, ferro_injetavel: false,
    tiroxina: false, hidroxiureia: false, anticonvulsivante: false, testosterona: false,
    anemiaPrevia: false, sideropenia: false, sobrecargaFerro: false, hbAlta: false, celiaco: false, g6pd: false, endometriose: false, doadorSangue: false,
    methotrexato: false, hivTratamento: false, metformina: false, ibp: false,
  });

  const [resultado, setResultado] = useState(null);
  const [mostrarExamesExtras, setMostrarExamesExtras] = useState(false);
  const ferritinaRef = useRef(null);
  const [showTriagem, setShowTriagem] = useState(true);
  const [triagemResultado, setTriagemResultado] = useState(null);
  const [triagemInputs, setTriagemInputs] = useState(null);
  const [showAfiliados, setShowAfiliados] = useState(false);
  const [showAfiliadosBanner, setShowAfiliadosBanner] = useState(false);
  // Marca que o 4DOC ja foi oferecido (modal cheio) nesta sessao: evita o modal reaparecer
  // depois que o medico ja declinou ("Preencher depois"). Apos isso, no maximo o banner.
  const jaOfereceu4DOCRef = React.useRef(false);
  React.useEffect(() => { if (showAfiliados) jaOfereceu4DOCRef.current = true; }, [showAfiliados]);
  const [afiliadoEndereco, setAfiliadoEndereco] = useState('');
  const [afiliadoPix, setAfiliadoPix] = useState('');
  const [afiliadoSalvando, setAfiliadoSalvando] = useState(false);
  const [afiliadoSalvo, setAfiliadoSalvo] = useState(false);
  const [afiliadoCEP, setAfiliadoCEP] = useState('');
  const [afiliadoCPF, setAfiliadoCPF] = useState('');
  const [afiliadoCPFErro, setAfiliadoCPFErro] = useState('');
  const [usaTelegram, setUsaTelegram] = useState(false);
  const refAfilCEP = useRef(null);
  const refAfilCPF = useRef(null);
  const refAfilPix = useRef(null);
  const [etapaAfil, setEtapaAfil] = useState(1);
  const [splashAfil, setSplashAfil] = useState(true);
  const [bgAfilRevelado, setBgAfilRevelado] = useState(false);
  useEffect(() => {
    if (showAfiliados) {
      setEtapaAfil(1);
      // SPLASH de entrada: imagem inteira + greeting por 2s; depois revela os campos e foca o CEP
      setSplashAfil(true); setBgAfilRevelado(false);
      const t = setTimeout(() => { setSplashAfil(false); if (refAfilCEP.current) refAfilCEP.current.focus(); }, 5000);
      // Recarrega medicoDados (celular/email) ao abrir o modal de afiliados,
      // pra garantir que os checkboxes "TELEFONE/EMAIL" usem dados FRESCOS do banco.
      if (medicoCRM) {
        (async () => {
          try {
            const { data: medFresh } = await supabase.from('medicos').select('nome, crm, celular, email').eq('crm', medicoCRM).maybeSingle();
            if (medFresh) setMedicoDados(medFresh);
          } catch (e) {}
        })();
      }
      return () => clearTimeout(t);
    }
  }, [showAfiliados]);
  useEffect(() => {
    if (!showAfiliados) return;
    if (etapaAfil !== 1) return;
    const d = (afiliadoCEP || '').replace(/\D/g, '');
    if (d.length === 8) {
      const t = setTimeout(() => { setEtapaAfil(2); if (refAfilCPF.current) refAfilCPF.current.focus(); }, 1000);
      return () => clearTimeout(t);
    }
  }, [afiliadoCEP, showAfiliados, etapaAfil]);
  // Recalcula idade automaticamente sempre que dataNascimento muda (incluindo quando setada via setInputs externamente,
  // por exemplo no fluxo Triagem\u2192Calculator pelo bot\u00e3o "APROFUNDAR AVALIA\u00c7\u00c3O INICIADA").
  useEffect(() => {
    const dn = String(inputs.dataNascimento || '').trim();
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dn)) return;
    const [d, m, a] = dn.split('/').map(Number);
    const dt = new Date(a, m - 1, d);
    const valida = dt.getFullYear() === a && dt.getMonth() === m - 1 && dt.getDate() === d;
    if (!valida || a < 1900 || dt > new Date()) return;
    const hoje = new Date();
    let idade = hoje.getFullYear() - a;
    const mDiff = hoje.getMonth() - (m - 1);
    if (mDiff < 0 || (mDiff === 0 && hoje.getDate() < d)) idade--;
    const idadeStr = String(idade);
    if (inputs.idade !== idadeStr) {
      setInputs(prev => ({ ...prev, idade: idadeStr }));
    }
  }, [inputs.dataNascimento]);
  const [pixTipo, setPixTipo] = useState('');
  const [showConviteAfiliado, setShowConviteAfiliado] = useState(false);
  const [destinoAposConvite, setDestinoAposConvite] = useState(null);
  const [dadosVieramDaTriagem, setDadosVieramDaTriagem] = useState(false);
  const [editandoDadosPaciente, setEditandoDadosPaciente] = useState(false);
  const refDataColetaForm = useRef(null);
  const refHbForm = useRef(null);
  const refVcmForm = useRef(null);
  const refRdwForm = useRef(null);
  // Seamless: o cursor salta Hb -> VCM -> RDW (ao atingir o tamanho, ou apos 1.3s de pausa). Sem travar campos.
  const timerHemoRef = useRef(null);
  function avancarSeamless(e, maxChars, nextRef) {
    handleChange(e);
    const v = String(e.target.value || '');
    if (timerHemoRef.current) clearTimeout(timerHemoRef.current);
    if (v.length < 1) return;
    if (v.length >= maxChars) { if (nextRef && nextRef.current) nextRef.current.focus(); return; }
    timerHemoRef.current = setTimeout(() => { if (nextRef && nextRef.current) nextRef.current.focus(); }, 1300);
  }
  // Data futura/invalida em campo de mascara: AVISA, LIMPA o campo e refoca o cursor no inicio.
  function checarDataFutura(name, el, msgFutura) {
    const v = String(inputs[name] || '').trim();
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(v)) return;
    const [d, m, a] = v.split('/').map(Number);
    const dt = new Date(a, m - 1, d);
    const valida = dt && dt.getFullYear() === a && dt.getMonth() === m - 1 && dt.getDate() === d;
    const ehFutura = valida && a >= 1900 && dt > new Date();
    if (!valida || a < 1900 || ehFutura) {
      setInputs(prev => ({ ...prev, [name]: '' }));
      setErros(prev => ({ ...prev, [name]: ehFutura ? msgFutura : 'Data inválida.' }));
      if (el) setTimeout(() => el.focus(), 0);
    }
  }
  // Data de nascimento: futuro/invalida + limites de idade (>120 rejeita, >=100 confirma).
  function checarDataNascimento(el) {
    const v = String(inputs.dataNascimento || '').trim();
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(v)) return;
    const [d, m, a] = v.split('/').map(Number);
    const dt = new Date(a, m - 1, d);
    const valida = dt && dt.getFullYear() === a && dt.getMonth() === m - 1 && dt.getDate() === d;
    const limpar = (msg) => {
      setInputs(prev => ({ ...prev, dataNascimento: '', idade: '' }));
      setErros(prev => ({ ...prev, dataNascimento: msg }));
      if (el) setTimeout(() => el.focus(), 0);
    };
    if (!valida || a < 1900) { limpar('Data inválida.'); return; }
    if (dt > new Date()) { limpar('A data de nascimento não pode ser no futuro.'); return; }
    const hoje = new Date();
    let idade = hoje.getFullYear() - a;
    const mDiff = hoje.getMonth() - (m - 1);
    if (mDiff < 0 || (mDiff === 0 && hoje.getDate() < d)) idade--;
    if (idade > 120) { limpar('Idade acima de 120 anos não é aceita — verifique a data.'); return; }
    if (idade >= 100 && !window.confirm(`A data informada resulta em ${idade} anos. Confirma?`)) {
      limpar('Confirme a data de nascimento.');
    }
  }
  const [conviteRecusado, setConviteRecusado] = useState(false);
  const [afiliacaoRecusada, setAfiliacaoRecusada] = useState(false);
  function podeConvite() {
    try { if (localStorage.getItem('medico_crm')) return false; } catch(e) {}
    return !cadastrado;
  }
  const [showAuthMedicoOverlay, setShowAuthMedicoOverlay] = useState(false);
  const [showFelicitacoes, setShowFelicitacoes] = useState(false);
  // Modal de felicitacoes: imagem de fundo revela no hover.
  const [bgFelicRevelado, setBgFelicRevelado] = useState(false);
  // SPLASH de entrada: imagem nitida + saudacao por 2s; depois surgem os botoes (abaixo da imagem).
  const [splashFelic, setSplashFelic] = useState(true);
  useEffect(() => {
    if (showFelicitacoes) {
      setSplashFelic(true); setBgFelicRevelado(false);
      const t = setTimeout(() => setSplashFelic(false), 2000);
      return () => clearTimeout(t);
    }
  }, [showFelicitacoes]);

  async function decidirPosTriagem() {
    // Caminho convite (medico novo): tudo sincrono → fecha resultado e abre convite no mesmo tick.
    if (podeConvite()) {
      setDestinoAposConvite('landing'); setShowConviteAfiliado(true);
      setTriagemResultado(null); setShowTriagem(false);
      return;
    }
    // Caminho !convite: a query e' assincrona. NAO fecha o modal de resultado antes — senao o
    // Calculator fica exposto durante o await (o "flash"). Fecha o resultado JUNTO com abrir o
    // proximo destino (mesmo tick), depois que a query resolve.
    let completo = false;
    try {
      const { data: md } = await supabase.from('medicos').select('nome, email').eq('crm', medicoCRM).maybeSingle();
      completo = !!(md && md.nome && String(md.nome).trim() && md.email && String(md.email).trim());
    } catch (e) { completo = false; }
    // Medico ja cadastrado (nome+email completos) = veterano: NAO mostra "Estamos felizes",
    // vai direto pro Calculator (dados ja preenchidos pela triagem). O modal de boas-vindas
    // so' faz sentido para quem acabou de se cadastrar (fluxo via showAuthMedicoOverlay).
    if (!completo) { setShowAuthMedicoOverlay('cadastro'); }
    setTriagemResultado(null); setShowTriagem(false);
  }
  const [showBeneficios, setShowBeneficios] = useState(false);

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
  const [briefingOBAFechado, setBriefingOBAFechado] = useState(false); // painel-resumo do OBA na marcação de bariátrico
  const [querExtratoOba, setQuerExtratoOba] = useState(false);          // médico opta por receber o extrato da anamnese
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
  const [medicoDados, setMedicoDados] = useState(null);

  useEffect(() => {
    async function carregarMedico() {
      const loginAt = localStorage.getItem('medico_login_at')
      const OITO_HORAS = 8 * 60 * 60 * 1000
      if (loginAt && Date.now() - parseInt(loginAt) > OITO_HORAS) {
        localStorage.removeItem('medico_crm')
        localStorage.removeItem('medico_nome')
        localStorage.removeItem('medico_login_at')
        localStorage.removeItem('medico_is_admin')
        localStorage.removeItem('medico_token')
        // setSessaoExpirada(true)  // estado vive no Calculator pai, nao no Form
        return
      }
      const { data, error } = await supabase.from('medicos').select('nome, crm, celular, email').eq('crm', medicoCRM).maybeSingle();
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
    setLogoClicks(prev => {
      const next = prev + 1;
      if (logoClickTimer.current) clearTimeout(logoClickTimer.current);
      if (next >= 5) { logoClickTimer.current = null; setShowAdminConfig(true); return 0; }
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
      if (e.key === 'm' || e.key === 'M') { e.preventDefault(); setInputs(p => ({ ...p, sexo:'M', idade:'20', dataColeta:hoje, ferritina:'', hemoglobina:'', vcm:'', rdw:'', satTransf:'' })); setResultado(null); setErros({}); }
      if (e.key === 'b' || e.key === 'B') { e.preventDefault(); setInputs(p => ({ ...p, sexo:'M', idade:'50', dataColeta:hoje, ferritina:'', hemoglobina:'', vcm:'', rdw:'', satTransf:'' })); setResultado(null); setErros({}); }
      if (e.key === 'f' || e.key === 'F') { e.preventDefault(); setInputs(p => ({ ...p, sexo:'F', idade:'20', dataColeta:hoje, ferritina:'', hemoglobina:'', vcm:'', rdw:'', satTransf:'' })); setResultado(null); setErros({}); }
      if (e.key === 'g' || e.key === 'G') { e.preventDefault(); setInputs(p => ({ ...p, sexo:'F', idade:'50', dataColeta:hoje, ferritina:'', hemoglobina:'', vcm:'', rdw:'', satTransf:'' })); setResultado(null); setErros({}); }
    }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keydown', handleDemoKey);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keydown', handleDemoKey); };
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
    if (name === 'dataColeta' && typeof value === 'string') {
      const digits = value.replace(/\D/g, '').slice(0, 8);
      let v = digits;
      if (digits.length > 4) v = digits.slice(0,2) + '/' + digits.slice(2,4) + '/' + digits.slice(4);
      else if (digits.length > 2) v = digits.slice(0,2) + '/' + digits.slice(2);
      setInputs(prev => ({ ...prev, dataColeta: v }));
      if (erros.dataColeta) setErros(prev => ({ ...prev, dataColeta: null }));
      return;
    }
    if (name === 'dataNascimento') {
      const digits = String(value).replace(/\D/g, '').slice(0, 8);
      let dn = digits;
      if (digits.length > 2 && digits.length <= 4) dn = digits.slice(0,2) + '/' + digits.slice(2);
      else if (digits.length > 4) dn = digits.slice(0,2) + '/' + digits.slice(2,4) + '/' + digits.slice(4);
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
    let valorAjustado = (type === 'checkbox') ? checked : value;
    if (['hemoglobina', 'vcm', 'rdw', 'ferritina', 'satTransf', 'peso'].includes(name) && typeof valorAjustado === 'string') {
      valorAjustado = valorAjustado.replace(',', '.');
    }
    const novoValor = name === 'cpf' ? formatarCPF(valorAjustado) : valorAjustado;
    setInputs(prev => ({ ...prev, [name]: novoValor }));
    if (erros[name]) setErros(prev => ({ ...prev, [name]: null }));
    if (name === 'bariatrica') { if (!checked) setDadosOBAColetados(null); }
    if (name === 'bariatrica_medico') {
      if (checked) { setInputs(prev => ({ ...prev, bariatrica: true, bariatrica_medico: true })); setBriefingOBAFechado(false); }
      else { setInputs(prev => ({ ...prev, bariatrica: false, bariatrica_medico: false })); setDadosOBAColetados(null); setQuerExtratoOba(false); setBriefingOBAFechado(false); }
    }
    if (LIMITES_ABERRANTE[name] && value !== '') {
      const num = parseFloat(String(value).replace(',', '.'));
      const lim = LIMITES_ABERRANTE[name];
      if (!isNaN(num) && (num < lim.min || num > lim.max)) setAberrantes(prev => ({ ...prev, [name]: true }));
      else setAberrantes(prev => ({ ...prev, [name]: false }));
    }
  }

  function validarCPF(cpf) {
    const c = String(cpf || '').replace(/\D/g, '');
    if (c.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(c)) return false;
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
    else if (!validarCPF(inputs.cpf)) novosErros.cpf = "CPF inv\u00e1lido";
    {
      const dn = String(inputs.dataNascimento || '').trim();
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dn)) {
        novosErros.dataNascimento = 'Use o formato DD/MM/AAAA';
      } else {
        const [d, m, a] = dn.split('/').map(Number);
        const dt = new Date(a, m - 1, d);
        const valida = dt.getFullYear() === a && dt.getMonth() === m - 1 && dt.getDate() === d;
        if (!valida) { novosErros.dataNascimento = "Data inv\u00e1lida"; }
        else if (a < 1900) { novosErros.dataNascimento = 'Verifique o ano de nascimento'; }
        else if (dt > new Date()) { novosErros.dataNascimento = "Data n\u00e3o pode ser no futuro"; }
        else {
          const hoje = new Date();
          let idade = hoje.getFullYear() - a;
          const mDiff = hoje.getMonth() - (m - 1);
          if (mDiff < 0 || (mDiff === 0 && hoje.getDate() < d)) idade--;
          if (idade < 12) {
            novosErros.dataNascimento = "O RedFairy ainda n\u00e3o atende crian\u00e7as menores de 12 anos. Em breve teremos um m\u00f3dulo pedi\u00e1trico espec\u00edfico!";
          } else if (idade > 100) {
            novosErros.dataNascimento = 'Verifique a data de nascimento';
          }
        }
      }
    }
    if (!inputs.dataColeta) novosErros.dataColeta = 'Informe a data da coleta';
    else {
      // inputs.dataColeta esta em DD/MM/AAAA; converter pra comparar com hoje
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(inputs.dataColeta)) {
        const [d, m, a] = inputs.dataColeta.split('/').map(Number);
        const dtColeta = new Date(a, m - 1, d);
        const hoje = new Date();
        hoje.setHours(23, 59, 59, 999);
        const valida = dtColeta.getFullYear() === a && dtColeta.getMonth() === m - 1 && dtColeta.getDate() === d;
        if (!valida) novosErros.dataColeta = "Data inv\u00e1lida";
        else if (dtColeta > hoje) novosErros.dataColeta = "Data da coleta n\u00e3o pode ser no futuro";
      } else {
        novosErros.dataColeta = "Use o formato DD/MM/AAAA";
      }
    }
    if (!inputs.hemoglobina) novosErros.hemoglobina = "Campo obrigat\u00f3rio";
    if (!inputs.vcm)         novosErros.vcm = "Campo obrigat\u00f3rio";
    if (!inputs.rdw)         novosErros.rdw = "Campo obrigat\u00f3rio";
    if (mostrarExamesExtras && !inputs.ferritina) novosErros.ferritina = "Campo obrigat\u00f3rio";
    if (mostrarExamesExtras && !inputs.satTransf) novosErros.satTransf = "Campo obrigat\u00f3rio";
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
      dataColeta: (() => {
        const dc = String(inputs.dataColeta || '').trim();
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dc)) {
          const [d, m, a] = dc.split('/').map(Number);
          return `${a}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        }
        return dc; // ja em ISO ou outro formato
      })(),
      ferritina:   Number(sanitizarNumero(inputs.ferritina)),
      hemoglobina: Number(sanitizarNumero(inputs.hemoglobina)),
      vcm:         Number(sanitizarNumero(inputs.vcm)),
      rdw:         Number(sanitizarNumero(inputs.rdw)),
      satTransf:   Number(sanitizarNumero(inputs.satTransf)),
    };

    const res = mostrarExamesExtras ? avaliarPaciente(inputsNumericos) : triagemEritron(inputsNumericos);

    let obaResult = null;
    const obaDisponivel = dadosOBAColetados || dadosOBARef.current;
    if (inputs.bariatrica && obaDisponivel) {
      let dadosOBA = null;
      let examesOBA = null;
      if (obaDisponivel) {
        dadosOBA  = obaDisponivel.dadosOBA;
        examesOBA = obaDisponivel.examesOBA;
      } else if (inputs.cpf.trim()) {
        const cpfLimpo = inputs.cpf.replace(/\D/g, '');
        const { data: obaRow } = await supabase.from('oba_anamnese').select('*').eq('cpf', cpfLimpo).order('created_at', { ascending: false }).limit(1).single();
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
          tipo_cirurgia: "N\u00c3O SEI", meses_pos_cirurgia: 0,
          status_gestacional: inputs.gestante ? "GR\u00c1VIDA" : null,
          compulsoes: inputs.alcoolista ? ["\u00c1LCOOL"] : [],
          medicamentos: [
            ...(inputs.vitaminaB12 ? ['VIT. B12 SUBLINGUAL'] : []),
            ...(inputs.ferro_oral  ? ['FERRO ORAL']          : []),
            ...(inputs.ferro_injetavel ? ["FERRO INJET\u00c1VEL"] : []),
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
      // Logica de afiliados/banner SO se for medico logado (medicoCRM existe).
      // Paciente vindo da triagem pelo botao azul nao entra aqui.
      if (medicoCRM) {
        const { count: totalAvals } = await supabase.from('avaliacoes').select('*', { count: 'exact', head: true }).eq('medico_crm', medicoCRM)
        const { data: medDados } = await supabase.from('medicos').select('cep, cpf, pix_chave').eq('crm', medicoCRM).maybeSingle()
        if (!medDados?.cep || !medDados?.cpf || !medDados?.pix_chave) {
          // Se o 4DOC ja foi oferecido (e declinado) nesta sessao, nao reabre o modal cheio:
          // no maximo o banner discreto. (Antes, o modal reaparecia logo apos a 1a avaliacao.)
          if ((totalAvals || 0) === 0 && !jaOfereceu4DOCRef.current) setTimeout(() => setShowAfiliados(true), 1200)
          else setTimeout(() => setShowAfiliadosBanner(true), 1200)
        }
      }
      // dataColeta esta em DD/MM/AAAA; Supabase coluna date espera YYYY-MM-DD
      let dataColetaISO = inputs.dataColeta;
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(inputs.dataColeta || '')) {
        const [d, m, a] = inputs.dataColeta.split('/');
        dataColetaISO = `${a}-${m}-${d}`;
      }
      await supabase.from('avaliacoes').insert({
        cpf: inputs.cpf.replace(/\D/g, ''),
        data_coleta: dataColetaISO,
        peso: inputs.peso !== '' && Number.isFinite(Number(inputs.peso)) ? Number(inputs.peso) : null,
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
        semanas_gestacao: inputs.gestante && inputs.semanas_gestacao ? Math.round(Number(inputs.semanas_gestacao)) : null,
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
        quer_extrato_oba: querExtratoOba,
      });
    }
    setTimeout(() => { document.getElementById('resultado')?.scrollIntoView({ behavior: 'smooth' }); }, 100);
  }

  function handleCopiar() {
    if (!resultado) return;
    const texto = formatarParaCopiar(resultado, resultado._inputs);
    // Copia pra clipboard (para o usu\u00e1rio poder colar em outro lugar)
    // E ABRE WhatsApp Web/App pra ele enviar pro paciente em 1 clique.
    // O telefone do paciente, se houver, vem em resultado._inputs.celularPaciente ou similar; sen\u00e3o,
    // abre o WhatsApp sem destinat\u00e1rio (o usu\u00e1rio escolhe no contato).
    try {
      navigator.clipboard.writeText(texto).then(() => {
        setCopiado(true);
        setTimeout(() => setCopiado(false), 3000);
      });
    } catch (e) {}
    try {
      const celRaw = (resultado._inputs && (resultado._inputs.celularPaciente || resultado._inputs.celular)) || '';
      const cel = String(celRaw).replace(/\D/g, '');
      // Mensagem encoded
      const msgEnc = encodeURIComponent(texto);
      // Se tem celular, manda pra ele; sen\u00e3o, abre WhatsApp sem destinat\u00e1rio
      const url = cel ? `https://wa.me/55${cel}?text=${msgEnc}` : `https://wa.me/?text=${msgEnc}`;
      window.open(url, '_blank');
    } catch (e) {}
  }

  function handleLimpar() {
    setInputs({ cpf: '', sexo: 'M', idade: '', dataNascimento: '', dataColeta: '', ferritina: '', hemoglobina: '', vcm: '', rdw: '', satTransf: '', bariatrica: false, vegetariano: false, perda: false, hipermenorreia: false, gestante: false, alcoolista: false, transfundido: false, aspirina: false, vitaminaB12: false, vitB12_SL: false, vitB12_IM: false, ferro_oral: false, ferro_injetavel: false, tiroxina: false, hidroxiureia: false, anticonvulsivante: false, testosterona: false, anemiaPrevia: false, sideropenia: false, sobrecargaFerro: false, hbAlta: false, celiaco: false, g6pd: false, endometriose: false, doadorSangue: false, methotrexato: false, hivTratamento: false, metformina: false, ibp: false });
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
            // Converte data_coleta (ISO: YYYY-MM-DD) para o formato DD/MM/AAAA usado no Calculator.
            // novosInputs.dataNascimento j\u00e1 vem em DD/MM/AAAA da TriagemModal.
            let dataColetaBR = '';
            if (novosInputs.data_coleta) {
              const m = String(novosInputs.data_coleta).match(/^(\d{4})-(\d{2})-(\d{2})/);
              if (m) dataColetaBR = `${m[3]}/${m[2]}/${m[1]}`;
            }
            setInputs(prev => ({
              ...prev,
              cpf: novosInputs.cpf || prev.cpf,
              sexo: novosInputs.sexo || prev.sexo,
              idade: String(novosInputs.idade || prev.idade || ''),
              dataNascimento: novosInputs.dataNascimento || prev.dataNascimento || '',
              dataColeta: dataColetaBR || prev.dataColeta || '',
              gestante: novosInputs.gestante || prev.gestante || false,
              semanas_gestacao: novosInputs.semanas_gestacao ? String(novosInputs.semanas_gestacao) : prev.semanas_gestacao,
              hemoglobina: String(novosInputs.hemoglobina || prev.hemoglobina || ''),
              vcm: String(novosInputs.vcm || prev.vcm || ''),
              rdw: String(novosInputs.rdw || prev.rdw || ''),
              // Propaga a flag bari\u00e1trica capturada na triagem para ambos os caminhos
              // (bariatrica do hist\u00f3rico e bariatrica_medico do topo).
              bariatrica: novosInputs.bariatrica || prev.bariatrica || false,
              bariatrica_medico: novosInputs.bariatrica || prev.bariatrica_medico || false,
            }));
          }}
          onFechar={() => {
            setShowTriagem(false);
            setTriagemResultado(null);
            if (onVoltar) onVoltar();
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
          onVoltarInicio={() => { decidirPosTriagem(); }}
          onCadastrar={() => { decidirPosTriagem(); }}
          onAprofundar={() => {
            setTriagemResultado(null);
            setShowTriagem(false);
            if (podeConvite()) {
              setDestinoAposConvite('aprofundar');
              setShowConviteAfiliado(true);
              return;
            }
          }}
        />
      )}
    <div className="min-h-screen bg-gray-50">

      {showAfiliadosBanner && !showAfiliados && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-red-700 px-5 py-3 flex items-center justify-between">
              <p className="text-white font-bold text-sm">{"\ud83c\udfaf Programa de Afiliados RedFairy"}</p>
              <button onClick={() => setShowAfiliadosBanner(false)} className="text-red-200 hover:text-white text-lg"
                style={{ fontFamily: 'Apple Color Emoji, Segoe UI Symbol, Noto Sans Symbols, sans-serif', lineHeight: 1 }}>
                {"\u2715"}
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-gray-700 text-sm leading-relaxed">
                {"Voc\u00ea ainda n\u00e3o faz parte do "}<strong>Programa de Afiliados Patrocinado</strong>{". Gostaria de entrar agora e receber os benef\u00edcios previstos?"}
              </p>
              <div className="flex gap-2">
                <button onClick={() => { setShowAfiliadosBanner(false); setShowAfiliados(true) }}
                  className="flex-1 bg-red-700 hover:bg-red-800 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
                  {"Sim, quero participar \u2192"}
                </button>
                <button onClick={() => setShowAfiliadosBanner(false)}
                  className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm rounded-xl transition-colors">
                  {"Agora n\u00e3o"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAfiliados && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" style={{ maxHeight: '92vh', display: 'flex', flexDirection: 'column', position: 'relative' }}
            onMouseEnter={() => setBgAfilRevelado(true)} onMouseLeave={() => setBgAfilRevelado(false)} onTouchStart={() => setBgAfilRevelado(true)}>
            {/* Imagem de fundo: inteira (contain) e esmaecida; revela no hover (igual a' hero) */}
            {/* Imagem de fundo: faixa de largura cheia, cortada na cintura, CENTRADA no modal; revela no hover */}
            <div aria-hidden="true" style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '370px', transform: 'translateY(-50%)', backgroundImage: `url(${welcomeImg})`, backgroundSize: '100% auto', backgroundPosition: 'center top', backgroundRepeat: 'no-repeat', filter: bgAfilRevelado ? 'blur(0px)' : 'blur(10px)', opacity: bgAfilRevelado ? 0.5 : 0.12, transition: 'filter 0.6s ease, opacity 0.6s ease', pointerEvents: 'none' }} />
            {/* SPLASH de entrada: imagem (largura cheia, cortada na cintura, centrada) + greeting por 5s, antes dos campos */}
            <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 5, backgroundColor: '#FDF7F7', opacity: splashAfil ? 1 : 0, pointerEvents: splashAfil ? 'auto' : 'none', transition: 'opacity 0.5s ease' }}>
              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '370px', transform: 'translateY(-50%)' }}>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${welcomeImg})`, backgroundSize: '100% auto', backgroundPosition: 'center top', backgroundRepeat: 'no-repeat' }} />
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: '6%', padding: '0 28px', textAlign: 'center' }}>
                  <p style={{ color: '#ffffff', fontSize: '26px', fontWeight: 900, lineHeight: 1.18, margin: 0, textShadow: '0 2px 14px rgba(0,0,0,0.75), 0 1px 4px rgba(0,0,0,0.6)' }}>{"Bem-Vindo ao 4DOC® Programa Patrocinado de Médicos Afiliados"}</p>
                </div>
              </div>
            </div>
            {/* Header compacto estilo TriagemModal: logo-fada + RedFairy em dois tons.
                zIndex 10 (acima do splash zIndex 5) p/ o header ja aparecer durante a imagem. */}
            <div style={{ position: 'relative', zIndex: 10, background: 'rgba(255,255,255,0.92)', borderBottom: '1px solid #f1f5f9', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <img src={logo} alt="RedFairy" style={{ width: 28, height: 28, objectFit: 'contain' }} />
              <h2 style={{ fontFamily: "'Georgia', serif", fontWeight: 900, fontSize: '1.25rem', letterSpacing: '-0.02em', margin: 0 }}>
                <span style={{ color: '#b91c1c' }}>Red</span><span style={{ color: '#ef4444' }}>Fairy</span>
              </h2>
            </div>
            {/* Subtitulo vinho do programa: zIndex 10 p/ aparecer desde o inicio, junto do header */}
            <div style={{ position: 'relative', zIndex: 10, background: 'rgba(255,255,255,0.92)', borderBottom: '1px solid #f1f5f9', padding: '0 14px 9px', flexShrink: 0 }}>
              <p style={{ margin: 0, color: '#7B1E1E', fontWeight: 700, fontSize: '13px', letterSpacing: '0.3px' }}>{"4DOC® Programa de Afiliados"}</p>
            </div>

            <div className="p-6 space-y-4" style={{ overflowY: 'auto', flex: 1, position: 'relative', zIndex: 1 }}>
              <p className="text-gray-700 text-sm leading-relaxed">
                {"Para concluir a sua inscri\u00e7\u00e3o no "}<strong>Programa de Afiliados Patrocinado</strong>{" de RedFairy e receber os benef\u00edcios previstos, precisamos do seu "}<strong>CEP</strong>{", "}<strong>CPF</strong>{" e da sua "}<strong>chave Pix</strong>{"."}
              </p>
              <p className="text-xs text-red-800 text-center leading-relaxed font-medium">
                {"\ud83d\udd12 Entre seus dados tranquilamente. Voc\u00ea est\u00e1 em um servidor seguro, e n\u00e3o existe a possibilidade de uso inadequado dessas informa\u00e7\u00f5es."}
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">CEP</label>
                  <input ref={refAfilCEP} type="text" value={afiliadoCEP}
                    onChange={e => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
                      const fmt = digits.length > 5 ? digits.slice(0,5) + '-' + digits.slice(5) : digits;
                      setAfiliadoCEP(fmt);
                    }}
                    placeholder="00000-000" inputMode="numeric"
                    className={`w-full border-2 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${etapaAfil === 1 ? 'border-yellow-400 bg-yellow-50 focus:ring-yellow-400' : 'border-gray-200 focus:ring-red-400'}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">CPF</label>
                  <input ref={refAfilCPF} type="text" value={afiliadoCPF}
                    onFocus={() => setEtapaAfil(2)}
                    onChange={e => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                      let fmt = digits;
                      if (digits.length > 9) fmt = digits.slice(0,3) + '.' + digits.slice(3,6) + '.' + digits.slice(6,9) + '-' + digits.slice(9);
                      else if (digits.length > 6) fmt = digits.slice(0,3) + '.' + digits.slice(3,6) + '.' + digits.slice(6);
                      else if (digits.length > 3) fmt = digits.slice(0,3) + '.' + digits.slice(3);
                      setAfiliadoCPF(fmt);
                      if (pixTipo === 'cpf') setAfiliadoPix(fmt);
                      // Valida\u00e7\u00e3o imediata do CPF do m\u00e9dico:
                      // - 11 d\u00edgitos + inv\u00e1lido \u2192 mostra erro
                      // - 11 d\u00edgitos + v\u00e1lido \u2192 limpa erro e move foco para Chave PIX
                      // - menos de 11 \u2192 limpa erro (n\u00e3o reclama enquanto digita)
                      if (digits.length === 11) {
                        if (!validarCPF(fmt)) {
                          setAfiliadoCPFErro("CPF inv\u00e1lido");
                        } else {
                          setAfiliadoCPFErro('');
                          setTimeout(() => { if (refAfilPix.current) refAfilPix.current.focus(); }, 50);
                        }
                      } else {
                        setAfiliadoCPFErro('');
                      }
                    }}
                    placeholder="000.000.000-00" inputMode="numeric"
                    className={`w-full border-2 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${afiliadoCPFErro ? 'border-red-500 bg-red-50 focus:ring-red-400' : (etapaAfil === 2 ? 'border-yellow-400 bg-yellow-50 focus:ring-yellow-400' : 'border-gray-200 focus:ring-red-400')}`}
                  />
                  {afiliadoCPFErro && (
                    <p className="text-red-600 text-xs mt-1 font-semibold">{afiliadoCPFErro}</p>
                  )}
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
                      <span className="text-gray-700 font-medium" style={{ fontSize: '12px', letterSpacing: '0.3px' }}>{"MEU TELEFONE \u00c9 O MEU PIX"}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="checkbox" checked={pixTipo === 'cpf'}
                        onChange={() => {
                          if (pixTipo === 'cpf') { setPixTipo(''); setAfiliadoPix(''); }
                          else { setPixTipo('cpf'); setAfiliadoPix(afiliadoCPF); }
                        }}
                        style={{ accentColor: '#7B1E1E' }} />
                      <span className="text-gray-700 font-medium" style={{ fontSize: '12px', letterSpacing: '0.3px' }}>{"MEU CPF \u00c9 O MEU PIX"}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="checkbox" checked={pixTipo === 'email'}
                        onChange={() => {
                          if (pixTipo === 'email') { setPixTipo(''); setAfiliadoPix(''); }
                          else { setPixTipo('email'); setAfiliadoPix(medicoDados?.email || ''); }
                        }}
                        style={{ accentColor: '#7B1E1E' }} />
                      <span className="text-gray-700 font-medium" style={{ fontSize: '12px', letterSpacing: '0.3px' }}>{"MEU E-MAIL \u00c9 O MEU PIX"}</span>
                    </label>
                  </div>
                  <p className="text-xs text-red-800 font-semibold mb-1">DIGITE ou marque um check-box acima</p>
                  <input ref={refAfilPix} type="text" value={afiliadoPix}
                    onChange={e => { setAfiliadoPix(e.target.value); if (pixTipo) setPixTipo('outra'); }}
                    placeholder={"Chave aleat\u00f3ria ou outra chave PIX"}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer mt-1 mb-2">
                <input type="checkbox" checked={usaTelegram} onChange={e => setUsaTelegram(e.target.checked)} style={{ accentColor: '#7B1E1E' }} />
                <span className="text-gray-700 font-medium" style={{ fontSize: '12px', letterSpacing: '0.3px' }}>{"USO TAMBÉM O TELEGRAM"}</span>
              </label>
              {afiliadoSalvo ? null : (
                <div className="space-y-2">
                {afiliadoCEP.trim() && afiliadoCPF.trim() && afiliadoPix.trim() && !afiliadoCPFErro && (
                  <div className="flex flex-col items-end gap-1 pt-1">
                    {/* Botao cinza piscante com PLAY + "CONFIRMO" (vinho) \u2014 padrao novo, alinhado a' direita */}
                    <style>{`@keyframes rfPlayBlinkWine { 0%,100%{box-shadow:0 0 0 0 rgba(123,30,30,0.55);} 50%{box-shadow:0 0 0 9px rgba(123,30,30,0);} } .rf-play-wine{ animation: rfPlayBlinkWine 1.1s ease-in-out infinite; }`}</style>
                    <button disabled={afiliadoSalvando || !afiliadoCEP.trim() || !afiliadoCPF.trim() || !afiliadoPix.trim() || !!afiliadoCPFErro}
                      onClick={async () => {
                        setAfiliadoSalvando(true);
                        const { error } = await supabase.from('medicos').update({
                          endereco: '', cep: afiliadoCEP.trim(),
                          cpf: afiliadoCPF.replace(/\D/g, ''),
                          pix_chave: afiliadoPix.trim(),
                          usa_telegram: usaTelegram,
                        }).eq('crm', medicoCRM);
                        setAfiliadoSalvando(false);
                        if (error) { alert('Erro ao salvar. Tente novamente.'); return; }
                        // Direto para tela de felicita\u00e7\u00f5es sem mensagem intermedi\u00e1ria "Dados salvos"
                        setAfiliadoSalvo(true); setShowAfiliados(false); setShowFelicitacoes(true);
                      }}
                      aria-label="Confirmar dados"
                      className="rf-play-wine w-14 h-14 rounded-full bg-gray-300 hover:bg-gray-400 flex items-center justify-center transition-colors shadow-md disabled:opacity-50">
                      <span style={{ color: '#7B1E1E', fontSize: '1.4rem', lineHeight: 1, marginLeft: 3 }}>{afiliadoSalvando ? '\u2026' : "\u25b6"}</span>
                    </button>
                    <span className="text-xs font-bold tracking-wide" style={{ color: '#7B1E1E' }}>{afiliadoSalvando ? '...' : 'CONFIRMO'}</span>
                  </div>
                )}
                  <button onClick={() => setShowAfiliados(false)}
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
            semanas_gestacao: inputs.semanas_gestacao ? Math.round(Number(inputs.semanas_gestacao)) : null,
            dum: inputs.dum || null,
          }}
          onConcluir={(dadosOBA, examesOBA) => {
            const dados = { dadosOBA, examesOBA };
            dadosOBARef.current = dados;
            setDadosOBAColetados(dados);
            setShowOBA(false);
            setTimeout(() => { document.getElementById('btn-avaliar-paciente')?.click(); }, 100);
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
              <p className="text-red-200 text-xs">{"Calculadora Cl\u00ednica | Eritron"}</p>
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
            <p className="text-center text-base font-bold text-gray-700">{"Trocar m\u00e9dico?"}</p>
            <p className="text-center text-sm text-gray-500">{"Voc\u00ea ser\u00e1 desconectado e voltar\u00e1 \u00e0 tela de login."}</p>
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
            <p className="text-center text-sm font-bold text-gray-700">{"\ud83c\udfad Modo Demo"}</p>
            <p className="text-center text-xs text-gray-400">Escolha o perfil de teste</p>
            <button onClick={() => carregarDemo('F')} className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 rounded-xl transition-colors">{"\ud83d\udc69 Paciente Feminina"}</button>
            <button onClick={() => carregarDemo('M')} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors">{"\ud83d\udc68 Paciente Masculino"}</button>
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
                  {"Eu sou a sua fada vermelha, a sua "}<span style={{ fontWeight: 'bold' }}>HEMOGLOBINA</span>{"."}<br />
                  {"Eu uso a poeira das estrelas para te entregar o ar."}<br />
                  <span style={{ fontWeight: '600' }}>{"Quanto tempo voc\u00ea vive sem ar?"}</span>
                </p>
              </div>
            </div>
            <div style={{ padding: '20px' }}>
              {!showSaibaMais && (
                <button onClick={() => setShowSaibaMais(true)} className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl text-sm transition-colors mb-4">Saiba Mais</button>
              )}
              {showSaibaMais && (
                <div style={{ marginBottom: '16px' }}>
                  <h3 className="text-red-700 font-bold text-base text-center mb-4">{"Vida \u00e9 ventila\u00e7\u00e3o e perfus\u00e3o"}</h3>
                  <p className="text-gray-700 text-sm leading-relaxed mb-3">{"O Ferro em voc\u00ea veio das estrelas, e dele o vermelho do seu sangue - a sua pot\u00eancia. Com Ferro, a Natureza faz a "}<strong>Hemoglobina</strong>{", a prote\u00edna vermelha e mais importante da sua vida."}</p>
                  <p className="text-gray-700 text-sm leading-relaxed mb-3">{"Ela sustenta a ventila\u00e7\u00e3o e realiza a perfus\u00e3o: capta o oxig\u00eanio do ar que ventila os pulm\u00f5es e o entrega a todas as suas c\u00e9lulas - vinte vezes por minuto."}</p>
                  <p className="text-gray-700 text-sm leading-relaxed mb-3">{"Ao mesmo tempo, a Hemoglobina captura o CO2 produzido pela queima do alimento em suas c\u00e9lulas, e o leva aos seus pulm\u00f5es para que voc\u00ea o expire no ar do mundo."}</p>
                  <p className="text-gray-700 text-sm leading-relaxed mb-3">{"No ambiente, uma prote\u00edna verde - a "}<strong>clorofila</strong>{", m\u00e3e da Hemoglobina - usa a luz do sol para partir o CO2 e fazer a\u00e7\u00facar a partir de luz, carbono e \u00e1gua, devolvendo o oxig\u00eanio ao ar do planeta, em um ciclo virtuoso perfeito."}</p>
                  <div className="mt-4 bg-pink-50 border-2 border-red-400 rounded-xl p-4 text-center">
                    <p className="text-black font-bold text-sm">{"Portanto, \u00e9 importante que voc\u00ea cuide da sua Hemoglobina."}</p>
                    <p className="text-black font-bold text-sm mt-2">{"N\u00f3s ajudamos."}</p>
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
        {!resultado && (
        <form onSubmit={handleSubmit} className="space-y-4">

          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-700 flex items-center gap-2">
                <IconPaciente /> Dados do Paciente
              </h2>
              {dadosVieramDaTriagem && !editandoDadosPaciente && (
                <button type="button" onClick={() => setEditandoDadosPaciente(true)}
                  className="flex items-center gap-1 text-xs font-bold text-red-700 hover:text-red-800 transition-colors">
                  <span style={{ fontSize: '0.9rem' }}>{"\u270f\ufe0f"}</span> EDITAR
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">CPF</label>
                <input type="text" name="cpf" value={inputs.cpf} onChange={handleChange} disabled={dadosVieramDaTriagem && !editandoDadosPaciente} placeholder="000.000.000-00" maxLength={14} inputMode="numeric" className={`input ${dadosVieramDaTriagem && !editandoDadosPaciente ? 'bg-gray-100 text-gray-500' : ''}`} />
                {(!dadosVieramDaTriagem || editandoDadosPaciente) && (
                  <p className="text-xs text-orange-500 mt-0.5">{"Digite apenas os n\u00fameros, sem pontos ou h\u00edfen"}</p>
                )}
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
                <input type="text" name="dataNascimento" value={inputs.dataNascimento} onChange={handleChange} onBlur={(e) => checarDataNascimento(e.target)} disabled={dadosVieramDaTriagem && !editandoDadosPaciente} placeholder="DD/MM/AAAA" inputMode="numeric" maxLength={10} autoComplete="off" className={`input ${erros.dataNascimento ? 'border-red-500' : ''} ${dadosVieramDaTriagem && !editandoDadosPaciente ? 'bg-gray-100 text-gray-500' : ''}`} />
                {inputs.idade && !erros.dataNascimento && <p className="text-red-600 text-xs mt-1 font-semibold">Idade: {inputs.idade} anos</p>}
                {erros.dataNascimento && <p className="text-red-500 text-xs mt-1">{erros.dataNascimento}</p>}
              </div>
              <div>
                <label className="label">Peso (kg)</label>
                <input type="text" name="peso" value={inputs.peso} onChange={handleChange} disabled={dadosVieramDaTriagem && !editandoDadosPaciente} placeholder="Ex: 72" inputMode="decimal" maxLength={6} autoComplete="off" className={`input ${dadosVieramDaTriagem && !editandoDadosPaciente ? 'bg-gray-100 text-gray-500' : ''}`} />
                <p className="text-xs text-gray-400 mt-0.5">{"Opcional — usado no cálculo de dose de ferro EV"}</p>
              </div>
              <div className="col-span-2">
                <label className={`flex items-start gap-2 p-3 rounded-xl border-2 transition-all ${dadosVieramDaTriagem && !editandoDadosPaciente ? 'cursor-default' : 'cursor-pointer'} ${inputs.bariatrica_medico ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                  <input type="checkbox" name="bariatrica_medico" checked={inputs.bariatrica_medico} onChange={handleChange} disabled={dadosVieramDaTriagem && !editandoDadosPaciente} className="mt-0.5 w-4 h-4 cursor-pointer flex-shrink-0 disabled:opacity-50" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm leading-tight">
                      {inputs.sexo === 'F' ? "Paciente Bari\u00e1trica" : "Paciente Bari\u00e1trico"}
                    </p>
                    <p className="text-xs opacity-70 leading-tight mt-0.5">
                      {(dadosVieramDaTriagem && !editandoDadosPaciente && inputs.bariatrica_medico && !medicoCRM)
                        ? (inputs.sexo === 'F'
                            ? "NA CONDI\u00c7\u00c3O DE BARI\u00c1TRICA VOC\u00ca PASSAR\u00c1 POR AVALIA\u00c7\u00c3O ESPEC\u00cdFICA"
                            : "NA CONDI\u00c7\u00c3O DE BARI\u00c1TRICO VOC\u00ca PASSAR\u00c1 POR AVALIA\u00c7\u00c3O ESPEC\u00cdFICA")
                        : (inputs.sexo === 'F'
                            ? "Na condi\u00e7\u00e3o de BARI\u00c1TRICA, uma vez CADASTRADA na plataforma a sua paciente ter\u00e1 acesso ao Projeto OBA, para melhor qualidade de vida."
                            : "Na condi\u00e7\u00e3o de BARI\u00c1TRICO, uma vez CADASTRADO na plataforma o seu paciente ter\u00e1 acesso ao Projeto OBA, para melhor qualidade de vida.")}
                    </p>
                  </div>
                </label>
                {inputs.bariatrica_medico && !briefingOBAFechado && (
                  <div className="mt-2 rounded-xl border-2 border-amber-300 bg-amber-50 p-3 relative">
                    <button type="button" onClick={() => setBriefingOBAFechado(true)}
                      className="absolute top-2 right-2 text-amber-500 hover:text-amber-700 text-lg leading-none" aria-label="Fechar">{"✕"}</button>
                    <p className="text-sm font-bold text-amber-800 pr-6">{"ℹ️ Projeto OBA — o que o paciente vai responder"}</p>
                    <p className="text-xs text-amber-700 mt-1">{"Ao se cadastrar, o paciente preenche a anamnese OBA (acompanhamento dinâmico do bariátrico). Ela cobre:"}</p>
                    <ul className="text-xs text-amber-800 mt-2 space-y-1 list-disc pl-4">
                      <li>{"Cirurgia: tipo, tempo pós-op, evolução de peso e metas"}</li>
                      <li>{"STATUS clínicos: glicêmico, pressórico, ósseo, dental, gestacional, endoscópico, neurológico, intestinal"}</li>
                      <li>{"Hábitos: compulsões, atividade física, emagrecedores, medicamentos"}</li>
                      <li>{"Risco vascular: trombose, anticoagulação, varizes"}</li>
                      <li>{"Painel laboratorial completo do bariátrico (B12, vit D, ferritina, PTH, cálcio, zinco, magnésio, vitaminas A/E/K/C, lipidograma avançado, hepático/renal, glicemia/HbA1c…)"}</li>
                      <li>{"Metas e projetos de vida"}</li>
                    </ul>
                    <label className="flex items-start gap-2 mt-3 pt-2 border-t border-amber-200 cursor-pointer">
                      <input type="checkbox" checked={querExtratoOba} onChange={e => setQuerExtratoOba(e.target.checked)} className="mt-0.5 w-4 h-4 cursor-pointer flex-shrink-0" />
                      <span className="text-xs font-semibold text-amber-800">{"Quero receber o extrato da anamnese deste paciente quando ele preencher."}</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </section>

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
              onBlur={(e) => checarDataFutura('dataColeta', e.target, 'A data da coleta não pode ser no futuro.')}
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
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-2">
                <LabInput ref={refHbForm} onEnter={() => refVcmForm.current && refVcmForm.current.focus()} label="Hemoglobina" unit="g/dL" name="hemoglobina" reference={inputs.sexo === 'M' ? '13.5-17.5' : '12-15.5'} value={inputs.hemoglobina} onChange={(e) => avancarSeamless(e, 4, refVcmForm)} error={erros.hemoglobina} aberrante={!!aberrantes["hemoglobina"]} borderColor="red" />
              </div>
              <LabInput ref={refVcmForm} onEnter={() => refRdwForm.current && refRdwForm.current.focus()} label="VCM" unit="fL" name="vcm" reference="80-100" value={inputs.vcm} onChange={(e) => avancarSeamless(e, 5, refRdwForm)} error={erros.vcm} aberrante={!!aberrantes["vcm"]} borderColor="red" />
              <LabInput ref={refRdwForm} onEnter={() => refRdwForm.current && refRdwForm.current.blur()} label="RDW-CV" unit="%" name="rdw" reference="11.5-15" value={inputs.rdw} onChange={handleChange} error={erros.rdw} aberrante={!!aberrantes["rdw"]} borderColor="red" />
            </div>

            {!mostrarExamesExtras && (
              <div className="flex items-center gap-3 mt-3 px-1">
                <style>{`
                  @keyframes rfPlayBlinkBlue {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(37,99,235,0.6); }
                    50%      { box-shadow: 0 0 0 8px rgba(37,99,235,0); }
                  }
                  .rf-play-blue { animation: rfPlayBlinkBlue 1s ease-in-out infinite; }
                `}</style>
                <p className="text-sm font-semibold text-blue-700 leading-snug flex-1">
                  {"Para digitar FERRITINA e SATURA\u00c7\u00c3O DA TRANSFERRINA (%) acione o bot\u00e3o"}
                </p>
                <button
                  type="button"
                  onClick={() => setMostrarExamesExtras(true)}
                  aria-label="Liberar campos de Ferritina e Satura\u00e7\u00e3o da Transferrina"
                  className="rf-play-blue flex-shrink-0 w-12 h-12 rounded-full bg-gray-300 hover:bg-gray-400 flex items-center justify-center transition-colors">
                  <span style={{ color: '#2563eb', fontSize: '1.3rem', lineHeight: 1 }}>{"\u25b6"}</span>
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mt-3">
              <LabInput
                ref={ferritinaRef}
                label="Ferritina"
                unit="ng/mL"
                name="ferritina"
                reference={inputs.sexo === 'M' ? '24-300' : '25-150'}
                value={inputs.ferritina}
                onChange={handleChange}
                error={erros.ferritina}
                hint={mostrarExamesExtras ? "N\u00e3o use ponto para valores superiores a 1000. Ex: 1140" : "Clique no bot\u00e3o azul para liberar"}
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
                hint={mostrarExamesExtras ? null : "Clique no bot\u00e3o azul para liberar"}
                aberrante={!!aberrantes["satTransf"]}
                disabled={!mostrarExamesExtras}
                borderColor="blue"
              />
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <IconHistorico /> {"Hist\u00f3rico Cl\u00ednico"}
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {/* Bari\u00e1trico/a foi movido para "Dados do Paciente" (entrada inicial, sempre presente). */}
              <CheckboxCard name="vegetariano" label="Vegetariano/Vegano" sublabel="Dieta sem carne" checked={inputs.vegetariano} onChange={handleChange} color="green" />
              <CheckboxCard name="perda" label="Hemorragia" sublabel={"Inclui doa\u00e7\u00e3o de sangue, sangria, ou sangramento"} checked={inputs.perda} onChange={handleChange} color="red" />
              <CheckboxCard name="alcoolista" label="Alcoolista" sublabel={"Uso cr\u00f4nico de \u00e1lcool"} checked={inputs.alcoolista} onChange={handleChange} color="amber" />
              <CheckboxCard name="transfundido" label="Transfundido" sublabel={"Transfus\u00e3o de hem\u00e1cias"} checked={inputs.transfundido} onChange={handleChange} color="red" />
              <CheckboxCard name="anemiaPrevia" label={"Anemia Cr\u00f4nica / Pr\u00e9via"} sublabel={"Diagn\u00f3stico anterior de anemia"} checked={inputs.anemiaPrevia} onChange={handleChange} color="red" />
              <CheckboxCard name="sideropenia" label={"Defici\u00eancia de Ferro"} sublabel={"Hist\u00f3rico de ferritina baixa"} checked={inputs.sideropenia} onChange={handleChange} color="orange" />
              <CheckboxCard name="sobrecargaFerro" label="Excesso de Ferro / Hemocromatose" sublabel={"Hist\u00f3rico de ferritina alta"} checked={inputs.sobrecargaFerro} onChange={handleChange} color="orange" />
              <CheckboxCard name="hbAlta" label="Hemoglobina Alta / Policitemia" sublabel={"Hist\u00f3rico de Hb elevada ou sangrias"} checked={inputs.hbAlta} onChange={handleChange} color="red" />
              <CheckboxCard name="doadorSangue" label="Doador de Sangue" sublabel={"Doa\u00e7\u00f5es frequentes"} checked={inputs.doadorSangue} onChange={handleChange} color="red" />
              <CheckboxCard name="celiaco" label={"Cel\u00edaco"} sublabel={"Doen\u00e7a cel\u00edaca \u2014 m\u00e1 absor\u00e7\u00e3o"} checked={inputs.celiaco} onChange={handleChange} color="yellow" />
              <CheckboxCard name="g6pd" label={"Defici\u00eancia de G-6-PD"} sublabel={"Favismo \u2014 risco de hem\u00f3lise"} checked={inputs.g6pd} onChange={handleChange} color="purple" />
              {inputs.sexo === 'F' && (
                <>
                  <CheckboxCard name="hipermenorreia" label="Hipermenorreia" sublabel="Fluxo excessivo" checked={inputs.hipermenorreia} onChange={handleChange} color="pink" />
                  <CheckboxCard name="gestante" label="Gestante" sublabel="Gravidez atual" checked={inputs.gestante} onChange={handleChange} color="pink" disabled={dadosVieramDaTriagem && !editandoDadosPaciente && inputs.gestante} />
                </>
              )}
            </div>

            {inputs.gestante && inputs.sexo === 'F' && (
              <div className="mt-3 p-3 rounded-xl border border-pink-200 bg-pink-50">
                <p className="text-xs font-bold text-pink-700 uppercase tracking-wide mb-2">{"\ud83d\udd76 Dados da Gesta\u00e7\u00e3o"}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{"Semanas de gesta\u00e7\u00e3o "}<span className="text-red-500">*</span></label>
                    <input type="number" name="semanas_gestacao" value={inputs.semanas_gestacao} onChange={handleChange}
                      min="1" max="42" placeholder="Ex: 24"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{"DUM "}<span className="text-gray-400 font-normal">(opcional)</span></label>
                    <input type="date" name="dum" max={new Date().toISOString().split('T')[0]} value={inputs.dum} onChange={handleChange}
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
                    return <p className="text-xs text-orange-600 font-medium mt-2">{"\u26a0\ufe0f DUM sugere ~"}{semanasCalc.toFixed(1)}{" semanas, mas voc\u00ea informou "}{inputs.semanas_gestacao}{". Revise os dados."}</p>
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
              <CheckboxCard name="aspirina" label="Aspirina" sublabel={"Uso cont\u00ednuo"} checked={inputs.aspirina} onChange={handleChange} color="orange" />
              <CheckboxCard name="vitaminaB12" label="Vitamina B12" sublabel={"\u00daltimos 3 meses"} checked={inputs.vitaminaB12} onChange={handleChange} color="purple" />
              <CheckboxCard name="vitB12_SL" label="Vit. B12 SL" sublabel={"Sublingual \u2014 em uso"} checked={inputs.vitB12_SL} onChange={handleChange} color="purple" />
              <CheckboxCard name="vitB12_IM" label="Vit. B12 IM" sublabel={"Intramuscular \u2014 em uso"} checked={inputs.vitB12_IM} onChange={handleChange} color="purple" />
              <CheckboxCard name="ferro_oral" label="Ferro Oral" sublabel={"Nos \u00faltimos 2 anos"} checked={inputs.ferro_oral} onChange={handleChange} color="orange" />
              <CheckboxCard name="ferro_injetavel" label={"Ferro Injet\u00e1vel"} sublabel={"Nos \u00faltimos 2 anos"} checked={inputs.ferro_injetavel} onChange={handleChange} color="orange" />
              <CheckboxCard name="testosterona" label="Testosterona / Anabolizante" sublabel={"Uso ex\u00f3geno \u2014 causa eritrocitose"} checked={inputs.testosterona} onChange={handleChange} color="orange" />
              <CheckboxCard name="tiroxina" label="Tiroxina / T4" sublabel="Tratamento tireoidiano" checked={inputs.tiroxina} onChange={handleChange} color="teal" />
              <CheckboxCard name="methotrexato" label="Metotrexato" sublabel="Antagonista do folato" checked={inputs.methotrexato} onChange={handleChange} color="purple" />
              <CheckboxCard name="hivTratamento" label="Trat. HIV / ARV" sublabel="Antirretrovirais" checked={inputs.hivTratamento} onChange={handleChange} color="purple" />
              <CheckboxCard name="hidroxiureia" label="Hidroxiureia" sublabel="Pode causar macrocitose" checked={inputs.hidroxiureia} onChange={handleChange} color="purple" />
              <CheckboxCard name="anticonvulsivante" label="Anticonvulsivante" sublabel={"Fenito\u00edna, VPA etc."} checked={inputs.anticonvulsivante} onChange={handleChange} color="purple" />
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
              <p className="text-red-700 text-sm font-bold mb-1">{"\u26a0\ufe0f Preencha os campos obrigat\u00f3rios antes de avaliar:"}</p>
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
        )}

        {resultado && (
          <div id="resultado" className="mt-6">
            <ResultCard
              resultado={resultado}
              onCopiar={handleCopiar}
              copiado={copiado}
              modoPaciente={!medicoCRM}
              medicoNome={medicoNome}
              medicoCRM={medicoCRM}
              medicoDados={medicoDados}
              onVoltar={medicoCRM ? onVoltar : undefined}
              onNovaAvaliacao={() => { setResultado(null); setCopiado(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            />
            {!medicoCRM && (
              <div className="mt-8 mb-12 text-center">
                <p className="text-red-700 font-black text-xl tracking-wide">{"AN\u00c1LISE CONCLU\u00cdDA"}</p>
                <button
                  onClick={() => { if (onVoltar) onVoltar(); }}
                  className="mt-3 inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors">
                  <span>{"\u2190"}</span><span>{"Voltar"}</span>
                </button>
              </div>
            )}
          </div>
        )}

      {showConviteAfiliado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div style={{ position: 'relative', width: '100%', height: '440px', overflow: 'hidden' }}>
              <img src={fairyChatImg} alt="Programa de Afiliados RedFairy"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.92), rgba(0,0,0,0.5) 40%, transparent)', padding: '24px 24px 18px' }}>
                {!conviteRecusado ? (
                  <>
                    <p style={{ color: '#ffffff', fontSize: '22px', fontWeight: 800, lineHeight: '1.25', margin: 0, textAlign: 'center', textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
                      {"Participe do nosso "}<span style={{ color: '#ef4444' }}>PROGRAMA DE AFILIADOS</span>{", \u00e9 r\u00e1pido e n\u00e3o custa nada."}
                    </p>
                    <p style={{ color: '#ffffff', fontSize: '14px', fontWeight: 600, lineHeight: '1.3', margin: '8px 0 0', textAlign: 'center', textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
                      {"Somente benef\u00edcios para voc\u00ea."}
                    </p>
                    <p style={{ color: '#fca5a5', fontSize: '14px', fontWeight: 600, lineHeight: '1.4', margin: '10px 0 0', textAlign: 'center' }}>
                      {"Um cadastro simples e voc\u00ea saber\u00e1 porque \u00e9 bom estar conosco."}
                    </p>
                  </>
                ) : (
                  <p style={{ color: '#ffffff', fontSize: '14px', fontWeight: 500, lineHeight: '1.5', margin: '0 auto', maxWidth: '90%', textAlign: 'center', textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
                    {"Voc\u00ea inseriu um paciente no sistema pela triagem, mas n\u00e3o se afiliou no seguimento. \u00c9 uma pena. Os dados do paciente est\u00e3o salvos para eventual aprofundamento diagn\u00f3stico; por\u00e9m, se ele se cadastrar sem que voc\u00ea esteja afiliado, voc\u00ea n\u00e3o participar\u00e1 do sistema de benef\u00edcios. Esperamos que seu paciente conclua o cadastro \u2014 e que voc\u00ea volte. Estaremos sempre abertos a ter voc\u00ea conosco. At\u00e9 breve!..."}
                  </p>
                )}
              </div>
            </div>
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
                      setAfiliacaoRecusada(true);
                      setShowConviteAfiliado(false);
                      setShowAuthMedicoOverlay('cadastro');
                    }}
                    className="w-3 h-3 cursor-pointer"
                    style={{ accentColor: '#9ca3af' }}
                  />
                  <span style={{ color: '#9ca3af', fontSize: '11px', letterSpacing: '0.5px' }}>{"AGORA N\u00c3O, OBRIGADO"}</span>
                </label>
                <button
                  onClick={() => {
                    setShowConviteAfiliado(false);
                    setShowAuthMedicoOverlay('login');
                  }}
                  className="w-full text-center mt-1"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <span style={{ color: '#9ca3af', fontSize: '11px' }}>{"J\u00e1 sou afiliado? "}</span>
                  <span style={{ color: '#7B1E1E', fontSize: '11px', fontWeight: 600, textDecoration: 'underline' }}>Entrar</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showAuthMedicoOverlay && (
        <div className="fixed inset-0 z-50" style={{ background: '#111827', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <AuthMedico
            sessaoExpirada={false}
            modoInicial={typeof showAuthMedicoOverlay === 'string' ? showAuthMedicoOverlay : 'login'}
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
              // NAO fecha o overlay aqui: ele continua cobrindo o Calculator durante as
              // queries abaixo, evitando o "flash" do formulario entre os modais. O overlay
              // so' fecha JUNTO com a abertura do proximo modal (mesmo tick \u2192 sem buraco).
              // Recarrega medicoDados com os valores FRESCOS do banco (nome, celular, email).
              // Sem isso, os checkboxes "MEU TELEFONE \u00c9 O MEU PIX" e "MEU E-MAIL" ficariam vazios.
              try {
                const { data: medFresh } = await supabase.from('medicos').select('nome, crm, celular, email').eq('crm', crm).maybeSingle();
                if (medFresh) setMedicoDados(medFresh);
              } catch (e) {}
              if (afiliacaoRecusada) {
                setAfiliacaoRecusada(false);
                setShowFelicitacoes(true);
                setShowAuthMedicoOverlay(false);
                return;
              }
              try {
                const { data: md } = await supabase
                  .from('medicos')
                  .select('cep, cpf, pix_chave')
                  .eq('crm', crm)
                  .maybeSingle();
                if (!md?.cep || !md?.cpf || !md?.pix_chave) {
                  setShowAfiliados(true);
                } else {
                  setShowFelicitacoes(true);
                }
              } catch (e) {
                setShowAfiliados(true);
              } finally {
                setShowAuthMedicoOverlay(false);
              }
            }}
          />
        </div>
      )}

      {showFelicitacoes && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden my-4" style={{ position: 'relative' }}>
            {/* Header fada */}
            <div style={{ position: 'relative', zIndex: 10, background: 'rgba(255,255,255,0.92)', borderBottom: '1px solid #f1f5f9', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src={logo} alt="RedFairy" style={{ width: 28, height: 28, objectFit: 'contain' }} />
              <h2 style={{ fontFamily: "'Georgia', serif", fontWeight: 900, fontSize: '1.25rem', letterSpacing: '-0.02em', margin: 0 }}>
                <span style={{ color: '#b91c1c' }}>Red</span><span style={{ color: '#ef4444' }}>Fairy</span>
              </h2>
            </div>
            {/* HERO: imagem nitida no topo (bloco proprio, sem sobreposicao com o texto).
                Saudacao branca fica sobre a imagem; os botoes surgem ABAIXO, apos o splash de 2s. */}
            <div style={{ position: 'relative', width: '100%', height: '240px', overflow: 'hidden', backgroundColor: '#FDF7F7' }}>
              <div aria-hidden="true" style={{ position: 'absolute', inset: 0, backgroundImage: `url(${chatphone2Img})`, backgroundSize: '100% auto', backgroundPosition: 'center top', backgroundRepeat: 'no-repeat' }} />
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: '6%', padding: '0 24px', textAlign: 'center' }}>
                <p style={{ color: '#ffffff', fontSize: '22px', fontWeight: 900, lineHeight: 1.18, margin: 0, textShadow: '0 2px 14px rgba(0,0,0,0.75), 0 1px 4px rgba(0,0,0,0.6)' }}>
                  {"Estamos felizes de ter voc\u00ea no RedFairy"}<sup style={{ fontSize: '0.55em', verticalAlign: 'super', marginLeft: '1px' }}>{"\u00ae"}</sup>
                </p>
              </div>
            </div>
            {/* Conteudo: surge apos o splash (2s), ABAIXO da imagem (sem sobreposicao) */}
            <div className="px-5 py-5" style={{ position: 'relative', zIndex: 1, opacity: splashFelic ? 0 : 1, transform: splashFelic ? 'translateY(8px)' : 'translateY(0)', transition: 'opacity 0.5s ease, transform 0.5s ease' }}>
              <p className="text-red-700 text-xs font-bold tracking-widest uppercase text-center mb-4">{"Agora voc\u00ea pode:"}</p>
              <div className="space-y-2.5">
                <button
                  onClick={() => { setShowFelicitacoes(false); }}
                  className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl text-sm transition-colors shadow">
                  {"APROFUNDAR AVALIA\u00c7\u00c3O INICIADA"}
                </button>
                <button
                  onClick={() => { setShowFelicitacoes(false); setShowTriagem(true); }}
                  className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl text-sm transition-colors shadow">
                  AVALIAR | REAVALIAR PACIENTE
                </button>
                <button
                  onClick={() => { setShowFelicitacoes(false); setShowOBA(true); }}
                  className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl text-sm transition-colors shadow flex flex-col items-center leading-tight">
                  <span>{"CONHECER O PROJETO OBA"}<sup style={{ fontSize: '0.6em', verticalAlign: 'super' }}>{"\u00ae"}</sup></span>
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '1px', opacity: 0.75 }}>{"OTIMIZAR O BARI\u00c1TRICO"}</span>
                </button>
                <button
                  onClick={async () => {
                    let afiliado = false;
                    try {
                      const { data: md } = await supabase
                        .from('medicos')
                        .select('cep, cpf, pix_chave')
                        .eq('crm', medicoCRM)
                        .maybeSingle();
                      afiliado = !!(md?.cep && md?.cpf && md?.pix_chave);
                    } catch (e) {}
                    if (afiliado) {
                      setShowFelicitacoes(false);
                      setShowBeneficios(true);
                    } else {
                      alert("FILIE-SE PARA CONHECER OS BENEF\u00cdCIOS");
                    }
                  }}
                  className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl text-sm transition-colors shadow">
                  {"CONHECER OS BENEF\u00cdCIOS"}
                </button>
                <button
                  onClick={() => { setShowFelicitacoes(false); if (onVoltar) onVoltar(); }}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl text-sm transition-colors">
                  {"VOLTAR PARA O IN\u00cdCIO"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBeneficios && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-red-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-white text-lg font-bold">{"Benef\u00edcios do Programa"}</h2>
              <button
                onClick={() => setShowBeneficios(false)}
                className="text-red-200 hover:text-white text-xl"
                style={{ fontFamily: 'Apple Color Emoji, Segoe UI Symbol, Noto Sans Symbols, sans-serif', lineHeight: 1 }}>
                {"\u2715"}
              </button>
            </div>
            <div className="p-6 text-center space-y-4">
              <p className="text-gray-600 text-sm leading-relaxed">
                {"Em breve: lista detalhada dos benef\u00edcios do Programa de Afiliados Patrocinado RedFairy."}
              </p>
              <p className="text-gray-400 text-xs">
                {"Conte\u00fado em desenvolvimento."}
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
      <label className="block text-[0.66rem] font-medium text-gray-600 mb-1 whitespace-nowrap">
        {label} <span className="text-gray-400">({unit})</span>
      </label>
      <input ref={ref} type="text" inputMode="decimal" name={name} value={value} onChange={onChange} disabled={disabled} placeholder={disabled && hint ? hint : "0"}
        onKeyDown={e => { if (e.key === 'Enter' && onEnter) { e.preventDefault(); onEnter(); } }}
        className={`w-full border-2 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400 disabled:placeholder:text-gray-400 disabled:placeholder:italic ${error ? 'border-red-500' : aberrante ? 'border-yellow-400' : borderColor === 'red' ? 'border-red-500' : borderColor === 'blue' ? (!value && !disabled ? 'border-blue-500 bg-yellow-50' : 'border-blue-500') : (!value && !disabled) ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'}`} />
      <p className="text-[0.6rem] text-gray-400 mt-0.5">Ref: {reference}</p>
      {hint && !disabled && <p className="text-xs text-orange-500 mt-0.5">{hint}</p>}
      {aberrante && <p className="text-xs font-bold text-yellow-600 mt-0.5">{"\u26a0 VALOR ABERRANTE \u2014 CONFIRME"}</p>}
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
  yellow: 'border-yellow-400 bg-yellow-50 text-yellow-700',
};

function CheckboxCard({ name, label, sublabel, checked, onChange, color, highlight, disabled }) {
  return (
    <label className={`flex items-start gap-2 p-3 rounded-xl border-2 transition-all ${disabled ? 'cursor-default opacity-70' : 'cursor-pointer'} ${checked ? colorMap[color] : 'border-gray-200 bg-gray-50 text-gray-600'}`}
      style={highlight && !checked ? { borderColor:'#7B1E1E', boxShadow:'0 0 0 2px rgba(123,30,30,0.3)' } : highlight && checked ? { borderColor:'#7B1E1E', boxShadow:'0 0 0 3px rgba(123,30,30,0.4)' } : {}}>
      <input type="checkbox" name={name} checked={checked} onChange={onChange} disabled={disabled} className={`mt-0.5 w-4 h-4 flex-shrink-0 ${disabled ? 'cursor-default' : 'cursor-pointer'}`} />
      <div className="min-w-0">
        <p className="font-medium text-sm leading-tight">{label}</p>
        <p className="text-xs opacity-70 leading-tight mt-0.5">{sublabel}</p>
      </div>
    </label>
  );
}
