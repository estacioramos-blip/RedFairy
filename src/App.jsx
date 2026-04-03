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
  const [showSobre, setShowSobre] = useState(false)
  const [showSaibaMais, setShowSaibaMais] = useState(false)
  const heroImg = '/redfairy-hero.png'

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    setTimeout(() => setVisible(true), 100)
  }, [])

  if (modo === 'calculadora') {
    return (
      <div>
        <button
          onClick={() => setModo('home')}
          className="fixed top-4 left-4 z-50 bg-gray-100 text-red-800 border border-gray-200 px-3 py-1 rounded-lg text-sm shadow"
        >
          Voltar
        </button>
        <Calculator key={Date.now()} />
      </div>
    )
  }

  if (modo === 'paciente') {
    if (!session) return <AuthPage onLogin={() => {}} onVoltar={() => setModo('home')} />
    return <PatientDashboard session={session} onVoltar={() => setModo('home')} />
  }

  const btnStyle = "bg-gray-100 text-red-800 border border-gray-200 px-3 py-1 rounded-lg text-xs font-medium shadow"

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-gray-900">

      {/* BOTÕES FIXOS */}
      <button onClick={() => setModo('home')} className={`fixed top-4 left-4 z-50 ${btnStyle}`}>
        Voltar
      </button>
      <button onClick={() => setShowSobre(true)} className={`fixed top-4 right-4 z-50 ${btnStyle}`}>
        Sobre
      </button>

      {/* MODAL SOBRE */}
      {showSobre && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => { setShowSobre(false); setShowSaibaMais(false) }}>
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl"
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ position: 'relative', width: '100%', height: '320px', overflow: 'hidden', borderRadius: '16px 16px 0 0' }}>
              <img src={heroImg} alt="RedFairy"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', padding: '20px' }}>
                <p style={{ color: 'white', fontSize: '14px', lineHeight: '1.8', fontStyle: 'italic', margin: 0, textAlign: 'center' }}>
                  Eu sou a sua fada vermelha, a sua{' '}
                  <span style={{ fontWeight: 'bold', color: '#fca5a5' }}>HEMOGLOBINA</span>.
                  <br />
                  Eu uso a poeira das estrelas para te entregar o ar.
                  <br />
                  <span style={{ fontWeight: '600' }}>Quanto tempo você vive sem ar?</span>
                </p>
              </div>
            </div>
            <div style={{ padding: '20px' }}>
              {!showSaibaMais && (
                <button onClick={() => setShowSaibaMais(true)}
                  className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl text-sm transition-colors mb-4">
                  Saiba Mais
                </button>
              )}
              {showSaibaMais && (
                <div style={{ marginBottom: '16px' }}>
                  <h3 className="text-red-700 font-bold text-base text-center mb-4">Vida e ventilação e perfusão</h3>
                  <p className="text-gray-700 text-sm leading-relaxed mb-3">
                    O Ferro em você veio das estrelas, e dele o vermelho do seu sangue - a sua potência.
                    Com Ferro, a Natureza faz a <strong>Hemoglobina</strong>, a proteína vermelha e mais importante da sua vida.
                  </p>
                  <p className="text-gray-700 text-sm leading-relaxed mb-3">
                    Ela sustenta a ventilação e realiza a perfusão: capta o oxigênio do ar que ventila os pulmões
                    e o entrega a todas as suas células - vinte vezes por minuto. As células precisam do oxigênio
                    para queimar o alimento e obter a energia vital, sem a qual você só vive alguns minutos.
                  </p>
                  <p className="text-gray-700 text-sm leading-relaxed mb-3">
                    Ao mesmo tempo, a Hemoglobina captura o CO2 produzido pela queima do alimento,
                    e o leva para que você o expire no ar do mundo.
                  </p>
                  <p className="text-gray-700 text-sm leading-relaxed mb-3">
                    No ambiente, uma proteína verde - a <strong>clorofila</strong>, mãe da Hemoglobina -
                    usa a luz do sol para partir o CO2 e fazer açúcar a partir de luz, carbono e água,
                    devolvendo o oxigênio ao ar do planeta, em um ciclo virtuoso perfeito.
                  </p>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-red-800 text-sm leading-relaxed font-medium">
                      Portanto, é importante saber sobre sua Hemoglobina, o seu Ferro e a sua produção
                      de células vermelhas - conhecer o seu Eritron.
                    </p>
                    <p className="text-red-700 text-sm font-bold mt-2">Nós te ajudamos.</p>
                  </div>
                </div>
              )}
              <button onClick={() => { setShowSobre(false); setShowSaibaMais(false) }}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-xl text-sm transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

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
          <h1 className="text-5xl font-black tracking-tight text-white mb-1"
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

        {/* RODAPÉ */}
        <div className="mt-10 flex flex-col items-center gap-1">
          <p className="text-gray-500 text-xs tracking-wide">by cytomica.com</p>
          <p className="text-gray-500 text-xs">© 2026</p>
        </div>

      </div>
    </div>
  )
}