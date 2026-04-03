import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Calculator from './components/Calculator'
import AuthPage from './components/AuthPage'
import PatientDashboard from './components/PatientDashboard'
import logo from './assets/logo.png'

export default function App() {
  const [modo, setModo] = useState('home')
  const [session, setSession] = useState(null)
  const [visible, setVisible] = useState(false)
  const [calcKey, setCalcKey] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    setTimeout(() => setVisible(true), 100)
  }, [])

  if (modo === 'calculadora') {
  return (
    <div>
      <Calculator key={Date.now()} onVoltar={() => setModo('home')} />
    </div>
  )
}

  if (modo === 'paciente') {
    if (!session) return <AuthPage onLogin={() => {}} onVoltar={() => setModo('home')} />
    return <PatientDashboard session={session} onVoltar={() => setModo('home')} />
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
          <div className="relative mb-4">
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
            Conhecer o seu Eritron
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
            <h2 className="text-lg font-bold text-white mb-2">Modo Médico</h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              Avaliação rápida sem cadastro. Insira os dados do paciente e obtenha o diagnóstico imediato.
            </p>
            <div className="absolute bottom-4 right-4 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-lg">→</div>
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
              Cadastre-se e acompanhe a evolução do seu eritron ao longo do tempo.
            </p>
            <div className="absolute bottom-4 right-4 text-red-200 opacity-0 group-hover:opacity-100 transition-opacity text-lg">→</div>
          </button>
        </div>

        <div className="mt-10 flex flex-col items-center gap-1">
          <p className="text-gray-500 text-xs tracking-wide">by cytomica.com</p>
          <p className="text-gray-500 text-xs">© 2026</p>
        </div>

      </div>
    </div>
  )
}