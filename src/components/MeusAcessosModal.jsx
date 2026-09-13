import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import obaLogo from '../assets/oba-logo.png'

/**
 * MeusAcessosModal — o paciente vê quem tem acesso aos dados dele, quem já
 * abriu, e retira a autorização de quem quiser.
 *
 * (consentimento, 13/09/2026) Existe porque `acessos_paciente` era gravada
 * desde ago/2026 e NUNCA teve leitor além do Admin. Trilha que ninguém lê não
 * constrange ninguém — e o direito de saber quem acessou é do titular
 * (LGPD art. 18), não do administrador.
 *
 * Duas listas, de propósito, porque são perguntas diferentes:
 *   QUEM PODE   → autorizações vigentes. É aqui que se revoga.
 *   QUEM ABRIU  → o que já aconteceu. Não se desfaz; serve para ver.
 *
 * Props: cpf, onFechar()
 */

const ROTULO_MOTIVO = {
  plataforma_atendimento:            'atendimento em curso',
  plataforma_sem_atendimento_em_curso: 'sem atendimento em curso',
  urgencia_declarada:                'URGÊNCIA declarada',
  autorizado_com_vinculo:            'com a sua autorização',
  autorizado_sem_vinculo:            'com a sua autorização',
  escrita_ato_proprio:               'registrou um atendimento',
  escrita_autorizada:                'alterou um registro',
  escrita_sem_autorizacao:           'tentou alterar — negado',
  sem_autorizacao:                   'tentou abrir — negado',
  autorizacao_revogada_ou_expirada:  'tentou abrir — negado (autorização retirada)',
}

const ROTULO_RECURSO = {
  profiles: 'seus dados de cadastro',
  avaliacoes: 'suas avaliações',
  oba_anamnese: 'sua anamnese',
  oba_anamnese_update: 'sua anamnese',
  triagens: 'suas triagens',
}

