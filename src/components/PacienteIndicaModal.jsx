import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import { useInstalarFada } from '../lib/useInstalarFada'

/**
 * PacienteIndicaModal — o PACIENTE bariátrico vira INDICADOR: indica outros bariátricos
 * e ganha créditos (US$10 por indicado que paga), abatendo o próprio investimento.
 *
 * Ao abrir, ativa (idempotente) o registro de indicador do CPF (paciente_virar_indicador),
 * e mostra QR + link + instalar ícone + contadores. Crédito entra pela mesma engrenagem.
 *
 * Props: cpf, onFechar(). Requer migrate_paciente_indicador.sql aplicado.
 */
export default function PacienteIndicaModal({ cpf, onFechar }) {
  const [codigo, setCodigo] = useState('')
  const [dados, setDados] = useState(null)
  const [copiado, setCopiado] = useState(false)
  const [erro, setErro] = useState('')
  const { instalar, ios } = useInstalarFada()
  const base = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : 'https://redfairy.bio'
  const link = codigo ? `${base}/?ref=${codigo}` : ''

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const cpfd = String(cpf || '').replace(/\D/g, '')
        const { data } = await supabase.rpc('paciente_virar_indicador', { p_cpf: cpfd })
        if (!vivo) return
        if (data && data.ok && data.codigo) {
          setCodigo(data.codigo)
          const { data: pan } = await supabase.rpc('listar_creditos_indicador', { p_codigo: data.codigo })
          if (vivo && pan && pan.ok) setDados(pan)
        } else setErro((data && data.erro) || 'Não foi possível ativar a sua indicação.')
      } catch (e) { if (vivo) setErro('Erro de conexão. Tente de novo.') }
    })()
    return () => { vivo = false }
  }, [cpf])

  async function copiar() {
    try { await navigator.clipboard.writeText(link); setCopiado(true); setTimeout(() => setCopiado(false), 2500) } catch (e) {}
  }
  async function instalarIcone() {
    try { await navigator.clipboard.writeText(link); setCopiado(true) } catch (e) {}
    await instalar()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.95)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden my-6">
        <div className="bg-red-700 text-white px-5 py-4 flex items-center justify-between">
          <h2 className="text-base font-bold">{"💸 Indique e ganhe créditos"}</h2>
          <button onClick={onFechar} className="text-red-200 hover:text-white text-lg" aria-label="Fechar">{"✕"}</button>
        </div>
        <div className="p-5 space-y-3 text-center">
          <p className="text-sm text-gray-600 leading-relaxed text-left">
            Conhece outros bariátricos? Indique-os ao <b>Projeto OBA</b>: cada um que se cadastrar
            e pagar vale <b>US$10</b> de crédito para você — abatendo o seu investimento na plataforma.
            Mostre o <b>QR</b>, ou copie o <b>LINK</b> e envie no WhatsApp/Telegram.
          </p>
          {erro && <p className="text-red-600 text-xs font-bold">{erro}</p>}
          {link ? (
            <>
              <div className="flex justify-center my-1">
                <div className="bg-white p-3 rounded-xl border-2 border-red-700">
                  <QRCodeSVG value={link} size={150} fgColor="#b91c1c" />
                </div>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-gray-700 break-all">{link}</div>
              <button onClick={copiar} className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors">
                {copiado ? 'LINK COPIADO ✓' : 'COPIAR LINK'}
              </button>
              <button onClick={instalarIcone} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-sm transition-colors">
                {"📲 Instalar o ícone na minha tela (copia o link)"}
              </button>
              {ios && <p className="text-[11px] text-gray-500 leading-snug">{"No iPhone: toque em Compartilhar (↑) e depois em \"Adicionar à Tela de Início\"."}</p>}
              {dados && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {[
                    { n: (dados.creditos || []).length, t: 'CADASTRADOS' },
                    { n: (dados.precadastros || []).length, t: 'RESERVADOS' },
                    { n: (dados.creditos || []).filter(c => c.pago).length, t: 'RECEBIDOS' },
                    { n: (dados.creditos || []).filter(c => !c.pago).length, t: 'PENDENTES' },
                  ].map((b, i) => (
                    <div key={i} className="bg-red-50 border border-red-100 rounded-lg py-1.5 text-center">
                      <p className="text-xl font-extrabold text-red-700">{b.n}</p>
                      <p className="text-[9px] text-gray-500 font-semibold">{b.t}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (!erro && <p className="text-xs text-gray-400">Ativando…</p>)}
        </div>
      </div>
    </div>
  )
}
