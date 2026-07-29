import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import obaLogo from '../assets/oba-logo.png'

/**
 * CaixaPage — tesouraria manual do Projeto OBA (?modo=caixa).
 * Rotina INDEPENDENTE: pessoa autorizada entra com a senha do CAIXA (não vê o
 * resto do ADMIN). RPCs caixa_* (migrate_caixa.sql), todas token-protegidas.
 *
 * Abas: ENTRADAS · A PAGAR · ENCONTRO (paciente-indicador) · EXTRATOS · NOTAS.
 * Baixas congelam US$/cotação/R$ na linha. NF carimbável em entradas e pagamentos.
 * Futuro: Stripe passa a preencher automaticamente o que aqui é manual.
 */

const GOLD = '#E3AE37'
const DARK = '#14100E'

const fmtBRL = (v) => 'R$ ' + Number(v || 0).toFixed(2).replace('.', ',')
const fmtCPF = (c) => {
  const d = String(c || '').replace(/\D/g, '')
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : (c || '—')
}
const fmtData = (d) => {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('pt-BR') } catch (e) { return '—' }
}
// Data COM hora — usada só na lista de lotes de pagamento, onde dois lançamentos
// no mesmo dia precisam ser distinguíveis antes de alguém clicar em ESTORNAR.
const fmtDataHora = (d) => {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch (e) { return '—' }
}

export default function CaixaPage({ onVoltar }) {
  const [token, setToken] = useState(() => { try { return localStorage.getItem('caixa_token') || '' } catch (e) { return '' } })
  const [senha, setSenha] = useState('')
  const [erroLogin, setErroLogin] = useState('')
  const [busy, setBusy] = useState(false)
  const [aba, setAba] = useState('apagar')
  const [msg, setMsg] = useState(null)          // toast simples {ok, txt}

  function toast(ok, txt) { setMsg({ ok, txt }); setTimeout(() => setMsg(null), 4000) }

  async function rpc(nome, params) {
    const { data, error } = await supabase.rpc(nome, { p_token: token, ...params })
    if (error) throw new Error('Erro de conexão')
    if (data && data.ok === false && /Sessao invalida/i.test(data.erro || '')) {
      try { localStorage.removeItem('caixa_token') } catch (e) {}
      setToken('')
      throw new Error('Sessão expirada. Entre de novo.')
    }
    return data
  }

  async function login() {
    if (!senha || busy) return
    setBusy(true); setErroLogin('')
    try {
      const { data } = await supabase.rpc('caixa_login', { p_senha: senha })
      if (data && data.ok && data.token) {
        try { localStorage.setItem('caixa_token', data.token) } catch (e) {}
        setToken(data.token); setSenha('')
      } else setErroLogin((data && data.erro) || 'Falha no acesso')
    } catch (e) { setErroLogin('Erro de conexão. Tente de novo.') }
    setBusy(false)
  }

  function sair() {
    try { localStorage.removeItem('caixa_token') } catch (e) {}
    setToken('')
  }

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: DARK }}>
        <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center space-y-4">
          <img src={obaLogo} alt="OBA" style={{ width: 56, height: 56, objectFit: 'contain', margin: '0 auto' }} />
          <div>
            <h1 className="text-xl font-extrabold" style={{ color: DARK }}>{"CAIXA"}</h1>
            <p className="text-xs text-gray-500 mt-1">{"Pagamentos recebidos e devidos · conciliação · notas fiscais"}</p>
          </div>
          <input type="password" value={senha} onChange={e => { setSenha(e.target.value); setErroLogin('') }}
            onKeyDown={e => { if (e.key === 'Enter') login() }}
            placeholder="Senha do caixa" autoFocus
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-center" />
          {erroLogin && <p className="text-xs font-bold text-red-600">{erroLogin}</p>}
          <button onClick={login} disabled={busy || !senha}
            className="w-full font-bold py-2.5 rounded-xl text-sm disabled:opacity-50"
            style={{ background: GOLD, color: DARK }}>
            {busy ? '...' : 'ENTRAR'}
          </button>
          <button onClick={onVoltar} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium py-2 rounded-xl text-xs">
            {"← Voltar"}
          </button>
        </div>
      </div>
    )
  }

  // ── PAINEL ─────────────────────────────────────────────────────────────────
  const TABS = [
    { id: 'entradas', t: '📥 Entradas' },
    { id: 'apagar',   t: '📤 A Pagar' },
    { id: 'assinaturas', t: '🔒 Assinaturas' },
    { id: 'encontro', t: '🤝 Encontro de Contas' },
    { id: 'extratos', t: '🧾 Extratos' },
    { id: 'nf',       t: '🗂️ Notas Fiscais' },
    { id: 'estornos', t: '↩️ Estornos' },
  ]
  return (
    <div className="min-h-screen" style={{ background: '#f6f4f1' }}>
      <div className="px-4 py-3 flex items-center gap-3 flex-wrap" style={{ background: DARK }}>
        <img src={obaLogo} alt="OBA" style={{ width: 34, height: 34, objectFit: 'contain' }} />
        <h1 className="text-lg font-extrabold" style={{ color: GOLD }}>{"CAIXA"}</h1>
        <div className="flex-1" />
        <TrocarSenha rpc={rpc} toast={toast} />
        <button onClick={sair} className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: '#3a322c', color: '#d8cfc5' }}>{"SAIR"}</button>
      </div>
      <div className="px-4 pt-3 flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setAba(t.id)}
            className={`text-xs font-bold px-3 py-2 rounded-xl transition-colors ${aba === t.id ? 'shadow' : ''}`}
            style={aba === t.id ? { background: DARK, color: GOLD } : { background: '#e8e2da', color: '#5b5248' }}>
            {t.t}
          </button>
        ))}
      </div>
      {msg && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-xl text-xs font-bold"
          style={{ background: msg.ok ? '#dcfce7' : '#fee2e2', color: msg.ok ? '#15803d' : '#b91c1c' }}>
          {msg.txt}
        </div>
      )}
      <div className="p-4 max-w-5xl">
        {aba === 'entradas' && <AbaEntradas rpc={rpc} toast={toast} />}
        {aba === 'apagar'   && <AbaAPagar rpc={rpc} toast={toast} />}
        {aba === 'assinaturas' && <AbaAssinaturas rpc={rpc} toast={toast} />}
        {aba === 'encontro' && <AbaEncontro rpc={rpc} toast={toast} />}
        {aba === 'extratos' && <AbaExtratos rpc={rpc} toast={toast} />}
        {aba === 'nf'       && <AbaNF rpc={rpc} />}
        {aba === 'estornos' && <AbaEstornos rpc={rpc} toast={toast} />}
      </div>
    </div>
  )
}

