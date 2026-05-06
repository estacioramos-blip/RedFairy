import { useState } from 'react'
import TriagemModal from './TriagemModal'
import TriagemResultadoModal from './TriagemResultadoModal'

/**
 * TriagemDireta — fluxo de triagem rapida sem cadastro previo.
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
 *   onVoltar:     function() — fechar tudo e voltar para landing
 *   onCadastrar:  function(cpf) — redirecionar para cadastro
 */
export default function TriagemDireta({ onVoltar, onCadastrar }) {
  const [showTriagem, setShowTriagem] = useState(true)
  const [triagemResultado, setTriagemResultado] = useState(null)
  const [triagemInputs, setTriagemInputs] = useState(null)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cabecalho minimo com botao Voltar */}
      <div className="absolute top-4 left-4 z-10">
        <button onClick={onVoltar}
          className="bg-red-700 hover:bg-red-800 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-md transition-colors">
          Voltar
        </button>
      </div>

      {/* TriagemModal: popup inicial (abre automaticamente) */}
      {showTriagem && (
        <TriagemModal
          modoMedico={false}
          isDemoPaciente={true}
          onConcluir={(resultado, inputs) => {
            setTriagemResultado(resultado)
            setTriagemInputs(inputs)
            setShowTriagem(false)
          }}
          onFechar={() => {
            // Usuario clicou Fechar - volta ao landing
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
          isDemo={true}
          medicoCRM={null}
          userId={null}
          onVoltarInicio={() => {
            setTriagemResultado(null)
            setShowTriagem(false)
            if (onVoltar) onVoltar()
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
