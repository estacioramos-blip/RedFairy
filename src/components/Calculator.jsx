import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { avaliarPaciente, triagemEritron, formatarParaCopiar } from '../engine/decisionEngine';
import { avaliarOBA } from '../engine/obaEngine';
import { checarValor } from '../engine/limitesInput';
import { credMedico } from '../lib/cred';
import OBAModal from './OBAModal';
import TriagemModal from './TriagemModal';
import TriagemResultadoModal from './TriagemResultadoModal';
import TermosModalShared from './TermosModal';
import ResultCard from './ResultCard';
import QRMedicoModal from './QRMedicoModal';
import CreditosMedicoModal from './CreditosMedicoModal';
import PlayButton from './PlayButton';
import heroImg from '../assets/redfairy-hero.jpg';
import fairyChatImg from '../assets/fairy-chat.jpg';
import welcomeImg from '../assets/welcome.jpg';
import chatphone2Img from '../assets/chatphone2.jpg';
import telefonista2Img from '../assets/telefonista2.jpg';
import telefonista3Img from '../assets/telefonista3.jpg';
import logo from '../assets/logo.png';
import obaLogo from '../assets/oba-logo.png';
import medicoBariImg from '../assets/oba-medico.jpg';
import obaFairyIcon from '../assets/oba-fairy-icon.png';
import ohhhImg from '../assets/ohhh.png';
import { QRCodeSVG } from 'qrcode.react';
import { useInstalarFada } from '../lib/useInstalarFada';
import { sairDoApp, sairOuVoltar } from '../lib/sairDoApp';
import { ehDominioBariatrico } from '../lib/dominio';

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
  // (1o acesso) CRM existe no banco? null=ainda nao checado, true=login, false=cadastro novo.
  const [loginCrmExiste, setLoginCrmExiste] = useState(null)
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
  const refSexo = useRef(null);
  const [medSexo, setMedSexo] = useState('')   // sexo do médico → textos dinâmicos (Doutor/a)
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

  // (b) Forca limpeza dos campos CRM/UF/SENHA ao abrir o card (evita residuo de
  // sessao anterior ou autofill do navegador puxando dados antigos para o login).
  useEffect(() => {
    setLoginCrmNum(''); setLoginCrmUF(''); setLoginSenha('');
  }, []);

  // Timer 1800ms apos digitar no NUMERO do CRM (login): se >= 1 digito, espera 1800ms
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
    }, 1800);
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

  // (1o acesso) Com CRM+UF completos, consulta o banco: se o CRM NAO existe, e' primeiro
  // acesso -> o campo de senha mostra "CRIE AGORA A SUA SENHA". Igual a caixa do hero.
  useEffect(() => {
    if (modo !== 'login') return;
    if (!(loginCrmNum && loginCrmUF.length === 2 && UFS_VALIDAS.includes(loginCrmUF))) {
      setLoginCrmExiste(null);
      return;
    }
    const crmLimpo = `${loginCrmNum}/${loginCrmUF}`.toUpperCase();
    let cancelado = false;
    (async () => {
      try {
        const { data } = await supabase.from('medicos').select('crm').eq('crm', crmLimpo).maybeSingle();
        if (!cancelado) setLoginCrmExiste(!!data);
      } catch (e) { if (!cancelado) setLoginCrmExiste(null); }
    })();
    return () => { cancelado = true; };
  }, [loginCrmNum, loginCrmUF, modo]);

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
    }, 1800);
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
  // NOME -> SEXO apos 3s ocioso (se o cursor ainda estiver no nome). SEXO -> CELULAR ao escolher.
  useEffect(() => {
    if (modo !== 'cadastro' || !nome.trim()) return;
    const t = setTimeout(() => {
      if (refSexo.current && document.activeElement === refNomeCad.current) refSexo.current.focus();
    }, 3000);
    return () => clearTimeout(t);
  }, [nome, modo]);
  // CELULAR -> EMAIL. 11 digitos: salta na hora. 10 digitos (ha' WhatsApp com 10):
  // se o medico parar 2s, salta automaticamente para o e-mail.
  useEffect(() => {
    if (modo !== 'cadastro') return;
    if (document.activeElement !== refCelular.current) return;
    const dig = celular.replace(/\D/g, '');
    if (dig.length >= 11) {
      if (refEmailCad.current) refEmailCad.current.focus();
      return;
    }
    if (dig.length === 10) {
      const t = setTimeout(() => {
        if (refEmailCad.current && document.activeElement === refCelular.current) refEmailCad.current.focus();
      }, 2000);
      return () => clearTimeout(t);
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
      if (e === 'CRM nao encontrado') {
        // Primeiro acesso: CRM novo -> vai pro cadastro (cria a senha la), com o CRM ja preenchido.
        // (d) A senha foi criada na ENTRADA (tela de Acesso) — leva ela para o cadastro
        // para nao pedir "Crie a sua Senha" de novo no Primeiro Acesso.
        // (BUG FIX) CRM novo no Acesso = cadastro NOVO -> register_medico. Limpa qualquer
        // sessao de medico ANTERIOR no localStorage (ex.: residuo apos limpar o banco de
        // teste). Sem isso, jaLogadoSemSenha ficava true e o handleCadastro usava
        // complete_medico (UPDATE numa linha inexistente) -> o medico NUNCA era inserido.
        try { ['medico_crm','medico_nome','medico_token','medico_login_at','medico_is_admin'].forEach(k => localStorage.removeItem(k)); } catch (er) {}
        setCrmNum(loginCrmNum); setCrmUF(loginCrmUF); setSenha(loginSenha); setLoginErro(''); setModo('cadastro')
        return
      }
      setLoginErro(e === 'Senha incorreta' ? 'Senha incorreta.' : (e || 'Falha no login.'))
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
    // (BUG FIX) "completar perfil" (complete_medico) SO' se o medico logado FOR ESTE crm.
    // Senao e' cadastro NOVO (register_medico). Com residuo de medico_crm de OUTRO medico
    // (ex.: apos limpar o banco), o complete_medico daria UPDATE numa linha inexistente e
    // o medico nunca era inserido.
    let ehMesmoMedico = false;
    try { const mc = localStorage.getItem('medico_crm'); ehMesmoMedico = !!mc && mc === conselhoLimpo; } catch (e) {}
    if (!nome.trim() || nome.trim().length < 5) { setCadErro('Informe seu nome completo.'); return }
    if (!crmNum) { setCadErro("Informe o n\u00famero do CRM."); return }
    if (!crmUF) { setCadErro("Informe a UF."); return }
    if (!UFS_VALIDAS.includes(crmUF)) { setCadErro("UF inv\u00e1lida."); return }
    if (celularDigits.length < 10) { setCadErro("Informe um celular v\u00e1lido com DDD."); return }
    if (email && !email.includes('@')) { setCadErro("E-mail inv\u00e1lido \u2014 ou deixe em branco."); return }
    if (!ehMesmoMedico && (!senha || senha.length < 6)) { setCadErro('A senha deve ter pelo menos 6 caracteres.'); return }
    setCadLoading(true)
    // Médico já identificado em sessão anterior (cadastro mínimo pela caixa do
    // hero): aqui só completa o perfil (nome/celular/email), sem recriar a conta.
    if (ehMesmoMedico) {
      try {
        const { error } = await supabase.rpc('complete_medico', {
          p_crm: conselhoLimpo, p_nome: nome.trim(),
          p_celular: celularDigits, p_email: email.trim().toLowerCase(), p_sexo: medSexo,
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
        p_celular: celularDigits, p_email: email.trim().toLowerCase(), p_senha: senha, p_sexo: medSexo,
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
    <div className="bg-gray-900 relative" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', overflowY: 'auto' }}>
      {/* X vinho (o "Voltar" dourado foi removido): pelo \u00cdCONE fecha o app;
          no navegador mant\u00e9m o retorno original (onVoltar). */}
      <button onClick={() => sairOuVoltar(onVoltar)} aria-label="Fechar e sair"
        className="absolute top-4 right-4"
        style={{ width: 30, height: 30, borderRadius: '50%', background: '#7B1E1E', color: '#fff', border: '2px solid #fff', cursor: 'pointer', fontSize: '13px', fontWeight: 700, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30, boxShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>
        {"\u2715"}
      </button>
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md" style={{ overflow: 'hidden', position: 'relative' }}
        onMouseEnter={() => setBgRevelado(true)} onMouseLeave={() => setBgRevelado(false)} onTouchStart={() => setBgRevelado(true)}>
        {/* (limpo) Fundo e splash da telefonista removidos — card de acesso limpo (padrão OBA). */}
        {/* Header OBA: logo OBA (sem faixa) + subt\u00edtulo do modo. */}
        <div style={{ position: 'relative', zIndex: 10, background: '#fff', padding: '16px 14px 10px', textAlign: 'center' }}>
          <img src={obaLogo} alt={"Projeto OBA\u00ae"} style={{ height: 128, objectFit: 'contain', display: 'block', margin: '0 auto' }} />
          <p className="text-gray-500 text-sm" style={{ margin: '4px 0 0' }}>
            {modo === 'login' ? "Acesso M\u00e9dico" : "Primeiro Acesso M\u00e9dico"}
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
            {/* ("\u2190 Voltar" cinza removido \u2014 o X vinho do canto cobre a sa\u00edda.) */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">{"N\u00famero do CRM e UF"}</label>
              <div className="grid grid-cols-3 gap-2">
                <input ref={refCrmNumLogin} type="text" value={loginCrmNum}
                  onChange={e => setLoginCrmNum(sanitizarCrmNum(e.target.value))}
                  placeholder="Ex: 6302" autoComplete="off" name="rf-crm-num-login"
                  data-lpignore="true" data-1p-ignore="true" data-bwignore="true" data-form-type="other"
                  inputMode="numeric" maxLength={6}
                  className={`col-span-2 ${inputClass} ${etapaLogin === 1 ? 'border-yellow-400 bg-yellow-50' : 'bg-yellow-50 border-yellow-300'}`} />
                <input ref={refCrmUfLogin} type="text" value={loginCrmUF}
                  onChange={e => setLoginCrmUF(sanitizarCrmUF(e.target.value))}
                  placeholder="BA" autoComplete="off" name="rf-crm-uf-login"
                  maxLength={2}
                  className={`${inputClass} text-center uppercase ${etapaLogin === 1 ? 'border-yellow-400 bg-yellow-50' : 'bg-yellow-50 border-yellow-300'} ${loginCrmUF.length === 2 && !UFS_VALIDAS.includes(loginCrmUF) ? 'border-red-500' : ''}`} />
              </div>
              {loginCrmUF.length === 2 && !UFS_VALIDAS.includes(loginCrmUF) && (
                <p className="text-red-500 text-xs mt-1">{"UF inv\u00e1lida"}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">
                {loginCrmExiste === false ? 'CRIE AGORA A SUA SENHA' : (loginCrmExiste === true ? 'DIGITE A SUA SENHA' : 'Senha')}
              </label>
              <div style={{ position: 'relative' }}>
                <input ref={refSenhaLogin} type={showLoginSenha ? 'text' : 'password'} value={loginSenha}
                  onChange={e => setLoginSenha(e.target.value)} onFocus={() => setEtapaLogin(2)}
                  placeholder={loginCrmExiste === false ? 'Crie uma senha (mín. 6)' : 'Sua senha'} autoComplete="off" name="rf-senha-login"
                  data-lpignore="true" data-1p-ignore="true" data-bwignore="true" data-form-type="other"
                  className={`${inputClass} ${etapaLogin === 2 ? 'border-yellow-400 bg-yellow-50' : ''}`}
                  style={{ paddingRight: '40px' }}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                <button type="button" onClick={() => setShowLoginSenha(!showLoginSenha)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#9ca3af' }}
                  aria-label={showLoginSenha ? 'Ocultar senha' : 'Mostrar senha'}>
                  <span style={{ fontSize: '17px', lineHeight: 1 }}>{showLoginSenha ? '🙈' : '👁'}</span>
                </button>
              </div>
            </div>
            {loginSenha.length > 0 && loginSenha.length < 6 && (
              <p className="text-amber-600 text-xs">{"Mínimo 6 caracteres"}</p>
            )}
            {loginErro && <p className="text-red-500 text-sm">{loginErro}</p>}
            {loginConselho.trim() && loginSenha.length >= 6 && (
              <div className="flex justify-center pt-1">
                {/* Padrao PlayButton: \u25b6 vinho + piscar DOURADO (ring #E3AE37). */}
                <PlayButton onClick={handleLogin} loading={loginLoading} label="CONFIRMO" ariaLabel="Confirmar login" ringColor="rgba(227,174,55,0.75)" />
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
            {/* (a) Seta "Voltar" removida \u2014 o link "Nao quero fornecer esses dados" ja' faz isso. */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Nome completo</label>
              <input ref={refNomeCad} type="text" value={nome} onChange={e => setNome(e.target.value.toUpperCase().replace(/[0-9]/g, ''))} style={{ textTransform: 'uppercase' }}
                className={inputAmarelo} autoComplete="off" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">{"CRM, UF e Sexo"}</label>
              <div className="flex gap-2">
                <input ref={refCrmNum} type="text" value={crmNum}
                  onChange={e => setCrmNum(sanitizarCrmNum(e.target.value))}
                  placeholder="Ex: 6302" className={`${inputAmarelo} flex-1`} autoComplete="off"
                  inputMode="numeric" maxLength={6} />
                <input ref={refCrmUf} type="text" value={crmUF}
                  onChange={e => setCrmUF(sanitizarCrmUF(e.target.value))}
                  placeholder="BA" maxLength={2} style={{ width: '3.5rem' }}
                  className={`${inputAmarelo} text-center uppercase ${crmUF.length === 2 && !UFS_VALIDAS.includes(crmUF) ? 'border-red-500' : ''}`} autoComplete="off" />
                <select ref={refSexo} value={medSexo}
                  onChange={e => { setMedSexo(e.target.value); try { localStorage.setItem('medico_sexo', e.target.value) } catch (er) {}; if (e.target.value && refCelular.current) refCelular.current.focus(); }}
                  className={inputAmarelo} style={{ width: '5rem' }}>
                  <option value="">{"Sexo"}</option>
                  <option value="M">{"Masc."}</option>
                  <option value="F">{"Fem."}</option>
                </select>
              </div>
              {crmUF.length === 2 && !UFS_VALIDAS.includes(crmUF) && (
                <p className="text-red-500 text-xs mt-1">{"UF inv\u00e1lida"}</p>
              )}
              <p className="text-xs text-red-800 font-medium mt-0.5">{"Este ser\u00e1 o seu LOGIN permanente"}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Celular / WhatsApp</label>
              <input ref={refCelular} type="tel" value={celular} onChange={e => setCelular(formatarCelular(e.target.value))}
                placeholder="(00) 00000-0000" inputMode="numeric" maxLength={15} className={inputAmarelo} autoComplete="off" />
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-blue-800 text-xs font-bold mb-1">{"4DOC"}<sup style={{ fontSize: '0.6em', verticalAlign: 'super' }}>{"\u00ae"}</sup>{" | Programa de M\u00e9dicos Afiliados"}</p>
              <p className="text-blue-700 text-xs leading-relaxed">
                <strong>{medSexo === 'F' ? 'Doutora,' : 'Doutor,'}</strong><br />
                {"Com mais algumas informa\u00e7\u00f5es, voc\u00ea breve estar\u00e1 "}{medSexo === 'F' ? 'integrada' : 'integrado'}{" ao nosso Programa Patrocinado que tem por objetivo trazer um n\u00famero crescente de pacientes bari\u00e1tricos a este Projeto OBA\u00ae, para que possam desfrutar de mais sa\u00fade e qualidade de vida."}<br /><br />
                {"Ao indicar ou avaliar novos pacientes voc\u00ea receber\u00e1 incentivos dos nossos patrocinadores."}<br /><br />
                {"N\u00e3o h\u00e1 custo, risco ou compromisso para voc\u00ea \u2014 s\u00f3 benef\u00edcios \u2014 e voc\u00ea pode deixar o Programa a qualquer hora, a seu crit\u00e9rio."}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">E-mail</label>
              <p className="text-xs text-gray-500 mb-1">{"Opcional — cadastre só se o seu PIX for o seu e-mail."}</p>
              <input ref={refEmailCad} type="email" value={email} onChange={e => setEmail(e.target.value.toLowerCase())}
                placeholder="seu@email.com" className={inputAmarelo} autoComplete="off"
                inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
            </div>
            <div>
              {!jaLogadoSemSenha && !senha && (<><label className="block text-sm font-medium text-gray-600 mb-1">Crie a sua Senha</label>
              <div style={{ position: 'relative' }}>
                <input type={showSenha ? 'text' : 'password'} value={senha} onChange={e => setSenha(e.target.value)}
                  placeholder={"M\u00ednimo 6 caracteres"} className={inputAmarelo} autoComplete="off"
                  data-lpignore="true" data-1p-ignore="true" data-bwignore="true" data-form-type="other"
                  style={{ paddingRight: '40px' }} />
                <button type="button" onClick={() => setShowSenha(!showSenha)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#9ca3af' }}
                  aria-label={showSenha ? 'Ocultar senha' : 'Mostrar senha'}>
                  <span style={{ fontSize: '17px', lineHeight: 1 }}>{showSenha ? '🙈' : '👁'}</span>
                </button>
              </div>
              <p className="text-xs text-red-800 font-medium mt-0.5">{"Ser\u00e1 sua senha de acesso ao Projeto OBA\u00ae."}</p></>)}
            </div>
            {cadErro && <p className="text-red-500 text-sm">{cadErro}</p>}
            {showTC && <TermosModal onFechar={() => setShowTC(false)} />}
            <div className="flex justify-end pt-1">
              <PlayButton
                onClick={handleCadastro}
                loading={cadLoading}
                label="CONTINUAR"
                ariaLabel="Confirmar cadastro"
                ringColor="rgba(227,174,55,0.75)"
              />
            </div>
            <button type="button" onClick={() => setShowReversaoAdesao(true)}
              className="w-full text-center text-gray-400 hover:text-gray-600 text-xs font-medium py-1">
              {"N\u00e3o quero fornecer esses dados agora"}
            </button>
          </div>
        )}

        {showReversaoAdesao && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.95)' }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              {/* (d) Imagem ohhh com a frase branca na base. */}
              <div style={{ position: 'relative', width: '100%' }}>
                <img src={ohhhImg} alt="" className="w-full block" />
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: '7%', textAlign: 'center', padding: '0 16px' }}>
                  <p style={{ color: '#ffffff', fontSize: '20px', fontWeight: 900, lineHeight: 1.15, margin: 0, textShadow: '0 2px 12px rgba(0,0,0,0.8), 0 1px 3px rgba(0,0,0,0.7)' }}>{"Assim n\u00e3o podemos come\u00e7ar."}</p>
                </div>
              </div>
              <div className="px-5 pt-4 pb-5">
                <p style={{ color: '#111827', fontSize: '13px', fontWeight: 600, textAlign: 'center', margin: 0 }}>{"Se mudar de ideia, estaremos aqui."}</p>
                <div className="flex justify-center mt-4">
                  <PlayButton onClick={() => setShowReversaoAdesao(false)} label="QUERO CONTINUAR" labelColor="#111827" ringColor="rgba(227,174,55,0.75)" ariaLabel="Quero continuar" />
                </div>
                <button onClick={() => { setShowReversaoAdesao(false); onVoltar?.(); }}
                  className="flex items-center gap-1 text-gray-400 hover:text-gray-600 text-xs font-medium mt-4">
                  <span style={{ fontSize: '13px' }}>{"\u2190"}</span><span>{"SAIR"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {showEsqueciSenha && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.95)' }} onClick={() => setShowEsqueciSenha(false)}>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.95)' }} onClick={onFechar}>
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
    try { sessionStorage.removeItem('rf_med_oba_cpf') } catch (e) {}
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
    antiHp_igg: '', antiHp_igm: '',  // sorologia ANTI-H.PYLORI (qualitativa)
    b12_valor: '', folato_valor: '',  // valores B12 (pg/mL) e Folato (ng/mL) — investigação da macrocitose
    bariatrica: !!(_demo?.bariatrica) || ehDominioBariatrico(),
    bariatrica_medico: !!(_demo?.bariatrica) || ehDominioBariatrico(), vegetariano: false, perda: false,
    hipermenorreia: false, gestante: false, semanas_gestacao: '', dum: '', alcoolista: false,
    transfundido: false, aspirina: false, vitaminaB12: false, vitB12_SL: false, vitB12_IM: false, ferro_oral: false, ferro_injetavel: false,
    tiroxina: false, hidroxiureia: false, anticonvulsivante: false, testosterona: false,
    anemiaPrevia: false, sideropenia: false, sobrecargaFerro: false, hbAlta: false, celiaco: false, g6pd: false, endometriose: false, doadorSangue: false,
    methotrexato: false, hivTratamento: false, metformina: false, ibp: false,
  });

  const [resultado, setResultado] = useState(null);
  const [mostrarExamesExtras, setMostrarExamesExtras] = useState(false);
  const ferritinaRef = useRef(null);
  // Fluxo novo do médico: NÃO abre triagem automática (entra pela bifurcação → AVALIAR → OBA).
  // Só o DEMO (preDemoDados) ainda usa a triagem como demonstração.
  const [showTriagem, setShowTriagem] = useState(!!preDemoDados);
  const [triagemResultado, setTriagemResultado] = useState(null);
  const [triagemInputs, setTriagemInputs] = useState(null);
  const [showAfiliados, setShowAfiliados] = useState(false);
  const [showAfiliadosBanner, setShowAfiliadosBanner] = useState(false);
  // (item 8) Convite 4DOC pos-avaliacao para medico ainda nao afiliado — PLACEHOLDER a
  // redesenhar. Substitui a antiga "tarja cinza" (showAfiliadosBanner) que auto-aparecia.
  const [showConvite4doc, setShowConvite4doc] = useState(false);
  const [showQRMedico, setShowQRMedico] = useState(false);  // QR de encaminhamento (4DOC)
  const [qrFoco, setQrFoco] = useState('qr');  // 'qr' (ENCAMINHAR: QR+link) | 'cpf' (RECOMENDAR: digitar CPF)
  // Marca que o 4DOC ja foi oferecido (modal cheio) nesta sessao: evita o modal reaparecer
  // depois que o medico ja declinou ("Preencher depois"). Apos isso, no maximo o banner.
  const jaOfereceu4DOCRef = React.useRef(false);
  React.useEffect(() => { if (showAfiliados) jaOfereceu4DOCRef.current = true; }, [showAfiliados]);
  const [afiliadoEndereco, setAfiliadoEndereco] = useState('');
  const [afiliadoPix, setAfiliadoPix] = useState('');
  const [afilTitular, setAfilTitular] = useState(medicoNome || ''); const [afilPj, setAfilPj] = useState(false); const [afilCnpj, setAfilCnpj] = useState(''); const [afilFamiliar, setAfilFamiliar] = useState(false);  // titular do PIX (PF/familiar/PJ)
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
  // (b) Flash da imagem por 1.5s ao entrar no form do afiliado, antes de esmaecer p/ fundo.
  const [flashFormImg, setFlashFormImg] = useState(false);
  // Card da FADINHA 4DOC (encaminhamento): aparece sobre o splash; o splash só some
  // quando o médico instala a fadinha OU opta por instalar depois.
  const [cardFada4doc, setCardFada4doc] = useState(false);
  const [showCreditosPopup, setShowCreditosPopup] = useState(false);
  const [showMeusCreditosMed, setShowMeusCreditosMed] = useState(false);   // médico vê os próprios créditos 4DOC
  // Bifurcação do MÉDICO (pós-login): ENCAMINHAR · AVALIAR · VER CRÉDITOS. Pula se já vier
  // com dados de demo (vai direto ao formulário).
  const [menuMedico, setMenuMedico] = useState(!preDemoDados)
  const medicoSexo = (() => { try { return localStorage.getItem('medico_sexo') || '' } catch (e) { return '' } })()  // textos dinâmicos (Bem-vindo/a)
  // AVALIAR: o médico digita o CPF (ou lê o QR) do paciente → abre o OBA Modal com os
  // dados dele (o médico faz a avaliação/OBA pelo paciente).
  const [avaliarFase, setAvaliarFase] = useState(null)        // null | 'cpf' | 'oba'
  // ATENÇÃO: não chamar este estado de "avaliarPaciente" — sombrearia a função do engine
  // importada na linha 4 e quebraria o handleSubmit (avaliação completa manual).
  const [pacienteAvaliar, setPacienteAvaliar] = useState(null)
  const [avaliarCpfInput, setAvaliarCpfInput] = useState('')
  const [avaliarErro, setAvaliarErro] = useState('')
  const [avaliarBusy, setAvaliarBusy] = useState(false)
  // REVISÃO (Passo 3): quando true, o mesmo OBAModal do AVALIAR abre em modo revisão
  // (restaura TUDO da anamnese do paciente, inclusive dúvidas; save não-destrutivo).
  const [avaliarRevisao, setAvaliarRevisao] = useState(false)
  async function carregarPacienteAvaliar(cpfArg, revisao = false) {
    const d = String(cpfArg || avaliarCpfInput || '').replace(/\D/g, '')
    if (d.length !== 11) { setAvaliarErro('CPF inválido'); return }
    setAvaliarBusy(true); setAvaliarErro('')
    try {
      const { data: prof } = await supabase.from('profiles').select('cpf, nome, sexo, data_nascimento, bariatrica').eq('cpf', d).maybeSingle()
      if (!prof) {
        setAvaliarErro('Paciente não cadastrado. Peça que se cadastre primeiro.'); setAvaliarBusy(false)
        // Na REVISÃO não há tela de CPF onde o erro apareça — avisa direto.
        if (revisao) { try { window.alert('Paciente não encontrado no cadastro. Não é possível revisar a anamnese.') } catch (e) {} }
        return
      }
      // Traz o que o paciente já tem: última avaliação (eritron) + última anamnese do OBA.
      const { data: avals } = await supabase.from('avaliacoes').select('*').eq('cpf', d).order('data_coleta', { ascending: false }).limit(1)
      // Busca TODAS as linhas (ascendente) — deriva a ÚLTIMA (anterior, follow-up) e a
      // PRIMEIRA (baseline, comparação longitudinal). Ver src/engine/obaComparador.js.
      let anam = null, anamBaseline = null, numeroCiclo = 1
      try {
        // RLS Fase 2: leitura por RPC (gateada pelo token do médico).
        const { data: obaResp } = await supabase.rpc('oba_anamnese_por_cpf', { p_cpf: d, ...credMedico() })
        const obaRows = (obaResp && obaResp.ok) ? obaResp.linhas : []
        anamBaseline = (obaRows && obaRows.length) ? obaRows[0] : null
        anam = (obaRows && obaRows.length) ? obaRows[obaRows.length - 1] : null
        numeroCiclo = (obaRows?.length || 0) + 1
      } catch (e) { console.error('Falha ao carregar histórico OBA:', e) }
      setPacienteAvaliar({ ...prof, ultimaAval: (avals && avals.length) ? avals[0] : null, anamneseAnterior: anam, anamneseBaseline: anamBaseline, numeroCiclo })
      setAvaliarRevisao(!!revisao)
      try {
        sessionStorage.setItem('rf_med_oba_cpf', d)   // p/ reabrir no refresh (mesma aba)
        if (revisao) sessionStorage.setItem('rf_med_oba_rev', '1'); else sessionStorage.removeItem('rf_med_oba_rev')
      } catch (e) {}
      setAvaliarFase('oba')
    } catch (e) { setAvaliarErro('Erro de conexão. Tente de novo.') }
    setAvaliarBusy(false)
  }
  // Refresh/remontagem: se o médico estava no OBA, reabre ao montar (não perde o que preencheu).
  React.useEffect(() => {
    if (!cadastrado) return
    let cpf = ''
    let rev = false
    try { cpf = sessionStorage.getItem('rf_med_oba_cpf') || ''; rev = sessionStorage.getItem('rf_med_oba_rev') === '1' } catch (e) {}
    if (cpf.length === 11) carregarPacienteAvaliar(cpf, rev)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cadastrado])
  const [fada4docMarcada, setFada4docMarcada] = useState(false);
  // (encaminhamento em massa) Ao instalar o icone, o LINK do medico tambem e' copiado.
  const [linkMedCopiado, setLinkMedCopiado] = useState(false);
  const [fada4docInstrIOS, setFada4docInstrIOS] = useState(false);
  const { instalar: instalarFada4doc } = useInstalarFada();
  const qrBaseAfil = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : 'https://redfairy.bio';
  // (i) Vindo do bariatrico.net (Sou Medico), a imagem do topo do modal de afiliados
  // troca para a da landing "Quero encaminhar pacientes" (o medico + paciente).
  // Como a imagem do bari e landscape (2:1) e a welcome e retrato, ajusta enquadramento.
  const afilBg = ehDominioBariatrico()
    ? { img: medicoBariImg, size: 'cover', pos: 'center center' }
    : { img: welcomeImg, size: '100% auto', pos: 'center top' };
  // Libera o splash e foca o formulário de afiliação.
  function prosseguirAfil() {
    setCardFada4doc(false); setSplashAfil(false);
    // (b) imagem aparece nitida por 1.5s e depois esmaece para o fundo.
    setFlashFormImg(true); setTimeout(() => setFlashFormImg(false), 1500);
    // preventScroll: foca o CEP SEM rolar o form — senao o texto introdutorio "Para
    // concluir..." some sob o header ao abrir.
    setTimeout(() => { if (refAfilCEP.current) { try { refAfilCEP.current.focus({ preventScroll: true }); } catch (e) { refAfilCEP.current.focus(); } } }, 100);
  }
  async function aoMarcarFada4doc(e) {
    const marcado = e.target.checked;
    setFada4docMarcada(marcado);
    if (!marcado) { setFada4docInstrIOS(false); setLinkMedCopiado(false); return; }
    // (encaminhamento em massa) Copia o LINK de encaminhamento do medico pro clipboard
    // — ele cola no WhatsApp/Telegram (ou manda a secretaria disparar para todos os
    // bariatricos do arquivo). Feito DENTRO do gesto do clique (clipboard exige gesto).
    try {
      const linkMed = `${qrBaseAfil}/?ref=${encodeURIComponent(medicoCRM || '')}`;
      await navigator.clipboard.writeText(linkMed);
      setLinkMedCopiado(true);
    } catch (er) {}
    const r = await instalarFada4doc();
    if (r === 'ios') setFada4docInstrIOS(true);   // iPhone: mostra instrução; segue pelo link "depois"
    else prosseguirAfil();                          // Android instalado/recusado → prossegue
  }
  // Nome do atalho na tela inicial: "4DOC" enquanto o card do médico está aberto (iOS
  // usa apple-mobile-web-app-title). Fora dele volta a "RedFairy" (fluxo do paciente).
  useEffect(() => {
    const meta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (!meta) return;
    meta.setAttribute('content', cardFada4doc ? '4DOC' : 'RedFairy');
  }, [cardFada4doc]);
  useEffect(() => {
    if (showAfiliados) {
      setEtapaAfil(1);
      // SPLASH de entrada: imagem + greeting; depois revela o CARD da FADINHA 4DOC.
      // O splash NÃO some sozinho — só sai quando o médico instala ou opta por depois.
      setSplashAfil(true); setBgAfilRevelado(false);
      setCardFada4doc(false); setFada4docMarcada(false); setFada4docInstrIOS(false);
      const t = setTimeout(() => { setCardFada4doc(true); }, 2500);
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
  // PIX titular: chave PRÓPRIA (cpf/telefone/email) ou vazia → titular TRAVADO no nome do médico.
  // Só a chave "outra" (digitada) libera os checkboxes familiar/PJ que destravam o campo.
  useEffect(() => {
    if (pixTipo !== 'outra') { setAfilFamiliar(false); setAfilPj(false); setAfilTitular(medicoNome || ''); }
  }, [pixTipo, medicoNome]);
  const [showConviteAfiliado, setShowConviteAfiliado] = useState(false);
  const [destinoAposConvite, setDestinoAposConvite] = useState(null);
  const [dadosVieramDaTriagem, setDadosVieramDaTriagem] = useState(false);
  const [editandoDadosPaciente, setEditandoDadosPaciente] = useState(false);
  const refDataColetaForm = useRef(null);
  const refHbForm = useRef(null);
  const refVcmForm = useRef(null);
  const refRdwForm = useRef(null);
  // Seamless: o cursor salta Hb -> VCM -> RDW (ao atingir o tamanho, ou apos 2.1s de pausa). Sem travar campos.
  const timerHemoRef = useRef(null);
  function avancarSeamless(e, maxChars, nextRef) {
    handleChange(e);
    const v = String(e.target.value || '');
    if (timerHemoRef.current) clearTimeout(timerHemoRef.current);
    if (v.length < 1) return;
    if (v.length >= maxChars) { if (nextRef && nextRef.current) nextRef.current.focus(); return; }
    timerHemoRef.current = setTimeout(() => { if (nextRef && nextRef.current) nextRef.current.focus(); }, 2100);
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
  // Abre o card de Acesso JA' no 1o render quando veio com rf_open_login (?modo=medico):
  // assim nao ha' um frame da Calculadora (com o logo) antes do modal — evita o flash do
  // icone no mobile.
  const [showAuthMedicoOverlay, setShowAuthMedicoOverlay] = useState(() => {
    try { return localStorage.getItem('rf_open_login') === '1' ? 'login' : false; } catch (e) { return false; }
  });
  const [showFelicitacoes, setShowFelicitacoes] = useState(false);
  // Modal de felicitacoes: imagem de fundo revela no hover.
  const [bgFelicRevelado, setBgFelicRevelado] = useState(false);
  // SPLASH de entrada: imagem nitida + saudacao por 2s; depois surgem os botoes (abaixo da imagem).
  const [splashFelic, setSplashFelic] = useState(true);
  // (felicitacoes) o botao PLAY surge 2s DEPOIS do texto (que ja aparece apos o splash de 2s).
  const [mostrarPlayFelic, setMostrarPlayFelic] = useState(false);
  useEffect(() => {
    if (showFelicitacoes) {
      setSplashFelic(true); setBgFelicRevelado(false); setMostrarPlayFelic(false);
      const t1 = setTimeout(() => setSplashFelic(false), 2000);
      const t2 = setTimeout(() => setMostrarPlayFelic(true), 4000);
      return () => { clearTimeout(t1); clearTimeout(t2); };
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
      const { data: md } = await supabase.from('medicos').select('nome').eq('crm', medicoCRM).maybeSingle();
      completo = !!(md && md.nome && String(md.nome).trim());   // e-mail é opcional (só exige o nome)
    } catch (e) { completo = false; }
    // Medico ja cadastrado (nome+email completos) = veterano: NAO mostra "Estamos felizes",
    // vai direto pro Calculator (dados ja preenchidos pela triagem). O modal de boas-vindas
    // so' faz sentido para quem acabou de se cadastrar (fluxo via showAuthMedicoOverlay).
    if (!completo) { setShowAuthMedicoOverlay('cadastro'); }
    setTriagemResultado(null); setShowTriagem(false);
  }
  const [showBeneficios, setShowBeneficios] = useState(false);

  useEffect(() => {
    // O overlay de Acesso ja' abre pelo initializer do estado; aqui so' consome a flag.
    try { localStorage.removeItem('rf_open_login'); } catch (e) {}
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

  // (a) Valor do medico (celular/email) para a chave Pix, a prova de falha: se medicoDados
  // ainda nao carregou (ou veio sem o campo), busca fresco no banco pelo CRM na hora do clique.
  async function valorPixMedico(campo) {
    const cache = medicoDados?.[campo];
    if (cache) return cache;
    let crm = medicoCRM;
    try { if (!crm) crm = localStorage.getItem('medico_crm') || ''; } catch (e) {}
    if (!crm) return '';
    try {
      const { data } = await supabase.from('medicos').select('celular, email').eq('crm', crm).maybeSingle();
      if (data) { setMedicoDados(prev => ({ ...(prev || {}), ...data })); return data[campo] || ''; }
    } catch (e) {}
    return '';
  }

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

  // As faixas viviam aqui como tabela solta; agora vêm de limitesInput.js
  // (fonte única, compartilhada com a TriagemModal e o OBA).
  const CAMPOS_COM_FAIXA = ['ferritina', 'hemoglobina', 'vcm', 'rdw', 'satTransf', 'b12_valor', 'folato_valor', 'peso'];

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
    if (['hemoglobina', 'vcm', 'rdw', 'ferritina', 'satTransf', 'peso', 'b12_valor', 'folato_valor'].includes(name) && typeof valorAjustado === 'string') {
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
    // (fix) O `value !== ''` ficava DE FORA do else: ao APAGAR o campo, o aviso
    // amarelo de aberrante continuava na tela. Agora o vazio limpa o aviso.
    if (CAMPOS_COM_FAIXA.includes(name)) {
      const st = checarValor(name, value).status;
      setAberrantes(prev => ({ ...prev, [name]: st === 'aviso' || st === 'bloqueio' }));
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
            novosErros.dataNascimento = "O Projeto OBA\u00ae ainda n\u00e3o atende crian\u00e7as menores de 12 anos. Em breve teremos um m\u00f3dulo pedi\u00e1trico espec\u00edfico!";
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
    // Faixa fisiologicamente possivel (limitesInput). O aviso amarelo
    // "VALOR ABERRANTE - CONFIRME" continua valendo para o extremo POSSIVEL;
    // aqui so' barra o impossivel (erro de digitacao).
    CAMPOS_COM_FAIXA.forEach(k => {
      if (novosErros[k]) return;
      const r = checarValor(k, inputs[k]);
      if (r.status === 'bloqueio' || r.status === 'invalido') novosErros[k] = r.msg;
    });
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
      b12_valor:   inputs.b12_valor !== '' ? Number(sanitizarNumero(inputs.b12_valor)) : null,
      folato_valor: inputs.folato_valor !== '' ? Number(sanitizarNumero(inputs.folato_valor)) : null,
    };

    const res = mostrarExamesExtras ? avaliarPaciente(inputsNumericos) : triagemEritron(inputsNumericos);

    let obaResult = null;
    if (inputs.bariatrica) {
      // (b) FASE 1: o M\u00c9DICO v\u00ea o relat\u00f3rio COMPLETO que o paciente j\u00e1 gerou e est\u00e1 salvo
      // (oba_anamnese.relatorio_oba), com as travas novas (idea\u00e7\u00e3o, HTLV...) \u2014 N\u00c3O recalcula
      // com um recorte parcial de campos (o que antes deixava o relat\u00f3rio do m\u00e9dico "limpo").
      // Se o m\u00e9dico coletar/editar a anamnese pelo OBAModal (dadosOBAColetados, Fase 2), a\u00ed
      // sim recalcula com o que ele preencheu.
      const obaColetado = dadosOBAColetados || dadosOBARef.current;
      if (obaColetado) {
        obaResult = avaliarOBA(res, obaColetado.dadosOBA, obaColetado.examesOBA);
      } else if (inputs.cpf.trim()) {
        const cpfLimpo = inputs.cpf.replace(/\D/g, '');
        // RLS Fase 2: leitura por RPC.
        const { data: obaRow } = await supabase.rpc('oba_anamnese_relatorio_atual', {
          p_cpf: cpfLimpo, ...credMedico()
        });
        // O relatorio_oba salvo J\u00c1 \u00e9 a sa\u00edda do avaliarOBA (modulos/alertas/tipoCirurgia/\u2026),
        // completo \u2014 o ResultCard l\u00ea exatamente esses campos. Usa direto.
        if (obaRow?.relatorio_oba) obaResult = { ...obaRow.relatorio_oba, _estadoClinico: obaRow.estado_clinico || null };
      }
    }

    setResultado({ ...res, _inputs: inputsNumericos, _oba: obaResult, _medicoDados: medicoDados });
    setCopiado(false);

    if (inputs.cpf.trim() && res.encontrado) {
      // Logica de afiliados/banner SO se for medico logado (medicoCRM existe).
      // Paciente vindo da triagem pelo botao azul nao entra aqui.
      if (medicoCRM) {
        // Só avaliações COMPLETAS (ferritina preenchida): o "espelho" da triagem
        // (ferritina=null) inflava a contagem e fechava o convite 4DOC cedo demais.
        const { count: totalAvals } = await supabase.from('avaliacoes').select('*', { count: 'exact', head: true }).eq('medico_crm', medicoCRM).not('ferritina', 'is', null)
        const { data: medDados } = await supabase.from('medicos').select('cep, cpf, pix_chave').eq('crm', medicoCRM).maybeSingle()
        if (!medDados?.cep || !medDados?.cpf || !medDados?.pix_chave) {
          // Se o 4DOC ja foi oferecido (e declinado) nesta sessao, nao reabre o modal cheio:
          // no maximo o banner discreto. (Antes, o modal reaparecia logo apos a 1a avaliacao.)
          if ((totalAvals || 0) === 0 && !jaOfereceu4DOCRef.current) setTimeout(() => setShowAfiliados(true), 1200)
          else setTimeout(() => setShowConvite4doc(true), 1200)
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
          onContinuar={() => { setTriagemResultado(null); setShowTriagem(false); }}
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

      {/* Bifurcação do MÉDICO (pós-login): AVALIAR · ENCAMINHAR · VER CRÉDITOS. */}
      {cadastrado && menuMedico && !showAuthMedicoOverlay && (
        <div className="fixed inset-0 z-40 flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.95)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden relative my-4">
            {/* X = SAIR (mantém o login; o ícone OBA m reabre logado). Deslogar de
                verdade é pelo botão DESLOGAR abaixo. sairDoApp fecha o PWA ou navega
                pro bariatrico.net — não passa pelo onVoltar, que limparia a credencial. */}
            <button onClick={sairDoApp} aria-label="Sair" style={{ position:'absolute', top:10, right:10, width:26, height:26, borderRadius:'50%', background:'#7B1E1E', color:'#fff', border:'2px solid #fff', cursor:'pointer', fontSize:'12px', fontWeight:700, lineHeight:1, display:'flex', alignItems:'center', justifyContent:'center', zIndex:2 }}>{"✕"}</button>
            <div className="p-5 pt-7">
              <img src={obaLogo} alt="Projeto OBA" className="h-24 object-contain mx-auto mb-1" />
              {(medicoNome || medicoCRM) && <p className="text-center text-[11px] text-gray-400 mb-4">{[medicoNome, medicoCRM].filter(Boolean).join('  ·  ')}</p>}
              <div className="divide-y divide-gray-100">
                {/* 1. ENCAMINHAR */}
                <div className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-lg font-extrabold text-gray-900 leading-tight">{"ENCAMINHAR"}</p>
                    <p className="text-xs leading-snug" style={{ color: '#7B1E1E' }}>{"Encaminhe o paciente para que se cadastre antes da sua avaliação, ou para que ele possa se auto-avaliar."}</p>
                  </div>
                  <PlayButton onClick={() => { setQrFoco('qr'); setShowQRMedico(true) }} ariaLabel="Encaminhar" />
                </div>
                {/* 2. AVALIAR */}
                <div className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-lg font-extrabold text-gray-900 leading-tight">{"AVALIAR"}</p>
                    <p className="text-xs leading-snug" style={{ color: '#7B1E1E' }}>{"Para avaliar um paciente ele tem que ser encaminhado e estar cadastrado."}</p>
                  </div>
                  <PlayButton onClick={() => { setAvaliarFase('cpf'); setAvaliarCpfInput(''); setAvaliarErro('') }} ariaLabel="Avaliar" />
                </div>
                {/* 3. RECOMENDAR */}
                <div className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-lg font-extrabold text-gray-900 leading-tight">{"RECOMENDAR"}</p>
                    <p className="text-xs leading-snug" style={{ color: '#7B1E1E' }}>{"Registre o CPF do bariátrico no sistema. Ao se cadastrar ele terá a opção de destinar o crédito para você."}</p>
                  </div>
                  <PlayButton onClick={() => { setQrFoco('cpf'); setShowQRMedico(true) }} ariaLabel="Recomendar" />
                </div>
                {/* 4. VER MEUS CRÉDITOS */}
                <div className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-base font-extrabold text-gray-900 leading-tight">{"VER MEUS CRÉDITOS"}</p>
                    <p className="text-xs leading-snug" style={{ color: '#7B1E1E' }}>{"Seus encaminhamentos e avaliações."}</p>
                  </div>
                  <PlayButton onClick={() => setShowMeusCreditosMed(true)} ariaLabel="Ver créditos" />
                </div>
              </div>
              {/* Duas saídas com o efeito dito na cara (padrão do paciente/indicador):
                  DESLOGAR apaga a credencial ("Retorna com CRM/SENHA" — médico loga por
                  CRM); SAIR mantém o login e o ícone entra direto. O X equivale ao SAIR. */}
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-start justify-center gap-8">
                <div className="text-center">
                  <button onClick={() => { onLogout(); sairDoApp(); }} className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider hover:text-red-700">{"DESLOGAR"}</button>
                  <p className="text-[10px] text-gray-400 mt-1 leading-snug">{"Retorna "}<b>{"com"}</b>{" CRM/SENHA"}</p>
                </div>
                <div className="text-center">
                  <button onClick={sairDoApp} className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider hover:text-red-700">{"SAIR"}</button>
                  <p className="text-[10px] text-gray-400 mt-1 leading-snug">{"Retorna "}<b>{"sem"}</b>{" CRM/SENHA"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* "← Menu" — volta à bifurcação do médico. */}
      {cadastrado && !menuMedico && !showAuthMedicoOverlay && (
        <button onClick={() => setMenuMedico(true)}
          className="fixed top-3 left-3 z-30 bg-gray-700 hover:bg-gray-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md">
          {"← Menu"}
        </button>
      )}

      {/* AVALIAR — passo 1: CPF do paciente (já cadastrado). */}
      {avaliarFase === 'cpf' && (
        <div className="fixed inset-0 z-[45] flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.95)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden relative my-4 p-5 pt-7">
            <button onClick={() => setAvaliarFase(null)} aria-label="Voltar" style={{ position:'absolute', top:10, right:10, width:26, height:26, borderRadius:'50%', background:'#7B1E1E', color:'#fff', border:'2px solid #fff', cursor:'pointer', fontSize:'12px', fontWeight:700, lineHeight:1, display:'flex', alignItems:'center', justifyContent:'center', zIndex:2 }}>{"✕"}</button>
            <img src={obaLogo} alt="Projeto OBA" className="h-20 object-contain mx-auto mb-3" />
            <p className="text-center text-xs font-extrabold text-gray-500 tracking-widest mb-2">{"CPF DO PACIENTE"}</p>
            <input autoFocus className="w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-base text-center font-bold outline-none focus:border-gray-500"
              inputMode="numeric" maxLength={14} placeholder="000.000.000-00"
              value={avaliarCpfInput}
              onChange={e => { const d = e.target.value.replace(/\D/g, '').slice(0, 11); const f = d.length <= 3 ? d : d.length <= 6 ? d.slice(0,3)+'.'+d.slice(3) : d.length <= 9 ? d.slice(0,3)+'.'+d.slice(3,6)+'.'+d.slice(6) : d.slice(0,3)+'.'+d.slice(3,6)+'.'+d.slice(6,9)+'-'+d.slice(9); setAvaliarCpfInput(f); setAvaliarErro('') }}
              onKeyDown={e => { if (e.key === 'Enter') carregarPacienteAvaliar() }} />
            {avaliarErro && <p className="text-center text-red-600 text-xs font-bold mt-2">{avaliarErro}</p>}
            <div className="flex justify-end mt-3">
              <PlayButton onClick={() => carregarPacienteAvaliar()} ariaLabel="Avaliar" />
            </div>
            <p className="text-center text-[11px] text-gray-400 mt-3">{"O paciente precisa já estar cadastrado. (Leitura de QR: em breve.)"}</p>
          </div>
        </div>
      )}

      {/* AVALIAR — passo 2: o OBA Modal direto (o OBA já traz eritron/anamnese do paciente;
          paciente novo → o OBA coleta o hemograma na etapa de exames). */}
      {avaliarFase === 'oba' && pacienteAvaliar && (
        <OBAModal
          cpf={pacienteAvaliar.cpf}
          nome={pacienteAvaliar.nome}
          sexo={pacienteAvaliar.sexo}
          dataNascimento={pacienteAvaliar.data_nascimento}
          idade={pacienteAvaliar.data_nascimento ? Math.floor((Date.now() - new Date(pacienteAvaliar.data_nascimento)) / 31557600000) : 0}
          dadosRedFairy={{}}
          resultadoEritron={pacienteAvaliar.ultimaAval
            ? { label: pacienteAvaliar.ultimaAval.diagnostico_label, color: pacienteAvaliar.ultimaAval.diagnostico_color, inputs: { sexo: pacienteAvaliar.sexo } }
            : null}
          examesRedFairy={pacienteAvaliar.ultimaAval
            ? { ferritina: pacienteAvaliar.ultimaAval.ferritina, hemoglobina: pacienteAvaliar.ultimaAval.hemoglobina, vcm: pacienteAvaliar.ultimaAval.vcm, rdw: pacienteAvaliar.ultimaAval.rdw, satTransf: pacienteAvaliar.ultimaAval.sat_transf, dataColeta: pacienteAvaliar.ultimaAval.data_coleta }
            : null}
          anamneseAnterior={pacienteAvaliar.anamneseAnterior}
          anamneseBaseline={pacienteAvaliar.anamneseBaseline}
          numeroCiclo={pacienteAvaliar.numeroCiclo}
          coletarHemograma={!pacienteAvaliar.ultimaAval}
          modoMedico={true}
          modoRevisao={avaliarRevisao}
          onFechar={() => { try { sessionStorage.removeItem('rf_med_oba_cpf'); sessionStorage.removeItem('rf_med_oba_rev') } catch (e) {}; setAvaliarFase(null); setPacienteAvaliar(null); setAvaliarRevisao(false) }}
          onConcluir={async () => {
            const eraRevisao = avaliarRevisao
            const cpfRev = pacienteAvaliar?.cpf || inputs.cpf
            // REVISÃO não gera crédito de avaliação (o médico só corrigiu a anamnese);
            // o AVALIAR normal, sim (medico_avaliar_paciente).
            if (!eraRevisao) {
              try {
                const tok = localStorage.getItem('medico_token') || ''
                await supabase.rpc('medico_avaliar_paciente', { p_crm: medicoCRM, p_token: tok, p_cpf: pacienteAvaliar.cpf, p_opiniao: '', p_sugestao: '' })
              } catch (e) {}
            }
            try { sessionStorage.removeItem('rf_med_oba_cpf'); sessionStorage.removeItem('rf_med_oba_rev') } catch (e) {}
            setAvaliarFase(null); setPacienteAvaliar(null); setAvaliarRevisao(false)
            // Revisão: o card do médico (ResultCard) já está aberto (resultado != null), então
            // o form clássico com #btn-avaliar-paciente está DESMONTADO — re-clicar seria no-op.
            // Recarregamos o relatório recém-salvo (última linha do CPF) direto no card.
            if (eraRevisao) {
              const cpfLimpo = String(cpfRev || '').replace(/\D/g, '')
              if (cpfLimpo) {
                try {
                  // RLS Fase 2: leitura por RPC.
                  const { data: obaRow } = await supabase.rpc('oba_anamnese_relatorio_atual', {
                    p_cpf: cpfLimpo, ...credMedico()
                  })
                  if (obaRow?.relatorio_oba) {
                    setResultado(prev => prev ? { ...prev, _oba: { ...obaRow.relatorio_oba, _estadoClinico: obaRow.estado_clinico || null } } : prev)
                  }
                } catch (e) {}
              }
            }
          }}
        />
      )}

      {showAfiliadosBanner && !showAfiliados && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4" style={{ background: 'rgba(0,0,0,0.95)' }}>
          <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-red-700 px-5 py-3 flex items-center justify-between">
              <p className="text-white font-bold text-sm">{"\ud83c\udfaf 4DOC | Programa de Afiliados OBA\u00ae"}</p>
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

      {/* (item 8) PLACEHOLDER do convite 4DOC pos-avaliacao (so para medico nao afiliado).
          Substitui a antiga tarja cinza. A versao redesenhada sera feita depois. */}
      {showConvite4doc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.95)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-red-700 px-5 py-3 flex items-center justify-between">
              <p className="text-white font-bold text-sm">{"🎯 Programa 4DOC"}</p>
              <button onClick={() => setShowConvite4doc(false)} className="text-red-200 hover:text-white text-lg" style={{ lineHeight: 1 }}>{"✕"}</button>
            </div>
            <div className="p-5 space-y-4 text-center">
              <p className="text-[11px] uppercase tracking-widest text-gray-400 font-bold">{"Placeholder — a redesenhar"}</p>
              <p className="text-gray-700 text-sm leading-relaxed">
                {"Você ainda não forneceu CPF e chave Pix para o "}<strong>{"4DOC — Programa Patrocinado de Médicos Afiliados"}</strong>{". Integre-se para receber créditos quando seus pacientes se cadastrarem."}
              </p>
              <button onClick={() => { setShowConvite4doc(false); setShowAfiliados(true); }}
                className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
                {"Quero participar →"}
              </button>
              <button onClick={() => setShowConvite4doc(false)} className="block w-full text-gray-400 hover:text-gray-600 text-xs font-medium">
                {"Agora não"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAfiliados && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.95)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" style={{ maxHeight: '92vh', display: 'flex', flexDirection: 'column', position: 'relative' }}
            onMouseEnter={() => setBgAfilRevelado(true)} onMouseLeave={() => setBgAfilRevelado(false)} onTouchStart={() => setBgAfilRevelado(true)}>
            {/* (f) Imagem de fundo do FORM removida — o form (CEP/CPF/Pix) fica limpo. */}
            {/* SPLASH de entrada: imagem (largura cheia, cortada na cintura, centrada) + greeting por 5s, antes dos campos */}
            <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 5, backgroundColor: '#FDF7F7', opacity: splashAfil ? 1 : 0, pointerEvents: splashAfil ? 'auto' : 'none', transition: 'opacity 0.5s ease' }}>
              <div style={{ position: 'absolute', top: '72px', left: 0, right: 0, bottom: '8px' }}>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${afilBg.img})`, backgroundSize: afilBg.size, backgroundPosition: afilBg.pos, backgroundRepeat: 'no-repeat' }} />
                <div style={{ position: 'absolute', left: 0, right: 0, top: '8%', padding: '0 22px', textAlign: 'center' }}>
                  <p style={{ color: '#ffffff', fontSize: '21px', fontWeight: 900, lineHeight: 1.15, margin: 0, textShadow: '0 2px 14px rgba(0,0,0,0.75), 0 1px 4px rgba(0,0,0,0.6)' }}>{medicoSexo === 'F' ? 'Bem-vinda' : 'Bem-Vindo'}{" ao 4DOC"}<sup style={{ fontSize: '0.55em', verticalAlign: 'super' }}>{"®"}</sup>{" Programa Patrocinado de Médicos Afiliados"}</p>
                </div>
              </div>
            </div>

            {/* CARD da FADINHA 4DOC (encaminhamento): aparece sobre a imagem; o splash só
                sai quando o médico instala a fadinha OU opta por instalar depois. */}
            {cardFada4doc && (
              <div style={{ position: 'absolute', left: 0, right: 0, top: '404px', bottom: 0, zIndex: 6, overflowY: 'auto', WebkitOverflowScrolling: 'touch', background: 'linear-gradient(to top, #ffffff 86%, rgba(255,255,255,0))' }} className="px-4 pt-3 pb-6">
                <div className="rounded-xl border-2 border-blue-300 bg-blue-50 p-3 shadow-lg">
                  <p className="text-[11px] text-blue-900 leading-snug font-bold">
                    {"AGORA INSTALE o ÍCONE do Programa — "}<span style={{ color: '#7B1E1E' }}>{"o Chapéu de Ouro"}</span>{" — na tela do seu celular. É apenas um atalho seguro para que você possa entrar rapidamente no programa sem precisar digitar LOGIN/SENHA, e que disponibiliza ferramentas imediatas para você AVALIAR ou simplesmente ENCAMINHAR um paciente para que se auto-avalie. Através desse acesso, você também vai poder consultar os seus créditos no 4DOC®."}
                  </p>
                  <div className="text-center mt-2">
                    <button onClick={() => setShowCreditosPopup(true)} className="text-xs font-bold text-green-700 underline underline-offset-2 hover:text-green-800">
                      {"Saiba mais sobre os créditos do 4DOC"}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 mt-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={fada4docMarcada} onChange={aoMarcarFada4doc} className="w-4 h-4 flex-shrink-0" style={{ accentColor: '#1d4ed8' }} />
                    <span className="text-xs font-bold text-blue-700">{"Sim, instale o ÍCONE do 4DOC® na minha tela."}</span>
                  </label>
                  <img src={obaFairyIcon} alt="Ícone do 4DOC" className="flex-shrink-0 w-11 h-11 rounded-lg" style={{ objectFit: 'contain' }} />
                </div>
                {linkMedCopiado && (
                  <p className="text-[11px] mt-1.5 leading-snug text-green-700 font-bold text-center">{"✓ LINK copiado! Cole no WhatsApp ou Telegram e envie aos seus pacientes."}</p>
                )}
                {fada4docInstrIOS && (
                  <p className="text-[11px] mt-1 leading-snug text-blue-700 text-center">{"No iPhone: toque em "}<strong>{"Compartilhar"}</strong>{" (↑) e depois em "}<strong>{"\"Adicionar à Tela de Início\""}</strong>{"."}</p>
                )}
                <button onClick={prosseguirAfil} className="block w-full text-right text-[11px] font-bold text-gray-500 mt-2 underline underline-offset-2 hover:text-gray-700">
                  {"Instalo o ÍCONE depois, prossiga"}
                </button>
              </div>
            )}

            {/* Popup "Saiba mais sobre os créditos do 4DOC" (nota de 10 dólares + USDC) */}
            {showCreditosPopup && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.95)' }} onClick={() => setShowCreditosPopup(false)}>
                <div onClick={e => e.stopPropagation()} style={{ position: 'relative', width: '100%', maxWidth: '398px', aspectRatio: '2.45 / 1', background: '#fff', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
                  {/* Nota de 10 dólares preenchendo o popup (cover), esmaecida p/ o texto ler bem.
                      aspectRatio fixo: alargar a caixa NÃO altera o enquadramento da nota. */}
                  <div aria-hidden="true" style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/nota10dolares.png)', backgroundSize: 'cover', backgroundPosition: 'center', transform: 'scale(1.06)', opacity: 0.42 }} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '0 30px' }}>
                    <p style={{ color: '#065f46', fontWeight: 800, fontSize: '10.5px', lineHeight: 1.5 }}>
                      {"Cada paciente que você AVALIA e que se CADASTRA (ou seja, paga uma pequena anuidade) gera para você um crédito de 15 USDC (dólares digitais)."}<br /><br />{"Cada paciente que você simplesmente ENCAMINHA para auto-avaliação e que SE CADASTRA gera um crédito de 10 USDC."}
                    </p>
                  </div>
                  {/* Fechar: círculo vinho com X branco, menor, no canto superior direito */}
                  <button onClick={() => setShowCreditosPopup(false)} aria-label="Fechar"
                    style={{ position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: '50%', background: '#7B1E1E', color: '#fff', border: '2px solid #fff', cursor: 'pointer', fontSize: '10px', fontWeight: 700, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
                    {"✕"}
                  </button>
                </div>
              </div>
            )}
            {/* Header compacto estilo TriagemModal: logo-fada + RedFairy em dois tons.
                zIndex 10 (acima do splash zIndex 5) p/ o header ja aparecer durante a imagem. */}
            <div style={{ position: 'relative', zIndex: 10, background: '#6B7280', borderBottom: '1px solid #f1f5f9', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <img src={obaLogo} alt="Projeto OBA" style={{ width: 30, height: 30, objectFit: 'contain' }} />
              <h2 style={{ fontFamily: "'Georgia', serif", fontWeight: 900, fontSize: '1.25rem', letterSpacing: '-0.02em', margin: 0 }}>
                <span style={{ color: '#facc15' }}>{"Projeto OBA"}<sup style={{ fontSize: '0.5em', verticalAlign: 'super' }}>®</sup></span>
              </h2>
            </div>
            {/* Subtitulo vinho do programa: zIndex 10 p/ aparecer desde o inicio, junto do header */}
            <div style={{ position: 'relative', zIndex: 10, background: 'rgba(255,255,255,0.92)', borderBottom: '1px solid #f1f5f9', padding: '0 14px 9px', flexShrink: 0 }}>
              <p style={{ margin: 0, color: '#7B1E1E', fontWeight: 700, fontSize: '13px', letterSpacing: '0.3px' }}>{"4DOC® Programa de Médicos Afiliados"}</p>
            </div>

            <div className="p-6 space-y-4" style={{ overflowY: 'auto', flex: 1, position: 'relative', zIndex: 1 }}>
              <div className="bg-blue-50 border-2 border-blue-400 rounded-xl p-3">
              <p className="text-blue-800 text-sm leading-relaxed">
                {"Para concluir a sua inscri\u00e7\u00e3o no "}<strong>Programa de Médicos Afiliados Patrocinado</strong>{" e receber os benef\u00edcios previstos, precisamos do seu "}<strong>CEP</strong>{", "}<strong>CPF</strong>{" e da sua "}<strong>chave Pix</strong>{"."}
              </p>
              </div>
              <p className="text-xs text-red-800 leading-relaxed font-medium" style={{ textAlign: 'justify' }}>
                {"\ud83d\udd12 Entre seus dados tranquilamente. Voc\u00ea est\u00e1 em um servidor seguro, e n\u00e3o existe a possibilidade de uso inadequado dessas informa\u00e7\u00f5es."}
              {" O projeto inclui proteção contra invasão e segue as exigências da LGPD."}</p>
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
                        onChange={async () => {
                          if (pixTipo === 'telefone') { setPixTipo(''); setAfiliadoPix(''); return; }
                          setPixTipo('telefone');
                          const v = await valorPixMedico('celular'); setAfiliadoPix(v);
                          if (!v && refAfilPix.current) refAfilPix.current.focus();
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
                        onChange={async () => {
                          if (pixTipo === 'email') { setPixTipo(''); setAfiliadoPix(''); return; }
                          setPixTipo('email');
                          const v = await valorPixMedico('email'); setAfiliadoPix(v);
                          if (!v && refAfilPix.current) refAfilPix.current.focus();
                        }}
                        style={{ accentColor: '#7B1E1E' }} />
                      <span className="text-gray-700 font-medium" style={{ fontSize: '12px', letterSpacing: '0.3px' }}>{"MEU E-MAIL \u00c9 O MEU PIX"}</span>
                    </label>
                  </div>
                  <input ref={refAfilPix} type="text" value={afiliadoPix}
                    onChange={e => { setAfiliadoPix(e.target.value); setPixTipo(e.target.value ? 'outra' : ''); }}
                    placeholder={"ou DIGITE outra chave PIX"}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                  {/* Titular do PIX: chave própria → travado no médico. Chave "outra" → familiar/PJ destravam. */}
                  {pixTipo === 'outra' && (
                    <div className="mt-3 space-y-1.5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={afilFamiliar}
                          onChange={e => { const v = e.target.checked; setAfilFamiliar(v); if (v) { setAfilPj(false); setAfilTitular(''); } else setAfilTitular(medicoNome || ''); }}
                          style={{ accentColor: '#7B1E1E' }} />
                        <span className="text-gray-700 font-medium" style={{ fontSize: '12px', letterSpacing: '0.3px' }}>{"O TITULAR DA CONTA É UM FAMILIAR"}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={afilPj}
                          onChange={e => { const v = e.target.checked; setAfilPj(v); if (v) { setAfilFamiliar(false); setAfilTitular(''); } else setAfilTitular(medicoNome || ''); }}
                          style={{ accentColor: '#7B1E1E' }} />
                        <span className="text-gray-700 font-medium" style={{ fontSize: '12px', letterSpacing: '0.3px' }}>{"O TITULAR DA CONTA É PESSOA JURÍDICA"}</span>
                      </label>
                    </div>
                  )}
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wide mt-3 mb-1">{afilPj ? 'Razão Social (titular)' : 'Nome do titular da conta (quem recebe)'}</label>
                  <input type="text" value={afilTitular} onChange={e => setAfilTitular(e.target.value)}
                    readOnly={!afilFamiliar && !afilPj}
                    placeholder={afilPj ? 'Razão Social da empresa' : (afilFamiliar ? 'Nome de quem recebe' : 'Você (titular)')}
                    className={`w-full border-2 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${(afilFamiliar || afilPj) ? 'border-red-500 bg-red-50 focus:ring-red-400' : 'border-gray-200 bg-gray-100 text-gray-500 focus:ring-gray-300'}`} />
                  {afilPj && (
                    <input type="text" value={afilCnpj} onChange={e => setAfilCnpj(e.target.value.replace(/\D/g, '').slice(0, 14))}
                      placeholder={"CNPJ (só números)"} inputMode="numeric"
                      className="w-full border-2 border-red-500 bg-red-50 rounded-xl px-3 py-2 text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-red-400" />
                  )}
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer mt-1 mb-2">
                <input type="checkbox" checked={usaTelegram} onChange={e => setUsaTelegram(e.target.checked)} style={{ accentColor: '#7B1E1E' }} />
                <span className="text-gray-700 font-medium" style={{ fontSize: '12px', letterSpacing: '0.3px' }}>{"USO TAMBÉM O TELEGRAM"}</span>
              </label>
              {afiliadoSalvo ? null : (
                <div className="space-y-2">
                  {/* Padrao PlayButton: \u25b6 vinho + piscar DOURADO + subtexto PROSSEGUIR.
                      SEMPRE visivel; desabilitado ate CEP + CPF(valido) + chave Pix; o hint
                      mostra o que ainda falta (antes o botao sumia e o medico ficava preso). */}
                  <div className="flex flex-col items-end gap-1 pt-1">
                    <PlayButton
                      onClick={async () => {
                        // Botao SEMPRE clicavel: se faltar algo, foca o campo que falta (em vez de
                        // ficar mudo / "nao progredir"). So salva com CEP + CPF(valido) + chave Pix.
                        if (!afiliadoCEP.trim()) { refAfilCEP.current?.focus(); return; }
                        if (!afiliadoCPF.trim() || afiliadoCPFErro) { setEtapaAfil(2); refAfilCPF.current?.focus(); return; }
                        if (!afiliadoPix.trim()) { refAfilPix.current?.focus(); return; }
                        if (!afilTitular.trim()) { alert(afilPj ? 'Informe a Razão Social do titular.' : 'Informe o nome do titular da conta.'); return; }
                        if (afilPj && String(afilCnpj).replace(/\D/g, '').length !== 14) { alert('Informe o CNPJ (14 dígitos).'); return; }
                        // CRM robusto (prop ou localStorage) e salvamento AUTOVERIFICAVEL:
                        // .select() devolve as linhas afetadas \u2014 se vier 0, o UPDATE nao gravou
                        // nada (CRM nao casou) e a gente AVISA, em vez de seguir calado.
                        let crmSalvar = (medicoCRM || '').trim();
                        try { if (!crmSalvar) crmSalvar = (localStorage.getItem('medico_crm') || '').trim(); } catch (e) {}
                        const cpfLimpo = afiliadoCPF.replace(/\D/g, '');
                        const pixLimpo = afiliadoPix.trim();
                        const cepLimpo = afiliadoCEP.trim();
                        setAfiliadoSalvando(true);
                        const { data: linhas, error } = await supabase.from('medicos').update({
                          endereco: '', cep: cepLimpo, cpf: cpfLimpo, pix_chave: pixLimpo, usa_telegram: usaTelegram,
                        }).eq('crm', crmSalvar).select('crm');
                        // Titular do PIX: colunas podem nao existir ainda (migrate_pix_titular_medico.sql).
                        // Update SEPARADO e tolerante — nao quebra o cadastro do medico se faltarem.
                        try { await supabase.from('medicos').update({ pix_titular: afilTitular.trim(), pix_titular_pj: afilPj, pix_cnpj: afilPj ? String(afilCnpj).replace(/\D/g, '') : null }).eq('crm', crmSalvar); } catch (e) {}
                        setAfiliadoSalvando(false);
                        if (error) { alert('Erro ao salvar: ' + (error.message || 'tente novamente.')); return; }
                        if (!linhas || linhas.length === 0) {
                          alert('Nao foi possivel gravar seus dados: o cadastro do medico (CRM ' + (crmSalvar || '\u2014') + ') nao foi encontrado no banco. Refaca o login/cadastro do medico e tente de novo.');
                          return;
                        }
                        // Sucesso confirmado: atualiza o cache local p/ o medico ja contar como afiliado.
                        setMedicoDados(prev => ({ ...(prev || {}), cep: cepLimpo, cpf: cpfLimpo, pix_chave: pixLimpo }));
                        setAfiliadoSalvo(true); setShowAfiliados(false); setShowFelicitacoes(true);
                      }}
                      loading={afiliadoSalvando}
                      disabled={afiliadoSalvando}
                      label="PROSSEGUIR"
                      hint={false && (!afiliadoCEP.trim() || !afiliadoCPF.trim() || !afiliadoPix.trim() || afiliadoCPFErro)
                        ? `Falta: ${[!afiliadoCEP.trim() && 'CEP', (!afiliadoCPF.trim() || afiliadoCPFErro) && 'CPF', !afiliadoPix.trim() && 'chave Pix'].filter(Boolean).join(', ')}`
                        : ' '}
                      ariaLabel="Confirmar dados"
                      ringColor="rgba(227,174,55,0.75)"
                    />
                  </div>
                  {/* Link discreto "\u2190 VOLTAR" (substitui o antigo "Preencher depois"). */}
                  <button onClick={() => setShowAfiliados(false)}
                    className="text-gray-400 hover:text-gray-600 text-xs font-medium pt-1">
                    {"\u2190 VOLTAR"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showOBA && (
        <OBAModal
          modoMedico={true}
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
              <h1 className="text-xl font-bold tracking-wide leading-tight">{"RedFairy | "}<span style={{ color: '#e5e7eb', fontWeight: 700 }}>{"Projeto OBA"}<sup style={{ fontSize: '0.55em', verticalAlign: 'super' }}>{"®"}</sup></span></h1>
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
            {/* "Trocar médico" (não "Sair"): desloga de verdade — nome diferente do
                SAIR da bifurcação, que mantém o login. */}
            <button onClick={() => setShowLogoutConfirm(true)}
              className="bg-gray-200 hover:bg-gray-300 text-red-800 rounded-lg px-3 py-1 text-xs font-bold whitespace-nowrap transition-colors">
              {"Trocar médico"}
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
          style={{ background: 'rgba(0,0,0,0.95)' }} onClick={() => setShowLogoutConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-72 space-y-4" onClick={e => e.stopPropagation()}>
            <p className="text-center text-base font-bold text-gray-700">{"Trocar m\u00e9dico?"}</p>
            <p className="text-center text-sm text-gray-500">{"Voc\u00ea ser\u00e1 desconectado e voltar\u00e1 \u00e0 tela de login."}</p>
            <button onClick={() => { setShowLogoutConfirm(false); onLogout(); }}
              className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors">
              {"Sim, trocar"}
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
          style={{ background: 'rgba(0,0,0,0.95)' }} onClick={() => setShowDemoMenu(false)}>
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
          style={{ background: 'rgba(0,0,0,0.95)' }}
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
                <input type="text" name="peso" value={inputs.peso} onChange={handleChange} disabled={dadosVieramDaTriagem && !editandoDadosPaciente} placeholder="Ex: 72" inputMode="decimal" maxLength={6} autoComplete="off" className={`input ${erros.peso ? 'border-red-500' : ''} ${dadosVieramDaTriagem && !editandoDadosPaciente ? 'bg-gray-100 text-gray-500' : ''}`} />
                {/* Campo cru (não é LabInput): sem isso o bloqueio por peso
                    impossível só apareceria no resumo de erros do rodapé. */}
                {erros.peso
                  ? <p className="text-red-500 text-xs mt-1">{erros.peso}</p>
                  : <p className="text-xs text-gray-400 mt-0.5">{"Opcional — usado no cálculo de dose de ferro EV"}</p>}
              </div>
              <div className="col-span-2">
                <label className={`flex items-start gap-2 p-3 rounded-xl border-2 transition-all ${dadosVieramDaTriagem && !editandoDadosPaciente ? 'cursor-default' : 'cursor-pointer'} ${inputs.bariatrica_medico ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                  <input type="checkbox" name="bariatrica_medico" checked={inputs.bariatrica_medico} onChange={handleChange} disabled={(dadosVieramDaTriagem && !editandoDadosPaciente) || ehDominioBariatrico()} className="mt-0.5 w-4 h-4 cursor-pointer flex-shrink-0 disabled:opacity-50" />
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
                  aria-label={"Liberar campos de Ferritina e Satura\u00e7\u00e3o da Transferrina"}
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

            {/* MACROCITOSE (VCM>100): liberar também B12 e Folato pelo botão azul. */}
            {Number(String(inputs.vcm).replace(',', '.')) > 100 && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <LabInput
                  label="Vitamina B12"
                  unit="pg/mL"
                  name="b12_valor"
                  reference="200–900"
                  value={inputs.b12_valor}
                  onChange={handleChange}
                  error={erros.b12_valor}
                  aberrante={!!aberrantes["b12_valor"]}
                  hint={mostrarExamesExtras ? "Macrocitose → investigar B12" : "Clique no botão azul para liberar"}
                  disabled={!mostrarExamesExtras}
                  borderColor="blue"
                />
                <LabInput
                  label="Folato (ác. fólico)"
                  unit="ng/mL"
                  name="folato_valor"
                  reference="> 4"
                  value={inputs.folato_valor}
                  onChange={handleChange}
                  error={erros.folato_valor}
                  aberrante={!!aberrantes["folato_valor"]}
                  hint={mostrarExamesExtras ? "Macrocitose → investigar folato" : "Clique no botão azul para liberar"}
                  disabled={!mostrarExamesExtras}
                  borderColor="blue"
                />
              </div>
            )}

            {/* ANTI-H.PYLORI IgG/IgM (sorologia qualitativa). IgM reagente → indica
                a prescrição do tratamento de erradicação. */}
            <div className="mt-3 bg-orange-50 border border-orange-200 rounded-xl p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-orange-800 mb-2">{"Anti-H. pylori (sorologia)"}</p>
              <div className="grid grid-cols-2 gap-3">
                {[['IgG', 'antiHp_igg'], ['IgM', 'antiHp_igm']].map(([rotulo, campo]) => (
                  <div key={campo}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{rotulo}</label>
                    <select value={inputs[campo]} onChange={e => setInputs(p => ({ ...p, [campo]: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300">
                      <option value="">Selecione</option>
                      <option value="NÃO REAGENTE">Não reagente</option>
                      <option value="REAGENTE">Reagente</option>
                    </select>
                  </div>
                ))}
              </div>
              {inputs.antiHp_igm === 'REAGENTE' && (
                <p className="text-xs font-semibold text-orange-800 mt-2">{"⚠ IgM reagente sugere infecção ativa por H. pylori — indicada a prescrição do tratamento de erradicação."}</p>
              )}
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

          {/* LIMPAR (base esquerda) + AVALIAR no padrao PlayButton cinza/dourado (id e
              type=submit preservados para o submit do form e o clique programatico). */}
          <style>{`@keyframes rfGoldBlink { 0%,100%{box-shadow:0 0 0 0 rgba(227,174,55,0.7);} 50%{box-shadow:0 0 0 9px rgba(227,174,55,0);} } .rf-pb-gold{ animation: rfGoldBlink 1.1s ease-in-out infinite; }`}</style>
          <div className="flex items-end justify-between pt-2">
            <button type="button" onClick={handleLimpar}
              className="text-gray-400 hover:text-gray-600 text-sm font-medium pb-1">
              Limpar
            </button>
            <div className="flex flex-col items-center gap-1">
              <button id="btn-avaliar-paciente" type="submit" aria-label="Avaliar Paciente"
                className="rf-pb-gold w-14 h-14 rounded-full bg-gray-300 hover:bg-gray-400 flex items-center justify-center shadow-md transition-colors">
                <span style={{ color: '#7B1E1E', fontSize: '1.4rem', lineHeight: 1, marginLeft: 3 }}>{"▶"}</span>
              </button>
              <span className="text-xs font-bold tracking-wide" style={{ color: '#7B1E1E' }}>{"AVALIAR PACIENTE"}</span>
            </div>
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
                    b12_valor: 'Vitamina B12',
                    folato_valor: 'Folato',
                    peso: 'Peso',
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
              onRevisarAnamnese={medicoCRM ? (cpfArg) => carregarPacienteAvaliar(cpfArg || inputs.cpf, true) : undefined}
            />
            {/* (4DOC) Médico logado + avaliação completa SALVA (com CPF) → botão da fada
                que abre o QR de encaminhamento. Como exige a avaliação completa salva, a
                régua de elegibilidade do crédito (≥1 avaliação completa) já está garantida. */}
            {medicoCRM && resultado?.encontrado && inputs.cpf && inputs.cpf.trim() && (
              <div className="mt-3 flex flex-col items-center gap-1.5">
                <button onClick={() => setShowQRMedico(true)}
                  className="inline-flex items-center gap-2 bg-red-700 hover:bg-red-800 text-white font-bold text-sm px-5 py-3 rounded-xl shadow-md transition-colors">
                  <span style={{ fontSize: '1.1rem' }}>{"🧚"}</span>
                  <span>{"Gerar QR de encaminhamento (4DOC)"}</span>
                </button>
                <p className="text-[11px] text-center text-gray-600 font-semibold leading-snug px-4">
                  {"MOSTRE AGORA AO SEU PACIENTE, QUANDO ELE SE CADASTRAR VOCÊ RECEBE CRÉDITOS NO 4DOC"}<sup style={{ fontSize: '0.7em', verticalAlign: 'super' }}>{"®"}</sup>
                </p>
              </div>
            )}
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

      {showQRMedico && medicoCRM && (
        <QRMedicoModal crm={medicoCRM} foco={qrFoco} onClose={() => setShowQRMedico(false)} />
      )}

      {/* Top-level: funciona da bifurcação E de dentro do 4DOC (antes só montava dentro do 4DOC). */}
      {showMeusCreditosMed && <CreditosMedicoModal onFechar={() => setShowMeusCreditosMed(false)} />}

      {showConviteAfiliado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.95)' }}>
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
              setShowTriagem(false);   // evita o "flash" do modal de triagem ao voltar
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
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4" style={{ background: 'rgba(0,0,0,0.95)', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden my-4" style={{ position: 'relative' }}>
            {/* (a) Fechar (canto sup. direito): sai DESLOGADO do app (sairDoApp fecha o
                PWA ou navega pro bariatrico.net — nunca a aba sobreposta travada). */}
            <button onClick={() => {
                try { ['medico_crm','medico_nome','medico_token','medico_login_at','medico_is_admin','rf_crm_prefill'].forEach(k => localStorage.removeItem(k)); } catch (e) {}
                sairDoApp();
              }}
              aria-label="Fechar"
              style={{ position: 'absolute', top: 6, right: 9, zIndex: 20, background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', lineHeight: 1, color: '#9ca3af' }}>
              {"✕"}
            </button>
            {/* Header fada */}
            <div style={{ position: 'relative', zIndex: 10, background: '#6B7280', borderBottom: '1px solid #f1f5f9', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src={obaLogo} alt="Projeto OBA" style={{ width: 30, height: 30, objectFit: 'contain' }} />
              <h2 style={{ fontFamily: "'Georgia', serif", fontWeight: 900, fontSize: '1.25rem', letterSpacing: '-0.02em', margin: 0 }}>
                <span style={{ color: '#facc15' }}>{"Projeto OBA"}<sup style={{ fontSize: '0.5em', verticalAlign: 'super' }}>®</sup></span>
              </h2>
            </div>
            {/* HERO: imagem nitida no topo (bloco proprio, sem sobreposicao com o texto).
                Saudacao branca fica sobre a imagem; os botoes surgem ABAIXO, apos o splash de 2s. */}
            <div style={{ position: 'relative', width: '100%', height: ehDominioBariatrico() ? '360px' : '240px', overflow: 'hidden', backgroundColor: '#FDF7F7' }}>
              <div aria-hidden="true" style={{ position: 'absolute', inset: 0, backgroundImage: `url(${ehDominioBariatrico() ? '/new-tele.png' : chatphone2Img})`, backgroundSize: ehDominioBariatrico() ? 'contain' : '100% auto', backgroundPosition: ehDominioBariatrico() ? 'center' : 'center top', backgroundRepeat: 'no-repeat' }} />
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: '6%', padding: '0 24px', textAlign: 'center' }}>
                <p style={{ color: '#ffffff', fontSize: '22px', fontWeight: 900, lineHeight: 1.18, margin: 0, textShadow: '0 2px 14px rgba(0,0,0,0.75), 0 1px 4px rgba(0,0,0,0.6)' }}>
                  {"Estamos felizes de ter voc\u00ea no Projeto OBA"}<sup style={{ fontSize: '0.55em', verticalAlign: 'super', marginLeft: '1px' }}>{"\u00ae"}</sup>
                </p>
              </div>
            </div>
            {/* Conteudo: surge apos o splash (2s), ABAIXO da imagem (sem sobreposicao) */}
            <div className="px-5 py-5" style={{ position: 'relative', zIndex: 1, opacity: splashFelic ? 0 : 1, transform: splashFelic ? 'translateY(8px)' : 'translateY(0)', transition: 'opacity 0.5s ease, transform 0.5s ease' }}>
              {/* (g) Logo + (f) nova frase: as duas fun\u00e7\u00f5es do m\u00e9dico (AVALIAR / ENCAMINHAR). */}
              <img src={obaLogo} alt="Projeto OBA" className="h-16 object-contain mx-auto mb-3" />
              <p className="text-gray-700 text-sm leading-relaxed text-center">
                {"Agora voc\u00ea pode AVALIAR ou ENCAMINHAR novos pacientes para o Projeto OBA\u00ae, recebendo incentivo dos nossos patrocinadores para cada paciente que se cadastre sob o seu CRM. Para AVALIAR um/uma paciente voc\u00ea precisar\u00e1 dos seus exames mais recentes; para ENCAMINHAR voc\u00ea s\u00f3 precisará mostrar um QR-CODE a ele/ela na tela do seu celular, ou enviar um link por WhatsApp, ou simplesmente digitar o CPF dele/dela."}
              </p>
              {/* Play DOURADO surge 2s depois do texto: seta o flag bariatrico e abre a triagem
                  (com isso o checkbox "paciente bariatrico" ja vem marcado e travado la). */}
              {mostrarPlayFelic && (
                <div className="flex justify-center mt-5">
                  <PlayButton
                    onClick={() => { setShowFelicitacoes(false); setMenuMedico(true); }}
                    label="INICIAR"
                    ariaLabel={"Iniciar investiga\u00e7\u00e3o"}
                    ringColor="rgba(227,174,55,0.75)"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showBeneficios && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.95)' }}>
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
                {"Em breve: lista detalhada dos benef\u00edcios do 4DOC | Programa de Afiliados OBA\u00ae."}
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