// Botão/fluxo de trocar a senha do caixa (obrigatório trocar a inicial 'oba2026').
function TrocarSenha({ rpc, toast }) {
  const [aberto, setAberto] = useState(false)
  const [nova, setNova] = useState('')
  async function trocar() {
    if (nova.length < 6) { toast(false, 'Senha muito curta (mínimo 6).'); return }
    try {
      const d = await rpc('caixa_trocar_senha', { p_nova: nova })
      if (d?.ok) { toast(true, 'Senha trocada.'); setAberto(false); setNova('') }
      else toast(false, d?.erro || 'Não foi possível trocar.')
    } catch (e) { toast(false, e.message) }
  }
  if (!aberto) return <button onClick={() => setAberto(true)} className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: '#3a322c', color: '#d8cfc5' }}>{"TROCAR SENHA"}</button>
  return (
    <span className="flex items-center gap-1">
      <input type="password" value={nova} onChange={e => setNova(e.target.value)} placeholder="Nova senha"
        className="border border-gray-500 rounded-lg px-2 py-1 text-xs w-28" />
      <button onClick={trocar} className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: GOLD, color: DARK }}>{"OK"}</button>
      <button onClick={() => setAberto(false)} className="text-xs px-1 text-gray-400">{"✕"}</button>
    </span>
  )
}

