import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { avaliarPaciente, formatarParaCopiar } from '../engine/decisionEngine';
import ResultCard from './ResultCard';
import heroImg from '../assets/redfairy-hero.png';
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

// ─── Tela de cadastro do médico ──────────────────────────────────────────────
function CadastraMedico({ onConcluir }) {
  const [nome, setNome] = useState('')
  const [crm, setCrm] = useState('')
  const [celular, setCelular] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)

  function formatarCelular(valor) {
    const digits = valor.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 2) return `(${digits}`
    if (digits.length <= 7) return `(${digits.slice(0,2)}) ${digits.slice(2)}`
    return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`
  }

  function formatarCRM(valor) {
    // Permite apenas números e barra, ex: 6302/BA
    return valor.toUpperCase().replace(/[^0-9/A-Z]/g, '').slice(0, 10)
  }

  async function handleSubmit() {
    setErro('')
    const crmLimpo = crm.trim().toUpperCase()
    const celularDigits = celular.replace(/\D/g, '')

    if (!nome.trim() || nome.trim().length < 5) {
      setErro('Informe seu nome completo'); return
    }
    if (!crmLimpo || !crmLimpo.includes('/')) {
      setErro('Informe o CRM no formato NÚMERO/UF (ex: 6302/BA)'); return
    }
    if (celularDigits.length < 10) {
      setErro('Informe um celular válido com DDD'); return
    }
    if (!email || !email.includes('@')) {
      setErro('Informe um e-mail válido'); return
    }

    setLoading(true)
    const partes = crmLimpo.split('/')
    const numero = partes[0]
    const uf = partes[1]

    // Verifica se já existe
    const { data: existing } = await supabase
      .from('medicos')
      .select('id')
      .eq('crm', crmLimpo)
      .single()

    if (existing) {
      // Já cadastrado — salva no localStorage e vai para calculadora
      localStorage.setItem('medico_crm', crmLimpo)
      onConcluir(existing.nome || '', crmLimpo)
      return
    }

    const { error } = await supabase.from('medicos').insert({
      nome: nome.trim(),
      crm: crmLimpo,
      uf,
      celular: celularDigits,
      email: email.trim().toLowerCase(),
    })

    setLoading(false)

    if (error) {
      setErro('Erro ao salvar. Tente novamente.'); return
    }

    localStorage.setItem('medico_crm', crmLimpo)
    localStorage.setItem('medico_nome', nome.trim())
    setSucesso(true)
  }

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"

  if (sucesso) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center space-y-5">
          <div className="text-5xl">🎉</div>
          <h2 className="text-xl font-bold text-red-700">Bem-vindo ao RedFairy!</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Obrigado pelo cadastro. Em breve entraremos em contato para mostrar como você pode se beneficiar ao ajudar os seus pacientes.
          </p>
          <button
            onClick={() => onConcluir(nome.trim(), crm.trim().toUpperCase())}
            className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors">
            Vamos lá! →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md space-y-5">

        <div className="text-center">
          <img src={logo} alt="RedFairy"
            className="w-16 h-16 object-contain mx-auto mb-3"
            style={{ filter: "drop-shadow(0 0 12px rgba(239,68,68,0.6))" }} />
          <h2 className="text-xl font-bold text-red-700">Olá, Doutor!</h2>
          <p className="text-gray-500 text-sm mt-1">
            Parece que é a sua primeira vez aqui.
          </p>
        </div>

        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-800 leading-relaxed">
          Informe seus dados para começar. É totalmente seguro.
          Depois entraremos em contato para você saber como vai se beneficiar ao ajudar os seus pacientes.
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Nome completo</label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Dr. João da Silva"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">CRM/UF</label>
            <input
              type="text"
              value={crm}
              onChange={e => setCrm(formatarCRM(e.target.value))}
              placeholder="Ex: 6302/BA"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Celular / WhatsApp</label>
            <input
              type="tel"
              value={celular}
              onChange={e => setCelular(formatarCelular(e.target.value))}
              placeholder="(00) 00000-0000"
              inputMode="numeric"
              maxLength={15}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className={inputClass}
            />
          </div>
        </div>

        {erro && <p className="text-red-500 text-sm">{erro}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50">
          {loading ? 'Aguarde...' : 'Continuar para a Calculadora →'}
        </button>

        <button
          onClick={onConcluir}
          className="w-full text-gray-400 text-xs hover:text-gray-600 transition-colors">
          Pular por agora
        </button>

      </div>
    </div>
  )
}

// ─── Calculator principal ────────────────────────────────────────────────────
export default function Calculator({ onVoltar }) {
  const [cadastrado, setCadastrado] = useState(null)
  const [medicoNome, setMedicoNome] = useState('')
  const [medicoCRM, setMedicoCRM] = useState('')

  useEffect(() => {
    const crm = localStorage.getItem('medico_crm')
    const nome = localStorage.getItem('medico_nome')
    setCadastrado(!!crm)
    setMedicoNome(nome || '')
    setMedicoCRM(crm || '')
  }, [])

  if (cadastrado === null) return null

  if (!cadastrado) {
    return <CadastraMedico onConcluir={(nome, crm) => {
      setMedicoNome(nome)
      setMedicoCRM(crm)
      setCadastrado(true)
    }} />
  }

  return <CalculatorForm onVoltar={onVoltar} medicoNome={medicoNome} medicoCRM={medicoCRM} />
}

// ─── Formulário da calculadora ───────────────────────────────────────────────
function CalculatorForm({ onVoltar, medicoNome, medicoCRM }) {
  const [inputs, setInputs] = useState({
    cpf: '',
    sexo: 'M',
    idade: '',
    dataColeta: '',
    ferritina: '',
    hemoglobina: '',
    vcm: '',
    rdw: '',
    satTransf: '',
    bariatrica: false,
    vegetariano: false,
    perda: false,
    hipermenorreia: false,
    gestante: false,
    alcoolista: false,
    transfundido: false,
    aspirina: false,
    vitaminaB12: false,
    ferroOral: false,
  });

  const [resultado, setResultado] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [erros, setErros] = useState({});
  const [showSobre, setShowSobre] = useState(false);
  const [showSaibaMais, setShowSaibaMais] = useState(false);
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);
  const logoClickTimer = useRef(null);


  function carregarDemo(sexo) {
    const hoje = new Date().toISOString().split('T')[0];
    if (sexo === 'F') {
      setInputs({
        cpf: '', sexo: 'F', idade: '35', dataColeta: hoje,
        ferritina: '8', hemoglobina: '10.5', vcm: '72', rdw: '16.5', satTransf: '8',
        bariatrica: false, vegetariano: false, perda: true,
        hipermenorreia: false, gestante: false, alcoolista: false,
        transfundido: false, aspirina: false, vitaminaB12: false, ferroOral: true,
      });
    } else {
      setInputs({
        cpf: '', sexo: 'M', idade: '42', dataColeta: hoje,
        ferritina: '12', hemoglobina: '11.5', vcm: '75', rdw: '17', satTransf: '10',
        bariatrica: false, vegetariano: false, perda: true,
        hipermenorreia: false, gestante: false, alcoolista: false,
        transfundido: false, aspirina: false, vitaminaB12: false, ferroOral: true,
      });
    }
    setResultado(null); setErros({});
    setShowDemoMenu(false);
  }

  function handleLogoTripleClick() {
    setLogoClicks(prev => {
      const next = prev + 1;
      if (logoClickTimer.current) clearTimeout(logoClickTimer.current);
      logoClickTimer.current = setTimeout(() => setLogoClicks(0), 600);
      if (next >= 3) {
        setLogoClicks(0);
        setShowDemoMenu(true);
      }
      return next;
    });
  }

  // ─── Atalhos de teclado demo ─────────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e) {
      if (!e.ctrlKey || !e.shiftKey) return;
      const hoje = new Date().toISOString().split('T')[0];
      if (e.key === 'F' || e.key === 'f') {
        e.preventDefault();
        carregarDemo('F');
      }

      if (e.key === 'M' || e.key === 'm') {
        e.preventDefault();
        carregarDemo('M');
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setInputs(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (erros[name]) setErros(prev => ({ ...prev, [name]: null }));
  }

  function validar() {
    const novosErros = {};
    if (!inputs.idade || inputs.idade < 12 || inputs.idade > 100)
      novosErros.idade = 'Idade inválida (12-100)';
    if (!inputs.dataColeta)
      novosErros.dataColeta = 'Informe a data da coleta';
    if (!inputs.ferritina)   novosErros.ferritina = 'Campo obrigatório';
    if (!inputs.hemoglobina) novosErros.hemoglobina = 'Campo obrigatório';
    if (!inputs.vcm)         novosErros.vcm = 'Campo obrigatório';
    if (!inputs.rdw)         novosErros.rdw = 'Campo obrigatório';
    if (!inputs.satTransf)   novosErros.satTransf = 'Campo obrigatório';
    return novosErros;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const novosErros = validar();
    if (Object.keys(novosErros).length > 0) { setErros(novosErros); return; }

    const inputsNumericos = {
      ...inputs,
      idade:       Number(inputs.idade),
      ferritina:   Number(inputs.ferritina),
      hemoglobina: Number(inputs.hemoglobina),
      vcm:         Number(inputs.vcm),
      rdw:         Number(inputs.rdw),
      satTransf:   Number(inputs.satTransf),
    };

    const res = avaliarPaciente(inputsNumericos);
    setResultado({ ...res, _inputs: inputsNumericos });
    setCopiado(false);

    if (inputs.cpf.trim() && res.encontrado) {
      await supabase.from('avaliacoes').insert({
        cpf: inputs.cpf.replace(/\D/g, ''),
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
      });
    }

    setTimeout(() => {
      document.getElementById('resultado')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  function handleCopiar() {
    if (!resultado) return;
    const texto = formatarParaCopiar(resultado, resultado._inputs);
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    });
  }

  function handleLimpar() {
    setInputs({
      cpf: '', sexo: 'M', idade: '', dataColeta: '',
      ferritina: '', hemoglobina: '', vcm: '', rdw: '',
      satTransf: '', bariatrica: false, vegetariano: false,
      perda: false, hipermenorreia: false, gestante: false,
      alcoolista: false, transfundido: false,
      aspirina: false, vitaminaB12: false, ferroOral: false,
    });
    setResultado(null);
    setErros({});
  }

  return (
    <div className="min-h-screen bg-gray-50">

      <header className="bg-red-700 text-white py-4 px-4 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button onClick={onVoltar}
            className="bg-red-800 hover:bg-red-900 rounded-lg px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors">
            Voltar
          </button>
          <div className="flex items-center gap-3">
            <img src={logo} alt="RedFairy" className="w-8 h-8 object-contain"
              style={{ filter: 'brightness(10)', cursor: 'default' }}
              onClick={handleLogoTripleClick} />
            <div>
              <h1 className="text-xl font-bold tracking-wide leading-tight">RedFairy</h1>
              <p className="text-red-200 text-xs">Calculadora Clínica - Eritron e Metabolismo do Ferro</p>
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
            <button onClick={() => setShowSobre(true)}
              className="bg-red-800 hover:bg-red-900 rounded-lg px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors">
              Sobre
            </button>
          </div>
        </div>
      </header>

      {showDemoMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setShowDemoMenu(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-64 space-y-4"
            onClick={e => e.stopPropagation()}>
            <p className="text-center text-sm font-bold text-gray-700">🧪 Modo Demo</p>
            <p className="text-center text-xs text-gray-400">Escolha o perfil de teste</p>
            <button onClick={() => carregarDemo('F')}
              className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 rounded-xl transition-colors">
              👩 Paciente Feminina
            </button>
            <button onClick={() => carregarDemo('M')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors">
              👨 Paciente Masculino
            </button>
            <button onClick={() => setShowDemoMenu(false)}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm py-2 rounded-xl transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {showSobre && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => { setShowSobre(false); setShowSaibaMais(false); }}>
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl"
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
           <div style={{ position: 'relative', width: '100%', height: '320px', overflow: 'hidden', borderRadius: '16px 16px 0 0' }}>
  <img src={heroImg} alt="RedFairy"
    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', padding: '20px' }}>
    <div style={{ textAlign: 'left' }}>
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
                    No ambiente, uma proteína verde - a <strong>clorofila</strong>, mãe da Hemoglobina -
                    usa a luz do sol para partir o CO2 e fazer açúcar a partir de luz, carbono e água,
                    devolvendo o oxigênio ao ar do planeta, em um ciclo virtuoso perfeito.
                  </p>
                  <div className="mt-4 bg-pink-50 border-2 border-red-400 rounded-xl p-4 text-center">
                    <p className="text-black font-bold text-sm">Portanto, é importante que você cuide da sua Hemoglobina.</p>
                    <p className="text-black font-bold text-sm mt-2">Nós ajudamos.</p>
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-gray-500 text-xs font-medium">RT | E.F. Ramos, M.D.</p>
                    <p className="text-red-700 text-xs mt-1">drestacioramos.com.br</p>
                  </div>
                </div>
              )}
              <button onClick={() => { setShowSobre(false); setShowSaibaMais(false); }}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-xl text-sm transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-3 py-5">
        <form onSubmit={handleSubmit} className="space-y-4">

          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <IconPaciente /> Dados do Paciente
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">CPF</label>
                <input type="text" name="cpf" value={inputs.cpf}
                  onChange={handleChange} placeholder="000.000.000-00" maxLength={14}
                  inputMode="numeric" className="input" />
                <p className="text-xs text-gray-400 mt-0.5">Opcional — vincula ao paciente</p>
              </div>
              <div>
                <label className="label">Sexo</label>
                <select name="sexo" value={inputs.sexo} onChange={handleChange} className="input">
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </select>
              </div>
              <div>
                <label className="label">Idade</label>
                <input type="number" name="idade" value={inputs.idade}
                  onChange={handleChange} placeholder="12-100" min={12} max={100}
                  className={`input ${erros.idade ? 'border-red-500' : ''}`} />
                {erros.idade && <p className="text-red-500 text-xs mt-1">{erros.idade}</p>}
              </div>
              <div>
                <label className="label">Data da Coleta</label>
                <input type="date" name="dataColeta" value={inputs.dataColeta}
                  onChange={handleChange}
                  className={`input ${erros.dataColeta ? 'border-red-500' : ''}`} />
                {erros.dataColeta && <p className="text-red-500 text-xs mt-1">{erros.dataColeta}</p>}
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <IconExames /> Exames Laboratoriais
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <LabInput label="Ferritina" unit="ng/mL" name="ferritina"
                reference={inputs.sexo === 'M' ? '24-336' : '25-150'}
                value={inputs.ferritina} onChange={handleChange} error={erros.ferritina} />
              <LabInput label="Hemoglobina" unit="g/dL" name="hemoglobina"
                reference={inputs.sexo === 'M' ? '13.5-17.5' : '12-15.5'}
                value={inputs.hemoglobina} onChange={handleChange} error={erros.hemoglobina} />
              <LabInput label="VCM" unit="fL" name="vcm" reference="80-100"
                value={inputs.vcm} onChange={handleChange} error={erros.vcm} />
              <LabInput label="RDW-CV" unit="%" name="rdw" reference="11.5-15"
                value={inputs.rdw} onChange={handleChange} error={erros.rdw} />
              <div className="col-span-2">
                <LabInput label="Sat. Transferrina" unit="%" name="satTransf" reference="20-50"
                  value={inputs.satTransf} onChange={handleChange} error={erros.satTransf} />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <IconHistorico /> Histórico Clínico
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <CheckboxCard name="bariatrica" label="Bariátrica" sublabel="By-pass / Gastrectomia" checked={inputs.bariatrica} onChange={handleChange} color="amber" />
              <CheckboxCard name="vegetariano" label="Vegetariano/Vegano" sublabel="Dieta sem carne" checked={inputs.vegetariano} onChange={handleChange} color="green" />
              <CheckboxCard name="perda" label="Hemorragia" sublabel="Inclui doação de sangue, sangria, ou sangramento" checked={inputs.perda} onChange={handleChange} color="red" />
              <CheckboxCard name="alcoolista" label="Alcoolista" sublabel="Uso crônico de álcool" checked={inputs.alcoolista} onChange={handleChange} color="amber" />
              <CheckboxCard name="transfundido" label="Transfundido" sublabel="Transfusão de hemácias" checked={inputs.transfundido} onChange={handleChange} color="red" />
              {inputs.sexo === 'F' && (
                <>
                  <CheckboxCard name="hipermenorreia" label="Hipermenorreia" sublabel="Fluxo excessivo" checked={inputs.hipermenorreia} onChange={handleChange} color="pink" />
                  <CheckboxCard name="gestante" label="Gestante" sublabel="Gravidez atual" checked={inputs.gestante} onChange={handleChange} color="pink" />
                </>
              )}
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <IconMedicamentos /> Medicamentos / Suplementos
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <CheckboxCard name="aspirina" label="Aspirina" sublabel="Uso contínuo" checked={inputs.aspirina} onChange={handleChange} color="orange" />
              <CheckboxCard name="vitaminaB12" label="Vitamina B12" sublabel="Últimos 3 meses" checked={inputs.vitaminaB12} onChange={handleChange} color="purple" />
              <div className="col-span-2">
                <CheckboxCard name="ferroOral" label="Ferro Oral / Injetável" sublabel="Nos últimos 2 anos" checked={inputs.ferroOral} onChange={handleChange} color="orange" />
              </div>
            </div>
          </section>

          <div className="flex gap-3">
            <button type="submit"
              className="flex-1 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-bold py-4 px-6 rounded-xl transition-colors shadow-md text-base">
              Avaliar Paciente
            </button>
            <button type="button" onClick={handleLimpar}
              className="bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-700 font-medium py-4 px-5 rounded-xl transition-colors">
              Limpar
            </button>
          </div>

        </form>

        {resultado && (
          <div id="resultado" className="mt-6">
            <ResultCard resultado={resultado} onCopiar={handleCopiar} copiado={copiado} />
          </div>
        )}
      </main>
    </div>
  );
}

function LabInput({ label, unit, name, reference, value, onChange, error }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">
        {label} <span className="text-xs text-gray-400">({unit})</span>
      </label>
      <input type="number" step="0.1" name={name} value={value}
        onChange={onChange} inputMode="decimal"
        className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 ${error ? 'border-red-500' : 'border-gray-200'}`}
      />
      <p className="text-xs text-gray-400 mt-0.5">Ref: {reference}</p>
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  );
}

const colorMap = {
  amber:  'border-amber-400  bg-amber-50  text-amber-700',
  green:  'border-green-400  bg-green-50  text-green-700',
  red:    'border-red-400    bg-red-50    text-red-700',
  pink:   'border-pink-400   bg-pink-50   text-pink-700',
  orange: 'border-orange-400 bg-orange-50 text-orange-700',
  purple: 'border-purple-400 bg-purple-50 text-purple-700',
};

function CheckboxCard({ name, label, sublabel, checked, onChange, color }) {
  return (
    <label className={`flex items-start gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${checked ? colorMap[color] : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
      <input type="checkbox" name={name} checked={checked} onChange={onChange} className="mt-0.5 w-4 h-4 cursor-pointer flex-shrink-0" />
      <div className="min-w-0">
        <p className="font-medium text-sm leading-tight">{label}</p>
        <p className="text-xs opacity-70 leading-tight mt-0.5">{sublabel}</p>
      </div>
    </label>
  );
}
