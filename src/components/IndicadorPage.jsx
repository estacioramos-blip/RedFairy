import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'

// =============================================================================
// IndicadorPage — 3º perfil do sistema (INDICADOR).
// Qualquer pessoa (enfermeiro, fisio, leigo) indica bariátricos e ganha US$10
// quando o indicado PAGA. Auth própria (CPF + senha) via RPCs SECURITY DEFINER
// (register_indicador / login_indicador). Painel mostra o link/QR de indicação.
// Pré-cadastro de CPF e lista de créditos virão na próxima fase (precisam de
// novos RPCs de atribuição).
// =============================================================================

const VINHO = '#7B1E2B'
const VINHO_CLARO = '#FDF7F7'

const card = { background: '#fff', borderRadius: 18, boxShadow: '0 10px 30px rgba(0,0,0,.08)', padding: 22, width: '100%', maxWidth: 420 }
const inp = { width: '100%', border: '1.5px solid #E5C9CC', borderRadius: 12, padding: '11px 13px', fontSize: 15, outline: 'none', background: '#fff' }
const lbl = { fontSize: 12, fontWeight: 700, color: VINHO, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4, display: 'block' }
const btnPrimary = { width: '100%', background: VINHO, color: '#fff', border: 'none', borderRadius: 12, padding: '12px 16px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }

function soDigitos(s) { return String(s || '').replace(/\D/g, '') }

export default function IndicadorPage({ onVoltar }) {
  const [etapa, setEtapa] = useState('login') // login | cadastro | painel
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  // sessão do indicador
  const [codigo, setCodigo] = useState('')
  const [nome, setNome] = useState('')

  // campos
  const [cpf, setCpf] = useState('')
  const [senha, setSenha] = useState('')
  const [fNome, setFNome] = useState('')
  const [celular, setCelular] = useState('')
  const [email, setEmail] = useState('')
  const [tipo, setTipo] = useState('')
  const [pix, setPix] = useState('')
  const [usarUsdc, setUsarUsdc] = useState(false)
  const [usdc, setUsdc] = useState('')
  const [copiado, setCopiado] = useState(false)

  // painel: pré-cadastro + lista
  const [cpfPac, setCpfPac] = useState('')
  const [preMsg, setPreMsg] = useState('')
  const [preErro, setPreErro] = useState('')
  const [preBusy, setPreBusy] = useState(false)
  const [dados, setDados] = useState(null) // { comissao_usd, precadastros[], creditos[] }

  // Já logado? (localStorage)
  useEffect(() => {
    try {
      const c = localStorage.getItem('indicador_codigo')
      if (c) { setCodigo(c); setNome(localStorage.getItem('indicador_nome') || ''); setEtapa('painel') }
    } catch (e) {}
  }, [])

  const link = codigo ? `${window.location.origin}/?ref=${codigo}` : ''

  async function carregarPainel(cod) {
    try {
      const { data } = await supabase.rpc('listar_creditos_indicador', { p_codigo: cod || codigo })
      if (data && data.ok) setDados(data)
    } catch (e) {}
  }
  useEffect(() => { if (etapa === 'painel' && codigo) carregarPainel(codigo) }, [etapa, codigo])

  async function preCadastrar() {
    setPreMsg(''); setPreErro('')
    if (soDigitos(cpfPac).length !== 11) { setPreErro('CPF inválido (11 dígitos).'); return }
    setPreBusy(true)
    try {
      const { data, error } = await supabase.rpc('precadastrar_indicacao', { p_codigo: codigo, p_cpf: cpfPac })
      if (error) throw error
      if (data?.ja_no_projeto) { setPreErro('ESSE PACIENTE JÁ FAZ PARTE DO PROJETO'); return }
      if (!data?.ok) { setPreErro(data?.erro || 'Não foi possível reservar.'); return }
      setPreMsg('Paciente reservado! Você ganha quando ele pagar.')
      setCpfPac('')
      carregarPainel(codigo)
    } catch (e) { setPreErro('Erro de conexão. Tente de novo.') }
    finally { setPreBusy(false) }
  }

  function salvarSessao(data) {
    try {
      localStorage.setItem('indicador_id', data.id || '')
      localStorage.setItem('indicador_codigo', data.codigo || '')
      localStorage.setItem('indicador_nome', data.nome || fNome || '')
    } catch (e) {}
    setCodigo(data.codigo || '')
    setNome(data.nome || fNome || '')
    setEtapa('painel')
  }

  async function handleLogin() {
    setErro('')
    if (soDigitos(cpf).length !== 11) { setErro('CPF inválido.'); return }
    if (senha.length < 6) { setErro('Senha muito curta.'); return }
    setCarregando(true)
    try {
      const { data, error } = await supabase.rpc('login_indicador', { p_cpf: cpf, p_senha: senha })
      if (error) throw error
      if (!data || !data.ok) { setErro(data?.erro || 'Não foi possível entrar.'); return }
      salvarSessao(data)
    } catch (e) {
      setErro('Erro de conexão. Tente de novo.')
    } finally { setCarregando(false) }
  }

  async function handleCadastro() {
    setErro('')
    if (soDigitos(cpf).length !== 11) { setErro('CPF inválido.'); return }
    if (senha.length < 6) { setErro('Senha precisa de pelo menos 6 caracteres.'); return }
    if (!fNome.trim()) { setErro('Informe seu nome.'); return }
    if (!pix.trim() && !(usarUsdc && usdc.trim())) { setErro('Informe uma chave PIX (ou carteira USDC) para receber.'); return }
    setCarregando(true)
    try {
      const { data, error } = await supabase.rpc('register_indicador', {
        p_cpf: cpf, p_senha: senha, p_nome: fNome, p_celular: celular,
        p_email: email, p_pix: pix, p_usdc: usarUsdc ? usdc : null, p_tipo: tipo,
      })
      if (error) throw error
      if (!data || !data.ok) { setErro(data?.erro || 'Não foi possível cadastrar.'); return }
      salvarSessao(data)
    } catch (e) {
      setErro('Erro de conexão. Tente de novo.')
    } finally { setCarregando(false) }
  }

  function sair() {
    try {
      localStorage.removeItem('indicador_id')
      localStorage.removeItem('indicador_codigo')
      localStorage.removeItem('indicador_nome')
    } catch (e) {}
    setCodigo(''); setNome(''); setCpf(''); setSenha(''); setEtapa('login')
  }

  function copiarLink() {
    try { navigator.clipboard.writeText(link); setCopiado(true); setTimeout(() => setCopiado(false), 1800) } catch (e) {}
  }

  // ── PAINEL ────────────────────────────────────────────────────────────────
  if (etapa === 'painel') {
    return (
      <div style={{ minHeight: '100vh', background: VINHO_CLARO, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 16px', gap: 18 }}>
        <div style={{ ...card, textAlign: 'center' }}>
          <p style={{ fontSize: 12, fontWeight: 800, color: VINHO, letterSpacing: '.08em' }}>RedFairy | OBA® · INDICADOR</p>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1f2937', marginTop: 6 }}>Olá{nome ? `, ${nome.split(' ')[0]}` : ''}! 👋</h2>
          <p style={{ fontSize: 14, color: '#6b7280', marginTop: 6 }}>
            Compartilhe seu <b>link</b> ou mostre o <b>QR-CODE</b> a bariátricos que você conhece.
            Quando a pessoa indicada <b>pagar</b>, você ganha <b>US$10</b>.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', margin: '18px 0 10px' }}>
            <div style={{ background: '#fff', padding: 12, borderRadius: 14, border: `2px solid ${VINHO}` }}>
              {link ? <QRCodeSVG value={link} size={168} fgColor={VINHO} /> : null}
            </div>
          </div>

          <div style={{ background: VINHO_CLARO, borderRadius: 10, padding: '8px 10px', fontSize: 13, color: '#374151', wordBreak: 'break-all', border: '1px solid #E5C9CC' }}>
            {link}
          </div>
          <button onClick={copiarLink} style={{ ...btnPrimary, marginTop: 10 }}>
            {copiado ? 'LINK COPIADO ✓' : 'COPIAR LINK'}
          </button>
        </div>

        <div style={{ ...card }}>
          <p style={{ ...lbl }}>Pré-cadastrar paciente</p>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 10 }}>
            Conhece um bariátrico? Reserve-o pelo <b>CPF</b>. Você ganha quando ele pagar.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ ...inp, flex: 1 }} inputMode="numeric" value={cpfPac}
              onChange={e => setCpfPac(e.target.value)} placeholder="CPF do paciente" />
            <button onClick={preCadastrar} disabled={preBusy}
              style={{ ...btnPrimary, width: 'auto', padding: '11px 16px', opacity: preBusy ? 0.6 : 1 }}>
              {preBusy ? '…' : 'Reservar'}
            </button>
          </div>
          {preMsg && <p style={{ color: '#15803D', fontSize: 13, fontWeight: 600, marginTop: 8 }}>{preMsg}</p>}
          {preErro && <p style={{ color: '#B91C1C', fontSize: 13, fontWeight: 700, marginTop: 8 }}>{preErro}</p>}
        </div>

        <div style={{ ...card }}>
          <p style={{ ...lbl }}>Seus indicados</p>
          {!dados ? (
            <p style={{ fontSize: 13, color: '#9ca3af' }}>Carregando…</p>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1, background: VINHO_CLARO, borderRadius: 10, padding: '10px 8px', textAlign: 'center', border: '1px solid #E5C9CC' }}>
                  <p style={{ fontSize: 22, fontWeight: 800, color: VINHO }}>{(dados.creditos || []).filter(c => c.pago).length}</p>
                  <p style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>PAGOS</p>
                </div>
                <div style={{ flex: 1, background: VINHO_CLARO, borderRadius: 10, padding: '10px 8px', textAlign: 'center', border: '1px solid #E5C9CC' }}>
                  <p style={{ fontSize: 22, fontWeight: 800, color: VINHO }}>{(dados.creditos || []).filter(c => !c.pago).length}</p>
                  <p style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>A RECEBER</p>
                </div>
                <div style={{ flex: 1, background: VINHO_CLARO, borderRadius: 10, padding: '10px 8px', textAlign: 'center', border: '1px solid #E5C9CC' }}>
                  <p style={{ fontSize: 22, fontWeight: 800, color: VINHO }}>{(dados.precadastros || []).length}</p>
                  <p style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>RESERVADOS</p>
                </div>
              </div>
              <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
                Cada indicado que paga vale US$ {dados.comissao_usd || 10}.
              </p>
            </>
          )}
        </div>

        <button onClick={sair} style={{ background: 'transparent', border: 'none', color: VINHO, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
          Sair
        </button>
      </div>
    )
  }

  // ── LOGIN / CADASTRO ────────────────────────────────────────────────────────
  const ehCadastro = etapa === 'cadastro'
  return (
    <div style={{ minHeight: '100vh', background: VINHO_CLARO, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '28px 16px' }}>
      <div style={card}>
        <p style={{ fontSize: 12, fontWeight: 800, color: VINHO, letterSpacing: '.08em', textAlign: 'center' }}>RedFairy | OBA® · INDICADOR</p>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1f2937', textAlign: 'center', marginTop: 6 }}>
          {ehCadastro ? 'Indique bariátricos e ganhe' : 'Entrar como indicador'}
        </h2>
        <p style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', marginTop: 6 }}>
          {ehCadastro
            ? 'Cadastre-se para receber US$10 por cada bariátrico indicado que pagar.'
            : 'Acesse seu link de indicação e acompanhe seus créditos.'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 18 }}>
          <div>
            <label style={lbl}>CPF</label>
            <input style={inp} inputMode="numeric" value={cpf} onChange={e => setCpf(e.target.value)} placeholder="Somente números" />
          </div>
          <div>
            <label style={lbl}>Senha</label>
            <input style={inp} type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" />
          </div>

          {ehCadastro && (
            <>
              <div>
                <label style={lbl}>Nome completo</label>
                <input style={inp} value={fNome} onChange={e => setFNome(e.target.value)} />
              </div>
              <div>
                <label style={lbl}>WhatsApp</label>
                <input style={inp} inputMode="tel" value={celular} onChange={e => setCelular(e.target.value)} placeholder="(DDD) número" />
              </div>
              <div>
                <label style={lbl}>E-mail (opcional)</label>
                <input style={inp} type="email" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div>
                <label style={lbl}>Você é</label>
                <select style={inp} value={tipo} onChange={e => setTipo(e.target.value)}>
                  <option value="">Selecione…</option>
                  <option value="enfermeiro">Enfermeiro(a)</option>
                  <option value="fisio">Fisioterapeuta</option>
                  <option value="nutri">Nutricionista</option>
                  <option value="outro_saude">Outro profissional de saúde</option>
                  <option value="leigo">Não sou da saúde</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Chave PIX (para receber)</label>
                <input style={inp} value={pix} onChange={e => setPix(e.target.value)} placeholder="CPF, e-mail, telefone ou aleatória" />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151', cursor: 'pointer' }}>
                <input type="checkbox" checked={usarUsdc} onChange={e => setUsarUsdc(e.target.checked)} />
                Quero receber em USDC (dólar digital)
              </label>
              {usarUsdc && (
                <div>
                  <label style={lbl}>Carteira USDC</label>
                  <input style={inp} value={usdc} onChange={e => setUsdc(e.target.value)} placeholder="Endereço da wallet" />
                </div>
              )}
            </>
          )}

          {erro && <p style={{ color: '#B91C1C', fontSize: 13, fontWeight: 600 }}>{erro}</p>}

          <button
            onClick={ehCadastro ? handleCadastro : handleLogin}
            disabled={carregando}
            style={{ ...btnPrimary, opacity: carregando ? 0.6 : 1 }}>
            {carregando ? 'Aguarde…' : (ehCadastro ? 'CADASTRAR E GERAR MEU LINK' : 'ENTRAR')}
          </button>

          <button
            onClick={() => { setErro(''); setEtapa(ehCadastro ? 'login' : 'cadastro') }}
            style={{ background: 'transparent', border: 'none', color: VINHO, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
            {ehCadastro ? 'Já tenho cadastro — entrar' : 'Não tenho cadastro — quero indicar'}
          </button>

          {onVoltar && (
            <button onClick={onVoltar} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 13 }}>
              ← Voltar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
