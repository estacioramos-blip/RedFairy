import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import obaLogo from '../assets/oba-logo.png'
import obaFairyIcon from '../assets/oba-fairy-icon.png'
import PlayButton from './PlayButton'
import { useInstalarFada } from '../lib/useInstalarFada'
import { sairDoApp } from '../lib/sairDoApp'

// =============================================================================
// IndicadorPage — 3º perfil (INDICADOR LEIGO): quem conhece um bariátrico e
// quer trazê-lo, sem ser médico nem paciente.
//
// (R4, 09/2026) ESTE PERFIL DEIXOU DE RECEBER DINHEIRO. Antes o leigo ganhava
// comissão por indicado que assinasse — isso é captação de clientela, e o
// médico responsável técnico responde por ela mesmo quando quem recebe é leigo
// (CFM 2.336/2023 e CFM 2.170/2017). O incentivo mudou de lado: quem ganha
// agora é quem ENTRA, com o desconto de boas-vindas.
//
// Consequência prática no cadastro: SEM SENHA e SEM CPF. Sem dinheiro, o CPF do
// leigo perdeu todas as funções que tinha (login, dedup, prioridade), e guardar
// CPF de quem nem é usuário é dado sensível sob a LGPD sem contrapartida.
// Ficam nome (aparece no "Você foi indicado por X") e celular OPCIONAL.
// ⚠ Não reintroduzir CPF, senha, saldo ou chave PIX nesta tela.
//
// A volta é pelo próprio código, guardado no aparelho (localStorage) e no
// ícone/link — não há login a refazer.
// =============================================================================

const inputClass = "w-full border-2 rounded-lg px-3 py-2.5 text-sm text-center font-bold outline-none"
const inpStyle = { borderColor: '#facc15', background: '#fefce8', color: '#1e3a8a' }
const PLAY = { playColor: '#E3AE37', labelColor: '#000000', ringColor: 'rgba(227,174,55,0.65)' }

function soDigitos(s) { return String(s || '').replace(/\D/g, '') }
function fmtCPF(v) {
  const d = soDigitos(v).slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return d.slice(0,3) + '.' + d.slice(3)
  if (d.length <= 9) return d.slice(0,3) + '.' + d.slice(3,6) + '.' + d.slice(6)
  return d.slice(0,3) + '.' + d.slice(3,6) + '.' + d.slice(6,9) + '-' + d.slice(9)
}
function fmtCel(v) {
  const d = soDigitos(v).slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
}

