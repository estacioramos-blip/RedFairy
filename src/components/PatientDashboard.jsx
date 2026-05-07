import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { avaliarPaciente, triagemEritron, formatarParaCopiar } from '../engine/decisionEngine'
import TriagemModal from './TriagemModal'
import TriagemResultadoModal from './TriagemResultadoModal'
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
  const [mostrarExamesExtras, setMostrarExamesExtras] = useState(false)

  // Estados de triagem (popup inicial)
  const [showTriagem, setShowTriagem] = useState(false)
  const [temAvaliacaoCompleta, setTemAvaliacaoCompleta] = useState(false)
  const [triagemResultado, setTriagemResultado] = useState(null)
  const [triagemInputs, setTriagemInputs] = useState(null)

  const [inputs, setInputs] = useState({
    sexo: '', idade: '',
    dataColeta: '', ferritina: '', hemoglobina: '',
    vcm: '', rdw: '', satTransf: '',
    bariatrica: false, vegetariano: false, perda: false,
    hipermenorreia: false, gestante: false, semanas_gestacao: '', dum: '',
    aspirina: false, vitaminaB12: false, ferro_oral: false, ferro_injetavel: false,
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

  // Abrir TriagemModal so quando entrar na tela 'nova' E paciente ainda
  // nao tem nenhuma avaliacao completa (com ferritina + sat preenchidos).
  useEffect(() => {
    if (tela === 'nova' && !triagemResultado && !temAvaliacaoCompleta) {
      setShowTriagem(true)
    } else {
      setShowTriagem(false)
    }
  }, [tela, triagemResultado, temAvaliacaoCompleta])

  // Pre-preenche sexo/idade em inputs sempre que o profile mudar.
  // Idade e sexo vem SEMPRE do profile (paciente nao edita esses campos).
  useEffect(() => {
    if (!profile) return
    const idadeProfile = profile.data_nascimento ? calcularIdade(profile.data_nascimento) : ''
    setInputs(prev => ({
      ...prev,
      sexo: profile.sexo || prev.sexo || '',
      idade: idadeProfile ? String(idadeProfile) : (prev.idade || ''),
    }))
  }, [profile])

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
    // Retry pos-signUp (race condition: profile insert pode nao ter terminado)
    let prof = null
    const delays = [0, 250, 600, 1200]
    for (const d of delays) {
      if (d > 0) await new Promise(r => setTimeout(r, d))
      const { data } = await supabase
        .from('profiles').select('*').eq('id', session.user.id).maybeSingle()
      if (data) { prof = data; break }
    }
    if (!prof) {
      console.warn('[PatientDashboard] profile nao encontrado apos retries; signOut')
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
    // Verifica se paciente ja tem alguma avaliacao com ferritina E sat preenchidos
    const completa = (avals || []).some(a => a.ferritina != null && a.sat_transferrina != null)
    setTemAvaliacaoCompleta(completa)
    setLoading(false)
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    let v = type === 'checkbox' ? checked : value
    // Decimais clinicos: aceita virgula, salva com ponto
    if (['hemoglobina', 'vcm', 'rdw', 'ferritina', 'satTransf'].includes(name) && typeof v === 'string') {
      v = v.replace(',', '.')
    }
    setInputs(prev => ({ ...prev, [name]: v }))
  }

  async function handleAvaliar() {
    if (!profile) return

    // Validacao: sexo e idade
    if (!inputs.sexo) {
      alert('Selecione o Sexo.')
      return
    }
    const idadeNum = Number(inputs.idade)
    if (!idadeNum || idadeNum < 12 || idadeNum > 100) {
      alert('Informe uma idade valida (12 a 100 anos).')
      return
    }

    // Validacao: triagem (sempre obrigatorios) - Hb, VCM, RDW
    if (!inputs.hemoglobina || !inputs.vcm || !inputs.rdw) {
      alert('Preencha os campos da triagem: Hemoglobina, VCM e RDW.')
      return
    }
    // Validacao: aprofundamento (so se mostrarExamesExtras) - Ferritina e Sat
    if (mostrarExamesExtras && (!inputs.ferritina || !inputs.satTransf)) {
      alert('Voce optou por aprofundar o diagnostico. Preencha Ferritina e Sat. Transferrina.')
      return
    }
    if (!inputs.dataColeta) {
      alert('Informe a data da coleta.')
      return
    }

    const inputsNumericos = {
      ...inputs,
      cpf: profile.cpf || '',
      sexo: inputs.sexo,
      idade: idadeNum,
      ferritina: Number(inputs.ferritina),
      hemoglobina: Number(inputs.hemoglobina),
      vcm: Number(inputs.vcm),
      rdw: Number(inputs.rdw),
      satTransf: Number(inputs.satTransf),
    }
    // Roteamento: triagem (Hb/VCM/RDW) ou avaliacao completa
    const res = mostrarExamesExtras
      ? avaliarPaciente(inputsNumericos)
      : triagemEritron(inputsNumericos)
    setResultado({ ...res, _inputs: inputsNumericos })

    // So persiste no Supabase se houver sessao real (paciente cadastrado).
    // Modo demo/bariatrico sem login apenas exibe o resultado.
    if (res.encontrado && session?.user) {
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
        semanas_gestacao: inputs.gestante && inputs.semanas_gestacao ? Number(inputs.semanas_gestacao) : null,
        dum: inputs.gestante && inputs.dum ? inputs.dum : null,
        aspirina: inputs.aspirina,
        vitamina_b12: inputs.vitaminaB12,
        ferro_oral: inputs.ferro_oral,
        ferro_injetavel: inputs.ferro_injetavel,
        diagnostico_label: res.label,
        diagnostico_color: res.color,
      })
      carregarDados()
    }
    setTela('resultado')

    // Se o paciente eh bariatrico, abrir a anamnese OBA logo apos a avaliacao
    if (inputs.bariatrica && res.encontrado) {
      setShowOBAModal(true)
    }
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
{/* TriagemModal: popup inicial de triagem */}
      {showTriagem && (
        <TriagemModal
          modoMedico={false}
          isDemoPaciente={!session?.user}
          onConcluir={(resultado, novosInputs) => {
            setTriagemResultado(resultado)
            setTriagemInputs(novosInputs)
            setShowTriagem(false)
            // pre-preenche o form principal
            setInputs(prev => ({
              ...prev,
              sexo: novosInputs.sexo || prev.sexo,
              idade: String(novosInputs.idade || prev.idade || ''),
              gestante: novosInputs.gestante || prev.gestante || false,
              semanas_gestacao: novosInputs.semanas_gestacao ? String(novosInputs.semanas_gestacao) : prev.semanas_gestacao,
              hemoglobina: String(novosInputs.hemoglobina || prev.hemoglobina || ''),
              vcm: String(novosInputs.vcm || prev.vcm || ''),
              rdw: String(novosInputs.rdw || prev.rdw || ''),
            }))
          }}
          onFechar={() => {
            setShowTriagem(false)
            setTriagemResultado(null)
          }}
        />
      )}

      {/* TriagemResultadoModal: popup azul com resultado da triagem */}
      {triagemResultado && (
        <TriagemResultadoModal
          resultado={triagemResultado}
          inputs={{ ...triagemInputs, cpf: profile?.cpf || '' }}
          modoMedico={false}
          isDemo={!session?.user}
          medicoCRM={null}
          userId={session?.user?.id || null}
          onVoltarInicio={() => {
            setTriagemResultado(null)
            setShowTriagem(false)
            setTela('historico')
            if (onVoltar) onVoltar()
          }}
          onCadastrar={() => {
            setTriagemResultado(null)
            setShowTriagem(false)
            // TODO: redirecionar para fluxo de cadastro completo
            if (onVoltar) onVoltar()
          }}
        />
      )}

      {showOBAModal && profile && (
        <OBAModal
          cpf={profile.cpf}
          sexo={profile.sexo}
          idade={profile.data_nascimento ? Math.floor((Date.now() - new Date(profile.data_nascimento)) / 31557600000) : 0}
          dadosRedFairy={{
            gestante: inputs.gestante,
            semanas_gestacao: inputs.semanas_gestacao ? Number(inputs.semanas_gestacao) : null,
            dum: inputs.dum || null,
          }}
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
            {/* Bloco read-only: dados de identidade vem do profile */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-500 mb-1">Paciente</p>
              <p className="text-sm text-gray-700">
                <strong>{profile?.nome || ''}</strong>
                {inputs.sexo && (<>{' • '}<strong>{inputs.sexo === 'F' ? 'Feminino' : 'Masculino'}</strong></>)}
                {inputs.idade && (<>{' • '}<strong>{inputs.idade} anos</strong></>)}
              </p>
              {profile?.data_nascimento && (
                <p className="text-xs text-gray-400 mt-0.5">Idade calculada a partir da data de nascimento no seu cadastro</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Data da Coleta</label>
              <input type="date" name="dataColeta" value={inputs.dataColeta} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
            {/* TRIAGEM (sempre habilitados): Hb, VCM, RDW - bordas vermelhas */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: 'Hemoglobina (g/dL)', name: 'hemoglobina' },
                { label: 'VCM (fL)', name: 'vcm' },
                { label: 'RDW-CV (%)', name: 'rdw' },
              ].map(f => (
                <div key={f.name}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  <input type="number" step="0.1" name={f.name} value={inputs[f.name]} onChange={handleChange}
                    className="w-full border-2 border-red-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                </div>
              ))}
            </div>

            {/* CTA: botao para liberar exames extras */}
            {!mostrarExamesExtras && (
              <button
                type="button"
                onClick={() => setMostrarExamesExtras(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 px-4 rounded-xl transition-colors text-sm flex flex-col items-center"
              >
                <span>📋 JÁ TENHO A FERRITINA E A SATURAÇÃO DA TRANSFERRINA</span>
                <span className="text-xs font-normal opacity-90 mt-1">Aprofundar o diagnóstico</span>
              </button>
            )}

            {/* APROFUNDAMENTO (sempre visivel, desabilitados se !mostrarExamesExtras): Ferritina, Sat - bordas azuis */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Ferritina (ng/mL)', name: 'ferritina', hint: mostrarExamesExtras ? 'Não use ponto para valores superiores a 1000. Ex: 1140' : null },
                { label: 'Sat. Transferrina (%)', name: 'satTransf' },
              ].map(f => (
                <div key={f.name}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  <input
                    type="number"
                    step="0.1"
                    name={f.name}
                    value={inputs[f.name]}
                    onChange={handleChange}
                    disabled={!mostrarExamesExtras}
                    placeholder={!mostrarExamesExtras ? 'Clique no botão azul para liberar' : ''}
                    className="w-full border-2 border-blue-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400 disabled:placeholder:text-gray-400 disabled:placeholder:italic"
                  />
                  {f.hint && <p className="text-xs text-orange-600 font-medium mt-1">{f.hint}</p>}
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
                  ...(inputs.sexo === 'F' ? [
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
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Medicamentos / Suplementos</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: 'aspirina', label: 'Aspirina', sub: 'Uso contínuo', color: 'orange' },
                  { name: 'vitaminaB12', label: 'Vitamina B12', sub: 'Últimos 3 meses', color: 'purple' },
                  { name: 'ferro_oral', label: 'Ferro Oral', sub: 'Últimos 2 anos', color: 'orange' },
                  { name: 'ferro_injetavel', label: 'Ferro Injetável', sub: 'Últimos 2 anos', color: 'orange' },
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
            <ResultCard resultado={resultado} onCopiar={() => {
              const texto = formatarParaCopiar(resultado, resultado._inputs || inputs)
              navigator.clipboard.writeText(texto).then(() => {
                setCopiado(true)
                setTimeout(() => setCopiado(false), 3000)
              }).catch(err => {
                console.error('Erro ao copiar:', err)
                alert('Erro ao copiar. Tente novamente.')
              })
            }} copiado={copiado} />
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