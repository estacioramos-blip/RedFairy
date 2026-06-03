import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Calculator from './components/Calculator'
import AuthPage from './components/AuthPage'
import PatientDashboard from './components/PatientDashboard'
import AdminPage from './components/AdminPage'
import logo from './assets/logo.png'
import LandingPage from './components/LandingPage'
import TriagemDireta from './components/TriagemDireta'
export default function App() {
  const [modo, setModo] = useState('home')
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    setTimeout(() => setVisible(true), 100)

    // Le parametro ?modo= da URL para deep link da landing page
    const params = new URLSearchParams(window.location.search)
    const modoParam = params.get('modo')
    if (modoParam === 'medico') {
      setCalcKey(k => k + 1)
      setModo('calculadora')
    } else if (modoParam === 'paciente') {
      setModo('paciente')
    }
    // Limpa o parametro da URL sem reload
    if (modoParam) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // logoff automatico por inatividade
  function fazerLogoffMedico() {
    try {
      localStorage.removeItem('medico_crm')
      localStorage.removeItem('medico_nome')
      localStorage.removeItem('medico_login_at')
      localStorage.removeItem('medico_is_admin')
      localStorage.removeItem('medico_token')
    } catch (e) {}
    setShowInatividade(false)
    setLandingKey(k => k + 1)
    setModo('home')
  }

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

  function handleLogoClick() {
    const next = adminClicks + 1
    setAdminClicks(next)
    if (next >= 5) {
      setAdminClicks(0)
      setModo('admin')
    }
  }

  function handleDemoMedico() {
    const next = demoMedicoClicks + 1
    setDemoMedicoClicks(next)
    if (demoMedicoTimer) clearTimeout(demoMedicoTimer)
    if (next >= 5) {
      setDemoMedicoClicks(0)
      localStorage.setItem('medico_crm', 'DEMO/BA')
      localStorage.setItem('medico_nome', 'Dr. Demo RedFairy')
      setCalcKey(k => k + 1)
      setModo('calculadora')
      return
    }
    const t = setTimeout(() => setDemoMedicoClicks(0), 2000)
    setDemoMedicoTimer(t)
    setCalcKey(k => k + 1)
    setModo('calculadora')
  }


  function renderConteudo() {
  if (modo === 'calculadora') {
    return (
      <div>
        <Calculator key={calcKey} onVoltar={() => setModo('home')} modoDemo={false} />
      </div>
    )
  }

  if (modo === 'triagem-direta') {
    return (
      <TriagemDireta
        onVoltar={() => setModo('home')}
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
      onVoltar={() => setModo('home')}
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
      return <PatientDashboard session={pseudoSession} onVoltar={() => setModo('home')} abrirOBA={!!localStorage.getItem('rf_flag')} />
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
    return <PatientDashboard session={session} onVoltar={() => setModo('home')} abrirOBA={!!localStorage.getItem('rf_flag')} />
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
        <div style={{ background: '#b91c1c', padding: '16px 20px' }}>
          <h3 style={{ color: '#fff', fontWeight: 800, fontSize: '1rem', margin: 0 }}>{"Voc\u00ea ainda est\u00e1 a\u00ed?"}</h3>
        </div>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p style={{ color: '#374151', fontSize: '0.9rem', lineHeight: 1.5, margin: '0 0 6px' }}>
            {"Voc\u00ea est\u00e1 inativo h\u00e1 algum tempo. Deseja continuar?"}
          </p>
          <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: '0 0 16px' }}>
            {"Voc\u00ea ser\u00e1 desconectado em 30s."}
          </p>
          <button
            onClick={() => setShowInatividade(false)}
            style={{ width: '100%', background: '#b91c1c', color: '#fff', fontWeight: 800, border: 'none', borderRadius: '10px', padding: '12px', fontSize: '0.9rem', cursor: 'pointer' }}>
            Continuar
          </button>
        </div>
      </div>
    </div>
  ) : null

  return (
    <>
      {renderConteudo()}
      {InatividadeModal}
    </>
  )
}