function quando(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function MeusAcessosModal({ cpf, onFechar }) {
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')
  const [revogando, setRevogando] = useState('')
  const [confirmar, setConfirmar] = useState(null)   // { nivel, crm, nome }

  const cpfLimpo = String(cpf || '').replace(/\D/g, '')
  const token = () => { try { return localStorage.getItem('paciente_token') || '' } catch (e) { return '' } }

  async function carregar() {
    try {
      const { data } = await supabase.rpc('meus_acessos', { p_cpf: cpfLimpo, p_token: token() })
      if (data && data.ok) setDados(data)
      else setErro((data && data.erro) || 'Não foi possível carregar.')
    } catch (e) { setErro('Erro de conexão. Tente de novo.') }
  }

  useEffect(() => {
    carregar()
    // Abrir a tela é o ato de "ver": some a faixa do painel. Marcado aqui e
    // não no fechar, porque quem abre e fecha rápido também viu.
    supabase.rpc('meus_acessos_marcar_vistos', { p_cpf: cpfLimpo, p_token: token() }).catch(() => {})
  }, [cpfLimpo])

  async function revogar(nivel, crm) {
    setRevogando(crm || nivel)
    try {
      const { data } = await supabase.rpc('autorizacao_revogar', {
        p_cpf: cpfLimpo, p_token: token(), p_nivel: nivel, p_medico_crm: crm || null,
      })
      if (data && data.ok) { setConfirmar(null); await carregar() }
      else setErro((data && data.erro) || 'Não foi possível retirar o acesso.')
    } catch (e) { setErro('Erro de conexão. Tente de novo.') }
    setRevogando('')
  }

  const autorizacoes = (dados?.autorizacoes || []).filter(a => a.nivel !== 'urgencia')
  const acessos = dados?.acessos || []

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.95)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden my-6 relative">
        <button onClick={onFechar} aria-label="Fechar"
          style={{ position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: '50%', background: '#7B1E1E', color: '#fff', border: '2px solid #fff', cursor: 'pointer', fontSize: '12px', fontWeight: 700, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
          {"✕"}
        </button>

        <div className="p-5 pt-7">
          <img src={obaLogo} alt="Projeto OBA" className="h-16 object-contain mx-auto" />
          <h2 className="text-center text-lg font-bold text-gray-800 mt-2">{"Quem vê os meus dados"}</h2>
          <p className="text-center text-xs text-gray-500 mt-1 mb-4 leading-snug">
            {"Os seus dados de saúde só são vistos por quem você autorizar. Aqui você confere e retira quando quiser."}
          </p>

          {erro && <p className="text-red-600 text-xs font-bold text-center mb-3">{erro}</p>}
          {!dados && !erro && <p className="text-xs text-gray-400 text-center py-6">Carregando…</p>}

          {dados && (
            <>
              {/* ── QUEM PODE VER AGORA ─────────────────────────────── */}
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">{"Quem pode ver agora"}</p>
              {autorizacoes.length === 0 ? (
                <p className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-xl p-3 mb-4">
                  {"Ninguém tem acesso aos seus dados no momento."}
                </p>
              ) : (
                <div className="space-y-2 mb-4">
                  {autorizacoes.map(a => (
                    <div key={a.nivel + (a.crm || '')} className="border border-gray-200 rounded-xl p-3">
                      {a.nivel === 'plataforma' ? (
                        <>
                          <p className="font-bold text-sm text-gray-800">{"Médicos do Projeto OBA®"}</p>
                          <p className="text-[11px] text-gray-500 leading-snug mt-0.5">
                            {"A equipe clínica que te atende. É isto que permite o atendimento — retirar encerra a sua conta."}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-bold text-sm text-gray-800">{a.medico}</p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {"CRM "}{a.crm}
                            {a.expira ? ' · até ' + new Date(a.expira).toLocaleDateString('pt-BR') : ''}
                          </p>
                        </>
                      )}
                      <button
                        onClick={() => setConfirmar({ nivel: a.nivel, crm: a.crm, nome: a.nivel === 'plataforma' ? 'Projeto OBA®' : a.medico })}
                        className="mt-2 text-xs font-bold text-red-700 underline underline-offset-2 hover:text-red-900">
                        {a.nivel === 'plataforma' ? 'Encerrar minha conta' : 'Retirar o acesso'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* ── QUEM ABRIU ──────────────────────────────────────── */}
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">{"Quem abriu os meus dados"}</p>
              {acessos.length === 0 ? (
                <p className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-xl p-3">
                  {"Ninguém abriu os seus dados ainda."}
                </p>
              ) : (
                <div className="space-y-1.5">
                  {acessos.map((a, i) => (
                    <div key={i}
                      className={`rounded-lg px-3 py-2 border ${a.destacar ? 'border-red-300 bg-red-50' : 'border-gray-100 bg-gray-50'}`}>
                      <div className="flex items-baseline justify-between gap-2">
                        <p className={`text-sm font-bold ${a.destacar ? 'text-red-800' : 'text-gray-700'}`}>{a.medico}</p>
                        <p className="text-[10px] text-gray-500 whitespace-nowrap">{quando(a.quando)}</p>
                      </div>
                      <p className="text-[11px] text-gray-600 leading-snug">
                        {a.permitido ? 'Viu ' : 'Tentou ver '}
                        {ROTULO_RECURSO[a.o_que] || a.o_que}
                        {' · '}
                        <span className={a.destacar ? 'font-bold text-red-700' : ''}>
                          {ROTULO_MOTIVO[a.motivo] || a.motivo}
                        </span>
                      </p>
                      {/* A justificativa da urgência é do paciente, não do
                          arquivo de log: ele tem direito de saber por quê. */}
                      {a.motivo === 'urgencia_declarada' && a.justificativa && (
                        <p className="text-[11px] text-red-700 mt-1 leading-snug">
                          <b>{"Motivo declarado: "}</b>{a.justificativa}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── CONFIRMAÇÃO ────────────────────────────────────────────
            O texto do nível PLATAFORMA é deliberadamente pesado: quem chega
            aqui por engano quase sempre queria a outra coisa, e não pode
            descobrir depois que cancelou a conta achando que ajustava
            privacidade. */}
        {confirmar && (
          <div className="absolute inset-0 z-10 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
            <div className="bg-white rounded-2xl p-5 w-full max-w-sm">
              {confirmar.nivel === 'plataforma' ? (
                <>
                  <p className="font-bold text-base text-red-800 mb-2">{"Encerrar o atendimento do Projeto OBA®"}</p>
                  {/* ⚠ Título e corpo dizem A MESMA COISA: "encerra o ATENDIMENTO".
                      A versão anterior intitulava "encerrar o atendimento" e no corpo
                      dizia "encerra a sua conta" — uma prometia o que a outra negava.
                      A verdadeira é o atendimento: o prontuário fica guardado por
                      obrigação legal de qualquer forma. */}
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {"Isto "}<b>{"não é"}</b>{" um ajuste de privacidade. Retirar esta autorização "}<b>{"encerra o seu atendimento"}</b>{": nenhum médico do Projeto OBA® volta a ver os seus dados, e a plataforma deixa de funcionar para você."}
                  </p>
                  <ul className="text-xs text-gray-600 leading-relaxed mt-2 pl-4 list-disc space-y-1">
                    <li>{"você deixa de ver o seu histórico e os seus gráficos, e de fazer novas avaliações;"}</li>
                    <li>{"o seu prontuário "}<b>{"continua guardado"}</b>{" — a lei obriga a guardar todo registro médico por 20 anos a partir do último atendimento. Ele deixa de ser usado, e nenhum médico volta a abri-lo;"}</li>
                    {/* ⚠ CONFERIDO no TermosModal (item 8 do texto do PACIENTE): o
                        reembolso é INTEGRAL em até 7 dias (CDC art. 49). A versão
                        anterior dizia "a anuidade não é devolvida por este motivo",
                        que é o oposto para quem está dentro do prazo. */}
                    <li>{"a anuidade não é cancelada por aqui. Pelo item 8 dos Termos, o reembolso é integral se você pedir em até "}<b>{"7 dias"}</b>{" do pagamento, pelo contato@bariatrico.net; depois desse prazo, não há devolução."}</li>
                  </ul>
                  <p className="text-xs text-gray-700 bg-green-50 border border-green-200 rounded-lg p-2.5 mt-3 leading-relaxed">
                    <b>{"Dá para voltar atrás."}</b>{" Se você autorizar de novo, o atendimento recomeça de onde parou — o seu histórico continua lá."}
                  </p>
                  <p className="text-xs text-gray-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5 mt-3 leading-relaxed">
                    {"Se você só quer tirar o acesso de "}<b>{"um médico específico"}</b>{", não é aqui — feche esta caixa e use “Retirar o acesso” no nome dele. A sua conta continua normalmente."}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold text-base text-gray-800 mb-2">{"Retirar o acesso de "}{confirmar.nome}</p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {"Ele deixa de ver os seus dados a partir de agora. O que ele já viu, já viu — o registro dos acessos anteriores continua aqui para você."}
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed mt-2">
                    {"A sua conta no Projeto OBA® "}<b>{"continua normalmente"}</b>{"."}
                  </p>
                </>
              )}
              <div className="flex gap-2 mt-4">
                <button onClick={() => setConfirmar(null)}
                  className="flex-1 py-2.5 rounded-xl border-2 border-gray-300 text-gray-700 font-bold text-sm">
                  {"Voltar"}
                </button>
                <button onClick={() => revogar(confirmar.nivel, confirmar.crm)}
                  disabled={!!revogando}
                  className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-50"
                  style={{ background: '#7B1E1E' }}>
                  {revogando ? '…' : (confirmar.nivel === 'plataforma' ? 'Entendi, encerrar' : 'Retirar o acesso')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
