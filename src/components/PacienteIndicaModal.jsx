import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import PlayButton from './PlayButton'
import obaLogo from '../assets/oba-logo.png'

/**
 * PacienteIndicaModal — o PACIENTE bariátrico indica outros bariátricos.
 *
 * Modais SEPARADOS por `view`:
 *   - 'indicar'  → só o QR + link (é o que se mostra ao novo paciente). SEM créditos.
 *   - 'creditos' → só os contadores. SEM QR.
 *
 * (R3, 09/2026) O crédito de indicação NUNCA vira dinheiro: abate anuidade e
 * documentos médicos do próprio paciente, e nada mais. Por isso este modal não
 * tem — e não deve voltar a ter — formulário de chave PIX, titular, CNPJ ou
 * qualquer coisa parecida: não há para onde pagar. Desconto de fidelidade ao
 * próprio cliente é lícito; dinheiro por paciente trazido é captação de
 * clientela (CFM 2.336/2023 e CFM 2.170/2017), e o responsável técnico responde
 * por isso. O incentivo de quem chega mudou de lado: quem entra indicado ganha
 * desconto de boas-vindas (ver PagamentoCadastroModal).
 *
 * Cores OBA: cinza + amarelo. QR preto (mais legível).
 * Props: cpf, view, onFechar().
 */
