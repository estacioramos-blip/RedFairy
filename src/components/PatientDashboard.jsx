import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { avaliarPaciente, triagemEritron, formatarParaCopiar } from '../engine/decisionEngine'
import ResultCard from './ResultCard'
import OBAModal from './OBAModal'
import PlayButton from './PlayButton'
import CompletarPerfilModal from './CompletarPerfilModal'
import PagamentoCadastroModal from './PagamentoCadastroModal'
import HistoricoChartModal from './HistoricoChartModal'
import heroImg from '../assets/redfairy-hero.jpg'
import telefonista3Img from '../assets/telefonista3.jpg'
import logo from '../assets/logo.png'

// Classes Tailwind por cor dos cards de checkbox (paridade com o CheckboxCard do
// formulário do médico). Mantido fora do componente p/ não recriar a cada render.
const CORES_CARD = {
  green:  'border-green-400 bg-green-50 text-green-700',
  red:    'border-red-400 bg-red-50 text-red-700',
  amber:  'border-amber-400 bg-amber-50 text-amber-700',
  orange: 'border-orange-400 bg-orange-50 text-orange-700',
  yellow: 'border-yellow-400 bg-yellow-50 text-yellow-700',
  purple: 'border-purple-400 bg-purple-50 text-purple-700',
  pink:   'border-pink-400 bg-pink-50 text-pink-700',
  teal:   'border-teal-400 bg-teal-50 text-teal-700',
}

