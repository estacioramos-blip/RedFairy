import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import ResultCard from './ResultCard'
import OBAModal from './OBAModal'
import heroImg from '../assets/redfairy-hero.png'
import logo from '../assets/logo.png'

export default function PatientDashboard({ session, onVoltar, demoPerfil, abrirOBA }) {
  const [profile, setProfile] = useState(null)
  const [avaliacoes, setAvaliacoes] = useState([])
  const [tela, setTela] = useState('historico')
  const [resultado, setResultado] = useState(null)
  const [copiado, setCopiado] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showSobre, setShowSobre] = useState(false)
  const [showOBAModal, setShowOBAModal] = useState(false)
  const [showSaibaMais, setShowSaibaMais] = useState(false)

  const [inputs, setInputs] = useState({
    dataColeta: '', ferritina: '', hemoglobina: '',
    vcm: '', rdw: '', satTransf: '',
    bariatrica: false, vegetariano: false, perda: false,
    hipermenorreia: false, gestante: false,
    aspirina: false, vitaminaB12: false, ferroOral: false,
  })

  useEffect(() => { carregarDados() }, [])

  useEffect(() => {
    function handleDemoKey(e) {
      if (!e.ctrlKey || e.shiftKey || e.altKey) return
      const hoje = new Date().toISOString().split('T')[0]
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault()
        setInputs(p => ({ ...p, sexo:'M', idade:'20', dataColeta:hoje, ferritina:'', hemoglobina:'', vcm:'', rdw:'', satTransf:'' }))
        setResultado(null)
        setTela('nova')
      }
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault()
        setInputs(p => ({ ...p, sexo:'M', idade:'50', dataColeta:hoje, ferritina:'', hemoglobina:'', vcm:'', rdw:'', satTransf:'' }))
        setResultado(null)
        setTela('nova')
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        setInputs(p => ({ ...p, sexo:'F', idade:'20', dataColeta:hoje, ferritina:'', hemoglobina:'', vcm:'', rdw:'', satTransf:'' }))
        setResultado(null)
        setTela('nova')
      }
      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault()
        setInputs(p => ({ ...p, sexo:'F', idade:'50', dataColeta:hoje, ferritina:'', hemoglobina:'', vcm:'', rdw:'', satTransf:'' }))
        setResultado(null)
        setTela('nova')
      }
    }
    window.addEventListener('keydown', handleDemoKey)
    return () => window.removeEventListener('keydown', handleDemoKey)
  }, [])

  async function carregarDados() {
    setLoading(true)
    if (demoPerfil) {
      setProfile(demoPerfil)
      setAvaliacoes([])
      setLoading(false)
      if (localStorage.getItem('rf_flag') === 'bariatrica') {
        localStorage.removeItem('rf_flag')
        setTimeout(() => {
          setTela('nova')
          setInputs(prev => ({ ...prev, bariatrica: true }))
        }, 300)
      }
      return
    }
    const { data: prof } = await supabase
      .from('profiles').select('*').eq('id', session.user.id).single()
    if (!prof) {
      await supabase.auth.signOut()
      onVoltar()
      return
    }
    setProfile(prof)
    if (abrirOBA || localStorage.getItem('rf_flag') === 'bariatrica') {
      localStorage.removeItem('rf_flag')
      setTimeout(() => {
        setTela('nova')
        setInputs(prev => ({ ...prev, bariatrica: true }))
      }, 400)
    }
    const { data: avals } = await supabase
      .from('avaliacoes').select('*')
      .eq('user_id', session.user.id)
      .order('data_coleta', { ascending: false })
    setAvaliacoes(avals || [])
    setLoading(false)
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setInputs(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  async function handleAvaliar() {
     if (!profile) return 
    const idade = calcularIdade(profile.data_nascimento)
    const inputsNumericos = {
      ...inputs,
      cpf: profile.cpf || '',
      sexo: profile.sexo,
      idade,
      ferritina: Number(inputs.ferritina),
      hemoglobina: Number(inputs.hemoglobina),
      vcm: Number(inputs.vcm),
      rdw: Number(inputs.rdw),
      satTransf: Number(inputs.satTransf),
    }
    const res = avaliarPaciente(inputsNumericos)
    setResultado({ ...res, _inputs: inputsNumericos })

    if (res.encontrado) {
      await supabase.from('avaliacoes').insert({
        user_id: session.user.id,
        data_coleta: inputs.dataColeta,
        ferritina: Number(inputs.ferritina),
        hemoglobina: Number(inputs.hemoglobina),
        vcm: Number(inputs.vcm),
        rdw: Number(inputs.rdw),
        sat_transf: Number(inputs.satTransf),
        bariatrica: inputs.bariatrica,
        vegetariano: inputs.vegetariano,
        perda: inputs.perda,
        hipermenorreia: inputs.hipermenorreia,
        gestante: inputs.gestante,
        aspirina: inputs.aspirina,
        vitamina_b12: inputs.vitaminaB12,
        ferro_oral: inputs.ferroOral,
        diagnostico_label: res.label,
        diagnostico_color: res.color,
      })
      carregarDados()
    }
    setTela('resultado')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    onVoltar()
  }

  function calcularIdade(dataNascimento) {
    const hoje = new Date()
    const nasc = new Date(dataNascimento)
    let idade = hoje.getFullYear() - nasc.getFullYear()
    const m = hoje.getMonth() - nasc.getMonth()
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
    return idade
  }

  const colorBadge = {
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    orange: 'bg-orange-100 text-orange-800',
    red: 'bg-red-100 text-red-800',
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Carregando...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">

      {/* HEADER — mesmo padrão do Calculator */}
      <header className="bg-red-700 text-white py-4 px-4 shadow-lg">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={onVoltar}
            className="bg-red-800 hover:bg-red-900 rounded-lg px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors">
            Voltar
          </button>
          <div className="flex items-center gap-3">
            <img src={logo} alt="RedFairy" className="w-8 h-8 object-contain"
              style={{ filter: 'brightness(10)' }} />
            <div>
              <h1 className="text-xl font-bold">RedFairy</h1>
              <p className="text-red-200 text-xs">Olá, {profile?.nome?.split(' ')[0]}!</p>
              <div style={{ display:'flex', flexDirection:'column', gap:'1px', marginTop:'2px' }}>
                <span style={{ color:'rgba(252,165,165,0.7)', fontSize:'8px', fontFamily:'monospace' }}>Ctrl+M ♂20  Ctrl+B ♂50</span>
                <span style={{ color:'rgba(252,165,165,0.7)', fontSize:'8px', fontFamily:'monospace' }}>Ctrl+F ♀20  Ctrl+G ♀50</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {profile?.nome && (
              <div title={profile.nome}
                className="w-9 h-9 rounded-full bg-white flex items-center justify-content-center flex-shrink-0"
                style={{ border: '2px solid rgba(255,255,255,0.4)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span className="text-red-700 font-black text-xs">
                  {profile.nome.split(' ').slice(0,2).map(p => p[0]).join('').toUpperCase()}
                </span>
              </div>
            )}
            <button onClick={handleLogout}
              className="bg-red-800 hover:bg-red-900 rounded-lg px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors">
              Sair
            </button>
            <button onClick={() => setShowSobre(true)}
              className="bg-red-800 hover:bg-red-900 rounded-lg px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors">
              Sobre
            </button>
          </div>
        </div>
      </header>
{showOBAModal && profile && (
        <OBAModal
          cpf={profile.cpf}
          sexo={profile.sexo}
          idade={profile.data_nascimento ? Math.floor((Date.now() - new Date(profile.data_nascimento)) / 31557600000) : 0}
          onFechar={() => setShowOBAModal(false)}
          onConcluir={() => setShowOBAModal(false)}
        />
      )}
{/* MODAL SOBRE */}
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
    <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#fca5a5', fontSize: '14px', lineHeight: '1.8', fontStyle: 'italic', margin: 0, textAlign: 'center' }}>
        Eu sou a sua fada vermelha, a sua <span style={{ fontWeight: 'bold' }}>HEMOGLOBINA</span>.
        <br />
        Eu uso a poeira das estrelas para te entregar o ar.
        <br />
        <span style={{ fontWeight: '600' }}>Quanto tempo você vive sem ar?</span>
      </p>
    </div>
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
                  <h3 className="text-red-700 font-bold text-base text-center mb-4">Vida é ventilação e perfusão</h3>
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
                    Ao mesmo tempo, a Hemoglobina captura o CO2 produzido pela queima do alimento em suas células,
                    e o leva aos seus pulmões para que você o expire no ar do mundo.
                  </p>
                  <p className="text-gray-700 text-sm leading-relaxed mb-3">
                    No ambiente, uma proteína verde - a clorofila, mãe da Hemoglobina -
                    usa a luz do sol para partir o CO2 e fazer açúcar a partir de luz, carbono e água,
                    devolvendo o oxigênio ao ar do planeta, em um ciclo virtuoso perfeito.
                  </p>
                  <div className="mt-4 text-center">
  <p className="text-gray-500 text-xs font-medium">RT | E.F. Ramos, M.D.</p>
  <p className="text-red-700 text-xs mt-1">drestacioramos.com.br</p>
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

      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTela('historico')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tela === 'historico' ? 'bg-red-700 text-white' : 'bg-white text-gray-600 border'}`}>
            Histórico
          </button>
          <button onClick={() => { setTela('nova'); setResultado(null) }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tela === 'nova' || tela === 'resultado' ? 'bg-red-700 text-white' : 'bg-white text-gray-600 border'}`}>
            Nova Avaliação
          </button>
        </div>

        {tela === 'historico' && (
          <div className="space-y-3">
            {avaliacoes.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center text-gray-400 border">
                <img src={logo} alt="RedFairy" className="w-12 h-12 object-contain mx-auto mb-3"
                  style={{ filter: 'drop-shadow(0 0 6px rgba(239,68,68,0.4))' }} />
                <p>Nenhuma avaliação ainda.</p>
                <button onClick={() => setTela('nova')}
                  className="mt-4 bg-red-700 text-white px-6 py-2 rounded-xl text-sm">
                  Fazer primeira avaliação
                </button>
              </div>
            ) : avaliacoes.map(av => (
              <div key={av.id} className="bg-white rounded-2xl p-4 border shadow-sm flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-700">
                    {new Date(av.data_coleta + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Hb: {av.hemoglobina} | Ferritina: {av.ferritina} | VCM: {av.vcm}
                  </p>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${colorBadge[av.diagnostico_color] || colorBadge.yellow}`}>
                  {av.diagnostico_label}
                </span>
              </div>
            ))}
          </div>
        )}

        {tela === 'nova' && (
          <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-5">
            <h2 className="font-semibold text-gray-700">Nova Avaliação</h2>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Data da Coleta</label>
              <input type="date" name="dataColeta" value={inputs.dataColeta} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: 'Ferritina (ng/mL)', name: 'ferritina' },
                { label: 'Hemoglobina (g/dL)', name: 'hemoglobina' },
                { label: 'VCM (fL)', name: 'vcm' },
                { label: 'RDW-CV (%)', name: 'rdw' },
                { label: 'Sat. Transferrina (%)', name: 'satTransf' },
              ].map(f => (
                <div key={f.name}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  <input type="number" step="0.1" name={f.name} value={inputs[f.name]} onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                </div>
              ))}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Histórico Clínico</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: 'bariatrica', label: 'Bariátrica', sub: 'By-pass / Gastrectomia', color: 'amber' },
                  { name: 'vegetariano', label: 'Vegetariano/Vegano', sub: 'Dieta sem carne', color: 'green' },
                  { name: 'perda', label: 'Perda / Hemorragia', sub: 'Inclui doação de sangue, sangria, ou sangramento', color: 'red' },
                  ...(profile?.sexo === 'F' ? [
                    { name: 'hipermenorreia', label: 'Hipermenorreia', sub: 'Fluxo excessivo', color: 'pink' },
                    { name: 'gestante', label: 'Gestante', sub: 'Gravidez atual', color: 'pink' },
                  ] : []),
                ].map(f => (
                  <label key={f.name} className={`flex items-start gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all text-sm
                    ${inputs[f.name]
                      ? f.color === 'amber' ? 'border-amber-400 bg-amber-50 text-amber-700'
                      : f.color === 'green' ? 'border-green-400 bg-green-50 text-green-700'
                      : f.color === 'red' ? 'border-red-400 bg-red-50 text-red-700'
                      : 'border-pink-400 bg-pink-50 text-pink-700'
                      : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                    <input type="checkbox" name={f.name} checked={inputs[f.name]} onChange={handleChange} className="mt-0.5" />
                    <div>
                      <p className="font-medium">{f.label}</p>
                      <p className="text-xs opacity-70">{f.sub}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Medicamentos / Suplementos</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: 'aspirina', label: 'Aspirina', sub: 'Uso contínuo', color: 'orange' },
                  { name: 'vitaminaB12', label: 'Vitamina B12', sub: 'Últimos 3 meses', color: 'purple' },
                  { name: 'ferroOral', label: 'Ferro Oral/Injetável', sub: 'Últimos 2 anos', color: 'orange' },
                ].map(f => (
                  <label key={f.name} className={`flex items-start gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all text-sm
                    ${inputs[f.name]
                      ? f.color === 'purple' ? 'border-purple-400 bg-purple-50 text-purple-700'
                      : 'border-orange-400 bg-orange-50 text-orange-700'
                      : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                    <input type="checkbox" name={f.name} checked={inputs[f.name]} onChange={handleChange} className="mt-0.5" />
                    <div>
                      <p className="font-medium">{f.label}</p>
                      <p className="text-xs opacity-70">{f.sub}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <button onClick={handleAvaliar}
              className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors">
              Avaliar
            </button>
          </div>
        )}

        {tela === 'resultado' && resultado && (
          <div>
            <ResultCard resultado={resultado} onCopiar={() => {}} copiado={copiado} />
            <button onClick={() => setTela('historico')}
              className="mt-4 w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 rounded-xl transition-colors">
              Ver Histórico
            </button>
          </div>
        )}
      </div>
    </div>
  )
}