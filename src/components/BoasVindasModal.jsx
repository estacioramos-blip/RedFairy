import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function BoasVindasModal({ profile, onClose }) {
  const [querPedido, setQuerPedido] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleContinuar() {
    setLoading(true)
    try {
      // 1. Marca boas_vindas_vista=true
      await supabase.from('profiles')
        .update({ boas_vindas_vista: true })
        .eq('id', profile.id)

      // 2. Se quer pedido, cria registro
      if (querPedido) {
        await supabase.from('pedidos_documento').insert({
          user_id: profile.id,
          cpf: profile.cpf,
          nome: profile.nome,
          data_nascimento: profile.data_nascimento,
          celular: profile.celular,
          tipos_documento: ['HEMOGRAMA', 'FERRITINA', 'SAT_TRANSFERRINA'],
          texto_documentos: 'Primeiro pedido gratuito apos cadastro',
          valor_total: 0,
          status: 'pendente_envio',
        })
      }
    } catch (err) {
      console.error('Erro ao salvar boas-vindas:', err)
    } finally {
      setLoading(false)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl">
        <div className="text-center mb-5">
          <h2 className="text-2xl font-bold text-red-700 mb-2">
            Olá, {profile.nome?.split(' ')[0] || 'paciente'}!
          </h2>
          <p className="text-sm text-gray-600">Bem-vindo(a) ao RedFairy</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
          <p className="text-sm text-gray-800 mb-2">
            Você agora tem acesso à plataforma por <strong>1 ano</strong>.
          </p>
          <p className="text-sm text-gray-800">
            Traga todos os seus futuros hemogramas. Nós vamos avaliar, pôr a sua evolução em um gráfico, e medicar se for necessário.
          </p>
        </div>

        <label className="flex items-start gap-3 p-3 border-2 border-amber-300 bg-amber-50 rounded-xl cursor-pointer mb-4">
          <input
            type="checkbox"
            checked={querPedido}
            onChange={(e) => setQuerPedido(e.target.checked)}
            className="mt-1 w-5 h-5 accent-red-700"
          />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">
              Quero o meu primeiro pedido de exames (GRATUITO)
            </p>
            <p className="text-xs text-amber-800 mt-1">
              Inclui: Hemograma, Ferritina e Saturação da Transferrina
            </p>
            <p className="text-xs text-gray-600 mt-1 italic">
              Pedidos futuros: R$ 60,00 cada
            </p>
          </div>
        </label>

        <button
          onClick={handleContinuar}
          disabled={loading}
          className="w-full bg-red-700 hover:bg-red-800 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
        >
          {loading ? 'Salvando...' : 'Continuar'}
        </button>
      </div>
    </div>
  )
}