function fmtCPF(v) {
  const d = String(v || '').replace(/\D/g, '').slice(0, 11)
  if (d.length !== 11) return String(v || '')
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

export default function PacienteIndicaModal({ cpf, view = 'indicar', onFechar }) {
  const [codigo, setCodigo] = useState('')
  const [nome, setNome] = useState('')
  const [dados, setDados] = useState(null)
  const [copiado, setCopiado] = useState(false)
  const [erro, setErro] = useState('')
  const [resCpf, setResCpf] = useState(''); const [resMsg, setResMsg] = useState(null); const [resBusy, setResBusy] = useState(false)

  const base = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : 'https://app.bariatrico.net'
  // ?ind= (param PRÓPRIO do indicador — ?ref é do médico) + ?oba=1: o bariátrico
  // indicado cai direto na entrada do Projeto OBA, não na landing do RedFairy.
  const link = codigo ? `${base}/?oba=1&ind=${codigo}` : ''
  const cpfLimpo = String(cpf || '').replace(/\D/g, '')

  async function carregarPainel(cod) {
    try {
      const t = (() => { try { return localStorage.getItem('paciente_token') || '' } catch (e) { return '' } })()
      const { data: pan } = await supabase.rpc('listar_creditos_indicador', { p_codigo: cod, p_token: t })
      if (pan && pan.ok) setDados(pan)
    } catch (e) {}
  }

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        // Gate de token: só o dono do CPF ativa a própria indicação. Desde R4 a
        // sessão de INDICADOR não existe mais (o leigo não tem conta), então
        // aqui vale exclusivamente a sessão de PACIENTE.
        const tk = (() => { try { return localStorage.getItem('paciente_token') || '' } catch (e) { return '' } })()
        const { data } = await supabase.rpc('paciente_virar_indicador', { p_cpf: cpfLimpo, p_token: tk })
        if (!vivo) return
        if (data && data.ok && data.codigo) {
          setCodigo(data.codigo)
          setNome(data.nome || '')
          carregarPainel(data.codigo)
        } else setErro((data && data.erro) || 'Não foi possível ativar a sua indicação.')
      } catch (e) { if (vivo) setErro('Erro de conexão. Tente de novo.') }
    })()
    return () => { vivo = false }
  }, [cpfLimpo])

  async function copiar() {
    try { await navigator.clipboard.writeText(link); setCopiado(true); setTimeout(() => setCopiado(false), 2500) } catch (e) {}
  }

  async function reservarCpf() {
    const d = String(resCpf || '').replace(/\D/g, '')
    if (d.length !== 11) { setResMsg({ ok: false, txt: 'CPF inválido (11 dígitos).' }); return }
    setResBusy(true); setResMsg(null)
    try {
      const { data } = await supabase.rpc('indicador_reservar_cpf', { p_codigo: codigo, p_cpf: d })
      if (data && data.ok) {
        setResMsg({ ok: true, txt: data.ja_cadastrado
          ? 'Esse CPF já faz parte do Projeto. A reserva foi registrada mesmo assim.'
          : 'CPF reservado por 3 meses! Se essa pessoa entrar nesse prazo, ela ganha o desconto de boas-vindas e você ganha o crédito.' })
        setResCpf('')
      } else setResMsg({ ok: false, txt: (data && data.erro) || 'Não foi possível reservar.' })
    } catch (e) { setResMsg({ ok: false, txt: 'Erro de conexão. Tente de novo.' }) }
    setResBusy(false)
  }

  const creditos   = dados?.creditos || []
  const usados     = creditos.filter(c => c.usado).length
  const aUsar      = creditos.length - usados
  const creditoBrl = Number(dados?.credito_brl) || 0
  const fmtBrl = (n) => (Math.round((Number(n) || 0) * 100) / 100).toFixed(2).replace('.', ',')

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.95)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden my-6 relative">
        {/* X fechar — círculo vinho, X branco (igual em todos os modais) */}
        <button onClick={onFechar} aria-label="Fechar"
          style={{ position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: '50%', background: '#7B1E1E', color: '#fff', border: '2px solid #fff', cursor: 'pointer', fontSize: '12px', fontWeight: 700, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
          {"✕"}
        </button>

        <div className="p-5 pt-7">
          {/* Logo OBA + nome/CPF (já gravados, pequenos, cinza) */}
          <img src={obaLogo} alt="Projeto OBA" className="h-24 object-contain mx-auto" />
          {(nome || cpfLimpo) && (
            <p className="text-center text-[11px] text-gray-400 mt-1">{[nome, fmtCPF(cpf)].filter(Boolean).join('  ·  ')}</p>
          )}

          <div className="space-y-3 mt-3">
            {erro && <p className="text-red-600 text-xs font-bold text-center">{erro}</p>}
            {!codigo && !erro && <p className="text-xs text-gray-400 text-center">Carregando…</p>}

            {/* INDICAR — só QR + link + copiar (o que se mostra ao novo paciente) */}
            {codigo && view !== 'creditos' && (
              <>
                <p className="text-sm text-gray-600 leading-relaxed text-center">
                  {"Mostre este "}<b>{"QR"}</b>{" ao bariátrico, ou copie o "}<b>{"LINK"}</b>{" e envie no WhatsApp/Telegram. Quem entrar por aqui ganha "}<b>{"desconto de boas-vindas"}</b>{", e você ganha um crédito para abater a sua anuidade e os seus documentos. Você também pode "}<b>{"RESERVAR"}</b>{" o CPF de outro bariátrico, aqui embaixo. A reserva vale por "}<b>{"3 meses"}</b>{"."}
                </p>
                <div className="flex justify-center">
                  <div className="bg-white p-3 rounded-xl border-2 border-gray-300">
                    <QRCodeSVG value={link} size={170} fgColor="#000000" />
                  </div>
                </div>
                <div className="bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 break-all text-center">{link}</div>
                <div className="flex flex-col items-center pt-1">
                  <PlayButton onClick={copiar} label={copiado ? 'LINK COPIADO ✓' : 'COPIAR LINK'} ariaLabel="Copiar link"
                    circleClass="bg-gray-700 hover:bg-gray-800" playColor="#facc15" labelColor="#7B1E1E" ringColor="rgba(250,204,21,0.7)" />
                </div>
                {/* RESERVAR um CPF (sem o link/QR) — espelho do RECOMENDAR do médico */}
                <div className="w-full border-t border-gray-100 pt-3 text-left mt-1">
                  <p className="text-xs font-bold text-gray-600 mb-1.5">{"Ou reserve um CPF (sem o link):"}</p>
                  <div className="flex items-center gap-2">
                    <input value={resCpf} onChange={e => { setResCpf(fmtCPF(e.target.value)); setResMsg(null) }}
                      placeholder="000.000.000-00" inputMode="numeric" maxLength={14}
                      className="flex-1 min-w-0 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                    <button onClick={reservarCpf} disabled={resBusy}
                      className="shrink-0 text-white text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50" style={{ background: '#6B7280' }}>
                      {resBusy ? '...' : 'Reservar'}
                    </button>
                  </div>
                  {resMsg && <p className="text-xs font-bold mt-1.5 leading-snug" style={{ color: resMsg.ok ? '#15803d' : '#b91c1c' }}>{resMsg.txt}</p>}
                </div>
              </>
            )}

            {/* VER MEUS CRÉDITOS — contadores (privado, sem QR) */}
            {codigo && view === 'creditos' && (
              <>
                <p className="text-sm text-gray-600 leading-relaxed text-center">
                  {"Seus créditos por indicar outros bariátricos. Eles abatem a sua anuidade e os seus documentos médicos."}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { n: (dados?.precadastros || []).length, t: 'RESERVADOS' },
                    { n: aUsar, t: 'A USAR' },
                    { n: usados, t: 'JÁ USADOS' },
                  ].map((b, i) => (
                    <div key={i} className="bg-gray-700 rounded-lg py-2 text-center">
                      <p className="text-2xl font-extrabold" style={{ color: '#facc15' }}>{b.n}</p>
                      <p className="text-[9px] font-semibold" style={{ color: '#facc15' }}>{b.t}</p>
                    </div>
                  ))}
                </div>
                {creditoBrl > 0 && (
                  <p className="text-xs text-gray-400 text-center">{"Cada indicado que entra e assina vale R$ "}{fmtBrl(creditoBrl)}{" em créditos."}</p>
                )}
                {/* A frase abaixo NÃO é decorativa: é a promessa que substitui a
                    antiga ("o excedente cai na sua conta"). Manter explícito que
                    não há saque evita que o paciente espere dinheiro. */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <p className="text-[11px] text-gray-600 leading-snug">
                    {"Os créditos são usados automaticamente quando você paga a anuidade ou solicita um documento. Eles não são sacados nem depositados em conta."}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
