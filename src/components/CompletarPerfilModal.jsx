import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import logo from '../assets/logo.png'
import elaDigita from '../assets/ELA_DIGITA.jpg'
import eleDigita from '../assets/ELE_DIGITA.jpg'
import PlayButton from './PlayButton'

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

export default function CompletarPerfilModal({ profile, onSalvo, onVoltar }) {
  const [nome, setNome] = useState(profile?.nome || '')
  const [celular, setCelular] = useState(profile?.celular ? formatarCelular(profile.celular) : '')
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [campoAtivo, setCampoAtivo] = useState('nome')
  // SPLASH de entrada (padrão 4DOC): imagem nítida por 1,2s; depois revela os campos
  // e foca o Nome. A imagem fica como fundo (hover) atrás dos inputs.
  const [splashPerfil, setSplashPerfil] = useState(true)
  const [bgPerfilRevelado, setBgPerfilRevelado] = useState(false)

  const nomeRef = useRef(null)
  const celRef = useRef(null)
  const emailRef = useRef(null)
  const nomeTimer = useRef(null)
  const emailTimer = useRef(null)
  const confirmarRef = useRef(null)

  useEffect(() => () => {
    if (nomeTimer.current) clearTimeout(nomeTimer.current)
    if (emailTimer.current) clearTimeout(emailTimer.current)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => { setSplashPerfil(false); nomeRef.current?.focus() }, 1200)
    return () => clearTimeout(t)
  }, [])

  // Imagem dinâmica por sexo: homem → "ELE DIGITA"; mulher (ou desconhecido,
  // padrão) → "ELA DIGITA".
  const isMasc = /^m/i.test(String(profile?.sexo || '').trim())
  const fotoDigita = isMasc ? eleDigita : elaDigita

  const celDigits = (celular || '').replace(/\D/g, '')
  const nomeOk = (nome || '').trim().length >= 5
  const celOk = celDigits.length >= 10
  const emailOk = /\S+@\S+\.\S+/.test((email || '').trim())
  const tudoOk = nomeOk && celOk && emailOk

  function onNomeChange(v) {
    setNome(v.toUpperCase()); setErro('')
    if (nomeTimer.current) clearTimeout(nomeTimer.current)
    nomeTimer.current = setTimeout(() => {
      if ((v || '').trim().length >= 5) celRef.current?.focus()  // 3s parado → salta p/ celular
    }, 3000)
  }

  function onCelChange(v) {
    const f = formatarCelular(v); setCelular(f); setErro('')
    if (f.replace(/\D/g, '').length === 11) emailRef.current?.focus()  // dígitos completos → foca e-mail
  }

  function onEmailChange(v) {
    setEmail(v.toLowerCase()); setErro('')
    if (emailTimer.current) clearTimeout(emailTimer.current)
    emailTimer.current = setTimeout(() => {
      // 2,5s parado com e-mail válido → salta o foco para o botão PLAY (CONFIRMO)
      if (/\S+@\S+\.\S+/.test((v || '').trim())) confirmarRef.current?.focus()
    }, 2500)
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden my-8" style={{ minHeight: 'min(700px, 92vh)', maxHeight: '92vh', display: 'flex', flexDirection: 'column', position: 'relative' }}
        onMouseEnter={() => setBgPerfilRevelado(true)} onMouseLeave={() => setBgPerfilRevelado(false)} onTouchStart={() => setBgPerfilRevelado(true)}>

        {/* Imagem de fundo: faixa de largura cheia, esmaecida; revela no hover (atrás dos inputs).
            top 52% (um pouco mais alta) e altura 430px (corta menos a base da imagem). */}
        <div aria-hidden="true" style={{ position: 'absolute', top: '52%', left: 0, right: 0, height: '430px', transform: 'translateY(-50%)', backgroundImage: `url(${fotoDigita})`, backgroundSize: '100% auto', backgroundPosition: 'center top', backgroundRepeat: 'no-repeat', filter: bgPerfilRevelado ? 'blur(0px)' : 'blur(10px)', opacity: bgPerfilRevelado ? 0.5 : 0.12, transition: 'filter 0.6s ease, opacity 0.6s ease', pointerEvents: 'none' }} />

        {/* SPLASH de entrada: imagem nítida (largura cheia, centrada) por 1,2s, antes dos campos */}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 5, backgroundColor: '#FDF7F7', opacity: splashPerfil ? 1 : 0, pointerEvents: splashPerfil ? 'auto' : 'none', transition: 'opacity 0.5s ease' }}>
          <div style={{ position: 'absolute', top: '52%', left: 0, right: 0, height: '430px', transform: 'translateY(-50%)' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${fotoDigita})`, backgroundSize: '100% auto', backgroundPosition: 'center top', backgroundRepeat: 'no-repeat' }} />
          </div>
        </div>

        {/* Header padrão (logo-fada + RedFairy). zIndex 10 p/ aparecer já durante o splash. */}
        <div style={{ position: 'relative', zIndex: 10, background: 'rgba(255,255,255,0.92)', borderBottom: '1px solid #f1f5f9', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <img src={logo} alt="RedFairy" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          <h2 style={{ fontFamily: "'Georgia', serif", fontWeight: 900, fontSize: '1.2rem', letterSpacing: '-0.02em', margin: 0 }}>
            <span style={{ color: '#b91c1c' }}>Red</span><span style={{ color: '#ef4444' }}>Fairy</span>
          </h2>
        </div>
        {/* Título vinho: zIndex 10 p/ aparecer desde o início, junto do header */}
        <div style={{ position: 'relative', zIndex: 10, background: 'rgba(255,255,255,0.92)', borderBottom: '1px solid #f1f5f9', padding: '0 14px 9px', flexShrink: 0 }}>
          <p style={{ margin: 0, color: '#7B1E1E', fontWeight: 800, fontSize: '15px', letterSpacing: '0.2px' }}>{"Complete o seu Perfil"}</p>
        </div>

        <div className="p-5" style={{ overflowY: 'auto', flex: 1, position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="space-y-3">
            <div>
              <label className={labelCls}>{"Nome completo"}</label>
              <input
                ref={nomeRef} type="text" value={nome}
                onChange={e => onNomeChange(e.target.value)}
                onFocus={() => setCampoAtivo('nome')}
                className={fieldCls('nome')} style={{ textTransform: 'uppercase' }}
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
              <p className="text-xs text-gray-900 mt-1">{"Necessário para receber documentos médicos."}</p>
            </div>

            <div>
              <label className={labelCls}>{"E-mail"}</label>
              <input
                ref={emailRef} type="email" value={email}
                onChange={e => onEmailChange(e.target.value)}
                onFocus={() => setCampoAtivo('email')}
                className={fieldCls('email')} style={{ textTransform: 'lowercase' }}
                autoCapitalize="off" autoCorrect="off" spellCheck="false"
                placeholder="seu@email.com"
              />
              {email && !emailOk && (
                <p className="text-xs mt-1" style={{ color: '#F97316' }}>{"Entre um e-mail válido"}</p>
              )}
            </div>

            {erro && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <p className="text-xs font-semibold text-red-700">{erro}</p>
              </div>
            )}
          </div>

          {/* Rodapé: empurrado para baixo (área branca, abaixo da faixa da imagem).
              Botão PLAY à direita; "← Voltar" discreto e centralizado como única saída. */}
          <div style={{ marginTop: 'auto' }} className="pt-6 flex flex-col gap-3">
            {tudoOk && (
              <div className="flex flex-col items-end">
                <PlayButton
                  ref={confirmarRef}
                  onClick={handleSalvar}
                  loading={loading}
                  label="CONFIRMO"
                  ariaLabel="Confirmar perfil"
                />
              </div>
            )}
            {onVoltar && (
              <button onClick={onVoltar}
                className="text-xs text-gray-400 hover:text-gray-600 font-medium text-center transition-colors">
                {"← Voltar"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
