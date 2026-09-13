import { useState } from 'react'
import { supabase } from '../lib/supabase'
import PlayButton from './PlayButton'
import obaLogo from '../assets/oba-logo.png'

/**
 * AtendimentoEncerradoModal — a ÚNICA tela de quem retirou a autorização de
 * plataforma.
 *
 * (consentimento, 13/09/2026) Decisão do Estácio: o login NÃO é bloqueado.
 * Bloquear deixaria sem caminho de volta quem revogou por engano, e fecharia a
 * porta pela qual o titular exerce os direitos da LGPD (acesso, portabilidade).
 *
 * ⚠ Esta tela é BLOQUEANTE e não tem "fechar": nada de dado clínico e nenhuma
 * função médica atrás dela. Sem autorização, não há atendimento — mostrar o
 * painel normal faria a revogação parecer decorativa.
 *
 * As duas saídas são deliberadas: reautorizar em um clique (senão vira chamado
 * de suporte) e falar com o suporte (é por onde se pede cópia dos dados).
 *
 * Props: cpf, onReautorizado()
 */
export default function AtendimentoEncerradoModal({ cpf, onReautorizado }) {
  const [busy, setBusy] = useState(false)
  const [erro, setErro] = useState('')

  const cpfLimpo = String(cpf || '').replace(/\D/g, '')
  const token = () => { try { return localStorage.getItem('paciente_token') || '' } catch (e) { return '' } }

  async function reautorizar() {
    setBusy(true); setErro('')
    try {
      const { data } = await supabase.rpc('autorizacao_conceder', {
        p_cpf: cpfLimpo, p_token: token(), p_nivel: 'plataforma',
      })
      // Append-only: isto cria uma linha NOVA, não "desfaz" a revogação. O
      // registro de que houve uma revogação continua lá, e é assim que tem de
      // ser — a trilha não pode ser reescrita.
      if (data && data.ok) onReautorizado && onReautorizado()
      else setErro((data && data.erro) || 'Não foi possível reautorizar.')
    } catch (e) { setErro('Erro de conexão. Tente de novo.') }
    setBusy(false)
  }

  function suporte() {
    const msg = 'Olá! Encerrei o meu atendimento no Projeto OBA® e preciso de ajuda.'
    window.open('https://wa.me/5571997110804?text=' + encodeURIComponent(msg), '_blank')
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.97)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="p-5">
          <img src={obaLogo} alt="Projeto OBA" className="h-14 object-contain mx-auto mb-3" />

          <p className="text-center text-lg font-bold text-gray-800">{"Atendimento encerrado"}</p>

          <p className="text-sm text-gray-700 leading-relaxed mt-3">
            {"Você retirou a autorização para os médicos do Projeto OBA® acessarem os seus dados de saúde. Sem ela não é possível fazer avaliações nem consultar o seu histórico."}
          </p>
          <p className="text-sm text-gray-700 leading-relaxed mt-2">
            {"O seu prontuário continua guardado, como a lei exige, e ninguém o acessa."}
          </p>

          {erro && <p className="text-red-600 text-xs font-bold text-center mt-3">{erro}</p>}

          <div className="mt-5 flex justify-end">
            <PlayButton onClick={reautorizar} disabled={busy}
              label={busy ? "…" : "AUTORIZAR DE NOVO"}
              hint={"Volta tudo ao normal, com o seu histórico."}
              ariaLabel="Autorizar de novo" />
          </div>

          <div className="mt-5 pt-4 border-t border-gray-200">
            <button onClick={suporte}
              className="w-full py-2.5 rounded-xl border-2 border-gray-300 text-gray-700 font-bold text-sm">
              {"Falar com o suporte"}
            </button>
            {/* ⚠ Esta linha promete só o que cumprimos. NÃO oferecer "apagar os
                seus dados" sem a ressalva: a caixa de confirmação, logo antes,
                diz que o prontuário fica guardado por 20 anos por obrigação
                legal — oferecer a exclusão dele seria negar o que acabou de
                ser afirmado. Cadastro, contato e pagamento saem; prontuário não. */}
            <p className="text-[11px] text-gray-500 text-center leading-snug mt-2">
              {"Para pedir uma cópia dos seus dados, apagar o que não estiver sob guarda obrigatória, ou tirar qualquer dúvida."}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
