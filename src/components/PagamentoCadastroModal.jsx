import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import { gerarPixAnuidade, formatarBRL, VALOR_ANUIDADE_PADRAO } from '../lib/pix'
import logo from '../assets/logo.png'
import PlayButton from './PlayButton'

/**
 * PagamentoCadastroModal - exibido apos o paciente completar o perfil.
 * Cobra R$ 149,90 via PIX para ativar a assinatura anual.
 *
 * Fluxo:
 *   - Mostra QR code + copia-e-cola
 *   - "Ja paguei" -> INSERT em assinaturas (status 'ativa', confia no paciente)
 *                -> onPago(novaAssinatura)
 *   - "Sair sem pagar" -> onSairSemPagar() (cadastro fica incompleto)
 *
 * Props:
 *   profile:           objeto do profile (precisa de id)
 *   onPago:            funcao(assinatura) - chamada apos INSERT bem-sucedido
 *   onSairSemPagar:    funcao() - chamada quando o paciente fecha sem pagar
 */

// Tabela de custos do "trabalho médico" exibida no popup ATENÇÃO.
// Cada item lê seu valor de config (chave). Os valores/labels podem ser
// ajustados depois — por ora a estrutura já lê do Supabase e mostra "—"
// quando a chave ainda não existe no banco.
const SERVICOS = [
  { chave: 'valor_teleconsulta',         label: 'CONSULTA (VÍDEO)' },
  { chave: 'valor_discussao_caso',       label: 'DISCUSSÃO DE CASO CLÍNICO' },
  { chave: 'valor_relatorio_especifico', label: 'RELATÓRIO PARA FINS ESPECÍFICOS' },
  { chave: 'valor_atestado',             label: 'ATESTADO APÓS TELECONSULTA' },
  { chave: 'valor_solic_laboratorio',    label: 'SOLICITAÇÃO DE LABORATÓRIO' },
  { chave: 'valor_solic_bioimagem',      label: 'SOLICITAÇÃO DE BIOIMAGEM' },
  { chave: 'valor_solic_endoscopia',     label: 'SOLICITAÇÃO DE ENDOSCOPIA' },
  { chave: 'valor_solic_cardiologico',   label: 'SOLICITAÇÃO DE EXAME CARDIOLÓGICO' },
  { chave: 'valor_solic_outros',         label: 'SOLICITAÇÃO DE OUTROS EXAMES' },
]

