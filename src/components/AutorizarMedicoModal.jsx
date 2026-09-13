import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import PlayButton from './PlayButton'
import obaLogo from '../assets/oba-logo.png'

/**
 * AutorizarMedicoModal — o paciente autoriza (ou não) um médico externo a
 * acompanhá-lo.
 *
 * (consentimento, 13/09/2026) O médico gera um link `?autorizar=CRM/UF` e
 * envia ao paciente; o paciente abre, vê QUEM está pedindo e decide.
 *
 * ⚠ O link é um CONVITE, não uma concessão. Quem autoriza é o paciente, com a
 * credencial dele — um link não pode conceder acesso sozinho, senão bastaria
 * fabricar a URL. Por isso este modal só aparece para paciente logado, e a
 * gravação passa por `autorizacao_conceder`, gateada por token de paciente.
 *
 * Props: cpf, crm, onFechar(), onAutorizado()
 */
export default function AutorizarMedicoModal({ cpf, crm, onFechar, onAutorizado }) {
  const [medico, setMedico] = useState(null)
  const [erro, setErro] = useState('')
  const [busy, setBusy] = useState(false)
  const [pronto, setPronto] = useState(false)

  const cpfLimpo = String(cpf || '').replace(/\D/g, '')
  const token = () => { try { return localStorage.getItem('paciente_token') || '' } catch (e) { return '' } }

  useEffect(() => {
    let vivo = true
    supabase.rpc('medico_cartao', { p_crm: crm, p_cpf: cpfLimpo, p_token: token() })
      .then(({ data }) => {
        if (!vivo) return
        if (data && data.ok) setMedico(data)
        else setErro((data && data.erro) || 'Não foi possível identificar o médico.')
      })
      .catch(() => { if (vivo) setErro('Erro de conexão. Tente de novo.') })
    return () => { vivo = false }
  }, [crm, cpfLimpo])

  async function autorizar() {
    setBusy(true); setErro('')
    try {
      const { data } = await supabase.rpc('autorizacao_conceder', {
        p_cpf: cpfLimpo, p_token: token(), p_nivel: 'medico', p_medico_crm: crm,
      })
      if (data && data.ok) { setPronto(true); onAutorizado && onAutorizado() }
      else setErro((data && data.erro) || 'Não foi possível autorizar.')
    } catch (e) { setErro('Erro de conexão. Tente de novo.') }
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.95)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="p-5">
          <img src={obaLogo} alt="Projeto OBA" className="h-14 object-contain mx-auto mb-3" />

          {erro && !medico && (
            <>
              <p className="text-red-600 text-sm font-bold text-center">{erro}</p>
              <button onClick={onFechar} className="w-full mt-4 py-2.5 rounded-xl border-2 border-gray-300 text-gray-700 font-bold text-sm">
                {"Fechar"}
              </button>
            </>
          )}

          {!medico && !erro && <p className="text-xs text-gray-400 text-center py-6">Carregando…</p>}

          {medico && pronto && (
            <>
              <p className="text-center text-base font-bold text-green-700">{"Pronto!"}</p>
              <p className="text-center text-sm text-gray-700 mt-2 leading-relaxed">
                {medico.nome}{" já pode acompanhar você. Isto vale por "}<b>{"12 meses"}</b>{", e você pode retirar quando quiser em "}<b>{"Quem vê os meus dados"}</b>{"."}
              </p>
              <div className="flex justify-center mt-4">
                <PlayButton onClick={onFechar} label={"CONTINUAR"} ariaLabel="Continuar" />
              </div>
            </>
          )}

          {medico && !pronto && medico.ja_autorizado && (
            <>
              <p className="text-center text-sm text-gray-700 leading-relaxed">
                {medico.nome}{" já tem a sua autorização para acompanhar você."}
              </p>
              <button onClick={onFechar} className="w-full mt-4 py-2.5 rounded-xl border-2 border-gray-300 text-gray-700 font-bold text-sm">
                {"Fechar"}
              </button>
            </>
          )}

          {medico && !pronto && !medico.ja_autorizado && (
            <>
              <p className="text-center text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                {"Pedido de acompanhamento"}
              </p>
              <p className="text-center text-lg font-bold text-gray-800 mt-1 leading-tight">{medico.nome}</p>
              <p className="text-center text-xs text-gray-500">
                {"CRM "}{medico.crm}{medico.uf ? ' · ' + medico.uf : ''}
              </p>

              {/* O selo de validação é o que o paciente não teria como conferir
                  sozinho — e é a diferença entre um médico conferido pela
                  administração e um cadastro qualquer. */}
              {medico.validado ? (
                <p className="text-center text-[11px] font-bold text-green-700 mt-1">
                  {"✓ Cadastro conferido pelo Projeto OBA®"}
                </p>
              ) : (
                <p className="text-center text-[11px] font-bold text-amber-700 mt-1">
                  {"⚠ O cadastro deste médico ainda não foi conferido"}
                </p>
              )}

              <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-bold text-gray-700 mb-1">{"O que ele vai poder fazer"}</p>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  {"Ver os seus hemogramas, as suas avaliações e a sua história clínica. Se ele corrigir alguma informação que você preencheu, "}<b>{"a sua versão original fica guardada"}</b>{" e continua visível para você."}
                </p>
                <ul className="text-[11px] text-gray-600 leading-relaxed mt-2 pl-4 list-disc space-y-0.5">
                  <li>{"Vale por "}<b>{"12 meses"}</b>{". Depois disso, perguntamos de novo."}</li>
                  <li>{"Você pode retirar quando quiser, em dois toques, sem justificar."}</li>
                  <li>{"Cada vez que ele abrir os seus dados, fica registrado — e você vê."}</li>
                </ul>
              </div>

              <p className="text-[11px] text-gray-500 text-center mt-3 leading-snug">
                {"Isto é opcional. Recusar não muda em nada o seu atendimento no Projeto OBA®."}
              </p>

              {erro && <p className="text-red-600 text-xs font-bold text-center mt-2">{erro}</p>}

              <div className="flex gap-2 mt-4">
                <button onClick={onFechar} disabled={busy}
                  className="flex-1 py-2.5 rounded-xl border-2 border-gray-300 text-gray-700 font-bold text-sm disabled:opacity-50">
                  {"Agora não"}
                </button>
                <button onClick={autorizar} disabled={busy}
                  className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-50"
                  style={{ background: '#7B1E1E' }}>
                  {busy ? '…' : 'Autorizo'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
