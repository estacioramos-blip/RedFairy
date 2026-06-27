import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Calculator from './components/Calculator'
import AuthPage from './components/AuthPage'
import PatientDashboard from './components/PatientDashboard'
import AdminPage from './components/AdminPage'
import logo from './assets/logo.png'
import LandingPage from './components/LandingPage'
import TriagemDireta from './components/TriagemDireta'
import PlayButton from './components/PlayButton'
import IndicadorPage from './components/IndicadorPage'
import OBAEntradaPaciente from './components/OBAEntradaPaciente'
import { ehDominioBariatrico } from './lib/dominio'
export default function App() {
  // Modo inicial lido da URL JÁ no 1º render — evita o "flash" da landing (branca)
  // antes do useEffect trocar de tela (ex.: ?oba=1 -> tela escura do paciente).
  const [modo, setModo] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      // (bariatrico.net) REFRESH vindo do bariátrico: num refresh "limpo" (a URL já foi
      // higienizada no 1º load, então não há mais params de tela) que cairia na landing,
      // se a SESSÃO veio do bariatrico.net (rf_voltar_url setado pelo ?from=bari) devolve
      // ao site externo — em vez de cair na landing do RedFairy. É o mesmo destino do
      // botão "Voltar" (irVoltar/voltarExterno), agora também no F5. Cobre TODOS os
      // modais/popups (o bounce é no init do App, antes de qualquer tela renderizar).
      // NÃO dispara: (a) no 1º load (que ainda tem params de tela); (b) no PWA instalado
      // (standalone, start_url=?fada=1, sem rf_voltar_url); (c) em redfairy.bio digitado
      // direto numa aba nova (sem rf_voltar_url) → esse abre a landing própria.
      const temParamTela = params.get('oba') || params.get('modo') || params.get('from') ||
                           params.get('fada') || params.get('p') || params.get('ref') || params.get('bari') ||
                           params.get('reset')   // ?reset=1 NÃO pode dar bounce: precisa rodar o handler que limpa o localStorage
      let standalone = false
      try { standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true } catch (e) {}
      let voltarUrl = null
      try { voltarUrl = sessionStorage.getItem('rf_voltar_url') } catch (e) {}
      // (d) o BARIÁTRICO nunca deve cair na landing do redfairy: se for domínio bariátrico
      // (rf_dom_bari), o F5 em qualquer modal volta pro bariatrico.net — mesmo sem rf_voltar_url.
      let domBari = false
      try { domBari = localStorage.getItem('rf_dom_bari') === '1' } catch (e) {}
      const destinoBounce = voltarUrl || (domBari ? 'https://bariatrico.net' : null)
      if (!temParamTela && destinoBounce && !standalone) {
        // "Sempre deslogar na landing": ao voltar (F5) ao site externo, limpa a sessão.
        try {
          ['medico_crm','medico_nome','medico_token','medico_login_at','medico_is_admin','rf_crm_prefill','rf_open_login',
           'paciente_id','paciente_nome','paciente_login_at',  /* mantém paciente_cpf + paciente_token: reentrada passwordless do ÍCONE */
           'indicador_id','indicador_codigo','indicador_nome','indicador_token','indicador_pix',
           'rf_abrir_nova','rf_ref_encaminhador','oba_aberto'].forEach(k => localStorage.removeItem(k))
        } catch (e) {}
        window.location.replace(destinoBounce)
        return 'home'
      }
      if (params.get('oba') === '1') return 'oba-paciente'
    } catch (e) {}
    return 'home'
  })
  const [session, setSession] = useState(null)
  const [visible, setVisible] = useState(false)
  const [calcKey, setCalcKey] = useState(0)
  const [adminClicks, setAdminClicks] = useState(0)
  const [demoMedicoClicks, setDemoMedicoClicks] = useState(0)
  const [demoMedicoTimer, setDemoMedicoTimer] = useState(null)
  const [demoPacientePerfil, setDemoPacientePerfil] = useState(null)
  const [dadosPreCadastro, setDadosPreCadastro] = useState({ cpf: '', sexo: '', dataNascimento: '' })
  const [showInatividade, setShowInatividade] = useState(false)
  const [landingKey, setLandingKey] = useState(0)
  // (bariatrico.net) URL externa para o "Voltar" quando o usuário entrou pelo site.
  // Vive só na SESSÃO/aba (sessionStorage): se o paciente chegou via ?from=bari, o
  // "Voltar" devolve ao site externo durante aquela visita; se digitou redfairy.bio
  // direto (aba nova), não há valor → "Voltar" vai para a landing interna. (Antes era
  // localStorage e "grudava" para sempre, sequestrando o "Voltar" do RedFairy.)
  const [voltarExterno, setVoltarExterno] = useState(() => { try { return sessionStorage.getItem('rf_voltar_url') } catch (e) { return null } })
  // (bariatrico.net) "Sou Bariátrico" → abre direto o popup do Projeto OBA na landing.
  const [autoOBA, setAutoOBA] = useState(false)
  // Tela preta que cobre os "flashes" de tela durante o "Voltar".
  // (a) Tela preta tambem cobre a ENTRADA no card escuro de Acesso Medico: quando o
  // medico chega por ?modo=medico (ex.: "Sou Medico" do bariatrico.net), inicia ja
  // preta no 1o render para nao piscar a landing branca antes do card escuro montar.
  const [saindo, setSaindo] = useState(() => {
    // (b) Tela preta cobre o flash do ICONE grande na entrada do bariatrico (?oba=1) e do
    // card escuro do medico/indicador, antes de o conteudo montar.
    try { const p = new URLSearchParams(window.location.search); const m = p.get('modo'); return m === 'medico' || m === 'indicador' || p.get('oba') === '1' } catch (e) { return false }
  })
  // (medico) toast "link de encaminhamento copiado" ao abrir pelo icone instalado (PWA).
  const [linkMedToast, setLinkMedToast] = useState(false)

  useEffect(() => {
    // Migração: apaga a marca ANTIGA de "Voltar" externo que ficou gravada no
    // localStorage (eterna) em navegadores que já passaram pelo bariatrico.net.
    // Agora o "Voltar" externo vive só no sessionStorage; sem isto, o localStorage
    // legado continuaria sequestrando o botão até o usuário rodar ?bari=0.
    try { localStorage.removeItem('rf_voltar_url') } catch (e) {}

    // Le parametro ?modo= da URL para deep link da landing page
    const params = new URLSearchParams(window.location.search)
    // (landing) Detecta ROTEAMENTO (deep link / PWA / token de sessão). SEM roteamento =
    // landing genuína → desloga TODOS os papéis ("sempre deslogar na landing"). Com
    // roteamento, busca a sessão do Supabase normalmente.
    let ehStandalone = false
    try { ehStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true } catch (e) {}
    const fadaLaunch = params.get('fada') === '1' || ehStandalone
    const roteou = !!(params.get('modo') || params.get('oba') === '1' || (params.get('p') && params.get('c')) || fadaLaunch)
    if (params.get('reset') !== '1' && !roteou) {
      limparTodasSessoes()
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    }
    // IMPORTANTE: o Supabase dispara onAuthStateChange ao voltar o foco da aba
    // (TOKEN_REFRESHED do MESMO usuário). Só atualizamos quando o usuário realmente muda
    // (login/logout); renovação de token mantém a mesma referência e não re-renderiza.
    supabase.auth.onAuthStateChange((_event, novaSession) => {
      setSession(prev => (prev?.user?.id === novaSession?.user?.id ? prev : novaSession))
    })
    setTimeout(() => setVisible(true), 100)
    // (teste) ?reset=1 zera a sessao de medico/paciente do NAVEGADOR (nao toca no banco).
    // Util no mobile, onde nao da' pra abrir o console p/ limpar o localStorage manualmente.
    // Ctrl-Shift-R NAO limpa o localStorage (so' o cache de arquivos), por isso este atalho.
    if (params.get('reset') === '1') {
      try {
        ['medico_crm','medico_nome','medico_token','medico_login_at','medico_is_admin','rf_crm_prefill','rf_open_login',
         'paciente_id','paciente_cpf','paciente_nome','paciente_token','paciente_login_at',
         'indicador_id','indicador_codigo','indicador_nome','indicador_token','indicador_pix',
         'rf_flag','rf_dom_bari','rf_voltar_url','rf_abrir_nova','rf_ref_encaminhador',
         'rf_reentry_cpf','rf_reentry_token','oba_aberto'].forEach(k => localStorage.removeItem(k))
        // Rascunhos do OBA (oba_progresso_<cpf>) — por CPF, só limpam ao CONCLUIR. No teste,
        // o ?reset deve zerar TODOS, senão um CPF reusado "retoma" no relatório.
        try { Object.keys(localStorage).filter(k => k.indexOf('oba_progresso_') === 0).forEach(k => localStorage.removeItem(k)) } catch (e) {}
        sessionStorage.removeItem('rf_voltar_url')
      } catch (e) {}
      window.location.replace(window.location.pathname)
      return
    }
    const modoParam = params.get('modo')
    if (modoParam === 'medico') {
      // (bariatrico.net) abre o CARD DE LOGIN do médico (não o formulário direto).
      try { localStorage.setItem('rf_open_login', '1') } catch (e) {}
      setCalcKey(k => k + 1)
      setModo('calculadora')
      // (a) some com a tela preta quando o card escuro ja deve estar montado.
      setTimeout(() => setSaindo(false), 450)
    } else if (modoParam === 'paciente') {
      setModo('paciente')
    } else if (modoParam === 'login') {
      // (bariatrico.net) card de login/senha do paciente.
      setModo('login')
    } else if (modoParam === 'indicador') {
      setModo('indicador')
      setTimeout(() => setSaindo(false), 450)
    }
    // (4DOC) ?ref=CRM/UF — paciente chegou pelo QR de encaminhamento do médico.
    // Guarda o CRM p/ pré-preencher o card do encaminhador no cadastro.
    const refParam = params.get('ref')
    if (refParam) {
      try { localStorage.setItem('rf_ref_encaminhador', decodeURIComponent(refParam).toUpperCase().trim()) } catch (e) {}
    }
    // Reentra (passwordless) com a credencial guardada. Retorna true se logou.
    async function reentrarPacienteToken(rCpf, rTok) {
      try {
        const { data } = await supabase.rpc('login_paciente_token', { p_cpf: rCpf, p_token: rTok })
        if (data && data.ok && data.id) {
          try {
            const cpfL = String(rCpf).replace(/\D/g, '')
            localStorage.setItem('paciente_id', data.id)
            localStorage.setItem('paciente_cpf', cpfL)
            localStorage.setItem('paciente_nome', data.nome || '')
            localStorage.setItem('paciente_login_at', Date.now().toString())
            if (data.token) {
              localStorage.setItem('paciente_token', data.token)
              localStorage.setItem('rf_reentry_token', data.token)
              localStorage.setItem('rf_reentry_cpf', cpfL)
            }
          } catch (e) {}
          return true
        }
      } catch (e) {}
      return false
    }

    // (PWA fase 4b) Atalho da fada no iPhone: o link carrega o token de sessão
    // (?p=TOKEN&c=CPF) porque o app standalone tem storage separado do Safari.
    // Loga por token (sem senha) e abre o "novo hemograma".
    const pToken = params.get('p')
    const pCpf = params.get('c')
    if (pToken && pCpf) {
      try { localStorage.setItem('rf_abrir_nova', '1') } catch (e) {}
      ;(async () => {
        try {
          const { data } = await supabase.rpc('login_paciente_token', { p_cpf: pCpf, p_token: pToken })
          if (data && data.ok && data.id) {
            try {
              localStorage.setItem('paciente_id', data.id)
              localStorage.setItem('paciente_cpf', String(pCpf).replace(/\D/g, ''))
              localStorage.setItem('paciente_nome', data.nome || '')
              localStorage.setItem('paciente_token', pToken)
              localStorage.setItem('paciente_login_at', Date.now().toString())
            } catch (e) {}
            setModo('paciente')
          }
        } catch (e) {}
      })()
    }

    // (PWA fase 4) Atalho da fada: lançamento como APP instalado (?fada=1 do
    // start_url, ou display-mode standalone). Se já há sessão de paciente, vai
    // direto pro "novo hemograma" (passwordless). A flag rf_abrir_nova é consumida
    // pelo PatientDashboard. Se não há sessão (1ª vez no iPhone), cai na landing
    // p/ logar 1×, e a flag faz abrir o "novo hemograma" logo após.
    if (fadaLaunch && !(pToken && pCpf) && params.get('oba') !== '1') {
      try { localStorage.setItem('rf_abrir_nova', '1') } catch (e) {}
      let temPaciente = false
      try { temPaciente = !!localStorage.getItem('paciente_id') } catch (e) {}
      if (temPaciente) setModo('paciente')
      else {
        // Reentrada passwordless pelo ÍCONE: sem sessão ativa (deslogou na landing), mas com
        // o token guardado → reloga e entra no fluxo do paciente, em vez de cair na landing.
        let rCpf = '', rTok = ''
        try {
          rCpf = localStorage.getItem('rf_reentry_cpf') || localStorage.getItem('paciente_cpf') || ''
          rTok = localStorage.getItem('rf_reentry_token') || localStorage.getItem('paciente_token') || ''
        } catch (e) {}
        if (rCpf && rTok) { ;(async () => { if (await reentrarPacienteToken(rCpf, rTok)) setModo('paciente') })() }
      }
    }
    // (bariatrico.net) MODO BARIÁTRICO: o domínio bariátrico liga o flag p/ o paciente
    // já entrar bariátrico (→ OBA). Em dev, ?bari=1/0 liga/desliga (persiste).
    const bariParam = params.get('bari')
    if (bariParam === '1') { try { localStorage.setItem('rf_dom_bari', '1') } catch (e) {} }
    if (bariParam === '0') { try { localStorage.removeItem('rf_dom_bari'); localStorage.removeItem('rf_voltar_url'); sessionStorage.removeItem('rf_voltar_url') } catch (e) {}; setVoltarExterno('') }
    if (ehDominioBariatrico()) { try { localStorage.setItem('rf_flag', 'bariatrica') } catch (e) {} }

    // (bariatrico.net) Veio do site externo? O "Voltar" destas telas (e o F5 — ver o
    // bounce no inicializador do `modo`) retorna ao site, em vez de cair na landing
    // interna. Tanto `?from=bari` quanto `?oba=1` marcam a sessão como "veio do
    // bariátrico" (o ?oba=1 é entrada exclusiva do bariátrico, "Sou Bariátrico").
    if (params.get('from') === 'bari' || params.get('oba') === '1') {
      try { sessionStorage.setItem('rf_voltar_url', 'https://bariatrico.net') } catch (e) {}
      setVoltarExterno('https://bariatrico.net')
    }
    // (bariatrico.net) "Sou Bariátrico" → tela própria do paciente (NÃO a landing do redfairy).
    // ATALHO DO JÁ-CONHECIDO: se há sessão ativa OU credencial de reentrada (paciente que já
    // se cadastrou / tem o ícone), pula o cadastro SOU BARIÁTRICO e vai DIRETO à bifurcação
    // (ENTRAR/INDICAR/VER). Só o paciente NOVO vê a tela de cadastro (OBAEntradaPaciente).
    if (params.get('oba') === '1') {
      let temSessao = false, rCpf = '', rTok = ''
      try {
        temSessao = !!localStorage.getItem('paciente_id')
        rCpf = localStorage.getItem('rf_reentry_cpf') || ''
        rTok = localStorage.getItem('rf_reentry_token') || ''
      } catch (e) {}
      if (temSessao) {
        try { localStorage.setItem('rf_abrir_nova', '1') } catch (e) {}
        setModo('paciente'); setTimeout(() => setSaindo(false), 250)
      } else if (rCpf && rTok) {
        try { localStorage.setItem('rf_abrir_nova', '1') } catch (e) {}
        ;(async () => {
          const ok = await reentrarPacienteToken(rCpf, rTok)
          if (ok) { setModo('paciente'); setTimeout(() => setSaindo(false), 250) }
          else { setModo('oba-paciente'); setTimeout(() => setSaindo(false), 450) }
        })()
      } else {
        setModo('oba-paciente'); setTimeout(() => setSaindo(false), 450)
      }
    }

    // (bariatrico.net) ?contato=1 — abre o modal CONTATO na landing do redfairy. Guarda a
    // marca p/ a LandingPage consumir (a URL é higienizada logo abaixo).
    if (params.get('contato') === '1') { try { localStorage.setItem('rf_abrir_contato', '1') } catch (e) {} }

    // Limpa os parametros da URL sem reload (inclui o token, p/ não ficar visível)
    if (modoParam || refParam || params.get('fada') || pToken || bariParam || params.get('from') || params.get('oba')) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // Limpa SO as credenciais do medico (localStorage). Nao navega.
  // Inclui rf_crm_prefill: senao o CRM vaza pro fluxo do paciente apos a troca.
  function limparAuthMedico() {
    try {
      localStorage.removeItem('medico_crm')
      localStorage.removeItem('medico_nome')
      localStorage.removeItem('medico_login_at')
      localStorage.removeItem('medico_is_admin')
      localStorage.removeItem('medico_token')
      localStorage.removeItem('rf_crm_prefill')
    } catch (e) {}
  }

  // Limpa SO a sessao do paciente (login local via RPC + fallback Supabase). Nao navega.
  // Apaga TODAS as chaves paciente_* (mesma lista do handleSairDespedida) — senao
  // sobra estado residual que confunde o fluxo (despedida indevida, dados trocados).
  function limparAuthPaciente() {
    try {
      localStorage.removeItem('paciente_id')
      localStorage.removeItem('paciente_token')
      localStorage.removeItem('paciente_cpf')
      localStorage.removeItem('paciente_nome')
      localStorage.removeItem('paciente_login_at')
    } catch (e) {}
    try { supabase.auth.signOut() } catch (e) {}
    setSession(null)
  }

  // Desloga TODOS os papéis (paciente/médico/indicador). Usado ao chegar à LANDING:
  // "sempre deslogar na landing" — a landing não mostra quem está logado, então cada
  // visita começa limpa (evita sessão fantasma e o roteamento bizarro). Mantém os
  // marcadores de domínio/bounce (rf_voltar_url, rf_dom_bari, rf_flag).
  function limparTodasSessoes() {
    try {
      ['medico_crm','medico_nome','medico_token','medico_login_at','medico_is_admin','rf_crm_prefill','rf_open_login',
       'paciente_id','paciente_cpf','paciente_nome','paciente_token','paciente_login_at',
       'indicador_id','indicador_codigo','indicador_nome','indicador_token','indicador_pix',
       'rf_abrir_nova','rf_ref_encaminhador','oba_aberto'].forEach(k => localStorage.removeItem(k))
    } catch (e) {}
    try { supabase.auth.signOut() } catch (e) {}
    setSession(null)
  }

  // logoff automatico por inatividade
  function fazerLogoffMedico() {
    limparAuthMedico()
    setShowInatividade(false)
    setLandingKey(k => k + 1)
    setModo('home')
  }

  // EXCLUSAO MUTUA medico x paciente: ninguem pode estar logado nos dois papeis.
  // Ao ENTRAR num fluxo de um papel, derruba imediatamente a sessao do outro.
  // (paciente logado -> Modo Medico desloga o paciente, e vice-versa).
  useEffect(() => {
    const fluxoMedico = modo === 'calculadora' || modo === 'admin'
    const fluxoPaciente = modo === 'paciente' || modo === 'triagem-direta' || modo === 'login' || modo === 'oba-paciente'
    if (fluxoMedico) {
      let pacLogado = false
      try { pacLogado = !!localStorage.getItem('paciente_id') } catch (e) {}
      if (pacLogado || session) limparAuthPaciente()
    } else if (fluxoPaciente) {
      // Limpa o resíduo médico ao entrar no fluxo paciente — inclui rf_crm_prefill
      // (o "continuar como médico" o seta SEM medico_crm; senão o CRM vazava no
      // resultado da triagem do paciente).
      let residuoMedico = false
      try { residuoMedico = !!(localStorage.getItem('medico_crm') || localStorage.getItem('rf_crm_prefill')) } catch (e) {}
      if (residuoMedico) limparAuthMedico()
    }
  }, [modo])

  useEffect(() => {
    const naLanding = modo === 'home'
    const LIMITE = naLanding ? 2 * 60 * 1000 : 5 * 60 * 1000
    let tIdle = null
    let tGraca = null
    const limpar = () => { if (tIdle) clearTimeout(tIdle); if (tGraca) clearTimeout(tGraca) }
    const disparar = () => {
      if (naLanding) {
        let logado = false
        try { logado = !!localStorage.getItem('medico_crm') } catch (e) {}
        if (logado) fazerLogoffMedico()
      } else {
        setShowInatividade(true)
        tGraca = setTimeout(() => { fazerLogoffMedico() }, 30 * 1000)
      }
    }
    const resetar = () => {
      if (showInatividade) return
      limpar()
      tIdle = setTimeout(disparar, LIMITE)
    }
    const eventos = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    eventos.forEach(ev => window.addEventListener(ev, resetar, { passive: true }))
    resetar()
    return () => {
      limpar()
      eventos.forEach(ev => window.removeEventListener(ev, resetar))
    }
  }, [modo, showInatividade])

  // (medico) Ao abrir pelo ICONE instalado (PWA) com sessao de medico, copia o link de
  // encaminhamento (?ref=CRM) para o clipboard. O navegador exige um gesto -> tenta direto
  // e, se barrado, copia no PRIMEIRO toque na tela. 1x por abertura (sessionStorage).
  useEffect(() => {
    let standalone = false
    try { standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true } catch (e) {}
    let crm = ''
    try { crm = localStorage.getItem('medico_crm') || '' } catch (e) {}
    if (!standalone || !crm) return
    try { if (sessionStorage.getItem('rf_med_link_copiado')) return } catch (e) {}
    const link = `${window.location.origin}/?ref=${encodeURIComponent(crm)}`
    let listener = null
    const marcar = () => {
      try { sessionStorage.setItem('rf_med_link_copiado', '1') } catch (e) {}
      setLinkMedToast(true)
      setTimeout(() => setLinkMedToast(false), 3500)
    }
    const copiarNoToque = () => { navigator.clipboard.writeText(link).then(marcar).catch(() => {}) }
    // Tenta direto (alguns contextos permitem); se falhar, copia no 1o toque.
    navigator.clipboard.writeText(link).then(marcar).catch(() => {
      listener = copiarNoToque
      window.addEventListener('pointerdown', listener, { once: true })
    })
    return () => { if (listener) window.removeEventListener('pointerdown', listener) }
  }, [])

  // "Voltar" das telas de entrada: se o usuário veio do bariatrico.net, retorna ao
  // site externo; senão, vai para a landing interna.
  function irVoltar() {
    setSaindo(true)   // tela preta cobre os flashes (OBA/calculator) durante a saída
    limparTodasSessoes()   // "sempre deslogar na landing": VOLTAR sempre desloga
    if (voltarExterno) { setTimeout(() => { window.location.href = voltarExterno }, 40); return }
    // (bariátrico) sem URL externa (ex.: saída pelo ÍCONE) → bariatrico.net, NUNCA a landing
    // do RedFairy. A tela preta (saindo) cobre o flash até a navegação.
    let domBari = false; try { domBari = localStorage.getItem('rf_dom_bari') === '1' } catch (e) {}
    if (domBari) { setTimeout(() => { window.location.href = 'https://bariatrico.net' }, 40); return }
    setModo('home')
    setTimeout(() => setSaindo(false), 80)
  }

  function handleLogoClick() {
    const next = adminClicks + 1
    setAdminClicks(next)
    if (next >= 5) {
      setAdminClicks(0)
      setModo('admin')
    }
  }

  function handleDemoMedico() {
    setSaindo(true)   // (a) tela preta cobre o flash branco da entrada no card escuro
    const next = demoMedicoClicks + 1
    setDemoMedicoClicks(next)
    if (demoMedicoTimer) clearTimeout(demoMedicoTimer)
    if (next >= 5) {
      setDemoMedicoClicks(0)
      localStorage.setItem('medico_crm', 'DEMO/BA')
      localStorage.setItem('medico_nome', 'Dr. Demo RedFairy')
      setCalcKey(k => k + 1)
      setModo('calculadora')
      setTimeout(() => setSaindo(false), 450)
      return
    }
    const t = setTimeout(() => setDemoMedicoClicks(0), 2000)
    setDemoMedicoTimer(t)
    setCalcKey(k => k + 1)
    setModo('calculadora')
    setTimeout(() => setSaindo(false), 450)
  }


  function renderConteudo() {
  if (modo === 'calculadora') {
    return (
      <div>
        <Calculator key={calcKey} onVoltar={irVoltar} modoDemo={false} />
      </div>
    )
  }

  if (modo === 'triagem-direta') {
    return (
      <TriagemDireta
        onVoltar={irVoltar}
        onIrDashboard={() => setModo('paciente')}
        onCadastrar={(dados) => {
          setDadosPreCadastro(dados)
          setModo('paciente')
        }}
      />
    )
  }

  if (modo === 'login') {
    if (session) { setModo('paciente'); return null }
    return <AuthPage
      onLogin={() => setModo('paciente')}
      onVoltar={irVoltar}
      onDemoEntrar={(perfil) => { setDemoPacientePerfil(perfil); setModo('paciente') }}
      etapaInicial="cpf"
    />
  }

  if (modo === 'paciente') {
    if (demoPacientePerfil) return <PatientDashboard session={null} demoPerfil={demoPacientePerfil} onVoltar={() => { setModo('home'); setDemoPacientePerfil(null) }} />
    // Login local via RPC (novo padrao): localStorage.paciente_id
    let pacienteLocalId = null
    try { pacienteLocalId = localStorage.getItem('paciente_id') } catch (e) {}
    if (pacienteLocalId) {
      // Constroi um pseudo-session pro PatientDashboard. Se ele precisar de session.user.id,
      // entrega o paciente_id do localStorage.
      const pseudoSession = { user: { id: pacienteLocalId } }
      return <PatientDashboard session={pseudoSession} onVoltar={irVoltar} abrirOBA={!!localStorage.getItem('rf_flag')} />
    }
    // Sem paciente_id E sem dadosPreCadastro: estado dessincronizado, volta pra home.
    if (!dadosPreCadastro.cpf && !dadosPreCadastro.semCpf) {
      setTimeout(() => setModo('home'), 0);
      return null;
    }
    // Fallback antigo: Supabase Auth (so chega aqui com dadosPreCadastro preenchido)
    if (!session) return <AuthPage
      onLogin={() => {}}
      onVoltar={() => { setModo('home'); setDadosPreCadastro({ cpf: '', sexo: '', dataNascimento: '' }) }}
      onDemoEntrar={(perfil) => setDemoPacientePerfil(perfil)}
      cpfInicial={dadosPreCadastro.cpf}
      sexoInicial={dadosPreCadastro.sexo}
      dataNascimentoInicial={dadosPreCadastro.dataNascimento}
      etapaInicial={dadosPreCadastro.etapa || (dadosPreCadastro.cpf ? 'cadastro' : 'cpf')}
    />
    return <PatientDashboard session={session} onVoltar={irVoltar} abrirOBA={!!localStorage.getItem('rf_flag')} />
  }

  if (modo === 'oba-paciente') {
    // (b) cobre a transição (login → triagem) com a tela preta, evitando o flash do ícone
    // grande do OBAEntradaPaciente antes do primeiro modal (TriagemModal) aparecer.
    return <OBAEntradaPaciente onVoltar={irVoltar} onConcluir={() => { setSaindo(true); setModo('triagem-direta'); setTimeout(() => setSaindo(false), 550) }} />
  }

  if (modo === 'indicador') {
    return <IndicadorPage onVoltar={irVoltar} />
  }

  if (modo === 'admin') {
    const ehAdmin = (() => { try { return localStorage.getItem('medico_is_admin') === '1' } catch (e) { return false } })()
    if (!ehAdmin) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full text-center space-y-3">
            <p style={{ fontSize: '2rem' }}>{"🔒"}</p>
            <p className="font-bold text-gray-800">Acesso restrito</p>
            <p className="text-sm text-gray-500">{"Esta área é exclusiva do administrador. Entre com a conta de administrador (médico) para acessar."}</p>
            <button onClick={() => setModo('home')}
              className="mt-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-xl text-sm transition-colors">
              {"← Voltar"}
            </button>
          </div>
        </div>
      )
    }
    return <AdminPage onVoltar={() => setModo('home')} />
  }
if (modo === 'home') {
  return (
    <LandingPage key={landingKey}
      autoOBA={autoOBA}
      onModoMedico={(flag) => { if (flag) localStorage.setItem('rf_flag', flag); handleDemoMedico(); }}
      onModoPaciente={() => setModo('triagem-direta')}
      onModoAdmin={() => setModo('admin')}
      onIrDashboardPaciente={() => setModo('paciente')}
      onIrLogin={(payload) => {
        // payload opcional do fluxo PACIENTE da landing: { cpf, etapa, semCpf }
        if (payload && typeof payload === 'object') {
          setDadosPreCadastro({
            cpf: payload.cpf || '',
            sexo: '',
            dataNascimento: '',
            etapa: payload.etapa || 'cpf',
            semCpf: !!payload.semCpf,
          })
          setModo('paciente')
        } else {
          setModo('login')
        }
      }}
    />
  )
}
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-gray-900">
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle, rgba(185,28,28,0.1) 1px, transparent 1px)',
        backgroundSize: '32px 32px'
      }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(185,28,28,0.15) 0%, transparent 70%)' }}
      />

      <div
        className="relative z-10 flex flex-col items-center w-full"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity 0.7s ease, transform 0.7s ease'
        }}
      >
        <div className="flex flex-col items-center mb-12">
          <div className="relative mb-4" onClick={handleLogoClick} style={{ cursor: 'default' }}>
            <div className="absolute inset-0 rounded-full blur-2xl"
              style={{ background: 'rgba(185,28,28,0.4)', transform: 'scale(1.4)' }}
            />
            <img src={logo} alt="RedFairy"
              className="relative w-28 h-28 object-contain drop-shadow-2xl"
              style={{ filter: 'drop-shadow(0 0 20px rgba(239,68,68,0.6))' }}
            />
          </div>
          <h1 className="text-5xl font-black tracking-tight mb-1"
            style={{ fontFamily: "'Georgia', serif", letterSpacing: '-0.02em' }}>
            <span style={{ color: '#b91c1c' }}>Red</span><span style={{ color: '#ef4444' }}>Fairy</span>
          </h1>
          <p className="text-red-300 text-sm tracking-widest uppercase font-medium">
            Cuidar do seu Eritron
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-xl items-stretch">

          <button
            onClick={() => { setCalcKey(k => k + 1); setModo('calculadora') }}
            className="group relative overflow-hidden rounded-2xl p-7 text-left transition-all duration-300 flex flex-col"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            <div className="mb-4">
              <img src={logo} alt="RedFairy" className="w-10 h-10 object-contain"
                style={{ filter: 'drop-shadow(0 0 6px rgba(239,68,68,0.5))' }} />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">{"Modo M\u00e9dico"}</h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              {"Avalia\u00e7\u00e3o r\u00e1pida sem cadastro. Insira os dados do paciente e obtenha o diagn\u00f3stico imediato."}
            </p>
            <div className="absolute bottom-4 right-4 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-lg">{"\u2192"}</div>
          </button>

          <button
            onClick={() => setModo('paciente')}
            className="group relative overflow-hidden rounded-2xl p-7 text-left transition-all duration-300 flex flex-col"
            style={{ background: 'linear-gradient(135deg, rgba(185,28,28,0.8) 0%, rgba(153,27,27,0.9) 100%)', border: '1px solid rgba(239,68,68,0.4)', backdropFilter: 'blur(12px)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(220,38,38,0.9) 0%, rgba(185,28,28,1) 100%)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(185,28,28,0.8) 0%, rgba(153,27,27,0.9) 100%)'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            <div className="mb-4">
              <img src={logo} alt="RedFairy" className="w-10 h-10 object-contain"
                style={{ filter: 'brightness(10)' }} />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Modo Paciente</h2>
            <p className="text-red-200 text-sm leading-relaxed">
              {"Cadastre-se e acompanhe a evolu\u00e7\u00e3o do seu eritron ao longo do tempo."}
            </p>
            <div className="absolute bottom-4 right-4 text-red-200 opacity-0 group-hover:opacity-100 transition-opacity text-lg">{"\u2192"}</div>
          </button>
        </div>

        <div className="mt-10 flex flex-col items-center gap-1 text-center">
          <p className="text-gray-500 text-xs tracking-wide">{"by cytomica.com | \u00a9 2026"}</p>
          <p className="text-gray-500 text-xs tracking-wide">E.F. Ramos, M.D. CRM 6302 BA | RQE 5830 * 5643 * 27847</p>
          <p className="text-gray-500 text-xs tracking-wide">drestacioramos.com.br</p>
        </div>

      </div>
    </div>
  )
}

  // modal de inatividade (cobre qualquer tela)
  const InatividadeModal = showInatividade ? (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '360px', width: '100%', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
        <div style={{ background: '#374151', padding: '16px 20px' }}>
          <h3 style={{ color: '#fff', fontWeight: 800, fontSize: '1rem', margin: 0 }}>{"Voc\u00ea ainda est\u00e1 a\u00ed?"}</h3>
        </div>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p style={{ color: '#374151', fontSize: '0.9rem', lineHeight: 1.5, margin: '0 0 6px' }}>
            {"Voc\u00ea est\u00e1 inativo h\u00e1 algum tempo. Deseja continuar?"}
          </p>
          <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: '0 0 16px' }}>
            {"Voc\u00ea ser\u00e1 desconectado em 30s."}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <PlayButton onClick={() => setShowInatividade(false)} label={"CONTINUAR"} labelColor="#374151" />
          </div>
        </div>
      </div>
    </div>
  ) : null

  return (
    <>
      {renderConteudo()}
      {InatividadeModal}
      {saindo && <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 99999 }} />}
      {linkMedToast && (
        <div style={{ position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', zIndex: 100000, maxWidth: '92%' }}>
          <div style={{ background: '#15803d', color: '#fff', padding: '10px 16px', borderRadius: 12, boxShadow: '0 6px 20px rgba(0,0,0,.25)', fontSize: 13, fontWeight: 700, textAlign: 'center' }}>
            {"✓ Seu link de encaminhamento foi copiado — cole no WhatsApp ou Telegram."}
          </div>
        </div>
      )}
    </>
  )
}
