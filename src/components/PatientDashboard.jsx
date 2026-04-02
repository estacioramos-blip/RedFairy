import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { avaliarPaciente } from '../engine/decisionEngine'
import ResultCard from './ResultCard'
import heroImg from '../assets/redfairy-hero.png'

export default function PatientDashboard({ session, onVoltar }) {
  const [profile, setProfile] = useState(null)
  const [avaliacoes, setAvaliacoes] = useState([])
  const [tela, setTela] = useState('historico')
  const [resultado, setResultado] = useState(null)
  const [copiado, setCopiado] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showSobre, setShowSobre] = useState(false)
  const [showSaibaMais, setShowSaibaMais] = useState(false)

  const [inputs, setInputs] = useState({
    dataColeta: '', ferritina: '', hemoglobina: '',
    vcm: '', rdw: '', satTransf: '',
    bariatrica: false, vegetariano: false, perda: false,
    hipermenorreia: false, gestante: false,
    aspirina: false, vitaminaB12: false, ferroOral: false,
  })

  useEffect(() => { carregarDados() }, [])

  async function carregarDados() {
    setLoading(true)
    const { data: prof } = await supabase
      .from('profiles').select('*').eq('id', session.user.id).single()
    setProfile(prof)
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
    const idade = calcularIdade(profile.data_nascimento)
    const inputsNumericos = {
      ...inputs,
      iniciais: profile.nome.substring(0, 3).toUpperCase(),
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
      <header className="bg-red-700 text-white py-4 px-6 shadow-lg">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="RedFairy" className="w-8 h-8 object-contain" style={{ filter: "drop-shadow(0 0 8px rgba(239,68,68,0.6))" }} />
            <div>
              <h1 className="text-xl font-bold">RedFairy</h1>
              <p className="text-red-200 text-xs">Ola, {profile?.nome}!</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowSobre(true)}
              className="bg-red-800 px-3 py-1 rounded-lg text-xs">Sobre</button>
            <button onClick={onVoltar}
              className="bg-red-800 px-3 py-1 rounded-lg text-xs">Inicio</button>
            <button onClick={handleLogout}
              className="bg-red-800 px-3 py-1 rounded-lg text-xs">Sair</button>
          </div>
        </div>
      </header>

      {/* MODAL SOBRE */}
      {showSobre && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => { setShowSobre(false); setShowSaibaMais(false); }}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full shadow-2xl"
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ position: 'relative', width: '100%', height: '320px', overflow: 'hidden', borderRadius: '16px 16px 0 0' }}>
              <img
                src={heroImg}
                alt="RedFairy"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
              />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', padding: '20px' }}>
                <p style={{ color: 'white', fontSize: '14px', lineHeight: '1.6', fontStyle: 'italic', margin: 0 }}>
                  Eu sou a sua fada vermelha, a sua{' '}
                  <span style={{ fontWeight: 'bold', color: '#fca5a5' }}>HEMOGLOBINA</span>.
                  <br />
                  Eu uso poeira de estrelas para te entregar o ar.
                  <br />
                  <span style={{ fontWeight: '600' }}>Quanto tempo voce vive sem ar?</span>
                </p>
              </div>
            </div>

            <div style={{ padding: '20px' }}>
              {!showSaibaMais && (
                <button
                  onClick={() => setShowSaibaMais(true)}
                  className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl text-sm transition-colors mb-4"
                >
                  Saiba Mais
                </button>
              )}

              {showSaibaMais && (
                <div style={{ marginBottom: '16px' }}>
                  <h3 className="text-red-700 font-bold text-base text-center mb-4">
                    Vida e ventilacao e perfusao
                  </h3>
                  <p className="text-gray-700 text-sm leading-relaxed mb-3">
                    O Ferro em voce veio das estrelas, e dele o vermelho do seu sangue - a sua potencia.
                    Com Ferro, a Natureza faz a <strong>Hemoglobina</strong>, a proteina vermelha e mais
                    importante da sua vida.
                  </p>
                  <p className="text-gray-700 text-sm leading-relaxed mb-3">
                    Ela sustenta a ventilacao e realiza a perfusao: capta o oxigenio do ar que ventila
                    os pulmoes e o entrega a todas as suas celulas - vinte vezes por minuto. As celulas
                    precisam do oxigenio para queimar o alimento e obter a energia vital, sem a qual
                    voce so vive alguns minutos.
                  </p>
                  <p className="text-gray-700 text-sm leading-relaxed mb-3">
                    Ao mesmo tempo, a Hemoglobina captura o CO2 produzido pela queima do alimento,
                    e o leva para que voce o expire no ar do mundo.
                  </p>
                  <p className="text-gray-700 text-sm leading-relaxed mb-3">
                    No ambiente, uma proteina verde - a <strong>clorofila</strong>, mae da Hemoglobina -
                    usa a luz do sol para partir o CO2 e fazer acucar a partir de luz, carbono e agua,
                    devolvendo o oxigenio ao ar do planeta, em um ciclo virtuoso perfeito.
                  </p>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-red-800 text-sm leading-relaxed font-medium">
                      Portanto, e importante saber sobre sua Hemoglobina, o seu Ferro e a sua producao
                      de celulas vermelhas - conhecer o seu Eritron.
                    </p>
                    <p className="text-red-700 text-sm font-bold mt-2">
                      Nos te ajudamos.
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={() => { setShowSobre(false); setShowSaibaMais(false); }}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-xl text-sm transition-colors"
              >
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
            Historico
          </button>
          <button onClick={() => { setTela('nova'); setResultado(null) }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tela === 'nova' || tela === 'resultado' ? 'bg-red-700 text-white' : 'bg-white text-gray-600 border'}`}>
            Nova Avaliacao
          </button>
        </div>

        {tela === 'historico' && (
          <div className="space-y-3">
            {avaliacoes.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center text-gray-400 border">
                <p className="text-4xl mb-2">📋</p>
                <p>Nenhuma avaliacao ainda.</p>
                <button onClick={() => setTela('nova')}
                  className="mt-4 bg-red-700 text-white px-6 py-2 rounded-xl text-sm">
                  Fazer primeira avaliacao
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
            <h2 className="font-semibold text-gray-700">Nova Avaliacao</h2>

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
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Historico Clinico</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: 'bariatrica', label: 'Bariatrica', sub: 'By-pass / Gastrectomia', color: 'amber' },
                  { name: 'vegetariano', label: 'Vegetariano/Vegano', sub: 'Dieta sem carne', color: 'green' },
                  { name: 'perda', label: 'Perda / Hemorragia', sub: 'Doacoes ou sangramento', color: 'red' },
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
                  { name: 'aspirina', label: 'Aspirina', sub: 'Uso continuo', color: 'orange' },
                  { name: 'vitaminaB12', label: 'Vitamina B12', sub: 'Ultimos 3 meses', color: 'purple' },
                  { name: 'ferroOral', label: 'Ferro Oral/Injetavel', sub: 'Ultimos 2 anos', color: 'orange' },
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
              Ver Historico
            </button>
          </div>
        )}
      </div>
    </div>
  )
}