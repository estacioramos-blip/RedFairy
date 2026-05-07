import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import logo from '../assets/logo.png'



function TermosModal({ onFechar }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onFechar}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight:'85vh' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <p className="font-bold text-red-700 text-sm">Termos e Condições de Uso — Pacientes</p>
            <p className="text-gray-400 text-xs">RedFairy — Versão 1.0 — Abril de 2026</p>
          </div>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
        </div>
        <div className="overflow-y-auto p-5 text-xs text-gray-700 leading-relaxed space-y-4">
          <p className="font-bold text-red-700 uppercase tracking-wide mb-1">Termos e Condições de Uso — Pacientes</p>
          <p><strong>1. O que é o RedFairy.</strong> Ferramenta de saúde digital que analisa parâmetros laboratoriais do eritron e gera orientações personalizadas. NÃO é um serviço médico e NÃO emite diagnósticos definitivos. Não substitui consulta médica presencial ou teleconsulta.</p>
          <p><strong>2. Elegibilidade.</strong> Maiores de 12 anos. Menores de 18 anos somente com autorização expressa de responsáveis legais.</p>
          <p><strong>3. Como Funciona.</strong> Você insere dados laboratoriais e de contexto clínico, e o algoritmo gera orientações baseadas em evidências. Quando necessário, médico hematologista da plataforma, ou médicos parceiros associados podem ser acionados para aprimorar as recomendações via teleconsulta subsidiada.</p>
          <p><strong>4. Pedidos de Exames e Prescrições.</strong> Se o usuário solicitar um pedido de exames ou prescrição médica com base no resultado da avaliação, um médico avaliará criticamente o resultado do algoritmo e, se concordar, emitirá os documentos mediante o pagamento das taxas cobradas pela plataforma. Por medida de segurança, o médico poderá solicitar uma teleconsulta com o paciente, sem ônus para este.</p>
          <p><strong>5. Responsabilidade do Usuário.</strong> Você é responsável pela integridade e veracidade dos dados inseridos. Decisões de saúde devem ser tomadas em conjunto com profissional de saúde habilitado. Em emergências, procure serviço de urgência imediatamente.</p>
          <p><strong>6. Dados e Privacidade — LGPD.</strong> Seus dados pessoais e de saúde são tratados em conformidade com a Lei nº 13.709/2018 (LGPD). Não são vendidos a terceiros nem usados para fins publicitários. Você pode solicitar acesso, correção ou exclusão a qualquer momento pelo e-mail: contato@redfairy.bio.</p>
          <p><strong>7. Segurança.</strong> Seus dados são armazenados em servidores seguros com criptografia. O acesso é protegido por autenticação individual.</p>
          <p><strong>8. Limitação de Responsabilidade.</strong> O RedFairy e a Cytomica não se responsabilizam por decisões de saúde tomadas exclusivamente com base nos resultados gerados pela plataforma, sem consulta a profissional habilitado.</p>
          <p><strong>9. Alterações.</strong> Estes termos podem ser atualizados. Você será notificado por e-mail com antecedência mínima de 15 dias.</p>
          <p><strong>10. Foro.</strong> Comarca de Salvador, Estado da Bahia. Lei aplicável: LGPD e Código de Defesa do Consumidor.</p>
          <p className="text-gray-400 text-center text-xs">cytomica.com | redfairy.bio | contato@redfairy.bio</p>
        </div>
        <div className="p-4 border-t border-gray-100">
          <button onClick={onFechar} className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">Fechar</button>
        </div>
      </div>
    </div>
  )
}