export default function PatientDashboard({ session, onVoltar, demoPerfil, abrirOBA }) {
  const [profile, setProfile] = useState(null)
  const [avaliacoes, setAvaliacoes] = useState([])
  const [tela, setTela] = useState('historico')
  const [showBoasVindas, setShowBoasVindas] = useState(false)
  const [showCompletarPerfil, setShowCompletarPerfil] = useState(false)
  const [showPagamento, setShowPagamento] = useState(false)
  const [querPedidoGratis, setQuerPedidoGratis] = useState(false)
  const [salvandoBoasVindas, setSalvandoBoasVindas] = useState(false)
  const [mostrarDespedida, setMostrarDespedida] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [copiado, setCopiado] = useState(false)
  // Pedido grátis: "um por paciente". Governa o card opt-in dos exames sugeridos.
  const [jaTemPedidoGratis, setJaTemPedidoGratis] = useState(false)
  const [pedidoExamesEnviado, setPedidoExamesEnviado] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showSobre, setShowSobre] = useState(false)
  const [showOBAModal, setShowOBAModal] = useState(false)
  const [precisaOBA, setPrecisaOBA] = useState(false)  // bariátrico sem anamnese OBA → banner persistente
  const [showSaibaMais, setShowSaibaMais] = useState(false)
  const [fraseGestacaoConcluida, setFraseGestacaoConcluida] = useState(false)
  const [mostrarExamesExtras, setMostrarExamesExtras] = useState(false)
  // Hemograma de ENTRADA (triagem ainda não aprofundada): governa o "primeiro
  // acesso" — esconde a barra Histórico/Nova e traz os dados da triagem travados.
  const [entradaPendente, setEntradaPendente] = useState(false)
  const [dadosVieramDaEntrada, setDadosVieramDaEntrada] = useState(false)

  // Modal do grafico de evolucao (Hb/VCM/RDW + Ferritina/Sat) reutiliza o
  // HistoricoChartModal usado pelo TriagemModal no modo medico.
  const [historicoData, setHistoricoData] = useState(null)
  const [historicoBuscando, setHistoricoBuscando] = useState(false)
  const [historicoMsg, setHistoricoMsg] = useState('')

  const [inputs, setInputs] = useState({
    sexo: '', idade: '', peso: '',
    dataColeta: '', ferritina: '', hemoglobina: '',
    vcm: '', rdw: '', satTransf: '',
    bariatrica: false, vegetariano: false, perda: false,
    hipermenorreia: false, gestante: false, semanas_gestacao: '', dum: '',
    // Histórico clínico completo (paridade com o formulário do médico)
    alcoolista: false, transfundido: false, anemiaPrevia: false, sideropenia: false,
    sobrecargaFerro: false, hbAlta: false, doadorSangue: false, celiaco: false, g6pd: false,
    // Medicamentos / suplementos completo
    aspirina: false, vitaminaB12: false, vitB12_SL: false, vitB12_IM: false,
    ferro_oral: false, ferro_injetavel: false, testosterona: false, tiroxina: false,
    methotrexato: false, hivTratamento: false, hidroxiureia: false, anticonvulsivante: false,
  })

  useEffect(() => { carregarDados(true) }, [])

  // (Removido) Antes, ter >=1 avaliação destravava Ferritina/Saturação direto e
  // escondia o botão azul "aprofundar". Isso quebrava o primeiro acesso: o paciente
  // chegava sem o botão e sem os dados da triagem. Agora o formulário sempre começa
  // com Ferritina/Saturação travadas + botão azul, exatamente como no modo médico.

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

  useEffect(() => {
    if (!profile) return
    const idadeProfile = profile.data_nascimento ? calcularIdade(profile.data_nascimento) : ''
    setInputs(prev => ({
      ...prev,
      sexo: profile.sexo || prev.sexo || '',
      idade: idadeProfile ? String(idadeProfile) : (prev.idade || ''),
      bariatrica: !!profile.bariatrica,
    }))
  }, [profile])

  async function carregarDados(inicial = false) {
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
    let prof = null
    const delays = [0, 250, 600, 1200]
    for (const d of delays) {
      if (d > 0) await new Promise(r => setTimeout(r, d))
      const { data } = await supabase
        .from('profiles')
        .select('id, nome, cpf, sexo, data_nascimento, celular, bariatrica, gestante, boas_vindas_vista')
        .eq('id', session.user.id).maybeSingle()
      if (data) { prof = data; break }
    }
    if (!prof) {
      console.warn('[PatientDashboard] profile nao encontrado apos retries; signOut')
      await supabase.auth.signOut()
      onVoltar()
      return
    }
    setProfile(prof)
    // Perfil incompleto (paciente recem-cadastrado): pede dados pessoais antes de tudo
    if (prof && (!prof.nome || String(prof.nome).trim().length < 3)) {
      setShowCompletarPerfil(true)
    } else if (prof && prof.boas_vindas_vista === false) {
      // So mostra boas-vindas se ja completou perfil E ja tem assinatura ativa.
      // Senao, o BoasVindas e disparado manualmente apos o pagamento (onPago).
      const { data: assin } = await supabase
        .from('assinaturas')
        .select('id')
        .eq('user_id', prof.id)
        .eq('status', 'ativa')
        .maybeSingle()
      if (assin) {
        setShowBoasVindas(true)
      }
    }
    localStorage.removeItem('rf_flag')
    // Bariátrico com perfil completo e boas-vindas já vistas (login de retorno):
    // abre a anamnese OBA direto se ainda não preencheu.
    if (prof.nome && String(prof.nome).trim().length >= 3 && prof.boas_vindas_vista !== false) {
      verificarEAbrirOBA(prof)
    }
    const { data: avals } = await supabase
      .from('avaliacoes').select('*')
      .eq('user_id', session.user.id)
      .order('data_coleta', { ascending: false })
    setAvaliacoes(avals || [])
    // Pedido grátis já usado? (primeiro pedido = valor_total 0). Se sim, o card
    // opt-in de exames sugeridos na tela de resultado não aparece.
    const { count: pedidosGratisCount } = await supabase
      .from('pedidos_documento')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', prof.id)
      .eq('valor_total', 0)
    setJaTemPedidoGratis((pedidosGratisCount || 0) > 0)
    // Persistência da flag bariátrica: "uma vez bariátrico, sempre bariátrico".
    // O status era gravado só na linha de avaliacoes, nunca de volta no perfil —
    // por isso, ao relogar, a nova avaliação vinha SEM o bariátrico marcado e o
    // fluxo OBA não disparava. Aqui, se alguma avaliação já marcou bariátrica e o
    // perfil ainda não reflete, gravamos em profiles.bariatrica. O setProfile
    // reaplica o efeito que pré-marca o checkbox da nova avaliação.
    if (!prof.bariatrica && (avals || []).some(a => a.bariatrica)) {
      await supabase.from('profiles').update({ bariatrica: true }).eq('id', prof.id)
      setProfile(p => (p ? { ...p, bariatrica: true } : p))
    }
    // HEMOGRAMA DE ENTRADA (só na carga inicial): a triagem que o paciente fez antes
    // de pagar fica na tabela `triagens` (com data_coleta). Se essa entrada ainda NÃO
    // virou uma avaliação completa (não há avaliação com a MESMA data), trazemos
    // Hb/VCM/RDW + a data para o formulário e deixamos o paciente "aprofundar"
    // (destravar Ferritina/Saturação no botão azul), igual ao fluxo do médico.
    // Usa a DATA, não a contagem — robusto a CPFs de teste com avaliações antigas.
    if (prof.cpf) {
      const cpfDigits = String(prof.cpf).replace(/\D/g, '')
      if (cpfDigits.length === 11) {
        const { data: entrada } = await supabase
          .from('triagens')
          .select('data_coleta, hemoglobina, vcm, rdw, gestante, bariatrica, semanas_gestacao')
          .eq('cpf', cpfDigits)
          .order('data_coleta', { ascending: false })
          .limit(1)
          .maybeSingle()
        // "Aprofundada" = existe avaliação NA MESMA DATA já COM Ferritina. Atenção:
        // a triagem, se o paciente já estava logado, cria um espelho em `avaliacoes`
        // com ferritina=null — esse espelho NÃO conta como aprofundado.
        const pendente = !!entrada &&
          !(avals || []).some(a => a.data_coleta === entrada.data_coleta && a.ferritina != null)
        setEntradaPendente(pendente)
        if (inicial && pendente) {
          setDadosVieramDaEntrada(true)
          setInputs(prev => ({
            ...prev,
            dataColeta: prev.dataColeta || entrada.data_coleta || '',
            hemoglobina: prev.hemoglobina || (entrada.hemoglobina != null ? String(entrada.hemoglobina) : ''),
            vcm: prev.vcm || (entrada.vcm != null ? String(entrada.vcm) : ''),
            rdw: prev.rdw || (entrada.rdw != null ? String(entrada.rdw) : ''),
            bariatrica: !!entrada.bariatrica,
            gestante: !!entrada.gestante,
            semanas_gestacao: prev.semanas_gestacao || (entrada.semanas_gestacao != null ? String(entrada.semanas_gestacao) : ''),
          }))
          // Perfil completo e boas-vindas já vistas (login de retorno) → leva direto
          // ao formulário. No 1º acesso quem faz isso é o CONTINUAR das boas-vindas.
          if (prof.nome && String(prof.nome).trim().length >= 3 && prof.boas_vindas_vista === true) {
            setTela('nova')
          }
        }
      } else {
        setEntradaPendente(false)
      }
    }
    // Reabre o OBA se ele estava aberto antes de uma remontagem (foco da aba/reload):
    // assim o paciente NÃO perde o que estava preenchendo (o OBAModal restaura o
    // conteúdo do localStorage). A flag é limpa ao fechar/concluir o modal.
    try {
      const obaAberto = localStorage.getItem('oba_aberto')
      if (obaAberto && obaAberto === (prof.cpf || '').replace(/\D/g, '')) setShowOBAModal(true)
    } catch (e) {}
    setLoading(false)
  }

  // Abre a anamnese OBA para paciente bariátrico que ainda NÃO preencheu.
  // Detecção robusta (perfil OU triagem OU avaliação) — não depende do rf_flag/localStorage.
  async function verificarEAbrirOBA(prof) {
    try {
      const cpf = (prof?.cpf || '').replace(/\D/g, '')
      if (!cpf) return false
      // RPC SECURITY DEFINER: true se bariátrico (perfil/triagem/avaliação) e ainda
      // sem anamnese OBA. Fura o RLS (a triagem órfã tem user_id=null).
      const { data: precisa } = await supabase.rpc('paciente_precisa_oba', { p_cpf: cpf })
      if (precisa === true) {
        // Banner removido: o modal OBA abre direto para o bariátrico que ainda não
        // preencheu. Sem banner, não há flicker. O modal já tem a própria intro
        // "O bariátrico é um paciente complexo…".
        setPrecisaOBA(true)            // bookkeeping p/ onConcluir
        try { localStorage.setItem('oba_aberto', cpf) } catch (e) {}
        setShowOBAModal(true)
        return true
      }
      return false
    } catch (e) { return false }  // silencioso — não atrapalha o dashboard
  }

  // Reune triagens + avaliacoes do paciente logado e abre o modal de grafico.
  // Espelha handleBuscarHistorico do TriagemModal, mas usa profile.cpf direto
  // (paciente nao precisa redigitar).
  async function handleVerGrafico() {
    if (!profile?.cpf) return
    const cpfDigits = String(profile.cpf).replace(/\D/g, '')
    if (cpfDigits.length !== 11) return
    setHistoricoBuscando(true)
    setHistoricoMsg('')

    const [tRes, aRes] = await Promise.all([
      supabase
        .from('triagens')
        .select('created_at, hemoglobina, vcm, rdw')
        .eq('cpf', cpfDigits)
        .order('created_at', { ascending: true }),
      supabase
        .from('avaliacoes')
        .select('data_coleta, hemoglobina, vcm, rdw, ferritina, sat_transf')
        .eq('cpf', cpfDigits)
        .order('data_coleta', { ascending: true }),
    ])

    setHistoricoBuscando(false)

    if (tRes.error && aRes.error) {
      setHistoricoMsg('Erro ao buscar hist\u00f3rico. Tente novamente.')
      setTimeout(() => setHistoricoMsg(''), 4000)
      return
    }

    const norm = (v) => {
      const n = Number(v)
      return (v === null || v === undefined || v === '' || isNaN(n)) ? null : n
    }

    const serie = []
    ;(tRes.data || []).forEach((r) => {
      serie.push({
        data: r.created_at,
        hb: norm(r.hemoglobina),
        vcm: norm(r.vcm),
        rdw: norm(r.rdw),
        ferritina: null,
        sat: null,
        origem: 'triagem',
      })
    })
    ;(aRes.data || []).forEach((r) => {
      serie.push({
        data: r.data_coleta,
        hb: norm(r.hemoglobina),
        vcm: norm(r.vcm),
        rdw: norm(r.rdw),
        ferritina: norm(r.ferritina),
        sat: norm(r.sat_transf),
        origem: 'avaliacao',
      })
    })
    serie.sort((a, b) => new Date(a.data) - new Date(b.data))

    const pontosG1 = serie.filter((p) => p.hb !== null || p.vcm !== null || p.rdw !== null)
    if (pontosG1.length < 2) {
      setHistoricoMsg('N\u00c3O H\u00c1 ELEMENTOS PARA GR\u00c1FICO')
      setTimeout(() => setHistoricoMsg(''), 4000)
      return
    }

    setHistoricoData({ cpf: cpfDigits, serie })
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    let v = type === 'checkbox' ? checked : value
    if (['hemoglobina', 'vcm', 'rdw', 'ferritina', 'satTransf'].includes(name) && typeof v === 'string') {
      v = v.replace(',', '.')
    }
    setInputs(prev => ({ ...prev, [name]: v }))
  }

  async function handleAvaliar() {
    if (!profile) return

    if (!inputs.sexo) {
      alert('Selecione o Sexo.')
      return
    }
    const idadeNum = Number(inputs.idade)
    if (!idadeNum || idadeNum < 12 || idadeNum > 100) {
      alert('Informe uma idade valida (12 a 100 anos).')
      return
    }

    if (!inputs.hemoglobina || !inputs.vcm || !inputs.rdw) {
      alert('Preencha os campos da triagem: Hemoglobina, VCM e RDW.')
      return
    }
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
    const res = mostrarExamesExtras
      ? avaliarPaciente(inputsNumericos)
      : triagemEritron(inputsNumericos)
    setResultado({ ...res, _inputs: inputsNumericos })

    if (res.encontrado && session?.user) {
      await supabase.from('avaliacoes').insert({
        user_id: session.user.id,
        data_coleta: inputs.dataColeta,
        peso: inputs.peso !== '' && Number.isFinite(Number(inputs.peso)) ? Number(inputs.peso) : null,
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
        vitb12_sl: inputs.vitB12_SL,
        vitb12_im: inputs.vitB12_IM,
        ferro_oral: inputs.ferro_oral,
        ferro_injetavel: inputs.ferro_injetavel,
        diagnostico_label: res.label,
        diagnostico_color: res.color,
      })
      carregarDados()
    }
    setPedidoExamesEnviado(false)
    setTela('resultado')

    if (inputs.bariatrica && res.encontrado) {
      try { localStorage.setItem('oba_aberto', String(profile?.cpf || '').replace(/\D/g, '')) } catch (e) {}
      setShowOBAModal(true)
    }
  }
  // Card opt-in (tela de resultado): paciente pede o pedido GRATUITO para os
  // exames sugeridos pelo motor. Mesmo padrão do pedido grátis de boas-vindas:
  // grava em pedidos_documento (valor 0) e abre o WhatsApp do ADM com a lista.
  async function handlePedirExamesSugeridos() {
    if (!profile || !resultado) return
    const exames = resultado.proximosExames || []
    if (!exames.length) return
    try {
      await supabase.from('pedidos_documento').insert({
        user_id: profile.id,
        cpf: profile.cpf,
        nome: profile.nome,
        data_nascimento: profile.data_nascimento,
        celular: profile.celular,
        tipos_documento: exames,
        texto_documentos: 'Pedido gratuito - exames sugeridos (1a avaliacao)',
        valor_total: 0,
        status: 'pendente_envio',
      })
      const dataNasc = profile.data_nascimento
        ? new Date(profile.data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR')
        : '(nao informado)'
      const celFormatado = (profile.celular || '').replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3') || '(nao informado)'
      const mensagem =
        `*RedFairy - Pedido GRATUITO de exames (sugeridos)*\n\n` +
        `*Nome:* ${profile.nome}\n` +
        `*CPF:* ${profile.cpf}\n` +
        `*Data de nascimento:* ${dataNasc}\n` +
        `*Celular:* ${celFormatado}\n\n` +
        `*Exames solicitados:*\n` +
        exames.map(e => `- ${e}`).join('\n') + `\n\n` +
        `Solicito a emissao do pedido medico. Obrigado!`
      const url = `https://wa.me/5571997110804?text=${encodeURIComponent(mensagem)}`
      window.open(url, '_blank', 'noopener,noreferrer')
      setPedidoExamesEnviado(true)
      setJaTemPedidoGratis(true)
    } catch (err) {
      console.error('Erro ao pedir exames sugeridos:', err)
      alert('Erro ao registrar o pedido. Tente novamente.')
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    onVoltar()
  }

  async function handleConfirmarBoasVindas() {
    setSalvandoBoasVindas(true)
    try {
      await supabase.from('profiles')
        .update({ boas_vindas_vista: true })
        .eq('id', profile.id)
      if (querPedidoGratis) {
        await supabase.from('pedidos_documento').insert({
          user_id: profile.id,
          cpf: profile.cpf,
          nome: profile.nome,
          data_nascimento: profile.data_nascimento,
          celular: profile.celular,
          tipos_documento: ['HEMOGRAMA', 'FERRITINA', 'SAT_TRANSFERRINA'],
          texto_documentos: 'Primeiro pedido gratuito apos cadastro',
          valor_total: 0,
          status: 'pendente_envio',
        })

        // Monta mensagem WhatsApp pro ADM
        const dataNasc = profile.data_nascimento
          ? new Date(profile.data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR')
          : '(nao informado)'
        const celFormatado = (profile.celular || '').replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3') || '(nao informado)'
        const mensagem =
          `*RedFairy - Pedido GRATUITO de exames*\n\n` +
          `*Nome:* ${profile.nome}\n` +
          `*CPF:* ${profile.cpf}\n` +
          `*Data de nascimento:* ${dataNasc}\n` +
          `*Celular:* ${celFormatado}\n\n` +
          `*Exames solicitados:*\n` +
          `- Hemograma\n- Ferritina\n- Saturacao da Transferrina\n\n` +
          `Solicito a emissao do pedido medico. Obrigado!`
        const url = `https://wa.me/5571997110804?text=${encodeURIComponent(mensagem)}`
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    } catch (err) {
      console.error('Erro ao salvar boas-vindas:', err)
    } finally {
      setSalvandoBoasVindas(false)
      setShowBoasVindas(false)
      setProfile(p => ({ ...p, boas_vindas_vista: true }))
      // Bariátrica tem PRIORIDADE: abre a anamnese OBA e fica no dashboard.
      // Não-bariátrico:
      //  - pediu o exame grátis → ainda não tem resultados em mãos → despedida (logout).
      //  - NÃO pediu (já tem os exames) → vai DIRETO ao formulário de avaliação,
      //    sem parar no Histórico vazio.
      const precisa = await verificarEAbrirOBA(profile)
      if (!precisa) {
        if (querPedidoGratis) {
          setMostrarDespedida(true)
        } else {
          setTela('nova')
        }
      }
    }
  }

  function handleSairDespedida() {
    try {
      localStorage.removeItem('paciente_id')
      localStorage.removeItem('paciente_token')
      localStorage.removeItem('paciente_cpf')
      localStorage.removeItem('paciente_nome')
      localStorage.removeItem('paciente_login_at')
    } catch (e) {}
    if (onVoltar) onVoltar()
  }

  function calcularIdade(dataNascimento) {
    const hoje = new Date()
    const nasc = new Date(dataNascimento)
    let idade = hoje.getFullYear() - nasc.getFullYear()
    const m = hoje.getMonth() - nasc.getMonth()
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
    return idade
  }

  // Pontos REAIS de historico = avaliacoes ja aprofundadas (com ferritina), por data
  // distinta. O espelho da triagem de entrada (ferritina=null) NAO conta — senao a
  // 1a avaliacao real apareceria como 2 pontos e mostraria "Ver Historico" cedo demais.
  const pontosHistorico = new Set(
    (avaliacoes || []).filter(a => a.ferritina != null).map(a => a.data_coleta)
  ).size

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

  if (mostrarDespedida) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-50 via-white to-amber-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-xl text-center">
        <img src={logo} alt="RedFairy" style={{ width: 64, height: 64, margin: '0 auto 16px' }} />
        <h1 className="text-3xl font-black text-red-700 mb-3">{"Pronto!"}</h1>
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          {"Em breve voc\u00ea receber\u00e1 o seu primeiro pedido de exames via WhatsApp."}
        </p>
        <p className="text-sm text-gray-700 leading-relaxed mb-6">
          {"Quando tiver os resultados em m\u00e3os, entre na plataforma com seu CPF e senha para uma an\u00e1lise mais detalhada do seu estado."}
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6">
          <p className="text-xs text-amber-900">
            {"\ud83d\udca1 Se o WhatsApp n\u00e3o abriu, entre em contato pelo n\u00famero "}
            <a href="https://wa.me/5571997110804" target="_blank" rel="noopener noreferrer"
              className="font-bold underline">
              {"+55 71 99711-0804"}
            </a>
          </p>
        </div>
        <button
          onClick={handleSairDespedida}
          className="w-full bg-red-700 hover:bg-red-800 text-white font-semibold text-sm py-3 rounded-lg transition-colors">
          {"Sair"}
        </button>
      </div>
    </div>
  )

  return (
    <>
    <style>{`
      @keyframes rfHistoricoPulse {
        0%, 100% { opacity: 1; }
        50%      { opacity: 0.55; }
      }
      .rf-historico-pulse { animation: rfHistoricoPulse 1.6s ease-in-out infinite; }
    `}</style>
    <div className="min-h-screen bg-gray-50">

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
              <p className="text-red-200 text-xs">{"Ol\u00e1, "}{profile?.nome?.split(' ')[0]}{"!"}</p>
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

      {fraseGestacaoConcluida && (
        <div className="max-w-3xl mx-auto px-4 mt-4">
          <div className="rounded-xl border border-pink-200 bg-pink-50 p-4 flex items-start gap-3">
            <div className="text-2xl">{"\ud83c\udf38"}</div>
            <div className="flex-1">
              <p className="text-sm text-pink-900 leading-relaxed">
                {"Espero que tudo tenha corrido bem com a "}<strong>{"gesta\u00e7\u00e3o, o parto e o beb\u00ea"}</strong>{". Vamos ver como est\u00e1 a sua Hemoglobina?"}
              </p>
            </div>
            <button
              onClick={() => setFraseGestacaoConcluida(false)}
              className="text-pink-400 hover:text-pink-600 text-lg leading-none"
              aria-label="Fechar"
              style={{ fontFamily: "'Apple Color Emoji', 'Segoe UI Symbol', 'Noto Sans Symbols', sans-serif" }}
            >
              {"\u2715"}
            </button>
          </div>
        </div>
      )}

      {showOBAModal && profile && (
        <OBAModal
          cpf={profile.cpf}
          nome={profile.nome}
          dataNascimento={profile.data_nascimento}
          sexo={profile.sexo}
          idade={profile.data_nascimento ? Math.floor((Date.now() - new Date(profile.data_nascimento)) / 31557600000) : 0}
          dadosRedFairy={{
            gestante: inputs.gestante,
            semanas_gestacao: inputs.semanas_gestacao ? Number(inputs.semanas_gestacao) : null,
            dum: inputs.dum || null,
          }}
          // Resultado do eritron p/ o relatório OBA: fresco (pós-avaliação) ou
          // reconstruído da última linha de avaliacoes (login c/ anamnese pendente).
          resultadoEritron={
            resultado
              ? { label: resultado.label, color: resultado.color, inputs: resultado._inputs }
              : (avaliacoes && avaliacoes.length)
                ? { label: avaliacoes[0].diagnostico_label, color: avaliacoes[0].diagnostico_color, inputs: { sexo: profile.sexo } }
                : null
          }
          examesRedFairy={
            resultado?._inputs
              ? { ferritina: resultado._inputs.ferritina, hemoglobina: resultado._inputs.hemoglobina, vcm: resultado._inputs.vcm, rdw: resultado._inputs.rdw, satTransf: resultado._inputs.satTransf, dataColeta: inputs.dataColeta || null }
              : (avaliacoes && avaliacoes.length)
                ? { ferritina: avaliacoes[0].ferritina, hemoglobina: avaliacoes[0].hemoglobina, vcm: avaliacoes[0].vcm, rdw: avaliacoes[0].rdw, satTransf: avaliacoes[0].sat_transf, dataColeta: avaliacoes[0].data_coleta }
                : null
          }
          onFechar={() => { try { localStorage.removeItem('oba_aberto') } catch (e) {}; setShowOBAModal(false) }}
          onConcluir={() => { try { localStorage.removeItem('oba_aberto') } catch (e) {}; setShowOBAModal(false); setPrecisaOBA(false) }}
        />
      )}
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
        {"Eu sou a sua fada vermelha, a sua "}<span style={{ fontWeight: 'bold' }}>HEMOGLOBINA</span>{"."}
        <br />
        {"Eu uso a poeira das estrelas para te entregar o ar."}
        <br />
        <span style={{ fontWeight: '600' }}>{"Quanto tempo voc\u00ea vive sem ar?"}</span>
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
                  <h3 className="text-red-700 font-bold text-base text-center mb-4">{"Vida \u00e9 ventila\u00e7\u00e3o e perfus\u00e3o"}</h3>
                  <p className="text-gray-700 text-sm leading-relaxed mb-3">
                    {"O Ferro em voc\u00ea veio das estrelas, e dele o vermelho do seu sangue - a sua pot\u00eancia. Com Ferro, a Natureza faz a "}<strong>Hemoglobina</strong>{", a prote\u00edna vermelha e mais importante da sua vida."}
                  </p>
                  <p className="text-gray-700 text-sm leading-relaxed mb-3">
                    {"Ela sustenta a ventila\u00e7\u00e3o e realiza a perfus\u00e3o: capta o oxig\u00eanio do ar que ventila os pulm\u00f5es e o entrega a todas as suas c\u00e9lulas - vinte vezes por minuto. As c\u00e9lulas precisam do oxig\u00eanio para queimar o alimento e obter a energia vital, sem a qual voc\u00ea s\u00f3 vive alguns minutos."}
                  </p>
                  <p className="text-gray-700 text-sm leading-relaxed mb-3">
                    {"Ao mesmo tempo, a Hemoglobina captura o CO2 produzido pela queima do alimento em suas c\u00e9lulas, e o leva aos seus pulm\u00f5es para que voc\u00ea o expire no ar do mundo."}
                  </p>
                  <p className="text-gray-700 text-sm leading-relaxed mb-3">
                    {"No ambiente, uma prote\u00edna verde - a clorofila, m\u00e3e da Hemoglobina - usa a luz do sol para partir o CO2 e fazer a\u00e7\u00facar a partir de luz, carbono e \u00e1gua, devolvendo o oxig\u00eanio ao ar do planeta, em um ciclo virtuoso perfeito."}
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
        {/* Barra Hist\u00f3rico / Nova Avalia\u00e7\u00e3o: escondida no primeiro acesso \u2014 durante o
            "Ol\u00e1!" (showBoasVindas), enquanto o hemograma de entrada ainda n\u00e3o foi
            aprofundado (entradaPendente) e na tela de resultado (logo ap\u00f3s avaliar,
            n\u00e3o faz sentido para o paciente novo). S\u00f3 aparece com hist\u00f3rico de fato. */}
        {avaliacoes.length > 0 && !showBoasVindas && !entradaPendente && tela !== 'resultado' && (
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => {
              // Sempre volta pra tela 'historico'; abre o grafico se houver dados suficientes.
              // handleVerGrafico aborta sozinho com mensagem se houver < 2 pontos.
              setTela('historico');
              handleVerGrafico();
            }}
            className={`flex flex-col items-center px-4 py-2 rounded-xl transition-all ${pontosHistorico >= 2 ? 'rf-historico-pulse' : ''} ${tela === 'historico' ? 'bg-red-700 text-white' : 'bg-white text-gray-600 border'}`}>
            <span className="text-sm font-medium">{"Hist\u00f3rico"}</span>
            <span className="text-[10px] tracking-widest opacity-80 leading-none mt-0.5">
              {"EVOLU\u00c7\u00c3O | GR\u00c1FICO"}
            </span>
          </button>
          <button onClick={() => { setTela('nova'); setResultado(null) }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tela === 'nova' || tela === 'resultado' ? 'bg-red-700 text-white' : 'bg-white text-gray-600 border'}`}>
            {"Nova Avalia\u00e7\u00e3o"}
          </button>
        </div>
        )}

        {tela === 'historico' && (
          <div className="space-y-3">
            {showBoasVindas && profile && (
              <div className="bg-white rounded-2xl border-2 border-red-200 shadow-sm mb-4 overflow-hidden min-h-[500px] sm:min-h-0" style={{ position: 'relative' }}>
                {/* Imagem de boas-vindas (telefonista3). Mobile: altura fixa + object-cover
                    (preenche o card, aparece bem mais). Desktop (sm+): inteira, sem corte,
                    a própria imagem define a altura do card. */}
                <img src={telefonista3Img} alt="" className="block w-full h-[500px] object-cover object-top sm:h-auto" style={{ backgroundColor: '#FDF7F7' }} />
                <div className="p-5 pb-8" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 1, background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 35%, rgba(255,255,255,0.92) 70%)' }}>
                <div className="mb-3">
                  <h2 className="text-xl font-bold text-red-700 mb-1" style={{ textShadow: '0 1px 8px rgba(255,255,255,0.95)' }}>
                    {"Ol\u00e1, "}{profile.nome?.split(' ')[0] || ''}{"!"}
                  </h2>
                  <p className="text-sm text-gray-700 font-medium" style={{ textShadow: '0 1px 8px rgba(255,255,255,0.95)' }}>{"Bem-vindo(a) ao RedFairy"}</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-3 w-2/3">
                  <p className="text-sm text-gray-800 mb-1">
                    {"Voc\u00ea agora tem acesso \u00e0 plataforma por "}<strong>1 ano</strong>{"."}
                  </p>
                  <p className="text-xs text-gray-700 leading-relaxed">
                    {"Traga todos os seus futuros hemogramas. N\u00f3s vamos avaliar, p\u00f4r a sua evolu\u00e7\u00e3o em um gr\u00e1fico, e medicar se for necess\u00e1rio."}
                  </p>
                </div>

                {/* Card amarelo a ~2/3 + bot\u00e3o PLAY \u00e0 direita (na mesma linha) \u2014 p\u00e1gina fica curta */}
                <div className="flex items-center gap-3">
                  <label className="basis-2/3 flex items-start gap-3 p-3 border-2 border-amber-300 bg-amber-50 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={querPedidoGratis}
                      onChange={(e) => setQuerPedidoGratis(e.target.checked)}
                      className="mt-1 w-5 h-5 accent-red-700"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-amber-900">
                        {"Quero o meu primeiro pedido de exames (GRATUITO)"}
                      </p>
                      <p className="text-xs text-amber-800 mt-1">
                        {"Inclui: Hemograma, Ferritina e Satura\u00e7\u00e3o da Transferrina"}
                      </p>
                      <p className="text-xs text-gray-600 mt-1 italic">
                        {"Pedidos futuros: R$ 60,00 cada"}
                      </p>
                    </div>
                  </label>
                  <div className="flex-1 flex justify-center">
                    <PlayButton
                      onClick={handleConfirmarBoasVindas}
                      loading={salvandoBoasVindas}
                      label="CONTINUAR"
                      ariaLabel="Continuar"
                    />
                  </div>
                </div>
                </div>
              </div>
            )}

            {historicoMsg && (
              <p className="text-xs text-center mb-3 font-medium text-red-700">{historicoMsg}</p>
            )}

            {avaliacoes.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center text-gray-400 border">
                <img src={logo} alt="RedFairy" className="w-12 h-12 object-contain mx-auto mb-3"
                  style={{ filter: 'drop-shadow(0 0 6px rgba(239,68,68,0.4))' }} />
                <p>{"Nenhuma avalia\u00e7\u00e3o ainda."}</p>
                <button onClick={() => setTela('nova')}
                  className="mt-4 bg-red-700 text-white px-6 py-2 rounded-xl text-sm">
                  {"Fazer primeira avalia\u00e7\u00e3o"}
                </button>
              </div>
            ) : avaliacoes.map(av => (
              <div key={av.id} className="bg-white rounded-2xl p-4 border shadow-sm flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-700">
                    {new Date(av.data_coleta + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {[
                      av.hemoglobina != null && `Hb: ${av.hemoglobina}`,
                      av.vcm != null && `VCM: ${av.vcm}`,
                      av.rdw != null && `RDW: ${av.rdw}`,
                      av.ferritina != null && `Ferritina: ${av.ferritina}`,
                      av.sat_transferrina != null && `Sat.Transf: ${av.sat_transferrina}`,
                    ].filter(Boolean).join(' | ')}
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
            <h2 className="font-semibold text-gray-700">
              {dadosVieramDaEntrada ? "Continuando a sua primeira avalia\u00e7\u00e3o" : "Nova Avalia\u00e7\u00e3o"}
            </h2>
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-500 mb-1">{"Voc\u00ea"}</p>
              <p className="text-sm text-gray-700">
                <strong>{profile?.nome || ''}</strong>
                {inputs.sexo && (<>{" \u2022 "}<strong>{inputs.sexo === 'F' ? 'Feminino' : 'Masculino'}</strong></>)}
                {inputs.idade && (<>{" \u2022 "}<strong>{inputs.idade} anos</strong></>)}
              </p>
              {profile?.data_nascimento && (
                <p className="text-xs text-gray-400 mt-0.5">{"Idade calculada a partir da data de nascimento no seu cadastro"}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">{"Peso (kg)"}</label>
              <input type="number" step="0.1" name="peso" value={inputs.peso} onChange={handleChange}
                placeholder="Ex: 72"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              <p className="text-xs text-gray-400 mt-0.5">{"Opcional \u2014 usado no c\u00e1lculo de dose de ferro endovenoso, se necess\u00e1rio"}</p>
            </div>

            {/* Bariátrico/a: só faz sentido aparecer se o paciente É bariátrico. Quando os
                dados vieram da triagem e ele NÃO marcou bariátrica lá, o checkbox nem
                aparece (evita mostrar "Paciente Bariátrico" para quem não é). Se for
                bariátrico, mostra travado (já declarado na triagem). Fora do 1º acesso
                (nova avaliação avulsa) continua editável. */}
            {(inputs.bariatrica || !dadosVieramDaEntrada) && (
              <label className={`flex items-start gap-2 p-3 rounded-xl border-2 transition-all text-sm ${dadosVieramDaEntrada ? 'cursor-default' : 'cursor-pointer'}
                ${inputs.bariatrica ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                <input type="checkbox" name="bariatrica" checked={inputs.bariatrica} onChange={handleChange} disabled={dadosVieramDaEntrada} className="mt-0.5 disabled:opacity-50" />
                <div>
                  <p className="font-medium">{inputs.sexo === 'F' ? 'Paciente Bariátrica' : 'Paciente Bariátrico'}</p>
                  <p className="text-xs opacity-70">By-pass / Gastrectomia — você receberá a anamnese do Projeto OBA</p>
                </div>
              </label>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Data da Coleta</label>
              <input type="date" name="dataColeta" max={new Date().toISOString().split('T')[0]} value={inputs.dataColeta} onChange={handleChange}
                disabled={dadosVieramDaEntrada}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed" />
              {dadosVieramDaEntrada && (
                <p className="text-xs text-gray-400 mt-0.5">{"Data do seu hemograma de entrada (registrado na triagem)"}</p>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: 'Hemoglobina (g/dL)', name: 'hemoglobina' },
                { label: 'VCM (fL)', name: 'vcm' },
                { label: 'RDW-CV (%)', name: 'rdw' },
              ].map(f => (
                <div key={f.name}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  <input type="number" step="0.1" name={f.name} value={inputs[f.name]} onChange={handleChange}
                    disabled={dadosVieramDaEntrada}
                    className="w-full border-2 border-red-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 disabled:bg-gray-100 disabled:text-gray-500 disabled:border-gray-300 disabled:cursor-not-allowed" />
                </div>
              ))}
            </div>
            {dadosVieramDaEntrada && (
              <p className="text-xs text-gray-400 -mt-2">{"Hemograma de entrada (registrado na triagem) — para corrigir, faça uma nova triagem"}</p>
            )}

            {!mostrarExamesExtras && (
              <div className="flex items-center gap-3 mt-1 px-1">
                <style>{`
                  @keyframes rfPlayBlinkBlue {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(37,99,235,0.6); }
                    50%      { box-shadow: 0 0 0 8px rgba(37,99,235,0); }
                  }
                  .rf-play-blue { animation: rfPlayBlinkBlue 1s ease-in-out infinite; }
                `}</style>
                <p className="text-sm font-semibold text-blue-700 leading-snug flex-1">
                  {"Para digitar FERRITINA e SATURA\u00c7\u00c3O DA TRANSFERRINA (%) acione o bot\u00e3o"}
                </p>
                <button
                  type="button"
                  onClick={() => setMostrarExamesExtras(true)}
                  aria-label={"Liberar campos de Ferritina e Satura\u00e7\u00e3o da Transferrina"}
                  className="rf-play-blue flex-shrink-0 w-12 h-12 rounded-full bg-gray-300 hover:bg-gray-400 flex items-center justify-center transition-colors">
                  <span style={{ color: '#2563eb', fontSize: '1.3rem', lineHeight: 1 }}>{"\u25b6"}</span>
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Ferritina (ng/mL)', name: 'ferritina', hint: mostrarExamesExtras ? "N\u00e3o use ponto para valores superiores a 1000. Ex: 1140" : null },
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
                    placeholder={!mostrarExamesExtras ? "Clique no bot\u00e3o azul para liberar" : ''}
                    className="w-full border-2 border-blue-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400 disabled:placeholder:text-gray-400 disabled:placeholder:italic"
                  />
                  {f.hint && <p className="text-xs text-orange-600 font-medium mt-1">{f.hint}</p>}
                </div>
              ))}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">{"Hist\u00f3rico Cl\u00ednico"}</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: 'vegetariano', label: inputs.sexo === 'F' ? 'Vegetariana' : 'Vegetariano', sub: 'Dieta sem carne', color: 'green' },
                  { name: 'perda', label: 'Hemorragia', sub: 'Inclui doa\u00e7\u00e3o de sangue, sangria, ou sangramento', color: 'red' },
                  { name: 'alcoolista', label: 'Alcoolista', sub: 'Uso cr\u00f4nico de \u00e1lcool', color: 'amber' },
                  { name: 'transfundido', label: inputs.sexo === 'F' ? 'Transfundida' : 'Transfundido', sub: 'Transfus\u00e3o de hem\u00e1cias', color: 'red' },
                  { name: 'anemiaPrevia', label: 'Anemia Cr\u00f4nica', sub: 'Diagn\u00f3stico anterior de anemia', color: 'red' },
                  { name: 'sideropenia', label: 'Defici\u00eancia de Ferro', sub: 'Hist\u00f3rico de ferritina baixa', color: 'orange' },
                  { name: 'sobrecargaFerro', label: 'Excesso de Ferro\nHemocromatose', sub: 'Hist\u00f3rico de ferritina alta', color: 'orange' },
                  { name: 'hbAlta', label: 'Hemoglobina Alta / Policitemia', sub: 'Hist\u00f3rico de Hb elevada ou sangrias', color: 'red' },
                  { name: 'doadorSangue', label: inputs.sexo === 'F' ? 'Doadora de Sangue' : 'Doador de Sangue', sub: 'Doa\u00e7\u00f5es frequentes', color: 'red' },
                  { name: 'celiaco', label: inputs.sexo === 'F' ? 'Cel\u00edaca' : 'Cel\u00edaco', sub: 'Doen\u00e7a cel\u00edaca \u2014 m\u00e1 absor\u00e7\u00e3o', color: 'yellow' },
                  { name: 'g6pd', label: 'Defici\u00eancia de\nG-6-PD', sub: 'Favismo \u2014 risco de hem\u00f3lise', color: 'purple' },
                  ...(inputs.sexo === 'F' ? [
                    { name: 'hipermenorreia', label: 'Hipermenorreia', sub: 'Fluxo excessivo', color: 'pink' },
                    { name: 'gestante', label: 'Gestante', sub: 'Gravidez atual', color: 'pink' },
                  ] : []),
                ].map(f => (
                  <label key={f.name} className={`flex items-start gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all text-sm
                    ${inputs[f.name] ? (CORES_CARD[f.color] || CORES_CARD.pink) : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                    <input type="checkbox" name={f.name} checked={inputs[f.name]} onChange={handleChange} className="mt-0.5" />
                    <div>
                      <p className="font-medium" style={{ whiteSpace: 'pre-line' }}>{f.label}</p>
                      <p className="text-xs opacity-70">{f.sub}</p>
                    </div>
                  </label>
                ))}
              </div>

              {inputs.gestante && inputs.sexo === 'F' && (
                <div className="mt-3 p-3 rounded-xl border border-pink-200 bg-pink-50">
                  <p className="text-xs font-bold text-pink-700 uppercase tracking-wide mb-2">{"\ud83d\udccb Dados da Gesta\u00e7\u00e3o"}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{"Semanas de gesta\u00e7\u00e3o "}<span className="text-red-500">*</span></label>
                      <input type="number" name="semanas_gestacao" value={inputs.semanas_gestacao} onChange={handleChange}
                        min="1" max="42" placeholder="Ex: 24"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{"DUM "}<span className="text-gray-400 font-normal">(opcional)</span></label>
                      <input type="date" name="dum" max={new Date().toISOString().split('T')[0]} value={inputs.dum} onChange={handleChange}
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
                      return <p className="text-xs text-orange-600 font-medium mt-2">{"\u26a0\ufe0f DUM sugere ~"}{semanasCalc.toFixed(1)}{" semanas, mas voc\u00ea informou "}{inputs.semanas_gestacao}{". Revise os dados."}</p>
                    }
                    return null
                  })()}
                </div>
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Medicamentos | Suplementos</h3>
              <p className="text-xs text-gray-400 mb-2">{"Marque os que voc\u00ea usa ou usou recentemente"}</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: 'aspirina', label: 'Aspirina', sub: 'Uso cont\u00ednuo', color: 'orange' },
                  { name: 'vitaminaB12', label: 'Vitamina B12', sub: '\u00daltimos 3 meses', color: 'purple' },
                  { name: 'vitB12_SL', label: 'Vit. B12 SL', sub: 'Sublingual \u2014 em uso', color: 'purple' },
                  { name: 'vitB12_IM', label: 'Vit. B12 IM', sub: 'Intramuscular \u2014 em uso', color: 'purple' },
                  { name: 'ferro_oral', label: 'Ferro Oral', sub: 'Nos \u00faltimos 2 anos', color: 'orange' },
                  { name: 'ferro_injetavel', label: 'Ferro Injet\u00e1vel', sub: 'Nos \u00faltimos 2 anos', color: 'orange' },
                  { name: 'testosterona', label: 'Testosterona / Anabolizante', sub: 'Uso ex\u00f3geno \u2014 causa eritrocitose', color: 'orange' },
                  { name: 'tiroxina', label: 'Tiroxina / T4', sub: 'Tratamento tireoidiano', color: 'teal' },
                  { name: 'methotrexato', label: 'Metotrexato', sub: 'Antagonista do folato', color: 'purple' },
                  { name: 'hivTratamento', label: 'Tratamento\nHIV', sub: 'Antirretrovirais', color: 'purple' },
                  { name: 'hidroxiureia', label: 'Hidroxiureia', sub: 'Pode causar macrocitose', color: 'purple' },
                  { name: 'anticonvulsivante', label: 'Anticonvulsivante', sub: 'Fenito\u00edna, VPA etc.', color: 'purple' },
                ].map(f => (
                  <label key={f.name} className={`flex items-start gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all text-sm
                    ${inputs[f.name] ? (CORES_CARD[f.color] || CORES_CARD.orange) : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                    <input type="checkbox" name={f.name} checked={inputs[f.name]} onChange={handleChange} className="mt-0.5" />
                    <div>
                      <p className="font-medium" style={{ whiteSpace: 'pre-line' }}>{f.label}</p>
                      <p className="text-xs opacity-70">{f.sub}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <PlayButton onClick={handleAvaliar} label={"AVALIAR"} ariaLabel="Avaliar" />
            </div>
          </div>
        )}

        {tela === 'resultado' && resultado && (
          <div>
            <ResultCard resultado={resultado} mostrarPainelMedico={false}
              mostrarOptInExames={!jaTemPedidoGratis}
              optInExamesEnviado={pedidoExamesEnviado}
              onOptInExames={handlePedirExamesSugeridos}
              onCopiar={() => {
              const texto = formatarParaCopiar(resultado, resultado._inputs || inputs)
              navigator.clipboard.writeText(texto).then(() => {
                setCopiado(true)
                setTimeout(() => setCopiado(false), 3000)
              }).catch(err => {
                console.error('Erro ao copiar:', err)
                alert('Erro ao copiar. Tente novamente.')
              })
            }} copiado={copiado} />
            {pontosHistorico >= 2 ? (
              <button onClick={() => setTela('historico')}
                className="mt-4 w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 rounded-xl transition-colors">
                {"Ver Hist\u00f3rico"}
              </button>
            ) : (
              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-center">
                <p className="text-sm font-medium text-blue-700">
                  {"Em futuras avalia\u00e7\u00f5es voc\u00ea ver\u00e1 o hist\u00f3rico"}
                </p>
              </div>
            )}
            <div className="mt-6 flex justify-center">
              <PlayButton
                onClick={onVoltar}
                label={"VOLTAR AO IN\u00cdCIO"}
                ariaLabel={"Voltar ao in\u00edcio"}
                circleClass="bg-red-700 hover:bg-red-800"
                playColor="#ffffff"
                labelColor="#991b1b"
                ringColor="rgba(220,38,38,0.55)"
              />
            </div>
          </div>
        )}
      </div>
    </div>

    {showCompletarPerfil && profile && (
      <CompletarPerfilModal
        profile={profile}
        onSalvo={(novoProfile) => {
          setShowCompletarPerfil(false)
          setProfile(novoProfile)
          setShowPagamento(true)
        }}
        onVoltar={() => {
          // Única saída: abandona o cadastro incompleto e volta ao início (desloga).
          setShowCompletarPerfil(false)
          try {
            localStorage.removeItem('paciente_id')
            localStorage.removeItem('paciente_token')
            localStorage.removeItem('paciente_cpf')
            localStorage.removeItem('paciente_nome')
            localStorage.removeItem('paciente_login_at')
          } catch (e) {}
          if (onVoltar) onVoltar()
        }}
      />
    )}

    {showPagamento && profile && (
      <PagamentoCadastroModal
        profile={profile}
        onPago={() => {
          setShowPagamento(false)
          setShowBoasVindas(true)
        }}
        onSairSemPagar={() => {
          setShowPagamento(false)
          // Desloga: limpa credenciais locais do paciente
          try {
            localStorage.removeItem('paciente_id')
            localStorage.removeItem('paciente_token')
            localStorage.removeItem('paciente_cpf')
            localStorage.removeItem('paciente_nome')
            localStorage.removeItem('paciente_login_at')
          } catch (e) {}
          if (onVoltar) onVoltar()
        }}
      />
    )}

    {historicoData && (
      <HistoricoChartModal
        cpf={historicoData.cpf}
        serie={historicoData.serie}
        sexo={profile?.sexo}
        gestante={!!profile?.gestante}
        onFechar={() => setHistoricoData(null)}
      />
    )}

    </>
  )
}
