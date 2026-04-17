import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { avaliarPaciente, formatarParaCopiar } from '../engine/decisionEngine';
import { avaliarOBA } from '../engine/obaEngine';
import OBAModal from './OBAModal';
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


function TermosModal({ onFechar }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onFechar}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight:'85vh' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <p className="font-bold text-red-700 text-sm">Termos e Condições de Uso</p>
            <p className="text-gray-400 text-xs">RedFairy — Versão 1.0 — Abril de 2026</p>
          </div>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
        </div>
        <div className="overflow-y-auto p-5 text-xs text-gray-700 leading-relaxed space-y-4">
          <div>
            <p className="font-bold text-red-700 uppercase tracking-wide mb-1">Parte I — Profissionais de Saúde</p>
            <p><strong>1. Natureza da Plataforma.</strong> O RedFairy é uma ferramenta digital de apoio à decisão clínica. NÃO substitui o julgamento clínico do profissional de saúde, o exame físico nem a anamnese detalhada.</p>
            <p><strong>2. Elegibilidade.</strong> O acesso ao módulo profissional é restrito a profissionais de saúde com registro ativo em conselho de classe (CRM, COREN, CRN, CRF ou equivalente).</p>
            <p><strong>3. Responsabilidade Clínica.</strong> O profissional é integralmente responsável pelas decisões clínicas tomadas com base nos resultados gerados. O RedFairy não gera laudos médicos nem prescrições.</p>
            <p><strong>4. Programa de Afiliados.</strong> Ao avaliar pacientes, o profissional integra automaticamente o Programa de Afiliados, com suporte dos patrocinadores da Operadora. As regras são estabelecidas em documento próprio e podem ser alteradas com aviso prévio de 30 dias.</p>
            <p><strong>5. LGPD.</strong> Os dados são tratados em conformidade com a Lei nº 13.709/2018. O profissional declara ter obtido consentimento dos pacientes cujos dados insere na plataforma.</p>
            <p><strong>6. Propriedade Intelectual.</strong> Todo o conteúdo é de propriedade exclusiva da Cytomica. É vedada reprodução sem autorização expressa.</p>
            <p><strong>7. Foro.</strong> Comarca de Salvador, Estado da Bahia. Lei aplicável: legislação brasileira, especialmente a LGPD.</p>
          </div>
          <div>
            <p className="font-bold text-red-700 uppercase tracking-wide mb-1">Parte II — Pacientes</p>
            <p><strong>1. O que é o RedFairy.</strong> Ferramenta de saúde que analisa parâmetros laboratoriais do eritron. NÃO é um serviço médico e NÃO emite diagnósticos definitivos.</p>
            <p><strong>2. Elegibilidade.</strong> Maiores de 18 anos. Menores somente com autorização de responsáveis legais.</p>
            <p><strong>3. Como Funciona.</strong> Você insere dados laboratoriais e o algoritmo gera orientações. Quando necessário, médicos hematologistas parceiros podem contatar para aprimorar as recomendações via teleconsulta subsidiada.</p>
            <p><strong>4. LGPD.</strong> Seus dados pessoais e de saúde são tratados em conformidade com a Lei nº 13.709/2018. Não são vendidos a terceiros nem usados para fins publicitários. Você pode solicitar acesso, correção ou exclusão pelo e-mail: contato@redfairy.bio.</p>
            <p><strong>5. Limitação de Responsabilidade.</strong> O RedFairy não se responsabiliza por decisões de saúde tomadas exclusivamente com base nos resultados sem consulta a profissional. Em emergências, procure serviço de urgência imediatamente.</p>
            <p><strong>6. Foro.</strong> Comarca de Salvador, Estado da Bahia. Lei aplicável: LGPD e Código de Defesa do Consumidor.</p>
          </div>
          <p className="text-gray-400 text-center text-xs">cytomica.com | redfairy.bio | contato@redfairy.bio</p>
        </div>
        <div className="p-4 border-t border-gray-100">
          <button onClick={onFechar} className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tela de login/cadastro do médico ────────────────────────────────────────
