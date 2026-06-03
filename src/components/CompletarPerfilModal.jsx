import { useState } from 'react'
import { supabase } from '../lib/supabase'
import logo from '../assets/logo.png'

/**
 * CompletarPerfilModal - tela bloqueante exibida uma vez ao paciente recem-cadastrado
 * para coletar dados pessoais. Aparece quando profile.nome esta vazio.
 *
 * Os campos sexo e data_nascimento NAO sao perguntados aqui porque ja foram
 * fornecidos durante a triagem (TriagemResultadoModal sincroniza no profile
 * apos salvar).
 *
 * Props:
 *   profile:   objeto do profile (precisa de id e cpf)
 *   onSalvo:   funcao(novoProfile) - chamada apos salvar com sucesso
 */
export default function CompletarPerfilModal({ profile, onSalvo }) {
  const [nome, setNome] = useState(profile?.nome || '')
  const [celular, setCelular] = useState(profile?.celular || '')
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  function formatarCelular(v) {
    const d = (v || '').replace(/\D/g, '').slice(0, 11)
    if (d.length === 0) return ''
    if (d.length <= 2) return `(${d}`
    if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`
    if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
    return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  }

  async function handleSalvar() {
    setErro('')
    const nomeT = (nome || '').trim()
    if (nomeT.length < 5) { setErro('Informe seu nome completo.'); return }
    const celDigits = (celular || '').replace(/\D/g, '')
    if (celDigits.length < 10) { setErro('Celular invalido (com DDD).'); return }
    const emailT = (email || '').trim().toLowerCase()
    if (!emailT || !emailT.includes('@')) { setErro('Informe um e-mail valido.'); return }

    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .update({
        nome: nomeT,
        celular: celDigits,
      })
      .eq('id', profile.id)
      .select('id, nome, cpf, sexo, data_nascimento, celular, bariatrica, gestante, boas_vindas_vista')
      .maybeSingle()
    setLoading(false)
    if (error) { setErro('Erro ao salvar. Tente novamente.'); return }

    // Atualiza nome no localStorage para o header refletir
    try { localStorage.setItem('paciente_nome', nomeT) } catch (e) {}

    if (onSalvo) onSalvo(data || { ...profile, nome: nomeT, celular: celDigits })
  }

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl my-8">
        <div className="text-center mb-5">
          <img src={logo} alt="RedFairy" style={{ width: 56, height: 56, margin: '0 auto 8px' }} />
          <h2 className="text-2xl font-bold text-red-700">{"Complete seu perfil"}</h2>
          <p className="text-xs text-gray-500 mt-1">
            {"Para finalizar seu cadastro, precisamos dos seus dados de contato."}
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">{"Nome completo"}</label>
            <input
              type="text"
              autoFocus
              value={nome}
              onChange={e => { setNome(e.target.value.toUpperCase()); setErro('') }}
              className={inputCls}
              style={{ textTransform:'uppercase' }}
              placeholder="Como voce quer ser chamado(a)"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">{"Celular (WhatsApp)"}</label>
            <input
              type="text"
              value={celular}
              onChange={e => { setCelular(formatarCelular(e.target.value)); setErro('') }}
              className={inputCls}
              placeholder="(00) 00000-0000"
              inputMode="numeric"
              maxLength={16}
            />
            <p className="text-xs text-gray-500 mt-1">
              {"Necess\u00e1rio para receber documentos m\u00e9dicos via WhatsApp."}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">{"E-mail"}</label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value.toLowerCase()); setErro('') }}
              className={inputCls}
              placeholder="seu@email.com"
              style={{ textTransform: 'lowercase' }}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck="false"
            />
          </div>

          {erro && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <p className="text-xs font-semibold text-red-700">{erro}</p>
            </div>
          )}

          <button
            onClick={handleSalvar}
            disabled={loading}
            className="w-full bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white font-semibold text-sm py-3 rounded-lg transition-colors mt-2">
            {loading ? "Salvando..." : "Salvar e continuar \u2192"}
          </button>
        </div>
      </div>
    </div>
  )
}
