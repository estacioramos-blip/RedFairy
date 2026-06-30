import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import fadaIcon from '../assets/logo.png'
import obaLogo from '../assets/oba-logo.png'

/**
 * QRMedicoModal — QR de ENCAMINHAMENTO do médico (4DOC).
 * O médico mostra este QR ao paciente; o paciente escaneia, cai no RedFairy já
 * com o CRM "colado" (?ref=CRM/UF), cadastra e paga → crédito do médico.
 *
 * Props: crm ('6302/BA'), onClose().
 */
export default function QRMedicoModal({ crm, onClose, foco = 'qr' }) {
  const [copiado, setCopiado] = useState(false)
  const base = (typeof window !== 'undefined' && window.location && window.location.origin)
    ? window.location.origin
    : 'https://redfairy.bio'
  const linkQR = `${base}/?ref=${encodeURIComponent(crm || '')}`   // QR presencial → Situação 1 ("Super!")
  const linkSelf = `${linkQR}&self=1`                              // link enviado → Situação 2 ("Opa!", auto-avaliação)

  function copiar() {
    try {
      navigator.clipboard.writeText(linkSelf).then(() => {
        setCopiado(true)
        setTimeout(() => setCopiado(false), 2500)
      })
    } catch (e) {}
  }

  // Encaminhar DIGITANDO o CPF (o médico tem o CPF mas não vai mandar link/QR).
  const [cpfEnc, setCpfEnc] = useState('')
  const [cpfEncMsg, setCpfEncMsg] = useState(null)   // {ok, txt}
  const [cpfEncBusy, setCpfEncBusy] = useState(false)
  const formatarCPF = (raw) => {
    const d = String(raw || '').replace(/\D/g, '').slice(0, 11)
    if (d.length <= 3) return d
    if (d.length <= 6) return d.slice(0, 3) + '.' + d.slice(3)
    if (d.length <= 9) return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6)
    return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6, 9) + '-' + d.slice(9)
  }
  async function encaminharPorCpf() {
    const d = String(cpfEnc || '').replace(/\D/g, '')
    if (d.length !== 11) { setCpfEncMsg({ ok: false, txt: 'CPF inválido (11 dígitos).' }); return }
    setCpfEncBusy(true); setCpfEncMsg(null)
    let token = ''
    try { token = localStorage.getItem('medico_token') || '' } catch (e) {}
    try {
      const { data } = await supabase.rpc('medico_encaminhar_cpf', { p_crm: crm, p_token: token, p_cpf: d })
      if (data && data.ok) {
        setCpfEncMsg({ ok: true, txt: data.ja_cadastrado
          ? 'Esse paciente já faz parte do Projeto. O encaminhamento foi registrado mesmo assim.'
          : 'Encaminhamento registrado! Quando esse paciente se cadastrar e pagar, o crédito é seu.' })
        setCpfEnc('')
      } else {
        setCpfEncMsg({ ok: false, txt: (data && data.erro) || 'Não foi possível registrar.' })
      }
    } catch (e) { setCpfEncMsg({ ok: false, txt: 'Erro de conexão. Tente de novo.' }) }
    setCpfEncBusy(false)
  }

  // Ao APARECER o QR, o link e' copiado automaticamente no celular do medico — ele cola
  // no WhatsApp/Telegram e envia aos pacientes (ou a secretaria dispara para todos).
  useEffect(() => {
    if (foco !== 'qr') return
    try { navigator.clipboard.writeText(linkSelf).then(() => setCopiado(true)).catch(() => {}) } catch (e) {}
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.95)' }} onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 flex items-center gap-3" style={{ background: '#6B7280' }}>
          <img src={obaLogo} alt="Projeto OBA" style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }} />
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#facc15' }}>{foco === 'cpf' ? 'Recomendar pelo CPF' : 'Seu QR-CODE + Link de Encaminhar'}</h2>
            <p className="text-xs mt-1" style={{ color: '#FDE68A' }}>{foco === 'cpf' ? 'Registre o CPF do bariátrico. Ao se cadastrar, ele pode destinar o crédito a você.' : 'Cada paciente que escanear, se cadastrar e pagar = 1 crédito pra você.'}</p>
          </div>
        </div>

        <div className="p-6 flex flex-col items-center text-center gap-3">
          {foco === 'qr' && (<>
          <div style={{ background: '#fff', padding: 12, borderRadius: 14, border: '1px solid #e5e7eb' }}>
            <QRCodeSVG
              value={linkQR}
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
            <input readOnly value={linkSelf}
              className="flex-1 min-w-0 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-600 bg-gray-50"
              onFocus={e => e.target.select()} />
            <button onClick={copiar}
              className={`shrink-0 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${copiado ? 'border-2 border-red-500' : ''}`}>
              {copiado ? '✓ Copiado' : 'Copiar'}
            </button>
          </div>
          </>)}

          {/* RECOMENDAR: registrar o CPF do paciente (sem link/QR). */}
          {foco === 'cpf' && (
          <div className="w-full pt-1 text-left">
            <p className="text-xs font-bold text-gray-600 mb-1.5">{"Digite o CPF do paciente:"}</p>
            <div className="flex items-center gap-2">
              <input value={cpfEnc} onChange={e => { setCpfEnc(formatarCPF(e.target.value)); setCpfEncMsg(null) }}
                placeholder="000.000.000-00" inputMode="numeric" maxLength={14}
                className="flex-1 min-w-0 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
              <button onClick={encaminharPorCpf} disabled={cpfEncBusy}
                className="shrink-0 text-white text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50" style={{ background: '#6B7280' }}>
                {cpfEncBusy ? '...' : 'Encaminhar'}
              </button>
            </div>
            {cpfEncMsg && <p className="text-xs font-bold mt-1.5 leading-snug" style={{ color: cpfEncMsg.ok ? '#15803d' : '#b91c1c' }}>{cpfEncMsg.txt}</p>}
          </div>
          )}

          <button onClick={onClose}
            className="w-full mt-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-xl text-sm transition-colors">
            {"Fechar"}
          </button>
        </div>
      </div>
    </div>
  )
}
