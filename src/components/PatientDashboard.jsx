import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { avaliarPaciente, triagemEritron, formatarParaCopiar } from '../engine/decisionEngine'
import ResultCard from './ResultCard'
import OBAModal from './OBAModal'
import { useInstalarFada } from '../lib/useInstalarFada'
import { ehDominioBariatrico } from '../lib/dominio'
import PlayButton from './PlayButton'
import CompletarPerfilModal from './CompletarPerfilModal'
import PagamentoCadastroModal from './PagamentoCadastroModal'
import EscolhaIndicacaoModal from './EscolhaIndicacaoModal'
import PacienteIndicaModal from './PacienteIndicaModal'
import HistoricoChartModal from './HistoricoChartModal'
import heroImg from '../assets/redfairy-hero.jpg'
import telefonista6Img from '../assets/telefonista6.jpg'
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
  // (escolha da indicacao) o paciente escolhe de quem aceita a indicacao, antes de pagar.
  const [showEscolhaIndicacao, setShowEscolhaIndicacao] = useState(false)
  const [opcoesIndicacao, setOpcoesIndicacao] = useState(null)
  // (paciente vira indicador) indica outros bariatricos e ganha creditos.
  const [showIndica, setShowIndica] = useState(false)
  const [saldoIndicadorBrl, setSaldoIndicadorBrl] = useState(0)
  const [querPedidoGratis, setQuerPedidoGratis] = useState(false)
  const [salvandoBoasVindas, setSalvandoBoasVindas] = useState(false)
  // "Instale a fadinha" (PWA) — checkbox dentro do card de boas-vindas.
  const { instalar: instalarFada, ios: fadaIOS } = useInstalarFada()
  const [fadaMarcada, setFadaMarcada] = useState(false)
  const [fadaInstrIOS, setFadaInstrIOS] = useState(false)
  const [fadaInstaladaPopup, setFadaInstaladaPopup] = useState(false)  // Android: confirma instalação
  async function aoMarcarFada(e) {
    const marcado = e.target.checked
    setFadaMarcada(marcado)
    if (!marcado) { setFadaInstrIOS(false); return }
    const r = await instalarFada()
    if (r === 'ios') setFadaInstrIOS(true)        // iPhone: mostra instrução manual
    else if (r === 'instalado') { setFadaInstrIOS(false); setFadaInstaladaPopup(true) }  // Android: confirma na tela
  }
  // No mobile a imagem fica atrás dos cards; deixa a foto + saudação aparecerem
  // sozinhas por 2,5s antes de revelar os cards (paciente vê a imagem primeiro).
  const [cardsBV, setCardsBV] = useState(false)
  useEffect(() => {
    if (!showBoasVindas) { setCardsBV(false); return }
    const t = setTimeout(() => setCardsBV(true), 2500)
    return () => clearTimeout(t)
  }, [showBoasVindas])
  const [mostrarDespedida, setMostrarDespedida] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [copiado, setCopiado] = useState(false)
  // Pedido grátis: "um por paciente". Governa o card opt-in dos exames sugeridos.
  const [jaTemPedidoGratis, setJaTemPedidoGratis] = useState(false)
  const [pedidoExamesEnviado, setPedidoExamesEnviado] = useState(false)
  // Tem assinatura ativa? (Fase 2) Sem assinatura = modo grátis: 1ª avaliação grátis,
  // paywall na 2ª. Bariátrico paga na 1ª (obrigatório).
  const [temAssinatura, setTemAssinatura] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showSobre, setShowSobre] = useState(false)
  const [showOBAModal, setShowOBAModal] = useState(false)
  const [precisaOBA, setPrecisaOBA] = useState(false)  // bariátrico sem anamnese OBA → banner persistente
  const [anamneseAnterior, setAnamneseAnterior] = useState(null)  // última oba_anamnese → OBA em modo follow-up
  const [eritronAnterior, setEritronAnterior] = useState(null)    // avaliação eritron anterior → comparação no resultado
  // Vencimento da anuidade (assinaturas.data_fim da assinatura ativa) p/ alerta 15/5 dias.
  const [vencimentoAnuidade, setVencimentoAnuidade] = useState(null)
  const [alertaAnuidadeFechado, setAlertaAnuidadeFechado] = useState(false)
  const [alertaHpyloriFechado, setAlertaHpyloriFechado] = useState(false)  // lembrete de repetir h.pylori (6 meses)
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
    b12_valor: '', folato_valor: '',  // investigação da macrocitose (VCM>100)
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

  // (paciente vira indicador) busca o saldo de créditos do paciente p/ mostrar no card.
  useEffect(() => {
    const cpfd = String(profile?.cpf || '').replace(/\D/g, '')
    if (cpfd.length !== 11) return
    supabase.rpc('saldo_indicador', { p_cpf: cpfd })
      .then(({ data }) => { if (data && data.ok) setSaldoIndicadorBrl(Number(data.saldo_brl) || 0) })
      .catch(() => {})
  }, [profile])

  // (PWA fase 4) Atalho da fada → abre direto o "novo hemograma". A flag
  // rf_abrir_nova é setada pelo App no lançamento como app. Consome após o perfil
  // carregar (vence a tela default do dashboard) e limpa a flag.
  useEffect(() => {
    if (!profile) return
    try {
      if (localStorage.getItem('rf_abrir_nova') === '1') {
        localStorage.removeItem('rf_abrir_nova')
        setResultado(null)
        setTela('nova')
      }
    } catch (e) {}
  }, [profile])

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
        .select('id, nome, cpf, sexo, data_nascimento, celular, bariatrica, gestante, boas_vindas_vista, primeira_avaliacao_feita')
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
    // Bariátrico? (perfil já marcado, domínio bariatrico.net, ou flag rf_flag do
    // hero "Sou Bariátrico"). Bariátrico paga na 1ª; não-bariátrico tem a 1ª grátis.
    const flagBariatricaOBA = (() => { try { return localStorage.getItem('rf_flag') === 'bariatrica' } catch (e) { return false } })()
    const ehBariatrico = !!prof.bariatrica || flagBariatricaOBA || ehDominioBariatrico()
    // Assinatura ativa? Governa o alerta de anuidade E o paywall da 2ª avaliação.
    let temAssinAtiva = false
    try {
      const { data: assinAtiva } = await supabase
        .from('assinaturas')
        .select('data_fim')
        .eq('user_id', prof.id)
        .eq('status', 'ativa')
        .order('data_fim', { ascending: false })
        .limit(1)
        .maybeSingle()
      setVencimentoAnuidade(assinAtiva?.data_fim || null)
      temAssinAtiva = !!assinAtiva
      setTemAssinatura(temAssinAtiva)
    } catch (e) { /* sem assinatura → modo grátis */ }
    // Perfil incompleto (paciente recem-cadastrado): pede dados pessoais antes de tudo
    if (prof && (!prof.nome || String(prof.nome).trim().length < 3)) {
      setShowCompletarPerfil(true)
    } else if (prof && prof.boas_vindas_vista === false) {
      // Não-bariátrico: 1ª avaliação é GRÁTIS → boas-vindas sem exigir pagamento.
      // Bariátrico: precisa de assinatura ativa antes (paga na 1ª) — senão, pagamento.
      if (!ehBariatrico || temAssinAtiva) {
        setShowBoasVindas(true)
      } else {
        setShowPagamento(true)
      }
    }
    localStorage.removeItem('rf_flag')

    // Persiste a marca bariátrica NO PERFIL já na entrada pelo flag — antes do gate
    // do OBA. Assim o paciente_precisa_oba (e o "uma vez bariátrico, sempre
    // bariátrico") reconhecem o bariátrico mesmo que a triagem ainda não tenha sido
    // salva. Antes, o rf_flag era removido aqui sem nunca marcar o paciente, então
    // o bariátrico novo seguia como paciente comum e o OBA não disparava.
    if (flagBariatricaOBA && !prof.bariatrica) {
      try { await supabase.from('profiles').update({ bariatrica: true }).eq('id', prof.id) } catch (e) {}
      prof.bariatrica = true
      setProfile(p => (p ? { ...p, bariatrica: true } : p))
    }

    // Bariátrico com perfil completo e boas-vindas já vistas (login de retorno):
    // abre a anamnese OBA direto se ainda não preencheu.
    if (prof.nome && String(prof.nome).trim().length >= 3 && prof.boas_vindas_vista !== false) {
      // await: garante que o OBA já abra (overlay) ANTES de loading=false renderizar
      // o dashboard "Olá" vazio por baixo. Sem isso, a tela vazia piscava antes do OBA.
      await verificarEAbrirOBA(prof)
    }
    const { data: avals } = await supabase
      .from('avaliacoes').select('*')
      .eq('user_id', session.user.id)
      .order('data_coleta', { ascending: false })
    setAvaliacoes(avals || [])
    // Flags de Histórico/Medicamentos da ÚLTIMA avaliação CONCLUÍDA — p/ pré-marcar
    // (editável) na próxima entrada de dados. Ignora o "espelho" (concluida=false).
    const ultConcluida = (avals || []).find(a => a.concluida === true)
    const flagsAnteriores = ultConcluida ? {
      vegetariano: !!ultConcluida.vegetariano, perda: !!ultConcluida.perda, alcoolista: !!ultConcluida.alcoolista,
      transfundido: !!ultConcluida.transfundido, anemiaPrevia: !!ultConcluida.anemia_previa,
      sideropenia: !!ultConcluida.sideropenia, sobrecargaFerro: !!ultConcluida.sobrecarga_ferro,
      hbAlta: !!ultConcluida.hb_alta, doadorSangue: !!ultConcluida.doador_sangue, celiaco: !!ultConcluida.celiaco,
      g6pd: !!ultConcluida.g6pd, hipermenorreia: !!ultConcluida.hipermenorreia,
      aspirina: !!ultConcluida.aspirina, vitaminaB12: !!ultConcluida.vitamina_b12,
      vitB12_SL: !!ultConcluida.vitb12_sl, vitB12_IM: !!ultConcluida.vitb12_im,
      ferro_oral: !!ultConcluida.ferro_oral, ferro_injetavel: !!ultConcluida.ferro_injetavel,
      testosterona: !!ultConcluida.testosterona, tiroxina: !!ultConcluida.tiroxina,
      methotrexato: !!ultConcluida.methotrexato, hivTratamento: !!ultConcluida.hiv_tratamento,
      hidroxiureia: !!ultConcluida.hidroxiureia, anticonvulsivante: !!ultConcluida.anticonvulsivante,
    } : {}
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
    // FOLLOW-UP (frente 2): se o bariátrico JÁ fez o baseline (existe linha em
    // oba_anamnese), carregamos a última p/ o OBA abrir em modo follow-up (esconde
    // imutáveis). Se não houver baseline, fica null → OBA abre normal (1ª vez).
    if (prof.cpf && (prof.bariatrica || (avals || []).some(a => a.bariatrica))) {
      try {
        const cpfLimpo = String(prof.cpf).replace(/\D/g, '')
        const { data: obaRows } = await supabase
          .from('oba_anamnese').select('*')
          .eq('cpf', cpfLimpo).order('created_at', { ascending: false }).limit(1)
        setAnamneseAnterior(obaRows && obaRows.length ? obaRows[0] : null)
      } catch (e) { setAnamneseAnterior(null) }
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
        // "Pendente" = ainda NÃO concluiu a 1ª avaliação. Antes isso era decidido
        // pela Ferritina (ferritina != null), mas a 1ª pode ser só triagem do eritron
        // (sem Ferritina) — então o paciente caía de novo em "Continuando a sua
        // primeira avaliação" (loop). Agora usamos a flag primeira_avaliacao_feita.
        // Pendente = existe uma triagem (hemograma) cuja DATA ainda não virou avaliação
        // completa. Vale p/ TODA entrada (1ª, 2ª, 3ª...): sempre que o paciente acabou
        // de fazer uma triagem nova e falta "concluir" (aprofundar). Por DATA, não por
        // flag — evita o loop antigo e funciona em qualquer avaliação.
        const entradaDia = entrada && entrada.data_coleta ? String(entrada.data_coleta).slice(0, 10) : null
        // "Concluída" = avaliação REAL (não o espelho da triagem). Coluna avaliacoes.concluida.
        const entradaConcluida = !!entradaDia && (avals || []).some(a => String(a.data_coleta || '').slice(0, 10) === entradaDia && a.concluida === true)
        const nConcluidas = (avals || []).filter(a => a.concluida === true).length
        const pendente = !!entrada && !entradaConcluida
        setEntradaPendente(pendente)
        if (inicial && pendente) {
          setDadosVieramDaEntrada(true)
          setInputs(prev => ({
            ...prev,
            ...flagsAnteriores,  // pré-marca Histórico/Medicamentos da avaliação anterior (editável)
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
            setTela('nova'); setResultado(null)
            // 3ª avaliação em diante (2 concluídas), sem assinatura → paywall ANTES,
            // sobre o formulário (nunca sobre "O que você quer fazer?").
            if (!temAssinAtiva && nConcluidas >= 2) setShowPagamento(true)
          }
        } else if (inicial && !pendente && (avals || []).length) {
          // RETORNO (1ª já feita): pré-marca as flags da última avaliação — editáveis,
          // pra ele desmarcar o que mudou (ex.: parou a aspirina, deixou de ser
          // vegetariano). NÃO pré-preenche data/hemograma (são novos) nem gestante.
          setInputs(prev => ({ ...prev, ...flagsAnteriores }))  // pré-marca Histórico/Medicamentos da avaliação anterior (editável)
          // RETORNO: vai direto à NOVA avaliação (não faz sentido cair em "O que
          // você quer fazer?"). São 2 avaliações grátis; a partir da 3ª (sem
          // assinatura), abre o paywall ANTES do formulário.
          setTela('nova'); setResultado(null)
          if (!temAssinAtiva && nConcluidas >= 2) setShowPagamento(true)
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
        .select('created_at, data_coleta, hemoglobina, vcm, rdw')
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

    // Cada exame e UM ponto, identificado pela DATA DA COLETA (nao pelo created_at).
    // A triagem de entrada e a 1a avaliacao sao o MESMO hemograma (mesma data_coleta):
    // antes a triagem entrava com a data de HOJE (created_at) e a avaliacao com a data
    // real, gerando 2 pontos iguais (reta horizontal falsa). Agrupando por data_coleta,
    // o mesmo exame colapsa em 1 ponto; a avaliacao (mais completa) tem prioridade.
    const dia = (d) => (d ? String(d).slice(0, 10) : null)
    const porData = new Map()
    ;(tRes.data || []).forEach((r) => {
      const data = r.data_coleta || dia(r.created_at)
      const key = dia(data)
      if (!key || porData.has(key)) return
      porData.set(key, {
        data,
        hb: norm(r.hemoglobina), vcm: norm(r.vcm), rdw: norm(r.rdw),
        ferritina: null, sat: null, origem: 'triagem',
      })
    })
    ;(aRes.data || []).forEach((r) => {
      const key = dia(r.data_coleta)
      if (!key) return
      porData.set(key, {  // sobrepoe a triagem da mesma data (avaliacao e mais rica)
        data: r.data_coleta,
        hb: norm(r.hemoglobina), vcm: norm(r.vcm), rdw: norm(r.rdw),
        ferritina: norm(r.ferritina), sat: norm(r.sat_transf), origem: 'avaliacao',
      })
    })
    const serie = Array.from(porData.values()).sort((a, b) => new Date(a.data) - new Date(b.data))

    const pontosG1 = serie.filter((p) => p.hb !== null || p.vcm !== null || p.rdw !== null)
    if (pontosG1.length < 2) {
      // Sem 2 pontos n\u00e3o h\u00e1 gr\u00e1fico \u2014 mostra aviso persistente (limpa no pr\u00f3ximo clique).
      setHistoricoMsg('AINDA N\u00c3O H\u00c1 DADOS PARA HIST\u00d3RICO | GR\u00c1FICOS')
      return
    }

    setHistoricoData({ cpf: cpfDigits, serie })
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    let v = type === 'checkbox' ? checked : value
    if (['hemoglobina', 'vcm', 'rdw', 'ferritina', 'satTransf', 'b12_valor', 'folato_valor'].includes(name) && typeof v === 'string') {
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
    // No formulário de NOVA avaliação a data vem com máscara dd/mm/aaaa; exige
    // formato completo e converte p/ ISO (YYYY-MM-DD) usado no banco. No 1º acesso
    // a data já vem ISO (campo type=date travado).
    if (!dadosVieramDaEntrada && !/^\d{2}\/\d{2}\/\d{4}$/.test(String(inputs.dataColeta || ''))) {
      alert('Informe a data da coleta no formato dd/mm/aaaa.')
      return
    }
    let dataColISO = inputs.dataColeta
    const _mDt = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(inputs.dataColeta))
    if (_mDt) dataColISO = `${_mDt[3]}-${_mDt[2]}-${_mDt[1]}`

    // Trava: a data do novo hemograma não pode ser anterior à da avaliação anterior
    // (compara com a última avaliação REAL concluída). Backstop p/ os dois caminhos.
    const _concluidas = (avaliacoes || []).filter(a => a.concluida === true)
    if (_concluidas.length) {
      const _maxPrev = _concluidas.reduce((mx, a) => {
        const d = String(a.data_coleta || '').slice(0, 10)
        return d > mx ? d : mx
      }, '')
      if (_maxPrev && String(dataColISO).slice(0, 10) <= _maxPrev) {
        alert('A data do hemograma deve ser posterior à da sua avaliação anterior (' + _maxPrev.split('-').reverse().join('/') + ').')
        return
      }
    }

    const inputsNumericos = {
      ...inputs,
      cpf: profile.cpf || '',
      nome: profile.nome || '',
      dataColeta: dataColISO,
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
    // Captura a avaliação ANTERIOR (antes do insert/reload) p/ comparar no resultado.
    setEritronAnterior((avaliacoes || []).find(a => a.hemoglobina != null) || null)

    if (res.encontrado && session?.user) {
      // null (não 0) quando o campo vier vazio — triagem do eritron não tem Ferritina/Sat.
      const numOrNull = (v) => (v === '' || v === null || v === undefined || !Number.isFinite(Number(v))) ? null : Number(v)
      const dados = {
        user_id: session.user.id,
        data_coleta: dataColISO,
        peso: numOrNull(inputs.peso),
        ferritina: numOrNull(inputs.ferritina),
        hemoglobina: Number(inputs.hemoglobina),
        vcm: Number(inputs.vcm),
        rdw: Number(inputs.rdw),
        sat_transf: numOrNull(inputs.satTransf),
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
        // Flags de Histórico Clínico + Medicamentos que antes não eram gravadas
        // (precisam das colunas de migrate_flags_avaliacoes.sql).
        alcoolista: !!inputs.alcoolista,
        transfundido: !!inputs.transfundido,
        anemia_previa: !!inputs.anemiaPrevia,
        sideropenia: !!inputs.sideropenia,
        sobrecarga_ferro: !!inputs.sobrecargaFerro,
        hb_alta: !!inputs.hbAlta,
        doador_sangue: !!inputs.doadorSangue,
        celiaco: !!inputs.celiaco,
        g6pd: !!inputs.g6pd,
        testosterona: !!inputs.testosterona,
        tiroxina: !!inputs.tiroxina,
        methotrexato: !!inputs.methotrexato,
        hiv_tratamento: !!inputs.hivTratamento,
        hidroxiureia: !!inputs.hidroxiureia,
        anticonvulsivante: !!inputs.anticonvulsivante,
        diagnostico_label: res.label,
        diagnostico_color: res.color,
        concluida: true,  // avaliação REAL concluída (distingue do "espelho" da triagem)
      }
      // Evita o DUPLICADO: se já existe avaliação nesta MESMA data (ex.: o "espelho"
      // da triagem de entrada, com ferritina=null), ATUALIZA essa linha em vez de
      // inserir outra. Assim a 1ª avaliação preenche o espelho — uma linha só.
      const { data: existentes } = await supabase
        .from('avaliacoes').select('id')
        .eq('user_id', session.user.id)
        .eq('data_coleta', dataColISO)
        .limit(1)
      const existeId = existentes?.[0]?.id
      if (existeId) {
        await supabase.from('avaliacoes').update(dados).eq('id', existeId)
      } else {
        await supabase.from('avaliacoes').insert(dados)
      }
      // 1ª avaliação concluída: marca no perfil. Isso (a) quebra o loop do
      // "Continuando a sua primeira avaliação" e (b) é a base do paywall da 2ª.
      if (!profile?.primeira_avaliacao_feita) {
        try {
          await supabase.from('profiles').update({ primeira_avaliacao_feita: true }).eq('id', session.user.id)
          setProfile(p => (p ? { ...p, primeira_avaliacao_feita: true } : p))
        } catch (e) {}
      }
      carregarDados()
    }
    setPedidoExamesEnviado(false)
    setTela('resultado')

    if (inputs.bariatrica && res.encontrado) {
      try { localStorage.setItem('oba_aberto', String(profile?.cpf || '').replace(/\D/g, '')) } catch (e) {}
      setShowOBAModal(true)
    }
  }

  // (Fase 2) Ir pra nova avaliação. São 2 avaliações grátis por CPF (a 1ª e a 2ª).
  // A partir da 3ª, sem assinatura, abre o PAYWALL (pagamento da anuidade) antes.
  // Quem tem assinatura segue sempre direto ao formulário.
  function irNovaAvaliacao() {
    const nConc = (avaliacoes || []).filter(a => a.concluida === true).length
    if (!temAssinatura && nConc >= 2) {
      setShowPagamento(true)
    } else {
      setTela('nova'); setResultado(null)
    }
  }

  // ===== Fluxo GUIADO do formulário de NOVA avaliação (só quando NÃO veio da
  // triagem de entrada). Mesma ideia da triagem: campos amarelos com salto
  // automático de foco (após maxChars dígitos, ou 1,3s da última digitação). =====
  const refHb = useRef(null), refVcm = useRef(null), refRdw = useRef(null)
  const refFerr = useRef(null), refSat = useRef(null)
  const timerFocoRef = useRef(null), timerFerrRef = useRef(null)

  // Foca o próximo campo: na hora se atingiu maxChars, ou 2,1s após parar de digitar.
  function avancaFoco(valor, maxChars, refProx) {
    if (timerFocoRef.current) clearTimeout(timerFocoRef.current)
    if (!valor || !refProx) return
    if (String(valor).length >= maxChars) { setTimeout(() => refProx.current?.focus(), 50); return }
    timerFocoRef.current = setTimeout(() => refProx.current?.focus(), 2100)
  }

  // Hb/VCM/RDW: aceita só número/decimal, limita a maxChars e agenda o salto.
  function handleNumGuiado(name, raw, maxChars, refProx) {
    const v = String(raw).replace(/[^0-9.,]/g, '').replace(',', '.').slice(0, maxChars)
    setInputs(prev => ({ ...prev, [name]: v }))
    avancaFoco(v, maxChars, refProx)
  }

  // Data: máscara dd/mm/aaaa; ao completar 8 dígitos, foca a Hemoglobina.
  function handleDataMask(raw) {
    const d = String(raw).replace(/\D/g, '').slice(0, 8)
    let m = d
    if (d.length > 4) m = d.slice(0, 2) + '/' + d.slice(2, 4) + '/' + d.slice(4)
    else if (d.length > 2) m = d.slice(0, 2) + '/' + d.slice(2)
    setInputs(prev => ({ ...prev, dataColeta: m }))
    if (d.length === 8) setTimeout(() => refHb.current?.focus(), 80)
  }

  // Ferritina: 3s após parar de digitar, foca a Sat. da Transferrina.
  function handleFerrGuiado(raw) {
    const v = String(raw).replace(/[^0-9.,]/g, '').replace(',', '.')
    setInputs(prev => ({ ...prev, ferritina: v }))
    if (timerFerrRef.current) clearTimeout(timerFerrRef.current)
    if (v) timerFerrRef.current = setTimeout(() => refSat.current?.focus(), 3000)
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
    } catch (err) {
      console.error('Erro ao salvar boas-vindas:', err)
    } finally {
      setSalvandoBoasVindas(false)
      setProfile(p => ({ ...p, boas_vindas_vista: true }))
      // Bariátrica tem PRIORIDADE: abre a anamnese OBA e fica no dashboard.
      // Não-bariátrico: vai DIRETO ao formulário da 1ª avaliação. O pedido de exames
      // (grátis na 1ª) agora é feito no RESULTADO (checkbox "Sim, quero receber…"),
      // não mais aqui — por isso não existe mais a tela "Pronto!".
      // IMPORTANTE: abre o OBA (overlay) ANTES de fechar as boas-vindas — senão o
      // dashboard "Olá" vazio piscava entre o fim das boas-vindas e a abertura do OBA.
      const precisa = await verificarEAbrirOBA(profile)
      setShowBoasVindas(false)
      if (!precisa) setTela('nova')
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
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-amber-50">
      {/* Header igual ao do dashboard/boas-vindas: barra vermelha + fadinha + marca. */}
      <header className="bg-red-700 text-white py-4 px-4 shadow-lg">
        <div className="max-w-3xl mx-auto flex items-center justify-center gap-3">
          <img src={logo} alt="RedFairy" className="w-8 h-8 object-contain" style={{ filter: 'brightness(10)' }} />
          <h1 className="text-xl font-bold">{"RedFairy | Projeto OBA"}<sup style={{ fontSize: '0.55em', verticalAlign: 'super' }}>{"\u00ae"}</sup></h1>
        </div>
      </header>
      <div className="flex items-center justify-center p-4" style={{ minHeight: 'calc(100vh - 64px)' }}>
        <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-xl text-center">
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
          <div className="flex justify-center">
            <PlayButton
              onClick={handleSairDespedida}
              label="SAIR"
              ariaLabel="Sair"
              circleClass="bg-gray-300 hover:bg-gray-400"
              playColor="#dc2626"
              labelColor="#b91c1c"
              ringColor="rgba(220,38,38,0.5)"
            />
          </div>
        </div>
      </div>
    </div>
  )

  // Dias até o vencimento da anuidade (assinatura ativa). null = sem assinatura.
  const diasParaVencer = (() => {
    if (!vencimentoAnuidade) return null
    const fim = new Date(vencimentoAnuidade)
    if (isNaN(fim.getTime())) return null
    return Math.ceil((fim.getTime() - Date.now()) / 86400000)
  })()
  // Alerta quando faltam ≤15 dias (ou já venceu); urgência sobe em ≤5 dias / vencido.
  const mostrarAlertaAnuidade = diasParaVencer !== null && diasParaVencer <= 15 && !alertaAnuidadeFechado
  const anuidadeUrgente = diasParaVencer !== null && diasParaVencer <= 5
  const textoAnuidade = diasParaVencer === null ? '' :
    diasParaVencer < 0 ? `Sua anuidade venceu há ${Math.abs(diasParaVencer)} dia${Math.abs(diasParaVencer) > 1 ? 's' : ''}.` :
    diasParaVencer === 0 ? 'Sua anuidade vence hoje.' :
    `Sua anuidade vence em ${diasParaVencer} dia${diasParaVencer > 1 ? 's' : ''}.`

  // Lembrete de repetir o H. pylori 6 meses após a detecção (achado/IgM reagente).
  // Lê o carimbo na última oba_anamnese (relatorio_oba.hpylori). Anticorpos não
  // protegem → reinfecção possível. Mostra ao chegar perto/passar dos 6 meses.
  const hpyloriInfo = anamneseAnterior?.relatorio_oba?.hpylori
  const hpyloriData = (hpyloriInfo && hpyloriInfo.detectado)
    ? (hpyloriInfo.data || anamneseAnterior.data_exames || anamneseAnterior.created_at || null) : null
  const diasHpylori = (() => {
    if (!hpyloriData) return null
    const d = new Date(hpyloriData)
    if (isNaN(d.getTime())) return null
    d.setMonth(d.getMonth() + 6)  // vencimento = data + 6 meses
    return Math.ceil((d.getTime() - Date.now()) / 86400000)
  })()
  const mostrarAlertaHpylori = diasHpylori !== null && diasHpylori <= 15 && !alertaHpyloriFechado

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
              <h1 className="text-xl font-bold">{"RedFairy | Projeto OBA"}<sup style={{ fontSize: '0.55em', verticalAlign: 'super' }}>{"\u00ae"}</sup></h1>
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

      {mostrarAlertaAnuidade && (
        <div className="max-w-3xl mx-auto px-4 mt-4">
          <div className="rounded-xl border-2 p-4 flex items-start gap-3" style={{
            background: anuidadeUrgente ? '#FEF2F2' : '#FFFBEB',
            borderColor: anuidadeUrgente ? '#FCA5A5' : '#FDE68A',
          }}>
            <div className="text-2xl">{anuidadeUrgente ? "⚠️" : "⏰"}</div>
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: anuidadeUrgente ? '#991B1B' : '#92400E', margin: 0 }}>
                {textoAnuidade}
              </p>
              <p className="text-xs leading-relaxed" style={{ color: anuidadeUrgente ? '#7F1D1D' : '#78350F', margin: '0.3rem 0 0' }}>
                {"Renove para manter seu acesso ao histórico, gráficos e novas avaliações."}
              </p>
              <button
                onClick={() => {
                  const msg = `Olá! Sou ${profile?.nome || 'paciente'} (CPF ${profile?.cpf || ''}). Quero renovar a minha anuidade da RedFairy.`
                  window.open(`https://wa.me/5571997110804?text=${encodeURIComponent(msg)}`, '_blank')
                }}
                className="mt-3 inline-block text-white font-bold text-xs rounded-lg px-4 py-2"
                style={{ background: '#16a34a', border: 'none', cursor: 'pointer' }}>
                {"Renovar pelo WhatsApp →"}
              </button>
            </div>
            <button onClick={() => setAlertaAnuidadeFechado(true)} aria-label="Fechar"
              className="text-gray-400 hover:text-gray-600 font-bold text-lg leading-none"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              {"×"}
            </button>
          </div>
        </div>
      )}

      {mostrarAlertaHpylori && (
        <div className="max-w-3xl mx-auto px-4 mt-4">
          <div className="rounded-xl border-2 p-4 flex items-start gap-3" style={{ background:'#FFF7ED', borderColor:'#FDBA74' }}>
            <div className="text-2xl">{"🦠"}</div>
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color:'#9A3412', margin:0 }}>
                {diasHpylori < 0 ? "Está na hora de repetir o exame de H. pylori." : "Em breve, hora de repetir o H. pylori."}
              </p>
              <p className="text-xs leading-relaxed" style={{ color:'#7C2D12', margin:'0.3rem 0 0' }}>
                {"Os anticorpos contra o H. pylori não são protetores — quem já teve a infecção pode se infectar de novo. Recomendamos repetir o exame ~6 meses após a detecção."}
              </p>
              <button
                onClick={() => {
                  const msg = `Olá! Sou ${profile?.nome || 'paciente'} (CPF ${profile?.cpf || ''}). Quero solicitar o pedido para repetir o exame de H. pylori (6 meses).`
                  window.open(`https://wa.me/5571997110804?text=${encodeURIComponent(msg)}`, '_blank')
                }}
                className="mt-3 inline-block text-white font-bold text-xs rounded-lg px-4 py-2"
                style={{ background:'#16a34a', border:'none', cursor:'pointer' }}>
                {"Solicitar o pedido pelo WhatsApp →"}
              </button>
            </div>
            <button onClick={() => setAlertaHpyloriFechado(true)} aria-label="Fechar"
              className="text-gray-400 hover:text-gray-600 font-bold text-lg leading-none"
              style={{ background:'none', border:'none', cursor:'pointer' }}>
              {"×"}
            </button>
          </div>
        </div>
      )}

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
          anamneseAnterior={anamneseAnterior}
          onFechar={() => { try { localStorage.removeItem('oba_aberto') } catch (e) {}; setShowOBAModal(false) }}
          onConcluir={() => { try { localStorage.removeItem('oba_aberto') } catch (e) {}; setShowOBAModal(false); setPrecisaOBA(false); if (onVoltar) onVoltar() }}
        />
      )}
      {showSobre && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.95)' }}
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
        {/* (paciente vira indicador) card de indicar outros bariatricos e ganhar creditos. */}
        {temAssinatura && tela === 'historico' && !showBoasVindas && !entradaPendente && (
          <div className="mb-5 bg-gradient-to-br from-red-50 to-white border-2 border-red-200 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-red-800">{"💸 Indique e ganhe créditos"}</p>
              {saldoIndicadorBrl > 0
                ? <p className="text-xs text-green-700 font-bold mt-0.5">{"Seu saldo: R$ "}{saldoIndicadorBrl.toFixed(2).replace('.', ',')}{" — abate da sua anuidade."}</p>
                : <p className="text-xs text-gray-600 mt-0.5">{"Conhece outros bariátricos? Cada um que entrar e pagar = US$10 para você."}</p>}
            </div>
            <button onClick={() => setShowIndica(true)}
              className="shrink-0 bg-red-700 hover:bg-red-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap">
              {"Indicar"}
            </button>
          </div>
        )}
        {/* Barra Hist\u00f3rico / Nova Avalia\u00e7\u00e3o: escondida no primeiro acesso \u2014 durante o
            "Ol\u00e1!" (showBoasVindas), enquanto o hemograma de entrada ainda n\u00e3o foi
            aprofundado (entradaPendente) e na tela de resultado (logo ap\u00f3s avaliar,
            n\u00e3o faz sentido para o paciente novo). S\u00f3 aparece com hist\u00f3rico de fato. */}
        {avaliacoes.length > 0 && !showBoasVindas && !entradaPendente && tela === 'historico' && (
        <div className="mb-6">
          {tela === 'historico' && profile && (
            <div className="mb-3">
              <h2 className="text-lg font-bold text-red-700">
                {"Ol\u00e1, "}{profile.nome?.split(' ')[0] || ''}{", "}{profile.sexo === 'F' ? 'bem-vinda' : 'bem-vindo'}{"!"}
              </h2>
              <p className="text-sm text-gray-600">{"O que voc\u00ea quer fazer?"}</p>
            </div>
          )}
          <div className="flex gap-2">
          <button
            onClick={() => {
              // Sempre volta pra tela 'historico'; abre o grafico se houver dados suficientes.
              // handleVerGrafico aborta sozinho com mensagem se houver < 2 pontos.
              setTela('historico');
              handleVerGrafico();
            }}
            className={`flex flex-col items-center px-4 py-2 rounded-xl transition-all ${pontosHistorico >= 2 ? 'rf-historico-pulse' : ''} ${tela === 'historico' ? 'bg-blue-700 text-white border-2 border-blue-800' : 'bg-blue-100 text-blue-800 border-2 border-blue-800'}`}>
            <span className="text-sm font-medium">{"Hist\u00f3rico"}</span>
            <span className="text-[10px] tracking-widest opacity-80 leading-none mt-0.5">
              {"EVOLU\u00c7\u00c3O | GR\u00c1FICO"}
            </span>
          </button>
          <button onClick={irNovaAvaliacao}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all bg-red-700 text-white hover:bg-red-800">
            {"Nova Avalia\u00e7\u00e3o"}
          </button>
          </div>
          {/* Modo gr\u00e1tis (sem assinatura): oferece assinar a qualquer momento. */}
          {!temAssinatura && tela === 'historico' && (
            <button onClick={() => setShowPagamento(true)}
              className="mt-3 text-xs text-blue-700 underline underline-offset-2 hover:text-blue-900">
              {"Quero acesso completo (assinar a anuidade)"}
            </button>
          )}
        </div>
        )}

        {tela === 'historico' && (
          <div className="space-y-3">
            {showBoasVindas && profile && (
              <div className="bg-white rounded-2xl border-2 border-red-200 shadow-sm mb-4 overflow-hidden min-h-[480px] sm:min-h-0 sm:max-w-sm sm:mx-auto" style={{ position: 'relative' }}>
                {/* Imagem de boas-vindas (telefonista3, horizontal). A ALTURA é o zoom:
                    menor = menos zoom = corta MENOS as laterais (mas mostra menos altura).
                    Ajuste o h-[...] pra afinar. object-top mantém o topo. */}
                <img src={telefonista6Img} alt="" className="block w-full h-[480px] object-cover object-bottom sm:h-auto" style={{ backgroundColor: '#FDF7F7' }} />
                {/* Saudacao no TOPO da imagem (separada do card, pra nao sumir pra fora). */}
                <div className="text-center px-5" style={{ position: 'absolute', top: '5%', left: 0, right: 0, zIndex: 1 }}>
                  <style>{`@keyframes rfBvFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
                  <h2 className="text-base font-bold" style={{ color: '#ffffff', animation: 'rfBvFade 0.6s ease both' }}>
                    {(profile.sexo === 'F' ? 'Bem-vinda' : 'Bem-vindo')}{", "}{profile.nome?.split(' ')[0] || ''}{", ao RedFairy | OBA"}<sup style={{ fontSize: '0.6em', verticalAlign: 'super' }}>{"\u00ae"}</sup>{"!"}
                  </h2>
                </div>

                {/* Card na BASE da imagem. */}
                <div className="p-5 pb-2" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 1 }}>

                {/* Os cards só aparecem após 2,5s — tempo do paciente ver a foto + saudação. */}
                <div style={{ opacity: cardsBV ? 1 : 0, transition: 'opacity 0.6s ease', pointerEvents: cardsBV ? 'auto' : 'none' }}>
                <div className="flex items-end gap-2">
                <div className={`w-[75%] rounded-xl p-3 mb-5 ${(inputs.bariatrica || profile?.bariatrica) ? 'border-2 border-red-400' : 'border border-blue-200'}`}
                  style={{ background: (inputs.bariatrica || profile?.bariatrica) ? 'rgba(253,242,248,0.55)' : 'rgba(239,246,255,0.55)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
                  <p className="text-xs text-gray-700 leading-relaxed mb-2 font-bold">
                    {(inputs.bariatrica || profile?.bariatrica || temAssinatura)
                      ? <>{"Agora voc\u00ea tem acesso \u00e0 plataforma por "}<span style={{ color: (inputs.bariatrica || profile?.bariatrica) ? '#9D174D' : '#1d4ed8' }}>{"um ano"}</span>{"."}</>
                      : <span style={{ color: '#1d4ed8' }}>{"Voc\u00ea poder\u00e1 fazer duas avalia\u00e7\u00f5es gratuitas."}</span>}
                  </p>
                  <p className="text-xs text-gray-700 leading-relaxed mb-2 font-bold">
                    {(inputs.bariatrica || profile?.bariatrica)
                      ? "A qualquer momento voc\u00ea pode fazer uma nova avalia\u00e7\u00e3o, e incluir novos exames. Eles ser\u00e3o comparados com os anteriores e interpretados, e voc\u00ea receber\u00e1 recomenda\u00e7\u00f5es, e poder\u00e1 solicitar receitas ou novos pedidos de exames."
                      : "Traga os resultados de cada novo HEMOGRAMA \u2014 e se tiver, traga a FERRITINA e a SATURA\u00c7\u00c3O DA TRANSFERRINA. N\u00f3s vamos avaliar e p\u00f4r a sua evolu\u00e7\u00e3o em gr\u00e1fico, e medicar voc\u00ea se necess\u00e1rio."}
                  </p>
                  <p className="text-xs text-gray-700 leading-relaxed mb-2 font-bold">
                    {(inputs.bariatrica || profile?.bariatrica)
                      ? "Marque a caixinha abaixo e n\u00f3s vamos instalar uma FADINHA na sua tela inicial. Ela vai conter o seu LOGIN, e quando voc\u00ea tocar nela o sistema j\u00e1 abre direto. Vamos prosseguir."
                      : "Marque a caixinha abaixo e n\u00f3s vamos instalar uma fadinha na sua tela inicial. Ela j\u00e1 vai conter o seu LOGIN e quando voc\u00ea tocar nela o sistema j\u00e1 abre direto para voc\u00ea entrar os exames \u2014 \u00e9 muito simples. Vamos prosseguir."}
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={fadaMarcada} onChange={aoMarcarFada} className="w-5 h-5 accent-red-700" />
                    <span className="text-sm font-bold" style={{ color: (inputs.bariatrica || profile?.bariatrica) ? '#9D174D' : '#1d4ed8' }}>{"Ok. Instale a fadinha."}</span>
                  </label>
                  {fadaInstrIOS && (
                    <p className="text-xs mt-2 leading-snug" style={{ color: (inputs.bariatrica || profile?.bariatrica) ? '#9D174D' : '#1d4ed8' }}>
                      {"No iPhone: toque em "}<strong>{"Compartilhar"}</strong>{" (\u2191) e depois em "}<strong>{"\"Adicionar \u00e0 Tela de In\u00edcio\""}</strong>{"."}
                    </p>
                  )}
                </div>

                {/* O pedido de exames (gr\u00e1tis na 1\u00aa) agora \u00e9 feito no RESULTADO, n\u00e3o aqui. */}
                <div className="flex-1 flex justify-center">
                  <PlayButton
                    onClick={handleConfirmarBoasVindas}
                    loading={salvandoBoasVindas}
                    label="CONTINUAR"
                    ariaLabel="Continuar"
                    labelColor="#ffffff"
                    ringColor="rgba(229,231,235,0.9)"
                  />
                </div>
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
              {(() => {
                if (!dadosVieramDaEntrada) return "Vamos ent\u00e3o fazer uma nova avalia\u00e7\u00e3o:"
                const nc = (avaliacoes || []).filter(a => a.concluida === true).length
                if (nc === 0) return "Continuando a sua primeira avalia\u00e7\u00e3o"
                const ord = { 2: 'segunda', 3: 'terceira', 4: 'quarta', 5: 'quinta', 6: 'sexta' }[nc + 1] || (nc + 1) + '\u00aa'
                return "Vamos ent\u00e3o concluir a sua " + ord + " avalia\u00e7\u00e3o"
              })()}
            </h2>
            {/* 2\u00aa avalia\u00e7\u00e3o = \u00faltima gr\u00e1tis: aviso vinho. Some quando j\u00e1 \u00e9 assinante
                ou na 3\u00aa+ (avaliacoes.length>=2, que cai no paywall antes do form). */}
            {!temAssinatura && (avaliacoes || []).filter(a => a.concluida === true).length === 1 && (
              <p className="text-sm font-bold -mt-3" style={{ color: '#9D174D' }}>
                {"ATEN\u00c7\u00c3O: Essa \u00e9 a sua \u00faltima avalia\u00e7\u00e3o gratuita."}
              </p>
            )}
            {/* 3\u00aa avalia\u00e7\u00e3o em diante: j\u00e1 h\u00e1 hist\u00f3rico (2+ pontos) \u2014 link p/ o gr\u00e1fico
                (abre por cima e volta pra c\u00e1). Na 2\u00aa n\u00e3o aparece (s\u00f3 h\u00e1 1 ponto). */}
            {(avaliacoes || []).filter(a => a.concluida === true).length >= 2 && (
              <div className="-mt-2">
                <button onClick={() => handleVerGrafico()}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                  {"Ver o hist\u00f3rico"}
                </button>
              </div>
            )}
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

            {/* Campo Peso removido: quando ha indicacao de ferro endovenoso, o proprio
                modal do protocolo pede o peso (calculo de dose Ganzoni). */}

            {/* Bariátrico/a: só faz sentido aparecer se o paciente É bariátrico. Quando os
                dados vieram da triagem e ele NÃO marcou bariátrica lá, o checkbox nem
                aparece (evita mostrar "Paciente Bariátrico" para quem não é). Se for
                bariátrico, mostra travado (já declarado na triagem). Fora do 1º acesso
                (nova avaliação avulsa) continua editável. */}
            {(inputs.bariatrica || !dadosVieramDaEntrada) && (
              <label className={`flex items-start gap-2 p-3 rounded-xl border-2 transition-all text-sm ${dadosVieramDaEntrada ? 'cursor-default' : 'cursor-pointer'}
                ${inputs.bariatrica ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                <input type="checkbox" name="bariatrica" checked={inputs.bariatrica} onChange={handleChange} disabled={dadosVieramDaEntrada || ehDominioBariatrico()} className="mt-0.5 disabled:opacity-50" />
                <div>
                  <p className="font-medium">{inputs.sexo === 'F' ? 'Paciente Bariátrica' : 'Paciente Bariátrico'}</p>
                  <p className="text-xs opacity-70">By-pass / Gastrectomia — você receberá a anamnese do Projeto OBA</p>
                </div>
              </label>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Data da Coleta</label>
              {dadosVieramDaEntrada ? (
                <input type="date" name="dataColeta" max={new Date().toISOString().split('T')[0]} value={inputs.dataColeta} disabled
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed" />
              ) : (
                <input type="text" inputMode="numeric" name="dataColeta" autoFocus autoComplete="off"
                  placeholder="dd/mm/aaaa" maxLength={10} value={inputs.dataColeta}
                  onChange={e => handleDataMask(e.target.value)}
                  className="w-full border-2 border-yellow-400 bg-yellow-50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
              )}
              {dadosVieramDaEntrada && (
                <p className="text-xs text-gray-400 mt-0.5">{"Data do seu hemograma de entrada (registrado na triagem)"}</p>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: 'Hemoglobina (g/dL)', name: 'hemoglobina', ref: refHb, max: 4, next: refVcm },
                { label: 'VCM (fL)', name: 'vcm', ref: refVcm, max: 5, next: refRdw },
                { label: 'RDW-CV (%)', name: 'rdw', ref: refRdw, max: 4, next: null },
              ].map(f => (
                <div key={f.name}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  <input ref={f.ref} type="text" inputMode="decimal" name={f.name} autoComplete="off"
                    value={inputs[f.name]}
                    onChange={dadosVieramDaEntrada ? handleChange : (e => handleNumGuiado(f.name, e.target.value, f.max, f.next))}
                    disabled={dadosVieramDaEntrada}
                    className={`w-full border-2 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${dadosVieramDaEntrada ? 'border-red-500 focus:ring-red-400 disabled:bg-gray-100 disabled:text-gray-500 disabled:border-gray-300 disabled:cursor-not-allowed' : 'border-yellow-400 bg-yellow-50 focus:ring-yellow-400'}`} />
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
                  {"Se voc\u00ea tem os resultados de FERRITINA e SATURA\u00c7\u00c3O DA TRANSFERRINA (%), acione o bot\u00e3o."}
                </p>
                <button
                  type="button"
                  onClick={() => { setMostrarExamesExtras(true); setTimeout(() => refFerr.current?.focus(), 80); }}
                  aria-label={"Liberar campos de Ferritina e Satura\u00e7\u00e3o da Transferrina"}
                  className="rf-play-blue flex-shrink-0 w-12 h-12 rounded-full bg-gray-300 hover:bg-gray-400 flex items-center justify-center transition-colors">
                  <span style={{ color: '#2563eb', fontSize: '1.3rem', lineHeight: 1 }}>{"\u25b6"}</span>
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Ferritina (ng/mL)', name: 'ferritina', ref: refFerr, onCh: e => handleFerrGuiado(e.target.value), hint: mostrarExamesExtras ? "N\u00e3o use ponto para valores superiores a 1000. Ex: 1140" : null },
                { label: 'Sat. Transferrina (%)', name: 'satTransf', ref: refSat, onCh: handleChange, hint: null },
              ].map(f => (
                <div key={f.name}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  <input
                    ref={f.ref}
                    type="text"
                    inputMode="decimal"
                    name={f.name}
                    autoComplete="off"
                    value={inputs[f.name]}
                    onChange={f.onCh}
                    disabled={!mostrarExamesExtras}
                    placeholder={!mostrarExamesExtras ? "Clique no bot\u00e3o azul para liberar" : ''}
                    className={`w-full border-2 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${mostrarExamesExtras ? 'border-yellow-400 bg-yellow-50 focus:ring-yellow-400' : 'border-blue-500 focus:ring-blue-400 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400 disabled:placeholder:text-gray-400 disabled:placeholder:italic'}`}
                  />
                  {f.hint && <p className="text-xs text-orange-600 font-medium mt-1">{f.hint}</p>}
                </div>
              ))}
            </div>

            {/* MACROCITOSE (VCM>100): o bot\u00e3o azul libera tamb\u00e9m B12 e Folato. */}
            {Number(String(inputs.vcm).replace(',', '.')) > 100 && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                {[
                  { label: 'Vitamina B12 (pg/mL)', name: 'b12_valor' },
                  { label: 'Folato / \u00e1c. f\u00f3lico (ng/mL)', name: 'folato_valor' },
                ].map(f => (
                  <div key={f.name}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                    <input
                      type="number"
                      step="0.1"
                      name={f.name}
                      value={inputs[f.name] || ''}
                      onChange={handleChange}
                      disabled={!mostrarExamesExtras}
                      placeholder={!mostrarExamesExtras ? "Clique no bot\u00e3o azul para liberar" : ''}
                      className="w-full border-2 border-blue-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400 disabled:placeholder:text-gray-400 disabled:placeholder:italic"
                    />
                  </div>
                ))}
              </div>
            )}

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
            {/* O card de comparação ("Evolução desde a última avaliação" + setas) foi
                removido: a evolução agora vive no gráfico de Histórico. A data do
                hemograma aparece no subtexto do ResultCard. */}
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
            {/* "Ver o hist\u00f3rico..." sempre dispon\u00edvel. Se ainda n\u00e3o houver 2 pontos,
                handleVerGrafico mostra "AINDA N\u00c3O H\u00c1 HIST\u00d3RICO" (sem gr\u00e1fico). */}
            <button onClick={() => { handleVerGrafico(); }}
              className="mt-4 w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-3 rounded-xl border border-blue-200 transition-colors">
              {"Ver o hist\u00f3rico..."}
            </button>
            {/* Aviso "sem 2 pontos" tamb\u00e9m aqui: antes s\u00f3 aparecia na tela 'historico',
                e por isso o bot\u00e3o trocava de tela \u2014 o que fazia o paciente
                n\u00e3o voltar ao diagn\u00f3stico ao fechar o gr\u00e1fico. */}
            {historicoMsg && (
              <p className="text-xs text-center mt-2 font-medium text-red-700">{historicoMsg}</p>
            )}
            <div className="mt-6 flex justify-center">
              <PlayButton
                onClick={handleSairDespedida}
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

    {/* Popup de confirmação da fadinha (Android, após aceitar a instalação). */}
    {fadaInstaladaPopup && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 px-6"
        onClick={() => setFadaInstaladaPopup(false)}>
        <div className="bg-white rounded-2xl shadow-xl max-w-xs w-full p-6 text-center" onClick={(e) => e.stopPropagation()}>
          <img src={logo} alt="" className="w-20 h-20 object-contain mx-auto mb-3" style={{ opacity: 0.4 }} />
          <p className="text-base font-bold text-red-700">{"FADINHA INSTALADA NA TELA"}</p>
          <p className="text-sm text-gray-600 mt-2">{"Para um próximo teste, apenas toque nela."}</p>
          <button onClick={() => setFadaInstaladaPopup(false)}
            className="mt-4 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-xl text-sm transition-colors">
            {"OK"}
          </button>
        </div>
      </div>
    )}

    {showCompletarPerfil && profile && (
      <CompletarPerfilModal
        profile={profile}
        onSalvo={async (novoProfile) => {
          setShowCompletarPerfil(false)
          setProfile(novoProfile)
          // Bariátrico paga na 1ª (obrigatório → OBA). Não-bariátrico: 1ª grátis,
          // vai direto às boas-vindas (paywall só aparece na 2ª avaliação).
          const ehBari = !!(novoProfile?.bariatrica || inputs.bariatrica || ehDominioBariatrico())
          if (ehBari) {
            // (escolha) se há um INDICADOR reservando este CPF, o paciente escolhe de quem
            // aceita a indicação ANTES de pagar; senão vai direto ao pagamento (médico = default).
            try {
              const cpfd = String(novoProfile?.cpf || '').replace(/\D/g, '')
              const { data: op } = await supabase.rpc('opcoes_indicacao', { p_cpf: cpfd })
              if (op?.ok && op.indicador) { setOpcoesIndicacao(op); setShowEscolhaIndicacao(true); return }
            } catch (e) {}
            setShowPagamento(true)
          } else setShowBoasVindas(true)
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

    {showEscolhaIndicacao && opcoesIndicacao && profile && (
      <EscolhaIndicacaoModal
        cpf={profile.cpf}
        medico={opcoesIndicacao.medico}
        indicador={opcoesIndicacao.indicador}
        onConcluir={() => { setShowEscolhaIndicacao(false); setShowPagamento(true) }}
      />
    )}

    {showIndica && profile && (
      <PacienteIndicaModal cpf={profile.cpf} onFechar={() => setShowIndica(false)} />
    )}

    {showPagamento && profile && (
      <PagamentoCadastroModal
        profile={profile}
        onPago={() => {
          setShowPagamento(false)
          setTemAssinatura(true)
          // Se ainda não viu as boas-vindas (cadastro do bariátrico) → boas-vindas.
          // Se já viu (paywall da 2ª avaliação / assinatura opcional) → vai à avaliação.
          if (profile?.boas_vindas_vista) setTela('nova')
          else setShowBoasVindas(true)
        }}
        onSairSemPagar={() => {
          setShowPagamento(false)
          // Paywall/assinatura opcional (paciente já passou pelas boas-vindas): só
          // fecha e volta pra tela de escolha — NÃO desloga.
          if (profile?.boas_vindas_vista) {
            setTela('historico')
            return
          }
          // Cadastro (bariátrico) que recusou o pagamento: desloga.
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
