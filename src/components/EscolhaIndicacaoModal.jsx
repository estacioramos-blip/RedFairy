import { useState } from 'react'
import { supabase } from '../lib/supabase'
import PlayButton from './PlayButton'

/**
 * EscolhaIndicacaoModal — o paciente bariátrico escolhe DE QUEM aceita a indicação
 * ao entrar no Projeto OBA. Aparece no cadastro, ANTES do pagamento.
 *
 * Regra (ver migrate_indicador_atribuicao_v3.sql):
 *   - MÉDICO é o DEFAULT (ele avaliou o paciente).
 *   - Escolher o INDICADOR chama confirmar_indicacao() → a escolha do paciente
 *     PREVALECE sobre o médico no crédito.
 *
 * Props:
 *   cpf       — CPF do paciente (com ou sem máscara)
 *   medico    — { crm, nome } | null
 *   indicador — { codigo, nome } | null
 *   onConcluir() — segue o fluxo (→ pagamento)
 */
export default function EscolhaIndicacaoModal({ cpf, medico, indicador, onConcluir }) {
  // Default: médico se existir; senão, o indicador.
  const [escolha, setEscolha] = useState(medico ? 'medico' : 'indicador')
  const [busy, setBusy] = useState(false)

  async function confirmar() {
    setBusy(true)
    try {
      if (escolha === 'indicador' && indicador?.codigo) {
        await supabase.rpc('confirmar_indicacao', {
          p_cpf: String(cpf || '').replace(/\D/g, ''),
          p_codigo: indicador.codigo,
        })
      }
      // escolha 'medico' = default; não precisa gravar nada.
    } catch (e) {}
    setBusy(false)
    onConcluir?.()
  }

  function Opcao({ tipo, titulo, sub }) {
    const sel = escolha === tipo
    return (
      <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${sel ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
        <input type="radio" name="escolha-ind" checked={sel} onChange={() => setEscolha(tipo)}
          className="mt-1 w-4 h-4 flex-shrink-0" style={{ accentColor: '#b91c1c' }} />
        <div>
          <p className="font-bold text-sm text-gray-800 leading-tight">{titulo}</p>
          <p className="text-[11px] text-gray-500 uppercase tracking-wide">{sub}</p>
        </div>
      </label>
    )
  }

  const doisLados = !!medico && !!indicador

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.95)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-red-700 text-white px-5 py-4">
          <h2 className="text-base font-bold">{"VOCÊ FOI INDICADO POR:"}</h2>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm leading-relaxed" style={{ color: '#7B1E1E', fontWeight: 600 }}>
            {doisLados
              ? 'Escolha quem deve receber os créditos pela indicação:'
              : 'Confirme quem indicou você ao projeto:'}
          </p>
          {medico && <Opcao tipo="medico" titulo={medico.nome} sub="médico" />}
          {indicador && <Opcao tipo="indicador" titulo={indicador.nome} sub="indicador (não-médico)" />}
          <div className="flex justify-center pt-2">
            <PlayButton onClick={confirmar} loading={busy} label="CONFIRMAR"
              ariaLabel="Confirmar indicação" ringColor="rgba(227,174,55,0.75)" />
          </div>
        </div>
      </div>
    </div>
  )
}
