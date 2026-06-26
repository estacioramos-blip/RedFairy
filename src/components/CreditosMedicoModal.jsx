import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

/**
 * CreditosMedicoModal — o MÉDICO vê os PRÓPRIOS créditos 4DOC (contadores).
 * Lê a sessão do médico (medico_crm + medico_token) do localStorage e chama a RPC
 * listar_creditos_medico. Requer migrate_creditos_medico_self.sql aplicado.
 * Props: onFechar().
 */
export default function CreditosMedicoModal({ onFechar }) {
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let vivo = true
    ;(async () => {
      let crm = '', token = ''
      try { crm = localStorage.getItem('medico_crm') || ''; token = localStorage.getItem('medico_token') || '' } catch (e) {}
      if (!crm || !token) { setErro('Sessão do médico não encontrada. Entre novamente.'); return }
      try {
        const { data } = await supabase.rpc('listar_creditos_medico', { p_crm: crm, p_token: token })
        if (!vivo) return
        if (data && data.ok) setDados(data)
        else setErro((data && data.erro) || 'Não foi possível carregar.')
      } catch (e) { if (vivo) setErro('Erro de conexão. Tente de novo.') }
    })()
    return () => { vivo = false }
  }, [])

  const fmt = (n) => (Math.round((Number(n) || 0) * 100) / 100).toFixed(2).replace('.', ',')
  const aReceberUsd = dados ? (dados.a_receber || 0) * (Number(dados.valor_usd) || 0) : 0
  const aReceberBrl = dados ? aReceberUsd * (Number(dados.cotacao) || 0) : 0

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.95)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden my-6">
        <div className="bg-red-700 text-white px-5 py-4 flex items-center justify-between">
          <h2 className="text-base font-bold">{"📊 Meus créditos 4DOC"}</h2>
          <button onClick={onFechar} className="text-red-200 hover:text-white text-lg" aria-label="Fechar">{"✕"}</button>
        </div>
        <div className="p-5 space-y-3">
          {erro && <p className="text-red-600 text-xs font-bold text-center">{erro}</p>}
          {!dados && !erro && <p className="text-xs text-gray-400 text-center">Carregando…</p>}
          {dados && (
            <>
              <p className="text-sm text-gray-600 leading-relaxed">
                {"Cada paciente que se cadastra sob o seu CRM e paga vale "}<b>{"US$ "}{dados.valor_usd}</b>{" para você."}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { n: dados.cadastrados, t: 'CADASTRADOS', c: 'text-red-700' },
                  { n: dados.recebidos, t: 'RECEBIDOS', c: 'text-green-700' },
                  { n: dados.a_receber, t: 'A RECEBER', c: 'text-red-700' },
                  { n: dados.pendentes_elegib, t: 'AGUARDANDO', c: 'text-gray-500' },
                ].map((b, i) => (
                  <div key={i} className="bg-red-50 border border-red-100 rounded-lg py-2 text-center">
                    <p className={`text-2xl font-extrabold ${b.c}`}>{b.n}</p>
                    <p className="text-[9px] text-gray-500 font-semibold">{b.t}</p>
                  </div>
                ))}
              </div>
              {dados.a_receber > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-center">
                  <p className="text-xs text-green-800 font-bold">
                    {"A receber: US$ "}{fmt(aReceberUsd)}{dados.cotacao > 0 ? ` ≈ R$ ${fmt(aReceberBrl)}` : ''}
                  </p>
                </div>
              )}
              {dados.pendentes_elegib > 0 && (
                <p className="text-[11px] text-gray-500 leading-snug text-center">
                  {"AGUARDANDO: para liberar esses créditos, faça pelo menos uma avaliação completa de paciente na plataforma."}
                </p>
              )}
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-left">
                <p className="text-[11px] text-gray-500">{"Você recebe em (PIX):"}</p>
                <p className="text-sm font-bold text-gray-700 break-all">{dados.pix || '(sem chave PIX — integre-se ao 4DOC)'}</p>
              </div>
              <p className="text-[11px] text-gray-400 text-center leading-snug">
                {"Os pagamentos são processados pela administração."}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
