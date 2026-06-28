import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import fadaIcon from '../assets/logo.png'

/**
 * QRMedicoModal — QR de ENCAMINHAMENTO do médico (4DOC).
 * O médico mostra este QR ao paciente; o paciente escaneia, cai no RedFairy já
 * com o CRM "colado" (?ref=CRM/UF), cadastra e paga → crédito do médico.
 *
 * Props: crm ('6302/BA'), onClose().
 */
export default function QRMedicoModal({ crm, onClose }) {
  const [copiado, setCopiado] = useState(false)
  const base = (typeof window !== 'undefined' && window.location && window.location.origin)
    ? window.location.origin
    : 'https://redfairy.bio'
  const link = `${base}/?ref=${encodeURIComponent(crm || '')}`

  function copiar() {
    try {
      navigator.clipboard.writeText(link).then(() => {
        setCopiado(true)
        setTimeout(() => setCopiado(false), 2500)
      })
    } catch (e) {}
  }

  // Ao APARECER o QR, o link e' copiado automaticamente no celular do medico — ele cola
  // no WhatsApp/Telegram e envia aos pacientes (ou a secretaria dispara para todos).
  useEffect(() => {
    try { navigator.clipboard.writeText(link).then(() => setCopiado(true)).catch(() => {}) } catch (e) {}
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.95)' }} onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4" style={{ background: '#6B7280' }}>
          <h2 className="text-lg font-bold" style={{ color: '#facc15' }}>{"Seu QR de encaminhamento"}</h2>
          <p className="text-xs mt-1" style={{ color: '#FDE68A' }}>{"Cada paciente que escanear, se cadastrar e pagar = 1 crédito pra você."}</p>
        </div>

        <div className="p-6 flex flex-col items-center text-center gap-3">
          <div style={{ background: '#fff', padding: 12, borderRadius: 14, border: '1px solid #e5e7eb' }}>
            <QRCodeSVG
              value={link}
              size={216}
              level="H"
              bgColor="#ffffff"
              fgColor="#7B1E1E"
            />
          </div>
          <p className="text-sm font-bold text-gray-800">{"CRM "}{crm}</p>

          <div className="w-full bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-left">
            <p className="text-xs text-amber-900 leading-relaxed">
              {"Diga ao paciente: escaneie, cadastre-se e use só "}
              <strong>{"DATA, HEMOGLOBINA, VCM e RDW"}</strong>
              {" do hemograma."}
            </p>
          </div>

          {copiado && (
            <div className="w-full bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-left">
              <p className="text-xs text-green-800 font-bold leading-relaxed">
                {"✓ LINK copiado no seu celular! Cole no WhatsApp ou Telegram e envie aos seus pacientes — ou peça à sua secretária para enviar a todos do arquivo."}
              </p>
            </div>
          )}

          <div className="w-full flex items-center gap-2">
            <input readOnly value={link}
              className="flex-1 min-w-0 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-600 bg-gray-50"
              onFocus={e => e.target.select()} />
            <button onClick={copiar}
              className="shrink-0 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
              {copiado ? '✓ Copiado' : 'Copiar'}
            </button>
          </div>

          <button onClick={onClose}
            className="w-full mt-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-xl text-sm transition-colors">
            {"Fechar"}
          </button>
        </div>
      </div>
    </div>
  )
}