export default function IndicadorPage({ onVoltar }) {
  // 'cadastro' = ainda não tem código neste aparelho; 'painel' = já tem.
  const [etapa, setEtapa] = useState(() => {
    try { return localStorage.getItem('indicador_codigo') ? 'painel' : 'cadastro' } catch (e) { return 'cadastro' }
  })
  const [nome, setNome] = useState(() => { try { return localStorage.getItem('indicador_nome') || '' } catch (e) { return '' } })
  const [codigo, setCodigo] = useState(() => { try { return localStorage.getItem('indicador_codigo') || '' } catch (e) { return '' } })
  const [nomeInput, setNomeInput] = useState('')
  const [celInput, setCelInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [erro, setErro] = useState('')

  // (instalar icone) checkbox que instala o icone do Projeto + copia o link.
  const [iconeMarcado, setIconeMarcado] = useState(false)
  const [linkCopiado, setLinkCopiado] = useState(false)
  const [iosInstr, setIosInstr] = useState(false)
  const [instFalhou, setInstFalhou] = useState(false)
  const { instalar } = useInstalarFada()

  // reservar CPF de um bariátrico
  const [cpfPac, setCpfPac] = useState('')
  const [preMsg, setPreMsg] = useState(''); const [preErro, setPreErro] = useState(''); const [preBusy, setPreBusy] = useState(false)
  const [copiado, setCopiado] = useState(false)

  const base = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : 'https://app.bariatrico.net'
  const link = codigo ? `${base}/?oba=1&ind=${codigo}` : ''

  // Limpa restos do modelo antigo (conta com senha/PIX). Sem isso, um aparelho
  // que já tinha login de indicador ficaria com chaves órfãs para sempre.
  useEffect(() => {
    try {
      ;['indicador_id', 'indicador_token', 'indicador_cpf', 'indicador_pix'].forEach(k => localStorage.removeItem(k))
    } catch (e) {}
  }, [])

  const nomeOk = nomeInput.trim().length >= 2

  async function criar() {
    if (!nomeOk || busy) return
    setBusy(true); setErro('')
    try {
      const { data, error } = await supabase.rpc('criar_indicador_leigo', {
        p_nome: nomeInput.trim(),
        p_celular: soDigitos(celInput) || null,
      })
      if (error) { setErro('ERRO DE CONEXÃO. TENTE NOVAMENTE.'); return }
      if (!data || !data.ok) { setErro((data?.erro || 'NÃO FOI POSSÍVEL GERAR O SEU LINK').toString().toUpperCase()); return }
      setCodigo(data.codigo); setNome(data.nome || nomeInput.trim())
      try {
        localStorage.setItem('indicador_codigo', data.codigo)
        localStorage.setItem('indicador_nome', data.nome || '')
      } catch (e) {}
      setEtapa('painel')
    } catch (e) { setErro('ERRO DE CONEXÃO. TENTE NOVAMENTE.') }
    finally { setBusy(false) }
  }

  function irParaBariatrico() { sairDoApp() }

  async function copiarLink() {
    try { await navigator.clipboard.writeText(link); setCopiado(true); setTimeout(() => setCopiado(false), 2000) } catch (e) {}
  }

  // Instalar o ÍCONE do Projeto na tela + copiar o LINK (dentro do gesto do clique).
  async function aoInstalarIcone(e) {
    const marcado = e.target.checked
    setIconeMarcado(marcado)
    if (!marcado) { setIosInstr(false); setLinkCopiado(false); setInstFalhou(false); return }
    try { await navigator.clipboard.writeText(link); setLinkCopiado(true) } catch (er) {}
    const r = await instalar()
    if (r === 'ios') setIosInstr(true)
    else if (r === 'indisponivel') setInstFalhou(true)
  }

  async function preCadastrar() {
    setPreMsg(''); setPreErro('')
    if (soDigitos(cpfPac).length !== 11) { setPreErro('CPF inválido (11 dígitos).'); return }
    setPreBusy(true)
    try {
      const { data, error } = await supabase.rpc('precadastrar_indicacao', { p_codigo: codigo, p_cpf: cpfPac })
      if (error) throw error
      if (data?.ja_no_projeto) { setPreErro('ESSE PACIENTE JÁ FAZ PARTE DO PROJETO'); return }
      if (!data?.ok) { setPreErro(data?.erro || 'Não foi possível reservar.'); return }
      setPreMsg('Pronto! Se essa pessoa entrar em até 3 meses, ela recebe o desconto de boas-vindas.')
      setCpfPac('')
    } catch (e) { setPreErro('Erro de conexão. Tente de novo.') }
    finally { setPreBusy(false) }
  }

  const FecharBtn = (
    <button onClick={irParaBariatrico} aria-label="Fechar"
      style={{ position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: '50%', background: '#7B1E1E', color: '#fff', border: '2px solid #fff', cursor: 'pointer', fontSize: '12px', fontWeight: 700, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
      {"✕"}
    </button>
  )

  // ── PAINEL ──────────────────────────────────────────────────────────────────
  if (etapa === 'painel' && codigo) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center p-6">
        <div className="w-full max-w-sm mt-6 mb-10">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden relative">
            {FecharBtn}
            <div className="p-5 pt-7">
              <img src={obaLogo} alt="Projeto OBA" className="h-24 object-contain mx-auto" />
              <p className="text-center text-[11px] text-gray-400 mt-1 mb-3">{nome ? nome : 'Modo Indicador'}</p>

              <p className="text-sm text-gray-600 leading-relaxed text-center">
                {"Mostre este "}<b>{"QR"}</b>{" ao bariátrico, ou envie o "}<b>{"LINK"}</b>{" por WhatsApp. Quem entrar por aqui ganha um "}<b>{"desconto de boas-vindas"}</b>{" na primeira anuidade."}
              </p>

              <div className="flex justify-center mt-3">
                <div className="bg-white p-3 rounded-xl border-2 border-gray-300">
                  <QRCodeSVG value={link} size={170} fgColor="#000000" />
                </div>
              </div>
              <div className="bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 break-all text-center mt-3">{link}</div>
              <div className="flex flex-col items-center pt-3">
                <PlayButton onClick={copiarLink} label={copiado ? 'LINK COPIADO ✓' : 'COPIAR LINK'} ariaLabel="Copiar link"
                  circleClass="bg-gray-700 hover:bg-gray-800" playColor="#facc15" labelColor="#7B1E1E" ringColor="rgba(250,204,21,0.7)" />
              </div>

              {/* RESERVAR um CPF (sem o link/QR) */}
              <div className="w-full border-t border-gray-100 pt-3 text-left mt-3">
                <p className="text-xs font-bold text-gray-600 mb-1.5">{"Ou reserve o CPF de um bariátrico:"}</p>
                <div className="flex items-center gap-2">
                  <input value={cpfPac} onChange={e => { setCpfPac(fmtCPF(e.target.value)); setPreMsg(''); setPreErro('') }}
                    placeholder="000.000.000-00" inputMode="numeric" maxLength={14}
                    className="flex-1 min-w-0 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                  <button onClick={preCadastrar} disabled={preBusy}
                    className="shrink-0 text-white text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50" style={{ background: '#6B7280' }}>
                    {preBusy ? '...' : 'Reservar'}
                  </button>
                </div>
                {preMsg && <p className="text-xs font-bold mt-1.5 leading-snug text-green-700">{preMsg}</p>}
                {preErro && <p className="text-xs font-bold mt-1.5 leading-snug text-red-700">{preErro}</p>}
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={iconeMarcado} onChange={aoInstalarIcone} className="w-4 h-4 flex-shrink-0" style={{ accentColor: '#7B1E1E' }} />
                  <span className="text-xs font-bold text-gray-700 leading-tight">{"Instalar o ÍCONE do Projeto OBA na minha tela"}</span>
                  <img src={obaFairyIcon} alt="" className="ml-auto w-10 h-10 rounded-lg flex-shrink-0" style={{ objectFit: 'contain' }} />
                </label>
                {linkCopiado && <p className="text-[11px] mt-2 text-green-700 font-bold">{"✓ LINK copiado! Cole no WhatsApp, Telegram ou nas suas redes."}</p>}
                {iosInstr && <p className="text-[11px] mt-1 text-gray-500 leading-snug">{"No iPhone: toque em Compartilhar (↑) e depois em \"Adicionar à Tela de Início\"."}</p>}
                {instFalhou && <p className="text-[11px] mt-1 text-orange-600 font-bold leading-snug">{"Não deu pra instalar agora — feche e abra o link de novo, aí marque esta caixa."}</p>}

                {/* Sem login, "deslogar" não existe: o que guarda o vínculo é o
                    CÓDIGO no aparelho. APAGAR MEU LINK é a única saída
                    destrutiva, e diz o que faz. */}
                <div className="mt-4 flex items-start justify-center gap-8">
                  <div className="text-center">
                    <button onClick={() => {
                        try { localStorage.removeItem('indicador_codigo'); localStorage.removeItem('indicador_nome') } catch (e) {}
                        setCodigo(''); setNome(''); setEtapa('cadastro')
                      }}
                      className="text-[11px] font-extrabold tracking-widest text-gray-500 uppercase hover:text-red-700">
                      {"APAGAR MEU LINK"}
                    </button>
                    <p className="text-[10px] text-gray-400 mt-1 leading-snug">{"Some deste aparelho"}</p>
                  </div>
                  <div className="text-center">
                    <button onClick={irParaBariatrico}
                      className="text-[11px] font-extrabold tracking-widest text-gray-500 uppercase hover:text-red-700">
                      {"SAIR"}
                    </button>
                    <p className="text-[10px] text-gray-400 mt-1 leading-snug">{"Seu link fica guardado"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── CADASTRO (nome + celular opcional) ──────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6 relative">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md relative">
        {FecharBtn}
        <div className="mb-5 text-center">
          <img src={obaLogo} alt="Projeto OBA®" style={{ height: 128, objectFit: 'contain', display: 'block', margin: '0 auto' }} />
          <p className="text-gray-500 text-sm" style={{ marginTop: 4 }}>Modo Indicador</p>
        </div>

        <p className="text-sm text-gray-600 leading-relaxed text-center mb-4">
          {"Conhece alguém que fez cirurgia bariátrica? Gere um link e traga essa pessoa — ela ganha "}<b>{"desconto de boas-vindas"}</b>{" na primeira anuidade."}
        </p>

        <p className="text-center text-xs font-bold text-gray-500 tracking-widest mb-2">SEU PRIMEIRO NOME</p>
        <input autoFocus className={inputClass} style={inpStyle} maxLength={40}
          value={nomeInput} onChange={e => { setNomeInput(e.target.value.replace(/[0-9]/g, '')); setErro('') }}
          onKeyDown={e => { if (e.key === 'Enter' && nomeOk) criar() }}
          placeholder="Maria" />
        <p className="text-center text-[11px] text-gray-400 mt-1.5 leading-snug">
          {"É o nome que a pessoa vai ver: \"Você foi indicado por "}{nomeInput.trim() ? nomeInput.trim().split(' ')[0] : 'Maria'}{"\"."}
        </p>

        <p className="text-center text-xs font-bold text-gray-500 tracking-widest mb-2 mt-4">SEU CELULAR (OPCIONAL)</p>
        <input className={inputClass} style={inpStyle} inputMode="numeric" maxLength={16}
          value={celInput} onChange={e => setCelInput(fmtCel(e.target.value))}
          onKeyDown={e => { if (e.key === 'Enter' && nomeOk) criar() }}
          placeholder="(71) 99999-9999" />
        <p className="text-center text-[11px] text-gray-400 mt-1.5 leading-snug">
          {"Só se você quiser que a gente possa te avisar. Não pedimos CPF nem senha."}
        </p>

        {erro && <p className="text-center text-red-600 text-xs font-bold mt-3">{erro}</p>}

        {nomeOk && (
          <div className="flex justify-end mt-4">
            <PlayButton onClick={criar} loading={busy} label={"GERAR MEU LINK"} ariaLabel="Gerar meu link" {...PLAY} />
          </div>
        )}
      </div>
    </div>
  )
}