export default function AuthPage({ onVoltar, onDemoEntrar, cpfInicial = '', etapaInicial = 'cpf', sexoInicial = '', dataNascimentoInicial = '' }) {
  const [etapa, setEtapa] = useState(etapaInicial)
  const [cpf, setCpf] = useState(cpfInicial)
  const [email, setEmail] = useState('')
  const [emailConfirm, setEmailConfirm] = useState('')
  const [senha, setSenha] = useState('')
  const [senhaConfirm, setSenhaConfirm] = useState('')
  const [nome, setNome] = useState('')
  const [sexo, setSexo] = useState(sexoInicial || 'F')
  const [dataNascimento, setDataNascimento] = useState(dataNascimentoInicial || '')
  // Flag: dados de identidade vieram da triagem (esconde campos editaveis)
  const dadosVemDaTriagem = !!(sexoInicial && dataNascimentoInicial)
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
        setAceitoTC(true)
        setAvaliacoesPendentes(0)
        setEtapa('cadastro')
      }
    }
    function handleDemoKey(e) {
      if (!e.ctrlKey || e.shiftKey || e.altKey) return
      const entrarComoDemo = (sx, idade) => {
        e.preventDefault()
        const nomeDemo = sx === 'M'
          ? (idade <= 30 ? 'Paciente Demo Masculino Jovem' : 'Paciente Demo Masculino Sênior')
          : (idade <= 30 ? 'Paciente Demo Feminino Jovem' : 'Paciente Demo Feminino Sênior')
        const nascAno = new Date().getFullYear() - idade
        const perfil = {
          nome: nomeDemo,
          sexo: sx,
          data_nascimento: `${nascAno}-01-01`,
          cpf: '00000000000',
          celular: '71999999999',
        }
        onDemoEntrar && onDemoEntrar(perfil)
      }
      if (e.key === 'm' || e.key === 'M') entrarComoDemo('M', 20)
      if (e.key === 'b' || e.key === 'B') entrarComoDemo('M', 50)
      if (e.key === 'f' || e.key === 'F') entrarComoDemo('F', 20)
      if (e.key === 'g' || e.key === 'G') entrarComoDemo('F', 50)
    }
        window.addEventListener('keydown', handleKey)
    window.addEventListener('keydown', handleDemoKey)
    return () => {
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('keydown', handleDemoKey)
    }
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

    // Usa RPC publica lookup_cpf_triagem (sem RLS) para checar se ja existe profile
    const { data: lookupData } = await supabase.rpc('lookup_cpf_triagem', { cpf_input: cpfLimpo })
    const perfil = lookupData?.find?.(r => r.origem === 'profile') || null

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

      // Cria assinatura ativa (1 ano). Quando integrar Stripe, status comeca como 'pendente'
      const dataFim = new Date()
      dataFim.setFullYear(dataFim.getFullYear() + 1)
      await supabase.from('assinaturas').insert({
        user_id: data.user.id,
        status: 'ativa',
        data_fim: dataFim.toISOString(),
      })

      if (avaliacoesPendentes > 0) {
        await supabase.from('avaliacoes')
          .update({ user_id: data.user.id })
          .eq('cpf', cpfLimpo)
          .is('user_id', null)
      }
      // Vincular triagens orfas (feitas como guest) ao novo user_id
      await supabase.from('triagens')
        .update({ user_id: data.user.id })
        .eq('cpf', cpfLimpo)
        .is('user_id', null)
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
            <div style={{ position:'absolute', bottom:8, right:12, display:'flex', flexDirection:'column', gap:1 }}>
              <span style={{ color:'rgba(156,163,175,0.6)', fontSize:'8px', fontFamily:'monospace' }}>Ctrl+M ♂20  Ctrl+B ♂50</span>
              <span style={{ color:'rgba(156,163,175,0.6)', fontSize:'8px', fontFamily:'monospace' }}>Ctrl+F ♀20  Ctrl+G ♀50</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">CPF</label>
              <input type="text" value={cpf}
                onChange={e => { setCpf(formatarCPF(e.target.value)); setErro('') }}
                placeholder="000.000.000-00" maxLength={14} inputMode="numeric"
                autoComplete="off"
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
              <input type="email" value={email} onChange={e => setEmail(e.target.value.toLowerCase())} className={inputClass} autoComplete="off" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Senha</label>
              <input type="password" value={senha} onChange={e => setSenha(e.target.value)} className={inputClass} autoComplete="new-password" />
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
              <input type="text" value={nome} onChange={e => setNome(e.target.value)} className={inputClass} autoComplete="off" />
            </div>

            {dadosVemDaTriagem ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <p className="text-xs text-gray-500 mb-1">Dados informados na triagem</p>
                <p className="text-sm text-gray-700">
                  <strong>{sexo === 'F' ? 'Feminino' : 'Masculino'}</strong>
                  {' • '}
                  <strong>{(() => {
                    const v = String(dataNascimento || '');
                    if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
                      const [a, m, d] = v.slice(0, 10).split('-');
                      return `${d}/${m}/${a}`;
                    }
                    return v;
                  })()}</strong>
                </p>
              </div>
            ) : (
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
            )}

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Celular (WhatsApp)</label>
              <input type="tel" value={celular}
                onChange={e => setCelular(formatarCelular(e.target.value))}
                placeholder="(00) 00000-0000" inputMode="numeric" maxLength={15}
                autoComplete="off"
                className={inputClass} />
              <p className="text-xs text-gray-400 mt-1">Necessário para receber documentos médicos via WhatsApp</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value.toLowerCase())} className={inputClass} autoComplete="off" />
            </div>
            {email && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Confirme o e-mail</label>
                <input type="email" value={emailConfirm}
                  onChange={e => setEmailConfirm(e.target.value.toLowerCase())}
                  className={`${inputClass} ${emailErro ? 'border-red-400' : emailOk ? 'border-green-400' : ''}`}
                  autoComplete="off" />
                {emailErro && <p className="text-red-500 text-xs mt-1">Os e-mails não coincidem.</p>}
                {emailOk && <p className="text-green-500 text-xs mt-1">✓ E-mails conferem.</p>}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Senha</label>
              <input type="password" value={senha} onChange={e => setSenha(e.target.value)} className={inputClass} autoComplete="new-password" />
            </div>
            {senha && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Confirme a senha</label>
                <input type="password" value={senhaConfirm}
                  onChange={e => setSenhaConfirm(e.target.value)}
                  className={`${inputClass} ${senhaErro ? 'border-red-400' : senhaOk ? 'border-green-400' : ''}`}
                  autoComplete="new-password" />
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
