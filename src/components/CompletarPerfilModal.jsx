import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import logo from '../assets/logo.png'

/**
 * CompletarPerfilModal — tela bloqueante (uma vez) para o paciente recém-cadastrado
 * informar nome, celular e e-mail. Aparece quando profile.nome está vazio.
 *
 * Padrão "seamless": campo ativo em amarelo; ao parar de digitar o nome por 2,5s
 * salta para o celular; ao completar os dígitos do celular foca o e-mail; o botão
 * CONFIRMAR só aparece quando os três campos estão válidos. Header compacto com a
 * fadinha RedFairy à esquerda (sem a fada grande).
 *
 * Props: profile (id, cpf, ...), onSalvo(novoProfile).
 */
function formatarCelular(v) {
  const d = (v || '').replace(/\D/g, '').slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export default function CompletarPerfilModal({ profile, onSalvo }) {
  const [nome, setNome] = useState(profile?.nome || '')
  const [celular, setCelular] = useState(profile?.celular ? formatarCelular(profile.celular) : '')
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [campoAtivo, setCampoAtivo] = useState('nome')

  const celRef = useRef(null)
  const emailRef = useRef(null)
  const nomeTimer = useRef(null)

  useEffect(() => () => { if (nomeTimer.current) clearTimeout(nomeTimer.current) }, [])

  const celDigits = (celular || '').replace(/\D/g, '')
  const nomeOk = (nome || '').trim().length >= 5
  const celOk = celDigits.length >= 10
  const emailOk = /\S+@\S+\.\S+/.test((email || '').trim())
  const tudoOk = nomeOk && celOk && emailOk

  function onNomeChange(v) {
    setNome(v.toUpperCase()); setErro('')
    if (nomeTimer.current) clearTimeout(nomeTimer.current)
    nomeTimer.current = setTimeout(() => {
      if ((v || '').trim().length >= 5) celRef.current?.focus()  // 2,5s parado → salta p/ celular
    }, 2500)
  }

  function onCelChange(v) {
    const f = formatarCelular(v); setCelular(f); setErro('')
    if (f.replace(/\D/g, '').length === 11) emailRef.current?.focus()  // dígitos completos → foca e-mail
  }

  async function handleSalvar() {
    setErro('')
    const nomeT = (nome || '').trim()
    if (nomeT.length < 5) { setErro('Informe seu nome completo.'); return }
    if (celDigits.length < 10) { setErro('Celular inválido (com DDD).'); return }
    const emailT = (email || '').trim().toLowerCase()
    if (!emailOk) { setErro('Informe um e-mail válido.'); return }

    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .update({ nome: nomeT, celular: celDigits })
      .eq('id', profile.id)
      .select('id, nome, cpf, sexo, data_nascimento, celular, bariatrica, gestante, boas_vindas_vista')
      .maybeSingle()
    setLoading(false)
    if (error) { setErro('Erro ao salvar. Tente novamente.'); return }

    try { localStorage.setItem('paciente_nome', nomeT) } catch (e) {}
    if (onSalvo) onSalvo(data || { ...profile, nome: nomeT, celular: celDigits })
  }

  const fieldCls = (campo) =>
    `w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-colors border-2 ${
      campoAtivo === campo ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 bg-white'
    }`
  const labelCls = "block text-xs font-semibold text-gray-600 mb-1"

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-xl my-8 overflow-hidden">
        {/* Barra superior com a fadinha RedFairy à esquerda */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100" style={{ background: 'rgba(255,255,255,0.92)' }}>
          <img src={logo} alt="RedFairy" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          <h2 style={{ fontFamily: "'Georgia', serif", fontWeight: 900, fontSize: '1.2rem', letterSpacing: '-0.02em', margin: 0 }}>
            <span style={{ color: '#b91c1c' }}>Red</span><span style={{ color: '#ef4444' }}>Fairy</span>
          </h2>
        </div>

        <div className="p-5">
          <p className="text-sm text-gray-500 mb-4">{"Complete seu perfil para finalizar o cadastro."}</p>

          <div className="space-y-3">
            <div>
              <label className={labelCls}>{"Nome completo"}</label>
              <input
                type="text" autoFocus value={nome}
                onChange={e => onNomeChange(e.target.value)}
                onFocus={() => setCampoAtivo('nome')}
                className={fieldCls('nome')} style={{ textTransform: 'uppercase' }}
                placeholder="Como você quer ser chamado(a)"
              />
            </div>

            <div>
              <label className={labelCls}>{"Celular (WhatsApp)"}</label>
              <input
                ref={celRef} type="text" value={celular}
                onChange={e => onCelChange(e.target.value)}
                onFocus={() => setCampoAtivo('celular')}
                className={fieldCls('celular')} inputMode="numeric" maxLength={16}
                placeholder="(00) 00000-0000"
              />
              <p className="text-xs text-gray-400 mt-1">{"Necessário para receber documentos médicos via WhatsApp."}</p>
            </div>

            <div>
              <label className={labelCls}>{"E-mail"}</label>
              <input
                ref={emailRef} type="email" value={email}
                onChange={e => { setEmail(e.target.value.toLowerCase()); setErro('') }}
                onFocus={() => setCampoAtivo('email')}
                className={fieldCls('email')} style={{ textTransform: 'lowercase' }}
                autoCapitalize="off" autoCorrect="off" spellCheck="false"
                placeholder="seu@email.com"
              />
            </div>

            {erro && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <p className="text-xs font-semibold text-red-700">{erro}</p>
              </div>
            )}

            {tudoOk && (
              <button
                onClick={handleSalvar} disabled={loading}
                className="w-full bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white font-bold text-sm py-3 rounded-lg transition-colors mt-1 tracking-wide">
                {loading ? "Salvando..." : "CONFIRMAR"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