export default function PagamentoCadastroModal({ profile, onPago, onSairSemPagar }) {
  const [copiado, setCopiado] = useState(false)
  const [confirmandoSaida, setConfirmandoSaida] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  // Valor da anuidade lido do banco (config.valor_anuidade); cai no padrão se ausente.
  const [valor, setValor] = useState(VALOR_ANUIDADE_PADRAO)
  // Popup "ATENÇÃO" com os custos do trabalho médico (valores vindos de config).
  const [mostrarCustos, setMostrarCustos] = useState(false)
  const [custos, setCustos] = useState({})
  useEffect(() => {
    const chaves = ['valor_anuidade', ...SERVICOS.map(s => s.chave)]
    supabase.from('config').select('chave, valor').in('chave', chaves)
      .then(({ data }) => {
        if (!data) return
        const map = {}
        data.forEach(r => { map[r.chave] = r.valor })
        const n = Number(map['valor_anuidade'])
        if (Number.isFinite(n) && n > 0) setValor(n)
        setCustos(map)
      })
  }, [])
  // Código Pix gerado dinamicamente a partir do valor (com CRC recalculado).
  const pixCode = gerarPixAnuidade(valor)

  async function copiarPix() {
    try {
      await navigator.clipboard.writeText(pixCode)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch (e) {
      setErro('Nao foi possivel copiar. Selecione e copie manualmente.')
    }
  }

  async function handleJaPaguei() {
    setErro('')
    setSalvando(true)
    const agora = new Date()
    const umAno = new Date(agora.getTime() + 365 * 24 * 60 * 60 * 1000)
    const { data, error } = await supabase
      .from('assinaturas')
      .insert({
        user_id: profile.id,
        status: 'ativa',
        data_inicio: agora.toISOString(),
        data_fim: umAno.toISOString(),
        valor_pago: valor,
      })
      .select()
      .maybeSingle()
    setSalvando(false)
    if (error) {
      setErro('Erro ao registrar pagamento. Tente novamente em alguns segundos.')
      return
    }
    if (onPago) onPago(data)
  }

  function handleSairClick() {
    setConfirmandoSaida(true)
  }

  function handleConfirmarSaida() {
    if (onSairSemPagar) onSairSemPagar()
  }

  // Modal de confirmacao de saida sobreposto
  if (confirmandoSaida) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[60]">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
          <h3 className="text-lg font-bold text-red-700 mb-2">{"Sair sem completar o cadastro?"}</h3>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            {"Seu cadastro ficar\u00e1 incompleto. Sem o pagamento, voc\u00ea n\u00e3o ter\u00e1 acesso \u00e0 plataforma por um ano."}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirmandoSaida(false)}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold text-sm py-2.5 rounded-lg transition-colors">
              {"Voltar a pagar"}
            </button>
            <button
              onClick={handleConfirmarSaida}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors">
              {"Sair mesmo assim"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-xl my-8 overflow-hidden">

        {/* Header padr\u00e3o (logo-fada + RedFairy) */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100" style={{ background: 'rgba(255,255,255,0.92)' }}>
          <img src={logo} alt="RedFairy" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          <h2 style={{ fontFamily: "'Georgia', serif", fontWeight: 900, fontSize: '1.2rem', letterSpacing: '-0.02em', margin: 0 }}>
            <span style={{ color: '#b91c1c' }}>Red</span><span style={{ color: '#ef4444' }}>Fairy</span>
            <span style={{ color: '#9ca3af', fontWeight: 400 }}>{" | "}</span>
            <span style={{ color: '#000000' }}>{"OBA"}<sup style={{ fontSize: '0.6em', verticalAlign: 'super' }}>{"®"}</sup></span>
          </h2>
        </div>

        <div className="p-6">

        {/* T\u00edtulo vinho do modal */}
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold text-red-700">{"Ativar seu cadastro"}</h2>
        </div>

        {/* Valor destaque */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center mb-4">
          <div className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-1">
            {"Valor a pagar | PIX"}
          </div>
          <div className="text-3xl font-black text-red-700">
            {"R$ "}{formatarBRL(valor)}
          </div>
          <div className="text-xs mt-1 inline-flex items-center gap-1.5">
            <span className="font-bold text-black">{"ASSINATURA ANUAL"}</span>
            <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-red-600 text-red-600 text-[9px] font-bold leading-none">{"!"}</span>
            <button
              type="button"
              onClick={() => setMostrarCustos(true)}
              className="font-bold text-red-700 underline hover:text-red-800 transition-colors">
              {"Entenda"}
            </button>
          </div>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center bg-white border border-gray-200 rounded-xl p-4 mb-3">
          <QRCodeSVG
            value={pixCode}
            size={150}
            level="M"
            includeMargin={false}
          />
          <p className="text-sm text-black mt-3 text-center">
            {"Aponte a c\u00e2mera do seu banco para o QR Code"}
          </p>
        </div>

        {/* Copia-e-cola */}
        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            {"Ou copie o c\u00f3digo PIX:"}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={pixCode}
              className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-xs text-gray-600 bg-gray-50 font-mono truncate"
              onFocus={(e) => e.target.select()}
            />
            <button
              onClick={copiarPix}
              className={`px-3 py-2 ${copiado ? 'bg-green-600 hover:bg-green-700' : 'bg-red-700 hover:bg-red-800'} text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap`}>
              {copiado ? "Copiado!" : "Copiar"}
            </button>
          </div>
        </div>

        {erro && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
            <p className="text-xs font-semibold text-red-700">{erro}</p>
          </div>
        )}

        {/* Acoes \u2014 bot\u00e3o PLAY centralizado (exce\u00e7\u00e3o: j\u00e1 vem piscando ao abrir o modal,
            alinhado ao centro porque \u00e0 direita destoava do bot\u00e3o Copiar acima). */}
        <div className="flex flex-col items-center mb-3">
          <PlayButton
            onClick={handleJaPaguei}
            loading={salvando}
            label={"J\u00c1 PAGUEI"}
            hint="Ativar meu acesso"
            ariaLabel="Ja paguei - ativar meu acesso"
          />
        </div>

        {/* Aviso */}
        <div className="pt-3 border-t border-gray-100">
          <p className="text-sm text-black leading-relaxed text-center">
            {"O seu acesso \u00e9 ativado imediatamente. Se o recebimento n\u00e3o for confirmado em at\u00e9 48 horas \u2014 o acesso ser\u00e1 suspenso."}
          </p>
        </div>

        <button
          onClick={handleSairClick}
          className="w-full bg-transparent hover:bg-gray-100 text-gray-400 font-medium text-xs py-2 mt-1 rounded-lg transition-colors">
          {"Sair sem pagar"}
        </button>

        </div>
      </div>

      {/* Popup ATENÇÃO — custos do trabalho médico (valores de config). */}
      {mostrarCustos && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[70]"
          onClick={() => setMostrarCustos(false)}>
          <div
            className="bg-white border-2 border-gray-300 rounded-2xl max-w-md w-full p-5 shadow-xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-base font-extrabold text-red-700">{"ATENÇÃO:"}</h3>
              <button
                onClick={() => setMostrarCustos(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none -mt-1"
                aria-label="Fechar">
                {"×"}
              </button>
            </div>
            <p className="text-sm font-bold text-black leading-relaxed mb-3">
              {"A assinatura dá direito a quantas avaliações você quiser fazer no algoritmo ao longo de um ano, com relatórios de STATUS, ORIENTAÇÕES e RECOMENDAÇÕES."}
            </p>
            <p className="text-sm font-bold text-black leading-relaxed mb-4">
              {"Seguir as recomendações do sistema levará à melhor qualidade de vida possível para você, mas o trabalho médico decorrente dessas recomendações terá os seguintes custos:"}
            </p>
            <table className="w-full text-xs">
              <tbody>
                {SERVICOS.map((s) => {
                  const v = Number(custos[s.chave])
                  const txt = Number.isFinite(v) && v > 0 ? `R$ ${formatarBRL(v)}` : '—'
                  return (
                    <tr key={s.chave} className="border-b border-gray-100">
                      <td className="py-1.5 pr-2 text-gray-700 font-medium">{s.label}</td>
                      <td className="py-1.5 text-right font-bold text-gray-900 whitespace-nowrap">{txt}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="text-[11px] font-bold text-gray-700 leading-relaxed mt-4">
              <span className="text-red-700">{"OBSERVAÇÃO:"}</span>
              {" As solicitações são separadas porque destinam-se a diferentes serviços, mas cada solicitação pode conter um ou mais exames. O valor é cobrado por documento."}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
