import { useState, useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import { useInstalarFada } from '../lib/useInstalarFada'
import PlayButton from './PlayButton'
import obaLogo from '../assets/oba-logo.png'

/**
 * PacienteIndicaModal — o PACIENTE bariátrico vira INDICADOR: indica outros bariátricos
 * e ganha créditos (US$10 por indicado que paga), abatendo o próprio investimento.
 *
 * NOME e CPF já vêm gravados (do perfil/ícone) — aparecem pequenos sob o logo. A 1ª vez
 * pede só a CHAVE PIX. Dois modos (prop `view`):
 *   - 'indicar'  → foca em compartilhar (QR + link) + contadores abaixo.
 *   - 'creditos' → foca nos créditos (contadores + valor + PIX) + link de indicação abaixo.
 *
 * Props: cpf, view ('indicar'|'creditos'), onFechar().
 * Requer migrate_paciente_indicador.sql + migrate_paciente_pix.sql.
 */
function fmtCPF(v) {
  const d = String(v || '').replace(/\D/g, '').slice(0, 11)
  if (d.length !== 11) return String(v || '')
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

export default function PacienteIndicaModal({ cpf, view = 'indicar', onFechar }) {
  const [codigo, setCodigo] = useState('')
  const [nome, setNome] = useState('')
  const [pixChave, setPixChave] = useState('')
  const [dados, setDados] = useState(null)
  const [copiado, setCopiado] = useState(false)
  const [erro, setErro] = useState('')

  // Form de PIX (1ª vez ou "trocar") — só a chave (nome/CPF já gravados).
  const [mostrarTroca, setMostrarTroca] = useState(false)
  const [pixInput, setPixInput] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [msgPix, setMsgPix] = useState('')
  const pixRef = useRef(null)

  const { instalar, ios } = useInstalarFada()
  const base = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : 'https://redfairy.bio'
  const link = codigo ? `${base}/?ref=${codigo}` : ''
  const cpfLimpo = String(cpf || '').replace(/\D/g, '')

  async function carregarPainel(cod) {
    try {
      const { data: pan } = await supabase.rpc('listar_creditos_indicador', { p_codigo: cod })
      if (pan && pan.ok) setDados(pan)
    } catch (e) {}
  }

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const { data } = await supabase.rpc('paciente_virar_indicador', { p_cpf: cpfLimpo })
        if (!vivo) return
        if (data && data.ok && data.codigo) {
          setCodigo(data.codigo)
          setNome(data.nome || '')
          setPixChave(data.pix || '')
          if (data.pix) carregarPainel(data.codigo)
        } else setErro((data && data.erro) || 'Não foi possível ativar a sua indicação.')
      } catch (e) { if (vivo) setErro('Erro de conexão. Tente de novo.') }
    })()
    return () => { vivo = false }
  }, [cpfLimpo])

  const precisaPix = !pixChave || mostrarTroca

  // Foca a CHAVE PIX quando o form aparece.
  useEffect(() => {
    if (codigo && precisaPix) { const t = setTimeout(() => { if (pixRef.current) pixRef.current.focus() }, 120); return () => clearTimeout(t) }
  }, [codigo, precisaPix])

  async function salvarPix() {
    setMsgPix('')
    if (!pixInput.trim()) { setMsgPix('Informe a sua chave PIX.'); return }
    setSalvando(true)
    try {
      const { data } = await supabase.rpc('paciente_salvar_pix', { p_cpf: cpfLimpo, p_nome: nome, p_pix: pixInput.trim() })
      if (data && data.ok) {
        setPixChave(pixInput.trim())
        setMostrarTroca(false)
        carregarPainel(codigo)
      } else setMsgPix((data && data.erro) || 'Não foi possível salvar.')
    } catch (e) { setMsgPix('Erro de conexão. Tente de novo.') }
    finally { setSalvando(false) }
  }

  async function copiar() {
    try { await navigator.clipboard.writeText(link); setCopiado(true); setTimeout(() => setCopiado(false), 2500) } catch (e) {}
  }
  async function instalarIcone() {
    try { await navigator.clipboard.writeText(link); setCopiado(true) } catch (e) {}
    await instalar()
  }

  const inputCls = "w-full border-2 border-yellow-300 bg-yellow-50 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-yellow-400"

  // Bloco: compartilhar (QR + link + copiar + instalar)
  const blocoCompartilhar = (
    <div className="space-y-3">
      <div className="flex justify-center">
        <div className="bg-white p-3 rounded-xl border-2 border-red-700">
          <QRCodeSVG value={link} size={150} fgColor="#b91c1c" />
        </div>
      </div>
      <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-gray-700 break-all">{link}</div>
      <button onClick={copiar} className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors">
        {copiado ? 'LINK COPIADO ✓' : 'COPIAR LINK'}
      </button>
      <button onClick={instalarIcone} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-sm transition-colors">
        {"📲 Instalar o ícone na minha tela (copia o link)"}
      </button>
      {ios && <p className="text-[11px] text-gray-500 leading-snug text-center">{"No iPhone: toque em Compartilhar (↑) e depois em \"Adicionar à Tela de Início\"."}</p>}
    </div>
  )

  // Bloco: contadores de créditos (o mesmo que o indicador vê)
  const blocoCreditos = (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {[
          { n: (dados?.creditos || []).length, t: 'CADASTRADOS' },
          { n: (dados?.precadastros || []).length, t: 'RESERVADOS' },
          { n: (dados?.creditos || []).filter(c => c.pago).length, t: 'RECEBIDOS' },
          { n: (dados?.creditos || []).filter(c => !c.pago).length, t: 'PENDENTES' },
        ].map((b, i) => (
          <div key={i} className="bg-red-50 border border-red-100 rounded-lg py-2 text-center">
            <p className="text-2xl font-extrabold text-red-700">{b.n}</p>
            <p className="text-[9px] text-gray-500 font-semibold">{b.t}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 text-center">{"Cada indicado que paga vale US$ "}{dados?.comissao_usd || 10}{"."}</p>
    </div>
  )

  // Bloco: PIX cadastrado + trocar
  const blocoPix = (
    <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-left">
      <p className="text-[11px] text-gray-500">{"Você recebe em (PIX):"}</p>
      <p className="text-sm font-bold text-gray-700 break-all">{pixChave}</p>
      <button onClick={() => { setPixInput(pixChave); setMsgPix(''); setMostrarTroca(true) }}
        className="text-xs font-bold text-red-700 underline underline-offset-2 hover:text-red-800 mt-1">
        {"Desejo trocar minha chave PIX"}
      </button>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.95)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden my-6 relative">
        {/* X fechar — círculo vinho, X branco (igual ao modal do ícone) */}
        <button onClick={onFechar} aria-label="Fechar"
          style={{ position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: '50%', background: '#7B1E1E', color: '#fff', border: '2px solid #fff', cursor: 'pointer', fontSize: '12px', fontWeight: 700, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
          {"✕"}
        </button>

        <div className="p-5 pt-7">
          {/* Logo OBA + nome/CPF (já gravados, pequenos, cinza) */}
          <img src={obaLogo} alt="Projeto OBA" className="h-14 object-contain mx-auto" />
          {(nome || cpfLimpo) && (
            <p className="text-center text-[11px] text-gray-400 mt-1">{[nome, fmtCPF(cpf)].filter(Boolean).join('  ·  ')}</p>
          )}

          <div className="space-y-3 mt-3">
            {erro && <p className="text-red-600 text-xs font-bold text-center">{erro}</p>}
            {!codigo && !erro && <p className="text-xs text-gray-400 text-center">Carregando…</p>}

            {/* Form de PIX — só a chave (1ª vez ou trocar) */}
            {codigo && precisaPix && (
              <>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {mostrarTroca
                    ? 'Atualize a sua chave PIX (você pode receber os créditos em outra conta).'
                    : 'Para receber os seus créditos em dinheiro, informe a sua chave PIX. É por aqui que pagaremos você.'}
                </p>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{"Chave PIX"}</label>
                  <input ref={pixRef} className={inputCls} value={pixInput} onChange={e => { setPixInput(e.target.value); setMsgPix('') }} placeholder="CPF, celular, e-mail ou chave aleatória" />
                </div>
                {msgPix && <p className="text-xs font-semibold text-red-600">{msgPix}</p>}
                {pixInput.trim().length >= 3 && (
                  <div className="flex flex-col items-center pt-1">
                    <PlayButton onClick={salvarPix} loading={salvando} label="SALVAR" ariaLabel="Salvar chave PIX"
                      circleClass="bg-gray-700 hover:bg-gray-800" playColor="#facc15" labelColor="#7B1E1E" ringColor="rgba(250,204,21,0.7)" />
                  </div>
                )}
                {mostrarTroca && (
                  <button onClick={() => { setMostrarTroca(false); setMsgPix('') }} className="w-full text-xs text-gray-400 hover:text-gray-600 font-medium">
                    {"Cancelar"}
                  </button>
                )}
              </>
            )}

            {/* Painel — modo CRÉDITOS */}
            {codigo && !precisaPix && view === 'creditos' && (
              <>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {"Estes são os seus créditos por indicar outros bariátricos. Eles abatem documentos médicos e a sua anuidade."}
                </p>
                {blocoCreditos}
                {blocoPix}
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs font-bold text-gray-500 mb-2 text-center">{"SEU LINK DE INDICAÇÃO"}</p>
                  {blocoCompartilhar}
                </div>
              </>
            )}

            {/* Painel — modo INDICAR */}
            {codigo && !precisaPix && view !== 'creditos' && (
              <>
                <p className="text-sm text-gray-600 leading-relaxed text-left">
                  Conhece outros bariátricos? Indique-os ao <b>Projeto OBA</b>: cada um que se cadastrar
                  e pagar vale <b>US$10</b> de crédito para você. Mostre o <b>QR</b>, ou copie o <b>LINK</b>{' '}
                  e envie no WhatsApp/Telegram.
                </p>
                {blocoCompartilhar}
                {blocoCreditos}
                {blocoPix}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
