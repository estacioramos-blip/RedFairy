import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import logo from '../assets/logo.png'
import obaLogo from '../assets/oba-logo.png'
import elaDigita from '../assets/ELA_DIGITA.jpg'
import eleDigita from '../assets/ELE_DIGITA.jpg'
import bariMale from '../assets/barimale.jpg'
import bariFem from '../assets/barifem.jpg'
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
// DDDs válidos do Brasil (lista oficial da Anatel). Usados para validar o celular.
const DDDS_VALIDOS = new Set([
  '11','12','13','14','15','16','17','18','19',
  '21','22','24','27','28',
  '31','32','33','34','35','37','38',
  '41','42','43','44','45','46','47','48','49',
  '51','53','54','55',
  '61','62','63','64','65','66','67','68','69',
  '71','73','74','75','77','79',
  '81','82','83','84','85','86','87','88','89',
  '91','92','93','94','95','96','97','98','99',
])

function formatarCep(v) {
  const d = (v || '').replace(/\D/g, '').slice(0, 8)
  return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`
}

function formatarCelular(v) {
  let d = (v || '').replace(/\D/g, '')
  // Autofill/colagem costuma trazer o +55 na frente (12-13 dígitos): remove o código do país.
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2)
  d = d.slice(0, 11)
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
  // Fase 1 (emergência): endereço (preenchido pelo ViaCEP) + contato de emergência.
  // Encorajados, não bloqueiam o CONFIRMO (tudoOk segue só nome/celular/e-mail).
  const [cep, setCep] = useState('')
  const [logradouro, setLogradouro] = useState('')
  const [numero, setNumero] = useState('')
  const [complemento, setComplemento] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidade, setCidade] = useState('')
  const [uf, setUf] = useState('')
  const [cepBuscando, setCepBuscando] = useState(false)
  const [cepErro, setCepErro] = useState('')
  const [emergNome, setEmergNome] = useState('')
  const [emergCelular, setEmergCelular] = useState('')
  const [emergParentesco, setEmergParentesco] = useState('')
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
  const celTimer = useRef(null)
  const emailTimer = useRef(null)
  const confirmarRef = useRef(null)
  const numeroRef = useRef(null)
  const ultimaTecla = useRef(0)   // p/ o vigia anti-autofill não brigar com a digitação

  useEffect(() => () => {
    if (nomeTimer.current) clearTimeout(nomeTimer.current)
    if (celTimer.current) clearTimeout(celTimer.current)
    if (emailTimer.current) clearTimeout(emailTimer.current)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => { setSplashPerfil(false); nomeRef.current?.focus() }, 1200)
    return () => clearTimeout(t)
  }, [])

  // ANTI-AUTOFILL (Chrome desktop): o autofill escreve nos campos SEM disparar os
  // eventos do React — a tela mostra tudo preenchido, mas o estado fica vazio e o
  // botão CONFIRMO nunca aparece. Este vigia compara o valor visível (DOM) com o
  // estado e adota o visível quando divergirem. O campo em foco só é pulado se
  // houve digitação real no último 1,2s (autofill pode preencher até o campo
  // focado, sem tecla). Transformações idempotentes = sem loop de re-render.
  useEffect(() => {
    const t = setInterval(() => {
      const foco = document.activeElement
      const digitando = Date.now() - ultimaTecla.current < 1200
      if (nomeRef.current && !(digitando && foco === nomeRef.current)) {
        const v = String(nomeRef.current.value || '').toUpperCase().replace(/[0-9]/g, '')
        setNome(prev => (prev === v ? prev : v))
      }
      if (celRef.current && !(digitando && foco === celRef.current)) {
        const v = formatarCelular(celRef.current.value)
        setCelular(prev => (prev === v ? prev : v))
      }
      if (emailRef.current && !(digitando && foco === emailRef.current)) {
        const v = String(emailRef.current.value || '').toLowerCase()
        setEmail(prev => (prev === v ? prev : v))
      }
    }, 700)
    return () => clearInterval(t)
  }, [])

  // Imagem dinâmica por sexo: homem → "ELE DIGITA"; mulher (ou desconhecido,
  // padrão) → "ELA DIGITA".
  const isMasc = /^m/i.test(String(profile?.sexo || '').trim())
  const ehBari = !!profile?.bariatrica
  // Bariátrico usa as imagens do OBA (barimale/barifem); senão, ELE/ELA DIGITA.
  const fotoDigita = ehBari ? (isMasc ? bariMale : bariFem) : (isMasc ? eleDigita : elaDigita)

  const celDigits = (celular || '').replace(/\D/g, '')
  const dddOk = celDigits.length >= 2 && DDDS_VALIDOS.has(celDigits.slice(0, 2))
  const dddInvalido = celDigits.length >= 2 && !dddOk
  const nomeOk = (nome || '').trim().length >= 5
  const celOk = celDigits.length >= 10 && dddOk
  const emailOk = /\S+@\S+\.\S+/.test((email || '').trim())
  const tudoOk = nomeOk && celOk && (!(email || '').trim() || emailOk)   // e-mail OPCIONAL (só p/ PIX)

  function onNomeChange(v) {
    ultimaTecla.current = Date.now()
    setNome(v.toUpperCase().replace(/[0-9]/g, '')); setErro('')
    if (nomeTimer.current) clearTimeout(nomeTimer.current)
    nomeTimer.current = setTimeout(() => {
      if ((v || '').trim().length >= 5) celRef.current?.focus()  // 3,5s parado → salta p/ celular
    }, 3500)
  }

  function onCelChange(v) {
    ultimaTecla.current = Date.now()
    const f = formatarCelular(v); setCelular(f); setErro('')
    const dig = f.replace(/\D/g, '')
    if (celTimer.current) clearTimeout(celTimer.current)
    if (dig.length === 11) {
      emailRef.current?.focus()  // celular completo (11 dígitos) → foca e-mail na hora
    } else if (dig.length === 10 && DDDS_VALIDOS.has(dig.slice(0, 2))) {
      // 10 dígitos com DDD válido (fixo ou celular antigo): pode já estar completo.
      // Se o paciente parar 3,5s, salta p/ e-mail — antes só 11 dígitos avançavam.
      celTimer.current = setTimeout(() => {
        if (document.activeElement === celRef.current) emailRef.current?.focus()
      }, 3500)
    }
  }

  function onEmailChange(v) {
    // (sem salto de cursor) o foco fica no e-mail; o usuário toca em CONFIRMO quando quiser.
    // O salto automático roubava o foco e atrapalhava a digitação (ex.: a "@").
    ultimaTecla.current = Date.now()
    setEmail(v.toLowerCase()); setErro('')
  }

  // ViaCEP: ao completar 8 dígitos, preenche logradouro/bairro/cidade/UF automaticamente.
  async function buscarCep(d) {
    setCepBuscando(true); setCepErro('')
    try {
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`)
      const j = await r.json()
      if (j.erro) setCepErro('CEP não encontrado — preencha manualmente.')
      else {
        setLogradouro(j.logradouro || ''); setBairro(j.bairro || '')
        setCidade(j.localidade || ''); setUf(j.uf || '')
        setTimeout(() => numeroRef.current?.focus(), 50)
      }
    } catch (e) { setCepErro('Não deu para buscar o CEP agora — preencha manualmente.') }
    setCepBuscando(false)
  }
  function onCepChange(v) {
    const f = formatarCep(v); setCep(f); setCepErro('')
    const d = f.replace(/\D/g, '')
    if (d.length === 8) buscarCep(d)
  }

  async function handleSalvar() {
    setErro('')
    const nomeT = (nome || '').trim()
    if (nomeT.length < 5) { setErro('Informe seu nome completo.'); return }
    if (celDigits.length < 10) { setErro('Celular inválido (com DDD).'); return }
    if (!dddOk) { setErro('DDD inválido. Verifique o código da sua região.'); return }
    const emailT = (email || '').trim().toLowerCase()
    if ((email || '').trim() && !emailOk) { setErro('E-mail inválido — ou deixe em branco.'); return }

    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .update({ nome: nomeT, celular: celDigits })
      .eq('id', profile.id)
      .select('id, nome, cpf, sexo, data_nascimento, celular, bariatrica, gestante, boas_vindas_vista')
      .maybeSingle()
    // E-mail: profiles.email pode não existir ainda (rodar migrate_profiles_email.sql). Update
    // SEPARADO e tolerante — não quebra o salvar do perfil se a coluna faltar.
    try { await supabase.from('profiles').update({ email: emailT }).eq('id', profile.id) } catch (e) {}
    // Endereço + contato de emergência: colunas podem não existir ainda (rodar
    // migrate_profiles_endereco_emergencia.sql). Update SEPARADO e tolerante — se as
    // colunas faltarem, o erro é ignorado e o salvar do perfil (nome/celular) não quebra.
    try {
      await supabase.from('profiles').update({
        cep: cep.replace(/\D/g, '') || null,
        logradouro: logradouro.trim() || null,
        numero: numero.trim() || null,
        complemento: complemento.trim() || null,
        bairro: bairro.trim() || null,
        cidade: cidade.trim() || null,
        uf: (uf || '').trim().toUpperCase() || null,
        contato_emergencia_nome: emergNome.trim() || null,
        contato_emergencia_celular: emergCelular.replace(/\D/g, '') || null,
        contato_emergencia_parentesco: emergParentesco.trim() || null,
      }).eq('id', profile.id)
    } catch (e) {}
    setLoading(false)
    if (error) { setErro('Erro ao salvar. Tente novamente.'); return }

    try { localStorage.setItem('paciente_nome', nomeT) } catch (e) {}
    // Devolve o perfil COMPLETO (endereço/contato de emergência que acabaram de ser salvos),
    // p/ o dashboard não ficar com um profile parcial na mesma sessão.
    if (onSalvo) onSalvo({
      ...(data || { ...profile, nome: nomeT, celular: celDigits }),
      email: emailT,
      cep: cep.replace(/\D/g, '') || null,
      logradouro: logradouro.trim() || null,
      numero: numero.trim() || null,
      complemento: complemento.trim() || null,
      bairro: bairro.trim() || null,
      cidade: cidade.trim() || null,
      uf: (uf || '').trim().toUpperCase() || null,
      contato_emergencia_nome: emergNome.trim() || null,
      contato_emergencia_celular: emergCelular.replace(/\D/g, '') || null,
      contato_emergencia_parentesco: emergParentesco.trim() || null,
    })
  }

  const fieldCls = (campo) =>
    `w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-colors border-2 ${
      campoAtivo === campo ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 bg-white'
    }`
  const labelCls = "block text-xs font-semibold text-gray-600 mb-1"
  // Inputs dos campos novos (endereço/emergência) — sem o realce seamless, borda simples.
  const inpCls = "w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none border-2 border-gray-200 focus:border-yellow-400 bg-white"
  // (bariátrico) rótulos de Celular/E-mail em PRETO (a imagem de fundo é só um leve fundo).
  const estiloLabel = ehBari ? { color: '#000000' } : undefined

  return (
    <div className="fixed inset-0 bg-black/95 flex items-start justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden my-4" style={{ maxHeight: '94vh', display: 'flex', flexDirection: 'column', position: 'relative' }}
        onMouseEnter={() => setBgPerfilRevelado(true)} onMouseLeave={() => setBgPerfilRevelado(false)} onTouchStart={() => setBgPerfilRevelado(true)}>

        {/* Imagem de fundo: faixa de largura cheia, esmaecida; revela no hover (atrás dos inputs).
            top 52% (um pouco mais alta) e altura 430px (corta menos a base da imagem). */}
        <div aria-hidden="true" style={{ position: 'absolute', top: '44%', left: 0, right: 0, height: '430px', transform: 'translateY(-50%)', backgroundImage: `url(${fotoDigita})`, backgroundSize: '100% auto', backgroundPosition: 'center top', backgroundRepeat: 'no-repeat', filter: bgPerfilRevelado ? (ehBari ? 'blur(2px)' : 'blur(0px)') : (ehBari ? 'blur(8px)' : 'blur(10px)'), opacity: bgPerfilRevelado ? (ehBari ? 0.42 : 0.5) : (ehBari ? 0.28 : 0.12), transition: 'filter 0.6s ease, opacity 0.6s ease', pointerEvents: 'none' }} />

        {/* SPLASH de entrada: imagem nítida (largura cheia, centrada) por 1,2s, antes dos campos */}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 5, backgroundColor: '#FDF7F7', opacity: splashPerfil ? 1 : 0, pointerEvents: splashPerfil ? 'auto' : 'none', transition: 'opacity 0.5s ease' }}>
          <div style={{ position: 'absolute', top: '44%', left: 0, right: 0, height: '430px', transform: 'translateY(-50%)' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${fotoDigita})`, backgroundSize: '100% auto', backgroundPosition: 'center top', backgroundRepeat: 'no-repeat' }} />
          </div>
        </div>

        {/* Header padrão (logo-fada + RedFairy). zIndex 10 p/ aparecer já durante o splash. */}
        <div style={{ position: 'relative', zIndex: 10, background: ehBari ? '#6B7280' : 'rgba(255,255,255,0.92)', borderBottom: '1px solid #f1f5f9', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {ehBari ? <img src={obaLogo} alt="Projeto OBA" style={{ width: 30, height: 30, objectFit: 'contain' }} /> : <img src={logo} alt="RedFairy" style={{ width: 28, height: 28, objectFit: 'contain' }} />}
          <h2 style={{ fontFamily: "'Georgia', serif", fontWeight: 900, fontSize: '1.2rem', letterSpacing: '-0.02em', margin: 0 }}>
            {ehBari ? (
              <span style={{ color: '#facc15' }}>{"Projeto OBA"}<sup style={{ fontSize: '0.6em', verticalAlign: 'super' }}>{"®"}</sup></span>
            ) : (<>
              <span style={{ color: '#b91c1c' }}>Red</span><span style={{ color: '#ef4444' }}>Fairy</span>
              <span style={{ color: '#E3AE37', fontWeight: 700 }}>{" | "}</span>
              <span style={{ color: '#374151' }}>{"OBA"}<sup style={{ fontSize: '0.6em', verticalAlign: 'super' }}>{"®"}</sup></span>
            </>)}
          </h2>
        </div>
        <div className="p-5" style={{ overflowY: 'auto', flex: 1, position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Título dentro do conteúdo (não na faixa do header), mais abaixo. */}
          <p style={{ margin: '0 0 12px', color: '#7B1E1E', fontWeight: 800, fontSize: '15px', letterSpacing: '0.2px' }}>{"Complete o seu Perfil"}</p>
          <div className="space-y-3">
            <div>
              <label className={labelCls}>{"Nome completo"}</label>
              <input
                ref={nomeRef} type="text" value={nome} autoComplete="name"
                onChange={e => onNomeChange(e.target.value)}
                onFocus={() => setCampoAtivo('nome')}
                className={fieldCls('nome')} style={{ textTransform: 'uppercase' }}
              />
            </div>

            <div>
              <label className={labelCls} style={estiloLabel}>{"Celular (WhatsApp)"}</label>
              <input
                ref={celRef} type="text" value={celular} autoComplete="tel"
                onChange={e => onCelChange(e.target.value)}
                onFocus={() => setCampoAtivo('celular')}
                className={fieldCls('celular')} inputMode="numeric" maxLength={16}
                placeholder="(00) 00000-0000"
              />
              {dddInvalido && <p className="text-xs mt-1" style={{ color: '#F97316' }}>{"DDD inválido — verifique o código da sua região."}</p>}
              <p className="text-xs text-gray-900 mt-1" style={estiloLabel}>{"Necessário para receber documentos médicos."}</p>
            </div>

            <div>
              <label className={labelCls} style={estiloLabel}>{"E-mail"}</label>
              <p className="text-xs text-gray-500 mb-1">{"Opcional — cadastre só se o seu PIX for o seu e-mail."}</p>
              <input
                ref={emailRef} type="email" value={email} inputMode="email" autoComplete="email"
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

            {/* ENDEREÇO — importante para o socorro chegar em uma emergência. CEP → ViaCEP. */}
            <div>
              <label className={labelCls} style={estiloLabel}>{"Endereço"}</label>
              <p className="text-xs text-gray-500 mb-1">{"Importante para o socorro chegar em uma emergência. Digite o CEP que preenchemos o resto."}</p>
              <div className="flex gap-2">
                <input type="text" value={cep} onChange={e => onCepChange(e.target.value)} inputMode="numeric" maxLength={9}
                  className={inpCls + " flex-1"} placeholder={"CEP"} />
                <input ref={numeroRef} type="text" value={numero} onChange={e => setNumero(e.target.value)} inputMode="numeric"
                  className={inpCls + " w-24"} placeholder={"Número"} />
              </div>
              {cepBuscando && <p className="text-xs text-gray-500 mt-1">{"Buscando o CEP…"}</p>}
              {cepErro && <p className="text-xs mt-1" style={{ color: '#F97316' }}>{cepErro}</p>}
              {(logradouro || cidade) && (
                <div className="mt-2 space-y-2">
                  <input type="text" value={logradouro} onChange={e => setLogradouro(e.target.value)} className={inpCls} placeholder={"Rua / logradouro"} />
                  <input type="text" value={complemento} onChange={e => setComplemento(e.target.value)} className={inpCls} placeholder={"Complemento (opcional)"} />
                  <div className="flex gap-2">
                    <input type="text" value={bairro} onChange={e => setBairro(e.target.value)} className={inpCls + " flex-1"} placeholder={"Bairro"} />
                    <input type="text" value={cidade} onChange={e => setCidade(e.target.value)} className={inpCls + " flex-1"} placeholder={"Cidade"} />
                    <input type="text" value={uf} onChange={e => setUf(e.target.value.toUpperCase().slice(0, 2))} className={inpCls + " w-16"} placeholder={"UF"} maxLength={2} />
                  </div>
                </div>
              )}
            </div>

            {/* CONTATO DE EMERGÊNCIA (nome + celular + parentesco) */}
            <div>
              <label className={labelCls} style={estiloLabel}>{"Contato de emergência"}</label>
              <p className="text-[11px] text-gray-500 mb-1 leading-snug">{"CERTAS SITUAÇÕES CLÍNICAS PODEM INDICAR RISCO MAIOR: DOR AGUDA, DESFALECIMENTO, TONTURA, QUEDA, HEMORRAGIA... EXIGINDO ORIENTAÇÃO/INTERVENÇÃO DE URGÊNCIA. ACIONAR TRÊS VEZES O BOTÃO DE EMERGÊNCIA DEFLAGRARÁ AÇÕES DE PROTEÇÃO E CONTATO DE EMERGÊNCIA."}</p>
              <div className="space-y-2">
                <input type="text" value={emergNome} onChange={e => setEmergNome(e.target.value.toUpperCase())} className={inpCls} placeholder={"Nome do contato"} style={{ textTransform: 'uppercase' }} />
                <div className="flex gap-2">
                  <input type="text" value={emergCelular} onChange={e => setEmergCelular(formatarCelular(e.target.value))} inputMode="numeric" maxLength={16} className={inpCls + " flex-1"} placeholder={"Celular do contato"} />
                  <input type="text" value={emergParentesco} onChange={e => setEmergParentesco(e.target.value)} className={inpCls + " w-32"} placeholder={"Parentesco"} />
                </div>
              </div>
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
            {!tudoOk && !splashPerfil && (
              <p className="text-[11px] font-medium text-right leading-tight" style={{ color: '#ea580c' }}>
                {"Para liberar o CONFIRMO: "}
                {[
                  !nomeOk && 'nome completo',
                  !celOk && 'celular com DDD',
                  !!(email || '').trim() && !emailOk && 'e-mail válido (ou apague)',
                ].filter(Boolean).join(' + ')}
              </p>
            )}
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
