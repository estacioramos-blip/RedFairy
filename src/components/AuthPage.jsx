import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import logo from '../assets/logo.png'


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

export default function AuthPage({ onVoltar }) {
  const [etapa, setEtapa] = useState('cpf')
  const [cpf, setCpf] = useState('')
  const [email, setEmail] = useState('')
  const [emailConfirm, setEmailConfirm] = useState('')
  const [senha, setSenha] = useState('')
  const [senhaConfirm, setSenhaConfirm] = useState('')
  const [nome, setNome] = useState('')
  const [sexo, setSexo] = useState('F')
  const [dataNascimento, setDataNascimento] = useState('')
  const [celular, setCelular] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [avaliacoesPendentes, setAvaliacoesPendentes] = useState(0)
  const [aceitoTC, setAceitoTC] = useState(false)
  const [showTC, setShowTC] = useState(false)

  const emailOk = emailConfirm && email === emailConfirm
  const emailErro = emailConfirm && email !== emailConfirm
  const senhaOk = senhaConfirm && senha === senhaConfirm
  const senhaErro = senhaConfirm && senha !== senhaConfirm

  // Atalho secreto Ctrl+Shift+P — pula para cadastro sem CPF
  useEffect(() => {
    function handleKey(e) {
      if (e.ctrlKey && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault()
        setCpf('00000000000')
        setAvaliacoesPendentes(0)
        setEtapa('cadastro')
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  function formatarCelular(valor) {
    const digits = valor.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 2) return `(${digits}`
    if (digits.length <= 7) return `(${digits.slice(0,2)}) ${digits.slice(2)}`
    return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`
  }

  function formatarDataNascimento(valor) {
    const digits = valor.replace(/\D/g, '').slice(0, 8)
    if (digits.length <= 2) return digits
    if (digits.length <= 4) return digits.slice(0,2) + '/' + digits.slice(2)
    return digits.slice(0,2) + '/' + digits.slice(2,4) + '/' + digits.slice(4)
  }

  function formatarCPF(valor) {
    const digits = valor.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return digits.slice(0,3) + '.' + digits.slice(3);
    if (digits.length <= 9) return digits.slice(0,3) + '.' + digits.slice(3,6) + '.' + digits.slice(6);
    return digits.slice(0,3) + '.' + digits.slice(3,6) + '.' + digits.slice(6,9) + '-' + digits.slice(9);
  }

  async function handleCPF() {
    if (!cpf.trim()) { setErro('Informe o CPF.'); return }
    setLoading(true)
    setErro('')
    const cpfLimpo = cpf.replace(/\D/g, '')

    const { data: perfil } = await supabase
      .from('profiles').select('id').eq('cpf', cpfLimpo).single()

    const { count } = await supabase
      .from('avaliacoes')
      .select('*', { count: 'exact', head: true })
      .eq('cpf', cpfLimpo)
      .is('user_id', null)

    setAvaliacoesPendentes(count || 0)
    setEtapa(perfil ? 'login' : 'cadastro')
    setLoading(false)
  }

  async function handleLogin() {
    setLoading(true)
    setErro('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) { setErro('E-mail ou senha incorretos.'); setLoading(false); return }

    if (data.user && avaliacoesPendentes > 0) {
      const cpfLimpo = cpf.replace(/\D/g, '')
      await supabase.from('avaliacoes')
        .update({ user_id: data.user.id })
        .eq('cpf', cpfLimpo)
        .is('user_id', null)
    }
    setLoading(false)
  }

  async function handleCadastro() {
    if (!aceitoTC) { setErro('Você deve aceitar os Termos e Condições para criar conta.'); return }
    if (!emailOk) { setErro('Os e-mails não coincidem.'); return }
    if (!senhaOk) { setErro('As senhas não coincidem.'); return }
    if (!celular || celular.replace(/\D/g, '').length < 10) {
      setErro('Informe um celular válido com DDD.'); return
    }
    setLoading(true)
    setErro('')

    const { data, error } = await supabase.auth.signUp({ email, password: senha })
    if (error) {
      if (error.message.includes('after')) setErro('Por segurança, aguarde alguns segundos.')
      else if (error.message.includes('already registered')) setErro('E-mail já cadastrado. Tente fazer login.')
      else if (error.message.includes('Password')) setErro('A senha deve ter pelo menos 6 caracteres.')
      else setErro('Erro ao cadastrar. Tente novamente.')
      setLoading(false); return
    }

    if (data.user) {
      const cpfLimpo = cpf.replace(/\D/g, '')
      const partes = dataNascimento.split('/')
      const dataFormatada = partes.length === 3
        ? `${partes[2]}-${partes[1].padStart(2,'0')}-${partes[0].padStart(2,'0')}`
        : dataNascimento

      await supabase.from('profiles').insert({
        id: data.user.id,
        nome,
        sexo,
        data_nascimento: dataFormatada,
        cpf: cpfLimpo,
        celular: celular.replace(/\D/g, ''),
      })

      if (avaliacoesPendentes > 0) {
        await supabase.from('avaliacoes')
          .update({ user_id: data.user.id })
          .eq('cpf', cpfLimpo)
          .is('user_id', null)
      }
    }
    setSucesso('Cadastro realizado! Verifique seu e-mail para confirmar.')
    setLoading(false)
  }

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6 relative">

      <button onClick={onVoltar}
        className="absolute top-4 left-4 text-white px-3 py-1 rounded-lg text-xs font-medium shadow transition-colors"
        style={{ backgroundColor: '#991b1b' }}>
        Voltar
      </button>

      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">

        <div className="text-center mb-6">
          <img src={logo} alt="RedFairy"
            className="w-16 h-16 object-contain mx-auto mb-2"
            style={{ filter: "drop-shadow(0 0 12px rgba(239,68,68,0.6))" }} />
          <h2 className="text-2xl font-bold text-red-700">RedFairy</h2>
          <p className="text-gray-500 text-sm">Modo Paciente</p>
        </div>

        {/* ETAPA 1 — CPF */}
        {etapa === 'cpf' && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
              <p className="text-red-700 text-sm font-medium">Entre com seu CPF para começar</p>
              <p className="text-gray-500 text-xs mt-1">Verificamos se seu médico já fez uma avaliação para você</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">CPF</label>
              <input type="text" value={cpf}
                onChange={e => { setCpf(formatarCPF(e.target.value)); setErro('') }}
                placeholder="000.000.000-00" maxLength={14} inputMode="numeric"
                className={inputClass} />
            </div>
            {erro && <p className="text-red-500 text-sm">{erro}</p>}
            <button onClick={handleCPF} disabled={loading}
              className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors">
              {loading ? 'Verificando...' : 'Continuar'}
            </button>
          </div>
        )}

        {/* ETAPA 2 — LOGIN */}
        {etapa === 'login' && (
          <div className="space-y-4">
            {avaliacoesPendentes > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <p className="text-green-700 text-sm font-bold">🎉 Encontramos {avaliacoesPendentes} avaliação{avaliacoesPendentes > 1 ? 'ões' : ''} do seu médico!</p>
                <p className="text-green-600 text-xs mt-1">Entre com sua conta para acessá-la{avaliacoesPendentes > 1 ? 's' : ''}.</p>
              </div>
            )}
            <p className="text-center text-gray-500 text-sm">Bem-vindo de volta! Entre com sua senha.</p>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Senha</label>
              <input type="password" value={senha} onChange={e => setSenha(e.target.value)} className={inputClass} />
            </div>
            {erro && <p className="text-red-500 text-sm">{erro}</p>}
            <button onClick={handleLogin} disabled={loading}
              className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors">
              {loading ? 'Aguarde...' : 'Entrar'}
            </button>
            <button onClick={() => { setEtapa('cpf'); setErro('') }}
              className="w-full text-gray-400 text-sm hover:text-gray-600 transition-colors">
              ← Voltar
            </button>
          </div>
        )}

        {/* ETAPA 3 — CADASTRO */}
        {etapa === 'cadastro' && (
          <div className="space-y-4">
            {avaliacoesPendentes > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <p className="text-green-700 text-sm font-bold">🎉 Encontramos {avaliacoesPendentes} avaliação{avaliacoesPendentes > 1 ? 'ões' : ''} do seu médico!</p>
                <p className="text-green-600 text-xs mt-1">Crie sua conta para acessá-la{avaliacoesPendentes > 1 ? 's' : ''} e acompanhar sua evolução.</p>
              </div>
            )}
            {avaliacoesPendentes === 0 && (
              <p className="text-center text-gray-500 text-sm">Crie sua conta para acompanhar sua evolução.</p>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Nome completo</label>
              <input type="text" value={nome} onChange={e => setNome(e.target.value)} className={inputClass} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Sexo</label>
                <select value={sexo} onChange={e => setSexo(e.target.value)} className={inputClass}>
                  <option value="F">Feminino</option>
                  <option value="M">Masculino</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Data de nascimento</label>
                <input type="text" value={dataNascimento}
                  onChange={e => setDataNascimento(formatarDataNascimento(e.target.value))}
                  placeholder="DD/MM/AAAA" maxLength={10} inputMode="numeric"
                  className={inputClass} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Celular (WhatsApp)</label>
              <input type="tel" value={celular}
                onChange={e => setCelular(formatarCelular(e.target.value))}
                placeholder="(00) 00000-0000" inputMode="numeric" maxLength={15}
                className={inputClass} />
              <p className="text-xs text-gray-400 mt-1">Necessário para receber documentos médicos via WhatsApp</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} />
            </div>
            {email && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Confirme o e-mail</label>
                <input type="email" value={emailConfirm}
                  onChange={e => setEmailConfirm(e.target.value)}
                  className={`${inputClass} ${emailErro ? 'border-red-400' : emailOk ? 'border-green-400' : ''}`} />
                {emailErro && <p className="text-red-500 text-xs mt-1">Os e-mails não coincidem.</p>}
                {emailOk && <p className="text-green-500 text-xs mt-1">✓ E-mails conferem.</p>}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Senha</label>
              <input type="password" value={senha} onChange={e => setSenha(e.target.value)} className={inputClass} />
            </div>
            {senha && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Confirme a senha</label>
                <input type="password" value={senhaConfirm}
                  onChange={e => setSenhaConfirm(e.target.value)}
                  className={`${inputClass} ${senhaErro ? 'border-red-400' : senhaOk ? 'border-green-400' : ''}`} />
                {senhaErro && <p className="text-red-500 text-xs mt-1">As senhas não coincidem.</p>}
                {senhaOk && <p className="text-green-500 text-xs mt-1">✓ Senhas conferem.</p>}
              </div>
            )}

            {erro && <p className="text-red-500 text-sm">{erro}</p>}
            {sucesso && <p className="text-green-600 text-sm">{sucesso}</p>}

            {showTC && <TermosModal onFechar={() => setShowTC(false)} />}
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={aceitoTC} onChange={e => setAceitoTC(e.target.checked)} className="mt-0.5 w-4 h-4 cursor-pointer flex-shrink-0" />
              <span className="text-xs text-gray-600">Li e aceito os{' '}
                <button type="button" onClick={() => setShowTC(true)} className="text-red-700 font-semibold hover:underline">
                  Termos e Condições de Uso
                </button>
              </span>
            </label>
            <button onClick={handleCadastro} disabled={loading || !emailOk || !senhaOk || !aceitoTC}
              className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Aguarde...' : 'Criar conta'}
            </button>
            <button onClick={() => { setEtapa('cpf'); setErro('') }}
              className="w-full text-gray-400 text-sm hover:text-gray-600 transition-colors">
              ← Voltar
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