// Carimbo de NF reutilizável (checkbox + nº da nota).
function CarimboNF({ rpc, toast, tabela, id, nf, onMudou }) {
  const [numero, setNumero] = useState(nf?.nf_numero || '')
  async function marcar(emitida) {
    try {
      const d = await rpc('caixa_nf', { p_tabela: tabela, p_id: String(id), p_emitida: emitida, p_numero: numero })
      if (d?.ok) { toast(true, emitida ? 'NF marcada.' : 'NF desmarcada.'); onMudou && onMudou() }
      else toast(false, d?.erro || 'Falha ao marcar NF.')
    } catch (e) { toast(false, e.message) }
  }
  if (nf?.nf_emitida) {
    return (
      <span className="inline-flex items-center gap-1 text-xs">
        <span className="font-bold text-green-700">{"NF ✓"}</span>
        {nf.nf_numero && <span className="text-gray-500">{"nº "}{nf.nf_numero}</span>}
        <button onClick={() => marcar(false)} className="text-gray-400 underline">{"desfazer"}</button>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1">
      <input value={numero} onChange={e => setNumero(e.target.value)} placeholder="nº NF"
        className="border border-gray-300 rounded px-1.5 py-0.5 text-xs w-16" />
      <button onClick={() => marcar(true)} className="text-xs font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 hover:bg-amber-200">{"NF"}</button>
    </span>
  )
}

// ── 📥 ENTRADAS ───────────────────────────────────────────────────────────────
function AbaEntradas({ rpc, toast }) {
  const [dados, setDados] = useState(null)
  const carregar = async () => { try { setDados(await rpc('caixa_entradas', {})) } catch (e) { toast(false, e.message) } }
  useEffect(() => { carregar() }, [])
  if (!dados) return <p className="text-sm text-gray-500">Carregando…</p>
  const Tab = ({ titulo, linhas, tabela }) => (
    <div className="bg-white rounded-2xl shadow p-4 mb-4">
      <h2 className="font-extrabold text-sm mb-2" style={{ color: DARK }}>{titulo}{" "}<span className="text-gray-400 font-normal">({linhas.length})</span></h2>
      {linhas.length === 0 ? <p className="text-xs text-gray-400">Nada por aqui.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-gray-400">
              <th className="py-1 pr-2">Data</th><th className="pr-2">Nome</th><th className="pr-2">CPF</th>
              <th className="pr-2">Valor</th><th className="pr-2">Status</th><th>Nota Fiscal</th>
            </tr></thead>
            <tbody>
              {linhas.map(l => (
                <tr key={l.id} className="border-t border-gray-100">
                  <td className="py-1.5 pr-2 whitespace-nowrap">{fmtData(l.data)}</td>
                  <td className="pr-2">{l.nome || '—'}</td>
                  <td className="pr-2 whitespace-nowrap">{fmtCPF(l.cpf)}</td>
                  <td className="pr-2 whitespace-nowrap font-bold">{l.valor != null ? fmtBRL(l.valor) : '—'}</td>
                  <td className="pr-2">{l.status || '—'}</td>
                  <td><CarimboNF rpc={rpc} toast={toast} tabela={tabela} id={l.id} nf={l} onMudou={carregar} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
  return (<>
    <Tab titulo="ANUIDADES (assinaturas)" linhas={dados.anuidades || []} tabela="assinaturas" />
    <Tab titulo="DOCUMENTOS (pedidos)" linhas={dados.documentos || []} tabela="pedidos_documento" />
  </>)
}

// ── 📤 A PAGAR ────────────────────────────────────────────────────────────────
function AbaAPagar({ rpc, toast }) {
  const [dados, setDados] = useState(null)
  const carregar = async () => { try { setDados(await rpc('caixa_a_pagar', {})) } catch (e) { toast(false, e.message) } }
  useEffect(() => { carregar() }, [])
  if (!dados) return <p className="text-sm text-gray-500">Carregando…</p>
  const cot = Number(dados.cotacao || 0)
  async function pagarMedico(crm) {
    if (!window.confirm(`Confirma a baixa de TODOS os créditos pendentes do CRM ${crm}?\n(Faça o PIX no banco ANTES de marcar pago.)`)) return
    try {
      const d = await rpc('caixa_pagar_medico', { p_crm: crm })
      if (d?.ok) { toast(true, `Pago: ${d.n_enc} encaminhamento(s) + ${d.n_av} avaliação(ões) = ${fmtBRL(d.total_brl)} (cotação ${d.cotacao}).`); carregar() }
      else toast(false, d?.erro || 'Falha na baixa.')
    } catch (e) { toast(false, e.message) }
  }
  async function pagarIndicador(codigo) {
    if (!window.confirm(`Confirma a baixa de TODOS os créditos pendentes do indicador ${codigo}?\n(Faça o PIX no banco ANTES de marcar pago.)`)) return
    try {
      const d = await rpc('caixa_pagar_indicador', { p_codigo: codigo })
      if (d?.ok) { toast(true, `Pago: ${d.n} crédito(s) = ${fmtBRL(d.total_brl)} (cotação ${d.cotacao}).`); carregar() }
      else toast(false, d?.erro || 'Falha na baixa.')
    } catch (e) { toast(false, e.message) }
  }
  const medicos = dados.medicos || [], inds = dados.indicadores || []
  return (<>
    <p className="text-xs text-gray-500 mb-3">
      {"Cotação atual: "}<b>{cot > 0 ? `R$ ${cot}` : '⚠ não configurada (Admin → Configurações)'}</b>
      {" · Encaminhar/Indicador: US$ "}{dados.usd_enc}{" · Avaliar: US$ "}{dados.usd_av}
    </p>
    <div className="bg-white rounded-2xl shadow p-4 mb-4">
      <h2 className="font-extrabold text-sm mb-2" style={{ color: DARK }}>{"MÉDICOS "}<span className="text-gray-400 font-normal">({medicos.length})</span></h2>
      {medicos.length === 0 ? <p className="text-xs text-gray-400">Nenhum pagamento devido.</p> : medicos.map(m => (
        <div key={m.crm} className="flex items-center gap-3 flex-wrap border-t border-gray-100 py-2 text-xs">
          <div className="flex-1 min-w-[180px]">
            <p className="font-bold">{m.nome || `CRM ${m.crm}`} <span className="text-gray-400 font-normal">· {m.crm}</span></p>
            <p className="text-gray-500">{m.n_enc}{" encaminhamento(s) + "}{m.n_av}{" avaliação(ões) = "}
              <b>US$ {Number(m.total_usd).toFixed(2)}</b>{cot > 0 && <>{" ≈ "}<b>{fmtBRL(m.total_usd * cot)}</b></>}</p>
            <p className="text-gray-500">{"PIX: "}<b>{m.pix || '(sem chave cadastrada)'}</b></p>
          </div>
          <button onClick={() => pagarMedico(m.crm)} className="font-bold px-3 py-2 rounded-xl text-xs" style={{ background: GOLD, color: DARK }}>
            {"MARCAR PAGO"}
          </button>
        </div>
      ))}
    </div>
    <div className="bg-white rounded-2xl shadow p-4 mb-4">
      <h2 className="font-extrabold text-sm mb-2" style={{ color: DARK }}>{"INDICADORES "}<span className="text-gray-400 font-normal">({inds.length})</span></h2>
      {inds.length === 0 ? <p className="text-xs text-gray-400">Nenhum pagamento devido.</p> : inds.map(i => (
        <div key={i.codigo} className="flex items-center gap-3 flex-wrap border-t border-gray-100 py-2 text-xs">
          <div className="flex-1 min-w-[180px]">
            <p className="font-bold">{i.nome || i.codigo} <span className="text-gray-400 font-normal">· {i.codigo}</span></p>
            <p className="text-gray-500">{i.n}{" crédito(s) = "}<b>US$ {Number(i.total_usd).toFixed(2)}</b>
              {cot > 0 && <>{" ≈ "}<b>{fmtBRL(i.total_usd * cot)}</b></>}</p>
            <p className="text-gray-500">{"PIX: "}<b>{i.pix || '(sem chave cadastrada)'}</b>{i.titular ? ` · Titular: ${i.titular}` : ''}</p>
          </div>
          <button onClick={() => pagarIndicador(i.codigo)} className="font-bold px-3 py-2 rounded-xl text-xs" style={{ background: GOLD, color: DARK }}>
            {"MARCAR PAGO"}
          </button>
        </div>
      ))}
    </div>
    <p className="text-[11px] text-gray-400">{"Pacientes que indicam não aparecem aqui — o crédito deles vai pro ENCONTRO DE CONTAS (abate anuidade/documentos; excedente é pago)."}</p>
  </>)
}

// ── 🔒 ASSINATURAS (bloqueio manual "na confiança") ───────────────────────────
function AbaAssinaturas({ rpc, toast }) {
  const [dados, setDados] = useState(null)
  const carregar = async () => { try { setDados(await rpc('caixa_assinaturas', {})) } catch (e) { toast(false, e.message) } }
  useEffect(() => { carregar() }, [])
  if (!dados) return <p className="text-sm text-gray-500">Carregando…</p>
  const lista = dados.assinaturas || []
  async function toggle(a) {
    const bloquear = a.status === 'ativa'
    const quem = a.nome || fmtCPF(a.cpf) || 'este paciente'
    const txt = bloquear
      ? `BLOQUEAR a assinatura de ${quem}?\n\nEle volta a precisar pagar (cai no paywall). Use quando o PIX NÃO foi recebido.`
      : `REATIVAR a assinatura de ${quem}?`
    if (!window.confirm(txt)) return
    try {
      const d = await rpc('caixa_bloquear_assinatura', { p_id: a.id, p_bloquear: bloquear })
      if (d?.ok) { toast(true, bloquear ? 'Assinatura bloqueada.' : 'Assinatura reativada.'); carregar() }
      else toast(false, d?.erro || 'Falha.')
    } catch (e) { toast(false, e.message) }
  }
  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <h2 className="font-extrabold text-sm mb-1" style={{ color: DARK }}>{"ASSINATURAS "}<span className="text-gray-400 font-normal">({lista.length})</span></h2>
      <p className="text-[11px] text-gray-400 mb-3">{"O paciente vira assinante \"na confiança\" ao clicar JÁ PAGUEI. Concilie com os PIX recebidos e BLOQUEIE quem não pagou — ele volta ao paywall. REATIVAR desfaz."}</p>
      {lista.length === 0 ? <p className="text-xs text-gray-400">Nenhuma assinatura.</p> : lista.map(a => {
        const ativa = a.status === 'ativa'
        return (
          <div key={a.id} className="flex items-center gap-3 flex-wrap border-t border-gray-100 py-2 text-xs">
            <div className="flex-1 min-w-[180px]">
              <p className="font-bold">{a.nome || '(sem nome)'} <span className="text-gray-400 font-normal">· {fmtCPF(a.cpf)}</span></p>
              <p className="text-gray-500">
                {"Desde "}{fmtData(a.data_inicio)}{" · Vence "}{fmtData(a.data_fim)}{" · "}
                {a.valor_pago != null ? <b>{fmtBRL(a.valor_pago)}</b> : <span className="text-amber-600 font-bold">{"sem valor"}</span>}
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-full font-bold" style={ativa ? { background: '#dcfce7', color: '#15803d' } : { background: '#fee2e2', color: '#b91c1c' }}>
              {ativa ? 'ATIVA' : 'BLOQUEADA'}
            </span>
            <button onClick={() => toggle(a)} className="font-bold px-3 py-2 rounded-xl text-xs"
              style={ativa ? { background: '#fee2e2', color: '#b91c1c' } : { background: GOLD, color: DARK }}>
              {ativa ? 'BLOQUEAR' : 'REATIVAR'}
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ── 🤝 ENCONTRO DE CONTAS ─────────────────────────────────────────────────────
function AbaEncontro({ rpc, toast }) {
  const [dados, setDados] = useState(null)
  const carregar = async () => { try { setDados(await rpc('caixa_a_pagar', {})) } catch (e) { toast(false, e.message) } }
  useEffect(() => { carregar() }, [])
  if (!dados) return <p className="text-sm text-gray-500">Carregando…</p>
  const pacs = dados.pacientes || []
  const anuidade = Number(dados.valor_anuidade || 200)
  async function abater(cpf, tipo, valorSugerido) {
    let valor = valorSugerido
    if (tipo !== 'anuidade') {
      const v = window.prompt(tipo === 'documento'
        ? 'Valor do documento a abater (R$):'
        : 'Valor do EXCEDENTE a pagar via PIX (R$):', String(valorSugerido || ''))
      if (v === null) return
      valor = Number(String(v).replace(',', '.'))
      if (!Number.isFinite(valor) || valor <= 0) { toast(false, 'Valor inválido.'); return }
    }
    const rotulo = { anuidade: 'ANUIDADE FUTURA (+12 meses na assinatura)', documento: 'DOCUMENTO', pix: 'PAGAMENTO PIX do excedente' }[tipo]
    if (!window.confirm(`Confirma o abatimento de ${fmtBRL(valor)} — ${rotulo} — do CPF ${fmtCPF(cpf)}?`)) return
    try {
      const d = await rpc('caixa_abater', { p_cpf: cpf, p_tipo: tipo, p_valor: valor, p_obs: null })
      if (d?.ok) { toast(true, `Registrado. Saldo novo: ${fmtBRL(d.saldo_novo)}.`); carregar() }
      else toast(false, d?.erro || 'Falha no abatimento.')
    } catch (e) { toast(false, e.message) }
  }
  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <h2 className="font-extrabold text-sm mb-1" style={{ color: DARK }}>{"PACIENTES QUE INDICAM "}<span className="text-gray-400 font-normal">({pacs.length})</span></h2>
      <p className="text-[11px] text-gray-400 mb-2">{"Saldo = créditos de indicação − abatimentos. Com saldo ≥ "}{fmtBRL(anuidade)}{" dá pra garantir mais 1 ano (abate a anuidade e estende a assinatura). Excedente é pago via PIX."}</p>
      {pacs.length === 0 ? <p className="text-xs text-gray-400">Nenhum paciente com créditos.</p> : pacs.map(p => (
        <div key={p.codigo} className="border-t border-gray-100 py-2 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <p className="font-bold">{p.nome || '(sem nome)'} <span className="text-gray-400 font-normal">· {fmtCPF(p.cpf)} · {p.codigo}</span></p>
              <p className="text-gray-500">{p.n_creditos}{" crédito(s) = "}{fmtBRL(p.creditos_brl)}{" · abatido: "}{fmtBRL(p.abatido_brl)}
                {" · saldo: "}<b style={{ color: Number(p.saldo_brl) > 0 ? '#15803d' : '#6b7280' }}>{fmtBRL(p.saldo_brl)}</b></p>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <button onClick={() => abater(p.cpf, 'anuidade', anuidade)} disabled={Number(p.saldo_brl) < anuidade}
                className="font-bold px-2.5 py-1.5 rounded-lg text-[11px] disabled:opacity-40" style={{ background: '#166534', color: '#fff' }}>
                {"ABATER ANUIDADE"}
              </button>
              <button onClick={() => abater(p.cpf, 'documento', '')} disabled={Number(p.saldo_brl) <= 0}
                className="font-bold px-2.5 py-1.5 rounded-lg text-[11px] disabled:opacity-40" style={{ background: '#1d4ed8', color: '#fff' }}>
                {"ABATER DOCUMENTO"}
              </button>
              <button onClick={() => abater(p.cpf, 'pix', p.saldo_brl)} disabled={Number(p.saldo_brl) <= 0}
                className="font-bold px-2.5 py-1.5 rounded-lg text-[11px] disabled:opacity-40" style={{ background: GOLD, color: DARK }}>
                {"PAGAR EXCEDENTE"}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── 🧾 EXTRATOS ───────────────────────────────────────────────────────────────
function AbaExtratos({ rpc, toast }) {
  const [papel, setPapel] = useState('medico')
  const [chave, setChave] = useState('')
  const [texto, setTexto] = useState('')
  const [busy, setBusy] = useState(false)
  // ESTORNO (M4): lotes de pagamento já lançados desta pessoa. O Caixa paga em
  // LOTE, então o que se estorna é o lote inteiro — identificado pelo timestamp
  // exato de data_pagamento, que é igual em todas as linhas de um mesmo UPDATE.
  const [lotes, setLotes] = useState([])
  const [estornando, setEstornando] = useState('')

  async function carregarLotes(p, c) {
    if (p !== 'medico' && p !== 'indicador') { setLotes([]); return }
    try {
      const d = await rpc('caixa_lotes_pagos', { p_papel: p, p_chave: c })
      setLotes((d && d.ok) ? (d.lotes || []) : [])
    } catch (e) { setLotes([]) }
  }

  async function estornar(lote) {
    if (estornando) return
    const quanto = fmtBRL(lote.total_brl)
    if (!window.confirm(
      `ESTORNAR o pagamento de ${fmtData(lote.data_pagamento)}?\n\n` +
      `${lote.n_linhas} lançamento(s) · ${quanto}\n\n` +
      `Os créditos voltam para "A PAGAR". Isso NÃO devolve dinheiro que já saiu da conta — ` +
      `serve para desfazer uma baixa lançada por engano.`
    )) return
    const motivo = window.prompt('Motivo do estorno (fica registrado):', '')
    if (motivo === null) return   // cancelou no motivo
    setEstornando(lote.data_pagamento)
    try {
      const d = await rpc('caixa_estornar', {
        p_papel: papel, p_chave: chave.trim(), p_data_pagamento: lote.data_pagamento, p_motivo: motivo,
      })
      if (!d || d.ok === false) { toast(false, d?.erro || 'Não foi possível estornar.'); setEstornando(''); return }
      toast(true, `Estornado: ${d.n_linhas} lançamento(s) · ${fmtBRL(d.total_brl)}`)
      await gerar()          // recarrega extrato + lotes
      setEstornando('')      // só libera o botão DEPOIS da lista recarregar
    } catch (e) { toast(false, e.message); setEstornando('') }
  }

  function linhaTxt(l, usdDefault, cot) {
    const st = l.pago ? `PAGO ${fmtData(l.data_pagamento)}${l.valor_brl != null ? ' ' + fmtBRL(l.valor_brl) : ''}` : (l.elegivel === false ? 'NAO ELEGIVEL' : 'A PAGAR')
    return `• ${fmtData(l.data)} · paciente ${l.cpf} · US$ ${Number(l.valor_usd ?? usdDefault).toFixed(2)} · ${st}${l.nf_emitida ? ' · NF ' + (l.nf_numero || 'emitida') : ''}`
  }
  async function gerar() {
    if (!chave.trim() || busy) return
    setBusy(true); setTexto('')
    try {
      const d = await rpc('caixa_extrato', { p_papel: papel, p_chave: chave.trim() })
      if (!d?.ok) { toast(false, d?.erro || 'Não encontrado.'); setBusy(false); return }
      const L = []
      const hoje = new Date().toLocaleDateString('pt-BR')
      L.push(`*EXTRATO — Projeto OBA®* (${hoje})`)
      if (d.papel === 'medico') {
        L.push(`Médico: ${d.nome || d.chave} (CRM ${d.chave})`)
        if (d.pix) L.push(`PIX: ${d.pix}`)
        const enc = d.encaminhamentos || [], av = d.avaliacoes || []
        L.push('', `*ENCAMINHAMENTOS* (${enc.length}):`)
        enc.forEach(l => L.push(linhaTxt(l, d.usd_enc, d.cotacao)))
        L.push('', `*AVALIAÇÕES* (${av.length}):`)
        av.forEach(l => L.push(linhaTxt(l, d.usd_av, d.cotacao)))
        const devidoUsd = enc.filter(l => !l.pago && l.elegivel !== false).length * d.usd_enc
          + av.filter(l => !l.pago && l.elegivel !== false).length * d.usd_av
        const pagoBrl = [...enc, ...av].filter(l => l.pago).reduce((s, l) => s + Number(l.valor_brl || 0), 0)
        L.push('', `*A PAGAR:* US$ ${devidoUsd.toFixed(2)}${d.cotacao > 0 ? ` ≈ ${fmtBRL(devidoUsd * d.cotacao)}` : ''}`)
        L.push(`*JÁ PAGO:* ${fmtBRL(pagoBrl)}`)
      } else if (d.papel === 'indicador') {
        L.push(`Indicador: ${d.nome || d.chave} (${d.chave})`)
        if (d.pix) L.push(`PIX: ${d.pix}`)
        const cr = d.creditos || []
        L.push('', `*INDICAÇÕES CONVERTIDAS* (${cr.length}):`)
        cr.forEach(l => L.push(linhaTxt(l, d.usd, d.cotacao)))
        const devUsd = cr.filter(l => !l.pago).length * d.usd
        const pagoBrl = cr.filter(l => l.pago).reduce((s, l) => s + Number(l.valor_brl || 0), 0)
        L.push('', `*A PAGAR:* US$ ${devUsd.toFixed(2)}${d.cotacao > 0 ? ` ≈ ${fmtBRL(devUsd * d.cotacao)}` : ''}`)
        L.push(`*JÁ PAGO:* ${fmtBRL(pagoBrl)}`)
      } else {
        L.push(`Paciente: ${d.nome || fmtCPF(d.chave)} (${fmtCPF(d.chave)})`)
        const cr = d.creditos || [], ab = d.abatimentos || []
        L.push('', `*CRÉDITOS DE INDICAÇÃO* (${cr.length}):`)
        cr.forEach(l => L.push(`• ${fmtData(l.data)} · indicado ${l.cpf} · US$ ${Number(d.usd).toFixed(2)}`))
        L.push('', `*ABATIMENTOS/PAGAMENTOS* (${ab.length}):`)
        ab.forEach(a => L.push(`• ${fmtData(a.data)} · ${({ anuidade: 'ANUIDADE FUTURA', documento: 'DOCUMENTO', pix: 'PIX (excedente)' })[a.tipo] || a.tipo} · ${fmtBRL(a.valor_brl)}${a.obs ? ' · ' + a.obs : ''}`))
        L.push('', `*SALDO ATUAL:* ${fmtBRL(d.saldo_brl)}`)
        if (Number(d.saldo_brl) > 0) L.push('_O saldo pode abater a sua próxima anuidade ou documentos; o excedente é pago via PIX._')
      }
      L.push('', '— Projeto OBA®')
      setTexto(L.join('\n'))
      await carregarLotes(papel, chave.trim())
    } catch (e) { toast(false, e.message) }
    setBusy(false)
  }
  function copiar() { try { navigator.clipboard.writeText(texto).then(() => toast(true, 'Extrato copiado.')) } catch (e) {} }
  function whatsapp() { try { window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank') } catch (e) {} }
  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <h2 className="font-extrabold text-sm mb-2" style={{ color: DARK }}>{"EXTRATO POR PESSOA"}</h2>
      <div className="flex gap-2 flex-wrap items-center mb-3">
        <select value={papel} onChange={e => { setPapel(e.target.value); setTexto(''); setLotes([]) }}
          className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs">
          <option value="medico">Médico (CRM/UF)</option>
          <option value="indicador">Indicador (código IND…)</option>
          <option value="paciente">Paciente (CPF)</option>
        </select>
        {/* Trocar a chave LIMPA o extrato e os lotes: senão a lista de
            "PAGAMENTOS LANÇADOS" da pessoa anterior fica na tela e o ESTORNAR
            passa a apontar para o lote de um, com a chave do outro. */}
        <input value={chave} onChange={e => { setChave(e.target.value); setTexto(''); setLotes([]) }} onKeyDown={e => { if (e.key === 'Enter') gerar() }}
          placeholder={papel === 'medico' ? '6302/BA' : papel === 'indicador' ? 'INDA1B2C3' : '000.000.000-00'}
          className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs w-40" />
        <button onClick={gerar} disabled={busy || !chave.trim()}
          className="font-bold px-3 py-1.5 rounded-lg text-xs disabled:opacity-50" style={{ background: DARK, color: GOLD }}>
          {busy ? '...' : 'GERAR'}
        </button>
      </div>
      {texto && (<>
        <textarea readOnly value={texto} rows={14}
          className="w-full border border-gray-200 rounded-xl p-3 text-xs font-mono bg-gray-50" />
        <div className="flex gap-2 mt-2">
          <button onClick={copiar} className="font-bold px-3 py-2 rounded-xl text-xs bg-gray-100 hover:bg-gray-200 text-gray-700">{"📋 COPIAR"}</button>
          <button onClick={whatsapp} className="font-bold px-3 py-2 rounded-xl text-xs text-white" style={{ background: '#25D366' }}>{"WhatsApp →"}</button>
        </div>

        {/* ESTORNO (M4) — só médico/indicador têm lote de pagamento. */}
        {lotes.length > 0 && (
          <div className="mt-4 border-t border-gray-200 pt-3">
            <h3 className="font-extrabold text-xs mb-1" style={{ color: DARK }}>{"PAGAMENTOS LANÇADOS"}</h3>
            <p className="text-[0.68rem] text-gray-500 mb-2 leading-snug">
              {"Estornar devolve os créditos para \"A PAGAR\". Não movimenta dinheiro — serve para desfazer uma baixa lançada por engano."}
            </p>
            <div className="space-y-1.5">
              {lotes.map(l => (
                <div key={l.data_pagamento} className="flex items-center justify-between gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
                  {/* Com HORA, não só a data: dois pagamentos no mesmo dia (créditos
                      novos ficando elegíveis à tarde) apareciam idênticos na lista. */}
                  <div className="min-w-0 text-xs" title={String(l.data_pagamento)}>
                    <b>{fmtDataHora(l.data_pagamento)}</b>
                    <span className="text-gray-500">{" · " + l.n_linhas + " lanç. · "}</span>
                    <b>{fmtBRL(l.total_brl)}</b>
                  </div>
                  {l.tem_nf ? (
                    <span className="text-[0.66rem] font-bold text-gray-400 whitespace-nowrap" title="Cancele a nota fiscal antes de estornar">
                      {"NF emitida — bloqueado"}
                    </span>
                  ) : (
                    <button onClick={() => estornar(l)} disabled={!!estornando}
                      className="font-bold px-2.5 py-1 rounded-lg text-[0.7rem] whitespace-nowrap bg-red-100 hover:bg-red-200 text-red-800 disabled:opacity-50">
                      {estornando === l.data_pagamento ? '...' : 'ESTORNAR'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </>)}
    </div>
  )
}

// ── ↩️ ESTORNOS ──────────────────────────────────────────────────────────────
// Trilha de auditoria dos estornos (tabela caixa_estornos). Só leitura: um
// estorno registrado não se apaga daqui — se ele próprio foi um erro, o conserto
// é lançar o pagamento de novo, e os dois registros ficam no histórico.
function AbaEstornos({ rpc, toast }) {
  const [linhas, setLinhas] = useState(null)   // null = carregando
  const [busy, setBusy] = useState(false)

  async function carregar() {
    if (busy) return
    setBusy(true)
    try {
      const d = await rpc('caixa_estornos_lista', {})
      setLinhas((d && d.ok) ? (d.linhas || []) : [])
      if (d && d.ok === false) toast(false, d.erro || 'Não foi possível carregar.')
    } catch (e) { toast(false, e.message); setLinhas([]) }
    setBusy(false)
  }
  useEffect(() => { carregar() }, [])

  const total = (linhas || []).reduce((s, l) => s + Number(l.total_brl || 0), 0)

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <div className="flex items-center justify-between gap-2 mb-1">
        <h2 className="font-extrabold text-sm" style={{ color: DARK }}>{"HISTÓRICO DE ESTORNOS"}</h2>
        <button onClick={carregar} disabled={busy}
          className="text-[0.7rem] font-bold px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50">
          {busy ? '...' : 'ATUALIZAR'}
        </button>
      </div>
      <p className="text-[0.68rem] text-gray-500 mb-3 leading-snug">
        {"Toda baixa desfeita fica registrada aqui, com o motivo. Os créditos voltaram para \"A PAGAR\" — o estorno não movimenta dinheiro."}
      </p>

      {linhas === null ? (
        <p className="text-xs text-gray-400 py-6 text-center">{"Carregando..."}</p>
      ) : linhas.length === 0 ? (
        <p className="text-xs text-gray-400 py-6 text-center">{"Nenhum estorno registrado."}</p>
      ) : (<>
        <div className="text-xs mb-2">
          <span className="text-gray-500">{linhas.length + " estorno(s) · total devolvido para \"A PAGAR\": "}</span>
          <b>{fmtBRL(total)}</b>
        </div>
        <div className="space-y-1.5">
          {linhas.map(l => (
            <div key={l.id} className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2">
              <div className="flex items-baseline justify-between gap-2 flex-wrap text-xs">
                <div className="min-w-0">
                  <span className="font-bold uppercase text-[0.66rem] px-1.5 py-0.5 rounded"
                    style={{ background: l.papel === 'medico' ? '#e0e7ff' : '#fef3c7', color: l.papel === 'medico' ? '#3730a3' : '#92400e' }}>
                    {l.papel === 'medico' ? 'MÉDICO' : 'INDICADOR'}
                  </span>
                  <b className="ml-1.5">{l.chave}</b>
                  <span className="text-gray-500">{" · " + l.n_linhas + " lanç."}</span>
                </div>
                <b>{fmtBRL(l.total_brl)}</b>
              </div>
              <div className="text-[0.68rem] text-gray-500 mt-1 leading-snug">
                {"estornado em " + fmtDataHora(l.created_at) + " · pagamento de " + fmtDataHora(l.data_pagamento)}
              </div>
              {l.motivo && (
                <div className="text-[0.7rem] text-gray-700 mt-1 italic">{"“" + l.motivo + "”"}</div>
              )}
            </div>
          ))}
        </div>
      </>)}
    </div>
  )
}

// ── 🗂️ NOTAS FISCAIS ─────────────────────────────────────────────────────────
function AbaNF({ rpc }) {
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')
  useEffect(() => { (async () => { try { setDados(await rpc('caixa_relatorio_nf', {})) } catch (e) { setErro(e.message) } })() }, [])
  if (erro) return <p className="text-sm text-red-600">{erro}</p>
  if (!dados) return <p className="text-sm text-gray-500">Carregando…</p>
  const Bloco = ({ titulo, d }) => (
    <div className="bg-white rounded-2xl shadow p-4 mb-4">
      <h2 className="font-extrabold text-sm mb-2" style={{ color: DARK }}>{titulo}</h2>
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="rounded-xl p-3" style={{ background: '#dcfce7' }}>
          <p className="text-[11px] font-bold text-green-800">{"COM NF EMITIDA"}</p>
          <p className="text-xl font-extrabold text-green-700">{d?.com_nf_n ?? 0}</p>
          <p className="text-xs text-green-700">{fmtBRL(d?.com_nf_brl)}</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: '#fee2e2' }}>
          <p className="text-[11px] font-bold text-red-800">{"NF PENDENTE"}</p>
          <p className="text-xl font-extrabold text-red-700">{d?.sem_nf_n ?? 0}</p>
          <p className="text-xs text-red-700">{fmtBRL(d?.sem_nf_brl)}</p>
        </div>
      </div>
    </div>
  )
  return (<>
    <Bloco titulo="RECEBIMENTOS (anuidades ativas + documentos pagos)" d={dados.recebimentos} />
    <Bloco titulo="PAGAMENTOS EFETUADOS (comissões pagas)" d={dados.pagamentos} />
    <p className="text-[11px] text-gray-400">{"Para carimbar a NF de um recebimento use a aba ENTRADAS; a NF de um pagamento pode ser carimbada pelo EXTRATO da pessoa (em breve, linha a linha)."}</p>
  </>)
}
