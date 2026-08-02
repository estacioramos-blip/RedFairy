import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Calculator from './components/Calculator'
import PatientDashboard from './components/PatientDashboard'
import AdminPage from './components/AdminPage'
// Marca única nas telas do produto: Projeto OBA®. A fada (logo.png) segue em uso
// só na landing de redfairy.bio, que foi preservada por decisão do Estácio.
import obaLogo from './assets/oba-logo.png'
import LandingPage from './components/LandingPage'
import TriagemDireta from './components/TriagemDireta'
import PlayButton from './components/PlayButton'
import IndicadorPage from './components/IndicadorPage'
import OBAEntradaPaciente from './components/OBAEntradaPaciente'
import CaixaPage from './components/CaixaPage'
import AdminLogin from './components/AdminLogin'
import RestritoLogin from './components/RestritoLogin'
import { ehDominioBariatrico, aplicarBrandingOBA } from './lib/dominio'
import { setManifestFluxo } from './lib/manifestFluxo'
export default function App() {
  // Modo inicial lido da URL JÁ no 1º render — evita o "flash" da landing (branca)
  // antes do useEffect trocar de tela (ex.: ?oba=1 -> tela escura do paciente).
  const [modo, setModo] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      // (unificação) Link antigo do site bariatrico.net apontando pro redfairy.bio
      // (?from=bari ou ?modo=restrito — os 4 CTAs do site estático) → manda pro
      // app.bariatrico.net, preservando a URL inteira. Só dispara em PRODUÇÃO
      // (host redfairy.bio/www.redfairy.bio) — nunca em dev/preview, pra não
      // atrapalhar teste local com ?bari=1 (ver ehDominioBariatrico em lib/dominio.js).
      const hostAtual = (window.location.hostname || '').toLowerCase()
      const ehRedfairyBioProd = hostAtual === 'redfairy.bio' || hostAtual === 'www.redfairy.bio'
      if (ehRedfairyBioProd && (params.get('from') === 'bari' || params.get('modo') === 'restrito')) {
        window.location.replace('https://app.bariatrico.net' + window.location.pathname + window.location.search)
        return 'home'
      }
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
                           params.get('fada') || params.get('p') || params.get('ref') || params.get('ind') || params.get('bari') ||
                           params.get('contato') ||   // ?contato=1 abre o modal CONTATO — sem isto o bounce engolia o link
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
           'rf_abrir_nova','rf_ref_encaminhador','rf_ind_codigo','oba_aberto'].forEach(k => localStorage.removeItem(k))
        } catch (e) {}
        window.location.replace(destinoBounce)
        return 'home'
      }
      if (params.get('oba') === '1') return 'oba-paciente'
      // (app.bariatrico.net) Raiz sem NENHUM parâmetro de tela (?oba=1, ?modo=...,
      // etc.): quem chega direto nesse domínio (sem vir de um CTA do site) deve cair
      // no fluxo do paciente OBA, não na landing geral do RedFairy — que não faz
      // sentido pra esse domínio.
      if (!temParamTela && ehDominioBariatrico()) return 'oba-paciente'
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

  // Volta do bfcache (ex.: Android restaurando o app após o X da aba sobreposta ou o
  // botão Voltar): o estado React volta CONGELADO — se a cortina preta ('saindo')
  // estava ligada na hora da navegação, ficava preta pra sempre. Destrava aqui.
  useEffect(() => {
    const aoRestaurar = (e) => { if (e.persisted) setSaindo(false) }
    window.addEventListener('pageshow', aoRestaurar)
    return () => window.removeEventListener('pageshow', aoRestaurar)
  }, [])

  // Branding OBA (título/descrição/manifest/ícone) só no domínio bariátrico —
  // redfairy.bio (geral) fica com a identidade RedFairy padrão do index.html.
  useEffect(() => { aplicarBrandingOBA() }, [])

  // PWA por PAPEL: troca o icone/manifesto/titulo conforme o fluxo (p/m/i), pra o
  // icone instalado sair com a letra do papel e abrir o fluxo certo. Só faz sentido
  // no domínio bariátrico (os 3 manifests p/m/i são todos identidade "OBA") — no
  // redfairy.bio geral, fica no manifest RedFairy padrão (sem swap por papel).
  useEffect(() => {
    if (!ehDominioBariatrico()) return
    const l = modo === 'calculadora' ? 'm' : modo === 'indicador' ? 'i'
            : (modo === 'paciente' || modo === 'oba-paciente' || modo === 'triagem-direta') ? 'p' : null
    if (l) setManifestFluxo(l)
  }, [modo])

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
         'indicador_id','indicador_codigo','indicador_nome','indicador_token','indicador_pix','indicador_cpf',
         'rf_flag','rf_dom_bari','rf_voltar_url','rf_abrir_nova','rf_ref_encaminhador','rf_ind_codigo',
         'rf_medico_encaminhador','rf_abrir_contato','caixa_token',
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
      limparSessaoPaciente()
      // (bariatrico.net) abre o CARD DE LOGIN do médico (não o formulário direto) —
      // MAS só quando não há médico logado: com credencial guardada (saiu pelo SAIR /
      // ícone OBA m), reabre direto na bifurcação ("Retorna sem CRM/SENHA").
      try { if (!localStorage.getItem('medico_crm')) localStorage.setItem('rf_open_login', '1') } catch (e) {}
      setCalcKey(k => k + 1)
      setModo('calculadora')
      // (a) some com a tela preta quando o card escuro ja deve estar montado.
      setTimeout(() => setSaindo(false), 450)
    } else if (modoParam === 'paciente') {
      setModo('paciente')
    } else if (modoParam === 'login') {
      // (bariatrico.net) card de login/senha do paciente — abre a landing direto
      // no card CPF+senha (mesmo mecanismo do rf_paciente_cpf_prefill, sem CPF).
      try { localStorage.setItem('rf_paciente_abrir_login', '1') } catch (e) {}
      setModo('home')
    } else if (modoParam === 'indicador') {
      setModo('indicador')
      setTimeout(() => setSaindo(false), 450)
    } else if (modoParam === 'caixa') {
      // (CAIXA) tesouraria manual — rotina independente com senha própria.
      setModo('caixa')
    } else if (modoParam === 'restrito') {
      // (ACESSO RESTRITO) porta única do chapéu do rodapé: campo de senha (caixa) +
      // entrada discreta do admin. NÃO revela o "tesoureiro".
      setModo('restrito')
    } else if (modoParam === 'admin') {
      // (ADMIN) porta do chapéu no rodapé do bariatrico.net — o gate mostra o
      // card de login do ADMIN (AdminLogin) se não houver sessão de administrador.
      setModo('admin')
    }
    // (4DOC) ?ref=CRM/UF — QR do MÉDICO. ?ind=INDxxxxxx — link/QR do INDICADOR.
    // Cada valor é validado pelo FORMATO e vai pra sua própria chave (antes o ?ref servia
    // aos dois papéis e o código do indicador vazava pro campo medico_crm). Links ANTIGOS
    // de indicador (?ref=INDxxxxxx) continuam funcionando pelo mesmo teste de formato.
    // Formato desconhecido é DESCARTADO (não polui a atribuição de crédito).
    const refParam = params.get('ref')
    const indParam = params.get('ind')
    if (refParam || indParam) {
      try {
        const val = decodeURIComponent(indParam || refParam).toUpperCase().trim()
        if (/^IND[0-9A-F]{6}$/.test(val)) localStorage.setItem('rf_ind_codigo', val)          // indicador
        else if (/^\d+\s*\/\s*[A-Z]{2}$/.test(val)) localStorage.setItem('rf_ref_encaminhador', val)  // médico
      } catch (e) {}
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
    // ÍCONES POR PAPEL (?modo=medico/indicador no start_url): lançamento standalone com
    // ?modo= NÃO é o ícone da fada do paciente — sem o !modoParam, a reentrada passwordless
    // do paciente SEQUESTRAVA o ícone M/I (abria o dashboard do paciente com AVALIAR).
    if (fadaLaunch && !(pToken && pCpf) && params.get('oba') !== '1' && !modoParam) {
      try { localStorage.setItem('rf_abrir_nova', '1') } catch (e) {}
      // Ícone bariátrico que NÃO consegue re-entrar nunca pode cair na landing redfairy:
      // o fallback é a entrada bariátrica ('oba-paciente'), não 'home'.
      let domBariIcon = false
      try { domBariIcon = localStorage.getItem('rf_dom_bari') === '1' || localStorage.getItem('rf_flag') === 'bariatrica' } catch (e) {}
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
        if (rCpf && rTok) {
          ;(async () => { if (await reentrarPacienteToken(rCpf, rTok)) setModo('paciente'); else if (domBariIcon) setModo('oba-paciente') })()
        } else if (domBariIcon) {
          setModo('oba-paciente')
        }
      }
    }
    // (bariatrico.net) MODO BARIÁTRICO: o domínio bariátrico liga o flag p/ o paciente
    // já entrar bariátrico (→ OBA). Em dev, ?bari=1/0 liga/desliga (persiste).
    const bariParam = params.get('bari')
    if (bariParam === '1') { try { localStorage.setItem('rf_dom_bari', '1') } catch (e) {} }
    if (bariParam === '0') { try { localStorage.removeItem('rf_dom_bari'); localStorage.removeItem('rf_flag'); localStorage.removeItem('rf_voltar_url'); sessionStorage.removeItem('rf_voltar_url') } catch (e) {}; setVoltarExterno('') }
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
    if (modoParam || refParam || indParam || params.get('fada') || pToken || bariParam || params.get('from') || params.get('oba')) {
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
      // Rascunhos do OBA do MÉDICO (oba_progresso_med_<cpf>): em computador compartilhado
      // (clínica), o Dr. B não pode herdar o rascunho do Dr. A no mesmo CPF. Os rascunhos
      // do PACIENTE (sem o med_) sobrevivem ao logout — retomada é feature.
      Object.keys(localStorage).filter(k => k.indexOf('oba_progresso_med_') === 0).forEach(k => localStorage.removeItem(k))
    } catch (e) {}
  }

  // Apaga a IDENTIDADE do paciente neste navegador. Inclui rf_reentry_cpf/token, a
  // credencial de reentrada passwordless (proposital pro paciente comum reabrir pelo
  // ícone sem senha) — que sobrevivia a todos os logouts e por isso conseguia "puxar
  // de volta" pra sessão do paciente quem tinha entrado como médico/admin no mesmo
  // aparelho. Fonte única da lista de chaves: limparAuthPaciente usa esta função.
  // Só identidade de PACIENTE — nunca médico/indicador/admin.
  function limparSessaoPaciente() {
    try {
      ['paciente_id', 'paciente_cpf', 'paciente_nome', 'paciente_token', 'paciente_login_at',
       'rf_reentry_cpf', 'rf_reentry_token'].forEach(k => localStorage.removeItem(k))
    } catch (e) {}
  }

  // Limpa SO a sessao do paciente (login local via RPC + fallback Supabase). Nao navega.
  // Apaga TODAS as chaves paciente_* (mesma lista do handleSairDespedida) — senao
  // sobra estado residual que confunde o fluxo (despedida indevida, dados trocados).
  function limparAuthPaciente() {
    limparSessaoPaciente()
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
       'indicador_id','indicador_codigo','indicador_nome','indicador_token','indicador_pix','indicador_cpf',
       'caixa_token',
       'rf_abrir_nova','rf_ref_encaminhador','rf_ind_codigo','oba_aberto'].forEach(k => localStorage.removeItem(k))
      // Rascunhos do OBA do MÉDICO: não sobrevivem ao "deslogar na landing" (PC compartilhado).
      Object.keys(localStorage).filter(k => k.indexOf('oba_progresso_med_') === 0).forEach(k => localStorage.removeItem(k))
    } catch (e) {}
    try { supabase.auth.signOut() } catch (e) {}
    setSession(null)
  }

  // logoff automatico por INATIVIDADE: limpa TODOS os papeis (medico/paciente/caixa/
  // indicador), nao so o medico. Em dispositivo compartilhado (clinica) o proximo
  // usuario nao pode herdar a sessao de quem ficou ocioso.
  function fazerLogoffInatividade() {
    limparTodasSessoes()
    setShowInatividade(false)
    setLandingKey(k => k + 1)
    setModo('home')
  }

  // EXCLUSAO MUTUA medico x paciente: ninguem pode estar logado nos dois papeis.
  // Ao ENTRAR num fluxo de um papel, derruba imediatamente a sessao do outro.
  // (paciente logado -> Modo Medico desloga o paciente, e vice-versa).
  useEffect(() => {
    const fluxoMedico = modo === 'calculadora' || modo === 'admin'
    const fluxoPaciente = modo === 'paciente' || modo === 'triagem-direta' || modo === 'oba-paciente'
    if (fluxoMedico) {
      let pacLogado = false
      // A credencial de REENTRADA conta como resíduo de paciente: ela sozinha (sem
      // paciente_id nem sessão) já bastava pra reentrada passwordless relogar o
      // paciente por cima de quem entrou como médico/admin. Sem este `||`, o caso
      // exato do bug não disparava a limpeza.
      try {
        pacLogado = !!(localStorage.getItem('paciente_id') ||
          (localStorage.getItem('rf_reentry_cpf') && localStorage.getItem('rf_reentry_token')))
      } catch (e) {}
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
        if (logado) fazerLogoffInatividade()
      } else {
        setShowInatividade(true)
        tGraca = setTimeout(() => { fazerLogoffInatividade() }, 30 * 1000)
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

  // Ferramentas de OPERADOR (Admin/Caixa) fazem parte do lancamento BARIATRICO: o
  // Voltar desloga TODOS os papeis e volta pro bariatrico.net (nunca a landing do
  // RedFairy) — importante tambem por seguranca (o caixa_token nao pode sobreviver
  // numa transicao SPA). Honra a URL externa de origem (rf_voltar_url) se houver.
  function irVoltarOperador() {
    setSaindo(true)
    limparTodasSessoes()
    const dest = voltarExterno || 'https://bariatrico.net'
    setTimeout(() => { window.location.href = dest }, 40)
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
    limparSessaoPaciente()
    setSaindo(true)   // (a) tela preta cobre o flash branco da entrada no card escuro
    const next = demoMedicoClicks + 1
    setDemoMedicoClicks(next)
    if (demoMedicoTimer) clearTimeout(demoMedicoTimer)
    if (next >= 5) {
      setDemoMedicoClicks(0)
      localStorage.setItem('medico_crm', 'DEMO/BA')
      localStorage.setItem('medico_nome', 'Dr. Demo OBA')
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
          // Manda pro cadastro CPF+senha moderno (LandingPage, fluxoEtapa='paciente'),
          // com o CPF da triagem pré-preenchido — não mais pro AuthPage antigo (email+senha,
          // aposentado: nunca recebia o token de sessão que o resto do app exige).
          try { localStorage.setItem('rf_paciente_cpf_prefill', dados?.cpf || '') } catch (e) {}
          setModo('home')
        }}
      />
    )
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
    // Sem paciente_id: estado dessincronizado (ex.: refresh antes de logar), volta pra home.
    setTimeout(() => setModo('home'), 0);
    return null;
  }

  if (modo === 'oba-paciente') {
    // (b) cobre a transição (login → triagem) com a tela preta, evitando o flash do ícone
    // grande do OBAEntradaPaciente antes do primeiro modal (TriagemModal) aparecer.
    return <OBAEntradaPaciente onVoltar={irVoltar} onConcluir={() => {
      // LOGIN de bariátrico cadastrado (rf_abrir_nova) → bifurcação; NOVO → triagem.
      let nova = false
      try { nova = localStorage.getItem('rf_abrir_nova') === '1' } catch (e) {}
      setSaindo(true); setModo(nova ? 'paciente' : 'triagem-direta'); setTimeout(() => setSaindo(false), 550)
    }} />
  }

  if (modo === 'indicador') {
    return <IndicadorPage onVoltar={irVoltar} />
  }

  if (modo === 'caixa') {
    return <CaixaPage onVoltar={irVoltarOperador} />
  }

  if (modo === 'restrito') {
    return <RestritoLogin
      onCaixa={() => setModo('caixa')}
      onAdmin={() => setModo('admin')}
      onVoltar={() => setModo('home')} />
  }

  if (modo === 'admin') {
    const ehAdmin = (() => { try { return localStorage.getItem('medico_is_admin') === '1' } catch (e) { return false } })()
    if (!ehAdmin) {
      // Sem sessão de admin: card de LOGIN do ADMIN (CRM/UF + senha, só entra is_admin).
      // Porta: ícone discreto no rodapé do hero da landing. onOk força re-render
      // (landingKey) — o gate relê o localStorage e libera o painel.
      return <AdminLogin onOk={() => setLandingKey(k => k + 1)} onVoltar={() => setModo('home')} />
    }
    return <AdminPage onVoltar={irVoltarOperador} />
  }
if (modo === 'home') {
  return (
    <LandingPage key={landingKey}
      autoOBA={autoOBA}
      onModoMedico={(flag) => { if (flag) localStorage.setItem('rf_flag', flag); handleDemoMedico(); }}
      onModoPaciente={() => setModo('triagem-direta')}
      onModoAdmin={() => setModo('admin')}
      onIrDashboardPaciente={() => setModo('paciente')}
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
            <img src={obaLogo} alt="Projeto OBA"
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
              <img src={obaLogo} alt="Projeto OBA" className="w-10 h-10 object-contain"
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
              <img src={obaLogo} alt="Projeto OBA" className="w-10 h-10 object-contain"
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
        <div style={{ background: '#6B7280', padding: '16px 20px' }}>
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
