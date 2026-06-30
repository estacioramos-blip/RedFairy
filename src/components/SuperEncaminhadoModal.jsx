import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import obaLogo from '../assets/oba-logo.png'
import PlayButton from './PlayButton'

/**
 * SuperEncaminhadoModal — SITUAÇÃO 1 (QR presencial). Aparece APÓS o pagamento.
 * O paciente decide COM o médico:
 *   - 'medico'   → o médico conduz a anamnese (depois, pelo AVALIAR) → encerra/aguarda.
 *   - 'paciente' → o paciente faz a própria entrevista → abre o OBA.
 *
 * Props:
 *   crm           — CRM/UF do médico encaminhador
 *   onMedicoConduz — escolha "o médico conduz"
 *   onPacienteFaz  — escolha "eu mesmo faço"
 */
export default function SuperEncaminhadoModal({ crm, onMedicoConduz, onPacienteFaz }) {
  const [med, setMed] = useState(null)
  const [escolha, setEscolha] = useState(null)  // 'medico' | 'paciente'
  useEffect(() => {
    let vivo = true
    ;(async () => {
      if (!crm) return
      try {
        const { data } = await supabase.rpc('medico_publico', { p_crm: crm })
        if (vivo && data && data.ok) setMed(data)
      } catch (e) {}
    })()
    return () => { vivo = false }
  }, [crm])

  const fem = med && med.sexo === 'F'
  const trat = med ? (fem ? 'Dra.' : 'Dr.') : 'Dr(a).'
  const nomeMed = med && med.nome ? `${trat} ${med.nome}` : (fem ? 'sua médica' : 'seu médico')
  const crmTxt = med && med.crm ? `  ·  CRM ${med.crm}` : ''

  function avancar() {
    if (escolha === 'medico') onMedicoConduz && onMedicoConduz()
    else if (escolha === 'paciente') onPacienteFaz && onPacienteFaz()
  }

  const Check = ({ val, children }) => (
    <button type="button" onClick={() => setEscolha(val)}
      className="w-full flex items-start gap-2.5 text-left rounded-xl border p-3 transition-colors"
      style={{ borderColor: escolha === val ? '#7B1E1E' : '#E5E7EB', background: escolha === val ? '#FDF2F2' : '#fff' }}>
      <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center"
        style={{ borderColor: escolha === val ? '#7B1E1E' : '#9CA3AF', background: escolha === val ? '#7B1E1E' : '#fff', color: '#fff', fontSize: 12, fontWeight: 900 }}>
        {escolha === val ? '✓' : ''}
      </span>
      <span className="text-xs text-gray-700 leading-snug">{children}</span>
    </button>
  )

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.95)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden relative my-6">
        <div className="px-5 py-4 flex items-center gap-3" style={{ background: '#6B7280' }}>
          <img src={obaLogo} alt="Projeto OBA" style={{ width: 34, height: 34, objectFit: 'contain', flexShrink: 0 }} />
          <h2 className="text-lg font-bold" style={{ color: '#facc15' }}>{"Super!"}</h2>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-gray-700 leading-relaxed">
            {"Você acabou de se "}<strong>{"CADASTRAR"}</strong>{" através do QR-CODE fornecido por "}<strong>{nomeMed}</strong>{crmTxt}{"."}
          </p>
          <p className="text-sm font-bold text-gray-800">{"Agora você precisa decidir com ele/ela se:"}</p>
          <Check val="medico">{"o seu/sua MÉDICO/A prefere conduzir a sua entrevista / anamnese no celular ou computador dele/dela."}</Check>
          <Check val="paciente">{"o meu/minha MÉDICO/A acha que eu mesmo posso fazer a minha entrevista / anamnese e depois enviar o relatório para ele/ela."}</Check>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            {"Essa decisão vai depender do seu médico. Se ele preferir conduzir a entrada de dados, haverá maior precisão nas informações, o que é melhor para você. Mas o seu médico saberá se você tem o autoconhecimento médico e da sua história de vida para preencher sozinho a entrevista. Lembre-se de juntar todos os seus exames mais recentes antes de começar. De qualquer forma, o que você omitir por não saber, ou não responder corretamente, poderá ser corrigido depois em nova avaliação — o seu cadastro te dá acesso a quantas avaliações você quiser por um ano, e você sempre poderá renová-lo."}
          </p>
          <div className="flex justify-end pt-1">
            <PlayButton onClick={avancar} disabled={!escolha} label={"CONTINUAR"} hint={escolha ? '' : 'Escolha uma opção acima'} ariaLabel="Continuar" />
          </div>
        </div>
      </div>
    </div>
  )
}
