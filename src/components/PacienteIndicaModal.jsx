import { useState, useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import PlayButton from './PlayButton'
import obaLogo from '../assets/oba-logo.png'

/**
 * PacienteIndicaModal — o PACIENTE bariátrico vira INDICADOR.
 *
 * Modais SEPARADOS por `view`:
 *   - 'indicar'  → só o QR + link (é o que se mostra ao novo paciente). SEM créditos.
 *   - 'creditos' → só os contadores de créditos + a chave PIX. SEM QR.
 *
 * NOME e CPF já vêm gravados (perfil/ícone) — aparecem pequenos sob o logo. 1ª vez (ou
 * trocar) pede só a CHAVE PIX, com checkboxes CPF/CELULAR + campo "outra chave".
 *
 * Cores OBA: cinza + amarelo. QR preto (mais legível). Props: cpf, celular, view, onFechar().
 * Requer migrate_paciente_indicador.sql + migrate_paciente_pix.sql.
 */
function fmtCPF(v) {
  const d = String(v || '').replace(/\D/g, '').slice(0, 11)
  if (d.length !== 11) return String(v || '')
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

export default function PacienteIndicaModal({ cpf, celular, email, view = 'indicar', onFechar }) {
  const [codigo, setCodigo] = useState('')
  const [nome, setNome] = useState('')
  const [pixChave, setPixChave] = useState('')
  const [dados, setDados] = useState(null)
  const [copiado, setCopiado] = useState(false)
  const [erro, setErro] = useState('')

  // Form de PIX (1ª vez ou "trocar")
  const [mostrarTroca, setMostrarTroca] = useState(false)
  const [pixTipo, setPixTipo] = useState('')   // 'cpf' | 'celular' | 'outra'
  const [pixInput, setPixInput] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [msgPix, setMsgPix] = useState('')
  const [resCpf, setResCpf] = useState(''); const [resMsg, setResMsg] = useState(null); const [resBusy, setResBusy] = useState(false)  // RESERVAR um CPF
  // Titular da conta PIX (a chave pode ser de um familiar) + PJ/CNPJ + (indicador) nome/telefone.
  const [pixTitular, setPixTitular] = useState(''); const [pixPj, setPixPj] = useState(false); const [pixCnpj, setPixCnpj] = useState(''); const [pixFamiliar, setPixFamiliar] = useState(false)
  const [indNome, setIndNome] = useState(''); const [indTel, setIndTel] = useState('')
  const pixRef = useRef(null)

  const base = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : 'https://redfairy.bio'
  const link = codigo ? `${base}/?ref=${codigo}` : ''
  const cpfLimpo = String(cpf || '').replace(/\D/g, '')
  const celLimpo = String(celular || '').replace(/\D/g, '')
  const emailLimpo = String(email || '').trim().toLowerCase()
  const ownNome = (indNome.trim() || nome || '').trim()   // nome próprio p/ o titular travado

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
          setPixTitular(prev => prev || data.nome || '')   // titular default = próprio nome
          setPixChave(data.pix || '')
          if (data.pix) carregarPainel(data.codigo)
        } else setErro((data && data.erro) || 'Não foi possível ativar a sua indicação.')
      } catch (e) { if (vivo) setErro('Erro de conexão. Tente de novo.') }
    })()
    return () => { vivo = false }
  }, [cpfLimpo])

  // PIX titular: chave PRÓPRIA (cpf/celular/email) ou vazia → titular TRAVADO no nome próprio.
  // Só a chave "outra" libera os checkboxes familiar/PJ que destravam o campo.
  useEffect(() => {
    if (pixTipo !== 'outra') { setPixFamiliar(false); setPixPj(false); setPixTitular(ownNome) }
  }, [pixTipo, ownNome])

  const precisaPix = !pixChave || mostrarTroca

  function escolherPix(tipo, valor) {
    setMsgPix('')
    if (pixTipo === tipo) { setPixTipo(''); setPixInput('') }
    else { setPixTipo(tipo); setPixInput(valor) }
  }

  async function salvarPix() {
    setMsgPix('')
    if (!pixInput.trim()) { setMsgPix('Informe a sua chave PIX.'); return }
    const nomeFinal = (indNome.trim() || nome).trim()
    if (!nomeFinal) { setMsgPix('Informe o seu nome.'); return }
    const tit = pixTitular.trim()
    if (!tit) { setMsgPix(pixPj ? 'Informe a Razão Social do titular.' : 'Informe o nome do titular da conta.'); return }
    if (pixPj && String(pixCnpj).replace(/\D/g, '').length !== 14) { setMsgPix('Informe o CNPJ (14 dígitos).'); return }
    setSalvando(true)
    try {
      const { data } = await supabase.rpc('paciente_salvar_pix', {
        p_cpf: cpfLimpo, p_nome: nomeFinal, p_pix: pixInput.trim(),
        p_celular: indTel.replace(/\D/g, '') || celLimpo, p_email: emailLimpo,
        p_titular: tit, p_pj: pixPj, p_cnpj: pixPj ? String(pixCnpj).replace(/\D/g, '') : null,
      })
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

  async function reservarCpf() {
    const d = String(resCpf || '').replace(/\D/g, '')
    if (d.length !== 11) { setResMsg({ ok: false, txt: 'CPF inválido (11 dígitos).' }); return }
    setResBusy(true); setResMsg(null)
    try {
      const { data } = await supabase.rpc('indicador_reservar_cpf', { p_codigo: codigo, p_cpf: d })
      if (data && data.ok) {
        setResMsg({ ok: true, txt: data.ja_cadastrado
          ? 'Esse CPF já faz parte do Projeto. A reserva foi registrada mesmo assim.'
          : 'CPF reservado por 3 meses! Se essa pessoa se cadastrar e pagar nesse prazo, o crédito é seu. Reservar de novo renova o prazo.' })
        setResCpf('')
      } else setResMsg({ ok: false, txt: (data && data.erro) || 'Não foi possível reservar.' })
    } catch (e) { setResMsg({ ok: false, txt: 'Erro de conexão. Tente de novo.' }) }
    setResBusy(false)
  }
  const checkCls = (on) =>`flex items-center gap-2 cursor-pointer text-xs font-medium tracking-wide ${on ? 'text-gray-800' : 'text-gray-600'}`

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

            {/* Form de PIX — só a chave (1ª vez ou trocar) */}
            {codigo && precisaPix && view === 'creditos' && (
              <>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {mostrarTroca
                    ? 'Atualize a sua chave PIX (você pode receber em outra conta).'
                    : 'Precisamos da sua Chave PIX para créditos.'}
                </p>
                <div className="space-y-1.5">
                  <label className={checkCls(pixTipo === 'cpf')}>
                    <input type="checkbox" checked={pixTipo === 'cpf'} style={{ accentColor: '#7B1E1E' }} onChange={() => escolherPix('cpf', cpfLimpo)} />
                    {"MEU CPF É O MEU PIX"}
                  </label>
                  {celLimpo && (
                    <label className={checkCls(pixTipo === 'celular')}>
                      <input type="checkbox" checked={pixTipo === 'celular'} style={{ accentColor: '#7B1E1E' }} onChange={() => escolherPix('celular', celLimpo)} />
                      {"MEU CELULAR É O MEU PIX"}
                    </label>
                  )}
                  {emailLimpo && (
                    <label className={checkCls(pixTipo === 'email')}>
                      <input type="checkbox" checked={pixTipo === 'email'} style={{ accentColor: '#7B1E1E' }} onChange={() => escolherPix('email', emailLimpo)} />
                      {"MEU E-MAIL É O MEU PIX"}
                    </label>
                  )}
                </div>
                <div>
                  <input ref={pixRef} className="w-full border-2 border-yellow-300 bg-yellow-50 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-yellow-400"
                    value={pixInput} onChange={e => { setPixInput(e.target.value); setPixTipo(e.target.value ? 'outra' : ''); setMsgPix('') }}
                    placeholder="Digite ou cole outra chave PIX" />
                </div>
                {/* (indicador sem cadastro completo) nome + telefone */}
                {!nome && (
                  <input value={indNome} onChange={e => setIndNome(e.target.value.toUpperCase().replace(/[0-9]/g, ''))}
                    placeholder="SEU NOME COMPLETO" style={{ textTransform: 'uppercase' }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                )}
                {!celLimpo && (
                  <input value={indTel} onChange={e => setIndTel(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="Seu telefone / WhatsApp (com DDD)" inputMode="numeric"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                )}
                {/* Titular do PIX: chave própria → travado no nome. Chave "outra" → familiar/PJ destravam. */}
                {pixTipo === 'outra' && (
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-600">
                      <input type="checkbox" checked={pixFamiliar} style={{ accentColor: '#7B1E1E' }}
                        onChange={e => { const v = e.target.checked; setPixFamiliar(v); if (v) { setPixPj(false); setPixTitular('') } else setPixTitular(ownNome); setMsgPix('') }} />
                      {"O TITULAR DA CONTA É UM FAMILIAR"}
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-600">
                      <input type="checkbox" checked={pixPj} style={{ accentColor: '#7B1E1E' }}
                        onChange={e => { const v = e.target.checked; setPixPj(v); if (v) { setPixFamiliar(false); setPixTitular('') } else setPixTitular(ownNome); setMsgPix('') }} />
                      {"O TITULAR DA CONTA É PESSOA JURÍDICA"}
                    </label>
                  </div>
                )}
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">{pixPj ? 'Razão Social (titular da conta)' : 'Nome do titular da conta (quem recebe)'}</label>
                  <input value={pixTitular} onChange={e => { setPixTitular(e.target.value); setMsgPix('') }}
                    readOnly={!pixFamiliar && !pixPj}
                    placeholder={pixPj ? 'Razão Social da empresa' : (pixFamiliar ? 'Nome de quem recebe' : 'Você (titular)')}
                    className={`w-full border-2 rounded-lg px-3 py-2 text-sm focus:outline-none ${(pixFamiliar || pixPj) ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-100 text-gray-500'}`} />
                </div>
                {pixPj && (
                  <input value={pixCnpj} onChange={e => setPixCnpj(e.target.value.replace(/\D/g, '').slice(0, 14))}
                    placeholder={"CNPJ (só números)"} inputMode="numeric"
                    className="w-full border-2 border-red-500 bg-red-50 rounded-lg px-3 py-2 text-sm" />
                )}
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

            {/* INDICAR — só QR + link + copiar (o que se mostra ao novo paciente) */}
            {codigo && view !== 'creditos' && (
              <>
                <p className="text-sm text-gray-600 leading-relaxed text-center">
                  {"Mostre este "}<b>{"QR"}</b>{" ao bariátrico, ou copie o "}<b>{"LINK"}</b>{" e envie no WhatsApp/Telegram. Quando ele se cadastrar e pagar, você ganha crédito. Você também pode "}<b>{"RESERVAR"}</b>{" o CPF de outro bariátrico, aqui embaixo nesta tela. A reserva vale por "}<b>{"3 meses"}</b>{" — se ele se cadastrar nesse prazo, você recebe os créditos (reservar de novo renova o prazo)."}
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

            {/* VER MEUS CRÉDITOS — só os créditos + PIX (privado, sem QR) */}
            {codigo && view === 'creditos' && (
              <>
                <p className="text-sm text-gray-600 leading-relaxed text-center">
                  {"Seus créditos por indicar outros bariátricos. Eles abatem documentos médicos e a sua anuidade."}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { n: (dados?.creditos || []).length, t: 'CADASTRADOS' },
                    { n: (dados?.precadastros || []).length, t: 'RESERVADOS' },
                    { n: (dados?.creditos || []).filter(c => c.pago).length, t: 'RECEBIDOS' },
                    { n: (dados?.creditos || []).filter(c => !c.pago).length, t: 'PENDENTES' },
                  ].map((b, i) => (
                    <div key={i} className="bg-gray-700 rounded-lg py-2 text-center">
                      <p className="text-2xl font-extrabold" style={{ color: '#facc15' }}>{b.n}</p>
                      <p className="text-[9px] font-semibold" style={{ color: '#facc15' }}>{b.t}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 text-center">{"Cada indicado que paga vale US$ "}{dados?.comissao_usd || 10}{"."}</p>
                {!precisaPix && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-left">
                    <p className="text-[11px] text-gray-500">{"Você recebe em (PIX):"}</p>
                    <p className="text-sm font-bold text-gray-700 break-all">{pixChave}</p>
                    <button onClick={() => { setPixInput(pixChave); setPixTipo('outra'); setMsgPix(''); setMostrarTroca(true) }}
                      className="text-xs font-bold text-gray-600 underline underline-offset-2 hover:text-gray-800 mt-1">
                      {"QUERO TROCAR MINHA CHAVE PIX"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
