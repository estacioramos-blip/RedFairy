import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase'
import logo from '../assets/logo.png'
import PlayButton from './PlayButton'

/**
 * TriagemResultadoModal - popup de resultado da triagem.
 *
 * Props:
 *   resultado:  objeto retornado por triagemEritron()
 *   inputs:     dados do paciente (cpf, sexo, idade, gestante, hb, vcm, rdw, data_coleta, data_estimada)
 *   modoMedico: boolean
 *   isDemo:     boolean
 *   medicoCRM:  string
 *   userId:     string
 *   onVoltarInicio: function()
 *   onCadastrar:    function()
 */
export default function TriagemResultadoModal({
  resultado,
  inputs,
  modoMedico = false,
  isDemo = false,
  medicoCRM = null,
  onAprofundar = null,
  userId = null,
  onVoltarInicio,
  onCadastrar
}) {
  const [tela, setTela] = useState('resultado')
  // Macrocitose (VCM > 100): além de Ferritina/Saturação, recomenda-se também B12 e
  // Folatos (investigação da macrocitose). Sufixo reaproveitado nos 3 cards.
  // Check pelo VCM direto (robusto a normalização Unicode do rótulo classificacaoVCM).
  const macro = Number(resultado?._inputs?.vcm ?? inputs?.vcm) > 100
  const sufB12 = macro ? <>{", "}<strong>{"VITAMINA B12 e FOLATOS (ÁCIDO FÓLICO)"}</strong></> : null
  const [salvando, setSalvando] = useState(false)
  const [erroSalvamento, setErroSalvamento] = useState(null)
  const [pedNome, setPedNome] = useState('')
  const [pedCelular, setPedCelular] = useState('')
  // Padrao seamless da tela "primeiro pedido gratuito": campo amarelo ativo + auto-avanco.
  const [campoAtivoPed, setCampoAtivoPed] = useState('nome')
  const pedCelRef = useRef(null)
  const pedNomeTimer = useRef(null)
  useEffect(() => () => { if (pedNomeTimer.current) clearTimeout(pedNomeTimer.current) }, [])

  if (!resultado) return null

  // String JS com \u: HEMOGLOBINA NORMAL + HEMACIAS NORMOCITICAS (em pt-BR com acentos)
  const isNormal = resultado.label === "HEMOGLOBINA NORMAL + HEM\u00c1CIAS NORMOC\u00cdTICAS"
  const showCadastroBtn = !modoMedico && isDemo

  // Helper para data_coleta -> DD/MM/AAAA
  function fmtDataColeta(iso) {
    if (!iso) return ''
    const s = String(iso).split('T')[0]
    const p = s.split('-')
    if (p.length === 3) return p[2] + '/' + p[1] + '/' + p[0]
    return s
  }

  async function salvarTriagem() {
    if (!inputs?.cpf) {
      return { sucesso: true, semCPF: true }
    }
    try {
      const dados = {
        cpf: (inputs.cpf || '').replace(/\D/g, ''),
        user_id: userId || null,
        modo_medico: modoMedico,
        medico_crm: medicoCRM || null,
        sexo: inputs.sexo,
        idade: Number(inputs.idade) || null,
        data_nascimento: inputs.data_nascimento || null,
        gestante: inputs.gestante || false,
        bariatrica: inputs.bariatrica || false,
        semanas_gestacao: inputs.semanas_gestacao ? Math.round(Number(inputs.semanas_gestacao)) : null,
        data_coleta: inputs.data_coleta || null,
        data_estimada: !!inputs.data_estimada,
        hemoglobina: Number(inputs.hemoglobina) || null,
        vcm: Number(inputs.vcm) || null,
        rdw: Number(inputs.rdw) || null,
        label: resultado.label,
        classificacao_hb: resultado.classificacaoHb,
        classificacao_vcm: resultado.classificacaoVCM,
        is_anisocitica: resultado.isAnisocitica || false,
        gravidade_hb: resultado.gravidadeHb || null,
        color: resultado.color
      }
      const { error } = await supabase.from('triagens').insert(dados)
      if (error) {
        console.error('Erro ao salvar triagem:', error)
        return { sucesso: false, erro: error.message }
      }
      // Sincroniza sexo + data_nascimento no profile do paciente logado.
      // Assim o CompletarPerfilModal sabe que ja temos esses dados.
      try {
        if (userId && (inputs.sexo || inputs.data_nascimento)) {
          const patch = {}
          if (inputs.sexo) patch.sexo = inputs.sexo
          if (inputs.data_nascimento) patch.data_nascimento = inputs.data_nascimento
          await supabase.from('profiles').update(patch).eq('id', userId)
        }
      } catch (e) { /* nao bloqueia */ }

      // Cria tambem registro em avaliacoes (Fix 4 - unifica historico).
      // Apenas se o paciente esta logado (userId presente).
      // Idempotente: usa cpf+data_coleta+user_id como filtro para evitar duplicacao.
      try {
        if (userId && inputs.data_coleta) {
          const cpfDigits = (inputs.cpf || '').replace(/\D/g, '')
          const { data: existente } = await supabase
            .from('avaliacoes')
            .select('id')
            .eq('user_id', userId)
            .eq('data_coleta', inputs.data_coleta)
            .maybeSingle()
          if (!existente) {
            await supabase.from('avaliacoes').insert({
              user_id: userId,
              cpf: cpfDigits,
              data_coleta: inputs.data_coleta,
              data_nascimento: inputs.data_nascimento || null,
              medico_crm: medicoCRM || null,  // (4DOC) médico encaminhador (auto-encaminhamento)
              hemoglobina: Number(inputs.hemoglobina) || null,
              vcm: Number(inputs.vcm) || null,
              rdw: Number(inputs.rdw) || null,
              ferritina: null,
              sat_transf: null,
              bariatrica: !!inputs.bariatrica,
              gestante: !!inputs.gestante,
              semanas_gestacao: inputs.semanas_gestacao ? Math.round(Number(inputs.semanas_gestacao)) : null,
              diagnostico_label: resultado.label || null,
              diagnostico_color: resultado.color || null,
            })
          }
        }
      } catch (e) { console.warn('Falha ao criar avaliacao da triagem:', e) }
      try {
        const cpfDigits = (inputs.cpf || '').replace(/\D/g, '')
        const { data: prof } = await supabase
          .from('profiles').select('cpf').eq('cpf', cpfDigits).maybeSingle()
        if (!prof) {
          const { count: nTri } = await supabase
            .from('triagens').select('*', { count: 'exact', head: true })
            .eq('cpf', cpfDigits)
          if ((nTri || 0) >= 2) {
            return { sucesso: true, limite3: true }
          }
          if ((nTri || 0) === 1) {
            return { sucesso: true, pedidoExames: true }
          }
        }
      } catch (e) { /* nao bloqueia */ }
      return { sucesso: true }
    } catch (err) {
      console.error('Erro inesperado ao salvar:', err)
      return { sucesso: false, erro: err.message }
    }
  }

  async function handleContinuar() {
    setSalvando(true)
    const resp = await salvarTriagem()
    setSalvando(false)
    if (!resp.sucesso) {
      setErroSalvamento("N\u00e3o foi poss\u00edvel salvar. Tente novamente ou contate o suporte.")
      return
    }
    if (resp.limite3) { setTela('limite3'); return }
    // 'pedidoExames' e a tela de paciente ("primeiro pedido gratuito"): so faz
    // sentido para o paciente. Em modo medico, cai na tela 'aguardo' (que tem
    // mensagem propria para o medico).
    if (resp.pedidoExames && !modoMedico) { setTela('pedidoExames'); return }
    // Paciente logado: pula a tela 'aguardo' (ja tem dashboard com historico)
    // e vai direto pro proximo (que volta pro dashboard / landing).
    if (userId) {
      onVoltarInicio && onVoltarInicio()
      return
    }
    setTela('aguardo')
  }

  async function handleCadastrarComSalvamento() {
    setSalvando(true)
    await salvarTriagem()
    setSalvando(false)
    onCadastrar()
  }

  // ===== TELA PEDIDO DE EXAMES (5C) =====
  if (tela === 'pedidoExames') {
    const cpfFmt = (inputs?.cpf || '')
    const dnFmt = inputs?.data_nascimento
      ? String(inputs.data_nascimento).split('-').reverse().join('/')
      : (inputs?.dataNascimento || '')
    const podeEnviar = pedNome.trim().length > 2 && pedCelular.replace(/\D/g, '').length >= 10
    const enviarWhatsApp = () => {
      const linhas = [
        'PEDIDO DE EXAMES - RedFairy',
        'CPF: ' + cpfFmt,
        'NOME: ' + pedNome.trim().toUpperCase(),
        'DATA DE NASCIMENTO: ' + dnFmt,
        'CELULAR: ' + pedCelular,
        'EXAME: FERRITINA',
        'EXAME: SATURACAO DA TRANSFERRINA'
      ]
      const texto = encodeURIComponent(linhas.join('\n'))
      window.open('https://wa.me/5571997110804?text=' + texto, '_blank')
    }
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.7)' }}>
        <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl my-8 overflow-hidden">
          {/* Header compacto com a fadinha RedFairy a' esquerda (padrao novo) */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100" style={{ background: 'rgba(255,255,255,0.92)' }}>
            <img src={logo} alt="RedFairy" style={{ width: 28, height: 28, objectFit: 'contain' }} />
            <h2 style={{ fontFamily: "'Georgia', serif", fontWeight: 900, fontSize: '1.2rem', letterSpacing: '-0.02em', margin: 0 }}>
              <span style={{ color: '#b91c1c' }}>Red</span><span style={{ color: '#ef4444' }}>Fairy</span><span style={{ color: '#7B1E1E', fontWeight: 700 }}>{" | OBA"}<sup style={{ fontSize: '0.5em', verticalAlign: 'super' }}>{"®"}</sup></span>
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-900 leading-snug">
                {"Este \u00e9 o seu "}<strong>primeiro pedido gratuito</strong>{" de "}
                <strong>FERRITINA</strong>{" e "}<strong>{"SATURA\u00c7\u00c3O DA TRANSFERRINA"}</strong>{"."}
                {" Preencha os dados abaixo e envie pelo WhatsApp."}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Nome completo</label>
              <input
                type="text" autoFocus
                value={pedNome}
                onChange={e => {
                  const val = e.target.value.toUpperCase()
                  setPedNome(val)
                  if (pedNomeTimer.current) clearTimeout(pedNomeTimer.current)
                  pedNomeTimer.current = setTimeout(() => {
                    if (val.trim().length > 2) pedCelRef.current?.focus()  // 3s parado \u2192 salta p/ celular
                  }, 3000)
                }}
                onFocus={() => setCampoAtivoPed('nome')}
                placeholder="Nome completo do paciente"
                className={`w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none border-2 transition-colors ${campoAtivoPed === 'nome' ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 bg-white'}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Celular / WhatsApp</label>
              <input
                ref={pedCelRef}
                type="tel"
                value={pedCelular}
                onChange={e => {
                  const d = e.target.value.replace(/\D/g, '').slice(0, 11)
                  let f = d
                  if (d.length > 10) f = '(' + d.slice(0,2) + ') ' + d.slice(2,7) + '-' + d.slice(7)
                  else if (d.length > 6) f = '(' + d.slice(0,2) + ') ' + d.slice(2,6) + '-' + d.slice(6)
                  else if (d.length > 2) f = '(' + d.slice(0,2) + ') ' + d.slice(2)
                  setPedCelular(f)
                }}
                onFocus={() => setCampoAtivoPed('celular')}
                placeholder="(00) 00000-0000"
                inputMode="numeric"
                className={`w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none border-2 transition-colors ${campoAtivoPed === 'celular' ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 bg-white'}`}
              />
            </div>
            {/* Botao cinza piscante com PLAY + "CONFIRMO" (vinho) \u2014 aparece quando os dados estao validos */}
            {podeEnviar && (
              <div className="flex flex-col items-center gap-1 pt-1">
                <style>{`@keyframes rfPlayBlinkWinePed { 0%,100%{box-shadow:0 0 0 0 rgba(123,30,30,0.55);} 50%{box-shadow:0 0 0 9px rgba(123,30,30,0);} } .rf-play-wine-ped{ animation: rfPlayBlinkWinePed 1.1s ease-in-out infinite; }`}</style>
                <button onClick={enviarWhatsApp} aria-label="Solicitar exames pelo WhatsApp"
                  className="rf-play-wine-ped w-14 h-14 rounded-full bg-gray-300 hover:bg-gray-400 flex items-center justify-center transition-colors shadow-md">
                  <span style={{ color: '#7B1E1E', fontSize: '1.4rem', lineHeight: 1, marginLeft: 3 }}>{"\u25b6"}</span>
                </button>
                <span className="text-xs font-bold tracking-wide" style={{ color: '#7B1E1E' }}>CONFIRMO</span>
              </div>
            )}
            <button
              onClick={onVoltarInicio}
              className="w-full text-center text-gray-400 hover:text-gray-600 text-xs font-medium py-1">
              {"Continuar sem solicitar agora"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ===== TELA LIMITE 3 =====
  if (tela === 'limite3') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
        <div className="bg-white rounded-2xl max-w-md w-full max-h-[95vh] overflow-y-auto shadow-2xl">
          <div className="bg-white px-6 pt-6 pb-4 rounded-t-2xl text-center">
            <img src={logo} alt="RedFairy" className="w-20 h-20 object-contain mx-auto mb-2" />
            <h2 className="text-2xl font-bold text-red-700 leading-tight">{"RedFairy | Projeto OBA"}</h2>
            <p className="text-xs uppercase tracking-widest text-gray-500 mt-1">Limite gratuito</p>
          </div>
          <div className="p-6 space-y-5">
            <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 text-center">
              <p className="text-sm font-bold text-red-900 leading-relaxed">
                {"S\u00c3O POSS\u00cdVEIS DUAS AVALIA\u00c7\u00d5ES GRATUITAS POR CPF."}
                <br />
                {"PARA NOVA AVALIA\u00c7\u00c3O O PACIENTE DEVE ESTAR INSCRITO."}
              </p>
            </div>

            {modoMedico ? (
              <div className="text-center space-y-3">
                <div>
                  <p className="text-sm font-bold text-gray-800">RECOMENDE AO PACIENTE QUE SE CADASTRE</p>
                  <p className="text-xs text-gray-500 mt-0.5">ACUMULE PONTOS NO PROGRAMA 4DOC</p>
                </div>
                <button
                  onClick={onVoltarInicio}
                  className="w-full py-3 rounded-xl bg-red-900 hover:bg-red-950 text-white font-bold transition-colors text-sm">
                  Continuar
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={onCadastrar}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors text-sm">
                  IR PARA O CADASTRO
                </button>
                <label className="flex items-center justify-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    onChange={() => onVoltarInicio()}
                    className="w-3 h-3 cursor-pointer"
                    style={{ accentColor: '#9ca3af' }}
                  />
                  <span style={{ color: '#9ca3af', fontSize: '11px', letterSpacing: '0.5px' }}>{"AGORA N\u00c3O"}</span>
                </label>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ===== TELA AGUARDO =====
  if (tela === 'aguardo') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.6)' }}>
        <div className="bg-white rounded-2xl max-w-md w-full max-h-[95vh] overflow-y-auto shadow-2xl">
          {/* Header compacto com a fadinha RedFairy a' esquerda (padrao novo) */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100" style={{ background: 'rgba(255,255,255,0.92)' }}>
            <img src={logo} alt="RedFairy" style={{ width: 28, height: 28, objectFit: 'contain' }} />
            <h2 style={{ fontFamily: "'Georgia', serif", fontWeight: 900, fontSize: '1.2rem', letterSpacing: '-0.02em', margin: 0 }}>
              <span style={{ color: '#b91c1c' }}>Red</span><span style={{ color: '#ef4444' }}>Fairy</span><span style={{ color: '#7B1E1E', fontWeight: 700 }}>{" | OBA"}<sup style={{ fontSize: '0.5em', verticalAlign: 'super' }}>{"®"}</sup></span>
            </h2>
            <span className="ml-auto text-xs uppercase tracking-widest text-gray-500">{"\u2728 Triagem Salva"}</span>
          </div>
          <div className="px-6 pt-5 text-center">
            <h3 className="text-lg font-semibold text-gray-800 leading-tight">
              {modoMedico ? 'Triagem salva' : "Estaremos aguardando voc\u00ea!"}
            </h3>
          </div>

          <div className="p-6 space-y-4">
            <div className="text-center">
              <div className="text-5xl mb-3">{"\ud83d\udd2c"}</div>
              {modoMedico && inputs?.bariatrica ? (
                <p className="text-gray-800 leading-relaxed">
                  <strong>{"Doutor, paciente bari\u00e1trico exige uma investiga\u00e7\u00e3o mais complexa,"}</strong>
                  {" inclusive uma "}<strong>{"ANAMNESE ESPEC\u00cdFICA"}</strong>{". Encaminhe o paciente para que se cadastre: n\u00f3s cuidaremos de tudo e retornaremos a voc\u00ea com o resultado dessa avalia\u00e7\u00e3o."}
                </p>
              ) : modoMedico ? (
                <p className="text-gray-800 leading-relaxed">
                  {"Se voc\u00ea tem tamb\u00e9m a "}<strong>FERRITINA</strong>{" e "}<strong>{"SATURA\u00c7\u00c3O DA TRANSFERRINA"}</strong>{" do paciente, podemos prosseguir para uma avalia\u00e7\u00e3o melhor."}
                  <br /><br />
                  {"Se n\u00e3o tem esses dados, solicite e retorne, ou encaminhe o paciente para que se cadastre."}
                </p>
              ) : (
                <>
                  <p className="text-gray-800 leading-relaxed">
                    <strong>{"Quando tiver os resultados de FERRITINA e SATURA\u00c7\u00c3O DA TRANSFERRINA, retorne."}</strong>
                  </p>
                  <p className="text-sm text-gray-600 mt-3 leading-relaxed">
                    {"Seus dados foram salvos. Quando voltar com os exames complementares, continuaremos a sua avalia\u00e7\u00e3o de onde paramos."}
                  </p>
                </>
              )}
            </div>

            {!modoMedico && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">
                <p className="text-sm text-blue-900 italic">
                  {"\"Estaremos aguardando voc\u00ea! \u2728\""}
                </p>
              </div>
            )}
          </div>

          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={onVoltarInicio}
              className="w-full py-3 rounded-xl bg-red-900 hover:bg-red-950 active:bg-red-950 text-white font-bold transition-colors text-sm">
              Continuar
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ===== TELA RESULTADO =====
  // Pre-calcula CRM (logado ou prefill da landing). SÓ em modo médico — no fluxo
  // do paciente nunca exibimos CRM (o prefill pode ser resíduo de uma sessão médica).
  let crmExibir = modoMedico ? medicoCRM : ''
  if (!crmExibir && modoMedico) { try { crmExibir = localStorage.getItem('rf_crm_prefill') || '' } catch(e) { crmExibir = '' } }

  const dataColetaFmt = fmtDataColeta(inputs?.data_coleta)
  const dataEstimadaFlag = !!inputs?.data_estimada

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[95vh] overflow-y-auto shadow-2xl">

        {/* Header compacto horizontal: logo-fada + "RedFairy" em serif (dois tons),
            no padrão da landing/TriagemModal. Reduz a altura do modal. */}
        <div style={{ background: '#fff', borderBottom: '1px solid #f1f5f9', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }} className="rounded-t-2xl">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src={logo} alt="RedFairy" style={{ width: 28, height: 28, objectFit: 'contain' }} />
            <h2 style={{ fontFamily: "'Georgia', serif", fontWeight: 900, fontSize: '1.25rem', letterSpacing: '-0.02em', margin: 0 }}>
              <span style={{ color: '#b91c1c' }}>Red</span><span style={{ color: '#ef4444' }}>Fairy</span><span style={{ color: '#7B1E1E', fontWeight: 700 }}>{" | OBA"}<sup style={{ fontSize: '0.5em', verticalAlign: 'super' }}>{"®"}</sup></span>
            </h2>
          </div>
        </div>

        <div className="bg-white px-6 pt-3 pb-4 text-center">
          <p className="text-xs uppercase tracking-widest text-gray-500">
            {isNormal ? "\u2705 Triagem Conclu\u00edda" : "\ud83e\ude7a Triagem - Achados"}
          </p>
          <h3 className={`text-lg font-bold mt-2 leading-tight ${
            isNormal
              ? 'text-green-700'
              : resultado.color === 'red'
                ? 'text-red-700'
                : 'text-orange-600'
          }`}>{resultado.label}</h3>
          {(inputs?.cpf || dataColetaFmt) && (
            <p className="text-xs text-gray-700 mt-1 tracking-wide">
              {[inputs?.cpf, dataColetaFmt.replace(/\//g,'')].filter(Boolean).join(" \u00b7 ")}
            </p>
          )}
        </div>

        <div className="p-6 space-y-4">
          {/* Tabela de resultados */}
          {(() => {
            const hb = parseFloat(inputs?.hemoglobina);
            const vcm = parseFloat(inputs?.vcm);
            const rdw = parseFloat(inputs?.rdw);
            const sexo = inputs?.sexo;
            const gestante = !!inputs?.gestante;
            let hbMin, hbMax;
            if (sexo === 'M') { hbMin = 13.5; hbMax = 17.5; }
            else if (gestante) { hbMin = 11.0; hbMax = 15.5; }
            else { hbMin = 12.0; hbMax = 15.5; }
            const traco = "\u2014"
            const setaDn = "\u2193"
            const setaUp = "\u2191"
            const hbInterp = isNaN(hb) ? traco : (hb < hbMin ? setaDn : hb > hbMax ? setaUp : 'NORMAL');
            const vcmInterp = isNaN(vcm) ? traco : (vcm < 80 ? setaDn : vcm > 100 ? setaUp : 'NORMAL');
            const rdwInterp = isNaN(rdw) ? traco : (rdw > 15 ? 'AMPLIADO' : 'NORMAL');
            const cell = 'px-2 py-1.5 text-xs';
            const corInterp = (txt) => {
              if (txt === 'NORMAL') return 'text-gray-700';
              if (txt === traco) return 'text-gray-400';
              return 'text-red-700 font-semibold';
            };
            const renderInterp = (txt) => (txt === setaUp || txt === setaDn)
              ? <span style={{ fontSize:'1.6rem', fontWeight:800, lineHeight:1, display:'inline-block' }}>{txt}</span>
              : txt;
            return (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-100 text-gray-600 uppercase tracking-wide">
                      <th className={cell + ' text-left font-semibold'}>{"Par\u00e2metro"}</th>
                      <th className={cell + ' text-right font-semibold'}>Valor</th>
                      <th className={cell + ' text-left font-semibold'}>Und</th>
                      <th className={cell + ' text-center font-semibold'}>{"Interpreta\u00e7\u00e3o"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className={cell + ' font-medium text-gray-800'}>Hemoglobina</td>
                      <td className={cell + ' text-right tabular-nums'}>{isNaN(hb) ? traco : hb.toFixed(1)}</td>
                      <td className={cell + ' text-gray-600'}>g/dL</td>
                      <td className={cell + ' text-center ' + corInterp(hbInterp)}>{renderInterp(hbInterp)}</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className={cell + ' font-medium text-gray-800'}>{"Volume Globular M\u00e9dio"}</td>
                      <td className={cell + ' text-right tabular-nums'}>{isNaN(vcm) ? traco : vcm.toFixed(1)}</td>
                      <td className={cell + ' text-gray-600'}>fL</td>
                      <td className={cell + ' text-center ' + corInterp(vcmInterp)}>{renderInterp(vcmInterp)}</td>
                    </tr>
                    <tr>
                      <td className={cell + ' font-medium text-gray-800'}>RDW</td>
                      <td className={cell + ' text-right tabular-nums'}>{isNaN(rdw) ? traco : rdw.toFixed(1)}</td>
                      <td className={cell + ' text-gray-600'}>CV %</td>
                      <td className={cell + ' text-center ' + corInterp(rdwInterp)}>{renderInterp(rdwInterp)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })()}

          {/* Bloco azul - recomendacao */}
          <div className="rounded-xl border-2 border-blue-300 bg-blue-50 p-4">
            {isNormal ? (
              modoMedico ? (
                <div className="space-y-2">
                  <p className="text-sm font-bold text-blue-900">
                    {"\u2728 Aparentemente os exames do seu paciente est\u00e3o bem"}
                  </p>
                  <p className="text-sm text-blue-900 leading-snug">
                    {"Mas ainda assim eles n\u00e3o revelariam uma "}<strong>baixa reserva</strong>{" ou "}
                    <strong>excesso de ferro</strong>{". Recomende ao paciente que traga a "}
                    <strong>FERRITINA</strong>{" e a "}<strong>{"SATURA\u00c7\u00c3O DA TRANSFERRINA"}</strong>{"."}
                  </p>
                  <p className="text-sm text-blue-900 leading-snug">
                    {"Se "}{inputs?.sexo === 'F' ? 'ela' : 'ele'}{" n\u00e3o fez nenhum tratamento recente, "}
                    <strong>{"PARAB\u00c9NS!"}</strong>{" Vida que segue muito bem para "}{inputs?.sexo === 'F' ? 'ela' : 'ele'}{". Caso contr\u00e1rio, se "}{inputs?.sexo === 'F' ? 'ela' : 'ele'}{" fez ou est\u00e1 em tratamento, podemos cuidar "}{inputs?.sexo === 'F' ? 'dela' : 'dele'}{"."}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-bold text-blue-900">
                    {"\u2728 Aparentemente seus exames est\u00e3o bem"}
                  </p>
                  <p className="text-sm text-blue-900 leading-snug">
                    {"Mas ainda assim eles n\u00e3o revelariam uma "}<strong>baixa reserva</strong>{" ou "}
                    <strong>excesso de ferro</strong>{". Recomendamos que voc\u00ea traga a "}
                    <strong>FERRITINA</strong>{" e a "}<strong>{"SATURA\u00c7\u00c3O DA TRANSFERRINA"}</strong>{"."}
                  </p>
                  <p className="text-sm text-blue-900 leading-snug">
                    {"Se voc\u00ea n\u00e3o fez nenhum tratamento recente, "}
                    <strong>{"PARAB\u00c9NS!"}</strong>{" Vida que segue muito bem para voc\u00ea. Caso contr\u00e1rio, se voc\u00ea fez ou est\u00e1 em tratamento, cuidaremos de voc\u00ea."}
                  </p>
                </div>
              )
            ) : modoMedico ? (
              <div>
                <p className="text-xs uppercase tracking-widest text-blue-700 font-bold mb-2">
                  {"\ud83e\ude7a IMPORTANTE"}
                </p>
                <p className="text-sm text-blue-900 leading-snug">
                  {"Para entender melhor o eritron, precisamos da "}<strong>FERRITINA</strong>{" e da "}<strong>{"SATURA\u00c7\u00c3O DA TRANSFERRINA [%]"}</strong>{sufB12}{". Solicite esses exames e lance aqui os resultados, ou encaminhe o/a paciente para que se cadastre na plataforma, nos solicite o pedido desses exames, e lance os resultados. N\u00f3s faremos a an\u00e1lise e retornaremos a voc\u00ea com a conclus\u00e3o."}
                </p>
              </div>
            ) : isDemo ? (
              <div>
                <p className="text-xs uppercase tracking-widest text-blue-700 font-bold mb-2">
                  {"\u2728 Aprofundar Diagn\u00f3stico"}
                </p>
                <p className="text-sm text-blue-900 leading-snug mb-2">
                  {"Para um diagn\u00f3stico mais preciso, voc\u00ea precisa NO M\u00cdNIMO de "}
                  <strong>FERRITINA</strong>{" e "}<strong>{"SATURA\u00c7\u00c3O DA TRANSFERRINA"}</strong>{sufB12}{". S\u00e3o de baixo custo, resultados r\u00e1pidos, normalmente cobertos por planos de sa\u00fade."}
                </p>
                <p className="text-sm text-blue-900 leading-snug">
                  {"Ao se cadastrar aqui voc\u00ea ter\u00e1 "}<strong>acompanhamento por 1 ano</strong>{", e esse "}<strong>{"primeiro pedido de exames ser\u00e1 gratuito"}</strong>{"."}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs uppercase tracking-widest text-blue-700 font-bold mb-2">
                  {"\u2728 Aprofundar Diagn\u00f3stico"}
                </p>
                <p className="text-sm text-blue-900 leading-snug">
                  {"Para um diagn\u00f3stico mais preciso, \u00e9 necess\u00e1rio fazer "}
                  <strong>FERRITINA</strong>{" e "}<strong>{"SATURA\u00c7\u00c3O DA TRANSFERRINA"}</strong>{sufB12}{". S\u00e3o de baixo custo, resultados r\u00e1pidos, normalmente cobertos por planos de sa\u00fade. Solicite esses exames e traga os resultados aqui para uma avalia\u00e7\u00e3o completa."}
                </p>
              </div>
            )}
          </div>

          {/* Bloco amber bariatrica */}
          {inputs?.bariatrica === true && showCadastroBtn && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
              <p className="text-sm text-amber-900 leading-relaxed">
                {"Normalmente, a partir daqui, gravamos essas informa\u00e7\u00f5es e pedimos ao paciente que retorne depois com FERRITINA e SATURA\u00c7\u00c3O DA TRANSFERRINA."}
                <br /><br />
                {"Mas como "}<strong>{"voc\u00ea \u00e9 "}{inputs?.sexo === 'F' ? "bari\u00e1trica" : "bari\u00e1trico"}</strong>{", recomendamos o seu "}<strong>CADASTRO</strong>{" na plataforma, passando pela "}<strong>ANAMNESE</strong>{" completa. De l\u00e1 vamos solicitar esses e outros exames para entender voc\u00ea, e tornar a sua vida melhor."}
              </p>
            </div>
          )}

          {/* Frase rosa gestante */}
          {inputs?.sexo === 'F' && inputs?.gestante === true && (
            <div className="rounded-xl border border-pink-200 bg-pink-50 p-4">
              <p className="text-sm text-pink-900 leading-relaxed">
                {modoMedico ? (
                  <>{"Lembre \u00e0 sua paciente que "}<strong>{"gravidez e amamenta\u00e7\u00e3o"}</strong>{" demandam muito "}<strong>{"ferro, vitaminas e minerais"}</strong>{" \u2014 \u00e9 preciso estar com boas reservas."}</>
                ) : (
                  <><strong>{"Gravidez e amamenta\u00e7\u00e3o"}</strong>{" demandam muito "}<strong>{"ferro, vitaminas e minerais"}</strong>{" \u2014 \u00e9 preciso estar com boas reservas."}</>
                )}
              </p>
            </div>
          )}

          {/* "SANGUE COLHIDO EM: [data]" removido: CPF e data da coleta j\u00e1 aparecem
              acima (em ACHADOS). Mant\u00e9m s\u00f3 o CRM, quando houver. */}
          {crmExibir && (
            <div className="text-center mt-3" style={{ color: '#1d4ed8', fontSize: '12px', lineHeight: 1.4 }}>
              <p>CRM {crmExibir}</p>
            </div>
          )}

          {/* Crítica de exames antigos (fraseData vinda do engine). */}
          {resultado.fraseData && (() => {
            // Dias: usa diasDesdeColeta do engine; se ausente, recalcula de inputs.data_coleta.
            let dias = resultado.diasDesdeColeta;
            if (dias == null || Number.isNaN(Number(dias))) {
              const dc = inputs?.data_coleta || '';
              let dt = null;
              if (/^\d{2}\/\d{2}\/\d{4}$/.test(dc)) {
                const [d, m, a] = dc.split('/').map(Number);
                dt = new Date(a, m - 1, d);
              } else if (/^\d{4}-\d{2}-\d{2}$/.test(dc)) {
                dt = new Date(dc);
              }
              if (dt && !Number.isNaN(dt.getTime())) {
                const hoje = new Date(); hoje.setHours(0,0,0,0); dt.setHours(0,0,0,0);
                dias = Math.floor((hoje.getTime() - dt.getTime()) / 86400000);
              }
            }
            const tipo = resultado.fraseData.tipo;
            // A = recente (verde), B = atenção (amarelo), C = não confiável (vermelho)
            const estilo = tipo === 'A'
              ? { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d' }
              : tipo === 'B'
                ? { bg: '#fffbeb', border: '#fde68a', color: '#b45309' }
                : { bg: '#fef2f2', border: '#fecaca', color: '#b91c1c' };
            const temDias = dias != null && !Number.isNaN(Number(dias));
            const texto = (temDias && typeof resultado.fraseData.texto === 'string')
              ? resultado.fraseData.texto.replace(/\bNaN\b/g, String(dias))
              : resultado.fraseData.texto;
            return (
              <div className="rounded-xl border px-4 py-3 mt-3 text-sm"
                style={{ background: estilo.bg, borderColor: estilo.border, color: estilo.color }}>
                <p className="font-semibold mb-1">{"\ud83d\udcc5 "}{temDias ? dias : '?'}{" dia(s) desde a coleta"}</p>
                <p style={{ lineHeight: 1.4 }}>{texto}</p>
              </div>
            );
          })()}

          {erroSalvamento && (
            <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              {"\u26a0\ufe0f "}{erroSalvamento}
            </div>
          )}
        </div>

        {/* Acoes */}
        <div className="px-6 pb-6 flex gap-3">
          {showCadastroBtn ? (
            <>
              <button
                onClick={handleContinuar}
                disabled={salvando}
                className="flex-1 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors text-sm disabled:opacity-50 disabled:cursor-wait">
                {salvando ? 'Salvando...' : "Agora n\u00e3o"}
              </button>
              <button
                onClick={handleCadastrarComSalvamento}
                disabled={salvando}
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold transition-colors text-sm disabled:opacity-50 disabled:cursor-wait">
                {salvando ? 'Salvando...' : <>{"Continuar para o cadastro \u2192"}</>}
              </button>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-end">
              <PlayButton
                onClick={handleContinuar}
                loading={salvando}
                label={modoMedico ? 'PROSSEGUIR' : 'SALVAR E PROSSEGUIR'}
                ariaLabel="Salvar e prosseguir"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
