import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import obaLogo from '../assets/oba-logo.png'
import PlayButton from './PlayButton'

/**
 * OpaAutoavaliacaoModal — SITUAÇÃO 2 (entrada via LINK `self=1` ou RECOMENDADO/CPF).
 * Boas-vindas à AUTO-AVALIAÇÃO, identificando o médico (Dr./Dra. NOME · CRM).
 *
 * Props:
 *   crm         — CRM/UF do médico encaminhador (ex.: '6302/BA')
 *   onContinuar — segue o fluxo (cadastro/OBA)
 */
export default function OpaAutoavaliacaoModal({ crm, onContinuar }) {
  const [med, setMed] = useState(null)
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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.95)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden relative">
        <div className="px-5 py-4 flex items-center gap-3" style={{ background: '#6B7280' }}>
          <img src={obaLogo} alt="Projeto OBA" style={{ width: 34, height: 34, objectFit: 'contain', flexShrink: 0 }} />
          <h2 className="text-lg font-bold" style={{ color: '#facc15' }}>{"Opa!"}</h2>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-700 leading-relaxed">
            {"Você está se integrando ao "}<strong>{"Projeto OBA®"}</strong>{" através de um link ou recomendação de "}<strong>{nomeMed}</strong>{crmTxt}{"."}
          </p>
          <p className="text-sm text-gray-700 leading-relaxed">
            {"Para fazer a sua auto-avaliação, tenha em mãos os seus "}<strong>{"exames mais recentes"}</strong>{". Ao final da análise, você poderá enviar o relatório para o seu médico, ou para outro médico, ou para a sua empresa, para um parente ou amigo, para outro paciente — para quem você quiser."}
          </p>
          <div className="flex justify-end pt-1">
            <PlayButton onClick={onContinuar} label={"CONTINUAR"} ariaLabel="Continuar" />
          </div>
        </div>
      </div>
    </div>
  )
}
