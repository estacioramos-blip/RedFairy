import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import logo from '../assets/logo.png'

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

const PIX_VALOR = 149.90
const PIX_COPIA_COLA = "00020126580014BR.GOV.BCB.PIX01367f45b640-5732-4d2a-bb9a-f3de223d9eab5204000053039865406149.905802BR5925CYTOMICA - MEDICINA, PESQ6009SAO PAULO61080540900062250521MRltMfAMak4i2IRfy0kup6304BA6A"

export default function PagamentoCadastroModal({ profile, onPago, onSairSemPagar }) {
  const [copiado, setCopiado] = useState(false)
  const [confirmandoSaida, setConfirmandoSaida] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function copiarPix() {
    try {
      await navigator.clipboard.writeText(PIX_COPIA_COLA)
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
        valor_pago: PIX_VALOR,
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
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl my-8">

        {/* Header */}
        <div className="text-center mb-5">
          <img src={logo} alt="RedFairy" style={{ width: 56, height: 56, margin: '0 auto 8px' }} />
          <h2 className="text-xl font-bold text-red-700">{"Ativar seu cadastro"}</h2>
          <p className="text-xs text-gray-500 mt-1">
            {"Pague R$ 149,90 via PIX e tenha acesso \u00e0 plataforma por 1 ano."}
          </p>
        </div>

        {/* Valor destaque */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center mb-4">
          <div className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-1">
            {"Valor a pagar"}
          </div>
          <div className="text-3xl font-black text-red-700">
            {"R$ 149,90"}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {"Assinatura anual \u2014 acesso completo"}
          </div>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center bg-white border border-gray-200 rounded-xl p-4 mb-3">
          <QRCodeSVG
            value={PIX_COPIA_COLA}
            size={200}
            level="M"
            includeMargin={false}
          />
          <p className="text-xs text-gray-500 mt-3 text-center">
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
              value={PIX_COPIA_COLA}
              className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-xs text-gray-600 bg-gray-50 font-mono truncate"
              onFocus={(e) => e.target.select()}
            />
            <button
              onClick={copiarPix}
              className={`px-3 py-2 ${copiado ? 'bg-green-600 hover:bg-green-700' : 'bg-red-700 hover:bg-red-800'} text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap`}>
              {copiado ? "\u2713 Copiado!" : "Copiar"}
            </button>
          </div>
        </div>

        {erro && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
            <p className="text-xs font-semibold text-red-700">{erro}</p>
          </div>
        )}

        {/* Acoes */}
        <button
          onClick={handleJaPaguei}
          disabled={salvando}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold text-sm py-3 rounded-lg transition-colors mb-2">
          {salvando ? "Registrando..." : "\u2713 J\u00e1 paguei \u2014 ativar meu acesso"}
        </button>

        <button
          onClick={handleSairClick}
          className="w-full bg-transparent hover:bg-gray-100 text-gray-500 font-medium text-xs py-2 rounded-lg transition-colors">
          {"Sair sem pagar"}
        </button>

        {/* Aviso */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          <p className="text-[10px] text-gray-400 leading-relaxed text-center">
            {"Ao confirmar o pagamento, seu acesso \u00e9 ativado imediatamente. O comprovante \u00e9 verificado em at\u00e9 24h \u2014 caso o pagamento n\u00e3o seja localizado, o acesso pode ser suspenso."}
          </p>
        </div>

      </div>
    </div>
  )
}