function AuthMedico({ onConcluir, onVoltar }) {
  const [modo, setModo] = useState('login') // 'login' | 'cadastro'

  // Login
  const [loginConselho, setLoginConselho] = useState('')
  const [loginSenha, setLoginSenha] = useState('')
  const [loginErro, setLoginErro] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // Cadastro
  const [nome, setNome] = useState('')
  const [conselho, setConselho] = useState('')
  const [celular, setCelular] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [cadErro, setCadErro] = useState('')
  const [cadLoading, setCadLoading] = useState(false)
  const [cadSucesso, setCadSucesso] = useState(false)
  const [aceitoTC, setAceitoTC] = useState(false)
  const [showTC, setShowTC] = useState(false)

  function formatarCelular(valor) {
    const digits = valor.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 2) return `(${digits}`
    if (digits.length <= 7) return `(${digits.slice(0,2)}) ${digits.slice(2)}`
    return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`
  }

  function formatarConselho(valor) {
    return valor.toUpperCase().replace(/[^0-9/A-Z]/g, '').slice(0, 12)
  }

  async function handleLogin() {
    setLoginErro('')
    const conselhoLimpo = loginConselho.trim().toUpperCase()
    if (!conselhoLimpo) { setLoginErro('Informe o número do conselho de classe.'); return }
    if (!loginSenha) { setLoginErro('Informe a senha.'); return }

    setLoginLoading(true)
    const { data: medico } = await supabase
      .from('medicos')
      .select('id, nome, crm, senha_klipbit')
      .eq('crm', conselhoLimpo)
      .single()

    setLoginLoading(false)

    if (!medico) { setLoginErro('Conselho não encontrado. Verifique ou cadastre-se.'); return }
    if (medico.senha_klipbit !== loginSenha) { setLoginErro('Senha incorreta.'); return }

    localStorage.setItem('medico_crm', medico.crm)
    localStorage.setItem('medico_nome', medico.nome || '')
    onConcluir(medico.nome || '', medico.crm)
  }

  async function handleCadastro() {
    setCadErro('')
    if (!aceitoTC) { setCadErro('Você deve aceitar os Termos e Condições para criar acesso.'); return }
    const conselhoLimpo = conselho.trim().toUpperCase()
    const celularDigits = celular.replace(/\D/g, '')

    if (!nome.trim() || nome.trim().length < 5) { setCadErro('Informe seu nome completo.'); return }
    if (!conselhoLimpo) { setCadErro('Informe o número do conselho de classe/UF.'); return }
    if (celularDigits.length < 10) { setCadErro('Informe um celular válido com DDD.'); return }
    if (!email || !email.includes('@')) { setCadErro('Informe um e-mail válido.'); return }
    if (!senha || senha.length < 6) { setCadErro('A senha deve ter pelo menos 6 caracteres.'); return }

    setCadLoading(true)

    // Verifica se já existe
    const { data: existing } = await supabase
      .from('medicos')
      .select('id, nome, crm')
      .eq('crm', conselhoLimpo)
      .single()

    if (existing) {
      setCadLoading(false)
      setCadErro('Este conselho já está cadastrado. Faça login.')
      return
    }

    const partes = conselhoLimpo.split('/')
    const uf = partes[1] || ''

    const { error } = await supabase.from('medicos').insert({
      nome: nome.trim(),
      crm: conselhoLimpo,
      uf,
      celular: celularDigits,
      email: email.trim().toLowerCase(),
      senha_klipbit: senha,
    })

    setCadLoading(false)

    if (error) { setCadErro('Erro ao salvar. Tente novamente.'); return }

    localStorage.setItem('medico_crm', conselhoLimpo)
    localStorage.setItem('medico_nome', nome.trim())
    setCadSucesso(true)
  }

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"

  if (cadSucesso) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center space-y-5">
          <div className="text-5xl">🧝</div>
          <h2 className="text-xl font-bold text-red-700">Bem-vindo ao RedFairy!</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Cadastro realizado com sucesso. A partir de agora, faça login com seu número de conselho e senha.
          </p>
          <button
            onClick={() => onConcluir(nome.trim(), conselho.trim().toUpperCase())}
            className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors">
            Vamos lá! →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6 relative">
      {onVoltar && (
        <button onClick={onVoltar}
          className="absolute top-4 left-4 text-white px-3 py-1 rounded-lg text-xs font-medium shadow transition-colors"
          style={{ backgroundColor: '#991b1b' }}>
          ← Voltar
        </button>
      )}
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md space-y-5">

        <div className="text-center">
          <img src={logo} alt="RedFairy"
            className="w-16 h-16 object-contain mx-auto mb-3"
            style={{ filter: "drop-shadow(0 0 12px rgba(239,68,68,0.6))" }} />
          <h2 className="text-xl font-bold text-red-700">
            {modo === 'login' ? 'Acesso Médico' : 'Primeiro Acesso'}
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            {modo === 'login' ? 'Entre com seu conselho e senha' : 'Crie seu acesso ao RedFairy'}
          </p>
        </div>

        {/* Abas login / cadastro */}
        <div className="flex rounded-xl overflow-hidden border border-gray-200">
          <button
            onClick={() => { setModo('login'); setLoginErro(''); setCadErro('') }}
            className={`flex-1 py-2 text-sm font-bold transition-colors ${modo === 'login' ? 'bg-red-700 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
            Entrar
          </button>
          <button
            onClick={() => { setModo('cadastro'); setLoginErro(''); setCadErro('') }}
            className={`flex-1 py-2 text-sm font-bold transition-colors ${modo === 'cadastro' ? 'bg-red-700 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
            Primeiro acesso
          </button>
        </div>

        {/* LOGIN */}
        {modo === 'login' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Número do Conselho/UF</label>
              <input type="text" value={loginConselho}
                onChange={e => setLoginConselho(formatarConselho(e.target.value))}
                placeholder="Ex: 6302/BA ou COREN-12345/SP"
                className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Senha</label>
              <input type="password" value={loginSenha}
                onChange={e => setLoginSenha(e.target.value)}
                placeholder="Sua senha"
                className={inputClass}
                onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            </div>
            {loginErro && <p className="text-red-500 text-sm">{loginErro}</p>}
            <button onClick={handleLogin} disabled={loginLoading}
              className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50">
              {loginLoading ? 'Verificando...' : 'Entrar →'}
            </button>
            <p className="text-center text-xs text-gray-400">
              Primeiro acesso?{' '}
              <button onClick={() => setModo('cadastro')} className="text-red-600 font-semibold hover:underline">
                Cadastre-se
              </button>
            </p>
          </div>
        )}

        {/* CADASTRO */}
        {modo === 'cadastro' && (
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-800 leading-relaxed">
              Informe seus dados para criar seu acesso. Depois entre sempre com conselho + senha.
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Nome completo</label>
              <input type="text" value={nome} onChange={e => setNome(e.target.value)}
                placeholder="Dr. João da Silva" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Número do Conselho/UF</label>
              <input type="text" value={conselho} onChange={e => setConselho(formatarConselho(e.target.value))}
                placeholder="Ex: 6302/BA ou COREN-12345/SP" className={inputClass} />
              <p className="text-xs text-gray-400 mt-0.5">Este será seu login permanente</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Celular / WhatsApp</label>
              <input type="tel" value={celular} onChange={e => setCelular(formatarCelular(e.target.value))}
                placeholder="(00) 00000-0000" inputMode="numeric" maxLength={15} className={inputClass} />
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <p className="text-green-700 text-xs font-bold mb-1">⚡ Programa de Afiliados</p>
              <p className="text-green-700 text-xs leading-relaxed">
                Ao avaliar pacientes você passa a integrar o nosso Programa de Afiliados, com suporte dos nossos patrocinadores. Ao beneficiar pacientes, você também passa a auferir benefícios.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Senha</label>
              <input type="password" value={senha} onChange={e => setSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres" className={inputClass} />
              <p className="text-xs text-gray-400 mt-0.5">Será sua senha de acesso ao RedFairy.</p>
            </div>
            {cadErro && <p className="text-red-500 text-sm">{cadErro}</p>}
            {showTC && <TermosModal onFechar={() => setShowTC(false)} />}
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={aceitoTC} onChange={e => setAceitoTC(e.target.checked)} className="mt-0.5 w-4 h-4 cursor-pointer flex-shrink-0" />
              <span className="text-xs text-gray-600">Li e aceito os{' '}
                <button type="button" onClick={() => setShowTC(true)} className="text-red-700 font-semibold hover:underline">
                  Termos e Condições de Uso
                </button>
              </span>
            </label>
            <button onClick={handleCadastro} disabled={cadLoading || !aceitoTC}
              className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50">
              {cadLoading ? 'Cadastrando...' : 'Criar acesso →'}
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

// ─── AdminConfigModal ──────────────────────────────────────────────────────
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
    await supabase.from('config').upsert({ chave: 'valor_solicitacao_medica', valor, descricao: 'Valor R$ solicitação médica' }, { onConflict: 'chave' });
    await supabase.from('config').upsert({ chave: 'valor_documento_medico', valor: valorDoc, descricao: 'Valor R$ documento médico' }, { onConflict: 'chave' });
    await supabase.from('config').upsert({ chave: 'pix_chave', valor: pixChave, descricao: 'Chave Pix' }, { onConflict: 'chave' });
    setSalvando(false);
    setSucesso('Salvo!');
    setTimeout(() => { setSucesso(''); onFechar(); }, 1500);
  }

  const inp = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onFechar}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="font-bold text-gray-700 text-sm">⚙️ Configurações</p>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>
        {loading ? <p className="text-gray-400 text-sm text-center">Carregando...</p> : (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Valor Solicitação Médica (R$)</label>
              <input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} placeholder="Ex: 50.00" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Valor Documento Médico (R$)</label>
              <input type="number" step="0.01" value={valorDoc} onChange={e => setValorDoc(e.target.value)} placeholder="Ex: 29.90" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Chave Pix</label>
              <input type="text" value={pixChave} onChange={e => setPixChave(e.target.value)} placeholder="E-mail, CPF ou código" className={inp} />
            </div>
            {sucesso && <p className="text-green-600 text-sm text-center font-bold">✅ {sucesso}</p>}
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
  const [medicoNome, setMedicoNome] = useState('')
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
  }, [modoDemo])

  function handleLogout() {
    localStorage.removeItem('medico_crm')
    localStorage.removeItem('medico_nome')
    setCadastrado(false)
    setMedicoNome('')
    setMedicoCRM('')
  }

  if (cadastrado === null) return null

  if (!cadastrado) {
    return <AuthMedico onVoltar={onVoltar} onConcluir={(nome, crm) => {
      setMedicoNome(nome)
      setMedicoCRM(crm)
      setCadastrado(true)
    }} />
  }

  return <CalculatorForm onVoltar={onVoltar} medicoNome={medicoNome} medicoCRM={medicoCRM} onLogout={handleLogout} />
}

// ─── Formulário da calculadora ───────────────────────────────────────────────
function CalculatorForm({ onVoltar, medicoNome, medicoCRM, onLogout }) {
  const [inputs, setInputs] = useState({
    cpf: '', sexo: 'M', idade: '', dataColeta: '',
    ferritina: '', hemoglobina: '', vcm: '', rdw: '', satTransf: '',
    bariatrica: false, vegetariano: false, perda: false,
    hipermenorreia: false, gestante: false, alcoolista: false,
    transfundido: false, aspirina: false, vitaminaB12: false, ferroOral: false,
    tiroxina: false, hidroxiureia: false, anticonvulsivante: false, testosterona: false, anemiaPrevia: false, sideropenia: false, sobrecargaFerro: false, hbAlta: false, celiaco: false, g6pd: false, endometriose: false, doadorSangue: false, anemiaPrevia: false, sideropenia: false, sobrecargaFerro: false, hbAlta: false, celiaco: false, g6pd: false, endometriose: false, doadorSangue: false,
    methotrexato: false, hivTratamento: false, metformina: false, ibp: false,
  });

  const [resultado, setResultado] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [showOBA, setShowOBA] = useState(false);
  const [dadosOBAColetados, setDadosOBAColetados] = useState(null);
  const [erros, setErros] = useState({});
  const [showSobre, setShowSobre] = useState(false);
  const [showSaibaMais, setShowSaibaMais] = useState(false);
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [showAdminConfig, setShowAdminConfig] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);
  const logoClickTimer = useRef(null);
  const dadosOBARef = useRef(null);

  // Dados do médico para uso no resultado (nome, crm, celular)
  const [medicoDados, setMedicoDados] = useState(null);

  useEffect(() => {
    async function carregarMedico() {
      if (!medicoCRM) return;
      const { data } = await supabase
        .from('medicos')
        .select('nome, crm, celular')
        .eq('crm', medicoCRM)
        .single();
      if (data) setMedicoDados(data);
    }
    carregarMedico();
  }, [medicoCRM]);

  function carregarDemo(sexo) {
    const hoje = new Date().toISOString().split('T')[0];
    if (sexo === 'F') {
      setInputs({ cpf: '', sexo: 'F', idade: '35', dataColeta: hoje, ferritina: '8', hemoglobina: '10.5', vcm: '72', rdw: '16.5', satTransf: '8', bariatrica: false, vegetariano: false, perda: true, hipermenorreia: false, gestante: false, alcoolista: false, transfundido: false, aspirina: false, vitaminaB12: false, ferroOral: true });
    } else {
      setInputs({ cpf: '', sexo: 'M', idade: '42', dataColeta: hoje, ferritina: '12', hemoglobina: '11.5', vcm: '75', rdw: '17', satTransf: '10', bariatrica: false, vegetariano: false, perda: true, hipermenorreia: false, gestante: false, alcoolista: false, transfundido: false, aspirina: false, vitaminaB12: false, ferroOral: true });
    }
    setResultado(null); setErros({});
    setShowDemoMenu(false);
  }

  function handleLogoTripleClick() {
    // Demo por cliques na fada desativado — use Ctrl+M/N/F/G
    setLogoClicks(prev => {
      const next = prev + 1;
      if (logoClickTimer.current) clearTimeout(logoClickTimer.current);
      if (next >= 5) {
        logoClickTimer.current = null;
        setShowAdminConfig(true);
        return 0;
      }
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
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setInputs(p => ({ ...p, sexo:'M', idade:'20', dataColeta:hoje, ferritina:'', hemoglobina:'', vcm:'', rdw:'', satTransf:'' }));
        setResultado(null); setErros({});
      }
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        setInputs(p => ({ ...p, sexo:'M', idade:'50', dataColeta:hoje, ferritina:'', hemoglobina:'', vcm:'', rdw:'', satTransf:'' }));
        setResultado(null); setErros({});
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setInputs(p => ({ ...p, sexo:'F', idade:'20', dataColeta:hoje, ferritina:'', hemoglobina:'', vcm:'', rdw:'', satTransf:'' }));
        setResultado(null); setErros({});
      }
      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        setInputs(p => ({ ...p, sexo:'F', idade:'50', dataColeta:hoje, ferritina:'', hemoglobina:'', vcm:'', rdw:'', satTransf:'' }));
        setResultado(null); setErros({});
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keydown', handleDemoKey);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keydown', handleDemoKey);
    };
  }, []);

  function formatarCPF(valor) {
    const digits = valor.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return digits.slice(0,3) + '.' + digits.slice(3);
    if (digits.length <= 9) return digits.slice(0,3) + '.' + digits.slice(3,6) + '.' + digits.slice(6);
    return digits.slice(0,3) + '.' + digits.slice(3,6) + '.' + digits.slice(6,9) + '-' + digits.slice(9);
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    const novoValor = name === 'cpf' ? formatarCPF(value) : (type === 'checkbox' ? checked : value);
    setInputs(prev => ({ ...prev, [name]: novoValor }));
    if (erros[name]) setErros(prev => ({ ...prev, [name]: null }));
    if (name === 'bariatrica') {
      if (!checked) setDadosOBAColetados(null);
    }
  }

  function validar() {
    const novosErros = {};
    if (!inputs.idade || inputs.idade < 12 || inputs.idade > 100) novosErros.idade = 'Idade inválida (12-100)';
    if (!inputs.dataColeta) novosErros.dataColeta = 'Informe a data da coleta';
    if (!inputs.ferritina)   novosErros.ferritina = 'Campo obrigatório';
    if (!inputs.hemoglobina) novosErros.hemoglobina = 'Campo obrigatório';
    if (!inputs.vcm)         novosErros.vcm = 'Campo obrigatório';
    if (!inputs.rdw)         novosErros.rdw = 'Campo obrigatório';
    if (!inputs.satTransf)   novosErros.satTransf = 'Campo obrigatório';
    return novosErros;
  }

  function sanitizarNumero(valor) {
    if (!valor && valor !== 0) return valor;
    const str = String(valor).trim();
    // Remove ponto de milhar (ex: "1.000" → "1000", "1.500" → "1500")
    // Regra: ponto seguido de exatamente 3 dígitos é milhar
    const semMilhar = str.replace(/\.(\d{3})(?!\d)/g, '$1');
    // Vírgula como decimal → ponto (ex: "13,5" → "13.5")
    const comPontoDecimal = semMilhar.replace(',', '.');
    return comPontoDecimal;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const novosErros = validar();
    if (Object.keys(novosErros).length > 0) { setErros(novosErros); return; }

    // Se bariátrico e ainda não preencheu o OBAModal → abrir agora
    if (inputs.bariatrica && !dadosOBARef.current && !dadosOBAColetados) {
      setShowOBA(true);
      return;
    }

    const inputsNumericos = {
      ...inputs,
      idade: Number(inputs.idade),
      ferritina:   Number(sanitizarNumero(inputs.ferritina)),
      hemoglobina: Number(sanitizarNumero(inputs.hemoglobina)),
      vcm:         Number(sanitizarNumero(inputs.vcm)),
      rdw:         Number(sanitizarNumero(inputs.rdw)),
      satTransf:   Number(sanitizarNumero(inputs.satTransf)),
    };

    const res = avaliarPaciente(inputsNumericos);

    let obaResult = null;
    if (inputs.bariatrica) {
      let dadosOBA = null;
      let examesOBA = null;

      const obaDisponivel = dadosOBAColetados || dadosOBARef.current;
      if (obaDisponivel) {
        dadosOBA  = obaDisponivel.dadosOBA;
        examesOBA = obaDisponivel.examesOBA;
      } else if (inputs.cpf.trim()) {
        const cpfLimpo = inputs.cpf.replace(/\D/g, '');
        const { data: obaRow } = await supabase
          .from('oba_anamnese')
          .select('*')
          .eq('cpf', cpfLimpo)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (obaRow) {
          dadosOBA = {
            sexo: obaRow.sexo, idade: inputs.idade,
            tipo_cirurgia: obaRow.tipo_cirurgia,
            meses_pos_cirurgia: obaRow.meses_pos_cirurgia,
            peso_antes: obaRow.peso_antes, peso_atual: obaRow.peso_atual,
            peso_minimo_pos: obaRow.peso_minimo_pos,
            ganhou_peso_apos: obaRow.ganhou_peso_apos,
            fez_plasma_argonio: obaRow.fez_plasma_argonio,
            status_glicemico: obaRow.status_glicemico,
            status_pressorico: obaRow.status_pressorico,
            status_osseo: obaRow.status_osseo,
            status_dental: obaRow.status_dental,
            status_gestacional: obaRow.status_gestacional,
            semanas_gestacao: obaRow.semanas_gestacao,
            compulsoes: obaRow.compulsoes || [],
            medicamentos: obaRow.medicamentos || [],
            atividade_fisica: obaRow.atividade_fisica || [],
            emagrecedores: obaRow.emagrecedores || {},
            trombose: obaRow.trombose,
            investigou_trombose: obaRow.investigou_trombose,
            usa_anticoagulante: obaRow.usa_anticoagulante,
            usou_anticoagulante: obaRow.usou_anticoagulante,
            varizes: obaRow.varizes, varizes_grau: obaRow.varizes_grau,
            varizes_esofago: obaRow.varizes_esofago,
            operou_varizes_esofago: obaRow.operou_varizes_esofago,
            meta_peso: obaRow.meta_peso, meta_kg: obaRow.meta_kg,
            projetos_vida: obaRow.projetos_vida || [],
          };
          examesOBA = {
            vitamina_b12: obaRow.vitamina_b12, vitamina_d: obaRow.vitamina_d,
            zinco: obaRow.zinco, vitamina_a: obaRow.vitamina_a,
            vitamina_e: obaRow.vitamina_e, tiamina: obaRow.tiamina,
            selenio: obaRow.selenio, folatos: obaRow.folatos,
            hb_glicada: obaRow.hb_glicada, glicemia: obaRow.glicemia,
            insulina: obaRow.insulina, triglicerides: obaRow.triglicerides,
            ast: obaRow.ast, alt: obaRow.alt, gama_gt: obaRow.gama_gt,
            creatinina: obaRow.creatinina, acido_urico: obaRow.acido_urico,
            tsh: obaRow.tsh, testosterona: obaRow.testosterona,
            estradiol: obaRow.estradiol, psa_total: obaRow.psa_total,
            ca199: obaRow.ca199, cea: obaRow.cea,
          };
        }
      }

      if (!dadosOBA) {
        dadosOBA = {
          sexo: inputs.sexo, idade: inputs.idade,
          tipo_cirurgia: 'NÃO SEI', meses_pos_cirurgia: 0,
          status_gestacional: inputs.gestante ? 'GRÁVIDA' : null,
          compulsoes: inputs.alcoolista ? ['ÁLCOOL'] : [],
          medicamentos: [
            ...(inputs.vitaminaB12 ? ['VIT. B12 SUBLINGUAL'] : []),
            ...(inputs.ferroOral   ? ['FERRO ORAL']          : []),
          ],
          atividade_fisica: [], emagrecedores: {},
        };
        examesOBA = {};
      }

      obaResult = avaliarOBA(res, dadosOBA, examesOBA);
    }

    setResultado({ ...res, _inputs: inputsNumericos, _oba: obaResult, _medicoDados: medicoDados });
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
        medico_crm: medicoCRM || null,
      });
    }

    setTimeout(() => { document.getElementById('resultado')?.scrollIntoView({ behavior: 'smooth' }); }, 100);
  }

  function handleCopiar() {
    if (!resultado) return;
    const texto = formatarParaCopiar(resultado, resultado._inputs);
    navigator.clipboard.writeText(texto).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 3000); });
  }

  function handleLimpar() {
    setInputs({ cpf: '', sexo: 'M', idade: '', dataColeta: '', ferritina: '', hemoglobina: '', vcm: '', rdw: '', satTransf: '', bariatrica: false, vegetariano: false, perda: false, hipermenorreia: false, gestante: false, alcoolista: false, transfundido: false, aspirina: false, vitaminaB12: false, ferroOral: false, tiroxina: false, hidroxiureia: false, anticonvulsivante: false, testosterona: false, anemiaPrevia: false, sideropenia: false, sobrecargaFerro: false, hbAlta: false, celiaco: false, g6pd: false, endometriose: false, doadorSangue: false, anemiaPrevia: false, sideropenia: false, sobrecargaFerro: false, hbAlta: false, celiaco: false, g6pd: false, endometriose: false, doadorSangue: false, methotrexato: false, hivTratamento: false, metformina: false, ibp: false });
    setResultado(null); setErros({}); setDadosOBAColetados(null);
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {showOBA && (
        <OBAModal
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
          onConcluir={(dadosOBA, examesOBA) => {
            const dados = { dadosOBA, examesOBA };
            dadosOBARef.current = dados;
            setDadosOBAColetados(dados);
            setShowOBA(false);
            // Chamar avaliação automaticamente com os dados OBA recém coletados
            setTimeout(() => {
              document.getElementById('btn-avaliar-paciente')?.click();
            }, 100);
          }}
          onFechar={() => setShowOBA(false)}
        />
      )}

      <header className="bg-red-700 text-white py-4 px-4 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={onVoltar}
              className="bg-red-800 hover:bg-red-900 rounded-lg px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors">
              Voltar
            </button>
            <div style={{ display:'flex', flexDirection:'column', gap:2 }} title="Atalhos de perfil demo">
              <span style={{ color:'#fca5a5', fontSize:'9px', fontFamily:'monospace', lineHeight:1.3 }}>Ctrl+M ♂20  Ctrl+B ♂50</span>
              <span style={{ color:'#fca5a5', fontSize:'9px', fontFamily:'monospace', lineHeight:1.3 }}>Ctrl+F ♀20  Ctrl+G ♀50</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <img src={logo} alt="RedFairy" className="w-8 h-8 object-contain"
              style={{ filter: 'brightness(10)', cursor: 'pointer' }}
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
            <button onClick={() => setShowLogoutConfirm(true)}
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

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setShowLogoutConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-72 space-y-4" onClick={e => e.stopPropagation()}>
            <p className="text-center text-base font-bold text-gray-700">Trocar médico?</p>
            <p className="text-center text-sm text-gray-500">Você será desconectado e voltará à tela de login.</p>
            <button onClick={() => { setShowLogoutConfirm(false); onLogout(); }}
              className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors">
              Sim, sair
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
          style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setShowDemoMenu(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-64 space-y-4" onClick={e => e.stopPropagation()}>
            <p className="text-center text-sm font-bold text-gray-700">🎭 Modo Demo</p>
            <p className="text-center text-xs text-gray-400">Escolha o perfil de teste</p>
            <button onClick={() => carregarDemo('F')} className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 rounded-xl transition-colors">👩 Paciente Feminina</button>
            <button onClick={() => carregarDemo('M')} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors">👨 Paciente Masculino</button>
            <button onClick={() => setShowDemoMenu(false)} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm py-2 rounded-xl transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      {showSobre && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => { setShowSobre(false); setShowSaibaMais(false); }}>
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl" style={{ maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ position: 'relative', width: '100%', height: '320px', overflow: 'hidden', borderRadius: '16px 16px 0 0' }}>
              <img src={heroImg} alt="RedFairy" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', padding: '20px' }}>
                <p style={{ color: '#fca5a5', fontSize: '14px', lineHeight: '1.8', fontStyle: 'italic', margin: 0, textAlign: 'center' }}>
                  Eu sou a sua fada vermelha, a sua <span style={{ fontWeight: 'bold' }}>HEMOGLOBINA</span>.<br />
                  Eu uso a poeira das estrelas para te entregar o ar.<br />
                  <span style={{ fontWeight: '600' }}>Quanto tempo você vive sem ar?</span>
                </p>
              </div>
            </div>
            <div style={{ padding: '20px' }}>
              {!showSaibaMais && (
                <button onClick={() => setShowSaibaMais(true)} className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl text-sm transition-colors mb-4">Saiba Mais</button>
              )}
              {showSaibaMais && (
                <div style={{ marginBottom: '16px' }}>
                  <h3 className="text-red-700 font-bold text-base text-center mb-4">Vida é ventilação e perfusão</h3>
                  <p className="text-gray-700 text-sm leading-relaxed mb-3">O Ferro em você veio das estrelas, e dele o vermelho do seu sangue - a sua potência. Com Ferro, a Natureza faz a <strong>Hemoglobina</strong>, a proteína vermelha e mais importante da sua vida.</p>
                  <p className="text-gray-700 text-sm leading-relaxed mb-3">Ela sustenta a ventilação e realiza a perfusão: capta o oxigênio do ar que ventila os pulmões e o entrega a todas as suas células - vinte vezes por minuto.</p>
                  <p className="text-gray-700 text-sm leading-relaxed mb-3">Ao mesmo tempo, a Hemoglobina captura o CO2 produzido pela queima do alimento em suas células, e o leva aos seus pulmões para que você o expire no ar do mundo.</p>
                  <p className="text-gray-700 text-sm leading-relaxed mb-3">No ambiente, uma proteína verde - a <strong>clorofila</strong>, mãe da Hemoglobina - usa a luz do sol para partir o CO2 e fazer açúcar a partir de luz, carbono e água, devolvendo o oxigênio ao ar do planeta, em um ciclo virtuoso perfeito.</p>
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
              <button onClick={() => { setShowSobre(false); setShowSaibaMais(false); }} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-xl text-sm transition-colors">Fechar</button>
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
                <input type="text" name="cpf" value={inputs.cpf} onChange={handleChange} placeholder="000.000.000-00" maxLength={14} inputMode="numeric" className="input" />
                <p className="text-xs text-gray-400 mt-0.5">Vincula ao paciente</p>
                <p className="text-xs text-orange-500 mt-0.5">Digite apenas os números, sem pontos ou hífen</p>
                
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
                <input type="number" name="idade" value={inputs.idade} onChange={handleChange} placeholder="12-100" min={12} max={100} className={`input ${erros.idade ? 'border-red-500' : ''}`} />
                {erros.idade && <p className="text-red-500 text-xs mt-1">{erros.idade}</p>}
              </div>
              <div>
                <label className="label">Data da Coleta</label>
                <input type="date" name="dataColeta" value={inputs.dataColeta} onChange={handleChange} className={`input ${erros.dataColeta ? 'border-red-500' : ''}`} />
                {erros.dataColeta && <p className="text-red-500 text-xs mt-1">{erros.dataColeta}</p>}
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <IconExames /> Exames Laboratoriais
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <LabInput label="Ferritina" unit="ng/mL" name="ferritina" reference={inputs.sexo === 'M' ? '24-336' : '25-150'} value={inputs.ferritina} onChange={handleChange} error={erros.ferritina} hint="Sem ponto ou vírgula. Ex: 1140" />
              <LabInput label="Hemoglobina" unit="g/dL" name="hemoglobina" reference={inputs.sexo === 'M' ? '13.5-17.5' : '12-15.5'} value={inputs.hemoglobina} onChange={handleChange} error={erros.hemoglobina} />
              <LabInput label="VCM" unit="fL" name="vcm" reference="80-100" value={inputs.vcm} onChange={handleChange} error={erros.vcm} />
              <LabInput label="RDW-CV" unit="%" name="rdw" reference="11.5-15" value={inputs.rdw} onChange={handleChange} error={erros.rdw} />
              <div className="col-span-2">
                <LabInput label="Sat. Transferrina" unit="%" name="satTransf" reference="20-50" value={inputs.satTransf} onChange={handleChange} error={erros.satTransf} />
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
              <CheckboxCard name="anemiaPrevia" label="Anemia Crônica / Prévia" sublabel="Diagnóstico anterior de anemia" checked={inputs.anemiaPrevia} onChange={handleChange} color="red" />
              <CheckboxCard name="sideropenia" label="Deficiência de Ferro" sublabel="Histórico de ferritina baixa" checked={inputs.sideropenia} onChange={handleChange} color="orange" />
              <CheckboxCard name="sobrecargaFerro" label="Excesso de Ferro / Hemocromatose" sublabel="Histórico de ferritina alta" checked={inputs.sobrecargaFerro} onChange={handleChange} color="orange" />
              <CheckboxCard name="hbAlta" label="Hemoglobina Alta / Policitemia" sublabel="Histórico de Hb elevada ou sangrias" checked={inputs.hbAlta} onChange={handleChange} color="red" />
              <CheckboxCard name="doadorSangue" label="Doador de Sangue" sublabel="Doações frequentes" checked={inputs.doadorSangue} onChange={handleChange} color="red" />
              <CheckboxCard name="celiaco" label="Celíaco" sublabel="Doença celíaca — má absorção" checked={inputs.celiaco} onChange={handleChange} color="yellow" />
              <CheckboxCard name="g6pd" label="Deficiência de G-6-PD" sublabel="Favismo — risco de hemólise" checked={inputs.g6pd} onChange={handleChange} color="purple" />
              {inputs.sexo === 'F' && (
                <>
                  <CheckboxCard name="hipermenorreia" label="Hipermenorreia" sublabel="Fluxo excessivo" checked={inputs.hipermenorreia} onChange={handleChange} color="pink" />
                  <CheckboxCard name="gestante" label="Gestante" sublabel="Gravidez atual" checked={inputs.gestante} onChange={handleChange} color="pink" />
                </>
              )}
            </div>

            {inputs.bariatrica && (
              <div className="mt-3 bg-purple-50 border border-purple-200 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-700 text-xs font-semibold">
                      🔬 Avaliação OBA {dadosOBAColetados ? '✓ dados coletados' : '— pendente'}
                    </p>
                    <p className="text-purple-600 text-xs mt-0.5">
                      {dadosOBAColetados
                        ? `${dadosOBAColetados.dadosOBA.tipo_cirurgia} · ${dadosOBAColetados.dadosOBA.meses_pos_cirurgia} meses pós-op`
                        : 'Preencha a anamnese para ativar os 13 módulos clínicos.'}
                    </p>
                  </div>
                  <button type="button" onClick={() => setShowOBA(true)}
                    className="ml-3 flex-shrink-0 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                    {dadosOBAColetados ? 'Editar' : 'Preencher'}
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <IconMedicamentos /> Medicamentos / Suplementos
            </h2>
            <p className="text-xs text-gray-400 mb-2">Marque os que o paciente usa ou usou recentemente</p>
            <div className="grid grid-cols-2 gap-2">
              <CheckboxCard name="aspirina" label="Aspirina" sublabel="Uso contínuo" checked={inputs.aspirina} onChange={handleChange} color="orange" />
              <CheckboxCard name="vitaminaB12" label="Vitamina B12" sublabel="Últimos 3 meses" checked={inputs.vitaminaB12} onChange={handleChange} color="purple" />
              <CheckboxCard name="ferroOral" label="Ferro Oral / Injetável" sublabel="Nos últimos 2 anos" checked={inputs.ferroOral} onChange={handleChange} color="orange" />
              <CheckboxCard name="testosterona" label="Testosterona / Anabolizante" sublabel="Uso exógeno — causa eritrocitose" checked={inputs.testosterona} onChange={handleChange} color="orange" />
                            <CheckboxCard name="tiroxina" label="Tiroxina / T4" sublabel="Tratamento tireoidiano" checked={inputs.tiroxina} onChange={handleChange} color="teal" />
                            <CheckboxCard name="methotrexato" label="Metotrexato" sublabel="Antagonista do folato" checked={inputs.methotrexato} onChange={handleChange} color="purple" />
                            <CheckboxCard name="hivTratamento" label="Trat. HIV / ARV" sublabel="Antirretrovirais" checked={inputs.hivTratamento} onChange={handleChange} color="purple" />
              <CheckboxCard name="hidroxiureia" label="Hidroxiureia" sublabel="Pode causar macrocitose" checked={inputs.hidroxiureia} onChange={handleChange} color="purple" />
              <CheckboxCard name="anticonvulsivante" label="Anticonvulsivante" sublabel="Fenitoína, VPA etc." checked={inputs.anticonvulsivante} onChange={handleChange} color="purple" />
            </div>
          </section>

          <div className="flex gap-3">
            <button id="btn-avaliar-paciente" type="submit" className="flex-1 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-bold py-4 px-6 rounded-xl transition-colors shadow-md text-base">
              Avaliar Paciente
            </button>
            <button type="button" onClick={handleLimpar} className="bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-700 font-medium py-4 px-5 rounded-xl transition-colors">
              Limpar
            </button>
          </div>

        </form>

        {resultado && (
          <div id="resultado" className="mt-6">
            {/* modoPaciente=false — modo médico nunca exibe módulo de documentos */}
            <ResultCard
              resultado={resultado}
              onCopiar={handleCopiar}
              copiado={copiado}
              modoPaciente={false}
              medicoNome={medicoNome}
              medicoCRM={medicoCRM}
              medicoDados={medicoDados}
            />
          </div>
        )}
      </main>
    </div>
  );
}

function LabInput({ label, unit, name, reference, value, onChange, error, hint }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">
        {label} <span className="text-xs text-gray-400">({unit})</span>
      </label>
      <input type="text" inputMode="decimal" name={name} value={value} onChange={onChange} placeholder="0"
        className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 ${error ? 'border-red-500' : 'border-gray-200'}`} />
      <p className="text-xs text-gray-400 mt-0.5">Ref: {reference}</p>
      {hint && <p className="text-xs text-orange-500 mt-0.5">{hint}</p>}
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
  blue:   'border-blue-400   bg-blue-50   text-blue-700',
  teal:   'border-teal-400   bg-teal-50   text-teal-700',
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
