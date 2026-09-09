import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import PlayButton from './PlayButton'

/**
 * EscolhaIndicacaoModal — avisa o paciente de quem o trouxe ao Projeto OBA e
 * anuncia o DESCONTO DE BOAS-VINDAS. Aparece no cadastro, ANTES do pagamento.
 *
 * (R2/R4, 09/2026) Antes isto era uma ESCOLHA: "quem deve receber os créditos,
 * o médico ou o indicador?". Essa disputa acabou — não há mais comissão por
 * paciente trazido, para médico nem para leigo (CFM 2.336/2023 e 2.170/2017).
 * Quem ganha agora é quem ENTRA: todo indicado recebe desconto na primeira
 * anuidade. Sobrou o reconhecimento do laço humano, que tem valor próprio:
 * o paciente vê quem se importou o bastante para trazê-lo.
 *
 * `confirmar_indicacao` continua sendo chamada — agora só registra a origem
 * (não decide dinheiro de ninguém).
 *
 * Props:
 *   cpf       — CPF do paciente (com ou sem máscara)
 *   medico    — { crm, nome } | null
 *   indicador — { codigo, nome } | null
 *   onConcluir() — segue o fluxo (→ pagamento)
 */
export default function EscolhaIndicacaoModal({ cpf, medico, indicador, onConcluir }) {
  const [busy, setBusy] = useState(false)
  const [descontoBrl, setDescontoBrl] = useState(0)

  const cpfLimpo = String(cpf || '').replace(/\D/g, '')
  const pacToken = () => { try { return localStorage.getItem('paciente_token') || '' } catch (e) { return '' } }

  // Quanto é o desconto de boas-vindas. Se a leitura falhar, ou se o Admin
  // ainda não configurou o valor, a tela NÃO cita cifra — anunciar um número
  // errado é pior do que não anunciar nenhum.
  useEffect(() => {
    if (cpfLimpo.length !== 11) return
    let vivo = true
    supabase.rpc('desconto_boas_vindas', { p_cpf: cpfLimpo, p_token: pacToken() })
      .then(({ data }) => {
        if (!vivo || !data || !data.ok || !data.tem) return
        setDescontoBrl(Number(data.desconto_brl) || 0)
      })
      .catch(() => {})
    return () => { vivo = false }
  }, [cpfLimpo])

  async function confirmar() {
    setBusy(true)
    try {
      if (indicador?.codigo) {
        const { data, error } = await supabase.rpc('confirmar_indicacao', {
          p_cpf: cpfLimpo,
          p_codigo: indicador.codigo,
          // Gate por sessão do paciente dono do CPF (SEC-4).
          p_pac_token: pacToken(),
        })
        // Não trava mais o fluxo: sem dinheiro em jogo, falhar aqui só deixa a
        // origem sem marcar. O desconto do paciente NÃO depende desta chamada
        // (desconto_boas_vindas olha a reserva, não a confirmação).
        if (error || data?.ok === false) {
          console.error('confirmar_indicacao:', error || data?.erro)
        }
      }
    } catch (e) {}
    setBusy(false)
    onConcluir?.()
  }

  const quem = indicador?.nome || medico?.nome || ''
  const papel = indicador ? '' : (medico ? 'médico' : '')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.95)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-red-700 text-white px-5 py-4">
          <h2 className="text-base font-bold">{"VOCÊ FOI INDICADO POR:"}</h2>
        </div>
        <div className="p-5 space-y-3">
          <div className="rounded-xl border-2 border-red-300 bg-red-50 p-4 text-center">
            <p className="font-bold text-lg text-gray-800 leading-tight">{quem || 'alguém que se importa com você'}</p>
            {papel && <p className="text-[11px] text-gray-500 uppercase tracking-wide mt-0.5">{papel}</p>}
          </div>

          {descontoBrl > 0 ? (
            <div className="rounded-xl border-2 border-green-300 bg-green-50 p-3 text-center">
              <p className="text-sm font-bold text-green-800 leading-snug">
                {"🎁 Você ganhou R$ "}{descontoBrl.toFixed(2).replace('.', ',')}{" de desconto na sua primeira anuidade."}
              </p>
              <p className="text-[11px] text-green-700 mt-1">{"Já vem aplicado na próxima tela."}</p>
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-center" style={{ color: '#7B1E1E', fontWeight: 600 }}>
              {"Que bom ter você aqui."}
            </p>
          )}

          <div className="flex justify-center pt-1">
            <PlayButton onClick={confirmar} loading={busy} label={"CONTINUAR"}
              ariaLabel="Continuar" ringColor="rgba(227,174,55,0.75)" />
          </div>
        </div>
      </div>
    </div>
  )
}
