import { useState } from 'react'
import TriagemModal from './TriagemModal'
import TriagemResultadoModal from './TriagemResultadoModal'

/**
 * TriagemDireta -- fluxo de triagem rapida sem cadastro previo.
 *
 * Renderiza:
 *   1. TriagemModal (CPF + Sexo + Idade + Hb + VCM + RDW)
 *   2. Apos avaliar -> TriagemResultadoModal (azul) com diagnostico
 *   3. Apos OK -> tela de aguardo (interno do TriagemResultadoModal)
 *   4. Apos Voltar ao inicio -> chama onVoltar (volta para landing)
 *
 * Se usuario clicar "Continuar para o cadastro" no popup azul,
 * chama onCadastrar(cpf) para que o App redirecione ao AuthPage
 * em modo cadastro com o CPF pre-preenchido.
 *
 * Props:
 *   onVoltar:     function() -- fechar tudo e voltar para landing
 *   onCadastrar:  function(cpf) -- redirecionar para cadastro
 */
export default function TriagemDireta({ onVoltar, onCadastrar, onIrDashboard }) {
  const [showTriagem, setShowTriagem] = useState(true)
  const [triagemResultado, setTriagemResultado] = useState(null)
  const [triagemInputs, setTriagemInputs] = useState(null)

  // (4DOC) Médico ENCAMINHADOR informado pelo paciente no cadastro. Lido UMA vez e
  // limpo do localStorage p/ não vazar pra um próximo paciente no mesmo dispositivo.
  const [medicoEncaminhador] = useState(() => {
    try {
      const v = localStorage.getItem('rf_medico_encaminhador') || ''
      localStorage.removeItem('rf_medico_encaminhador')
      return v
    } catch (e) { return '' }
  })

  // CPF do paciente logado (se houver, vem prefilled e bloqueado)
  let pacienteCpf = ''
  let pacienteId = ''
  try {
    pacienteCpf = localStorage.getItem('paciente_cpf') || ''
    pacienteId = localStorage.getItem('paciente_id') || ''
  } catch (e) {}
  const pacienteLogado = !!pacienteCpf && !!pacienteId
  // Fluxo bariátrico → o "Voltar" segue a paleta OBA (amarelo + texto preto).
  let ehBari = false
  try { ehBari = localStorage.getItem('rf_flag') === 'bariatrica' || localStorage.getItem('rf_dom_bari') === '1' } catch (e) {}

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cabecalho minimo com botao Voltar */}
      <div className="absolute top-4 left-4 z-10">
        <button onClick={onVoltar}
          className={`${ehBari ? 'bg-yellow-400 hover:bg-yellow-500 text-black' : 'bg-red-700 hover:bg-red-800 text-white'} text-sm font-medium px-4 py-2 rounded-lg shadow-md transition-colors`}>
          Voltar
        </button>
      </div>

      {/* TriagemModal: popup inicial (abre automaticamente) */}
      {showTriagem && (
        <TriagemModal
          modoMedico={false}
          isDemoPaciente={true}
          cpfPrefill={pacienteCpf}
          cpfBloqueado={!!pacienteCpf}
          onConcluir={(resultado, inputs) => {
            setTriagemResultado(resultado)
            setTriagemInputs(inputs)
            setShowTriagem(false)
          }}
          onFechar={() => {
            // Usuario clicou Fechar - se for paciente logado, faz logoff antes de voltar pra landing
            if (pacienteLogado) {
              try {
                localStorage.removeItem('paciente_id')
                localStorage.removeItem('paciente_token')
                localStorage.removeItem('paciente_cpf')
                localStorage.removeItem('paciente_nome')
                localStorage.removeItem('paciente_login_at')
              } catch (e) {}
            }
            if (onVoltar) onVoltar()
          }}
        />
      )}

      {/* TriagemResultadoModal: popup azul com diagnostico */}
      {triagemResultado && (
        <TriagemResultadoModal
          resultado={triagemResultado}
          inputs={triagemInputs}
          modoMedico={false}
          isDemo={!pacienteLogado}
          medicoCRM={medicoEncaminhador || null}
          userId={pacienteId || null}
          onVoltarInicio={() => {
            setTriagemResultado(null)
            setShowTriagem(false)
            if (pacienteLogado && onIrDashboard) {
              onIrDashboard()
            } else if (onVoltar) {
              onVoltar()
            }
          }}
          onCadastrar={() => {
            const dados = {
              cpf: triagemInputs?.cpf || '',
              sexo: triagemInputs?.sexo || '',
              dataNascimento: triagemInputs?.data_nascimento || '',
            }
            setTriagemResultado(null)
            setShowTriagem(false)
            if (onCadastrar) onCadastrar(dados)
          }}
        />
      )}
    </div>
  )
}
